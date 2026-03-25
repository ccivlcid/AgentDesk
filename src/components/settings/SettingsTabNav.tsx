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
  { key: "data",    label: (t) => t({ ko: "데이터",    en: "DATA",      ja: "データ",    zh: "数据"    }), sigil: "▦" },
];

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function SettingsTabNav({ tab, setTab, t }: SettingsTabNavProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      style={{
        ...mono,
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
        background: "#FFFFFF",
        padding: "12px 16px 8px",
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
              gap: 8,
              padding: "8px 16px",
              fontSize: "10.5px",
              fontWeight: isActive ? 800 : 600,
              letterSpacing: "0.1em",
              background: isActive ? "#F3F4F6" : "transparent",
              color: isActive ? "#111827" : "#6B7280",
              border: "1px solid",
              borderColor: isActive ? "rgba(0, 0, 0, 0.05)" : "transparent",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.23, 1, 0.32, 1)",
              borderRadius: "12px",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#374151";
                e.currentTarget.style.background = "#F9FAFB";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#6B7280";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.6, fontSize: "12px" }}>{item.sigil}</span>
            <span style={{ textTransform: "uppercase" }}>{item.label(t)}</span>
          </button>
        );
      })}
    </div>
  );
}
