/**
 * AgentDesk — Screenshot capture script
 * Usage: node scripts/take-screenshots.mjs
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../docs/screen");
const BASE = "http://127.0.0.1:8800";
const VIEWPORT = { width: 1440, height: 900 };

fs.mkdirSync(OUT_DIR, { recursive: true });

let page;

async function shot(filename, label) {
  const dest = path.join(OUT_DIR, filename);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`  ✓ ${label} → ${filename}`);
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function closeOverlays() {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Escape");
    await wait(200);
  }
}

async function tryClick(selector, opts = {}) {
  try {
    const el = page.locator(selector).first();
    await el.click({ force: true, timeout: 3000, ...opts });
    return true;
  } catch {
    return false;
  }
}

async function openWindow(key) {
  await closeOverlays();
  await page.keyboard.press("g");
  await wait(150);
  await page.keyboard.press(key);
  await wait(1200);
}

async function clickTab(text) {
  try {
    await page.locator(`button:has-text("${text}"), [role="tab"]:has-text("${text}")`).first()
      .click({ force: true, timeout: 4000 });
    await wait(600);
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  page = await ctx.newPage();

  console.log("🚀 Opening AgentDesk…");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await wait(2500);

  // ── 01: Desktop ────────────────────────────────────────────────────────
  console.log("\n📸 Desktop & Navigation");
  await shot("01-desktop.png", "Desktop");

  // ── 02: App Menu ────────────────────────────────────────────────────────
  await tryClick("text=AgentDesk");
  await wait(400);
  await shot("02-app-menu.png", "App Menu");
  await page.keyboard.press("Escape");
  await wait(200);

  // ── 03: Context menu ────────────────────────────────────────────────────
  await page.mouse.click(720, 480, { button: "right" });
  await wait(400);
  await shot("03-context-menu.png", "Context Menu");
  await page.keyboard.press("Escape");
  await wait(200);

  // ── 04: Wallpaper Picker ────────────────────────────────────────────────
  await tryClick("text=AgentDesk");
  await wait(300);
  const wallpaperOpened = await tryClick("text=Wallpaper");
  if (!wallpaperOpened) await page.keyboard.press("Escape");
  await wait(500);
  await shot("04-wallpaper-picker.png", "Wallpaper Picker");
  await page.keyboard.press("Escape");
  await wait(300);

  // ── 05: Widget Picker ───────────────────────────────────────────────────
  await tryClick("text=AgentDesk");
  await wait(300);
  const wpOpened = await tryClick("text=Widgets");
  if (!wpOpened) await page.keyboard.press("Escape");
  await wait(500);
  await shot("05-widget-picker.png", "Widget Picker");
  await page.keyboard.press("Escape");
  await wait(300);

  // ── 11: Command Palette ─────────────────────────────────────────────────
  console.log("\n📸 Overlays");
  await closeOverlays();
  await page.keyboard.press("Control+k");
  await wait(600);
  await shot("11-command-palette.png", "Command Palette");
  await page.keyboard.press("Escape");
  await wait(300);

  // ── 30: Mission Control ─────────────────────────────────────────────────
  await closeOverlays();
  await page.keyboard.press("Control+ArrowUp");
  await wait(900);
  await shot("30-mission-control.png", "Mission Control");
  await page.keyboard.press("Escape");
  await wait(500);

  // ── Workflow (g w) ──────────────────────────────────────────────────────
  console.log("\n📸 Dock Windows");
  await openWindow("w");
  await shot("23-workflow-builder.png", "Workflow Builder");

  await clickTab("Scheduled");
  await shot("24-workflow-scheduled.png", "Workflow Scheduled");

  await clickTab("Composition");
  await shot("25-workflow-composition.png", "Workflow Composition");

  // ── Library (g l) ───────────────────────────────────────────────────────
  await openWindow("l");

  for (const [text, file, label] of [
    ["Skills",       "18-library-skills.png",      "Library Skills"],
    ["Rules",        "19-library-rules.png",        "Library Rules"],
    ["Memory",       "20-library-memory.png",       "Library Memory"],
    ["Hooks",        "21-library-hooks.png",        "Library Hooks"],
    ["Deliverables", "22-library-deliverables.png", "Library Deliverables"],
  ]) {
    await clickTab(text);
    await shot(file, label);
  }

  // ── Settings (g s) ──────────────────────────────────────────────────────
  await openWindow("s");

  for (const [text, file, label] of [
    ["General", "12-settings-general.png", "Settings General"],
    ["CLI",     "13-settings-cli.png",     "Settings CLI"],
    ["OAuth",   "14-settings-oauth.png",   "Settings OAuth"],
    ["API",     "15-settings-api.png",     "Settings API"],
    ["Channel", "16-settings-channel.png", "Settings Channel"],
    ["Data",    "17-settings-data.png",    "Settings Data"],
  ]) {
    await clickTab(text);
    await shot(file, label);
  }

  // ── Chat (g c) ──────────────────────────────────────────────────────────
  await openWindow("c");
  await shot("26-chat-direct.png", "Chat Direct");

  await clickTab("Group");
  await shot("27-chat-group.png", "Chat Group");

  // ── Agent Manager (g a) ─────────────────────────────────────────────────
  await openWindow("a");
  await shot("28-agent-manager.png", "Agent Manager");

  // Agent create
  const createClicked = await tryClick("button:has-text('Create Agent'), button:has-text('+ New'), button:has-text('추가'), button:has-text('에이전트 추가')");
  if (createClicked) {
    await wait(700);
    await shot("37-agent-create.png", "Agent Create");
    await page.keyboard.press("Escape");
    await wait(300);
  }

  // ── REPL (g e) ──────────────────────────────────────────────────────────
  await openWindow("e");
  await shot("29-repl.png", "REPL");

  // ── Widgets on desktop ──────────────────────────────────────────────────
  console.log("\n📸 Desktop with Widgets");
  await closeOverlays();
  await wait(500);
  await shot("31-widget-dashboard.png", "Desktop Widgets");

  // ── Final desktop ───────────────────────────────────────────────────────
  await closeOverlays();
  await wait(600);
  await shot("01-desktop.png", "Desktop (final)");

  await browser.close();

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".png")).sort();
  console.log(`\n✅ Done — ${files.length} screenshots saved to docs/screen/`);
  files.forEach((f) => console.log(`   ${f}`));
})().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
