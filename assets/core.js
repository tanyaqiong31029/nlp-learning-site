/* ============================================================
   core.js · 共享基础
   工具函数 / 本地存储 / 主题切换 / 代码块复制下载
   加载顺序：必须在 experiments.js、content.js、app.js 之前
   ============================================================ */
"use strict";
/* exported $, $$, STORE, escapeHtml, fmtStars, applyTheme, initTheme, copyText, initCodeTools */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------------- 存储工具 ---------------- */
const STORE = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 隐私模式等场景忽略 */ }
  },
};

/* ---------------- 通用工具 ---------------- */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtStars(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

/* ---------------- 主题 ---------------- */
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("#themeToggle").textContent = dark ? "☀️" : "🌙";
}

function initTheme() {
  const saved = STORE.get("nlp-map-theme", null);
  const dark = saved ? saved === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(dark);
  $("#themeToggle").addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    applyTheme(!isDark);
    STORE.set("nlp-map-theme", !isDark ? "dark" : "light");
  });
}

/* ---------------- 代码块复制 / 下载 ---------------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch { return false; }
  }
}

function initCodeTools() {
  $$(".code-block").forEach(block => {
    const code = block.querySelector("code");
    const copyBtn = block.querySelector(".copy-btn");
    if (copyBtn) copyBtn.addEventListener("click", async () => {
      const ok = await copyText(code.innerText);
      copyBtn.textContent = ok ? "已复制 ✓" : "复制失败";
      setTimeout(() => (copyBtn.textContent = "复制"), 1600);
    });
    const dlBtn = block.querySelector(".dl-btn");
    if (dlBtn) dlBtn.addEventListener("click", () => {
      const blob = new Blob([code.innerText], { type: "text/x-python;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = dlBtn.dataset.fname || "script.py";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });
}
