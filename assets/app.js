/* ============================================================
   文科生学 NLP · app.js
   零依赖：hash 路由 / 学习进度 / 主题切换 / 三个在线实验
   ============================================================ */
"use strict";

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

const PROGRESS_KEY = "nlp-map-progress-v1";
let progress = STORE.get(PROGRESS_KEY, {});

/* ---------------- 主题 ---------------- */
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
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("#themeToggle").textContent = dark ? "☀️" : "🌙";
}

/* ---------------- 导航 / 路由 ---------------- */
const PAGES = [
  { id: "home", title: "首页" },
  { id: "roadmap", title: "学习路线图" },
  { id: "math", title: "数学基础" },
  { id: "python", title: "Python 编程" },
  { id: "nlp", title: "NLP 概念" },
  { id: "projects", title: "实操项目" },
  { id: "kb", title: "资源知识库" },
  { id: "frontier", title: "前沿动态" },
  { id: "resources", title: "书单与资源" },
];

function currentPageId() {
  const m = location.hash.match(/^#\/([a-z]+)/);
  return m && PAGES.some(p => p.id === m[1]) ? m[1] : "home";
}

function renderRoute() {
  const id = currentPageId();
  $$(".page").forEach(sec => sec.classList.toggle("active", sec.id === `page-${id}`));
  $$(".nav-link").forEach(a => {
    const active = a.getAttribute("href") === `#/${id}`;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const meta = PAGES.find(p => p.id === id);
  document.title = (meta && id !== "home" ? `${meta.title} · ` : "") + "文科生学 NLP";
  $("#topbar").classList.remove("nav-open");
  $("#menuToggle").setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0 });
}

function initRouter() {
  window.addEventListener("hashchange", renderRoute);
  $("#menuToggle").addEventListener("click", () => {
    const open = $("#topbar").classList.toggle("nav-open");
    $("#menuToggle").setAttribute("aria-expanded", String(open));
  });
  buildPager();
}

function buildPager() {
  PAGES.forEach((p, i) => {
    const sec = $(`#page-${p.id}`);
    if (!sec) return;
    const prev = PAGES[i - 1], next = PAGES[i + 1];
    if (!prev && !next) return;
    const div = document.createElement("div");
    div.className = "pager";
    div.innerHTML =
      (prev ? `<a href="#/${prev.id}"><small>← 上一页</small>${prev.title}</a>` : "<span></span>") +
      (next ? `<a class="next" href="#/${next.id}"><small>下一页 →</small>${next.title}</a>` : "<span></span>");
    sec.querySelector(".container").appendChild(div);
  });
}

/* ---------------- 学习进度 ---------------- */
function initProgress() {
  $$(".check-btn[data-pid]").forEach(btn => {
    const pid = btn.dataset.pid;
    const sync = () => btn.setAttribute("aria-pressed", String(!!progress[pid]));
    sync();
    btn.addEventListener("click", () => {
      if (progress[pid]) delete progress[pid];
      else progress[pid] = Date.now();
      STORE.set(PROGRESS_KEY, progress);
      sync();
      btn.closest(".kcard")?.classList.toggle("done", !!progress[pid]);
      refreshProgressUI();
    });
    // 初始卡片状态
    if (progress[pid]) btn.closest(".kcard")?.classList.add("done");
  });
  refreshProgressUI();

  $("#resetProgress").addEventListener("click", () => {
    if (!confirm("确定要清空全部学习进度吗？此操作不可恢复。")) return;
    progress = {};
    STORE.set(PROGRESS_KEY, progress);
    $$(".check-btn[data-pid]").forEach(b => {
      b.setAttribute("aria-pressed", "false");
      b.closest(".kcard")?.classList.remove("done");
    });
    refreshProgressUI();
  });
}

function moduleStats(module) {
  const btns = $$(`.check-btn[data-module="${module}"]`);
  const done = btns.filter(b => progress[b.dataset.pid]).length;
  return { done, total: btns.length };
}

function refreshProgressUI() {
  $$("[data-module-progress]").forEach(el => {
    const { done, total } = moduleStats(el.dataset.moduleProgress);
    if (el.classList.contains("bar-fill")) el.style.width = total ? `${(done / total) * 100}%` : "0%";
    else el.textContent = `${done} / ${total}`;
  });
  const all = $$(".check-btn[data-pid]");
  const doneAll = all.filter(b => progress[b.dataset.pid]).length;
  const pct = all.length ? Math.round((doneAll / all.length) * 100) : 0;
  $("#overallNum").textContent = `已掌握 ${doneAll} / ${all.length} 项`;
  $("#overallPct").textContent = `完成 ${pct}%`;
  $("#overallBar").style.width = `${pct}%`;
}

/* ---------------- 复制 / 下载 ---------------- */
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

/* ============================================================
   实验一 · 文本相似度（字符二元组 + TF-IDF + 余弦相似度）
   ============================================================ */
function latinWords(text) {
  return text.toLowerCase().match(/[a-z][a-z'’-]*/g) || [];
}
function cjkNgrams(text, n) {
  const cs = text.match(/[\u4e00-\u9fff]/g) || [];
  const out = [];
  if (cs.length === 1) out.push(cs[0]);
  for (let i = 0; i + n <= cs.length; i++) out.push(cs.slice(i, i + n).join(""));
  return out;
}

function tfidfMatrix(docs) {
  // 单字 + 英文词：中文无需分词，短文本上区分度最好
  const toksList = docs.map(d => [...cjkNgrams(d, 1), ...latinWords(d)]);
  const N = docs.length;
  const df = new Map();
  const tfs = toksList.map(toks => {
    const m = new Map();
    toks.forEach(t => m.set(t, (m.get(t) || 0) + 1));
    for (const t of m.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { toks, m };
  });
  return tfs.map(({ toks, m }) => {
    const L = toks.length || 1;
    const v = new Map();
    for (const [t, c] of m) v.set(t, (c / L) * (Math.log((1 + N) / (1 + (df.get(t) || 0))) + 1));
    return v;
  });
}

function cosineMaps(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [, x] of a) na += x * x;
  for (const [, y] of b) nb += y * y;
  for (const [t, x] of a) { const y = b.get(t); if (y) dot += x * y; }
  return dot / ((Math.sqrt(na) * Math.sqrt(nb)) || 1);
}

function runSimilarity() {
  const docs = $$("#simInputs textarea").map(t => t.value.trim());
  const out = $("#simOut");
  if (docs.some(d => !d)) {
    out.innerHTML = `<p class="note">⚠️ 每个文档框都要有内容哦——空着的请删掉或补上。</p>`;
    return;
  }
  const vecs = tfidfMatrix(docs);
  const N = docs.length;
  const labels = docs.map((d, i) => `文档${i + 1}（${d.slice(0, 6)}…）`);

  let best = { i: -1, j: -1, v: -1 };
  let worst = { i: -1, j: -1, v: 2 };
  let maxOff = 0;
  const sim = [];
  for (let i = 0; i < N; i++) {
    sim.push([]);
    for (let j = 0; j < N; j++) {
      const v = i === j ? 1 : cosineMaps(vecs[i], vecs[j]);
      sim[i].push(v);
      if (i < j) {
        maxOff = Math.max(maxOff, v);
        if (v > best.v) best = { i, j, v };
        if (v < worst.v) worst = { i, j, v };
      }
    }
  }

  let html = `<h4>相似度矩阵（余弦相似度，越接近 1 越相似）</h4><div style="overflow-x:auto"><table class="simmat"><thead><tr><th></th>${docs.map((_, j) => `<th>D${j + 1}</th>`).join("")}</tr></thead><tbody>`;
  for (let i = 0; i < N; i++) {
    html += `<tr><th class="row-label">${labels[i]}</th>`;
    for (let j = 0; j < N; j++) {
      if (i === j) { html += `<td class="diag">—</td>`; continue; }
      const v = sim[i][j];
      // 颜色按最大非对角值归一化，保证任意语料下热力都醒目
      const alpha = maxOff > 0 ? Math.min(0.92, Math.pow(v / maxOff, 1.3) * 0.85) : 0;
      const color = alpha > 0.5 ? "#fff" : "inherit";
      const strong = (best.i === i && best.j === j) || (best.i === j && best.j === i);
      html += `<td style="background:rgba(15,157,140,${alpha.toFixed(3)});color:${color};${strong ? "font-weight:700;" : ""}">${v.toFixed(2)}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;
  html += `<p class="verdict">🔍 <strong>最相似：${labels[best.i]} ↔ ${labels[best.j]}（${best.v.toFixed(2)}）</strong>；最不像的一对是 文档${worst.i + 1} 和 文档${worst.j + 1}（${worst.v.toFixed(2)}）。</p>`;
  html += `<p class="note">💡 试试把它们换成你论文的不同章节——看看哪些段落写得"最像"。</p>`;
  out.innerHTML = html;
}

const SIM_DEFAULTS = [
  "春天的西湖游人如织，苏堤春晓桃红柳绿，断桥边杨柳依依。",
  "夜晚的西湖别有韵味，湖面倒映着灯火，断桥与雷峰塔遥遥相望。",
  "梯度下降是训练神经网络最常用的优化算法，沿着损失下降的方向更新参数。",
  "反向传播利用链式法则逐层计算梯度，神经网络通过不断更新参数来降低损失。",
  "杭帮菜讲究清淡鲜嫩，西湖醋鱼与龙井虾仁是最有名的两道菜。",
];

/* ============================================================
   实验二 · Burrows-Delta 文体计量（经典算法，字符级）
   ============================================================ */
function runDelta() {
  const authorNames = ["文生", "林小满", "周砚秋"];
  const authors = authorNames.map(name => ({
    name,
    texts: $$(`#deltaInputs textarea[data-author="${name}"]`).map(t => t.value.trim()),
  }));
  const unknown = $("#deltaUnknown").value.trim();
  const out = $("#deltaOut");

  if (!unknown || authors.some(a => a.texts.some(t => !t))) {
    out.innerHTML = `<p class="note">⚠️ 每个样本框都要有内容才能判定哦。</p>`;
    return;
  }

  const TOP_N = 30;
  const freq = text => {
    const cs = text.match(/[\u4e00-\u9fff]/g) || [];
    const m = new Map();
    cs.forEach(c => m.set(c, (m.get(c) || 0) + 1));
    const f = new Map();
    for (const [c, x] of m) f.set(c, x / (cs.length || 1));
    return f;
  };

  const entries = [];
  authors.forEach(a => a.texts.forEach((t, i) => entries.push({ key: a.name, f: freq(t) })));
  entries.push({ key: "__unknown__", f: freq(unknown) });

  // 取全语料最高频的 TOP_N 个字
  const total = new Map();
  entries.forEach(({ f }) => { for (const [c, x] of f) total.set(c, (total.get(c) || 0) + x); });
  const top = [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N).map(e => e[0]);

  // 每个字跨文本 z 分数标准化（Burrows 1982）
  const z = entries.map(() => new Map());
  top.forEach(w => {
    const vals = entries.map(e => e.f.get(w) || 0);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    vals.forEach((v, i) => z[i].set(w, sd > 0 ? (v - mean) / sd : 0));
  });

  // 作者画像 = 其样本 z 分数均值；Delta = 与待判定文本 z 分数的平均绝对差
  const zUnknown = z[z.length - 1];
  const deltas = authors.map(a => {
    const idxs = entries.map((e, i) => (e.key === a.name ? i : -1)).filter(i => i >= 0);
    let s = 0;
    top.forEach(w => {
      const profile = idxs.reduce((acc, i) => acc + z[i].get(w), 0) / idxs.length;
      s += Math.abs(zUnknown.get(w) - profile);
    });
    return { name: a.name, d: s / top.length };
  }).sort((x, y) => x.d - y.d);

  const winner = deltas[0];
  const maxD = Math.max(...deltas.map(x => x.d));

  let html = `<p class="verdict">🎯 判定结果：<strong>待判定文本与「${winner.name}」的文风最接近</strong>（Delta = ${winner.d.toFixed(3)}，越小越像）。</p>`;
  html += `<h4>与各作者的文体距离</h4><div class="barlist">`;
  deltas.forEach(x => {
    const w = Math.max(6, (winner.d / x.d) * 100);
    html += `<div class="bar-row"><span class="tok">${x.name}</span>
      <div class="bar-track mini"><div class="bar-fill" style="width:${w.toFixed(1)}%;${x === winner ? "" : "opacity:.35"}"></div></div>
      <span class="num">${x.d.toFixed(3)}</span></div>`;
  });
  html += `</div><p class="note">💡 原理回看：算法只看最高频 ${TOP_N} 个"功能字"的使用指纹（之、乎、的、真、然……），完全不看内容词——所以它判的是"谁在写"，不是"写了什么"。</p>`;
  out.innerHTML = html;
}

const DELTA_DEFAULTS = {
  文生: [
    "夫为学之道，贵在恒。人之为学，如逆水行舟，不进则退。故君子之于学也，日夜孜孜，不亦宜乎。",
    "文者，载道之器也。世人多骛于辞藻，而忽于义理，是舍本而逐末也。故吾尝论之曰：道胜则文自至，何必他求哉。",
  ],
  林小满: [
    "我真的特别喜欢这家小店，老板人也超好，每次去都会送我们一点小点心，真的很感动。",
    "说实话，那个电影我看了三遍，每次都觉得特别有意思，真的是那种越看越有味道的片子，强烈推荐。",
  ],
  周砚秋: [
    "然而，这一假设存在明显局限。换言之，若语料规模不足，则统计结果的可靠性将显著下降。因此，本文进一步扩大了样本范围。",
    "值得注意的是，两种方法的结论并不一致。然而，二者的统计差异可能源于语料规模。因此，我们重新审视了这一理论框架。",
  ],
};
const DELTA_UNKNOWN_DEFAULT = "综上所述，语言接触现象值得进一步考察。换言之，若历史文献不足，其结论的可靠性便难以保证。然而，我们通过扩大样本范围并重新进行统计，增强了结论的稳健性。";

/* ============================================================
   实验三 · 语料处理实验台（统计指标 + 高频列表）
   ============================================================ */
function runStats() {
  const text = $("#corpusText").value;
  const mode = $("#statsMode").value;
  const out = $("#statsOut");
  if (!text.trim()) {
    out.innerHTML = `<p class="note">⚠️ 请先粘贴一段语料。</p>`;
    return;
  }

  const cjk = text.match(/[\u4e00-\u9fff]/g) || [];
  const latin = latinWords(text);
  const tokens = mode === "char" ? [...cjk, ...latin] : [...cjkNgrams(text, 2), ...latin];
  const counter = new Map();
  tokens.forEach(t => counter.set(t, (counter.get(t) || 0) + 1));
  const top = [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const sentences = text.split(/[。！？!?；;]+/).map(s => s.trim()).filter(Boolean);
  const maxCount = top.length ? top[0][1] : 1;

  const chips = [
    [text.replace(/\s/g, "").length, "总字符数"],
    [tokens.length, mode === "char" ? "形符数（字）" : "形符数（token）"],
    [counter.size, "类符数（不同）"],
    [((counter.size / Math.max(1, tokens.length)) * 100).toFixed(1) + "%", "TTR 词汇丰富度"],
    [sentences.length, "句子数"],
    [(tokens.length / Math.max(1, sentences.length)).toFixed(1), "平均句长"],
  ];

  let html = `<div class="stat-chips">`;
  chips.forEach(([v, label]) => { html += `<div class="stat-chip"><b>${v}</b><span>${label}</span></div>`; });
  html += `</div><h4>Top 20 高频${mode === "char" ? "字" : "二元组"}</h4><div class="barlist">`;
  top.forEach(([tok, n]) => {
    html += `<div class="bar-row"><span class="tok">${escapeHtml(tok)}</span>
      <div class="bar-track mini"><div class="bar-fill" style="width:${((n / maxCount) * 100).toFixed(1)}%"></div></div>
      <span class="num">${n} 次</span></div>`;
  });
  html += `</div><p class="note">💡 ${mode === "char"
    ? "字符模式下 TTR 偏低是正常的——汉字总量有限。切换到「二元组」模式再试试。"
    : "二元组是\"近似分词\"；想得到真正的词，请用下方 Python 脚本里的 jieba。"} 高频榜的形状，就藏着 Zipf 定律。</p>`;
  out.innerHTML = html;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ============================================================
   资源知识库（数据见 assets/data/knowledge.js）
   ============================================================ */
function fmtStars(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

let kbCat = "all";

function renderKB() {
  if (!window.KB) return;
  const updatedEl = $("#kbUpdated");
  if (updatedEl) updatedEl.textContent = `数据核验于 ${KB.updated} · GitHub API`;
  const chipsEl = $("#kbChips");
  const listEl = $("#kbList");
  if (!chipsEl || !listEl) return;

  chipsEl.innerHTML = `<button class="chip-btn${kbCat === "all" ? " active" : ""}" data-cat="all" type="button">全部</button>` +
    KB.categories.map(c =>
      `<button class="chip-btn${kbCat === c.id ? " active" : ""}" data-cat="${c.id}" type="button">${c.icon} ${c.name}</button>`
    ).join("");
  chipsEl.onclick = e => {
    const btn = e.target.closest(".chip-btn");
    if (!btn) return;
    kbCat = btn.dataset.cat;
    renderKB();
  };

  $("#kbSearch").oninput = draw;

  function itemCard(it) {
    const kw = ["name", "desc", "why", "repo"].map(k => (it[k] || "")).join(" ") + " " + (it.tags || []).join(" ");
    return { it, kw: kw.toLowerCase() };
  }

  function draw() {
    const q = $("#kbSearch").value.trim().toLowerCase();
    let html = "";
    let shown = 0;
    KB.categories.forEach(cat => {
      if (kbCat !== "all" && kbCat !== cat.id) return;
      const items = cat.items
        .map(itemCard)
        .filter(({ kw }) => !q || kw.includes(q) || cat.name.toLowerCase().includes(q));
      if (!items.length) return;
      shown += items.length;
      html += `<div class="group-head"><h3>${cat.icon} ${cat.name} <span class="stars">${items.length} 个资源</span></h3><p>${cat.desc}</p></div>`;
      html += `<div class="kgrid kb-grid">`;
      items.forEach(({ it }) => {
        html += `<article class="kb-card">
          <div class="kb-head">
            <h4><a href="https://github.com/${it.repo}" target="_blank" rel="noopener">${escapeHtml(it.name)} ↗</a></h4>
            <span class="stars-badge" title="GitHub 星标（核验值）">⭐ ${fmtStars(it.stars)}</span>
          </div>
          <p class="kb-desc">${escapeHtml(it.desc)}</p>
          <p class="kb-why"><span>推荐理由</span>${escapeHtml(it.why)}</p>
          <div class="kb-foot">
            <span class="chip mono">${it.repo}</span>
            <span class="chip">更新至 ${it.pushed}</span>
            ${(it.tags || []).map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("")}
          </div>
        </article>`;
      });
      html += `</div>`;
    });
    if (!shown) {
      html = `<div class="kb-empty">🔍 没有匹配「${escapeHtml($("#kbSearch").value)}」的资源。<br>换个关键词，或点击「全部」重置筛选。</div>`;
    }
    listEl.innerHTML = html;
  }

  draw();
}

/* ============================================================
   前沿动态（数据见 assets/data/frontier.js）
   ============================================================ */
function renderFrontier() {
  if (!window.FRONTIER) return;
  const updatedEl = $("#frontierUpdated");
  if (updatedEl) updatedEl.textContent = `数据核验于 ${FRONTIER.updated} · GitHub API`;
  const el = $("#frontierContent");
  if (!el) return;

  let html = "";

  // 近期动态
  html += `<h3 class="fe-h">🗞️ 近期动态 <span class="stars">活跃项目观察</span></h3><div class="pick-list">`;
  FRONTIER.picks.forEach(p => {
    html += `<div class="pick-card">
      <span class="pick-date">${p.date}</span>
      <div class="pick-body">
        <a href="https://github.com/${p.repo}" target="_blank" rel="noopener">${p.repo.split("/")[1]}</a>
        <span class="pick-label">${p.label}</span>
        <p>${escapeHtml(p.text)}</p>
      </div>
    </div>`;
  });
  html += `</div>`;

  // 实时活跃度看板
  html += `<h3 class="fe-h">📊 热门项目活跃度看板 <span class="stars">GitHub API 实时刷新</span></h3>
    <div class="card live-card"><div id="liveBoard" style="overflow-x:auto"></div>
    <p class="muted small live-note">打开本页时自动向 GitHub API 查询最新星标与推送时间（12 小时缓存）；离线或触发限流时显示上方核验日的内置数据。</p></div>`;

  // 技术趋势
  html += `<h3 class="fe-h">🧭 技术趋势观察 <span class="stars">编者视角 · 随季度复核</span></h3><div class="kgrid trend-grid">`;
  FRONTIER.trends.forEach(t => {
    html += `<article class="kcard trend-card">
      <div class="kcard-head"><h4>${t.icon} ${escapeHtml(t.title)}</h4></div>
      <p class="kb-desc">${escapeHtml(t.text)}</p>
      <div class="kb-foot">${(t.refs || []).map(r => `<a class="trend-ref" href="${r.url}" target="_blank" rel="noopener">${escapeHtml(r.label)} ↗</a>`).join("")}</div>
    </article>`;
  });
  html += `</div>`;

  // 追踪入口
  html += `<h3 class="fe-h">🔭 追踪前沿的固定入口 <span class="stars">永远最新的外部页面</span></h3><div class="feed-grid">`;
  FRONTIER.feeds.forEach(f => {
    html += `<a class="feed-card" href="${f.url}" target="_blank" rel="noopener">
      <strong>${escapeHtml(f.name)} ↗</strong>
      <p>${escapeHtml(f.desc)}</p>
    </a>`;
  });
  html += `</div>`;

  el.innerHTML = html;
  loadLiveBoard();
}

function renderLiveBoard(data, isLive) {
  const board = $("#liveBoard");
  if (!board) return;
  const rows = (data || FRONTIER.live.repos.map(r => ({
    repo: r.repo, name: r.name, stars: r.fallback.stars, pushed: r.fallback.pushed,
  }))).slice().sort((a, b) => b.stars - a.stars);
  const max = rows[0] ? rows[0].stars : 1;
  let html = `<table class="live-table"><thead><tr><th>项目</th><th>⭐ 星标</th><th style="min-width:130px">体量</th><th>最近推送</th></tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr>
      <td><a href="https://github.com/${r.repo}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a></td>
      <td class="live-stars">${fmtStars(r.stars)}</td>
      <td><div class="bar-track mini"><div class="bar-fill" style="width:${((r.stars / max) * 100).toFixed(1)}%"></div></div></td>
      <td class="muted">${r.pushed || "—"}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  board.innerHTML = html;
}

async function loadLiveBoard() {
  const badge = $("#liveBadge");
  if (!badge) return;
  badge.hidden = false;
  const CACHE_KEY = "frontier-live-v1";
  const TTL = 12 * 3600 * 1000;
  const cache = STORE.get(CACHE_KEY, null);

  const finish = (data, note) => {
    renderLiveBoard(data, true);
    badge.textContent = note;
    setTimeout(() => { badge.hidden = true; }, 4000);
  };

  if (cache && Date.now() - cache.t < TTL && Array.isArray(cache.data)) {
    finish(cache.data, `⚡ 实时数据 · 获取于 ${new Date(cache.t).toLocaleDateString("zh-CN")}`);
    return;
  }

  renderLiveBoard(null, false); // 先用内置数据兜底
  badge.textContent = "⚡ 正在实时获取活跃度…";
  try {
    const data = await Promise.all(FRONTIER.live.repos.map(async r => {
      const res = await fetch(`https://api.github.com/repos/${r.repo}`, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      return { repo: r.repo, name: r.name, stars: j.stargazers_count, pushed: (j.pushed_at || "").slice(0, 10) };
    }));
    STORE.set(CACHE_KEY, { t: Date.now(), data });
    finish(data, "⚡ 活跃度已实时更新");
  } catch {
    finish(null, "📡 离线或限流：显示内置数据");
  }
}

/* ---------------- 实验初始化 ---------------- */
function initDemos() {
  renderKB();
  renderFrontier();
  // 恢复默认按钮
  $("#simReset").addEventListener("click", () => {
    $$("#simInputs textarea").forEach((t, i) => (t.value = SIM_DEFAULTS[i] || ""));
    runSimilarity();
  });
  $("#deltaReset").addEventListener("click", () => {
    $$("#deltaInputs textarea").forEach(t => {
      const name = t.dataset.author;
      const pool = DELTA_DEFAULTS[name] || [];
      const idx = $$(`#deltaInputs textarea[data-author="${name}"]`).indexOf(t);
      t.value = pool[idx] || "";
    });
    $("#deltaUnknown").value = DELTA_UNKNOWN_DEFAULT;
    runDelta();
  });

  $("#simRun").addEventListener("click", runSimilarity);
  $("#deltaRun").addEventListener("click", runDelta);
  $("#statsRun").addEventListener("click", runStats);

  // 首次进入页面时预跑一遍，避免空白
  const preRun = () => {
    if (currentPageId() === "projects") {
      runSimilarity(); runDelta(); runStats();
      window.removeEventListener("hashchange", preRun);
    }
  };
  if (currentPageId() === "projects") preRun();
  else window.addEventListener("hashchange", preRun);
}

/* ---------------- 启动 ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initRouter();
  initProgress();
  initCodeTools();
  initDemos();
  renderRoute();
});
