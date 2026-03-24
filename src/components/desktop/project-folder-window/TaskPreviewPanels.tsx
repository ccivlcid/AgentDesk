import { useState, useEffect } from "react";
import type { Task } from "../../../types";
import type { TaskReportDetail } from "../../../api/providers-reports-github";
import { useI18n } from "../../../i18n";
import { STATUS_COLORS, STATUS_LABEL } from "./constants";
import { fmtTime } from "./utils";

export function ResultPane({ report, task }: { report: TaskReportDetail | null; task: Task }) {
  const content =
    report?.planning_summary?.content ||
    report?.team_reports?.map((tr) => tr.title + "\n" + tr.summary).join("\n\n") ||
    task.result ||
    null;

  const { t } = useI18n();

  if (!content) {
    return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "결과 없음", en: "No result content", ja: "結果なし", zh: "无结果内容" })}</div>;
  }

  return (
    <pre
      style={{
        fontSize: 11,
        lineHeight: 1.6,
        color: "var(--th-text-primary)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: 0,
        fontFamily: "var(--th-font-mono)",
      }}
    >
      {content}
    </pre>
  );
}

export function LogsPane({ logs }: { logs: Array<{ kind: string; message: string; created_at: number }> }) {
  const { t } = useI18n();
  if (logs.length === 0) return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "로그 없음", en: "No logs", ja: "ログなし", zh: "无日志" })}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {logs.map((log, i) => (
        <div key={i} style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--th-text-secondary)" }}>
          <span style={{ color: "var(--th-text-muted)", flexShrink: 0, width: 90 }}>{fmtTime(log.created_at)}</span>
          <span style={{ color: log.kind === "error" ? "var(--th-danger, #ef4444)" : "var(--th-text-muted)", flexShrink: 0, width: 60 }}>[{log.kind}]</span>
          <span style={{ flex: 1, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

export function SubtasksPane({ subtasks }: { subtasks: Array<{ id: string; title: string; status: string; agent_name: string; completed_at: number | null }> }) {
  const { t } = useI18n();
  if (subtasks.length === 0) return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "서브태스크 없음", en: "No subtasks", ja: "サブタスクなし", zh: "无子任务" })}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {subtasks.map((st) => (
        <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, padding: "6px 0", borderBottom: "1px solid var(--th-border)" }}>
          <span style={{ fontSize: 9, color: st.status === "done" ? "var(--th-success, #22c55e)" : "var(--th-text-muted)", display: "inline-flex", alignItems: "center" }}>
            {st.status === "done" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
              </svg>
            )}
          </span>
          <span style={{ flex: 1, color: st.status === "done" ? "var(--th-text-muted)" : "var(--th-text-primary)" }}>{st.title}</span>
          <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{st.agent_name}</span>
        </div>
      ))}
    </div>
  );
}

export function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      <span style={{ color: "var(--th-text-muted)" }}>{label}:</span>
      <span style={{ color: "var(--th-text-primary)" }}>{value}</span>
    </div>
  );
}

export function DonePreview({
  report,
  loading,
  reportTab,
  setReportTab,
  task,
}: {
  report: TaskReportDetail | null;
  loading: boolean;
  reportTab: "result" | "logs" | "subtasks";
  setReportTab: (t: "result" | "logs" | "subtasks") => void;
  task: Task;
}) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
        <span style={{ animation: "pulse 1s infinite" }}>{t({ ko: "리포트 로딩중...", en: "loading report...", ja: "レポート読み込み中...", zh: "加载报告..." })}</span>
      </div>
    );
  }

  const RTABS: { id: "result" | "logs" | "subtasks"; label: string }[] = [
    { id: "result",   label: t({ ko: "결과", en: "Result", ja: "結果", zh: "结果" }) },
    { id: "logs",     label: `${t({ ko: "로그", en: "Logs", ja: "ログ", zh: "日志" })} (${report?.logs?.length ?? 0})` },
    { id: "subtasks", label: `${t({ ko: "서브태스크", en: "Subtasks", ja: "サブタスク", zh: "子任务" })} (${report?.subtasks?.length ?? 0})` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 0, padding: "0 16px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", flexShrink: 0 }}>
        {RTABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportTab(tab.id)}
            style={{
              padding: "6px 12px",
              fontSize: 10,
              fontFamily: "var(--th-font-mono)",
              fontWeight: reportTab === tab.id ? 600 : 400,
              color: reportTab === tab.id ? "var(--th-accent)" : "var(--th-text-secondary)",
              background: "none",
              border: "none",
              borderBottom: reportTab === tab.id ? "2px solid var(--th-accent)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {reportTab === "result" && <ResultPane report={report} task={task} />}
        {reportTab === "logs" && <LogsPane logs={report?.logs ?? []} />}
        {reportTab === "subtasks" && <SubtasksPane subtasks={report?.subtasks ?? []} />}
      </div>
    </div>
  );
}

export function RunningPreview({ task }: { task: Task }) {
  const { t } = useI18n();
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((v) => v + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  return (
    <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--th-success, #22c55e)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: 12, color: "var(--th-success, #22c55e)", fontWeight: 600 }}>
          {t({ ko: "실행중", en: "Running", ja: "実行中", zh: "运行中" })}
          {task.execution_state && ` — ${task.execution_state.replace(/_/g, " ")}`}
        </span>
      </div>
      {task.description && (
        <div style={{ fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {task.description}
        </div>
      )}
      {task.last_output_at && (
        <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
          {t({ ko: "마지막 출력:", en: "Last output:", ja: "最終出力:", zh: "最后输出:" })} {timeAgo(task.last_output_at)}
        </div>
      )}
      {task.subtask_total != null && task.subtask_total > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6 }}>
            {t({ ko: "서브태스크:", en: "Subtasks:", ja: "サブタスク:", zh: "子任务:" })} {task.subtask_done ?? 0} / {task.subtask_total}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--th-bg-elevated)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              borderRadius: 2,
              background: "var(--th-success, #22c55e)",
              width: `${Math.round(((task.subtask_done ?? 0) / task.subtask_total) * 100)}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function PendingPreview({ task }: { task: Task }) {
  return (
    <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {task.description && (
        <div style={{ fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {task.description}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {task.priority !== undefined && <MetaChip label="Priority" value={String(task.priority)} />}
        {task.task_type && <MetaChip label="Type" value={task.task_type} />}
        {task.timeout_minutes != null && <MetaChip label="Timeout" value={`${task.timeout_minutes}m`} />}
        {task.context_hint && <MetaChip label="Hint" value={task.context_hint} />}
      </div>
      {task.execution_error_summary && (
        <div style={{ padding: "10px 12px", borderRadius: 6, background: "var(--th-danger-bg, rgba(239,68,68,0.08))", border: "1px solid var(--th-danger-border, rgba(239,68,68,0.3))", fontSize: 11, color: "var(--th-danger-text, #f85149)", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ display: "inline-flex", flexShrink: 0, marginTop: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span>{task.execution_error_summary}</span>
        </div>
      )}
    </div>
  );
}
