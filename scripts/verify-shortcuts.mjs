/**
 * 단축키 검증 스크립트
 * 각 g+key 후 실제로 창이 열리는지 DOM 텍스트로 확인
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const BASE    = "http://localhost:8800";
const API_URL = "http://localhost:8790";
const LIGHT_WP = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getText(page) {
  return page.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n+/g, ' '));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:/project/AgentDesk/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${API_URL}/api/auth/session`, { waitUntil: "networkidle0" });
  await page.evaluateOnNewDocument(wp => localStorage.setItem("agentdesk_wallpaper", wp), LIGHT_WP);
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(3000);

  const tests = [
    { name: "Command Palette (Ctrl+K)", action: async () => {
      await page.mouse.click(720, 680);
      await sleep(200);
      await page.keyboard.down("Control"); await page.keyboard.press("k"); await page.keyboard.up("Control");
      await sleep(1000);
    }},
    { name: "Close CP", action: async () => { await page.keyboard.press("Escape"); await sleep(500); }},
    { name: "Agent Manager (g+a)", action: async () => {
      await page.mouse.click(720, 680); await sleep(200);
      await page.keyboard.press("g"); await sleep(100); await page.keyboard.press("a"); await sleep(2000);
    }},
    { name: "Close AM", action: async () => { await page.keyboard.press("Escape"); await sleep(500); }},
    { name: "Workflow (g+w)", action: async () => {
      await page.mouse.click(720, 680); await sleep(200);
      await page.keyboard.press("g"); await sleep(100); await page.keyboard.press("w"); await sleep(2000);
    }},
    { name: "Close WF", action: async () => { await page.keyboard.press("Escape"); await sleep(500); }},
    { name: "Library (g+l)", action: async () => {
      await page.mouse.click(720, 680); await sleep(200);
      await page.keyboard.press("g"); await sleep(100); await page.keyboard.press("l"); await sleep(2000);
    }},
    { name: "Close LIB", action: async () => { await page.keyboard.press("Escape"); await sleep(500); }},
    { name: "Chat (g+c)", action: async () => {
      await page.mouse.click(720, 680); await sleep(200);
      await page.keyboard.press("g"); await sleep(100); await page.keyboard.press("c"); await sleep(2000);
    }},
    { name: "Close CHAT", action: async () => { await page.keyboard.press("Escape"); await sleep(500); }},
    { name: "Settings (g+s)", action: async () => {
      await page.mouse.click(720, 680); await sleep(200);
      await page.keyboard.press("g"); await sleep(100); await page.keyboard.press("s"); await sleep(2000);
    }},
    { name: "Close SET", action: async () => { await page.keyboard.press("Escape"); await sleep(500); }},
    { name: "Mission Control (Ctrl+↑)", action: async () => {
      await page.mouse.click(720, 680); await sleep(200);
      await page.keyboard.down("Control"); await page.keyboard.press("ArrowUp"); await page.keyboard.up("Control");
      await sleep(1000);
    }},
    { name: "Close MC", action: async () => { await page.keyboard.press("Escape"); await sleep(500); }},
  ];

  for (const t of tests) {
    await t.action();
    const text = await getText(page);
    // Take screenshot
    await page.screenshot({ path: `C:/project/AgentDesk/docs/reports/verify_${t.name.replace(/[^a-z0-9]/gi,'_')}.png` });
    console.log(`[${t.name}] → "${text.slice(0,80)}"`);
  }

  await browser.close();
  console.log("\n✅ Verification done. Check docs/reports/verify_*.png");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
