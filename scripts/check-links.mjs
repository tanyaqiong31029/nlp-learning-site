#!/usr/bin/env node
/**
 * 链接与本地资源检查（零依赖）
 * 1. index.html / 数据文件中引用的本地文件必须真实存在
 * 2. 页面与数据中的外链逐个探测：4xx/5xx/超时判为失败，403/429/999 等反爬响应判为警告
 * 退出码：存在硬失败（本地缺失 / 404 / 5xx / DNS）→ 1
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const jsText = ["app.js", "core.js", "experiments.js", "content.js"]
  .map(f => { try { return readFileSync(join(root, "assets", f), "utf8"); } catch { return ""; } })
  .join("\n") + ["knowledge.js", "frontier.js"]
  .map(f => readFileSync(join(root, "assets/data", f), "utf8")).join("\n");

// ---------- 本地资源 ----------
const localRefs = [...html.matchAll(/(?:src|href)="(?!https?:|mailto:|#|data:)([^"]+)"/g)]
  .map(m => m[1].split("?")[0].split("#")[0])
  .filter(Boolean);
const missing = [...new Set(localRefs)].filter(p => !existsSync(join(root, p)));
if (missing.length) missing.forEach(p => console.error(`❌ 本地资源缺失: ${p}`));

// ---------- 外链收集 ----------
const externals = [...new Set([
  ...[...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]),
  ...[...jsText.matchAll(/"(https?:\/\/[^"]+)"/g)].map(m => m[1]),
])]
  .filter(u => !/img\.shields\.io|badge\.svg/.test(u))
  .filter(u => !u.includes("${")); // 模板字符串不是真实链接

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 nlp-learning-site-linkcheck" },
    });
    if (res.ok) return { url, level: "ok" };
    if ([403, 405, 429, 999].includes(res.status)) return { url, level: "warn", msg: `HTTP ${res.status}（疑似反爬，请人工确认）` };
    // Cloudflare 源站不可达类（521-523/530）常为地域或反爬因素，人工确认
    if ([521, 522, 523, 530].includes(res.status)) return { url, level: "warn", msg: `HTTP ${res.status}（Cloudflare 源站不可达，请人工确认）` };
    return { url, level: "fail", msg: `HTTP ${res.status}` };
  } catch (e) {
    const msg = e.name === "AbortError" ? "超时(15s)" : e.message.slice(0, 80);
    // DNS 解析失败 = 真失效；连接被重置等网络层错误多为反爬
    if (/ENOTFOUND|EAI_AGAIN/.test(e.message)) return { url, level: "fail", msg };
    if (e.name === "AbortError") return { url, level: "fail", msg };
    return { url, level: "warn", msg: `${msg}（疑似反爬，请人工确认）` };
  } finally { clearTimeout(timer); }
}

const results = [];
const queue = [...externals];
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    let r = await probe(url);
    if (r.level === "fail") { const retry = await probe(url); if (retry.level !== "fail") r = retry; }
    results.push(r);
  }
}));

let fail = missing.length > 0;
console.log(`\n外链检查：${externals.length} 个`);
for (const r of results) {
  if (r.level === "ok") console.log(`  ✅ ${r.url}`);
  else if (r.level === "warn") { console.log(`  ⚠️ ${r.url} — ${r.msg}`); }
  else { fail = true; console.error(`  ❌ ${r.url} — ${r.msg}`); }
}
console.log(`\n汇总：本地资源 ${localRefs.length} 个（缺失 ${missing.length}）· 外链 ${externals.length} 个（失败 ${results.filter(r => r.level === "fail").length}，警告 ${results.filter(r => r.level === "warn").length}）`);
process.exit(fail ? 1 : 0);
