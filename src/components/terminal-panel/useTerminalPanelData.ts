import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Task, MeetingMinute, TaskExecutionEvent, TaskExecutionState, TaskExecutionSummary } from "../../types";
import * as api from "../../api";
import type { TerminalProgressHint, TerminalProgressHintsPayload, TerminalThinkingBlock } from "../../api";
import { useI18n } from "../../i18n";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
  TERMINAL_TASK_LOG_LIMIT,
  TERMINAL_TAIL_LINES,
  type TaskLogEntry,
} from "./model";

export interface UseTerminalPanelDataParams {
  taskId: string;
  task: Task | undefined;
  initialTab?: "terminal" | "prompt";
  onClose: () => void;
}

export interface UseTerminalPanelDataRefs {
  preRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  promptInputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useTerminalPanelData({
  taskId,
  task,
  initialTab = "terminal",
  onClose,
}: UseTerminalPanelDataParams) {
  const [text, setText] = useState("");
  const [taskLogs, setTaskLogs] = useState<TaskLogEntry[]>([]);
  const [progressHints, setProgressHints] = useState<TerminalProgressHintsPayload | null>(null);
  const [thinkingBlocks, setThinkingBlocks] = useState<TerminalThinkingBlock[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>([]);
  const [execution, setExecution] = useState<TaskExecutionSummary | null>(null);
  const [executionEvents, setExecutionEvents] = useState<TaskExecutionEvent[]>([]);
  const [logPath, setLogPath] = useState("");
  const [follow, setFollow] = useState(true);
  const [opsDetailsOpen, setOpsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"terminal" | "prompt">(initialTab);
  const [logSearch, setLogSearch] = useState("");
  const [logKindFilter, setLogKindFilter] = useState<"all" | "system" | "error">("all");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [interventionPrompt, setInterventionPrompt] = useState("");
  const [interventionBusy, setInterventionBusy] = useState(false);
  const [interventionError, setInterventionError] = useState<string | null>(null);
  const [interventionMessage, setInterventionMessage] = useState<string | null>(null);
  const [interruptProof, setInterruptProof] = useState<{
    session_id: string;
    control_token: string;
    requires_csrf: boolean;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const preRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const { t, locale } = useI18n();
  const tr = useCallback((ko: string, en: string, ja = en, zh = en) => t({ ko, en, ja, zh }), [t]);

  // Subscribe to cli_output for this task when the panel is open.
  // The server only forwards cli_output to clients that have subscribed to the taskId.
  const { send: wsSend, on: wsOn } = useWebSocket();
  useEffect(() => {
    wsSend({ type: "subscribe_task", taskId });
    return () => {
      wsSend({ type: "unsubscribe_task", taskId });
    };
  }, [taskId, wsSend]);


  const taskLogTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [locale],
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, taskId]);

  useEffect(() => {
    setInterventionOpen(false);
    setInterventionPrompt("");
    setInterventionBusy(false);
    setInterventionError(null);
    setInterventionMessage(null);
  }, [taskId]);

  const fetchTerminal = useCallback(async () => {
    try {
      const res = await api.getTerminal(taskId, TERMINAL_TAIL_LINES, false, TERMINAL_TASK_LOG_LIMIT);
      if (res.ok) {
        setLogPath(res.path);
        if (res.task_logs) {
          setTaskLogs((prev) => {
            const next = res.task_logs ?? [];
            const prevLast = prev.length > 0 ? prev[prev.length - 1].id : null;
            const nextLast = next.length > 0 ? next[next.length - 1].id : null;
            if (prev.length === next.length && prevLast === nextLast) return prev;
            return next;
          });
        }
        setProgressHints(res.progress_hints ?? null);
        setThinkingBlocks((prev) => {
          const next = res.thinking_blocks ?? [];
          if (prev.length === next.length && prev.every((b, i) => b.text === next[i].text)) return prev;
          return next;
        });
        setInterruptProof(res.interrupt ?? null);
        if (res.exists) {
          const nextText = res.text ?? "";
          setText((prev) => (prev === nextText ? prev : nextText));
        } else {
          setText((prev) => (prev === "" ? prev : ""));
        }
      }
    } catch {
      // ignore
    }
  }, [taskId]);

  const fetchMeetingMinutes = useCallback(async () => {
    try {
      const rows = await api.getTaskMeetingMinutes(taskId, task?.project_id ?? undefined);
      setMeetingMinutes(rows);
    } catch {
      // ignore
    }
  }, [taskId, task?.project_id]);

  const fetchExecution = useCallback(async () => {
    try {
      const [executionRes, eventsRes] = await Promise.all([
        api.getTaskExecution(taskId),
        api.getTaskExecutionEvents(taskId, 8),
      ]);
      setExecution(executionRes.execution);
      setExecutionEvents(eventsRes.events);
    } catch {
      // ignore
    }
  }, [taskId]);

  // 패널 오픈 시(또는 taskId 변경 시) 회의록 1회 선행 로드
  // → "Minutes" 탭 전환 즉시 데이터가 준비되어 탭이 바로 보임
  useEffect(() => {
    void fetchMeetingMinutes();
  }, [fetchMeetingMinutes]);

  // 회의록 업데이트 WS 이벤트 수신 시 즉시 refresh (폴링 대기 없이)
  useEffect(() => {
    return wsOn("meeting_minutes_update", (payload: unknown) => {
      const p = payload as { task_id?: string } | null;
      if (!p?.task_id || p.task_id === taskId) {
        void fetchMeetingMinutes();
      }
    });
  }, [wsOn, taskId, fetchMeetingMinutes]);

  useEffect(() => {
    const fn = activeTab === "terminal" ? fetchTerminal : fetchMeetingMinutes;
    const ms = activeTab === "terminal" ? 1500 : 2500;
    fn();
    let timer: ReturnType<typeof setInterval>;
    function start() {
      timer = setInterval(fn, ms);
    }
    function handleVisibility() {
      clearInterval(timer);
      if (!document.hidden) {
        fn();
        start();
      }
    }
    start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeTab, fetchTerminal, fetchMeetingMinutes]);

  useEffect(() => {
    void fetchExecution();
    const timer = setInterval(() => void fetchExecution(), 5000);
    return () => clearInterval(timer);
  }, [fetchExecution]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // Ctrl+F / Cmd+F — 검색창 열기
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBar(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (follow && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text, follow]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!atBottom && follow) setFollow(false);
  }, [follow]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setFollow(true);
    }
  }, []);

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  useEffect(() => {
    if (!interventionOpen) return;
    setTimeout(() => promptInputRef.current?.focus(), 40);
  }, [interventionOpen]);

  useEffect(() => {
    if (showSearchBar) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [showSearchBar]);

  const hasAssignedAgent = Boolean(task?.assigned_agent_id);
  const hasInterruptProof = Boolean(interruptProof?.session_id && interruptProof?.control_token);
  const canAttemptInterrupt = hasAssignedAgent || hasInterruptProof;

  const fetchInterruptProofNow = useCallback(async () => {
    const latest = await api.getTerminal(taskId, TERMINAL_TAIL_LINES, true, TERMINAL_TASK_LOG_LIMIT);
    if (!latest.ok) return null;
    setInterruptProof(latest.interrupt ?? null);
    return latest.interrupt ?? null;
  }, [taskId]);

  const fetchInterruptProofWithRetry = useCallback(async (maxAttempts = 4): Promise<{
    session_id: string;
    control_token: string;
    requires_csrf: boolean;
  } | null> => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const proof = await fetchInterruptProofNow();
      if (proof?.session_id && proof.control_token) return proof;
      if (attempt < maxAttempts - 1) {
        await sleep(180 * (attempt + 1));
      }
    }
    return null;
  }, [fetchInterruptProofNow]);

  const handlePauseOnly = useCallback(async () => {
    try {
      setInterventionBusy(true);
      setInterventionError(null);
      setInterventionMessage(null);
      const pauseResult = await api.pauseTask(taskId);
      if (pauseResult.interrupt?.session_id && pauseResult.interrupt.control_token) {
        setInterruptProof(pauseResult.interrupt);
      }
      await fetchTerminal();
      setInterventionMessage(
        tr(
          "작업을 보류 상태로 전환했습니다. 프롬프트를 주입한 뒤 재개해 주세요.",
          "Task paused. Inject a prompt and resume.",
          "タスクを保留にしました。プロンプト注入後に再開してください。",
          "任务已暂停。请注入提示后恢复。",
        ),
      );
    } catch (error) {
      setInterventionError(
        error instanceof Error
          ? error.message
          : tr(
              "일시중지 요청에 실패했습니다.",
              "Pause request failed.",
              "一時停止リクエストに失敗しました。",
              "暂停请求失败。",
            ),
      );
    } finally {
      setInterventionBusy(false);
    }
  }, [taskId, fetchTerminal, tr]);

  const handleInjectAndResume = useCallback(async () => {
    const prompt = interventionPrompt.trim();
    if (!prompt) {
      setInterventionError(
        tr(
          "주입할 프롬프트를 입력해 주세요.",
          "Please enter a prompt to inject.",
          "注入するプロンプトを入力してください。",
          "请输入要注入的提示。",
        ),
      );
      return;
    }

    try {
      setInterventionBusy(true);
      setInterventionError(null);
      setInterventionMessage(null);

      let proof = interruptProof;
      if (task?.status === "in_progress") {
        const pauseResult = await api.pauseTask(taskId);
        if (pauseResult.interrupt?.session_id && pauseResult.interrupt.control_token) {
          proof = pauseResult.interrupt;
          setInterruptProof(pauseResult.interrupt);
        }
        if (!proof?.session_id || !proof.control_token) {
          proof = await fetchInterruptProofWithRetry(4);
        }
      } else if (task?.status === "pending") {
        const pauseResult = await api.pauseTask(taskId);
        if (pauseResult.interrupt?.session_id && pauseResult.interrupt.control_token) {
          proof = pauseResult.interrupt;
          setInterruptProof(pauseResult.interrupt);
        }
        if (!proof?.session_id || !proof.control_token) {
          proof = await fetchInterruptProofWithRetry(3);
        }
      }

      if (!proof?.session_id || !proof.control_token) {
        if (!hasAssignedAgent) {
          throw new Error(
            tr(
              "담당 에이전트가 배정되지 않아 난입 세션을 만들 수 없습니다. 먼저 에이전트를 배정해 주세요.",
              "Cannot create an interrupt session because no agent is assigned. Assign an agent first.",
              "担当エージェントが未割り当てのため、割り込みセッションを作成できません。先にエージェントを割り当ててください。",
              "由于未分配执行代理，无法创建中断会话。请先分配代理。",
            ),
          );
        }
        throw new Error(
          tr(
            "난입 세션 토큰이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.",
            "Interrupt session token is not ready yet. Please retry shortly.",
            "割り込みセッショントークンはまだ準備できていません。しばらくしてから再試行してください。",
            "中断会话令牌尚未就绪，请稍后重试。",
          ),
        );
      }

      await api.injectTaskPrompt(taskId, {
        session_id: proof.session_id,
        interrupt_token: proof.control_token,
        prompt,
      });
      await api.resumeTask(taskId);
      setInterventionPrompt("");
      await fetchTerminal();
      setInterventionMessage(
        tr(
          "난입 프롬프트를 주입하고 재개를 요청했습니다.",
          "Prompt injected and resume requested.",
          "プロンプトを注入し、再開をリクエストしました。",
          "已注入提示并请求恢复。",
        ),
      );
    } catch (error) {
      setInterventionError(
        error instanceof Error
          ? error.message
          : tr(
              "난입 실행에 실패했습니다.",
              "Interrupt inject failed.",
              "割り込み注入に失敗しました。",
              "中断注入失败。",
            ),
      );
    } finally {
      setInterventionBusy(false);
    }
  }, [
    taskId,
    task?.status,
    interventionPrompt,
    interruptProof,
    hasAssignedAgent,
    fetchTerminal,
    tr,
    fetchInterruptProofWithRetry,
  ]);

  const handleResumeOnly = useCallback(async () => {
    try {
      setInterventionBusy(true);
      setInterventionError(null);
      setInterventionMessage(null);
      await api.resumeTask(taskId);
      await fetchTerminal();
      setInterventionMessage(
        tr("재개 요청을 전송했습니다.", "Resume requested.", "再開をリクエストしました。", "已请求恢复。"),
      );
    } catch (error) {
      setInterventionError(
        error instanceof Error
          ? error.message
          : tr(
              "재개 요청에 실패했습니다.",
              "Resume request failed.",
              "再開リクエストに失敗しました。",
              "恢复请求失败。",
            ),
      );
    } finally {
      setInterventionBusy(false);
    }
  }, [taskId, fetchTerminal, tr]);

  const effectiveExecution = execution ?? (task
    ? {
        id: task.id,
        status: task.status,
        execution_state: task.execution_state,
        execution_attempt: task.execution_attempt,
        claimed_by: task.claimed_by,
        claim_expires_at: task.claim_expires_at,
        last_heartbeat_at: task.last_heartbeat_at,
        last_output_at: task.last_output_at,
        retry_after: task.retry_after,
        execution_error_code: task.execution_error_code,
        execution_error_summary: task.execution_error_summary,
        resolved_workflow_contract_hash: task.resolved_workflow_contract_hash,
        started_at: task.started_at,
        completed_at: task.completed_at,
        updated_at: task.updated_at,
      }
    : null);

  const executionState = effectiveExecution?.execution_state;
  const hasExecutionIssue =
    executionState === "stalled" ||
    executionState === "failed" ||
    executionState === "blocked" ||
    Boolean(effectiveExecution?.execution_error_summary);

  useEffect(() => {
    setOpsDetailsOpen(hasExecutionIssue);
  }, [taskId, hasExecutionIssue]);

  const meetingTypeLabel = useCallback(
    (type: "planned" | "review") =>
      type === "planned"
        ? tr("Planned 승인", "Planned Approval", "Planned 承認", "Planned 审批")
        : tr("Review 승인", "Review Approval", "Review 承認", "Review 审批"),
    [tr],
  );

  const meetingStatusLabel = useCallback(
    (status: MeetingMinute["status"]) => {
      if (status === "completed") return tr("완료", "Completed", "完了", "已完成");
      if (status === "revision_requested") return tr("보완 요청", "Revision Requested", "修正要請", "要求修订");
      if (status === "failed") return tr("실패", "Failed", "失敗", "失败");
      return tr("진행중", "In Progress", "進行中", "进行中");
    },
    [tr],
  );

  const compactHintText = useCallback((value: string, max = 90) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max - 1).trimEnd()}…`;
  }, []);

  const shortPath = useCallback((value: string) => {
    const normalized = value.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    return parts.length === 0 ? value : parts[parts.length - 1];
  }, []);

  const hintLineLabel = useCallback(
    (hint: TerminalProgressHint) => {
      const summary = compactHintText(hint.summary, 100);
      if (hint.phase === "ok") {
        return tr(
          `... ${hint.tool} 확인 완료: ${summary}`,
          `... ${hint.tool} checked: ${summary}`,
          `... ${hint.tool} 確認完了: ${summary}`,
          `... ${hint.tool} 已确认: ${summary}`,
        );
      }
      if (hint.phase === "error") {
        return tr(
          `... ${hint.tool} 재확인 중: ${summary}`,
          `... ${hint.tool} retry/check: ${summary}`,
          `... ${hint.tool} 再確認中: ${summary}`,
          `... ${hint.tool} 重试/检查: ${summary}`,
        );
      }
      return tr(
        `... ${hint.tool} 진행 중: ${summary}`,
        `... ${hint.tool} in progress: ${summary}`,
        `... ${hint.tool} 実行中: ${summary}`,
        `... ${hint.tool} 进行中: ${summary}`,
      );
    },
    [compactHintText, tr],
  );

  const filteredTaskLogs = useMemo(() => {
    if (logKindFilter === "all") return taskLogs;
    return taskLogs.filter((log) => log.kind === logKindFilter);
  }, [taskLogs, logKindFilter]);

  const searchMatchCount = useMemo(() => {
    if (!logSearch) return 0;
    const needle = logSearch.toLowerCase();
    let count = 0;
    if (text) {
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.toLowerCase().includes(needle)) count++;
      }
    }
    return count;
  }, [text, logSearch]);

  const handleCopyLog = useCallback(() => {
    const content = text || "";
    navigator.clipboard.writeText(content).catch(() => {});
  }, [text]);

  const handleDownloadLog = useCallback(() => {
    const content = text || "";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminal-${taskId}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [text, taskId]);

  const isTaskActive = task?.status === "in_progress";
  const shouldShowProgressHints = activeTab === "terminal" && isTaskActive && Boolean(progressHints && progressHints.hints.length > 0);
  const latestHint =
    shouldShowProgressHints && progressHints && progressHints.hints.length > 0
      ? progressHints.hints[progressHints.hints.length - 1]
      : null;
  const activeToolHint =
    shouldShowProgressHints && progressHints
      ? ([...progressHints.hints].reverse().find((hint) => hint.phase === "use") ?? latestHint)
      : null;

  const executionStateMeta: Partial<Record<TaskExecutionState, { label: string; style: React.CSSProperties }>> = useMemo(
    () => ({
      queued: { label: "QUEUED", style: { background: "rgba(6,182,212,0.12)", color: "#67e8f9", borderColor: "rgba(6,182,212,0.28)" } },
      running: { label: "RUNNING", style: { background: "rgba(34,197,94,0.12)", color: "#86efac", borderColor: "rgba(34,197,94,0.28)" } },
      awaiting_review: { label: "AWAITING REVIEW", style: { background: "rgba(167,139,250,0.12)", color: "#c4b5fd", borderColor: "rgba(167,139,250,0.28)" } },
      blocked: { label: "BLOCKED", style: { background: "rgba(251,191,36,0.12)", color: "#fcd34d", borderColor: "rgba(251,191,36,0.28)" } },
      stalled: { label: "STALLED", style: { background: "rgba(244,63,94,0.12)", color: "#fda4af", borderColor: "rgba(244,63,94,0.28)" } },
      succeeded: { label: "SUCCEEDED", style: { background: "rgba(34,197,94,0.12)", color: "#86efac", borderColor: "rgba(34,197,94,0.28)" } },
      failed: { label: "FAILED", style: { background: "rgba(244,63,94,0.12)", color: "#fda4af", borderColor: "rgba(244,63,94,0.28)" } },
      cancelled: { label: "CANCELLED", style: { background: "rgba(110,118,129,0.18)", color: "#d1d5db", borderColor: "rgba(110,118,129,0.28)" } },
    }),
    [],
  );

  const formatExecutionTime = useCallback(
    (value?: number | null) => {
      if (!value) return tr("없음", "none", "なし", "无");
      return new Date(value).toLocaleString(locale, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },
    [locale, tr],
  );

  const formatElapsed = useCallback(
    (value?: number | null) => {
      if (!value) return tr("없음", "none", "なし", "无");
      const diffMs = Date.now() - value;
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      if (diffSec < 60) return `${diffSec}s`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
      return `${Math.floor(diffSec / 86400)}d`;
    },
    [tr],
  );

  const refs: UseTerminalPanelDataRefs = useMemo(
    () => ({
      preRef,
      containerRef,
      searchInputRef,
      promptInputRef,
    }),
    [],
  );

  return {
    text,
    taskLogs,
    progressHints,
    thinkingBlocks,
    showThinking,
    setShowThinking,
    meetingMinutes,
    execution,
    executionEvents,
    logPath,
    follow,
    setFollow,
    opsDetailsOpen,
    setOpsDetailsOpen,
    activeTab,
    setActiveTab,
    logSearch,
    setLogSearch,
    logKindFilter,
    setLogKindFilter,
    showSearchBar,
    setShowSearchBar,
    interventionOpen,
    setInterventionOpen,
    interventionPrompt,
    setInterventionPrompt,
    interventionBusy,
    interventionError,
    interventionMessage,
    setInterventionMessage,
    interruptProof,
    refs,
    taskLogTimeFormatter,
    tr,
    handleScroll,
    scrollToBottom,
    handleCopyLog,
    handleDownloadLog,
    handlePauseOnly,
    handleInjectAndResume,
    handleResumeOnly,
    effectiveExecution,
    executionState,
    hasExecutionIssue,
    executionStateMeta,
    formatExecutionTime,
    formatElapsed,
    filteredTaskLogs,
    searchMatchCount,
    shouldShowProgressHints,
    latestHint,
    activeToolHint,
    hintLineLabel,
    shortPath,
    compactHintText,
    meetingTypeLabel,
    meetingStatusLabel,
    hasAssignedAgent,
    canAttemptInterrupt,
  };
}
