import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";
import { useUiStore } from "../../store/uiStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useI18n } from "../../i18n";
import * as api from "../../api";
import { cliCompleteTask } from "../../api/organization-projects";
import { refreshCliUsage } from "../../api/workflow-skills-subtasks";
import type { CliProvider, ProviderModelConfig } from "../../types";

const XTerminal = lazy(() => import("../terminal/XTerminal"));

const SPINNER = (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
    <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
    loading...
  </div>
);

// 모델 플래그 없는 기본 CLI 커맨드 (표시용)
const CLI_BASE: Partial<Record<CliProvider, string>> = {
  claude:      "claude",
  codex:       "codex",
  gemini:      "gemini",
  opencode:    "opencode",
  copilot:     "copilot",
  antigravity: "antigravity",
  cursor:      "cursor .",
};

/** settings의 providerModelConfig를 반영해 실제 실행할 명령어를 반환 */
function buildCliCmd(provider: CliProvider, cfg?: ProviderModelConfig): string {
  const base = CLI_BASE[provider];
  if (!base) return provider;
  const model = cfg?.model;
  if (!model) return base;
  switch (provider) {
    case "claude":   return `claude --model ${model}`;
    case "codex":    return `codex -m ${model}`;
    case "gemini":   return `gemini -m ${model}`;
    case "opencode": return `opencode -m ${model}`;
    case "cursor":   return `cursor . --model ${model}`;
    default:         return base;
  }
}

function makePtyId() {
  return `pty-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  /** 에이전트별 독립 창일 때 agentId 전달. 없으면 일반 범용 터미널 */
  agentId?: string;
  onClose?: () => void;
}

export default function CliWindow({ agentId: lockedAgentId, onClose }: Props) {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const { projects, currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { cliInitialAgentId, clearCliInitialAgentId, openCliWindow, cliPlanReadyIds, clearCliPlanReady } = useUiStore();
  const { send, on } = useWebSocket();

  // ── 에이전트 선택 단계 (lockedAgentId / cliInitialAgentId 없을 때만 표시) ──
  const needsPicker = !lockedAgentId && !cliInitialAgentId;
  const [pickerDone, setPickerDone] = useState(!needsPicker);

  // Active task for the locked agent (used to show 완료 button)
  const activeTask = lockedAgentId
    ? tasks.find((task) => task.assigned_agent_id === lockedAgentId && task.status === "in_progress") ?? null
    : null;
  const [completeBusy, setCompleteBusy] = useState(false);
  const [showFreeModeTip, setShowFreeModeTip] = useState(false);

  // 자유 모드 안내 모달 — 오늘 하루 안 보기 지원
  const FREE_MODE_NOTICE_KEY = "agentdesk.cli.free_mode_notice_dismissed";
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const [freeModeNotice, setFreeModeNotice] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(FREE_MODE_NOTICE_KEY) !== todayStr;
  });
  const dismissFreeModeNotice = (today: boolean) => {
    if (today) localStorage.setItem(FREE_MODE_NOTICE_KEY, todayStr);
    setFreeModeNotice(false);
  };

  // Planning-complete banner — shown when CLI opened after Phase E planning agent
  const planReady = lockedAgentId ? cliPlanReadyIds.has(lockedAgentId) : false;
  const [planBannerVisible, setPlanBannerVisible] = useState(false);
  useEffect(() => {
    if (planReady) {
      setPlanBannerVisible(true);
      const timer = setTimeout(() => {
        setPlanBannerVisible(false);
        if (lockedAgentId) clearCliPlanReady(lockedAgentId);
      }, 6000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planReady]);

  // settings의 providerModelConfig 로드
  const [providerModelConfig, setProviderModelConfig] = useState<Record<string, ProviderModelConfig>>({});
  useEffect(() => {
    api.getSettings()
      .then((s) => { if (s.providerModelConfig) setProviderModelConfig(s.providerModelConfig); })
      .catch(() => { /* 로드 실패 시 기본값(모델 없음) 유지 */ });
  }, []);

  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const filteredAgents =
    currentProject && projectAgentsLoaded && projectAgentIds.size > 0
      ? agents.filter((a) => projectAgentIds.has(a.id))
      : agents;

  // PTY 세션 — 프로젝트 전환 시 새 세션
  const [sessionId, setSessionId] = useState(makePtyId);
  const prevProjectIdRef = useRef(currentProjectId);
  useEffect(() => {
    if (prevProjectIdRef.current !== currentProjectId) {
      prevProjectIdRef.current = currentProjectId;
      setSessionId(makePtyId());
    }
  }, [currentProjectId]);

  // PTY 세션 종료 시 CLI usage 갱신 (비용 앱에 반영)
  useEffect(() => {
    return on("pty_exit", () => {
      // 약간 딜레이 후 refresh (CLI 도구가 사용량 기록 완료 대기)
      setTimeout(() => { void refreshCliUsage(); }, 1500);
    });
  }, [on]);

  // activeAgentId: 현재 창에서 실행 중인 에이전트 (터미널/경로에 영향, 변경 안 됨)
  const [activeAgentId, setActiveAgentId] = useState<string>(() => {
    if (lockedAgentId) return lockedAgentId;
    if (cliInitialAgentId) return cliInitialAgentId;
    return "";
  });

  // dropdownAgentId: 하단 셀렉트 박스 선택값 (새 창 열기용, 현재 터미널에 영향 없음)
  const [dropdownAgentId, setDropdownAgentId] = useState<string>(() => {
    if (lockedAgentId) return lockedAgentId;
    if (cliInitialAgentId) return cliInitialAgentId;
    return "";
  });

  // 일반 창: cliInitialAgentId 소비
  useEffect(() => {
    if (!lockedAgentId && cliInitialAgentId) {
      setActiveAgentId(cliInitialAgentId);
      setDropdownAgentId(cliInitialAgentId);
      clearCliInitialAgentId();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 에이전트 프로젝트 경로 fetch — activeAgentId 기준 (드롭다운 변경에 반응하지 않음)
  const [agentProjectPath, setAgentProjectPath] = useState<string | null>(null);
  const [agentPathLoaded, setAgentPathLoaded] = useState(false);
  const pathFetchedForRef = useRef<string>("");

  useEffect(() => {
    const agentId = lockedAgentId ?? (pickerDone ? activeAgentId : undefined);
    if (!agentId) return;
    if (pathFetchedForRef.current === agentId) return;
    pathFetchedForRef.current = agentId;
    setAgentProjectPath(null);
    setAgentPathLoaded(false);
    api.getAgentProjectPath(agentId)
      .then((path) => { if (path) setAgentProjectPath(path); })
      .catch(() => {})
      .finally(() => setAgentPathLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedAgentId, activeAgentId, pickerDone]);

  const effectiveCwd = agentProjectPath ?? currentProject?.project_path ?? undefined;

  // picker에서 에이전트 선택 후 터미널로 전환
  function handlePickAgent(id: string) {
    setActiveAgentId(id);
    setDropdownAgentId(id);
    setPickerDone(true);
  }

  const activeAgent = filteredAgents.find((a) => a.id === activeAgentId)
    ?? agents.find((a) => a.id === activeAgentId);
  const dropdownAgent = filteredAgents.find((a) => a.id === dropdownAgentId)
    ?? agents.find((a) => a.id === dropdownAgentId);

  // XTerminal에 전달할 초기 실행 명령어 — activeAgentId 기준
  const initialCommand = useMemo(() => {
    const agentId = lockedAgentId ?? activeAgentId;
    if (!agentId) return undefined;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return undefined;
    const cmd = buildCliCmd(agent.cli_provider, providerModelConfig[agent.cli_provider]);
    const parts: string[] = [];
    if (effectiveCwd) parts.push(`cd "${effectiveCwd}"\r`);
    parts.push(`${cmd}\r`);
    return parts.join("");
  }, [lockedAgentId, activeAgentId, agents, effectiveCwd, providerModelConfig]);

  // ▶ 새 창 버튼 — 드롭다운에서 선택한 에이전트로 새 창
  function handleRun() {
    if (!dropdownAgent) return;
    openCliWindow(dropdownAgentId);
  }

  const dotColor =
    activeAgent?.status === "working" ? "#f59e0b"
    : activeAgent?.status === "idle"   ? "#22c55e"
    : "#64748b";

  const windowTitle = activeAgent && (lockedAgentId || pickerDone)
    ? `${activeAgent.avatar_emoji} ${activeAgent.name}`
    : t({ ko: "Terminal", en: "Terminal", ja: "Terminal", zh: "Terminal" });

  const rows = [
    { label: t({ ko: "워크트리 격리", en: "Worktree isolation", ja: "ワークツリー分離", zh: "工作树隔离" }), free: false },
    { label: t({ ko: "작업 로그 기록", en: "Task log", ja: "タスクログ", zh: "任务日志" }), free: false },
    { label: t({ ko: "완료 보고서", en: "Completion report", ja: "完了レポート", zh: "完成报告" }), free: false },
    { label: t({ ko: "플래닝 단계", en: "Planning phase", ja: "プランニング", zh: "规划阶段" }), free: false },
    { label: t({ ko: "완료 추적", en: "Completion tracking", ja: "完了追跡", zh: "完成追踪" }), free: false },
    { label: t({ ko: "산출물 체크리스트", en: "Deliverables", ja: "成果物", zh: "交付物" }), free: true },
  ];

  return (
    <>
      {/* 자유 모드 안내 — 별도 창으로 렌더 (터미널 블로킹 없음) */}
      {!activeTask && freeModeNotice && createPortal(
        <div style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 340, zIndex: 9999,
          background: "var(--th-bg-elevated)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset",
          overflow: "hidden",
          fontFamily: "var(--th-font-mono)",
        }}>
          {/* 타이틀바 */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px 11px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-secondary)", letterSpacing: "0.04em" }}>
              {t({ ko: "자유 모드 안내", en: "Free Mode Notice", ja: "フリーモード", zh: "自由模式说明" })}
            </span>
            <button type="button" onClick={() => dismissFreeModeNotice(false)}
              style={{ background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
              ✕
            </button>
          </div>

          {/* 설명 */}
          <div style={{ padding: "14px 18px 10px", fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.65 }}>
            {t({
              ko: "보고서·로그가 생성되지 않습니다. 산출물만 확인 가능합니다.",
              en: "No logs or reports will be generated. Only deliverables are available.",
              ja: "ログ・レポートは生成されません。成果物のみ確認可能です。",
              zh: "不生成日志和报告，仅可查看交付物。",
            })}
          </div>

          {/* 비교표 */}
          <div style={{ padding: "4px 0 8px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "3px 18px 6px",
              fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.2)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span />
              <div style={{ display: "flex", gap: 20 }}>
                <span style={{ width: 30, textAlign: "center" }}>{t({ ko: "자유", en: "free", ja: "フリー", zh: "自由" })}</span>
                <span style={{ width: 30, textAlign: "center" }}>{t({ ko: "업무", en: "task", ja: "タスク", zh: "任务" })}</span>
              </div>
            </div>
            {rows.map((row) => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 18px", fontSize: 11,
              }}>
                <span style={{ color: "var(--th-text-muted)" }}>{row.label}</span>
                <div style={{ display: "flex", gap: 20 }}>
                  <span style={{ width: 30, textAlign: "center", color: row.free ? "#4ade80" : "rgba(100,116,139,0.4)" }}>
                    {row.free ? "✓" : "—"}
                  </span>
                  <span style={{ width: 30, textAlign: "center", color: "#4ade80" }}>✓</span>
                </div>
              </div>
            ))}
          </div>

          {/* 버튼 */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 18px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <button type="button" onClick={() => dismissFreeModeNotice(true)}
              style={{
                fontSize: 10, fontFamily: "var(--th-font-mono)",
                color: "rgba(255,255,255,0.28)", background: "none", border: "none",
                cursor: "pointer", padding: "4px 0", letterSpacing: "0.02em",
              }}>
              {t({ ko: "오늘 하루 안 보기", en: "Don't show today", ja: "今日は表示しない", zh: "今天不再显示" })}
            </button>
            <button type="button" onClick={() => dismissFreeModeNotice(false)}
              style={{
                fontSize: 11, fontFamily: "var(--th-font-mono)", fontWeight: 700,
                color: "var(--th-bg-primary)", background: "var(--th-text-primary)",
                border: "none", borderRadius: 7, cursor: "pointer",
                padding: "6px 20px", letterSpacing: "0.02em",
              }}>
              {t({ ko: "확인", en: "Got it", ja: "確認", zh: "确认" })}
            </button>
          </div>
        </div>,
        document.body,
      )}

    <AppWindow
      windowType="cli"
      title={pickerDone ? windowTitle : t({ ko: "에이전트 선택", en: "Select Agent", ja: "エージェント選択", zh: "选择代理" })}
      emoji=">_"
      defaultWidth={860}
      defaultHeight={580}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>

        {/* ── 에이전트 선택 화면 ── */}
        {!pickerDone && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 40px",
            gap: 24,
            background: "var(--th-bg-primary)",
          }}>
            {/* 헤더 */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontFamily: "var(--th-font-mono)", color: "var(--th-text-secondary)", letterSpacing: "0.08em", marginBottom: 6 }}>
                {">_"} {t({ ko: "에이전트 CLI", en: "Agent CLI", ja: "エージェントCLI", zh: "代理CLI" })}
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)", letterSpacing: "0.04em" }}>
                {t({ ko: "실행할 직원을 선택하세요", en: "Select an agent to run", ja: "実行するエージェントを選択", zh: "选择要运行的代理" })}
              </div>
            </div>

            {/* 에이전트 그리드 */}
            {filteredAgents.length === 0 ? (
              <div style={{ fontSize: 11, fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)", opacity: 0.5 }}>
                {t({ ko: "등록된 에이전트가 없습니다", en: "No agents registered", ja: "エージェントが登録されていません", zh: "没有注册的代理" })}
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10,
                width: "100%",
                maxWidth: 680,
                maxHeight: 360,
                overflowY: "auto",
              }}>
                {filteredAgents.map((agent) => {
                  const cliCmd = CLI_BASE[agent.cli_provider];
                  const isWorking = agent.status === "working";
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handlePickAgent(agent.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 6,
                        padding: "14px 16px",
                        background: "var(--th-bg-elevated)",
                        border: "1px solid var(--th-border)",
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.15s, background 0.15s",
                        fontFamily: "var(--th-font-mono)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-accent)";
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)";
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--th-bg-elevated)";
                      }}
                    >
                      {/* 이모지 + 상태 dot */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span style={{ fontSize: 22 }}>{agent.avatar_emoji}</span>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: isWorking ? "#f59e0b" : agent.status === "idle" ? "#22c55e" : "#64748b",
                        }} />
                      </div>
                      {/* 이름 */}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)", lineHeight: 1.3 }}>
                        {agent.name}
                      </span>
                      {/* CLI 커맨드 */}
                      {cliCmd && (
                        <span style={{ fontSize: 10, color: "var(--th-accent)", opacity: 0.8 }}>
                          {buildCliCmd(agent.cli_provider, providerModelConfig[agent.cli_provider])}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 프로젝트 표시 */}
            {currentProject && (
              <div style={{ fontSize: 10, fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)", letterSpacing: "0.04em", opacity: 0.5 }}>
                📁 {currentProject.name}
              </div>
            )}
          </div>
        )}

        {/* Planning-complete 배너 */}
        {planBannerVisible && (
          <div style={{
            padding: "6px 14px",
            background: "rgba(245,158,11,0.12)",
            borderBottom: "1px solid rgba(245,158,11,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--th-font-mono)",
            fontSize: 11,
            color: "var(--th-accent)",
            flexShrink: 0,
          }}>
            <span>📋</span>
            <span>{t({ ko: "기획 완료 — .agentdesk-task.md에 실행 계획이 준비됐습니다.", en: "Planning complete — execution plan is ready in .agentdesk-task.md", ja: "計画完了 — .agentdesk-task.md に実行プランが用意されました", zh: "规划完成 — 执行计划已写入 .agentdesk-task.md" })}</span>
            <button
              type="button"
              onClick={() => { setPlanBannerVisible(false); if (lockedAgentId) clearCliPlanReady(lockedAgentId); }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: 12 }}
            >✕</button>
          </div>
        )}

        {/* 실제 PTY 터미널 — picker 완료 + 경로 로드 완료 후에만 렌더 */}
        {pickerDone && (
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            {agentPathLoaded ? (
              <Suspense fallback={SPINNER}>
                <XTerminal
                  sessionId={sessionId}
                  cwd={effectiveCwd}
                  taskId={activeTask?.id}
                  initialCommand={initialCommand}
                />
              </Suspense>
            ) : SPINNER}
          </div>
        )}

        {/* 하단 에이전트 셀렉트 바 — picker 완료 후에만 */}
        {pickerDone && <div
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
          {/* 상태 dot — 현재 창 에이전트 기준 */}
          {activeAgent && (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, transition: "background 0.2s" }} />
          )}

          {/* 에이전트 select — 새 창 열기용 */}
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

          {/* ▶ 실행 / 새 창 버튼 */}
          <button
            onClick={handleRun}
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
            {t({ ko: "▶ 새 창", en: "▶ New Window", ja: "▶ 新窓", zh: "▶ 新窗" })}
          </button>

          {/* 완료 버튼: 잠긴 에이전트가 진행 중인 태스크가 있을 때만 표시 */}
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

          {/* 오른쪽: 모드 표시 */}
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            {activeTask ? (
              // ── 추적 모드 ──
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
              // ── 자유 모드 + 툴팁 ──
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setShowFreeModeTip(true)}
                onMouseLeave={() => setShowFreeModeTip(false)}
              >
                {/* 뱃지 */}
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

                {/* 툴팁 */}
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
                    {/* 헤더 */}
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

                    {/* 비교 목록 */}
                    <div style={{ padding: "8px 0" }}>
                      {/* 컬럼 헤더 */}
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

                      {([
                        { label: t({ ko: "워크트리 격리", en: "Worktree isolation", ja: "ワークツリー分離", zh: "工作树隔离" }), free: false },
                        { label: t({ ko: "작업 로그 기록", en: "Task log", ja: "タスクログ", zh: "任务日志" }), free: false },
                        { label: t({ ko: "완료 보고서", en: "Completion report", ja: "完了レポート", zh: "完成报告" }), free: false },
                        { label: t({ ko: "플래닝 단계", en: "Planning phase", ja: "プランニング", zh: "规划阶段" }), free: false },
                        { label: t({ ko: "완료 추적", en: "Completion tracking", ja: "完了追跡", zh: "完成追踪" }), free: false },
                        { label: t({ ko: "산출물 체크리스트", en: "Deliverables", ja: "成果物", zh: "交付物" }), free: true },
                      ]).map((row) => (
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

                    {/* 푸터 */}
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
        </div>}
      </div>
    </AppWindow>
    </>
  );
}
