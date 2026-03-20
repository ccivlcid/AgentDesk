import type { ScheduledTask } from "../../../api/scheduled-tasks";
import { fmtRelative } from "./utils";

type Urgency = "imminent" | "soon" | "normal" | "disabled";

export interface ScheduleRowProps {
  schedule: ScheduledTask;
  urgency: Urgency;
  language: string;
  tr: (ko: string, en: string) => string;
  onToggle: (id: string) => void;
  onEdit: (s: ScheduledTask) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
}

export function ScheduleRow({
  schedule: s,
  urgency,
  language,
  tr,
  onToggle,
  onEdit,
  onDelete,
  deletingId,
  setDeletingId,
}: ScheduleRowProps) {
  return (
    <div
      className="group relative transition-all duration-200"
      style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", opacity: s.enabled ? 1 : 0.5 }}
    >
      <div className="absolute left-0 top-3 bottom-3 w-0.5 transition-colors" style={{ background: s.enabled ? "rgba(52,211,153,0.6)" : "var(--th-border)" }} />

      <div className="flex items-center gap-4 px-5 py-3.5">
        <button type="button" onClick={() => onToggle(s.id)} className="shrink-0" title={s.enabled ? "ON" : "OFF"}>
          <div className="relative w-9 h-5 transition-colors duration-200" style={{ borderRadius: "999px", background: s.enabled ? "rgba(52,211,153,0.8)" : "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
            <div className={`absolute top-0.5 w-4 h-4 shadow-sm transition-transform duration-200 ${s.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
              style={{ borderRadius: "50%", background: "#fff" }} />
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h4 className="font-semibold text-sm font-mono truncate" style={{ color: "var(--th-text-heading)" }}>{s.name}</h4>
            <code className="text-[11px] px-2 py-0.5 font-mono shrink-0" style={{ borderRadius: 0, border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.08)", color: "var(--th-accent)" }}>{s.cron_expression}</code>
            {s.auto_run && (
              <span className="text-[10px] px-1.5 py-0.5 font-mono shrink-0" style={{ borderRadius: 0, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>{tr("자동실행", "Auto")}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            <span style={{ color: "var(--th-text-secondary)" }}>{language === "ko" ? s.cron_description_ko : s.cron_description_en}</span>
            {s.template_name && (<><span style={{ color: "var(--th-border)" }}>|</span><span>{s.template_name}</span></>)}
            {s.agent_name && (<><span style={{ color: "var(--th-border)" }}>|</span><span>{s.agent_avatar} {s.agent_name}</span></>)}
            {s.project_name && (<><span style={{ color: "var(--th-border)" }}>|</span><span>{s.project_name}</span></>)}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{tr("다음 실행", "Next")}</div>
            <div className="text-xs font-medium font-mono mt-0.5" style={{ color: urgency === "imminent" ? "var(--th-accent)" : urgency === "soon" ? "rgb(110,231,183)" : urgency === "disabled" ? "var(--th-text-muted)" : "var(--th-text-secondary)" }}>
              {s.enabled ? fmtRelative(s.next_run_at) : tr("비활성", "OFF")}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>{tr("실행", "Runs")}</div>
            <div className="text-xs font-medium font-mono mt-0.5" style={{ color: "var(--th-text-secondary)" }}>{s.run_count}</div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button type="button" onClick={() => onEdit(s)} className="p-1.5 transition-all" style={{ borderRadius: 0, color: "var(--th-text-muted)" }} title={tr("수정", "Edit")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button type="button" onClick={() => setDeletingId(s.id)} className="p-1.5 transition-all" style={{ borderRadius: 0, color: "var(--th-text-muted)" }} title={tr("삭제", "Delete")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {deletingId === s.id && (
        <div className="flex items-center justify-end gap-2 px-5 pb-3 -mt-1">
          <span className="text-xs font-mono" style={{ color: "rgb(253,164,175)" }}>{tr("정말 삭제하시겠습니까?", "Delete this schedule?")}</span>
          <button type="button" onClick={() => onDelete(s.id)} className="px-3 py-1 text-xs font-mono transition-all" style={{ borderRadius: 0, border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>{tr("삭제", "Delete")}</button>
          <button type="button" onClick={() => setDeletingId(null)} className="px-3 py-1 text-xs font-mono transition-colors" style={{ color: "var(--th-text-muted)" }}>{tr("취소", "Cancel")}</button>
        </div>
      )}
    </div>
  );
}
