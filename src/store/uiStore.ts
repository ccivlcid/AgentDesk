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
const SESSION_WINDOWS_KEY = "agentdesk_session_windows";
const DOCK_AUTO_HIDE_KEY = "agentdesk_dock_autohide";
const DND_KEY = "agentdesk_dnd";
const AUTO_ASSIGN_KEY = "agentdesk_auto_assign";
const AUTO_UPDATE_KEY = "agentdesk_auto_update";

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

function loadSessionWindows(): Set<WindowType> {
  try {
    const raw = window.localStorage.getItem(SESSION_WINDOWS_KEY);
    if (raw) return new Set(JSON.parse(raw) as WindowType[]);
  } catch { /* ignore */ }
  return new Set<WindowType>();
}
function saveSessionWindows(w: Set<WindowType>) {
  try { window.localStorage.setItem(SESSION_WINDOWS_KEY, JSON.stringify([...w])); } catch { /* ignore */ }
}
function loadBool(key: string, def = false): boolean {
  try { const v = window.localStorage.getItem(key); return v !== null ? v === "1" : def; } catch { return def; }
}
function saveBool(key: string, v: boolean) {
  try { window.localStorage.setItem(key, v ? "1" : "0"); } catch { /* ignore */ }
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

  // ── 새로 설치된 프로젝트 (바탕화면 drop 애니메이션) ─────────────
  newlyInstalledProjectId: string | null;
  setNewlyInstalledProjectId: (id: string | null) => void;

  jiggleMode: boolean;
  missionControlOpen: boolean;
  dockAutoHide: boolean;
  setDockAutoHide: (v: boolean) => void;
  doNotDisturb: boolean;
  setDoNotDisturb: (v: boolean) => void;
  autoAssign: boolean;
  setAutoAssign: (v: boolean) => void;
  autoUpdate: boolean;
  setAutoUpdate: (v: boolean) => void;

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
  setJiggleMode: (v: boolean) => void;
  setMissionControlOpen: (v: boolean) => void;

  // ── Toast (MX-02) ───────────────────────────────────────────────────
  toasts: Array<{ id: string; type: "success" | "error" | "info" | "progress"; title: string; body?: string; duration?: number; onClick?: () => void }>;
  addToast: (toast: Omit<{ id: string; type: "success" | "error" | "info" | "progress"; title: string; body?: string; duration?: number; onClick?: () => void }, "id">) => string;
  dismissToast: (id: string) => void;

  // ── App Switcher (MX-03) ────────────────────────────────────────────
  appSwitcherOpen: boolean;
  appSwitcherIndex: number;
  setAppSwitcherOpen: (v: boolean) => void;
  setAppSwitcherIndex: (v: number) => void;

  // ── Snap (MX-04 / MX-08) ────────────────────────────────────────────
  snapPreview: "left" | "right" | "full" | "top" | "tl" | "tr" | "bl" | "br" | null;
  snapDraggingWindow: WindowType | null;
  snapStates: Record<string, { snapped: boolean; snapZone: string; prevPos: { x: number; y: number }; prevSize: { w: number; h: number } }>;
  setSnapPreview: (v: "left" | "right" | "full" | "top" | "tl" | "tr" | "bl" | "br" | null) => void;
  setSnapDraggingWindow: (w: WindowType | null) => void;
  setSnapState: (windowType: string, state: { snapped: boolean; snapZone: string; prevPos: { x: number; y: number }; prevSize: { w: number; h: number } } | null) => void;

  // ── Snap Fill Suggestion (MX-11) ─────────────────────────────────────
  snapFillSuggestion: { oppZone: "left" | "right" | "tl" | "tr" | "bl" | "br"; forWindow: string } | null;
  setSnapFillSuggestion: (v: { oppZone: "left" | "right" | "tl" | "tr" | "bl" | "br"; forWindow: string } | null) => void;
  snapRequest: { windowType: string; zone: string } | null;
  setSnapRequest: (v: { windowType: string; zone: string } | null) => void;

  // ── Fullscreen (MX-06) ───────────────────────────────────────────────
  fullscreenWindowId: string | null;
  setFullscreenWindowId: (id: string | null) => void;

  // ── Notification unread (MX-05 Dock badge) ──────────────────────────
  notificationUnreadCount: number;
  setNotificationUnreadCount: (n: number) => void;

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

  // ── 기존 상태 ─────────────────────────────────────────────────────
  view: View;
  loading: boolean;
  settings: CompanySettings;
  oauthResult: OAuthCallbackResult | null;
  showAgentStatus: boolean;
  decisionInboxLoading: boolean;
  decisionReplyBusyKey: string | null;
  // ── Agent Runtime 상태 ──────────────────────────────────────────
  runtimeStatuses: Map<string, { status: string; runId?: string; agentId?: string; inputTokens?: number; outputTokens?: number; toolCalls?: number }>;
  setRuntimeStatus: (taskId: string, status: string, runId?: string, agentId?: string, tokenUsage?: { inputTokens?: number; outputTokens?: number; toolCalls?: number }) => void;
  clearRuntimeStatus: (taskId: string) => void;

  // ── Kickoff 진행 상태 (메뉴바 인디케이터) ──────────────────────
  kickoffBusy: boolean;
  setKickoffBusy: (v: boolean) => void;
  kickoffStage: "idle" | "planning" | "meeting" | "assigning" | "executing" | "done";
  setKickoffStage: (stage: "idle" | "planning" | "meeting" | "assigning" | "executing" | "done") => void;

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
  setShowAgentStatus: (a: SA<boolean>) => void;
  setDecisionInboxLoading: (a: SA<boolean>) => void;
  setDecisionReplyBusyKey: (a: SA<string | null>) => void;
  setMobileNavOpen: (a: SA<boolean>) => void;
  setMobileHeaderMenuOpen: (a: SA<boolean>) => void;
  setUpdateStatus: (a: SA<UpdateStatus | null>) => void;
  setDismissedUpdateVersion: (v: string) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  // ── 데스크톱 OS 초기값 ────────────────────────────────────────────
  openWindows: loadSessionWindows(),
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
    return {
      openCliAgentIds: new Set([...s.openCliAgentIds, agentId]),
      cliInitialPrompts: prompts,
      windowFocusOrder: [...s.windowFocusOrder.filter((x) => x !== "cli"), "cli"],
    };
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

  toggleWindow: (w) => set((s) => {
    const next = new Set(s.openWindows);
    let focusOrder = [...s.windowFocusOrder];
    if (next.has(w)) {
      next.delete(w);
      focusOrder = focusOrder.filter((x) => x !== w);
      const minimized = new Set(s.minimizedWindows); minimized.delete(w);
      saveSessionWindows(next);
      return { openWindows: next, windowFocusOrder: focusOrder, minimizedWindows: minimized };
    } else {
      next.add(w);
      focusOrder = [...focusOrder.filter((x) => x !== w), w];
      saveSessionWindows(next);
      return { openWindows: next, windowFocusOrder: focusOrder };
    }
  }),
  openWindow: (w) => set((s) => {
    const focusOrder = [...s.windowFocusOrder.filter((x) => x !== w), w];
    const next = new Set([...s.openWindows, w]);
    saveSessionWindows(next);
    return { openWindows: next, windowFocusOrder: focusOrder };
  }),
  closeWindow: (w) => set((s) => {
    const next = new Set(s.openWindows);
    next.delete(w);
    const minimized = new Set(s.minimizedWindows); minimized.delete(w);
    saveSessionWindows(next);
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

  jiggleMode: false,
  missionControlOpen: false,
  dockAutoHide: loadBool(DOCK_AUTO_HIDE_KEY, false),
  setDockAutoHide: (v) => { saveBool(DOCK_AUTO_HIDE_KEY, v); set({ dockAutoHide: v }); },
  doNotDisturb: loadBool(DND_KEY, false),
  setDoNotDisturb: (v) => { saveBool(DND_KEY, v); set({ doNotDisturb: v }); },
  autoAssign: loadBool(AUTO_ASSIGN_KEY, false),
  setAutoAssign: (v) => { saveBool(AUTO_ASSIGN_KEY, v); set({ autoAssign: v }); },
  autoUpdate: loadBool(AUTO_UPDATE_KEY, false),
  setAutoUpdate: (v) => { saveBool(AUTO_UPDATE_KEY, v); set({ autoUpdate: v }); },
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

  newlyInstalledProjectId: null,
  setNewlyInstalledProjectId: (id) => set({ newlyInstalledProjectId: id }),

  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setOpenTaskId: (id) => set({ openTaskId: id }),
  setJiggleMode: (v) => set({ jiggleMode: v }),
  setMissionControlOpen: (v) => set({ missionControlOpen: v }),

  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({
      toasts: [...s.toasts.slice(-2), { ...toast, id }].slice(-3),
    }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  appSwitcherOpen: false,
  appSwitcherIndex: 0,
  setAppSwitcherOpen: (v) => set({ appSwitcherOpen: v }),
  setAppSwitcherIndex: (v) => set((s) => ({ appSwitcherIndex: v })),

  snapPreview: null,
  snapDraggingWindow: null,
  snapStates: {},
  setSnapPreview: (v) => set({ snapPreview: v }),
  setSnapDraggingWindow: (w) => set({ snapDraggingWindow: w }),
  setSnapState: (windowType, state) => set((s) => {
    const next = { ...s.snapStates };
    if (state) next[windowType] = state;
    else delete next[windowType];
    return { snapStates: next };
  }),

  snapFillSuggestion: null,
  setSnapFillSuggestion: (v) => set({ snapFillSuggestion: v }),
  snapRequest: null,
  setSnapRequest: (v) => set({ snapRequest: v }),

  fullscreenWindowId: null,
  setFullscreenWindowId: (id) => set({ fullscreenWindowId: id }),

  notificationUnreadCount: 0,
  setNotificationUnreadCount: (n) => set({ notificationUnreadCount: n }),

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
  view: "tasks",
  loading: true,
  settings: mergeSettingsWithDefaults({ language: detectBrowserLanguage() }),
  oauthResult: null,
  showAgentStatus: false,
  decisionInboxLoading: false,
  decisionReplyBusyKey: null,
  runtimeStatuses: new Map<string, { status: string; runId?: string; agentId?: string; inputTokens?: number; outputTokens?: number; toolCalls?: number }>(),
  setRuntimeStatus: (taskId, status, runId, agentId, tokenUsage) => set((s) => {
    const m = new Map(s.runtimeStatuses);
    m.set(taskId, { status, runId, agentId, ...tokenUsage });
    return { runtimeStatuses: m };
  }),
  clearRuntimeStatus: (taskId) => set((s) => {
    const m = new Map(s.runtimeStatuses);
    m.delete(taskId);
    return { runtimeStatuses: m };
  }),

  kickoffBusy: false,
  setKickoffBusy: (v) => set({ kickoffBusy: v }),
  kickoffStage: "idle",
  setKickoffStage: (stage) => set({ kickoffStage: stage, kickoffBusy: stage !== "idle" && stage !== "done" }),

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
  setShowAgentStatus: (a) => set((s) => ({ showAgentStatus: apply(s.showAgentStatus, a) })),
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
