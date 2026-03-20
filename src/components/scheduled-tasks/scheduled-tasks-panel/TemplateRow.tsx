import type { TaskTemplate } from "../../../api/task-templates";
import { PRIORITY_OPTIONS } from "./constants";
import type { WorkflowPackOption } from "./TemplateForm";

export interface TemplateRowProps {
  template: TaskTemplate;
  workflowPackOptions: WorkflowPackOption[];
  language: string;
  tr: (ko: string, en: string) => string;
  onDelete: (id: string) => void;
  deletingTplId: string | null;
  setDeletingTplId: (id: string | null) => void;
}

export function TemplateRow({
  template: tpl,
  workflowPackOptions,
  language,
  tr,
  onDelete,
  deletingTplId,
  setDeletingTplId,
}: TemplateRowProps) {
  const packOption = workflowPackOptions.find((o) => o.key === tpl.workflow_pack_key);
  const prioOption = PRIORITY_OPTIONS.find((o) => o.value === tpl.priority);

  return (
    <div className="group relative transition-all duration-200" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      <div className="absolute left-0 top-3 bottom-3 w-0.5" style={{ borderRadius: 0, background: "var(--th-accent)", opacity: 0.5 }} />
      <div className="flex items-center gap-4 px-5 py-3.5">
        <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-accent)" }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h4 className="font-semibold text-sm font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{tpl.name}</h4>
            {tpl.title && <span className="text-xs font-mono truncate" style={{ color: "var(--th-text-muted)" }}>- {tpl.title}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {packOption && packOption.key && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono" style={{ borderRadius: 0, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>
                {packOption.label}
              </span>
            )}
            {prioOption && (
              <span style={{ color: "var(--th-text-secondary)" }}>P{tpl.priority} {language === "ko" ? prioOption.labelKo : prioOption.label}</span>
            )}
            <span style={{ color: "var(--th-text-muted)" }}>{tpl.task_type}</span>
            {tpl.description && (
              <><span style={{ color: "var(--th-border)" }}>|</span><span className="truncate max-w-[200px]">{tpl.description}</span></>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button type="button" onClick={() => setDeletingTplId(tpl.id)} className="p-1.5 transition-all" style={{ borderRadius: 0, color: "var(--th-text-muted)" }} title={tr("삭제", "Delete")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {deletingTplId === tpl.id && (
        <div className="flex items-center justify-end gap-2 px-5 pb-3 -mt-1">
          <span className="text-xs font-mono" style={{ color: "rgb(253,164,175)" }}>{tr("정말 삭제하시겠습니까?", "Delete this template?")}</span>
          <button type="button" onClick={() => onDelete(tpl.id)} className="px-3 py-1 text-xs font-mono transition-all" style={{ borderRadius: 0, border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>{tr("삭제", "Delete")}</button>
          <button type="button" onClick={() => setDeletingTplId(null)} className="px-3 py-1 text-xs font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>{tr("취소", "Cancel")}</button>
        </div>
      )}
    </div>
  );
}
