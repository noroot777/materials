#!/usr/bin/env bash
# 把成片压到 10 MB 以内,给 GitHub 的附件上传用。重新渲染之后跑一次。
#
#   tools/github_upload.sh
#
# 输出 renders/knowbase-promo-github.mp4(不入库)。GitHub 的 README 只给「拖进评论框传上去的
# 附件」出播放器:<video> 标签会被整个滤掉,仓库里的、Pages 上的 mp4 地址都只渲染成一条链接。
# 免费账号的视频附件上限是 10 MB,成片超了,所以另压这一份。
#
# 传法:把输出的文件拖进 knowbase 仓库任意一个 issue 的评论框(不用点提交),等它换成一条
# https://github.com/user-attachments/assets/… 地址,把那条地址单独一行贴进 README。
set -euo pipefail
cd "$(dirname "$0")/.."
out=renders/knowbase-promo-github.mp4
limit=9800000

for crf in 24 25 26 27 28 30; do
  ffmpeg -v error -y -i renders/knowbase-promo.mp4 \
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
