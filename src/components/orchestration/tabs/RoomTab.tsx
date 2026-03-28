import { useState, useEffect, useRef, useCallback } from "react";
import type { Task, Agent, Project, TaskExecutionEvent } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getProjectTeamBoard, getTaskExecutionEvents, updateProject, type TeamBoardEntry } from "../../../api/organization-projects";
import { kickoffProject } from "../../../api/project-kickoff";
import { useUiStore } from "../../../store/uiStore";
import { useProjectStore } from "../../../store/projectStore";

const mono = "var(--th-font-mono)";

interface RoomTabProps {
  tasks: Task[];
  agents: Agent[];
  project: Project | null;
  projectId?: string;
}

type PmEventWithTask = TaskExecutionEvent & { _taskId: string };

// Unified chat item for chronological feed
interface ChatItem {
  id: string;
  type: "board" | "pm_event" | "task_status" | "user_directive" | "clarification";
  sender: string;
  senderRole: "pm" | "agent" | "system" | "user";
  content: string;
  subject?: string;
  timestamp: number;
  taskTitle?: string;
  eventType?: string;
}

export default function RoomTab({ tasks, agents, project, projectId }: RoomTabProps) {
  const activeTasks = tasks.filter((t) => ["in_progress", "review", "planned"].includes(t.status));
  const doneTasks = tasks.filter((t) => t.status === "done");

  const meetingMinutesSeq = useUiStore((s) => s.meetingMinutesSeq);
  const [boardEntries, setBoardEntries] = useState<TeamBoardEntry[]>([]);
  const [pmEvents, setPmEvents] = useState<PmEventWithTask[]>([]);

  const pendingClarification = useProjectStore((s) => s.pendingClarification);
  const clarificationBusy = useProjectStore((s) => s.clarificationBusy);
  const [answerText, setAnswerText] = useState("");
  const [directiveText, setDirectiveText] = useState("");
  const [directiveBusy, setDirectiveBusy] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const showClarification = pendingClarification && pendingClarification.projectId === projectId;
  const taskReviewSignal = tasks.filter((t) => t.status === "done" || t.status === "review").length;

  const pmAgent = agents.find((a) => a.role === "team_leader");

  useEffect(() => {
    if (!projectId) { setBoardEntries([]); return; }
    getProjectTeamBoard(projectId)
      .then((res) => setBoardEntries(res.entries ?? []))
      .catch(() => setBoardEntries([]));
  }, [projectId, meetingMinutesSeq]);

  useEffect(() => {
    if (tasks.length === 0) { setPmEvents([]); return; }
    const fetchPmEvents = async () => {
      const allEvents: PmEventWithTask[] = [];
      for (const task of tasks) {
        try {
          const res = await getTaskExecutionEvents(task.id, 20);
          const pm = res.events.filter((e) =>
            e.event_type === "pm_approved" || e.event_type === "pm_revision_requested"
            || e.event_type === "pm_escalated" || e.event_type === "pm_retry"
            || e.event_type === "pm_reassigned" || e.event_type === "pm_parse_failed"
          ).map((e) => ({ ...e, _taskId: task.id }));
          allEvents.push(...pm);
        } catch { /* non-critical */ }
      }
      allEvents.sort((a, b) => a.created_at - b.created_at);
      setPmEvents(allEvents);
    };
    void fetchPmEvents();
  }, [tasks.length, taskReviewSignal]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [boardEntries.length, pmEvents.length, showClarification]);

  const handleSubmitClarification = useCallback(() => {
    if (!pendingClarification || !answerText.trim() || clarificationBusy) return;
    const { projectId: pId, clarificationId: cId } = pendingClarification;
    useProjectStore.getState().setClarificationBusy(true);
    useUiStore.getState().setKickoffBusy(true);
    kickoffProject(pId, answerText.trim(), undefined, cId)
      .then(() => { useProjectStore.getState().setPendingClarification(null); setAnswerText(""); })
      .catch(() => {})
      .finally(() => { useProjectStore.getState().setClarificationBusy(false); useUiStore.getState().setKickoffBusy(false); });
  }, [pendingClarification, answerText, clarificationBusy]);

  const handleSendDirective = useCallback(async () => {
    if (!projectId || !directiveText.trim() || directiveBusy) return;
    setDirectiveBusy(true);
    try {
      await updateProject(projectId, { directive: directiveText.trim() });
      setBoardEntries((prev) => [...prev, {
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        sender: "USER",
        target: "PM",
        subject: "지시 사항",
        body: directiveText.trim(),
      }]);
      setDirectiveText("");
    } catch { /* best effort */ }
    setDirectiveBusy(false);
  }, [projectId, directiveText, directiveBusy]);

  // Build unified chronological chat feed
  const chatItems: ChatItem[] = [];

  for (let i = 0; i < boardEntries.length; i++) {
    const e = boardEntries[i];
    const isUser = e.sender.toUpperCase() === "USER";
    const isPM = !isUser && (e.sender.toLowerCase().includes("pm") || agents.some((a) => a.role === "team_leader" && a.name.toLowerCase() === e.sender.toLowerCase()));
    chatItems.push({
      id: `board-${i}`,
      type: "board",
      sender: e.sender,
      senderRole: isUser ? "user" : isPM ? "pm" : "agent",
      content: e.body,
      subject: e.subject,
      timestamp: new Date(e.timestamp.replace(" ", "T")).getTime() || Date.now() - (boardEntries.length - i) * 60000,
    });
  }

  for (const evt of pmEvents) {
    const task = tasks.find((t) => t.id === evt._taskId);
    chatItems.push({
      id: `pm-${evt.id}`,
      type: "pm_event",
      sender: pmAgent?.name ?? "PM",
      senderRole: "pm",
      content: evt.summary ?? evt.event_type,
      taskTitle: task?.title,
      eventType: evt.event_type,
      timestamp: evt.created_at,
    });
  }

  chatItems.sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", gap: 16 }}>
      {/* Left: Chat Feed */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-primary)",
        border: "1px solid var(--th-border)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        {/* Chat header */}
        <div style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--th-bg-elevated)",
        }}>
          <div style={{ padding: 4, background: "var(--th-accent-glow)", borderRadius: 8, color: "var(--th-accent)", display: "flex", alignItems: "center" }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={{ color: "var(--th-text-primary)", fontWeight: 800, fontSize: 12 }}>
            {project?.name ?? "Team Room"}
          </span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--th-success)" }} />
          <div style={{ flex: 1 }} />
          <span style={{ color: "var(--th-text-muted)", fontSize: 10, fontWeight: 600 }}>
            {agents.length}명 참여
          </span>
        </div>

        {/* Chat messages */}
        <div ref={feedRef} className="custom-scrollbar" style={{
          flex: 1, overflow: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {chatItems.length === 0 && !showClarification && (
            <div style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 40 }}>
              킥오프를 시작하면 팀 대화가 여기에 표시됩니다.
            </div>
          )}

          {chatItems.map((item) => (
            <ChatBubble key={item.id} item={item} agents={agents} />
          ))}

          {/* Active tasks as status messages */}
          {chatItems.length === 0 && activeTasks.map((task) => {
            const agent = agents.find((a) => a.id === task.assigned_agent_id);
            return (
              <ChatBubble key={`task-${task.id}`} item={{
                id: `task-${task.id}`,
                type: "task_status",
                sender: agent?.name ?? "System",
                senderRole: "agent",
                content: `${task.title}${task.status === "in_progress" ? ` (${getTaskProgress(task)}%)` : ""}`,
                subject: task.status === "review" ? "검토 중" : "진행 중",
                timestamp: Date.now(),
              }} agents={agents} />
            );
          })}

          {/* Clarification */}
          {showClarification && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ChatBubble item={{
                id: "clarification",
                type: "clarification",
                sender: pmAgent?.name ?? "PM",
                senderRole: "pm",
                content: pendingClarification.question,
                subject: "확인 필요",
                timestamp: Date.now(),
              }} agents={agents} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 44 }}>
                <input
                  type="text"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && answerText.trim() && !clarificationBusy) handleSubmitClarification(); }}
                  placeholder="답변을 입력하세요..."
                  disabled={clarificationBusy}
                  style={{
                    flex: 1, fontFamily: mono, fontSize: 11,
                    padding: "8px 14px", borderRadius: 18,
                    border: "1px solid var(--th-border)",
                    background: "var(--th-bg-elevated)", color: "var(--th-text-primary)",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  disabled={!answerText.trim() || clarificationBusy}
                  onClick={handleSubmitClarification}
                  style={{
                    padding: "7px 16px", borderRadius: 18, border: "none",
                    fontFamily: mono, fontSize: 10, fontWeight: 700,
                    background: answerText.trim() && !clarificationBusy ? "var(--th-accent)" : "var(--th-bg-surface)",
                    color: answerText.trim() && !clarificationBusy ? "var(--th-bg-primary)" : "var(--th-text-muted)",
                    cursor: answerText.trim() && !clarificationBusy ? "pointer" : "not-allowed",
                  }}
                >
                  {clarificationBusy ? "전송 중..." : "전송"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-elevated)",
        }}>
          <input
            type="text"
            value={directiveText}
            onChange={(e) => setDirectiveText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && directiveText.trim() && !directiveBusy) void handleSendDirective(); }}
            placeholder="PM에게 지시하기... (우선순위, 방향, 피드백)"
            disabled={directiveBusy || !projectId}
            style={{
              flex: 1,
              padding: "9px 16px",
              borderRadius: 20,
              border: "1px solid var(--th-border)",
              background: "var(--th-bg-surface)",
              outline: "none",
              fontFamily: mono,
              fontSize: 11,
              color: "var(--th-text-primary)",
            }}
          />
          <button
            type="button"
            disabled={!directiveText.trim() || directiveBusy}
            onClick={() => void handleSendDirective()}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              border: "none",
              background: directiveText.trim() && !directiveBusy ? "var(--th-accent)" : "var(--th-bg-surface)",
              color: directiveText.trim() && !directiveBusy ? "var(--th-bg-primary)" : "var(--th-text-muted)",
              cursor: directiveText.trim() && !directiveBusy ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right: Project Status */}
      <div className="custom-scrollbar" style={{
        width: 280,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        flexShrink: 0,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 16,
      }}>
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--th-bg-surface)",
        }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--th-accent)" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span style={{ color: "var(--th-text-primary)", fontWeight: 800 }}>
            프로젝트 현황
          </span>
        </div>

        <div style={{ padding: 16 }}>
          {/* Project info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
              borderRadius: 14, padding: "12px 16px",
            }}>
              <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 800, color: "var(--th-text-primary)" }}>
                {project?.name ?? "프로젝트 없음"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 600 }}>
                  {activeTasks.length > 0 ? "진행 중" : "대기"}
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)", fontWeight: 700 }}>
                  {tasks.length > 0 ? `${Math.round((doneTasks.length / tasks.length) * 100)}%` : "0%"}
                </span>
              </div>
              {tasks.length > 0 && (
                <div style={{ height: 4, background: "var(--th-border)", width: "100%", marginTop: 6, borderRadius: 2 }}>
                  <div style={{ height: 4, background: "var(--th-accent)", width: `${Math.round((doneTasks.length / tasks.length) * 100)}%`, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              )}
            </div>
          </div>

          {/* Task tree */}
          <CollapsibleTaskTree tasks={tasks} agents={agents} />

          {/* Dependencies */}
          <ActiveDependencies tasks={tasks} />
        </div>
      </div>
    </div>
  );
}

/* -- Chat Bubble (KakaoTalk style) -- */

const PM_EVENT_COLORS: Record<string, { bg: string; text: string }> = {
  pm_approved: { bg: "var(--th-success-bg)", text: "var(--th-success)" },
  pm_revision_requested: { bg: "var(--th-warning-bg)", text: "var(--th-warning)" },
  pm_escalated: { bg: "var(--th-danger-bg)", text: "var(--th-danger-text)" },
  pm_retry: { bg: "var(--th-warning-bg)", text: "var(--th-warning)" },
  pm_reassigned: { bg: "var(--th-accent-glow)", text: "var(--th-accent)" },
  pm_parse_failed: { bg: "var(--th-danger-bg)", text: "var(--th-danger-text)" },
};

const PM_EVENT_LABELS: Record<string, string> = {
  pm_approved: "승인",
  pm_revision_requested: "수정 요청",
  pm_escalated: "에스컬레이션",
  pm_retry: "재시도",
  pm_reassigned: "재배정",
  pm_parse_failed: "파싱 실패",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(role: string): string {
  if (role === "pm") return "var(--th-accent)";
  if (role === "user") return "var(--th-success)";
  return "var(--th-review)";
}

function ChatBubble({ item, agents }: { item: ChatItem; agents: Agent[] }) {
  const isUser = item.senderRole === "user";
  const isPM = item.senderRole === "pm";
  const ts = new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const pmEventColor = item.eventType ? PM_EVENT_COLORS[item.eventType] : null;
  const pmEventLabel = item.eventType ? PM_EVENT_LABELS[item.eventType] : null;

  // User messages: right aligned, accent color
  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "flex-end" }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0, marginBottom: 2 }}>{ts}</span>
        <div style={{
          maxWidth: "70%",
          background: "var(--th-accent)",
          color: "var(--th-accent-text)",
          borderRadius: "16px 16px 4px 16px",
          padding: "10px 14px",
          fontFamily: mono,
          fontSize: 12,
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}>
          {item.subject && (
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>{item.subject}</div>
          )}
          {item.content}
        </div>
      </div>
    );
  }

  // Agent/PM/System messages: left aligned with avatar
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: getAvatarColor(item.senderRole),
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontSize: 11, fontWeight: 800, color: "var(--th-bg-primary)",
        fontFamily: mono,
      }}>
        {getInitials(item.sender)}
      </div>

      <div style={{ maxWidth: "75%", minWidth: 0 }}>
        {/* Name + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{
            fontFamily: mono, fontSize: 10, fontWeight: 700,
            color: isPM ? "var(--th-accent)" : "var(--th-text-primary)",
          }}>
            {item.sender}
          </span>
          {isPM && (
            <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 800, color: "var(--th-accent)", background: "var(--th-accent-glow)", padding: "1px 5px", borderRadius: 4 }}>PM</span>
          )}
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>{ts}</span>
        </div>

        {/* Bubble */}
        <div style={{
          background: pmEventColor ? pmEventColor.bg : "var(--th-bg-elevated)",
          border: `1px solid ${pmEventColor ? pmEventColor.text + "20" : "var(--th-border)"}`,
          borderRadius: "4px 16px 16px 16px",
          padding: "10px 14px",
          fontFamily: mono,
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--th-text-primary)",
          wordBreak: "break-word",
        }}>
          {/* PM event badge */}
          {pmEventLabel && (
            <div style={{
              display: "inline-block",
              fontSize: 9, fontWeight: 800,
              color: pmEventColor?.text ?? "var(--th-text-muted)",
              background: pmEventColor?.text ? pmEventColor.text + "15" : "transparent",
              padding: "2px 8px", borderRadius: 6,
              marginBottom: 6,
            }}>
              {pmEventLabel}
            </div>
          )}

          {/* Task reference */}
          {item.taskTitle && (
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 600 }}>
              {item.taskTitle}
            </div>
          )}

          {/* Subject line */}
          {item.subject && !pmEventLabel && (
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--th-text-secondary)", marginBottom: 4 }}>
              {item.subject}
            </div>
          )}

          <div style={{ whiteSpace: "pre-wrap" }}>
            {item.content.length > 400 ? `${item.content.slice(0, 397)}...` : item.content}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Collapsible task tree -- */

const INITIAL_SHOW_COUNT = 6;

function CollapsibleTaskTree({ tasks, agents }: { tasks: Task[]; agents: Agent[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleTasks = expanded ? tasks : tasks.slice(0, INITIAL_SHOW_COUNT);
  const hiddenCount = tasks.length - INITIAL_SHOW_COUNT;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>
        태스크 ({tasks.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visibleTasks.map((task) => (
          <StepTreeNode key={task.id} task={task} agents={agents} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 8, fontFamily: mono, fontSize: 10, fontWeight: 600,
            color: "var(--th-accent)", background: "transparent", border: "none",
            cursor: "pointer", padding: 0,
          }}
        >
          {expanded ? "접기" : `+${hiddenCount}개 더 보기...`}
        </button>
      )}
    </div>
  );
}

/* -- Step progress tree node -- */

function StepTreeNode({ task, agents }: { task: Task; agents: Agent[] }) {
  const isDone = task.status === "done";
  const isRunning = task.status === "in_progress";
  const isReview = task.status === "review";
  const isFailed = task.status === "failed" || task.execution_state === "failed";
  const agent = agents.find((a) => a.id === task.assigned_agent_id);

  const color = isDone ? "var(--th-success)"
    : isFailed ? "var(--th-danger-text)"
    : isReview ? "var(--th-review)"
    : isRunning ? "var(--th-accent)"
    : "var(--th-border-strong)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color, width: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isDone ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : isFailed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : isRunning ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" /></svg>
          )}
        </span>
        <span style={{
          fontFamily: mono, fontSize: 11, flex: 1,
          color: isDone ? "var(--th-text-muted)" : "var(--th-text-primary)",
          fontWeight: isRunning ? 600 : 400,
          textDecoration: isDone ? "line-through" : "none",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {task.title.length > 28 ? task.title.substring(0, 28) + "..." : task.title}
        </span>
      </div>
      {isRunning && (
        <div style={{ marginLeft: 22, marginTop: 4 }}>
          {agent && <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", fontWeight: 600 }}>{agent.name}</span>}
          <div style={{ height: 3, background: "var(--th-border)", width: "80%", marginTop: 4, borderRadius: 2 }}>
            <div style={{ height: 3, background: "var(--th-accent)", width: `${getTaskProgress(task)}%`, transition: "width 0.3s", borderRadius: 2 }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Active Dependencies -- */

interface Dependency {
  name: string;
  type: string;
  status: "READY" | "CONFLICT" | "LOCKED" | "WAITING";
}

function ActiveDependencies({ tasks }: { tasks: Task[] }) {
  const deps: Dependency[] = [];
  const blockedTasks = tasks.filter((t) => t.execution_state === "blocked" || t.status === "failed");
  const reviewTasks = tasks.filter((t) => t.status === "review");
  const runningTasks = tasks.filter((t) => t.status === "in_progress");

  if (blockedTasks.length > 0) {
    for (const t of blockedTasks.slice(0, 2)) {
      deps.push({ name: t.title.slice(0, 20), type: "태스크", status: t.status === "failed" ? "CONFLICT" : "LOCKED" });
    }
  }
  if (reviewTasks.length > 0) deps.push({ name: `${reviewTasks.length}건 검토`, type: "PM", status: "WAITING" });
  if (runningTasks.length > 0) deps.push({ name: `${runningTasks.length}건 실행`, type: "실행", status: "READY" });

  if (deps.length === 0) return null;

  const statusColors: Record<string, { text: string; bg: string; border: string }> = {
    READY: { text: "var(--th-success)", bg: "var(--th-success-bg)", border: "var(--th-success-border)" },
    CONFLICT: { text: "var(--th-danger-text)", bg: "var(--th-danger-bg)", border: "var(--th-danger-border)" },
    LOCKED: { text: "var(--th-warning)", bg: "var(--th-warning-bg)", border: "var(--th-warning-border)" },
    WAITING: { text: "var(--th-review)", bg: "var(--th-review-bg)", border: "var(--th-review-bg)" },
  };

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>
        의존성
      </div>
      <div style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", borderRadius: 14, padding: "10px 14px" }}>
        {deps.map((dep, i) => {
          const sc = statusColors[dep.status] ?? { text: "var(--th-text-muted)", bg: "var(--th-bg-surface)", border: "var(--th-border)" };
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontFamily: mono, fontSize: 10 }}>
              <span style={{ color: "var(--th-text-secondary)" }}>
                <span style={{ color: "var(--th-text-muted)", marginRight: 4, fontWeight: 600 }}>{dep.type}:</span>
                {dep.name}
              </span>
              <span style={{ color: sc.text, fontWeight: 800, fontSize: 9, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 6, padding: "1px 6px" }}>
                {dep.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
