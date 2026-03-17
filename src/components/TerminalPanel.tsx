import { motion, AnimatePresence } from "framer-motion";
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

  const backdropColor = isLight ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.55)";

  return (
    <AnimatePresence>
      <>
        {/* ── 백드롭 ── */}
        <motion.div
          key="tp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "linear" }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 1099,
            background: backdropColor,
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        />

        {/* ── 패널 (중앙) ── */}
        {/* 중앙 정렬 래퍼 — Framer Motion transform과 분리 */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
        <motion.div
          key="tp-panel"
          className="terminal-panel-shell flex flex-col"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "min(860px, 94vw)",
            height: "min(88vh, 820px)",
            background: "var(--th-bg-elevated)",
            border: `1px solid ${isLight ? "rgba(0,0,0,0.12)" : "var(--th-border)"}`,
            borderRadius: 14,
            overflow: "hidden",
            pointerEvents: "auto",
            boxShadow: isLight
              ? "0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)"
              : "0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {/* ── 헤더 ── */}
          <div
            style={{
              borderBottom: `1px solid var(--th-border)`,
              background: isLight ? "rgba(255,255,255,0.85)" : "var(--th-bg-panel)",
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              flexShrink: 0,
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
                color: "var(--th-text-heading)",
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

          {/* ── 회의록 탭 ── */}
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
              borderTop: "1px solid var(--th-border)",
              background: isLight ? "rgba(255,255,255,0.7)" : "var(--th-bg-panel)",
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
        </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
}
