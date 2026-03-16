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
  emptyMessage?: string;
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

const SCOPE_BADGES: Record<string, { icon: string; color: string }> = {
  global:        { icon: "🌐", color: "#3b82f6" },
  project:       { icon: "📋", color: "#8b5cf6" },
  agent:         { icon: "🤖", color: "#f59e0b" },
  department:    { icon: "🏢", color: "#10b981" },
  workflow_pack: { icon: "📦", color: "#6366f1" },
};

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
  emptyMessage,
}: HooksGridProps) {
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {emptyMessage ?? t({
            ko: "등록된 훅이 없습니다",
            en: "No hooks registered",
            ja: "登録済みのフックがありません",
            zh: "暂无已注册的钩子",
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
            className={`relative p-4 transition-all group ${
              !hook.enabled ? "opacity-50" : ""
            } ${isDeleting ? "pointer-events-none opacity-30" : ""}`}
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
          >
            {/* Header: event type icon + title + learned avatars */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="text-lg shrink-0">{EVENT_TYPE_ICONS[hook.event_type] || "\u{1F517}"}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold font-mono truncate" style={{ color: "var(--th-text-primary)" }}>{hook.title}</h3>
                  {hook.description && (
                    <p className="text-xs mt-0.5 line-clamp-2 font-mono" style={{ color: "var(--th-text-muted)" }}>{hook.description}</p>
                  )}
                </div>
              </div>

              {learnedProviders.length > 0 && (
                <div className="grid w-[64px] shrink-0 grid-cols-2 gap-1 p-1" style={{ borderRadius: 0, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.05)" }}>
                  {learnedProviders.map((provider) => {
                    const agent = learnedRepresentatives.get(provider) ?? null;
                    return (
                      <span
                        key={`${hook.id}-${provider}`}
                        className="inline-flex h-5 w-6 items-center justify-center gap-0.5 border border-emerald-500/20"
                        style={{ borderRadius: 0, background: "rgba(15,17,23,0.7)" }}
                        title={`${hookLearnedProviderLabel(provider)}${agent ? ` \u00B7 ${agent.name}` : ""}`}
                      >
                        <span className="flex h-2.5 w-2.5 items-center justify-center">
                          {cliProviderIcon(provider)}
                        </span>
                        <span className="h-2.5 w-2.5 overflow-hidden" style={{ borderRadius: "3px", background: "var(--th-bg-elevated)" }}>
                          <AgentAvatar agent={agent ?? undefined} agents={agents} size={10} rounded="xl" />
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Command preview */}
            <div className="mb-3 px-2 py-1.5 border" style={{ borderRadius: 0, background: "var(--th-terminal-bg)", borderColor: "var(--th-border)" }}>
              <p className="text-xs text-green-300 line-clamp-2 font-mono">{hook.command}</p>
            </div>

            {/* Footer: tags + actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {/* Scope badge */}
                {hook.scope_type && hook.scope_type !== "global" && (() => {
                  const sb = SCOPE_BADGES[hook.scope_type];
                  return sb ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono border" style={{ borderRadius: 0, background: `${sb.color}18`, color: sb.color, borderColor: `${sb.color}44` }}>
                      {sb.icon} {hook.scope_type}
                    </span>
                  ) : null;
                })()}
                {/* Event type badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium font-mono border ${etColor}`} style={{ borderRadius: 0 }}>
                  {eventTypeLabel(hook.event_type, t)}
                </span>
                {/* Priority badge */}
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium font-mono border" style={{ borderRadius: 0, background: "var(--th-bg-surface-hover)", color: "var(--th-text-muted)", borderColor: "var(--th-border)" }}>
                  P{hook.priority}
                </span>
                {/* Execution count badge */}
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium font-mono border" style={{ borderRadius: 0, background: "var(--th-bg-surface-hover)", color: "var(--th-text-muted)", borderColor: "var(--th-border)" }}>
                  {t({ ko: "\uC2E4\uD589", en: "Runs", ja: "\u5B9F\u884C", zh: "\u8FD0\u884C" })}: {hook.execution_count}
                </span>
                {/* Last executed relative time */}
                {hook.last_executed_at && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium font-mono border" style={{ borderRadius: 0, background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", borderColor: "var(--th-border)" }}>
                    {formatRelativeTime(hook.last_executed_at, t)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onOpenLearningModal(hook)}
                    className={`px-2 py-1 text-[10px] border font-mono transition-all ${
                      learnedProviders.length > 0
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 cursor-pointer hover:bg-emerald-500/25"
                        : "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                    }`}
                    style={{ borderRadius: 0 }}
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
                    className={`px-1.5 py-0.5 text-[10px] border font-mono transition-all ${
                      hook.enabled
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-[rgba(51,65,85,0.4)] text-[#94a3b8] border-[rgba(71,85,105,0.3)] hover:bg-[rgba(51,65,85,0.6)]"
                    }`}
                    style={{ borderRadius: 0 }}
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
                    className="px-2 py-1 text-[10px] font-medium font-mono transition-all"
                    style={{ borderRadius: 0, background: "rgba(251,191,36,0.1)", color: "var(--th-accent)", border: "1px solid rgba(251,191,36,0.35)" }}
                  >
                    {t({ ko: "\uC218\uC815", en: "Edit", ja: "\u7DE8\u96C6", zh: "\u7F16\u8F91" })}
                  </button>
                  <button
                    onClick={() => onDelete(hook.id)}
                    className="px-2 py-1 text-[10px] font-medium font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                    style={{ borderRadius: 0 }}
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
