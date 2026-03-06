/* ================================================================== */
/*  SVG Drawer Base — shared utilities for SVG-based styles            */
/* ================================================================== */

import { Assets, Sprite, Container, Graphics, type Texture } from "pixi.js";
import type { WallClockVisual } from "../model";
import { DESK_W } from "../model";
import { applyWallClockTime } from "../drawing-core";
import type { FurnitureDrawer } from "./index";

export interface ClockHandColors {
  hour: number;
  minute: number;
  second: number;
}

const SVG_KEYS = [
  "desk", "monitorOn", "monitorOff", "chair", "bookshelf", "whiteboard",
  "plant", "sofa", "coffeeMachine", "vendingMachine", "highTable",
  "coffeeTable", "window", "clockFace", "pictureFrame", "ceilingLight",
  "trashCan", "waterCooler",
] as const;

const FILE_MAP: Record<string, string> = {
  desk: "desk.svg", monitorOn: "monitor-on.svg", monitorOff: "monitor-off.svg",
  chair: "chair.svg", bookshelf: "bookshelf.svg", whiteboard: "whiteboard.svg",
  plant: "plant.svg", sofa: "sofa.svg", coffeeMachine: "coffee-machine.svg",
  vendingMachine: "vending-machine.svg", highTable: "high-table.svg",
  coffeeTable: "coffee-table.svg", window: "window.svg", clockFace: "clock-face.svg",
  pictureFrame: "picture-frame.svg", ceilingLight: "ceiling-light.svg",
  trashCan: "trash-can.svg", waterCooler: "water-cooler.svg",
};

export function createSvgDrawer(
  basePath: string,
  clockHands: ClockHandColors,
  opts?: {
    monitorX?: number; monitorY?: number; monitorW?: number; monitorH?: number;
    deskSpriteH?: number; clockRadius?: number; rugAlpha?: number;
  },
): FurnitureDrawer {
  const textures: Record<string, Texture> = {};
  let loadPromise: Promise<void> | null = null;
  let loaded = false;

  const monX = opts?.monitorX ?? 10;
  const monY = opts?.monitorY ?? -18;
  const monW = opts?.monitorW ?? 28;
  const monH = opts?.monitorH ?? 18;
  const deskSprH = opts?.deskSpriteH ?? 36;
  const clockR = opts?.clockRadius ?? 6;
  const rugA = opts?.rugAlpha ?? 0.2;

  function doLoad(): Promise<void> {
    if (loaded) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = Promise.all(
      SVG_KEYS.map(async (key) => {
        try {
          textures[key] = await Assets.load(`${basePath}/${FILE_MAP[key]}`);
        } catch { /* SVG load failure — skip */ }
      }),
    ).then(() => { loaded = true; });
    return loadPromise;
  }

  function tex(key: string): Texture | undefined {
    return textures[key];
  }

  return {
    init: doLoad,

    drawDesk(parent, dx, dy, working) {
      const c = new Container();

      const deskTex = tex("desk");
      if (deskTex) {
        const desk = new Sprite(deskTex);
        desk.width = DESK_W;
        desk.height = deskSprH;
        desk.position.set(0, 0);
        c.addChild(desk);
      }

      const monTex = working ? tex("monitorOn") : tex("monitorOff");
      if (monTex) {
        const mon = new Sprite(monTex);
        mon.width = monW;
        mon.height = monH;
        mon.position.set(monX, monY);
        c.addChild(mon);
      }

      c.position.set(dx, dy);
      parent.addChild(c);
      return c;
    },

    drawChair(parent, cx, cy, color) {
      const t = tex("chair");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 20; s.height = 28;
      s.anchor.set(0.5, 0.35);
      s.position.set(cx, cy);
      s.tint = color;
      parent.addChild(s);
    },

    drawBookshelf(parent, x, y) {
      const t = tex("bookshelf");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 20; s.height = 26;
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawWhiteboard(parent, x, y) {
      const t = tex("whiteboard");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 40; s.height = 24;
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawPlant(parent, x, y, _variant) {
      const t = tex("plant");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 16; s.height = 22;
      s.anchor.set(0.5, 1);
      s.position.set(x, y + 7);
      parent.addChild(s);
    },

    drawSofa(parent, x, y, color) {
      const t = tex("sofa");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 40; s.height = 24;
      s.anchor.set(0.5, 0.4);
      s.position.set(x, y);
      s.tint = color;
      parent.addChild(s);
    },

    drawCoffeeMachine(parent, x, y) {
      const t = tex("coffeeMachine");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 14; s.height = 22;
      s.anchor.set(0.5, 0);
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawVendingMachine(parent, x, y) {
      const t = tex("vendingMachine");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 22; s.height = 32;
      s.anchor.set(0.5, 0);
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawHighTable(parent, x, y) {
      const t = tex("highTable");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 24; s.height = 22;
      s.anchor.set(0.5, 0);
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawCoffeeTable(parent, x, y) {
      const t = tex("coffeeTable");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 20; s.height = 14;
      s.anchor.set(0.5, 0);
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawWindow(parent, x, y, w = 26, h = 20) {
      const t = tex("window");
      if (!t) return;
      const s = new Sprite(t);
      s.width = w; s.height = h;
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawWallClock(parent, x, y): WallClockVisual {
      const t = tex("clockFace");
      if (t) {
        const face = new Sprite(t);
        face.width = clockR * 2 + 4;
        face.height = clockR * 2 + 4;
        face.anchor.set(0.5, 0.5);
        face.position.set(x, y);
        parent.addChild(face);
      }

      const hourHand = new Graphics();
      hourHand.rect(-0.6, -clockR * 0.5, 1.2, clockR * 0.5).fill(clockHands.hour);
      hourHand.position.set(x, y);
      parent.addChild(hourHand);

      const minuteHand = new Graphics();
      minuteHand.rect(-0.4, -clockR * 0.7, 0.8, clockR * 0.7).fill(clockHands.minute);
      minuteHand.position.set(x, y);
      parent.addChild(minuteHand);

      const secondHand = new Graphics();
      secondHand.rect(-0.2, -clockR * 0.8, 0.4, clockR * 0.8).fill(clockHands.second);
      secondHand.position.set(x, y);
      parent.addChild(secondHand);

      const visual: WallClockVisual = { hourHand, minuteHand, secondHand };
      applyWallClockTime(visual, new Date());
      return visual;
    },

    drawPictureFrame(parent, x, y) {
      const t = tex("pictureFrame");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 16; s.height = 12;
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawCeilingLight(parent, x, y, _color) {
      const t = tex("ceilingLight");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 20; s.height = 10;
      s.anchor.set(0.5, 0);
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawRug(parent, cx, cy, w, h, color) {
      const g = new Graphics();
      g.roundRect(cx - w / 2, cy - h / 2, w, h, 2).fill({ color, alpha: rugA });
      g.roundRect(cx - w / 2, cy - h / 2, w, h, 2).stroke({ width: 0.5, color, alpha: rugA * 0.6 });
      parent.addChild(g);
    },

    drawTrashCan(parent, x, y) {
      const t = tex("trashCan");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 10; s.height = 14;
      s.anchor.set(0.5, 0);
      s.position.set(x, y);
      parent.addChild(s);
    },

    drawWaterCooler(parent, x, y) {
      const t = tex("waterCooler");
      if (!t) return;
      const s = new Sprite(t);
      s.width = 12; s.height = 28;
      s.anchor.set(0.5, 0);
      s.position.set(x, y);
      parent.addChild(s);
    },
  };
}
