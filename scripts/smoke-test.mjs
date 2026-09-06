#!/usr/bin/env node
/**
 * 冒烟测试：node scripts/smoke-test.mjs <baseURL>
 * 需先起本地静态服务，如：python3 -m http.server 8000
 * 使用系统 Chrome（channel: "chrome"），无需下载浏览器。
 * 覆盖：路由导航 / 知识库搜索 / 三个在线实验 / 进度持久化 / 页面 JS 错误。
 */
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:8000";
const failures = [];
const check = (name, cond, detail = "") => {
  const ok = Boolean(cond);
  console.log(`${ok ? "✅" : "❌"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(name);
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(e.message));
// 关闭平滑滚动，避免点击可操作性检查卡住（初始空白文档无 documentElement，需判空）
await page.addInitScript(() => {
  if (document.documentElement) document.documentElement.style.scrollBehavior = "auto";
});

// ---------- 首页与导航 ----------
await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
check("首页标题", (await page.title()).includes("文科生学 NLP"));
check("导航 9 项", await page.locator(".nav-link").count() === 9);
check("首页有整体进度框", await page.locator("#overallNum").isVisible());
check("无 JS 页面错误(首页)", pageErrors.length === 0, pageErrors.join("; "));

// ---------- 路线图 / 数学 ----------
await page.evaluate(() => { location.hash = "#/roadmap"; });
await page.waitForTimeout(300);
check("路线图激活", await page.locator("#page-roadmap.active").count() === 1);
check("路线步骤 13 个", await page.locator('.check-btn[data-module="roadmap"]').count() === 13);
await page.evaluate(() => { location.hash = "#/math"; });
await page.waitForTimeout(300);
check("数学知识卡 18 张", await page.locator('#page-math .check-btn[data-module="math"]').count() === 18);

// ---------- 知识库 ----------
await page.evaluate(() => { location.hash = "#/kb"; });
await page.waitForTimeout(300);
const kbCards = await page.locator(".kb-card").count();
check("知识库 32 张卡", kbCards === 32, `实际 ${kbCards}`);
check("分类筛选 8 个", await page.locator(".chip-btn").count() === 8);
await page.evaluate(() => {
  const s = document.querySelector("#kbSearch");
  s.value = "分词";
  s.dispatchEvent(new Event("input"));
});
check("搜索「分词」≥3 条", await page.locator(".kb-card").count() >= 3);
await page.evaluate(() => {
  const s = document.querySelector("#kbSearch");
  s.value = "";
  s.dispatchEvent(new Event("input"));
});

// ---------- 前沿动态 ----------
await page.evaluate(() => { location.hash = "#/frontier"; });
await page.waitForTimeout(1500); // 等实时看板（API 或回退）
check("近期动态 ≥1 条", await page.locator(".pick-card").count() >= 1);
check("趋势卡 ≥3 张", await page.locator(".trend-card").count() >= 3);
check("活跃度看板 ≥8 行", await page.locator("#liveBoard tbody tr").count() >= 8);

// ---------- 三个在线实验 ----------
await page.evaluate(() => { location.hash = "#/projects"; });
await page.waitForTimeout(400);
await page.locator("#simRun").click();
await page.waitForTimeout(150);
check("相似度矩阵 5×5", await page.locator("#simOut .simmat td").count() === 25);
await page.locator("#deltaRun").click();
await page.waitForTimeout(150);
const deltaVerdict = await page.locator("#deltaOut .verdict").textContent();
check("文体计量判定为周砚秋", deltaVerdict.includes("周砚秋"), deltaVerdict.slice(0, 40));
await page.locator("#statsRun").click();
await page.waitForTimeout(150);
check("语料统计 6 个指标", await page.locator("#statsOut .stat-chip").count() === 6);
check("无 JS 页面错误(项目页)", pageErrors.length === 0, pageErrors.join("; "));

// ---------- 进度持久化 ----------
await page.evaluate(() => { location.hash = "#/math"; });
await page.waitForTimeout(300);
await page.locator('[data-pid="math-lin-1"]').click();
const pressedAfterClick = await page.locator('[data-pid="math-lin-1"]').getAttribute("aria-pressed");
check("点击后标记生效", pressedAfterClick === "true");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
check("刷新后进度保留", await page.locator('[data-pid="math-lin-1"]').getAttribute("aria-pressed") === "true");
await page.locator('[data-pid="math-lin-1"]').click(); // 还原
check("再次点击取消", await page.locator('[data-pid="math-lin-1"]').getAttribute("aria-pressed") === "false");

// ---------- 汇总 ----------
await browser.close();
if (pageErrors.length) failures.push(`页面 JS 错误: ${pageErrors.join("; ")}`);
console.log(`\n${failures.length ? `❌ ${failures.length} 项失败：\n- ` + failures.join("\n- ") : "✅ 冒烟测试全部通过"}`);
process.exit(failures.length ? 1 : 0);
