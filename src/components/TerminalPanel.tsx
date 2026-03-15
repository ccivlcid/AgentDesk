import { useI18n } from "../i18n";
import AgentAvatar from "./AgentAvatar";
import { STATUS_BADGES, type TerminalPanelProps } from "./terminal-panel/model";
import { useTerminalPanelData } from "./terminal-panel/useTerminalPanelData";
import { TerminalPanelTabs } from "./terminal-panel/TerminalPanelTabs";
import { TerminalTabContent } from "./terminal-panel/TerminalTabContent";
import { MinutesTabContent } from "./terminal-panel/MinutesTabContent";
import { InterventionSection } from "./terminal-panel/InterventionSection";
import { OpsDetailsSection } from "./terminal-panel/OpsDetailsSection";
import { ProgressHintsStrip } from "./terminal-panel/ProgressHintsStrip";
import { TerminalPanelHeaderActions } from "./terminal-panel/TerminalPanelHeaderActions";

export default function TerminalPanel({
  taskId,
  task,
  agent,
  agents,
  initialTab = "terminal",
  onClose,
}: TerminalPanelProps) {
  const { t, locale } = useI18n();
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

  return (
    <div
      className="terminal-panel-shell fixed inset-0 z-50 flex w-full max-w-full flex-col shadow-2xl lg:inset-y-4 lg:right-4 lg:left-auto lg:w-[560px] lg:max-h-[calc(100vh-2rem)]"
      style={{
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* macOS 스타일 헤더 */}
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", lineHeight: 1, color: "var(--th-text-muted)", padding: "0 2px" }}
        >
          ✕
        </button>
        <div style={{ width: 1, height: 22, background: "var(--th-border)", flexShrink: 0, margin: "0 2px" }} />
      {/* Header content */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {agent && <AgentAvatar agent={agent} agents={agents} size={28} />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold truncate" style={{ color: "var(--th-text-heading)" }}>
                {task?.title ?? taskId}
              </h3>
              <span className={`text-[10px] px-1.5 py-0.5 border font-mono flex-shrink-0 ${badge.color}`} style={{ borderRadius: 0 }}>
                {badgeLabel}
              </span>
            </div>
            {logPath && (
              <div className="text-[10px] truncate font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
                {logPath}
              </div>
            )}
            {effectiveExecution && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {executionState && executionStateMeta[executionState] && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-mono border"
                    style={{ borderRadius: 0, ...executionStateMeta[executionState]!.style }}
                  >
                    {executionStateMeta[executionState]!.label}
                  </span>
                )}
                <span
                  className="px-1.5 py-0.5 text-[10px] font-mono border"
                  style={{ borderRadius: 0, borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}
                  title={tr("실행 시도 횟수", "Execution attempts", "実行回数", "执行次数")}
                >
                  {`try ${effectiveExecution.execution_attempt ?? 0}`}
                </span>
                <span
                  className="px-1.5 py-0.5 text-[10px] font-mono border"
                  style={{ borderRadius: 0, borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}
                  title={`${tr("마지막 heartbeat", "Last heartbeat", "最終 heartbeat", "最近 heartbeat")}: ${formatExecutionTime(effectiveExecution.last_heartbeat_at)}`}
                >
                  {`hb ${formatElapsed(effectiveExecution.last_heartbeat_at)}`}
                </span>
                <span
                  className="px-1.5 py-0.5 text-[10px] font-mono border"
                  style={{ borderRadius: 0, borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}
                  title={`${tr("마지막 출력", "Last output", "最終出力", "最近输出")}: ${formatExecutionTime(effectiveExecution.last_output_at)}`}
                >
                  {`out ${formatElapsed(effectiveExecution.last_output_at)}`}
                </span>
              </div>
            )}
            <div className="mt-1">
              <TerminalPanelTabs activeTab={activeTab} setActiveTab={setActiveTab} tr={tr} />
            </div>
          </div>
        </div>

        <TerminalPanelHeaderActions
          hasThinking={thinkingBlocks.length > 0}
          showThinking={showThinking}
          setShowThinking={setShowThinking}
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
          onDownloadLog={handleDownloadLog}
          onScrollToBottom={scrollToBottom}
          onClose={onClose}
          tr={tr}
        />
      </div>

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
        />
      )}

      {activeTab === "minutes" && (
        <MinutesTabContent
          meetingMinutes={meetingMinutes}
          task={task}
          tr={tr}
          meetingTypeLabel={meetingTypeLabel}
          meetingStatusLabel={meetingStatusLabel}
          locale={locale}
        />
      )}

      {activeTab === "terminal" && shouldShowProgressHints && progressHints && (
        <ProgressHintsStrip
          progressHints={progressHints}
          activeToolHint={activeToolHint}
          shortPath={shortPath}
          compactHintText={compactHintText}
          hintLineLabel={hintLineLabel}
          tr={tr}
        />
      )}

      <div
        className="terminal-panel-footer flex items-center justify-between border-t px-4 py-1.5 text-[10px]"
        style={{ color: "var(--th-text-muted)" }}
      >
        <span>
          {agent ? `${agentName}` : tr("담당 에이전트 없음", "No agent", "担当エージェントなし", "无负责人")}
          {agent?.cli_provider ? ` (${agent.cli_provider})` : ""}
        </span>
        <span>
          {task?.status === "in_progress" && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 animate-pulse" style={{ borderRadius: "50%", background: "var(--th-accent)" }} />
              {activeTab === "terminal" ? tr("실시간", "Live", "ライブ", "实时") : tr("회의록", "Minutes", "会議録", "会议纪要")}
            </span>
          )}
          {task?.status === "review" && tr("검토 중", "Under review", "レビュー中", "审核中")}
          {task?.status === "done" && tr("완료됨", "Completed", "完了", "已完成")}
        </span>
      </div>
    </div>
  );
}
