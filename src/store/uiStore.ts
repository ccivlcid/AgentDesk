import { create } from "zustand";
import type { CompanySettings } from "../types";
import type { OAuthCallbackResult, RuntimeOs, View } from "../app/types";
import type { UpdateStatus } from "../api";
import { detectBrowserLanguage } from "../i18n";
import { UPDATE_BANNER_DISMISS_STORAGE_KEY } from "../app/constants";
import { detectRuntimeOs, isForceUpdateBannerEnabled, mergeSettingsWithDefaults } from "../app/utils";

type SA<T> = T | ((prev: T) => T);
const apply = <T>(prev: T, a: SA<T>): T => (typeof a === "function" ? (a as (p: T) => T)(prev) : a);

function readDismissedVersion(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(UPDATE_BANNER_DISMISS_STORAGE_KEY) ?? "";
}

interface UiStore {
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
