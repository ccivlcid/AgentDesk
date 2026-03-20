import type { Agent, Project } from "../../../types";
import type { TaskTemplate } from "../../../api/task-templates";
import { CRON_PRESETS } from "./constants";

export interface ScheduleFormProps {
  formRef: React.RefObject<HTMLDivElement | null>;
  formName: string;
  setFormName: (v: string) => void;
  formCron: string;
  setFormCron: (v: string) => void;
  formTemplateId: string;
  setFormTemplateId: (v: string) => void;
  formAgentId: string;
  setFormAgentId: (v: string) => void;
  formProjectId: string;
  setFormProjectId: (v: string) => void;
  formAutoRun: boolean;
  setFormAutoRun: (v: boolean) => void;
  cronValid: boolean;
  cronDesc: string;
  showCronHelp: boolean;
  setShowCronHelp: (v: boolean) => void;
  templates: TaskTemplate[];
  agents: Agent[];
  projects: Project[];
  editingId: string | null;
  language: string;
  tr: (ko: string, en: string) => string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ScheduleForm({
  formRef,
  formName,
  setFormName,
  formCron,
  setFormCron,
  formTemplateId,
  setFormTemplateId,
  formAgentId,
  setFormAgentId,
  formProjectId,
  setFormProjectId,
  formAutoRun,
  setFormAutoRun,
  cronValid,
  cronDesc,
  showCronHelp,
  setShowCronHelp,
  templates,
  agents,
  projects,
  editingId,
  language,
  tr,
  onSubmit,
  onCancel,
}: ScheduleFormProps) {
  return (
    <div ref={formRef} className="relative overflow-hidden" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
      <div className="h-0.5" style={{ background: "var(--th-accent)" }} />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: "var(--th-text-heading)" }}>
            <span className="w-1.5 h-1.5" style={{ borderRadius: "50%", background: "var(--th-accent)" }} />
            {editingId ? tr("스케줄 수정", "Edit Schedule") : tr("새 스케줄 생성", "Create New Schedule")}
          </h3>
          {cronDesc && (
            <span className="text-xs font-mono px-2.5 py-1" style={{ borderRadius: 0, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>{cronDesc}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("스케줄 이름", "Schedule Name")}</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder={tr("예: 일일 코드 리뷰", "e.g. Daily Code Review")}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("Cron 표현식", "Cron Expression")}</label>
              <button type="button" onClick={() => setShowCronHelp(!showCronHelp)} className="text-[10px] font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>
                {tr("도움말", "Help")} ?
              </button>
            </div>
            <div className="relative">
              <input type="text" value={formCron} onChange={(e) => setFormCron(e.target.value)} placeholder="0 9 * * 1-5"
                className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
                style={{ borderRadius: 0, border: cronValid ? "1px solid var(--th-border)" : "1px solid rgba(244,63,94,0.5)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {cronValid ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "rgb(52,211,153)" }}><polyline points="20 6 9 17 4 12" /></svg>
                ) : formCron.trim() ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "rgb(248,113,113)" }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                ) : null}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("빠른 선택", "Quick Presets")}</label>
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map((p) => (
                <button key={p.expr} type="button" onClick={() => setFormCron(p.expr)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all duration-150"
                  style={formCron === p.expr
                    ? { borderRadius: 0, border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }
                    : { borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d={p.icon} /></svg>
                  {language === "ko" ? p.labelKo : p.label}
                </button>
              ))}
            </div>
          </div>

          {showCronHelp && (
            <div className="md:col-span-2 p-4 text-xs font-mono" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-terminal-bg)", color: "var(--th-text-muted)" }}>
              <pre className="font-mono leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
{`  ┌──── ${tr("분", "min")} (0-59)
  │ ┌── ${tr("시", "hour")} (0-23)
  │ │ ┌─ ${tr("일", "day")} (1-31)
  │ │ │ ┌ ${tr("월", "month")} (1-12)
  │ │ │ │ ┌ ${tr("요일", "wday")} (0-6)
  * * * * *`}
              </pre>
              <p className="mt-2" style={{ color: "var(--th-text-muted)" }}>
                {tr("예: */30 * * * * (30분마다) | 0 9 * * 1-5 (평일 9시)", "Ex: */30 * * * * (every 30m) | 0 9 * * 1-5 (weekdays 9AM)")}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
              {tr("태스크 템플릿", "Task Template")}
              <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{tr("(선택)", "(optional)")}</span>
            </label>
            <select value={formTemplateId} onChange={(e) => setFormTemplateId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
              <option value="">{tr("-- 선택 안 함 --", "-- None --")}</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}{tpl.title ? ` - ${tpl.title}` : ""}</option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                {tr("템플릿 탭에서 먼저 템플릿을 등록하세요", "Create a template in the Templates tab first")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
              {tr("담당 에이전트", "Assigned Agent")}
              <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{tr("(선택)", "(optional)")}</span>
            </label>
            <select value={formAgentId} onChange={(e) => setFormAgentId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
              <option value="">{tr("-- 자동 배정 --", "-- Auto Assign --")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.avatar_emoji} {language === "ko" ? a.name_ko || a.name : a.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
              {tr("프로젝트", "Project")}
              <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{tr("(선택)", "(optional)")}</span>
            </label>
            <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>
              <option value="">{tr("-- 선택 안 함 --", "-- None --")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button type="button" role="switch" aria-checked={formAutoRun} onClick={() => setFormAutoRun(!formAutoRun)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200"
              style={{ borderRadius: "999px", background: formAutoRun ? "var(--th-accent)" : "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform shadow-lg ring-0 transition-transform duration-200 ${formAutoRun ? "translate-x-5" : "translate-x-0"}`}
                style={{ borderRadius: "50%", background: "#fff" }} />
            </button>
            <span className="text-sm font-mono" style={{ color: "var(--th-text-secondary)" }}>{tr("생성 시 자동 실행", "Auto-run on creation")}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button type="button" onClick={onSubmit} disabled={!formName.trim() || !cronValid}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium font-mono transition-all duration-200"
            style={!formName.trim() || !cronValid
              ? { borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
              : { borderRadius: 0, border: "1px solid rgba(52,211,153,0.5)", background: "rgba(52,211,153,0.2)", color: "rgb(167,243,208)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            {editingId ? tr("변경 저장", "Save Changes") : tr("스케줄 생성", "Create Schedule")}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>
            {tr("취소", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
