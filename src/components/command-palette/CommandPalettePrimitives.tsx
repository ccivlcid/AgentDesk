import type { ReactNode } from "react";
import type { PaletteItem } from "./types";
import { SPOTLIGHT_SF_FONT } from "./spotlightFontStyle";

export function PaletteRow({
  item,
  idx,
  safeIndex,
  onPick,
  children,
}: {
  item: PaletteItem;
  idx: number;
  safeIndex: number;
  onPick: (item: PaletteItem) => void;
  children: ReactNode;
}) {
  const isSelected = idx === safeIndex;
  return (
    <button
      type="button"
      onClick={() => onPick(item)}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "0 10px",
        height: 44,
        background: "none",
        border: "none",
        cursor: "pointer",
        gap: 10,
        position: "relative",
      }}
    >
      {isSelected && (
        <span
          style={{
            position: "absolute",
            inset: "2px 6px",
            borderRadius: 8,
            background: "var(--th-bg-primary)",
            border: "1px solid var(--th-border)",
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </button>
  );
}

export function PaletteIconBox({ icon, bg }: { icon: string; bg: string }) {
  return (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        flexShrink: 0,
        position: "relative",
        zIndex: 1,
        boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
      }}
    >
      {icon}
    </span>
  );
}

export function PaletteSectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: "var(--th-text-muted)",
        padding: "10px 16px 4px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

export { SPOTLIGHT_SF_FONT };
