import { type Container, Graphics } from "pixi.js";
import { DESK_H, DESK_W, TARGET_CHAR_H } from "./model";
import { blendColor } from "./drawing-core";
import { OFFICE_PASTEL } from "./themes-locale";

function drawDesk(parent: Container, dx: number, dy: number, working: boolean): Graphics {
  const g = new Graphics();

  // ── Desk body — dark metal workstation ──
  g.rect(dx, dy, DESK_W, DESK_H).fill(0x141820);
  g.rect(dx, dy, DESK_W, DESK_H).stroke({ width: 0.8, color: 0x2a3048, alpha: 0.9 });
  // Surface highlight strip at top
  g.rect(dx + 1, dy + 1, DESK_W - 2, 2).fill({ color: 0x2a3858, alpha: 0.5 });
  // Amber left accent bar
  g.rect(dx, dy, 2, DESK_H).fill({ color: 0xf59e0b, alpha: 0.5 });
  // Bottom edge shadow
  g.rect(dx + 2, dy + DESK_H - 1, DESK_W - 4, 1).fill({ color: 0x000000, alpha: 0.3 });

  // ── Keyboard (top area, closest to agent) ──
  const kx = dx + DESK_W / 2 - 10;
  const ky = dy + 3;
  g.rect(kx, ky, 20, 7).fill(0x0c1018);
  g.rect(kx, ky, 20, 7).stroke({ width: 0.4, color: 0x2a3048, alpha: 0.7 });
  // Key rows — amber for modifiers, dim for rest
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 7; c++) {
      const isAccent = (r === 0 && c === 0) || (r === 1 && c === 6);
      g.rect(kx + 1 + c * 2.6, ky + 1 + r * 2.8, 2, 1.8)
        .fill({ color: isAccent ? 0xf59e0b : 0x22304a, alpha: isAccent ? 0.8 : 0.6 });
    }
  }
  // Spacebar
  g.rect(kx + 4, ky + 5.3, 12, 1.2).fill({ color: 0x22304a, alpha: 0.6 });

  // ── Monitor (bottom area) ──
  const mx = dx + DESK_W / 2 - 9;
  const my = dy + DESK_H - 14;
  g.rect(mx, my, 18, 11).fill(0x0c0c14);
  g.rect(mx, my, 18, 11).stroke({ width: 0.5, color: 0x2a3048, alpha: 0.8 });
  // Screen
  g.rect(mx + 1, my + 1, 16, 9).fill(working ? 0x041224 : 0x060608);
  if (working) {
    // Terminal data lines — amber + green
    const lineColors = [0xf59e0b, 0x22cc88, 0xf59e0b, 0x4488cc];
    for (let i = 0; i < 4; i++) {
      const lw = 3 + ((i * 2.7) % 9);
      g.rect(mx + 2 + (i % 2) * 1, my + 2 + i * 1.9, lw, 1)
        .fill({ color: lineColors[i % lineColors.length], alpha: 0.7 });
    }
    // Cursor block
    g.rect(mx + 2, my + 9.5, 1, 1).fill({ color: 0xf59e0b, alpha: 0.9 });
    // Screen glow
    g.rect(mx, my + 11, 18, 2).fill({ color: 0xf59e0b, alpha: 0.03 });
  } else {
    // Idle: dim amber standby dot
    g.circle(mx + 9, my + 5, 1).fill({ color: 0xf59e0b, alpha: 0.15 });
  }
  // Status LED top-center
  g.circle(mx + 9, my + 0.5, 0.7).fill({ color: working ? 0x22cc44 : 0x444444, alpha: 0.9 });

  // ── Right side: server unit / LED bar ──
  const su = dx + DESK_W - 8;
  g.rect(su, dy + 4, 6, 14).fill(0x0c1018);
  g.rect(su, dy + 4, 6, 14).stroke({ width: 0.3, color: 0x2a3048, alpha: 0.6 });
  // LED indicators
  for (let li = 0; li < 4; li++) {
    const ledColor = li === 0 ? 0x22cc44 : li === 3 ? 0xf59e0b : 0x223355;
    g.circle(su + 3, dy + 6.5 + li * 3, 0.8).fill({ color: ledColor, alpha: li < 2 ? 0.9 : 0.4 });
  }

  // ── Left side: data cable routing ──
  g.rect(dx + 3, dy + DESK_H - 6, 3, 4).fill({ color: 0x2a3048, alpha: 0.5 });
  g.rect(dx + 4, dy + DESK_H - 8, 1, 3).fill({ color: 0xf59e0b, alpha: 0.3 });

  parent.addChild(g);
  return g;
}

function drawChair(parent: Container, cx: number, cy: number, color: number) {
  const g = new Graphics();
  const chairBase = blendColor(color, OFFICE_PASTEL.creamWhite, 0.18);
  const chairMid = blendColor(color, OFFICE_PASTEL.creamWhite, 0.08);
  const chairShadow = blendColor(color, OFFICE_PASTEL.ink, 0.22);
  const chairDark = blendColor(color, OFFICE_PASTEL.ink, 0.35);
  // Floor shadow
  g.ellipse(cx, cy + 5, 18, 6).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.08 });
  // Wheel base (star pattern)
  g.circle(cx - 8, cy + 3, 1.5).fill({ color: 0x555555, alpha: 0.3 });
  g.circle(cx + 8, cy + 3, 1.5).fill({ color: 0x555555, alpha: 0.3 });
  g.circle(cx, cy + 4, 1.5).fill({ color: 0x555555, alpha: 0.3 });
  // Seat cushion
  g.ellipse(cx, cy, 16, 10).fill({ color: OFFICE_PASTEL.cocoa, alpha: 0.06 });
  g.ellipse(cx, cy, 15, 9).fill(chairBase);
  g.ellipse(cx, cy, 15, 9).stroke({ width: 1, color: chairShadow, alpha: 0.25 });
  // Seat highlight (subtle dome)
  g.ellipse(cx - 1, cy - 1.5, 11, 5.5).fill({ color: 0xffffff, alpha: 0.12 });
  g.ellipse(cx, cy + 3, 10, 3).fill({ color: chairShadow, alpha: 0.08 });
  // Cushion stitch line
  g.ellipse(cx, cy, 10, 6).stroke({ width: 0.3, color: chairShadow, alpha: 0.12 });
  // Armrests (rounded, softer)
  g.roundRect(cx - 17, cy - 5, 5, 13, 2.5).fill(chairMid);
  g.roundRect(cx - 17, cy - 5, 5, 13, 2.5).stroke({ width: 0.5, color: chairShadow, alpha: 0.2 });
  g.roundRect(cx + 12, cy - 5, 5, 13, 2.5).fill(chairMid);
  g.roundRect(cx + 12, cy - 5, 5, 13, 2.5).stroke({ width: 0.5, color: chairShadow, alpha: 0.2 });
  // Armrest top highlight
  g.roundRect(cx - 16, cy - 4.5, 3, 1, 0.5).fill({ color: 0xffffff, alpha: 0.12 });
  g.roundRect(cx + 13, cy - 4.5, 3, 1, 0.5).fill({ color: 0xffffff, alpha: 0.12 });
  // Backrest (ergonomic curve)
  g.roundRect(cx - 14, cy - 13, 28, 7, 4).fill(chairShadow);
  g.roundRect(cx - 14, cy - 13, 28, 7, 4).stroke({ width: 0.8, color: chairDark, alpha: 0.25 });
  // Backrest top highlight
  g.roundRect(cx - 12, cy - 12, 24, 2.5, 2).fill({ color: blendColor(chairBase, 0xffffff, 0.4), alpha: 0.4 });
  // Backrest lumbar support detail
  g.roundRect(cx - 10, cy - 9, 20, 2, 1).fill({ color: chairBase, alpha: 0.3 });
  // Seat cushion center detail
  g.ellipse(cx, cy - 0.5, 9, 3.2).fill({ color: blendColor(chairBase, OFFICE_PASTEL.softMint, 0.22), alpha: 0.5 });
  parent.addChild(g);
}

function drawPlant(parent: Container, x: number, y: number, variant: number = 0) {
  const g = new Graphics();
  // Pot shadow
  g.ellipse(x, y + 8, 8, 3).fill({ color: 0x000000, alpha: 0.12 });
  // Pot body — dark concrete/metal
  g.rect(x - 5, y, 10, 7).fill(0x1a2030);
  g.rect(x - 5, y, 10, 7).stroke({ width: 0.4, color: 0x2a3048 });
  g.rect(x - 4, y + 1, 8, 5).fill(0x141820);
  // Amber accent band
  g.rect(x - 5, y + 4, 10, 1).fill({ color: 0xf59e0b, alpha: 0.4 });
  // Pot rim
  g.rect(x - 6, y - 1.5, 12, 2.5).fill(0x1a2030);
  g.rect(x - 6, y - 1.5, 12, 2.5).stroke({ width: 0.3, color: 0x2a3048 });
  // Soil — dark substrate
  g.ellipse(x, y, 4.5, 1.8).fill(0x0a0c10);
  g.circle(x + 2.5, y - 0.3, 0.7).fill({ color: 0x22cc88, alpha: 0.3 });
  if (variant % 4 === 0) {
    // Bushy monstera-style plant (soft mint)
    g.rect(x - 0.4, y - 2, 0.8, 3).fill(0x6aaa88);
    g.circle(x, y - 4, 6.5).fill(0x78bfa4);
    g.circle(x - 3, y - 6, 4.5).fill(0x89cfb5);
    g.circle(x + 3, y - 6.5, 4).fill(0x89cfb5);
    g.circle(x, y - 8.5, 4).fill(0x9dd9c2);
    g.circle(x - 2, y - 10, 2.8).fill(0xb7e7d5);
    g.circle(x + 2.5, y - 9.5, 2.2).fill(0xb7e7d5);
    // Leaf veins
    g.moveTo(x, y - 4)
      .lineTo(x, y - 8)
      .stroke({ width: 0.3, color: 0x5e9f7f, alpha: 0.3 });
    g.moveTo(x - 2, y - 6)
      .lineTo(x - 4, y - 8)
      .stroke({ width: 0.2, color: 0x5e9f7f, alpha: 0.2 });
    g.moveTo(x + 2, y - 6)
      .lineTo(x + 4, y - 8)
      .stroke({ width: 0.2, color: 0x5e9f7f, alpha: 0.2 });
    // Highlight leaves
    g.circle(x + 2, y - 7, 1.8).fill({ color: 0xffffff, alpha: 0.18 });
    g.circle(x - 2, y - 9.5, 1.2).fill({ color: 0xffffff, alpha: 0.12 });
  } else if (variant % 4 === 1) {
    // Tall cactus (mint-sage, more detailed)
    g.roundRect(x - 2.5, y - 12, 5, 12, 2.5).fill(0x6eaa88);
    g.roundRect(x - 2, y - 10, 4, 10, 2).fill(0x82bc9a);
    g.roundRect(x - 1.5, y - 9, 3, 8, 1.5).fill(0x92c8aa);
    // Cactus ribs
    g.moveTo(x - 1, y - 11)
      .lineTo(x - 1, y - 1)
      .stroke({ width: 0.25, color: 0x5a9a78, alpha: 0.3 });
    g.moveTo(x + 1, y - 11)
      .lineTo(x + 1, y - 1)
      .stroke({ width: 0.25, color: 0x5a9a78, alpha: 0.3 });
    // Arms (more rounded)
    g.roundRect(x - 7, y - 7, 5, 2.5, 1.2).fill(0x72b090);
    g.roundRect(x - 7, y - 10, 2.5, 5, 1.2).fill(0x82bc9a);
    g.roundRect(x + 2, y - 5, 5, 2.5, 1.2).fill(0x72b090);
    g.roundRect(x + 4.5, y - 8, 2.5, 5, 1.2).fill(0x82bc9a);
    // Spines (tiny dots)
    for (let i = 0; i < 5; i++) {
      g.circle(x + (i % 2 === 0 ? 2.5 : -2.5), y - 2 - i * 2, 0.3).fill({ color: 0xd8d0c0, alpha: 0.4 });
    }
    // Flower on top
    g.circle(x, y - 13, 2).fill(0xe3a8b2);
    g.circle(x - 1.2, y - 13.5, 1.5).fill(0xedb8c2);
    g.circle(x + 1.2, y - 13.5, 1.5).fill(0xedb8c2);
    g.circle(x, y - 13, 1).fill(0xf6d57a);
  } else if (variant % 4 === 2) {
    // Flower pot (mint stem + dusty blossoms, more flowers)
    g.rect(x - 0.5, y - 9, 1, 9).fill(0x6aaa88);
    g.rect(x - 2.5, y - 6, 0.8, 5).fill(0x7ab898);
    g.rect(x + 2, y - 5, 0.8, 4).fill(0x7ab898);
    // Leaves
    g.circle(x, y - 3.5, 5).fill(0x6eaa88);
    g.circle(x - 3.5, y - 5.5, 3.5).fill(0x82bc9a);
    g.circle(x + 3.5, y - 5.5, 3).fill(0x82bc9a);
    g.circle(x, y - 7, 3).fill(0x92c8aa);
    // Flowers (multiple, varied)
    g.circle(x, y - 10, 3).fill(0xe09aaa);
    g.circle(x - 1, y - 10.5, 1.8).fill(0xeaacb8);
    g.circle(x + 1, y - 10.5, 1.8).fill(0xeaacb8);
    g.circle(x, y - 10, 1.5).fill(0xf6d685);
    g.circle(x - 4, y - 8, 2.5).fill(0x9fbede);
    g.circle(x - 4, y - 8, 1.2).fill(0xf8efba);
    g.circle(x + 3.5, y - 8.5, 2).fill(0xf2b28a);
    g.circle(x + 3.5, y - 8.5, 1).fill(0xf7df97);
    // Tiny bud
    g.circle(x + 1.5, y - 12, 1.2).fill(0xe8a0b0);
  } else {
    // Snake plant / sansevieria (tall pointed leaves)
    const leafColors = [0x5e9a78, 0x6eaa88, 0x7cb898, 0x5a9070];
    for (let i = 0; i < 4; i++) {
      const lx = x + (i - 1.5) * 2.5;
      const lh = 10 + (i % 2) * 3;
      g.moveTo(lx, y)
        .lineTo(lx - 1.5, y - lh * 0.6)
        .lineTo(lx, y - lh)
        .lineTo(lx + 1.5, y - lh * 0.6)
        .lineTo(lx, y)
        .fill(leafColors[i]);
      // Leaf highlight stripe
      g.moveTo(lx, y)
        .lineTo(lx, y - lh + 1)
        .stroke({ width: 0.3, color: 0xb8e0c8, alpha: 0.25 });
    }
    // Yellow leaf edge detail
    g.moveTo(x - 2, y - 8)
      .lineTo(x - 3, y - 5)
      .stroke({ width: 0.3, color: 0xc8d8a8, alpha: 0.25 });
  }
  parent.addChild(g);
}

function drawWhiteboard(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Shadow
  g.rect(x + 2, y + 2, 38, 22).fill({ color: 0x000000, alpha: 0.18 });
  // Frame — dark metal bezel
  g.rect(x, y, 38, 22).fill(0x141820);
  g.rect(x, y, 38, 22).stroke({ width: 0.6, color: 0x2a3048 });
  // Amber top accent bar
  g.rect(x, y, 38, 1.5).fill({ color: 0xf59e0b, alpha: 0.5 });
  // Screen — terminal dark
  g.rect(x + 2, y + 2, 34, 18).fill(0x050810);
  // Terminal data lines
  const lineColors = [0xf59e0b, 0x22cc88, 0x4488cc, 0xf59e0b, 0x22cc88];
  const lineLengths = [22, 15, 28, 18, 10];
  for (let i = 0; i < 5; i++) {
    g.rect(x + 4, y + 4 + i * 2.8, lineLengths[i], 1).fill({ color: lineColors[i], alpha: 0.55 });
  }
  // Status block right side
  g.rect(x + 28, y + 4, 6, 4).fill({ color: 0x22cc88, alpha: 0.15 });
  g.circle(x + 31, y + 6, 1).fill({ color: 0x22cc44, alpha: 0.85 });
  // Bottom status bar
  g.rect(x, y + 20, 38, 2).fill({ color: 0x1a2030, alpha: 0.8 });
  g.rect(x + 2, y + 20.5, 8, 1).fill({ color: 0xf59e0b, alpha: 0.5 });
  // Mounting legs
  g.rect(x + 6, y + 22, 2, 5).fill(0x1a2030);
  g.rect(x + 30, y + 22, 2, 5).fill(0x1a2030);
  parent.addChild(g);
}

/** Draw a wall poster (motivational/tech style) */
function drawPoster(parent: Container, x: number, y: number, accent: number) {
  const g = new Graphics();
  g.roundRect(x, y, 22, 16, 1).fill(blendColor(accent, 0x222222, 0.4));
  g.rect(x + 1, y + 1, 20, 14).fill(blendColor(accent, 0x000000, 0.6));
  // Star/emblem
  g.star(x + 11, y + 7, 5, 4, 2, 0).fill({ color: accent, alpha: 0.7 });
  // Text lines
  g.rect(x + 4, y + 12, 14, 1).fill({ color: 0xffffff, alpha: 0.3 });
  g.rect(x + 6, y + 14, 10, 0.5).fill({ color: 0xffffff, alpha: 0.2 });
  parent.addChild(g);
  return g;
}

/** Draw a full-area carpet under agents */
function drawCarpet(parent: Container, cx: number, cy: number, w: number, h: number, color: number) {
  const g = new Graphics();
  g.roundRect(cx - w / 2, cy - h / 2, w, h, 2).fill({ color, alpha: 0.2 });
  // Cross-hatch pattern
  for (let i = 0; i < w; i += 8) {
    g.rect(cx - w / 2 + i, cy - h / 2, 0.5, h).fill({ color, alpha: 0.08 });
  }
  for (let j = 0; j < h; j += 8) {
    g.rect(cx - w / 2, cy - h / 2 + j, w, 0.5).fill({ color, alpha: 0.08 });
  }
  parent.addChild(g);
  return g;
}

/** Draw a small desk lamp */
function drawDeskLamp(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Base
  g.ellipse(x, y + 2, 4, 1.5).fill(0x444455);
  // Arm
  g.rect(x - 0.5, y - 8, 1, 10).fill(0x555566);
  // Shade
  g.moveTo(x - 5, y - 8).lineTo(x + 5, y - 8).lineTo(x + 3, y - 12).lineTo(x - 3, y - 12).fill(0x888899);
  // Glow
  g.ellipse(x, y - 4, 6, 4).fill({ color: 0xfff8dd, alpha: 0.15 });
  parent.addChild(g);
  return g;
}

/** Draw a coffee mug on desk */
function drawDeskMug(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Mug body
  g.roundRect(x - 3, y - 5, 6, 6, 1).fill(0xeeeeee);
  g.roundRect(x - 2.5, y - 4.5, 5, 5, 1).fill(0xdddddd);
  // Handle
  g.moveTo(x + 3, y - 3).quadraticCurveTo(x + 6, y - 1.5, x + 3, y).stroke({ width: 1, color: 0xcccccc });
  // Coffee inside
  g.ellipse(x, y - 4.5, 2.5, 1).fill(0x6b4226);
  // Steam
  g.moveTo(x - 1, y - 6).quadraticCurveTo(x - 2, y - 8, x, y - 9).stroke({ width: 0.4, color: 0xcccccc, alpha: 0.4 });
  g.moveTo(x + 1, y - 6.5).quadraticCurveTo(x + 2, y - 8.5, x, y - 10).stroke({ width: 0.3, color: 0xcccccc, alpha: 0.3 });
  parent.addChild(g);
  return g;
}

/** Draw a small figurine on desk */
function drawDeskFigurine(parent: Container, x: number, y: number, accent: number) {
  const g = new Graphics();
  // Base
  g.roundRect(x - 3, y, 6, 2, 0.5).fill(0x555555);
  // Body
  g.roundRect(x - 2, y - 6, 4, 6, 1).fill(blendColor(accent, 0x888888, 0.5));
  // Head
  g.circle(x, y - 8, 2.5).fill(blendColor(accent, 0xffffff, 0.3));
  // Eyes
  g.circle(x - 1, y - 8.5, 0.4).fill(0x222222);
  g.circle(x + 1, y - 8.5, 0.4).fill(0x222222);
  parent.addChild(g);
  return g;
}

/* ── Catalog furniture items ── */

/** Small desk aquarium with fish */
function drawAquarium(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Tank body
  g.roundRect(x - 10, y - 12, 20, 14, 2).fill({ color: 0x87ceeb, alpha: 0.4 });
  g.roundRect(x - 10, y - 12, 20, 14, 2).stroke({ width: 1.2, color: 0x5a9ec2, alpha: 0.8 });
  // Water
  g.roundRect(x - 9, y - 10, 18, 10, 1).fill({ color: 0x4db8e6, alpha: 0.25 });
  // Fish 1
  g.ellipse(x - 3, y - 6, 2.5, 1.5).fill(0xff6b35);
  g.moveTo(x - 5.5, y - 6).lineTo(x - 7, y - 8).lineTo(x - 7, y - 4).closePath().fill(0xff6b35);
  g.circle(x - 1.5, y - 6.5, 0.4).fill(0x111111);
  // Fish 2
  g.ellipse(x + 4, y - 4, 2, 1.2).fill(0x3498db);
  g.moveTo(x + 2, y - 4).lineTo(x + 0.5, y - 5.5).lineTo(x + 0.5, y - 2.5).closePath().fill(0x3498db);
  g.circle(x + 5.5, y - 4.5, 0.3).fill(0x111111);
  // Pebbles
  g.circle(x - 5, y + 0.5, 1.2).fill(0xb8a88a);
  g.circle(x - 2, y + 1, 1).fill(0xa0907a);
  g.circle(x + 3, y + 0.5, 1.3).fill(0xc8b89a);
  // Bubbles
  g.circle(x + 1, y - 9, 0.8).fill({ color: 0xffffff, alpha: 0.5 });
  g.circle(x + 2.5, y - 11, 0.5).fill({ color: 0xffffff, alpha: 0.4 });
  // Stand
  g.rect(x - 8, y + 2, 16, 2).fill(0x6a5a4a);
  parent.addChild(g);
  return g;
}

/** Spinning globe on a stand */
function drawGlobe(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Stand
  g.rect(x - 1, y - 2, 2, 4).fill(0x888888);
  g.rect(x - 4, y + 2, 8, 2).fill(0x777777);
  // Globe sphere
  g.circle(x, y - 8, 6).fill(0x4a90d9);
  g.circle(x, y - 8, 6).stroke({ width: 0.8, color: 0x888888 });
  // Continents (simple shapes)
  g.ellipse(x - 2, y - 9, 2.5, 3).fill({ color: 0x5cb85c, alpha: 0.7 });
  g.ellipse(x + 3, y - 7, 1.8, 2).fill({ color: 0x5cb85c, alpha: 0.7 });
  // Axis ring
  g.circle(x, y - 8, 6.5).stroke({ width: 0.4, color: 0xaaaaaa, alpha: 0.5 });
  parent.addChild(g);
  return g;
}

/** Neon LED sign on wall */
function drawLedSign(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Background plate
  g.roundRect(x - 14, y - 2, 28, 12, 2).fill({ color: 0x1a1a2e, alpha: 0.9 });
  g.roundRect(x - 14, y - 2, 28, 12, 2).stroke({ width: 0.8, color: 0x333355 });
  // Glow effect
  g.roundRect(x - 12, y, 24, 8, 1).fill({ color: 0x00ffcc, alpha: 0.15 });
  // "OPEN" text simulation using simple shapes
  // O
  g.circle(x - 8, y + 4, 2.5).stroke({ width: 1.2, color: 0x00ffcc, alpha: 0.9 });
  // P
  g.rect(x - 3.5, y + 1.5, 1.2, 5).fill({ color: 0xff6ec7, alpha: 0.9 });
  g.roundRect(x - 3.5, y + 1.5, 4, 2.5, 1).stroke({ width: 1, color: 0xff6ec7, alpha: 0.9 });
  // E
  g.rect(x + 2, y + 1.5, 1.2, 5).fill({ color: 0x00ffcc, alpha: 0.9 });
  g.rect(x + 2, y + 1.5, 3.5, 1).fill({ color: 0x00ffcc, alpha: 0.9 });
  g.rect(x + 2, y + 3.5, 2.5, 1).fill({ color: 0x00ffcc, alpha: 0.9 });
  g.rect(x + 2, y + 5.5, 3.5, 1).fill({ color: 0x00ffcc, alpha: 0.9 });
  // N
  g.rect(x + 7, y + 1.5, 1.2, 5).fill({ color: 0xff6ec7, alpha: 0.9 });
  g.rect(x + 10.5, y + 1.5, 1.2, 5).fill({ color: 0xff6ec7, alpha: 0.9 });
  parent.addChild(g);
  return g;
}

/** Gold trophy */
function drawTrophy(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Base
  g.roundRect(x - 5, y, 10, 3, 1).fill(0x8b6914);
  g.roundRect(x - 3, y - 2, 6, 2, 0.5).fill(0xa07818);
  // Stem
  g.rect(x - 1.5, y - 6, 3, 4).fill(0xc49a1a);
  // Cup
  g.roundRect(x - 6, y - 14, 12, 8, 2).fill(0xffd700);
  g.roundRect(x - 6, y - 14, 12, 8, 2).stroke({ width: 0.6, color: 0xb8860b });
  // Handles
  g.arc(x - 6, y - 10, 3, Math.PI * 0.5, Math.PI * 1.5).stroke({ width: 1.2, color: 0xffd700 });
  g.arc(x + 6, y - 10, 3, -Math.PI * 0.5, Math.PI * 0.5).stroke({ width: 1.2, color: 0xffd700 });
  // Star
  g.star(x, y - 11, 5, 2.5, 1.2).fill(0xfffacd);
  parent.addChild(g);
  return g;
}

/** Mini desk fan */
function drawFan(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Base
  g.roundRect(x - 5, y, 10, 3, 1).fill(0xdddddd);
  // Neck
  g.rect(x - 1, y - 4, 2, 4).fill(0xcccccc);
  // Guard circle
  g.circle(x, y - 9, 6).stroke({ width: 0.8, color: 0xaaaaaa });
  // Blades (3)
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 * i) / 3;
    const bx = x + Math.cos(angle) * 4;
    const by = y - 9 + Math.sin(angle) * 4;
    g.ellipse(bx, by, 2, 4).fill({ color: 0x88bbdd, alpha: 0.6 });
  }
  // Center hub
  g.circle(x, y - 9, 1.5).fill(0x555555);
  parent.addChild(g);
  return g;
}

/** Air purifier */
function drawAirPurifier(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Body
  g.roundRect(x - 6, y - 16, 12, 18, 3).fill(0xf0f0f0);
  g.roundRect(x - 6, y - 16, 12, 18, 3).stroke({ width: 0.8, color: 0xdddddd });
  // Vent lines
  for (let i = 0; i < 4; i++) {
    g.rect(x - 4, y - 13 + i * 3, 8, 0.8).fill({ color: 0xcccccc, alpha: 0.6 });
  }
  // Indicator LED
  g.circle(x, y - 1, 1.2).fill(0x00cc66);
  // Air flow dots
  g.circle(x - 2, y - 18, 0.6).fill({ color: 0x88ccff, alpha: 0.4 });
  g.circle(x + 1, y - 19, 0.5).fill({ color: 0x88ccff, alpha: 0.3 });
  g.circle(x + 3, y - 17.5, 0.4).fill({ color: 0x88ccff, alpha: 0.35 });
  parent.addChild(g);
  return g;
}

/** Mini arcade machine */
function drawArcade(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Cabinet body
  g.roundRect(x - 8, y - 20, 16, 22, 2).fill(0x2c2c54);
  g.roundRect(x - 8, y - 20, 16, 22, 2).stroke({ width: 1, color: 0x1a1a3e });
  // Screen
  g.roundRect(x - 6, y - 18, 12, 9, 1).fill(0x111122);
  // Screen content (simple game display)
  g.rect(x - 4, y - 16, 2, 2).fill(0x00ff00);
  g.rect(x + 2, y - 14, 2, 2).fill(0xff4444);
  g.rect(x - 1, y - 12, 1, 1).fill(0xffff00);
  // Controls
  g.circle(x - 3, y - 6, 2).fill(0xff3333);
  g.circle(x + 3, y - 6, 2).fill(0x3333ff);
  // Joystick
  g.circle(x, y - 3, 1.5).fill(0x444444);
  g.rect(x - 0.5, y - 5, 1, 2).fill(0x666666);
  // Top marquee
  g.roundRect(x - 7, y - 21, 14, 3, 1).fill(0xff6b6b);
  parent.addChild(g);
  return g;
}

/** Bean bag chair */
function drawBeanBag(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Shadow
  g.ellipse(x, y + 1, 8, 3).fill({ color: 0x000000, alpha: 0.1 });
  // Body (blob shape)
  g.ellipse(x, y - 4, 7, 6).fill(0xc49a6c);
  g.ellipse(x, y - 4, 7, 6).stroke({ width: 0.6, color: 0xa07848 });
  // Top indent
  g.ellipse(x, y - 7, 4, 2).fill(blendColor(0xc49a6c, 0x000000, 0.1));
  // Stitch line
  g.arc(x, y - 3, 5, Math.PI * 0.1, Math.PI * 0.9).stroke({ width: 0.5, color: 0xa07848, alpha: 0.5 });
  parent.addChild(g);
  return g;
}

/** Standing desk (taller desk) */
function drawStandingDesk(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Legs (taller than normal)
  g.rect(x - 10, y - 2, 2, 14).fill(0x888888);
  g.rect(x + 8, y - 2, 2, 14).fill(0x888888);
  // Cross bar
  g.rect(x - 8, y + 6, 16, 1.5).fill(0x777777);
  // Desktop surface
  g.roundRect(x - 12, y - 4, 24, 3, 1).fill(0xd4c4a8);
  g.roundRect(x - 12, y - 4, 24, 3, 1).stroke({ width: 0.6, color: 0xb0a088 });
  // Monitor
  g.roundRect(x - 6, y - 12, 12, 8, 1).fill(0x222233);
  g.roundRect(x - 6, y - 12, 12, 8, 1).stroke({ width: 0.5, color: 0x444455 });
  g.roundRect(x - 5, y - 11, 10, 6, 0.5).fill(0x3a4a6a);
  // Monitor stand
  g.rect(x - 1, y - 4, 2, 1).fill(0x555555);
  parent.addChild(g);
  return g;
}

/** Wall projector */
function drawProjector(parent: Container, x: number, y: number) {
  const g = new Graphics();
  // Ceiling mount
  g.rect(x - 2, y - 2, 4, 4).fill(0x888888);
  // Body
  g.roundRect(x - 8, y + 2, 16, 8, 2).fill(0xeeeeee);
  g.roundRect(x - 8, y + 2, 16, 8, 2).stroke({ width: 0.6, color: 0xcccccc });
  // Lens
  g.circle(x, y + 6, 3).fill(0x222222);
  g.circle(x, y + 6, 2).fill({ color: 0x4488cc, alpha: 0.6 });
  // Light beam (subtle)
  g.moveTo(x - 3, y + 9).lineTo(x + 3, y + 9).lineTo(x + 12, y + 20).lineTo(x - 12, y + 20).closePath().fill({ color: 0xffffff, alpha: 0.04 });
  // Status LED
  g.circle(x + 6, y + 4, 0.8).fill(0x00cc66);
  parent.addChild(g);
  return g;
}

/** Draw a catalog furniture item by its ID */
function drawCatalogItem(parent: Container, x: number, y: number, itemId: string) {
  switch (itemId) {
    case "aquarium": return drawAquarium(parent, x, y);
    case "globe": return drawGlobe(parent, x, y);
    case "led_sign": return drawLedSign(parent, x, y);
    case "trophy": return drawTrophy(parent, x, y);
    case "fan": return drawFan(parent, x, y);
    case "air_purifier": return drawAirPurifier(parent, x, y);
    case "arcade": return drawArcade(parent, x, y);
    case "bean_bag": return drawBeanBag(parent, x, y);
    case "standing_desk": return drawStandingDesk(parent, x, y);
    case "projector": return drawProjector(parent, x, y);
    default: return null;
  }
}

export { drawDesk, drawChair, drawPlant, drawWhiteboard, drawPoster, drawCarpet, drawDeskLamp, drawDeskMug, drawDeskFigurine, drawCatalogItem };
