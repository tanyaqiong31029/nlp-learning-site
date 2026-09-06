/* ============================================================
   前沿动态数据 · frontier.js
   可持续更新机制：
   1. picks（近期动态）—— 基于每月一次的 GitHub API 核验（核验脚本见 README），
      把新观察到的活跃项目按日期追加到最前面即可；
   2. trends（技术趋势）—— 编者观察，建议每季度复核并注明「截至」时间；
   3. live（实时活跃度看板）—— 无需手工维护：页面加载时自动经 GitHub API
      刷新星标与最近推送时间（12 小时缓存，离线/限流时回落到 fallback 数据）。
   ============================================================ */
window.FRONTIER = {
  updated: "2026-09-06",

  // ---- 近期动态（最新在前）----
  picks: [
    {
      date: "2026-09-05",
      repo: "microsoft/generative-ai-for-beginners",
      label: "持续活跃",
      text: "微软官方 21 课生成式 AI 教程本周仍有新提交，内容跟着最新模型与工具链走——零基础入门大模型的第一推荐保持新鲜。",
    },
    {
      date: "2026-09-04",
      repo: "nltk/nltk",
      label: "版本维护",
      text: "语言学家最熟悉的 NLTK 仍在常规维护中；它与免费的 NLTK Book 教材配套使用，依然是理解 NLP 基本概念最好的练手环境。",
    },
    {
      date: "2026-09-03",
      repo: "dh-tech/awesome-digital-humanities",
      label: "新增入选",
      text: "数字人文社区的总清单保持周更节奏，工具与教程分栏持续扩充——做计算人文选题前值得定期来扫一遍。",
    },
    {
      date: "2026-09-01",
      repo: "rasbt/LLMs-from-scratch",
      label: "持续活跃",
      text: "从零实现 LLM 的代码教材本周期仍有提交；想跟进最新实践（推理模型相关章节）的研发向读者值得收藏。",
    },
    {
      date: "2026-08-24",
      repo: "explosion/spaCy",
      label: "版本维护",
      text: "spaCy 稳定迭代中，英文文本处理首选库的地位未变；配套官方课程 course.spacy.io 依旧免费。",
    },
    {
      date: "2026-08-18",
      repo: "keon/awesome-nlp",
      label: "资源更新",
      text: "Awesome NLP 清单更新，新增了多篇 LLM 时代的教程与工具条目——冷门语言/领域的 NLP 资源先来这里找。",
    },
    {
      date: "2026-08-01",
      repo: "cltk/cltk",
      label: "持续活跃",
      text: "古典语言工具包 CLTK 保持活跃，做拉丁语、古希腊语文本分析的研究者可以关注其新版本特性。",
    },
  ],

  // ---- 技术趋势观察（编者视角，随季度复核）----
  trends: [
    {
      icon: "🤖",
      title: "从 Chatbot 到 Agent：NLP 进入「动手」时代",
      text: "2026 年最大的范式转移：模型不再只是对话，而是调用工具、规划步骤、完成长程任务（Long-Horizon Agents）。对研究者的意义：文献综述助手、批量语料标注、多步翻译流水线都能交给 Agent 编排——提示词写法也从「怎么问」变成「怎么布置任务」。",
      refs: [
        { label: "TWIML：AI Trends 2026", url: "https://twimlai.com/podcast/twimlai/ai-trends-2026-openclaw-agents-reasoning-llms/" },
        { label: "LLM Agents 指南", url: "https://www.superannotate.com/blog/llm-agents" },
      ],
    },
    {
      icon: "🧠",
      title: "推理模型与测试时计算成为主线",
      text: "行业重心从「把模型做大」转向「让模型多想几步」：推理驱动的后训练与推理时（inference-time）技术成为竞争焦点。学术上，思维链正扩展为「智能体推理」（Agentic Reasoning）。读论文时会看到更多「思考预算」相关的表述——本质是让模型花更多算力换取更可靠的推理。",
      refs: [
        { label: "Springer：LLM 在 NLP 中的演进与架构趋势", url: "https://link.springer.com/article/10.1186/s40537-026-01429-1" },
        { label: "Agentic Reasoning 综述", url: "https://zhuanlan.zhihu.com/p/1998163875988776128" },
      ],
    },
    {
      icon: "🛠️",
      title: "工程化与评测体系比模型本身更受重视",
      text: "当各家旗舰模型能力接近，竞争转向落地：评测基准（evaluation）、可靠性、成本控制成为关键词。对应用向学习者是好消息——「会设计任务、会评估输出质量」正是文科背景最擅长的部分，也是最不容易被工具替代的能力。",
      refs: [
        { label: "2026 NLP 范式转移观察", url: "https://blog.csdn.net/kkiron/article/details/163855267" },
      ],
    },
    {
      icon: "🌍",
      title: "多语言与低资源语言得到更多关注",
      text: "大模型的多语言能力持续进步，低资源语言、方言与历史文献变体的处理开始出现专门研究——这对语言学研究是直接利好：用大模型辅助濒危语言记录、历史文本转写与方言调查的门槛正在快速降低。留意 Hugging Face 上 multilingual 标签的模型与数据集。",
      refs: [
        { label: "Hugging Face 模型库（multilingual 筛选）", url: "https://huggingface.co/models?other=multilingual" },
      ],
    },
  ],

  // ---- 实时活跃度看板（自动刷新，无需手工维护）----
  live: {
    repos: [
      { repo: "huggingface/transformers", name: "Transformers", fallback: { stars: 164840, pushed: "2026-09-05" } },
      { repo: "microsoft/generative-ai-for-beginners", name: "GenAI for Beginners", fallback: { stars: 119213, pushed: "2026-09-05" } },
      { repo: "rasbt/LLMs-from-scratch", name: "LLMs from Scratch", fallback: { stars: 104395, pushed: "2026-09-01" } },
      { repo: "mlabonne/llm-course", name: "LLM Course", fallback: { stars: 82318, pushed: "2026-02-05" } },
      { repo: "d2l-ai/d2l-zh", name: "动手学深度学习", fallback: { stars: 80313, pushed: "2024-07-30" } },
      { repo: "chinese-poetry/chinese-poetry", name: "chinese-poetry", fallback: { stars: 53360, pushed: "2026-06-17" } },
      { repo: "hankcs/HanLP", name: "HanLP", fallback: { stars: 36486, pushed: "2025-11-15" } },
      { repo: "explosion/spaCy", name: "spaCy", fallback: { stars: 33874, pushed: "2026-08-24" } },
    ],
  },

  // ---- 追踪前沿的固定入口（永远最新的外部页面）----
  feeds: [
    {
      name: "Hugging Face Daily Papers",
      url: "https://huggingface.co/papers",
      desc: "社区投票的每日 LLM / NLP 论文精选榜——想追论文热点，每天扫一眼这里就够了。",
    },
    {
      name: "arXiv cs.CL 最新提交",
      url: "https://arxiv.org/list/cs.CL/recent",
      desc: "计算语言学与 NLP 预印本的官方最新列表，本站书单里 SLP 教材的「活的版本」。",
    },
    {
      name: "GitHub Trending",
      url: "https://github.com/trending/python?since=weekly",
      desc: "每周热门仓库（已按 Python 过滤）——观察学习资源风向的晴雨表。",
    },
    {
      name: "The Batch（DeepLearning.AI）",
      url: "https://www.deeplearning.ai/the-batch/",
      desc: "吴恩达团队的 AI 周报，中文社区的许多解读都源于此，适合每周花十分钟建立信息底座。",
    },
  ],
};
