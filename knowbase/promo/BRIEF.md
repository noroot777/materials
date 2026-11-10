---
workflow: music-to-video
flow: automation
storyboard: no
message: "散在各处的 AI 资讯,收进一个本地知识库:能搜、能问、每天一份日报"
destination: repo-readme
aspect: 1920x1080
language: zh
length: 43s
angle: product-tour
---

## Intent

给 Knowbase 做一条宣传片。原话:「节奏要紧凑、动效密、画面饱满、随音乐卡点」。
没有旁白,画面靠产品自己的界面说话;调子跟产品一致 —— 这是每天开的工具,不是落地页。

## Assets

- assets/*.jpg — 对着一套跑着的 kb-web 截的真实界面(只发 GET),由 `tools/capture.mjs` 截、
  `tools/stage_assets.sh` 裁。
- assets/bgm.mp3 — 本机 MusicGen 出的鼓组,`tools/mix_bgm.sh` 裁切并叠卡点音效。

## Customizations

- 数字用滚轮式计数落在拍点上。
- 同步中心、检索框、问答三处是照界面结构重画的原生动画,不是截图(截图里的那一轮带着
  真实的失败行,问答要花模型调用)。

## Notes

- 无人值守,不停下来等确认:分镜直接落成片,没有草图环节。
- 面向人读的文案写「绿泡泡」,不写那个词;片里公众号图谱只取上半张也是这个缘故。
- 色板、字体取产品自己的 `kb/static/css/base.css`,没有套现成预设。
- 字体用本机系统字体(Songti SC / PingFang SC / SF Mono),换机器渲染要有这几款。
