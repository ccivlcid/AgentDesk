/* ================================================================== */
/*  Pixel Drawer — 8-bit retro style using rect() only                 */
/* ================================================================== */

import { type Container, Graphics, Text, TextStyle } from "pixi.js";
import type { FurnitureDrawer } from "./index";
import type { WallClockVisual } from "../model";
import { DESK_H, DESK_W } from "../model";
import { applyWallClockTime } from "../drawing-core";

const PX = 2; // pixel size unit

function px(n: number) { return Math.round(n / PX) * PX; }

function pxRect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.rect(px(x), px(y), px(w), px(h)).fill({ color, alpha });
}

export const pixelDrawer: FurnitureDrawer = {
  drawDesk(parent, dx, dy, working) {
    const g = new Graphics();
    // Shadow
    pxRect(g, dx + 2, dy + DESK_H + 2, DESK_W, 4, 0x000000, 0.15);
    // Desk body
    pxRect(g, dx, dy, DESK_W, DESK_H, 0x8b6914);
    pxRect(g, dx + PX, dy + PX, DESK_W - PX * 2, DESK_H - PX * 2, 0xbe9860);
    // Legs
    pxRect(g, dx + PX, dy + DESK_H, PX * 2, 8, 0x7a5c14);
    pxRect(g, dx + DESK_W - PX * 3, dy + DESK_H, PX * 2, 8, 0x7a5c14);
    // Monitor
    pxRect(g, dx + 14, dy - 16, 22, 14, 0x222233);
    pxRect(g, dx + 16, dy - 14, 18, 10, working ? 0x3388cc : 0x334455);
    // Stand
    pxRect(g, dx + 23, dy - 2, 4, 4, 0x555566);
    // Keyboard
    if (working) {
      pxRect(g, dx + 12, dy + 4, 16, 4, 0x444455);
      pxRect(g, dx + 13, dy + 5, 14, 2, 0x555566);
    }
    parent.addChild(g);
  },

  drawChair(parent, cx, cy, color) {
    const g = new Graphics();
    // Seat
    pxRect(g, cx - 8, cy, 16, 4, color);
    // Back
    pxRect(g, cx - 8, cy - 10, 16, 10, color);
    pxRect(g, cx - 6, cy - 8, 12, 6, 0x000000, 0.1);
    // Legs
    pxRect(g, cx - 6, cy + 4, PX, 6, 0x555555);
    pxRect(g, cx + 4, cy + 4, PX, 6, 0x555555);
    parent.addChild(g);
  },

  drawBookshelf(parent, x, y) {
    const g = new Graphics();
    // Frame
    pxRect(g, x, y, 18, 24, 0x7a5c14);
    pxRect(g, x + PX, y + PX, 14, 22, 0xbe9860);
    // Shelves
    pxRect(g, x + PX, y + 8, 14, PX, 0x8b6914);
    pxRect(g, x + PX, y + 16, 14, PX, 0x8b6914);
    // Books
    pxRect(g, x + 4, y + 2, PX, 6, 0xcc3333);
    pxRect(g, x + 7, y + 2, PX, 6, 0x3366cc);
    pxRect(g, x + 10, y + 3, PX, 5, 0x33aa33);
    pxRect(g, x + 4, y + 10, PX, 6, 0xccaa33);
    pxRect(g, x + 7, y + 10, PX * 2, 6, 0x9933cc);
    pxRect(g, x + 12, y + 10, PX, 6, 0xcc6633);
    parent.addChild(g);
  },

  drawWhiteboard(parent, x, y) {
    const g = new Graphics();
    // Frame
    pxRect(g, x, y, 38, 24, 0x888899);
    pxRect(g, x + PX, y + PX, 34, 20, 0xeeeeee);
    // Content lines
    pxRect(g, x + 6, y + 6, 20, PX, 0x3366cc, 0.5);
    pxRect(g, x + 6, y + 10, 16, PX, 0xcc3333, 0.5);
    pxRect(g, x + 6, y + 14, 24, PX, 0x33aa33, 0.5);
    // Markers
    pxRect(g, x + 8, y + 20, PX, 4, 0x3366ff);
    pxRect(g, x + 12, y + 20, PX, 4, 0xff3333);
    parent.addChild(g);
  },

  drawPlant(parent, x, y, variant) {
    const g = new Graphics();
    // Pot
    pxRect(g, x - 4, y, 8, 6, 0xcc6633);
    pxRect(g, x - 6, y - 2, 12, PX * 2, 0xdd7744);
    // Soil
    pxRect(g, x - 4, y - PX, 8, PX, 0x553322);
    // Foliage
    const colors = [0x33aa55, 0x44bb66, 0x22aa44, 0x55cc77];
    const c = colors[variant % colors.length];
    if (variant % 4 === 1) {
      // Cactus
      pxRect(g, x - 2, y - 12, 4, 10, c);
      pxRect(g, x - 6, y - 8, 4, PX * 2, c);
      pxRect(g, x + 2, y - 6, 4, PX * 2, c);
    } else {
      // Bush
      pxRect(g, x - 6, y - 8, 12, 6, c);
      pxRect(g, x - 4, y - 12, 8, 4, c);
      pxRect(g, x - 2, y - 14, 4, PX, c);
    }
    parent.addChild(g);
  },

  drawSofa(parent, x, y, color) {
    const g = new Graphics();
    // Base
    pxRect(g, x - 16, y, 32, 12, color);
    // Back
    pxRect(g, x - 18, y - 8, 36, 8, color);
    pxRect(g, x - 16, y - 6, 32, 4, 0x000000, 0.1);
    // Arms
    pxRect(g, x - 18, y, 4, 12, color);
    pxRect(g, x + 14, y, 4, 12, color);
    // Cushion seam
    pxRect(g, x - PX, y + 2, PX, 8, 0x000000, 0.1);
    parent.addChild(g);
  },

  drawCoffeeMachine(parent, x, y) {
    const g = new Graphics();
    // Body
    pxRect(g, x - 6, y, 12, 16, 0x666677);
    pxRect(g, x - 4, y + 2, 8, 6, 0x444455);
    // Nozzle
    pxRect(g, x - PX, y + 8, PX * 2, 4, 0x888899);
    // Cup
    pxRect(g, x - 3, y + 12, 6, 4, 0xeeeeee);
    // Light
    pxRect(g, x + 2, y + 2, PX, PX, 0x33ff33);
    parent.addChild(g);
  },

  drawVendingMachine(parent, x, y) {
    const g = new Graphics();
    // Body
    pxRect(g, x - 10, y, 20, 30, 0x3355aa);
    pxRect(g, x - 8, y + 2, 16, 14, 0x77aadd);
    // Items
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const ic = [0xcc3333, 0x33cc33, 0xccaa33, 0x3333cc, 0xcc33cc, 0x33cccc, 0xcccccc, 0xff6633, 0x6633ff];
        pxRect(g, x - 6 + c * 6, y + 4 + r * 4, 4, PX * 2, ic[(r * 3 + c) % ic.length]);
      }
    }
    // Slot
    pxRect(g, x - 4, y + 22, 8, 6, 0x222233);
    parent.addChild(g);
  },

  drawHighTable(parent, x, y) {
    const g = new Graphics();
    pxRect(g, x - 10, y, 20, 4, 0xbe9860);
    pxRect(g, x - PX, y + 4, PX * 2, 14, 0x8b6914);
    pxRect(g, x - 6, y + 18, 12, PX, 0x8b6914);
    parent.addChild(g);
  },

  drawCoffeeTable(parent, x, y) {
    const g = new Graphics();
    pxRect(g, x - 8, y, 16, PX * 2, 0xbe9860);
    pxRect(g, x - 6, y + PX * 2, PX, 8, 0x8b6914);
    pxRect(g, x + 4, y + PX * 2, PX, 8, 0x8b6914);
    parent.addChild(g);
  },

  drawWindow(parent, x, y, w = 24, h = 18) {
    const g = new Graphics();
    pxRect(g, x, y, w, h, 0x8899bb);
    pxRect(g, x + PX, y + PX, w - PX * 2, h - PX * 2, 0xaaccee);
    // Cross bar
    pxRect(g, x + w / 2 - PX / 2, y, PX, h, 0x888899);
    pxRect(g, x, y + h / 2 - PX / 2, w, PX, 0x888899);
    // Sky highlight
    pxRect(g, x + PX * 2, y + PX * 2, 6, 4, 0xffffff, 0.15);
    parent.addChild(g);
  },

  drawWallClock(parent, x, y): WallClockVisual {
    const g = new Graphics();
    // Body
    pxRect(g, x - 6, y - 6, 12, 12, 0x888899);
    pxRect(g, x - 4, y - 4, 8, 8, 0xeeeeee);
    parent.addChild(g);

    // Hands as simple lines
    const hourHand = new Graphics();
    hourHand.rect(-PX / 2, -3, PX, 3).fill(0x333333);
    hourHand.position.set(x, y);
    parent.addChild(hourHand);

    const minuteHand = new Graphics();
    minuteHand.rect(-PX / 2, -4, PX, 4).fill(0x555555);
    minuteHand.position.set(x, y);
    parent.addChild(minuteHand);

    const secondHand = new Graphics();
    secondHand.rect(0, -4, 1, 4).fill(0xcc3333);
    secondHand.position.set(x, y);
    parent.addChild(secondHand);

    const visual: WallClockVisual = { hourHand, minuteHand, secondHand };
    applyWallClockTime(visual, new Date());
    return visual;
  },

  drawPictureFrame(parent, x, y) {
    const g = new Graphics();
    pxRect(g, x, y, 16, 12, 0x886614);
    pxRect(g, x + PX, y + PX, 12, 8, 0x4466aa);
    // Simple scene
    pxRect(g, x + PX, y + 6, 12, 4, 0x448844);
    pxRect(g, x + 10, y + 4, PX, PX, 0xffdd44);
    parent.addChild(g);
  },

  drawCeilingLight(parent, x, y, color) {
    const g = new Graphics();
    // Fixture
    pxRect(g, x - PX, y, PX * 2, PX * 2, 0x888899);
    pxRect(g, x - 4, y + PX * 2, 8, PX, 0xaaaabb);
    // Glow
    pxRect(g, x - 8, y + 6, 16, 4, color, 0.08);
    pxRect(g, x - 4, y + 4, 8, PX * 2, 0xfff5dd, 0.1);
    parent.addChild(g);
  },

  drawRug(parent, cx, cy, w, h, color) {
    const g = new Graphics();
    const rw = px(w);
    const rh = px(h);
    pxRect(g, cx - rw / 2, cy - rh / 2, rw, rh, color, 0.25);
    // Pixel border
    pxRect(g, cx - rw / 2, cy - rh / 2, rw, PX, color, 0.15);
    pxRect(g, cx - rw / 2, cy + rh / 2 - PX, rw, PX, color, 0.15);
    pxRect(g, cx - rw / 2, cy - rh / 2, PX, rh, color, 0.15);
    pxRect(g, cx + rw / 2 - PX, cy - rh / 2, PX, rh, color, 0.15);
    parent.addChild(g);
  },

  drawTrashCan(parent, x, y) {
    const g = new Graphics();
    pxRect(g, x - 4, y, 8, 10, 0x777788);
    pxRect(g, x - 4, y - PX, 8, PX, 0x888899);
    // Paper
    pxRect(g, x - 2, y - 4, 4, 4, 0xeeeeee);
    parent.addChild(g);
  },

  drawWaterCooler(parent, x, y) {
    const g = new Graphics();
    // Base
    pxRect(g, x - 4, y + 10, 8, 14, 0xcccccc);
    // Bottle
    pxRect(g, x - 3, y, 6, 12, 0x88ccff);
    pxRect(g, x - 2, y - 2, 4, PX * 2, 0x99ddff);
    // Tap
    pxRect(g, x + 4, y + 14, PX, PX * 2, 0x888899);
    parent.addChild(g);
  },
};
