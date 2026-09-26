/* ============================================================
   前沿动态数据 · frontier.js
   可持续更新机制（已全自动）：
   1. picks（近期动态）—— 由 scripts/update-data.mjs 每日自动重新生成
      （GitHub Actions 定时运行：核验推送时间 → 按近 60 天活跃度排序），
      请勿手工编辑本区块；手工观察请写入 trends；
   2. trends（技术趋势）—— 编者观察，建议每季度复核并注明「截至」时间；
   3. live（实时活跃度看板）—— 页面加载时自动经 GitHub API 刷新
      （12 小时缓存，离线/限流时回落到 fallback 数据，fallback 由脚本每日更新）。
   ============================================================ */
window.FRONTIER = {
  updated: "2026-09-26",

  // ---- 近期动态（最新在前）----
  picks: [
    {
      date: "2026-09-26",
      repo: "openai/openai-cookbook",
      label: "自动核验",
      text: "OpenAI 官方的 API 使用示例与实操指南合集。GitHub API 每日核验：最近推送 2026-09-26，当前星标 76.2k。",
    },
    {
      date: "2026-09-26",
      repo: "huggingface/transformers",
      label: "自动核验",
      text: "Hugging Face 旗舰库：数千个预训练模型的一站式下载与使用入口。GitHub API 每日核验：最近推送 2026-09-26，当前星标 166.7k。",
    },
    {
      date: "2026-09-25",
      repo: "stanfordnlp/stanza",
      label: "自动核验",
      text: "斯坦福官方多语言 NLP 工具包，支持 70+ 种语言。GitHub API 每日核验：最近推送 2026-09-25，当前星标 7.9k。",
    },
    {
      date: "2026-09-25",
      repo: "vinta/awesome-python",
      label: "自动核验",
      text: "「我想用 Python 做 X，该用哪个库」的权威答案库。GitHub API 每日核验：最近推送 2026-09-25，当前星标 323.2k。",
    },
    {
      date: "2026-09-25",
      repo: "pytorch/tutorials",
      label: "自动核验",
      text: "PyTorch 官方教程集：从张量入门到分布式训练、部署的全链路。GitHub API 每日核验：最近推送 2026-09-25，当前星标 9.3k。",
    },
    {
      date: "2026-09-25",
      repo: "programminghistorian/jekyll",
      label: "自动核验",
      text: "人文学者写给同行的编程教程集（本仓库为站点源码）。GitHub API 每日核验：最近推送 2026-09-25，当前星标 552。",
    },
    {
      date: "2026-09-24",
      repo: "microsoft/generative-ai-for-beginners",
      label: "自动核验",
      text: "微软官方 21 课生成式 AI 入门，从原理讲到应用与伦理。GitHub API 每日核验：最近推送 2026-09-24，当前星标 120.6k。",
    },
    {
      date: "2026-09-24",
      repo: "nltk/nltk",
      label: "自动核验",
      text: "最经典的「为语言学家写的」NLP Python 库。GitHub API 每日核验：最近推送 2026-09-24，当前星标 14.7k。",
    },
    {
      date: "2026-09-22",
      repo: "rasbt/LLMs-from-scratch",
      label: "自动核验",
      text: "用 PyTorch 一步步从零实现一个类 ChatGPT 模型。GitHub API 每日核验：最近推送 2026-09-22，当前星标 105.6k。",
    },
    {
      date: "2026-09-21",
      repo: "practical-tutorials/project-based-learning",
      label: "自动核验",
      text: "按项目组织的编程教程汇编，覆盖 Python 等多种语言。GitHub API 每日核验：最近推送 2026-09-21，当前星标 284.7k。",
    },
    {
      date: "2026-09-14",
      repo: "EleutherAI/lm-evaluation-harness",
      label: "自动核验",
      text: "开源大模型评测框架：数百个学术基准（MMLU、GSM8K 等）一条命令跑分。GitHub API 每日核验：最近推送 2026-09-14，当前星标 14.1k。",
    },
    {
      date: "2026-09-14",
      repo: "hiyouga/LlamaFactory",
      label: "自动核验",
      text: "一站式大模型微调工具：100+ 模型的 LoRA/全参微调与评估（ACL 2024）。GitHub API 每日核验：最近推送 2026-09-14，当前星标 75k。",
    },
  ],

  // ---- 技术趋势观察（编者视角，随季度复核）----
  trends: [
    {
      icon: "🤖",
      title: "从 Chatbot 到 Agent：NLP 进入「动手」时代",
      text: "2026 年最大的范式转移：模型不再只是对话，而是调用工具、规划步骤、完成长程任务（Long-Horizon Agents）。对研究者的意义：文献综述助手、批量语料标注、多步翻译流水线都能交给 Agent 编排——提示词写法也从「怎么问」变成「怎么布置任务」。",
      refs: [
        { label: "Anthropic：构建高效 Agent 的实践指南", url: "https://www.anthropic.com/research/building-effective-agents" },
        { label: "MCP · 模型上下文协议官网", url: "https://modelcontextprotocol.io/" },
      ],
    },
    {
      icon: "🧠",
      title: "推理模型与测试时计算成为主线",
      text: "行业重心从「把模型做大」转向「让模型多想几步」：推理驱动的后训练与推理时（inference-time）技术成为竞争焦点。学术上，思维链正扩展为「智能体推理」（Agentic Reasoning）。读论文时会看到更多「思考预算」相关的表述——本质是让模型花更多算力换取更可靠的推理。",
      refs: [
        { label: "Springer：LLM 在 NLP 中的演进与架构趋势", url: "https://link.springer.com/article/10.1186/s40537-026-01429-1" },
        { label: "Epoch AI · 大模型趋势数据", url: "https://epoch.ai/" },
      ],
    },
    {
      icon: "🛠️",
      title: "工程化与评测体系比模型本身更受重视",
      text: "当各家旗舰模型能力接近，竞争转向落地：评测基准（evaluation）、可靠性、成本控制成为关键词。真人盲测竞技场（LMArena）与 LLM-as-a-Judge 正在重塑「模型好不好」的判定方式。对应用向学习者是好消息——「会设计任务、会评估输出质量」正是文科背景最擅长的部分：本站概念页的「评测素养」专题与项目五，就是为这个方向准备的入场券。",
      refs: [
        { label: "LMArena · 真人盲测竞技场", url: "https://lmarena.ai/" },
        { label: "Stanford AI Index 年度报告", url: "https://hai.stanford.edu/ai-index" },
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
      { repo: "huggingface/transformers", name: "Transformers", fallback: { stars: 166665, pushed: "2026-09-26" } },
      { repo: "microsoft/generative-ai-for-beginners", name: "GenAI for Beginners", fallback: { stars: 120588, pushed: "2026-09-24" } },
      { repo: "rasbt/LLMs-from-scratch", name: "LLMs from Scratch", fallback: { stars: 105602, pushed: "2026-09-22" } },
      { repo: "mlabonne/llm-course", name: "LLM Course", fallback: { stars: 83146, pushed: "2026-02-05" } },
      { repo: "d2l-ai/d2l-zh", name: "动手学深度学习", fallback: { stars: 81115, pushed: "2024-07-30" } },
      { repo: "chinese-poetry/chinese-poetry", name: "chinese-poetry", fallback: { stars: 53361, pushed: "2026-06-17" } },
      { repo: "hankcs/HanLP", name: "HanLP", fallback: { stars: 36486, pushed: "2025-11-15" } },
      { repo: "EleutherAI/lm-evaluation-harness", name: "LM Eval Harness", fallback: { stars: 14079, pushed: "2026-09-14" } },
      { repo: "explosion/spaCy", name: "spaCy", fallback: { stars: 33923, pushed: "2026-08-24" } },
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
