import type { WidgetId } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";

const mono = "var(--th-font-mono)";

const WIDGET_IDS: { id: WidgetId; emoji: string; label: string }[] = [
  { id: "heartbeat",  emoji: "💓", label: "Agents" },
  { id: "task-board", emoji: "📋", label: "Tasks" },
  { id: "alerts",     emoji: "🔔", label: "Alerts" },
  { id: "cli-usage",  emoji: "💰", label: "CLI Cost" },
  { id: "flow-graph", emoji: "🕸", label: "Flow" },
  { id: "file-tree",  emoji: "🗂", label: "File Tree" },
];

interface WidgetPickerProps {
  onClose: () => void;
}

export default function WidgetPicker({ onClose }: WidgetPickerProps) {
  const { widgetLayout, addWidget } = useUiStore();
  const activeIds = new Set(widgetLayout.map((e) => e.id));
  const { t } = useI18n();

  const WIDGET_DEFS = WIDGET_IDS.map((w) => ({
    ...w,
    desc: w.id === "heartbeat"  ? t({ ko: "에이전트 상태 실시간 목록", en: "Live agent status list", ja: "エージェント状態リスト", zh: "代理状态实时列表" }) :
          w.id === "task-board" ? t({ ko: "실행 중인 태스크 목록", en: "Active task list", ja: "アクティブタスク一覧", zh: "活动任务列表" }) :
          w.id === "alerts"     ? t({ ko: "이상 감지 알림", en: "Anomaly alerts", ja: "異常検知アラート", zh: "异常检测警报" }) :
          w.id === "cli-usage"  ? t({ ko: "CLI 비용 요약", en: "CLI cost summary", ja: "CLIコスト概要", zh: "CLI成本摘要" }) :
          w.id === "flow-graph" ? t({ ko: "에이전트 플로우 그래프", en: "Agent flow graph", ja: "エージェントフローグラフ", zh: "代理流程图" }) :
          t({ ko: "프로젝트 파일 트리", en: "Project file tree", ja: "プロジェクトファイルツリー", zh: "项目文件树" }),
  }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--th-bg-surface)",
          border: "1px solid var(--th-border)",
          borderRadius: 10,
          padding: 20,
          minWidth: 320,
          boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-accent)", marginBottom: 12 }}>
          {t({ ko: "[+ 위젯 추가]", en: "[+ Add Widget]", ja: "[+ ウィジェット追加]", zh: "[+ 添加小组件]" })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {WIDGET_DEFS.map((w) => {
            const active = activeIds.has(w.id);
            return (
              <button
                key={w.id}
                onClick={() => { if (!active) { addWidget(w.id); onClose(); } }}
                disabled={active}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: active ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "var(--th-border-accent)" : "var(--th-border)"}`,
                  borderRadius: 6,
                  cursor: active ? "default" : "pointer",
                  fontFamily: mono,
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 18 }}>{w.emoji}</span>
                <div>
                  <div style={{ fontSize: 12, color: active ? "var(--th-text-accent)" : "var(--th-text-primary)" }}>
                    {w.label} {active && "✓"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{w.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "6px 0",
            background: "none",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
        >
          {t({ ko: "[닫기]", en: "[Close]", ja: "[閉じる]", zh: "[关闭]" })}
        </button>
      </div>
    </div>
  );
}
