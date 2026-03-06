/* ================================================================== */
/*  FurnitureDrawer interface + Style Registry                         */
/* ================================================================== */

import type { Container } from "pixi.js";
import type { WallClockVisual } from "../model";

export type StyleKey = "default" | "pixel" | "business" | "retro" | "cyber";

export interface FurnitureDrawer {
  /** Optional async init for asset preloading (SVG styles) */
  init?(): Promise<void>;

  // ── Furniture ──
  drawDesk(parent: Container, x: number, y: number, working: boolean): Container;
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
import { businessDrawer } from "./business-drawer";
import { retroDrawer } from "./retro-drawer";
import { cyberDrawer } from "./cyber-drawer";

export const STYLE_REGISTRY: Record<StyleKey, FurnitureDrawer> = {
  default: defaultDrawer,
  pixel: pixelDrawer,
  business: businessDrawer,
  retro: retroDrawer,
  cyber: cyberDrawer,
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
    label: { ko: "기본", en: "Default", ja: "デフォルト", zh: "默认" },
    description: { ko: "따뜻한 우드톤 사무실", en: "Warm wood-tone office", ja: "温かいウッドトーン", zh: "温暖木质办公室" },
  },
  {
    key: "pixel",
    label: { ko: "픽셀", en: "Pixel", ja: "ピクセル", zh: "像素" },
    description: { ko: "8비트 레트로 도트풍", en: "8-bit retro dot style", ja: "8ビットレトロ", zh: "8位像素风" },
  },
  {
    key: "business",
    label: { ko: "비즈니스", en: "Business", ja: "ビジネス", zh: "商务" },
    description: { ko: "모던 미니멀 오피스", en: "Modern minimal office", ja: "モダンミニマル", zh: "现代简约办公室" },
  },
  {
    key: "retro",
    label: { ko: "레트로", en: "Retro", ja: "レトロ", zh: "复古" },
    description: { ko: "70년대 빈티지 스타일", en: "70s vintage style", ja: "70年代ヴィンテージ", zh: "70年代复古风" },
  },
  {
    key: "cyber",
    label: { ko: "사이버", en: "Cyber", ja: "サイバー", zh: "赛博" },
    description: { ko: "네온 글로우 미래풍", en: "Neon glow futuristic", ja: "ネオングロー未来風", zh: "霓虹未来风" },
  },
];

/* ── Persistence ── */

const STORAGE_KEY = "agentdesk_style_theme";

const VALID_STYLES: readonly string[] = ["default", "pixel", "business", "retro", "cyber"];

export function loadStylePreference(): StyleKey {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val && VALID_STYLES.includes(val)) return val as StyleKey;
  } catch {}
  return "default";
}

export function saveStylePreference(key: StyleKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {}
  window.dispatchEvent(new CustomEvent("agentdesk_style_change", { detail: key }));
}
