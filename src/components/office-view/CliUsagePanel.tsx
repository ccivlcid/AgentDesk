import { type ReactNode, useCallback, useEffect, useState } from "react";
import { type CliUsageEntry, type CliUsageWindow, type CostAlertConfig, getCostAlerts, saveCostAlerts } from "../../api";
import { type AgentUsageSummary, getAgentUsageSummary } from "../../api/agent-usage";
import type { UiLanguage } from "../../i18n";
import type { CliStatusMap } from "../../types";
import { CliCursorLogo } from "../settings/Logos";
import { formatReset } from "./drawing-furniture-b";
import { LOCALE_TEXT } from "./themes-locale";
import UsageTrendChart from "./UsageTrendChart";

type TFunction = (messages: Record<UiLanguage, string>) => string;

interface CliUsagePanelProps {
  cliStatus: CliStatusMap | null;
  cliUsage: Record<string, CliUsageEntry> | null;
  language: UiLanguage;
  refreshing: boolean;
  onRefreshUsage: () => void;
  t: TFunction;
}

const ClaudeLogo = () => (
  <svg width="18" height="18" viewBox="0 0 400 400" fill="none">
    <path
      fill="#D97757"
      d="m124.011 241.251 49.164-27.585.826-2.396-.826-1.333h-2.396l-8.217-.506-28.09-.759-24.363-1.012-23.603-1.266-5.938-1.265L75 197.79l.574-3.661 4.994-3.358 7.153.625 15.808 1.079 23.722 1.637 17.208 1.012 25.493 2.649h4.049l.574-1.637-1.384-1.012-1.079-1.012-24.548-16.635-26.573-17.58-13.919-10.123-7.524-5.129-3.796-4.808-1.637-10.494 6.833-7.525 9.178.624 2.345.625 9.296 7.153 19.858 15.37 25.931 19.098 3.796 3.155 1.519-1.08.185-.759-1.704-2.851-14.104-25.493-15.049-25.931-6.698-10.747-1.772-6.445c-.624-2.649-1.08-4.876-1.08-7.592l7.778-10.561L144.729 75l10.376 1.383 4.37 3.797 6.445 14.745 10.443 23.215 16.197 31.566 4.741 9.364 2.53 8.672.945 2.649h1.637v-1.519l1.332-17.782 2.464-21.832 2.395-28.091.827-7.912 3.914-9.482 7.778-5.129 6.074 2.902 4.994 7.153-.692 4.623-2.969 19.301-5.821 30.234-3.796 20.245h2.21l2.531-2.53 10.241-13.599 17.208-21.511 7.593-8.537 8.857-9.431 5.686-4.488h10.747l7.912 11.76-3.543 12.147-11.067 14.037-9.178 11.895-13.16 17.714-8.216 14.172.759 1.131 1.957-.186 29.727-6.327 16.062-2.901 19.166-3.29 8.672 4.049.944 4.116-3.408 8.419-20.498 5.062-24.042 4.808-35.801 8.469-.439.321.506.624 16.13 1.519 6.9.371h16.888l31.448 2.345 8.217 5.433 4.926 6.647-.827 5.061-12.653 6.445-17.074-4.049-39.85-9.482-13.666-3.408h-1.889v1.131l11.388 11.135 20.87 18.845 26.133 24.295 1.333 6.006-3.357 4.741-3.543-.506-22.962-17.277-8.858-7.777-20.06-16.888H238.5v1.771l4.623 6.765 24.413 36.696 1.265 11.253-1.771 3.661-6.327 2.21-6.951-1.265-14.29-20.06-14.745-22.591-11.895-20.246-1.451.827-7.018 75.601-3.29 3.863-7.592 2.902-6.327-4.808-3.357-7.778 3.357-15.37 4.049-20.06 3.29-15.943 2.969-19.807 1.772-6.58-.118-.439-1.451.186-14.931 20.498-22.709 30.689-17.968 19.234-4.302 1.704-7.458-3.864.692-6.9 4.167-6.141 24.869-31.634 14.999-19.605 9.684-11.32-.068-1.637h-.573l-66.052 42.887-11.759 1.519-5.062-4.741.625-7.778 2.395-2.531 19.858-13.665-.068.067z"
    />
  </svg>
);

const ChatGPTLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0011.708.413a6.12 6.12 0 00-5.834 4.27 5.984 5.984 0 00-3.996 2.9 6.043 6.043 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.192 24a6.116 6.116 0 005.84-4.27 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.01zM13.192 22.784a4.474 4.474 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.658 18.607a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.77.77 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 20.236a4.508 4.508 0 01-6.083-1.63zM2.328 7.847A4.477 4.477 0 014.68 5.879l-.002.159v5.52a.78.78 0 00.391.676l5.84 3.37-2.02 1.166a.08.08 0 01-.073.007L3.917 13.98a4.506 4.506 0 01-1.589-6.132zM19.835 11.94l-5.844-3.37 2.02-1.166a.08.08 0 01.073-.007l4.898 2.794a4.494 4.494 0 01-.69 8.109v-5.68a.79.79 0 00-.457-.68zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L10.302 9.42V7.088a.08.08 0 01.033-.062l4.898-2.824a4.497 4.497 0 016.612 4.66v.054zM9.076 12.59l-2.02-1.164a.08.08 0 01-.038-.057V5.79A4.498 4.498 0 0114.392 3.2l-.141.08-4.778 2.758a.795.795 0 00-.392.681l-.005 5.87zm1.098-2.358L12 9.019l1.826 1.054v2.109L12 13.235l-1.826-1.054v-2.108z"
      fill="#10A37F"
    />
  </svg>
);

const GeminiLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"
      fill="url(#gemini_grad)"
    />
    <defs>
      <linearGradient id="gemini_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4" />
        <stop offset="1" stopColor="#886FBF" />
      </linearGradient>
    </defs>
  </svg>
);

const CLI_DISPLAY: Array<{ key: string; name: string; icon: ReactNode; color: string; bgColor: string }> = [
  {
    key: "claude",
    name: "Claude",
    icon: <ClaudeLogo />,
    color: "text-violet-300",
    bgColor: "bg-violet-500/15 border-violet-400/30",
  },
  {
    key: "codex",
    name: "Codex",
    icon: <ChatGPTLogo />,
    color: "text-emerald-300",
    bgColor: "bg-emerald-500/15 border-emerald-400/30",
  },
  {
    key: "gemini",
    name: "Gemini",
    icon: <GeminiLogo />,
    color: "text-blue-300",
    bgColor: "bg-blue-500/15 border-blue-400/30",
  },
  {
    key: "cursor",
    name: "Cursor AI",
    icon: <CliCursorLogo />,
    color: "text-slate-300",
    bgColor: "bg-slate-500/15 border-slate-400/30",
  },
  {
    key: "copilot",
    name: "Copilot",
    icon: "🚀",
    color: "text-amber-300",
    bgColor: "bg-amber-500/15 border-amber-400/30",
  },
  {
    key: "antigravity",
    name: "Antigravity",
    icon: "🌌",
    color: "text-pink-300",
    bgColor: "bg-pink-500/15 border-pink-400/30",
  },
];

export default function CliUsagePanel({
  cliStatus,
  cliUsage,
  language,
  refreshing,
  onRefreshUsage,
  t,
}: CliUsagePanelProps) {
  const connectedClis = CLI_DISPLAY.filter((cli) => {
    const status = cliStatus?.[cli.key as keyof CliStatusMap];
    return status?.installed && status?.authenticated;
  });

  const [alertConfig, setAlertConfig] = useState<CostAlertConfig>({});
  const [alertExpanded, setAlertExpanded] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [agentUsage, setAgentUsage] = useState<AgentUsageSummary[]>([]);
  const [agentUsageExpanded, setAgentUsageExpanded] = useState(false);

  useEffect(() => {
    getCostAlerts().then(setAlertConfig).catch(() => {});
    getAgentUsageSummary().then(setAgentUsage).catch(() => {});
  }, []);

  // Refresh agent usage when CLI usage refreshes
  useEffect(() => {
    if (!refreshing) {
      getAgentUsageSummary().then(setAgentUsage).catch(() => {});
    }
  }, [refreshing]);

  const handleAlertChange = useCallback(
    (provider: string, field: "alertThreshold" | "enabled", value: number | boolean) => {
      setAlertConfig((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], alertThreshold: prev[provider]?.alertThreshold ?? 80, enabled: prev[provider]?.enabled ?? false, [field]: value },
      }));
    },
    [],
  );

  const handleSaveAlerts = useCallback(async () => {
    setAlertSaving(true);
    try {
      await saveCostAlerts(alertConfig);
    } catch { /* ignore */ }
    setAlertSaving(false);
  }, [alertConfig]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 shadow-sm">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-cyan-400"
            >
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.3" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-100">
              {t(LOCALE_TEXT.cliUsageTitle)}
            </h1>
            <p className="text-xs text-slate-500">
              {connectedClis.length} {t(LOCALE_TEXT.cliConnected)}
            </p>
          </div>
        </div>
        <button
          onClick={onRefreshUsage}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/80 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700/80 hover:text-slate-100 disabled:opacity-50"
          title={t(LOCALE_TEXT.cliRefreshTitle)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          {refreshing ? (t(LOCALE_TEXT.cliUsageTitle).includes("사용량") ? "새로고침 중…" : "Refreshing…") : (t(LOCALE_TEXT.cliUsageTitle).includes("사용량") ? "새로고침" : "Refresh")}
        </button>
      </header>

      {connectedClis.length === 0 ? (
        <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-8 backdrop-blur-sm text-center">
          <p className="text-sm text-slate-400">
            {t(LOCALE_TEXT.cliNoConnectedEmpty)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {t(LOCALE_TEXT.cliUsageTitle).includes("사용량")
              ? "Claude Code, Codex, Gemini 등 CLI가 설치·인증되면 프로바이더별 사용률과 비용 알림을 설정할 수 있습니다."
              : "When a CLI (e.g. Claude Code, Codex, Gemini) is installed and authenticated, you can view usage and set cost alerts here."}
          </p>
        </section>
      ) : (
        <>
      {/* Provider usage cards */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t(LOCALE_TEXT.cliUsageTitle).includes("사용량") ? "프로바이더별 사용률" : "Usage by provider"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connectedClis.map((cli) => {
            const usage = cliUsage?.[cli.key];
            return (
              <div
                key={cli.key}
                className={`rounded-xl border ${cli.bgColor} p-3.5 transition-colors hover:border-opacity-80`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-base">{cli.icon}</span>
                  <span className={`text-sm font-semibold ${cli.color}`}>{cli.name}</span>
                </div>

                {usage?.error === "unauthenticated" && (
                  <p className="text-[11px] text-slate-500 italic">
                    {cli.key === "cursor" ? t(LOCALE_TEXT.cliNoUsageDisplay) : t(LOCALE_TEXT.cliNotSignedIn)}
                  </p>
                )}
                {usage?.error === "not_implemented" && (
                  <p className="text-[11px] text-slate-500 italic">
                    {cli.key === "cursor" ? t(LOCALE_TEXT.cliNoUsageDisplay) : t(LOCALE_TEXT.cliNoApi)}
                  </p>
                )}
                {usage?.error && usage.error !== "unauthenticated" && usage.error !== "not_implemented" && (
                  <p className="text-[11px] text-slate-500 italic">{t(LOCALE_TEXT.cliUnavailable)}</p>
                )}

                {!usage && <p className="text-[11px] text-slate-500 italic">{t(LOCALE_TEXT.cliLoading)}</p>}

                {usage && !usage.error && usage.windows.length > 0 && (
                  <div
                    className={
                      usage.windows.length > 3 ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-col gap-2"
                    }
                  >
                    {usage.windows.map((windowEntry: CliUsageWindow) => {
                      const percentage = Math.round(windowEntry.utilization * 100);
                      const barColor =
                        percentage >= 80 ? "bg-red-500/90" : percentage >= 50 ? "bg-amber-400/90" : "bg-emerald-500/80";
                      return (
                        <div key={windowEntry.label} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">{windowEntry.label}</span>
                            <span className="flex items-center gap-2">
                              <span
                                className={
                                  percentage >= 80
                                    ? "font-medium text-red-400"
                                    : percentage >= 50
                                      ? "text-amber-400"
                                      : "text-slate-400"
                                }
                              >
                                {percentage}%
                              </span>
                              {windowEntry.resetsAt && (
                                <span className="text-slate-500 text-[10px]">
                                  {t(LOCALE_TEXT.cliResets)} {formatReset(windowEntry.resetsAt, language)}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-500`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {usage && !usage.error && usage.windows.length === 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">{t(LOCALE_TEXT.cliNoData)}</p>
                    <p className="text-[10px] text-slate-600">{t(LOCALE_TEXT.cliNoDataHint)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Agent Usage Summary */}
      {agentUsage.length > 0 && (
        <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-sm">
          <button
            onClick={() => setAgentUsageExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg py-1 text-left text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {language === "ko" ? "에이전트별 사용량 (24h)" : language === "ja" ? "エージェント別使用量 (24h)" : "Agent Usage (24h)"}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${agentUsageExpanded ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {agentUsageExpanded && (
            <div className="mt-3 space-y-1.5">
              {agentUsage.map((row) => {
                const durationMin = Math.round(row.total_duration_ms / 60000);
                const successRate = row.run_count > 0 ? Math.round((row.success_count / row.run_count) * 100) : 0;
                return (
                  <div key={`${row.agent_id}-${row.provider}`} className="flex items-center gap-3 rounded-lg border border-slate-700/40 bg-slate-800/50 px-3 py-2 text-[11px]">
                    <span className="text-lg leading-none">{row.avatar_emoji || "🤖"}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-200">
                      {language === "ko" ? row.agent_name_ko || row.agent_name : row.agent_name}
                    </span>
                    <span className="shrink-0 rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-400">{row.provider}</span>
                    <span className="shrink-0 text-slate-500">{row.run_count}{language === "ko" ? "회" : language === "ja" ? "回" : "x"}</span>
                    <span className="shrink-0 text-slate-500">{durationMin}m</span>
                    <span className={`shrink-0 font-medium ${successRate >= 80 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {successRate}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Provider Success/Failure Analysis */}
      {agentUsage.length > 0 && (() => {
        const providerStats = new Map<string, { runs: number; success: number; failure: number; durationMs: number }>();
        for (const row of agentUsage) {
          const prev = providerStats.get(row.provider) ?? { runs: 0, success: 0, failure: 0, durationMs: 0 };
          prev.runs += row.run_count;
          prev.success += row.success_count;
          prev.failure += row.failure_count;
          prev.durationMs += row.total_duration_ms;
          providerStats.set(row.provider, prev);
        }
        const entries = [...providerStats.entries()].sort((a, b) => b[1].runs - a[1].runs);
        if (entries.length === 0) return null;
        return (
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-sm">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              {language === "ko" ? "프로바이더별 성공/실패" : language === "ja" ? "プロバイダ別成功/失敗" : "Provider Success/Failure"}
            </span>
            <div className="space-y-2">
              {entries.map(([provider, stats]) => {
                const rate = stats.runs > 0 ? Math.round((stats.success / stats.runs) * 100) : 0;
                const barWidth = stats.runs > 0 ? (stats.success / stats.runs) * 100 : 0;
                return (
                  <div key={provider} className="rounded-lg border border-slate-700/40 bg-slate-800/50 px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-medium text-slate-200">{provider}</span>
                      <span className="text-slate-500">
                        {stats.runs}{language === "ko" ? "회" : "x"} · {Math.round(stats.durationMs / 60000)}m
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${barWidth}%`,
                            background: rate >= 80 ? "#22c55e" : rate >= 50 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <span className={`text-[10px] font-semibold w-8 text-right ${rate >= 80 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {rate}%
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                      <span className="text-emerald-400/70">{stats.success} {language === "ko" ? "성공" : "ok"}</span>
                      <span className="text-red-400/70">{stats.failure} {language === "ko" ? "실패" : "fail"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Cost Alert Settings */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-sm">
        <button
          onClick={() => setAlertExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg py-1 text-left text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
        >
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {t(LOCALE_TEXT.cliUsageTitle).includes("사용량") ? "비용 알림 설정" : "Cost Alerts"}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${alertExpanded ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {alertExpanded && (
          <div className="mt-3 space-y-3">
            {connectedClis.map((cli) => {
              const conf = alertConfig[cli.key] ?? { alertThreshold: 80, enabled: false };
              return (
                <div key={cli.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-800/50 px-3 py-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={conf.enabled}
                      onChange={(e) => handleAlertChange(cli.key, "enabled", e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                    />
                    <span className={`text-sm font-medium ${cli.color}`}>{cli.name}</span>
                  </label>
                  <span className="text-slate-500">@</span>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={conf.alertThreshold}
                    onChange={(e) => handleAlertChange(cli.key, "alertThreshold", Number(e.target.value))}
                    className="w-14 rounded-lg border border-slate-700/60 bg-slate-800 px-2 py-1.5 text-center text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <span className="text-slate-500 text-sm">%</span>
                </div>
              );
            })}
            <button
              onClick={handleSaveAlerts}
              disabled={alertSaving}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {alertSaving ? "…" : t(LOCALE_TEXT.cliUsageTitle).includes("사용량") ? "저장" : "Save"}
            </button>
          </div>
        )}
      </section>

      {/* Daily Usage Trend Chart */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-sm">
        <UsageTrendChart language={language} />
      </section>
        </>
      )}
    </div>
  );
}
