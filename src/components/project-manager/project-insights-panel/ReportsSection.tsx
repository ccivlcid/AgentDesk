import type { ProjectReportHistoryItem } from "../../../api";
import type { ProjectI18nTranslate } from "../types";
import { fmtTime } from "../utils";

interface ReportsSectionProps {
  t: ProjectI18nTranslate;
  selectedProject: { id: string } | null;
  sortedReports: ProjectReportHistoryItem[];
  handleOpenTaskDetail: (taskId: string) => Promise<void>;
}

export function ReportsSection({ t, selectedProject, sortedReports, handleOpenTaskDetail }: ReportsSectionProps) {
  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid var(--th-border)", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "보고서 이력(프로젝트 매핑)", en: "Mapped Reports", ja: "紐づくレポート", zh: "映射报告" })}
      </h4>
      {!selectedProject ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>-</p>
      ) : sortedReports.length === 0 ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "연결된 보고서가 없습니다",
            en: "No mapped reports",
            ja: "紐づくレポートなし",
            zh: "没有映射报告",
          })}
        </p>
      ) : (
        <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
          {sortedReports.map((row) => (
            <div
              key={row.id}
              className="flex min-w-0 items-center justify-between gap-2 px-3 py-2"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap break-all text-xs font-medium font-mono" style={{ color: "var(--th-text-primary)" }}>{row.title}</p>
                <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{fmtTime(row.completed_at || row.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleOpenTaskDetail(row.id)}
                className="shrink-0 px-2 py-1 text-[11px] font-mono font-bold uppercase"
                style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)" }}
              >
                {t({ ko: "열람", en: "Open", ja: "表示", zh: "查看" })}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
