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
  exportUserThemesJson,
  importUserThemesJson,
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
  exportThemes: { ko: "내보내기", en: "Export", ja: "書き出す", zh: "导出" },
  importThemes: { ko: "가져오기", en: "Import", ja: "インポート", zh: "导入" },
  importPlaceholder: { ko: "JSON을 붙여넣으세요", en: "Paste JSON here", ja: "JSONを貼り付けてください", zh: "请粘贴JSON" },
  importSuccess: { ko: "{n}개 가져옴", en: "{n} imported", ja: "{n}件インポート済み", zh: "已导入 {n} 个" },
  importSkipped: { ko: "{n}개 건너뜀", en: "{n} skipped", ja: "{n}件スキップ", zh: "跳过 {n} 个" },
  importError: { ko: "JSON 형식 오류", en: "Invalid JSON format", ja: "JSON形式エラー", zh: "JSON格式错误" },
  compareThemes: { ko: "변경 비교", en: "Compare", ja: "変更比較", zh: "对比" },
  compareBefore: { ko: "이전", en: "Before", ja: "変更前", zh: "之前" },
  compareAfter: { ko: "현재", en: "After", ja: "現在", zh: "现在" },
  compareNoChange: { ko: "변경사항 없음", en: "No changes", ja: "変更なし", zh: "无变化" },
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
    <div className={`flex ${h} overflow-hidden`} style={{ borderRadius: "2px", border: "1px solid var(--th-border)" }}>
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.floor1) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.floor2) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.wall) }} />
      <div className="w-4 flex-none" style={{ backgroundColor: numToHex(theme.accent) }} />
    </div>
  );
}

function PreviewBar({ colors, className = "" }: { colors: { primary: number; secondary: number; wall: number; accent: number }; className?: string }) {
  return (
    <div className={`flex h-4 overflow-hidden ${className}`} style={{ borderRadius: "2px" }}>
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
        className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
        style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
      >
        <svg className="w-3 h-3 shrink-0" style={{ color: "var(--th-text-muted)" }} viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2l4 4-4 4" /></svg>
        <span className="text-sm flex-1 truncate font-mono" style={{ color: "var(--th-text-heading)" }}>{deptName}</span>
        <div className="flex gap-0.5">
          {[theme.floor1, theme.floor2, theme.wall, theme.accent].map((c, i) => (
            <div key={i} className="w-3.5 h-3.5" style={{ backgroundColor: numToHex(c), borderRadius: "2px" }} />
          ))}
        </div>
        <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{numToHex(state.accent)}</span>
      </button>
    );
  }

  /* Expanded */
  return (
    <div className="overflow-hidden" style={{ borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" }}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors text-left"
      >
        <svg className="w-3 h-3 shrink-0" style={{ color: "var(--th-text-secondary)" }} viewBox="0 0 12 12" fill="currentColor"><path d="M2 4.5l4 4 4-4" /></svg>
        <span className="text-sm font-semibold flex-1 font-mono" style={{ color: "var(--th-text-heading)" }}>{deptName}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onActivate(); onReset(); }}
          className="text-xs px-2 py-0.5 transition-colors font-mono"
          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
        >
          {L.reset[language]}
        </button>
      </button>

      <div className="px-3 pb-3 space-y-3">
        {/* Preview swatch */}
        <ColorSwatch theme={theme} />

        {/* Tone presets */}
        <div className="space-y-1">
          <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{L.presets[language]}</span>
          <div className="flex gap-1.5 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.tone}
                onClick={() => { onActivate(); onToneChange(p.tone); }}
                title={`Tone ${p.tone}`}
                className="w-5 h-5 border-2 transition-transform hover:scale-110"
                style={{ borderRadius: "50%", backgroundColor: numToHex(p.swatch), borderColor: Math.abs(state.tone - p.tone) <= 2 ? "#fff" : "transparent" }}
              />
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-xs font-mono w-16 shrink-0" style={{ color: "var(--th-text-muted)" }}>{L.accent[language]}</label>
            <button
              onClick={() => { setShowPicker(!showPicker); onActivate(); }}
              className="w-8 h-8 border-2 transition-colors cursor-pointer"
              style={{ borderRadius: "2px", borderColor: "var(--th-border-strong)", backgroundColor: numToHex(state.accent) }}
            />
            <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{numToHex(state.accent)}</span>
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
            <label className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{L.tone[language]}</label>
            <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{state.tone}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>Light</span>
            <input
              type="range" min={0} max={100} value={state.tone}
              onChange={(e) => { onActivate(); onToneChange(Number(e.target.value)); }}
              className="flex-1 h-1.5 cursor-pointer"
            />
            <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>Dark</span>
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; error?: boolean } | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const initialSnapshotRef = useRef<Record<string, RoomTheme>>(customThemes);

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

  function handleExportThemes() {
    const json = exportUserThemesJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agentdesk-my-themes.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportThemes() {
    if (!importText.trim()) return;
    try {
      const result = importUserThemesJson(importText);
      setUserPresets(loadUserThemePresets());
      setImportResult(result);
      setImportText("");
    } catch {
      setImportResult({ imported: 0, skipped: 0, error: true });
    }
  }

  /* ── all dept+room list for rendering ── */
  const allRooms = departments;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full md:max-w-md flex flex-col h-full shadow-2xl" style={{ background: "var(--th-bg-primary)", borderLeft: "1px solid var(--th-border)" }}>
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <h2 className="text-base font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{L.title[language]}</h2>
          <button onClick={onClose} className="transition-colors w-8 h-8 flex items-center justify-center" style={{ borderRadius: "2px", color: "var(--th-text-muted)" }} aria-label="close">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* ────────────── THEME PRESETS SECTION ────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.themePresets[language]}</h3>
              <button
                onClick={() => setShowCompare((v) => !v)}
                className="text-[11px] px-2 py-0.5 transition-all font-mono"
                style={showCompare
                  ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                  : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
              >
                {L.compareThemes[language]}
              </button>
            </div>

            {/* ── Compare panel ── */}
            {showCompare && (
              <div className="p-3 space-y-1.5" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.2)", background: "var(--th-bg-elevated)" }}>
                <div className="flex justify-between text-[10px] font-mono mb-2" style={{ color: "var(--th-text-muted)" }}>
                  <span>{L.compareBefore[language]}</span>
                  <span>{L.compareAfter[language]}</span>
                </div>
                {allRooms.map((room) => {
                  const beforeTheme = initialSnapshotRef.current[room.id];
                  const afterState = deptStates[room.id];
                  const afterAccent = afterState?.accent ?? 0x5a9fd4;
                  const beforeAccent = beforeTheme?.accent ?? afterAccent;
                  const changed = beforeAccent !== afterAccent;
                  return (
                    <div key={room.id} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono w-16 truncate shrink-0" style={{ color: "var(--th-text-muted)" }}>{room.name}</span>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="h-3 flex-1" style={{ borderRadius: "2px", backgroundColor: numToHex(beforeAccent) }} />
                        <svg className="w-3 h-3 shrink-0" style={{ color: changed ? "var(--th-accent)" : "var(--th-border)" }} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
                        </svg>
                        <div className="h-3 flex-1" style={{ borderRadius: "2px", backgroundColor: numToHex(afterAccent), outline: changed ? "1px solid rgba(251,191,36,0.5)" : "none" }} />
                      </div>
                      {changed && <span className="w-1.5 h-1.5 shrink-0" style={{ borderRadius: "50%", background: "var(--th-accent)" }} />}
                    </div>
                  );
                })}
                {allRooms.every((room) => (initialSnapshotRef.current[room.id]?.accent ?? 0) === (deptStates[room.id]?.accent ?? 0)) && (
                  <p className="text-[11px] text-center italic pt-1 font-mono" style={{ color: "var(--th-text-muted)" }}>{L.compareNoChange[language]}</p>
                )}
              </div>
            )}

            {/* Builtin themes grid */}
            <div>
              <p className="text-[11px] font-mono mb-2" style={{ color: "var(--th-text-muted)" }}>{L.builtinThemes[language]}</p>
              <div className="grid grid-cols-2 gap-2">
                {BUILTIN_THEME_PRESETS.map((preset) => {
                  const active = activePresetKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => applyPreset(preset)}
                      className="relative p-2.5 text-left transition-all"
                      style={active
                        ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.08)" }
                        : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
                    >
                      <div className="mb-1.5" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", overflow: "hidden" }}><PreviewBar colors={preset.preview} /></div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{preset.name[language]}</span>
                        {active && (
                          <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--th-accent)" }} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: "var(--th-text-muted)" }}>{preset.description[language]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--th-border)" }} />

            {/* User themes */}
            <div>
              <p className="text-[11px] font-mono mb-2" style={{ color: "var(--th-text-muted)" }}>{L.myThemes[language]}</p>
              {userPresets.length === 0 ? (
                <p className="text-xs italic py-2 text-center font-mono" style={{ color: "var(--th-text-muted)" }}>{L.noUserThemes[language]}</p>
              ) : (
                <div className="space-y-1.5">
                  {userPresets.map((up) => {
                    const active = activePresetKey === up.id;
                    const isEditing = editingPresetId === up.id;
                    const firstTheme = Object.values(up.themes)[0];
                    return (
                      <div key={up.id} className="flex items-center gap-2 px-2.5 py-2 transition-all"
                        style={active
                          ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.06)" }
                          : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
                        {/* Mini swatch */}
                        <div className="flex gap-0.5 shrink-0">
                          {firstTheme && [firstTheme.floor1, firstTheme.floor2, firstTheme.wall, firstTheme.accent].map((c, i) => (
                            <div key={i} className="w-3 h-3" style={{ borderRadius: "2px", backgroundColor: numToHex(c) }} />
                          ))}
                        </div>

                        {/* Name (or rename input) */}
                        {renamingId === up.id ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleRename(up.id); }} className="flex-1 flex gap-1">
                            <input
                              autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                              className="flex-1 text-xs px-2 py-0.5 outline-none font-mono"
                              style={{ borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                            />
                            <button type="submit" className="text-xs font-mono" style={{ color: "var(--th-accent)" }}>OK</button>
                            <button type="button" onClick={() => setRenamingId(null)} className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>X</button>
                          </form>
                        ) : (
                          <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--th-text-secondary)" }}>{up.name}</span>
                        )}

                        {/* Actions */}
                        {renamingId !== up.id && (
                          <>
                            {isEditing ? (
                              <button onClick={() => handleOverwriteSave(up.id)} className="text-[10px] px-1.5 py-0.5 font-mono transition"
                                style={{ borderRadius: "2px", border: "1px solid rgba(52,211,153,0.4)", color: "rgb(167,243,208)" }}>
                                {L.overwrite[language]}
                              </button>
                            ) : !active ? (
                              <button onClick={() => applyPreset(up)} className="text-[10px] px-1.5 py-0.5 font-mono transition"
                                style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", color: "var(--th-accent)" }}>
                                {L.apply[language]}
                              </button>
                            ) : (
                              <span className="text-[10px] px-1" style={{ color: "var(--th-accent)" }}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}

                            {/* More menu */}
                            <div className="relative">
                              <button
                                onClick={() => setMenuOpenId(menuOpenId === up.id ? null : up.id)}
                                className="p-0.5 transition"
                                style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
                              >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm1.5 7a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                                </svg>
                              </button>
                              {menuOpenId === up.id && (
                                <div className="absolute right-0 top-6 z-10 shadow-xl py-1 min-w-[100px]"
                                  style={{ borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" }}>
                                  {active && (
                                    <button
                                      onClick={() => { setEditingPresetId(up.id); setMenuOpenId(null); }}
                                      className="w-full text-left text-xs px-3 py-1.5 font-mono transition"
                                      style={{ color: "var(--th-text-secondary)" }}
                                    >
                                      {L.overwrite[language]}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setRenamingId(up.id); setRenameValue(up.name); setMenuOpenId(null); }}
                                    className="w-full text-left text-xs px-3 py-1.5 font-mono transition"
                                    style={{ color: "var(--th-text-secondary)" }}
                                  >
                                    {L.rename[language]}
                                  </button>
                                  <button
                                    onClick={() => { setDeletingId(up.id); setMenuOpenId(null); }}
                                    className="w-full text-left text-xs px-3 py-1.5 font-mono transition"
                                    style={{ color: "rgb(253,164,175)" }}
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
                <div className="mt-2 flex items-center gap-2 px-2.5 py-2" style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.08)" }}>
                  <span className="text-xs font-mono flex-1" style={{ color: "rgb(253,164,175)" }}>{L.confirmDelete[language]}</span>
                  <button onClick={() => handleDeleteTheme(deletingId)} className="text-xs px-2 py-0.5 font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.5)", color: "rgb(253,164,175)" }}>
                    {L.delete[language]}
                  </button>
                  <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-0.5 font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
                    {L.cancel[language]}
                  </button>
                </div>
              )}

              {/* Save current button */}
              <button
                onClick={() => { setShowSaveModal(true); setSaveName(""); }}
                disabled={userPresets.length >= MAX_PRESETS}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-mono transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: "2px", border: "1px dashed var(--th-border-strong)", color: "var(--th-text-muted)" }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                {userPresets.length >= MAX_PRESETS ? L.maxReached[language] : L.saveCurrent[language]}
              </button>

              {/* Export / Import row */}
              <div className="mt-1.5 flex gap-1.5">
                <button
                  onClick={handleExportThemes}
                  disabled={userPresets.length === 0}
                  title={L.exportThemes[language]}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-mono transition disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 12.586V4a1 1 0 0 1 1-1ZM3 17a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H3Z" />
                  </svg>
                  {L.exportThemes[language]}
                </button>
                <button
                  onClick={() => { setShowImportModal(true); setImportResult(null); setImportText(""); }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 17a1 1 0 0 1-1-1V7.414L6.707 9.707a1 1 0 1 1-1.414-1.414l4-4a1 1 0 0 1 1.414 0l4 4a1 1 0 1 1-1.414 1.414L11 7.414V16a1 1 0 0 1-1 1ZM3 17a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H3Z" />
                  </svg>
                  {L.importThemes[language]}
                </button>
              </div>
            </div>
          </section>

          {/* ────────────── SAVE MODAL ────────────── */}
          {showSaveModal && (
            <div className="p-4 space-y-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" }}>
              <h4 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{L.saveCurrent[language]}</h4>
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "var(--th-text-muted)" }}>{L.themeName[language]}</label>
                <input
                  autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTheme()}
                  placeholder="My Theme"
                  className="w-full text-sm px-3 py-1.5 outline-none font-mono"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "var(--th-text-muted)" }}>{L.preview[language]}</label>
                <div className="flex gap-0.5" style={{ borderRadius: "2px", overflow: "hidden" }}>
                  {allRoomIds.map((id) => {
                    const s = deptStates[id];
                    if (!s) return null;
                    return <div key={id} className="flex-1 h-4" style={{ backgroundColor: numToHex(s.accent) }} />;
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 py-1.5 text-xs font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}>
                  {L.cancel[language]}
                </button>
                <button onClick={handleSaveTheme} disabled={!saveName.trim()} className="flex-1 py-1.5 text-xs font-mono transition disabled:opacity-40"
                  style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}>
                  {L.save[language]}
                </button>
              </div>
            </div>
          )}

          {/* ────────────── IMPORT MODAL ────────────── */}
          {showImportModal && (
            <div className="p-4 space-y-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-bg-elevated)" }}>
              <h4 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{L.importThemes[language]}</h4>
              <textarea
                autoFocus
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={L.importPlaceholder[language]}
                rows={5}
                className="w-full text-xs px-3 py-2 outline-none font-mono resize-none"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border-strong)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
              {importResult && (
                <div className="text-xs px-2.5 py-1.5 font-mono"
                  style={importResult.error
                    ? { borderRadius: "2px", border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.08)", color: "rgb(253,164,175)" }
                    : { borderRadius: "2px", border: "1px solid rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.08)", color: "rgb(167,243,208)" }}>
                  {importResult.error
                    ? L.importError[language]
                    : `${L.importSuccess[language].replace("{n}", String(importResult.imported))}${importResult.skipped > 0 ? `, ${L.importSkipped[language].replace("{n}", String(importResult.skipped))}` : ""}`}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowImportModal(false); setImportText(""); setImportResult(null); }}
                  className="flex-1 py-1.5 text-xs font-mono transition"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
                >
                  {L.cancel[language]}
                </button>
                <button
                  onClick={handleImportThemes}
                  disabled={!importText.trim()}
                  className="flex-1 py-1.5 text-xs font-mono transition disabled:opacity-40"
                  style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}
                >
                  {L.importThemes[language]}
                </button>
              </div>
            </div>
          )}

          {/* ────────────── DRAWING STYLE ────────────── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.styleTheme[language]}</h3>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((opt) => {
                const active = styleKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => { setStyleKey(opt.key); saveStylePreference(opt.key); }}
                    className="px-3 py-1.5 text-xs font-mono transition"
                    style={active
                      ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }
                      : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
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
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.seasonDecor[language]}</h3>
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
                    className="px-3 py-1.5 text-xs font-mono transition"
                    style={active
                      ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                      : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
                  >
                    <span className="mr-1">{icon}</span>{label[language]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ────────────── CEO CUSTOMIZE ────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.ceoCustomize[language]}</h3>

            {/* Headwear */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{L.headwear[language]}</span>
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
                      className="px-2.5 py-1.5 text-xs font-mono transition"
                      style={active
                        ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                        : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
                    >
                      <span className="mr-1">{opt.emoji}</span>{opt.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outfit color */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{L.outfitColor[language]}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCeoColorPicker(!showCeoColorPicker)}
                  className="w-8 h-8 border-2 transition cursor-pointer"
                  style={{ borderRadius: "2px", borderColor: "var(--th-border-strong)", backgroundColor: numToHex(ceoConfig.outfitTint) }}
                />
                <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{numToHex(ceoConfig.outfitTint)}</span>
                {ceoConfig.outfitTint !== 0xffffff && (
                  <button
                    onClick={() => {
                      const next = { ...ceoConfig, outfitTint: 0xffffff };
                      setCeoConfig(next);
                      saveCeoCustomization(next);
                    }}
                    className="text-[10px] px-1.5 py-0.5 font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
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
              <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{L.ceoTitle[language]}</span>
              <input
                value={ceoConfig.title}
                onChange={(e) => {
                  const next = { ...ceoConfig, title: e.target.value.slice(0, 12) };
                  setCeoConfig(next);
                  saveCeoCustomization(next);
                }}
                placeholder="CEO"
                maxLength={12}
                className="w-full text-sm px-3 py-1.5 outline-none font-mono"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
              />
            </div>

            {/* Trail effect */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{L.trailEffect[language]}</span>
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
                      className="px-2.5 py-1.5 text-xs font-mono transition"
                      style={active
                        ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                        : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
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
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.roomDecor[language]}</h3>
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
                  <div key={dept.id} className="overflow-hidden" style={{ borderRadius: "2px", border: "1px solid var(--th-border)" }}>
                    <button
                      onClick={() => setExpandedDecorDept(isExpanded ? null : dept.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition"
                    >
                      <svg className={`w-3 h-3 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} style={{ color: "var(--th-text-muted)" }} viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2l4 4-4 4" /></svg>
                      <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--th-text-secondary)" }}>{dept.name}</span>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2.5">
                        {/* Wall decor */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.wallDecor[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {WALL_DECOR_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ wallDecor: opt.key })}
                                className="px-2 py-1 text-[11px] font-mono transition"
                style={decor.wallDecor === opt.key
                  ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                  : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Plants */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.plantType[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {PLANT_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ plantType: opt.key })}
                                className="px-2 py-1 text-[11px] font-mono transition"
                style={decor.plantType === opt.key
                  ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                  : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Floor */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.floorDecor[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {FLOOR_DECOR_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ floorDecor: opt.key })}
                                className="px-2 py-1 text-[11px] font-mono transition"
                style={decor.floorDecor === opt.key
                  ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                  : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Desk accessory */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.deskAccessory[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {DESK_ACCESSORY_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ deskAccessory: opt.key })}
                                className="px-2 py-1 text-[11px] font-mono transition"
                style={decor.deskAccessory === opt.key
                  ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                  : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
                              ><span className="mr-0.5">{opt.emoji}</span>{opt.label[language]}</button>
                            ))}
                          </div>
                        </div>
                        {/* Lighting */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.lightingMood[language]}</span>
                          <div className="flex flex-wrap gap-1">
                            {LIGHTING_OPTIONS.map((opt) => (
                              <button key={opt.key} onClick={() => updateDecor({ lighting: opt.key })}
                                className="px-2 py-1 text-[11px] font-mono transition"
                style={decor.lighting === opt.key
                  ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                  : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
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
                          className="text-[10px] px-2 py-0.5 font-mono transition"
                          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
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
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.furnitureCatalog[language]}</h3>
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
                  <div key={dept.id} className="overflow-hidden" style={{ borderRadius: "2px", border: "1px solid var(--th-border)" }}>
                    <button
                      onClick={() => setExpandedFurnitureDept(isExpanded ? null : dept.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition"
                    >
                      <svg className={`w-3 h-3 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} style={{ color: "var(--th-text-muted)" }} viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2l4 4-4 4" /></svg>
                      <span className="text-xs font-mono flex-1 truncate" style={{ color: "var(--th-text-secondary)" }}>{dept.name}</span>
                      {placed.length > 0 && <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{placed.length}</span>}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2.5">
                        {/* Placed items */}
                        {placed.length > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.placedItems[language]}</span>
                            <div className="flex flex-wrap gap-1">
                              {placed.map((p, idx) => {
                                const def = getItemDef(p.itemId);
                                if (!def) return null;
                                return (
                                  <div key={idx} className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono"
                                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
                                    <span>{def.emoji}</span>
                                    <span style={{ color: "var(--th-text-secondary)" }}>{def.label[language]}</span>
                                    <button onClick={() => removeItem(idx)} className="ml-1 transition" style={{ color: "rgb(253,164,175)" }} title={L.removeFurniture[language]}>
                                      <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] italic font-mono" style={{ color: "var(--th-text-muted)" }}>{L.emptyRoom[language]}</span>
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
                            className="px-2 py-0.5 text-[10px] font-mono transition"
                            style={furnitureCategoryFilter === "all"
                              ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                              : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
                          >All</button>
                          {(Object.entries(FURNITURE_CATEGORIES) as [FurnitureCategory, (typeof FURNITURE_CATEGORIES)[FurnitureCategory]][]).map(([key, cat]) => (
                            <button
                              key={key}
                              onClick={() => setFurnitureCategoryFilter(key)}
                              className="px-2 py-0.5 text-[10px] font-mono transition"
                              style={furnitureCategoryFilter === key
                                ? { borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                                : { borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
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
                                  className="flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] font-mono transition"
                                  style={maxed
                                    ? { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-muted)", cursor: "not-allowed", opacity: 0.5 }
                                    : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
                                  title={item.description[language]}
                                >
                                  <span className="text-sm">{item.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate">{item.label[language]}</div>
                                    {maxed && <div className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>{L.maxReachedItem[language]}</div>}
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
                            className="text-[10px] px-2 py-0.5 font-mono transition"
                            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
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
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{L.deptCustomize[language]}</h3>
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
        <div className="px-4 py-3 shrink-0 flex gap-2" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button onClick={resetAll} className="flex-1 py-2 text-sm font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}>
            {L.resetAll[language]}
          </button>
          <button onClick={onClose} className="flex-1 py-2 text-sm font-mono transition"
            style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }}>
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
