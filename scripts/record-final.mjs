/**
 * AgentDesk Demo Recording — Final v2
 *
 * 변경사항:
 *  - 창 닫기: g+key 토글 대신 X버튼 클릭 (더 안정적)
 *  - 창 열림 확인: DOM 텍스트로 verify
 *  - record() 시간 증가 → 40초 이상 영상
 *
 * 시나리오 (40초):
 *  1. 바탕화면 (4s)
 *  2. Command Palette (8s)
 *  3. Agent Manager (6s)
 *  4. Workflow Builder (6s)
 *  5. Library — 탭 전환 (6s)
 *  6. Chat (5s)
 *  7. Settings (5s)
 *  8. Mission Control (4s)
 *  9. 아웃트로 (3s)
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const BASE     = "http://localhost:8800";
const API_URL  = "http://localhost:8790";
const FRAMES   = "C:/project/AgentDesk/docs/reports/frames_final";
const OUT_FILE = "C:/project/AgentDesk/docs/reports/AgentDesk-Demo.mp4";
const FFMPEG   = "C:/project/AgentDesk/node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.429/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const LIGHT_WP = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";

const W = 1440, H = 900;
let frameIdx = 0, page = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 캡처 (100ms 간격) ────────────────────────────────────────────────────────
async function cap() {
  try { await page.screenshot({ path: path.join(FRAMES, `f${String(frameIdx++).padStart(5,"0")}.png`), fullPage: false }); } catch {}
}
async function record(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const t = Date.now();
    await cap();
    await sleep(Math.max(0, 100 - (Date.now() - t)));
  }
}

// ── 마우스 부드럽게 이동 ──────────────────────────────────────────────────────
let cx = 720, cy = 450;
async function moveTo(x, y, steps = 12) {
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx+(x-cx)*i/steps, cy+(y-cy)*i/steps);
    await sleep(14);
  }
  cx = x; cy = y;
}

// ── React window 핸들러에 KeyboardEvent 직접 dispatch ────────────────────────
async function dk(opts) {
  await page.evaluate(o => window.dispatchEvent(new KeyboardEvent("keydown", {
    key: o.key, ctrlKey: !!o.ctrlKey, shiftKey: !!o.shiftKey,
    metaKey: !!o.metaKey, bubbles: true, cancelable: true,
  })), opts);
  await sleep(80);
}

// ── Command Palette 열기 (real keyboard → input auto-focus) ──────────────────
async function openCP() {
  await clickDesktop();
  await page.keyboard.down("Control");
  await page.keyboard.down("Shift");
  await page.keyboard.press("K");
  await page.keyboard.up("Shift");
  await page.keyboard.up("Control");
  await sleep(700);
  // CP input should auto-focus; if not, click it
  await page.evaluate(() => {
    const inp = document.querySelector("input[placeholder*='검색'], input[placeholder*='Search'], [role='dialog'] input, [class*='palette'] input, [class*='Command'] input");
    if (inp) { inp.focus(); }
  });
  await sleep(200);
}
// ── Command Palette 닫기 ────────────────────────────────────────────────────
async function closeCP() {
  await page.keyboard.press("Escape");
  await sleep(500);
}

// ── document.body 포커스 (클릭 없이 키보드 이벤트 전달 보장) ──────────────────
async function clickDesktop() {
  // body를 명시적으로 포커스 → page.keyboard.press 이벤트가 window까지 버블링됨
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    document.body.focus();
  });
  await sleep(120);
}

// ── 창 열기: native keyboard (검증된 방법) ───────────────────────────────────
async function openWin(key, waitMs = 2500) {
  await clickDesktop();
  await page.keyboard.press("g"); await sleep(120);
  await page.keyboard.press(key);
  await sleep(waitMs);
}

// ── 창 닫기: TrafficLights close 버튼을 element.click()으로 직접 실행 ─────────
// TrafficLights 고유 식별: close 버튼 background = rgb(255, 95, 87) (#ff5f57)
async function closeWinByX() {
  const result = await page.evaluate(() => {
    // TrafficLights 구조: div (flex container) > button×3 (각 12×12)
    // 식별 조건: 첫 번째 버튼의 background가 rgb(255, 95, 87) — TrafficLights 전용 색상
    const containers = Array.from(document.querySelectorAll("div")).filter(div => {
      const children = Array.from(div.children);
      if (children.length !== 3) return false;
      // 모든 자식이 12px 버튼이어야 함
      if (!children.every(c => {
        if (c.tagName !== "BUTTON") return false;
        const r = c.getBoundingClientRect();
        return r.width >= 10 && r.width <= 16 && r.height >= 10 && r.height <= 16
            && r.top > 30 && r.top < 400
            && r.left >= 0 && r.right <= window.innerWidth + 10;
      })) return false;
      // 첫 번째 버튼이 빨간색 (#ff5f57) — TrafficLights close 버튼 고유 색상
      const bg = window.getComputedStyle(children[0]).backgroundColor;
      return bg === "rgb(255, 95, 87)";
    });
    if (containers.length === 0) return { ok: false, n: 0, pos: "none" };
    containers.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const c = containers[0];
    const r = c.getBoundingClientRect();
    const closeBtn = c.children[0];
    closeBtn.click();
    return { ok: true, n: containers.length, pos: `y=${Math.round(r.top)} x=${Math.round(r.left)}` };
  });
  process.stdout.write(`[X:${result.pos} n=${result.n}] `);
  if (result.ok) await sleep(800);
  return result.ok;
}

// ── 창 닫기: X버튼 우선, fallback g+key ──────────────────────────────────────
async function closeWin(key) {
  const closed = await closeWinByX();
  if (!closed) {
    await clickDesktop();
    await page.keyboard.press("g"); await sleep(150);
    await page.keyboard.press(key);
    await sleep(1200);
    process.stdout.write(`(kb) `);
  }
  process.stdout.write(` [close:${key}]`);
}

// ── 탭 클릭 (DOM [role=tab]) ──────────────────────────────────────────────────
async function clickTabs(max = 5) {
  const count = await page.evaluate(() => document.querySelectorAll("[role=tab]").length);
  const limit = Math.min(count, max);
  for (let i = 0; i < limit; i++) {
    const box = await page.evaluate(idx => {
      const tabs = document.querySelectorAll("[role=tab]");
      const tab = tabs[idx];
      if (!tab) return null;
      tab.click();
      const r = tab.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }, i);
    if (box) { await moveTo(box.x, box.y, 8); }
    await record(900);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
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
  await page.evaluateOnNewDocument(wp => {
    localStorage.setItem("agentdesk_wallpaper", wp);
    // 데스크탑 아이콘 레이아웃, 위젯, 창 위치 초기화
    localStorage.removeItem("agentdesk_desktop_icon_layout");
    localStorage.removeItem("agentdesk_widget_layout");
    localStorage.removeItem("agentdesk_widget_icons");
    // 모든 창 위치 상태 초기화 (agentdesk_win_* 키)
    Object.keys(localStorage)
      .filter(k => k.startsWith("agentdesk_win_"))
      .forEach(k => localStorage.removeItem(k));
  }, LIGHT_WP);
  console.log("▸ Loading app...");
  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(3000);

  console.log("▸ Recording\n");

  // ══════════════════════════════════════════════════════════════
  // SCENE 1 — 바탕화면 (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[1/9] 바탕화면         ");
  // 데스크탑 아이콘 hover
  const iconBoxes = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[class*='DesktopIcon'],[class*='desktop-icon']"))
      .slice(0,6).map(el => {
        const r = el.getBoundingClientRect();
        return r.width > 40 ? { x: r.left+r.width/2, y: r.top+r.height/2 } : null;
      }).filter(Boolean)
  );
  if (iconBoxes.length > 0) {
    for (const b of iconBoxes.slice(0, 5)) { await moveTo(b.x, b.y, 14); await record(600); }
  } else {
    for (const [x,y] of [[100,140],[220,140],[340,140],[460,140],[580,140]]) {
      await moveTo(x, y, 14); await record(600);
    }
  }
  await moveTo(720, 500, 20); await record(1200);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 2 — Command Palette (8s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[2/9] Command Palette  ");
  await openCP(); // 열기 (real keyboard → input auto-focused)
  await record(600);
  await page.keyboard.type("agent", { delay: 90 });
  await record(1200);
  await moveTo(720, 420, 8); await record(400);
  await moveTo(720, 480, 6); await record(400);
  // 검색어 교체
  await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
  await sleep(80);
  await page.keyboard.type("workflow", { delay: 90 });
  await record(1000);
  await moveTo(720, 430, 8); await record(400);
  await closeCP(); // 닫기 (Escape)
  await record(600);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 3 — Agent Manager (6s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[3/9] Agent Manager    ");
  await openWin("a", 2500);
  await record(600);
  for (const [x,y] of [[300,340],[500,340],[700,340],[900,340],[300,500],[500,500]]) {
    await moveTo(x, y, 12); await record(500);
  }
  await record(600);
  await closeWin("a");
  await record(500);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 4 — Workflow Builder (6s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[4/9] Workflow Builder ");
  await openWin("w", 2500);
  await record(800);
  // 캔버스 pan
  await moveTo(600, 430, 10);
  await page.mouse.down();
  for (const [x,y] of [[570,415],[540,400],[510,390],[550,415],[600,435]]) {
    await moveTo(x, y, 8); await record(120);
  }
  await page.mouse.up(); await record(500);
  // 노드 hover
  for (const [x,y] of [[380,310],[580,270],[760,330],[640,470],[430,460]]) {
    await moveTo(x, y, 12); await record(500);
  }
  await record(500);
  await closeWin("w");
  await record(500);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 5 — Library (6s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[5/9] Library          ");
  await openWin("l", 2500);
  await record(600);
  await clickTabs(5);
  await record(600);
  await closeWin("l");
  await record(500);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 6 — Chat (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[6/9] Chat             ");
  await openWin("c", 2500);
  await record(600);
  for (const [x,y] of [[200,290],[200,370],[200,450],[200,530]]) {
    await moveTo(x, y, 12); await record(500);
  }
  await moveTo(700, 820, 18); await record(600);
  await record(500);
  await closeWin("c");
  await record(500);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 7 — Settings (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[7/9] Settings         ");
  await openWin("s", 2500);
  await record(600);
  await clickTabs(5);
  await record(600);
  await closeWin("s");
  await record(500);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 8 — Mission Control (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[8/9] Mission Control  ");
  await sleep(300);
  await dk({ key: "ArrowUp", ctrlKey: true });
  await sleep(800);
  await record(1200);
  for (const [x,y] of [[240,340],[600,310],[980,350],[400,570],[840,540]]) {
    await moveTo(x, y, 12); await record(380);
  }
  await record(400);
  await dk({ key: "Escape" });
  await record(800);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 9 — 아웃트로 (3s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[9/9] 아웃트로         ");
  const wBoxes = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[class*='widget'],[class*='Widget']"))
      .slice(0,4).map(el => {
        const r = el.getBoundingClientRect();
        return (r.width > 100 && r.height > 60) ? { x: r.left+r.width/2, y: r.top+r.height/2 } : null;
      }).filter(Boolean)
  );
  for (const b of wBoxes) { await moveTo(b.x, b.y, 12); await record(500); }
  await moveTo(720, 450, 20); await record(1500);
  console.log("✓");

  // ── DONE ────────────────────────────────────────────────────────────────────
  await browser.close();
  const totalSec = (frameIdx / 10).toFixed(1);
  console.log(`\n▸ ${frameIdx} frames (${totalSec}s @ 10fps)\n`);

  // ── ENCODE ──────────────────────────────────────────────────────────────────
  console.log("▸ Encoding...");
  const r = spawnSync(
    `"${FFMPEG}" -y -framerate 10 -i "${FRAMES}/f%05d.png" -vf "scale=${W}:${H},format=yuv420p" -c:v libx264 -preset fast -crf 20 -r 30 -movflags +faststart "${OUT_FILE}"`,
    { shell: true, stdio: "inherit", cwd: "C:/project/AgentDesk" }
  );
  if (r.status === 0) {
    const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅  AgentDesk-Demo.mp4  (${mb} MB · ${totalSec}s · ${W}×${H} · 30fps)`);
  } else { console.error("❌ Encoding failed"); process.exit(1); }
  fs.rmSync(FRAMES, { recursive: true });
}
main().catch(e => { console.error("❌", e.message, e.stack); process.exit(1); });
