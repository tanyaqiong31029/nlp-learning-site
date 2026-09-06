#!/usr/bin/env node
/**
 * 数据 schema 校验（零依赖，node scripts/validate-data.mjs）
 * 校验 assets/data/knowledge.js 与 frontier.js 的结构、字段类型、日期与仓库格式。
 * 任何错误以非零码退出，供本地与 CI 使用。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const DATE_FULL = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MONTH = /^\d{4}-\d{2}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const isoDate = s => !Number.isNaN(new Date(s).getTime());
const notFuture = s => new Date(s).getTime() <= Date.now() + 36 * 3600 * 1000;

function load(name, globalName) {
  const code = readFileSync(join(root, "assets/data", name), "utf8");
  const sandbox = {};
  try {
    new Function("window", code)(sandbox); // 数据文件形如 window.X = {...}
  } catch (e) {
    errors.push(`${name}: JS 解析失败 — ${e.message}`);
    return null;
  }
  const data = sandbox[globalName];
  if (!data) errors.push(`${name}: 未定义 window.${globalName}`);
  return data;
}

function checkStr(obj, field, label, { max = 300 } = {}) {
  const v = obj[field];
  if (typeof v !== "string" || !v.trim()) errors.push(`${label}: ${field} 缺失或非字符串`);
  else if (v.length > max) errors.push(`${label}: ${field} 超过 ${max} 字符（${v.length}）`);
}

// ---------------- knowledge.js ----------------
const KB = load("knowledge.js", "KB");
if (KB) {
  if (!DATE_FULL.test(KB.updated || "")) errors.push(`KB.updated 非法: "${KB.updated}"（需 YYYY-MM-DD）`);
  if (!Array.isArray(KB.categories) || KB.categories.length < 3) errors.push("KB.categories 应至少 3 个分类");
  const seenRepos = new Set();
  let total = 0;
  (KB.categories || []).forEach((cat, ci) => {
    const cl = `KB.categories[${ci}] "${cat.name || cat.id || "?"}"`;
    checkStr(cat, "id", cl, { max: 30 });
    checkStr(cat, "name", cl, { max: 40 });
    checkStr(cat, "desc", cl);
    if (!Array.isArray(cat.items) || cat.items.length < 2) errors.push(`${cl}: items 应至少 2 条`);
    (cat.items || []).forEach((it, ii) => {
      const il = `${cl}.items[${ii}]`;
      total++;
      checkStr(it, "name", il, { max: 60 });
      if (!REPO.test(it.repo || "")) errors.push(`${il}: repo 非法 "${it.repo}"（需 owner/name）`);
      else {
        if (seenRepos.has(it.repo)) errors.push(`${il}: repo 重复 "${it.repo}"`);
        seenRepos.add(it.repo);
      }
      if (!Number.isInteger(it.stars) || it.stars < 0) errors.push(`${il} (${it.repo}): stars 非法 "${it.stars}"`);
      if (!DATE_MONTH.test(it.pushed || "") && !DATE_FULL.test(it.pushed || "")) errors.push(`${il} (${it.repo}): pushed 非法 "${it.pushed}"`);
      else if (!isoDate(it.pushed) || !notFuture(it.pushed)) errors.push(`${il} (${it.repo}): pushed 是无效/未来日期 "${it.pushed}"`);
      checkStr(it, "desc", il, { max: 200 });
      checkStr(it, "why", il, { max: 300 });
      if (!Array.isArray(it.tags) || it.tags.length < 1) errors.push(`${il} (${it.repo}): tags 至少 1 个`);
    });
  });
  if (total < 25) errors.push(`KB 资源总数仅 ${total}，应 ≥ 25（若为误删请检查）`);
  console.log(`knowledge.js: ${KB.categories?.length || 0} 分类 / ${total} 资源`);
}

// ---------------- frontier.js ----------------
const FR = load("frontier.js", "FRONTIER");
if (FR) {
  if (!DATE_FULL.test(FR.updated || "")) errors.push(`FRONTIER.updated 非法: "${FR.updated}"`);
  if (!Array.isArray(FR.picks) || FR.picks.length < 1) errors.push("FRONTIER.picks 不应为空");
  (FR.picks || []).forEach((p, i) => {
    const pl = `FRONTIER.picks[${i}]`;
    if (!DATE_FULL.test(p.date || "")) errors.push(`${pl}: date 非法 "${p.date}"`);
    else if (!notFuture(p.date)) errors.push(`${pl}: date 是未来日期 "${p.date}"`);
    if (!REPO.test(p.repo || "")) errors.push(`${pl}: repo 非法 "${p.repo}"`);
    checkStr(p, "label", pl, { max: 20 });
    checkStr(p, "text", pl, { max: 200 });
  });
  if (!Array.isArray(FR.trends) || FR.trends.length < 3) errors.push("FRONTIER.trends 应至少 3 条");
  (FR.trends || []).forEach((t, i) => {
    const tl = `FRONTIER.trends[${i}]`;
    checkStr(t, "title", tl, { max: 60 });
    checkStr(t, "text", tl, { max: 400 });
    if (!Array.isArray(t.refs) || !t.refs.every(r => /^https?:\/\//.test(r.url || ""))) errors.push(`${tl}: refs 需为 http(s) 链接`);
  });
  if (!Array.isArray(FR.live?.repos) || FR.live.repos.length < 5) errors.push("FRONTIER.live.repos 应至少 5 个");
  (FR.live?.repos || []).forEach((r, i) => {
    const rl = `FRONTIER.live.repos[${i}]`;
    if (!REPO.test(r.repo || "")) errors.push(`${rl}: repo 非法 "${r.repo}"`);
    if (!Number.isInteger(r.fallback?.stars) || r.fallback?.stars < 0) errors.push(`${rl}: fallback.stars 非法`);
    if (!DATE_FULL.test(r.fallback?.pushed || "")) errors.push(`${rl}: fallback.pushed 非法 "${r.fallback?.pushed}"`);
  });
  (FR.feeds || []).forEach((f, i) => {
    if (!/^https?:\/\//.test(f.url || "")) errors.push(`FRONTIER.feeds[${i}]: url 非法`);
    checkStr(f, "name", `FRONTIER.feeds[${i}]`, { max: 60 });
  });
  console.log(`frontier.js: ${FR.picks?.length || 0} 动态 / ${FR.trends?.length || 0} 趋势 / ${FR.live?.repos?.length || 0} 看板项目`);
}

// ---------------- 结果 ----------------
if (errors.length) {
  console.error(`\n❌ schema 校验失败，共 ${errors.length} 处：`);
  errors.forEach(e => console.error("  - " + e));
  process.exit(1);
} else {
  console.log("✅ 数据 schema 校验通过");
}
