import type { TaskTemplate } from "../../../api/task-templates";
import { EmptyState } from "./EmptyState";
import { TemplateForm } from "./TemplateForm";
import { TemplateRow } from "./TemplateRow";
import type { WorkflowPackOption } from "./TemplateForm";

export interface TemplatesTabProps {
  templates: TaskTemplate[];
  showTplForm: boolean;
  tplName: string;
  setTplName: (v: string) => void;
  tplTitle: string;
  setTplTitle: (v: string) => void;
  tplDesc: string;
  setTplDesc: (v: string) => void;
  tplWorkflowPack: string;
  setTplWorkflowPack: (v: string) => void;
  tplPriority: number;
  setTplPriority: (v: number) => void;
  tplTaskType: string;
  setTplTaskType: (v: string) => void;
  workflowPackOptions: WorkflowPackOption[];
  language: string;
  tr: (ko: string, en: string) => string;
  onTplSubmit: () => void;
  onResetTplForm: () => void;
  onShowTplForm: (show: boolean) => void;
  onTplDelete: (id: string) => void;
  deletingTplId: string | null;
  setDeletingTplId: (id: string | null) => void;
}

export function TemplatesTab({
  templates,
  showTplForm,
  tplName,
  setTplName,
  tplTitle,
  setTplTitle,
  tplDesc,
  setTplDesc,
  tplWorkflowPack,
  setTplWorkflowPack,
  tplPriority,
  setTplPriority,
  tplTaskType,
  setTplTaskType,
  workflowPackOptions,
  language,
  tr,
  onTplSubmit,
  onResetTplForm,
  onShowTplForm,
  onTplDelete,
  deletingTplId,
  setDeletingTplId,
}: TemplatesTabProps) {
  return (
    <div className="space-y-5">
      {showTplForm && (
        <TemplateForm
          tplName={tplName}
          setTplName={setTplName}
          tplTitle={tplTitle}
          setTplTitle={setTplTitle}
          tplDesc={tplDesc}
          setTplDesc={setTplDesc}
          tplWorkflowPack={tplWorkflowPack}
          setTplWorkflowPack={setTplWorkflowPack}
          tplPriority={tplPriority}
          setTplPriority={setTplPriority}
          tplTaskType={tplTaskType}
          setTplTaskType={setTplTaskType}
          workflowPackOptions={workflowPackOptions}
          language={language}
          tr={tr}
          onSubmit={onTplSubmit}
          onCancel={() => { onResetTplForm(); onShowTplForm(false); }}
        />
      )}

      {templates.length === 0 && !showTplForm ? (
        <EmptyState
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          title={tr("등록된 템플릿이 없습니다", "No templates yet")}
          description={tr("태스크 템플릿을 만들어 스케줄에 연결하세요", "Create task templates to link with schedules")}
          actionLabel={tr("첫 템플릿 추가", "Add First Template")}
          onAction={() => { onResetTplForm(); onShowTplForm(true); }}
        />
      ) : templates.length > 0 ? (
        <div className="space-y-2.5">
          {templates.map((tpl) => (
            <TemplateRow
              key={tpl.id}
              template={tpl}
              workflowPackOptions={workflowPackOptions}
              language={language}
              tr={tr}
              onDelete={onTplDelete}
              deletingTplId={deletingTplId}
              setDeletingTplId={setDeletingTplId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
