import { PRIORITY_OPTIONS } from "./constants";

export interface WorkflowPackOption {
  key: string;
  label: string;
}

export interface TemplateFormProps {
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
  onSubmit: () => void;
  onCancel: () => void;
}

export function TemplateForm({
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
  onSubmit,
  onCancel,
}: TemplateFormProps) {
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
      <div className="h-0.5" style={{ background: "var(--th-accent)" }} />
      <div className="p-6 space-y-5">
        <h3 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: "var(--th-text-heading)" }}>
          <span className="w-1.5 h-1.5" style={{ borderRadius: "50%", background: "var(--th-accent)" }} />
          {tr("새 태스크 템플릿", "New Task Template")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("템플릿 이름", "Template Name")} *</label>
            <input type="text" value={tplName} onChange={(e) => setTplName(e.target.value)}
              placeholder={tr("예: 일일 코드 리뷰", "e.g. Daily Code Review")}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("태스크 제목", "Task Title")}</label>
            <input type="text" value={tplTitle} onChange={(e) => setTplTitle(e.target.value)}
              placeholder={tr("생성될 태스크의 제목", "Title for created tasks")}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("설명", "Description")}</label>
            <textarea value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} rows={2}
              placeholder={tr("태스크에 대한 상세 설명...", "Detailed task description...")}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all resize-none"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("워크플로우 팩", "Workflow Pack")}</label>
            <select value={tplWorkflowPack} onChange={(e) => setTplWorkflowPack(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
              {workflowPackOptions.map((o) => (
                <option key={o.key || "_none"} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("우선순위", "Priority")}</label>
            <select value={tplPriority} onChange={(e) => setTplPriority(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{language === "ko" ? o.labelKo : o.label} (P{o.value})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("태스크 유형", "Task Type")}</label>
            <select value={tplTaskType} onChange={(e) => setTplTaskType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
              <option value="general">{tr("일반", "General")}</option>
              <option value="development">{tr("개발", "Development")}</option>
              <option value="design">{tr("디자인", "Design")}</option>
              <option value="analysis">{tr("분석", "Analysis")}</option>
              <option value="documentation">{tr("문서", "Documentation")}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button type="button" onClick={onSubmit} disabled={!tplName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium font-mono transition-all duration-200"
            style={!tplName.trim()
              ? { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
              : { borderRadius: 0, border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.2)", color: "rgb(167,243,208)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            {tr("템플릿 생성", "Create Template")}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>
            {tr("취소", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
