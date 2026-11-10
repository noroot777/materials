# frame.md — Knowbase 宣传片的样子

取自产品自己的 `kb/static/css/base.css` `:root`,不是现成预设。产品换色板时这里跟着换
(`src/kit.css` 的 `--kb-*` 是这份表在片子里的唯一落点)。

## 色

| 角色 | 值 | 用在哪 |
|---|---|---|
| paper | `#F3F5F4` | 亮场底 |
| paper-2 | `#ECF0EE` | 亮场里的次级面 |
| card | `#FFFFFF` | 界面窗口、卡片 |
| ink | `#14202B` | 暗场底、亮场正文 |
| ink-2 | `#3A4750` | 次级文字 |
| muted | `#66727C` | 单位、刻度 |
| line | `#DCE3E0` | 分隔线、窗口描边 |
| brand | `#17604F` | 重点色:满版绿场、进度、命中 |
| brand-deep | `#0E4A3B` | 绿场里的暗部 |
| brand-soft | `#DFF0E9` | 绿的浅底 |
| 类型色 | `#17604F` `#3D5A80` `#7D4E9E` `#2F6D7A` | 开源项目 / 产品 / 模型 / 研究 |

整片在三种场之间硬切:paper 亮场、ink 暗场、brand 绿场。不用渐变底、不用发光。

## 字

- **display** — `"Songti SC", "STSong", "Source Han Serif SC", serif`,900。只给大标题和字标,
  这是唯一的字形签名。
- **mono** — `ui-monospace, "SF Mono", Menlo, monospace`。数字、日期、工具名、命令。
- **body** — `-apple-system, "PingFang SC", "Noto Sans SC", sans-serif`。其余一切。

## 动

- 进场都是快起(≤ 0.3s 的 expo/power4 out),落点在拍上;不用弹跳。
- 段落之间硬切,段内靠推近、平移、逐拍累加撑满时长。
- 截图装在圆角窗口里(半径 18、细描边、一层深影),尽量出血到画外。

## 字面

一场一个词,不配解释性的副标题。单位(个工具、条收录)跟着数字走,算数字的一部分。
