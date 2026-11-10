#!/usr/bin/env bash
# 抽几帧拼成一张联系表,渲染之前先看一眼。
#
#   tools/sheet.sh <名字> <秒,秒,…> [列数=4]
#
# 输出 .work/sheet/<名字>.jpg(每格 640 宽,左上角烧着秒数)。
set -euo pipefail
name=$1; times=$2; cols=${3:-4}
out=.work/snap/$name
rm -rf "$out"; mkdir -p "$out" .work/sheet
npx --yes hyperframes@0.9.27 snapshot . --at "$times" --no-end --keep -o "$out" >/dev/null
inputs=(); n=0
IFS=, read -ra ts <<<"$times"
for t in "${ts[@]}"; do
  f="$out/at-$(node -p "String(+'$t')")s.png"
  ffmpeg -v error -y -i "$f" -vf "scale=640:-2,drawtext=text='$t':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6" "$out/c$n.png"
  inputs+=(-i "$out/c$n.png"); n=$((n + 1))
done
rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y "${inputs[@]}" -filter_complex "concat=n=$n:v=1:a=0,tile=${cols}x${rows}" -frames:v 1 -q:v 4 ".work/sheet/$name.jpg"
echo ".work/sheet/$name.jpg"
