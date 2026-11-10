---
workflow: music-to-video
flow: automation
storyboard: no
message: "一块屏幕调度所有 AI 编程智能体：派活、排队、验证、接力、合并"
destination: landscape-social
aspect: 1920x1080
language: zh
length: 49s
style_preset: broadside
---

## Intent

ash 的宣传片：给同时开着好几个 Claude Code / Codex 终端、靠人肉盯进度的开发者看。节奏紧凑、
动效密、画面饱满，镜头切点全部落在鼓点上。没有旁白，文案只做大字标题，功能由真实界面截图说话。

## Assets

- assets/bgm.mp3 — 配乐，`scripts/synth-bgm.py` 程序化合成（128 BPM、26 小节），节拍网格精确已知。
- assets/shots/*.png — 功能截图，取自一套临时启动、数据全是造出来的 ash 实例（`scripts/seed-demo.mjs` 灌数据，`scripts/capture-shots.mjs` 截图）。
- assets/fonts/*.woff2 — Barlow / IBM Plex Mono / Noto Sans SC（按片中用字裁剪），均为 OFL 开源字体。

## Notes

- HeyGen 未登录，曲库不可用；配乐改为本地合成，换来的是可控的段落结构与零误差的卡点。
- 截图里的项目名、任务、对话全是虚构的演示数据，不含任何真实仓库内容。
- 无人值守运行：分镜不等人工确认，直接按本文件一路做到成片。
