import type { CustomFeature } from "../../types";
import type { I18nContextValue } from "../../i18n";

export interface DesktopFeatureCtxMenuProps {
  cfCtxMenu: { x: number; y: number; featureId: string; featureName: string };
  customFeatures: CustomFeature[];
  t: I18nContextValue["t"];
  onClose: () => void;
  onOpen: (featureId: string) => void;
  onDelete: (featureId: string, featureName: string, iconSvg: string | null) => void;
}

const menuStyle = {
  position: "fixed" as const,
  zIndex: 2000,
  background: "var(--th-panel-bg)",
  backdropFilter: "blur(20px)",
  border: "1px solid var(--th-border)",
  borderRadius: 10,
  padding: "4px 0",
  minWidth: 180,
  boxShadow: "0 16px 40px var(--th-glass-shadow)",
};

export function DesktopFeatureCtxMenu({
  cfCtxMenu,
  customFeatures,
  t,
  onClose,
  onOpen,
  onDelete,
}: DesktopFeatureCtxMenuProps) {
  const entries = [
    {
      label: t({ ko: "열기", en: "Open", ja: "開く", zh: "打开" }),
      icon: "▶",
      danger: false,
      action: () => {
        onOpen(cfCtxMenu.featureId);
        onClose();
      },
    },
    {
      label: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      icon: "🗑",
      danger: true,
      action: () => {
        const feat = customFeatures.find((cf) => cf.id === cfCtxMenu.featureId);
        onDelete(cfCtxMenu.featureId, cfCtxMenu.featureName, feat?.icon_svg ?? null);
        onClose();
      },
    },
  ];

  return (
    <div
      data-no-ctx="true"
      style={{ ...menuStyle, left: cfCtxMenu.x, top: cfCtxMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: "6px 14px 6px",
          fontFamily: "var(--th-font-mono)",
          fontSize: 10,
          color: "var(--th-text-muted)",
          borderBottom: "1px solid var(--th-border)",
          marginBottom: 4,
        }}
      >
        ✦ {cfCtxMenu.featureName}
      </div>
      {entries.map(({ label, icon, danger, action }) => (
        <button
          key={label}
          onClick={action}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "7px 14px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--th-font-mono)",
            fontSize: 12,
            color: danger ? "var(--th-danger-text)" : "var(--th-text-primary)",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = danger
              ? "var(--th-danger-bg)"
              : "var(--th-accent-glow)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
