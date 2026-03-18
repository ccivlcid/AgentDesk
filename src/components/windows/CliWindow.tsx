import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useI18n } from "../../i18n";
import * as api from "../../api";
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
  const { projects, currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { cliInitialAgentId, clearCliInitialAgentId, openCliWindow } = useUiStore();
  const { send } = useWebSocket();

  // settings의 providerModelConfig 로드
  const [providerModelConfig, setProviderModelConfig] = useState<Record<string, ProviderModelConfig>>({});
  useEffect(() => {
    api.getSettings()
      .then((s) => { if (s.providerModelConfig) setProviderModelConfig(s.providerModelConfig); })
      .catch(() => { /* 로드 실패 시 기본값(모델 없음) 유지 */ });
  }, []);

  // 에이전트별 창: 해당 에이전트의 프로젝트 경로 fetch
  const [agentProjectPath, setAgentProjectPath] = useState<string | null>(null);
  useEffect(() => {
    if (!lockedAgentId) return;
    api.getAgentProjectPath(lockedAgentId)
      .then((path) => { if (path) setAgentProjectPath(path); })
      .catch(() => { /* 실패 시 currentProject fallback */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedAgentId]);

  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  // 실제 사용할 작업 디렉토리: 에이전트 프로젝트 경로 → 현재 선택 프로젝트 경로 순으로 fallback
  const effectiveCwd = agentProjectPath ?? currentProject?.project_path ?? undefined;
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

  // 선택된 에이전트
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    if (lockedAgentId) return lockedAgentId;
    if (cliInitialAgentId) return cliInitialAgentId;
    const pick = filteredAgents.find((a) => a.status === "idle") ?? filteredAgents[0];
    return pick?.id ?? "";
  });

  // 일반 창: cliInitialAgentId 소비
  useEffect(() => {
    if (!lockedAgentId && cliInitialAgentId) {
      setSelectedAgentId(cliInitialAgentId);
      clearCliInitialAgentId();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터 에이전트가 바뀌어도 현재 선택 유지 (없으면 첫 번째로)
  useEffect(() => {
    if (!filteredAgents.find((a) => a.id === selectedAgentId)) {
      const pick = filteredAgents.find((a) => a.status === "idle") ?? filteredAgents[0];
      if (pick) setSelectedAgentId(pick.id);
    }
  }, [filteredAgents, selectedAgentId]);

  const selectedAgent = filteredAgents.find((a) => a.id === selectedAgentId)
    ?? agents.find((a) => a.id === selectedAgentId); // lockedAgent가 필터 밖일 수도 있음

  // CLI 명령어 실행 (cd + cli_provider + model flag)
  const runAgentCli = useCallback(
    (id: string) => {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return;
      const cmd = buildCliCmd(agent.cli_provider, providerModelConfig[agent.cli_provider]);
      if (effectiveCwd) {
        send({ type: "pty_input", id: sessionId, data: `cd "${effectiveCwd}"\r` });
      }
      send({ type: "pty_input", id: sessionId, data: `${cmd}\r` });
    },
    [agents, effectiveCwd, sessionId, send, providerModelConfig],
  );

  // 항상 최신 runAgentCli를 가리키는 ref — stale closure 방지
  const runAgentCliRef = useRef(runAgentCli);
  runAgentCliRef.current = runAgentCli;

  // 마운트 후 자동 실행 (PTY ready 이후) — 일반 창·에이전트별 창 공통
  const autoRanRef = useRef(false);
  const autoRunAgentIdRef = useRef<string>("");
  useEffect(() => {
    if (autoRanRef.current) return;
    const agentId = lockedAgentId ?? selectedAgentId;
    if (!agentId) return;
    // XTerminal이 pty_ready를 받은 뒤 실행되어야 하므로 짧게 대기
    const t = setTimeout(() => {
      autoRanRef.current = true;
      autoRunAgentIdRef.current = agentId;
      runAgentCliRef.current(agentId);
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // select 변경 핸들러
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedAgentId(id);
  }

  // ▶ 실행 버튼
  function handleRun() {
    if (!selectedAgent) return;

    if (lockedAgentId) {
      // 에이전트별 창: 다른 에이전트 선택 → 새 창 열기
      if (selectedAgentId !== lockedAgentId) {
        openCliWindow(selectedAgentId);
        return;
      }
      // 같은 에이전트 → 현재 창에서 재실행
      runAgentCli(selectedAgentId);
    } else {
      // 범용 창: 자동 실행된 에이전트와 다르면 새 창, 같으면 현재 창에서 재실행
      if (selectedAgentId !== autoRunAgentIdRef.current) {
        openCliWindow(selectedAgentId);
      } else {
        runAgentCli(selectedAgentId);
      }
    }
  }

  const dotColor =
    selectedAgent?.status === "working" ? "#f59e0b"
    : selectedAgent?.status === "idle"   ? "#22c55e"
    : "#64748b";

  const windowTitle = lockedAgentId && selectedAgent
    ? `${selectedAgent.avatar_emoji} ${selectedAgent.name}`
    : t({ ko: "Terminal", en: "Terminal", ja: "Terminal", zh: "Terminal" });

  return (
    <AppWindow
      windowType="cli"
      title={windowTitle}
      emoji=">_"
      defaultWidth={860}
      defaultHeight={580}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* 실제 PTY 터미널 */}
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <Suspense fallback={SPINNER}>
            <XTerminal
              sessionId={sessionId}
              cwd={effectiveCwd}
            />
          </Suspense>
        </div>

        {/* 하단 에이전트 셀렉트 바 */}
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
          {/* 상태 dot */}
          {selectedAgent && (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, transition: "background 0.2s" }} />
          )}

          {/* 에이전트 select */}
          <select
            value={selectedAgentId}
            onChange={handleSelectChange}
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
              <option value="">에이전트 없음</option>
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
            disabled={!selectedAgent}
            title={
              lockedAgentId && selectedAgentId !== lockedAgentId
                ? `${selectedAgent?.name} 새 터미널 창 열기`
                : selectedAgent && CLI_BASE[selectedAgent.cli_provider]
                ? `${buildCliCmd(selectedAgent.cli_provider, providerModelConfig[selectedAgent.cli_provider])} 실행`
                : "CLI 없음"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 5,
              border: "1px solid var(--th-border)",
              background: "transparent",
              color: selectedAgent ? "var(--th-accent)" : "var(--th-text-muted)",
              fontSize: 12,
              fontFamily: "var(--th-font-mono)",
              cursor: selectedAgent ? "pointer" : "default",
              opacity: selectedAgent ? 1 : 0.4,
              whiteSpace: "nowrap",
            }}
          >
            {lockedAgentId && selectedAgentId !== lockedAgentId ? "▶ 새 창" : "▶ 실행"}
          </button>

          {/* 프로젝트 + CLI 정보 */}
          <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--th-font-mono)", color: "var(--th-text-muted)" }}>
            {currentProject ? `📁 ${currentProject.name}` : "전체"}
            {selectedAgent && CLI_BASE[selectedAgent.cli_provider]
              ? ` · ${buildCliCmd(selectedAgent.cli_provider, providerModelConfig[selectedAgent.cli_provider])}`
              : ""}
          </span>
        </div>
      </div>
    </AppWindow>
  );
}
