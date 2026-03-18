/**
 * AgentDesk Demo Recording v3
 * - 포커스 관리 강화 (매 단축키 전 바탕화면 클릭)
 * - 창이 열릴 때까지 selector 대기
 * - 안전한 텍스트 입력 (단축키 오발 방지)
 * - 100ms 캡처, 55초 이내
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const BASE     = "http://localhost:8800";
const API_URL  = "http://localhost:8790";
const FRAMES   = "C:/project/AgentDesk/docs/reports/frames_v3";
const OUT_FILE = "C:/project/AgentDesk/docs/reports/AgentDesk-Demo.mp4";
const FFMPEG   = "C:/project/AgentDesk/node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.429/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const LIGHT_WP = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";

const W = 1440, H = 900;
const CAPTURE_MS = 100;

let frameIdx = 0;
let capturing = false;
let page = null;

async function captureLoop() {
  while (capturing) {
    const t0 = Date.now();
    try {
      const n = String(frameIdx++).padStart(5, "0");
      await page.screenshot({ path: path.join(FRAMES, `f${n}.png`), fullPage: false });
    } catch {}
    const wait = Math.max(0, CAPTURE_MS - (Date.now() - t0));
    await sleep(wait);
  }
}
function startCapture() { capturing = true; captureLoop(); }
function stopCapture()  { capturing = false; }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 바탕화면 빈 공간 클릭 → 포커스 확보
async function focusDesktop() {
  await page.mouse.click(720, 600); // 하단 빈 영역
  await sleep(200);
}

// Selector 대기 (안 뜨면 null 반환)
async function waitFor(sel, ms = 4000) {
  try { await page.waitForSelector(sel, { timeout: ms }); return true; } catch { return false; }
}

// 부드러운 마우스 이동
async function moveTo(x, y, steps = 10) {
  const pos = await page.evaluate(() => [window.__cx || 720, window.__cy || 450]);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      pos[0] + (x - pos[0]) * i / steps,
      pos[1] + (y - pos[1]) * i / steps
    );
    await sleep(14);
  }
  await page.evaluate((x, y) => { window.__cx = x; window.__cy = y; }, x, y);
}

async function hoverEl(sel) {
  try {
    const el = await page.$(sel);
    if (!el) return false;
    const b = await el.boundingBox();
    if (!b) return false;
    await moveTo(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(300);
    return true;
  } catch { return false; }
}

// g+key 단축키 — 바탕화면 포커스 확보 후 실행
async function openWindow(key) {
  await focusDesktop();
  await sleep(150);
  await page.keyboard.press("g");
  await sleep(80);
  await page.keyboard.press(key);
  await sleep(1800); // 창 애니메이션 대기
}

async function closeWindow() {
  await page.keyboard.press("Escape");
  await sleep(500);
}

// ─────────────────────────────────────────────────────────────────────────────
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

  // Auth
  await page.goto(`${API_URL}/api/auth/session`, { waitUntil: "networkidle0" });
  // Light wallpaper before load
  await page.evaluateOnNewDocument(wp => localStorage.setItem("agentdesk_wallpaper", wp), LIGHT_WP);

  console.log("▸ Loading app...");
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(3000);

  // ── START ────────────────────────────────────────────────────────────────────
  startCapture();
  console.log("▸ Recording\n");

  // ══════════════════════════════════════════════════════════════
  // SCENE 1 — 바탕화면 (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[1] Desktop           ");
  // 마우스로 데스크탑 아이콘 위를 천천히 훑기
  await moveTo(100, 200, 15); await sleep(400);
  await moveTo(220, 200, 12); await sleep(300);  // 아이콘 1
  await moveTo(340, 200, 12); await sleep(300);  // 아이콘 2
  await moveTo(460, 200, 12); await sleep(300);  // 아이콘 3
  await moveTo(580, 200, 12); await sleep(300);  // 아이콘 4
  await moveTo(720, 500, 20); await sleep(800);
  console.log("✓  (5s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 2 — Command Palette (7s)
  //   Ctrl+K → input에 직접 type → ESC
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[2] Command Palette   ");
  await focusDesktop();
  await page.keyboard.down("Control");
  await page.keyboard.press("k");
  await page.keyboard.up("Control");
  await sleep(800);

  // Command Palette input 대기
  const cpInput = await page.$("input[placeholder], [class*='palette'] input, [class*='spotlight'] input, [class*='command'] input");
  if (cpInput) {
    await cpInput.click();
    await sleep(200);
    await page.type("input[placeholder], [class*='palette'] input, [class*='command'] input", "agent", { delay: 80 });
    await sleep(1000);
    // 결과 hover
    const results = await page.$$("[class*='result'], [class*='item'], [role=option]");
    for (const r of results.slice(0, 3)) {
      try { await r.hover(); await sleep(300); } catch {}
    }
    await sleep(500);
    // 검색어 지우고 workflow
    await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
    await sleep(100);
    await page.type("input[placeholder], [class*='palette'] input, [class*='command'] input", "workflow", { delay: 80 });
    await sleep(800);
  } else {
    await sleep(2000);
  }
  await page.keyboard.press("Escape");
  await sleep(600);
  console.log("✓  (7s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 3 — Agent Manager (9s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[3] Agent Manager     ");
  await openWindow("a");

  // 에이전트 카드 탐색
  const agentCards = await page.$$("[class*='agent-card'], [class*='AgentCard'], [class*='agent_card']");
  if (agentCards.length > 0) {
    for (const card of agentCards.slice(0, Math.min(4, agentCards.length))) {
      try {
        const b = await card.boundingBox();
        if (b) { await moveTo(b.x + b.width/2, b.y + b.height/2, 12); await sleep(500); }
      } catch {}
    }
  } else {
    // fallback: 화면 그리드 위치 hover
    for (const [x,y] of [[200,350],[450,350],[700,350],[950,350],[200,500]]) {
      await moveTo(x, y, 12); await sleep(450);
    }
  }
  await sleep(500);
  await closeWindow();
  console.log("✓  (9s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 4 — Workflow Builder (9s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[4] Workflow Builder  ");
  await openWindow("w");

  // 캔버스 확인 후 노드 hover
  await sleep(500);
  const nodes = await page.$$(".react-flow__node, [class*='workflow-node'], [data-nodeid]");
  if (nodes.length > 0) {
    for (const node of nodes.slice(0, 5)) {
      try {
        const b = await node.boundingBox();
        if (b && b.width > 20) { await moveTo(b.x + b.width/2, b.y + b.height/2, 12); await sleep(500); }
      } catch {}
    }
  } else {
    // 패닝 제스처
    await moveTo(600, 450, 10);
    await page.mouse.down();
    await moveTo(400, 380, 20); await sleep(100);
    await moveTo(650, 440, 20);
    await page.mouse.up();
    await sleep(400);
    for (const [x,y] of [[350,300],[600,350],[800,400],[500,500]]) {
      await moveTo(x, y, 12); await sleep(450);
    }
  }
  await sleep(500);
  await closeWindow();
  console.log("✓  (9s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 5 — Library (7s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[5] Library           ");
  await openWindow("l");

  // 탭 순서대로 클릭
  const tabs = await page.$$("[role=tab]");
  for (const tab of tabs.slice(0, 5)) {
    try {
      const b = await tab.boundingBox();
      if (b) {
        await moveTo(b.x + b.width/2, b.y + b.height/2, 8);
        await sleep(150);
        await tab.click();
        await sleep(600);
      }
    } catch {}
  }
  await sleep(400);
  await closeWindow();
  console.log("✓  (7s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 6 — Chat (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[6] Chat              ");
  await openWindow("c");
  await sleep(500);
  // 에이전트 목록 hover
  const chatItems = await page.$$("[class*='agent-item'], [class*='chat-item'], [class*='AgentItem']");
  for (const item of chatItems.slice(0, 3)) {
    try {
      const b = await item.boundingBox();
      if (b) { await moveTo(b.x + b.width/2, b.y + b.height/2, 10); await sleep(400); }
    } catch {}
  }
  await sleep(400);
  await closeWindow();
  console.log("✓  (5s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 7 — Settings (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[7] Settings          ");
  await openWindow("s");

  // 사이드바 메뉴 클릭
  const navItems = await page.$$("[class*='settings'] [role=tab], [class*='settings'] nav li, [class*='SettingsNav'] li, [class*='sidebar'] li");
  for (const item of navItems.slice(0, 4)) {
    try {
      const b = await item.boundingBox();
      if (b && b.height > 0) {
        await moveTo(b.x + b.width/2, b.y + b.height/2, 8);
        await sleep(100);
        await item.click();
        await sleep(500);
      }
    } catch {}
  }
  await sleep(300);
  await closeWindow();
  console.log("✓  (5s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 8 — Mission Control (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[8] Mission Control   ");
  await focusDesktop();
  await page.keyboard.down("Control");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.up("Control");
  await sleep(900);

  // 미니 윈도우 hover
  for (const [x,y] of [[250,350],[600,350],[1000,350],[400,600],[800,600]]) {
    await moveTo(x, y, 12); await sleep(300);
  }
  await sleep(400);
  await page.keyboard.press("Escape");
  await sleep(500);
  console.log("✓  (4s)");

  // ══════════════════════════════════════════════════════════════
  // SCENE 9 — 아웃트로: 바탕화면 + 위젯 (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[9] Outro             ");
  await sleep(300);
  const widgets = await page.$$("[class*='Widget'], [class*='widget-container'], [class*='WidgetContainer']");
  for (const w of widgets.slice(0, 3)) {
    try {
      const b = await w.boundingBox();
      if (b && b.width > 100) { await moveTo(b.x + b.width/2, b.y + b.height/2, 12); await sleep(500); }
    } catch {}
  }
  await moveTo(720, 500, 20); await sleep(800);
  console.log("✓  (4s)");

  // ── STOP ────────────────────────────────────────────────────────────────────
  stopCapture();
  await browser.close();

  const totalSec = (frameIdx / (1000 / CAPTURE_MS)).toFixed(1);
  console.log(`\n▸ ${frameIdx} frames (${totalSec}s @ ${1000/CAPTURE_MS}fps)\n`);

  // ── ENCODE ──────────────────────────────────────────────────────────────────
  console.log("▸ Encoding MP4...");
  const cmd = [
    `"${FFMPEG}"`, `-y`,
    `-framerate ${(1000/CAPTURE_MS).toFixed(2)}`,
    `-i "${FRAMES}/f%05d.png"`,
    `-vf "scale=${W}:${H},format=yuv420p"`,
    `-c:v libx264 -preset fast -crf 20`,
    `-r 30`,
    `-movflags +faststart`,
    `"${OUT_FILE}"`,
  ].join(" ");

  const r = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: "C:/project/AgentDesk" });
  if (r.status === 0) {
    const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅  AgentDesk-Demo.mp4  (${mb} MB · ${totalSec}s · ${W}×${H} · 30fps)`);
  } else {
    console.error("❌ Encoding failed"); process.exit(1);
  }
  fs.rmSync(FRAMES, { recursive: true });
}

main().catch(e => { console.error("❌", e.message); stopCapture(); process.exit(1); });
