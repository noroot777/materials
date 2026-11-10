#!/usr/bin/env bash
# 把 MusicGen 出的那条鼓组裁成成片配乐,并叠上卡点音效。
#
#   tools/mix_bgm.sh <groove.wav> <sfx 目录> [out=assets/bgm.mp3]
#
# 鼓组本身是一小节循环到底、没有段落起伏,所以结构是这里做出来的:
#   第 0 小节低通(闷着进) + 上升音 → 第 1 小节正拍全频砸下;
#   第 15 小节高通(抽掉低频的一小节空拍) + 上升音 → 第 16 小节再砸一次;
#   最后一个正拍补一记低频,之后留一秒多的静场给落版。
# 时刻全部取自 audiomap.json 的 downbeats_sec —— 改了裁切起点要重跑
# analyze-beatgrid.py 并跟着改这里的常量,两边不许各算各的。
set -euo pipefail

SRC=$1
SFX=$2
OUT=${3:-assets/bgm.mp3}

T0=5.30          # 原轨里的裁切起点:第 3 个正拍前 60ms
LEN=43.30
HIT=1.997        # 第 1 小节正拍:字标砸下
BREAK=28.862     # 第 15 小节:空拍
DROP=30.790      # 第 16 小节:日报段
FINAL=40.403     # 最后一个正拍:落版
CUTS="7.755 15.441 23.104 34.621 38.475"   # 段落切换处各一声短促的风声

RISER_PEAK=3.10  # riser.mp3 的最响点
WHOOSH_PEAK=0.17

ms() { python3 -c "print(max(0, round(($1) * 1000)))"; }

inputs=(-ss "$T0" -t "$LEN" -i "$SRC")
filt="[0:a]aresample=44100,highshelf=f=5000:g=4,asplit=4[ga][gb][gc][gd];"
filt+="[ga]atrim=0:${HIT},asetpts=PTS-STARTPTS,lowpass=f=420,volume=0.8[a];"
filt+="[gb]atrim=${HIT}:${BREAK},asetpts=PTS-STARTPTS[b];"
filt+="[gc]atrim=${BREAK}:${DROP},asetpts=PTS-STARTPTS,highpass=f=900,volume=0.85[c];"
filt+="[gd]atrim=${DROP}:${LEN},asetpts=PTS-STARTPTS[d];"
filt+="[a][b][c][d]concat=n=4:v=0:a=1[groove];"
mix="[groove]"
n=1

add() {  # add <文件> <落点秒> <峰值在文件里的位置> <音量> [附加滤镜]
  local file=$1 at=$2 peak=$3 vol=$4 extra=${5:-}
  local lead skip
  lead=$(python3 -c "print(max(0, $at - $peak))")
  skip=$(python3 -c "print(max(0, $peak - $at))")
  inputs+=(-ss "$skip" -i "$SFX/$file")
  filt+="[$n:a]aresample=44100,aformat=channel_layouts=mono${extra:+,$extra},volume=${vol},adelay=$(ms "$lead")[s$n];"
  mix+="[s$n]"
  n=$((n + 1))
}

add riser.mp3 "$HIT" "$RISER_PEAK" 0.55 "afade=t=out:st=$(python3 -c "print(min($HIT, $RISER_PEAK))"):d=0.25"
add impact-bass-1.mp3 "$HIT" 0.05 0.30 "afade=t=out:st=0.25:d=1.1"
add riser.mp3 "$DROP" "$RISER_PEAK" 0.50 "afade=t=out:st=${RISER_PEAK}:d=0.25"
add impact-bass-2.mp3 "$DROP" 0.02 0.28 "afade=t=out:st=0.25:d=1.1"
add impact-bass-1.mp3 "$FINAL" 0.05 0.34 "afade=t=out:st=0.4:d=1.5"
for t in $CUTS; do add whoosh.mp3 "$t" "$WHOOSH_PEAK" 0.45; done

filt+="${mix}amix=inputs=${n}:normalize=0:duration=first,alimiter=limit=0.89:level=false,"
filt+="afade=t=in:st=0:d=0.02,afade=t=out:st=42.7:d=0.5,pan=stereo|c0=c0|c1=c0[out]"

ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filt" -map "[out]" -t "$LEN" \
  -c:a libmp3lame -b:a 192k "$OUT"
echo "wrote $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
