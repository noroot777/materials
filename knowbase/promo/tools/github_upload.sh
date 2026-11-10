#!/usr/bin/env bash
# 把成片压到 10 MB 以内,给 GitHub 的附件上传用。重新渲染之后跑一次。
#
#   tools/github_upload.sh
#
# 输出 renders/knowbase-promo-github.mp4(不入库)。GitHub 的 README 只给「拖进评论框传上去的
# 附件」出播放器:<video> 标签会被整个滤掉,仓库里的、Pages 上的 mp4 地址都只渲染成一条链接。
# 免费账号的视频附件上限是 10 MB,成片超了,所以另压这一份。
#
# 封面:那个播放器没有设封面的地方,没点播放之前露出来的就是第 0 帧 —— 而成片的第 0 帧是开场
# 刚起手的一块暗底。所以这一份把第 0 帧(只这一帧,1/30 秒)换成片尾定格的那一屏,时长和卡点
# 都不动。那一屏在成片里贴着下沿,而播放器的控制条正压在下沿上,所以缩到 cover_scale 再用同
# 一个底色补满 —— 底色取的是成片解码出来的值(paper),不是色板上的 #F3F5F4,差一档就会露接缝。
# 想换别的画面就改 cover_from(ffmpeg 的 -sseof,从片尾往回数的秒数);换的要不是平底的一屏,
# 就把 cover_scale 设成 1。
#
# 传法:把输出的文件拖进 knowbase 仓库任意一个 issue 的评论框(不用点提交),等它换成一条
# https://github.com/user-attachments/assets/… 地址,用它换掉 knowbase 的 README 里现有的那一条
# (那条地址得单独占一行,前后各空一行)。
set -euo pipefail
cd "$(dirname "$0")/.."
out=renders/knowbase-promo-github.mp4
limit=9800000
cover_from=-0.2
cover_scale=0.74
paper=0xF3F5F5
cover="trim=end_frame=1,setpts=PTS-STARTPTS,scale=trunc(iw*$cover_scale/2)*2:-2:flags=lanczos"
cover="$cover,pad=1920:1080:(ow-iw)/2:(oh-ih)*0.36:color=$paper"

for crf in 24 25 26 27 28 30; do
  ffmpeg -v error -y -i renders/knowbase-promo.mp4 -sseof "$cover_from" -i renders/knowbase-promo.mp4 \
    -filter_complex "[1:v]$cover[cover];[0:v][cover]overlay=enable='eq(n,0)':eof_action=pass[v]" \
    -map "[v]" -map 0:a \
    -c:v libx264 -preset slower -crf "$crf" -pix_fmt yuv420p \
    -c:a copy -movflags +faststart "$out"
  size=$(wc -c < "$out")
  if [ "$size" -le "$limit" ]; then
    echo "crf=$crf"
    ls -l "$out"
    exit 0
  fi
done
echo "压到 crf 30 还是超过 $limit 字节($size),片子变长了就得降分辨率或码率" >&2
exit 1
