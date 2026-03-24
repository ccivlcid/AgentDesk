import { useMemo, useState } from "react";
import type { I18nContextValue } from "../../../i18n";
import type { Agent, ProviderModelConfig, Task } from "../../../types";
import { cliCompleteTask } from "../../../api/organization-projects";
import { CLI_BASE } from "./constants";
import { buildCliCmd } from "./cliCommands";
import { getFreeModeComparisonRows } from "./freeModeComparisonRows";

interface CliWindowBottomBarProps {
  t: I18nContextValue["t"];
  filteredAgents: Agent[];
  providerModelConfig: Record<string, ProviderModelConfig>;
  dropdownAgentId: string;
  setDropdownAgentId: (id: string) => void;
  dropdownAgent: Agent | undefined;
  activeAgent: Agent | undefined;
  dotColor: string;
  activeTask: Task | null;
  completeBusy: boolean;
  setCompleteBusy: (v: boolean) => void;
  onOpenNewWindow: () => void;
}

export function CliWindowBottomBar({
  t,
  filteredAgents,
  providerModelConfig,
  dropdownAgentId,
  setDropdownAgentId,
  dropdownAgent,
  activeAgent,
  dotColor,
  activeTask,
  completeBusy,
  setCompleteBusy,
  onOpenNewWindow,
}: CliWindowBottomBarProps) {
  const [showFreeModeTip, setShowFreeModeTip] = useState(false);
  const comparisonRows = useMemo(() => getFreeModeComparisonRows(t), [t]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 12px",
        borderTop: "1px solid var(--th-border)",
        background: "var(--th-bg-secondary)",
        flexShrink: 0,
        minHeight: 38,
      }}
    >
      {activeAgent && (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, transition: "background 0.2s" }} />
      )}

      <select
        value={dropdownAgentId}
        onChange={(e) => setDropdownAgentId(e.target.value)}
        style={{
          background: "var(--th-bg-primary)",
          color: "var(--th-text-primary)",
          border: "1px solid var(--th-border)",
          borderRadius: 5,
          padding: "3px 8px",
          fontSize: 12,
          fontFamily: "var(--th-font-mono)",
          cursor: "pointer",
          outline: "none",
          minWidth: 180,
        }}
      >
        {filteredAgents.length === 0 ? (
          <option value="">{t({ ko: "에이전트 없음", en: "No agents", ja: "エージェントなし", zh: "无代理" })}</option>
        ) : (
          filteredAgents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.avatar_emoji} {agent.name}
              {CLI_BASE[agent.cli_provider] ? ` · ${buildCliCmd(agent.cli_provider, providerModelConfig[agent.cli_provider])}` : ""}
            </option>
          ))
        )}
      </select>

      <button
        onClick={onOpenNewWindow}
        disabled={!dropdownAgent}
        title={dropdownAgent
          ? t({ ko: `${dropdownAgent.name} 새 터미널 창 열기`, en: `Open new terminal for ${dropdownAgent.name}`, ja: `${dropdownAgent.name} 新しいターミナルを開く`, zh: `为${dropdownAgent.name}打开新终端` })
          : t({ ko: "에이전트 없음", en: "No agent", ja: "エージェントなし", zh: "无代理" })
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 10px",
          borderRadius: 5,
          border: "1px solid var(--th-border)",
          background: "transparent",
          color: dropdownAgent ? "var(--th-accent)" : "var(--th-text-muted)",
          fontSize: 12,
          fontFamily: "var(--th-font-mono)",
          cursor: dropdownAgent ? "pointer" : "default",
          opacity: dropdownAgent ? 1 : 0.4,
          whiteSpace: "nowrap",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>{" "}{t({ ko: "새 창", en: "New Window", ja: "新窓", zh: "新窗" })}
      </button>

      {activeTask && (
        <button
          onClick={() => {
            if (completeBusy) return;
            setCompleteBusy(true);
            cliCompleteTask(activeTask.id, 0)
              .catch(() => {/* ignore */})
              .finally(() => setCompleteBusy(false));
          }}
          disabled={completeBusy}
          title={t({ ko: "CLI 작업 완료 신호 전송", en: "Signal task complete", ja: "タスク完了を通知", zh: "发送任务完成信号" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 10px",
            borderRadius: 5,
            border: "1px solid var(--th-accent)",
            background: completeBusy ? "var(--th-bg-elevated)" : "rgba(245,158,11,0.1)",
            color: "var(--th-accent)",
            fontSize: 12,
            fontFamily: "var(--th-font-mono)",
            cursor: completeBusy ? "default" : "pointer",
            opacity: completeBusy ? 0.6 : 1,
            whiteSpace: "nowrap",
            fontWeight: 700,
          }}
        >
          {completeBusy
            ? t({ ko: "처리 중...", en: "...", ja: "...", zh: "..." })
            : t({ ko: "✓ 완료", en: "✓ Done", ja: "✓ 完了", zh: "✓ 完成" })}
        </button>
      )}

      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        {activeTask ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--th-font-mono)", fontSize: 11,
            color: "#4ade80",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 6px rgba(74,222,128,0.6)",
              flexShrink: 0,
            }} />
            <span style={{
              maxWidth: 200, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: "var(--th-text-secondary)",
              letterSpacing: "0.01em",
            }}>
              {activeTask.title}
            </span>
          </div>
        ) : (
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setShowFreeModeTip(true)}
            onMouseLeave={() => setShowFreeModeTip(false)}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: "var(--th-font-mono)", fontSize: 11,
              color: "var(--th-text-muted)",
              cursor: "default",
              userSelect: "none",
              opacity: 0.55,
              letterSpacing: "0.02em",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                border: "1px solid currentColor",
                flexShrink: 0,
              }} />
              <span>{t({ ko: "자유 모드", en: "untracked", ja: "フリー", zh: "未追踪" })}</span>
            </div>

            {showFreeModeTip && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 10px)", right: 0,
                width: 260, zIndex: 999,
                background: "var(--th-bg-elevated)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                boxShadow: "0 16px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset",
                overflow: "hidden",
                pointerEvents: "none",
              }}>
                <div style={{
                  padding: "11px 16px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <div style={{
                    fontFamily: "var(--th-font-mono)", fontSize: 11,
                    fontWeight: 700, letterSpacing: "0.03em",
                    color: "var(--th-text-primary)",
                  }}>
                    {t({ ko: "자유 모드로 실행 중", en: "Running untracked", ja: "フリーモード", zh: "未追踪运行" })}
                  </div>
                  <div style={{
                    marginTop: 3, fontSize: 10,
                    fontFamily: "var(--th-font-mono)",
                    color: "var(--th-text-muted)", lineHeight: 1.5,
                  }}>
                    {t({
                      ko: "보고서·로그가 생성되지 않습니다. 산출물만 확인 가능합니다.",
                      en: "No logs or reports. Only deliverables are available.",
                      ja: "ログ・レポートは生成されません。成果物のみ確認可能です。",
                      zh: "不生成日志和报告，仅可查看交付物。",
                    })}
                  </div>
                </div>

                <div style={{ padding: "8px 0" }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 16px 6px",
                    fontFamily: "var(--th-font-mono)", fontSize: 9,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: "rgba(255,255,255,0.2)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    marginBottom: 2,
                  }}>
                    <span />
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <span style={{ width: 11, textAlign: "center" }}>
                        {t({ ko: "자유", en: "free", ja: "フリー", zh: "自由" })}
                      </span>
                      <span style={{ width: 11, textAlign: "center" }}>
                        {t({ ko: "업무", en: "task", ja: "タスク", zh: "任务" })}
                      </span>
                    </div>
                  </div>

                  {comparisonRows.map((row) => (
                    <div key={row.label} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center",
                      padding: "5px 16px",
                      fontFamily: "var(--th-font-mono)", fontSize: 10,
                    }}>
                      <span style={{ color: "var(--th-text-muted)" }}>{row.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <span style={{ fontSize: 11, color: row.free ? "#4ade80" : "rgba(100,116,139,0.4)" }}>
                          {row.free ? "✓" : "—"}
                        </span>
                        <span style={{ color: "#4ade80", fontSize: 11 }}>✓</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: "9px 16px 11px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  fontFamily: "var(--th-font-mono)", fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  lineHeight: 1.6,
                }}>
                  {t({
                    ko: "새 업무로 실행하면 모두 활성화됩니다.",
                    en: "Create a task in TaskBoard to enable all.",
                    ja: "TaskBoardでタスクを作成すると全て有効になります。",
                    zh: "在TaskBoard创建任务后可启用全部功能。",
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
