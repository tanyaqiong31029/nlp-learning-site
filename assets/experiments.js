/* ============================================================
   experiments.js · 五个在线实验
   文本相似度（TF-IDF + 余弦）/ Burrows-Delta 文体计量 / 语料统计
   / 下一词预测器（bigram 语言模型）/ 标注一致性（Cohen's kappa）
   依赖：core.js（$、$$、escapeHtml）
   ============================================================ */
"use strict";
/* exported initExperiments */

/* ---------------- 分词工具 ---------------- */
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

/* ============================================================
   实验一 · 文本相似度（单字切分 + TF-IDF + 余弦相似度）
   ============================================================ */
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
  authors.forEach(a => a.texts.forEach(t => entries.push({ key: a.name, f: freq(t) })));
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
const DELTA_UNKNOWN_DEFAULT = "综上所述，语言接触现象值得进一步考察。换言之，若历史文献不足，其结论的可靠性将有所下降。然而，我们通过扩大样本范围并重新进行统计，增强了结论的稳健性。";

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

/* ============================================================
   实验四 · 下一词预测器（bigram 语言模型，字符级）
   ============================================================ */
const LM_DEFAULT_CORPUS = "语言是人类独有的能力。我们用语言思考，用语言交流，用语言记录世界。计算机阅读语言，统计语言，模仿语言。语言的边界就是思想的边界。我们思想的边界，就是我们语言的边界。当计算机开始模仿语言，语言便不再只是人与人之间的桥梁，它也成了人与机器之间的纽带。";
const LM_DEFAULT_SEED = "的";

function bigramModel(text) {
  const cs = text.match(/[\u4e00-\u9fff。]/g) || [];
  const model = new Map();
  for (let i = 0; i + 1 < cs.length; i++) {
    if (!model.has(cs[i])) model.set(cs[i], new Map());
    const row = model.get(cs[i]);
    row.set(cs[i + 1], (row.get(cs[i + 1]) || 0) + 1);
  }
  return { total: cs.length, model };
}

function bigramNext(model, prev) {
  const row = model.get(prev);
  if (!row) return [];
  const total = [...row.values()].reduce((s, v) => s + v, 0);
  return [...row.entries()]
    .map(([ch, n]) => ({ ch, p: n / total }))
    .sort((a, b) => b.p - a.p);
}

function lmReadSeed() {
  const m = $("#lmSeed").value.trim().match(/[\u4e00-\u9fff]/);
  return m ? m[0] : null;
}

function lmBarlist(dist) {
  let html = `<div class="barlist">`;
  dist.forEach(({ ch, p }) => {
    html += `<div class="bar-row"><span class="tok">${escapeHtml(ch)}</span>
      <div class="bar-track mini"><div class="bar-fill" style="width:${(p * 100).toFixed(1)}%"></div></div>
      <span class="num">${(p * 100).toFixed(1)}%</span></div>`;
  });
  return html + `</div>`;
}

function lmValidate(out) {
  if ($("#lmCorpus").value.trim().length < 30) {
    out.innerHTML = `<p class="note">⚠️ 语料太短了——至少给模型 30 个字的"教材"。</p>`;
    return null;
  }
  const seed = lmReadSeed();
  if (!seed) out.innerHTML = `<p class="note">⚠️ 请在"接龙开头"里填一个汉字。</p>`;
  return seed;
}

function runLMPredict() {
  const out = $("#lmOut");
  const seed = lmValidate(out);
  if (!seed) return;
  const { total, model } = bigramModel($("#lmCorpus").value);
  let pairs = 0;
  for (const row of model.values()) pairs += row.size;
  const dist = bigramNext(model, seed);
  if (!dist.length) {
    out.innerHTML = `<p class="verdict">语料里没出现过「${escapeHtml(seed)}」——模型对它一无所知，什么也预测不了。</p>
      <p class="note">💡 这就是语言模型的本质：它"认识"一个字，仅仅因为训练语料里见过它。</p>`;
    return;
  }
  out.innerHTML = `<p class="verdict">「${escapeHtml(seed)}」后面最可能跟：<strong>${dist.slice(0, 3).map(d => escapeHtml(d.ch)).join("、")}</strong></p>
    <h4>P(下字 | 上字="${escapeHtml(seed)}") 的概率榜</h4>
    ${lmBarlist(dist.slice(0, 8))}
    <p class="note">💡 训练语料共 ${total} 个字、${pairs} 种"上字→下字"组合。这张概率榜就是模型的全部知识——GPT 也是它，只是看得更远、参数更多。</p>`;
}

function runLMGenerate() {
  const out = $("#lmOut");
  const seed = lmValidate(out);
  if (!seed) return;
  const { model } = bigramModel($("#lmCorpus").value);
  const picked = [seed];
  for (let i = 0; i < 20; i++) {
    const dist = bigramNext(model, picked[picked.length - 1]);
    if (!dist.length) break;
    picked.push(dist[0].ch); // 贪心：每一步都选概率最高的字
  }
  out.innerHTML = `<p class="verdict">模型续写：<strong>${escapeHtml(picked.join(""))}</strong></p>
    <p class="note">💡 这是"贪心"生成。它常常原地打转——只有一步记忆的模型很快绕回自己最熟的循环。GPT 的两剂解药：看得更远（几千 token 的上下文）＋按概率掷骰子（采样与温度）。</p>`;
}

/* ============================================================
   实验五 · 标注一致性实验台（Cohen's kappa，两人 × 10 条）
   ============================================================ */
const KAPPA_LEVELS = ["差", "中", "良", "优"];
const KAPPA_N = 10;
const KAPPA_DEFAULT_A = [3, 2, 3, 1, 0, 2, 3, 1, 2, 3];
const KAPPA_DEFAULT_B = [3, 1, 2, 1, 0, 2, 3, 0, 2, 2];

function buildKappaGrid() {
  const opts = KAPPA_LEVELS.map((lv, v) => `<option value="${v}">${lv}</option>`).join("");
  let html = `<div class="kappa-row kappa-head"><span></span><span>评分者 A（你）</span><span>评分者 B</span></div>`;
  for (let i = 0; i < KAPPA_N; i++) {
    html += `<div class="kappa-row"><span class="item-name">条目 ${i + 1}</span>
      <select data-rater="a" aria-label="评分者A对条目${i + 1}打分">${opts}</select>
      <select data-rater="b" aria-label="评分者B对条目${i + 1}打分">${opts}</select></div>`;
  }
  $("#kappaGrid").innerHTML = html;
}

function kappaBand(k) {
  if (k < 0) return "比碰巧还差——评分标准可能有误会";
  if (k <= 0.2) return "略有一致";
  if (k <= 0.4) return "一般（先修标注规范，再谈数据）";
  if (k <= 0.6) return "中等一致";
  if (k <= 0.8) return "强一致";
  return "几乎完全一致";
}

function runKappa() {
  const a = $$("#kappaGrid select[data-rater='a']").map(s => Number(s.value));
  const b = $$("#kappaGrid select[data-rater='b']").map(s => Number(s.value));
  const out = $("#kappaOut");
  if (a.length !== KAPPA_N || b.length !== KAPPA_N) {
    out.innerHTML = `<p class="note">⚠️ 打分行还没有生成，请刷新页面。</p>`;
    return;
  }
  const n = a.length;
  const po = a.filter((x, i) => x === b[i]).length / n;
  const ca = KAPPA_LEVELS.map((_, c) => a.filter(v => v === c).length);
  const cb = KAPPA_LEVELS.map((_, c) => b.filter(v => v === c).length);
  const pe = ca.reduce((s, x, c) => s + (x * cb[c]) / n ** 2, 0);
  const kappa = pe < 1 ? (po - pe) / (1 - pe) : 1;

  let html = `<p class="verdict">Cohen's κ = <strong>${kappa.toFixed(2)}</strong> · ${kappaBand(kappa)}</p>`;
  html += `<div class="stat-chips">
    <div class="stat-chip"><b>${po.toFixed(2)}</b><span>实际一致率 po</span></div>
    <div class="stat-chip"><b>${pe.toFixed(2)}</b><span>碰巧一致率 pe</span></div>
    <div class="stat-chip"><b>${kappa.toFixed(2)}</b><span>Cohen's κ</span></div>
  </div>`;
  html += `<h4>打分交叉表（行 = 评分者 A，列 = 评分者 B）</h4><div style="overflow-x:auto"><table class="simmat"><thead><tr><th></th>${KAPPA_LEVELS.map(lv => `<th>${lv}</th>`).join("")}</tr></thead><tbody>`;
  KAPPA_LEVELS.forEach((lv, r) => {
    html += `<tr><th class="row-label">${lv}</th>`;
    KAPPA_LEVELS.forEach((_, c) => {
      const cell = a.reduce((s, x, i) => s + (x === r && b[i] === c ? 1 : 0), 0);
      html += `<td style="${r === c ? "background:var(--soft);" : ""}${r === c && cell ? "font-weight:700;" : ""}">${cell || "·"}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  html += `<p class="note">💡 κ 扣掉了"瞎蒙也能蒙对"的部分，所以比直接算重合百分比更公平——两人都只打「优」时重合率 100%，κ 却可能不高。把评分者 B 换成 LLM 的打分，就是校验 LLM-as-a-Judge 是否可信的标准做法。</p>`;
  out.innerHTML = html;
}

function resetKappa() {
  $$("#kappaGrid select[data-rater='a']").forEach((s, i) => (s.value = KAPPA_DEFAULT_A[i]));
  $$("#kappaGrid select[data-rater='b']").forEach((s, i) => (s.value = KAPPA_DEFAULT_B[i]));
  runKappa();
}

/* ---------------- 实验初始化 ---------------- */
function initExperiments() {
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
  $("#lmReset").addEventListener("click", () => {
    $("#lmCorpus").value = LM_DEFAULT_CORPUS;
    $("#lmSeed").value = LM_DEFAULT_SEED;
    runLMPredict();
  });
  $("#kappaReset").addEventListener("click", resetKappa);

  $("#simRun").addEventListener("click", runSimilarity);
  $("#deltaRun").addEventListener("click", runDelta);
  $("#statsRun").addEventListener("click", runStats);
  $("#lmRun").addEventListener("click", runLMPredict);
  $("#lmGen").addEventListener("click", runLMGenerate);
  $("#kappaRun").addEventListener("click", runKappa);

  // 标注一致性实验台：生成打分行并填入示例（其他实验的语料在 HTML 里）
  buildKappaGrid();
  resetKappa();

  // 首次进入项目页时预跑一遍，避免空白
  const preRun = () => {
    if (currentPageId() === "projects") {
      runSimilarity(); runDelta(); runStats(); runLMPredict();
      window.removeEventListener("hashchange", preRun);
    }
  };
  if (currentPageId() === "projects") preRun();
  else window.addEventListener("hashchange", preRun);
}
