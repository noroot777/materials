// 宣传片截图用的演示数据：全部虚构（一个叫 Lumen 的假产品），不取自任何真实仓库。
// 这里只放「内容」，怎么写进 ash 见 seed-demo.mjs。

/** 执行器档案：15 种 CLI 各一份，名字就是设置页与选择器里看到的那一行。 */
export const AGENTS = [
  ["claude", "Claude Code", "opus"],
  ["codex", "Codex", "gpt-5.5"],
  ["gemini", "Gemini CLI", ""],
  ["opencode", "OpenCode", ""],
  ["cursor", "Cursor Agent", ""],
  ["qwen", "Qwen Code", ""],
  ["kimi", "Kimi Code", ""],
  ["grok", "Grok CLI", ""],
  ["copilot", "GitHub Copilot", ""],
  ["kiro", "Kiro", ""],
  ["kilo", "Kilo Code", ""],
  ["pi", "Pi", ""],
  ["trae", "Trae", ""],
  ["qoder", "Qoder", ""],
  ["antigravity", "Antigravity", ""],
];

export const PROJECTS = [
  { key: "web", name: "lumen-web" },
  { key: "api", name: "lumen-api" },
  { key: "mobile", name: "lumen-mobile" },
];

const bash = (command) => ["tool", "Bash", JSON.stringify({ command })];
const read = (file_path) => ["tool", "Read", JSON.stringify({ file_path })];
const edit = (file_path) => ["tool", "Edit", JSON.stringify({ file_path })];
const write = (file_path) => ["tool", "Write", JSON.stringify({ file_path })];
const think = (text) => ["thinking", text];
const say = (text) => ["text", text];

/**
 * 任务。`ago` = 多少分钟前创建；`turns` 是会话内容（没有就不建会话）；`touch` 补充会话里没体现的改动文件。
 * status/stage 是 ash 里两条正交的轴：status 管「跑没跑完」，stage 管「验到哪了」。
 */
export const TASKS = [
  // ── lumen-web：散任务 ──────────────────────────────────────────────
  {
    key: "applepay", project: "web", title: "结算页接入 Apple Pay", agent: "claude", status: "running", ago: 14, pinned: true,
    body: "结算页现在只能刷卡。接入 Apple Pay：Safari 与 iOS 上显示按钮，其余浏览器不显示；走现有的 PaymentProvider 接口，别另起一套。",
    memos: ["商户号走环境变量，别写进仓库", "验收前在真机 Safari 上点一遍"],
    turns: [{
      user: "结算页现在只能刷卡。接入 Apple Pay：Safari 与 iOS 上显示按钮，其余浏览器不显示；走现有的 PaymentProvider 接口，别另起一套。",
      steps: [
        think("先确认 PaymentProvider 的接口形状，再看结算页怎么挑支付方式。"),
        bash("rg -n \"PaymentProvider\" src --type ts"),
        read("src/payments/provider.ts"),
        read("src/checkout/CheckoutPage.tsx"),
        say("现有的 `PaymentProvider` 只有 `card` 一个实现，接口是 `canUse()` + `pay(order)`，正好够用。计划：\n\n1. 新增 `ApplePayProvider`，`canUse()` 里判断 `window.ApplePaySession?.canMakePayments()`\n2. 结算页按 `canUse()` 过滤出可用方式，不再写死 `card`\n3. 商户校验走服务端 `/api/pay/apple/validate`，商户号读环境变量"),
        write("src/payments/apple-pay.ts"),
        edit("src/checkout/CheckoutPage.tsx"),
        edit("src/payments/index.ts"),
        bash("npm run typecheck"),
        say("类型检查通过。现在补商户校验的服务端路由，再跑结算页的端到端用例。"),
        write("src/server/routes/apple-pay-validate.ts"),
        bash("npm run test:e2e -- checkout"),
      ],
      usage: { input: 48210, output: 6120, cacheRead: 312400, cacheWrite: 9800, reasoning: 0, costUsd: 1.37 },
    }],
  },
  {
    key: "stream", project: "web", title: "搜索结果改为流式渲染", agent: "codex", status: "running", ago: 9,
    body: "搜索接口已经支持 SSE，前端还在等整包返回。改成边收边渲染，首条结果 200ms 内出现。",
    turns: [{
      user: "搜索接口已经支持 SSE，前端还在等整包返回。改成边收边渲染，首条结果 200ms 内出现。",
      steps: [
        ["tool", "exec", "rg -n \"fetchSearch\" src"],
        ["tool", "exec", "sed -n 1,120p src/search/useSearch.ts"],
        say("`useSearch` 用的是一次性 `fetch().json()`。我把它换成 `EventSource`，结果按到达顺序追加，并保留原来的取消逻辑。"),
        ["tool", "edit", "src/search/useSearch.ts"],
        ["tool", "edit", "src/search/ResultList.tsx"],
        ["tool", "exec", "npm run test -- search"],
      ],
      usage: { input: 22100, output: 2840, cacheRead: 90400, cacheWrite: 0, reasoning: 1900, costUsd: 0.42 },
    }],
  },
  {
    key: "contrast", project: "web", title: "修复深色模式下图表对比度不足", agent: "gemini", status: "done", ago: 52,
    body: "深色模式下折线图的网格线和次要数据系列几乎看不见，按 WCAG AA 调到 4.5:1 以上。",
    review: { status: "reviewing", reviewer: "codex", rounds: [{ status: "reviewing" }] },
    turns: [{
      user: "深色模式下折线图的网格线和次要数据系列几乎看不见，按 WCAG AA 调到 4.5:1 以上。",
      steps: [
        read("src/charts/theme.ts"),
        say("网格线用的是 `#2a2a2a`，在 `#1c1c1e` 的底上对比度只有 1.2:1。我把深色主题的色板单独拆出来，逐个算过对比度。"),
        edit("src/charts/theme.ts"),
        bash("npm run test -- charts"),
        say("改完了：网格线 `#5c5c66`（4.6:1），次要系列改用更亮的一档。图表快照已更新。"),
      ],
      done: true,
      usage: { input: 15400, output: 1900, cacheRead: 40100, cacheWrite: 0, reasoning: 0, costUsd: 0.18 },
    }],
  },
  {
    key: "export", project: "web", title: "订单导出支持 CSV 与 Excel", agent: "claude", status: "done", stage: "verified", ago: 96,
    body: "订单列表加「导出」按钮，支持 CSV 与 xlsx。超过一万行走后台任务，完成后站内信通知。",
    review: {
      status: "passed", reviewer: "codex",
      rounds: [
        {
          status: "failed", conclusion: "verify_failed",
          report: "## 结论：打回\n\n实测了导出按钮、CSV 与 xlsx 两种格式、以及一万行以上的后台任务路径。\n\n### 拦验收\n\n1. **金额列在 Excel 里被当成文本**。`exportOrders.ts` 把金额先 `toFixed(2)` 成字符串再写入单元格，Excel 打开后无法求和。复现：导出任意订单 → 选中金额列 → 状态栏没有合计。\n2. **超过一万行时前端一直转圈**。后台任务建出来了，但 `ExportButton` 仍在等同步响应，30 秒后超时报错，站内信却又正常到达。\n\n### 不拦验收\n\n- 文件名里的日期用的是 UTC，北京时间零点到八点导出会差一天。\n",
        },
        {
          status: "passed", conclusion: "verified",
          report: "## 结论：通过\n\n上一轮的两条都已修复，并重新实测：\n\n1. 金额列现在以数值写入、单元格格式 `#,##0.00`，Excel 与 Numbers 里都能求和 ✓\n2. 一万两千行订单：点击导出后按钮立即变为「后台导出中」，约 6 秒后站内信到达，下载文件行数一致 ✓\n3. 文件名日期已改用用户时区 ✓\n\n回归面：执行者登记的 `npm run test -- export` 46 条全部通过。\n",
        },
      ],
    },
    turns: [
      {
        user: "订单列表加「导出」按钮，支持 CSV 与 xlsx。超过一万行走后台任务，完成后站内信通知。",
        steps: [
          bash("rg -n \"OrderList\" src"),
          read("src/orders/OrderList.tsx"),
          write("src/orders/exportOrders.ts"),
          write("src/orders/ExportButton.tsx"),
          edit("src/orders/OrderList.tsx"),
          bash("npm run test -- export"),
          say("导出做好了：一万行以内浏览器直接生成，超过则建后台任务并在完成后发站内信。"),
        ],
        done: true,
        usage: { input: 30200, output: 5200, cacheRead: 120000, cacheWrite: 4000, reasoning: 0, costUsd: 0.74 },
      },
      {
        system: "【自由工作流审查未通过 · 第 1 轮】按报告逐条修复：\n\n1. 金额列在 Excel 里被当成文本\n2. 超过一万行时前端一直转圈",
        steps: [
          read("src/orders/exportOrders.ts"),
          edit("src/orders/exportOrders.ts"),
          edit("src/orders/ExportButton.tsx"),
          bash("npm run test -- export"),
          say("两条都改了：金额以数值写入并带千分位格式；后台任务路径不再等同步响应，按钮立即切到「后台导出中」。顺手把文件名日期换成了用户时区。"),
        ],
        done: true,
        usage: { input: 18100, output: 2100, cacheRead: 150000, cacheWrite: 0, reasoning: 0, costUsd: 0.39 },
      },
    ],
  },
  {
    key: "passkey", project: "web", title: "登录页接入 Passkey", agent: "codex", status: "done", stage: "accepted", ago: 190,
    body: "登录页支持 Passkey（WebAuthn），保留密码登录作为回退。",
    accepted: true,
    review: { status: "passed", reviewer: "claude", rounds: [{ status: "passed", conclusion: "verified", report: "## 结论：通过\n\n在 Chrome 与 Safari 上分别注册并用 Passkey 登录成功；删除凭据后回退到密码登录正常。\n" }] },
    turns: [{
      user: "登录页支持 Passkey（WebAuthn），保留密码登录作为回退。",
      steps: [
        ["tool", "exec", "rg -n \"LoginForm\" src"],
        ["tool", "edit", "src/auth/LoginForm.tsx"],
        ["tool", "edit", "src/auth/webauthn.ts"],
        ["tool", "exec", "npm run test -- auth"],
        say("Passkey 登录已接入：支持的浏览器优先展示「使用 Passkey 登录」，不支持或用户取消时回退到密码表单。"),
      ],
      done: true,
      usage: { input: 26000, output: 3900, cacheRead: 80000, cacheWrite: 0, reasoning: 2400, costUsd: 0.51 },
    }],
  },
  {
    key: "react19", project: "web", title: "升级到 React 19", agent: "claude", status: "paused", ago: 33,
    body: "把 React 从 18 升到 19，处理掉所有弃用告警。",
    question: "仓库里有 41 处 `forwardRef`。React 19 里 ref 已经是普通 prop，要不要这次一并移除？",
    questionOptions: ["一并移除，改成普通 ref prop", "这次只升级版本，forwardRef 另开任务", "只移除本次改到的那几个组件"],
    turns: [{
      user: "把 React 从 18 升到 19，处理掉所有弃用告警。",
      steps: [
        bash("npm i react@19 react-dom@19"),
        bash("npm run typecheck 2>&1 | tail -20"),
        say("版本升上去了，类型检查剩 3 处与 `useRef` 初始值有关的报错，已修。另外发现 41 处 `forwardRef`，是否一并移除需要你拍板。"),
      ],
      done: true,
      usage: { input: 20100, output: 1500, cacheRead: 60000, cacheWrite: 0, reasoning: 0, costUsd: 0.27 },
    }],
  },
  {
    key: "safari", project: "web", title: "图片上传压缩在 Safari 上失败", agent: "opencode", status: "failed", ago: 71,
    body: "Safari 17 上传大于 4MB 的图片时压缩一步抛 `InvalidStateError`。",
  },
  { key: "a11y", project: "web", title: "给设置页补键盘导航", agent: "kimi", status: "backlog", ago: 240, body: "设置页所有控件都要能用 Tab 走到，焦点环可见。" },

  // ── lumen-web：串行队列「支付重构」 ──────────────────────────────────
  { key: "q1", project: "web", group: "pay", title: "抽出 PaymentProvider 接口", agent: "claude", status: "done", stage: "accepted", ago: 300, accepted: true, body: "把散落在结算页里的支付逻辑收敛成 PaymentProvider 接口。", touch: [["edit", "src/payments/card.ts"], ["write", "src/payments/registry.ts"]] },
  {
    key: "q2", project: "web", group: "pay", title: "迁移 Stripe 到新接口", agent: "codex", status: "running", ago: 299,
    body: "把 Stripe 的实现迁到 PaymentProvider 接口下，行为不变。",
    turns: [{
      user: "把 Stripe 的实现迁到 PaymentProvider 接口下，行为不变。",
      steps: [
        ["tool", "exec", "rg -n \"stripe\" src/checkout"],
        ["tool", "edit", "src/payments/stripe.ts"],
        say("Stripe 的三个入口已迁到 `StripeProvider`，正在跑支付相关的单测确认行为没变。"),
        ["tool", "exec", "npm run test -- payments"],
      ],
      usage: { input: 14100, output: 1700, cacheRead: 52000, cacheWrite: 0, reasoning: 800, costUsd: 0.22 },
    }],
  },
  { key: "q3", project: "web", group: "pay", title: "迁移支付宝到新接口", agent: "codex", status: "backlog", ago: 298, body: "把支付宝的实现迁到 PaymentProvider 接口下。" },
  { key: "q4", project: "web", group: "pay", title: "删掉 payments/legacy", agent: "claude", status: "backlog", ago: 297, body: "两家都迁完后删除旧目录与相关开关。" },
  { key: "q5", project: "web", group: "pay", title: "补端到端支付回归", agent: "gemini", status: "backlog", ago: 296, body: "用 Playwright 覆盖刷卡、Stripe、支付宝三条主路径。" },

  // ── lumen-web：并行分组「首页性能」 ──────────────────────────────────
  {
    key: "p1", project: "web", group: "perf", title: "首屏图片改用 AVIF", agent: "grok", status: "running", ago: 21,
    body: "首屏的三张大图改用 AVIF，保留 WebP 回退。", touch: [["write", "src/home/HeroPicture.tsx"]],
    turns: [{ user: "首屏的三张大图改用 AVIF，保留 WebP 回退。", steps: [bash("ls -la public/hero"), say("三张图合计 1.9MB，转 AVIF 后预计 420KB 左右。先生成再改 `<picture>`。"), bash("npx sharp-cli -i public/hero/*.png -o public/hero -f avif")], usage: { input: 6100, output: 600, cacheRead: 9000, cacheWrite: 0, reasoning: 0, costUsd: 0.05 } }],
  },
  {
    key: "p2", project: "web", group: "perf", title: "路由级代码分割", agent: "claude", status: "running", ago: 20,
    body: "控制台的每个一级路由单独成块，首页 JS 压到 180KB 以内。",
    turns: [{ user: "控制台的每个一级路由单独成块，首页 JS 压到 180KB 以内。", steps: [bash("npx vite-bundle-visualizer --json"), read("src/router.tsx"), say("现在首页入口 412KB，其中 60% 是图表和富文本编辑器。把这两块改成路由级懒加载。"), edit("src/router.tsx")], usage: { input: 17000, output: 1500, cacheRead: 44000, cacheWrite: 0, reasoning: 0, costUsd: 0.21 } }],
  },
  { key: "p3", project: "web", group: "perf", title: "去掉未使用的 polyfill", agent: "codex", status: "done", stage: "verified", ago: 19, body: "按 browserslist 清掉已经不需要的 polyfill。" },
  {
    key: "p4", project: "web", group: "perf", title: "字体子集化", agent: "qwen", status: "running", ago: 18,
    body: "中文字体按页面实际用字裁剪。", touch: [["write", "scripts/collect-glyphs.mjs"], ["write", "src/styles/fonts.css"]],
    turns: [{ user: "中文字体按页面实际用字裁剪。", steps: [bash("node scripts/collect-glyphs.mjs"), say("全站共用到 2,314 个汉字，子集化后字体从 8.4MB 降到 310KB。")], usage: { input: 5000, output: 400, cacheRead: 0, cacheWrite: 0, reasoning: 0, costUsd: 0.02 } }],
  },

  // ── lumen-api ─────────────────────────────────────────────────────
  {
    key: "ratelimit", project: "api", title: "限流中间件支持按租户配置", agent: "codex", status: "running", ago: 27,
    body: "限流阈值现在全局一份，改成可按租户覆盖，默认值不变。",
    turns: [{ user: "限流阈值现在全局一份，改成可按租户覆盖，默认值不变。", steps: [["tool", "exec", "rg -n \"rateLimit\" src"], ["tool", "edit", "src/middleware/rate-limit.ts"], say("阈值改为先查租户配置、查不到回落全局默认。正在补并发场景的测试。")], usage: { input: 12000, output: 1300, cacheRead: 30000, cacheWrite: 0, reasoning: 600, costUsd: 0.17 } }],
  },
  { key: "webhook", project: "api", title: "Webhook 重试改指数退避", agent: "claude", status: "done", stage: "verified", ago: 130, body: "失败的 Webhook 现在固定 30 秒重试一次，改成指数退避加抖动，最多 8 次。" },
  { key: "nplus1", project: "api", title: "把 N+1 查询收敛成批量加载", agent: "gemini", status: "done", stage: "awaiting_acceptance", ago: 210, body: "订单列表接口每行各查一次用户，改成 DataLoader 批量加载。" },
  { key: "tz", project: "api", title: "修复时区导致的账单日错位", agent: "codex", status: "done", stage: "accepted", ago: 400, accepted: true, body: "账单日按 UTC 计算，东八区用户会早一天出账。", touch: [["write", "src/billing/cycle.ts"], ["write", "src/billing/cycle.test.ts"]] },
  { key: "openapi", project: "api", title: "OpenAPI 文档自动生成", agent: "cursor", status: "backlog", ago: 500, body: "从路由定义生成 OpenAPI 3.1 文档并挂到 /docs。" },

  // ── lumen-mobile ──────────────────────────────────────────────────
  {
    key: "drafts", project: "mobile", title: "离线草稿箱", agent: "claude", status: "running", ago: 16,
    body: "断网时写的内容先落本地，联网后自动同步，冲突时保留两份。",
    turns: [{ user: "断网时写的内容先落本地，联网后自动同步，冲突时保留两份。", steps: [read("app/editor/useDraft.ts"), say("草稿目前只在内存里。我用 SQLite 落盘，再加一个同步队列。"), write("app/sync/queue.ts")], usage: { input: 9000, output: 1100, cacheRead: 20000, cacheWrite: 0, reasoning: 0, costUsd: 0.11 } }],
  },
  { key: "deeplink", project: "mobile", title: "推送通知支持深链", agent: "copilot", status: "paused", ago: 80, body: "点击推送直接打开对应的订单详情页。" },
  { key: "startup", project: "mobile", title: "冷启动时间压到 1.5 秒内", agent: "kiro", status: "done", stage: "verified", ago: 260, body: "现在冷启动 2.8 秒，目标 1.5 秒以内。" },
];

export const GROUPS = [
  { key: "pay", project: "web", name: "支付重构", mode: "serial" },
  { key: "perf", project: "web", name: "首页性能", mode: "parallel" },
];

/** 团队模式：一个调度台 + 它派出去的执行者。 */
export const TEAM = {
  key: "notify", project: "web", title: "重构通知中心", ago: 44,
  body: "通知中心重做：站内信、WebSocket 实时推送、邮件摘要三条通道统一到一个数据模型上。",
  lead: "claude", worker: "codex",
  turns: [{
    user: "通知中心重做：站内信、WebSocket 实时推送、邮件摘要三条通道统一到一个数据模型上。",
    steps: [
      bash("rg -n \"notification\" src server --files-with-matches | head -40"),
      say("现状：三条通道各有一张表、各写各的。我把它拆成 5 件事，前两件有先后，后三件可以并行：\n\n1. 设计统一的通知数据模型与迁移\n2. 实现站内信 API\n3. 接入 WebSocket 推送\n4. 通知中心前端面板\n5. 邮件摘要模板\n\n已派出，1、2 串行，其余等 2 完成后并行开工。"),
      ["tool", "mcp__ash__dispatch", JSON.stringify({ mode: "serial", tasks: 2 })],
      ["tool", "mcp__ash__dispatch", JSON.stringify({ mode: "parallel", tasks: 3 })],
      say("数据模型与站内信 API 都已完成并通过审查。WebSocket 推送和前端面板正在并行进行，邮件模板排在后面。"),
    ],
    done: true,
    usage: { input: 41000, output: 3800, cacheRead: 210000, cacheWrite: 6000, reasoning: 0, costUsd: 0.92 },
  }],
  workers: [
    { key: "w1", title: "设计通知数据模型与迁移", agent: "codex", status: "done", stage: "verified", turns: [{ user: "设计统一的通知数据模型与迁移。", steps: [["tool", "edit", "server/db/schema/notifications.ts"], say("统一成 `notifications` + `notification_deliveries` 两张表，旧三张表的数据迁移脚本已写好并在副本上跑通。")], done: true }] },
    { key: "w2", title: "实现站内信 API", agent: "codex", status: "done", stage: "verified", turns: [{ user: "基于新模型实现站内信的增删改查与已读。", steps: [["tool", "edit", "server/routes/inbox.ts"], say("站内信 API 完成，含分页、批量已读与未读计数。")], done: true }] },
    { key: "w3", title: "接入 WebSocket 推送", agent: "codex", status: "running", turns: [{ user: "新通知产生时通过 WebSocket 实时推给在线用户。", steps: [["tool", "exec", "rg -n \"ws\" server/realtime"], ["tool", "edit", "server/realtime/notify.ts"], say("推送通道接上了，正在处理断线重连后的补发。")] }] },
    { key: "w4", title: "通知中心前端面板", agent: "claude", status: "running", turns: [{ user: "做通知中心的前端面板：列表、未读角标、全部已读。", steps: [write("src/notify/NotifyPanel.tsx"), say("面板骨架和未读角标已完成，正在接实时推送。")] }] },
    { key: "w5", title: "邮件摘要模板", agent: "gemini", status: "backlog" },
  ],
};

/** 讨论（duet）：两个智能体把一个难决策磨成一份方案。 */
export const DUET = {
  key: "state", project: "web", title: "状态管理选型：留在 Redux 还是迁到 Zustand", ago: 60,
  topic: "控制台的状态管理要不要从 Redux Toolkit 迁到 Zustand？给出结论和迁移路径。",
  voiceA: "claude", voiceB: "codex",
  turns: [
    { speaker: "A", text: "我的初步判断是**迁，但分两步**。现在 62 个 slice 里有 40 个只是在存服务端数据，这部分其实该交给 TanStack Query，不该进任何 store。剩下 22 个才是真正的客户端状态，迁到 Zustand 能少掉大约 3,000 行样板。" },
    { speaker: "B", text: "同意服务端数据先剥出去，这一步收益最大且与选型无关。但对剩下 22 个我有保留：其中 6 个依赖 redux-saga 做跨 slice 编排（结算、导入向导），Zustand 没有对等物，硬迁会把编排逻辑散进组件。建议这 6 个留在 Redux，其余迁。" },
    { speaker: "A", text: "saga 这点你说得对，我漏看了。不过长期留两套 store 的心智成本也不小。折中：这 6 个先不动，但把 saga 改写成普通的 async 函数加状态机（XState），等它们不再依赖 saga，再决定归宿。" },
    { speaker: "B", text: "可以。那方案就是三步：① 40 个服务端 slice → TanStack Query；② 16 个简单 slice → Zustand；③ 6 个编排型 slice 留在 Redux，saga 逐步换成状态机。每一步都能独立上线、独立回滚。我没有其他分歧。", agrees: true },
  ],
  conclusionA: "分三步：服务端数据交给 TanStack Query，简单状态迁 Zustand，编排型状态暂留 Redux 并去 saga。",
  conclusionB: "同上；每一步独立上线、独立回滚。",
};

/** 多智能体聊天。 */
export const CHAT = {
  project: "web", name: "架构讨论",
  members: [
    { id: "m-claude", name: "架构师", agentType: "claude" },
    { id: "m-codex", name: "工程师", agentType: "codex" },
    { id: "m-gemini", name: "调研员", agentType: "gemini" },
  ],
  messages: [
    { role: "user", body: "@all 首页 LCP 现在 3.4 秒，目标 2 秒以内。各自说说最该先动哪里。" },
    { member: "m-gemini", body: "我先看了线上的 RUM 数据：LCP 元素 87% 是首屏那张 hero 图，下载耗时中位数 1.6 秒。图片是第一瓶颈，其次才是 JS。", trace: [{ kind: "tool", label: "WebSearch", detail: "AVIF browser support 2026" }] },
    { member: "m-codex", body: "同意。hero 图换 AVIF 再加 fetchpriority=high，预计能省 1 秒左右。我可以现在就开一个任务做掉。", trace: [{ kind: "tool", label: "exec", detail: "ls -la public/hero" }] },
    { member: "m-claude", body: "图片之外还有一处：首页入口 JS 412KB，图表库占了一半却不在首屏。建议并行再开一个「路由级代码分割」的任务，两件事互不冲突。" },
    { role: "user", body: "@工程师 两个都开，放进「首页性能」分组并行跑。" },
    { member: "m-codex", body: "已创建并开跑「首屏图片改用 AVIF」和「路由级代码分割」，都在「首页性能」分组里，跑完会自动派审查。" },
  ],
};

export const NOTES = [
  "结算页的错误文案要过一遍法务",
  "Safari 17 的图片压缩 bug，等 OpenCode 那个任务修完再回归",
  "周五前把「支付重构」队列全部验收掉",
  "试试让 Gemini 审 Claude 写的代码，看召回率",
  "移动端深链：订单、工单、邀请三种落地页",
  "# 通知中心上线清单\n\n- [x] 新模型迁移脚本在副本上跑通\n- [x] 站内信 API 过审\n- [ ] WebSocket 推送压测到 5k 连接\n- [ ] 邮件摘要模板给设计过一眼\n- [ ] 上线一周后删掉旧的三张表\n\n灰度顺序：内部 → 5% → 全量，每档至少观察一天。",
];
