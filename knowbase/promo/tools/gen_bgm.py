"""本地用 MusicGen 生成配乐候选(没有 HeyGen 凭证时的离线路)。

    python3 tools/gen_bgm.py <outDir> [--model facebook/musicgen-medium] [--seeds 11,23,42]

每个种子出一条 ~30 秒的种子段,再拿它的末尾 10 秒做音频提示续写一次,
得到 ~48 秒的整轨(续写比交叉淡化循环稳:拍子相位不会在接缝处跳)。
模型只读本机 HF 缓存,不联网。
"""
import argparse
import os
import sys
import time

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import numpy as np
import soundfile as sf
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

PROMPT = (
    "energetic upbeat electronic promo music, punchy four-on-the-floor kick drum, "
    "tight claps on the backbeat, driving synth bassline, bright plucky synth melody, "
    "125 bpm, steady tempo, modern tech product launch, confident and clean, strong downbeats"
)
FRAME_RATE = 50          # MusicGen 的 token 帧率
SEED_TOKENS = 1500       # 30 秒,解码器位置上限以内
TAIL_SEC = 10            # 续写时带进去的尾巴


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--model", default="facebook/musicgen-medium")
    ap.add_argument("--seeds", default="11,23,42")
    ap.add_argument("--prompt", default=PROMPT)
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    proc = AutoProcessor.from_pretrained(args.model)
    model = MusicgenForConditionalGeneration.from_pretrained(args.model).to(args.device)
    sr = model.config.audio_encoder.sampling_rate

    for seed in [int(s) for s in args.seeds.split(",")]:
        t0 = time.time()
        torch.manual_seed(seed)
        inputs = proc(text=[args.prompt], padding=True, return_tensors="pt").to(args.device)
        head = model.generate(**inputs, do_sample=True, guidance_scale=3.0,
                              max_new_tokens=SEED_TOKENS)[0, 0].cpu().numpy()
        print(f"seed {seed}: head {len(head) / sr:.1f}s in {time.time() - t0:.0f}s", flush=True)

        tail = head[-TAIL_SEC * sr:]
        cont_in = proc(audio=tail, sampling_rate=sr, text=[args.prompt],
                       padding=True, return_tensors="pt").to(args.device)
        torch.manual_seed(seed + 1)
        cont = model.generate(**cont_in, do_sample=True, guidance_scale=3.0,
                              max_new_tokens=SEED_TOKENS - TAIL_SEC * FRAME_RATE)[0, 0].cpu().numpy()
        # 续写的输出带着提示那一段,只接新长出来的部分
        fresh = cont[len(tail):]
        full = np.concatenate([head, fresh])
        peak = np.abs(full).max() or 1.0
        path = os.path.join(args.out, f"cand-{seed}.wav")
        sf.write(path, (full / peak * 0.95).astype(np.float32), sr)
        print(f"seed {seed}: wrote {path} {len(full) / sr:.1f}s total {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    sys.exit(main())
