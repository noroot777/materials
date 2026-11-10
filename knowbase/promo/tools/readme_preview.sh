#!/usr/bin/env bash
# 把成片压成 README 顶上那张会动的预览图。重新渲染之后跑一次。
#
#   tools/readme_preview.sh
#
# 输出 renders/promo.webp(720 宽、15 帧、无声、循环)。knowbase 的 README 按 main 分支上的
# 地址引这张图和成片,所以两个文件名都别改;推上去之后 README 那边不用动。
# 仓库里的 mp4 在 GitHub 的 README 里不会内嵌播放,所以页面上放这张图,点它打开带配乐的 mp4。
set -euo pipefail
cd "$(dirname "$0")/.."
out=renders/promo.webp
ffmpeg -v error -y -i renders/knowbase-promo.mp4 -an \
  -vf "fps=15,scale=720:-2:flags=lanczos" \
  -c:v libwebp_anim -lossless 0 -q:v 50 -compression_level 6 -loop 0 "$out"
ls -l "$out"
