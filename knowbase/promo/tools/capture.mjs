// 给宣传视频截素材:CDP 直连 chrome-headless-shell,对着一套跑着的 kb-web 只发 GET。
//
//   KNOWBASE_REPO=<knowbase 检出目录> HEADLESS_SHELL=<bin> node tools/capture.mjs <baseURL> <outDir> [only,names]
//
// 视口 1600×900 @2x(成片 1920 宽里界面略放大、推近时还有余量)。起浏览器走 knowbase
// 仓库自己的 tests/probe_shell.mjs —— 那一份保证浏览器一定会被收掉。
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.KNOWBASE_REPO) {
  console.error("先设 KNOWBASE_REPO=<knowbase 仓库的检出目录>(要用它的 tests/probe_shell.mjs)");
  process.exit(2);
}
const { launchShell } = await import(
  pathToFileURL(resolve(process.env.KNOWBASE_REPO, "tests/probe_shell.mjs")).href
);

const [base, outDir, only = ""] = process.argv.slice(2);
const pick = new Set(only.split(",").filter(Boolean));
mkdirSync(outDir, { recursive: true });

const W = 1600, H = 900;
const { port } = await launchShell(["--force-color-profile=srgb", `--window-size=${W},${H}`]);
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(list.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));

let id = 0;
const pend = new Map();
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
});
const send = (method, params = {}) => {
  const mid = ++id;
  return new Promise(res => { pend.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
};
const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) console.log("  eval!", r.result.exceptionDetails.exception?.description?.slice(0, 200));
  return r.result?.result?.value;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

await send("Page.enable");
await send("Runtime.enable");

async function waitFor(cond, ms = 25000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await evalJs(cond)) return true;
    await sleep(300);
  }
  console.log("  等不到:", cond.slice(0, 80));
  return false;
}

async function shoot(name, { url = "/", ready = "", steps = [], wait = 1200, h = H } = {}) {
  if (pick.size && !pick.has(name)) return;
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: h, deviceScaleFactor: 2, mobile: false });
  await send("Page.navigate", { url: base + url });
  if (ready) await waitFor(ready);
  await sleep(wait);
  for (const s of steps) {
    if (s.js) await evalJs(s.js);
    if (s.until) await waitFor(s.until, s.ms);
    await sleep(s.wait ?? 900);
    if (s.shot) await snap(s.shot);
  }
  await snap(name);
}

async function snap(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  const data = r.result?.data;
  if (!data) { console.log(`!! ${name} 没截到`); return; }
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(data, "base64"));
  console.log(`ok ${name}.png`);
}

const GRID = `document.querySelectorAll('button.gcard').length > 8`;
const dump = process.env.DUMP;
if (dump) {
  // 探路用:把某个标签页的结构打出来,好写下面那些选择器
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: base + "/" });
  await waitFor(GRID);
  console.log(await evalJs(dump));
  ws.close();
  process.exit(0);
}

await shoot("gallery", { ready: GRID });
await shoot("drawer", { ready: GRID, steps: [{ js: process.env.DRAWER_JS || `document.querySelector('button.gcard')?.click()`, wait: 1800 }] });
await shoot("search", { ready: GRID, steps: [{
  js: `switchTab('search'); document.getElementById('q').value=${JSON.stringify(process.env.SEARCH_Q || "claude code 记忆")}; doSearch();`,
  until: `document.querySelectorAll('#results > *').length > 2`, wait: 1500 }] });
await shoot("fav", { ready: GRID, steps: [{ js: `switchTab('fav')`, wait: 2500 }] });
await shoot("daily", { ready: GRID, steps: [{ js: `switchTab('daily')`, wait: 3000 }] });
await shoot("subs", { ready: GRID, steps: [{ js: `switchTab('subs')`, wait: 3000 }] });
await shoot("pipe", { ready: GRID, steps: [{ js: `switchTab('pipe')`, wait: 2500 }] });
await shoot("ask", { ready: GRID, steps: [{ js: `switchTab('ask')`, wait: 2000 }] });
// 订阅页逐面板各一张;日报滚到「工具与项目」;图鉴拉一张长图给成片做纵向滚动
for (const k of ["wechat", "social", "rss", "youtube"]) {
  // 连接状态那条提示默认展开着、盖住名单头几行,截之前按它自己的说法收起
  await shoot(`subs-${k}`, { ready: GRID, steps: [
    { js: `switchTab('subs'); openSubsPanel('${k}')`, wait: 3200 },
    { js: `document.querySelectorAll('details.source-notices[open]').forEach(d => d.open = false)`, wait: 400 }] });
}
await shoot("daily-tools", { ready: GRID, steps: [
  { js: `switchTab('daily')`, until: `document.querySelectorAll('.daily-reader h2').length > 2`, wait: 1500 },
  { js: `window.scrollTo(0, [...document.querySelectorAll('.daily-reader h2')].find(h => h.textContent.includes('工具与项目')).getBoundingClientRect().top + scrollY - 96)`, wait: 900 }] });
await shoot("gallery-tall", { ready: GRID, h: 2600, wait: 2500 });
for (const [n, u] of [["graph", "/graph"], ["graph-projects", "/graph/projects"], ["graph-skills", "/graph/skills"]]) {
  await shoot(n, { url: u, wait: 4000 });
}

ws.close();
process.exit(0);
