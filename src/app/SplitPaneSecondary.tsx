import { Suspense, lazy } from "react";
import { useI18n } from "../i18n";
import type { View } from "./types";
import type { Agent, Department, Task, SubAgent, CrossDeptDelivery, MeetingPresence, CompanySettings } from "../types";
import { SECONDARY_VIEWS } from "../hooks/useSplitPane";

const AgentFlowGraph = lazy(() => import("../components/flow-graph/AgentFlowGraph"));
const HeartbeatPanel = lazy(() => import("../components/office-view/HeartbeatPanel"));
const Dashboard2 = lazy(() => import("../components/dashboard/Dashboard2"));

const VIEW_ICONS: Partial<Record<View, string>> = {
  "flow-graph": "◎",
  heartbeat: "♡",
  dashboard: "▦",
  "cli-usage": "⬡",
};

const VIEW_LABELS: Partial<Record<View, { ko: string; en: string; ja: string; zh: string }>> = {
  "flow-graph": { ko: "플로우", en: "Flow", ja: "フロー", zh: "流程" },
  heartbeat: { ko: "현황", en: "Status", ja: "状態", zh: "状态" },
  dashboard: { ko: "대시보드", en: "Dashboard", ja: "ダッシュ", zh: "仪表板" },
  "cli-usage": { ko: "CLI", en: "CLI", ja: "CLI", zh: "CLI" },
};

interface SplitPaneSecondaryProps {
  view: View;
  onChangeView: (v: View) => void;
  onClose: () => void;
  agents: Agent[];
  departments: Department[];
  tasks: Task[];
  settings: CompanySettings;
  subAgents: SubAgent[];
  crossDeptDeliveries: CrossDeptDelivery[];
  meetingPresences: MeetingPresence[];
  onSelectAgent?: (agent: Agent) => void;
}

export default function SplitPaneSecondary({
  view, onChangeView, onClose,
  agents, departments, tasks, subAgents, crossDeptDeliveries, meetingPresences,
  onSelectAgent,
}: SplitPaneSecondaryProps) {
  const { t } = useI18n();
  const mono = "var(--th-font-mono)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--th-bg-primary)" }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 8px",
        height: 32,
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-panel)",
        flexShrink: 0,
      }}>
        {/* View tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, overflow: "hidden" }}>
          {SECONDARY_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChangeView(v)}
              title={VIEW_LABELS[v] ? t(VIEW_LABELS[v]!) : v}
              style={{
                fontFamily: mono,
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 0,
                border: "1px solid " + (v === view ? "var(--th-accent)" : "var(--th-border)"),
                background: v === view ? "var(--th-active-bg)" : "transparent",
                color: v === view ? "var(--th-accent)" : "var(--th-text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{VIEW_ICONS[v]}</span>
              <span className="hidden sm:inline">{VIEW_LABELS[v] ? t(VIEW_LABELS[v]!) : v}</span>
            </button>
          ))}
        </div>
        {/* Close split button */}
        <button
          type="button"
          onClick={onClose}
          title="Close split pane"
          style={{
            fontFamily: mono,
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 0,
            border: "1px solid var(--th-border)",
            background: "transparent",
            color: "var(--th-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Suspense fallback={
          <div style={{ padding: 24, fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
            {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        }>
          {view === "flow-graph" && (
            <AgentFlowGraph
              agents={agents}
              departments={departments}
              tasks={tasks}
              subAgents={subAgents}
              crossDeptDeliveries={crossDeptDeliveries}
              meetingPresences={meetingPresences}
              onSelectAgent={onSelectAgent}
            />
          )}
          {view === "heartbeat" && (
            <HeartbeatPanel agents={agents.map((a) => ({
              id: a.id,
              name: a.name,
              name_ko: a.name_ko ?? undefined,
              avatar_emoji: a.avatar_emoji ?? undefined,
            }))} standalone />
          )}
          {view === "dashboard" && (
            <Dashboard2
              project={null}
              agents={agents}
              tasks={tasks}
              departments={departments}
              categories={[]}
              onCreateProject={() => {}}
            />
          )}
          {view === "cli-usage" && (
            <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
              {t({ ko: "CLI 사용량은 전체 화면에서 확인하세요.", en: "View CLI usage in full screen.", ja: "CLI使用量はフルスクリーンで確認してください。", zh: "请在全屏模式下查看CLI使用情况。" })}
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
