import { useEffect, useRef, useState, type ReactNode, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NotificationCenter from "../components/NotificationCenter";
import Sidebar from "../components/Sidebar";
import CliUsagePanel from "../components/office-view/CliUsagePanel";
import { useCliUsage } from "../components/office-view/useCliUsage";
import Dashboard2 from "../components/dashboard/Dashboard2";
import CategoriesTab from "../components/settings/CategoriesTab";
import TaskBoard from "../components/TaskBoard";
import AgentManager from "../components/AgentManager";
import HeartbeatPanel from "../components/office-view/HeartbeatPanel";
import ScheduledTasksPanel from "../components/scheduled-tasks/ScheduledTasksPanel";
const SkillsLibrary     = lazy(() => import("../components/SkillsLibrary"));
const AgentRulesLibrary = lazy(() => import("../components/AgentRulesLibrary"));
const MemoryLibrary     = lazy(() => import("../components/MemoryLibrary"));
const HooksLibrary      = lazy(() => import("../components/HooksLibrary"));
const SettingsPanel     = lazy(() => import("../components/SettingsPanel"));
const Deliverables      = lazy(() => import("../components/deliverables/Deliverables"));
const AgentFlowGraph    = lazy(() => import("../components/flow-graph/AgentFlowGraph"));
import { I18nProvider, useI18n } from "../i18n";
import type {
  Agent,
  Category,
  CliStatusMap,
  CompanyStats,
  CompanySettings,
  Department,
  Project,
  SubTask,
  Task,
  WSEventType,
  SubAgent,
  CrossDeptDelivery,
  MeetingPresence,
} from "../types";
import type { UpdateStatus } from "../api";
import type { OAuthCallbackResult, View } from "./types";
import AppHeaderBar from "./AppHeaderBar";
import CommandPalette from "../components/CommandPalette";
import KeyboardShortcutsGuide from "../components/KeyboardShortcutsGuide";
import ScreenGuidePanel from "../components/ScreenGuidePanel";
import ProjectSelector from "../components/project-selector/ProjectSelector";
import type { UiLanguage } from "../i18n";
import type { CliUsageEntry } from "../api";
import ProjectContextBar from "../components/ProjectContextBar";
import TeamPageView from "../components/TeamPageView";

/** CLI 사용량 전용 페이지: useI18n으로 t를 주입해 CliUsagePanel 렌더 */
function CliUsagePage({
  cliStatus,
  cliUsage,
  language,
  refreshing,
  onRefreshUsage,
  projectAgentIds,
}: {
  cliStatus: CliStatusMap | null;
  cliUsage: Record<string, CliUsageEntry> | null;
  language: UiLanguage;
  refreshing: boolean;
  onRefreshUsage: () => void;
  projectAgentIds?: Set<string>;
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
      projectAgentIds={projectAgentIds}
    />
  );
}

interface AppMainLayoutLabels {
  uiLanguage: string;
  viewTitle: string;
  announcementLabel: string;
  groupChatLabel: string;
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
  /** 도서관(에이전트룰/메모리/훅)용 전체 에이전트(시드 포함). */
  libraryAgents: Agent[];
  stats: CompanyStats | null;
  tasks: Task[];
  subtasks: SubTask[];
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
  unreadAgentIds: Set<string>;
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
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onRefreshCli: () => Promise<void>;
  onOauthResultClear: () => void;
  onOpenDecisionInbox: () => void;
  onOpenAgentStatus: () => void;
  onOpenReportHistory: () => void;
  onOpenAnnouncement: () => void;
  onOpenGroupChat: () => void;
  onDismissAutoUpdateNotice: () => Promise<void>;
  onDismissUpdate: () => void;
  projects?: Project[];
  categories?: Category[];
  currentProject?: Project | null;
  onProjectSelect?: (id: string) => void;
  onProjectCreate?: () => void;
  onProjectDelete?: (id: string) => void;
  onProjectUpdated?: (id: string, patch: { name: string; core_goal: string }) => void;
  subAgents?: SubAgent[];
  crossDeptDeliveries?: CrossDeptDelivery[];
  meetingPresences?: MeetingPresence[];
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
  unreadAgentIds,
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
  onSaveSettings,
  onRefreshCli,
  onOauthResultClear,
  onOpenDecisionInbox,
  onOpenAgentStatus,
  onOpenReportHistory,
  onOpenAnnouncement,
  onOpenGroupChat,
  onDismissAutoUpdateNotice,
  onDismissUpdate,
  projects = [],
  categories = [],
  currentProject = null,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  onProjectUpdated,
  subAgents = [],
  crossDeptDeliveries = [],
  meetingPresences = [],
  children,
}: AppMainLayoutProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsGuideOpen, setShortcutsGuideOpen] = useState(false);
  const [screenGuideOpen, setScreenGuideOpen] = useState(false);
  const [projectAgentIds, setProjectAgentIds] = useState<Set<string>>(new Set());
  const prevProjectIdRef = useRef<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ running: number; queued: number } | null>(null);

  useEffect(() => {
    return on("queue_status", (payload: unknown) => {
      const p = payload as { running: number; queued: number };
      if (typeof p?.running === "number" && typeof p?.queued === "number") {
        setQueueStatus({ running: p.running, queued: p.queued });
      }
    });
  }, [on]);

  const refreshProjectAgents = (pid: string) => {
    import("../api/categories-dashboard").then(({ fetchProjectAgents }) =>
      fetchProjectAgents(pid)
        .then((agentList) => setProjectAgentIds(new Set(agentList.map((a: { id: string }) => a.id))))
        .catch(() => {}),
    );
  };

  useEffect(() => {
    const pid = currentProject?.id ?? null;
    if (pid === prevProjectIdRef.current) return;
    prevProjectIdRef.current = pid;
    if (!pid) { setProjectAgentIds(new Set()); return; }
    refreshProjectAgents(pid);
  }, [currentProject?.id]);

  // 글로벌 키보드 단축키
  useEffect(() => {
    const VIEW_SHORTCUTS: Record<string, View> = {
      "1": "dashboard",
      "2": "tasks-board",
      "3": "agents",
      "4": "skills",
      "5": "memory",
      "6": "agent-rules",
      "7": "hooks",
      "8": "settings",
    };
    // g-prefix vim-style navigation: g d, g t, g a, g f, g s, g m, g r, g h
    const G_SHORTCUTS: Record<string, View> = {
      d: "dashboard",
      t: "tasks-board",
      a: "agents",
      f: "flow-graph",
      s: "skills",
      m: "memory",
      r: "agent-rules",
      h: "hooks",
    };
    let gPending = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      // input/textarea 포커스 중 무시
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      // Ctrl+Shift+K — command palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }

      // Ctrl+1~8 — 뷰 이동
      if ((e.ctrlKey || e.metaKey) && VIEW_SHORTCUTS[e.key]) {
        e.preventDefault();
        setView(VIEW_SHORTCUTS[e.key]);
        return;
      }

      if (isEditing || e.ctrlKey || e.metaKey || e.altKey) return;

      // g prefix: g d, g t, g a, g f, g s, g m, g r, g h
      if (gPending) {
        if (gTimer) { clearTimeout(gTimer); gTimer = null; }
        gPending = false;
        const target = G_SHORTCUTS[e.key.toLowerCase()];
        if (target) { e.preventDefault(); setView(target); }
        return;
      }
      if (e.key === "g") {
        gPending = true;
        gTimer = setTimeout(() => { gPending = false; }, 1000);
        return;
      }

      // n — 커맨드 팔레트 열기 (새 태스크 단축키로 이어짐)
      if (e.key === "n") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // ? — 단축키 가이드
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsGuideOpen((v) => !v);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer) clearTimeout(gTimer);
    };
  }, []);

  const handleAddToTeam = async (agentId: string) => {
    if (!currentProject) return;
    const { addProjectAgent } = await import("../api/categories-dashboard");
    await addProjectAgent(currentProject.id, agentId);
    refreshProjectAgents(currentProject.id);
  };

  const handleRemoveFromTeam = async (agentId: string) => {
    if (!currentProject) return;
    const { removeProjectAgent } = await import("../api/categories-dashboard");
    await removeProjectAgent(currentProject.id, agentId);
    refreshProjectAgents(currentProject.id);
  };

  const { cliStatus: cliStatusFromUsage, cliUsage, cliUsageRef, refreshing: cliUsageRefreshing, handleRefreshUsage } =
    useCliUsage(tasks, view);

  return (
    <I18nProvider language={labels.uiLanguage}>
      <div className="app-shell flex h-[100dvh] min-h-[100dvh] overflow-hidden">
        {/* Skip navigation link for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
          style={{ background: "var(--th-accent)", color: "#000", borderRadius: 0 }}
        >
          Skip to main content
        </a>
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar
            currentView={view}
            onChangeView={setView}
            departments={departments}
            agents={agents}
            settings={settings}
            connected={connected}
            projects={projects}
            categories={categories}
            currentProject={currentProject}
            onProjectSelect={onProjectSelect}
            onProjectCreate={onProjectCreate}
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
            departments={departments}
            agents={agents}
            settings={settings}
            connected={connected}
          />
        </div>

        {/* 메인 영역 (사이드바 오른쪽) — macOS 패널 스타일 */}
        <div
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{
            borderTopRightRadius: 10,
            borderBottomRightRadius: 10,
            borderRight: "1px solid var(--th-border)",
            borderBottom: "1px solid var(--th-border)",
            borderTop: "1px solid var(--th-border)",
            background: "var(--th-bg-primary)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          }}
        >
        <main id="main-content" className="flex-1 flex flex-col overflow-hidden min-w-0">
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
            notificationSlot={
              <NotificationCenter
                on={on}
                onNavigateTask={(_taskId) => {
                  setView("tasks-board");
                }}
              />
            }
            queueStatusSlot={
              queueStatus && queueStatus.running > 0 ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    border: "1px solid var(--th-border)",
                    background: "transparent",
                    fontFamily: "var(--th-font-mono)",
                    fontSize: "10px",
                    color: "var(--th-text-muted)",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                  title={`실행 중 ${queueStatus.running} / 대기 ${queueStatus.queued}`}
                  className="hidden sm:inline-flex"
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--th-accent)",
                      flexShrink: 0,
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  <span>{queueStatus.running}</span>
                  {queueStatus.queued > 0 && (
                    <span style={{ color: "var(--th-text-muted)", opacity: 0.7 }}>
                      +{queueStatus.queued}
                    </span>
                  )}
                </div>
              ) : null
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
            onToggleTheme={toggleTheme}
            onToggleMobileHeaderMenu={() => setMobileHeaderMenuOpen(!mobileHeaderMenuOpen)}
            onCloseMobileHeaderMenu={() => setMobileHeaderMenuOpen(false)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onOpenScreenGuide={() => setScreenGuideOpen(true)}
            projectSelectorSlot={
              <ProjectSelector
                currentProject={currentProject ?? null}
                projects={projects}
                categories={categories}
                onSelect={onProjectSelect ?? (() => {})}
                onCreateNew={onProjectCreate ?? (() => {})}
              />
            }
          />
          <CommandPalette
            open={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            agents={agents}
            tasks={tasks}
            projects={projects}
            currentProject={currentProject}
            onNavigate={(v) => { setView(v as any); }}
            onCreateTask={onProjectCreate}
            onSelectProject={(p) => { onProjectSelect?.(p.id); }}
            onOpenShortcutsGuide={() => setShortcutsGuideOpen(true)}
          />
          <KeyboardShortcutsGuide
            open={shortcutsGuideOpen}
            onClose={() => setShortcutsGuideOpen(false)}
          />
          <ScreenGuidePanel
            open={screenGuideOpen}
            view={view}
            hasProject={!!currentProject}
            onClose={() => setScreenGuideOpen(false)}
          />

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
                    style={{ borderRadius: 0, borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}
                  >
                    {labels.updateReleaseLabel}
                  </a>
                  <button
                    type="button"
                    onClick={onDismissUpdate}
                    className="px-2.5 py-1 text-[11px] font-mono transition"
                    style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                  >
                    {labels.updateDismissLabel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 프로젝트 컨텍스트 바 — dashboard 제외, 프로젝트 선택 시만 표시 */}
          {currentProject && view !== "dashboard" && (
            <ProjectContextBar project={currentProject} categories={categories} />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.1, ease: "linear" } }}
              exit={{ opacity: 0, transition: { duration: 0.06 } }}
            >
              <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 lg:p-6">
            {view === "cli-usage" && (
              <div className="mx-auto max-w-4xl px-4 py-6">
                <CliUsagePage
                  cliStatus={cliStatus ?? cliStatusFromUsage}
                  cliUsage={cliUsage}
                  language={labels.uiLanguage as "ko" | "en" | "ja" | "zh"}
                  refreshing={cliUsageRefreshing}
                  onRefreshUsage={handleRefreshUsage}
                  projectAgentIds={projectAgentIds.size > 0 ? projectAgentIds : undefined}
                />
              </div>
            )}

            {view === "project-types" && (
              <div className="max-w-2xl mx-auto py-2">
                <CategoriesTab />
              </div>
            )}

            <div style={{ display: view === "dashboard" ? undefined : "none" }}>
              <Dashboard2
                project={currentProject ?? null}
                agents={agents}
                tasks={tasks}
                departments={departments}
                categories={categories}
                onCreateProject={onProjectCreate ?? (() => {})}
                onDeleteProject={onProjectDelete}
                onProjectUpdated={onProjectUpdated}
                onGoToTasks={() => setView("tasks-board")}
                onCreateTask={(input) => void onCreateTask(input)}
                onAssignTask={onAssignTask}
                onTeamChange={() => { if (currentProject?.id) refreshProjectAgents(currentProject.id); }}
              />
            </div>

            {(view === "tasks" || view === "tasks-board") && (
              <div className="flex-1 min-h-0 flex flex-col -m-3 sm:-m-4 lg:-m-6 mt-0">
                <TaskBoard
                  tasks={tasks}
                  agents={agents}
                  currentProject={currentProject}
                  projectManagerAgents={agents}
                  departments={departments}
                  subtasks={subtasks}
                  onCreateTask={onCreateTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onAssignTask={onAssignTask}
                  onRunTask={onRunTask}
                  onStopTask={onStopTask}
                  onPauseTask={onPauseTask}
                  onResumeTask={onResumeTask}
                  onOpenTerminal={onOpenTerminal}
                  onOpenMeetingMinutes={onOpenMeetingMinutes}
                  onProjectCreate={onProjectCreate}
                />
              </div>
            )}

            {view === "tasks-scheduled" && (
              <ScheduledTasksPanel agents={agents} currentProjectId={currentProject?.id} />
            )}

            {view === "tasks-deliverables" && (
              <Suspense fallback={
                <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: "var(--th-text-muted)" }}>
                  loading...
                </div>
              }>
                <Deliverables agents={agents} currentProject={currentProject ?? null} />
              </Suspense>
            )}

            {view === "agents" && (
              <div className="flex-1 min-h-0 flex flex-col">
                <TeamPageView
                  agents={agents}
                  departments={departments}
                  onAgentsChange={onAgentsChange}
                  projectAgentIds={projectAgentIds.size > 0 ? projectAgentIds : undefined}
                  currentProject={currentProject}
                />
              </div>
            )}

            {view === "heartbeat" && (
              <HeartbeatPanel
                language={labels.uiLanguage as "ko" | "en" | "ja" | "zh"}
                agents={agents.map((a) => ({
                  id: a.id,
                  name: a.name,
                  name_ko: a.name_ko ?? undefined,
                  avatar_emoji: a.avatar_emoji ?? undefined,
                }))}
                projectAgentIds={projectAgentIds.size > 0 ? projectAgentIds : undefined}
                standalone
              />
            )}

            {view === "flow-graph" && (
              <div className="flex-1 min-h-0 flex flex-col" style={{ position: "relative" }}>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: "var(--th-text-muted)" }}>
                    loading...
                  </div>
                }>
                  <AgentFlowGraph
                    agents={agents}
                    departments={departments}
                    tasks={tasks}
                    subAgents={subAgents}
                    crossDeptDeliveries={crossDeptDeliveries}
                    meetingPresences={meetingPresences}
                    projectAgentIds={projectAgentIds.size > 0 ? projectAgentIds : undefined}
                    onSelectAgent={onSelectAgent}
                  />
                </Suspense>
              </div>
            )}

            <Suspense fallback={
              <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: "var(--th-text-muted)" }}>
                loading...
              </div>
            }>
              {view === "skills" && <SkillsLibrary agents={agents} currentProject={currentProject ?? null} />}

              {view === "agent-rules" && (
                <AgentRulesLibrary agents={libraryAgents} departments={departments} currentProject={currentProject ?? null} />
              )}

              {view === "memory" && (
                <MemoryLibrary agents={libraryAgents} departments={departments} currentProject={currentProject ?? null} />
              )}

              {view === "hooks" && (
                <HooksLibrary agents={libraryAgents} departments={departments} currentProject={currentProject ?? null} />
              )}

              {view === "settings" && (
                <div className="flex-1 min-h-0 flex flex-col">
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
                    managerAgents={projectAgentIds.size > 0 ? agents.filter((a) => projectAgentIds.has(a.id)) : agents}
                  />
                </div>
              )}
            </Suspense>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        {children}
        </div>
      </div>
    </I18nProvider>
  );
}
