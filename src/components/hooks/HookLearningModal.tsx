import { useEffect, useMemo, useRef, useState } from "react";
import type { HookHistoryProvider, HookLearnProvider } from "../../api/hooks";
import type { Agent, HookEntry } from "../../types";
import AgentAvatar from "../AgentAvatar";
import {
  hookProviderLabel,
  roleLabel,
  learningStatusLabel,
  eventTypeLabel,
  type TFunction,
  type UnlearnEffect,
} from "./model";

interface HookLearningModalProps {
  t: TFunction;
  localeTag: string;
  agents: Agent[];
  learningHook: HookEntry | null;
  learnInProgress: boolean;
  selectedProviders: HookLearnProvider[];
  representatives: Array<{ provider: HookLearnProvider; agent: Agent | null }>;
  preferKoreanName: boolean;
  modalLearnedProviders: Set<HookHistoryProvider>;
  unlearningProviders: HookLearnProvider[];
  unlearnEffects: Partial<Record<HookLearnProvider, UnlearnEffect>>;
  learnJob: {
    id: string;
    status: "queued" | "running" | "succeeded" | "failed";
    command: string;
    logTail: string[];
    completedAt: number | null;
    error?: string | null;
  } | null;
  learnError: string | null;
  unlearnError: string | null;
  learnSubmitting: boolean;
  defaultSelectedProviders: HookLearnProvider[];
  squadAgentIds: string[];
  onClose: () => void;
  onToggleProvider: (provider: HookLearnProvider) => void;
  onUnlearnProvider: (provider: HookLearnProvider) => void;
  onStartLearning: () => void;
  onAddAgent: (agentId: string) => void;
  onRemoveAgent: (agentId: string) => void;
}

export default function HookLearningModal({
  t,
  localeTag,
  agents,
  learningHook,
  learnInProgress,
  selectedProviders,
  representatives,
  preferKoreanName,
  modalLearnedProviders,
  unlearningProviders,
  unlearnEffects,
  learnJob,
  learnError,
  unlearnError,
  learnSubmitting,
  defaultSelectedProviders,
  squadAgentIds,
  onClose,
  onToggleProvider,
  onUnlearnProvider,
  onStartLearning,
  onAddAgent,
  onRemoveAgent,
}: HookLearningModalProps) {
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  const representativeAgentIds = useMemo(
    () => new Set(representatives.map((r) => r.agent?.id).filter(Boolean) as string[]),
    [representatives],
  );

  const availableAgents = useMemo(() => {
    const excludeIds = new Set([...representativeAgentIds, ...squadAgentIds]);
    let list = agents.filter((a) => !excludeIds.has(a.id));
    if (agentSearch.trim()) {
      const q = agentSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.name_ko && a.name_ko.toLowerCase().includes(q)) ||
          (a.cli_provider && a.cli_provider.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [agents, representativeAgentIds, squadAgentIds, agentSearch]);

  const squadAgents = useMemo(
    () => squadAgentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as Agent[],
    [agents, squadAgentIds],
  );

  useEffect(() => {
    if (!showAgentPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAgentPicker(false);
        setAgentSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAgentPicker]);

  if (!learningHook) return null;

  return (
    <div className="skills-learn-modal fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="skills-learn-modal-card w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/60 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {t({
                ko: "\uD6C5 \uD559\uC2B5 \uC2A4\uCFFC\uB4DC",
                en: "Hook Learning Squad",
                ja: "\u30D5\u30C3\u30AF\u5B66\u7FD2\u30B9\u30AF\u30EF\u30C3\u30C9",
                zh: "\u94A9\u5B50\u5B66\u4E60\u5C0F\u961F",
              })}
            </h3>
            <div className="mt-1 text-xs text-slate-400">
              {learningHook.title} &middot; {eventTypeLabel(learningHook.event_type, t)}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={learnInProgress}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
              learnInProgress
                ? "cursor-not-allowed border-slate-700 text-slate-600"
                : "border-slate-600 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {learnInProgress
              ? t({ ko: "\uD559\uC2B5\uC911", en: "Running", ja: "\u5B9F\u884C\u4E2D", zh: "\u8FDB\u884C\u4E2D" })
              : t({ ko: "\uB2EB\uAE30", en: "Close", ja: "\u9589\u3058\u308B", zh: "\u5173\u95ED" })}
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 max-h-[calc(90vh-72px)]">
          {/* Hook command preview — terminal style */}
          <div className="rounded-xl border border-emerald-500/25 bg-slate-950/60 px-3 py-2">
            <div className="text-[11px] text-emerald-200">
              {t({ ko: "\uD6C5 \uBA85\uB839", en: "Hook command", ja: "\u30D5\u30C3\u30AF\u30B3\u30DE\u30F3\u30C9", zh: "\u94A9\u5B50\u547D\u4EE4" })}
            </div>
            <div className="mt-1 text-[11px] font-mono text-green-300 max-h-20 overflow-y-auto whitespace-pre-wrap break-all">
              $ {learningHook.command.slice(0, 500)}
              {learningHook.command.length > 500 ? "..." : ""}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {t({
                ko: "CLI \uB300\uD45C\uC790\uB97C \uC120\uD0DD\uD558\uC138\uC694 (\uBCF5\uC218 \uC120\uD0DD \uAC00\uB2A5)",
                en: "Select CLI representatives (multi-select)",
                ja: "CLI\u4EE3\u8868\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u8907\u6570\u9078\u629E\u53EF\uFF09",
                zh: "\u9009\u62E9 CLI \u4EE3\u8868\uFF08\u53EF\u591A\u9009\uFF09",
              })}
            </div>
            <div className="text-[11px] text-slate-500">
              {selectedProviders.length}
              {t({ ko: "\uBA85 \uC120\uD0DD\uB428", en: " selected", ja: "\u540D\u3092\u9078\u629E", zh: " \u5DF2\u9009\u62E9" })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {representatives.map((row) => {
              const isSelected = selectedProviders.includes(row.provider);
              const hasAgent = !!row.agent;
              const isAnimating = learnInProgress && isSelected && hasAgent;
              const isAlreadyLearned = modalLearnedProviders.has(row.provider);
              const isUnlearning = unlearningProviders.includes(row.provider);
              const unlearnEffect = unlearnEffects[row.provider];
              const isHitAnimating = !!unlearnEffect;
              const displayName = row.agent
                ? preferKoreanName
                  ? row.agent.name_ko || row.agent.name
                  : row.agent.name || row.agent.name_ko
                : t({ ko: "\uBC30\uCE58\uB41C \uC778\uC6D0 \uC5C6\uC74C", en: "No assigned member", ja: "\u62C5\u5F53\u30E1\u30F3\u30D0\u30FC\u306A\u3057", zh: "\u6682\u65E0\u6210\u5458" });

              return (
                <div
                  key={row.provider}
                  role={hasAgent ? "button" : undefined}
                  tabIndex={hasAgent ? 0 : -1}
                  onClick={() => {
                    if (!hasAgent || learnInProgress) return;
                    onToggleProvider(row.provider);
                  }}
                  onKeyDown={(event) => {
                    if (!hasAgent || learnInProgress) return;
                    const target = event.target as HTMLElement | null;
                    if (target?.closest("button")) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggleProvider(row.provider);
                    }
                  }}
                  aria-disabled={!hasAgent || learnInProgress}
                  className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                    !hasAgent
                      ? "cursor-not-allowed border-slate-700/80 bg-slate-800/40 opacity-60"
                      : isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-slate-700/70 bg-slate-800/60 hover:border-slate-500/80 hover:bg-slate-800/80"
                  }`}
                >
                  {isAnimating && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <span
                          key={`${row.provider}-book-${idx}`}
                          className="learn-book-drop"
                          style={{ left: `${8 + idx * 15}%`, animationDelay: `${idx * 0.15}s` }}
                        >
                          {idx % 2 === 0 ? "\u{1F4D8}" : "\u{1F4D9}"}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-3">
                    <div
                      className={`relative ${isAnimating ? "learn-avatar-reading" : ""} ${isHitAnimating ? "unlearn-avatar-hit" : ""}`}
                    >
                      <AgentAvatar agent={row.agent ?? undefined} agents={agents} size={50} rounded="xl" />
                      {isAnimating && <span className="learn-reading-book">{"\u{1F4D6}"}</span>}
                      {unlearnEffect === "pot" && <span className="unlearn-pot-drop">{"\u{1FAB4}"}</span>}
                      {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing">{"\u{1F528}"}</span>}
                      {isHitAnimating && (
                        <span className="unlearn-hit-text">
                          {t({ ko: "\uAE61~", en: "Bonk!", ja: "\u30B4\u30F3!", zh: "\u54A3~" })}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-slate-400">{hookProviderLabel(row.provider)}</div>
                      <div className="text-sm font-medium text-white truncate">{displayName}</div>
                      <div className="text-[11px] text-slate-500">
                        {row.agent
                          ? roleLabel(row.agent.role, t)
                          : t({ ko: "\uC0AC\uC6A9 \uBD88\uAC00", en: "Unavailable", ja: "\u5229\u7528\u4E0D\u53EF", zh: "\u4E0D\u53EF\u7528" })}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          isAlreadyLearned
                            ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/15"
                            : isSelected
                              ? "border-blue-400/50 text-blue-300 bg-blue-500/15"
                              : "border-slate-600 text-slate-400 bg-slate-700/40"
                        }`}
                      >
                        {isAlreadyLearned
                          ? t({ ko: "\uD559\uC2B5\uB428", en: "Learned", ja: "\u5B66\u7FD2\u6E08\u307F", zh: "\u5DF2\u5B66\u4E60" })
                          : isSelected
                            ? t({ ko: "\uC120\uD0DD\uB428", en: "Selected", ja: "\u9078\u629E", zh: "\u5DF2\u9009" })
                            : t({ ko: "\uB300\uAE30", en: "Idle", ja: "\u5F85\u6A5F", zh: "\u5F85\u547D" })}
                      </div>
                      {isAlreadyLearned && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onUnlearnProvider(row.provider);
                          }}
                          disabled={learnInProgress || isUnlearning}
                          className={`skill-unlearn-btn rounded-md border px-2 py-0.5 text-[10px] transition-all ${
                            learnInProgress || isUnlearning
                              ? "cursor-not-allowed border-slate-700 text-slate-600"
                              : "border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                          }`}
                        >
                          {isUnlearning
                            ? t({ ko: "\uCDE8\uC18C\uC911...", en: "Unlearning...", ja: "\u53D6\u6D88\u4E2D...", zh: "\u53D6\u6D88\u4E2D..." })
                            : t({ ko: "\uD559\uC2B5 \uCDE8\uC18C", en: "Unlearn", ja: "\u5B66\u7FD2\u53D6\u6D88", zh: "\u53D6\u6D88\u5B66\u4E60" })}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {squadAgents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {squadAgents.map((agent) => {
                const agentProvider = agent.cli_provider as HookLearnProvider | undefined;
                const isProviderSelected = agentProvider ? selectedProviders.includes(agentProvider) : false;
                const isAnimating = learnInProgress && isProviderSelected;
                const displayName = preferKoreanName
                  ? agent.name_ko || agent.name
                  : agent.name || agent.name_ko;

                return (
                  <div
                    key={`squad-${agent.id}`}
                    className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                      isProviderSelected
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-slate-700/70 bg-slate-800/60"
                    }`}
                  >
                    {isAnimating && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <span
                            key={`squad-${agent.id}-book-${idx}`}
                            className="learn-book-drop"
                            style={{ left: `${8 + idx * 15}%`, animationDelay: `${idx * 0.15}s` }}
                          >
                            {idx % 2 === 0 ? "\u{1F4D8}" : "\u{1F4D9}"}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative z-10 flex items-center gap-3">
                      <div className={`relative ${isAnimating ? "learn-avatar-reading" : ""}`}>
                        <AgentAvatar agent={agent} agents={agents} size={50} rounded="xl" />
                        {isAnimating && <span className="learn-reading-book">{"\u{1F4D6}"}</span>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-slate-400">
                          {agentProvider ? hookProviderLabel(agentProvider) : "\u2014"}
                        </div>
                        <div className="text-sm font-medium text-white truncate">{displayName}</div>
                        <div className="text-[11px] text-slate-500">{roleLabel(agent.role, t)}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveAgent(agent.id)}
                        disabled={learnInProgress}
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] transition-all ${
                          learnInProgress
                            ? "cursor-not-allowed border-slate-700 text-slate-600"
                            : "border-slate-600 text-slate-400 hover:border-rose-500/40 hover:text-rose-300 hover:bg-rose-500/10"
                        }`}
                      >
                        {"\u2715"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => {
                if (!learnInProgress) {
                  setShowAgentPicker((prev) => !prev);
                  setAgentSearch("");
                }
              }}
              disabled={learnInProgress}
              className={`w-full rounded-xl border border-dashed p-2.5 text-xs transition-all ${
                learnInProgress
                  ? "cursor-not-allowed border-slate-700 text-slate-600"
                  : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              + {t({ ko: "\uC5D0\uC774\uC804\uD2B8 \uCD94\uAC00", en: "Add Agent", ja: "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u8FFD\u52A0", zh: "\u6DFB\u52A0\u4EE3\u7406" })}
            </button>

            {showAgentPicker && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-xl">
                <div className="border-b border-slate-700/60 px-3 py-2">
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder={t({ ko: "\uAC80\uC0C9...", en: "Search...", ja: "\u691C\u7D22...", zh: "\u641C\u7D22..." })}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {availableAgents.length === 0 ? (
                    <div className="px-3 py-3 text-center text-[11px] text-slate-500">
                      {t({
                        ko: "\uCD94\uAC00 \uAC00\uB2A5\uD55C \uC5D0\uC774\uC804\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
                        en: "No agents available",
                        ja: "\u8FFD\u52A0\u3067\u304D\u308B\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u304C\u3042\u308A\u307E\u305B\u3093",
                        zh: "\u6CA1\u6709\u53EF\u6DFB\u52A0\u7684\u4EE3\u7406",
                      })}
                    </div>
                  ) : (
                    availableAgents.map((agent) => {
                      const displayName = preferKoreanName
                        ? agent.name_ko || agent.name
                        : agent.name || agent.name_ko;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => {
                            onAddAgent(agent.id);
                            setShowAgentPicker(false);
                            setAgentSearch("");
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-800"
                        >
                          <AgentAvatar agent={agent} agents={agents} size={28} rounded="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-white truncate">{displayName}</div>
                            <div className="text-[10px] text-slate-500">
                              {agent.cli_provider ? hookProviderLabel(agent.cli_provider as HookLearnProvider) : "\u2014"} · {roleLabel(agent.role, t)}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Job status */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-slate-300">
                {t({ ko: "\uC791\uC5C5 \uC0C1\uD0DC", en: "Job status", ja: "\u30B8\u30E7\u30D6\u72B6\u614B", zh: "\u4EFB\u52A1\u72B6\u6001" })}:{" "}
                <span
                  className={`font-medium ${
                    learnJob?.status === "succeeded"
                      ? "text-emerald-300"
                      : learnJob?.status === "failed"
                        ? "text-rose-300"
                        : learnJob?.status === "running" || learnJob?.status === "queued"
                          ? "text-amber-300"
                          : "text-slate-500"
                  }`}
                >
                  {learningStatusLabel(learnJob?.status ?? null, t)}
                </span>
              </div>

              {learnJob?.completedAt && (
                <div className="text-[11px] text-slate-500">
                  {new Intl.DateTimeFormat(localeTag, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(new Date(learnJob.completedAt))}
                </div>
              )}
            </div>

            {learnError && <div className="mt-2 text-[11px] text-rose-300">{learnError}</div>}
            {unlearnError && <div className="mt-2 text-[11px] text-rose-300">{unlearnError}</div>}
            {learnJob?.error && <div className="mt-2 text-[11px] text-rose-300">{learnJob.error}</div>}

            {learnJob && (
              <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2 font-mono text-[10px] text-slate-300 max-h-32 overflow-y-auto space-y-1">
                <div className="text-slate-500">$ {learnJob.command}</div>
                {learnJob.logTail.length > 0 ? (
                  learnJob.logTail.slice(-10).map((line, idx) => <div key={`${learnJob.id}-log-${idx}`}>{line}</div>)
                ) : (
                  <div className="text-slate-600">
                    {t({ ko: "\uB85C\uADF8\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4", en: "No logs yet", ja: "\u30ED\u30B0\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093", zh: "\u6682\u65E0\u65E5\u5FD7" })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={learnInProgress}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                learnInProgress
                  ? "cursor-not-allowed border-slate-700 text-slate-600"
                  : "border-slate-600 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {t({ ko: "\uCDE8\uC18C", en: "Cancel", ja: "\u30AD\u30E3\u30F3\u30BB\u30EB", zh: "\u53D6\u6D88" })}
            </button>
            <button
              onClick={onStartLearning}
              disabled={
                selectedProviders.length === 0 ||
                learnSubmitting ||
                learnInProgress ||
                defaultSelectedProviders.length === 0
              }
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                selectedProviders.length === 0 || learnInProgress || defaultSelectedProviders.length === 0
                  ? "cursor-not-allowed border-slate-700 text-slate-600"
                  : "border-emerald-500/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
              }`}
            >
              {learnSubmitting || learnInProgress
                ? t({ ko: "\uD559\uC2B5\uC911...", en: "Learning...", ja: "\u5B66\u7FD2\u4E2D...", zh: "\u5B66\u4E60\u4E2D..." })
                : t({ ko: "\uD559\uC2B5 \uC2DC\uC791", en: "Start Learning", ja: "\u5B66\u7FD2\u958B\u59CB", zh: "\u5F00\u59CB\u5B66\u4E60" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
