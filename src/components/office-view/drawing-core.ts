import { Container, Graphics } from "pixi.js";
import { OFFICE_PASTEL } from "./themes-locale";
import { TILE, type WallClockVisual } from "./model";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function blendColor(from: number, to: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const r = Math.round(fr + (tr - fr) * clamped);
  const g = Math.round(fg + (tg - fg) * clamped);
  const b = Math.round(fb + (tb - fb) * clamped);
  return (r << 16) | (g << 8) | b;
}

function isLightColor(color: number): boolean {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
}

function contrastTextColor(
  bgColor: number,
  darkColor: number = OFFICE_PASTEL.ink,
  lightColor: number = 0xffffff,
): number {
  return isLightColor(bgColor) ? darkColor : lightColor;
}

function drawBandGradient(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  from: number,
  to: number,
  bands: number = 8,
  alpha: number = 1,
): void {
  const safeBands = Math.max(2, bands);
  const bandH = h / safeBands;
  for (let i = 0; i < safeBands; i++) {
    const color = blendColor(from, to, i / (safeBands - 1));
    g.rect(x, y + i * bandH, w, bandH + 0.75).fill({ color, alpha });
  }
}

function drawBunting(
  parent: Container,
  x: number,
  y: number,
  w: number,
  colorA: number,
  colorB: number,
  alpha: number = 0.7,
): void {
  const g = new Graphics();
  g.moveTo(x, y)
    .lineTo(x + w, y)
    .stroke({ width: 1, color: 0x33261a, alpha: 0.6 });
  const flagCount = Math.max(6, Math.floor(w / 24));
  const step = w / flagCount;
  for (let i = 0; i < flagCount; i++) {
    const fx = x + i * step + step / 2;
    const fy = y + (i % 2 === 0 ? 1 : 2.5);
    g.moveTo(fx - 4.2, fy)
      .lineTo(fx + 4.2, fy)
      .lineTo(fx, fy + 6.2)
      .fill({ color: i % 2 === 0 ? colorA : colorB, alpha });
    g.moveTo(fx, fy)
      .lineTo(fx, fy + 1.8)
      .stroke({ width: 0.5, color: 0xffffff, alpha: 0.14 });
  }
  parent.addChild(g);
}

function drawRoomAtmosphere(
  parent: Container,
  x: number,
  y: number,
  w: number,
  h: number,
  wallColor: number,
  accent: number,
): void {
  const g = new Graphics();
  const topPanelH = Math.max(20, Math.min(34, h * 0.22));
  drawBandGradient(
    g,
    x + 1,
    y + 1,
    w - 2,
    topPanelH,
    blendColor(wallColor, 0xffffff, 0.24),
    blendColor(wallColor, 0xffffff, 0.05),
    7,
    0.75,
  );
  g.rect(x + 1, y + topPanelH + 1, w - 2, 1.2).fill({ color: blendColor(wallColor, 0xffffff, 0.3), alpha: 0.28 });
  g.rect(x + 1, y + h - 14, w - 2, 10).fill({ color: blendColor(wallColor, 0x000000, 0.5), alpha: 0.14 });
  g.rect(x + 3, y + h - 14, w - 6, 1).fill({ color: blendColor(accent, 0xffffff, 0.45), alpha: 0.22 });
  parent.addChild(g);
}

/* ================================================================== */
/*  Drawing helpers                                                    */
/* ================================================================== */

function drawTiledFloor(g: Graphics, x: number, y: number, w: number, h: number, c1: number, c2: number) {
  // Terminal PCB grid — solid base + scan lines + grid + dot intersections
  g.rect(x, y, w, h).fill(c1);

  // Horizontal scan lines every 4px (CRT phosphor effect)
  for (let ty = 2; ty < h; ty += 4) {
    g.rect(x, y + ty, w, 1).fill({ color: c2, alpha: 0.04 });
  }

  // PCB grid lines at every TILE
  for (let ty = 0; ty <= h; ty += TILE) {
    g.moveTo(x, y + ty).lineTo(x + w, y + ty).stroke({ width: 0.5, color: c2, alpha: 0.2 });
  }
  for (let tx = 0; tx <= w; tx += TILE) {
    g.moveTo(x + tx, y).lineTo(x + tx, y + h).stroke({ width: 0.5, color: c2, alpha: 0.2 });
  }

  // Solder dot at every grid intersection
  for (let ty = 0; ty <= h; ty += TILE) {
    for (let tx = 0; tx <= w; tx += TILE) {
      g.circle(x + tx, y + ty, 0.9).fill({ color: c2, alpha: 0.4 });
    }
  }

  // Accent circuit traces — sparse short horizontal runs at half-TILE offset
  for (let ty = TILE / 2; ty < h; ty += TILE * 2) {
    for (let tx = TILE / 2; tx + TILE < w; tx += TILE * 3) {
      g.rect(x + tx, y + ty - 0.5, TILE, 1).fill({ color: c2, alpha: 0.12 });
      // End cap dots
      g.circle(x + tx, y + ty, 1).fill({ color: c2, alpha: 0.18 });
      g.circle(x + tx + TILE, y + ty, 1).fill({ color: c2, alpha: 0.18 });
    }
  }
}

/** Draw a soft ambient glow (radial gradient approximation using concentric ellipses) */
function drawAmbientGlow(
  parent: Container,
  cx: number,
  cy: number,
  radius: number,
  color: number,
  alpha: number = 0.15,
) {
  const g = new Graphics();
  const steps = 6;
  for (let i = steps; i >= 1; i--) {
    const r = radius * (i / steps);
    const a = alpha * (1 - i / (steps + 1));
    g.ellipse(cx, cy, r, r * 0.6).fill({ color, alpha: a });
  }
  parent.addChild(g);
  return g;
}

/** Draw a terminal data monitor on the wall */
function drawWindow(parent: Container, x: number, y: number, w: number = 24, h: number = 18) {
  const g = new Graphics();
  // Outer bezel (dark metal)
  g.rect(x, y, w, h).fill(0x1a1e2a);
  g.rect(x, y, w, h).stroke({ width: 0.8, color: 0x3a4058, alpha: 0.8 });
  // Screen area
  g.rect(x + 2, y + 2, w - 4, h - 5).fill(0x050810);
  // Scan lines on screen
  for (let sl = 0; sl < h - 6; sl += 2) {
    g.rect(x + 2, y + 2 + sl, w - 4, 1).fill({ color: 0x2244aa, alpha: 0.18 });
  }
  // Data bar rows
  g.rect(x + 3, y + 4, (w - 6) * 0.7, 1).fill({ color: 0x44aaff, alpha: 0.6 });
  g.rect(x + 3, y + 7, (w - 6) * 0.4, 1).fill({ color: 0x22cc88, alpha: 0.5 });
  g.rect(x + 3, y + 10, (w - 6) * 0.85, 1).fill({ color: 0x44aaff, alpha: 0.35 });
  g.rect(x + 3, y + 13, (w - 6) * 0.55, 1).fill({ color: 0x22cc88, alpha: 0.45 });
  // Status LED
  g.circle(x + w - 3, y + h - 2, 1.2).fill({ color: 0x22cc44, alpha: 0.9 });
  // Bottom bezel
  g.rect(x + 2, y + h - 3, w - 4, 2).fill(0x12161f);
  // Reflection
  g.moveTo(x + 3, y + 3).lineTo(x + 7, y + 3).lineTo(x + 3, y + 6).fill({ color: 0xffffff, alpha: 0.06 });
  parent.addChild(g);
  return g;
}


/** Draw a small wall clock with shadow and detail */
function drawWallClock(parent: Container, x: number, y: number) {
  const clock = new Container();
  clock.position.set(x, y);

  const g = new Graphics();
  // Dark bezel (terminal style)
  g.circle(0, 0, 8).fill(0x0c0c14);
  g.circle(0, 0, 8).stroke({ width: 1.2, color: 0x2a3050, alpha: 0.9 });
  // Dark face with subtle green phosphor tint
  g.circle(0, 0, 6.5).fill(0x060c10);
  // Hour marks — amber cardinal, dim green minor
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
    const r = 5.2;
    const isCardinal = i % 3 === 0;
    g.circle(Math.cos(angle) * r, Math.sin(angle) * r, isCardinal ? 0.7 : 0.3)
      .fill(isCardinal ? 0xf59e0b : 0x22cc44);
  }
  clock.addChild(g);

  const hourHand = new Graphics();
  hourHand.moveTo(0, 0).lineTo(0, -3.5).stroke({ width: 1.1, color: 0xf59e0b });
  clock.addChild(hourHand);

  const minuteHand = new Graphics();
  minuteHand.moveTo(0, 0).lineTo(0, -5.2).stroke({ width: 0.7, color: 0x22cc44 });
  clock.addChild(minuteHand);

  const secondHand = new Graphics();
  secondHand.moveTo(0, 1.6).lineTo(0, -5.8).stroke({ width: 0.35, color: 0xef4444 });
  clock.addChild(secondHand);

  // Center dot
  const center = new Graphics();
  center.circle(0, 0, 1).fill(0xf59e0b);
  center.circle(0, 0, 0.4).fill(0xffd060);
  clock.addChild(center);

  const visual: WallClockVisual = { hourHand, minuteHand, secondHand };
  applyWallClockTime(visual, new Date());

  parent.addChild(clock);
  return visual;
}

function applyWallClockTime(clock: WallClockVisual, now: Date): void {
  const minuteValue = now.getMinutes() + now.getSeconds() / 60;
  const hourValue = (now.getHours() % 12) + minuteValue / 60;
  const secondValue = now.getSeconds() + now.getMilliseconds() / 1000;
  clock.minuteHand.rotation = (minuteValue / 60) * Math.PI * 2;
  clock.hourHand.rotation = (hourValue / 12) * Math.PI * 2;
  clock.secondHand.rotation = (secondValue / 60) * Math.PI * 2;
}

/** Draw a pixel terminal schematic — replaces cozy picture frame */
function drawPictureFrame(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Sharp dark frame
  g.rect(x, y, 16, 12).fill(0x080c18);
  g.rect(x, y, 16, 12).stroke({ width: 0.8, color: 0x3a4a6a, alpha: 0.8 });
  // Amber left accent
  g.rect(x, y, 1.5, 12).fill({ color: 0xf59e0b, alpha: 0.7 });
  // Circuit schematic lines
  g.moveTo(x + 3, y + 3).lineTo(x + 8, y + 3).stroke({ width: 0.5, color: 0x4488cc, alpha: 0.7 });
  g.moveTo(x + 8, y + 3).lineTo(x + 8, y + 7).stroke({ width: 0.5, color: 0x4488cc, alpha: 0.7 });
  g.moveTo(x + 8, y + 7).lineTo(x + 13, y + 7).stroke({ width: 0.5, color: 0x22cc88, alpha: 0.6 });
  g.moveTo(x + 3, y + 7).lineTo(x + 6, y + 7).stroke({ width: 0.5, color: 0x22cc88, alpha: 0.5 });
  // Node dots
  g.circle(x + 3, y + 3, 0.8).fill({ color: 0x4488cc, alpha: 0.9 });
  g.circle(x + 8, y + 3, 0.8).fill({ color: 0x4488cc, alpha: 0.9 });
  g.circle(x + 8, y + 7, 0.8).fill({ color: 0x22cc88, alpha: 0.9 });
  g.circle(x + 13, y + 7, 0.8).fill({ color: 0x22cc88, alpha: 0.9 });
  parent.addChild(g);
  return g;
}

/** Draw a data-flow grid zone (replaces rug) */
function drawRug(parent: Container, cx: number, cy: number, w: number, h: number, color: number) {
  const g = new Graphics();
  // Very subtle tinted area (barely visible, like a zone indicator)
  g.rect(cx - w / 2, cy - h / 2, w, h).fill({ color, alpha: 0.06 });
  // Sharp border
  g.rect(cx - w / 2, cy - h / 2, w, h).stroke({ width: 0.5, color, alpha: 0.18 });
  // Corner markers (4 corners) — circuit pad style
  const corners = [
    [cx - w / 2, cy - h / 2],
    [cx + w / 2 - 4, cy - h / 2],
    [cx - w / 2, cy + h / 2 - 4],
    [cx + w / 2 - 4, cy + h / 2 - 4],
  ] as const;
  for (const [cx2, cy2] of corners) {
    g.rect(cx2, cy2, 4, 4).fill({ color, alpha: 0.3 });
  }
  parent.addChild(g);
  return g;
}

/** Draw a ceiling light fixture */
function drawCeilingLight(parent: Container, x: number, y: number, color: number) {
  const g = new Graphics();
  // Soft outer glow
  g.ellipse(x, y + 10, 20, 6).fill({ color: 0xfff5dd, alpha: 0.04 });
  // Light cone (downward, warm metal)
  g.rect(x - 2, y, 4, 3).fill(0x908070);
  g.rect(x - 5, y + 3, 10, 2).fill(0xb8a890);
  // Bulb highlight
  g.rect(x - 1, y + 1, 2, 2).fill({ color: 0xffffff, alpha: 0.2 });
  // Warm glow
  g.ellipse(x, y + 8, 16, 5).fill({ color, alpha: 0.06 });
  g.ellipse(x, y + 7, 10, 3.5).fill({ color, alpha: 0.1 });
  g.ellipse(x, y + 6, 5, 2).fill({ color: 0xfff5dd, alpha: 0.08 });
  parent.addChild(g);
  return g;
}

/** Draw a trash can — server discard bin style */
function drawTrashCan(parent: Container, x: number, y: number) {
  const g = new Graphics();
  g.rect(x - 4, y, 8, 10).fill(0x1a1e2a);
  g.rect(x - 4, y, 8, 10).stroke({ width: 0.5, color: 0x3a4058, alpha: 0.7 });
  g.rect(x - 4.5, y - 1.5, 9, 2).fill(0x252a3a);
  // Status lines (horizontal stripes)
  g.rect(x - 3, y + 3, 6, 1).fill({ color: 0xef4444, alpha: 0.4 });
  g.rect(x - 3, y + 6, 6, 1).fill({ color: 0xef4444, alpha: 0.25 });
  parent.addChild(g);
  return g;
}

/** Draw a water cooler — server coolant unit style */
function drawWaterCooler(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Base unit
  g.rect(x - 5, y + 10, 10, 14).fill(0x1a1e2a);
  g.rect(x - 5, y + 10, 10, 14).stroke({ width: 0.5, color: 0x3a4058, alpha: 0.6 });
  // Coolant tank (dark blue tint)
  g.rect(x - 4, y, 8, 12).fill(0x0a1828);
  g.rect(x - 4, y, 8, 12).stroke({ width: 0.5, color: 0x2255aa, alpha: 0.6 });
  // Coolant level indicator
  g.rect(x - 3, y + 4, 6, 7).fill({ color: 0x2266dd, alpha: 0.35 });
  // Status LED
  g.circle(x + 2, y + 18, 1).fill({ color: 0x22cc44, alpha: 0.9 });
  // Output valve
  g.rect(x + 3, y + 16, 3, 2).fill(0x303a50);
  parent.addChild(g);
  return g;
}

export {
  hashStr,
  blendColor,
  isLightColor,
  contrastTextColor,
  drawBandGradient,
  drawBunting,
  drawRoomAtmosphere,
  drawTiledFloor,
  drawAmbientGlow,
  drawWindow,
  drawWallClock,
  applyWallClockTime,
  drawPictureFrame,
  drawRug,
  drawCeilingLight,
  drawTrashCan,
  drawWaterCooler,
};
