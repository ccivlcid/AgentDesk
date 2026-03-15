import { useEffect } from "react";
import type { WindowType, WidgetEntry } from "../../app/types";
import { useI18n } from "../../i18n";

const mono = "var(--th-font-mono)";

const WINDOW_META: Record<WindowType, { emoji: string; label: string }> = {
  workflow: { emoji: "⚡", label: "Workflow" },
  library: { emoji: "📚", label: "Library" },
  settings: { emoji: "⚙️", label: "Settings" },
  chat: { emoji: "💬", label: "Chat" },
  "agent-manager": { emoji: "👤", label: "Agent Manager" },
  repl: { emoji: ">_", label: "REPL" },
  reports: { emoji: "📊", label: "Reports" },
};

const WIDGET_META: Record<string, { emoji: string; label: string }> = {
  heartbeat: { emoji: "💓", label: "Agents" },
  "task-board": { emoji: "📋", label: "Tasks" },
  alerts: { emoji: "🔔", label: "Alerts" },
  "cli-usage": { emoji: "💰", label: "CLI Cost" },
  "flow-graph": { emoji: "🔀", label: "Flow Graph" },
};

const FADE_STYLE = `
@keyframes mcFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
`;

interface MissionControlProps {
  openWindows: Set<WindowType>;
  widgetLayout: WidgetEntry[];
  onClose: () => void;
  onFocusWindow: (w: WindowType) => void;
}

export default function MissionControl({ openWindows, widgetLayout, onClose, onFocusWindow }: MissionControlProps) {
  const { t } = useI18n();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const windowList = Array.from(openWindows);
  const widgetList = widgetLayout;

  return (
    <>
      <style>{FADE_STYLE}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 3000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 40px 40px",
          animation: "mcFadeIn 0.2s ease-out",
        }}
        onClick={onClose}
      >
        {/* 상단 힌트 */}
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            marginBottom: 40,
            letterSpacing: "0.1em",
          }}
        >
          MISSION CONTROL — {t({ ko: "ESC 또는 클릭으로 닫기", en: "Press ESC or click to close", ja: "ESCまたはクリックで閉じる", zh: "按ESC或点击关闭" })}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 900 }}
        >
          {/* 열린 창 */}
          {windowList.length > 0 && (
            <Section title={t({ ko: "열린 창", en: "Open Windows", ja: "開いているウィンドウ", zh: "打开的窗口" })}>
              {windowList.map((w) => {
                const meta = WINDOW_META[w];
                return (
                  <Card
                    key={w}
                    emoji={meta.emoji}
                    label={meta.label}
                    onClick={() => { onFocusWindow(w); onClose(); }}
                  />
                );
              })}
            </Section>
          )}

          {/* 활성 위젯 */}
          {widgetList.length > 0 && (
            <Section title={t({ ko: "위젯", en: "Widgets", ja: "ウィジェット", zh: "小组件" })}>
              {widgetList.map((entry) => {
                const meta = WIDGET_META[entry.id] ?? { emoji: "📦", label: entry.id };
                return (
                  <Card
                    key={entry.id}
                    emoji={meta.emoji}
                    label={meta.label}
                    onClick={onClose}
                  />
                );
              })}
            </Section>
          )}

          {/* 아무것도 없을 때 */}
          {windowList.length === 0 && widgetList.length === 0 && (
            <div
              style={{
                textAlign: "center",
                fontFamily: mono,
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                marginTop: 40,
              }}
            >
              {t({ ko: "열린 창이나 위젯이 없습니다", en: "No open windows or widgets", ja: "ウィンドウやウィジェットがありません", zh: "没有打开的窗口或小组件" })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          fontFamily: mono,
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.12em",
          marginBottom: 14,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

function Card({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 110,
        height: 90,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
        transition: "background 0.15s, transform 0.1s",
        fontFamily: mono,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.15)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{label}</span>
    </button>
  );
}
