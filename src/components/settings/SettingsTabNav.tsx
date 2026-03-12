import type { SettingsTab, TFunction } from "./types";

interface SettingsTabNavProps {
  tab: SettingsTab;
  setTab: (tab: SettingsTab) => void;
  t: TFunction;
}

const TAB_ITEMS: Array<{
  key: SettingsTab;
  label: (t: TFunction) => string;
  sigil: string;
}> = [
  { key: "general", label: (t) => t({ ko: "일반",   en: "GENERAL", ja: "一般",     zh: "通用"   }), sigil: "⚙" },
  { key: "cli",     label: (t) => t({ ko: "CLI",    en: "CLI",     ja: "CLI",     zh: "CLI"    }), sigil: "$" },
  { key: "oauth",   label: (t) => t({ ko: "OAUTH",  en: "OAUTH",   ja: "OAUTH",   zh: "OAUTH"  }), sigil: "⇄" },
  { key: "api",     label: (t) => t({ ko: "API",    en: "API",     ja: "API",     zh: "API"    }), sigil: "⌁" },
  { key: "gateway", label: (t) => t({ ko: "채널",   en: "CHANNEL", ja: "チャンネル", zh: "频道" }), sigil: "⌘" },
  { key: "data",    label: (t) => t({ ko: "데이터", en: "DATA",    ja: "データ",   zh: "数据"   }), sigil: "▦" },
];

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function SettingsTabNav({ tab, setTab, t }: SettingsTabNavProps) {
  return (
    <div
      className="flex flex-wrap gap-1"
      style={{
        ...mono,
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-primary)",
        padding: "6px 12px 0",
      }}
    >
      {TAB_ITEMS.map((item) => {
        const isActive = tab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            style={{
              ...mono,
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 14px",
              fontSize: "10px",
              fontWeight: isActive ? 700 : 400,
              letterSpacing: "0.06em",
              background: isActive ? "var(--th-bg-surface)" : "transparent",
              color: isActive ? "var(--th-accent)" : "var(--th-text-muted)",
              border: "none",
              borderBottom: isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
              cursor: "pointer",
              transition: "color 0.1s, background 0.1s",
              borderRadius: "6px 6px 0 0",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--th-text-secondary)";
                e.currentTarget.style.background = "var(--th-hover-bg, rgba(255,255,255,0.04))";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--th-text-muted)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.5, fontSize: "11px" }}>{item.sigil}</span>
            <span>{item.label(t)}</span>
          </button>
        );
      })}
    </div>
  );
}
