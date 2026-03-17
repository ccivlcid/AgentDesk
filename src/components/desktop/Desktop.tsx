import { useState, useEffect, useRef, lazy, Suspense, useCallback, type ReactNode } from "react";
import { useI18n } from "../../i18n";
import { useToast } from "../ui/Toast";
import type { Project, Category, CompanySettings, WSEventType , ProjectFolder } from "../../types";
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
  IconAgents, IconRepl,
  IconDecisions, IconReports, IconFolder,
  IconProjectSoftware, IconProjectMarketing, IconProjectResearch,
  IconProjectProduct, IconProjectContent, IconProjectOperations, IconProjectDesign,
  IconHeartbeat, IconTaskBoard, IconAlerts, IconCliCost, IconFlowGraph, IconFileTree, IconLocalLlm,
  IconMarkdownDoc, IconImageStudio,
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
import SynapseWidget from "./widgets/SynapseWidget";
import CustomFeatureWindow from "../windows/CustomFeatureWindow";
import WallpaperPicker from "./WallpaperPicker";
import ExportModal from "../export/ExportModal";
import MarkdownEditorModal from "./MarkdownEditorModal";
import ReportWindow from "../windows/ReportWindow";
import QuickLook from "./QuickLook";
import MissionControl from "./MissionControl";
import ProjectFolderWindow from "./ProjectFolderWindow";
import FolderDesktopIcon from "./FolderDesktopIcon";
import NewFolderModal from "./NewFolderModal";
import FolderWindow from "../windows/FolderWindow";
import { deleteProject, createProject } from "../../api/organization-projects";
import { getProjectFolders, createProjectFolder, addProjectToFolder, deleteProjectFolder, updateProjectFolder } from "../../api/project-folders";
import WorkflowWindow from "../windows/WorkflowWindow";
import LibraryWindow from "../windows/LibraryWindow";
import SettingsWindow from "../windows/SettingsWindow";
import AgentManagerWindow from "../windows/AgentManagerWindow";
import CliWindow from "../windows/CliWindow";
import TaskBoardWindow from "../windows/TaskBoardWindow";
import SynapseWindow from "../windows/SynapseWindow";
import ImageStudioWindow from "../windows/ImageStudioWindow";
import NotificationCenter from "../NotificationCenter";
import AgentDetailPanel from "../agent-detail/AgentDetailPanel";

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
    case "synapse":  return <SynapseWidget />;
    default:         return null;
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

function getCategoryIcon(categoryId?: string | null) {
  switch (categoryId) {
    case "cat_software_dev":  return IconProjectSoftware;
    case "cat_marketing":     return IconProjectMarketing;
    case "cat_research":      return IconProjectResearch;
    case "cat_product_launch":return IconProjectProduct;
    case "cat_content":       return IconProjectContent;
    case "cat_operations":    return IconProjectOperations;
    case "cat_design":        return IconProjectDesign;
    default:                  return null;
  }
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
    pendingDocs,
    removePendingDoc,
    selectedAgentId,
    setSelectedAgentId,
    openFolders,
    openFolder,
    closeFolder,
    openCli,
  } = useUiStore();

  const { projects, categories, currentProjectId, setCurrentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { agents } = useAgentStore();
  const { tasks, decisionInboxItems } = useTaskStore();
  const runningAgentCount = agents.filter((a) => a.status === "working").length;

  const [agentManagerCreateCount, setAgentManagerCreateCount] = useState(0);
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
  const [newFolderPos, setNewFolderPos] = useState<{ x: number; y: number } | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderCreating = useRef(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderPreName, setNewFolderPreName] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);

  const { setProjects } = useProjectStore();
  const { t, language } = useI18n();
  const { showToast } = useToast();

  const widgetLabels: Record<string, string> = {
    heartbeat:    t({ ko: "에이전트",     en: "Agents",        ja: "エージェント",           zh: "代理"    }),
    "task-board": t({ ko: "태스크",       en: "Tasks",         ja: "タスク",                zh: "任务"    }),
    alerts:       t({ ko: "알림",         en: "Alerts",        ja: "アラート",              zh: "警报"    }),
    "cli-usage":  t({ ko: "CLI 비용",     en: "CLI Cost",      ja: "CLIコスト",             zh: "CLI成本" }),
    "flow-graph": t({ ko: "플로우 그래프", en: "Flow Graph",    ja: "フローグラフ",           zh: "流程图"  }),
    "file-tree":  t({ ko: "파일 탐색기",  en: "File Explorer", ja: "ファイルエクスプローラー", zh: "文件管理" }),
    "local-llm":  t({ ko: "로컬 LLM",    en: "Local LLM",     ja: "ローカルLLM",            zh: "本地LLM" }),
    synapse:      t({ ko: "시냅스",       en: "Synapse",       ja: "シナプス",               zh: "知识库"  }),
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

  // 새 폴더 입력 포커스 & 상태 초기화
  useEffect(() => {
    if (newFolderPos) {
      newFolderCreating.current = false;
      setTimeout(() => newFolderInputRef.current?.focus(), 50);
    }
  }, [newFolderPos]);

  useEffect(() => {
    getProjectFolders().then(setFolders).catch(() => {});
  }, []);

  const handleDropDocToProject = useCallback(async (docId: string, project: { id: string; project_path: string; name: string }) => {
    const doc = useUiStore.getState().pendingDocs.find((d) => d.id === docId);
    if (!doc) return;
    const filename = `${doc.title.replace(/[/\\:*?"<>|]/g, "_")}.md`;
    const res = await fetch("/api/projects/save-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_path: project.project_path, filename, content: doc.content }),
    });
    if ((await res.json()).ok) removePendingDoc(docId);
  }, [removePendingDoc]);

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

      // Esc — jiggle 해제, quickLook 닫기, 에이전트 패널 닫기
      if (e.key === "Escape") {
        if (jiggleMode) { setJiggleMode(false); return; }
        if (quickLookProjectId) { setQuickLookProjectId(null); return; }
        if (missionControlOpen) { setMissionControlOpen(false); return; }
        if (selectedAgentId) { setSelectedAgentId(null); return; }
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
          e: () => openCli(),
          i: () => toggleWindow("image-studio"),
        };
        map[e.key]?.();
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [toggleWindow, openCli, jiggleMode, setJiggleMode, missionControlOpen, setMissionControlOpen, quickLookProjectId, selectedProjectId, selectedAgentId, setSelectedAgentId]);

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
    { id: "agent-manager",  icon: (c) => <IconAgents color={c} />,      label: t({ ko: "에이전트 설정",    en: "Agents",         ja: "エージェント設定",  zh: "代理设置" }),   onClick: () => openWindow("agent-manager"), accentColor: "#5e5ce6" },
    { id: "cli",            icon: (c) => <IconRepl color={c} />,        label: t({ ko: "Agent CLI",       en: "Agent CLI",      ja: "Agent CLI",       zh: "Agent CLI" }),  onClick: () => openCli(),                   accentColor: "#32ade6" },
    { id: "image-studio",   icon: (c) => <IconImageStudio color={c} />, label: t({ ko: "이미지 스튜디오", en: "Image Studio",   ja: "イメージスタジオ", zh: "图像工作室" }),  onClick: () => openWindow("image-studio"),  accentColor: "#ec4899" },
    { id: "decision-inbox", icon: (c) => <IconDecisions color={c} />,   label: t({ ko: "의사결정",         en: "Decisions",      ja: "意思決定",        zh: "决策" }),       onClick: onOpenDecisionInbox,               accentColor: "#ff453a", badge: decisionInboxItems.length || undefined },
    { id: "report-history", icon: (c) => <IconReports color={c} />,     label: t({ ko: "보고서",           en: "Reports",        ja: "レポート",        zh: "报告" }),       onClick: () => { clearUnreadReportCount(); toggleWindow("reports"); }, accentColor: "#64d2ff", badge: unreadReportCount || undefined },
  ];

  // widgetIcons → 바탕화면 앱 아이콘 (클릭 시 위젯 창 오픈, jiggle 모드에서 삭제 가능)
  const widgetIconFnMap: Record<string, (c: string) => React.ReactNode> = {
    heartbeat:    (c) => <IconHeartbeat color={c} />,
    "task-board": (c) => <IconTaskBoard color={c} />,
    alerts:       (c) => <IconAlerts color={c} />,
    "cli-usage":  (c) => <IconCliCost color={c} />,
    "flow-graph": (c) => <IconFlowGraph color={c} />,
    "file-tree":  (c) => <IconFileTree color={c} />,
    "local-llm": (c) => <IconLocalLlm color={c} />,
  };
  const widgetIconAccentMap: Record<string, string> = {
    heartbeat:    "#5e5ce6",
    "task-board": "#007aff",
    alerts:       "#ff453a",
    "cli-usage":  "#32ade6",
    "flow-graph": "#30d158",
    "file-tree":  "#f59e0b",
    "local-llm": "#bf5af2",
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

        {/* 마크다운 문서 아이콘 */}
        {pendingDocs.map((doc, i) => {
          const def: DesktopIconDef = {
            id: `doc-${doc.id}`,
            icon: (c) => <IconMarkdownDoc color={c} />,
            label: doc.title,
            accentColor: "#f59e0b",
            docId: doc.id,
            deletable: true,
            onDelete: () => removePendingDoc(doc.id),
            onClick: () => {},
          };
          return (
            <DesktopIcon
              key={def.id}
              def={def}
              defaultX={24 + i * ICON_GRID_X}
              defaultY={60 + ICON_GRID_Y * 3 + ICON_GRID_Y}
            />
          );
        })}

        {/* 폴더 아이콘 영역 */}
        {folders.map((folder, i) => (
          <div
            key={folder.id}
            data-no-ctx="true"
            style={{
              position: "absolute",
              left: 24 + i * ICON_GRID_X,
              top: 60 + ICON_GRID_Y * 2,
            }}
          >
            <FolderDesktopIcon
              folder={folder}
              isDragOver={dragOverFolderId === folder.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverFolderId(null);
                const pid = e.dataTransfer.getData("projectId");
                if (!pid) return;
                try {
                  const result = await addProjectToFolder(folder.id, pid);
                  setFolders((prev) => prev.map((f) => {
                    if (f.id !== folder.id) return f;
                    const proj = projects.find((p) => p.id === pid);
                    if (!proj) return f;
                    return { ...f, projects: [...f.projects, { id: proj.id, name: proj.name, project_path: result.new_path, category_id: proj.category_id ?? null }] };
                  }));
                  setProjects((prev) => prev.map((p) => p.id === pid ? { ...p, folder_id: folder.id, project_path: result.new_path } : p));
                } catch { /* ignore */ }
              }}
              onRename={(f) => {
                const name = window.prompt(t({ ko: "폴더 이름 변경", en: "Rename folder", ja: "フォルダ名変更", zh: "重命名文件夹" }), f.name);
                if (name?.trim()) {
                  updateProjectFolder(f.id, { name: name.trim() }).then((updated) => {
                    setFolders((prev) => prev.map((x) => x.id === f.id ? { ...x, ...updated } : x));
                  }).catch(() => {
                    showToast(t({ ko: "폴더 이름 변경에 실패했습니다", en: "Failed to rename folder", ja: "フォルダ名の変更に失敗しました", zh: "重命名文件夹失败" }), "error");
                  });
                }
              }}
              onDelete={(f) => {
                if (!window.confirm(t({ ko: `"${f.name}" 폴더를 삭제하시겠습니까?`, en: `Delete folder "${f.name}"?`, ja: `フォルダ"${f.name}"を削除しますか？`, zh: `删除文件夹"${f.name}"？` }))) return;
                deleteProjectFolder(f.id).then(() => {
                  setFolders((prev) => prev.filter((x) => x.id !== f.id));
                  setProjects((prev) => prev.map((p) => p.folder_id === f.id ? { ...p, folder_id: null } : p));
                  closeFolder(f.id);
                }).catch(() => {
                  showToast(t({ ko: "폴더 삭제에 실패했습니다", en: "Failed to delete folder", ja: "フォルダの削除に失敗しました", zh: "删除文件夹失败" }), "error");
                });
              }}
              onColorChange={(f) => {
                const color = window.prompt(t({ ko: "색상 (hex, 예: #f59e0b)", en: "Color (hex, e.g. #3b82f6)", ja: "カラー (hex, 例: #f59e0b)", zh: "颜色 (hex, 如: #22c55e)" }), f.color);
                if (color?.trim()) {
                  updateProjectFolder(f.id, { color: color.trim() }).then((updated) => {
                    setFolders((prev) => prev.map((x) => x.id === f.id ? { ...x, ...updated } : x));
                  }).catch(() => {
                    showToast(t({ ko: "폴더 색상 변경에 실패했습니다", en: "Failed to update folder color", ja: "フォルダカラーの変更に失敗しました", zh: "更新文件夹颜色失败" }), "error");
                  });
                }
              }}
            />
          </div>
        ))}

        {/* 프로젝트 아이콘 — 폴더에 속하지 않은 것만 */}
        {projects.filter((p) => !p.folder_id).map((project, i) => {
          const col = i % 9;
          const row = Math.floor(i / 9);
          const isActive = project.id === currentProjectId;
          const category = categories.find((c) => c.id === project.category_id);
          const catColor = category?.color ?? (isActive ? "#f59e0b" : "#636366");
          const accentColor = isActive ? catColor : catColor + "99";
          const ProjectIcon = getCategoryIcon(project.category_id);
          const def: DesktopIconDef = {
            id: `project-${project.id}`,
            icon: (c) => ProjectIcon
              ? <ProjectIcon color={c} />
              : <IconFolder color={c} open={isActive} />,
            label: project.name,
            deletable: true,
            accentColor,
            onDelete: () => handleDeleteProject(project.id),
            onDropDoc: (docId) => handleDropDocToProject(docId, project),
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
      <Dock
        onCreateTask={onCreateTask}
        onCreateProject={onProjectCreate}
        onCreateAgent={() => { setAgentManagerCreateCount((c) => c + 1); openWindow("agent-manager"); }}
      />

      {/* 앱 창들 */}
      {openWindows.has("tasks")         && <TaskBoardWindow />}
      {openWindows.has("synapse")       && <SynapseWindow />}
      {openWindows.has("image-studio")  && <ImageStudioWindow />}
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
      {openWindows.has("agent-manager") && <AgentManagerWindow onAgentsChange={onAgentsChange} createTrigger={agentManagerCreateCount} />}
      {openWindows.has("cli")           && <CliWindow />}
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

      {/* 폴더 창 */}
      {folders.filter((f) => openFolders.has(f.id)).map((folder) => (
        <FolderWindow
          key={folder.id}
          folder={folder}
          allProjects={projects}
          onClose={() => closeFolder(folder.id)}
          onFolderUpdate={(updated) => setFolders((prev) => prev.map((f) => f.id === updated.id ? updated : f))}
        />
      ))}

      {/* 새 폴더 모달 */}
      {newFolderModalOpen && (
        <NewFolderModal
          initialName={newFolderPreName}
          onConfirm={async (name, base_path, color) => {
            setNewFolderModalOpen(false);
            newFolderCreating.current = false;
            try {
              const folder = await createProjectFolder({ name, base_path, color });
              setFolders((prev) => [...prev, folder]);
            } catch { /* ignore */ }
          }}
          onCancel={() => {
            setNewFolderModalOpen(false);
            newFolderCreating.current = false;
          }}
        />
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
          {/* 폴더로 이동 */}
          {folders.length > 0 && (
            <>
              <div style={{ margin: "4px 12px", borderTop: "1px solid var(--th-border)" }} />
              <div style={{ padding: "3px 12px 2px", fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", letterSpacing: "0.06em" }}>
                {t({ ko: "폴더로 이동", en: "MOVE TO FOLDER", ja: "フォルダへ移動", zh: "移动到文件夹" })}
              </div>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={async () => {
                    setProjectCtxMenu(null);
                    try {
                      const result = await addProjectToFolder(folder.id, projectCtxMenu!.projectId);
                      setFolders((prev) => prev.map((f) => {
                        if (f.id !== folder.id) return f;
                        const proj = projects.find((p) => p.id === projectCtxMenu!.projectId);
                        if (!proj) return f;
                        return { ...f, projects: [...f.projects.filter((p) => p.id !== proj.id), { id: proj.id, name: proj.name, project_path: result.new_path, category_id: proj.category_id ?? null }] };
                      }));
                      setProjects((prev) => prev.map((p) => p.id === projectCtxMenu!.projectId ? { ...p, folder_id: folder.id, project_path: result.new_path } : p));
                    } catch { /* ignore */ }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "6px 14px",
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "var(--th-font-mono)", fontSize: 12,
                    color: "var(--th-text-primary)", textAlign: "left",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                >
                  <span>📁</span>
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
                </button>
              ))}
            </>
          )}
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
            { label: t({ ko: "새 폴더",               en: "New Folder",           ja: "新規フォルダ",          zh: "新建文件夹" }),           icon: "📁", action: () => { setNewFolderPos({ x: ctxMenu!.x, y: ctxMenu!.y }); setNewFolderName(""); setCtxMenu(null); } },
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

      {/* 새 폴더 인라인 입력 */}
      {newFolderPos && (
        <div
          style={{
            position: "fixed",
            left: newFolderPos.x,
            top: newFolderPos.y,
            zIndex: 2100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div style={{
            width: 64, height: 64,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, lineHeight: 1,
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
          }}>
            📁
          </div>
          <input
            ref={newFolderInputRef}
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newFolderCreating.current) return;
                newFolderCreating.current = true;
                const name = newFolderName.trim() || t({ ko: "새 폴더", en: "New Folder", ja: "新規フォルダ", zh: "新建文件夹" });
                setNewFolderPreName(name);
                setNewFolderPos(null);
                setNewFolderModalOpen(true);
              } else if (e.key === "Escape") {
                newFolderCreating.current = true;
                setNewFolderPos(null);
              }
            }}
            onBlur={() => {
              if (newFolderCreating.current) return;
              newFolderCreating.current = true;
              const name = newFolderName.trim();
              if (name) {
                setNewFolderPreName(name);
                setNewFolderModalOpen(true);
              }
              setNewFolderPos(null);
            }}
            placeholder={t({ ko: "폴더 이름", en: "Folder name", ja: "フォルダ名", zh: "文件夹名称" })}
            style={{
              width: 120,
              padding: "3px 7px",
              background: "var(--th-bg-surface)",
              border: "1.5px solid var(--th-accent)",
              borderRadius: 5,
              color: "var(--th-text-primary)",
              fontFamily: "var(--th-font-mono)",
              fontSize: 12,
              textAlign: "center",
              outline: "none",
            }}
          />
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

      {/* 에이전트 상세 패널 */}
      <AgentDetailPanel />

      {/* 기존 오버레이/모달 (TaskPanel, DecisionInbox 등) */}
      {children}
    </div>
  );
}
