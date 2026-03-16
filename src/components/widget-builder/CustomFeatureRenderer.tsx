import type { CustomFeature } from "../../types";
import AiBundleRenderer from "./AiBundleRenderer";
import AgentDeptStatus from "./templates/renderers/AgentDeptStatus";
import AgentSingleMonitor from "./templates/renderers/AgentSingleMonitor";
import TaskDailyCounter from "./templates/renderers/TaskDailyCounter";
import TaskAssigneeProgress from "./templates/renderers/TaskAssigneeProgress";
import NotificationFilterFeed from "./templates/renderers/NotificationFilterFeed";
import CliCostSummary from "./templates/renderers/CliCostSummary";
import MemoBoard from "./templates/renderers/MemoBoard";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function CustomFeatureRenderer({ feature }: { feature: CustomFeature }) {
  if (feature.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
        <span style={{ fontSize: 24 }}>⚠</span>
        <div style={{ ...mono, fontSize: 10, color: "var(--th-danger-text)" }}>생성 오류</div>
        <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{feature.error_msg}</div>
      </div>
    );
  }

  if (feature.status === "draft") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="animate-pulse" style={{ ...mono, fontSize: 12, color: "var(--th-text-muted)" }}>생성 중...</span>
      </div>
    );
  }

  // AI 생성 기능: bundle이 IIFE JS로 컴파일돼 있음 → iframe으로 렌더링
  if (feature.source === "ai") {
    return <AiBundleRenderer featureId={feature.id} />;
  }

  if (!feature.template_id) {
    return (
      <div className="flex items-center justify-center h-full" style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
        렌더러 없음
      </div>
    );
  }

  const props = { config: feature.config };

  switch (feature.template_id) {
    case "agent-dept-status":       return <AgentDeptStatus {...props} />;
    case "agent-single-monitor":    return <AgentSingleMonitor {...props} />;
    case "task-daily-counter":      return <TaskDailyCounter {...props} />;
    case "task-assignee-progress":  return <TaskAssigneeProgress {...props} />;
    case "notification-filter-feed":return <NotificationFilterFeed {...props} />;
    case "cli-cost-summary":        return <CliCostSummary {...props} />;
    case "memo-board":              return <MemoBoard {...props} />;
    default:
      return (
        <div className="flex items-center justify-center h-full" style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          알 수 없는 템플릿: {feature.template_id}
        </div>
      );
  }
}
