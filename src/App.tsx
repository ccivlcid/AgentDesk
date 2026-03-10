import { useState, useRef, useCallback, useEffect } from "react";
import type { DecisionInboxItem } from "./components/chat/decision-inbox";
import { useWebSocket } from "./hooks/useWebSocket";
import type {
  Department,
  Agent,
  Task,
  Message,
  CompanyStats,
  CompanySettings,
  CliStatusMap,
  SubTask,
  MeetingPresence,
  SubAgent,
  CrossDeptDelivery,
  CeoOfficeCall,
  Category,
  Project,
} from "./types";
import type { TaskReportDetail } from "./api";
import * as api from "./api";
import { detectBrowserLanguage } from "./i18n";
import { useTheme } from "./ThemeContext";
import { UPDATE_BANNER_DISMISS_STORAGE_KEY } from "./app/constants";
import {
  detectRuntimeOs,
  isForceUpdateBannerEnabled,
  mergeSettingsWithDefaults,
} from "./app/utils";
import type { OAuthCallbackResult, RuntimeOs, TaskPanelTab, View } from "./app/types";
import { useRealtimeSync } from "./app/useRealtimeSync";
import { useAppLabels } from "./app/useAppLabels";
import AppLoadingScreen from "./app/AppLoadingScreen";
import AppMainLayout from "./app/AppMainLayout";
import AppOverlays from "./app/AppOverlays";
import ProjectCreateModal from "./components/project-create-modal/ProjectCreateModal";
import { useAppActions } from "./app/useAppActions";
import { useActiveMeetingTaskId } from "./app/useActiveMeetingTaskId";
import { useUpdateStatusPolling } from "./app/useUpdateStatusPolling";
import { useAppViewEffects } from "./app/useAppViewEffects";
import { useAppBootstrapData } from "./app/useAppBootstrapData";
import { useLiveSyncScheduler } from "./app/useLiveSyncScheduler";

export type { OAuthCallbackResult } from "./app/types";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  const [view, setView] = useState<View>("office");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [libraryAgents, setLibraryAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [settings, setSettings] = useState<CompanySettings>(() =>
    mergeSettingsWithDefaults({ language: detectBrowserLanguage() }),
  );
  const [cliStatus, setCliStatus] = useState<CliStatusMap | null>(null);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatAgent, setChatAgent] = useState<Agent | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [taskPanel, setTaskPanel] = useState<{ taskId: string; tab: TaskPanelTab } | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadAgentIds, setUnreadAgentIds] = useState<Set<string>>(new Set());
  const [crossDeptDeliveries, setCrossDeptDeliveries] = useState<CrossDeptDelivery[]>([]);
  const [ceoOfficeCalls, setCeoOfficeCalls] = useState<CeoOfficeCall[]>([]);
  const [meetingPresence, setMeetingPresence] = useState<MeetingPresence[]>([]);
  const [oauthResult, setOauthResult] = useState<OAuthCallbackResult | null>(null);
  const [taskReport, setTaskReport] = useState<TaskReportDetail | null>(null);
  const [showReportHistory, setShowReportHistory] = useState(false);
  const [showAgentStatus, setShowAgentStatus] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [showDecisionInbox, setShowDecisionInbox] = useState(false);
  const [decisionInboxLoading, setDecisionInboxLoading] = useState(false);
  const [decisionInboxItems, setDecisionInboxItems] = useState<DecisionInboxItem[]>([]);
  const [decisionReplyBusyKey, setDecisionReplyBusyKey] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);
  const [runtimeOs] = useState<RuntimeOs>(() => detectRuntimeOs());
  const [forceUpdateBanner] = useState<boolean>(() => isForceUpdateBannerEnabled());
  const [updateStatus, setUpdateStatus] = useState<api.UpdateStatus | null>(null);
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(UPDATE_BANNER_DISMISS_STORAGE_KEY) ?? "";
  });
  const [streamingMessage, setStreamingMessage] = useState<{
    message_id: string;
    agent_id: string;
    agent_name: string;
    agent_avatar: string;
    content: string;
  } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectCreate, setShowProjectCreate] = useState(false);
  const [projectCreateBusy, setProjectCreateBusy] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    try { return window.localStorage.getItem("agentdesk_current_project") ?? null; } catch { return null; }
  });

  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  useEffect(() => {
    if (currentProjectId) {
      try { window.localStorage.setItem("agentdesk_current_project", currentProjectId); } catch { /* ignore */ }
    }
  }, [currentProjectId]);

  const viewRef = useRef<View>("office");
  viewRef.current = view;
  const agentsRef = useRef<Agent[]>(agents);
  agentsRef.current = agents;
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;
  const subAgentsRef = useRef<SubAgent[]>(subAgents);
  subAgentsRef.current = subAgents;
  const codexThreadToSubAgentIdRef = useRef<Map<string, string>>(new Map());
  const codexThreadBindingTsRef = useRef<Map<string, number>>(new Map());
  const subAgentStreamTailRef = useRef<Map<string, string>>(new Map());
  const activeChatRef = useRef<{ showChat: boolean; agentId: string | null }>({ showChat: false, agentId: null });
  activeChatRef.current = { showChat, agentId: chatAgent?.id ?? null };

  const { connected, on } = useWebSocket();
  const shouldIncludeSeedAgents = useCallback(() => false, []);
  const scheduleLiveSync = useLiveSyncScheduler({
    setTasks,
    setAgents,
    setStats,
    setDecisionInboxItems,
    shouldIncludeSeedAgents,
  });

  useAppBootstrapData({
    setDepartments,
    setAgents,
    setLibraryAgents,
    setTasks,
    setStats,
    setSettings,
    setSubtasks,
    setMeetingPresence,
    setDecisionInboxItems,
    setCategories,
    setProjects,
    setLoading,
  });

  useUpdateStatusPolling(setUpdateStatus);
  useAppViewEffects({
    view,
    cliStatus,
    setView,
    setOauthResult,
    setCliStatus,
    setMobileNavOpen,
    setMeetingPresence,
  });

  useRealtimeSync({
    on,
    scheduleLiveSync,
    agentsRef,
    tasksRef,
    subAgentsRef,
    viewRef,
    activeChatRef,
    codexThreadToSubAgentIdRef,
    codexThreadBindingTsRef,
    subAgentStreamTailRef,
    setAgents,
    setMessages,
    setUnreadAgentIds,
    setTaskReport,
    setCrossDeptDeliveries,
    setCeoOfficeCalls,
    setMeetingPresence,
    setSubtasks,
    setSubAgents,
    setStreamingMessage,
  });

  const actions = useAppActions({
    agents,
    settings,
    scheduleLiveSync,
    setSettings,
    setAgents,
    setLibraryAgents,
    setDepartments,
    setTasks,
    setStats,
    setMessages,
    setChatAgent,
    setShowChat,
    setUnreadAgentIds,
    setShowDecisionInbox,
    setDecisionInboxLoading,
    setDecisionInboxItems,
    setDecisionReplyBusyKey,
    setCliStatus,
  });

  const activeMeetingTaskId = useActiveMeetingTaskId(meetingPresence);

  const labels = useAppLabels({
    view,
    settings,
    theme,
    runtimeOs,
    forceUpdateBanner,
    updateStatus,
    dismissedUpdateVersion,
  });

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
          agents.find((agent) => agent.department_id === department.id && agent.role === "team_leader") ??
          (department.id === "planning"
            ? agents.find(
                (agent) => agent.role === "team_leader" && Number(agent.acts_as_planning_leader ?? 0) === 1,
              )
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
        const latest = labels.effectiveUpdateStatus?.latest_version ?? "";
        setDismissedUpdateVersion(latest);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(UPDATE_BANNER_DISMISS_STORAGE_KEY, latest);
        }
      }}
      projects={projects}
      categories={categories}
      currentProject={currentProject}
      onProjectSelect={setCurrentProjectId}
      onProjectCreate={() => setShowProjectCreate(true)}
    >
      <AppOverlays
        showChat={showChat}
        chatAgent={chatAgent}
        messages={messages}
        agents={agents}
        groupChatAgents={agents}
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
        onRefreshDecisionInbox={() => {
          void actions.loadDecisionInbox();
        }}
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
          api
            .getSettings()
            .then(async (nextSettingsRaw) => {
              const nextSettings = mergeSettingsWithDefaults(nextSettingsRaw);
              const [nextAgents, nextLibraryAgents] = await Promise.all([
                api.getAgents({ includeSeed: false }),
                api.getAgents({ includeSeed: true }),
              ]);
              setAgents(nextAgents);
              setLibraryAgents(nextLibraryAgents);
              setSettings(nextSettings);

              if (!selectedAgent) return;
              const fromAgents = nextAgents.find((agent) => agent.id === selectedAgent.id);
              if (fromAgents) {
                setSelectedAgent(fromAgents);
              }
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
        onCloseGroupChat={() => setShowGroupChat(false)}
      />
      {showProjectCreate && (
        <ProjectCreateModal
          categories={categories}
          onConfirm={({ name, categoryId, project_path, core_goal }) => {
            if (projectCreateBusy) return;
            setProjectCreateBusy(true);
            const cat = categories.find((c) => c.id === categoryId);
            const resolvedGoal = core_goal || (cat ? `${cat.name_ko ?? cat.name} 프로젝트` : name.trim());
            (api.createProject as (input: Record<string, unknown>) => Promise<Project>)({
              name: name.trim(),
              project_path: project_path ?? "",
              core_goal: resolvedGoal,
              category_id: categoryId ?? undefined,
              create_path_if_missing: true,
            })
              .then((newProject) => {
                setProjects((prev) => [...prev, newProject]);
                setCurrentProjectId(newProject.id);
                setShowProjectCreate(false);
              })
              .catch((err) => console.error("Project create failed:", err))
              .finally(() => setProjectCreateBusy(false));
          }}
          onClose={() => setShowProjectCreate(false)}
        />
      )}
    </AppMainLayout>
  );
}
