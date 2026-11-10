#!/usr/bin/env node
// 对着 seed-demo.mjs 灌好数据的临时 ash 实例截功能图，输出到 assets/shots/。
//
//   ASH_REPO=<ash 检出目录> node scripts/capture-shots.mjs --base http://localhost:4399 --ids /tmp/ash-promo-demo/ids.json [--only workbench,queue]
//
// ash 的界面状态全在查询参数里，所以每张图就是「一个地址 + 可选的几步按元素的操作」。
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium } from "./ash-repo.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://localhost:4399");
const { projectId, taskId } = JSON.parse(readFileSync(arg("ids", "/tmp/ash-promo-demo/ids.json"), "utf8"));
const only = arg("only", "").split(",").filter(Boolean);
const OUT = arg("out", join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "shots"));
mkdirSync(OUT, { recursive: true });

const web = `project=${projectId.web}`;
const task = (key) => `${web}&task=${taskId[key]}`;
/** `prep` 在页面稳定后、截图前执行；一律按角色/文字找元素，不按坐标点。 */
const SHOTS = [
  { name: "workbench", query: task("applepay") },
  { name: "changes", query: task("applepay"), prep: (page) => openInspector(page, "改动") },
  { name: "diff", query: `${task("applepay")}&view=review` },
  { name: "review", query: task("export"), prep: (page) => openInspector(page, "工作流") },
  { name: "reviewing", query: task("contrast"), prep: (page) => openInspector(page, "工作流") },
  { name: "accepted", query: task("passkey"), prep: (page) => openInspector(page, "改动") },
  { name: "question", query: task("react19") },
  { name: "queue", query: task("q2") },
  { name: "team", query: task("notify") },
  { name: "duet", query: task("state") },
  { name: "chat", query: `${web}&view=chat` },
  {
    name: "palette",
    query: `${task("applepay")}&view=palette`,
    prep: async (page) => {
      await page.keyboard.type("支付", { delay: 40 });
      await page.waitForTimeout(400);
      await page.keyboard.press("ArrowDown");
    },
  },
  { name: "notes", query: `${web}&view=notes` },
  { name: "create", query: `${web}&view=create&mode=single` },
  { name: "phone-list", query: web, phone: true },
  { name: "phone-task", query: task("export"), phone: true },
];

/** 右侧图标条上的面板按名字开；条上没有这一格就原样截。点完把指针挪开，别把悬停提示截进去。 */
async function openInspector(page, title) {
  const tab = page.locator(`.inspector-host__rail [aria-label^="${title}"]`).first();
  if (!(await tab.count())) return;
  await tab.click();
  await page.locator("body").hover({ position: { x: 700, y: 5 } });
}

const browser = await launchChromium();
const shared = { colorScheme: "dark", locale: "zh-CN" };
const desktop = await browser.newContext({ ...shared, viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2 });
const phone = await browser.newContext({ ...shared, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

for (const context of [desktop, phone]) {
  await context.addInitScript(() => localStorage.setItem("ash.colorTheme", "dark"));
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("pageerror:", error.message));
  for (const shot of SHOTS) {
    if (!!shot.phone !== (context === phone)) continue;
    if (only.length && !only.includes(shot.name)) continue;
    await page.goto(`${BASE}/?${shot.query}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    if (shot.prep) {
      await shot.prep(page);
      await page.waitForTimeout(700);
    }
    await page.screenshot({ path: join(OUT, `${shot.name}.png`) });
    console.log("shot", shot.name);
  }
}
await browser.close();
