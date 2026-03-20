interface DockBadgeProps {
  count?: number;
  type?: "amber" | "red" | "blue";
  show: boolean;
}

const BADGE_BG: Record<string, string> = {
  amber: "#ff9f0a",
  red: "#ff453a",
  blue: "#5e5ce6",
};

export default function DockBadge({ count = 0, type = "red", show }: DockBadgeProps) {
  if (!show || count == null || count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  return (
    <div
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        maxWidth: display.length >= 2 ? 24 : 18,
        borderRadius: 9,
        background: BADGE_BG[type] ?? BADGE_BG.red,
        color: "#fff",
        fontSize: 11,
        fontFamily: "var(--th-font-mono)",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        border: "1.5px solid rgba(0,0,0,0.25)",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      {display}
    </div>
  );
}
