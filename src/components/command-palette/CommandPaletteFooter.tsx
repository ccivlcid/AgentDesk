import type { I18nContextValue } from "../../i18n";
import { SPOTLIGHT_SF_FONT } from "./spotlightFontStyle";

interface CommandPaletteFooterProps {
  t: I18nContextValue["t"];
  onClose: () => void;
  onOpenShortcutsGuide?: () => void;
}

export function CommandPaletteFooter({ t, onClose, onOpenShortcutsGuide }: CommandPaletteFooterProps) {
  const sf = SPOTLIGHT_SF_FONT;

  return (
    <div
      style={{
        borderTop: "1px solid var(--th-border)",
        padding: "7px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--th-bg-panel)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {[
          { key: "↑↓", label: t({ ko: "이동", en: "navigate", ja: "移動", zh: "导航" }) },
          { key: "↵", label: t({ ko: "선택", en: "select", ja: "選択", zh: "选择" }) },
          { key: "Esc", label: t({ ko: "닫기", en: "close", ja: "閉じる", zh: "关闭" }) },
        ].map(({ key, label }) => (
          <span key={key} style={{ ...sf, fontSize: 11, color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
            <kbd
              style={{
                background: "var(--th-bg-elevated)",
                border: "1px solid var(--th-border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 10,
                color: "var(--th-text-muted)",
                fontFamily: "inherit",
              }}
            >
              {key}
            </kbd>
            {label}
          </span>
        ))}
      </div>
      {onOpenShortcutsGuide && (
        <button
          type="button"
          onClick={() => { onClose(); onOpenShortcutsGuide(); }}
          style={{
            ...sf,
            fontSize: 11,
            color: "var(--th-text-muted)",
            background: "var(--th-bg-elevated)",
            border: "1px solid var(--th-border)",
            borderRadius: 5,
            padding: "2px 9px",
            cursor: "pointer",
          }}
        >
          ? {t({ ko: "단축키", en: "Shortcuts", ja: "ショートカット", zh: "快捷键" })}
        </button>
      )}
    </div>
  );
}
