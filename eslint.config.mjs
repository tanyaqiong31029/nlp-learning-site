import js from "@eslint/js";
import globals from "globals";

// 跨文件共享的全局符号（经典多脚本加载，非 ES Module——保证 file:// 双击可用）
const sharedGlobals = Object.fromEntries(
  [
    "$", "$$", "STORE", "escapeHtml", "fmtStars", "copyText",
    "initTheme", "applyTheme", "initCodeTools",
    "initExperiments", "initContent", "currentPageId",
    "KB", "FRONTIER",
  ].map(name => [name, "readonly"]),
);

// node 全局在部分 globals 版本中不含 console/fetch，显式补齐
const extraNodeGlobals = {
  console: "readonly",
  fetch: "readonly",
  process: "readonly",
  URL: "readonly",
  AbortController: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
};

export default [
  js.configs.recommended,
  {
    files: ["assets/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node, ...extraNodeGlobals, ...sharedGlobals },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
    },
  },
  {
    ignores: ["node_modules/**", "promo/**"],
  },
];
