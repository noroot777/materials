#!/usr/bin/env node
// 从 src/ 生成 compositions/frames/*.html。
//
//   node tools/build-frames.mjs [帧名的一部分…]     # 不带参数 = 全部
//
// 一帧的源文件是 src/frames/<名字>.html,里面三段:<style>、标记、<script>。这里把它和
// src/kit.css / src/kit.js 一起包成 HyperFrames 要的子合成形状(<template> 里一个带
// data-composition-id 的根 + 一条登记在 window.__timelines 上的暂停时间线)。
//
// 每帧的起点和时长只从 STORYBOARD.md 读 —— 帧脚本里写的是全片时间,换算由 kit 的 at() 做,
// 所以改分镜的时长不用回头改任何一帧的源文件。
//
// 八帧会同时挂进 index.html,而子合成之间没有样式隔离:源文件里的 #ROOT 在这里换成这一帧
// 独有的根 id(f01…),脚本包进闭包、只在自己的根底下找元素。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function storyboardFrames() {
  const frames = [];
  for (const block of read('STORYBOARD.md').split(/^## Frame /m).slice(1)) {
    const src = /^- src: (\S+)/m.exec(block);
    const dur = /^- duration: ([\d.]+)s/m.exec(block);
    const span = /^- span_sec: \[([\d.]+), ([\d.]+)\]/m.exec(block);
    if (!src || !dur || !span) throw new Error(`STORYBOARD.md 里有一帧缺 src/duration/span_sec:\n${block.slice(0, 80)}`);
    frames.push({ out: src[1], stem: basename(src[1], '.html'), t0: +span[1], dur: +dur[1] });
  }
  return frames;
}

function section(source, tag, stem) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(source);
  if (!m) throw new Error(`src/frames/${stem}.html 缺 <${tag}> 段`);
  return m[1];
}

function build(frame, kitCss, kitJs) {
  const source = read(`src/frames/${frame.stem}.html`);
  const id = 'f' + frame.stem.slice(0, 2);
  const css = (kitCss + section(source, 'style', frame.stem)).replaceAll('#ROOT', '#' + id);
  const script = section(source, 'script', frame.stem);
  const markup = source.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script>[\s\S]*?<\/script>/, '').trim();
  return `<!doctype html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<!-- 生成物:改 src/frames/${frame.stem}.html 或 src/kit.*,再跑 node tools/build-frames.mjs -->
<template>
<style>
${css.trim()}
</style>
<div id="${id}" data-composition-id="${frame.stem}" data-width="1920" data-height="1080" data-duration="${frame.dur}">
${markup}
</div>
<script>
(function () {
${kitJs.trim()}
  var root = document.getElementById(${JSON.stringify(id)});
  var T0 = ${frame.t0}, DUR = ${frame.dur};
  var tl = gsap.timeline({ paused: true });
  var k = kbKit(root, tl, T0, DUR);
  var $ = k.$, $$ = k.$$, at = k.at, gate = k.gate, slam = k.slam, rise = k.rise,
      push = k.push, chars = k.chars, typeOn = k.typeOn, roll = k.roll;
  tl.to({ v: 0 }, { v: 1, duration: DUR, ease: 'none' }, 0);
${script.trim()}
  window.__timelines = window.__timelines || {};
  window.__timelines[${JSON.stringify(frame.stem)}] = tl;
  tl.seek(0);
})();
</script>
</template>
</body>
</html>
`;
}

const want = process.argv.slice(2);
const kitCss = read('src/kit.css');
const kitJs = read('src/kit.js');
let built = 0;
for (const frame of storyboardFrames()) {
  if (want.length && !want.some((w) => frame.stem.includes(w))) continue;
  if (!existsSync(join(ROOT, `src/frames/${frame.stem}.html`))) {
    console.log(`- ${frame.stem}: 还没有源文件,跳过`);
    continue;
  }
  mkdirSync(join(ROOT, dirname(frame.out)), { recursive: true });
  writeFileSync(join(ROOT, frame.out), build(frame, kitCss, kitJs));
  console.log(`✓ ${frame.out}  [${frame.t0}, ${(frame.t0 + frame.dur).toFixed(3)}]`);
  built++;
}
if (!built) process.exitCode = 1;
