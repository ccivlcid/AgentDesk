import { useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import type { WindowType } from "../../app/types";

const MENUBAR_H = 44;
const DOCK_H = 88;

const WINDOW_LABELS: Partial<Record<WindowType, { label: string; emoji: string }>> = {
  library:       { label: "Library",        emoji: "📚" },
  settings:      { label: "Settings",       emoji: "⚙️" },
  "agent-manager": { label: "Agents",       emoji: "🤖" },
};

export default function SnapFillSuggestion() {
  const {
    snapFillSuggestion,
    setSnapFillSuggestion,
    openWindows,
    minimizedWindows,
    setSnapRequest,
    bringWindowToFront,
  } = useUiStore();

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!snapFillSuggestion) return;
    const t = setTimeout(() => setSnapFillSuggestion(null), 6000);
    return () => clearTimeout(t);
  }, [snapFillSuggestion, setSnapFillSuggestion]);

  if (!snapFillSuggestion) return null;

  const { oppZone, forWindow } = snapFillSuggestion;

  // Open, non-minimized, non-snapped windows
  const candidates = [...openWindows].filter(
    (wt) => wt !== forWindow && !minimizedWindows.has(wt) && wt in WINDOW_LABELS,
  );

  if (candidates.length === 0) return null;

  const vw = window.innerWidth;
  const totalH = window.innerHeight - MENUBAR_H - DOCK_H;
  const halfH = Math.floor(totalH / 2);
  const halfW = Math.floor(vw / 2);

  const zoneRect: Record<typeof oppZone, React.CSSProperties> = {
    left:  { left: 0,     top: MENUBAR_H,         width: halfW, height: totalH },
    right: { left: halfW, top: MENUBAR_H,          width: halfW, height: totalH },
    tl:    { left: 0,     top: MENUBAR_H,          width: halfW, height: halfH },
    tr:    { left: halfW, top: MENUBAR_H,           width: halfW, height: halfH },
    bl:    { left: 0,     top: MENUBAR_H + halfH,  width: halfW, height: halfH },
    br:    { left: halfW, top: MENUBAR_H + halfH,  width: halfW, height: halfH },
  };

  function pickWindow(wt: WindowType) {
    setSnapFillSuggestion(null);
    setSnapRequest({ windowType: wt, zone: oppZone });
    bringWindowToFront(wt);
  }

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 1900,
        pointerEvents: "none",
        ...zoneRect[oppZone],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          background: "#FFFFFF",
          backdropFilter: "blur(20px)",
          border: "1px solid #3B82F6",
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 200,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{
          fontSize: 9,
          fontFamily: "var(--th-font-mono)",
          color: "#9CA3AF",
          letterSpacing: "0.08em",
          marginBottom: 2,
        }}>
          FILL WITH WINDOW
        </div>
        {candidates.map((wt) => {
          const info = WINDOW_LABELS[wt]!;
          return (
            <button
              key={wt}
              onClick={() => pickWindow(wt)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: "none",
                border: "1px solid #E5E7EB",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
                fontSize: 12,
                color: "#111827",
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{info.emoji}</span>
              <span>{info.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setSnapFillSuggestion(null)}
          style={{
            marginTop: 2,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--th-font-mono)",
            fontSize: 10,
            color: "#9CA3AF",
            textAlign: "center",
          }}
        >
          dismiss
        </button>
      </div>
    </div>
  );
}
