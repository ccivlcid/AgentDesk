/* ================================================================== */
/*  FurnitureDrawer interface + Style Registry                         */
/* ================================================================== */

import type { Container } from "pixi.js";
import type { WallClockVisual } from "../model";

export type StyleKey = "default" | "pixel";

export interface FurnitureDrawer {
  /** Optional async init for asset preloading (SVG styles) */
  init?(): Promise<void>;

  // ── Furniture ──
  drawDesk(parent: Container, x: number, y: number, working: boolean): void;
  drawChair(parent: Container, x: number, y: number, color: number): void;
  drawBookshelf(parent: Container, x: number, y: number): void;
  drawWhiteboard(parent: Container, x: number, y: number): void;

  // ── Props/Decor ──
  drawPlant(parent: Container, x: number, y: number, variant: number): void;
  drawSofa(parent: Container, x: number, y: number, color: number): void;
  drawCoffeeMachine(parent: Container, x: number, y: number): void;
  drawVendingMachine(parent: Container, x: number, y: number): void;
  drawHighTable(parent: Container, x: number, y: number): void;
  drawCoffeeTable(parent: Container, x: number, y: number): void;

  // ── Architecture/Environment ──
  drawWindow(parent: Container, x: number, y: number, w?: number, h?: number): void;
  drawWallClock(parent: Container, x: number, y: number): WallClockVisual;
  drawPictureFrame(parent: Container, x: number, y: number): void;
  drawCeilingLight(parent: Container, x: number, y: number, color: number): void;
  drawRug(parent: Container, cx: number, cy: number, w: number, h: number, color: number): void;
  drawTrashCan(parent: Container, x: number, y: number): void;
  drawWaterCooler(parent: Container, x: number, y: number): void;
}

import { defaultDrawer } from "./default-drawer";
import { pixelDrawer } from "./pixel-drawer";

export const STYLE_REGISTRY: Record<StyleKey, FurnitureDrawer> = {
  default: defaultDrawer,
  pixel: pixelDrawer,
};

export function getDrawer(key: string): FurnitureDrawer {
  return STYLE_REGISTRY[key as StyleKey] ?? STYLE_REGISTRY.default;
}

/* ── Style option definitions for UI ── */

export interface StyleOption {
  key: StyleKey;
  label: { ko: string; en: string; ja: string; zh: string };
  description: { ko: string; en: string; ja: string; zh: string };
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    key: "default",
    label: { ko: "\uAE30\uBCF8", en: "Default", ja: "\u30C7\u30D5\u30A9\u30EB\u30C8", zh: "\u9ED8\u8BA4" },
    description: { ko: "\uB530\uB73B\uD55C \uC6B0\uB4DC\uD1A4 \uC0AC\uBB34\uC2E4", en: "Warm wood-tone office", ja: "\u6E29\u304B\u3044\u30A6\u30C3\u30C9\u30C8\u30FC\u30F3", zh: "\u6E29\u6696\u6728\u8D28\u529E\u516C\u5BA4" },
  },
  {
    key: "pixel",
    label: { ko: "\uD53D\uC140", en: "Pixel", ja: "\u30D4\u30AF\u30BB\u30EB", zh: "\u50CF\u7D20" },
    description: { ko: "8\uBE44\uD2B8 \uB808\uD2B8\uB85C \uB3C4\uD2B8\uD48D", en: "8-bit retro dot style", ja: "8\u30D3\u30C3\u30C8\u30EC\u30C8\u30ED", zh: "8\u4F4D\u50CF\u7D20\u98CE" },
  },
];

/* ── Persistence ── */

const STORAGE_KEY = "agentdesk_style_theme";

export function loadStylePreference(): StyleKey {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "default" || val === "pixel") return val;
  } catch {}
  return "default";
}

export function saveStylePreference(key: StyleKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {}
  window.dispatchEvent(new CustomEvent("agentdesk_style_change", { detail: key }));
}
