import type { UiLanguage } from "../../i18n";
import type { HookEventType, HookScopeType, Agent, AgentRole } from "../../types";
import type { HookHistoryProvider, HookLearnProvider, HookLearnJob } from "../../api/hooks";

export type Locale = UiLanguage;
export type TFunction = (messages: Record<Locale, string>) => string;

export const HOOK_EVENT_TYPES: HookEventType[] = [
  "pre-task",
  "post-task",
  "on-error",
  "on-complete",
  "on-status-change",
  "on-start",
];

export const ALL_EVENT_TYPES = ["All", ...HOOK_EVENT_TYPES] as const;

export const EVENT_TYPE_ICONS: Record<string, string> = {
  All: "\u{1F4CB}",
  "pre-task": "\u23EE\uFE0F",
  "post-task": "\u23ED\uFE0F",
  "on-error": "\u274C",
  "on-complete": "\u2705",
  "on-status-change": "\u{1F504}",
  "on-start": "\u25B6\uFE0F",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  "pre-task": "text-blue-400 bg-blue-500/15 border-blue-500/30",
  "post-task": "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  "on-error": "text-red-400 bg-red-500/15 border-red-500/30",
  "on-complete": "text-green-400 bg-green-500/15 border-green-500/30",
  "on-status-change": "text-amber-400 bg-amber-500/15 border-amber-500/30",
  "on-start": "text-purple-400 bg-purple-500/15 border-purple-500/30",
};

export function eventTypeLabel(eventType: string, t: TFunction): string {
  const labels: Record<string, Record<Locale, string>> = {
    All: { ko: "\uC804\uCCB4", en: "All", ja: "\u3059\u3079\u3066", zh: "\u5168\u90E8" },
    "pre-task": { ko: "\uD0DC\uC2A4\uD06C \uC804", en: "Pre-Task", ja: "\u30BF\u30B9\u30AF\u524D", zh: "\u4EFB\u52A1\u524D" },
    "post-task": { ko: "\uD0DC\uC2A4\uD06C \uD6C4", en: "Post-Task", ja: "\u30BF\u30B9\u30AF\u5F8C", zh: "\u4EFB\u52A1\u540E" },
    "on-error": { ko: "\uC624\uB958 \uBC1C\uC0DD \uC2DC", en: "On Error", ja: "\u30A8\u30E9\u30FC\u6642", zh: "\u53D1\u751F\u9519\u8BEF\u65F6" },
    "on-complete": { ko: "\uC644\uB8CC \uC2DC", en: "On Complete", ja: "\u5B8C\u4E86\u6642", zh: "\u5B8C\u6210\u65F6" },
    "on-status-change": { ko: "\uC0C1\uD0DC \uBCC0\uACBD \uC2DC", en: "On Status Change", ja: "\u30B9\u30C6\u30FC\u30BF\u30B9\u5909\u66F4\u6642", zh: "\u72B6\u6001\u53D8\u5316\u65F6" },
    "on-start": { ko: "\uC2DC\uC791 \uC2DC", en: "On Start", ja: "\u958B\u59CB\u6642", zh: "\u542F\u52A8\u65F6" },
  };
  return labels[eventType] ? t(labels[eventType]) : eventType;
}

export const SCOPE_TYPES: HookScopeType[] = ["global", "department", "agent", "workflow_pack"];
export const ALL_SCOPES = ["All", ...SCOPE_TYPES] as const;

export const SCOPE_ICONS: Record<string, string> = {
  All: "\u{1F50D}",
  global: "\u{1F310}",
  department: "\u{1F3E2}",
  agent: "\u{1F916}",
  workflow_pack: "\u{1F4E6}",
};

export function scopeLabel(scope: string, t: TFunction): string {
  const labels: Record<string, Record<Locale, string>> = {
    All: { ko: "\uC804\uCCB4", en: "All", ja: "\u3059\u3079\u3066", zh: "\u5168\u90E8" },
    global: { ko: "\uAE00\uB85C\uBC8C", en: "Global", ja: "\u30B0\u30ED\u30FC\u30D0\u30EB", zh: "\u5168\u5C40" },
    department: { ko: "\uBD80\uC11C\uBCC4", en: "Department", ja: "\u90E8\u7F72\u5225", zh: "\u90E8\u95E8" },
    agent: { ko: "\uC5D0\uC774\uC804\uD2B8\uBCC4", en: "Agent", ja: "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u5225", zh: "\u4EE3\u7406" },
    workflow_pack: { ko: "\uC6CC\uD06C\uD50C\uB85C\uC6B0\uBCC4", en: "Workflow", ja: "\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u5225", zh: "\u5DE5\u4F5C\u6D41" },
  };
  return labels[scope] ? t(labels[scope]) : scope;
}

export type HookSortBy = "priority" | "name" | "date" | "executions";

// ── Hook Learning constants & utilities ─────────────────────────────

export const HOOK_LEARN_PROVIDER_ORDER: HookLearnProvider[] = ["claude", "codex", "gemini", "opencode", "cursor"];
export const HOOK_LEARNED_PROVIDER_ORDER: HookHistoryProvider[] = [
  "claude", "codex", "gemini", "opencode", "copilot", "antigravity", "cursor", "api",
];

export type UnlearnEffect = "pot" | "hammer";

const ROLE_ORDER: Record<AgentRole, number> = {
  team_leader: 0,
  senior: 1,
  junior: 2,
  intern: 3,
};

export function roleLabel(role: AgentRole, t: TFunction): string {
  if (role === "team_leader") return t({ ko: "\uD300\uC7A5", en: "Team Lead", ja: "\u30C1\u30FC\u30E0\u30EA\u30FC\u30C9", zh: "\u56E2\u961F\u8D1F\u8D23\u4EBA" });
  if (role === "senior") return t({ ko: "\uC2DC\uB2C8\uC5B4", en: "Senior", ja: "\u30B7\u30CB\u30A2", zh: "\u8D44\u6DF1" });
  if (role === "junior") return t({ ko: "\uC8FC\uB2C8\uC5B4", en: "Junior", ja: "\u30B8\u30E5\u30CB\u30A2", zh: "\u521D\u7EA7" });
  return t({ ko: "\uC778\uD134", en: "Intern", ja: "\u30A4\u30F3\u30BF\u30FC\u30F3", zh: "\u5B9E\u4E60\u751F" });
}

export function hookProviderLabel(provider: HookLearnProvider | HookHistoryProvider): string {
  if (provider === "claude") return "Claude Code";
  if (provider === "codex") return "Codex";
  if (provider === "gemini") return "Gemini";
  if (provider === "opencode") return "OpenCode";
  if (provider === "copilot") return "GitHub Copilot";
  if (provider === "antigravity") return "Antigravity";
  if (provider === "cursor") return "Cursor";
  return "API Provider";
}

export function hookLearnedProviderLabel(provider: HookHistoryProvider): string {
  return hookProviderLabel(provider);
}

export function hookStatusLabel(status: string): string {
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "succeeded") return "Succeeded";
  return "Failed";
}

export function hookStatusClass(status: string): string {
  if (status === "succeeded") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  if (status === "running") return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  if (status === "queued") return "border-slate-500/40 bg-slate-600/10 text-slate-300";
  return "border-rose-400/40 bg-rose-500/10 text-rose-300";
}

export function hookRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "-";
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear}y ago`;
}

export function hookLearningRowKey(row: { provider: HookHistoryProvider; hook_id: string }): string {
  return `${row.provider}:${row.hook_id}`;
}

export function learningStatusLabel(status: HookLearnJob["status"] | null, t: TFunction): string {
  if (status === "queued") return t({ ko: "\uB300\uAE30\uC911", en: "Queued", ja: "\u5F85\u6A5F\u4E2D", zh: "\u6392\u961F\u4E2D" });
  if (status === "running") return t({ ko: "\uD559\uC2B5\uC911", en: "Running", ja: "\u5B66\u7FD2\u4E2D", zh: "\u5B66\u4E60\u4E2D" });
  if (status === "succeeded") return t({ ko: "\uC644\uB8CC", en: "Succeeded", ja: "\u5B8C\u4E86", zh: "\u5B8C\u6210" });
  if (status === "failed") return t({ ko: "\uC2E4\uD328", en: "Failed", ja: "\u5931\u6557", zh: "\u5931\u8D25" });
  return "-";
}

export function pickRepresentativeForProvider(agents: Agent[], provider: Agent["cli_provider"]): Agent | null {
  const candidates = agents.filter((agent) => agent.cli_provider === provider);
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const roleGap = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (roleGap !== 0) return roleGap;
    if (b.stats_xp !== a.stats_xp) return b.stats_xp - a.stats_xp;
    return a.id.localeCompare(b.id);
  });
  return sorted[0];
}

function CliClaudeLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none" aria-hidden="true">
      <path
        fill="#D97757"
        d="m124.011 241.251 49.164-27.585.826-2.396-.826-1.333h-2.396l-8.217-.506-28.09-.759-24.363-1.012-23.603-1.266-5.938-1.265L75 197.79l.574-3.661 4.994-3.358 7.153.625 15.808 1.079 23.722 1.637 17.208 1.012 25.493 2.649h4.049l.574-1.637-1.384-1.012-1.079-1.012-24.548-16.635-26.573-17.58-13.919-10.123-7.524-5.129-3.796-4.808-1.637-10.494 6.833-7.525 9.178.624 2.345.625 9.296 7.153 19.858 15.37 25.931 19.098 3.796 3.155 1.519-1.08.185-.759-1.704-2.851-14.104-25.493-15.049-25.931-6.698-10.747-1.772-6.445c-.624-2.649-1.08-4.876-1.08-7.592l7.778-10.561L144.729 75l10.376 1.383 4.37 3.797 6.445 14.745 10.443 23.215 16.197 31.566 4.741 9.364 2.53 8.672.945 2.649h1.637v-1.519l1.332-17.782 2.464-21.832 2.395-28.091.827-7.912 3.914-9.482 7.778-5.129 6.074 2.902 4.994 7.153-.692 4.623-2.969 19.301-5.821 30.234-3.796 20.245h2.21l2.531-2.53 10.241-13.599 17.208-21.511 7.593-8.537 8.857-9.431 5.686-4.488h10.747l7.912 11.76-3.543 12.147-11.067 14.037-9.178 11.895-13.16 17.714-8.216 14.172.759 1.131 1.957-.186 29.727-6.327 16.062-2.901 19.166-3.29 8.672 4.049.944 4.116-3.408 8.419-20.498 5.062-24.042 4.808-35.801 8.469-.439.321.506.624 16.13 1.519 6.9.371h16.888l31.448 2.345 8.217 5.433 4.926 6.647-.827 5.061-12.653 6.445-17.074-4.049-39.85-9.482-13.666-3.408h-1.889v1.131l11.388 11.135 20.87 18.845 26.133 24.295 1.333 6.006-3.357 4.741-3.543-.506-22.962-17.277-8.858-7.777-20.06-16.888H238.5v1.771l4.623 6.765 24.413 36.696 1.265 11.253-1.771 3.661-6.327 2.21-6.951-1.265-14.29-20.06-14.745-22.591-11.895-20.246-1.451.827-7.018 75.601-3.29 3.863-7.592 2.902-6.327-4.808-3.357-7.778 3.357-15.37 4.049-20.06 3.29-15.943 2.969-19.807 1.772-6.58-.118-.439-1.451.186-14.931 20.498-22.709 30.689-17.968 19.234-4.302 1.704-7.458-3.864.692-6.9 4.167-6.141 24.869-31.634 14.999-19.605 9.684-11.32-.068-1.637h-.573l-66.052 42.887-11.759 1.519-5.062-4.741.625-7.778 2.395-2.531 19.858-13.665-.068.067z"
      />
    </svg>
  );
}

function CliCodexLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0011.708.413a6.12 6.12 0 00-5.834 4.27 5.984 5.984 0 00-3.996 2.9 6.043 6.043 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.192 24a6.116 6.116 0 005.84-4.27 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.01zM13.192 22.784a4.474 4.474 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.658 18.607a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.77.77 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 20.236a4.508 4.508 0 01-6.083-1.63zM2.328 7.847A4.477 4.477 0 014.68 5.879l-.002.159v5.52a.78.78 0 00.391.676l5.84 3.37-2.02 1.166a.08.08 0 01-.073.007L3.917 13.98a4.506 4.506 0 01-1.589-6.132zM19.835 11.94l-5.844-3.37 2.02-1.166a.08.08 0 01.073-.007l4.898 2.794a4.494 4.494 0 01-.69 8.109v-5.68a.79.79 0 00-.457-.68zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L10.302 9.42V7.088a.08.08 0 01.033-.062l4.898-2.824a4.497 4.497 0 016.612 4.66v.054zM9.076 12.59l-2.02-1.164a.08.08 0 01-.038-.057V5.79A4.498 4.498 0 0114.392 3.2l-.141.08-4.778 2.758a.795.795 0 00-.392.681l-.005 5.87zm1.098-2.358L12 9.019l1.826 1.054v2.109L12 13.235l-1.826-1.054v-2.108z"
        fill="#10A37F"
      />
    </svg>
  );
}

function CliGeminiLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"
        fill="#6C7FF8"
      />
    </svg>
  );
}

function CliCursorLogo({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 466.73 533.32" fill="none" aria-hidden="true">
      <path d="M233.37,266.66l231.16,133.46c-1.42,2.46-3.48,4.56-6.03,6.03l-216.06,124.74c-5.61,3.24-12.53,3.24-18.14,0L8.24,406.15c-2.55-1.47-4.61-3.57-6.03-6.03l231.16-133.46h0Z" fill="#72716d" />
      <path d="M233.37,0v266.66L2.21,400.12c-1.42-2.46-2.21-5.3-2.21-8.24v-250.44c0-5.89,3.14-11.32,8.24-14.27L224.29,2.43c2.81-1.62,5.94-2.43,9.07-2.43h.01Z" fill="#55544f" />
      <path d="M464.52,133.2c-1.42-2.46-3.48-4.56-6.03-6.03L242.43,2.43c-2.8-1.62-5.93-2.43-9.06-2.43v266.66l231.16,133.46c1.42-2.46,2.21-5.3,2.21-8.24v-250.44c0-2.95-.78-5.77-2.21-8.24h-.01Z" fill="#43413c" />
      <path d="M448.35,142.54c1.31,2.26,1.49,5.16,0,7.74l-209.83,363.42c-1.41,2.46-5.16,1.45-5.16-1.38v-239.48c0-1.91-.51-3.75-1.44-5.36l216.42-124.95h.01Z" fill="#d6d5d2" />
      <path d="M448.35,142.54l-216.42,124.95c-.92-1.6-2.26-2.96-3.92-3.92L20.62,143.83c-2.46-1.41-1.45-5.16,1.38-5.16h419.65c2.98,0,5.4,1.61,6.7,3.87Z" fill="#fff" />
    </svg>
  );
}

export function cliProviderIcon(provider: HookHistoryProvider) {
  if (provider === "claude") return <CliClaudeLogo />;
  if (provider === "codex") return <CliCodexLogo />;
  if (provider === "gemini") return <CliGeminiLogo />;
  if (provider === "opencode") return <span className="text-[11px] text-slate-200">&#x26AA;</span>;
  if (provider === "copilot") return <span className="text-[11px] text-slate-200">&#x1F680;</span>;
  if (provider === "antigravity") return <span className="text-[11px] text-slate-200">&#x1F30C;</span>;
  if (provider === "cursor") return <CliCursorLogo />;
  return <span className="text-[11px] text-slate-200">&#x1F50C;</span>;
}
