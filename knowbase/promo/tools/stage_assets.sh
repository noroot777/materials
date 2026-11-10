#!/usr/bin/env bash
# 把 tools/capture.mjs 截下来的原图(3200 宽 PNG)裁切、压成成片用的 JPEG。
#
#   tools/stage_assets.sh [shots=.work/shots] [out=assets]
#
# 裁切坐标是原图像素。整屏的图留 2560 宽(成片里最多推近到 1.3 倍);
# 只取局部的图保留原始分辨率,免得放大时发虚。
set -euo pipefail

IN=${1:-.work/shots}
OUT=${2:-assets}
mkdir -p "$OUT"

jpg() {  # jpg <名字> <滤镜> [原图名]
  ffmpeg -v error -y -i "$IN/${3:-$1}.png" -vf "$2" -q:v 3 "$OUT/$1.jpg"
}

for n in drawer fav subs-wechat subs-social subs-rss subs-youtube graph-projects graph-skills; do
  jpg "$n" "scale=2560:-2"
done
jpg gallery-tall "scale=2240:-2"

# 公众号图谱只取上半张
jpg graph "crop=3200:940:0:0"

# 日报:阅读区的「工具与项目」一节,和左边那列日期
jpg daily-tools "crop=2320:1352:785:167"
jpg daily-dates "crop=540:1728:171:64" daily-tools

# 检索:三条结果各一张,成片里逐条落下
jpg search-1 "crop=2420:372:448:482" search
jpg search-2 "crop=2420:372:448:866" search
jpg search-3 "crop=2420:430:448:1250" search

ls -la "$OUT"
