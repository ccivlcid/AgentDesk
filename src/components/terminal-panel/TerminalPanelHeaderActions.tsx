import { useState } from "react";

export interface TerminalPanelHeaderActionsProps {
  isInterventionTarget: boolean;
  interventionOpen: boolean;
  setInterventionOpen: (fn: (p: boolean) => boolean) => void;
  setInterventionMessage: (v: string | null) => void;
  taskStatus?: string;
  showSearchBar: boolean;
  setShowSearchBar: (fn: (p: boolean) => boolean) => void;
  follow: boolean;
  setFollow: (fn: (f: boolean) => boolean) => void;
  onCopyLog: () => void;
  onScrollToBottom: () => void;
  onClose: () => void;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
}

const mono = "var(--th-font-mono)";

export function TerminalPanelHeaderActions({
  isInterventionTarget,
  interventionOpen,
  setInterventionOpen,
  setInterventionMessage,
  taskStatus,
  showSearchBar,
  setShowSearchBar,
  follow,
  setFollow,
  onCopyLog,
  onScrollToBottom,
  tr,
}: TerminalPanelHeaderActionsProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopyLog();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>

      {/* 난입 버튼 — 실행 중/대기 중 태스크만 */}
      {isInterventionTarget && (
        <InterruptBtn
          active={interventionOpen}
          label={taskStatus === "pending" ? tr("주입", "Inject") : tr("난입", "Interrupt")}
          onClick={() => { setInterventionOpen((p) => !p); setInterventionMessage(null); }}
        />
      )}

      {/* 따라가기 (아이콘) */}
      <IconBtn
        active={follow}
        activeColor="#f59e0b"
        onClick={() => { setFollow((f) => !f); if (!follow) onScrollToBottom(); }}
        title={follow ? tr("자동 스크롤 ON", "Auto-scroll ON") : tr("자동 스크롤 OFF", "Auto-scroll OFF")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 15l7 7 7-7" />
        </svg>
      </IconBtn>

      {/* 검색 */}
      <IconBtn
        active={showSearchBar}
        activeColor="#f59e0b"
        onClick={() => setShowSearchBar((p) => !p)}
        title={tr("검색", "Search")}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </IconBtn>

      {/* 복사 */}
      <IconBtn
        active={false}
        onClick={handleCopy}
        title={tr("로그 복사", "Copy log")}
      >
        {copied
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        }
      </IconBtn>

      {/* 구분선 */}
      <div style={{ width: 1, height: 16, background: "#E5E7EB", margin: "0 2px" }} />

      {/* 닫기 (트래픽 라이트에 이미 있지만 우측 X도 제공) */}
      <button
        type="button"
        onClick={() => {}}
        aria-hidden="true"
        style={{ display: "none" }}
      />
    </div>
  );
}

// ─── 서브 컴포넌트 ───────────────────────────────────────────────────────────

function IconBtn({
  children, active, activeColor, onClick, title,
}: {
  children: React.ReactNode;
  active: boolean;
  activeColor?: string;
  onClick: () => void;
  title?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const color = active && activeColor ? activeColor : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26,
        borderRadius: 6,
        border: active && activeColor
          ? `1px solid ${activeColor}55`
          : "1px solid transparent",
        background: active && activeColor
          ? `${activeColor}18`
          : hovered ? "rgba(0,0,0,0.06)" : "transparent",
        color: color ?? (hovered ? "#111827" : "#9CA3AF"),
        cursor: "pointer",
        transition: "all 0.12s",
        fontFamily: mono,
      }}
    >
      {children}
    </button>
  );
}

function InterruptBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.03em",
        padding: "3px 9px",
        borderRadius: 6,
        border: active
          ? "1px solid rgba(244,63,94,0.4)"
          : `1px solid ${hovered ? "rgba(244,63,94,0.35)" : "#E5E7EB"}`,
        background: active
          ? "rgba(244,63,94,0.12)"
          : hovered ? "rgba(244,63,94,0.07)" : "transparent",
        color: active ? "#f43f5e" : hovered ? "#f43f5e" : "#6B7280",
        cursor: "pointer",
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}
