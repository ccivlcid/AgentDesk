import { useState } from "react";
import { useI18n } from "../../i18n";
import { useTaskStore } from "../../store/taskStore";
import { useUiStore } from "../../store/uiStore";
import type { Task } from "../../types";
import TaskExecutionStateBadge from "./TaskExecutionStateBadge";

const mono = "var(--th-font-mono, monospace)";

function relativeTime(ts: number | null | undefined, t: (s: { ko: string; en: string; ja: string; zh: string }) => string): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return t({ ko: `${diff}초 전`, en: `${diff}s ago`, ja: `${diff}秒前`, zh: `${diff}秒前` });
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return t({ ko: `${m}분 전`, en: `${m}m ago`, ja: `${m}分前`, zh: `${m}分前` });
  }
  const h = Math.floor(diff / 3600);
  return t({ ko: `${h}시간 전`, en: `${h}h ago`, ja: `${h}時間前`, zh: `${h}小时前` });
}

interface Props {
  task: Task | null;
  onOpenTerminal?: () => void;
  isLight: boolean;
}

export default function AgentDetailCurrentTask({ task, onOpenTerminal, isLight }: Props) {
  const { t } = useI18n();
  const { setTaskPanel } = useTaskStore();
  const runtimeStatus = useUiStore((s) => task ? s.runtimeStatuses.get(task.id) : undefined);
  const [showInject, setShowInject] = useState(false);
  const [injectText, setInjectText] = useState("");

  const isRunning = task?.status === "in_progress";

  const sectionBg     = "var(--th-bg-surface)";
  const sectionBorder = "var(--th-border)";
  const labelColor    = "var(--th-text-muted)";
  const emptyColor    = "var(--th-text-muted)";
  const taskTitleColor= "var(--th-text-primary)";
  const taskTimeColor = "var(--th-text-muted)";
  const idleDot       = "var(--th-text-muted)";
  const injectBtnBg   = "var(--th-bg-primary)";
  const injectBtnBdr  = "var(--th-border)";
  const injectBtnClr  = "var(--th-text-secondary)";
  const injectPanelBorder = "var(--th-border)";
  const textareaColor = "var(--th-text-primary)";
  const textareaBg    = "var(--th-bg-elevated)";
  const hintColor     = "var(--th-text-muted)";

  return (
    <div style={{
      borderTop: `1px solid ${sectionBorder}`,
      borderBottom: `1px solid ${sectionBorder}`,
      background: sectionBg,
    }}>
      {/* current task 행 */}
      <div style={{ padding: "12px 18px 10px" }}>
        <div style={{
          fontFamily: mono,
          fontSize: 9,
          color: labelColor,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}>
          current task
        </div>

        {!task ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: emptyColor, fontStyle: "italic" }}>
            {t({ ko: "실행 중인 태스크 없음", en: "No active task", ja: "アクティブなタスクなし", zh: "无活动任务" })}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* 상태 인디케이터 */}
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: isRunning ? "#30d158" : idleDot,
                boxShadow: isRunning ? "0 0 6px #30d158" : "none",
                animation: isRunning ? "pulse 1.5s infinite" : "none",
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: mono, fontSize: 12, fontWeight: 500,
                  color: taskTitleColor,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {task.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <TaskExecutionStateBadge
                    state={task.execution_state}
                    attempt={task.execution_attempt}
                  />
                  {task.started_at && (
                    <span style={{ fontFamily: mono, fontSize: 9, color: taskTimeColor }}>
                      {t({ ko: "시작", en: "started", ja: "開始", zh: "开始" })} {relativeTime(task.started_at, t)}
                    </span>
                  )}
                  {runtimeStatus?.inputTokens != null && (
                    <span style={{
                      fontFamily: mono, fontSize: 9, color: "#5ac8fa",
                      background: "rgba(90,200,250,0.08)", border: "1px solid rgba(90,200,250,0.2)",
                      borderRadius: 3, padding: "1px 5px",
                    }}>
                      {runtimeStatus.inputTokens.toLocaleString()}in / {(runtimeStatus.outputTokens ?? 0).toLocaleString()}out
                      {runtimeStatus.toolCalls ? ` / ${runtimeStatus.toolCalls} tools` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 액션 버튼 행 */}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {/* 로그 보기 */}
              <button
                type="button"
                onClick={onOpenTerminal ?? (() => setTaskPanel({ taskId: task.id, tab: "terminal" }))}
                style={{
                  flex: 1,
                  fontFamily: mono, fontSize: 10,
                  background: "rgba(48,209,88,0.08)",
                  border: "1px solid rgba(48,209,88,0.2)",
                  borderRadius: 8,
                  color: "#30d158",
                  padding: "5px 0",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(48,209,88,0.18)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(48,209,88,0.1)"; }}
              >
                {isRunning && (
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#30d158", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                )}
                {t({ ko: "실시간 로그", en: "Live log", ja: "ライブログ", zh: "实时日志" })}
              </button>

              {/* 프롬프트 주입 토글 */}
              <button
                type="button"
                onClick={() => setShowInject((v) => !v)}
                style={{
                  flex: 1,
                  fontFamily: mono, fontSize: 10,
                  background: showInject ? "rgba(59,130,246,0.1)" : injectBtnBg,
                  border: `1px solid ${showInject ? "rgba(59,130,246,0.3)" : injectBtnBdr}`,
                  borderRadius: 8,
                  color: showInject ? "var(--th-accent)" : injectBtnClr,
                  padding: "5px 0",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = showInject ? "rgba(59,130,246,0.18)" : "var(--th-border)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = showInject ? "rgba(59,130,246,0.1)" : injectBtnBg; }}
              >
                {t({ ko: "프롬프트 주입", en: "Inject prompt", ja: "プロンプト注入", zh: "注入提示" })}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 프롬프트 주입 패널 (토글) */}
      {showInject && task && (
        <div style={{
          padding: "0 18px 12px",
          borderTop: `1px solid ${injectPanelBorder}`,
          paddingTop: 10,
        }}>
          <div style={{
            fontFamily: mono, fontSize: 9,
            color: "rgba(59,130,246,0.6)",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}>
            {t({ ko: "// 작업 중 에이전트에게 새 지시를 주입합니다", en: "// inject new instruction to running agent", ja: "// 実行中エージェントへの指示注入", zh: "// 向运行中代理注入指令" })}
          </div>
          <textarea
            value={injectText}
            onChange={(e) => setInjectText(e.target.value)}
            rows={3}
            placeholder={t({ ko: "예) 지금 방식 말고 테스트를 먼저 실행해", en: "e.g. Run tests first before continuing", ja: "例) 先にテストを実行してください", zh: "例如：先运行测试" })}
            style={{
              width: "100%",
              fontFamily: mono, fontSize: 11,
              background: textareaBg,
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 8,
              color: textareaColor,
              padding: "8px 10px",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 9, color: hintColor }}>
              {t({ ko: "터미널 패널에서 주입 실행 가능", en: "Use Terminal panel for full inject", ja: "ターミナルで詳細設定可能", zh: "在终端面板完整注入" })}
            </span>
            <button
              type="button"
              onClick={() => {
                setTaskPanel({ taskId: task.id, tab: "terminal" });
              }}
              disabled={!injectText.trim()}
              style={{
                fontFamily: mono, fontSize: 10,
                background: injectText.trim() ? "rgba(59,130,246,0.1)" : textareaBg,
                border: `1px solid ${injectText.trim() ? "rgba(59,130,246,0.35)" : "var(--th-border)"}`,
                borderRadius: 8,
                color: injectText.trim() ? "var(--th-accent)" : hintColor,
                padding: "4px 12px",
                cursor: injectText.trim() ? "pointer" : "not-allowed",
              }}
            >
              {t({ ko: "터미널에서 계속 →", en: "Open in terminal →", ja: "ターミナルで続ける →", zh: "在终端继续 →" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
