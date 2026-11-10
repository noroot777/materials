#!/usr/bin/env python3
"""把 audiomap.json 的节拍网格换成合成曲的真值。

analyze-beatgrid 是从音频里估出来的（估成 129.2 BPM、23 小节，越往后漂得越远）；
这首曲子是 synth-bgm.py 合成的，网格精确已知，卡点就该按真值卡。事件、能量分段等
听感类字段保留分析结果，只覆盖网格、乐句与段落锚点。

用法：python3 scripts/exact-grid.py audiomap.json
"""
import json
import sys

BPM, BARS = 128, 26
BEAT = 60 / BPM
BAR = 4 * BEAT

path = sys.argv[1] if len(sys.argv) > 1 else "audiomap.json"
a = json.load(open(path))
a["tempo"].update(bpm=BPM, n_beats=BARS * 4, n_bars=BARS, downbeat_phase=0)
a["grid"]["beats_sec"] = [round(i * BEAT, 5) for i in range(BARS * 4)]
a["grid"]["downbeats_sec"] = [round(i * BAR, 5) for i in range(BARS)]
a["phrases"] = [
    {"index": i, "start": round(s * BAR, 4), "end": round(e * BAR, 4), "bars": e - s}
    for i, (s, e) in enumerate([(0, 4), (4, 8), (8, 12), (12, 16), (16, 20), (20, 24), (24, 26)])
]
a["key_moments"] = [
    {"t": 7.5, "kind": "SURGE", "note": "高潮 A 起"},
    {"t": 15.0, "kind": "SURGE", "note": "高潮 A 后半，开镲加入"},
    {"t": 22.5, "kind": "DROP", "note": "间奏，撤鼓"},
    {"t": 26.25, "kind": "SURGE", "note": "军鼓滚奏起，持续加速"},
    {"t": 30.0, "kind": "SURGE", "note": "高潮 B 起，主旋律进"},
    {"t": 37.5, "kind": "SURGE", "note": "高潮 B 后半，和弦加高八度"},
    {"t": 45.0, "kind": "DROP", "note": "收尾重击，之后只剩混响拖尾"},
]
a["hard_stops"] = [
    {"t": round(16 * BAR - BEAT, 5), "kind": "STOP", "note": "高潮 B 前留白一拍"},
    {"t": 45.0, "kind": "STOP", "note": "收尾重击"},
]
a["rolls"] = [
    {"start": round(3 * BAR + 3 * BEAT, 5), "end": 7.5, "kind": "fill", "drum": "snare", "leads_to": "SURGE"},
    {"start": 26.25, "end": round(16 * BAR - BEAT, 5), "kind": "accel-roll", "drum": "snare", "leads_to": "SURGE"},
]
a["summary"] = f"{BPM} BPM · {BARS * 4} beats / {BARS} bars · 网格取自合成真值 · {a['audio']['duration_sec']}s"
json.dump(a, open(path, "w"), ensure_ascii=False, indent=1)
print(a["summary"])
