import { useCallback, useMemo, type ReactNode, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NotificationCenter from "../components/NotificationCenter";
import Sidebar from "../components/Sidebar";
import OfficeView from "../components/OfficeView";
import CliUsagePanel from "../components/office-view/CliUsagePanel";
import { useCliUsage } from "../components/office-view/useCliUsage";
import Dashboard from "../components/Dashboard";
import TaskBoard from "../components/TaskBoard";
import Deliverables from "../components/deliverables/Deliverables";
import AgentManager from "../components/AgentManager";
import HeartbeatPanel from "../components/office-view/HeartbeatPanel";
import ScheduledTasksPanel from "../components/scheduled-tasks/ScheduledTasksPanel";
const SkillsLibrary     = lazy(() => import("../components/SkillsLibrary"));
const AgentRulesLibrary = lazy(() => import("../components/AgentRulesLibrary"));
const MemoryLibrary     = lazy(() => import("../components/MemoryLibrary"));
const HooksLibrary      = lazy(() => import("../components/HooksLibrary"));
const SettingsPanel     = lazy(() => import("../components/SettingsPanel"));
const GameRoom          = lazy(() => import("../components/GameRoom"));
import { I18nProvider, useI18n } from "../i18n";
import type {
  Agent,
  CeoOfficeCall,
  CliStatusMap,
  CompanyStats,
  CompanySettings,
  CrossDeptDelivery,
  Department,
  MeetingPresence,
  SubAgent,
  SubTask,
  Task,
  WorkflowPackKey,
  WSEventType,
} from "../types";
import type { UpdateStatus } from "../api";
import type { OAuthCallbackResult, RoomThemeMap, View } from "./types";
import AppHeaderBar from "./AppHeaderBar";
import {
  buildOfficePackStarterAgents,
  buildOfficePackPresentation,
  getOfficePackRoomThemes,
  listOfficePackOptions,
  normalizeOfficeWorkflowPack,
  resolveOfficePackSeedProvider,
} from "./office-workflow-pack";
import { resolvePackAgentViews, resolvePackDepartmentsForDisplay } from "./office-pack-display";
import { applyOfficePackToTaskInput, filterTasksByOfficePack, type TaskCreateInput } from "./task-workflow-pack";
import type { UiLanguage } from "../i18n";
import type { CliUsageEntry } from "../api";

/** CLI 사용량 전용 페이지: useI18n으로 t를 주입해 CliUsagePanel 렌더 */
function CliUsagePage({
  cliStatus,
  cliUsage,
  language,
  refreshing,
  onRefreshUsage,
}: {
  cliStatus: CliStatusMap | null;
  cliUsage: Record<string, CliUsageEntry> | null;
  language: UiLanguage;
  refreshing: boolean;
  onRefreshUsage: () => void;
}) {
  const { t } = useI18n();
  return (
    <CliUsagePanel
      cliStatus={cliStatus}
      cliUsage={cliUsage}
      language={language}
      refreshing={refreshing}
      onRefreshUsage={onRefreshUsage}
      t={t}
    />
  );
}

interface AppMainLayoutLabels {
  uiLanguage: string;
  viewTitle: string;
  announcementLabel: string;
  groupChatLabel: string;
  roomManagerLabel: string;
  roomManagerDepartments: { id: string; name: string }[];
  reportLabel: string;
  tasksPrimaryLabel: string;
  agentStatusLabel: string;
  decisionLabel: string;
  autoUpdateNoticeVisible: boolean;
  autoUpdateNoticeTitle: string;
  autoUpdateNoticeHint: string;
  autoUpdateNoticeActionLabel: string;
  autoUpdateNoticeContainerClass: string;
  autoUpdateNoticeTextClass: string;
  autoUpdateNoticeHintClass: string;
  autoUpdateNoticeButtonClass: string;
  effectiveUpdateStatus: UpdateStatus | null;
  updateBannerVisible: boolean;
  updateReleaseUrl: string;
  updateTitle: string;
  updateHint: string;
  updateReleaseLabel: string;
  updateDismissLabel: string;
  updateTestModeHint: string;
}

interface AppMainLayoutProps {
  connected: boolean;
  on: (event: WSEventType, handler: (payload: unknown) => void) => () => void;
  view: View;
  setView: (view: View) => void;
  departments: Department[];
  agents: Agent[];
  /** 도서관(에이전트룰/메모리/훅)용 전체 에이전트(시드 포함). 오피스팩 변경 시 학습된 에이전트 표시가 바뀌지 않도록 함. */
  libraryAgents: Agent[];
  stats: CompanyStats | null;
  tasks: Task[];
  subtasks: SubTask[];
  subAgents: SubAgent[];
  meetingPresence: MeetingPresence[];
  settings: CompanySettings;
  cliStatus: CliStatusMap | null;
  oauthResult: OAuthCallbackResult | null;
  labels: AppMainLayoutLabels;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  mobileHeaderMenuOpen: boolean;
  setMobileHeaderMenuOpen: (open: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  decisionInboxLoading: boolean;
  decisionInboxCount: number;
  activeMeetingTaskId: string | null;
  unreadAgentIds: Set<string>;
  crossDeptDeliveries: CrossDeptDelivery[];
  ceoOfficeCalls: CeoOfficeCall[];
  customRoomThemes: RoomThemeMap;
  activeRoomThemeTargetId: string | null;
  onCrossDeptDeliveryProcessed: (id: string) => void;
  onCeoOfficeCallProcessed: (id: string) => void;
  onOpenActiveMeetingMinutes: (taskId: string) => void;
  onSelectAgent: (agent: Agent) => void;
  onSelectDepartment: (department: Department) => void;
  onCreateTask: (input: {
    title: string;
    description?: string;
    department_id?: string;
    task_type?: string;
    priority?: number;
    project_id?: string;
    project_path?: string;
    assigned_agent_id?: string;
    workflow_pack_key?: WorkflowPackKey;
    workflow_meta_json?: string;
  }) => Promise<void>;
  onUpdateTask: (id: string, data: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAssignTask: (taskId: string, agentId: string) => Promise<void>;
  onRunTask: (id: string) => Promise<void>;
  onStopTask: (id: string) => Promise<void>;
  onPauseTask: (id: string) => Promise<void>;
  onResumeTask: (id: string) => Promise<void>;
  onOpenTerminal: (taskId: string) => void;
  onOpenMeetingMinutes: (taskId: string) => void;
  onAgentsChange: () => void;
  activeOfficeWorkflowPack: WorkflowPackKey;
  onChangeOfficeWorkflowPack: (packKey: WorkflowPackKey) => void;
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onRefreshCli: () => Promise<void>;
  onOauthResultClear: () => void;
  onOpenDecisionInbox: () => void;
  onOpenAgentStatus: () => void;
  onOpenReportHistory: () => void;
  onOpenAnnouncement: () => void;
  onOpenGroupChat: () => void;
  onOpenRoomManager: () => void;
  onDismissAutoUpdateNotice: () => Promise<void>;
  onDismissUpdate: () => void;
  officePackBootstrappingLabel?: string | null;
  children?: ReactNode;
}

export default function AppMainLayout({
  connected,
  on,
  view,
  setView,
  departments,
  agents,
  libraryAgents,
  stats,
  tasks,
  subtasks,
  subAgents,
  meetingPresence,
  settings,
  cliStatus,
  oauthResult,
  labels,
  mobileNavOpen,
  setMobileNavOpen,
  mobileHeaderMenuOpen,
  setMobileHeaderMenuOpen,
  theme,
  toggleTheme,
  decisionInboxLoading,
  decisionInboxCount,
  activeMeetingTaskId,
  unreadAgentIds,
  crossDeptDeliveries,
  ceoOfficeCalls,
  customRoomThemes,
  activeRoomThemeTargetId,
  onCrossDeptDeliveryProcessed,
  onCeoOfficeCallProcessed,
  onOpenActiveMeetingMinutes,
  onSelectAgent,
  onSelectDepartment,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onAssignTask,
  onRunTask,
  onStopTask,
  onPauseTask,
  onResumeTask,
  onOpenTerminal,
  onOpenMeetingMinutes,
  onAgentsChange,
  activeOfficeWorkflowPack,
  onChangeOfficeWorkflowPack,
  onSaveSettings,
  onRefreshCli,
  onOauthResultClear,
  onOpenDecisionInbox,
  onOpenAgentStatus,
  onOpenReportHistory,
  onOpenAnnouncement,
  onOpenGroupChat,
  onOpenRoomManager,
  onDismissAutoUpdateNotice,
  onDismissUpdate,
  officePackBootstrappingLabel,
  children,
}: AppMainLayoutProps) {
  const uiLanguage =
    labels.uiLanguage === "ko" || labels.uiLanguage === "ja" || labels.uiLanguage === "zh" ? labels.uiLanguage : "en";
  const officePackKey = normalizeOfficeWorkflowPack(activeOfficeWorkflowPack);
  const officePackOptions = useMemo(() => listOfficePackOptions(uiLanguage), [uiLanguage]);
  const officePackLabel =
    labels.uiLanguage === "ko"
      ? "오피스 팩"
      : labels.uiLanguage === "ja"
        ? "オフィスパック"
        : labels.uiLanguage === "zh"
          ? "办公室包"
          : "Office Pack";
  const officePackBootstrappingMessage = useMemo(() => {
    if (!officePackBootstrappingLabel) return null;
    if (uiLanguage === "ko") return `${officePackBootstrappingLabel} 오피스 팩 배치중...`;
    if (uiLanguage === "ja") return `${officePackBootstrappingLabel} オフィスパックを配置中...`;
    if (uiLanguage === "zh") return `${officePackBootstrappingLabel} 办公室包部署中...`;
    return `Deploying ${officePackBootstrappingLabel} office pack...`;
  }, [officePackBootstrappingLabel, uiLanguage]);
  const generatedOfficePresentation = useMemo(
    () =>
      buildOfficePackPresentation({
        packKey: officePackKey,
        locale: uiLanguage,
        departments,
        agents,
        customRoomThemes,
      }),
    [officePackKey, uiLanguage, departments, agents, customRoomThemes],
  );

  const activePackProfile =
    officePackKey === "development" ? null : (settings.officePackProfiles?.[officePackKey] ?? null);

  const seededPackAgents = useMemo(() => {
    if (officePackKey === "development") return [] as Agent[];
    if (activePackProfile?.agents?.length) return activePackProfile.agents;
    const drafts = buildOfficePackStarterAgents({
      packKey: officePackKey,
      departments: generatedOfficePresentation.departments,
      targetCount: 8,
      locale: uiLanguage,
    });
    const now = Date.now();
    return drafts.map((draft, index) => ({
      id: `${officePackKey}-seed-${index + 1}`,
      name: draft.name,
      name_ko: draft.name_ko,
      name_ja: draft.name_ja,
      name_zh: draft.name_zh,
      department_id: draft.department_id,
      role: draft.role,
      acts_as_planning_leader: draft.acts_as_planning_leader,
      cli_provider: resolveOfficePackSeedProvider({
        packKey: officePackKey,
        departmentId: draft.department_id,
        role: draft.role,
        seedIndex: index + 1,
        seedOrderInDepartment: draft.seed_order_in_department,
      }),
      avatar_emoji: draft.avatar_emoji,
      sprite_number: draft.sprite_number,
      personality: draft.personality,
      status: "idle" as const,
      current_task_id: null,
      stats_tasks_done: 0,
      stats_xp: 0,
      created_at: now,
    }));
  }, [activePackProfile?.agents, generatedOfficePresentation.departments, officePackKey, uiLanguage]);

  const packProfileDepartments =
    officePackKey === "development"
      ? null
      : (activePackProfile?.departments ?? generatedOfficePresentation.departments);
  const packProfileAgents = officePackKey === "development" ? null : (activePackProfile?.agents ?? seededPackAgents);

  const isHydratedOfficePack = useMemo(() => {
    if (officePackKey === "development") return false;
    const hydrated = settings.officePackHydratedPacks;
    if (!Array.isArray(hydrated)) return false;
    return hydrated.map((value) => String(value ?? "").trim()).includes(officePackKey);
  }, [officePackKey, settings.officePackHydratedPacks]);

  const displayDepartments = useMemo(
    () =>
      resolvePackDepartmentsForDisplay({
        packKey: officePackKey,
        globalDepartments: departments,
        packDepartments: packProfileDepartments,
        preferPackProfile: !isHydratedOfficePack,
      }),
    [departments, isHydratedOfficePack, officePackKey, packProfileDepartments],
  );

  const { scopedAgents: officeScopedAgents, mergedAgents: displayAgents } = useMemo(
    () =>
      resolvePackAgentViews({
        packKey: officePackKey,
        globalAgents: agents,
        packAgents: packProfileAgents,
      }),
    [agents, officePackKey, packProfileAgents],
  );

  const managerDepartments =
    officePackKey === "development"
      ? departments
      : isHydratedOfficePack
        ? displayDepartments
        : (activePackProfile?.departments ?? generatedOfficePresentation.departments);

  const managerAgents =
    officePackKey === "development"
      ? agents
      : isHydratedOfficePack
        ? officeScopedAgents
        : (activePackProfile?.agents ?? seededPackAgents);

  const officePresentation = useMemo(() => {
    if (officePackKey === "development") return generatedOfficePresentation;
    return {
      departments: displayDepartments,
      agents: officeScopedAgents,
      roomThemes: {
        ...customRoomThemes,
        ...getOfficePackRoomThemes(officePackKey),
      },
    };
  }, [customRoomThemes, displayDepartments, generatedOfficePresentation, officePackKey, officeScopedAgents]);

  const tasksForActivePack = useMemo(() => filterTasksByOfficePack(tasks, officePackKey), [tasks, officePackKey]);
  const { cliStatus: cliStatusFromUsage, cliUsage, cliUsageRef, refreshing: cliUsageRefreshing, handleRefreshUsage } =
    useCliUsage(tasks, view);
  const handleCreateTaskForActivePack = useCallback(
    async (input: TaskCreateInput) => {
      await onCreateTask(applyOfficePackToTaskInput(input, officePackKey));
    },
    [onCreateTask, officePackKey],
  );

  return (
    <I18nProvider language={labels.uiLanguage}>
      <div className="app-shell flex h-[100dvh] min-h-[100dvh] overflow-hidden">
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar
            currentView={view}
            onChangeView={setView}
            departments={officePresentation.departments}
            agents={officePresentation.agents}
            settings={settings}
            connected={connected}
          />
        </div>

        {mobileNavOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
          }`}
        >
          <Sidebar
            currentView={view}
            onChangeView={(nextView) => {
              setView(nextView);
              setMobileNavOpen(false);
            }}
            departments={officePresentation.departments}
            agents={officePresentation.agents}
            settings={settings}
            connected={connected}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <AppHeaderBar
            currentView={view}
            connected={connected}
            viewTitle={labels.viewTitle}
            tasksPrimaryLabel={labels.tasksPrimaryLabel}
            decisionLabel={labels.decisionLabel}
            decisionInboxLoading={decisionInboxLoading}
            decisionInboxCount={decisionInboxCount}
            agentStatusLabel={labels.agentStatusLabel}
            reportLabel={labels.reportLabel}
            announcementLabel={labels.announcementLabel}
            groupChatLabel={labels.groupChatLabel}
            roomManagerLabel={labels.roomManagerLabel}
            notificationSlot={
              <NotificationCenter
                on={on}
                onNavigateTask={(taskId) => {
                  setView("tasks-board");
                }}
              />
            }
            theme={theme}
            mobileHeaderMenuOpen={mobileHeaderMenuOpen}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenTasks={() => setView("tasks-board")}
            onOpenDecisionInbox={onOpenDecisionInbox}
            onOpenAgentStatus={onOpenAgentStatus}
            onOpenReportHistory={onOpenReportHistory}
            onOpenAnnouncement={onOpenAnnouncement}
            onOpenGroupChat={onOpenGroupChat}
            onOpenRoomManager={onOpenRoomManager}
            officePackControl={{
              label: officePackLabel,
              value: officePackKey,
              options: officePackOptions,
              onChange: onChangeOfficeWorkflowPack,
            }}
            onToggleTheme={toggleTheme}
            onToggleMobileHeaderMenu={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
            onCloseMobileHeaderMenu={() => setMobileHeaderMenuOpen(false)}
          />

          {officePackBootstrappingMessage && (
            <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 sm:px-4 lg:px-6">
              <div className="text-xs font-medium text-emerald-100">{officePackBootstrappingMessage}</div>
            </div>
          )}

          {labels.autoUpdateNoticeVisible && (
            <div className={labels.autoUpdateNoticeContainerClass}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className={labels.autoUpdateNoticeTextClass}>
                  <div className="font-medium">{labels.autoUpdateNoticeTitle}</div>
                  <div className={labels.autoUpdateNoticeHintClass}>{labels.autoUpdateNoticeHint}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void onDismissAutoUpdateNotice();
                    }}
                    className={labels.autoUpdateNoticeButtonClass}
                  >
                    {labels.autoUpdateNoticeActionLabel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {labels.updateBannerVisible && labels.effectiveUpdateStatus && (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2.5 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-xs text-amber-100">
                  <div className="font-medium">{labels.updateTitle}</div>
                  <div className="mt-0.5 text-[11px] text-amber-200/90">{labels.updateHint}</div>
                  {labels.updateTestModeHint && (
                    <div className="mt-0.5 text-[11px] text-amber-300/90">{labels.updateTestModeHint}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={labels.updateReleaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border px-2.5 py-1 text-[11px] transition hover:opacity-80"
                    style={{ borderRadius: "2px", borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}
                  >
                    {labels.updateReleaseLabel}
                  </a>
                  <button
                    type="button"
                    onClick={onDismissUpdate}
                    className="px-2.5 py-1 text-[11px] font-mono transition"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                  >
                    {labels.updateDismissLabel}
                  </button>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
          {view === "office" ? (
            <motion.div
              key="office"
              className="flex-1 min-h-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.1, ease: "linear" } }}
              exit={{ opacity: 0, transition: { duration: 0.06 } }}
            >
              <OfficeView
                departments={officePresentation.departments}
                agents={officePresentation.agents}
                tasks={tasks}
                subAgents={subAgents}
                meetingPresence={meetingPresence}
                activeMeetingTaskId={activeMeetingTaskId}
                unreadAgentIds={unreadAgentIds}
                crossDeptDeliveries={crossDeptDeliveries}
                onCrossDeptDeliveryProcessed={onCrossDeptDeliveryProcessed}
                ceoOfficeCalls={ceoOfficeCalls}
                onCeoOfficeCallProcessed={onCeoOfficeCallProcessed}
                onOpenActiveMeetingMinutes={onOpenActiveMeetingMinutes}
                customDeptThemes={officePresentation.roomThemes}
                themeHighlightTargetId={activeRoomThemeTargetId}
                onSelectAgent={onSelectAgent}
                onSelectDepartment={onSelectDepartment}
                cliStatus={cliStatusFromUsage}
                cliUsage={cliUsage}
                cliUsageRef={cliUsageRef}
                cliUsageRefreshing={cliUsageRefreshing}
                onRefreshCliUsage={handleRefreshUsage}
                onOpenRoomManager={onOpenRoomManager}
              />
            </motion.div>
          ) : (
            <motion.div
              key={view}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.1, ease: "linear" } }}
              exit={{ opacity: 0, transition: { duration: 0.06 } }}
            >
              <div className="p-3 sm:p-4 lg:p-6">
            {view === "cli-usage" && (
              <div className="mx-auto max-w-4xl px-4 py-6">
                <CliUsagePage
                  cliStatus={cliStatus ?? cliStatusFromUsage}
                  cliUsage={cliUsage}
                  language={labels.uiLanguage as "ko" | "en" | "ja" | "zh"}
                  refreshing={cliUsageRefreshing}
                  onRefreshUsage={handleRefreshUsage}
                />
              </div>
            )}

            {view === "dashboard" && (
              <Dashboard
                stats={stats}
                agents={displayAgents}
                tasks={tasks}
                companyName={settings.companyName}
                onPrimaryCtaClick={() => setView("tasks-board")}
              />
            )}

            {(view === "tasks" || view === "tasks-board") && (
              <TaskBoard
                tasks={tasksForActivePack}
                agents={displayAgents}
                projectManagerAgents={agents}
                departments={displayDepartments}
                subtasks={subtasks}
                onCreateTask={handleCreateTaskForActivePack}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onAssignTask={onAssignTask}
                onRunTask={onRunTask}
                onStopTask={onStopTask}
                onPauseTask={onPauseTask}
                onResumeTask={onResumeTask}
                onOpenTerminal={onOpenTerminal}
                onOpenMeetingMinutes={onOpenMeetingMinutes}
                activeWorkflowPackKey={officePackKey}
              />
            )}

            {view === "tasks-deliverables" && (
              <Deliverables agents={displayAgents} />
            )}

            {view === "tasks-scheduled" && (
              <ScheduledTasksPanel agents={displayAgents} />
            )}

            {view === "agents" && (
              <AgentManager
                agents={managerAgents}
                departments={managerDepartments}
                onAgentsChange={onAgentsChange}
                activeOfficeWorkflowPack={officePackKey}
                dbBackedOfficePack={isHydratedOfficePack}
                onSaveOfficePackProfile={async (packKey, profile) => {
                  if (packKey === "development") return;
                  await onSaveSettings({
                    ...settings,
                    officePackProfiles: {
                      ...(settings.officePackProfiles ?? {}),
                      [packKey]: profile,
                    },
                  });
                }}
              />
            )}

            {view === "heartbeat" && (
              <HeartbeatPanel
                language={labels.uiLanguage as "ko" | "en" | "ja" | "zh"}
                agents={managerAgents.map((a) => ({
                  id: a.id,
                  name: a.name,
                  name_ko: a.name_ko ?? undefined,
                  avatar_emoji: a.avatar_emoji ?? undefined,
                }))}
                standalone
              />
            )}

            <Suspense fallback={
              <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: "var(--th-text-muted)" }}>
                loading...
              </div>
            }>
              {view === "skills" && <SkillsLibrary agents={managerAgents} />}

              {view === "agent-rules" && (
                <AgentRulesLibrary agents={managerAgents} departments={managerDepartments} />
              )}

              {view === "memory" && (
                <MemoryLibrary agents={managerAgents} departments={managerDepartments} />
              )}

              {view === "hooks" && (
                <HooksLibrary agents={managerAgents} departments={managerDepartments} />
              )}

              {view === "game-room" && <GameRoom agents={displayAgents} />}

              {view === "settings" && (
                <SettingsPanel
                  settings={settings}
                  cliStatus={cliStatus}
                  onSave={(nextSettings) => {
                    void onSaveSettings(nextSettings);
                  }}
                  onRefreshCli={() => {
                    void onRefreshCli();
                  }}
                  oauthResult={oauthResult}
                  onOauthResultClear={onOauthResultClear}
                  managerAgents={managerAgents}
                />
              )}
            </Suspense>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </main>

        {children}
      </div>
    </I18nProvider>
  );
}
