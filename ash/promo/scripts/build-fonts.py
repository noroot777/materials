#!/usr/bin/env python3
"""按片中实际用到的字，把字体裁成 assets/fonts/*.woff2。

渲染时不联网，字体必须随工程走；思源黑体整套十几 MB，只留各帧文件里出现过的字。
改了帧里的文案就重跑一遍，缺字（哪个字符没有任何一款字体能画）会列出来并以非零退出。

用法：python3 scripts/build-fonts.py --src <放着原始 ttf 的目录> [--wide]
  --wide  写帧阶段用：把 GB2312 一级常用字全放进去，文案怎么改都不缺字；定稿后不带它重跑。
  目录里需要：Barlow-Black.ttf Barlow-Bold.ttf Barlow-Medium.ttf
              IBMPlexMono-Medium.ttf NotoSansSC.ttf（可变字重）
  均为 OFL 字体，来自 Google Fonts。依赖：pip install fonttools brotli
"""
import argparse
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "assets", "fonts")
# 拉丁字体固定留整套可打印 ASCII 加几个排版符号：帧里的英文、数字随便改都不用重裁。
LATIN = set(map(chr, range(0x20, 0x7F))) | set("·×—–…→←↑↓✓")

# (源文件, 输出名, 可变轴取值或 None, 是否 CJK)
FONTS = [
    ("Barlow-Black.ttf", "Barlow-Black", None, False),
    ("Barlow-Bold.ttf", "Barlow-Bold", None, False),
    ("Barlow-Medium.ttf", "Barlow-Medium", None, False),
    ("IBMPlexMono-Medium.ttf", "IBMPlexMono-Medium", None, False),
    ("NotoSansSC.ttf", "NotoSansSC-Black", {"wght": 900}, True),
    ("NotoSansSC.ttf", "NotoSansSC-Medium", {"wght": 500}, True),
]


def used_chars():
    chars = set()
    for path in glob.glob(os.path.join(ROOT, "compositions", "frames", "*.html")):
        chars |= set(open(path, encoding="utf-8").read())
    return {c for c in chars if c.isprintable()}


def common_hanzi():
    """GB2312 一级字（3755 个最常用汉字）加全角标点。"""
    chars = set("，。、；：？！“”‘’（）《》【】—…·")
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return chars


def build(src_dir, chars):
    os.makedirs(OUT, exist_ok=True)
    covered = set()
    for src, name, axes, cjk in FONTS:
        font = TTFont(os.path.join(src_dir, src))
        cmap = font.getBestCmap()
        want = {c for c in (chars if cjk else LATIN | chars) if ord(c) in cmap}
        if not cjk:
            want = {c for c in want if ord(c) < 0x2E80}
        covered |= want
        options = subset.Options(flavor="woff2", layout_features=["kern", "liga"], notdef_outline=True)
        sub = subset.Subsetter(options)
        sub.populate(unicodes=[ord(c) for c in want])
        sub.subset(font)
        if axes:
            font = instancer.instantiateVariableFont(font, axes)
        font.flavor = "woff2"
        target = os.path.join(OUT, f"{name}.woff2")
        font.save(target)
        print(f"{name}.woff2  {len(want)} 字  {os.path.getsize(target) / 1024:.0f} KB")
    return covered


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--wide", action="store_true")
    args = parser.parse_args()
    chars = used_chars()
    if args.wide:
        chars |= common_hanzi()
    covered = build(args.src, chars)
    # 帧文件里的 CSS/JS 也在字符集里，只有非 ASCII 的缺字才值得报。
    missing = sorted(c for c in chars - covered if ord(c) > 0x7F and not c.isspace())
    if missing:
        print("缺字（没有任何一款字体能画，改用内联 SVG 或换个写法）：", " ".join(f"{c}(U+{ord(c):04X})" for c in missing))
        sys.exit(1)


if __name__ == "__main__":
    main()
