import type { CustomFeature } from "../../types";
import type { I18nContextValue } from "../../i18n";
import ContextMenu, { type ContextMenuEntry } from "../ui/ContextMenu";

export interface DesktopFeatureCtxMenuProps {
  cfCtxMenu: { x: number; y: number; featureId: string; featureName: string };
  customFeatures: CustomFeature[];
  t: I18nContextValue["t"];
  onClose: () => void;
  onOpen: (featureId: string) => void;
  onDelete: (featureId: string, featureName: string, iconSvg: string | null) => void;
}

export function DesktopFeatureCtxMenu({
  cfCtxMenu,
  customFeatures,
  t,
  onClose,
  onOpen,
  onDelete,
}: DesktopFeatureCtxMenuProps) {
  const entries: ContextMenuEntry[] = [
    {
      label: t({ ko: "열기", en: "Open", ja: "開く", zh: "打开" }),
      icon: "▶",
      onClick: () => onOpen(cfCtxMenu.featureId),
    },
    { type: "separator" },
    {
      label: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      icon: "🗑",
      danger: true,
      onClick: () => {
        const feat = customFeatures.find((cf) => cf.id === cfCtxMenu.featureId);
        onDelete(cfCtxMenu.featureId, cfCtxMenu.featureName, feat?.icon_svg ?? null);
      },
    },
  ];

  return (
    <ContextMenu
      x={cfCtxMenu.x}
      y={cfCtxMenu.y}
      onClose={onClose}
      entries={entries}
      data-no-ctx="true"
    />
  );
}
