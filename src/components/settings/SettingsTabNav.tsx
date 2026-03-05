import type { ReactElement } from "react";
import type { SettingsTab, TFunction } from "./types";

interface SettingsTabNavProps {
  tab: SettingsTab;
  setTab: (tab: SettingsTab) => void;
  t: TFunction;
}

const TAB_ITEMS: Array<{
  key: SettingsTab;
  label: (t: TFunction) => string;
  Icon: (props: { className?: string }) => ReactElement;
}> = [
  {
    key: "general",
    label: (t) => t({ ko: "일반", en: "General", ja: "一般", zh: "常规" }),
    Icon: ({ className }) => (
      <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    key: "cli",
    label: (t) => t({ ko: "CLI", en: "CLI", ja: "CLI", zh: "CLI" }),
    Icon: ({ className }) => (
      <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    key: "oauth",
    label: (t) => t({ ko: "OAuth", en: "OAuth", ja: "OAuth", zh: "OAuth" }),
    Icon: ({ className }) => (
      <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    key: "api",
    label: (t) => t({ ko: "API", en: "API", ja: "API", zh: "API" }),
    Icon: ({ className }) => (
      <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    key: "gateway",
    label: (t) => t({ ko: "채널", en: "Channel", ja: "チャネル", zh: "频道" }),
    Icon: ({ className }) => (
      <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function SettingsTabNav({ tab, setTab, t }: SettingsTabNavProps) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-xl border p-1"
      style={{ borderColor: "var(--th-border)", background: "var(--th-bg-primary)" }}
    >
      {TAB_ITEMS.map((item) => {
        const isActive = tab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--th-bg-surface)] text-[var(--th-text-primary)] shadow-sm"
                : "text-[var(--th-text-muted)] hover:text-[var(--th-text-secondary)] hover:bg-[var(--th-bg-surface-hover)]"
            }`}
            style={isActive ? { border: "1px solid var(--th-border)" } : undefined}
          >
            <item.Icon className={isActive ? "text-blue-500" : "opacity-70"} />
            <span>{item.label(t)}</span>
          </button>
        );
      })}
    </div>
  );
}
