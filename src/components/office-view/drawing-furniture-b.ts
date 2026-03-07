import { type Container, Graphics } from "pixi.js";
import { blendColor } from "./drawing-core";
import { LOCALE_TEXT, OFFICE_PASTEL, pickLocale, type SupportedLocale } from "./themes-locale";

function drawBookshelf(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Shadow
  g.rect(x + 2, y + 2, 28, 18).fill({ color: 0x000000, alpha: 0.15 });
  // Frame — dark metal server rack
  g.rect(x, y, 28, 18).fill(0x141820);
  g.rect(x, y, 28, 18).stroke({ width: 0.5, color: 0x2a3048 });
  // Amber left accent bar
  g.rect(x, y, 2, 18).fill({ color: 0xf59e0b, alpha: 0.6 });
  // Middle shelf divider
  g.rect(x + 2, y + 8.5, 26, 1).fill({ color: 0x2a3048, alpha: 0.9 });
  // Top shelf — data cartridges
  const ledColors = [0x22cc88, 0xf59e0b, 0x4488cc, 0x22cc88, 0xf59e0b];
  const cartW = [4, 3.5, 4, 3.5, 4];
  let bx = x + 3;
  for (let i = 0; i < 5 && bx < x + 27; i++) {
    const w = cartW[i];
    g.rect(bx, y + 1, w, 6.5).fill(0x1a2030);
    g.rect(bx, y + 1, w, 6.5).stroke({ width: 0.3, color: 0x2a3048 });
    g.circle(bx + w / 2, y + 2.5, 0.7).fill({ color: ledColors[i], alpha: 0.9 });
    g.rect(bx + 0.5, y + 4, w - 1, 0.8).fill({ color: ledColors[i], alpha: 0.3 });
    bx += w + 0.8;
  }
  // Bottom shelf — data drives
  bx = x + 3;
  for (let i = 0; i < 4 && bx < x + 27; i++) {
    const w = 5;
    g.rect(bx, y + 10, w, 7).fill(0x1a2030);
    g.rect(bx, y + 10, w, 7).stroke({ width: 0.3, color: 0x2a3048 });
    g.rect(bx + 0.5, y + 11, w - 1, 1).fill({ color: ledColors[(i + 2) % ledColors.length], alpha: 0.25 });
    g.circle(bx + w / 2, y + 15, 0.7).fill({ color: ledColors[(i + 1) % ledColors.length], alpha: 0.8 });
    bx += w + 1;
  }
  // Power LED top-right
  g.circle(x + 25, y + 2, 1).fill({ color: 0x22cc44, alpha: 0.95 });
  parent.addChild(g);
}

function drawCoffeeMachine(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Shadow
  g.ellipse(x + 10, y + 30, 13, 3.5).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.1 });
  // Body — dark metal terminal coffee unit
  g.rect(x, y, 20, 28).fill(0x141820);
  g.rect(x, y, 20, 28).stroke({ width: 0.5, color: 0x2a3048 });
  g.rect(x, y, 2, 28).fill({ color: 0xf59e0b, alpha: 0.5 });
  // Top panel
  g.rect(x + 2, y + 2, 16, 5).fill(0x1a2030);
  g.rect(x + 2, y + 2, 16, 1).fill({ color: 0xf59e0b, alpha: 0.15 });
  // Brand indicator (amber dot)
  g.circle(x + 10, y + 4.5, 1.5).fill(0x0a0e16);
  g.circle(x + 10, y + 4.5, 0.8).fill({ color: 0xf59e0b, alpha: 0.9 });
  // Buttons — terminal style with LED rings
  g.circle(x + 6, y + 9, 2.5).fill(0x0a0e16);
  g.circle(x + 6, y + 9, 1.8).fill(0x1a2030);
  g.circle(x + 6, y + 9, 0.8).fill({ color: 0xf59e0b, alpha: 0.9 });
  g.circle(x + 14, y + 9, 2.5).fill(0x0a0e16);
  g.circle(x + 14, y + 9, 1.8).fill(0x1a2030);
  g.circle(x + 14, y + 9, 0.8).fill({ color: 0x22cc88, alpha: 0.9 });
  // Display (LED screen with text)
  g.roundRect(x + 3, y + 12, 14, 4, 0.8).fill(0x1e2e40);
  g.roundRect(x + 3, y + 12, 14, 4, 0.8).stroke({ width: 0.3, color: 0x4a5a6a, alpha: 0.5 });
  g.moveTo(x + 4.5, y + 14)
    .lineTo(x + 12, y + 14)
    .stroke({ width: 0.5, color: 0xb8f0de, alpha: 0.6 });
  g.circle(x + 15, y + 14, 0.5).fill({ color: 0x44dd66, alpha: 0.5 });
  // Nozzle / drip area
  g.rect(x + 6, y + 17, 8, 2).fill(0x4b556a);
  g.roundRect(x + 7.5, y + 19, 5, 4, 0.5).fill(0x3a4558);
  // Drip tray
  g.roundRect(x + 4, y + 23, 12, 1.5, 0.5).fill(0x5a6478);
  // Cup with latte art
  g.roundRect(x + 5.5, y + 21, 9, 7, 2).fill(0xfdf8f4);
  g.roundRect(x + 5.5, y + 21, 9, 7, 2).stroke({ width: 0.4, color: 0xd9cfc6 });
  g.ellipse(x + 10, y + 23, 3.5, 1.5).fill(0x8d654c);
  // Latte art heart
  g.circle(x + 9.3, y + 22.8, 0.8).fill(0xf0e0d0);
  g.circle(x + 10.7, y + 22.8, 0.8).fill(0xf0e0d0);
  g.moveTo(x + 8.5, y + 23)
    .lineTo(x + 10, y + 24.2)
    .lineTo(x + 11.5, y + 23)
    .fill({ color: 0xf0e0d0, alpha: 0.8 });
  // Handle
  g.moveTo(x + 14.5, y + 22)
    .quadraticCurveTo(x + 16.5, y + 24.5, x + 14.5, y + 27)
    .stroke({ width: 1, color: 0xf2e9e2 });
  parent.addChild(g);
}

function drawSofa(parent: Container, x: number, y: number, color: number) {
  const g = new Graphics();
  const seatBase = blendColor(color, OFFICE_PASTEL.creamWhite, 0.18);
  const seatFront = blendColor(seatBase, OFFICE_PASTEL.ink, 0.08);
  const seatBack = blendColor(seatBase, OFFICE_PASTEL.ink, 0.18);
  const seatDark = blendColor(seatBase, OFFICE_PASTEL.ink, 0.28);
  // Floor shadow
  g.ellipse(x + 40, y + 20, 44, 5).fill({ color: 0x000000, alpha: 0.06 });
  // Sofa feet (tiny wooden)
  g.roundRect(x + 2, y + 16, 4, 3, 1).fill(0xb89060);
  g.roundRect(x + 74, y + 16, 4, 3, 1).fill(0xb89060);
  // Seat cushion
  g.roundRect(x, y, 80, 18, 5).fill(seatBase);
  g.roundRect(x + 2, y + 2, 76, 14, 4).fill(seatFront);
  // Seat highlight (top edge)
  g.moveTo(x + 6, y + 1.5)
    .lineTo(x + 74, y + 1.5)
    .stroke({ width: 0.6, color: 0xffffff, alpha: 0.14 });
  // Backrest (taller, with detail)
  g.roundRect(x + 3, y - 10, 74, 12, 4).fill(seatBack);
  g.roundRect(x + 3, y - 10, 74, 12, 4).stroke({ width: 0.5, color: seatDark, alpha: 0.15 });
  // Backrest highlight
  g.roundRect(x + 6, y - 9, 68, 3, 2).fill({ color: 0xffffff, alpha: 0.08 });
  // Armrests (rounder, softer)
  g.roundRect(x - 5, y - 8, 9, 24, 4).fill(seatBack);
  g.roundRect(x - 5, y - 8, 9, 24, 4).stroke({ width: 0.5, color: seatDark, alpha: 0.12 });
  g.roundRect(x + 76, y - 8, 9, 24, 4).fill(seatBack);
  g.roundRect(x + 76, y - 8, 9, 24, 4).stroke({ width: 0.5, color: seatDark, alpha: 0.12 });
  // Armrest top highlights
  g.roundRect(x - 3, y - 7, 5, 2, 1).fill({ color: 0xffffff, alpha: 0.1 });
  g.roundRect(x + 78, y - 7, 5, 2, 1).fill({ color: 0xffffff, alpha: 0.1 });
  // Cushion divider lines (softer)
  g.moveTo(x + 27, y + 3)
    .lineTo(x + 27, y + 14)
    .stroke({ width: 0.6, color: 0x000000, alpha: 0.1 });
  g.moveTo(x + 53, y + 3)
    .lineTo(x + 53, y + 14)
    .stroke({ width: 0.6, color: 0x000000, alpha: 0.1 });
  // Cushion puff highlights
  g.ellipse(x + 14, y + 7, 8, 4).fill({ color: 0xffffff, alpha: 0.06 });
  g.ellipse(x + 40, y + 7, 8, 4).fill({ color: 0xffffff, alpha: 0.06 });
  g.ellipse(x + 66, y + 7, 8, 4).fill({ color: 0xffffff, alpha: 0.06 });
  // Decorative throw pillow (cute accent)
  g.roundRect(x + 6, y - 3, 10, 8, 3).fill(blendColor(color, 0xffffff, 0.3));
  g.roundRect(x + 6, y - 3, 10, 8, 3).stroke({ width: 0.4, color: seatDark, alpha: 0.15 });
  // Pillow pattern (tiny star)
  g.star(x + 11, y + 1, 5, 1.5, 0.8, 0).fill({ color: 0xffffff, alpha: 0.15 });
  parent.addChild(g);
}

function drawCoffeeTable(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // table top — dark metal panel
  g.rect(x + 2, y, 32, 12).fill(0x141820);
  g.rect(x + 2, y, 32, 12).stroke({ width: 0.6, color: 0x2a3048, alpha: 0.8 });
  // Amber top accent line
  g.rect(x + 4, y + 1, 28, 1).fill({ color: 0xf59e0b, alpha: 0.4 });
  // Legs
  g.rect(x + 5, y + 12, 2, 7).fill(0x1a2030);
  g.rect(x + 29, y + 12, 2, 7).fill(0x1a2030);
  // Terminal readout on surface
  g.rect(x + 6, y + 3, 10, 6).fill(0x050810);
  g.rect(x + 7, y + 4, 6, 1).fill({ color: 0x22cc88, alpha: 0.7 });
  g.rect(x + 7, y + 6, 4, 1).fill({ color: 0xf59e0b, alpha: 0.6 });
  // Status dots
  g.circle(x + 28, y + 4, 1).fill({ color: 0x22cc44, alpha: 0.9 });
  g.circle(x + 28, y + 8, 1).fill({ color: 0xf59e0b, alpha: 0.7 });
  parent.addChild(g);
}

function drawHighTable(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // table top — dark metal panel
  g.rect(x, y, 36, 14).fill(0x141820);
  g.rect(x, y, 36, 14).stroke({ width: 0.5, color: 0x2a3048 });
  // amber top accent line
  g.rect(x + 2, y + 1, 32, 1).fill({ color: 0xf59e0b, alpha: 0.4 });
  // terminal surface data lines
  g.rect(x + 4, y + 4, 10, 1).fill({ color: 0x22cc88, alpha: 0.5 });
  g.rect(x + 4, y + 7, 7, 1).fill({ color: 0xf59e0b, alpha: 0.4 });
  // status LED
  g.circle(x + 32, y + 4, 1).fill({ color: 0x22cc44, alpha: 0.9 });
  // legs — dark metal
  g.rect(x + 4, y + 14, 2, 16).fill(0x1a2030);
  g.rect(x + 30, y + 14, 2, 16).fill(0x1a2030);
  // crossbar
  g.rect(x + 5, y + 24, 26, 1.5).fill(0x1a2030);
  parent.addChild(g);
}

function drawVendingMachine(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Body — dark metal terminal dispenser
  g.rect(x, y, 22, 30).fill(0x141820);
  g.rect(x, y, 22, 30).stroke({ width: 0.5, color: 0x2a3048 });
  // Amber left accent bar
  g.rect(x, y, 2, 30).fill({ color: 0xf59e0b, alpha: 0.5 });
  // Item grid — dark slots with LED indicators
  const ledColors = [0xf59e0b, 0x22cc88, 0x4488cc, 0xf59e0b, 0x22cc88, 0xcc4466];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      g.rect(x + 3 + c * 5.5, y + 3 + r * 7, 4, 5).fill(0x0a0e16);
      g.rect(x + 3 + c * 5.5, y + 3 + r * 7, 4, 5).stroke({ width: 0.3, color: 0x2a3048 });
      g.circle(x + 5 + c * 5.5, y + 5.5 + r * 7, 1).fill({ color: ledColors[(r * 3 + c) % ledColors.length], alpha: 0.8 });
    }
  }
  // Dispense slot
  g.rect(x + 3, y + 24, 16, 4).fill(0x0a0e16);
  g.rect(x + 3, y + 24, 16, 4).stroke({ width: 0.3, color: 0x2a3048 });
  // Power LED top-right
  g.circle(x + 19, y + 2, 1).fill({ color: 0x22cc44, alpha: 0.9 });
  parent.addChild(g);
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function formatReset(iso: string, locale: SupportedLocale): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return pickLocale(locale, LOCALE_TEXT.soon);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) {
    if (locale === "ko") return `${h}시간 ${m}분`;
    if (locale === "ja") return `${h}時間 ${m}分`;
    if (locale === "zh") return `${h}小时 ${m}分`;
    return `${h}h ${m}m`;
  }
  if (locale === "ko") return `${m}분`;
  if (locale === "ja") return `${m}分`;
  if (locale === "zh") return `${m}分`;
  return `${m}m`;
}

function formatPeopleCount(count: number, locale: SupportedLocale): string {
  if (locale === "ko") return `${count}명`;
  if (locale === "ja") return `${count}人`;
  if (locale === "zh") return `${count}人`;
  return `${count}`;
}

function formatTaskCount(count: number, locale: SupportedLocale): string {
  if (locale === "ko") return `${count}건`;
  if (locale === "ja") return `${count}件`;
  if (locale === "zh") return `${count}项`;
  return `${count}`;
}

export {
  drawBookshelf,
  drawCoffeeMachine,
  drawSofa,
  drawCoffeeTable,
  drawHighTable,
  drawVendingMachine,
  formatReset,
  formatPeopleCount,
  formatTaskCount,
};
