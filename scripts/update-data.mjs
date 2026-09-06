#!/usr/bin/env node
/**
 * 资源数据自动核验与更新脚本
 *
 * 做什么：
 *   1. 经 GitHub API 核验 knowledge.js / frontier.js 中全部仓库的 星标(stars) 与最近推送(pushed)
 *   2. 自动重新生成 frontier.js 的「近期动态」picks（近 60 天有推送的仓库，按时间倒序）
 *   3. 刷新两个数据文件的 updated 日期
 *
 * 怎么跑：
 *   - 本地手动： node scripts/update-data.mjs            （可选环境变量 GITHUB_TOKEN 提升限流额度）
 *   - 预演模式： node scripts/update-data.mjs --dry-run   （只报告将发生的变更，不写文件）
 *   - 线上自动： GitHub Actions 每日运行（.github/workflows/update-data.yml），
 *                通过 schema 校验后才会提交并触发 Pages 重新部署。
 *
 * 安全护栏（任一触发即以非零码退出或跳过写入，防止污染生产数据）：
 *   - API 失败仓库数超过 max(2, 20%) → 硬失败
 *   - 单仓库返回非法数据（负数星标 / 未来日期 / 日期格式错误）→ 跳过该仓库并告警
 *   - 生成的 picks 为空 → 保留原有 picks
 *
 * 注意：frontier.js 的 picks 区块由本脚本整体重新生成，请勿手工编辑；
 *       手工观察请写入 trends 区块；新资源加入 knowledge.js 后会被自动纳入核验。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DRY = process.argv.slice(2).includes("--dry-run");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kbPath = join(root, "assets/data/knowledge.js");
const frPath = join(root, "assets/data/frontier.js");

const kb = readFileSync(kbPath, "utf8");
const fr = readFileSync(frPath, "utf8");

const fmtDate = dt => dt.toISOString().slice(0, 10);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fmtStars = n => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));
const jsStr = s => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// ---------- 收集需要核验的仓库（知识库全部条目 + 实时看板条目） ----------
const repos = [...new Set([
  ...[...kb.matchAll(/repo:\s*"([^"]+)"/g)].map(m => m[1]),
  ...[...fr.matchAll(/repo:\s*"([^"]+)"/g)].map(m => m[1]),
])];

// ---------- GitHub API（3 路小并发；带 Token 时限流额度更高） ----------
const headers = { Accept: "application/vnd.github+json", "User-Agent": "nlp-learning-site-updater" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function fetchRepo(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return { stars: j.stargazers_count, pushed: (j.pushed_at || "").slice(0, 10) };
}

// ---------- 数据合法性守卫 ----------
const DATE_FULL = /^\d{4}-\d{2}-\d{2}$/;
function sanitize(repo, d) {
  if (!Number.isInteger(d.stars) || d.stars < 0) return `stars 非法: ${d.stars}`;
  if (!DATE_FULL.test(d.pushed)) return `pushed 格式非法: "${d.pushed}"`;
  if (!fmtDate(new Date(d.pushed)).startsWith(d.pushed)) return `pushed 是无效日期: "${d.pushed}"`;
  if (new Date(d.pushed).getTime() > Date.now() + 36 * 3600 * 1000) return `pushed 是未来日期: "${d.pushed}"`;
  return null;
}

const data = {};
const errors = [];
const queue = [...repos];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const repo = queue.shift();
    try {
      const d = await fetchRepo(repo);
      const problem = sanitize(repo, d);
      if (problem) errors.push(`${repo}: ${problem}（跳过，保留原数据）`);
      else data[repo] = d;
    } catch (e) {
      errors.push(`${repo}: ${e.message}（跳过，保留原数据）`);
    }
  }
}));

console.log(`核验完成：${Object.keys(data).length}/${repos.length} 个仓库成功`);
errors.forEach(e => console.warn(`  ⚠ ${e}`));

// 护栏 1：失败比例过高说明 API 异常或数据源有问题，宁可中止也不写入
const maxFail = Math.max(2, Math.ceil(repos.length * 0.2));
if (repos.length - Object.keys(data).length > maxFail) {
  console.error(`\n❌ 失败仓库数超过阈值（>${maxFail}），中止更新以保护生产数据（--dry-run 也可用于排查）`);
  process.exit(1);
}
if (!Object.keys(data).length) {
  console.error("\n❌ 没有成功核验任何仓库，中止更新");
  process.exit(1);
}

// ---------- 1. 更新 knowledge.js 的 stars / pushed ----------
let kbOut = kb;
for (const [repo, d] of Object.entries(data)) {
  const re = new RegExp(`(repo:\\s*"${esc(repo)}",[\\s\\S]{0,160}?stars:\\s*)\\d+(,\\s*pushed:\\s*")[^"]*(")`);
  kbOut = kbOut.replace(re, `$1${d.stars}$2${d.pushed.slice(0, 7)}$3`);
}
kbOut = kbOut.replace(/updated:\s*"[^"]*"/, `updated: "${fmtDate(new Date())}"`);

// ---------- 2. 更新 frontier.js 实时看板 fallback ----------
let frOut = fr;
for (const [repo, d] of Object.entries(data)) {
  const re = new RegExp(`(repo:\\s*"${esc(repo)}",[^{]*?fallback:\\s*\\{\\s*stars:\\s*)\\d+(,\\s*pushed:\\s*")[^"]*(")`);
  frOut = frOut.replace(re, `$1${d.stars}$2${d.pushed}$3`);
}

// ---------- 3. 重新生成「近期动态」picks（近 60 天有推送，倒序，最多 12 条） ----------
const kbDesc = {};
for (const m of kb.matchAll(/repo:\s*"([^"]+)"[\s\S]{0,500}?desc:\s*"([^"]*)"/g)) kbDesc[m[1]] = m[2];

const now = Date.now();
const entries = Object.entries(data)
  .filter(([, d]) => d.pushed && (now - new Date(d.pushed)) / 86400000 <= 60)
  .sort((a, b) => b[1].pushed.localeCompare(a[1].pushed))
  .slice(0, 12)
  .map(([repo, d]) => {
    const desc = kbDesc[repo] || "";
    const tail = `GitHub API 每日核验：最近推送 ${d.pushed}，当前星标 ${fmtStars(d.stars)}。`;
    const text = desc ? `${jsStr(desc)}${tail}` : `项目保持活跃维护。${tail}`;
    return `    {\n      date: "${d.pushed}",\n      repo: "${repo}",\n      label: "自动核验",\n      text: "${text}",\n    },`;
  });

// 护栏 2：picks 为空说明解析或数据异常，保留原有内容
if (entries.length) {
  frOut = frOut.replace(
    /(picks:\s*\[\n)[\s\S]*?(\n\s*\],)/,
    `$1${entries.join("\n")}$2`,
  );
} else {
  console.warn("  ⚠ 未生成任何近 60 天动态，保留原有 picks");
}
frOut = frOut.replace(/updated:\s*"[^"]*"/, `updated: "${fmtDate(new Date())}"`);

// ---------- 4. 有变化才写回（避免无意义的提交循环） ----------
const changed = kbOut !== kb || frOut !== fr;
if (DRY) {
  console.log(`[dry-run] ${changed ? "将发生变更：" : "无变更。"}`);
  if (kbOut !== kb) console.log("  - knowledge.js（星标/更新时间）");
  if (frOut !== fr) console.log(`  - frontier.js（fallback 数据 + ${entries.length} 条近期动态）`);
} else if (changed) {
  writeFileSync(kbPath, kbOut);
  writeFileSync(frPath, frOut);
  console.log("✅ 数据已更新：", [
    kbOut !== kb && "knowledge.js",
    frOut !== fr && "frontier.js",
  ].filter(Boolean).join("、"));
} else {
  console.log("数据无变化，无需提交");
}
