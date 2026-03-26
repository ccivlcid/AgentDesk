import type { Project } from "../../../types";
import type { ProjectDecisionEventItem } from "../../../api";
import type { GroupedProjectTaskCard, ProjectI18nTranslate } from "../types";
import BurndownChart from "../BurndownChart";
import { ProjectInfoSection } from "./ProjectInfoSection";
import { ProjectDashboardSection } from "./ProjectDashboardSection";
import { DeliverableChecklistSection } from "./DeliverableChecklistSection";
import { ProjectProgressSection } from "./ProjectProgressSection";
import { ProjectCostSection } from "./ProjectCostSection";
import { TaskHistorySection } from "./TaskHistorySection";
import { DecisionEventsSection } from "./DecisionEventsSection";

export interface ProjectInsightsPanelProps {
  t: ProjectI18nTranslate;
  language: string;
  selectedProject: Project | null;
  loadingDetail: boolean;
  isCreating: boolean;
  groupedTaskCards: GroupedProjectTaskCard[];
  sortedDecisionEvents: ProjectDecisionEventItem[];
  getDecisionEventLabel: (eventType: ProjectDecisionEventItem["event_type"]) => string;
  handleOpenTaskDetail: (taskId: string) => Promise<void>;
}

export default function ProjectInsightsPanel({
  t,
  language,
  selectedProject,
  loadingDetail,
  isCreating,
  groupedTaskCards,
  sortedDecisionEvents,
  getDecisionEventLabel,
  handleOpenTaskDetail,
}: ProjectInsightsPanelProps) {
  const isKo = language === "ko";

  return (
    <div className="min-w-0 space-y-4">
      <ProjectInfoSection t={t} selectedProject={selectedProject} loadingDetail={loadingDetail} isCreating={isCreating} />

      {selectedProject && !loadingDetail && !isCreating && (
        <ProjectDashboardSection t={t} projectId={selectedProject.id} isKo={isKo} />
      )}

      {selectedProject && !loadingDetail && !isCreating && (
        <DeliverableChecklistSection t={t} projectId={selectedProject.id} />
      )}

      {selectedProject && !loadingDetail && !isCreating && groupedTaskCards.length > 0 && (
        <ProjectProgressSection t={t} groupedTaskCards={groupedTaskCards} />
      )}

      {selectedProject && !loadingDetail && !isCreating && groupedTaskCards.length > 0 && (
        <div className="min-w-0 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 0, background: "var(--th-bg-surface)" }}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "번다운 차트", en: "Burndown Chart", ja: "バーンダウンチャート", zh: "燃尽图" })}
          </h4>
          <BurndownChart projectId={selectedProject.id} t={t} />
        </div>
      )}

      {selectedProject && !loadingDetail && !isCreating && (
        <ProjectCostSection t={t} projectId={selectedProject.id} />
      )}

      <TaskHistorySection
        t={t}
        selectedProject={selectedProject}
        groupedTaskCards={groupedTaskCards}
        handleOpenTaskDetail={handleOpenTaskDetail}
      />

      <DecisionEventsSection
        t={t}
        selectedProject={selectedProject}
        sortedDecisionEvents={sortedDecisionEvents}
        getDecisionEventLabel={getDecisionEventLabel}
      />
    </div>
  );
}
