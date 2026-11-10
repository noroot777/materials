---
compositionId: bgm
title: ash 宣传片
duration_s: 48.75
canvas: {"w":1920,"h":1080,"fps":30}
bpm: 128
beat_s: 0.46875
style: broadside —— 墨黑 #111111 / 火橙 #E85D26 / 米白 #F0ECE5，Barlow 900 + Noto Sans SC 900 大字，无阴影无圆角无渐变
music: assets/bgm.mp3（scripts/synth-bgm.py 合成，128 BPM，26 小节）
assets: assets/shots/*.png（16 张界面截图）、assets/fonts/*.woff2
build_notes: 每帧 2 小节 = 8 拍 = 3.75s；帧间一律硬切，切点全部落在小节线上；帧内每一拍至少一个主事件，拍与拍之间有十六分/八分的次级运动
avoid: 淡入淡出转场、超过一拍的静止、旁白、阴影/圆角/渐变、解释性小字
---

# ash 宣传片 —— 分镜

配乐结构：0–7.5 引子（3.75 起底鼓，7.03–7.5 军鼓 fill）｜7.5–22.5 高潮 A｜22.5–30 间奏（撤鼓，26.25 起滚奏加速，
29.53 硬停留白一拍）｜30–45 高潮 B｜45.0 收尾重击，47.0 后静音。

叙事：终端越开越多、没人管得过来（1–2）→ ash 登场（3）→ 一屏看全（4）→ 15 个执行器（5）→ 排队（6）→
自动审查打回（7–8）→ 一键验收合并（9）→ 团队与研讨（10）→ 功能快切（11）→ 数字冲刺（12）→ 落版（13）。

## Frame 1 — 01-hook

- src: compositions/frames/01-hook.html
- duration: 3.75s
- span_sec: [0, 3.75]
- pacing: beat_cut
- mood: 引子，无底鼓，紧张感一拍一拍往上堆
- feel: 终端窗口每拍砸进来一个，越堆越乱，右上角的大数字跟着跳
- copy: 「你开了几个终端？」

### Groups

- **g1** — free_design：墨黑底 + 发丝线网格；8 个终端窗口卡片（标题栏写 claude / codex / gemini / cursor / opencode / copilot / qwen / kimi，窗口里等宽字逐字打出日志行），b0–b7 每拍砸入一个，互相叠压、角度各异，铺满画布
- **g2** — free_design：右上角巨型橙色计数 1→8，每拍换一个数并顶一下
- **g3** — free_design：b4 起左下角大标题「你开了几个终端？」

## Frame 2 — 02-pain

- src: compositions/frames/02-pain.html
- duration: 3.75s
- span_sec: [3.75, 7.5]
- pacing: beat_cut
- mood: 底鼓进来，四连问，烦躁
- feel: 上一帧的终端堆原样留在画面里（同一套坐标），压暗并随拍抖动；问句每两拍砸一句；最后一拍频闪坍缩
- copy: 「谁在跑？」「谁卡住了？」「谁改了什么？」「谁来验收？」

### Groups

- **g1** — free_design：与 01 末画面完全一致的 8 窗口终端堆，压暗，每拍抖一下，反拍（b1/b3/b5）有一个窗口边框闪橙
- **g2** — free_design：b0 / b2 / b4 / b6 四个问句整屏大字轮流砸入（后一句顶掉前一句），橙底墨字与墨底米白字交替
- **g3** — free_design：帧内 3.28125–3.75（军鼓 fill）十六分频闪，所有窗口向画面中心坍缩成一个点

## Frame 3 — 03-drop

- src: compositions/frames/03-drop.html
- duration: 3.75s
- span_sec: [7.5, 11.25]
- pacing: beat_cut
- mood: 第一个 DROP，全片最亮的一拍
- feel: 橙色整屏，巨型「ash」砸下来震一下；五个动词逐拍盖章
- copy: 「ash」「AI 编程智能体的本地调度台」「派活 排队 验证 接力 合并」

### Groups

- **g1** — free_design：火橙满屏；徽标 + 巨型小写「ash」（墨色，Barlow 900）b0 从 3 倍砸到位并带屏幕震动，之后每拍顶一下
- **g2** — free_design：b2 墨色横条滑入，米白字「AI 编程智能体的本地调度台」
- **g3** — free_design：b3–b7 底部五格逐拍盖章「派活」「排队」「验证」「接力」「合并」，b7 五格一起反色

## Frame 4 — 04-workbench

- src: compositions/frames/04-workbench.html
- duration: 3.75s
- span_sec: [11.25, 15]
- pacing: beat_cut
- mood: 高潮 A，第一次看到产品本体
- feel: 整张界面砸到位，镜头每拍甩到一个区域（任务列表 → 对话 → 改动），第二小节拉远成斜放整屏
- copy: 「一块屏幕」「盯住所有智能体」

### Groups

- **g1** — asset：assets/shots/workbench.png 铺满，镜头推拉，橙框标注「所有任务」「实时对话」「改动一目了然」
- **g2** — free_design：左下两行大标题；侧栏 16 行任务逐行点亮；「4 个文件」「+119 行新增」「3 次提交」数字贴片逐拍弹出

## Frame 5 — 05-executors

- src: compositions/frames/05-executors.html
- duration: 3.75s
- span_sec: [15, 18.75]
- pacing: beat_cut
- mood: SURGE，炫耀数量
- feel: 巨型「15」砸定，15 个 CLI 名字的芯片每拍两个飞进来排成阵，最后一拍连线汇到一个入口
- copy: 「15」「个 CLI 执行器」「一个入口」

### Groups

- **g1** — free_design：左侧巨型橙色「15」（b0 从 1 快速数到 15 砸定），下方「个 CLI 执行器」
- **g2** — free_design：右侧 3×5 芯片阵：claude codex antigravity gemini opencode trae grok kimi cursor qwen qoder copilot kiro kilo pi，每拍两个弹入
- **g3** — free_design：b6 橙条「一个入口」砸入；b7 芯片阵一波橙色扫过，连线汇向「ash」节点

## Frame 6 — 06-queue

- src: compositions/frames/06-queue.html
- duration: 3.75s
- span_sec: [18.75, 22.5]
- pacing: beat_cut
- mood: 高潮 A 的最后两小节，机械感、流水线
- feel: 前一小节任务卡在一条轨上一拍推进一格（串行）；后一小节四条轨同时冲刺（并行）
- copy: 「串行排队」「并行开跑」

### Groups

- **g1** — asset：assets/shots/queue.png 作底，斜放、压暗，镜头缓推
- **g2** — free_design：b0–b3 串行轨：四张任务卡排成一列，每拍一张从「排队」变「运行」再变「完成」，前一张完成后一张才亮；大标题「串行排队」
- **g3** — free_design：b4–b7 并行轨：四条进度条同时开跑、先后冲线；大标题换成「并行开跑」

## Frame 7 — 07-verify

- src: compositions/frames/07-verify.html
- duration: 3.75s
- span_sec: [22.5, 26.25]
- pacing: beat_cut
- mood: 间奏，撤鼓，唯一一段可以喘气的地方——但画面仍然每拍有事
- feel: 审查界面缓缓推近；「实现 → 审查 → 打回 → 修复」四格环逐拍点亮，「打回」那一拍画面一震
- copy: 「写完不算完」「自动审查，打回重改」

### Groups

- **g1** — asset：assets/shots/review.png 铺满，全程匀速缓推
- **g2** — free_design：b0 大标题「写完不算完」；b1–b4 四格环「实现」「审查」「打回」「修复」逐拍点亮，b3「打回」闪橙并震屏
- **g3** — free_design：b5 第二行标题「自动审查，打回重改」；b6–b7 环上的回转箭头画出，「第 1 轮」标签弹出

## Frame 8 — 08-roll

- src: compositions/frames/08-roll.html
- duration: 3.75s
- span_sec: [26.25, 30]
- pacing: beat_cut
- mood: 滚奏加速，憋气；29.53 硬停，留白一拍
- feel: 四格环越转越快，轮次从第 2 轮往上翻，切换从四分 → 八分 → 十六分；硬停那一刻整屏变黑，只剩「已通过」和一个勾
- copy: 「第 2 轮」…「已通过」

### Groups

- **g1** — asset：assets/shots/reviewing.png 作底，随每次切换一步步推近
- **g2** — free_design：四格环高亮点加速跳转；大字「第 N 轮」与「审查 / 打回 / 修复」翻词，间隔从一拍缩到十六分
- **g3** — free_design：帧内 3.28125 硬停：纯黑满屏，橙色勾 + 米白巨字「已通过」，静止到帧尾

## Frame 9 — 09-merge

- src: compositions/frames/09-merge.html
- duration: 3.75s
- span_sec: [30, 33.75]
- pacing: beat_cut
- mood: 第二个 DROP，释放
- feel: 橙屏砸出「一键验收」，随后分支线一拍一个提交点并入 main，增删行数跳出来
- copy: 「一键验收」「+119」「–13」「合并入 main」「清理 worktree」「删除分支」

### Groups

- **g1** — free_design：b0 火橙满屏，墨色巨字「一键验收」砸入震屏；b1 硬切回墨黑
- **g2** — free_design：b1–b3 git 图：分支线从左画出、每拍冒一个提交点，b3 并入 main 主线并爆出放射线；b4「+119」「–13」数字滚到位
- **g3** — asset：assets/shots/diff.png 的着色区裁片 b2 斜插进右侧；b5 换成 assets/shots/accepted.png
- **g4** — free_design：b5 / b6 / b7 三项逐拍打勾「合并入 main」「清理 worktree」「删除分支」

## Frame 10 — 10-team

- src: compositions/frames/10-team.html
- duration: 3.75s
- span_sec: [33.75, 37.5]
- pacing: beat_cut
- mood: 高潮 B，人多势众
- feel: 前一小节团队：一个调度节点向下逐拍分出三个执行者；后一小节整屏甩到研讨界面，两个模型的气泡一左一右对打
- copy: 「一个调度，多个执行者」「让两个模型先聊出方案」

### Groups

- **g1** — asset：assets/shots/team.png（b0–b3）；b4 整屏甩切到 assets/shots/duet.png（b4–b7）
- **g2** — free_design：b0 调度节点 + 标题；b1–b3 三张执行者卡（claude / codex / gemini）逐拍连线弹出
- **g3** — free_design：b4 标题换成「让两个模型先聊出方案」；b5–b7 左右两侧发言气泡标记逐拍交替亮起

## Frame 11 — 11-montage

- src: compositions/frames/11-montage.html
- duration: 3.75s
- span_sec: [37.5, 41.25]
- pacing: beat_cut
- mood: SURGE，全片最快的一段
- feel: 一拍一切，八个画面，每切换一次进场方向都不同，标签整块砸上去
- copy: 「多智能体聊天」「全局搜索」「随手记」「卡住会提问」「一句话派活」「手机上也能盯」「跨机器接力」「重启不丢任务」

### Groups

- **g1** — asset：b0 chat.png、b1 palette.png、b2 notes.png、b3 question.png、b4 create.png，各自放大到最有内容的区域
- **g2** — asset：b5 phone-list.png 与 phone-task.png 两台手机并排斜放
- **g3** — free_design：b6 火橙字卡「跨机器接力」；b7 墨黑字卡「重启不丢任务」
- **g4** — free_design：每个画面一块橙底墨字的大标签，随切点砸入

## Frame 12 — 12-numbers

- src: compositions/frames/12-numbers.html
- duration: 3.75s
- span_sec: [41.25, 45]
- pacing: beat_cut
- mood: 高潮 B 收束，冲刺
- feel: 前四拍每拍一个整屏数字卡；后四拍全部截图拼成马赛克铺满，最后一拍向中心收拢成一个橙色方块
- copy: 「15 个执行器」「28 个 MCP 工具」「1 条命令启动」「macOS Linux Windows」「全部跑在你自己的机器上」

### Groups

- **g1** — free_design：b0「15 个执行器」（橙底）、b1「28 个 MCP 工具」（墨底）、b2「1 条命令启动」（橙底）、b3「macOS · Linux · Windows」（墨底），整屏字卡硬切
- **g2** — asset：b4 起 16 张截图铺成 4×4 马赛克，十六分错峰翻入
- **g3** — free_design：b5 橙条大标题「全部跑在你自己的机器上」压在马赛克上；b7 所有格子向中心收拢成一个橙色方块

## Frame 13 — 13-end

- src: compositions/frames/13-end.html
- duration: 3.75s
- span_sec: [45, 48.75]
- pacing: beat_cut
- mood: 收尾重击后余音，47.0 起静音，画面定住
- feel: 徽标砸下，口号与三行命令逐拍打出，之后稳稳停住
- copy: 「ash」「AI 编程智能体的本地调度台」「git clone https://github.com/noroot777/ash.git」「npm run setup」「npm start」「localhost:4317」「MIT 开源」

### Groups

- **g1** — free_design：b0 上一帧的橙色方块位置炸开放射线，徽标 + 橙色「ash」砸到位
- **g2** — free_design：b1 口号；b2–b4 终端块里三行命令逐字打出；b5「localhost:4317」「MIT 开源」贴片
- **g3** — free_design：b5 之后只留极缓的整体推近，文字全部可读直到最后一帧
