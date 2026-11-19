#!/usr/bin/env python3
"""程序化合成配乐：128 BPM、26 小节（48.75s）的电子舞曲。

为什么不用现成曲子：卡点视频要的是「画面切在鼓点上」，自己合成的曲子节拍网格是
精确已知的（拍 = 0.46875s，小节 = 1.875s），段落结构也能按分镜来排：

    小节  0– 3  引子    琶音滤波渐开，第 3 小节起底鼓 + 上升音效
    小节  4–11  高潮 A  全鼓组 + 反拍贝斯 + 侧链和弦
    小节 12–15  间奏    撤鼓，军鼓滚奏加速，最后一拍留白
    小节 16–23  高潮 B  加主旋律与十六分贝斯
    小节 24–25  收尾    一记重击 + 混响拖尾

用法：python3 scripts/synth-bgm.py assets/bgm.wav
"""
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
BPM = 128
BEAT = 60.0 / BPM
BAR = 4 * BEAT
S16 = BEAT / 4
BARS = 26
N = int(round(BARS * BAR * SR))
rng = np.random.default_rng(128)

# 每小节一个和弦：Am – F – C – G。root 给贝斯，voicing 给铺底与琶音
CHORDS = [
    (45, [57, 60, 64, 69]),
    (41, [57, 60, 65, 69]),
    (48, [55, 60, 64, 67]),
    (43, [55, 59, 62, 67]),
]
# 主旋律：每小节 8 个八分音符位，0 = 休止
LEAD = [
    [76, 0, 76, 74, 0, 72, 0, 69],
    [72, 0, 72, 74, 0, 76, 0, 72],
    [79, 0, 79, 76, 0, 74, 0, 72],
    [74, 0, 74, 76, 0, 79, 0, 71],
    [76, 0, 76, 74, 0, 72, 0, 69],
    [72, 0, 72, 74, 0, 76, 0, 72],
    [79, 0, 79, 76, 0, 74, 0, 72],
    [74, 76, 79, 0, 81, 0, 79, 83],
]
ARP_STEPS = [0, 1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 3, 2, 1, 0, 1]

DROP_A = range(4, 12)
BREAK = range(12, 16)
DROP_B = range(16, 24)
END_BAR = 24


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def sos(kind, fc, order=2):
    return signal.butter(order, fc, kind, fs=SR, output="sos")


def filt(x, kind, fc, order=2):
    return signal.sosfilt(sos(kind, fc, order), x, axis=0)


def fade_out(x, sec=0.01):
    n = min(len(x), int(sec * SR))
    x[-n:] *= np.linspace(1, 0, n)
    return x


def pan_gains(pan):
    a = (pan + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def put(bus, x, at_sec, gain=1.0, pan=0.0):
    """把一段单声道/立体声素材叠进总线，越界部分截掉。"""
    i = int(round(at_sec * SR))
    if i >= N or i < 0:
        return
    x = x[: N - i]
    if x.ndim == 1:
        l, r = pan_gains(pan)
        bus[i : i + len(x), 0] += x * gain * l
        bus[i : i + len(x), 1] += x * gain * r
    else:
        bus[i : i + len(x)] += x * gain


def bar_curve(points):
    """按 (小节, 值) 折点生成逐采样自动化曲线，对数插值（给滤波截止频率用）。"""
    bars = np.arange(N) / SR / BAR
    xs = [p[0] for p in points]
    ys = np.log([p[1] for p in points])
    return np.exp(np.interp(bars, xs, ys))


def sweep_lp(x, fc_curve, lo=180.0, hi=16000.0, bands=9):
    """时变低通：一排固定截止的滤波结果按自动化曲线逐采样交叉淡化。"""
    fcs = np.geomspace(lo, hi, bands)
    pos = np.clip(np.log(fc_curve / lo) / np.log(hi / lo), 0, 1) * (bands - 1)
    idx = np.minimum(pos.astype(int), bands - 2)
    frac = (pos - idx)[:, None].astype(np.float32)
    out = np.zeros_like(x)
    prev = filt(x, "low", fcs[0]).astype(np.float32)
    for b in range(bands - 1):
        nxt = filt(x, "low", fcs[b + 1]).astype(np.float32)
        m = idx == b
        out[m] = prev[m] * (1 - frac[m]) + nxt[m] * frac[m]
        prev = nxt
    return out


# ── 音色 ──────────────────────────────────────────────────────────────


def saw(freq, n, phase0=0.0):
    """PolyBLEP 锯齿波，压掉裸锯齿的混叠。"""
    dt = freq / SR
    ph = (phase0 + dt * np.arange(n)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt
    y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt
    y[m] -= x * x + x + x + 1
    return y


def supersaw(freq, n, voices=7, detune=0.011):
    out = np.zeros((n, 2))
    for v in range(voices):
        spread = (v / (voices - 1) - 0.5) * 2
        l, r = pan_gains(spread * 0.8)
        s = saw(freq * (1 + spread * detune), n, rng.random())
        out[:, 0] += s * l
        out[:, 1] += s * r
    return out / voices


def pluck(freq, dur, bright=1.0, d0=7.0, d1=1.6):
    """加法合成拨弦：高次谐波衰减更快，等价于一个快速闭合的滤波包络，且天然无混叠。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    k_max = int(min(28 * bright, (SR / 2 - 500) / freq))
    y = np.zeros(n)
    for k in range(1, k_max + 1):
        y += np.sin(2 * np.pi * k * freq * t + 0.3 * k) * np.exp(-t * (d0 + d1 * k)) / k
    y *= 1 - np.exp(-t / 0.002)
    return fade_out(y, 0.02)


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 47 + 135 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.17)
    click = filt(rng.standard_normal(n), "high", 3000) * np.exp(-t / 0.004) * 0.22
    return fade_out(np.tanh(1.9 * (body + click)), 0.02)


def clap():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    noise = signal.sosfilt(sos("bandpass", [900, 5200]), rng.standard_normal(n))
    env = np.exp(-t / 0.12) * 0.55
    for off in (0.0, 0.011, 0.022):
        tt = t - off
        env += (tt >= 0) * np.exp(-np.maximum(tt, 0) / 0.007)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
    return fade_out(noise * env * 0.5 + tone, 0.03)


def hat(decay):
    n = int(decay * 6 * SR)
    t = np.arange(n) / SR
    return fade_out(filt(rng.standard_normal(n), "high", 7800, 4) * np.exp(-t / decay), 0.005)


def bass_note(midi, dur, sub_gain=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    mid = filt(saw(f, n) + 0.5 * saw(f * 2.005, n), "low", 900, 4)
    sub = np.sin(2 * np.pi * f / 2 * t)
    env = (1 - np.exp(-t / 0.004)) * np.exp(-t / (dur * 1.4))
    return fade_out((mid * 0.55 + sub * sub_gain) * env, 0.015)


def impact():
    n = int(3.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(34 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.55)
    crash = filt(rng.standard_normal(n), "high", 3500) * np.exp(-t / 0.75) * 0.35
    return fade_out(np.tanh(1.6 * boom) + crash, 0.2)


def riser(bars):
    n = int(bars * BAR * SR)
    x = np.arange(n) / n
    noise = rng.standard_normal((n, 2))
    fcs = np.geomspace(300, 14000, 8)
    pos = x * (len(fcs) - 1)
    idx = np.minimum(pos.astype(int), len(fcs) - 2)
    frac = (pos - idx)[:, None]
    out = np.zeros((n, 2))
    for b in range(len(fcs) - 1):
        m = idx == b
        lo = filt(noise, "low", fcs[b])
        hi = filt(noise, "low", fcs[b + 1])
        out[m] = lo[m] * (1 - frac[m]) + hi[m] * frac[m]
    f = 220 * 2 ** (x * 2)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    out += tone[:, None]
    return out * (x**2.2)[:, None]


# ── 编曲 ──────────────────────────────────────────────────────────────

drums = np.zeros((N, 2))
bass = np.zeros((N, 2))
pad = np.zeros((N, 2))
arp = np.zeros((N, 2))
lead = np.zeros((N, 2))
fx = np.zeros((N, 2))
verb_send = np.zeros((N, 2))

KICK, CLAP = kick(), clap()
HAT_C, HAT_O = hat(0.018), hat(0.085)
kick_times = []


def place_kick(t, gain=1.0):
    put(drums, KICK, t, gain)
    kick_times.append(t)


for bar in range(BARS):
    t0 = bar * BAR
    root, voicing = CHORDS[bar % 4]
    in_drop = bar in DROP_A or bar in DROP_B
    in_b = bar in DROP_B

    # 鼓
    if bar in (2, 3) or in_drop:
        for b in range(4):
            if bar == 3 and b == 3:
                continue
            place_kick(t0 + b * BEAT, 0.85 if bar < 4 else 1.0)
    if in_drop:
        for b in (1, 3):
            put(drums, CLAP, t0 + b * BEAT, 0.62)
            put(verb_send, CLAP, t0 + b * BEAT, 0.16)
        for s in range(16):
            if s % 4 == 2:
                put(drums, HAT_O, t0 + s * S16, 0.2 if in_b or bar >= 8 else 0.15, 0.15)
            elif s % 2 == 1 or in_b:
                put(drums, HAT_C, t0 + s * S16, 0.11 if s % 2 else 0.07, -0.2)
        if bar in (7, 11, 19, 23):  # 句尾军鼓填充
            for s, g in ((13, 0.4), (14, 0.5), (15, 0.6)):
                put(drums, CLAP, t0 + s * S16, g)
    if bar in (12, 13):
        for b in (1, 3):
            put(drums, CLAP, t0 + b * BEAT, 0.3)
            put(verb_send, CLAP, t0 + b * BEAT, 0.3)
    if bar == 3:  # 引子尾的三连填充，把人推进第一次高潮
        for s, g in ((12, 0.4), (13, 0.5), (14, 0.6), (15, 0.7)):
            put(drums, CLAP, t0 + s * S16, g)

    # 贝斯
    if in_drop:
        for b in range(4):
            if in_b:
                for s in (1, 2, 3):
                    put(bass, bass_note(root, S16 * 0.92), t0 + b * BEAT + s * S16, 0.5 if s != 2 else 0.6)
            else:
                put(bass, bass_note(root, BEAT / 2 * 0.9), t0 + b * BEAT + BEAT / 2, 0.6)
    elif bar in BREAK:
        put(bass, bass_note(root, BAR * 0.95, sub_gain=0.6), t0, 0.28)

    # 铺底和弦
    if bar < END_BAR:
        n = int(BAR * SR)
        chord = np.zeros((n, 2))
        notes = voicing + ([voicing[-1] + 12] if bar >= 20 and in_b else [])
        for m in notes:
            chord += supersaw(hz(m), n)
        env = np.minimum(1, np.arange(n) / (0.02 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.03 * SR))
        put(pad, chord * env[:, None] / len(notes), t0, 1.0)

    # 琶音（十六分音符，3-3-2 重音）
    if bar < END_BAR:
        ladder = voicing[:3] + [v + 12 for v in voicing[:3]]
        for s in range(16):
            if bar == 15 and s >= 12:
                break
            accent = 1.0 if s % 8 in (0, 3, 6) else 0.6
            note = pluck(hz(ladder[ARP_STEPS[s]] + 12), 0.32, bright=0.9)
            put(arp, note, t0 + s * S16, 0.5 * accent, pan=0.35 if s % 2 else -0.35)

    # 主旋律
    if in_b:
        row = LEAD[bar - 16]
        for i, m in enumerate(row):
            if not m:
                continue
            hold = 1
            while i + hold < 8 and row[i + hold] == 0:
                hold += 1
            dur = hold * BEAT / 2 + 0.12
            note = pluck(hz(m), dur, bright=1.0, d0=3.2, d1=0.5) + 0.4 * pluck(hz(m - 12), dur, d0=3.2, d1=0.8)
            put(lead, note, t0 + i * BEAT / 2, 0.5)

# 间奏的军鼓滚奏：八分 → 十六分 → 三十二分，最后一拍留白
roll_t = 14 * BAR
roll_end = 16 * BAR - BEAT
steps = [BEAT / 2] * 8 + [S16] * 8 + [S16 / 2] * 8
t = roll_t
for i, step in enumerate(steps):
    if t >= roll_end - 1e-6:
        break
    g = 0.22 + 0.5 * (t - roll_t) / (roll_end - roll_t)
    put(drums, CLAP, t, g)
    t += step

# 音效：上升、重击
put(fx, riser(2), 2 * BAR, 0.33)
put(fx, riser(2)[: int((2 * BAR - BEAT) * SR)], 14 * BAR, 0.42)
put(fx, riser(1), 23 * BAR, 0.3)
IMPACT = impact()
for bar, g in ((0, 0.5), (4, 0.9), (8, 0.45), (16, 1.0), (20, 0.5), (24, 1.1)):
    put(fx, IMPACT, bar * BAR, g)
    put(verb_send, IMPACT, bar * BAR, g * 0.35)

# 收尾：一记和弦重音，交给混响拖尾
n_end = int(1.6 * SR)
end_chord = np.zeros((n_end, 2))
for m in (45, 57, 64, 69, 72, 76, 81):
    end_chord += supersaw(hz(m), n_end)
end_chord *= (np.exp(-np.arange(n_end) / SR / 0.45) / 7)[:, None]
put(pad, end_chord, END_BAR * BAR, 2.2)
put(drums, KICK, END_BAR * BAR, 1.0)
put(drums, CLAP, END_BAR * BAR, 0.6)
put(lead, pluck(hz(81), 1.5, d0=2.0, d1=0.4), END_BAR * BAR, 0.5)

# ── 总线处理 ──────────────────────────────────────────────────────────

# 滤波自动化：引子与间奏从闷到亮，高潮全开
pad_fc = bar_curve([(0, 350), (3.9, 2600), (4, 5200), (12, 5200), (12.05, 700), (15.7, 6000), (16, 7500), (24, 7500), (26, 3000)])
arp_fc = bar_curve([(0, 500), (3.9, 6500), (4, 9000), (12, 9000), (12.05, 1200), (15.7, 9000), (16, 12000), (26, 12000)])
pad = sweep_lp(pad.astype(np.float32), pad_fc).astype(np.float64)
arp = sweep_lp(arp.astype(np.float32), arp_fc).astype(np.float64)

# 侧链：底鼓落下时把和弦、琶音、主旋律压下去再放回来，电子乐的「呼吸」来自这里
duck = np.ones(N)
for kt in kick_times:
    i = int(round(kt * SR))
    n = min(N - i, int(0.42 * SR))
    tt = np.arange(n) / SR
    duck[i : i + n] = np.minimum(duck[i : i + n], 1 - 0.82 * np.exp(-tt / 0.13))
duck = signal.sosfilt(sos("low", 60, 1), duck)[:, None]
pad *= duck
arp *= 0.35 + 0.65 * duck
lead *= 0.5 + 0.5 * duck
bass *= 0.25 + 0.75 * duck


def pingpong(x, delay, feedback=0.42, taps=5):
    out = np.zeros_like(x)
    d = int(delay * SR)
    for k in range(1, taps + 1):
        g = feedback**k
        shifted = np.zeros_like(x)
        shifted[d * k :] = x[: N - d * k]
        if k % 2:
            shifted = shifted[:, ::-1] * np.array([1.0, 0.35])
        else:
            shifted = shifted * np.array([1.0, 0.35])
        out += shifted * g
    return out


arp_wet = pingpong(arp, BEAT * 0.75)
lead_wet = pingpong(lead, BEAT * 0.75, feedback=0.35)

verb_send += pad * 0.25 + arp * 0.35 + lead * 0.5 + lead_wet * 0.3
ir_n = int(2.2 * SR)
ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.arange(ir_n) / SR / 0.5)[:, None]
ir = filt(filt(ir, "high", 350), "low", 7000)
ir /= np.sqrt((ir**2).sum(axis=0))
verb = np.stack([signal.fftconvolve(verb_send[:, c], ir[:, c])[:N] for c in range(2)], axis=1)

buses = {
    "drums": drums * 0.8,
    "bass": bass * 0.95,
    "pad": pad * 1.5,
    "arp": (arp + arp_wet * 0.5) * 0.42,
    "lead": (lead + lead_wet * 0.45) * 0.55,
    "fx": fx * 0.6,
    "verb": verb * 0.55,
}
mix = sum(buses.values())
mix = filt(mix, "high", 28)
mix = np.tanh(mix * 1.15)
mix *= 0.89 / np.max(np.abs(mix))
tail = int(0.6 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2

out_path = sys.argv[1] if len(sys.argv) > 1 else "assets/bgm.wav"
sf.write(out_path, mix.astype(np.float32), SR)
for name, b in buses.items():
    print(f"{name:6s} rms {np.sqrt((b**2).mean()):.4f} peak {np.abs(b).max():.3f}")
print(f"wrote {out_path} {N / SR:.3f}s  beat={BEAT:.5f}s bar={BAR:.4f}s")
