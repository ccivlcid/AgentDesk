import { tl } from "./tl";
import { mono, HELP, type SubTab } from "./constants";

export function HelpPanel({ tab, onClose }: { tab: SubTab; onClose: () => void }) {
  const help = HELP[tab];
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "var(--th-bg-surface)",
      display: "flex", flexDirection: "column",
      zIndex: 10,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px 12px",
        borderBottom: "1px solid var(--th-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(10,132,255,0.15)",
            border: "1px solid rgba(10,132,255,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#0a84ff",
            flexShrink: 0,
          }}>?</span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)" }}>
            {help.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "var(--th-hover-overlay)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            padding: "3px 10px",
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
        >
          {tl("닫기", "Close", "閉じる", "关闭")}
        </button>
      </div>

      <div style={{ flex: 1, padding: "18px 20px", overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {help.items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0,
                width: 20, height: 20,
                borderRadius: "50%",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: mono, fontSize: 10, fontWeight: 700,
                color: "var(--th-accent)",
              }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-secondary)", lineHeight: 1.7 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
