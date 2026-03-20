import { useState } from "react";
import { tl } from "./tl";
import { base, mono } from "./constants";

export function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: mono,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.04em",
      padding: "3px 10px",
      borderRadius: 20,
      background: connected ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
      color: connected ? "#30d158" : "#ff453a",
      border: `1px solid ${connected ? "rgba(48,209,88,0.3)" : "rgba(255,69,58,0.3)"}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: connected ? "#30d158" : "#ff453a",
        boxShadow: connected ? "0 0 4px #30d158" : "none",
        flexShrink: 0,
        display: "inline-block",
      }} />
      {connected ? tl("연결됨", "Connected", "接続済み", "已连接") : tl("미연결", "Disconnected", "未接続", "未连接")}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 4 }}>
      <span style={{
        fontFamily: mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.10em",
        color: "var(--th-text-muted)",
        textTransform: "uppercase",
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--th-border)" }} />
    </div>
  );
}

export function Btn({
  children,
  onClick,
  danger,
  primary,
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const accentBg = primary ? "var(--th-accent)" : danger ? "rgba(255,69,58,0.12)" : "var(--th-hover-overlay)";
  const accentBgHover = primary ? "var(--th-accent)" : danger ? "rgba(255,69,58,0.22)" : "var(--th-hover-overlay-subtle)";
  const textColor = primary ? "#fff" : danger ? "#ff453a" : "var(--th-text-secondary)";
  const borderColor = primary ? "transparent" : danger ? "rgba(255,69,58,0.35)" : "var(--th-border)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...base,
        fontSize: small ? 10 : 11,
        fontWeight: 500,
        letterSpacing: "0.02em",
        padding: small ? "4px 10px" : "6px 14px",
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        background: hovered ? accentBgHover : accentBg,
        color: disabled ? "var(--th-text-muted)" : textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.12s, opacity 0.12s",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  fullWidth,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  fullWidth?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...base,
        fontSize: 11,
        padding: "7px 10px",
        background: "var(--th-input-bg, var(--th-bg-primary))",
        border: "1px solid var(--th-input-border, var(--th-border))",
        borderRadius: 6,
        color: "var(--th-text-primary)",
        outline: "none",
        width: fullWidth ? "100%" : undefined,
        boxSizing: "border-box",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(10,132,255,0.5)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-input-border, var(--th-border))"; }}
    />
  );
}

export function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: "var(--th-card-bg, var(--th-bg-surface))",
      border: `1px solid ${accent ? "rgba(245,158,11,0.35)" : "var(--th-border)"}`,
      borderRadius: 8,
      padding: "14px 16px",
      marginBottom: 14,
      boxShadow: accent ? "0 0 0 1px rgba(245,158,11,0.1) inset" : "none",
    }}>
      {children}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--th-text-muted)"
        strokeWidth={1.5}
        width={12}
        height={12}
        style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10.5" y1="10.5" x2="14" y2="14" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? tl("검색...", "Search...", "検索...", "搜索...")}
        style={{
          ...base,
          width: "100%",
          boxSizing: "border-box",
          fontSize: 11,
          padding: "7px 10px 7px 28px",
          background: "var(--th-input-bg, var(--th-bg-primary))",
          border: "1px solid var(--th-input-border, var(--th-border))",
          borderRadius: 6,
          color: "var(--th-text-primary)",
          outline: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(10,132,255,0.5)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-input-border, var(--th-border))"; }}
      />
    </div>
  );
}
