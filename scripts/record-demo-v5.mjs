/**
 * AgentDesk Demo Recording v5
 *
 * 시나리오 (55초):
 *  1. 바탕화면 (5s)   — 아이콘 hover
 *  2. Command Palette (7s) — Ctrl+Shift+K → 검색
 *  3. Agent Manager (8s)  — Dock 클릭 → 카드 hover
 *  4. Workflow Builder (8s) — Dock 클릭 → 노드 hover
 *  5. Library (7s)    — Dock 클릭 → 탭 전환
 *  6. Chat (5s)       — Dock 클릭 → UI 탐색
 *  7. Settings (5s)   — Dock 클릭 → 탭 전환
 *  8. Mission Control (4s) — Ctrl+↑ → hover
 *  9. 아웃트로 (4s)   — 바탕화면 + 위젯
 *
 * 핵심 수정:
 *  - page.evaluate()로 KeyboardEvent 직접 dispatch → React handler 도달
 *  - Dock 버튼을 직접 DOM 클릭
 *  - 창 열림 확인 후 다음 씬 진행
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("C:/project/AgentDesk/node_modules/puppeteer");

const BASE     = "http://localhost:8800";
const API_URL  = "http://localhost:8790";
const FRAMES   = "C:/project/AgentDesk/docs/reports/frames_v5";
const OUT_FILE = "C:/project/AgentDesk/docs/reports/AgentDesk-Demo.mp4";
const FFMPEG   = "C:/project/AgentDesk/node_modules/.pnpm/@remotion+compositor-win32-x64-msvc@4.0.429/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const LIGHT_WP = "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)";

const W = 1440, H = 900;
let frameIdx = 0;
let page = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 캡처 ──────────────────────────────────────────────────────────────────────
async function cap() {
  try {
    await page.screenshot({ path: path.join(FRAMES, `f${String(frameIdx++).padStart(5,"0")}.png`), fullPage: false });
  } catch {}
}
async function record(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const t = Date.now();
    await cap();
    await sleep(Math.max(0, 100 - (Date.now() - t)));
  }
}

// ── 마우스 ────────────────────────────────────────────────────────────────────
let cx = 720, cy = 450;
async function moveTo(x, y, steps = 12) {
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx + (x-cx)*i/steps, cy + (y-cy)*i/steps);
    await sleep(14);
  }
  cx = x; cy = y;
}
async function click(x, y) { await moveTo(x, y, 10); await page.mouse.click(x, y); }

// ── 키보드 이벤트 — React window 핸들러에 직접 dispatch ─────────────────────
async function dispatchKey(opts) {
  // opts: { key, ctrlKey, shiftKey, metaKey, altKey }
  await page.evaluate((o) => {
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: o.key, code: o.code || o.key,
      ctrlKey: !!o.ctrlKey, shiftKey: !!o.shiftKey,
      metaKey: !!o.metaKey, altKey: !!o.altKey,
      bubbles: true, cancelable: true,
    }));
  }, opts);
  await sleep(80);
}

// ── Dock 버튼 클릭 — 텍스트 또는 aria-label로 찾기 ─────────────────────────
async function clickDock(label) {
  const found = await page.evaluate((lbl) => {
    // Dock 내 button 또는 클릭 가능한 요소 찾기
    const all = document.querySelectorAll("button, [role=button], [tabindex]");
    for (const el of all) {
      const txt = el.textContent?.trim() || "";
      const aria = el.getAttribute("aria-label") || "";
      const title = el.getAttribute("title") || "";
      if (txt.includes(lbl) || aria.includes(lbl) || title.includes(lbl)) {
        const r = el.getBoundingClientRect();
        if (r.bottom > window.innerHeight - 100) { // Dock 영역 (하단 100px)
          (el as HTMLElement).click();
          return true;
        }
      }
    }
    return false;
  }, label);
  return found;
}

// ── 창 열림 확인 ──────────────────────────────────────────────────────────────
async function waitWindowOpen(keyword, maxMs = 3000) {
  const end = Date.now() + maxMs;
  while (Date.now() < end) {
    const visible = await page.evaluate(kw => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent?.includes(kw)) {
          const el = node.parentElement;
          if (el && el.offsetWidth > 0 && el.offsetHeight > 0) return true;
        }
      }
      return false;
    }, keyword);
    if (visible) return true;
    await cap(); await sleep(100);
  }
  return false;
}

// ── Escape (창 닫기) ─────────────────────────────────────────────────────────
async function closeWindow() {
  await dispatchKey({ key: "Escape" });
  await record(700);
}

// ── 탭 클릭 유틸 ─────────────────────────────────────────────────────────────
async function clickTabs(maxTabs = 5) {
  const count = await page.evaluate(() => document.querySelectorAll("[role=tab]").length);
  const n = Math.min(count, maxTabs);
  for (let i = 0; i < n; i++) {
    const box = await page.evaluate(idx => {
      const tab = document.querySelectorAll("[role=tab]")[idx] as HTMLElement;
      if (!tab) return null;
      tab.click();
      const r = tab.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }, i);
    if (box) await moveTo(box.x, box.y, 8);
    await record(600);
  }
}

// ── 데스크탑 아이콘 위치 가져오기 ────────────────────────────────────────────
async function getIconPositions() {
  return page.evaluate(() => {
    const icons = document.querySelectorAll("[class*='desktop-icon'], [class*='DesktopIcon'], [class*='icon-item']");
    return Array.from(icons).slice(0, 6).map(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 ? { x: r.left + r.width/2, y: r.top + r.height/2 } : null;
    }).filter(Boolean);
  });
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

  // ── 첫 프레임 확인: DOM에서 Dock 찾기 ───────────────────────────────────────
  const dockInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button, [role=button]"))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.bottom > window.innerHeight - 100 && r.width > 0;
      })
      .map(el => ({ text: el.textContent?.trim().slice(0,20), title: el.getAttribute("title"), aria: el.getAttribute("aria-label") }));
    return btns.slice(0, 10);
  });
  console.log("▸ Dock buttons found:", JSON.stringify(dockInfo));

  const iconPos = await getIconPositions();
  console.log(`▸ Desktop icons: ${iconPos.length}`);

  console.log("\n▸ Recording start\n");

  // ══════════════════════════════════════════════════════════════
  // SCENE 1 — 바탕화면 (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[1/9] Desktop          ");
  if (iconPos.length > 0) {
    for (const pos of iconPos) {
      await moveTo(pos.x, pos.y, 14); await record(500);
    }
  } else {
    for (const [x,y] of [[120,160],[240,160],[360,160],[480,160],[600,160]]) {
      await moveTo(x, y, 12); await record(450);
    }
  }
  await moveTo(720, 500, 20); await record(700);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 2 — Command Palette (7s)  Ctrl+Shift+K
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[2/9] Command Palette  ");
  await dispatchKey({ key: "K", ctrlKey: true, shiftKey: true });
  const cpOpen = await waitWindowOpen("AgentDesk 검색", 2000);
  console.log(cpOpen ? "(opened) " : "(not detected) ");
  await record(600);

  // Command Palette input이 자동 포커스됨
  await page.keyboard.type("agent", { delay: 85 });
  await record(1200);
  await moveTo(720, 430, 8); await record(400);
  await moveTo(720, 480, 6); await record(400);

  await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
  await sleep(100);
  await page.keyboard.type("workflow", { delay: 85 });
  await record(1000);

  await page.keyboard.press("Escape");
  await record(700);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 3 — Agent Manager (8s)
  //   바탕화면 아이콘 더블클릭 또는 Dock 버튼
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[3/9] Agent Manager    ");
  // 아이콘 직접 더블클릭 시도
  if (iconPos.length > 0) {
    await moveTo(iconPos[0].x, iconPos[0].y, 12);
    await page.mouse.dblclick(iconPos[0].x, iconPos[0].y);
    await record(400);
  }
  // g+a dispatch
  await dispatchKey({ key: "g" }); await sleep(120);
  await dispatchKey({ key: "a" });
  const amOpen = await waitWindowOpen("에이전트", 3000);
  console.log(amOpen ? "(opened) " : "(fallback) ");
  await record(400);

  // 카드 hover
  const cardBoxes = await page.evaluate(() => {
    const cards = document.querySelectorAll("[class*='agent'], [class*='Agent']");
    return Array.from(cards).slice(0, 6).map(el => {
      const r = el.getBoundingClientRect();
      return (r.width > 80 && r.height > 60) ? { x: r.left + r.width/2, y: r.top + r.height/2 } : null;
    }).filter(Boolean);
  });
  const positions = cardBoxes.length > 0 ? cardBoxes :
    [[200,340],[420,340],[640,340],[860,340],[200,500],[420,500]].map(([x,y]) => ({x,y}));
  for (const p of positions.slice(0, 5)) {
    await moveTo(p.x, p.y, 12); await record(480);
  }
  await record(400);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 4 — Workflow Builder (8s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[4/9] Workflow Builder ");
  await dispatchKey({ key: "g" }); await sleep(120);
  await dispatchKey({ key: "w" });
  const wfOpen = await waitWindowOpen("워크플로", 3000);
  console.log(wfOpen ? "(opened) " : "(fallback) ");
  await record(600);

  // 캔버스 패닝
  await moveTo(600, 430, 10);
  await page.mouse.down();
  for (const [x,y] of [[570,415],[540,400],[510,390],[550,420],[600,440]]) {
    await moveTo(x, y, 8); await record(100);
  }
  await page.mouse.up(); await record(400);

  // 노드 hover (추정 위치)
  for (const [x,y] of [[380,310],[580,270],[760,330],[640,470],[430,460]]) {
    await moveTo(x, y, 12); await record(480);
  }
  await record(400);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 5 — Library (7s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[5/9] Library          ");
  await dispatchKey({ key: "g" }); await sleep(120);
  await dispatchKey({ key: "l" });
  const libOpen = await waitWindowOpen("Skill", 3000);
  console.log(libOpen ? "(opened) " : "(fallback) ");
  await record(500);
  await clickTabs(5);
  await record(300);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 6 — Chat (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[6/9] Chat             ");
  await dispatchKey({ key: "g" }); await sleep(120);
  await dispatchKey({ key: "c" });
  const chatOpen = await waitWindowOpen("채팅", 3000);
  console.log(chatOpen ? "(opened) " : "(fallback) ");
  await record(400);
  for (const [x,y] of [[180,300],[180,380],[180,460],[700,800]]) {
    await moveTo(x, y, 12); await record(400);
  }
  await record(400);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 7 — Settings (5s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[7/9] Settings         ");
  await dispatchKey({ key: "g" }); await sleep(120);
  await dispatchKey({ key: "s" });
  const setOpen = await waitWindowOpen("설정", 3000);
  console.log(setOpen ? "(opened) " : "(fallback) ");
  await record(400);
  await clickTabs(5);
  await record(300);
  await closeWindow();
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 8 — Mission Control (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[8/9] Mission Control  ");
  await dispatchKey({ key: "ArrowUp", ctrlKey: true });
  await record(1000);
  for (const [x,y] of [[240,340],[600,310],[980,350],[400,570],[840,540]]) {
    await moveTo(x, y, 12); await record(320);
  }
  await record(300);
  await dispatchKey({ key: "Escape" });
  await record(700);
  console.log("✓");

  // ══════════════════════════════════════════════════════════════
  // SCENE 9 — 아웃트로 (4s)
  // ══════════════════════════════════════════════════════════════
  process.stdout.write("[9/9] Outro            ");
  const widgetBoxes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[class*='widget'], [class*='Widget']"))
      .slice(0, 4).map(el => {
        const r = el.getBoundingClientRect();
        return (r.width > 100 && r.height > 60) ? { x: r.left + r.width/2, y: r.top + r.height/2 } : null;
      }).filter(Boolean);
  });
  for (const b of widgetBoxes) { await moveTo(b.x, b.y, 12); await record(450); }
  await moveTo(720, 450, 20); await record(1200);
  console.log("✓");

  await browser.close();
  const totalSec = (frameIdx / 10).toFixed(1);
  console.log(`\n▸ ${frameIdx} frames (${totalSec}s)\n`);

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
main().catch(e => { console.error("❌", e.message); process.exit(1); });
