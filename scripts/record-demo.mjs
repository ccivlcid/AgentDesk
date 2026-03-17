/**
 * AgentDesk Demo Recording
 * Puppeteer로 실제 앱을 조작하며 프레임 캡처 → MP4
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execSync, spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const BASE    = "http://localhost:8800";
const API_URL = "http://localhost:8790";
const FRAMES_DIR = "C:/project/AgentDesk/docs/reports/frames";
const OUT_FILE   = "C:/project/AgentDesk/docs/reports/AgentDesk-Demo.mp4";
const FFMPEG  = "C:/project/AgentDesk/node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.429/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";

const LIGHT_WALLPAPER = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";
const CAPTURE_INTERVAL = 180; // ms between frames → ~5.5fps
let frameIdx = 0;
let capturing = false;
let captureTimer = null;
let page = null;

// ── Frame capture loop ──────────────────────────────────────────────────────
async function startCapture() {
  capturing = true;
  async function loop() {
    if (!capturing) return;
    try {
      const num = String(frameIdx++).padStart(5, "0");
      await page.screenshot({
        path: path.join(FRAMES_DIR, `frame-${num}.png`),
        fullPage: false,
      });
    } catch {}
    if (capturing) captureTimer = setTimeout(loop, CAPTURE_INTERVAL);
  }
  loop();
}

function stopCapture() {
  capturing = false;
  if (captureTimer) clearTimeout(captureTimer);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Hold current frame for N ms (useful for pauses)
async function hold(ms) {
  await sleep(ms);
}

// ── UI helpers ──────────────────────────────────────────────────────────────
async function typeKey(key) {
  await page.keyboard.press(key);
  await sleep(80);
}

async function combo(...keys) {
  for (const k of keys.slice(0, -1)) await page.keyboard.down(k);
  await page.keyboard.press(keys.at(-1));
  for (const k of keys.slice(0, -1)) await page.keyboard.up(k);
  await sleep(80);
}

async function seq(...keys) {
  for (const k of keys) {
    await page.keyboard.press(k);
    await sleep(120);
  }
}

async function clickText(text) {
  try {
    const el = await page.$x(`//*[contains(text(), '${text}')]`);
    if (el.length) { await el[0].click(); return true; }
  } catch {}
  return false;
}

async function clickSelector(sel, timeout = 3000) {
  try {
    await page.waitForSelector(sel, { timeout });
    await page.click(sel);
    return true;
  } catch { return false; }
}

async function typeInto(sel, text, clear = true) {
  try {
    await page.waitForSelector(sel, { timeout: 3000 });
    await page.click(sel);
    if (clear) await page.keyboard.selectAll?.() || await combo("Control", "a");
    await page.type(sel, text, { delay: 60 });
    return true;
  } catch { return false; }
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  // Prepare frames dir
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  console.log("▸ Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:/project/AgentDesk/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--force-prefers-color-scheme=light"],
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Auth
  await page.goto(`${API_URL}/api/auth/session`, { waitUntil: "networkidle0" });

  // Light wallpaper
  await page.evaluateOnNewDocument((wp) => {
    localStorage.setItem("agentdesk_wallpaper", wp);
  }, LIGHT_WALLPAPER);

  // Load app
  console.log("▸ Loading app...");
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(2000);

  console.log("▸ Recording...\n");
  startCapture();

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 1: 오프닝 — 바탕화면 (5s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 1] Desktop overview");
  await hold(5000);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 2: Command Palette 열기 (Ctrl+K) → 검색 (6s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 2] Command Palette");
  await combo("Control", "k");
  await sleep(800);
  await page.type("body", "workflow", { delay: 80 });
  await sleep(1200);
  await page.type("body", "\b\b\b\b\b\b\b\b", { delay: 40 });
  await page.type("body", "agent", { delay: 80 });
  await sleep(1500);
  await typeKey("Escape");
  await hold(1000);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 3: Agent Manager 열기 (g → a) (8s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 3] Agent Manager");
  await seq("g", "a");
  await sleep(1500);
  await hold(4000);
  // 에이전트 카드들 hover
  const agentCards = await page.$$(".agent-card, [class*='agent-card'], [class*='AgentCard']");
  for (const card of agentCards.slice(0, 3)) {
    try { await card.hover(); await sleep(400); } catch {}
  }
  await hold(1000);
  await typeKey("Escape");
  await hold(600);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 4: Workflow Builder (g → w) (9s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 4] Workflow Builder");
  await seq("g", "w");
  await sleep(1800);
  await hold(5000);
  // 워크플로 노드들 hover
  const nodes = await page.$$(".react-flow__node, [class*='workflow-node'], [data-id]");
  for (const node of nodes.slice(0, 4)) {
    try { await node.hover(); await sleep(500); } catch {}
  }
  await hold(1200);
  await typeKey("Escape");
  await hold(600);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 5: Library (g → l) — Skills / Rules 탭 (8s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 5] Library");
  await seq("g", "l");
  await sleep(1500);
  await hold(2500);
  // Rules 탭 클릭
  const tabs = await page.$$("[role=tab], .tab-btn, [class*='tab-button']");
  if (tabs.length > 1) {
    await tabs[1].click(); await sleep(800);
    await hold(1200);
    if (tabs.length > 2) { await tabs[2].click(); await sleep(800); }
    await hold(1200);
  }
  await typeKey("Escape");
  await hold(600);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 6: Settings (g → s) (6s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 6] Settings");
  await seq("g", "s");
  await sleep(1500);
  await hold(2500);
  // API 탭 클릭
  const sTabs = await page.$$("[role=tab], .settings-tab");
  if (sTabs.length > 1) { await sTabs[1].click(); await sleep(700); await hold(1200); }
  await typeKey("Escape");
  await hold(600);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 7: Chat Window (g → c) (6s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 7] Chat");
  await seq("g", "c");
  await sleep(1500);
  await hold(3500);
  await typeKey("Escape");
  await hold(600);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 8: Mission Control (Ctrl+↑) (5s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 8] Mission Control");
  await combo("Control", "ArrowUp");
  await sleep(900);
  await hold(3500);
  await typeKey("Escape");
  await hold(600);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 9: 바탕화면 위젯 + 앱 메뉴 (7s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 9] Desktop widgets + App Menu");
  await hold(2000);
  // 앱 메뉴 버튼 클릭
  const menuBtn = await page.$("[class*='menubar'] button:first-child, [class*='MenuBar'] button:first-child, [class*='logo'], .logo-btn");
  if (menuBtn) {
    await menuBtn.click(); await sleep(800);
    await hold(1500);
    await typeKey("Escape"); await sleep(400);
  }
  await hold(2000);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 10: Wallpaper Picker (5s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 10] Wallpaper Picker");
  // Try right-click on desktop
  await page.mouse.click(720, 450, { button: "right" });
  await sleep(600);
  const ctxItems = await page.$$("[class*='context-menu'] li, [role=menuitem]");
  // Look for wallpaper option
  for (const item of ctxItems) {
    const t = await page.evaluate(el => el.textContent, item);
    if (t && (t.includes("배경") || t.includes("wallpaper") || t.includes("Wallpaper"))) {
      await item.click(); await sleep(600); break;
    }
  }
  if (!ctxItems.length) await typeKey("Escape");
  await hold(3000);
  await typeKey("Escape");
  await hold(1000);

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE 11: 아웃트로 — 바탕화면 (4s)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[Scene 11] Outro");
  await hold(4000);

  stopCapture();
  await browser.close();

  console.log(`\n▸ ${frameIdx} frames captured`);

  // ═══════════════════════════════════════════════════════════════════════
  // ENCODE: frames → MP4
  // ═══════════════════════════════════════════════════════════════════════
  console.log("▸ Encoding video...");

  // framerate: 1000ms / CAPTURE_INTERVAL ms = fps
  const inputFps = (1000 / CAPTURE_INTERVAL).toFixed(2);
  const outputFps = 30;

  const cmd = [
    `"${FFMPEG}"`,
    `-y`,
    `-framerate ${inputFps}`,
    `-i "${FRAMES_DIR}/frame-%05d.png"`,
    `-vf "scale=1440:900,format=yuv420p"`,
    `-c:v libx264 -preset fast -crf 18`,
    `-r ${outputFps}`,
    `-movflags +faststart`,
    `"${OUT_FILE}"`,
  ].join(" ");

  const result = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: "C:/project/AgentDesk" });

  if (result.status === 0) {
    const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
    const secs = (frameIdx / parseFloat(inputFps)).toFixed(0);
    console.log(`\n✅  docs/reports/AgentDesk-Demo.mp4  (${mb} MB, ~${secs}s)`);
  } else {
    console.error("❌ Encoding failed");
    process.exit(1);
  }

  // Cleanup frames
  fs.rmSync(FRAMES_DIR, { recursive: true });
  console.log("▸ Temp frames cleaned up");
}

main().catch(err => {
  console.error("❌", err.message);
  stopCapture();
  process.exit(1);
});
