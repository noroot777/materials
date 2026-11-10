#!/usr/bin/env node
// 单独预览一帧：把 compositions/frames/<id>.html 的 <template> 挂进一张最小宿主页，
// 把它的时间线拖到指定时刻逐张截图，再拼成一张总览图。不依赖 hyperframes CLI，
// 也不碰 index.html，所以多帧可以同时各看各的。
//
//   export ASH_REPO=<ash 检出目录>                            # 浏览器借那边装好的，见 ash-repo.mjs
//   node scripts/shoot-frame.mjs 04-workbench                 # 每拍两张（拍点后 20ms 与 250ms）
//   node scripts/shoot-frame.mjs 04-workbench --at 0,0.47,1.9 # 指定帧内秒数
//   node scripts/shoot-frame.mjs 04-workbench --out /tmp/x    # 默认输出到 /tmp/ash-promo-view/<id>/
//
// 宿主页复刻了成片 index.html 的全局样式与挂载结构；真正的 lint 与成片检查仍以
// `npx hyperframes check` 为准。页面报错、资源 404、时间线没注册都会让它非零退出。
import { existsSync, globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchChromium } from "./ash-repo.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BEAT = 0.46875;
const id = process.argv[2];
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
if (!id || id.startsWith("--")) {
  console.error("用法：node scripts/shoot-frame.mjs <frame_id> [--at t1,t2,…] [--out dir]");
  process.exit(2);
}

const source = readFileSync(join(ROOT, "compositions", "frames", `${id}.html`), "utf8");
const template = /<template>([\s\S]*)<\/template>/.exec(source)?.[1];
if (!template) throw new Error(`${id}.html 里没有 <template>`);
const duration = Number(/data-duration="([\d.]+)"/.exec(template)?.[1] ?? 3.75);
const times = arg("at")
  ? arg("at").split(",").map(Number)
  : Array.from({ length: Math.round(duration / BEAT) }, (_, k) => [k * BEAT + 0.02, k * BEAT + 0.25]).flat();
const out = arg("out", join("/tmp/ash-promo-view", id));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 帧文件里那些到渲染时才会炸、或者会让画面不确定的写法，先在这里点出来。
const smells = [
  [/Math\.random|Date\.now|performance\.now/, "用了随机数/时钟，渲染结果不确定"],
  [/repeat:\s*-1/, "repeat:-1 无限循环"],
  [/\btransition\s*:|\banimation\s*:|@keyframes/, "CSS transition/animation（只能用 GSAP 时间线）"],
  [/<br\b/i, "正文里用了 <br>"],
  [/https?:\/\//, "引用了外部地址（字体/图片/脚本都必须走工程内文件）"],
  [/\.from\(/, "用了 gsap.from（改用 fromTo）"],
];
const warned = smells.filter(([re]) => re.test(template)).map(([, why]) => why);

// gsap 用 hyperframes 随包带的那份（npx 缓存里），无头浏览器不一定出得了网；实在没有才退回 CDN。
const vendored = globSync(join(homedir(), ".npm/_npx/*/node_modules/hyperframes/dist/vendor/npm/gsap@*/dist/gsap.min.js")).sort().at(-1);
const gsapSrc = arg("gsap") ?? vendored;
const gsapUrl = gsapSrc && existsSync(gsapSrc) ? pathToFileURL(gsapSrc).href : "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";

const previewDir = join(ROOT, ".preview");
mkdirSync(previewDir, { recursive: true });
const hostPath = join(previewDir, `${id}.html`);
writeFileSync(
  hostPath,
  `<!doctype html><html><head><meta charset="UTF-8"><base href="../">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
  .frame { position: absolute; inset: 0; width: 100%; height: 100%; }
</style>
<script src="${gsapUrl}"></script>
<script>window.__timelines = {};</script>
</head><body><div style="position:relative;width:1920px;height:1080px;overflow:hidden"><div class="frame">${template}</div></div></body></html>`,
);

const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const problems = [];
page.on("pageerror", (error) => problems.push(`脚本报错：${error.message}`));
page.on("console", (message) => message.type() === "error" && problems.push(`console.error：${message.text()}`));
page.on("requestfailed", (request) => problems.push(`加载失败：${request.url()}`));
page.on("response", (response) => response.status() >= 400 && problems.push(`HTTP ${response.status()}：${response.url()}`));
await page.goto(pathToFileURL(hostPath).href, { waitUntil: "load", timeout: 20000 });
await page.evaluate(() => document.fonts.ready);
const registered = await page.evaluate((key) => !!window.__timelines[key], id);
if (!registered) problems.push(`window.__timelines["${id}"] 没注册`);

const shots = [];
if (registered) {
  const length = await page.evaluate((key) => window.__timelines[key].duration(), id);
  if (length > duration + 0.001) problems.push(`时间线长 ${length.toFixed(3)}s，超出帧时长 ${duration}s`);
  for (const t of times) {
    // 花括号不能省：箭头函数隐式返回时间线对象，Playwright 会去序列化那张带环的大图，卡死不返回。
    await page.evaluate(([key, at]) => {
      window.__timelines[key].pause().seek(at, false);
    }, [id, t]);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const name = `t${t.toFixed(3)}.png`;
    await page.screenshot({ path: join(out, name) });
    shots.push({ name, t });
  }
  // 总览图：四列，一格 480×270，左上角标帧内秒数与第几拍
  const cells = shots
    .map(({ name, t }) => `<figure><img src="${name}"><figcaption>${t.toFixed(2)}s · b${Math.floor(t / BEAT + 1e-6)}</figcaption></figure>`)
    .join("");
  const rows = Math.ceil(shots.length / 4);
  const sheet = await browser.newPage({ viewport: { width: 1920, height: rows * 270 } });
  // about:blank 上的页面读不了 file:// 图片，所以总览页落盘后再打开
  const sheetPath = join(out, "sheet.html");
  writeFileSync(
    sheetPath,
    `<style>body{margin:0;background:#000;display:grid;grid-template-columns:repeat(4,480px)}figure{margin:0;position:relative;width:480px;height:270px}img{width:480px;height:270px;display:block;outline:1px solid #444;outline-offset:-1px}figcaption{position:absolute;left:0;top:0;background:#000;color:#fff;font:14px monospace;padding:2px 6px}</style>${cells}`,
  );
  await sheet.goto(pathToFileURL(sheetPath).href, { waitUntil: "load" });
  await sheet.screenshot({ path: join(out, "sheet.jpg"), type: "jpeg", quality: 82 });
  console.log(`总览图 ${join(out, "sheet.jpg")}（单张在同目录 t<秒>.png，共 ${shots.length} 张）`);
}
await browser.close();
rmSync(hostPath, { force: true });

for (const why of warned) console.log(`⚠ ${why}`);
for (const why of [...new Set(problems)]) console.error(`✗ ${why}`);
process.exit(problems.length ? 1 : 0);
