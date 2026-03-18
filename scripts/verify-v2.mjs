import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = "http://localhost:8800";
const API_URL = "http://localhost:8790";
const LIGHT_WP = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";

async function dispatchKey(page, opts) {
  await page.evaluate(o => window.dispatchEvent(new KeyboardEvent("keydown", {
    key: o.key, ctrlKey: !!o.ctrlKey, shiftKey: !!o.shiftKey, bubbles: true, cancelable: true
  })), opts);
  await sleep(100);
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').slice(0, 200));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:/project/AgentDesk/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${API_URL}/api/auth/session`, { waitUntil: "networkidle0" });
  await page.evaluateOnNewDocument(wp => localStorage.setItem("agentdesk_wallpaper", wp), LIGHT_WP);
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(3000);

  console.log("baseline:", (await bodyText(page)).slice(0,60));

  // Test Ctrl+Shift+K
  await dispatchKey(page, { key: "K", ctrlKey: true, shiftKey: true });
  await sleep(1000);
  await page.screenshot({ path: "C:/project/AgentDesk/docs/reports/v2_ctrlshiftk.png" });
  console.log("Ctrl+Shift+K:", (await bodyText(page)).slice(0,80));

  // Close
  await dispatchKey(page, { key: "Escape" }); await sleep(500);

  // Test g+a
  await dispatchKey(page, { key: "g" }); await sleep(150);
  await dispatchKey(page, { key: "a" }); await sleep(2000);
  await page.screenshot({ path: "C:/project/AgentDesk/docs/reports/v2_ga.png" });
  console.log("g+a:", (await bodyText(page)).slice(0,80));

  // Close
  await dispatchKey(page, { key: "Escape" }); await sleep(500);

  // Test g+w
  await dispatchKey(page, { key: "g" }); await sleep(150);
  await dispatchKey(page, { key: "w" }); await sleep(2000);
  await page.screenshot({ path: "C:/project/AgentDesk/docs/reports/v2_gw.png" });
  console.log("g+w:", (await bodyText(page)).slice(0,80));

  // Close
  await dispatchKey(page, { key: "Escape" }); await sleep(500);

  // Test Ctrl+ArrowUp
  await dispatchKey(page, { key: "ArrowUp", ctrlKey: true }); await sleep(1000);
  await page.screenshot({ path: "C:/project/AgentDesk/docs/reports/v2_mc.png" });
  console.log("Ctrl+↑:", (await bodyText(page)).slice(0,80));

  await browser.close();
  console.log("\n✅ Check docs/reports/v2_*.png");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
