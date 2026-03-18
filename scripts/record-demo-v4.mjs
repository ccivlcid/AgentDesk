/**
 * AgentDesk Demo Recording v4
 * - 창 열림/닫힘 DOM으로 직접 확인
 * - page.keyboard.type() 직접 사용 (셀렉터 의존 없음)
 * - 캡처 루프 / UI 액션 충돌 방지 (sequential 캡처)
 * - 55초 이내
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const BASE     = "http://localhost:8800";
const API_URL  = "http://localhost:8790";
const FRAMES   = "C:/project/AgentDesk/docs/reports/frames_v4";
const OUT_FILE = "C:/project/AgentDesk/docs/reports/AgentDesk-Demo.mp4";
const FFMPEG   = "C:/project/AgentDesk/node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.429/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const LIGHT_WP = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";

const W = 1440, H = 900;
let frameIdx = 0;
let page = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 프레임 캡처 (블로킹 없이) ─────────────────────────────────────────────────
async function cap() {
  try {
    const n = String(frameIdx++).padStart(5, "0");
    await page.screenshot({ path: path.join(FRAMES, `f${n}.png`), fullPage: false });
  } catch {}
}

// 일정 시간 동안 지속 캡처 (100ms 간격)
async function record(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const t0 = Date.now();
    await cap();
    const wait = Math.max(0, 100 - (Date.now() - t0));
    if (wait > 0) await sleep(wait);
  }
}

// ── 마우스 부드럽게 이동 ──────────────────────────────────────────────────────
let cx = 720, cy = 450;
async function moveTo(x, y, steps = 12) {
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx + (x - cx) * i / steps, cy + (y - cy) * i / steps);
    await sleep(14);
  }
  cx = x; cy = y;
}

// ── 바탕화면 안전 클릭 (포커스) ──────────────────────────────────────────────
async function focusDesktop() {
  await page.mouse.click(720, 680); // Dock 위 빈 영역
  await sleep(300);
}

// ── DOM 확인: 특정 텍스트가 화면에 있는지 ──────────────────────────────────
async function isVisible(text) {
  return page.evaluate(t => {
    const els = document.querySelectorAll("*");
    for (const el of els) {
      if (el.childNodes.length === 1 && el.textContent?.includes(t) && el.offsetParent !== null) return true;
    }
    return false;
  }, text);
}

// ── g+key 단축키로 창 열기, DOM 확인 후 반환 ─────────────────────────────────
async function openWindow(key, confirmText) {
  await focusDesktop();
  await sleep(100);
  await page.keyboard.press("g");
  await sleep(100);
  await page.keyboard.press(key);
  // 창 열릴 때까지 최대 3초 대기 (캡처 병행)
  for (let i = 0; i < 30; i++) {
    await cap(); await sleep(100);
    if (confirmText && await isVisible(confirmText)) break;
  }
  await sleep(200);
}

async function closeWindow() {
  await page.keyboard.press("Escape");
  await sleep(600);
  await cap();
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

  await page.goto(`${API_URL}/api/auth/session`, { waitUntil: "networkidle0" });
  await page.evaluateOnNewDocument(wp => localStorage.setItem("agentdesk_wallpaper", wp), LIGHT_WP);

  console.log("▸ Loading app...");
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(3000);

  console.log("▸ Recording\n");

  // ══════════════════════════════════════════════════════════════
  // SCENE 1 — 바탕화면 (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[1/9] Desktop          ");
  await moveTo(120, 160, 15); await record(400);
  await moveTo(240, 160, 10); await record(350);
  await moveTo(360, 160, 10); await record(350);
  await moveTo(480, 160, 10); await record(350);
  await moveTo(600, 160, 10); await record(350);
  await moveTo(720, 500, 20); await record(800);
  await moveTo(400, 350, 18); await record(600);
  await moveTo(720, 500, 18); await record(600);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 2 — Command Palette (7s)
  //   Ctrl+K → input 자동포커스 → keyboard.type 직접 입력
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[2/9] Command Palette  ");
  await focusDesktop();
  await page.keyboard.down("Control"); await page.keyboard.press("k"); await page.keyboard.up("Control");
  await record(900); // 팔레트 열림 대기

  // input이 자동 포커스됨 → 바로 타이핑
  await page.keyboard.type("agent", { delay: 80 });
  await record(1200);

  // 결과 hover (마우스)
  await moveTo(720, 420, 8); await record(400);
  await moveTo(720, 470, 6); await record(400);
  await moveTo(720, 520, 6); await record(400);

  // 검색어 교체
  await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
  await sleep(100);
  await page.keyboard.type("workflow", { delay: 80 });
  await record(900);

  await page.keyboard.press("Escape");
  await record(700);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 3 — Agent Manager (8s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[3/9] Agent Manager    ");
  await openWindow("a", "에이전트");
  await record(500);

  // 화면 상단 카드 영역 hover
  for (const [x, y] of [[200,320],[420,320],[640,320],[860,320],[1080,320],[200,480],[420,480]]) {
    await moveTo(x, y, 12); await record(400);
  }
  await record(400);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 4 — Workflow Builder (8s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[4/9] Workflow Builder ");
  await openWindow("w", "워크플로");
  await record(600);

  // 캔버스 패닝
  await moveTo(600, 450, 10);
  await page.mouse.down();
  for (const [x,y] of [[560,430],[520,410],[490,400],[520,420],[580,450]]) {
    await moveTo(x, y, 8); await record(120);
  }
  await page.mouse.up();
  await record(400);

  // 노드 hover (추정 위치)
  for (const [x,y] of [[400,320],[580,280],[760,340],[650,480],[450,480]]) {
    await moveTo(x, y, 12); await record(450);
  }
  await record(400);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 5 — Library (7s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[5/9] Library          ");
  await openWindow("l", "Skills");
  await record(500);

  // 탭 클릭: 탭은 보통 상단에 가로로 나열
  // evaluate로 [role=tab] 찾아서 클릭
  const tabCount = await page.evaluate(() => document.querySelectorAll("[role=tab]").length);
  console.log(`(${tabCount} tabs) `);
  for (let i = 0; i < Math.min(tabCount, 5); i++) {
    await page.evaluate(idx => {
      const tabs = document.querySelectorAll("[role=tab]");
      if (tabs[idx]) (tabs[idx] as HTMLElement).click();
    }, i);
    await record(700);
    // 탭 위치로 마우스 이동
    const tabBox = await page.evaluate(idx => {
      const tabs = document.querySelectorAll("[role=tab]");
      const el = tabs[idx] as HTMLElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }, i);
    if (tabBox) await moveTo(tabBox.x, tabBox.y, 8);
    await record(300);
  }
  await record(300);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 6 — Chat (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[6/9] Chat             ");
  await openWindow("c", "채팅");
  await record(400);

  // 채팅 아이템 hover
  for (const [x,y] of [[200,300],[200,370],[200,440],[200,510]]) {
    await moveTo(x, y, 10); await record(350);
  }
  // 채팅 입력창으로 이동
  await moveTo(700, 820, 20); await record(500);
  await record(400);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 7 — Settings (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[7/9] Settings         ");
  await openWindow("s", "설정");
  await record(400);

  // 사이드바 항목 evaluate로 클릭
  const navCount = await page.evaluate(() => {
    const items = document.querySelectorAll("nav li, aside li, [class*='nav'] li");
    return items.length;
  });
  for (let i = 0; i < Math.min(navCount, 5); i++) {
    const box = await page.evaluate(idx => {
      const items = document.querySelectorAll("nav li, aside li, [class*='nav'] li");
      const el = items[idx] as HTMLElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }, i);
    if (box && box.y > 50 && box.y < H - 50) {
      await moveTo(box.x, box.y, 8);
      await page.evaluate(idx => {
        const items = document.querySelectorAll("nav li, aside li, [class*='nav'] li");
        if (items[idx]) (items[idx] as HTMLElement).click();
      }, i);
      await record(550);
    }
  }
  await record(300);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 8 — Mission Control (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[8/9] Mission Control  ");
  await focusDesktop();
  await page.keyboard.down("Control"); await page.keyboard.press("ArrowUp"); await page.keyboard.up("Control");
  await record(1000);

  for (const [x,y] of [[250,350],[600,320],[1000,360],[400,580],[850,540]]) {
    await moveTo(x, y, 12); await record(320);
  }
  await record(300);
  await page.keyboard.press("Escape");
  await record(600);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 9 — 아웃트로: 바탕화면 + 위젯 (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[9/9] Outro            ");
  // 위젯이 있다면 hover
  const widgetBoxes = await page.evaluate(() => {
    const widgets = document.querySelectorAll("[class*='widget'], [class*='Widget']");
    return Array.from(widgets).slice(0, 4).map(el => {
      const r = el.getBoundingClientRect();
      return r.width > 100 ? { x: r.left + r.width/2, y: r.top + r.height/2 } : null;
    }).filter(Boolean);
  });
  for (const b of widgetBoxes) {
    await moveTo(b.x, b.y, 12); await record(400);
  }
  await moveTo(720, 450, 20); await record(1000);
  console.log("✓");

  await browser.close();

  const totalSec = (frameIdx / 10).toFixed(1);
  console.log(`\n▸ ${frameIdx} frames (${totalSec}s @ 10fps)\n`);

  // ── ENCODE ──────────────────────────────────────────────────────────────────
  console.log("▸ Encoding MP4...");
  const r = spawnSync(`"${FFMPEG}" -y -framerate 10 -i "${FRAMES}/f%05d.png" -vf "scale=${W}:${H},format=yuv420p" -c:v libx264 -preset fast -crf 20 -r 30 -movflags +faststart "${OUT_FILE}"`,
    { shell: true, stdio: "inherit", cwd: "C:/project/AgentDesk" });

  if (r.status === 0) {
    const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅  AgentDesk-Demo.mp4  (${mb} MB · ${totalSec}s · ${W}×${H} · 30fps)`);
  } else {
    console.error("❌ Encoding failed"); process.exit(1);
  }
  fs.rmSync(FRAMES, { recursive: true });
}

main().catch(e => { console.error("❌", e.message, e.stack); process.exit(1); });
