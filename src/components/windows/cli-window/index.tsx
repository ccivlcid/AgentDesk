import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AppWindow from "../AppWindow";
import { useAgentStore } from "../../../store/agentStore";
import { useProjectStore } from "../../../store/projectStore";
import { useTaskStore } from "../../../store/taskStore";
import { useUiStore } from "../../../store/uiStore";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useI18n } from "../../../i18n";
import * as api from "../../../api";
import { refreshCliUsage } from "../../../api/workflow-skills-subtasks";
import type { ProviderModelConfig } from "../../../types";
import { buildCliCmd, makePtyId } from "./cliCommands";
import { getFreeModeComparisonRows } from "./freeModeComparisonRows";
import { CliAgentPicker } from "./CliAgentPicker";
import { CliPlanBanner } from "./CliPlanBanner";
import { CliTerminalPane } from "./CliTerminalPane";
import { CliWindowBottomBar } from "./CliWindowBottomBar";
import { FreeModeNoticePortal } from "./FreeModeNoticePortal";
import type { CliWindowProps } from "./types";
import { FREE_MODE_NOTICE_STORAGE_KEY } from "./constants";

export default function CliWindow({ agentId: lockedAgentId, onClose }: CliWindowProps) {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const { projects, currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { cliInitialAgentId, clearCliInitialAgentId, openCliWindow, cliPlanReadyIds, clearCliPlanReady, cliInitialPrompts, clearCliInitialPrompt } = useUiStore();
  const { on } = useWebSocket();

  const needsPicker = !lockedAgentId && !cliInitialAgentId;
  const [pickerDone, setPickerDone] = useState(!needsPicker);

  const activeTask = lockedAgentId
    ? tasks.find((task) => task.assigned_agent_id === lockedAgentId && task.status === "in_progress") ?? null
    : null;
  const [completeBusy, setCompleteBusy] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [freeModeNotice, setFreeModeNotice] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(FREE_MODE_NOTICE_STORAGE_KEY) !== todayStr;
  });
  const dismissFreeModeNotice = (today: boolean) => {
    if (today) localStorage.setItem(FREE_MODE_NOTICE_STORAGE_KEY, todayStr);
    setFreeModeNotice(false);
  };

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

  const [sessionId, setSessionId] = useState(makePtyId);
  const prevProjectIdRef = useRef(currentProjectId);
  useEffect(() => {
    if (prevProjectIdRef.current !== currentProjectId) {
      prevProjectIdRef.current = currentProjectId;
      setSessionId(makePtyId());
    }
  }, [currentProjectId]);

  useEffect(() => {
    return on("pty_exit", () => {
      setTimeout(() => { void refreshCliUsage(); }, 1500);
    });
  }, [on]);

  const [activeAgentId, setActiveAgentId] = useState<string>(() => {
    if (lockedAgentId) return lockedAgentId;
    if (cliInitialAgentId) return cliInitialAgentId;
    return "";
  });

  const [dropdownAgentId, setDropdownAgentId] = useState<string>(() => {
    if (lockedAgentId) return lockedAgentId;
    if (cliInitialAgentId) return cliInitialAgentId;
    return "";
  });

  useEffect(() => {
    if (!lockedAgentId && cliInitialAgentId) {
      setActiveAgentId(cliInitialAgentId);
      setDropdownAgentId(cliInitialAgentId);
      clearCliInitialAgentId();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [lockedAgentId, activeAgentId, pickerDone]);

  const effectiveCwd = agentProjectPath ?? currentProject?.project_path ?? undefined;

  const handlePickAgent = useCallback((id: string) => {
    setActiveAgentId(id);
    setDropdownAgentId(id);
    setPickerDone(true);
  }, []);

  const activeAgent = filteredAgents.find((a) => a.id === activeAgentId)
    ?? agents.find((a) => a.id === activeAgentId);
  const dropdownAgent = filteredAgents.find((a) => a.id === dropdownAgentId)
    ?? agents.find((a) => a.id === dropdownAgentId);

  const initialPromptRef = useRef<string | null>(
    (() => {
      const agentId = lockedAgentId ?? activeAgentId;
      return agentId ? (cliInitialPrompts.get(agentId) ?? null) : null;
    })(),
  );
  useEffect(() => {
    const agentId = lockedAgentId ?? activeAgentId;
    if (agentId && cliInitialPrompts.has(agentId)) clearCliInitialPrompt(agentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialCommand = useMemo(() => {
    const agentId = lockedAgentId ?? activeAgentId;
    if (!agentId) return undefined;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return undefined;
    const cmd = buildCliCmd(agent.cli_provider, providerModelConfig[agent.cli_provider]);
    const parts: string[] = [];
    if (effectiveCwd) parts.push(`cd "${effectiveCwd}"\r`);
    parts.push(`${cmd}\r`);
    if (initialPromptRef.current) parts.push(`${initialPromptRef.current}\r`);
    return parts.join("");
  }, [lockedAgentId, activeAgentId, agents, effectiveCwd, providerModelConfig]);

  const handleRun = useCallback(() => {
    if (!dropdownAgent) return;
    openCliWindow(dropdownAgentId);
  }, [dropdownAgent, dropdownAgentId, openCliWindow]);

  const dotColor =
    activeAgent?.status === "working" ? "#f59e0b"
    : activeAgent?.status === "idle"   ? "#22c55e"
    : "#64748b";

  const windowTitle = activeAgent && (lockedAgentId || pickerDone)
    ? `${activeAgent.avatar_emoji} ${activeAgent.name}`
    : t({ ko: "Terminal", en: "Terminal", ja: "Terminal", zh: "Terminal" });

  const freeModeRows = useMemo(() => getFreeModeComparisonRows(t), [t]);

  return (
    <>
      <FreeModeNoticePortal
        open={!activeTask && freeModeNotice}
        t={t}
        rows={freeModeRows}
        onDismiss={dismissFreeModeNotice}
      />

      <AppWindow
        windowType="cli"
        title={pickerDone ? windowTitle : t({ ko: "에이전트 선택", en: "Select Agent", ja: "エージェント選択", zh: "选择代理" })}
        emoji=">_"
        defaultWidth={860}
        defaultHeight={580}
        onClose={onClose}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>

          {!pickerDone && (
            <CliAgentPicker
              t={t}
              filteredAgents={filteredAgents}
              currentProject={currentProject}
              providerModelConfig={providerModelConfig}
              onPickAgent={handlePickAgent}
            />
          )}

          <CliPlanBanner
            visible={planBannerVisible}
            t={t}
            onDismiss={() => {
              setPlanBannerVisible(false);
              if (lockedAgentId) clearCliPlanReady(lockedAgentId);
            }}
          />

          {pickerDone && (
            <CliTerminalPane
              sessionId={sessionId}
              effectiveCwd={effectiveCwd}
              activeTask={activeTask}
              initialCommand={initialCommand}
              agentPathLoaded={agentPathLoaded}
            />
          )}

          {pickerDone && (
            <CliWindowBottomBar
              t={t}
              filteredAgents={filteredAgents}
              providerModelConfig={providerModelConfig}
              dropdownAgentId={dropdownAgentId}
              setDropdownAgentId={setDropdownAgentId}
              dropdownAgent={dropdownAgent}
              activeAgent={activeAgent}
              dotColor={dotColor}
              activeTask={activeTask}
              completeBusy={completeBusy}
              setCompleteBusy={setCompleteBusy}
              onOpenNewWindow={handleRun}
            />
          )}
        </div>
      </AppWindow>
    </>
  );
}
