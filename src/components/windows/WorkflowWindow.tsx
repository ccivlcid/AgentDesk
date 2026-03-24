import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";

const WorkflowBuilder = lazy(() => import("../workflow-builder/WorkflowBuilder"));
const ScheduledTasksPanel = lazy(() => import("../scheduled-tasks/ScheduledTasksPanel"));
const AgentCompositionBuilder = lazy(() => import("../agent-composition/AgentCompositionBuilder"));
const LiveWorkflowPanel = lazy(() => import("../workflow-builder/LiveWorkflowPanel"));

function Loading() {
  const { t } = useI18n();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
      {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
    </div>
  );
}

export default function WorkflowWindow() {
  const { agents } = useAgentStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { t } = useI18n();

  const filteredAgents = currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

  return (
    <AppWindow
      windowType="workflow"
      title={t({ ko: "워크플로 빌더", en: "Workflow Builder", ja: "ワークフロー", zh: "工作流" })}
      emoji={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
      defaultWidth={1080}
      defaultHeight={720}

      tabs={[
        {
          id: "live",
          label: t({ ko: "실행 중", en: "Live", ja: "実行中", zh: "运行中" }),
          content: (
            <Suspense fallback={<Loading />}>
              <LiveWorkflowPanel />
            </Suspense>
          ),
        },
        {
          id: "builder",
          label: t({ ko: "빌더", en: "Builder", ja: "ビルダー", zh: "构建器" }),
          content: (
            <Suspense fallback={<Loading />}>
              <WorkflowBuilder />
            </Suspense>
          ),
        },
        {
          id: "scheduled",
          label: t({ ko: "스케줄", en: "Scheduled", ja: "スケジュール", zh: "计划任务" }),
          content: (
            <Suspense fallback={<Loading />}>
              <ScheduledTasksPanel agents={filteredAgents} currentProjectId={currentProjectId} />
            </Suspense>
          ),
        },
        {
          id: "composition",
          label: t({ ko: "컴포지션", en: "Composition", ja: "コンポジション", zh: "组合" }),
          content: (
            <Suspense fallback={<Loading />}>
              <AgentCompositionBuilder />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
