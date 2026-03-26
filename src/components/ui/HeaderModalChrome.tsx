import type { ReactNode } from "react";
import TrafficLights from "../desktop/TrafficLights";

const mono = "var(--th-font-mono)";

export interface HeaderModalChromeProps {
  title: string;
  sigil?: "//" | "$";
  rightSlot?: ReactNode;
  onClose: () => void;
  macOSStyle?: boolean;
}

export default function HeaderModalChrome({
  title,
  sigil = "//",
  rightSlot,
  onClose,
  macOSStyle = true,
}: HeaderModalChromeProps) {
  return (
    <div
      className="flex flex-shrink-0 items-center gap-3 py-2 pl-3 pr-4"
      style={{
        borderBottom: "1px solid #E5E7EB",
        background: "var(--th-bg-elevated)",
        fontFamily: mono,
        borderTopLeftRadius: macOSStyle ? 10 : 0,
        borderTopRightRadius: macOSStyle ? 10 : 0,
        minHeight: 40,
      }}
    >
      {macOSStyle ? (
        <TrafficLights onClose={onClose} />
      ) : (
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px", flexShrink: 0 }}>
          {sigil}
        </span>
      )}

      <span
        className="flex-1 truncate"
        style={{ fontSize: "12px", fontWeight: 600, color: "var(--th-text-primary)", letterSpacing: "0.02em" }}
      >
        {title}
      </span>

      <div className="flex flex-shrink-0 items-center gap-2">
        {rightSlot}
        {!macOSStyle && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28,
              border: "1px solid #E5E7EB", background: "transparent",
              borderRadius: 8, fontFamily: mono, fontSize: "12px",
              color: "var(--th-text-muted)", cursor: "pointer",
            }}
            className="hover:!text-[#111827] hover:!border-[#D1D5DB] hover:!bg-[#F3F4F6]"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
