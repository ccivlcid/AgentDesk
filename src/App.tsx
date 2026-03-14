import { useRef, useCallback, useEffect, useMemo } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import * as api from "./api";
import { useTheme } from "./ThemeContext";
import { useAppLabels } from "./app/useAppLabels";
import AppLoadingScreen from "./app/AppLoadingScreen";
import AppMainLayout from "./app/AppMainLayout";
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
  const viewRef = useRef(view);
  viewRef.current = view;
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const subAgentsRef = useRef(subAgents);
  subAgentsRef.current = subAgents;
  const codexThreadToSubAgentIdRef = useRef<Map<string, string>>(new Map());
  const codexThreadBindingTsRef = useRef<Map<string, number>>(new Map());
  const subAgentStreamTailRef = useRef<Map<string, string>>(new Map());
  const activeChatRef = useRef({ showChat, agentId: chatAgent?.id ?? null });
  activeChatRef.current = { showChat, agentId: chatAgent?.id ?? null };

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { connected, on } = useWebSocket();
  const shouldIncludeSeedAgents = useCallback(() => false, []);
  const scheduleLiveSync = useLiveSyncScheduler({
    setTasks, setAgents, setStats, setDecisionInboxItems, shouldIncludeSeedAgents,
  });

  useAppBootstrapData({
    setDepartments, setAgents, setLibraryAgents, setTasks, setStats,
    setSettings, setSubtasks, setMeetingPresence, setDecisionInboxItems,
    setCategories, setProjects, setLoading,
  });

  useUpdateStatusPolling(setUpdateStatus);
  useAppViewEffects({ view, cliStatus, setView, setOauthResult, setCliStatus, setMobileNavOpen });

  useRealtimeSync({
    on, connected, scheduleLiveSync,
    agentsRef, tasksRef, subAgentsRef, viewRef, activeChatRef,
    codexThreadToSubAgentIdRef, codexThreadBindingTsRef, subAgentStreamTailRef,
    setTasks, setAgents, setMessages, setUnreadAgentIds, setTaskReport,
    setCrossDeptDeliveries, setClientOfficeCalls, setMeetingPresence,
    setSubtasks, setSubAgents, setStreamingMessage,
  });

  const actions = useAppActions({
    agents, settings, scheduleLiveSync,
    setSettings, setAgents, setLibraryAgents, setDepartments, setTasks, setStats,
    setMessages, setChatAgent, setShowChat, setUnreadAgentIds,
    setShowDecisionInbox, setDecisionInboxLoading, setDecisionInboxItems,
    setDecisionReplyBusyKey, setCliStatus,
  });

  const activeMeetingTaskId = useActiveMeetingTaskId(meetingPresence);

  const labels = useAppLabels({
    view, settings, theme, runtimeOs, forceUpdateBanner, updateStatus, dismissedUpdateVersion,
  });

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLoadingScreen language={labels.uiLanguage} title={labels.loadingTitle} subtitle={labels.loadingSubtitle} />
    );
  }

  const agentsForLibraries = libraryAgents.length > 0 ? libraryAgents : agents;

  return (
    <AppMainLayout
      connected={connected}
      on={on}
      view={view}
      setView={setView}
      departments={departments}
      agents={agents}
      libraryAgents={agentsForLibraries}
      stats={stats}
      tasks={tasks}
      subtasks={subtasks}
      settings={settings}
      cliStatus={cliStatus}
      oauthResult={oauthResult}
      labels={labels}
      mobileNavOpen={mobileNavOpen}
      setMobileNavOpen={setMobileNavOpen}
      mobileHeaderMenuOpen={mobileHeaderMenuOpen}
      setMobileHeaderMenuOpen={setMobileHeaderMenuOpen}
      theme={theme}
      toggleTheme={toggleTheme}
      decisionInboxLoading={decisionInboxLoading}
      decisionInboxCount={decisionInboxItems.length}
      unreadAgentIds={unreadAgentIds}
      onSelectAgent={setSelectedAgent}
      onSelectDepartment={(department) => {
        const leader =
          agents.find((a) => a.department_id === department.id && a.role === "team_leader") ??
          (department.id === "planning"
            ? agents.find((a) => a.role === "team_leader" && Number(a.acts_as_planning_leader ?? 0) === 1)
            : undefined);
        if (leader) actions.handleOpenChat(leader);
      }}
      onCreateTask={actions.handleCreateTask}
      onUpdateTask={actions.handleUpdateTask}
      onDeleteTask={actions.handleDeleteTask}
      onAssignTask={actions.handleAssignTask}
      onRunTask={actions.handleRunTask}
      onStopTask={actions.handleStopTask}
      onPauseTask={actions.handlePauseTask}
      onResumeTask={actions.handleResumeTask}
      onOpenTerminal={(taskId) => setTaskPanel({ taskId, tab: "terminal" })}
      onOpenMeetingMinutes={(taskId) => setTaskPanel({ taskId, tab: "minutes" })}
      onAgentsChange={actions.handleAgentsChange}
      onSaveSettings={actions.handleSaveSettings}
      onRefreshCli={actions.handleRefreshCli}
      onOauthResultClear={() => setOauthResult(null)}
      onOpenDecisionInbox={actions.handleOpenDecisionInbox}
      onOpenAgentStatus={() => setShowAgentStatus(true)}
      onOpenReportHistory={() => setShowReportHistory(true)}
      onOpenAnnouncement={actions.handleOpenAnnouncement}
      onOpenGroupChat={() => setShowGroupChat(true)}
      onDismissAutoUpdateNotice={actions.handleDismissAutoUpdateNotice}
      onDismissUpdate={() => {
        setDismissedUpdateVersion(labels.effectiveUpdateStatus?.latest_version ?? "");
      }}
      projects={projects}
      categories={categories}
      currentProject={currentProject}
      onProjectSelect={setCurrentProjectId}
      onProjectCreate={() => setShowProjectCreate(true)}
      onProjectDelete={(id) => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (currentProjectId === id) setCurrentProjectId(null);
      }}
      onProjectUpdated={(id, patch) => {
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      }}
      subAgents={subAgents}
      crossDeptDeliveries={crossDeptDeliveries}
      meetingPresences={meetingPresence}
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
          setView("tasks-board");
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
        showReportHistory={showReportHistory}
        onCloseReportHistory={() => setShowReportHistory(false)}
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
    </AppMainLayout>
  );
}
