/* ============================================================
   content.js · 知识库与前沿动态渲染
   依赖：core.js（$、$$、STORE、escapeHtml、fmtStars）
   数据：assets/data/knowledge.js、assets/data/frontier.js
   ============================================================ */
"use strict";
/* exported initContent */

/* ============================================================
   资源知识库（数据见 assets/data/knowledge.js）
   ============================================================ */
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

/* ---------------- 实时活跃度看板（超时 / 限流 / 离线全兜底） ---------------- */
function renderLiveBoard(data) {
  const board = $("#liveBoard");
  if (!board) return;
  // data 为空（离线/限流）或部分失败时，缺失项目回落到内置核验数据
  const fresh = new Map((data || []).map(r => [r.repo, r]));
  const rows = FRONTIER.live.repos
    .map(r => fresh.get(r.repo) || { repo: r.repo, name: r.name, stars: r.fallback.stars, pushed: r.fallback.pushed })
    .sort((a, b) => b.stars - a.stars);
  const max = rows.length ? rows[0].stars : 1;
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

  const flashBadge = note => {
    badge.textContent = note;
    setTimeout(() => { badge.hidden = true; }, 4000);
  };

  // 命中 12 小时缓存：直接用缓存数据
  if (cache && Date.now() - cache.t < TTL && Array.isArray(cache.data) && cache.data.length) {
    renderLiveBoard(cache.data);
    flashBadge(`⚡ 实时数据 · 获取于 ${new Date(cache.t).toLocaleDateString("zh-CN")}`);
    return;
  }

  renderLiveBoard(null); // 先用内置数据兜底，避免空白
  badge.textContent = "⚡ 正在实时获取活跃度…";

  // 网络护栏：8 秒超时；逐仓库容错；半数以上失败则放弃写入缓存
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let rateLimited = false;
  const results = await Promise.allSettled(FRONTIER.live.repos.map(async r => {
    const res = await fetch(`https://api.github.com/repos/${r.repo}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: ctrl.signal,
    });
    if (res.status === 429) throw new Error("rate-limited(429)");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    return { repo: r.repo, name: r.name, stars: j.stargazers_count, pushed: (j.pushed_at || "").slice(0, 10) };
  }));
  clearTimeout(timer);

  const ok = results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);
  rateLimited = results.some(r => r.status === "rejected" && /429/.test(String(r.reason?.message || r.reason)));

  if (ok.length >= Math.ceil(FRONTIER.live.repos.length / 2)) {
    STORE.set(CACHE_KEY, { t: Date.now(), data: ok });
    renderLiveBoard(ok);
    flashBadge("⚡ 活跃度已实时更新");
  } else {
    renderLiveBoard(null);
    flashBadge(rateLimited ? "📡 GitHub 限流：显示内置数据" : "📡 网络受限：显示内置数据");
  }
}

/* ---------------- 内容页初始化 ---------------- */
function initContent() {
  renderKB();
  renderFrontier();
}
