// 截图用的无头浏览器借 Navi 仓库里装好的那一套：这份工程自己不装依赖。
// NAVI_REPO 指向一份装过依赖（npm install）的 Navi 检出。
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function launchChromium() {
  const repo = process.env.NAVI_REPO && resolve(process.env.NAVI_REPO);
  const chromePath = repo && join(repo, "web", "scripts", "chrome-path.mjs");
  if (!repo || !existsSync(chromePath)) {
    console.error("先设 NAVI_REPO=<Navi 检出目录>（要装过依赖）：浏览器用的是那边的 playwright-core 和 web/scripts/chrome-path.mjs");
    process.exit(2);
  }
  const { chromium } = createRequire(join(repo, "web", "package.json"))("playwright-core");
  const { chromeLaunchOptions } = await import(pathToFileURL(chromePath).href);
  return chromium.launch(await chromeLaunchOptions());
}
