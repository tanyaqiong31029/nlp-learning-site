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
 *   - 本地手动： node scripts/update-data.mjs        （可选环境变量 GITHUB_TOKEN 提升限流额度）
 *   - 线上自动： GitHub Actions 每日运行（见 .github/workflows/update-data.yml），
 *                有变化时自动提交并触发 Pages 重新部署。
 *
 * 注意：frontier.js 的 picks 区块由本脚本整体重新生成，请勿手工编辑；
 *       手工观察请写入 trends 区块；新资源加入 knowledge.js 后会被自动纳入核验。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kbPath = join(root, "assets/data/knowledge.js");
const frPath = join(root, "assets/data/frontier.js");

const kb = readFileSync(kbPath, "utf8");
const fr = readFileSync(frPath, "utf8");

// ---------- 收集需要核验的仓库（知识库全部条目 + 实时看板条目） ----------
const repos = [...new Set([
  ...[...kb.matchAll(/repo:\s*"([^"]+)"/g)].map(m => m[1]),
  ...[...fr.matchAll(/repo:\s*"([^"]+)"/g)].map(m => m[1]),
])];

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fmtStars = n => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));
const jsStr = s => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// ---------- GitHub API（3 路小并发；带 Token 时限流额度更高） ----------
const headers = { Accept: "application/vnd.github+json", "User-Agent": "nlp-learning-site-updater" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function fetchRepo(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return { stars: j.stargazers_count, pushed: (j.pushed_at || "").slice(0, 10) };
}

const data = {};
const errors = [];
const queue = [...repos];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const repo = queue.shift();
    try { data[repo] = await fetchRepo(repo); }
    catch (e) { errors.push(`${repo}: ${e.message}`); }
  }
}));

console.log(`核验完成：${Object.keys(data).length}/${repos.length} 个仓库成功`);
errors.forEach(e => console.warn(`  ⚠ 跳过 ${e}（保留原数据）`));

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

frOut = frOut.replace(
  /(picks:\s*\[\n)[\s\S]*?(\n\s*\],)/,
  `$1${entries.length ? entries.join("\n") : "    // 暂无近 60 天活跃记录"}$2`,
);
frOut = frOut.replace(/updated:\s*"[^"]*"/, `updated: "${fmtDate(new Date())}"`);

// ---------- 4. 有变化才写回（避免无意义的提交循环） ----------
function fmtDate(dt) { return dt.toISOString().slice(0, 10); }
const changed = kbOut !== kb || frOut !== fr;
if (changed) {
  writeFileSync(kbPath, kbOut);
  writeFileSync(frPath, frOut);
  console.log("✅ 数据已更新：", [
    kbOut !== kb && "knowledge.js",
    frOut !== fr && "frontier.js",
  ].filter(Boolean).join("、"));
} else {
  console.log("数据无变化，无需提交");
}
