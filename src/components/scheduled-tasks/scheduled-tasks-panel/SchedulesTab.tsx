import type { ScheduledTask } from "../../../api/scheduled-tasks";
import { EmptyState } from "./EmptyState";
import { ScheduleForm } from "./ScheduleForm";
import { ScheduleRow } from "./ScheduleRow";
import { getNextRunUrgency } from "./utils";
import type { ScheduleFormProps } from "./ScheduleForm";

export interface SchedulesTabProps {
  currentProjectId: string | null | undefined;
  projectFilter: "current" | "all";
  setProjectFilter: (v: "current" | "all") => void;
  filteredSchedules: ScheduledTask[];
  schedules: ScheduledTask[];
  activeCount: number;
  totalRuns: number;
  showForm: boolean;
  formRef: React.RefObject<HTMLDivElement | null>;
  formProps: Omit<ScheduleFormProps, "formRef">;
  language: string;
  tr: (ko: string, en: string) => string;
  onResetForm: () => void;
  onShowForm: (show: boolean) => void;
  onToggle: (id: string) => void;
  onEdit: (s: ScheduledTask) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
}

export function SchedulesTab({
  currentProjectId,
  projectFilter,
  setProjectFilter,
  filteredSchedules,
  schedules,
  activeCount,
  totalRuns,
  showForm,
  formRef,
  formProps,
  language,
  tr,
  onResetForm,
  onShowForm,
  onToggle,
  onEdit,
  onDelete,
  deletingId,
  setDeletingId,
}: SchedulesTabProps) {
  return (
    <div className="space-y-5">
      {currentProjectId && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProjectFilter("current")}
            className="px-3 py-1.5 text-[11px] font-medium font-mono transition-colors"
            style={projectFilter === "current"
              ? { borderRadius: 0, border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }
              : { borderRadius: 0, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)" }}
          >
            {tr("현재 프로젝트", "Current Project")}
          </button>
          <button
            type="button"
            onClick={() => setProjectFilter("all")}
            className="px-3 py-1.5 text-[11px] font-medium font-mono transition-colors"
            style={projectFilter === "all"
              ? { borderRadius: 0, border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" }
              : { borderRadius: 0, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)" }}
          >
            {tr("전체", "All")} ({schedules.length})
          </button>
        </div>
      )}

      {filteredSchedules.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="px-4 py-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <div className="text-[11px] font-mono uppercase tracking-wider font-medium" style={{ color: "var(--th-text-muted)" }}>{tr("전체", "Total")}</div>
            <div className="text-xl font-bold font-mono mt-0.5" style={{ color: "var(--th-text-heading)" }}>{filteredSchedules.length}</div>
          </div>
          <div className="px-4 py-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <div className="text-[11px] font-mono uppercase tracking-wider font-medium" style={{ color: "var(--th-text-muted)" }}>{tr("활성", "Active")}</div>
            <div className="text-xl font-bold font-mono mt-0.5" style={{ color: "rgb(52,211,153)" }}>{activeCount}</div>
          </div>
          <div className="px-4 py-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <div className="text-[11px] font-mono uppercase tracking-wider font-medium" style={{ color: "var(--th-text-muted)" }}>{tr("총 실행", "Total Runs")}</div>
            <div className="text-xl font-bold font-mono mt-0.5" style={{ color: "var(--th-accent)" }}>{totalRuns}</div>
          </div>
        </div>
      )}

      {showForm && (
        <ScheduleForm formRef={formRef} {...formProps} />
      )}

      {filteredSchedules.length === 0 && !showForm ? (
        <EmptyState
          icon="M12 7v5l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          title={tr("등록된 스케줄이 없습니다", "No schedules yet")}
          description={currentProjectId && projectFilter === "current"
            ? tr("현재 프로젝트에 등록된 스케줄이 없습니다", "No schedules for the current project")
            : tr("반복 태스크 스케줄을 추가하여 업무를 자동화하세요", "Add a schedule to automate recurring task creation")}
          actionLabel={tr("첫 스케줄 추가", "Add First Schedule")}
          onAction={() => { onResetForm(); onShowForm(true); }}
        />
      ) : filteredSchedules.length > 0 ? (
        <div className="space-y-2.5">
          {filteredSchedules.map((s) => {
            const urgency = s.enabled ? getNextRunUrgency(s.next_run_at) : "disabled";
            return (
              <ScheduleRow
                key={s.id}
                schedule={s}
                urgency={urgency}
                language={language}
                tr={tr}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                deletingId={deletingId}
                setDeletingId={setDeletingId}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
