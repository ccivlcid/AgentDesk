import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, Agent, TaskExecutionEvent, TaskLog } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getTaskExecutionEvents, getTask } from "../../../api/organization-projects";
import { getTaskReportDetail } from "../../../api/providers-reports-github";
import type { TaskReportDetail } from "../../../api/providers-reports-github";
import { getTaskDiff } from "../../../api/workflow-skills-subtasks";
import type { TaskDiffResult } from "../../../api/workflow-skills-subtasks";
import { useUiStore } from "../../../store/uiStore";

const mono = "var(--th-font-mono)";

interface TimelineTabProps {
  tasks: Task[];
  agents: Agent[];
}

export default function TimelineTab({ tasks, agents }: TimelineTabProps) {
  const kickoffStage = useUiStore((s) => s.kickoffStage);
  const activeTasks = tasks.filter((t) => ["in_progress", "review", "planned", "done"].includes(t.status));

  // Group tasks by assigned agent
  const agentLanes = new Map<string, { agent: Agent; tasks: Task[] }>();
  for (const task of activeTasks) {
    if (!task.assigned_agent_id) continue;
    const agent = agents.find((a) => a.id === task.assigned_agent_id);
    if (!agent) continue;
    if (!agentLanes.has(agent.id)) {
      agentLanes.set(agent.id, { agent, tasks: [] });
    }
    agentLanes.get(agent.id)!.tasks.push(task);
  }

  const clusterStatus = tasks.every((t) => t.status === "done") ? "ALL_COMPLETE"
    : tasks.some((t) => t.execution_state === "failed" || t.status === "failed") ? "HAS_FAILURES"
    : tasks.some((t) => t.status === "in_progress") ? "EXECUTING"
    : tasks.every((t) => t.status === "planned" || t.status === "inbox") ? "READY"
    : "CLUSTER_STABLE";

  const clusterColor = clusterStatus === "ALL_COMPLETE" ? "var(--th-success)"
    : clusterStatus === "HAS_FAILURES" ? "var(--th-danger-text)"
    : clusterStatus === "EXECUTING" ? "var(--th-accent)"
    : "var(--th-text-secondary)";

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (agentLanes.size === 0) {
    const isKickoffActive = kickoffStage && kickoffStage !== "idle";
    const stageLabel = kickoffStage === "meeting" ? "킥오프 회의 진행 중..."
      : kickoffStage === "planning" ? "태스크 계획 중..."
      : kickoffStage === "assigning" ? "에이전트 배정 중..."
      : kickoffStage === "executing" ? "실행 시작..."
      : null;

    return (
      <div style={{ padding: 48, fontFamily: mono, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {isKickoffActive ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--th-accent)",
                boxShadow: "0 0 0 0 var(--th-accent)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--th-accent)", letterSpacing: "0.05em" }}>
                {stageLabel ?? "오케스트레이션 진행 중..."}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--th-text-muted)" }}>
              회의가 끝나면 태스크가 여기에 표시됩니다.
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: "var(--th-text-muted)" }}>
            활성 에이전트가 없습니다. 킥오프를 시작하세요.
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ padding: 6, background: "var(--th-accent-glow)", borderRadius: 10, color: "var(--th-accent)", display: "flex", alignItems: "center" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--th-text-primary)", fontFamily: mono, margin: 0 }}>
            에이전트 실행 현황
          </h3>
        </div>
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 800,
          color: clusterColor,
          background: `${clusterColor}12`,
          border: `1px solid ${clusterColor}30`,
          borderRadius: 8,
          padding: "3px 10px",
          letterSpacing: "0.05em",
        }}>
          {clusterStatus === "ALL_COMPLETE" ? "전체 완료"
            : clusterStatus === "HAS_FAILURES" ? "오류 발생"
            : clusterStatus === "EXECUTING" ? "실행 중"
            : clusterStatus === "READY" ? "준비 완료"
            : "안정"}
        </span>
      </div>

      {[...agentLanes.values()].map(({ agent, tasks: agentTasks }) => (
        <AgentLane key={agent.id} agent={agent} tasks={agentTasks} selectedTaskId={selectedTaskId} onSelectTask={setSelectedTaskId} />
      ))}
    </div>
  );
}

function AgentLane({ agent, tasks, selectedTaskId, onSelectTask }: {
  agent: Agent;
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}) {
  const currentTask = tasks.find((t) => t.status === "in_progress") ?? tasks[0];
  const nextTask = tasks.find((t) => t.status === "planned");

  const isWorking = agent.status === "working";
  const statusLabel = isWorking ? "실행 중" : agent.status === "idle" ? "대기" : agent.status;

  const handleTaskClick = useCallback((taskId: string) => {
    onSelectTask(selectedTaskId === taskId ? null : taskId);
  }, [selectedTaskId, onSelectTask]);

  return (
    <div style={{
      border: "1px solid var(--th-border)",
      background: "var(--th-bg-elevated)",
      borderRadius: 20,
      padding: "16px 20px",
      transition: "all 0.2s",
    }}>
      {/* Agent header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isWorking ? "var(--th-success)" : "var(--th-border-strong)",
            boxShadow: isWorking ? "0 0 8px var(--th-green-glow)" : "none",
          }} />
          <span style={{
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 800,
            color: "var(--th-text-primary)",
            letterSpacing: "0.05em",
          }}>
            {agent.name.toUpperCase().replace(/\s+/g, "_")}
          </span>
          <span style={{
            fontFamily: mono,
            fontSize: 10,
            color: "var(--th-text-muted)",
          }}>
            ID: {agent.id.substring(0, 8).toUpperCase()}
          </span>
        </div>
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 800,
          color: isWorking ? "var(--th-success)" : "var(--th-text-muted)",
          background: isWorking ? "var(--th-success-bg)" : "var(--th-bg-surface)",
          border: `1px solid ${isWorking ? "var(--th-success-border)" : "var(--th-border)"}`,
          borderRadius: 8,
          padding: "3px 10px",
          letterSpacing: "0.05em",
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Current task */}
      {currentTask && (
        <TaskCard
          task={currentTask}
          label="현재 태스크"
          isSelected={selectedTaskId === currentTask.id}
          onClick={() => handleTaskClick(currentTask.id)}
        />
      )}

      {/* Selected task inspector */}
      {currentTask && selectedTaskId === currentTask.id && (
        <TaskInspector taskId={currentTask.id} />
      )}

      {/* Next task */}
      {nextTask && (
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-muted)",
            paddingLeft: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            marginTop: 4,
          }}
          onClick={() => handleTaskClick(nextTask.id)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>
          다음: {nextTask.title}
        </div>
      )}

      {/* Inspector for next task */}
      {nextTask && selectedTaskId === nextTask.id && (
        <TaskInspector taskId={nextTask.id} />
      )}
    </div>
  );
}

function TaskCard({ task, label, isSelected, onClick }: {
  task: Task;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const progress = getTaskProgress(task);
  const statusLabel = task.status === "in_progress" ? "실행 중" : task.status === "done" ? "완료" : task.status === "review" ? "검토 중" : task.status === "planned" ? "대기" : task.status;

  return (
    <div
      style={{
        background: isSelected ? "var(--th-info-bg)" : "var(--th-bg-surface)",
        border: `1px solid ${isSelected ? "var(--th-accent-border)" : "var(--th-border)"}`,
        borderRadius: 14,
        padding: "12px 16px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)", fontWeight: 800, letterSpacing: "0.05em" }}>
          {label} #{task.id.substring(0, 4)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--th-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
          <span style={{
            fontFamily: mono, fontSize: 10, fontWeight: 700,
            color: statusLabel === "실행 중" ? "var(--th-success)" : statusLabel === "완료" ? "var(--th-success)" : statusLabel === "검토 중" ? "var(--th-review)" : "var(--th-text-secondary)",
            background: statusLabel === "실행 중" ? "var(--th-success-bg)" : statusLabel === "완료" ? "var(--th-success-bg)" : statusLabel === "검토 중" ? "var(--th-review-bg)" : "var(--th-bg-primary)",
            borderRadius: 6,
            padding: "1px 6px",
          }}>
            {statusLabel}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)", fontWeight: 600, marginBottom: 10 }}>
        {task.title}
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, background: "var(--th-border)", width: "100%", borderRadius: 2 }}>
        <div style={{
          height: 4,
          background: progress >= 100 ? "var(--th-success)" : "var(--th-accent)",
          width: `${progress}%`,
          transition: "width 0.3s",
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function TaskInspector({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskExecutionEvent[]>([]);
  const [report, setReport] = useState<TaskReportDetail | null>(null);
  const [diffResult, setDiffResult] = useState<TaskDiffResult | null>(null);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"files" | "cli" | "logic" | "events">("files");
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      getTaskExecutionEvents(taskId, 10),
      getTaskReportDetail(taskId).catch(() => null),
      getTaskDiff(taskId).catch(() => null),
      getTask(taskId).catch(() => null),
    ]).then(([eventsResult, reportResult, diffRes, taskRes]) => {
      if (cancelled) return;
      if (eventsResult.status === "fulfilled") setEvents(eventsResult.value.events);
      if (reportResult.status === "fulfilled" && reportResult.value) setReport(reportResult.value);
      if (diffRes.status === "fulfilled" && diffRes.value) setDiffResult(diffRes.value as TaskDiffResult);
      if (taskRes.status === "fulfilled" && taskRes.value) {
        setTaskLogs(taskRes.value.logs ?? []);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [taskId]);

  // Live refresh for CLI tab — poll every 3s while the CLI tab is active
  useEffect(() => {
    if (activeSection !== "cli") {
      if (refreshTimerRef.current) { clearInterval(refreshTimerRef.current); refreshTimerRef.current = null; }
      return;
    }
    const refresh = () => {
      getTask(taskId)
        .then((res) => { setTaskLogs(res.logs ?? []); })
        .catch(() => { /* polling failure is non-critical */ });
    };
    refreshTimerRef.current = setInterval(refresh, 3_000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [taskId, activeSection]);

  if (loading) {
    return (
      <div style={{ padding: "12px 16px", fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
        <svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--th-accent)" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        로딩 중...
      </div>
    );
  }

  const pmEvents = events.filter((e) =>
    e.event_type === "pm_review" || e.event_type === "state_change"
    || e.event_type === "pm_approved" || e.event_type === "pm_revision_requested"
    || e.event_type === "pm_parse_failed" || e.event_type === "pm_escalated"
    || e.event_type === "pm_reassigned" || e.event_type === "pm_retry"
  );
  const planningContent = report?.planning_summary?.content;
  const fileChanges = parseDiffStat(diffResult?.stat);
  const cliLogs = taskLogs.filter((l) => l.kind === "cli_output" || l.kind === "system").slice(-50);
  const orchestrationLogs = taskLogs.filter((l) => l.kind === "pm_oversight");

  const hasAnyData = fileChanges.length > 0 || cliLogs.length > 0 || orchestrationLogs.length > 0
    || pmEvents.length > 0 || !!planningContent;

  if (!hasAnyData) {
    return (
      <div style={{ padding: "12px 16px", fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", marginBottom: 6 }}>
        실행 데이터 없음
      </div>
    );
  }

  const tabs: { key: typeof activeSection; label: string; count: number }[] = [
    { key: "files", label: "파일", count: fileChanges.length },
    { key: "cli", label: "CLI", count: cliLogs.length },
    { key: "logic", label: "PM 판단", count: orchestrationLogs.length },
    { key: "events", label: "이벤트", count: pmEvents.length },
  ];

  return (
    <div style={{
      border: "1px solid var(--th-border)",
      borderRadius: 14,
      background: "var(--th-bg-elevated)",
      marginBottom: 8,
      overflow: "hidden",
    }}>
      {/* Section tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: "8px 12px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-surface)",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              padding: "5px 12px",
              fontFamily: mono,
              fontSize: 10,
              fontWeight: activeSection === tab.key ? 800 : 600,
              letterSpacing: "0.05em",
              color: activeSection === tab.key ? "var(--th-accent)" : "var(--th-text-muted)",
              background: activeSection === tab.key ? "var(--th-bg-elevated)" : "transparent",
              border: activeSection === tab.key ? "1px solid var(--th-border)" : "1px solid transparent",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label} {tab.count > 0 && <span style={{ color: "var(--th-accent)", opacity: 0.7 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="custom-scrollbar" style={{ padding: "12px 16px", maxHeight: 300, overflowY: "auto" }}>
        {activeSection === "files" && (
          <FilesChangedSection files={fileChanges} />
        )}
        {activeSection === "cli" && (
          <CliHistorySection logs={cliLogs} />
        )}
        {activeSection === "logic" && (
          <OrchestrationLogicSection logs={orchestrationLogs} planningContent={planningContent} />
        )}
        {activeSection === "events" && (
          <EventsSection events={pmEvents} />
        )}
      </div>
    </div>
  );
}

/* -- FILES CHANGED section -- */

interface DiffFileStat {
  path: string;
  added: number;
  removed: number;
  isNew: boolean;
}

function parseDiffStat(stat: string | undefined | null): DiffFileStat[] {
  if (!stat) return [];
  const lines = stat.split("\n").filter((l) => l.includes("|"));
  return lines.map((line) => {
    // Match: " src/file.ts | 5 ++---" or " src/file.ts | Bin 0 -> 123 bytes"
    const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]*)/);
    if (!match) return null;
    const filePath = match[1].trim();
    const totalChanges = parseInt(match[2], 10) || 0;
    const symbols = match[3] ?? "";
    const plusCount = symbols.split("").filter((c) => c === "+").length;
    const minusCount = symbols.split("").filter((c) => c === "-").length;
    // If no +/- symbols shown (e.g., new file or git --stat truncation), use total as added
    const added = plusCount || (!minusCount ? totalChanges : 0);
    const removed = minusCount;
    return {
      path: filePath,
      added,
      removed,
      isNew: removed === 0 && added > 0,
    };
  }).filter((x): x is DiffFileStat => x !== null);
}

function FilesChangedSection({ files }: { files: DiffFileStat[] }) {
  if (files.length === 0) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>변경된 파일 없음</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "var(--th-text-primary)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        변경된 파일
      </div>
      {files.map((f) => (
        <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontFamily: mono, fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", color: f.isNew ? "var(--th-success)" : "var(--th-accent)", flexShrink: 0 }}>
            {f.isNew ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="5" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>
            )}
          </span>
          <span style={{ color: "var(--th-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {f.path}
          </span>
          <span style={{ color: "var(--th-success)", flexShrink: 0, fontWeight: 600 }}>+{f.added}</span>
          <span style={{ color: "var(--th-danger-text)", flexShrink: 0, fontWeight: 600 }}>-{f.removed}</span>
        </div>
      ))}
    </div>
  );
}

/* -- CLI HISTORY section -- */

function CliHistorySection({ logs }: { logs: TaskLog[] }) {
  if (logs.length === 0) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>CLI 출력 없음</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "var(--th-text-primary)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        CLI 히스토리
      </div>
      {logs.map((log) => {
        const ts = new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const isCmd = log.message.startsWith("$") || log.message.startsWith(">");
        return (
          <div key={log.id} style={{ padding: "3px 0", fontFamily: mono, fontSize: 11, display: "flex", gap: 8 }}>
            <span style={{ color: "var(--th-text-muted)", flexShrink: 0, width: 56 }}>{ts}</span>
            <span style={{
              color: isCmd ? "var(--th-accent)" : "var(--th-text-secondary)",
              fontWeight: isCmd ? 700 : 400,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              flex: 1,
            }}>
              {log.message.length > 200 ? `${log.message.slice(0, 197)}...` : log.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* -- ORCHESTRATION LOGIC section -- */

function OrchestrationLogicSection({ logs, planningContent }: { logs: TaskLog[]; planningContent?: string | null }) {
  const hasContent = logs.length > 0 || !!planningContent;
  if (!hasContent) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>PM 판단 데이터 없음</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "var(--th-text-primary)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        PM 판단 내역
      </div>

      {/* PM oversight logs */}
      {logs.map((log) => {
        const ts = new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return (
          <div key={log.id} style={{
            padding: "6px 12px",
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-secondary)",
            borderLeft: "3px solid var(--th-accent)",
            background: "var(--th-info-bg)",
            borderRadius: "0 8px 8px 0",
            marginBottom: 6,
          }}>
            <span style={{ color: "var(--th-text-muted)", marginRight: 8, fontSize: 10 }}>{ts}</span>
            {log.message.length > 300 ? `${log.message.slice(0, 297)}...` : log.message}
          </div>
        );
      })}

      {/* Planning summary */}
      {planningContent && (
        <div style={{
          marginTop: logs.length > 0 ? 8 : 0,
          fontFamily: mono,
          fontSize: 11,
          color: "var(--th-text-secondary)",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          borderLeft: "3px solid var(--th-success)",
          background: "var(--th-success-bg)",
          borderRadius: "0 8px 8px 0",
          padding: "8px 12px",
        }}>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "var(--th-success)", marginBottom: 4, letterSpacing: "0.1em" }}>
            기획 요약
          </div>
          {planningContent.length > 500 ? `${planningContent.slice(0, 497)}...` : planningContent}
        </div>
      )}
    </div>
  );
}

/* -- EVENTS section -- */

function EventsSection({ events }: { events: TaskExecutionEvent[] }) {
  if (events.length === 0) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>기록된 이벤트 없음</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "var(--th-text-primary)", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" as const }}>
        이벤트 ({events.length})
      </div>
      {events.map((evt) => (
        <ExecutionEventRow key={evt.id} event={evt} />
      ))}
    </div>
  );
}

function ExecutionEventRow({ event }: { event: TaskExecutionEvent }) {
  const meta = event.metadata_json ? tryParseJson(event.metadata_json) : null;
  const decision = meta?.action ?? meta?.decision ?? event.event_type;
  const isPmDecision = event.event_type.startsWith("pm_");
  const decisionColor = decision === "APPROVE" || decision === "approve" || event.event_type === "pm_approved"
    ? "var(--th-success)"
    : decision === "REVISE" || decision === "revise" || event.event_type === "pm_revision_requested"
      ? "var(--th-warning)"
      : event.event_type === "pm_escalated" || event.event_type === "pm_parse_failed"
        ? "var(--th-danger-text)"
        : "var(--th-text-secondary)";

  const ts = new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Extract PM checklist from metadata if present
  const checklist = meta?.checklist as { scopeMatch?: boolean; errorsDetected?: boolean; minimalScope?: boolean; completeness?: boolean } | undefined;

  return (
    <div style={{ padding: "6px 0", fontFamily: mono, fontSize: 11, borderBottom: isPmDecision ? "1px solid var(--th-border)" : "none", marginBottom: isPmDecision ? 4 : 0 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--th-text-muted)", flexShrink: 0, width: 42 }}>{ts}</span>
        {isPmDecision && (
          <span style={{ fontSize: 9, fontWeight: 800, color: "var(--th-accent)", letterSpacing: "0.05em" }}>PM</span>
        )}
        {event.from_state && event.to_state ? (
          <span style={{ color: "var(--th-text-secondary)" }}>
            {event.from_state}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 4px", verticalAlign: "middle" }}>
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
            {event.to_state}
          </span>
        ) : (
          <span style={{
            color: decisionColor,
            fontWeight: 800,
            fontSize: 10,
            background: `${decisionColor}15`,
            borderRadius: 6,
            padding: "1px 6px",
          }}>
            {String(decision).toUpperCase()}
          </span>
        )}
        {event.summary && (
          <span style={{ color: "var(--th-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.summary.length > 100 ? `${event.summary.slice(0, 97)}...` : event.summary}
          </span>
        )}
      </div>

      {/* PM Checklist (shown for pm_approved / pm_revision_requested) */}
      {checklist && (
        <div style={{ display: "flex", gap: 10, marginTop: 4, marginLeft: 50, fontSize: 9, fontWeight: 700 }}>
          <CheckItem label="SCOPE" pass={checklist.scopeMatch ?? true} />
          <CheckItem label="ERRORS" pass={!checklist.errorsDetected} />
          <CheckItem label="MINIMAL" pass={checklist.minimalScope ?? true} />
          <CheckItem label="COMPLETE" pass={checklist.completeness ?? true} />
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pass ? "var(--th-success)" : "var(--th-danger-text)"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {pass
          ? <polyline points="20 6 9 17 4 12" />
          : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
        }
      </svg>
      <span style={{ color: pass ? "var(--th-success)" : "var(--th-danger-text)" }}>{label}</span>
    </span>
  );
}

function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
