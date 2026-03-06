/* ================================================================== */
/*  Room Decoration Customization                                      */
/* ================================================================== */

export type WallDecorType = "whiteboard" | "picture" | "poster" | "none";
export type PlantType = "default" | "tall" | "cactus" | "flower" | "none";
export type FloorDecorType = "rug" | "carpet" | "none";
export type DeskAccessoryType = "default" | "lamp" | "mug" | "figurine" | "none";
export type LightingMood = "default" | "warm" | "cool" | "dim";

export interface RoomDecoration {
  wallDecor: WallDecorType;
  plantType: PlantType;
  floorDecor: FloorDecorType;
  deskAccessory: DeskAccessoryType;
  lighting: LightingMood;
}

const STORAGE_KEY = "agentdesk_room_decorations";

const DEFAULT_DECORATION: RoomDecoration = {
  wallDecor: "whiteboard",
  plantType: "default",
  floorDecor: "rug",
  deskAccessory: "default",
  lighting: "default",
};

/* ── Option configs ── */

export interface DecoOption<T extends string> {
  key: T;
  emoji: string;
  label: { ko: string; en: string; ja: string; zh: string };
}

export const WALL_DECOR_OPTIONS: DecoOption<WallDecorType>[] = [
  { key: "whiteboard", emoji: "\u{1F4CB}", label: { ko: "\uD654\uC774\uD2B8\uBCF4\uB4DC", en: "Whiteboard", ja: "\u30DB\u30EF\u30A4\u30C8\u30DC\u30FC\u30C9", zh: "\u767D\u677F" } },
  { key: "picture", emoji: "\u{1F5BC}\uFE0F", label: { ko: "\uC561\uC790", en: "Picture", ja: "\u7D75\u753B", zh: "\u753B\u6846" } },
  { key: "poster", emoji: "\u{1F4F0}", label: { ko: "\uD3EC\uC2A4\uD130", en: "Poster", ja: "\u30DD\u30B9\u30BF\u30FC", zh: "\u6D77\u62A5" } },
  { key: "none", emoji: "\u2205", label: { ko: "\uC5C6\uC74C", en: "None", ja: "\u306A\u3057", zh: "\u65E0" } },
];

export const PLANT_OPTIONS: DecoOption<PlantType>[] = [
  { key: "default", emoji: "\u{1F331}", label: { ko: "\uAE30\uBCF8", en: "Default", ja: "\u30C7\u30D5\u30A9\u30EB\u30C8", zh: "\u9ED8\u8BA4" } },
  { key: "tall", emoji: "\u{1F334}", label: { ko: "\uD070 \uD654\uBD84", en: "Tall", ja: "\u5927\u304D\u3044", zh: "\u5927\u578B" } },
  { key: "cactus", emoji: "\u{1F335}", label: { ko: "\uC120\uC778\uC7A5", en: "Cactus", ja: "\u30B5\u30DC\u30C6\u30F3", zh: "\u4ED9\u4EBA\u638C" } },
  { key: "flower", emoji: "\u{1F33A}", label: { ko: "\uAF43", en: "Flower", ja: "\u82B1", zh: "\u82B1" } },
  { key: "none", emoji: "\u2205", label: { ko: "\uC5C6\uC74C", en: "None", ja: "\u306A\u3057", zh: "\u65E0" } },
];

export const FLOOR_DECOR_OPTIONS: DecoOption<FloorDecorType>[] = [
  { key: "rug", emoji: "\u{1F9F6}", label: { ko: "\uB7EC\uADF8", en: "Rug", ja: "\u30E9\u30B0", zh: "\u5730\u6BEF" } },
  { key: "carpet", emoji: "\u{1F7E5}", label: { ko: "\uCE74\uD3AB", en: "Carpet", ja: "\u30AB\u30FC\u30DA\u30C3\u30C8", zh: "\u5730\u6BEF" } },
  { key: "none", emoji: "\u2205", label: { ko: "\uC5C6\uC74C", en: "None", ja: "\u306A\u3057", zh: "\u65E0" } },
];

export const DESK_ACCESSORY_OPTIONS: DecoOption<DeskAccessoryType>[] = [
  { key: "default", emoji: "\u{1F4BB}", label: { ko: "\uAE30\uBCF8", en: "Default", ja: "\u30C7\u30D5\u30A9\u30EB\u30C8", zh: "\u9ED8\u8BA4" } },
  { key: "lamp", emoji: "\u{1F4A1}", label: { ko: "\uB7A8\uD504", en: "Lamp", ja: "\u30E9\u30F3\u30D7", zh: "\u53F0\u706F" } },
  { key: "mug", emoji: "\u2615", label: { ko: "\uBA38\uADF8\uCEF5", en: "Mug", ja: "\u30DE\u30B0\u30AB\u30C3\u30D7", zh: "\u9A6C\u514B\u676F" } },
  { key: "figurine", emoji: "\u{1F3AE}", label: { ko: "\uD53C\uADDC\uC5B4", en: "Figurine", ja: "\u30D5\u30A3\u30AE\u30E5\u30A2", zh: "\u624B\u529E" } },
  { key: "none", emoji: "\u2205", label: { ko: "\uC5C6\uC74C", en: "None", ja: "\u306A\u3057", zh: "\u65E0" } },
];

export const LIGHTING_OPTIONS: DecoOption<LightingMood>[] = [
  { key: "default", emoji: "\u{1F4A1}", label: { ko: "\uAE30\uBCF8", en: "Default", ja: "\u30C7\u30D5\u30A9\u30EB\u30C8", zh: "\u9ED8\u8BA4" } },
  { key: "warm", emoji: "\u{1F31F}", label: { ko: "\uB530\uB73B\uD55C", en: "Warm", ja: "\u6E29\u304B\u3044", zh: "\u6E29\u6696" } },
  { key: "cool", emoji: "\u{1F4A0}", label: { ko: "\uCC28\uAC00\uC6B4", en: "Cool", ja: "\u30AF\u30FC\u30EB", zh: "\u51B7\u8272" } },
  { key: "dim", emoji: "\u{1F319}", label: { ko: "\uC5B4\uB450\uC6B4", en: "Dim", ja: "\u6697\u3044", zh: "\u6697\u6DE1" } },
];

/* ── Persistence ── */

export function loadRoomDecorations(): Record<string, RoomDecoration> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveRoomDecorations(decorations: Record<string, RoomDecoration>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decorations));
  } catch {}
  window.dispatchEvent(new CustomEvent("agentdesk_room_decor_change", { detail: decorations }));
}

export function getRoomDecoration(decorations: Record<string, RoomDecoration>, deptId: string): RoomDecoration {
  return decorations[deptId] ?? { ...DEFAULT_DECORATION };
}

export function getDefaultDecoration(): RoomDecoration {
  return { ...DEFAULT_DECORATION };
}

/* ── Lighting color modifier ── */

export function getLightingTint(mood: LightingMood): { glowColor: number; glowAlpha: number } {
  switch (mood) {
    case "warm": return { glowColor: 0xffd080, glowAlpha: 0.08 };
    case "cool": return { glowColor: 0x80c0ff, glowAlpha: 0.06 };
    case "dim": return { glowColor: 0x404060, glowAlpha: 0.12 };
    default: return { glowColor: 0, glowAlpha: 0 };
  }
}
