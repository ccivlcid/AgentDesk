import type { TaskExecutionEvent, TaskExecutionSummary } from "../../types";

export interface OpsDetailsSectionProps {
  effectiveExecution: TaskExecutionSummary;
  executionEvents: TaskExecutionEvent[];
  opsDetailsOpen: boolean;
  setOpsDetailsOpen: (fn: (prev: boolean) => boolean) => void;
  hasExecutionIssue: boolean;
  taskLogTimeFormatter: Intl.DateTimeFormat;
  formatExecutionTime: (v?: number | null) => string;
  formatElapsed: (v?: number | null) => string;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
}

export function OpsDetailsSection({
  effectiveExecution,
  executionEvents,
  opsDetailsOpen,
  setOpsDetailsOpen,
  hasExecutionIssue,
  taskLogTimeFormatter,
  formatExecutionTime,
  formatElapsed,
  tr,
}: OpsDetailsSectionProps) {
  return (
    <div className="border-b px-4 py-2.5 space-y-2" style={{ borderColor: "var(--th-border)" }}>
      <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
        <div className="flex min-w-0 flex-wrap items-center gap-2" style={{ color: "var(--th-text-secondary)" }}>
          <span>{`${tr("attempt", "attempt", "attempt", "attempt")}: ${effectiveExecution.execution_attempt ?? 0}`}</span>
          <span title={formatExecutionTime(effectiveExecution.last_output_at)}>
            {`${tr("output", "output", "output", "output")}: ${formatElapsed(effectiveExecution.last_output_at)}`}
          </span>
          {effectiveExecution.claimed_by && (
            <span className="truncate">{`${tr("claimed", "claimed", "claimed", "claimed")}: ${effectiveExecution.claimed_by}`}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpsDetailsOpen((prev) => !prev)}
          className="shrink-0 px-1 py-0.5 text-[10px] font-mono transition"
          style={{
            borderRadius: 0,
            border: `1px solid ${hasExecutionIssue ? "rgba(244,63,94,0.28)" : "var(--th-border)"}`,
            color: hasExecutionIssue ? "#fda4af" : "var(--th-text-muted)",
            background: hasExecutionIssue ? "rgba(244,63,94,0.08)" : "transparent",
          }}
        >
          {opsDetailsOpen ? tr("ops 닫기", "Hide ops", "ops を閉じる", "收起 ops") : tr("ops 보기", "Show ops", "ops を表示", "显示 ops")}
        </button>
      </div>
      {hasExecutionIssue && effectiveExecution.execution_error_summary && (
        <div
          className="text-[10px] font-mono break-words border px-2 py-1.5"
          style={{
            borderRadius: 0,
            borderColor: "rgba(244,63,94,0.28)",
            background: "rgba(244,63,94,0.08)",
            color: "#fda4af",
          }}
        >
          {effectiveExecution.execution_error_summary}
        </div>
      )}
      {opsDetailsOpen && (
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono" style={{ color: "var(--th-text-secondary)" }}>
          <div>{`${tr("execution", "execution", "execution", "execution")}: ${effectiveExecution.execution_state ?? "-"}`}</div>
          <div title={formatExecutionTime(effectiveExecution.last_heartbeat_at)}>
            {`${tr("heartbeat", "heartbeat", "heartbeat", "heartbeat")}: ${formatElapsed(effectiveExecution.last_heartbeat_at)}`}
          </div>
          <div title={formatExecutionTime(effectiveExecution.last_output_at)}>
            {`${tr("last output", "last output", "last output", "last output")}: ${formatExecutionTime(effectiveExecution.last_output_at)}`}
          </div>
          <div>{`${tr("updated", "updated", "updated", "updated")}: ${formatExecutionTime(effectiveExecution.updated_at)}`}</div>
        </div>
      )}
      {opsDetailsOpen && executionEvents.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("최근 execution events", "Recent execution events", "最近 execution events", "最近 execution events")}
          </div>
          <div className="max-h-24 space-y-0.5 overflow-y-auto">
            {executionEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="text-[10px] font-mono" style={{ color: "var(--th-text-secondary)" }}>
                [{taskLogTimeFormatter.format(new Date(event.created_at))}] {event.event_type}
                {event.summary ? ` · ${event.summary}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
