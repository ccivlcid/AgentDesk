import type { MemoryHistoryProvider, MemoryLearnProvider } from "../../api/memory";
import type { Agent, MemoryEntry } from "../../types";
import AgentAvatar from "../AgentAvatar";
import {
  memoryProviderLabel,
  roleLabel,
  learningStatusLabel,
  categoryLabel,
  type TFunction,
  type UnlearnEffect,
} from "./model";

interface MemoryLearningModalProps {
  t: TFunction;
  localeTag: string;
  agents: Agent[];
  learningEntry: MemoryEntry | null;
  learnInProgress: boolean;
  selectedProviders: MemoryLearnProvider[];
  representatives: Array<{ provider: MemoryLearnProvider; agent: Agent | null }>;
  preferKoreanName: boolean;
  modalLearnedProviders: Set<MemoryHistoryProvider>;
  unlearningProviders: MemoryLearnProvider[];
  unlearnEffects: Partial<Record<MemoryLearnProvider, UnlearnEffect>>;
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
  defaultSelectedProviders: MemoryLearnProvider[];
  onClose: () => void;
  onToggleProvider: (provider: MemoryLearnProvider) => void;
  onUnlearnProvider: (provider: MemoryLearnProvider) => void;
  onStartLearning: () => void;
}

export default function MemoryLearningModal({
  t,
  localeTag,
  agents,
  learningEntry,
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
  onClose,
  onToggleProvider,
  onUnlearnProvider,
  onStartLearning,
}: MemoryLearningModalProps) {
  if (!learningEntry) return null;

  return (
    <div className="skills-learn-modal fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="skills-learn-modal-card w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/60 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {t({
                ko: "\uBA54\uBAA8\uB9AC \uD559\uC2B5 \uC2A4\uCFFC\uB4DC",
                en: "Memory Learning Squad",
                ja: "\u30E1\u30E2\u30EA\u5B66\u7FD2\u30B9\u30AF\u30EF\u30C3\u30C9",
                zh: "\u8BB0\u5FC6\u5B66\u4E60\u5C0F\u961F",
              })}
            </h3>
            <div className="mt-1 text-xs text-slate-400">
              {learningEntry.title} &middot; {categoryLabel(learningEntry.category, t)}
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
          {/* Memory content preview */}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
            <div className="text-[11px] text-emerald-200">
              {t({ ko: "\uBA54\uBAA8\uB9AC \uB0B4\uC6A9", en: "Memory content", ja: "\u30E1\u30E2\u30EA\u5185\u5BB9", zh: "\u8BB0\u5FC6\u5185\u5BB9" })}
            </div>
            <div className="mt-1 text-[11px] font-mono text-emerald-300 max-h-20 overflow-y-auto whitespace-pre-wrap break-all">
              {learningEntry.content.slice(0, 500)}
              {learningEntry.content.length > 500 ? "..." : ""}
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
                          {idx % 2 === 0 ? "\uD83D\uDCD8" : "\uD83D\uDCD9"}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-3">
                    <div
                      className={`relative ${isAnimating ? "learn-avatar-reading" : ""} ${isHitAnimating ? "unlearn-avatar-hit" : ""}`}
                    >
                      <AgentAvatar agent={row.agent ?? undefined} agents={agents} size={50} rounded="xl" />
                      {isAnimating && <span className="learn-reading-book">{"\uD83D\uDCD6"}</span>}
                      {unlearnEffect === "pot" && <span className="unlearn-pot-drop">{"\uD83E\uDEB4"}</span>}
                      {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing">{"\uD83D\uDD28"}</span>}
                      {isHitAnimating && (
                        <span className="unlearn-hit-text">
                          {t({ ko: "\uAE61~", en: "Bonk!", ja: "\u30B4\u30F3!", zh: "\u54A3~" })}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-slate-400">{memoryProviderLabel(row.provider)}</div>
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
