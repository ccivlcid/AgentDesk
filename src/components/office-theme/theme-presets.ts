import type { RoomTheme } from "../../types";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

export interface OfficeThemePreset {
  key: string;
  name: { ko: string; en: string; ja: string; zh: string };
  description: { ko: string; en: string; ja: string; zh: string };
  themes: Record<string, RoomTheme>;
  preview: { primary: number; secondary: number; wall: number; accent: number };
}

/* ================================================================== */
/*  Room keys — all 8 rooms                                            */
/* ================================================================== */

// dev, design, planning, operations, qa, devsecops, ceoOffice, breakRoom

/* ================================================================== */
/*  Builtin Theme Presets (8)                                          */
/* ================================================================== */

export const BUILTIN_THEME_PRESETS: OfficeThemePreset[] = [
  {
    key: "classic_warm",
    name: { ko: "클래식 웜", en: "Classic Warm", ja: "クラシックウォーム", zh: "经典暖色" },
    description: { ko: "따뜻한 우드/골드톤 기본 사무실", en: "Warm wood/gold tone office", ja: "暖かい木目調オフィス", zh: "温暖木质色调办公室" },
    themes: {
      dev:        { floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7, accent: 0x5a9fd4 },
      design:     { floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad, accent: 0x9a6fc4 },
      planning:   { floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871, accent: 0xd4a85a },
      operations: { floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89, accent: 0x5ac48a },
      qa:         { floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979, accent: 0xd46a6a },
      devsecops:  { floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871, accent: 0xd4885a },
      ceoOffice:  { floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243, accent: 0xa77d0c },
      breakRoom:  { floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83, accent: 0xf0c878 },
    },
    preview: { primary: 0xf0e1c5, secondary: 0xd8e8f5, wall: 0x998243, accent: 0xa77d0c },
  },
  {
    key: "modern_minimal",
    name: { ko: "모던 미니멀", en: "Modern Minimal", ja: "モダンミニマル", zh: "现代简约" },
    description: { ko: "쿨그레이/화이트 깔끔한 오피스", en: "Cool gray/white clean office", ja: "クールグレーオフィス", zh: "冷灰简洁办公室" },
    themes: {
      dev:        { floor1: 0xf0f2f5, floor2: 0xe8eaed, wall: 0x8898a8, accent: 0x4a9bc7 },
      design:     { floor1: 0xf2f0f5, floor2: 0xeae8ed, wall: 0x9888a8, accent: 0x8a6ab7 },
      planning:   { floor1: 0xf2f0ec, floor2: 0xeae8e4, wall: 0xa89888, accent: 0xb79a6a },
      operations: { floor1: 0xecf2ef, floor2: 0xe4eae7, wall: 0x88a898, accent: 0x6ab79a },
      qa:         { floor1: 0xf2ecec, floor2: 0xeae4e4, wall: 0xa88888, accent: 0xb76a6a },
      devsecops:  { floor1: 0xf2efec, floor2: 0xeae7e4, wall: 0xa89488, accent: 0xb7886a },
      ceoOffice:  { floor1: 0xf0f0f0, floor2: 0xe8e8e8, wall: 0x909090, accent: 0x607080 },
      breakRoom:  { floor1: 0xf5f3f0, floor2: 0xedebe8, wall: 0x989088, accent: 0xb0a898 },
    },
    preview: { primary: 0xf0f2f5, secondary: 0xe8eaed, wall: 0x8898a8, accent: 0x4a9bc7 },
  },
  {
    key: "startup_neon",
    name: { ko: "스타트업 네온", en: "Startup Neon", ja: "スタートアップネオン", zh: "创业霓虹" },
    description: { ko: "다크 배경 + 네온 포인트", en: "Dark background + neon accents", ja: "ダーク背景+ネオン", zh: "深色背景+霓虹" },
    themes: {
      dev:        { floor1: 0x2a3040, floor2: 0x252b38, wall: 0x1a2030, accent: 0x00d4ff },
      design:     { floor1: 0x302a40, floor2: 0x2b2538, wall: 0x201a30, accent: 0xd400ff },
      planning:   { floor1: 0x2a3530, floor2: 0x253028, wall: 0x1a2520, accent: 0x00ff88 },
      operations: { floor1: 0x2a3038, floor2: 0x252b32, wall: 0x1a2028, accent: 0x00ffd4 },
      qa:         { floor1: 0x352a30, floor2: 0x302528, wall: 0x251a20, accent: 0xff4488 },
      devsecops:  { floor1: 0x35302a, floor2: 0x302b25, wall: 0x25201a, accent: 0xff8800 },
      ceoOffice:  { floor1: 0x282830, floor2: 0x222228, wall: 0x181820, accent: 0xffdd00 },
      breakRoom:  { floor1: 0x2d2d35, floor2: 0x28282f, wall: 0x1e1e25, accent: 0x88ddff },
    },
    preview: { primary: 0x2a3040, secondary: 0x252b38, wall: 0x1a2030, accent: 0x00d4ff },
  },
  {
    key: "nature_green",
    name: { ko: "네이처 그린", en: "Nature Green", ja: "ネイチャーグリーン", zh: "自然绿意" },
    description: { ko: "숲속 오피스, 자연풍 인테리어", en: "Forest office, nature vibe", ja: "森のオフィス", zh: "森林办公室" },
    themes: {
      dev:        { floor1: 0xd8e8d0, floor2: 0xcee0c6, wall: 0x6a9a60, accent: 0x4caf50 },
      design:     { floor1: 0xe2ddd8, floor2: 0xdad5ce, wall: 0x8a8575, accent: 0x8d6e63 },
      planning:   { floor1: 0xe8e5d0, floor2: 0xe0ddc6, wall: 0x9a9560, accent: 0xaaa040 },
      operations: { floor1: 0xd0e8d5, floor2: 0xc6e0cc, wall: 0x609a6e, accent: 0x388e3c },
      qa:         { floor1: 0xe0d8d0, floor2: 0xd8cec6, wall: 0x8a7a60, accent: 0xc06030 },
      devsecops:  { floor1: 0xdde2d0, floor2: 0xd5dac6, wall: 0x7a8a60, accent: 0x689f38 },
      ceoOffice:  { floor1: 0xddd8c8, floor2: 0xd5d0c0, wall: 0x7a7050, accent: 0x6d5d00 },
      breakRoom:  { floor1: 0xe5e0d5, floor2: 0xddd8cc, wall: 0x908878, accent: 0xa09060 },
    },
    preview: { primary: 0xd8e8d0, secondary: 0xcee0c6, wall: 0x6a9a60, accent: 0x4caf50 },
  },
  {
    key: "cozy_cafe",
    name: { ko: "코지 카페", en: "Cozy Cafe", ja: "コージーカフェ", zh: "温馨咖啡厅" },
    description: { ko: "테라코타/베이지 카페풍", en: "Terracotta/beige cafe style", ja: "テラコッタカフェ風", zh: "陶土色咖啡风" },
    themes: {
      dev:        { floor1: 0xf0e0cc, floor2: 0xe8d8c2, wall: 0xa08060, accent: 0xc07030 },
      design:     { floor1: 0xf0dcd5, floor2: 0xe8d4cc, wall: 0xa07868, accent: 0xc06050 },
      planning:   { floor1: 0xf0e5c5, floor2: 0xe8ddbb, wall: 0xa09060, accent: 0xd0a040 },
      operations: { floor1: 0xe5e0cc, floor2: 0xddd8c2, wall: 0x888060, accent: 0x80a050 },
      qa:         { floor1: 0xf0d8cc, floor2: 0xe8d0c2, wall: 0xa07060, accent: 0xd06040 },
      devsecops:  { floor1: 0xf0ddc5, floor2: 0xe8d5bb, wall: 0xa08560, accent: 0xc08030 },
      ceoOffice:  { floor1: 0xe8d8b8, floor2: 0xe0d0b0, wall: 0x907850, accent: 0x8b6914 },
      breakRoom:  { floor1: 0xf0e2c8, floor2: 0xe8dac0, wall: 0x988870, accent: 0xc89850 },
    },
    preview: { primary: 0xf0e0cc, secondary: 0xe8d8c2, wall: 0xa08060, accent: 0xc07030 },
  },
  {
    key: "cyberpunk",
    name: { ko: "사이버펑크", en: "Cyberpunk", ja: "サイバーパンク", zh: "赛博朋克" },
    description: { ko: "딥 퍼플/일렉트릭 바이올렛", en: "Deep purple / electric violet", ja: "ディープパープル", zh: "深紫电紫" },
    themes: {
      dev:        { floor1: 0x1e1430, floor2: 0x1a1028, wall: 0x140a20, accent: 0x8844ff },
      design:     { floor1: 0x281430, floor2: 0x221028, wall: 0x1c0a20, accent: 0xff44aa },
      planning:   { floor1: 0x201820, floor2: 0x1c141c, wall: 0x140e14, accent: 0xccaa00 },
      operations: { floor1: 0x142028, floor2: 0x101c22, wall: 0x0a141c, accent: 0x00ccaa },
      qa:         { floor1: 0x281420, floor2: 0x22101c, wall: 0x1c0a14, accent: 0xff2266 },
      devsecops:  { floor1: 0x201420, floor2: 0x1c101c, wall: 0x140a14, accent: 0xaa44ff },
      ceoOffice:  { floor1: 0x1a1425, floor2: 0x161020, wall: 0x100a18, accent: 0xffaa00 },
      breakRoom:  { floor1: 0x1c1828, floor2: 0x181422, wall: 0x120e1a, accent: 0x66aaff },
    },
    preview: { primary: 0x1e1430, secondary: 0x1a1028, wall: 0x140a20, accent: 0x8844ff },
  },
  {
    key: "sakura",
    name: { ko: "사쿠라", en: "Sakura", ja: "サクラ", zh: "樱花" },
    description: { ko: "소프트 핑크/로즈/체리블로섬", en: "Soft pink / rose / cherry blossom", ja: "ソフトピンク/桜", zh: "柔粉/玫瑰/樱花" },
    themes: {
      dev:        { floor1: 0xf8e8ef, floor2: 0xf2e0e8, wall: 0xc090a8, accent: 0xe06088 },
      design:     { floor1: 0xf5e5f0, floor2: 0xefdde8, wall: 0xb888a8, accent: 0xc860a0 },
      planning:   { floor1: 0xf8ece5, floor2: 0xf2e4dd, wall: 0xc0a088, accent: 0xd89060 },
      operations: { floor1: 0xedf0e8, floor2: 0xe5e8e0, wall: 0xa0b090, accent: 0x80b070 },
      qa:         { floor1: 0xf8e5e5, floor2: 0xf2dddd, wall: 0xc08888, accent: 0xe06060 },
      devsecops:  { floor1: 0xf5eae5, floor2: 0xefe2dd, wall: 0xb89888, accent: 0xd08060 },
      ceoOffice:  { floor1: 0xf5e5e0, floor2: 0xefddd8, wall: 0xb89098, accent: 0xcc6688 },
      breakRoom:  { floor1: 0xf8eee8, floor2: 0xf2e6e0, wall: 0xc0a898, accent: 0xdda888 },
    },
    preview: { primary: 0xf8e8ef, secondary: 0xf2e0e8, wall: 0xc090a8, accent: 0xe06088 },
  },
  {
    key: "ocean_breeze",
    name: { ko: "오션 브리즈", en: "Ocean Breeze", ja: "オーシャンブリーズ", zh: "海洋微风" },
    description: { ko: "샌드/오션블루/코랄 해변풍", en: "Sand / ocean blue / coral beach", ja: "砂浜/オーシャンブルー", zh: "沙滩/海蓝/珊瑚" },
    themes: {
      dev:        { floor1: 0xd8e8f0, floor2: 0xd0e0ea, wall: 0x5080a0, accent: 0x2090c0 },
      design:     { floor1: 0xe0e0e8, floor2: 0xd8d8e0, wall: 0x7878a0, accent: 0x5060c0 },
      planning:   { floor1: 0xf0e8d8, floor2: 0xe8e0d0, wall: 0xa09068, accent: 0xc0a040 },
      operations: { floor1: 0xd0e8e0, floor2: 0xc8e0d8, wall: 0x5a9888, accent: 0x20a080 },
      qa:         { floor1: 0xf0ddd8, floor2: 0xe8d5d0, wall: 0xa07868, accent: 0xe06040 },
      devsecops:  { floor1: 0xe0e8e0, floor2: 0xd8e0d8, wall: 0x7a9878, accent: 0x50a060 },
      ceoOffice:  { floor1: 0xe8e0d0, floor2: 0xe0d8c8, wall: 0x887858, accent: 0xa08020 },
      breakRoom:  { floor1: 0xf0ead8, floor2: 0xe8e2d0, wall: 0x989078, accent: 0xc0a868 },
    },
    preview: { primary: 0xd8e8f0, secondary: 0xd0e0ea, wall: 0x5080a0, accent: 0x2090c0 },
  },
];
