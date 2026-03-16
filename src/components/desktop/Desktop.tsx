import { useState, useEffect, useRef, lazy, Suspense, useCallback, type ReactNode } from "react";
import { useI18n } from "../../i18n";
import type { Project, Category, CompanySettings, WSEventType } from "../../types";
import type { OAuthCallbackResult, ProjectMetaPayload } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import CommandPalette from "../CommandPalette";
import KeyboardShortcutsGuide from "../KeyboardShortcutsGuide";
import UserGuidePanel from "./UserGuidePanel";
import MenuBar from "./MenuBar";
import DesktopIcon, { type DesktopIconDef } from "./DesktopIcon";
import {
  IconAgents, IconNewProject, IconRunTask, IconWorkflow, IconRepl,
  IconDecisions, IconReports, IconFolder,
  IconHeartbeat, IconTaskBoard, IconAlerts, IconCliCost, IconFlowGraph, IconFileTree, IconLocalLlm,
} from "./DesktopIcons";
import Widget from "./Widget";
import Dock from "./Dock";
import WidgetPicker from "./WidgetPicker";
import AgentsWidget from "./widgets/AgentsWidget";
import TasksWidget from "./widgets/TasksWidget";
import AlertsWidget from "./widgets/AlertsWidget";
import CliCostWidget from "./widgets/CliCostWidget";
import FlowGraphWidget from "./widgets/FlowGraphWidget";
import FileTreeWidget from "./widgets/FileTreeWidget";
import CustomFeatureWidget from "./widgets/CustomFeatureWidget";
import LocalLlmWidget from "./widgets/LocalLlmWidget";
import CustomFeatureWindow from "../windows/CustomFeatureWindow";
import WallpaperPicker from "./WallpaperPicker";
import ExportModal from "../export/ExportModal";
import MarkdownEditorModal from "./MarkdownEditorModal";
import ReportWindow from "../windows/ReportWindow";
import QuickLook from "./QuickLook";
import MissionControl from "./MissionControl";
import ProjectFolderWindow from "./ProjectFolderWindow";
import { deleteProject } from "../../api/organization-projects";
import WorkflowWindow from "../windows/WorkflowWindow";
import LibraryWindow from "../windows/LibraryWindow";
import SettingsWindow from "../windows/SettingsWindow";
import AgentManagerWindow from "../windows/AgentManagerWindow";
import ReplWindow from "../windows/ReplWindow";
import NotificationCenter from "../NotificationCenter";

const ChatWindow = lazy(() => import("../windows/ChatWindow"));


function WidgetContent({ id }: { id: string }) {
  if (id.startsWith("custom:")) return <CustomFeatureWidget featureId={id.slice(7)} />;
  switch (id) {
    case "heartbeat":   return <AgentsWidget />;
    case "task-board":  return <TasksWidget />;
    case "alerts":      return <AlertsWidget />;
    case "cli-usage":   return <CliCostWidget />;
    case "flow-graph":  return <FlowGraphWidget />;
    case "file-tree":   return <FileTreeWidget />;
    case "local-llm":   return <LocalLlmWidget />;
    default:            return null;
  }
}

interface DesktopProps {
  connected: boolean;
  on: (event: WSEventType, handler: (payload: unknown) => void) => () => void;
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onRefreshCli: () => Promise<void>;
  oauthResult: OAuthCallbackResult | null;
  onOauthResultClear: () => void;
  onAgentsChange: () => void;
  onSendMessage: (
    content: string,
    receiverType: "agent" | "department" | "all",
    receiverId?: string,
    messageType?: string,
    projectMeta?: ProjectMetaPayload,
  ) => Promise<void>;
  onSendAnnouncement: (content: string) => Promise<void>;
  onSendDirective: (content: string, projectMeta?: ProjectMetaPayload) => Promise<void>;
  onClearMessages: (agentId?: string) => Promise<void>;
  onProjectCreate: () => void;
  onCreateTask: () => void;
  onOpenDecisionInbox: () => void;
  onOpenReportHistory: () => void;
  children?: ReactNode;
}

export default function Desktop({
  connected,
  on,
  onSaveSettings,
  onRefreshCli,
  oauthResult,
  onOauthResultClear,
  onAgentsChange,
  onSendMessage,
  onSendAnnouncement,
  onSendDirective,
  onClearMessages,
  onProjectCreate,
  onCreateTask,
  onOpenDecisionInbox,
  onOpenReportHistory,
  children,
}: DesktopProps) {
  const {
    openWindows,
    openWindow,
    toggleWindow,
    widgetLayout,
    addWidget,
    widgetIcons,
    removeWidgetIcon,
    wallpaper,
    jiggleMode,
    setJiggleMode,
    missionControlOpen,
    setMissionControlOpen,
    setDesktopIconLayout,
    unreadReportCount,
    clearUnreadReportCount,
    openCustomApps,
    closeCustomApp,
  } = useUiStore();

  const { projects, categories, currentProjectId, setCurrentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { agents } = useAgentStore();
  const { tasks, decisionInboxItems } = useTaskStore();
  const runningAgentCount = agents.filter((a) => a.status === "working").length;

  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [projectCtxMenu, setProjectCtxMenu] = useState<{ x: number; y: number; projectId: string; projectName: string } | null>(null);
  const [quickLookProjectId, setQuickLookProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [openProjectWindowIds, setOpenProjectWindowIds] = useState<Set<string>>(new Set());

  const { setProjects } = useProjectStore();
  const { t, language } = useI18n();

  const widgetLabels: Record<string, string> = {
    heartbeat:    t({ ko: "에이전트",  en: "Agents",     ja: "エージェント", zh: "代理" }),
    "task-board": t({ ko: "태스크",    en: "Tasks",      ja: "タスク",      zh: "任务" }),
    alerts:       t({ ko: "알림",      en: "Alerts",     ja: "アラート",    zh: "通知" }),
    "cli-usage":  t({ ko: "CLI 비용", en: "CLI Cost",   ja: "CLIコスト",  zh: "CLI成本" }),
    "flow-graph": t({ ko: "플로 그래프", en: "Flow Graph", ja: "フローグラフ", zh: "流图" }),
    "file-tree":  t({ ko: "파일 트리", en: "File Tree",  ja: "ファイルツリー", zh: "文件树" }),
    "local-llm":  t({ ko: "로컬 LLM", en: "Local LLM",  ja: "ローカルLLM", zh: "本地LLM" }),
  };

  // ── 아이콘 정렬 헬퍼 ────────────────────────────────────────────
  const ICON_GRID_X = 88;
  const ICON_GRID_Y = 92;

  function arrangeIcons(sortedSystemIds: string[], sortedProjectIds: string[]) {
    const newLayout: Record<string, { x: number; y: number }> = {};
    // 시스템 아이콘: 좌측 가로 한 줄
    sortedSystemIds.forEach((id, i) => {
      newLayout[id] = { x: 24 + i * ICON_GRID_X, y: 60 };
    });
    // 프로젝트 아이콘: 그 아래 그리드
    sortedProjectIds.forEach((id, i) => {
      const col = i % 9;
      const row = Math.floor(i / 9);
      newLayout[id] = { x: 24 + col * ICON_GRID_X, y: 60 + ICON_GRID_Y + row * ICON_GRID_Y };
    });
    setDesktopIconLayout(newLayout);
  }

  function sortByName() {
    const sortedSystem = [...icons, ...widgetIconDefs]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((d) => d.id);
    const sortedProjects = [...projects]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `project-${p.id}`);
    arrangeIcons(sortedSystem, sortedProjects);
  }

  function sortByDefault() {
    const systemIds = [...icons, ...widgetIconDefs].map((d) => d.id);
    const projectIds = projects.map((p) => `project-${p.id}`);
    arrangeIcons(systemIds, projectIds);
  }

  function snapToGrid() {
    const current = useUiStore.getState().desktopIconLayout;
    const snapped: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of Object.entries(current)) {
      snapped[id] = {
        x: Math.round(pos.x / ICON_GRID_X) * ICON_GRID_X,
        y: Math.round(pos.y / ICON_GRID_Y) * ICON_GRID_Y,
      };
    }
    setDesktopIconLayout({ ...current, ...snapped });
  }

  // Reports 창이 열리면 뱃지 초기화
  useEffect(() => {
    if (openWindows.has("reports")) clearUnreadReportCount();
  }, [openWindows, clearUnreadReportCount]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    setProjectCtxMenu(null);
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProjectId === projectId) setCurrentProjectId(null);
    setOpenProjectWindowIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
  }, [currentProjectId, setCurrentProjectId, setProjects]);

  // ── 롱프레스 Jiggle Mode ────────────────────────────────────────
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressMoved = useRef(false);
  const longPressStartPos = useRef({ x: 0, y: 0 });

  function onDesktopMouseDown(e: React.MouseEvent) {
    // 아이콘/위젯 위에서는 무시
    if ((e.target as HTMLElement).closest("[data-no-ctx]") ||
        (e.target as HTMLElement) !== e.currentTarget) return;
    if (e.button !== 0) return;
    longPressMoved.current = false;
    longPressStartPos.current = { x: e.clientX, y: e.clientY };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (!longPressMoved.current) setJiggleMode(true);
    }, 600);
  }

  function onDesktopMouseMove(e: React.MouseEvent) {
    const dx = e.clientX - longPressStartPos.current.x;
    const dy = e.clientY - longPressStartPos.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      longPressMoved.current = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }

  function onDesktopMouseUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  // ── 키보드 단축키 ───────────────────────────────────────────────
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      // Esc — jiggle 해제, quickLook 닫기
      if (e.key === "Escape") {
        if (jiggleMode) { setJiggleMode(false); return; }
        if (quickLookProjectId) { setQuickLookProjectId(null); return; }
        if (missionControlOpen) { setMissionControlOpen(false); return; }
      }

      // Ctrl+Shift+K or Cmd+K — CommandPalette
      if ((e.ctrlKey && e.shiftKey && e.key === "K") || (e.metaKey && e.key === "k")) {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
        return;
      }

      // Ctrl+ArrowUp — Mission Control
      if (e.ctrlKey && e.key === "ArrowUp") {
        e.preventDefault();
        setMissionControlOpen(!missionControlOpen);
        return;
      }

      if (isInput) return;

      // Space — Quick Look on selected project
      if (e.key === " " && selectedProjectId) {
        e.preventDefault();
        setQuickLookProjectId(selectedProjectId);
        return;
      }

      // ? — UserGuide
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        setShowUserGuide((v) => !v);
        return;
      }

      // g 코드 단축키
      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        gPending.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => { gPending.current = false; }, 800);
        return;
      }

      if (gPending.current) {
        gPending.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        const map: Record<string, () => void> = {
          w: () => toggleWindow("workflow"),
          l: () => toggleWindow("library"),
          s: () => toggleWindow("settings"),
          c: () => toggleWindow("chat"),
          a: () => toggleWindow("agent-manager"),
          e: () => toggleWindow("repl"),
        };
        map[e.key]?.();
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [toggleWindow, jiggleMode, setJiggleMode, missionControlOpen, setMissionControlOpen, quickLookProjectId, selectedProjectId]);

  // jiggle 모드에서 바탕화면 클릭 시 해제
  function onDesktopClick(e: React.MouseEvent) {
    setCtxMenu(null);
    setProjectCtxMenu(null);
    if (jiggleMode && e.target === e.currentTarget) {
      setJiggleMode(false);
    }
  }

  // 데스크톱 아이콘 정의 (채팅·라이브러리는 Dock에서 제공)
  const icons: DesktopIconDef[] = [
    { id: "agent-manager",    icon: (c) => <IconAgents color={c} />,     label: t({ ko: "에이전트 설정",  en: "Agents",          ja: "エージェント設定",  zh: "代理设置" }),    onClick: () => openWindow("agent-manager"), accentColor: "#5e5ce6" },
    { id: "project-create",   icon: (c) => <IconNewProject color={c} />, label: t({ ko: "프로젝트 생성", en: "New Project",      ja: "プロジェクト作成", zh: "新建项目" }),    onClick: onProjectCreate,                   accentColor: "#30d158" },
    { id: "create-task",      icon: (c) => <IconRunTask color={c} />,    label: t({ ko: "태스크 실행",   en: "Run Task",        ja: "タスク실행",      zh: "运行任务" }),    onClick: onCreateTask,                      accentColor: "#ff9f0a" },
    { id: "workflow",         icon: (c) => <IconWorkflow color={c} />,   label: t({ ko: "워크플로 빌더", en: "Workflow Builder", ja: "ワークフロー",    zh: "工作流构建器" }), onClick: () => openWindow("workflow"),      accentColor: "#007aff" },
    { id: "repl",             icon: (c) => <IconRepl color={c} />,       label: t({ ko: "에이전트 REPL", en: "Agent REPL",      ja: "エージェントREPL", zh: "代理REPL" }),   onClick: () => openWindow("repl"),          accentColor: "#32ade6" },
    { id: "decision-inbox",   icon: (c) => <IconDecisions color={c} />,  label: t({ ko: "의사결정",      en: "Decisions",       ja: "意思決定",        zh: "决策" }),        onClick: onOpenDecisionInbox,               accentColor: "#ff453a", badge: decisionInboxItems.length || undefined },
    { id: "report-history",   icon: (c) => <IconReports color={c} />,    label: t({ ko: "보고서",        en: "Reports",         ja: "レポート",        zh: "报告" }),        onClick: () => { clearUnreadReportCount(); toggleWindow("reports"); }, accentColor: "#64d2ff", badge: unreadReportCount || undefined },
  ];

  // widgetIcons → 바탕화면 앱 아이콘 (클릭 시 위젯 창 오픈, jiggle 모드에서 삭제 가능)
  const widgetIconFnMap: Record<string, (c: string) => React.ReactNode> = {
    heartbeat:    (c) => <IconHeartbeat color={c} />,
    "task-board": (c) => <IconTaskBoard color={c} />,
    alerts:       (c) => <IconAlerts color={c} />,
    "cli-usage":  (c) => <IconCliCost color={c} />,
    "flow-graph": (c) => <IconFlowGraph color={c} />,
    "file-tree":  (c) => <IconFileTree color={c} />,
    "local-llm":  (c) => <IconLocalLlm color={c} />,
  };
  const widgetIconAccentMap: Record<string, string> = {
    heartbeat:    "#5e5ce6",
    "task-board": "#007aff",
    alerts:       "#ff453a",
    "cli-usage":  "#32ade6",
    "flow-graph": "#30d158",
    "file-tree":  "#f59e0b",
    "local-llm":  "#bf5af2",
  };
  const widgetIconDefs: DesktopIconDef[] = widgetIcons.map((id) => {
    const meta = widgetLabels[id] ?? id;
    return {
      id: `widget-icon-${id}`,
      icon: widgetIconFnMap[id] ?? ((c) => <IconTaskBoard color={c} />),
      label: meta,
      deletable: true,
      onDelete: () => removeWidgetIcon(id),
      onClick: () => addWidget(id),
      accentColor: widgetIconAccentMap[id],
    };
  });

  const allIcons = [...icons, ...widgetIconDefs];

  // 기본 아이콘 배치 — 좌측 가로 한 줄
  const DEFAULT_ICON_POSITIONS = allIcons.reduce<Record<string, { x: number; y: number }>>((acc, def, i) => {
    acc[def.id] = { x: 24 + i * ICON_GRID_X, y: 60 };
    return acc;
  }, {});

  const quickLookProject = quickLookProjectId ? projects.find((p) => p.id === quickLookProjectId) ?? null : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: wallpaper,
        overflow: "hidden",
        fontFamily: "var(--th-font-mono)",
        transition: "background 0.4s ease",
      }}
      onContextMenu={(e) => {
        const tag = (e.target as HTMLElement).closest("[data-no-ctx]");
        if (tag) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onClick={onDesktopClick}
      onMouseDown={onDesktopMouseDown}
      onMouseMove={onDesktopMouseMove}
      onMouseUp={onDesktopMouseUp}
    >
      {/* 메뉴바 */}
      <MenuBar
        projects={projects}
        categories={categories}
        currentProject={currentProject}
        onProjectSelect={setCurrentProjectId}
        onProjectCreate={onProjectCreate}
        connected={connected}
        notificationSlot={
          <NotificationCenter on={on} onOpenDecisionInbox={onOpenDecisionInbox} />
        }
        onOpenWallpaperPicker={() => setShowWallpaperPicker(true)}
        onOpenWidgetPicker={() => setShowWidgetPicker(true)}
        onOpenMissionControl={() => setMissionControlOpen(true)}
        onOpenUserGuide={() => setShowUserGuide(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        runningAgentCount={runningAgentCount}
      />

      {/* 바탕화면 영역 (메뉴바 아래, Dock 위) */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          bottom: 80,
          overflow: "hidden",
        }}
      >
        {/* 시스템 앱 아이콘 + 위젯 아이콘 */}
        {allIcons.map((def) => {
          const defaultPos = DEFAULT_ICON_POSITIONS[def.id];
          return (
            <DesktopIcon
              key={def.id}
              def={def}
              defaultX={defaultPos.x}
              defaultY={defaultPos.y}
            />
          );
        })}

        {/* 프로젝트 폴더 아이콘 — 좌측 상단 그리드 */}
        {projects.map((project, i) => {
          const col = i % 9;
          const row = Math.floor(i / 9);
          const isActive = project.id === currentProjectId;
          const def: DesktopIconDef = {
            id: `project-${project.id}`,
            icon: (c) => <IconFolder color={c} open={isActive} />,
            label: project.name,
            deletable: true,
            accentColor: isActive ? "#f59e0b" : "#636366",
            onDelete: () => handleDeleteProject(project.id),
            onClick: () => {
              setCurrentProjectId(project.id);
              setSelectedProjectId(project.id);
              setOpenProjectWindowIds((prev) => new Set([...prev, project.id]));
            },
            onContextMenu: (e) => setProjectCtxMenu({ x: e.clientX, y: e.clientY, projectId: project.id, projectName: project.name }),
          };
          return (
            <DesktopIcon
              key={def.id}
              def={def}
              defaultX={24 + col * ICON_GRID_X}
              defaultY={60 + ICON_GRID_Y + row * ICON_GRID_Y}
            />
          );
        })}

        {/* 위젯들 */}
        {widgetLayout.map((entry) => (
          <Widget
            key={entry.id}
            id={entry.id}
            title={widgetLabels[entry.id] ?? entry.id}
            x={entry.x}
            y={entry.y}
            w={entry.w}
            h={entry.h}
            defaultPopped={widgetIcons.includes(entry.id)}
          >
            <WidgetContent id={entry.id} />
          </Widget>
        ))}

        {/* 위젯 추가 버튼 */}
        <button
          onClick={() => setShowWidgetPicker(true)}
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--th-hover-overlay-subtle)",
            border: "1px dashed var(--th-border)",
            borderRadius: 8,
            padding: "6px 16px",
            fontFamily: "var(--th-font-mono)",
            fontSize: 11,
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--th-accent)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; }}
        >
          {t({ ko: "+ 위젯 추가", en: "+ Add Widget", ja: "+ ウィジェット追加", zh: "+ 添加小组件" })}
        </button>
      </div>

      {/* Dock */}
      <Dock onQuickTask={onCreateTask} />

      {/* 앱 창들 */}
      {openWindows.has("workflow")      && <WorkflowWindow />}
      {openWindows.has("library")       && <LibraryWindow />}
      {openWindows.has("settings")      && (
        <SettingsWindow
          onSaveSettings={onSaveSettings}
          onRefreshCli={onRefreshCli}
          oauthResult={oauthResult}
          onOauthResultClear={onOauthResultClear}
        />
      )}
      {openWindows.has("agent-manager") && <AgentManagerWindow onAgentsChange={onAgentsChange} />}
      {openWindows.has("repl")          && <ReplWindow />}
      {openWindows.has("reports")       && <ReportWindow />}
      {[...openCustomApps].map((id) => (
        <CustomFeatureWindow key={id} featureId={id} onClose={() => closeCustomApp(id)} />
      ))}
      {openWindows.has("chat")          && (
        <Suspense fallback={null}>
          <ChatWindow
            onSendMessage={onSendMessage}
            onSendAnnouncement={onSendAnnouncement}
            onSendDirective={onSendDirective}
            onClearMessages={onClearMessages}
          />
        </Suspense>
      )}

      {/* 위젯 피커 */}
      {showWidgetPicker && <WidgetPicker onClose={() => setShowWidgetPicker(false)} />}

      {/* 배경화면 피커 */}
      {showWallpaperPicker && <WallpaperPicker onClose={() => setShowWallpaperPicker(false)} />}

      {/* 데이터 내보내기 */}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}

      {/* 마크다운 에디터 */}
      {showMarkdownEditor && (
        <MarkdownEditorModal
          onClose={() => setShowMarkdownEditor(false)}
          defaultProjectName={currentProject?.name}
        />
      )}

      {/* Quick Look */}
      {quickLookProject && (
        <QuickLook project={quickLookProject} onClose={() => setQuickLookProjectId(null)} />
      )}

      {/* 프로젝트 폴더 창 */}
      {[...openProjectWindowIds].map((pid, i) => {
        const proj = projects.find((p) => p.id === pid);
        if (!proj) return null;
        return (
          <ProjectFolderWindow
            key={pid}
            project={proj}
            tasks={tasks}
            agents={agents}
            onClose={() => setOpenProjectWindowIds((prev) => { const next = new Set(prev); next.delete(pid); return next; })}
            onSelectProject={(id) => { setCurrentProjectId(id); }}
            onDeleteProject={handleDeleteProject}
            initialX={160 + i * 30}
            initialY={80 + i * 30}
          />
        );
      })}

      {/* Mission Control */}
      {missionControlOpen && (
        <MissionControl
          openWindows={openWindows}
          widgetLayout={widgetLayout}
          onClose={() => setMissionControlOpen(false)}
          onFocusWindow={(w) => { openWindow(w); setMissionControlOpen(false); }}
        />
      )}

      {/* 프로젝트 아이콘 우클릭 메뉴 */}
      {projectCtxMenu && (
        <div
          data-no-ctx="true"
          style={{
            position: "fixed",
            left: projectCtxMenu.x,
            top: projectCtxMenu.y,
            zIndex: 2000,
            background: "var(--th-panel-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--th-border)",
            borderRadius: 10,
            padding: "4px 0",
            minWidth: 180,
            boxShadow: "0 16px 40px var(--th-glass-shadow)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "6px 14px 6px", fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-muted)", borderBottom: "1px solid var(--th-border)", marginBottom: 4 }}>
            📁 {projectCtxMenu.projectName}
          </div>
          {[
            {
              label: t({ ko: "열기", en: "Open", ja: "開く", zh: "打开" }),
              icon: "📂",
              action: () => { setOpenProjectWindowIds((prev) => new Set([...prev, projectCtxMenu.projectId])); setCurrentProjectId(projectCtxMenu.projectId); setProjectCtxMenu(null); },
            },
            {
              label: t({ ko: "빠른 미리보기", en: "Quick Look", ja: "クイックルック", zh: "快速预览" }),
              icon: "⌃",
              shortcut: "Space",
              action: () => { setSelectedProjectId(projectCtxMenu.projectId); setQuickLookProjectId(projectCtxMenu.projectId); setProjectCtxMenu(null); },
            },
            {
              label: t({ ko: "프로젝트 전환", en: "Switch Project", ja: "プロジェクト切替", zh: "切换项目" }),
              icon: "↩",
              action: () => { setCurrentProjectId(projectCtxMenu.projectId); setProjectCtxMenu(null); },
            },
            {
              label: t({ ko: "프로젝트 삭제", en: "Delete Project", ja: "プロジェクト削除", zh: "删除项目" }),
              icon: "🗑",
              danger: true,
              action: () => handleDeleteProject(projectCtxMenu.projectId),
            },
          ].map(({ label, icon, shortcut, danger, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "7px 14px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--th-font-mono)", fontSize: 12,
                color: danger ? "var(--th-danger-text)" : "var(--th-text-primary)",
                textAlign: "left",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = danger ? "var(--th-danger-bg)" : "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                {label}
              </span>
              {shortcut && <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{shortcut}</span>}
            </button>
          ))}
        </div>
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      {ctxMenu && (
        <div
          data-no-ctx="true"
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            zIndex: 2000,
            background: "var(--th-panel-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--th-border)",
            borderRadius: 10,
            padding: "4px 0",
            minWidth: 180,
            boxShadow: "0 16px 40px var(--th-glass-shadow)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 보기 / 정렬 섹션 */}
          <div style={{ padding: "3px 12px 2px", fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", letterSpacing: "0.06em" }}>
            {t({ ko: "정렬 방식", en: "ARRANGE", ja: "並べ替え", zh: "排列方式" })}
          </div>
          {[
            { label: t({ ko: "이름순 정렬",     en: "Sort by Name",    ja: "名前順で並べ替え", zh: "按名称排序" }), icon: "Az", action: () => { sortByName(); setCtxMenu(null); } },
            { label: t({ ko: "기본 순서로 정렬", en: "Sort by Default", ja: "デフォルト順",     zh: "默认排序" }), icon: "↺", action: () => { sortByDefault(); setCtxMenu(null); } },
            { label: t({ ko: "격자에 맞추기",   en: "Snap to Grid",   ja: "グリッドに合わせる", zh: "对齐网格" }), icon: "⊞", action: () => { snapToGrid(); setCtxMenu(null); } },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "6px 14px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--th-font-mono)", fontSize: 12,
                color: "var(--th-text-primary)", textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 16, textAlign: "center", opacity: 0.8 }}>{icon}</span>
              {label}
            </button>
          ))}
          <div style={{ margin: "4px 12px", borderTop: "1px solid var(--th-border)" }} />
          {/* 기타 */}
          <div style={{ padding: "3px 12px 2px", fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", letterSpacing: "0.06em" }}>
            {t({ ko: "바탕화면", en: "DESKTOP", ja: "デスクトップ", zh: "桌面" })}
          </div>
          {[
            { label: t({ ko: "배경화면 변경",        en: "Change Wallpaper",     ja: "壁紙を変更",         zh: "更换壁纸" }),     icon: "🖼", action: () => { setShowWallpaperPicker(true); setCtxMenu(null); } },
            { label: t({ ko: "위젯 추가",            en: "Add Widget",           ja: "ウィジェット追加",   zh: "添加小组件" }),   icon: "＋", action: () => { setShowWidgetPicker(true); setCtxMenu(null); } },
            { label: t({ ko: "마크다운 문서 만들기", en: "New Markdown Doc",     ja: "Markdownドキュメント", zh: "新建Markdown文档" }), icon: "📝", action: () => { setShowMarkdownEditor(true); setCtxMenu(null); } },
            { label: t({ ko: "아이콘 위치 초기화",   en: "Reset Icon Positions", ja: "アイコン位置をリセット", zh: "重置图标位置" }), icon: "⌖", action: () => { setDesktopIconLayout({}); setCtxMenu(null); } },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "6px 14px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--th-font-mono)", fontSize: 12,
                color: "var(--th-text-primary)", textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* CommandPalette */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        agents={agents}
        tasks={tasks}
        projects={projects}
        currentProject={currentProject}
        onNavigate={(view) => {
          setShowCommandPalette(false);
          const viewWindowMap: Record<string, () => void> = {
            "workflow-builder": () => openWindow("workflow"),
            "skills":           () => openWindow("library"),
            "agent-rules":      () => openWindow("library"),
            "memory":           () => openWindow("library"),
            "hooks":            () => openWindow("library"),
            "settings":         () => openWindow("settings"),
            "agents":           () => openWindow("agent-manager"),
          };
          viewWindowMap[view]?.();
        }}
        onCreateTask={() => { setShowCommandPalette(false); onCreateTask(); }}
        onSelectProject={(p) => { setShowCommandPalette(false); setCurrentProjectId(p.id); }}
        onOpenShortcutsGuide={() => { setShowCommandPalette(false); setShowUserGuide(true); }}
      />

      {/* 유저 가이드 패널 */}
      <UserGuidePanel open={showUserGuide} onClose={() => setShowUserGuide(false)} />

      {/* 기존 오버레이/모달 (TaskPanel, DecisionInbox 등) */}
      {children}
    </div>
  );
}
