import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import * as api from "./api";
import { useTheme } from "./ThemeContext";
import { useAppLabels } from "./app/useAppLabels";
import AppLoadingScreen from "./app/AppLoadingScreen";
import Desktop from "./components/desktop/Desktop";
import AppOverlays from "./app/AppOverlays";
import ProjectCreateModal from "./components/project-create-modal/ProjectCreateModal";
import CreateTaskModal from "./components/taskboard/CreateTaskModal";
import { useAppActions } from "./app/useAppActions";
import { useActiveMeetingTaskId } from "./app/useActiveMeetingTaskId";
import { useUpdateStatusPolling } from "./app/useUpdateStatusPolling";
import { useAppViewEffects } from "./app/useAppViewEffects";
import { useAppBootstrapData } from "./app/useAppBootstrapData";
import { useLiveSyncScheduler } from "./app/useLiveSyncScheduler";
import { useRealtimeSync } from "./app/useRealtimeSync";
import { mergeSettingsWithDefaults } from "./app/utils";
import { useAgentStore } from "./store/agentStore";
import { useTaskStore } from "./store/taskStore";
import { useProjectStore } from "./store/projectStore";
import { useUiStore } from "./store/uiStore";

export type { OAuthCallbackResult } from "./app/types";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // ── Agent store ──────────────────────────────────────────────────────────
  const {
    departments, agents, libraryAgents, subAgents, stats,
    selectedAgent, chatAgent, showChat, unreadAgentIds, streamingMessage,
    setDepartments, setAgents, setLibraryAgents, setSubAgents, setStats,
    setSelectedAgent, setChatAgent, setShowChat, setUnreadAgentIds, setStreamingMessage,
  } = useAgentStore();

  // ── Task store ───────────────────────────────────────────────────────────
  const {
    tasks, messages, cliStatus, subtasks, taskPanel, taskReport,
    crossDeptDeliveries, clientOfficeCalls, meetingPresence, decisionInboxItems,
    setTasks, setMessages, setCliStatus, setSubtasks, setTaskPanel, setTaskReport,
    setCrossDeptDeliveries, setClientOfficeCalls, setMeetingPresence, setDecisionInboxItems,
  } = useTaskStore();

  // ── Project store ────────────────────────────────────────────────────────
  const {
    categories, projects, currentProjectId, projectAgentIds, projectAgentsLoaded,
    showProjectCreate, projectCreateBusy, showCreateTaskAfterCreate,
    setCategories, setProjects, setCurrentProjectId, setProjectAgentIds,
    setProjectAgentsLoaded, setShowProjectCreate, setProjectCreateBusy,
    setShowCreateTaskAfterCreate,
  } = useProjectStore();

  // ── UI store ─────────────────────────────────────────────────────────────
  const {
    view, loading, settings, oauthResult,
    showReportHistory, showAgentStatus, showGroupChat, groupChatInitialAgentIds,
    showDecisionInbox, decisionInboxLoading, decisionReplyBusyKey,
    mobileNavOpen, mobileHeaderMenuOpen, runtimeOs, forceUpdateBanner,
    updateStatus, dismissedUpdateVersion,
    setView, setLoading, setSettings, setOauthResult,
    setShowReportHistory, setShowAgentStatus, setShowGroupChat, setGroupChatInitialAgentIds,
    setShowDecisionInbox, setDecisionInboxLoading, setDecisionReplyBusyKey,
    setMobileNavOpen, setMobileHeaderMenuOpen, setUpdateStatus, setDismissedUpdateVersion,
  } = useUiStore();

  // ── Derived values ───────────────────────────────────────────────────────
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  useEffect(() => {
    if (!currentProjectId) {
      setProjectAgentIds(new Set());
      setProjectAgentsLoaded(false);
      return;
    }
    setProjectAgentsLoaded(false);
    import("./api/categories-dashboard").then(({ fetchProjectAgents }) =>
      fetchProjectAgents(currentProjectId)
        .then((list) => {
          setProjectAgentIds(new Set(list.map((a: { id: string }) => a.id)));
          setProjectAgentsLoaded(true);
        })
        .catch(() => { setProjectAgentsLoaded(true); }),
    );
  }, [currentProjectId]);

  const projectAgents = useMemo(() => {
    if (!currentProjectId) return agents;
    if (!projectAgentsLoaded) return agents;
    return agents.filter((a) => projectAgentIds.has(a.id));
  }, [agents, projectAgentIds, projectAgentsLoaded, currentProjectId]);

  // ── Refs for WebSocket callbacks ─────────────────────────────────────────
  // WebSocket 이벤트 핸들러는 마운트 시 한 번만 등록되므로, 최신 state를
  // 클로저로 캡처할 수 없다. ref를 매 렌더마다 동기화해서 핸들러가 항상
  // 최신 값을 참조하도록 한다 (stale closure 방지).
  const viewRef = useRef(view);
  viewRef.current = view;
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const subAgentsRef = useRef(subAgents);
  subAgentsRef.current = subAgents;
  // Codex 스트리밍: thread ID → subAgent ID 매핑 (세션 동안 누적)
  const codexThreadToSubAgentIdRef = useRef<Map<string, string>>(new Map());
  // Codex thread 바인딩 타임스탬프 (오래된 바인딩 무효화용)
  const codexThreadBindingTsRef = useRef<Map<string, number>>(new Map());
  // subAgent 스트림 마지막 청크 (중복 tail 제거용)
  const subAgentStreamTailRef = useRef<Map<string, string>>(new Map());
  // 채팅 오버레이 열림 여부 + 현재 채팅 대상 (알림 뱃지 제어에 사용)
  const activeChatRef = useRef({ showChat, agentId: chatAgent?.id ?? null });
  activeChatRef.current = { showChat, agentId: chatAgent?.id ?? null };

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { connected, on } = useWebSocket();
  const shouldIncludeSeedAgents = useCallback(() => false, []);

  // 주기적 API 폴링 스케줄러. WebSocket 재연결·이벤트 누락 시 상태를 복구한다.
  const scheduleLiveSync = useLiveSyncScheduler({
    setTasks, setAgents, setStats, setDecisionInboxItems, shouldIncludeSeedAgents,
  });

  // 앱 초기 로딩: 부서·에이전트·태스크·설정·카테고리 등 전체 초기 데이터 fetch
  useAppBootstrapData({
    setDepartments, setAgents, setLibraryAgents, setTasks, setStats,
    setSettings, setSubtasks, setMeetingPresence, setDecisionInboxItems,
    setCategories, setProjects, setLoading,
  });

  // 앱 업데이트 버전 폴링 (백그라운드, 배너 표시용)
  useUpdateStatusPolling(setUpdateStatus);
  // URL 쿼리(?oauth=...) 파싱, CLI 상태 변화에 따른 뷰 전환 등 부수효과 처리
  useAppViewEffects({ view, cliStatus, setView, setOauthResult, setCliStatus, setMobileNavOpen });

  // WebSocket 이벤트 → 스토어 실시간 반영 (task/agent/message/cli_output 등)
  useRealtimeSync({
    on, connected, scheduleLiveSync,
    agentsRef, tasksRef, subAgentsRef, viewRef, activeChatRef,
    codexThreadToSubAgentIdRef, codexThreadBindingTsRef, subAgentStreamTailRef,
    setTasks, setAgents, setMessages, setUnreadAgentIds, setTaskReport,
    setCrossDeptDeliveries, setClientOfficeCalls, setMeetingPresence,
    setSubtasks, setSubAgents, setStreamingMessage,
  });

  // 사용자 액션 핸들러 모음 (태스크 생성/실행/삭제, 채팅 전송, 설정 저장 등)
  const actions = useAppActions({
    agents, settings, scheduleLiveSync,
    setSettings, setAgents, setLibraryAgents, setDepartments, setTasks, setStats,
    setMessages, setChatAgent, setShowChat, setUnreadAgentIds,
    setShowDecisionInbox, setDecisionInboxLoading, setDecisionInboxItems,
    setDecisionReplyBusyKey, setCliStatus,
  });

  // 현재 진행 중인 미팅 태스크 ID (미팅 분 패널 자동 오픈용)
  const activeMeetingTaskId = useActiveMeetingTaskId(meetingPresence);

  // 언어·테마·업데이트 배너 등 UI 레이블 계산 (i18n)
  const labels = useAppLabels({
    view, settings, theme, runtimeOs, forceUpdateBanner, updateStatus, dismissedUpdateVersion,
  });

  const [showCreateTask, setShowCreateTask] = useState(false);

  // OAuth 콜백 시 settings 창 자동 열기
  const { openWindow } = useUiStore();
  useEffect(() => {
    if (oauthResult) openWindow("settings");
  }, [oauthResult]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLoadingScreen language={labels.uiLanguage} title={labels.loadingTitle} subtitle={labels.loadingSubtitle} />
    );
  }

  return (
    <Desktop
      connected={connected}
      on={on}
      onSaveSettings={actions.handleSaveSettings}
      onRefreshCli={actions.handleRefreshCli}
      oauthResult={oauthResult}
      onOauthResultClear={() => setOauthResult(null)}
      onAgentsChange={actions.handleAgentsChange}
      onSendMessage={actions.handleSendMessage}
      onSendAnnouncement={actions.handleSendAnnouncement}
      onSendDirective={actions.handleSendDirective}
      onClearMessages={actions.handleClearMessages}
      onProjectCreate={() => setShowProjectCreate(true)}
      onCreateTask={() => setShowCreateTask(true)}
      onOpenDecisionInbox={() => { setShowDecisionInbox(true); void actions.loadDecisionInbox(); }}
      onOpenReportHistory={() => { /* handled by openWindows["reports"] */ }}
    >
      <AppOverlays
        showChat={showChat}
        chatAgent={chatAgent}
        messages={messages}
        agents={agents}
        groupChatAgents={projectAgents}
        streamingMessage={streamingMessage}
        onSendMessage={actions.handleSendMessage}
        onSendAnnouncement={actions.handleSendAnnouncement}
        onSendDirective={actions.handleSendDirective}
        onClearMessages={actions.handleClearMessages}
        onCloseChat={() => setShowChat(false)}
        showDecisionInbox={showDecisionInbox}
        decisionInboxLoading={decisionInboxLoading}
        decisionInboxItems={decisionInboxItems}
        decisionReplyBusyKey={decisionReplyBusyKey}
        uiLanguage={labels.uiLanguage}
        onCloseDecisionInbox={() => setShowDecisionInbox(false)}
        onRefreshDecisionInbox={() => { void actions.loadDecisionInbox(); }}
        onReplyDecisionOption={actions.handleReplyDecisionOption}
        onOpenDecisionChat={actions.handleOpenDecisionChat}
        selectedAgent={selectedAgent}
        departments={departments}
        tasks={tasks}
        subAgents={subAgents}
        subtasks={subtasks}
        onCloseSelectedAgent={() => setSelectedAgent(null)}
        onChatFromAgentDetail={(agent) => {
          setSelectedAgent(null);
          actions.handleOpenChat(agent);
        }}
        onAssignTaskFromAgentDetail={() => {
          setSelectedAgent(null);
          setShowCreateTask(true);
        }}
        onOpenTerminalFromAgentDetail={(taskId) => {
          setSelectedAgent(null);
          setTaskPanel({ taskId, tab: "terminal" });
        }}
        onAgentUpdated={() => {
          api.getSettings()
            .then(async (raw) => {
              const nextSettings = mergeSettingsWithDefaults(raw);
              const [nextAgents, nextLibrary] = await Promise.all([
                api.getAgents({ includeSeed: false }),
                api.getAgents({ includeSeed: true }),
              ]);
              setAgents(nextAgents);
              setLibraryAgents(nextLibrary);
              setSettings(nextSettings);
              if (!selectedAgent) return;
              const found = nextAgents.find((a) => a.id === selectedAgent.id);
              if (found) setSelectedAgent(found);
            })
            .catch(console.error);
        }}
        taskPanel={taskPanel}
        onCloseTaskPanel={() => setTaskPanel(null)}
        taskReport={taskReport}
        onCloseTaskReport={() => setTaskReport(null)}
        showReportHistory={false}
        onCloseReportHistory={() => { /* no-op */ }}
        showAgentStatus={showAgentStatus}
        onCloseAgentStatus={() => setShowAgentStatus(false)}
        showGroupChat={showGroupChat}
        groupChatInitialAgentIds={groupChatInitialAgentIds}
        onCloseGroupChat={() => { setShowGroupChat(false); setGroupChatInitialAgentIds([]); }}
        onOpenGroupChatWithAgents={(agentIds) => { setGroupChatInitialAgentIds(agentIds); setShowGroupChat(true); }}
      />
      {showProjectCreate && (
        <ProjectCreateModal
          categories={categories}
          agents={agents}
          onConfirm={({ name, categoryId, project_path, core_goal, agentIds }) => {
            if (projectCreateBusy) return;
            setProjectCreateBusy(true);
            const cat = categories.find((c) => c.id === categoryId);
            const resolvedGoal = core_goal || (cat ? `${cat.name_ko ?? cat.name} 프로젝트` : name.trim());
            (api.createProject as (input: Record<string, unknown>) => Promise<import("./types").Project>)({
              name: name.trim(),
              project_path: project_path ?? "",
              core_goal: resolvedGoal,
              category_id: categoryId ?? undefined,
              create_path_if_missing: true,
            })
              .then(async (newProject) => {
                if (agentIds.length > 0) {
                  const { addProjectAgent } = await import("./api/categories-dashboard");
                  await Promise.all(agentIds.map((id) => addProjectAgent(newProject.id, id).catch(() => {})));
                }
                setProjects((prev) => [...prev, newProject]);
                setCurrentProjectId(newProject.id);
                setShowProjectCreate(false);
                setShowCreateTaskAfterCreate(true);
              })
              .catch((err) => console.error("Project create failed:", err))
              .finally(() => setProjectCreateBusy(false));
          }}
          onGitHubComplete={(projectId) => {
            import("./api/organization-projects").then(({ getProjectDetail }) => {
              getProjectDetail(projectId)
                .then((detail) => {
                  setProjects((prev) => [...prev, detail.project]);
                  setCurrentProjectId(detail.project.id);
                  setShowProjectCreate(false);
                })
                .catch((err) => console.error("GitHub project fetch failed:", err));
            });
          }}
          onClose={() => setShowProjectCreate(false)}
        />
      )}
      {showCreateTaskAfterCreate && currentProject && (
        <CreateTaskModal
          agents={agents}
          departments={departments}
          onClose={() => setShowCreateTaskAfterCreate(false)}
          onCreate={(input) => {
            void actions.handleCreateTask({
              ...input,
              project_id: currentProject.id,
              project_path: currentProject.project_path ?? undefined,
            });
            setShowCreateTaskAfterCreate(false);
          }}
          onAssign={async (taskId, agentId) => { await actions.handleAssignTask(taskId, agentId); }}
          defaultProjectId={currentProject.id}
        />
      )}
      {showCreateTask && (
        <CreateTaskModal
          agents={agents}
          departments={departments}
          onClose={() => setShowCreateTask(false)}
          onCreate={(input) => {
            void actions.handleCreateTask({
              ...input,
              project_id: currentProject?.id,
              project_path: currentProject?.project_path ?? undefined,
            });
            setShowCreateTask(false);
          }}
          onAssign={async (taskId, agentId) => { await actions.handleAssignTask(taskId, agentId); }}
          defaultProjectId={currentProject?.id}
        />
      )}
    </Desktop>
  );
}
