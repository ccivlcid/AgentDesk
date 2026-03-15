import { create } from "zustand";
import type { CompanySettings } from "../types";
import type { OAuthCallbackResult, RuntimeOs, View, WindowType, WidgetEntry, WidgetId } from "../app/types";
import type { UpdateStatus } from "../api";
import { detectBrowserLanguage } from "../i18n";
import { UPDATE_BANNER_DISMISS_STORAGE_KEY } from "../app/constants";
import { detectRuntimeOs, isForceUpdateBannerEnabled, mergeSettingsWithDefaults } from "../app/utils";

const WIDGET_LAYOUT_KEY = "agentdesk_widget_layout";
const DESKTOP_ICON_LAYOUT_KEY = "agentdesk_icon_layout";
const WALLPAPER_KEY = "agentdesk_wallpaper";

function loadWallpaper(): string {
  try { return window.localStorage.getItem(WALLPAPER_KEY) ?? "var(--th-bg-primary)"; } catch { return "var(--th-bg-primary)"; }
}
function saveWallpaper(css: string) {
  try { window.localStorage.setItem(WALLPAPER_KEY, css); } catch { /* ignore */ }
}

function loadWidgetLayout(): WidgetEntry[] {
  try {
    const raw = window.localStorage.getItem(WIDGET_LAYOUT_KEY);
    if (raw) return JSON.parse(raw) as WidgetEntry[];
  } catch { /* ignore */ }
  // 기본: 빈 상태 (사용자가 직접 추가)
  return [];
}

function saveWidgetLayout(layout: WidgetEntry[]) {
  try { window.localStorage.setItem(WIDGET_LAYOUT_KEY, JSON.stringify(layout)); } catch { /* ignore */ }
}

function loadDesktopIconLayout(): Record<string, { x: number; y: number }> {
  try {
    const raw = window.localStorage.getItem(DESKTOP_ICON_LAYOUT_KEY);
    if (raw) return JSON.parse(raw) as Record<string, { x: number; y: number }>;
  } catch { /* ignore */ }
  return {};
}

function saveDesktopIconLayout(layout: Record<string, { x: number; y: number }>) {
  try { window.localStorage.setItem(DESKTOP_ICON_LAYOUT_KEY, JSON.stringify(layout)); } catch { /* ignore */ }
}

type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

function readDismissedVersion(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(UPDATE_BANNER_DISMISS_STORAGE_KEY) ?? "";
}

interface UiStore {
  // ── 데스크톱 OS 상태 ──────────────────────────────────────────────
  openWindows: Set<WindowType>;
  widgetLayout: WidgetEntry[];
  desktopIconLayout: Record<string, { x: number; y: number }>;
  selectedAgentId: string | null;
  openTaskId: string | null;
  wallpaper: string;

  toggleWindow: (w: WindowType) => void;
  openWindow: (w: WindowType) => void;
  closeWindow: (w: WindowType) => void;
  setWidgetLayout: (layout: WidgetEntry[]) => void;
  addWidget: (id: WidgetId) => void;
  removeWidget: (id: WidgetId) => void;
  updateWidgetPos: (id: WidgetId, x: number, y: number) => void;
  updateWidgetSize: (id: WidgetId, w: number, h: number) => void;
  setDesktopIconLayout: (layout: Record<string, { x: number; y: number }>) => void;
  jiggleMode: boolean;
  missionControlOpen: boolean;

  setSelectedAgentId: (id: string | null) => void;
  setOpenTaskId: (id: string | null) => void;
  setWallpaper: (css: string) => void;
  setJiggleMode: (v: boolean) => void;
  setMissionControlOpen: (v: boolean) => void;

  // ── 기존 상태 ─────────────────────────────────────────────────────
  view: View;
  loading: boolean;
  settings: CompanySettings;
  oauthResult: OAuthCallbackResult | null;
  showReportHistory: boolean;
  showAgentStatus: boolean;
  showGroupChat: boolean;
  groupChatInitialAgentIds: string[];
  showDecisionInbox: boolean;
  decisionInboxLoading: boolean;
  decisionReplyBusyKey: string | null;
  mobileNavOpen: boolean;
  mobileHeaderMenuOpen: boolean;
  runtimeOs: RuntimeOs;
  forceUpdateBanner: boolean;
  updateStatus: UpdateStatus | null;
  dismissedUpdateVersion: string;

  setView: (a: SA<View>) => void;
  setLoading: (a: SA<boolean>) => void;
  setSettings: (a: SA<CompanySettings>) => void;
  setOauthResult: (a: SA<OAuthCallbackResult | null>) => void;
  setShowReportHistory: (a: SA<boolean>) => void;
  setShowAgentStatus: (a: SA<boolean>) => void;
  setShowGroupChat: (a: SA<boolean>) => void;
  setGroupChatInitialAgentIds: (a: SA<string[]>) => void;
  setShowDecisionInbox: (a: SA<boolean>) => void;
  setDecisionInboxLoading: (a: SA<boolean>) => void;
  setDecisionReplyBusyKey: (a: SA<string | null>) => void;
  setMobileNavOpen: (a: SA<boolean>) => void;
  setMobileHeaderMenuOpen: (a: SA<boolean>) => void;
  setUpdateStatus: (a: SA<UpdateStatus | null>) => void;
  setDismissedUpdateVersion: (v: string) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  // ── 데스크톱 OS 초기값 ────────────────────────────────────────────
  openWindows: new Set<WindowType>(),
  widgetLayout: loadWidgetLayout(),
  desktopIconLayout: loadDesktopIconLayout(),
  selectedAgentId: null,
  openTaskId: null,
  wallpaper: loadWallpaper(),

  toggleWindow: (w) => set((s) => {
    const next = new Set(s.openWindows);
    if (next.has(w)) next.delete(w); else next.add(w);
    return { openWindows: next };
  }),
  openWindow: (w) => set((s) => ({ openWindows: new Set([...s.openWindows, w]) })),
  closeWindow: (w) => set((s) => {
    const next = new Set(s.openWindows);
    next.delete(w);
    return { openWindows: next };
  }),
  setWidgetLayout: (layout) => { saveWidgetLayout(layout); set({ widgetLayout: layout }); },
  addWidget: (id) => set((s) => {
    if (s.widgetLayout.some((e) => e.id === id)) return s;
    const entry: WidgetEntry = { id, x: 60, y: 140, w: 420, h: 280 };
    const next = [...s.widgetLayout, entry];
    saveWidgetLayout(next);
    return { widgetLayout: next };
  }),
  removeWidget: (id) => set((s) => {
    const next = s.widgetLayout.filter((e) => e.id !== id);
    saveWidgetLayout(next);
    return { widgetLayout: next };
  }),
  updateWidgetPos: (id, x, y) => set((s) => {
    const next = s.widgetLayout.map((e) => e.id === id ? { ...e, x, y } : e);
    saveWidgetLayout(next);
    return { widgetLayout: next };
  }),
  updateWidgetSize: (id, w, h) => set((s) => {
    const next = s.widgetLayout.map((e) => e.id === id ? { ...e, w, h } : e);
    saveWidgetLayout(next);
    return { widgetLayout: next };
  }),
  jiggleMode: false,
  missionControlOpen: false,

  setDesktopIconLayout: (layout) => { saveDesktopIconLayout(layout); set({ desktopIconLayout: layout }); },
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setOpenTaskId: (id) => set({ openTaskId: id }),
  setWallpaper: (css) => { saveWallpaper(css); set({ wallpaper: css }); },
  setJiggleMode: (v) => set({ jiggleMode: v }),
  setMissionControlOpen: (v) => set({ missionControlOpen: v }),

  // ── 기존 초기값 ───────────────────────────────────────────────────
  view: "dashboard",
  loading: true,
  settings: mergeSettingsWithDefaults({ language: detectBrowserLanguage() }),
  oauthResult: null,
  showReportHistory: false,
  showAgentStatus: false,
  showGroupChat: false,
  groupChatInitialAgentIds: [],
  showDecisionInbox: false,
  decisionInboxLoading: false,
  decisionReplyBusyKey: null,
  mobileNavOpen: false,
  mobileHeaderMenuOpen: false,
  runtimeOs: detectRuntimeOs(),
  forceUpdateBanner: isForceUpdateBannerEnabled(),
  updateStatus: null,
  dismissedUpdateVersion: readDismissedVersion(),

  setView: (a) => set((s) => ({ view: apply(s.view, a) })),
  setLoading: (a) => set((s) => ({ loading: apply(s.loading, a) })),
  setSettings: (a) => set((s) => ({ settings: apply(s.settings, a) })),
  setOauthResult: (a) => set((s) => ({ oauthResult: apply(s.oauthResult, a) })),
  setShowReportHistory: (a) => set((s) => ({ showReportHistory: apply(s.showReportHistory, a) })),
  setShowAgentStatus: (a) => set((s) => ({ showAgentStatus: apply(s.showAgentStatus, a) })),
  setShowGroupChat: (a) => set((s) => ({ showGroupChat: apply(s.showGroupChat, a) })),
  setGroupChatInitialAgentIds: (a) => set((s) => ({ groupChatInitialAgentIds: apply(s.groupChatInitialAgentIds, a) })),
  setShowDecisionInbox: (a) => set((s) => ({ showDecisionInbox: apply(s.showDecisionInbox, a) })),
  setDecisionInboxLoading: (a) => set((s) => ({ decisionInboxLoading: apply(s.decisionInboxLoading, a) })),
  setDecisionReplyBusyKey: (a) => set((s) => ({ decisionReplyBusyKey: apply(s.decisionReplyBusyKey, a) })),
  setMobileNavOpen: (a) => set((s) => ({ mobileNavOpen: apply(s.mobileNavOpen, a) })),
  setMobileHeaderMenuOpen: (a) => set((s) => ({ mobileHeaderMenuOpen: apply(s.mobileHeaderMenuOpen, a) })),
  setUpdateStatus: (a) => set((s) => ({ updateStatus: apply(s.updateStatus, a) })),
  setDismissedUpdateVersion: (v) => {
    try { window.localStorage.setItem(UPDATE_BANNER_DISMISS_STORAGE_KEY, v); } catch { /* ignore */ }
    set({ dismissedUpdateVersion: v });
  },
}));
