#!/usr/bin/env bash
# 把成片压成一张会动的预览图,给出不了播放器的地方用。重新渲染之后跑一次。
#
#   tools/readme_preview.sh
#
# 输出 renders/promo.webp(720 宽、15 帧、无声、循环)。knowbase 的 README 现在用的是上传的
# 附件(见 tools/github_upload.sh),不引这张图;别处要嵌一张不带声音的动图时用它。
set -euo pipefail
cd "$(dirname "$0")/.."
out=renders/promo.webp
ffmpeg -v error -y -i renders/knowbase-promo.mp4 -an \
  -vf "fps=15,scale=720:-2:flags=lanczos" \
  -c:v libwebp_anim -lossless 0 -q:v 50 -compression_level 6 -loop 0 "$out"
ls -l "$out"
