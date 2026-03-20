/**
 * RightShelf — 오른쪽 끝 호버 슬라이드 패널.
 * 유저가 앱 목록을 직접 추가/제거 가능. 편집 모드에서 흔들림 + × 배지.
 */
import { useState, useRef } from "react";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import type { WindowType } from "../../app/types";
import { useRightShelfConfig } from "./useRightShelfConfig";
import {
  IconDockTasks,
  IconDockWorkflow,
  IconDockLibrary,
  IconDockSettings,
  IconDockChat,
  IconDockWidgetBoard,
  IconDockSynapse,
  IconAgents,
  IconReports,
  IconImageStudio,
  IconAgentGraph,
  IconLocalLlm,
  IconAlerts,
  IconFileTree,
  IconRepl,
  IconDashboard,
} from "./DesktopIcons";

const mono = "var(--th-font-mono)";
const PANEL_W = 80;
const STRIP_W = 6;

export interface AppMeta {
  id: WindowType;
  icon: (color: string) => React.ReactNode;
  label: { ko: string; en: string; ja: string; zh: string };
  accent: string;
}

export const ALL_SHELF_APPS: AppMeta[] = [
  { id: "tasks",         icon: (c) => <IconDockTasks color={c} />,      label: { ko: "업무보드",       en: "Board",        ja: "タスク",          zh: "任务板" },    accent: "#ff9f0a" },
  { id: "workflow",      icon: (c) => <IconDockWorkflow color={c} />,   label: { ko: "워크플로",       en: "Workflow",      ja: "ワークフロー",    zh: "工作流" },    accent: "#007aff" },
  { id: "chat",          icon: (c) => <IconDockChat color={c} />,       label: { ko: "채팅",           en: "Chat",          ja: "チャット",        zh: "聊天" },      accent: "#5e5ce6" },
  { id: "widget-board",  icon: (c) => <IconDockWidgetBoard color={c} />,label: { ko: "위젯 보드",      en: "Widgets",       ja: "ウィジェット",    zh: "小组件" },    accent: "#34c759" },
  { id: "library",       icon: (c) => <IconDockLibrary color={c} />,    label: { ko: "라이브러리",     en: "Library",       ja: "ライブラリ",      zh: "库" },        accent: "#30d158" },
  { id: "settings",      icon: (c) => <IconDockSettings color={c} />,   label: { ko: "설정",           en: "Settings",      ja: "設定",            zh: "设置" },      accent: "#8e8e93" },
  { id: "agent-manager", icon: (c) => <IconAgents color={c} />,         label: { ko: "에이전트",       en: "Agents",        ja: "エージェント",    zh: "代理" },      accent: "#ff6b35" },
  { id: "synapse",       icon: (c) => <IconDockSynapse color={c} />,    label: { ko: "시냅스",         en: "Synapse",       ja: "シナプス",        zh: "知识库" },    accent: "#a78bfa" },
  { id: "dashboard",     icon: (c) => <IconDashboard color={c} />,      label: { ko: "대시보드",       en: "Dashboard",     ja: "ダッシュボード",  zh: "控制台" },    accent: "#f97316" },
  { id: "reports",       icon: (c) => <IconReports color={c} />,        label: { ko: "보고서",         en: "Reports",       ja: "レポート",        zh: "报告" },      accent: "#06b6d4" },
  { id: "image-studio",  icon: (c) => <IconImageStudio color={c} />,    label: { ko: "이미지 스튜디오",en: "Image Studio",  ja: "イメスタ",        zh: "图像工作室" },accent: "#ec4899" },
  { id: "flow-graph",    icon: (c) => <IconAgentGraph color={c} />,     label: { ko: "에이전트 그래프",en: "Agent Graph",   ja: "グラフ",          zh: "代理图" },    accent: "#14b8a6" },
  { id: "local-llm",     icon: (c) => <IconLocalLlm color={c} />,       label: { ko: "로컬 LLM",       en: "Local LLM",     ja: "ローカルLLM",    zh: "本地LLM" },   accent: "#8b5cf6" },
  { id: "alerts",        icon: (c) => <IconAlerts color={c} />,         label: { ko: "알림",           en: "Alerts",        ja: "アラート",        zh: "警报" },      accent: "#f59e0b" },
  { id: "file-tree",     icon: (c) => <IconFileTree color={c} />,       label: { ko: "파일 탐색기",    en: "File Explorer", ja: "ファイル",        zh: "文件管理" },  accent: "#64748b" },
  { id: "cli",           icon: (c) => <IconRepl color={c} />,           label: { ko: "CLI",            en: "CLI",           ja: "CLI",             zh: "CLI" },       accent: "#22d3ee" },
];

// ── 추가 피커 ─────────────────────────────────────────────────────────
function AddPicker({ current, onAdd, onClose, t }: {
  current: WindowType[];
  onAdd: (id: WindowType) => void;
  onClose: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const available = ALL_SHELF_APPS.filter((a) => !current.includes(a.id));

  return (
    <div
      data-no-ctx="true"
      style={{
        position: "absolute",
        right: PANEL_W + STRIP_W + 6,
        bottom: 0,
        width: 200,
        background: "rgba(18,18,24,0.97)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        padding: "6px 0",
        zIndex: 100,
        maxHeight: 340,
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "6px 12px 4px", fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {t({ ko: "앱 추가", en: "Add App", ja: "アプリ追加", zh: "添加应用" })}
      </div>
      {available.length === 0 ? (
        <div style={{ padding: "10px 14px", fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          {t({ ko: "추가할 앱 없음", en: "Nothing to add", ja: "追加するアプリなし", zh: "无可添加" })}
        </div>
      ) : available.map((app) => (
        <button
          key={app.id}
          type="button"
          onClick={() => { onAdd(app.id); onClose(); }}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: mono, color: "rgba(255,255,255,0.75)", fontSize: 12 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
        >
          <span style={{ color: app.accent, flexShrink: 0, display: "flex", alignItems: "center" }}>
            {app.icon(app.accent)}
          </span>
          <span>{t(app.label)}</span>
        </button>
      ))}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────
export default function RightShelf() {
  const { openWindows, toggleWindow } = useUiStore();
  const { t } = useI18n();
  const { items, addItem, removeItem } = useRightShelfConfig();

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setEditMode(false);
      setShowPicker(false);
    }, 220);
  }
  function cancelClose() {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  }

  const translateX = open ? 0 : PANEL_W;
  const isEmpty = items.length === 0;

  return (
    <>
      {editMode && (
        <style>{`
          @keyframes shelfWiggle {
            0%,100% { transform: rotate(-3deg); }
            50%      { transform: rotate(3deg); }
          }
        `}</style>
      )}

      <div
        data-no-ctx="true"
        style={{
          position: "fixed",
          right: 0,
          top: "50%",
          transform: `translateY(-50%) translateX(${translateX}px)`,
          transition: "transform 0.28s cubic-bezier(0.32, 0, 0.67, 0)",
          zIndex: 990,
          display: "flex",
          alignItems: "stretch",
        }}
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
      >
        {/* 트리거 스트립 */}
        <div style={{ width: STRIP_W, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{
            width: 3,
            height: open ? 0 : 52,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 2,
            transition: "height 0.2s ease, opacity 0.2s",
            opacity: open ? 0 : 1,
          }} />
        </div>

        {/* 패널 */}
        <div style={{
          width: PANEL_W,
          paddingTop: 10,
          paddingBottom: 12,
          background: "rgba(16,16,22,0.88)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRight: "none",
          borderRadius: "14px 0 0 14px",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.45), inset 1px 0 0 rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          position: "relative",
        }}>
          {/* 헤더 핸들 + 편집 버튼 */}
          <div style={{ display: "flex", alignItems: "center", width: "100%", padding: "0 10px", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ flex: 1 }} />
            <div style={{ width: 22, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setEditMode((v) => !v); setShowPicker(false); }}
                title={editMode
                  ? t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })
                  : t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                style={{
                  background: editMode ? "rgba(245,158,11,0.2)" : "none",
                  border: "none",
                  borderRadius: 4,
                  color: editMode ? "#f59e0b" : "rgba(255,255,255,0.3)",
                  fontSize: editMode ? 10 : 12,
                  cursor: "pointer",
                  padding: "2px 4px",
                  fontFamily: mono,
                  lineHeight: 1,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { if (!editMode) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
                onMouseLeave={(e) => { if (!editMode) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; }}
              >
                {editMode ? t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M11 2l3 3-9 9H2v-3L11 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 빈 상태 안내 */}
          {isEmpty && (
            <div style={{ fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,0.22)", textAlign: "center", padding: "8px 6px 4px", lineHeight: 1.7 }}>
              <div>{t({ ko: "+ 로", en: "Tap +", ja: "＋で", zh: "点+" })}</div>
              <div>{t({ ko: "앱 추가", en: "to add", ja: "追加", zh: "添加" })}</div>
            </div>
          )}

          {/* 앱 버튼 목록 */}
          {items.map((id) => {
            const meta = ALL_SHELF_APPS.find((a) => a.id === id);
            if (!meta) return null;
            return (
              <ShelfButton
                key={id}
                label={t(meta.label)}
                icon={meta.icon}
                isOpen={openWindows.has(id)}
                accent={meta.accent}
                editMode={editMode}
                onLaunch={() => { if (!editMode) toggleWindow(id); }}
                onRemove={() => removeItem(id)}
              />
            );
          })}

          {/* + 추가 버튼 */}
          <div style={{ marginTop: isEmpty ? 4 : 8, position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              title={t({ ko: "앱 추가", en: "Add App", ja: "アプリ追加", zh: "添加应用" })}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px dashed ${showPicker ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)"}`,
                background: showPicker ? "rgba(255,255,255,0.1)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                if (!showPicker) {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)";
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="7" y1="1" x2="7" y2="13" />
                <line x1="1" y1="7" x2="13" y2="7" />
              </svg>
            </button>

            {showPicker && (
              <AddPicker current={items} onAdd={addItem} onClose={() => setShowPicker(false)} t={t} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── 개별 버튼 ────────────────────────────────────────────────────────
function ShelfButton({ label, icon, isOpen, accent, editMode, onLaunch, onRemove }: {
  label: string;
  icon: (color: string) => React.ReactNode;
  isOpen: boolean;
  accent: string;
  editMode: boolean;
  onLaunch: () => void;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const iconColor = (hovered && !editMode) ? accent : isOpen ? accent : "rgba(255,255,255,0.7)";

  return (
    <div
      style={{ position: "relative", width: 54, height: 54, flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onLaunch}
        title={label}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 13,
          border: isOpen ? `1px solid ${accent}50` : "1px solid transparent",
          background: (hovered && !editMode)
            ? `${accent}22`
            : isOpen ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)",
          cursor: editMode ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
          animation: editMode ? "shelfWiggle 0.45s ease-in-out infinite" : "none",
          transformOrigin: "center",
        }}
      >
        <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
          {icon(iconColor)}
        </div>
      </button>

      {/* 열린 창 인디케이터 */}
      {isOpen && !editMode && (
        <div style={{
          position: "absolute",
          bottom: 2,
          left: "50%",
          transform: "translateX(-50%)",
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: accent,
          pointerEvents: "none",
        }} />
      )}

      {/* 편집 모드 × 배지 */}
      {editMode && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            position: "absolute",
            top: -5,
            left: -5,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#1c1c22",
            border: "1.5px solid rgba(255,255,255,0.3)",
            color: "rgba(255,255,255,0.85)",
            fontSize: 8,
            fontFamily: mono,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
            zIndex: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="1" y1="1" x2="7" y2="7" />
            <line x1="7" y1="1" x2="1" y2="7" />
          </svg>
        </button>
      )}
    </div>
  );
}
