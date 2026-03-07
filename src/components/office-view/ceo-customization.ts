/* ================================================================== */
/*  CEO Avatar Customization                                           */
/* ================================================================== */

export type CeoHeadwear = "crown" | "tophat" | "cap" | "halo" | "horns" | "ribbon" | "none";
export type CeoTrailEffect = "sparkle" | "stars" | "hearts" | "fire" | "none";

export interface CeoCustomization {
  headwear: CeoHeadwear;
  outfitTint: number; // 0xffffff = no tint
  title: string; // default "CEO"
  name: string;        // display name shown on CEO nameplate (e.g. "김대표")
  companyName: string; // company name shown on roof sign (e.g. "ACME Corp")
  avatarEmoji: string; // emoji overlaid on robot face (empty = default robot visor)
  greetings: string[]; // custom visitor chat phrases (empty = use defaults)
  personaId: string | null; // persona from PERSONA_CATALOG (null = no persona)
  trailEffect: CeoTrailEffect;
}

const STORAGE_KEY = "agentdesk_ceo_customization";

const DEFAULT_CEO_CUSTOMIZATION: CeoCustomization = {
  headwear: "crown",
  outfitTint: 0xffffff,
  title: "CEO",
  name: "",
  companyName: "",
  avatarEmoji: "",
  greetings: [],
  personaId: null,
  trailEffect: "none",
};

/* ── Headwear config ── */

export interface HeadwearConfig {
  key: CeoHeadwear;
  emoji: string;
  label: { ko: string; en: string; ja: string; zh: string };
}

export const HEADWEAR_OPTIONS: HeadwearConfig[] = [
  { key: "crown", emoji: "\u{1F451}", label: { ko: "\uC655\uAD00", en: "Crown", ja: "\u738B\u51A0", zh: "\u7687\u51A0" } },
  { key: "tophat", emoji: "\u{1F3A9}", label: { ko: "\uC2E4\uD06C\uD587", en: "Top Hat", ja: "\u30B7\u30EB\u30AF\u30CF\u30C3\u30C8", zh: "\u793C\u5E3D" } },
  { key: "cap", emoji: "\u{1F9E2}", label: { ko: "\uBAA8\uC790", en: "Cap", ja: "\u5E3D\u5B50", zh: "\u68D2\u7403\u5E3D" } },
  { key: "halo", emoji: "\u{1F607}", label: { ko: "\uD6C4\uAD11", en: "Halo", ja: "\u5149\u8F2A", zh: "\u5149\u73AF" } },
  { key: "horns", emoji: "\u{1F608}", label: { ko: "\uBFD4", en: "Horns", ja: "\u89D2", zh: "\u89D2" } },
  { key: "ribbon", emoji: "\u{1F380}", label: { ko: "\uB9AC\uBCF8", en: "Ribbon", ja: "\u30EA\u30DC\u30F3", zh: "\u4E1D\u5E26" } },
  { key: "none", emoji: "\u2205", label: { ko: "\uC5C6\uC74C", en: "None", ja: "\u306A\u3057", zh: "\u65E0" } },
];

/* ── Trail config ── */

export interface TrailConfig {
  key: CeoTrailEffect;
  emoji: string;
  label: { ko: string; en: string; ja: string; zh: string };
  colors: number[];
}

export const TRAIL_OPTIONS: TrailConfig[] = [
  { key: "sparkle", emoji: "\u2728", label: { ko: "\uBC18\uC9DD\uC784", en: "Sparkle", ja: "\u30AD\u30E9\u30AD\u30E9", zh: "\u95EA\u5149" }, colors: [0xffdd44, 0xffaa22, 0xffffff] },
  { key: "stars", emoji: "\u2B50", label: { ko: "\uBCC4", en: "Stars", ja: "\u661F", zh: "\u661F\u661F" }, colors: [0xffdd44, 0xffee88, 0xffffff] },
  { key: "hearts", emoji: "\u{1F496}", label: { ko: "\uD558\uD2B8", en: "Hearts", ja: "\u30CF\u30FC\u30C8", zh: "\u7231\u5FC3" }, colors: [0xff6688, 0xff99aa, 0xffbbcc] },
  { key: "fire", emoji: "\u{1F525}", label: { ko: "\uBD88\uAF43", en: "Fire", ja: "\u708E", zh: "\u706B\u7130" }, colors: [0xff4400, 0xff8800, 0xffcc00] },
  { key: "none", emoji: "\u2205", label: { ko: "\uC5C6\uC74C", en: "None", ja: "\u306A\u3057", zh: "\u65E0" }, colors: [] },
];

/* ── Persistence ── */

export function loadCeoCustomization(): CeoCustomization {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CEO_CUSTOMIZATION };
    const parsed = JSON.parse(raw);
    return {
      headwear: parsed.headwear ?? DEFAULT_CEO_CUSTOMIZATION.headwear,
      outfitTint: parsed.outfitTint ?? DEFAULT_CEO_CUSTOMIZATION.outfitTint,
      title: parsed.title ?? DEFAULT_CEO_CUSTOMIZATION.title,
      name: parsed.name ?? DEFAULT_CEO_CUSTOMIZATION.name,
      companyName: parsed.companyName ?? DEFAULT_CEO_CUSTOMIZATION.companyName,
      avatarEmoji: parsed.avatarEmoji ?? DEFAULT_CEO_CUSTOMIZATION.avatarEmoji,
      greetings: Array.isArray(parsed.greetings) ? parsed.greetings : DEFAULT_CEO_CUSTOMIZATION.greetings,
      personaId: parsed.personaId ?? DEFAULT_CEO_CUSTOMIZATION.personaId,
      trailEffect: parsed.trailEffect ?? DEFAULT_CEO_CUSTOMIZATION.trailEffect,
    };
  } catch {
    return { ...DEFAULT_CEO_CUSTOMIZATION };
  }
}

export function saveCeoCustomization(config: CeoCustomization): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
  window.dispatchEvent(new CustomEvent("agentdesk_ceo_change", { detail: config }));
}

/* ── Headwear emoji resolver ── */

export function getHeadwearEmoji(headwear: CeoHeadwear): string {
  const option = HEADWEAR_OPTIONS.find((o) => o.key === headwear);
  return option?.emoji ?? "";
}

/* ── Trail particle drawing helpers ── */

export function getTrailColors(effect: CeoTrailEffect): number[] {
  const option = TRAIL_OPTIONS.find((o) => o.key === effect);
  return option?.colors ?? [];
}
