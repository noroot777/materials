---
compositionId: bgm
duration_s: 43.3
canvas: { "w": 1920, "h": 1080, "fps": 30 }
mode: autonomous
style:
  font: "Songti SC 900 / PingFang SC / SF Mono"
  palette: ["#F3F5F4", "#14202B", "#17604F", "#FFFFFF", "#DCE3E0"]
assets: "assets/ 里是 tools/capture.mjs 截的真实界面,tools/stage_assets.sh 裁过"
build_notes: ["one paused timeline per frame", "no remote assets", "帧文件由 tools/build-frames.mjs 从 src/ 生成,别手改 compositions/frames/"]
avoid: ["解释性的副标题", "居中大图标加标语", "渐变底和发光"]
---

配乐 123 BPM,一小节约 1.93 秒,通篇是同一小节的循环;段落是 `tools/mix_bgm.sh` 做出来的
(第 0 小节闷着进、1.997 砸下;28.886 起一小节抽掉低频、30.790 再砸;40.403 最后一记)。
下面的秒数都取自 `audiomap.json` 的 `beats_sec`;第 0 小节被低通之后分析器跟不到,那四拍
(0.070 / 0.534 / 1.022 / 1.509 / 1.997)取自混音前的同一条鼓组。

## Frame 1 — hook

- src: compositions/frames/01-hook.html
- duration: 7.755s
- span_sec: [0.0, 7.755]
- pacing: beat_cut
- mood: [tense, hype]
- feel: 闷着的一小节加上升音,砸进全频四拍循环

### Groups

- **g1** — free_design
  - span_sec: [0.0, 1.997]
  - free_design: { dominant_system: "per-onset typography", primitives: ["row-slam", "collapse-to-line"], density_topology: "accumulate" }
  - anchors: [0.07, 0.30, 0.534, 0.78, 1.022, 1.27, 1.509, 1.75]
  - copy: ["公众号", "大V观点", "RSS", "YouTube", "简报", "网页专栏", "手动收录"]
- **g2** — free_design
  - span_sec: [1.997, 3.924]
  - free_design: { dominant_system: "wordmark lockup", primitives: ["mask-rise", "braam-punch"], density_topology: "single hero" }
  - anchors: [1.997, 2.485, 2.949, 3.437]
  - copy: ["Knowbase", "个人知识库"]
- **g3** — free_design
  - span_sec: [3.924, 5.828]
  - free_design: { dominant_system: "per-beat full-bleed word", primitives: ["panel-wipe", "content-swap"], density_topology: "replace" }
  - anchors: [3.924, 4.412, 4.876, 5.364]
  - copy: ["多来源聚合", "混合检索", "意图问答", "每日日报"]
- **g4** — free_design
  - span_sec: [5.828, 7.755]
  - free_design: { dominant_system: "odometer stat", primitives: ["digit-roll"], density_topology: "two-up" }
  - anchors: [5.828, 6.78, 7.268]
  - copy: ["6,744 个工具", "12,388 条收录"]

## Frame 2 — sources

- src: compositions/frames/02-sources.html
- duration: 7.686s
- span_sec: [7.755, 15.441]
- pacing: beat_cut
- mood: [hype]
- feel: 稳定的四拍循环,每两拍换一个来源

### Groups

- **g1** — asset
  - span_sec: [7.755, 11.61]
  - asset: { treatment: "beat_cut", clips: ["assets/subs-wechat.jpg", "assets/subs-social.jpg", "assets/subs-rss.jpg", "assets/subs-youtube.jpg"] }
  - anchors: [7.755, 8.707, 9.683, 10.635]
  - overlay_copy: ["公众号 44", "大V观点 51", "RSS 12", "YouTube 52"]
- **g2** — free_design
  - span_sec: [11.61, 15.441]
  - free_design: { dominant_system: "native UI rebuild · 同步中心", primitives: ["bar-fill", "row-stagger", "stage-light"], density_topology: "accumulate" }
  - anchors: [11.61, 12.562, 13.514, 14.002, 14.466, 14.954]
  - copy: ["一键同步", "入库处理", "生成日报", "整理工具与 Wiki"]

## Frame 3 — gallery

- src: compositions/frames/03-gallery.html
- duration: 7.686s
- span_sec: [15.441, 23.127]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: 四拍循环,逐拍推进的长滚动,后半推近一张档案

### Groups

- **g1** — asset
  - span_sec: [15.441, 19.273]
  - asset: { treatment: "beat_cut", clips: ["assets/gallery-tall.jpg"] }
  - anchors: [15.441, 15.906, 16.393, 16.881, 17.369, 17.833, 18.321, 18.785]
  - overlay_copy: ["工具图鉴", "开源项目 3,395", "产品 1,714", "研究 770", "模型 598"]
- **g2** — asset
  - span_sec: [19.273, 23.127]
  - asset: { treatment: "ken_burns", clips: ["assets/drawer.jpg"] }
  - anchors: [19.273, 21.2]
  - overlay_copy: ["每个工具一页档案"]

## Frame 4 — search

- src: compositions/frames/04-search.html
- duration: 3.831s
- span_sec: [23.127, 26.958]
- pacing: beat_cut
- mood: [hype]
- feel: 两小节:敲字、回车、结果逐条落下

### Groups

- **g1** — free_design
  - span_sec: [23.127, 26.958]
  - free_design: { dominant_system: "native UI rebuild · 检索框 + 真实结果卡", primitives: ["type-on", "card-drop", "badge-pulse"], density_topology: "accumulate" }
  - anchors: [23.127, 24.079, 24.543, 25.031, 25.519, 25.983]
  - copy: ["claude code 记忆", "关键词", "语义"]

## Frame 5 — ask

- src: compositions/frames/05-ask.html
- duration: 3.832s
- span_sec: [26.958, 30.79]
- pacing: beat_cut
- mood: [tense, dark]
- feel: 一小节全频,接一小节抽掉低频的空拍加上升音

### Groups

- **g1** — free_design
  - span_sec: [26.958, 30.79]
  - free_design: { dominant_system: "native UI rebuild · 问答", primitives: ["type-on", "line-stream", "citation-chip"], density_topology: "accumulate" }
  - anchors: [26.958, 27.91, 28.398, 28.886, 29.35, 29.838, 30.302]
  - copy: ["最近一周,公众号都提过哪些开源项目?", "LobeHub", "DeepSeek Harness", "Three.js", "BISHENG", "SGLang", "OpenCode", "200 个项目"]

## Frame 6 — daily

- src: compositions/frames/06-daily.html
- duration: 3.854s
- span_sec: [30.79, 34.644]
- pacing: beat_cut
- mood: [hype]
- feel: 低频回来的那一记,之后稳定四拍

### Groups

- **g1** — asset
  - span_sec: [30.79, 32.717]
  - asset: { treatment: "beat_cut", clips: ["assets/daily-tools.jpg", "assets/daily-dates.jpg"] }
  - anchors: [30.79, 31.277, 31.742, 32.229]
  - overlay_copy: ["每日日报", "11-10"]
- **g2** — asset
  - span_sec: [32.717, 34.644]
  - asset: { treatment: "beat_cut", clips: ["assets/fav.jpg"] }
  - anchors: [32.717, 33.669]
  - overlay_copy: ["收藏"]

## Frame 7 — graph

- src: compositions/frames/07-graph.html
- duration: 3.831s
- span_sec: [34.644, 38.475]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: 稳定四拍,每两拍换一张图谱

### Groups

- **g1** — asset
  - span_sec: [34.644, 38.475]
  - asset: { treatment: "beat_cut", clips: ["assets/graph.jpg", "assets/graph-projects.jpg", "assets/graph-skills.jpg"] }
  - anchors: [34.644, 35.596, 36.548, 37.5]
  - overlay_copy: ["话题图谱 278", "开源项目图谱 3,755", "Skill 图谱 330"]

## Frame 8 — lockup

- src: compositions/frames/08-lockup.html
- duration: 4.825s
- span_sec: [38.475, 43.3]
- pacing: beat_cut
- mood: [hype, elegant]
- feel: 最后一小节四拍,40.403 一记低频后留静场

### Groups

- **g1** — free_design
  - span_sec: [38.475, 40.403]
  - free_design: { dominant_system: "per-beat mono slam", primitives: ["content-swap", "row-slam"], density_topology: "accumulate" }
  - anchors: [38.475, 38.94, 39.427, 39.915]
  - copy: ["kb_search", "kb_enumerate", "kb_read", "MCP · Obsidian"]
- **g2** — free_design
  - span_sec: [40.403, 43.3]
  - free_design: { dominant_system: "wordmark lockup", primitives: ["mask-rise", "type-on"], density_topology: "single hero" }
  - anchors: [40.403, 40.867, 41.355]
  - copy: ["Knowbase", "./kb.sh start", "127.0.0.1:8787"]
