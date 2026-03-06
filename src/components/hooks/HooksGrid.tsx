import type { HookEntry, Agent } from "../../types";
import type { HookHistoryProvider } from "../../api/hooks";
import AgentAvatar from "../AgentAvatar";
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_ICONS,
  eventTypeLabel,
  cliProviderIcon,
  hookLearnedProviderLabel,
  type TFunction,
} from "./model";

interface HooksGridProps {
  t: TFunction;
  filtered: HookEntry[];
  onToggle: (id: string) => void;
  onEdit: (hook: HookEntry) => void;
  onDelete: (id: string) => void;
  deletingHookId: string | null;
  learnedProvidersByHook: Map<string, HookHistoryProvider[]>;
  learnedRepresentatives: Map<HookHistoryProvider, Agent | null>;
  agents: Agent[];
  onOpenLearningModal: (hook: HookEntry) => void;
}

function formatRelativeTime(timestampMs: number, t: TFunction): string {
  const now = Date.now();
  const diffMs = now - timestampMs;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay}${t({ ko: "\uC77C \uC804", en: "d ago", ja: "\u65E5\u524D", zh: "\u5929\u524D" })}`;
  }
  if (diffHour > 0) {
    return `${diffHour}${t({ ko: "\uC2DC\uAC04 \uC804", en: "h ago", ja: "\u6642\u9593\u524D", zh: "\u5C0F\u65F6\u524D" })}`;
  }
  if (diffMin > 0) {
    return `${diffMin}${t({ ko: "\uBD84 \uC804", en: "m ago", ja: "\u5206\u524D", zh: "\u5206\u949F\u524D" })}`;
  }
  return t({ ko: "\uBC29\uAE08", en: "just now", ja: "\u305F\u3063\u305F\u4ECA", zh: "\u521A\u521A" });
}

export default function HooksGrid({
  t,
  filtered,
  onToggle,
  onEdit,
  onDelete,
  deletingHookId,
  learnedProvidersByHook,
  learnedRepresentatives,
  agents,
  onOpenLearningModal,
}: HooksGridProps) {
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="text-4xl">{"\u{1F517}"}</div>
        <div className="text-slate-400 text-sm">
          {t({
            ko: "\uB4F1\uB85D\uB41C \uD6C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
            en: "No hooks registered",
            ja: "\u767B\u9332\u6E08\u307F\u306E\u30D5\u30C3\u30AF\u304C\u3042\u308A\u307E\u305B\u3093",
            zh: "\u6682\u65E0\u5DF2\u6CE8\u518C\u7684\u94A9\u5B50",
          })}
        </div>
        <div className="text-slate-500 text-xs">
          {t({
            ko: "\uC0C1\uB2E8\uC758 '\uD6C5 \uCD94\uAC00' \uBC84\uD2BC\uC73C\uB85C \uC0C8 \uD6C5\uC744 \uB9CC\uB4E4\uC5B4\uBCF4\uC138\uC694",
            en: "Click 'Add Hook' above to create a new hook",
            ja: "\u4E0A\u306E\u300C\u30D5\u30C3\u30AF\u8FFD\u52A0\u300D\u30DC\u30BF\u30F3\u3067\u65B0\u3057\u3044\u30D5\u30C3\u30AF\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044",
            zh: "\u70B9\u51FB\u4E0A\u65B9\u7684\u300C\u6DFB\u52A0\u94A9\u5B50\u300D\u6309\u94AE\u521B\u5EFA\u65B0\u94A9\u5B50",
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {filtered.map((hook) => {
        const etColor = EVENT_TYPE_COLORS[hook.event_type] || EVENT_TYPE_COLORS["pre-task"];
        const isDeleting = deletingHookId === hook.id;
        const learnedProviders = (learnedProvidersByHook.get(hook.id) ?? []).slice(0, 4);

        return (
          <div
            key={hook.id}
            className={`relative bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all group ${
              !hook.enabled ? "opacity-50" : ""
            } ${isDeleting ? "pointer-events-none opacity-30" : ""}`}
          >
            {/* Header: event type icon + title + learned avatars */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="text-lg shrink-0">{EVENT_TYPE_ICONS[hook.event_type] || "\u{1F517}"}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white truncate">{hook.title}</h3>
                  {hook.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{hook.description}</p>
                  )}
                </div>
              </div>

              {learnedProviders.length > 0 && (
                <div className="grid w-[64px] shrink-0 grid-cols-2 gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-1">
                  {learnedProviders.map((provider) => {
                    const agent = learnedRepresentatives.get(provider) ?? null;
                    return (
                      <span
                        key={`${hook.id}-${provider}`}
                        className="inline-flex h-5 w-6 items-center justify-center gap-0.5 rounded-md border border-emerald-500/20 bg-slate-900/70"
                        title={`${hookLearnedProviderLabel(provider)}${agent ? ` \u00B7 ${agent.name}` : ""}`}
                      >
                        <span className="flex h-2.5 w-2.5 items-center justify-center">
                          {cliProviderIcon(provider)}
                        </span>
                        <span className="h-2.5 w-2.5 overflow-hidden rounded-[3px] bg-slate-800/80">
                          <AgentAvatar agent={agent ?? undefined} agents={agents} size={10} rounded="xl" />
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Command preview */}
            <div className="mb-3 px-2 py-1.5 bg-slate-950/60 border border-slate-700/30 rounded-lg">
              <p className="text-xs text-green-300 line-clamp-2 font-mono">{hook.command}</p>
            </div>

            {/* Footer: tags + actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {/* Event type badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${etColor}`}>
                  {eventTypeLabel(hook.event_type, t)}
                </span>
                {/* Priority badge */}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-400 border border-slate-600/30">
                  P{hook.priority}
                </span>
                {/* Execution count badge */}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-400 border border-slate-600/30">
                  {t({ ko: "\uC2E4\uD589", en: "Runs", ja: "\u5B9F\u884C", zh: "\u8FD0\u884C" })}: {hook.execution_count}
                </span>
                {/* Last executed relative time */}
                {hook.last_executed_at && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/40 text-slate-500 border border-slate-600/30">
                    {formatRelativeTime(hook.last_executed_at, t)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onOpenLearningModal(hook)}
                    className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                      learnedProviders.length > 0
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 cursor-pointer hover:bg-emerald-500/25"
                        : "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                    }`}
                    title={
                      learnedProviders.length > 0
                        ? t({
                            ko: "학습 완료 · 클릭 시 학습 모달",
                            en: "Learned · Click to open learning modal",
                            ja: "学習済み · クリックで学習モーダル",
                            zh: "已学习 · 点击打开学习弹窗",
                          })
                        : t({
                            ko: "CLI 대표자에게 훅 학습시키기",
                            en: "Teach this hook to selected CLI leaders",
                            ja: "選択したCLI代表にこのフックを学習させる",
                            zh: "让所选 CLI 代表学习此钩子",
                          })
                    }
                  >
                    {learnedProviders.length > 0
                      ? t({ ko: "학습됨", en: "Learned", ja: "学習済み", zh: "已学习" })
                      : t({ ko: "학습", en: "Learn", ja: "学習", zh: "学习" })}
                  </button>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Toggle switch */}
                  <button
                    onClick={() => onToggle(hook.id)}
                    className={`px-1.5 py-0.5 text-[10px] rounded-md border transition-all ${
                      hook.enabled
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-slate-700/40 text-slate-400 border-slate-600/30 hover:bg-slate-700/60"
                    }`}
                    title={hook.enabled
                      ? t({ ko: "\uBE44\uD65C\uC131\uD654", en: "Disable", ja: "\u7121\u52B9\u5316", zh: "\u7981\u7528" })
                      : t({ ko: "\uD65C\uC131\uD654", en: "Enable", ja: "\u6709\u52B9\u5316", zh: "\u542F\u7528" })}
                  >
                    {hook.enabled
                      ? t({ ko: "ON", en: "ON", ja: "ON", zh: "ON" })
                      : t({ ko: "OFF", en: "OFF", ja: "OFF", zh: "OFF" })}
                  </button>
                  <button
                    onClick={() => onEdit(hook)}
                    className="px-2 py-1 text-[10px] font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 transition-all"
                  >
                    {t({ ko: "\uC218\uC815", en: "Edit", ja: "\u7DE8\u96C6", zh: "\u7F16\u8F91" })}
                  </button>
                  <button
                    onClick={() => onDelete(hook.id)}
                    className="px-2 py-1 text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-all"
                  >
                    {t({ ko: "\uC0AD\uC81C", en: "Delete", ja: "\u524A\u9664", zh: "\u5220\u9664" })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
