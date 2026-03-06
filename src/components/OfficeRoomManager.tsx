import { useState, useCallback, useEffect, useRef } from "react";
import { HexColorPicker } from "react-colorful";
import type { RoomTheme } from "../types";
import { BUILTIN_THEME_PRESETS, type OfficeThemePreset } from "./office-theme/theme-presets";
import {
  loadUserThemePresets,
  saveUserThemePreset,
  updateUserThemePreset,
  deleteUserThemePreset,
  getActivePresetKey,
  setActivePresetKey as persistActivePreset,
  MAX_PRESETS,
  type UserThemePreset,
} from "./office-theme/user-theme-storage";
import {
  type SeasonKey,
  loadSeasonPreference,
  saveSeasonPreference,
} from "./office-view/seasonal-particles";
import {
  type CeoCustomization,
  loadCeoCustomization,
  saveCeoCustomization,
  HEADWEAR_OPTIONS,
  TRAIL_OPTIONS,
} from "./office-view/ceo-customization";
import {
  type RoomDecoration,
  loadRoomDecorations,
  saveRoomDecorations,
  getRoomDecoration,
  getDefaultDecoration,
  WALL_DECOR_OPTIONS,
  PLANT_OPTIONS,
  FLOOR_DECOR_OPTIONS,
  DESK_ACCESSORY_OPTIONS,
  LIGHTING_OPTIONS,
} from "./office-view/room-decoration";
import {
  type StyleKey,
  STYLE_OPTIONS,
  loadStylePreference,
  saveStylePreference,
} from "./office-view/drawing-styles";
import {
  type FurnitureLayout,
  type FurniturePlacement,
  CATALOG_ITEMS,
  FURNITURE_CATEGORIES,
  type FurnitureCategory,
  loadFurnitureLayouts,
  saveFurnitureLayouts,
  getRoomFurniture,
  addFurnitureToRoom,
  removeFurnitureFromRoom,
  getItemDef,
} from "./office-view/furniture-catalog";
import RoomLayoutEditor from "./office-view/RoomLayoutEditor";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

export interface OfficeRoomManagerProps {
  departments: Array<{ id: string; name: string }>;
  customThemes: Record<string, RoomTheme>;
  onThemeChange: (themes: Record<string, RoomTheme>) => void;
  onActiveDeptChange?: (deptId: string | null) => void;
  onClose: () => void;
  language: "ko" | "en" | "ja" | "zh";
}

/* ================================================================== */
/*  Constants                                                           */
/* ================================================================== */

const DEFAULT_THEMES: Record<string, RoomTheme> = {
  dev: { floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7, accent: 0x5a9fd4 },
  design: { floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad, accent: 0x9a6fc4 },
  planning: { floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871, accent: 0xd4a85a },
  operations: { floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89, accent: 0x5ac48a },
  qa: { floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979, accent: 0xd46a6a },
  devsecops: { floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871, accent: 0xd4885a },
  ceoOffice: { floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243, accent: 0xa77d0c },
  breakRoom: { floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83, accent: 0xf0c878 },
};

const DEFAULT_TONE = 50;

const L = {
  title: { ko: "사무실 관리", en: "Office Manager", ja: "オフィス管理", zh: "办公室管理" },
  accent: { ko: "메인 색상", en: "Main Color", ja: "メインカラー", zh: "主色调" },
  tone: { ko: "톤 (밝기)", en: "Tone (Brightness)", ja: "トーン（明るさ）", zh: "色调（亮度）" },
  reset: { ko: "초기화", en: "Reset", ja: "リセット", zh: "重置" },
  resetAll: { ko: "전체 초기화", en: "Reset All", ja: "全てリセット", zh: "全部重置" },
  close: { ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" },
  presets: { ko: "프리셋", en: "Presets", ja: "プリセット", zh: "预设" },
  themePresets: { ko: "테마 프리셋", en: "Theme Presets", ja: "テーマプリセット", zh: "主题预设" },
  builtinThemes: { ko: "기본 테마", en: "Built-in Themes", ja: "デフォルトテーマ", zh: "内置主题" },
  myThemes: { ko: "내 테마", en: "My Themes", ja: "マイテーマ", zh: "我的主题" },
  saveCurrent: { ko: "현재 설정을 테마로 저장", en: "Save Current as Theme", ja: "現在の設定をテーマに保存", zh: "保存当前设置为主题" },
  themeName: { ko: "테마 이름", en: "Theme Name", ja: "テーマ名", zh: "主题名称" },
  apply: { ko: "적용", en: "Apply", ja: "適用", zh: "应用" },
  save: { ko: "저장", en: "Save", ja: "保存", zh: "保存" },
  cancel: { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" },
  overwrite: { ko: "덮어쓰기 저장", en: "Overwrite Save", ja: "上書き保存", zh: "覆盖保存" },
  rename: { ko: "이름 변경", en: "Rename", ja: "名前変更", zh: "重命名" },
  delete: { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" },
  customized: { ko: "커스텀", en: "Customized", ja: "カスタム", zh: "自定义" },
  deptCustomize: { ko: "부서별 커스터마이즈", en: "Per-Department Colors", ja: "部署別カスタマイズ", zh: "部门自定义" },
  maxReached: { ko: "최대 20개까지 저장 가능", en: "Max 20 themes", ja: "最大20件まで", zh: "最多保存20个" },
  confirmDelete: { ko: "삭제하시겠습니까?", en: "Delete this theme?", ja: "削除しますか？", zh: "删除此主题？" },
  preview: { ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" },
  noUserThemes: { ko: "저장된 테마가 없습니다", en: "No saved themes", ja: "保存されたテーマはありません", zh: "没有保存的主题" },
  seasonDecor: { ko: "계절 장식", en: "Seasonal Decor", ja: "季節デコレーション", zh: "季节装饰" },
  seasonAuto: { ko: "자동", en: "Auto", ja: "自動", zh: "自动" },
  seasonSpring: { ko: "봄", en: "Spring", ja: "春", zh: "春" },
  seasonSummer: { ko: "여름", en: "Summer", ja: "夏", zh: "夏" },
  seasonAutumn: { ko: "가을", en: "Autumn", ja: "秋", zh: "秋" },
  seasonWinter: { ko: "겨울", en: "Winter", ja: "冬", zh: "冬" },
  seasonNone: { ko: "없음", en: "None", ja: "なし", zh: "无" },
  ceoCustomize: { ko: "CEO 커스터마이즈", en: "CEO Customize", ja: "CEOカスタマイズ", zh: "CEO自定义" },
  headwear: { ko: "모자/장식", en: "Headwear", ja: "帽子/装飾", zh: "帽子/装饰" },
  outfitColor: { ko: "의상 색상", en: "Outfit Color", ja: "衣装カラー", zh: "服装颜色" },
  ceoTitle: { ko: "칭호", en: "Title", ja: "称号", zh: "称号" },
  trailEffect: { ko: "이동 이펙트", en: "Trail Effect", ja: "移動エフェクト", zh: "移动特效" },
  roomDecor: { ko: "방 꾸미기", en: "Room Decor", ja: "部屋デコ", zh: "房间装饰" },
  wallDecor: { ko: "벽 장식", en: "Wall Decor", ja: "壁飾り", zh: "墙饰" },
  plantType: { ko: "화분", en: "Plants", ja: "植物", zh: "植物" },
  floorDecor: { ko: "바닥", en: "Floor", ja: "床", zh: "地板" },
  deskAccessory: { ko: "책상 소품", en: "Desk Items", ja: "デスク小物", zh: "桌面物品" },
  lightingMood: { ko: "조명", en: "Lighting", ja: "照明", zh: "灯光" },
  styleTheme: { ko: "\uADF8\uB9AC\uAE30 \uC2A4\uD0C0\uC77C", en: "Drawing Style", ja: "\u63CF\u753B\u30B9\u30BF\u30A4\u30EB", zh: "\u7ED8\u5236\u98CE\u683C" },
  furnitureCatalog: { ko: "\uAC00\uAD6C \uCE74\uD0C8\uB85C\uADF8", en: "Furniture Catalog", ja: "\u5BB6\u5177\u30AB\u30BF\u30ED\u30B0", zh: "\u5BB6\u5177\u76EE\u5F55" },
  addFurniture: { ko: "\uCD94\uAC00", en: "Add", ja: "\u8FFD\u52A0", zh: "\u6DFB\u52A0" },
  removeFurniture: { ko: "\uC81C\uAC70", en: "Remove", ja: "\u524A\u9664", zh: "\u79FB\u9664" },
  placedItems: { ko: "\uBC30\uCE58\uB41C \uAC00\uAD6C", en: "Placed Items", ja: "\u914D\u7F6E\u6E08\u307F", zh: "\u5DF2\u653E\u7F6E" },
  emptyRoom: { ko: "\uBC30\uCE58\uB41C \uAC00\uAD6C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4", en: "No furniture placed", ja: "\u5BB6\u5177\u306A\u3057", zh: "\u65E0\u5BB6\u5177" },
  maxReachedItem: { ko: "\uCD5C\uB300 \uAC1C\uC218 \uB3C4\uB2EC", en: "Max reached", ja: "\u4E0A\u9650\u9054\u6210", zh: "\u5DF2\u8FBE\u4E0A\u9650" },
};

/* ================================================================== */
/*  Color helpers                                                       */
/* ================================================================== */

function numToHex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

function hexToNum(h: string): number {
  return parseInt(h.replace("#", ""), 16);
}

function blendColor(from: number, to: number, t: number): number {
  const c = Math.max(0, Math.min(1, t));
  const fr = (from >> 16) & 0xff, fg = (from >> 8) & 0xff, fb = from & 0xff;
  const tr = (to >> 16) & 0xff, tg = (to >> 8) & 0xff, tb = to & 0xff;
  return (Math.round(fr + (tr - fr) * c) << 16) | (Math.round(fg + (tg - fg) * c) << 8) | Math.round(fb + (tb - fb) * c);
}

const TONE_PRESET_STEPS = [15, 25, 35, 45, 55, 65, 75, 85] as const;

function generateTonePresets(accent: number): Array<{ tone: number; swatch: number }> {
  return TONE_PRESET_STEPS.map((tone) => ({ tone, swatch: deriveTheme(accent, tone).wall }));
}

function deriveTheme(accent: number, tone: number): RoomTheme {
  const t = tone / 100;
  return {
    accent,
    floor1: blendColor(accent, 0xffffff, 0.85 - t * 0.004 * 100),
    floor2: blendColor(accent, 0xffffff, 0.78 - t * 0.004 * 100),
    wall: blendColor(accent, 0x888888, 0.3 + t * 0.004 * 100),
  };
}

function inferTone(theme: RoomTheme): number {
  const ar = (theme.accent >> 16) & 0xff;
  const af = (theme.floor1 >> 16) & 0xff;
  if (ar === 0xff) return DEFAULT_TONE;
  const r = (af - ar) / (0xff - ar);
  const tone = Math.round(((0.85 - r) / 0.4) * 100);
  return Math.max(0, Math.min(100, isNaN(tone) ? DEFAULT_TONE : tone));
}

/* ================================================================== */
/*  Per-department state                                                */
/* ================================================================== */

interface DeptState {
  accent: number;
  tone: number;
}

function initDeptState(deptId: string, customThemes: Record<string, RoomTheme>): DeptState {
  const theme = customThemes[deptId] ?? DEFAULT_THEMES[deptId];
  if (!theme) return { accent: 0x5a9fd4, tone: DEFAULT_TONE };
  return { accent: theme.accent, tone: inferTone(theme) };
}

/* ================================================================== */
/*  4-color swatch                                                      */
/* ================================================================== */

function ColorSwatch({ theme, size = "md" }: { theme: RoomTheme; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-3" : "h-5";
  return (
    <div className={`flex ${h} rounded overflow-hidden border border-slate-600`}>
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.floor1) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.floor2) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.wall) }} />
      <div className="w-4 flex-none" style={{ backgroundColor: numToHex(theme.accent) }} />
    </div>
  );
}

function PreviewBar({ colors, className = "" }: { colors: { primary: number; secondary: number; wall: number; accent: number }; className?: string }) {
  return (
    <div className={`flex h-4 rounded overflow-hidden ${className}`}>
      <div className="flex-1" style={{ backgroundColor: numToHex(colors.primary) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(colors.secondary) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(colors.wall) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(colors.accent) }} />
    </div>
  );
}

/* ================================================================== */
/*  DeptCard (collapsible)                                              */
/* ================================================================== */

interface DeptCardProps {
  deptId: string;
  deptName: string;
  state: DeptState;
  language: "ko" | "en" | "ja" | "zh";
  expanded: boolean;
  onToggle: () => void;
  onActivate: () => void;
  onAccentChange: (accent: number) => void;
  onToneChange: (tone: number) => void;
  onReset: () => void;
}

function DeptCard({ deptId, deptName, state, language, expanded, onToggle, onActivate, onAccentChange, onToneChange, onReset }: DeptCardProps) {
  const theme = deriveTheme(state.accent, state.tone);
  const presets = generateTonePresets(state.accent);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  /* Collapsed */
  if (!expanded) {
    return (
      <button
        onClick={() => { onToggle(); onActivate(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg hover:bg-slate-700/60 transition-colors text-left"
      >
        <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2l4 4-4 4" /></svg>
        <span className="text-sm text-slate-200 flex-1 truncate">{deptName}</span>
        <div className="flex gap-0.5">
          {[theme.floor1, theme.floor2, theme.wall, theme.accent].map((c, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: numToHex(c) }} />
          ))}
        </div>
        <span className="text-[10px] font-mono text-slate-500">{numToHex(state.accent)}</span>
      </button>
    );
  }

  /* Expanded */
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-700/40 transition-colors text-left"
      >
        <svg className="w-3 h-3 text-slate-300 shrink-0" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4.5l4 4 4-4" /></svg>
        <span className="text-sm font-semibold text-slate-100 flex-1">{deptName}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onActivate(); onReset(); }}
          className="text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-600 hover:border-slate-400 transition-colors"
        >
          {L.reset[language]}
        </button>
      </button>

      <div className="px-3 pb-3 space-y-3">
        {/* Preview swatch */}
        <ColorSwatch theme={theme} />

        {/* Tone presets */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400">{L.presets[language]}</span>
          <div className="flex gap-1.5 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.tone}
                onClick={() => { onActivate(); onToneChange(p.tone); }}
                title={`Tone ${p.tone}`}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: numToHex(p.swatch), borderColor: Math.abs(state.tone - p.tone) <= 2 ? "#fff" : "transparent" }}
              />
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 w-16 shrink-0">{L.accent[language]}</label>
            <button
              onClick={() => { setShowPicker(!showPicker); onActivate(); }}
              className="w-8 h-8 rounded border-2 border-slate-500 hover:border-slate-300 transition-colors cursor-pointer"
              style={{ backgroundColor: numToHex(state.accent) }}
            />
            <span className="text-xs text-slate-500 font-mono">{numToHex(state.accent)}</span>
          </div>
          {showPicker && (
            <div ref={pickerRef} className="pt-1">
              <HexColorPicker
                color={numToHex(state.accent)}
                onChange={(c) => { onActivate(); onAccentChange(hexToNum(c)); }}
                style={{ width: "100%", height: 120 }}
              />
            </div>
          )}
        </div>

        {/* Tone slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">{L.tone[language]}</label>
            <span className="text-xs text-slate-500">{state.tone}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Light</span>
            <input
              type="range" min={0} max={100} value={state.tone}
              onChange={(e) => { onActivate(); onToneChange(Number(e.target.value)); }}
              className="flex-1 accent-slate-400 h-1.5 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Dark</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main component                                                      */
/* ================================================================== */

export default function OfficeRoomManager({ departments, customThemes, onThemeChange, onActiveDeptChange, onClose, language }: OfficeRoomManagerProps) {
  /* ── dept state ── */
  // departments already includes ceoOffice + breakRoom (from useAppLabels)
  const allRoomIds = departments.map((d) => d.id);
  const [deptStates, setDeptStates] = useState<Record<string, DeptState>>(() => {
    const result: Record<string, DeptState> = {};
    for (const id of allRoomIds) result[id] = initDeptState(id, customThemes);
    return result;
  });

  /* ── preset state ── */
  const [activePresetKey, setActivePresetKey] = useState<string | null>(() => getActivePresetKey());
  const [userPresets, setUserPresets] = useState<UserThemePreset[]>(() => loadUserThemePresets());
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [seasonPref, setSeasonPref] = useState<SeasonKey | "auto">(() => loadSeasonPreference());
  const [styleKey, setStyleKey] = useState<StyleKey>(() => loadStylePreference());
  const [roomDecorations, setRoomDecorations] = useState<Record<string, RoomDecoration>>(() => loadRoomDecorations());
  const [expandedDecorDept, setExpandedDecorDept] = useState<string | null>(null);
  const [ceoConfig, setCeoConfig] = useState<CeoCustomization>(() => loadCeoCustomization());
  const [showCeoColorPicker, setShowCeoColorPicker] = useState(false);
  const ceoColorPickerRef = useRef<HTMLDivElement>(null);
  const [furnitureLayouts, setFurnitureLayouts] = useState<FurnitureLayout>(() => loadFurnitureLayouts());
  const [expandedFurnitureDept, setExpandedFurnitureDept] = useState<string | null>(null);
  const [furnitureCategoryFilter, setFurnitureCategoryFilter] = useState<FurnitureCategory | "all">("all");

  useEffect(() => {
    if (!showCeoColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (ceoColorPickerRef.current && !ceoColorPickerRef.current.contains(e.target as Node)) setShowCeoColorPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCeoColorPicker]);

  /* ── emit ── */
  const buildAndEmit = useCallback(
    (next: Record<string, DeptState>) => {
      const themes: Record<string, RoomTheme> = {};
      for (const [id, s] of Object.entries(next)) themes[id] = deriveTheme(s.accent, s.tone);
      onThemeChange(themes);
    },
    [onThemeChange],
  );

  const updateDept = useCallback(
    (deptId: string, patch: Partial<DeptState>) => {
      setDeptStates((prev) => {
        const next = { ...prev, [deptId]: { ...prev[deptId], ...patch } };
        buildAndEmit(next);
        return next;
      });
      setActivePresetKey(null);
      persistActivePreset(null);
    },
    [buildAndEmit],
  );

  const resetDept = useCallback(
    (deptId: string) => {
      const def = DEFAULT_THEMES[deptId];
      if (!def) return;
      setDeptStates((prev) => {
        const next = { ...prev, [deptId]: { accent: def.accent, tone: inferTone(def) } };
        buildAndEmit(next);
        return next;
      });
    },
    [buildAndEmit],
  );

  const resetAll = useCallback(() => {
    const next: Record<string, DeptState> = {};
    for (const id of allRoomIds) {
      const def = DEFAULT_THEMES[id];
      next[id] = def ? { accent: def.accent, tone: inferTone(def) } : { accent: 0x5a9fd4, tone: DEFAULT_TONE };
    }
    setDeptStates(next);
    buildAndEmit(next);
    setActivePresetKey("classic_warm");
    persistActivePreset("classic_warm");
  }, [allRoomIds, buildAndEmit]);

  const activateDept = useCallback((deptId: string) => onActiveDeptChange?.(deptId), [onActiveDeptChange]);

  useEffect(() => () => onActiveDeptChange?.(null), [onActiveDeptChange]);

  /* ── preset actions ── */
  function applyPreset(preset: OfficeThemePreset | UserThemePreset) {
    const next: Record<string, DeptState> = { ...deptStates };
    const themes = preset.themes;
    for (const [deptId, theme] of Object.entries(themes)) {
      next[deptId] = { accent: theme.accent, tone: inferTone(theme) };
    }
    setDeptStates(next);
    buildAndEmit(next);
    const key = "key" in preset ? preset.key : preset.id;
    setActivePresetKey(key);
    persistActivePreset(key);
    setEditingPresetId(null);
  }

  function handleSaveTheme() {
    if (!saveName.trim()) return;
    const themes: Record<string, RoomTheme> = {};
    for (const [id, s] of Object.entries(deptStates)) themes[id] = deriveTheme(s.accent, s.tone);
    const preset: UserThemePreset = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      themes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const ok = saveUserThemePreset(preset);
    if (ok) {
      setUserPresets(loadUserThemePresets());
      setActivePresetKey(preset.id);
      persistActivePreset(preset.id);
    }
    setShowSaveModal(false);
    setSaveName("");
  }

  function handleOverwriteSave(id: string) {
    const themes: Record<string, RoomTheme> = {};
    for (const [rid, s] of Object.entries(deptStates)) themes[rid] = deriveTheme(s.accent, s.tone);
    updateUserThemePreset(id, { themes });
    setUserPresets(loadUserThemePresets());
    setEditingPresetId(null);
  }

  function handleDeleteTheme(id: string) {
    deleteUserThemePreset(id);
    setUserPresets(loadUserThemePresets());
    if (activePresetKey === id) { setActivePresetKey(null); persistActivePreset(null); }
    setDeletingId(null);
  }

  function handleRename(id: string) {
    if (!renameValue.trim()) return;
    updateUserThemePreset(id, { name: renameValue.trim() });
    setUserPresets(loadUserThemePresets());
    setRenamingId(null);
    setRenameValue("");
  }

  /* ── all dept+room list for rendering ── */
  const allRooms = departments;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full md:max-w-md bg-slate-900 flex flex-col h-full shadow-2xl border-l border-slate-700">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-base font-semibold text-slate-100">{L.title[language]}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700" aria-label="close">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* ────────────── THEME PRESETS SECTION ────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L.themePresets[language]}</h3>

            {/* Builtin themes grid */}
            <div>
              <p className="text-[11px] text-slate-500 mb-2">{L.builtinThemes[language]}</p>
              <div className="grid grid-cols-2 gap-2">
                {BUILTIN_THEME_PRESETS.map((preset) => {
                  const active = activePresetKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => applyPreset(preset)}
                      className={`relative p-2.5 rounded-lg border text-left transition-all hover:border-slate-400 ${
                        active ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30" : "border-slate-700 bg-slate-800/60 hover:bg-slate-700/60"
                      }`}
                    >
                      <PreviewBar colors={preset.preview} className="mb-1.5 border border-slate-600/50 rounded" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-200 truncate">{preset.name[language]}</span>
                        {active && (
                          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{preset.description[language]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50" />

            {/* User themes */}
            <div>
              <p className="text-[11px] text-slate-500 mb-2">{L.myThemes[language]}</p>
              {userPresets.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2 text-center">{L.noUserThemes[language]}</p>
              ) : (
                <div className="space-y-1.5">
                  {userPresets.map((up) => {
                    const active = activePresetKey === up.id;
                    const isEditing = editingPresetId === up.id;
                    const firstTheme = Object.values(up.themes)[0];
                    return (
                      <div key={up.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                        active ? "border-blue-400/50 bg-blue-500/5" : "border-slate-700/50 bg-slate-800/40"
                      }`}>
                        {/* Mini swatch */}
                        <div className="flex gap-0.5 shrink-0">
                          {firstTheme && [firstTheme.floor1, firstTheme.floor2, firstTheme.wall, firstTheme.accent].map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: numToHex(c) }} />
                          ))}
                        </div>

                        {/* Name (or rename input) */}
                        {renamingId === up.id ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleRename(up.id); }} className="flex-1 flex gap-1">
                            <input
                              autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                              className="flex-1 text-xs bg-slate-700 border border-slate-500 rounded px-2 py-0.5 text-slate-200 outline-none focus:border-blue-400"
                            />
                            <button type="submit" className="text-xs text-blue-400 hover:text-blue-300">OK</button>
                            <button type="button" onClick={() => setRenamingId(null)} className="text-xs text-slate-500 hover:text-slate-300">X</button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-200 flex-1 truncate">{up.name}</span>
                        )}

                        {/* Actions */}
                        {renamingId !== up.id && (
                          <>
                            {isEditing ? (
                              <button onClick={() => handleOverwriteSave(up.id)} className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 hover:border-emerald-400">
                                {L.overwrite[language]}
                              </button>
                            ) : !active ? (
                              <button onClick={() => applyPreset(up)} className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/40 hover:border-blue-400">
                                {L.apply[language]}
                              </button>
                            ) : (
                              <span className="text-[10px] text-blue-400 px-1">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}

                            {/* More menu */}
                            <div className="relative">
                              <button
                                onClick={() => setMenuOpenId(menuOpenId === up.id ? null : up.id)}
                                className="text-slate-500 hover:text-slate-300 p-0.5 rounded hover:bg-slate-700"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm1.5 7a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                                </svg>
                              </button>
                              {menuOpenId === up.id && (
                                <div className="absolute right-0 top-6 z-10 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[100px]">
                                  {active && (
                                    <button
                                      onClick={() => { setEditingPresetId(up.id); setMenuOpenId(null); }}
                                      className="w-full text-left text-xs px-3 py-1.5 hover:bg-slate-600 text-slate-200"
                                    >
                                      {L.overwrite[language]}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setRenamingId(up.id); setRenameValue(up.name); setMenuOpenId(null); }}
                                    className="w-full text-left text-xs px-3 py-1.5 hover:bg-slate-600 text-slate-200"
                                  >
                                    {L.rename[language]}
                                  </button>
                                  <button
                                    onClick={() => { setDeletingId(up.id); setMenuOpenId(null); }}
                                    className="w-full text-left text-xs px-3 py-1.5 hover:bg-slate-600 text-red-400"
                                  >
                                    {L.delete[language]}
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Delete confirmation */}
              {deletingId && (
                <div className="mt-2 flex items-center gap-2 px-2.5 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <span className="text-xs text-red-300 flex-1">{L.confirmDelete[language]}</span>
                  <button onClick={() => handleDeleteTheme(deletingId)} className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 border border-red-500/50 rounded">
                    {L.delete[language]}
                  </button>
                  <button onClick={() => setDeletingId(null)} className="text-xs text-slate-400 hover:text-slate-300 px-2 py-0.5 border border-slate-600 rounded">
                    {L.cancel[language]}
                  </button>
                </div>
              )}

              {/* Save current button */}
              <button
                onClick={() => { setShowSaveModal(true); setSaveName(""); }}
                disabled={userPresets.length >= MAX_PRESETS}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                {userPresets.length >= MAX_PRESETS ? L.maxReached[language] : L.saveCurrent[language]}
              </button>
            </div>
          </section>

          {/* ────────────── SAVE MODAL ────────────── */}
          {showSaveModal && (
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-100">{L.saveCurrent[language]}</h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">{L.themeName[language]}</label>
                <input
                  autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTheme()}
                  placeholder="My Theme"
                  className="w-full text-sm bg-slate-700 border border-slate-500 rounded-md px-3 py-1.5 text-slate-200 outline-none focus:border-blue-400 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">{L.preview[language]}</label>
                <div className="flex gap-0.5">
                  {allRoomIds.map((id) => {
                    const s = deptStates[id];
                    if (!s) return null;
                    return <div key={id} className="flex-1 h-4 first:rounded-l last:rounded-r" style={{ backgroundColor: numToHex(s.accent) }} />;
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 py-1.5 rounded-md text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                  {L.cancel[language]}
                </button>
                <button onClick={handleSaveTheme} disabled={!saveName.trim()} className="flex-1 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40">
                  {L.save[language]}
                </button>
              </div>
            </div>
          )}

          {/* ────────────── DRAWING STYLE ────────────── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L.styleTheme[language]}</h3>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((opt) => {
                const active = styleKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => { setStyleKey(opt.key); saveStylePreference(opt.key); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                    title={opt.description[language]}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ────────────── SEASONAL DECOR ────────────── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L.seasonDecor[language]}</h3>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["auto", L.seasonAuto, "🔄"],
                ["spring", L.seasonSpring, "🌸"],
                ["summer", L.seasonSummer, "☀️"],
                ["autumn", L.seasonAutumn, "🍂"],
                ["winter", L.seasonWinter, "❄️"],
                ["none", L.seasonNone, "—"],
              ] as const).map(([key, label, icon]) => {
                const active = seasonPref === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSeasonPref(key);
                      saveSeasonPreference(key);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                      active
                        ? "border-blue-400 bg-blue-500/10 text-blue-300"
                        : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                    }`}
                  >
                    <span className="mr-1">{icon}</span>{label[language]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ────────────── CEO CUSTOMIZE ────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L.ceoCustomize[language]}</h3>

            {/* Headwear */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-500">{L.headwear[language]}</span>
              <div className="flex flex-wrap gap-1.5">
                {HEADWEAR_OPTIONS.map((opt) => {
                  const active = ceoConfig.headwear === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        const next = { ...ceoConfig, headwear: opt.key };
                        setCeoConfig(next);
                        saveCeoCustomization(next);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        active
                          ? "border-blue-400 bg-blue-500/10 text-blue-300"
                          : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                      }`}
                    >
                      <span className="mr-1">{opt.emoji}</span>{opt.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outfit color */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-500">{L.outfitColor[language]}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCeoColorPicker(!showCeoColorPicker)}
                  className="w-8 h-8 rounded border-2 border-slate-500 hover:border-slate-300 transition-colors cursor-pointer"
                  style={{ backgroundColor: numToHex(ceoConfig.outfitTint) }}
                />
                <span className="text-xs text-slate-500 font-mono">{numToHex(ceoConfig.outfitTint)}</span>
                {ceoConfig.outfitTint !== 0xffffff && (
                  <button
                    onClick={() => {
                      const next = { ...ceoConfig, outfitTint: 0xffffff };
                      setCeoConfig(next);
                      saveCeoCustomization(next);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-0.5 border border-slate-600 rounded"
                  >
                    {L.reset[language]}
                  </button>
                )}
              </div>
              {showCeoColorPicker && (
                <div ref={ceoColorPickerRef}>
                  <HexColorPicker
                    color={numToHex(ceoConfig.outfitTint)}
                    onChange={(c) => {
                      const next = { ...ceoConfig, outfitTint: hexToNum(c) };
                      setCeoConfig(next);
                      saveCeoCustomization(next);
                    }}
                    style={{ width: "100%", height: 120 }}
                  />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-500">{L.ceoTitle[language]}</span>
              <input
                value={ceoConfig.title}
                onChange={(e) => {
                  const next = { ...ceoConfig, title: e.target.value.slice(0, 12) };
                  setCeoConfig(next);
                  saveCeoCustomization(next);
                }}
                placeholder="CEO"
                maxLength={12}
                className="w-full text-sm bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-slate-200 outline-none focus:border-blue-400 placeholder-slate-600"
              />
            </div>

            {/* Trail effect */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-500">{L.trailEffect[language]}</span>
              <div className="flex flex-wrap gap-1.5">
                {TRAIL_OPTIONS.map((opt) => {
                  const active = ceoConfig.trailEffect === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        const next = { ...ceoConfig, trailEffect: opt.key };
                        setCeoConfig(next);
                        saveCeoCustomization(next);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        active
                          ? "border-blue-400 bg-blue-500/10 text-blue-300"
                          : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                      }`}
                    >
                      <span className="mr-1">{opt.emoji}</span>{opt.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ────────────── ROOM DECOR ────────────── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L.roomDecor[language]}</h3>
            <div className="space-y-1">
              {departments.filter((d) => d.id !== "ceoOffice" && d.id !== "breakRoom").map((dept) => {
                const decor = getRoomDecoration(roomDecorations, dept.id);
                const isExpanded = expandedDecorDept === dept.id;
                const updateDecor = (patch: Partial<RoomDecoration>) => {
                  const next = { ...roomDecorations, [dept.id]: { ...decor, ...patch } };
                  setRoomDecorations(next);
                  saveRoomDecorations(next);
                };
                return (
                  <div key={dept.id} className="border border-slate-700/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedDecorDept(isExpanded ? null : dept.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/60 transition-colors"
                    >
                      <svg className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2l4 4-4 4" /></svg>
                      <span className="text-xs text-slate-200 flex-1 truncate">{dept.name}</span>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2.5">
                        {/* Wall decor */}
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-500">{L.wallDecor[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {WALL_DECOR_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ wallDecor: opt.key })}
                                className={`px-2 py-1 rounded text-[11px] border transition-all ${decor.wallDecor === opt.key ? "border-blue-400 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Plants */}
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-500">{L.plantType[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {PLANT_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ plantType: opt.key })}
                                className={`px-2 py-1 rounded text-[11px] border transition-all ${decor.plantType === opt.key ? "border-blue-400 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Floor */}
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-500">{L.floorDecor[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {FLOOR_DECOR_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ floorDecor: opt.key })}
                                className={`px-2 py-1 rounded text-[11px] border transition-all ${decor.floorDecor === opt.key ? "border-blue-400 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Desk accessory */}
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-500">{L.deskAccessory[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {DESK_ACCESSORY_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ deskAccessory: opt.key })}
                                className={`px-2 py-1 rounded text-[11px] border transition-all ${decor.deskAccessory === opt.key ? "border-blue-400 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Lighting */}
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-500">{L.lightingMood[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {LIGHTING_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ lighting: opt.key })}
                                className={`px-2 py-1 rounded text-[11px] border transition-all ${decor.lighting === opt.key ? "border-blue-400 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Reset */}
                        <button
                          onClick={() => {
                            const next = { ...roomDecorations };
                            delete next[dept.id];
                            setRoomDecorations(next);
                            saveRoomDecorations(next);
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 border border-slate-600 rounded"
                        >{L.reset[language]}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ────────────── FURNITURE CATALOG ────────────── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L.furnitureCatalog[language]}</h3>
            <div className="space-y-1">
              {[...departments.filter((d) => d.id !== "ceoOffice" && d.id !== "breakRoom"),
                ...departments.filter((d) => d.id === "breakRoom"),
              ].map((dept) => {
                const roomType = dept.id === "breakRoom" ? "breakRoom" as const : dept.id === "ceoOffice" ? "ceoOffice" as const : "department" as const;
                const placed = getRoomFurniture(furnitureLayouts, dept.id);
                const isExpanded = expandedFurnitureDept === dept.id;
                const addItem = (itemId: string) => {
                  const result = addFurnitureToRoom(furnitureLayouts, dept.id, itemId, placed.length);
                  if (result) {
                    setFurnitureLayouts(result);
                    saveFurnitureLayouts(result);
                  }
                };
                const removeItem = (idx: number) => {
                  const result = removeFurnitureFromRoom(furnitureLayouts, dept.id, idx);
                  setFurnitureLayouts(result);
                  saveFurnitureLayouts(result);
                };
                return (
                  <div key={dept.id} className="border border-slate-700/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFurnitureDept(isExpanded ? null : dept.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/60 transition-colors"
                    >
                      <svg className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2l4 4-4 4" /></svg>
                      <span className="text-xs text-slate-200 flex-1 truncate">{dept.name}</span>
                      {placed.length > 0 && <span className="text-[10px] text-slate-500">{placed.length}</span>}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2.5">
                        {/* Placed items */}
                        {placed.length > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-500">{L.placedItems[language]}</span>
                            <div className="flex flex-wrap gap-1">
                              {placed.map((p, idx) => {
                                const def = getItemDef(p.itemId);
                                if (!def) return null;
                                return (
                                  <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/60 border border-slate-600 text-[11px]">
                                    <span>{def.emoji}</span>
                                    <span className="text-slate-300">{def.label[language]}</span>
                                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 ml-1" title={L.removeFurniture[language]}>
                                      <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">{L.emptyRoom[language]}</span>
                        )}
                        {/* Layout editor for positioned items */}
                        {placed.length > 0 && (
                          <RoomLayoutEditor
                            roomId={dept.id}
                            roomW={dept.id === "breakRoom" ? 340 : 316}
                            roomH={dept.id === "breakRoom" ? 110 : 170}
                            layouts={furnitureLayouts}
                            onLayoutChange={setFurnitureLayouts}
                            language={language}
                          />
                        )}
                        {/* Category filter */}
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => setFurnitureCategoryFilter("all")}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-all ${furnitureCategoryFilter === "all" ? "border-blue-400 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}
                          >All</button>
                          {(Object.entries(FURNITURE_CATEGORIES) as [FurnitureCategory, (typeof FURNITURE_CATEGORIES)[FurnitureCategory]][]).map(([key, cat]) => (
                            <button
                              key={key}
                              onClick={() => setFurnitureCategoryFilter(key)}
                              className={`px-2 py-0.5 rounded text-[10px] border transition-all ${furnitureCategoryFilter === key ? "border-blue-400 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}
                            >
                              <span className="mr-0.5">{cat.emoji}</span>{cat.label[language]}
                            </button>
                          ))}
                        </div>
                        {/* Available items grid */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {CATALOG_ITEMS
                            .filter((item) => item.allowedRooms.includes(roomType))
                            .filter((item) => furnitureCategoryFilter === "all" || item.category === furnitureCategoryFilter)
                            .map((item) => {
                              const currentCount = placed.filter((p) => p.itemId === item.id).length;
                              const maxed = currentCount >= item.maxPerRoom;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => !maxed && addItem(item.id)}
                                  disabled={maxed}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-left text-[11px] transition-all ${
                                    maxed
                                      ? "border-slate-700/30 bg-slate-800/30 text-slate-600 cursor-not-allowed"
                                      : "border-slate-600 bg-slate-800/60 text-slate-300 hover:border-blue-400 hover:bg-blue-500/10"
                                  }`}
                                  title={item.description[language]}
                                >
                                  <span className="text-sm">{item.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate">{item.label[language]}</div>
                                    {maxed && <div className="text-[9px] text-slate-600">{L.maxReachedItem[language]}</div>}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                        {/* Reset */}
                        {placed.length > 0 && (
                          <button
                            onClick={() => {
                              const next = { ...furnitureLayouts };
                              delete next[dept.id];
                              setFurnitureLayouts(next);
                              saveFurnitureLayouts(next);
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 border border-slate-600 rounded"
                          >{L.reset[language]}</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ────────────── PER-DEPT CUSTOMIZE ────────────── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{L.deptCustomize[language]}</h3>
            <div className="space-y-1.5">
              {allRooms.map((room) => {
                const state = deptStates[room.id] ?? { accent: 0x5a9fd4, tone: DEFAULT_TONE };
                return (
                  <DeptCard
                    key={room.id}
                    deptId={room.id}
                    deptName={room.name}
                    state={state}
                    language={language}
                    expanded={expandedDept === room.id}
                    onToggle={() => setExpandedDept(expandedDept === room.id ? null : room.id)}
                    onActivate={() => activateDept(room.id)}
                    onAccentChange={(accent) => updateDept(room.id, { accent })}
                    onToneChange={(tone) => updateDept(room.id, { tone })}
                    onReset={() => resetDept(room.id)}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-slate-700 shrink-0 flex gap-2">
          <button onClick={resetAll} className="flex-1 py-2 rounded-md text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors">
            {L.resetAll[language]}
          </button>
          <button onClick={onClose} className="flex-1 py-2 rounded-md text-sm font-medium bg-slate-600 text-slate-100 hover:bg-slate-500 transition-colors">
            {L.close[language]}
          </button>
        </div>
      </div>

      {/* Close menu on outside click */}
      {menuOpenId && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
}
