import { create } from "zustand";
import type { CompanySettings } from "../types";
import type { OAuthCallbackResult, RuntimeOs, View, WindowType } from "../app/types";
import type { SettingsTab } from "../components/settings/types";
import type { UpdateStatus } from "../api";
import { detectBrowserLanguage } from "../i18n";
import { UPDATE_BANNER_DISMISS_STORAGE_KEY } from "../app/constants";
import { detectRuntimeOs, isForceUpdateBannerEnabled, mergeSettingsWithDefaults } from "../app/utils";

const DESKTOP_ICON_LAYOUT_KEY = "agentdesk_icon_layout";
const DESKTOP_ICON_LABELS_KEY = "agentdesk_icon_labels";
const WALLPAPER_KEY = "agentdesk_wallpaper";

function loadWallpaper(): string {
  try { return window.localStorage.getItem(WALLPAPER_KEY) ?? "var(--th-bg-primary)"; } catch { return "var(--th-bg-primary)"; }
}
function saveWallpaper(css: string) {
  try { window.localStorage.setItem(WALLPAPER_KEY, css); } catch { /* ignore */ }
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

function loadDesktopIconLabels(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(DESKTOP_ICON_LABELS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

function saveDesktopIconLabels(labels: Record<string, string>) {
  try { window.localStorage.setItem(DESKTOP_ICON_LABELS_KEY, JSON.stringify(labels)); } catch { /* ignore */ }
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
  desktopIconLayout: Record<string, { x: number; y: number }>;
  selectedAgentId: string | null;
  openTaskId: string | null;
  wallpaper: string;

  settingsInitialTab: SettingsTab | null;
  openSettings: (tab?: SettingsTab) => void;
  toggleWindow: (w: WindowType) => void;
  openWindow: (w: WindowType) => void;
  closeWindow: (w: WindowType) => void;
  setDesktopIconLayout: (layout: Record<string, { x: number; y: number }>) => void;
  desktopIconLabels: Record<string, string>;
  setDesktopIconLabel: (id: string, label: string) => void;

  // ── 바탕화면 문서 아이콘 ──────────────────────────────────────────
  pendingDocs: Array<{ id: string; title: string; content: string }>;
  addPendingDoc: (doc: { title: string; content: string }) => void;
  removePendingDoc: (id: string) => void;
  jiggleMode: boolean;
  missionControlOpen: boolean;

  // ── 휴지통 ────────────────────────────────────────────────────────
  trashedProjects: Array<{ id: string; name: string; project_path: string; core_goal: string; category_id: string | null; deletedAt: number }>;
  addToTrash: (project: { id: string; name: string; project_path: string; core_goal: string; category_id: string | null }) => void;
  removeFromTrash: (id: string) => void;
  emptyTrash: () => void;

  // ── 창 포커스 / 최소화 ────────────────────────────────────────────
  windowFocusOrder: WindowType[];
  minimizedWindows: Set<WindowType>;
  bringWindowToFront: (w: WindowType) => void;
  minimizeWindow: (w: WindowType) => void;
  restoreWindow: (w: WindowType) => void;

  setSelectedAgentId: (id: string | null) => void;
  setOpenTaskId: (id: string | null) => void;
  setWallpaper: (css: string) => void;
  setJiggleMode: (v: boolean) => void;
  setMissionControlOpen: (v: boolean) => void;

  // ── Agent CLI ─────────────────────────────────────────────────────
  cliInitialAgentId: string | null;
  openCli: (agentId?: string) => void;
  clearCliInitialAgentId: () => void;
  // 에이전트별 독립 CLI 창 (agentId → 각자 별도 CliWindow)
  openCliAgentIds: Set<string>;
  openCliWindow: (agentId: string, initialPrompt?: string) => void;
  closeCliWindow: (agentId: string) => void;
  cliInitialPrompts: Map<string, string>;
  clearCliInitialPrompt: (agentId: string) => void;
  // planning phase 완료 후 auto_open_cli 시 배너 표시용
  cliPlanReadyIds: Set<string>;
  setCliPlanReady: (agentId: string) => void;
  clearCliPlanReady: (agentId: string) => void;

  // ── Project Folders ───────────────────────────────────────────────
  openFolders: Set<string>;
  openFolder: (id: string) => void;
  closeFolder: (id: string) => void;

  // ── Custom Feature Apps ───────────────────────────────────────────
  openCustomApps: Set<string>;
  openCustomApp: (id: string) => void;
  closeCustomApp: (id: string) => void;
  customFeaturesTick: number;
  bumpCustomFeaturesTick: () => void;

  // ── 기존 상태 ─────────────────────────────────────────────────────
  view: View;
  loading: boolean;
  settings: CompanySettings;
  oauthResult: OAuthCallbackResult | null;
  unreadReportCount: number;
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
  incUnreadReportCount: () => void;
  clearUnreadReportCount: () => void;
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
  settingsInitialTab: null,
  cliInitialAgentId: null,
  openSettings: (tab) => set((s) => ({
    openWindows: new Set([...s.openWindows, "settings" as WindowType]),
    windowFocusOrder: [...s.windowFocusOrder.filter((x) => x !== "settings"), "settings"],
    settingsInitialTab: tab ?? null,
  })),
  openCli: (agentId) => set((s) => ({
    openWindows: new Set([...s.openWindows, "cli" as WindowType]),
    windowFocusOrder: [...s.windowFocusOrder.filter((x) => x !== "cli"), "cli"],
    cliInitialAgentId: agentId ?? null,
  })),
  clearCliInitialAgentId: () => set({ cliInitialAgentId: null }),
  openCliAgentIds: new Set<string>(),
  cliInitialPrompts: new Map<string, string>(),
  openCliWindow: (agentId, initialPrompt) => set((s) => {
    const prompts = new Map(s.cliInitialPrompts);
    if (initialPrompt) prompts.set(agentId, initialPrompt);
    return { openCliAgentIds: new Set([...s.openCliAgentIds, agentId]), cliInitialPrompts: prompts };
  }),
  closeCliWindow: (agentId) => set((s) => {
    const next = new Set(s.openCliAgentIds);
    next.delete(agentId);
    const prompts = new Map(s.cliInitialPrompts);
    prompts.delete(agentId);
    return { openCliAgentIds: next, cliInitialPrompts: prompts };
  }),
  clearCliInitialPrompt: (agentId) => set((s) => {
    const prompts = new Map(s.cliInitialPrompts);
    prompts.delete(agentId);
    return { cliInitialPrompts: prompts };
  }),
  cliPlanReadyIds: new Set<string>(),
  setCliPlanReady: (agentId) => set((s) => ({ cliPlanReadyIds: new Set([...s.cliPlanReadyIds, agentId]) })),
  clearCliPlanReady: (agentId) => set((s) => {
    const next = new Set(s.cliPlanReadyIds);
    next.delete(agentId);
    return { cliPlanReadyIds: next };
  }),
  desktopIconLayout: loadDesktopIconLayout(),
  desktopIconLabels: loadDesktopIconLabels(),
  pendingDocs: [],
  trashedProjects: (() => { try { return JSON.parse(window.localStorage.getItem("agentdesk_trash") ?? "[]"); } catch { return []; } })(),
  addToTrash: (project) => set((s) => {
    const next = [...s.trashedProjects.filter((p) => p.id !== project.id), { ...project, deletedAt: Date.now() }];
    try { window.localStorage.setItem("agentdesk_trash", JSON.stringify(next)); } catch { /* ignore */ }
    return { trashedProjects: next };
  }),
  removeFromTrash: (id) => set((s) => {
    const next = s.trashedProjects.filter((p) => p.id !== id);
    try { window.localStorage.setItem("agentdesk_trash", JSON.stringify(next)); } catch { /* ignore */ }
    return { trashedProjects: next };
  }),
  emptyTrash: () => {
    try { window.localStorage.setItem("agentdesk_trash", "[]"); } catch { /* ignore */ }
    set({ trashedProjects: [] });
  },
  selectedAgentId: null,
  openTaskId: null,
  wallpaper: loadWallpaper(),

  toggleWindow: (w) => set((s) => {
    const next = new Set(s.openWindows);
    let focusOrder = [...s.windowFocusOrder];
    if (next.has(w)) {
      next.delete(w);
      focusOrder = focusOrder.filter((x) => x !== w);
      const minimized = new Set(s.minimizedWindows); minimized.delete(w);
      return { openWindows: next, windowFocusOrder: focusOrder, minimizedWindows: minimized };
    } else {
      next.add(w);
      focusOrder = [...focusOrder.filter((x) => x !== w), w];
      return { openWindows: next, windowFocusOrder: focusOrder };
    }
  }),
  openWindow: (w) => set((s) => {
    const focusOrder = [...s.windowFocusOrder.filter((x) => x !== w), w];
    return { openWindows: new Set([...s.openWindows, w]), windowFocusOrder: focusOrder };
  }),
  closeWindow: (w) => set((s) => {
    const next = new Set(s.openWindows);
    next.delete(w);
    const minimized = new Set(s.minimizedWindows); minimized.delete(w);
    return { openWindows: next, minimizedWindows: minimized, windowFocusOrder: s.windowFocusOrder.filter((x) => x !== w) };
  }),
  // ── Project Folders ────────────────────────────────────────────────
  openFolders: new Set<string>(),
  openFolder: (id) => set((s) => ({ openFolders: new Set([...s.openFolders, id]) })),
  closeFolder: (id) => set((s) => {
    const next = new Set(s.openFolders);
    next.delete(id);
    return { openFolders: next };
  }),

  // ── Custom Feature Apps ────────────────────────────────────────────
  openCustomApps: new Set<string>(),
  openCustomApp: (id) => set((s) => ({ openCustomApps: new Set([...s.openCustomApps, id]) })),
  closeCustomApp: (id) => set((s) => {
    const next = new Set(s.openCustomApps);
    next.delete(id);
    return { openCustomApps: next };
  }),
  customFeaturesTick: 0,
  bumpCustomFeaturesTick: () => set((s) => ({ customFeaturesTick: s.customFeaturesTick + 1 })),

  jiggleMode: false,
  missionControlOpen: false,
  windowFocusOrder: [],
  minimizedWindows: new Set<WindowType>(),

  setDesktopIconLayout: (layout) => { saveDesktopIconLayout(layout); set({ desktopIconLayout: layout }); },
  setDesktopIconLabel: (id, label) => set((s) => {
    const next = { ...s.desktopIconLabels };
    if (label.trim()) next[id] = label.trim();
    else delete next[id];
    saveDesktopIconLabels(next);
    return { desktopIconLabels: next };
  }),
  addPendingDoc: ({ title, content }) => set((s) => ({
    pendingDocs: [...s.pendingDocs, { id: crypto.randomUUID(), title, content }],
  })),
  removePendingDoc: (id) => set((s) => ({ pendingDocs: s.pendingDocs.filter((d) => d.id !== id) })),

  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setOpenTaskId: (id) => set({ openTaskId: id }),
  setWallpaper: (css) => { saveWallpaper(css); set({ wallpaper: css }); },
  setJiggleMode: (v) => set({ jiggleMode: v }),
  setMissionControlOpen: (v) => set({ missionControlOpen: v }),
  bringWindowToFront: (w) => set((s) => ({
    windowFocusOrder: [...s.windowFocusOrder.filter((x) => x !== w), w],
  })),
  minimizeWindow: (w) => set((s) => ({
    minimizedWindows: new Set([...s.minimizedWindows, w]),
  })),
  restoreWindow: (w) => set((s) => {
    const minimized = new Set(s.minimizedWindows); minimized.delete(w);
    return { minimizedWindows: minimized, windowFocusOrder: [...s.windowFocusOrder.filter((x) => x !== w), w] };
  }),

  // ── 기존 초기값 ───────────────────────────────────────────────────
  view: "dashboard",
  loading: true,
  settings: mergeSettingsWithDefaults({ language: detectBrowserLanguage() }),
  oauthResult: null,
  unreadReportCount: 0,
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
  incUnreadReportCount: () => set((s) => ({ unreadReportCount: s.unreadReportCount + 1 })),
  clearUnreadReportCount: () => set({ unreadReportCount: 0 }),
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
