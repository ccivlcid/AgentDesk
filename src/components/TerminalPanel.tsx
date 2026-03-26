import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { useTheme } from "../ThemeContext";
import AgentAvatar from "./AgentAvatar";
import TrafficLights from "./desktop/TrafficLights";
import { STATUS_BADGES, type TerminalPanelProps } from "./terminal-panel/model";
import { useTerminalPanelData } from "./terminal-panel/useTerminalPanelData";
import { TerminalPanelTabs } from "./terminal-panel/TerminalPanelTabs";
import { TerminalTabContent } from "./terminal-panel/TerminalTabContent";
import { MinutesTabContent } from "./terminal-panel/MinutesTabContent";
import { InterventionSection } from "./terminal-panel/InterventionSection";
import { OpsDetailsSection } from "./terminal-panel/OpsDetailsSection";
import { ProgressHintsStrip } from "./terminal-panel/ProgressHintsStrip";
import { TerminalPanelHeaderActions } from "./terminal-panel/TerminalPanelHeaderActions";
import { fetchTaskPrompt } from "../api/project-kickoff";

const mono = "var(--th-font-mono)";

export default function TerminalPanel({
  taskId,
  task,
  agent,
  agents,
  initialTab = "terminal",
  onClose,
}: TerminalPanelProps) {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isKorean = locale.startsWith("ko");
  const agentName = agent ? (isKorean ? agent.name_ko || agent.name : agent.name || agent.name_ko) : null;

  const data = useTerminalPanelData({ taskId, task, initialTab, onClose });
  const {
    text,
    progressHints,
    thinkingBlocks,
    showThinking,
    setShowThinking,
    meetingMinutes,
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
    activeToolHint,
    hintLineLabel,
    shortPath,
    compactHintText,
    meetingTypeLabel,
    meetingStatusLabel,
    hasAssignedAgent,
    canAttemptInterrupt,
  } = data;

  const badge = STATUS_BADGES[task?.status ?? ""] ?? STATUS_BADGES.inbox;
  const badgeLabel = t(badge.label);
  const isInterventionTarget = task?.status === "in_progress" || task?.status === "pending";
  const canInjectPrompt = task?.status === "pending";

  // ── 드래그 ────────────────────────────────────────────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const defaultPos = useCallback(() => ({
    x: Math.max(20, Math.round((window.innerWidth  - 860) / 2)),
    y: Math.max(52, Math.round((window.innerHeight - 700) / 2)),
  }), []);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest("button,input,textarea,select,a")) return;
    e.preventDefault();
    const p = posRef.current ?? defaultPos();
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: p.x, py: p.y };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.px + me.clientX - dragRef.current.sx,
        y: Math.max(44, dragRef.current.py + me.clientY - dragRef.current.sy),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [defaultPos]);

  const { x: panelX, y: panelY } = pos ?? defaultPos();
  const panelW = Math.min(860, window.innerWidth  - 40);
  const panelH = Math.min(820, window.innerHeight - 100);

  return (
    <>
      <style>{`@keyframes tpOpen{from{opacity:0;transform:scale(0.97) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div
        className="terminal-panel-shell flex flex-col"
        style={{
          position: "fixed",
          left: panelX, top: panelY,
          width: panelW, height: panelH,
          zIndex: 1100,
          background: "var(--th-bg-elevated)",
          border: `1px solid ${isLight ? "rgba(0,0,0,0.12)" : "var(--th-border)"}`,
          borderRadius: 14,
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: isLight
            ? "0 24px 60px rgba(0,0,0,0.14), 0 4px 16px var(--th-glass-shadow)"
            : "0 24px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.25)",
          animation: "tpOpen 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
          {/* ── 헤더 (드래그 핸들) ── */}
          <div
            onMouseDown={onHeaderMouseDown}
            style={{
              borderBottom: `1px solid #E5E7EB`,
              background: isLight ? "rgba(255,255,255,0.85)" : "var(--th-bg-elevated)",
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              flexShrink: 0,
              cursor: "default",
              userSelect: "none",
            }}
          >
            {/* 상단 행: 트래픽라이트 + 아바타 + 제목 + 뱃지 + 액션버튼 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 8px" }}>
              <div style={{ flexShrink: 0 }}>
                <TrafficLights onClose={onClose} />
              </div>

              <div style={{ width: 1, height: 20, background: "var(--th-border)", flexShrink: 0 }} />

              {agent && (
                <div style={{ flexShrink: 0 }}>
                  <AgentAvatar agent={agent} agents={agents} size={26} />
                </div>
              )}

              <h3 style={{
                fontFamily: mono,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--th-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
                margin: 0,
              }}>
                {task?.title ?? taskId}
              </h3>

              <span style={{
                fontFamily: mono,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "2px 8px",
                borderRadius: 20,
                border: "1px solid",
                flexShrink: 0,
              }} className={badge.color}>
                {badgeLabel}
              </span>

              {executionState && executionStateMeta[executionState] &&
                !(executionState === "running" && (task?.status === "done" || task?.status === "cancelled")) &&
                executionState !== "running" && executionState !== "queued" && (
                <span style={{
                  fontFamily: mono, fontSize: 9, fontWeight: 700,
                  padding: "2px 7px", borderRadius: 4, border: "1px solid", flexShrink: 0,
                  ...executionStateMeta[executionState]!.style,
                }}>
                  {executionStateMeta[executionState]!.label}
                </span>
              )}

              <TerminalPanelHeaderActions
                isInterventionTarget={isInterventionTarget}
                interventionOpen={interventionOpen}
                setInterventionOpen={setInterventionOpen}
                setInterventionMessage={setInterventionMessage}
                taskStatus={task?.status}
                showSearchBar={showSearchBar}
                setShowSearchBar={setShowSearchBar}
                follow={follow}
                setFollow={setFollow}
                onCopyLog={handleCopyLog}
                onScrollToBottom={scrollToBottom}
                onClose={onClose}
                tr={tr}
              />
            </div>

            {/* 탭 행 */}
            <div style={{ padding: "0 16px" }}>
              <TerminalPanelTabs activeTab={activeTab} setActiveTab={setActiveTab} tr={tr} />
            </div>
          </div>

          {/* ── 인터벤션 ── */}
          {activeTab === "terminal" && isInterventionTarget && (
            <InterventionSection
              open={interventionOpen}
              prompt={interventionPrompt}
              setPrompt={setInterventionPrompt}
              busy={interventionBusy}
              error={interventionError}
              message={interventionMessage}
              onSend={handleInjectAndResume}
              onClose={() => setInterventionOpen(false)}
              onPauseOnly={handlePauseOnly}
              onResumeOnly={handleResumeOnly}
              canInjectPrompt={canInjectPrompt}
              taskStatus={task?.status}
              hasAssignedAgent={hasAssignedAgent}
              hasSessionToken={Boolean(interruptProof?.session_id)}
              canAttemptInterrupt={canAttemptInterrupt}
              promptInputRef={refs.promptInputRef}
              tr={tr}
            />
          )}

          {/* ── Ops 상세 ── */}
          {activeTab === "terminal" && effectiveExecution && (
            <OpsDetailsSection
              effectiveExecution={effectiveExecution}
              executionEvents={executionEvents}
              opsDetailsOpen={opsDetailsOpen}
              setOpsDetailsOpen={setOpsDetailsOpen}
              hasExecutionIssue={hasExecutionIssue}
              taskLogTimeFormatter={taskLogTimeFormatter}
              formatExecutionTime={formatExecutionTime}
              formatElapsed={formatElapsed}
              tr={tr}
            />
          )}

          {/* ── 프롬프트 탭 ── */}
          {activeTab === "prompt" && <PromptTabContent taskId={taskId} tr={tr} />}

          {/* ── 터미널 탭 ── */}
          {activeTab === "terminal" && (
            <TerminalTabContent
              text={text}
              task={task}
              filteredTaskLogs={filteredTaskLogs}
              logSearch={logSearch}
              setLogSearch={setLogSearch}
              logKindFilter={logKindFilter}
              setLogKindFilter={setLogKindFilter}
              showSearchBar={showSearchBar}
              setShowSearchBar={setShowSearchBar}
              searchMatchCount={searchMatchCount}
              progressHints={progressHints}
              thinkingBlocks={thinkingBlocks}
              showThinking={showThinking}
              shouldShowProgressHints={shouldShowProgressHints}
              taskLogTimeFormatter={taskLogTimeFormatter}
              tr={tr}
              refs={refs}
              handleScroll={handleScroll}
              isLight={isLight}
            />
          )}

          {/* ── 진행 힌트 스트립 ── */}
          {activeTab === "terminal" && shouldShowProgressHints && progressHints && (
            <ProgressHintsStrip
              progressHints={progressHints}
              activeToolHint={activeToolHint}
              shortPath={shortPath}
              compactHintText={compactHintText}
              hintLineLabel={hintLineLabel}
              tr={tr}
              isLight={isLight}
            />
          )}

          {/* ── 푸터 ── */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 16px",
              borderTop: "1px solid #E5E7EB",
              background: isLight ? "rgba(255,255,255,0.7)" : "var(--th-bg-elevated)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
              {agent
                ? `${agentName}${agent.cli_provider ? ` · ${agent.cli_provider}` : ""}`
                : tr("담당 에이전트 없음", "No assigned agent", "担当エージェントなし", "无负责代理")}
            </span>
            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              {task?.status === "in_progress" && (
                <>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#30d158", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  {tr("실행 중", "Running", "実行中", "运行中")}
                </>
              )}
              {task?.status === "done" && (
                <>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#30d158", display: "inline-block" }} />
                  {tr("완료", "Done", "完了", "完成")}
                </>
              )}
              {task?.status === "review" && tr("검토 중", "Review", "レビュー中", "审核中")}
              {task?.status === "cancelled" && tr("취소됨", "Cancelled", "キャンセル済", "已取消")}
            </span>
          </div>
      </div>
    </>
  );
}

/** 프롬프트 탭 — 에이전트에게 전달된 프롬프트 전문 */
function PromptTabContent({ taskId, tr }: { taskId: string; tr: (ko: string, en: string, ja?: string, zh?: string) => string }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTaskPrompt(taskId)
      .then((p) => setPrompt(p))
      .catch(() => setPrompt(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ padding: 20, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
        {tr("로딩 중...", "Loading...", "読み込み中...", "加载中...")}
      </div>
    );
  }

  if (!prompt) {
    return (
      <div style={{ padding: 20, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)", textAlign: "center" }}>
        {tr("프롬프트 없음", "No prompt available", "プロンプトなし", "无提示词")}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(prompt)}
          style={{
            fontFamily: "var(--th-font-mono)", fontSize: 10, padding: "3px 10px",
            border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)",
            color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 4,
          }}
        >
          {tr("복사", "Copy", "コピー", "复制")}
        </button>
      </div>
      <pre style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "var(--th-font-mono)",
        fontSize: 11,
        lineHeight: 1.5,
        color: "var(--th-text-primary)",
        margin: 0,
      }}>
        {prompt}
      </pre>
    </div>
  );
}
