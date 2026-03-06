/* ================================================================== */
/*  Furniture Catalog — collectible items for room customization       */
/* ================================================================== */

export type FurnitureCategory = "desk" | "seating" | "decor" | "appliance" | "special";

export interface FurnitureItemDef {
  id: string;
  category: FurnitureCategory;
  emoji: string;
  label: { ko: string; en: string; ja: string; zh: string };
  description: { ko: string; en: string; ja: string; zh: string };
  /** Room types where this item can be placed */
  allowedRooms: ("department" | "ceoOffice" | "breakRoom")[];
  /** Max count per room */
  maxPerRoom: number;
  /** Approximate size in grid units for editor */
  gridW: number;
  gridH: number;
}

/** Where a catalog furniture is placed */
export interface FurniturePlacement {
  itemId: string;
  /** Slot index fallback (0-based) */
  slot: number;
  /** X offset relative to room origin (px). Undefined = auto-slot */
  x?: number;
  /** Y offset relative to room origin (px). Undefined = auto-slot */
  y?: number;
}

/** Per-room furniture layout */
export type FurnitureLayout = Record<string, FurniturePlacement[]>; // key = roomId

/** Snap value to TILE grid */
const GRID = 10;
export function snapToGrid(v: number): number {
  return Math.round(v / GRID) * GRID;
}

/* ── Catalog items ── */

export const FURNITURE_CATEGORIES: Record<FurnitureCategory, { emoji: string; label: { ko: string; en: string; ja: string; zh: string } }> = {
  desk:      { emoji: "\u{1F4BC}", label: { ko: "\uCC45\uC0C1", en: "Desks", ja: "\u30C7\u30B9\u30AF", zh: "\u684C\u5B50" } },
  seating:   { emoji: "\u{1FA91}", label: { ko: "\uC758\uC790", en: "Seating", ja: "\u6905\u5B50", zh: "\u5EA7\u6905" } },
  decor:     { emoji: "\u{1F3A8}", label: { ko: "\uC7A5\uC2DD", en: "Decor", ja: "\u88C5\u98FE", zh: "\u88C5\u9970" } },
  appliance: { emoji: "\u2615", label: { ko: "\uAC00\uC804", en: "Appliances", ja: "\u5BB6\u96FB", zh: "\u5BB6\u7535" } },
  special:   { emoji: "\u2B50", label: { ko: "\uD2B9\uC218", en: "Special", ja: "\u7279\u6B8A", zh: "\u7279\u6B8A" } },
};

export const CATALOG_ITEMS: FurnitureItemDef[] = [
  // ── Decor ──
  {
    id: "aquarium",
    category: "decor",
    emoji: "\u{1F420}",
    label: { ko: "\uC218\uC871\uAD00", en: "Aquarium", ja: "\u6C34\u69FD", zh: "\u9C7C\u7F38" },
    description: { ko: "\uC791\uC740 \uD0C1\uC0C1 \uC218\uC871\uAD00", en: "Small desk aquarium", ja: "\u5C0F\u3055\u306A\u5353\u4E0A\u6C34\u69FD", zh: "\u5C0F\u578B\u684C\u9762\u9C7C\u7F38" },
    allowedRooms: ["department", "ceoOffice", "breakRoom"],
    maxPerRoom: 1,
    gridW: 20,
    gridH: 16,
  },
  {
    id: "globe",
    category: "decor",
    emoji: "\u{1F30D}",
    label: { ko: "\uC9C0\uAD6C\uBCF8", en: "Globe", ja: "\u5730\u7403\u5100", zh: "\u5730\u7403\u4EEA" },
    description: { ko: "\uD68C\uC804\uD558\uB294 \uC9C0\uAD6C\uBCF8", en: "Spinning globe", ja: "\u56DE\u308B\u5730\u7403\u5100", zh: "\u65CB\u8F6C\u5730\u7403\u4EEA" },
    allowedRooms: ["department", "ceoOffice"],
    maxPerRoom: 1,
    gridW: 14,
    gridH: 18,
  },
  {
    id: "led_sign",
    category: "decor",
    emoji: "\u{1F4A1}",
    label: { ko: "LED \uC0AC\uC778", en: "LED Sign", ja: "LED\u30B5\u30A4\u30F3", zh: "LED\u6807\u724C" },
    description: { ko: "\uB124\uC628 LED \uBCBD\uBA74 \uC0AC\uC778", en: "Neon LED wall sign", ja: "\u30CD\u30AA\u30F3LED\u58C1\u639B\u3051", zh: "\u9709\u8679LED\u58C1\u6302" },
    allowedRooms: ["department", "breakRoom"],
    maxPerRoom: 1,
    gridW: 28,
    gridH: 12,
  },
  {
    id: "trophy",
    category: "decor",
    emoji: "\u{1F3C6}",
    label: { ko: "\uD2B8\uB85C\uD53C", en: "Trophy", ja: "\u30C8\u30ED\u30D5\u30A3\u30FC", zh: "\u5956\u676F" },
    description: { ko: "\uD669\uAE08 \uD2B8\uB85C\uD53C", en: "Gold trophy", ja: "\u91D1\u306E\u30C8\u30ED\u30D5\u30A3\u30FC", zh: "\u91D1\u8272\u5956\u676F" },
    allowedRooms: ["department", "ceoOffice"],
    maxPerRoom: 2,
    gridW: 12,
    gridH: 16,
  },
  // ── Appliance ──
  {
    id: "fan",
    category: "appliance",
    emoji: "\u{1FA81}",
    label: { ko: "\uC120\uD48D\uAE30", en: "Fan", ja: "\u6247\u98A8\u6A5F", zh: "\u7535\u98CE\u6247" },
    description: { ko: "\uD0C1\uC0C1 \uBBF8\uB2C8 \uC120\uD48D\uAE30", en: "Desk mini fan", ja: "\u5353\u4E0A\u30DF\u30CB\u6247\u98A8\u6A5F", zh: "\u684C\u9762\u8FF7\u4F60\u98CE\u6247" },
    allowedRooms: ["department", "breakRoom"],
    maxPerRoom: 1,
    gridW: 12,
    gridH: 16,
  },
  {
    id: "air_purifier",
    category: "appliance",
    emoji: "\u{1F32C}\uFE0F",
    label: { ko: "\uACF5\uAE30\uCCAD\uC815\uAE30", en: "Air Purifier", ja: "\u7A7A\u6C17\u6E05\u6D44\u6A5F", zh: "\u7A7A\u6C14\u51C0\u5316\u5668" },
    description: { ko: "\uCCAD\uC815\uD55C \uACF5\uAE30 \uC21C\uD658", en: "Clean air circulation", ja: "\u6E05\u6D44\u306A\u7A7A\u6C17\u5FAA\u74B0", zh: "\u6E05\u65B0\u7A7A\u6C14\u5FAA\u73AF" },
    allowedRooms: ["department", "ceoOffice", "breakRoom"],
    maxPerRoom: 1,
    gridW: 12,
    gridH: 20,
  },
  // ── Special ──
  {
    id: "arcade",
    category: "special",
    emoji: "\u{1F579}\uFE0F",
    label: { ko: "\uC544\uCF00\uC774\uB4DC", en: "Arcade", ja: "\u30A2\u30FC\u30B1\u30FC\u30C9", zh: "\u8857\u673A" },
    description: { ko: "\uBBF8\uB2C8 \uC544\uCF00\uC774\uB4DC \uAC8C\uC784\uAE30", en: "Mini arcade machine", ja: "\u30DF\u30CB\u30A2\u30FC\u30B1\u30FC\u30C9\u6A5F", zh: "\u8FF7\u4F60\u8857\u673A" },
    allowedRooms: ["breakRoom"],
    maxPerRoom: 1,
    gridW: 16,
    gridH: 22,
  },
  {
    id: "bean_bag",
    category: "seating",
    emoji: "\u{1F6CB}\uFE0F",
    label: { ko: "\uBE48\uBC31", en: "Bean Bag", ja: "\u30D3\u30FC\u30BA\u30AF\u30C3\u30B7\u30E7\u30F3", zh: "\u61D2\u4EBA\u6C99\u53D1" },
    description: { ko: "\uD3B8\uC548\uD55C \uBE48\uBC31 \uC758\uC790", en: "Comfy bean bag chair", ja: "\u5FEB\u9069\u306A\u30D3\u30FC\u30BA\u30AF\u30C3\u30B7\u30E7\u30F3", zh: "\u8212\u9002\u7684\u61D2\u4EBA\u6C99\u53D1" },
    allowedRooms: ["breakRoom", "department"],
    maxPerRoom: 1,
    gridW: 16,
    gridH: 14,
  },
  {
    id: "standing_desk",
    category: "desk",
    emoji: "\u{1F9CD}",
    label: { ko: "\uC2A4\uD0E0\uB529 \uB370\uC2A4\uD06C", en: "Standing Desk", ja: "\u30B9\u30BF\u30F3\u30C7\u30A3\u30F3\u30B0\u30C7\u30B9\u30AF", zh: "\u7AD9\u7ACB\u5F0F\u529E\u516C\u684C" },
    description: { ko: "\uB192\uC774 \uC870\uC808 \uC2A4\uD0E0\uB529 \uB370\uC2A4\uD06C", en: "Height-adjustable standing desk", ja: "\u9AD8\u3055\u8ABF\u6574\u53EF\u80FD", zh: "\u53EF\u8C03\u8282\u9AD8\u5EA6" },
    allowedRooms: ["department", "ceoOffice"],
    maxPerRoom: 1,
    gridW: 24,
    gridH: 16,
  },
  {
    id: "projector",
    category: "special",
    emoji: "\u{1F4FD}\uFE0F",
    label: { ko: "\uD504\uB85C\uC81D\uD130", en: "Projector", ja: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30BF\u30FC", zh: "\u6295\u5F71\u4EEA" },
    description: { ko: "\uBCBD\uBA74 \uD504\uB85C\uC81D\uD130", en: "Wall projector", ja: "\u58C1\u639B\u3051\u30D7\u30ED\u30B8\u30A7\u30AF\u30BF\u30FC", zh: "\u58C1\u6302\u6295\u5F71\u4EEA" },
    allowedRooms: ["department", "ceoOffice"],
    maxPerRoom: 1,
    gridW: 16,
    gridH: 12,
  },
];

/* ── Persistence ── */

const STORAGE_KEY = "agentdesk_furniture_catalog";
const EVENT_NAME = "agentdesk_furniture_change";

export function loadFurnitureLayouts(): FurnitureLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveFurnitureLayouts(layouts: FurnitureLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: layouts }));
}

export function getRoomFurniture(layouts: FurnitureLayout, roomId: string): FurniturePlacement[] {
  return layouts[roomId] ?? [];
}

export function getItemDef(itemId: string): FurnitureItemDef | undefined {
  return CATALOG_ITEMS.find((item) => item.id === itemId);
}

/** Add item to room. Returns null if max reached. */
export function addFurnitureToRoom(
  layouts: FurnitureLayout,
  roomId: string,
  itemId: string,
  slot: number,
  x?: number,
  y?: number,
): FurnitureLayout | null {
  const def = getItemDef(itemId);
  if (!def) return null;
  const existing = layouts[roomId] ?? [];
  const sameItemCount = existing.filter((p) => p.itemId === itemId).length;
  if (sameItemCount >= def.maxPerRoom) return null;
  const placement: FurniturePlacement = { itemId, slot };
  if (x !== undefined) placement.x = x;
  if (y !== undefined) placement.y = y;
  return { ...layouts, [roomId]: [...existing, placement] };
}

/** Remove one furniture from room by index */
export function removeFurnitureFromRoom(
  layouts: FurnitureLayout,
  roomId: string,
  index: number,
): FurnitureLayout {
  const existing = [...(layouts[roomId] ?? [])];
  existing.splice(index, 1);
  return { ...layouts, [roomId]: existing };
}

/** Update placement position for an item */
export function updateFurniturePlacement(
  layouts: FurnitureLayout,
  roomId: string,
  index: number,
  x: number,
  y: number,
): FurnitureLayout {
  const existing = [...(layouts[roomId] ?? [])];
  if (index >= 0 && index < existing.length) {
    existing[index] = { ...existing[index], x: snapToGrid(x), y: snapToGrid(y) };
  }
  return { ...layouts, [roomId]: existing };
}

/* ── Undo/Redo stack ── */

export interface LayoutHistoryEntry {
  layouts: FurnitureLayout;
}

export function createHistoryStack(initial: FurnitureLayout): {
  stack: LayoutHistoryEntry[];
  pointer: number;
} {
  return { stack: [{ layouts: structuredClone(initial) }], pointer: 0 };
}
