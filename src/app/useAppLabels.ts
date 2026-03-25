import type * as api from "../api";
import { normalizeLanguage } from "../i18n";
import { translateMessage } from "../../shared/i18n/index.ts";
import type { CompanySettings } from "../types";
import type { RuntimeOs, View } from "./types";

interface UseAppLabelsParams {
  view: View;
  settings: CompanySettings;
  theme: "light" | "dark";
  runtimeOs: RuntimeOs;
  forceUpdateBanner: boolean;
  updateStatus: api.UpdateStatus | null;
  dismissedUpdateVersion: string;
}

export function useAppLabels({
  view,
  settings,
  theme,
  runtimeOs,
  forceUpdateBanner,
  updateStatus,
  dismissedUpdateVersion,
}: UseAppLabelsParams) {
  const uiLanguage = normalizeLanguage(settings.language);
  const tk = (key: Parameters<typeof translateMessage>[1], vars?: Parameters<typeof translateMessage>[2]) =>
    translateMessage(uiLanguage, key, vars);
  const loadingTitle = tk("app.loading.title");
  const loadingSubtitle = tk("app.loading.subtitle");
  const viewTitle = (() => {
    switch (view) {
      case "cli-usage":
        return tk("app.view.cliUsage");
      case "tasks":
      case "tasks-board":
        return tk("app.view.tasksBoard");
      case "agents":
        return tk("app.view.agents");
      case "heartbeat":
        return tk("app.view.heartbeat");
      case "skills":
        return tk("app.view.skills");
      case "agent-rules":
        return tk("app.view.agentRules");
      case "memory":
        return tk("app.view.memory");
      case "hooks":
        return tk("app.view.hooks");
      case "settings":
        return tk("app.view.settings");
      default:
        return "";
    }
  })();
  const announcementLabel = tk("app.nav.announcement");
  const groupChatLabel = tk("app.nav.meeting");
  const reportLabel = tk("app.nav.reports");
  const tasksPrimaryLabel = tk("app.nav.tasks");
  const agentStatusLabel = tk("app.nav.agents");
  const decisionLabel = tk("app.nav.decisions");
  const effectiveUpdateStatus = forceUpdateBanner
    ? {
        current_version: updateStatus?.current_version ?? "1.1.0",
        latest_version: updateStatus?.latest_version ?? "1.1.1-test",
        update_available: true,
        release_url: updateStatus?.release_url ?? "https://github.com/agentdesk/agentdesk/releases/latest",
        checked_at: Date.now(),
        enabled: true,
        repo: updateStatus?.repo ?? "agentdesk/agentdesk",
        error: null,
      }
    : updateStatus;
  const updateBannerVisible = Boolean(
    effectiveUpdateStatus?.enabled &&
    effectiveUpdateStatus.update_available &&
    effectiveUpdateStatus.latest_version &&
    (forceUpdateBanner || effectiveUpdateStatus.latest_version !== dismissedUpdateVersion),
  );
  const updateReleaseUrl =
    effectiveUpdateStatus?.release_url ??
    `https://github.com/${effectiveUpdateStatus?.repo ?? "agentdesk/agentdesk"}/releases/latest`;
  const updateTitle = updateBannerVisible
    ? tk("app.update.bannerTitle", {
        latestVersion: effectiveUpdateStatus?.latest_version ?? "",
        currentVersion: effectiveUpdateStatus?.current_version ?? "",
      })
    : "";
  const updateHint =
    runtimeOs === "windows"
      ? tk("app.update.hint.windows")
      : tk("app.update.hint.posix");
  const updateReleaseLabel = tk("app.update.releaseNotes");
  const updateDismissLabel = tk("app.update.dismiss");
  const autoUpdateNoticeVisible = Boolean(settings.autoUpdateNoticePending);
  const autoUpdateNoticeTitle = tk("app.update.autoNotice.title");
  const autoUpdateNoticeHint = tk("app.update.autoNotice.hint");
  const autoUpdateNoticeActionLabel = tk("app.update.autoNotice.action");
  const autoUpdateNoticeContainerClass =
    theme === "light"
      ? "border-b border-sky-200 bg-sky-50 px-3 py-2.5 sm:px-4 lg:px-6"
      : "border-b border-sky-500/30 bg-sky-500/10 px-3 py-2.5 sm:px-4 lg:px-6";
  const autoUpdateNoticeTextClass = theme === "light" ? "min-w-0 text-xs text-sky-900" : "min-w-0 text-xs text-sky-100";
  const autoUpdateNoticeHintClass =
    theme === "light" ? "mt-0.5 text-[11px] text-sky-800" : "mt-0.5 text-[11px] text-sky-200/90";
  const autoUpdateNoticeButtonClass =
    theme === "light"
      ? "rounded-md border border-sky-300 bg-white px-2.5 py-1 text-[11px] text-sky-900 transition hover:bg-sky-100"
      : "rounded-md border border-sky-300/40 bg-sky-200/10 px-2.5 py-1 text-[11px] text-sky-100 transition hover:bg-sky-200/20";
  const updateTestModeHint = forceUpdateBanner
    ? tk("app.update.testModeHint")
    : "";

  return {
    uiLanguage,
    loadingTitle,
    loadingSubtitle,
    viewTitle,
    announcementLabel,
    groupChatLabel,
    reportLabel,
    tasksPrimaryLabel,
    agentStatusLabel,
    decisionLabel,
    effectiveUpdateStatus,
    updateBannerVisible,
    updateReleaseUrl,
    updateTitle,
    updateHint,
    updateReleaseLabel,
    updateDismissLabel,
    autoUpdateNoticeVisible,
    autoUpdateNoticeTitle,
    autoUpdateNoticeHint,
    autoUpdateNoticeActionLabel,
    autoUpdateNoticeContainerClass,
    autoUpdateNoticeTextClass,
    autoUpdateNoticeHintClass,
    autoUpdateNoticeButtonClass,
    updateTestModeHint,
  };
}
