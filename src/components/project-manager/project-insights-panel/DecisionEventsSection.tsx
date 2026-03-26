import type { ProjectDecisionEventItem } from "../../../api";
import type { ProjectI18nTranslate } from "../types";
import { fmtTime } from "../utils";

interface DecisionEventsSectionProps {
  t: ProjectI18nTranslate;
  selectedProject: { id: string } | null;
  sortedDecisionEvents: ProjectDecisionEventItem[];
  getDecisionEventLabel: (eventType: ProjectDecisionEventItem["event_type"]) => string;
}

export function DecisionEventsSection({
  t,
  selectedProject,
  sortedDecisionEvents,
  getDecisionEventLabel,
}: DecisionEventsSectionProps) {
  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 0, background: "var(--th-bg-surface)" }}>
      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "대표 선택사항", en: "Representative Decisions", ja: "代表選択事項", zh: "代表选择事项" })}
      </h4>
      {!selectedProject ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>-</p>
      ) : sortedDecisionEvents.length === 0 ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "기록된 대표 의사결정이 없습니다",
            en: "No representative decision records",
            ja: "代表意思決定の記録はありません",
            zh: "暂无代表决策记录",
          })}
        </p>
      ) : (
        <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
          {sortedDecisionEvents.map((event) => {
            let selectedLabels: string[] = [];
            if (event.selected_options_json) {
              try {
                const parsed = JSON.parse(event.selected_options_json) as Array<{ label?: unknown }>;
                selectedLabels = Array.isArray(parsed)
                  ? parsed
                      .map((row) => (typeof row?.label === "string" ? row.label.trim() : ""))
                      .filter((label) => label.length > 0)
                  : [];
              } catch {
                selectedLabels = [];
              }
            }

            return (
              <div
                key={`${event.id}-${event.created_at}`}
                className="px-3 py-2"
                style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>
                    {getDecisionEventLabel(event.event_type)}
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>{fmtTime(event.created_at)}</p>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-all text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>{event.summary}</p>
                {selectedLabels.length > 0 && (
                  <p className="mt-1 whitespace-pre-wrap break-all text-[11px] text-[#93c5fd]">
                    {t({ ko: "선택 내용", en: "Selected Items", ja: "選択内容", zh: "已选内容" })}:{" "}
                    {selectedLabels.join(" / ")}
                  </p>
                )}
                {event.note && event.note.trim().length > 0 && (
                  <p className="mt-1 whitespace-pre-wrap break-all text-[11px] text-emerald-300">
                    {t({ ko: "추가 요청사항", en: "Additional Request", ja: "追加要請事項", zh: "追加请求事项" })}:{" "}
                    {event.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
