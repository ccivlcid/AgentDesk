/**
 * macOS Control Center — 메뉴바 오른쪽 시스템 토글 패널
 */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";

const mono = "var(--th-font-mono)";

interface ControlCenterProps {
  connected: boolean;
  runningAgentCount?: number;
  projectAgentCount?: number;
  yoloMode?: boolean;
  onToggleYoloMode?: () => void;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
function IconMoon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function IconAssign({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
function IconUpdate({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function IconAuto({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconWifi({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}
function IconAgent({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// ── Tile component ────────────────────────────────────────────────────────────
function Tile({
  active,
  onClick,
  icon,
  label,
  sublabel,
  accentColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  accentColor: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        padding: "12px 14px",
        background: active
          ? `${accentColor}22`
          : hovered
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? accentColor + "55" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: active ? accentColor : "rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? "#fff" : "rgba(255,255,255,0.6)",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.8)", letterSpacing: "0.02em" }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontFamily: mono, fontSize: 10, color: active ? accentColor : "rgba(255,255,255,0.4)", marginTop: 1 }}>
            {sublabel}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ControlCenter({
  connected,
  runningAgentCount = 0,
  projectAgentCount = 0,
  yoloMode,
  onToggleYoloMode,
}: ControlCenterProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { doNotDisturb, setDoNotDisturb, autoAssign, setAutoAssign, autoUpdate, setAutoUpdate } = useUiStore();
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // 활성화된 토글 수에 따라 CC 버튼 아이콘 채도 변경
  const activeCount = [doNotDisturb, autoAssign, autoUpdate, !!yoloMode].filter(Boolean).length;
  void activeCount;

  return (
    <>
      {/* MenuBar 버튼 */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="Control Center"
        style={{
          background: open ? "rgba(0,0,0,0.06)" : "none",
          border: "none",
          color: open ? "#3B82F6" : "#9CA3AF",
          cursor: "pointer",
          padding: "4px 6px",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          transition: "background 0.15s, color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.color = "#111827"; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF"; }}
      >
        {/* 2×2 그리드 아이콘 — 활성 토글에 따라 불투명도 변경 */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="6" height="6" rx="1.5" opacity={doNotDisturb ? 1 : 0.35} />
          <rect x="9" y="1" width="6" height="6" rx="1.5" opacity={yoloMode ? 1 : 0.35} />
          <rect x="1" y="9" width="6" height="6" rx="1.5" opacity={autoAssign ? 1 : 0.35} />
          <rect x="9" y="9" width="6" height="6" rx="1.5" opacity={autoUpdate ? 1 : 0.35} />
        </svg>
      </button>

      {/* 패널 */}
      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: 50,
            right: 60,
            width: 284,
            background: "rgba(22,22,28,0.94)",
            backdropFilter: "blur(28px) saturate(160%)",
            WebkitBackdropFilter: "blur(28px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.05) inset",
            zIndex: 2000,
            padding: 12,
            fontFamily: mono,
            animation: "ccFadeIn 0.15s ease-out",
          }}
        >
          <style>{`
            @keyframes ccFadeIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* 2×2 토글 타일 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Tile
              active={doNotDisturb}
              onClick={() => setDoNotDisturb(!doNotDisturb)}
              icon={<IconMoon size={16} />}
              label={t({ ko: "방해 금지", en: "Do Not Disturb", ja: "おやすみ", zh: "勿扰" })}
              sublabel={doNotDisturb
                ? t({ ko: "켜짐", en: "On", ja: "オン", zh: "开启" })
                : t({ ko: "꺼짐", en: "Off", ja: "オフ", zh: "关闭" })}
              accentColor="#818cf8"
            />
            <Tile
              active={!!yoloMode}
              onClick={() => onToggleYoloMode?.()}
              icon={<IconAuto size={16} />}
              label={t({ ko: "자율 모드", en: "Auto Mode", ja: "自動モード", zh: "自动模式" })}
              sublabel={yoloMode
                ? t({ ko: "켜짐", en: "On", ja: "オン", zh: "开启" })
                : t({ ko: "꺼짐", en: "Off", ja: "オフ", zh: "관闭" })}
              accentColor="#fb923c"
            />
            <Tile
              active={autoAssign}
              onClick={() => setAutoAssign(!autoAssign)}
              icon={<IconAssign size={16} />}
              label={t({ ko: "자동 배정", en: "Auto Assign", ja: "自動割当", zh: "自动分配" })}
              sublabel={autoAssign
                ? t({ ko: "켜짐", en: "On", ja: "オン", zh: "开启" })
                : t({ ko: "꺼짐", en: "Off", ja: "オフ", zh: "关闭" })}
              accentColor="#34d399"
            />
            <Tile
              active={autoUpdate}
              onClick={() => setAutoUpdate(!autoUpdate)}
              icon={<IconUpdate size={16} />}
              label={t({ ko: "자동 업데이트", en: "Auto Update", ja: "自動更新", zh: "自动更新" })}
              sublabel={autoUpdate
                ? t({ ko: "켜짐", en: "On", ja: "オン", zh: "开启" })
                : t({ ko: "꺼짐", en: "Off", ja: "オフ", zh: "关闭" })}
              accentColor="#38bdf8"
            />
          </div>

          {/* 구분선 */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0" }} />

          {/* 상태 행 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 4px" }}>
            {/* 연결 상태 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                <IconWifi size={14} />
                <span>{t({ ko: "서버 연결", en: "Server", ja: "サーバー", zh: "服务器" })}</span>
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: connected ? "#22c55e" : "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                <span style={{ fontSize: 7 }}>●</span>
                {connected
                  ? t({ ko: "연결됨", en: "Connected", ja: "接続中", zh: "已连接" })
                  : t({ ko: "끊김", en: "Offline", ja: "切断", zh: "断开" })}
              </span>
            </div>

            {/* 실행 중인 에이전트 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                <IconAgent size={14} />
                <span>{t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" })}</span>
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                {projectAgentCount > 0 && (
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>
                    {projectAgentCount}{t({ ko: "명 배정", en: " assigned", ja: "名配置", zh: "已分配" })}
                  </span>
                )}
                {projectAgentCount > 0 && <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>}
                <span style={{
                  color: runningAgentCount > 0 ? "#22c55e" : "rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  {runningAgentCount > 0 && <span style={{ fontSize: 7 }}>●</span>}
                  {runningAgentCount > 0
                    ? `${runningAgentCount} ${t({ ko: "실행 중", en: "running", ja: "実行中", zh: "运行中" })}`
                    : t({ ko: "대기 중", en: "Idle", ja: "待機中", zh: "空闲" })}
                </span>
              </span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
