/**
 * AgentDesk Demo Recording v2
 * - 100ms 간격 캡처 (~10fps input → 30fps output)
 * - 부드러운 마우스 이동
 * - 55초 이내 타이트한 씬 구성
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const BASE      = "http://localhost:8800";
const API_URL   = "http://localhost:8790";
const FRAMES    = "C:/project/AgentDesk/docs/reports/frames_v2";
const OUT_FILE  = "C:/project/AgentDesk/docs/reports/AgentDesk-Demo.mp4";
const FFMPEG    = "C:/project/AgentDesk/node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.429/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";

const LIGHT_WP  = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";
const CAPTURE_MS = 100; // 10fps
const W = 1440, H = 900;

let frameIdx = 0;
let capturing = false;
let page = null;

// ── Capture loop ─────────────────────────────────────────────────────────────
async function captureLoop() {
  while (capturing) {
    const t0 = Date.now();
    try {
      const num = String(frameIdx++).padStart(5, "0");
      await page.screenshot({ path: path.join(FRAMES, `f${num}.png`), fullPage: false });
    } catch {}
    const elapsed = Date.now() - t0;
    const wait = Math.max(0, CAPTURE_MS - elapsed);
    await sleep(wait);
  }
}

function startCapture() { capturing = true; captureLoop(); }
function stopCapture()  { capturing = false; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Smooth mouse move ─────────────────────────────────────────────────────────
async function moveTo(x, y, steps = 12) {
  const cur = await page.evaluate(() => ({ x: window.__mx ?? 720, y: window.__my ?? 450 }));
  for (let i = 1; i <= steps; i++) {
    const nx = cur.x + (x - cur.x) * (i / steps);
    const ny = cur.y + (y - cur.y) * (i / steps);
    await page.mouse.move(nx, ny);
    await sleep(16);
  }
  await page.evaluate((x, y) => { window.__mx = x; window.__my = y; }, x, y);
}

async function click(x, y) {
  await moveTo(x, y);
  await sleep(50);
  await page.mouse.click(x, y);
}

async function rightClick(x, y) {
  await moveTo(x, y);
  await sleep(50);
  await page.mouse.click(x, y, { button: "right" });
}

async function combo(...keys) {
  for (const k of keys.slice(0, -1)) await page.keyboard.down(k);
  await page.keyboard.press(keys.at(-1));
  for (const k of keys.slice(0, -1)) await page.keyboard.up(k);
}

async function typeText(text, delay = 70) {
  for (const ch of text) {
    await page.keyboard.press(ch === " " ? "Space" : ch);
    await sleep(delay + Math.random() * 30);
  }
}

async function esc() { await page.keyboard.press("Escape"); await sleep(300); }

// Wait for selector safely
async function waitFor(sel, timeout = 3000) {
  try { await page.waitForSelector(sel, { timeout }); return true; } catch { return false; }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  if (fs.existsSync(FRAMES)) fs.rmSync(FRAMES, { recursive: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  console.log("▸ Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:/project/AgentDesk/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  // Auth + light mode
  await page.goto(`${API_URL}/api/auth/session`, { waitUntil: "networkidle0" });
  await page.evaluateOnNewDocument(wp => localStorage.setItem("agentdesk_wallpaper", wp), LIGHT_WP);

  console.log("▸ Loading app...");
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(2500);

  // ── START RECORDING ─────────────────────────────────────────────────────────
  console.log("▸ Recording start\n");
  startCapture();

  // ══════════════════════════════════════════════════════════════
  // SCENE 1 — 바탕화면 (4s)
  //   천천히 마우스 이동으로 "살아있는" 느낌
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[1/9] Desktop    ");
  await moveTo(400, 300, 20); await sleep(600);
  await moveTo(900, 500, 25); await sleep(600);
  await moveTo(600, 400, 20); await sleep(600);
  await moveTo(1100, 300, 25); await sleep(500);
  await moveTo(720, 450, 20); await sleep(600);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 2 — Command Palette (6s)
  //   Ctrl+K → 검색어 입력 → ESC
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[2/9] Command Palette  ");
  await combo("Control", "k");
  await sleep(700);
  await moveTo(720, 380, 8);
  await typeText("agent manager", 65);
  await sleep(900);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await sleep(200);
  await typeText("workflow", 65);
  await sleep(900);
  await esc();
  await sleep(500);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 3 — Agent Manager (9s)
  //   g+a → 에이전트 카드 hover
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[3/9] Agent Manager  ");
  await page.keyboard.press("g"); await sleep(80);
  await page.keyboard.press("a");
  await sleep(1500);

  // Hover agent cards systematically
  for (const [x, y] of [[250, 280], [550, 280], [850, 280], [250, 450], [550, 450]]) {
    await moveTo(x, y, 15); await sleep(450);
  }
  await sleep(500);

  // Click first card to open detail (if exists)
  await moveTo(250, 280, 12);
  await page.mouse.click(250, 280);
  await sleep(800);
  await moveTo(720, 450, 20);
  await sleep(600);
  await esc();
  await sleep(400);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 4 — Workflow Builder (9s)
  //   g+w → 노드 hover + 패닝
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[4/9] Workflow Builder  ");
  await page.keyboard.press("g"); await sleep(80);
  await page.keyboard.press("w");
  await sleep(1800);

  // Pan the canvas smoothly
  await moveTo(700, 450, 10);
  await page.mouse.down();
  await moveTo(500, 400, 20); await sleep(100);
  await moveTo(650, 430, 20); await sleep(100);
  await page.mouse.up();
  await sleep(400);

  // Hover nodes
  for (const [x, y] of [[350, 350], [550, 280], [750, 380], [600, 500]]) {
    await moveTo(x, y, 14); await sleep(500);
  }
  await sleep(400);
  await esc();
  await sleep(400);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 5 — Library (7s)
  //   g+l → 탭 전환 (Skills → Rules → Hooks)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[5/9] Library  ");
  await page.keyboard.press("g"); await sleep(80);
  await page.keyboard.press("l");
  await sleep(1500);

  // Click through tabs
  const tabSelectors = ["[role=tab]:nth-child(1)", "[role=tab]:nth-child(2)", "[role=tab]:nth-child(3)", "[role=tab]:nth-child(4)"];
  for (const sel of tabSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const box = await el.boundingBox();
        if (box) { await moveTo(box.x + box.width / 2, box.y + box.height / 2, 10); await sleep(200); await el.click(); await sleep(700); }
      }
    } catch {}
  }
  await sleep(400);
  await esc();
  await sleep(400);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 6 — Chat Window (5s)
  //   g+c → 채팅 UI 탐색
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[6/9] Chat  ");
  await page.keyboard.press("g"); await sleep(80);
  await page.keyboard.press("c");
  await sleep(1500);
  await moveTo(400, 400, 15); await sleep(400);
  await moveTo(800, 500, 20); await sleep(400);
  await moveTo(500, 600, 15); await sleep(500);
  // Try clicking chat input
  const chatInput = await page.$("textarea, input[type=text], [placeholder*='메시지'], [placeholder*='message']");
  if (chatInput) {
    const b = await chatInput.boundingBox();
    if (b) { await moveTo(b.x + 100, b.y + b.height / 2, 10); await sleep(300); }
  }
  await sleep(500);
  await esc();
  await sleep(400);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 7 — Settings (5s)
  //   g+s → API 탭 클릭
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[7/9] Settings  ");
  await page.keyboard.press("g"); await sleep(80);
  await page.keyboard.press("s");
  await sleep(1500);
  await moveTo(200, 350, 12); await sleep(300);

  // Click through sidebar items
  const sideItems = await page.$$("nav li, aside li, [class*='sidebar'] li, [class*='nav-item']");
  for (const item of sideItems.slice(0, 4)) {
    try {
      const b = await item.boundingBox();
      if (b) { await moveTo(b.x + b.width / 2, b.y + b.height / 2, 8); await sleep(180); await item.click(); await sleep(450); }
    } catch {}
  }
  await sleep(300);
  await esc();
  await sleep(400);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 8 — Mission Control (4s)
  //   Ctrl+↑ → 오버뷰 → ESC
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[8/9] Mission Control  ");
  await combo("Control", "ArrowUp");
  await sleep(900);
  // Hover miniature windows
  for (const [x, y] of [[300, 350], [700, 350], [1100, 350], [500, 600]]) {
    await moveTo(x, y, 12); await sleep(350);
  }
  await sleep(300);
  await esc();
  await sleep(500);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 9 — 아웃트로 (4s)
  //   바탕화면으로 돌아와 위젯 hover
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[9/9] Outro  ");
  await sleep(500);
  // Hover widgets
  const widgets = await page.$$("[class*='widget'], [class*='Widget']");
  for (const w of widgets.slice(0, 4)) {
    try {
      const b = await w.boundingBox();
      if (b && b.width > 50) { await moveTo(b.x + b.width / 2, b.y + b.height / 2, 12); await sleep(400); }
    } catch {}
  }
  await moveTo(720, 450, 20);
  await sleep(1000);
  console.log("✓");

  // ── STOP ────────────────────────────────────────────────────────────────────
  stopCapture();
  await browser.close();

  const totalSec = (frameIdx / (1000 / CAPTURE_MS)).toFixed(1);
  console.log(`\n▸ ${frameIdx} frames captured (${totalSec}s @ ${1000/CAPTURE_MS}fps)\n`);

  // ── ENCODE ──────────────────────────────────────────────────────────────────
  console.log("▸ Encoding...");
  const inputFps = (1000 / CAPTURE_MS).toFixed(2);

  // Use minterpolate if available, else just duplicate frames to 30fps
  const cmd = [
    `"${FFMPEG}"`, `-y`,
    `-framerate ${inputFps}`,
    `-i "${FRAMES}/f%05d.png"`,
    `-vf "scale=${W}:${H},format=yuv420p"`,
    `-c:v libx264 -preset fast -crf 20`,
    `-r 30`,
    `-movflags +faststart`,
    `"${OUT_FILE}"`,
  ].join(" ");

  const result = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: "C:/project/AgentDesk" });

  if (result.status === 0) {
    const stat = fs.statSync(OUT_FILE);
    const mb = (stat.size / 1024 / 1024).toFixed(1);
    console.log(`\n✅  AgentDesk-Demo.mp4  (${mb} MB, ${totalSec}s, 1440×900, 30fps)`);
  } else {
    console.error("❌ Encoding failed"); process.exit(1);
  }

  fs.rmSync(FRAMES, { recursive: true });
}

main().catch(e => { console.error("❌", e.message); stopCapture(); process.exit(1); });
