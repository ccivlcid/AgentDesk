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
  IconMarkdownDoc, IconImageStudio,
  IconHeartbeat, IconTaskBoard, IconAlerts, IconCliCost, IconFlowGraph, IconFileTree, IconLocalLlm, IconAgentGraph, IconDashboard, IconTrash,
} from "./DesktopIcons";
import Dock from "./Dock";
import CustomFeatureWindow from "../windows/CustomFeatureWindow";
import { listCustomFeatures, deleteCustomFeature } from "../../api/custom-features";
import type { CustomFeature } from "../../types";
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
import LibraryGuideWindow from "../windows/LibraryGuideWindow";
import SettingsWindow from "../windows/SettingsWindow";
import AgentManagerWindow from "../windows/AgentManagerWindow";
import QuickCreateAgentModal from "../agent-manager/QuickCreateAgentModal";
import CliWindow from "../windows/CliWindow";
import TaskBoardWindow from "../windows/TaskBoardWindow";
import SynapseWindow from "../windows/SynapseWindow";
import ImageStudioWindow from "../windows/ImageStudioWindow";
import FileTreeWindow from "../windows/FileTreeWindow";
import AlertsWindow from "../windows/AlertsWindow";
import CliCostWindow from "../windows/CliCostWindow";
import LocalLlmWindow from "../windows/LocalLlmWindow";
import FeatureBuilderWindow from "../windows/FeatureBuilderWindow";
import FlowGraphWindow from "../windows/FlowGraphWindow";
import DashboardWindow from "../windows/DashboardWindow";
import GitImportWindow from "../windows/GitImportWindow";
import NotificationCenter from "../NotificationCenter";
import AgentDetailPanel from "../agent-detail/AgentDetailPanel";
import { ICON_GRID_X, ICON_GRID_Y } from "./snapToFreeCell";

const ChatWindow = lazy(() => import("../windows/ChatWindow"));

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
  onCreateTask: () => void;
  onProjectCreate: () => void;
  onOpenDecisionInbox: () => void;
  onOpenReportHistory: () => void;
  children?: ReactNode;
}

function TrashIcon({ t }: { t: ReturnType<typeof import("../../i18n").useI18n>["t"] }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      data-no-ctx="true"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "absolute",
        right: 24,
        bottom: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        cursor: "default",
        userSelect: "none",
        zIndex: 10,
        transform: hov ? "scale(1.06)" : "scale(1)",
        transition: "transform 0.12s",
      }}
    >
      <div style={{
        width: 56, height: 56,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 12,
        background: hov ? "rgba(255,59,48,0.1)" : "rgba(128,128,128,0.08)",
        border: `1px solid ${hov ? "rgba(255,59,48,0.3)" : "rgba(128,128,128,0.15)"}`,
        transition: "background 0.15s, border 0.15s",
      }}>
        <IconTrash color={hov ? "#ff3b30" : "var(--th-text-muted)"} />
      </div>
      <span style={{
        fontFamily: "var(--th-font-mono)", fontSize: 10,
        color: hov ? "#ff3b30" : "var(--th-text-secondary)",
        transition: "color 0.15s",
        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
      }}>
        {t({ ko: "휴지통", en: "Trash", ja: "ゴミ箱", zh: "垃圾桶" })}
      </span>
    </div>
  );
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
  onCreateTask,
  onProjectCreate,
  onOpenDecisionInbox,
  onOpenReportHistory,
  children,
}: DesktopProps) {
  const {
    openWindows,
    openWindow,
    toggleWindow,
    wallpaper,
    jiggleMode,
    setJiggleMode,
    missionControlOpen,
    setMissionControlOpen,
    setDesktopIconLayout,
    unreadReportCount,
    clearUnreadReportCount,
    openCustomApps,
    openCustomApp,
    closeCustomApp,
    customFeaturesTick,
    pendingDocs,
    removePendingDoc,
    selectedAgentId,
    setSelectedAgentId,
    openFolders,
    openFolder,
    closeFolder,
    openCli,
    openCliAgentIds,
    closeCliWindow,
    desktopIconLayout,
    settings,
    setSettings,
  } = useUiStore();

  const { projects, categories, currentProjectId, setCurrentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { agents } = useAgentStore();
  const { tasks, decisionInboxItems } = useTaskStore();
  const runningAgentCount = agents.filter((a) => a.status === "working").length;

  const handleToggleYoloMode = useCallback(() => {
    const next = !(settings.yoloMode === true);
    const updated = { ...settings, yoloMode: next };
    setSettings(updated);
    void onSaveSettings(updated);
  }, [settings, setSettings, onSaveSettings]);

  const [agentManagerCreateCount, setAgentManagerCreateCount] = useState(0);
  const [showQuickCreateAgent, setShowQuickCreateAgent] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [projectCtxMenu, setProjectCtxMenu] = useState<{ x: number; y: number; projectId: string; projectName: string } | null>(null);
  const [cfCtxMenu, setCfCtxMenu] = useState<{ x: number; y: number; featureId: string; featureName: string } | null>(null);
  const [quickLookProjectId, setQuickLookProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [openProjectWindowIds, setOpenProjectWindowIds] = useState<Set<string>>(new Set());

  // ── 아이콘 다중 선택 + 러버밴드 ───────────────────────────────────
  const [selectedIconIds, setSelectedIconIds] = useState<Set<string>>(new Set());
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const selectionRectLive = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const justFinishedRubberBand = useRef(false);
  // 아이콘 위치 맵 (러버밴드 히트 테스트용)
  const iconPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const [newFolderPos, setNewFolderPos] = useState<{ x: number; y: number } | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderCreating = useRef(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([]);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderPreName, setNewFolderPreName] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);

  const { setProjects } = useProjectStore();
  const { t, language } = useI18n();
  const { showToast } = useToast();

  // ── 아이콘 정렬 헬퍼 ────────────────────────────────────────────
  // ICON_GRID_X / ICON_GRID_Y imported from snapToFreeCell.ts

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
    const sortedSystem = [...icons]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((d) => d.id);
    const sortedProjects = [...projects]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `project-${p.id}`);
    arrangeIcons(sortedSystem, sortedProjects);
  }

  function sortByDefault() {
    const systemIds = [...icons].map((d) => d.id);
    const projectIds = projects.map((p) => `project-${p.id}`);
    arrangeIcons(systemIds, projectIds);
  }

  function snapToGrid() {
    const current = useUiStore.getState().desktopIconLayout;
    const snapped: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of Object.entries(current)) {
      snapped[id] = {
        x: 24 + Math.round((pos.x - 24) / ICON_GRID_X) * ICON_GRID_X,
        y: 60 + Math.round((pos.y - 60) / ICON_GRID_Y) * ICON_GRID_Y,
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

  useEffect(() => {
    listCustomFeatures().then((list) => setCustomFeatures(list.filter((f) => f.status === "active" || f.status === "pending_install"))).catch(() => {});
  }, [customFeaturesTick]);

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

      // Cmd+W / Ctrl+W — 최상단 창 닫기
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        const { windowFocusOrder, closeWindow: cw } = useUiStore.getState();
        const top = windowFocusOrder[windowFocusOrder.length - 1];
        if (top) cw(top);
        return;
      }

      if (isInput) return;

      // Delete / Backspace — 선택된 삭제 가능 아이콘 삭제
      if (e.key === "Delete" || e.key === "Backspace") {
        const ids = useUiStore.getState().desktopIconLayout;
        void ids; // suppress lint
        const sel = [...selectedIconIds];
        if (sel.length > 0) {
          sel.forEach((id) => {
            if (id.startsWith("project-")) {
              const projId = id.replace("project-", "");
              handleDeleteProject(projId);
            } else if (id.startsWith("doc-")) {
              const docId = id.replace("doc-", "");
              removePendingDoc(docId);
            }
          });
          setSelectedIconIds(new Set());
          return;
        }
        // 단일 프로젝트 선택된 경우
        if (selectedProjectId) {
          handleDeleteProject(selectedProjectId);
          setSelectedProjectId(null);
          return;
        }
      }

      // Enter — 선택된 프로젝트 열기
      if (e.key === "Enter" && selectedProjectId) {
        e.preventDefault();
        setOpenProjectWindowIds((prev) => new Set([...prev, selectedProjectId]));
        return;
      }

      // F2 — 선택된 아이콘 이름 변경 (DesktopIcon의 rename trigger)
      if (e.key === "F2" && selectedProjectId) {
        e.preventDefault();
        // DesktopIcon 컴포넌트가 data-icon-id 속성으로 찾아 rename dispatch
        const el = document.querySelector(`[data-icon-id="project-${selectedProjectId}"]`) as HTMLElement | null;
        el?.dispatchEvent(new CustomEvent("agentdesk:rename", { bubbles: true }));
        return;
      }

      // Space — Quick Look on selected project
      if (e.key === " " && selectedProjectId) {
        e.preventDefault();
        setQuickLookProjectId(selectedProjectId);
        return;
      }

      // ? — UserGuide
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        toggleWindow("user-guide");
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
          d: () => toggleWindow("dashboard"),
        };
        map[e.key]?.();
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [toggleWindow, openCli, jiggleMode, setJiggleMode, missionControlOpen, setMissionControlOpen, quickLookProjectId, selectedProjectId, selectedAgentId, setSelectedAgentId, selectedIconIds, handleDeleteProject, removePendingDoc]);

  // jiggle 모드에서 바탕화면 클릭 시 해제
  function onDesktopClick(e: React.MouseEvent) {
    setCtxMenu(null);
    setProjectCtxMenu(null);
    setCfCtxMenu(null);
    if (jiggleMode && e.target === e.currentTarget) {
      setJiggleMode(false);
    }
  }

  // ── 러버밴드 선택 (내부 콘텐츠 div 전용) ───────────────────────────
  function onContentMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return; // 빈 배경에서만

    // 선택 초기화 (기존 선택 지우기)
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      setSelectedIconIds(new Set());
    }

    selectionStart.current = { x: e.clientX, y: e.clientY - 44 };
    selectionRectLive.current = null;

    function onMove(ev: MouseEvent) {
      if (!selectionStart.current) return;
      const sx = selectionStart.current.x;
      const sy = selectionStart.current.y;
      const cx = ev.clientX;
      const cy = ev.clientY - 44;
      const dx = Math.abs(cx - sx);
      const dy = Math.abs(cy - sy);
      if (dx < 4 && dy < 4) return;

      const rect = {
        x: Math.min(sx, cx),
        y: Math.min(sy, cy),
        w: Math.abs(cx - sx),
        h: Math.abs(cy - sy),
      };
      selectionRectLive.current = rect;
      setSelectionRect({ ...rect });
    }

    function onUp() {
      const rect = selectionRectLive.current;
      if (rect && (rect.w > 4 || rect.h > 4)) {
        const layout = useUiStore.getState().desktopIconLayout;
        const newSel = new Set<string>();
        iconPositionsRef.current.forEach((pos, id) => {
          const p = layout[id] ?? pos;
          const inRect =
            p.x < rect.x + rect.w &&
            p.x + 72 > rect.x &&
            p.y < rect.y + rect.h &&
            p.y + 80 > rect.y;
          if (inRect) newSel.add(id);
        });
        if (newSel.size > 0) {
          justFinishedRubberBand.current = true;
          setSelectedIconIds(newSel);
        }
      }
      setSelectionRect(null);
      selectionRectLive.current = null;
      selectionStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onContentClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (justFinishedRubberBand.current) {
      justFinishedRubberBand.current = false;
      return;
    }
    setSelectedIconIds(new Set());
    setSelectedProjectId(null);
  }

  // 데스크톱 아이콘 정의 (채팅·라이브러리는 Dock에서 제공)
  const icons: DesktopIconDef[] = [
    // ── 기존 앱 ──────────────────────────────────────────────────
    { id: "dashboard-app",  icon: (c) => <IconDashboard color={c} />,  label: t({ ko: "대시보드",       en: "Dashboard",      ja: "ダッシュボード",   zh: "控制台" }),      onClick: () => openWindow("dashboard"),     accentColor: "#06b6d4" },
    { id: "agent-manager",  icon: (c) => <IconAgents color={c} />,      label: t({ ko: "에이전트 설정",    en: "Agents",         ja: "エージェント設定",  zh: "代理设置" }),   onClick: () => openWindow("agent-manager"), accentColor: "#5e5ce6" },
    { id: "cli",            icon: (c) => <IconRepl color={c} />,        label: t({ ko: "에이전트 CLI",    en: "Agent CLI",      ja: "エージェントCLI", zh: "代理CLI" }),     onClick: () => openCli(),                   accentColor: "#32ade6" },
    { id: "image-studio",   icon: (c) => <IconImageStudio color={c} />, label: t({ ko: "이미지 스튜디오", en: "Image Studio",   ja: "イメージスタジオ", zh: "图像工作室" }),  onClick: () => openWindow("image-studio"),  accentColor: "#ec4899" },
    { id: "decision-inbox", icon: (c) => <IconDecisions color={c} />,   label: t({ ko: "의사결정",         en: "Decisions",      ja: "意思決定",        zh: "决策" }),       onClick: onOpenDecisionInbox,               accentColor: "#ff453a", badge: decisionInboxItems.length || undefined },
    { id: "report-history", icon: (c) => <IconReports color={c} />,     label: t({ ko: "보고서",           en: "Reports",        ja: "レポート",        zh: "报告" }),       onClick: () => { clearUnreadReportCount(); toggleWindow("reports"); }, accentColor: "#64d2ff", badge: unreadReportCount || undefined },
    // ── 구 위젯 → 앱 ─────────────────────────────────────────────
    { id: "flow-graph-app", icon: (c) => <IconAgentGraph color={c} />,  label: t({ ko: "에이전트 그래프",  en: "Agent Graph",    ja: "エージェントグラフ", zh: "代理图" }),     onClick: () => openWindow("flow-graph"),    accentColor: "#06b6d4" },
    { id: "synapse-app",    icon: (c) => <IconHeartbeat color={c} />,   label: t({ ko: "시냅스",           en: "Synapse",        ja: "シナプス",        zh: "知识库" }),      onClick: () => openWindow("synapse"),       accentColor: "#bf5af2" },
    { id: "file-tree-app",  icon: (c) => <IconFileTree color={c} />,    label: t({ ko: "파일 탐색기",      en: "File Explorer",  ja: "ファイルエクスプローラー", zh: "文件管理" }), onClick: () => openWindow("file-tree"),    accentColor: "#f59e0b" },
    { id: "alerts-app",     icon: (c) => <IconAlerts color={c} />,      label: t({ ko: "알림",             en: "Alerts",         ja: "アラート",        zh: "警报" }),        onClick: () => openWindow("alerts"),        accentColor: "#ff453a" },
    { id: "cli-cost-app",   icon: (c) => <IconCliCost color={c} />,     label: t({ ko: "CLI 비용",         en: "CLI Cost",       ja: "CLIコスト",       zh: "CLI成本" }),     onClick: () => openWindow("cli-usage"),     accentColor: "#32ade6" },
    { id: "local-llm-app",  icon: (c) => <IconLocalLlm color={c} />,    label: t({ ko: "로컬 LLM",         en: "Local LLM",      ja: "ローカルLLM",      zh: "本地LLM" }),     onClick: () => openWindow("local-llm"),     accentColor: "#bf5af2" },
  ];

  function getCustomFeatureIcon(templateId: string | null | undefined, color: string): React.ReactNode {
    const S = 1.5;
    const base = { fill: "none", stroke: color, strokeWidth: S, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (templateId) {
      case "agent-dept-status":
        return <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><rect x="3" y="8" width="14" height="9" rx="1.5" {...base}/><rect x="7" y="3" width="6" height="5" rx="1" {...base}/><line x1="7" y1="12" x2="7" y2="14" {...base}/><line x1="10" y1="12" x2="10" y2="14" {...base}/><line x1="13" y1="12" x2="13" y2="14" {...base}/></svg>;
      case "agent-single-monitor":
        return <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="9" r="5" {...base}/><circle cx="10" cy="9" r="2" fill={color} stroke="none" opacity="0.5"/><line x1="14" y1="13" x2="17" y2="16" {...base}/></svg>;
      case "task-daily-counter":
        return <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2.5" {...base}/><path d="M7 10L9.2 12.5L13 7.5" {...base}/></svg>;
      case "task-assignee-progress":
        return <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><rect x="3" y="13" width="3" height="4" rx="1" fill={color} stroke="none" opacity="0.4"/><rect x="8.5" y="9" width="3" height="8" rx="1" fill={color} stroke="none" opacity="0.7"/><rect x="14" y="5" width="3" height="12" rx="1" fill={color} stroke="none"/></svg>;
      case "notification-filter-feed":
        return <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><path d="M10 3C7.24 3 5 5.24 5 8v4l-1.5 2h13L15 12V8c0-2.76-2.24-5-5-5z" {...base}/><path d="M8.5 15.5a1.5 1.5 0 003 0" {...base}/></svg>;
      case "cli-cost-summary":
        return <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" {...base}/><path d="M10 6v1.5M10 12.5V14M7.5 8.5C7.5 7.67 8.17 7 9 7h2a1.5 1.5 0 010 3H9a1.5 1.5 0 000 3h2a1.5 1.5 0 010 3H9c-.83 0-1.5-.67-1.5-1.5" {...base}/></svg>;
      case "memo-board":
        return <svg width="26" height="26" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="2" {...base}/><line x1="7" y1="7.5" x2="13" y2="7.5" {...base}/><line x1="7" y1="10" x2="13" y2="10" {...base}/><line x1="7" y1="12.5" x2="10.5" y2="12.5" {...base}/></svg>;
      default:
        return <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" fill="none"/></svg>;
    }
  }

  const customFeatureIcons: DesktopIconDef[] = customFeatures.map((f) => ({
    id: `cf-${f.id}`,
    icon: (c: string) => (
      <div style={{ position: "relative", width: 26, height: 26 }}>
        {f.icon_svg
          ? <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: c }} dangerouslySetInnerHTML={{ __html: f.icon_svg }} />
          : getCustomFeatureIcon(f.template_id, c)}
        {f.status === "pending_install" && (
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", border: "1.5px solid #0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 6, color: "#000", fontWeight: 900, lineHeight: 1 }}>↓</span>
          </div>
        )}
      </div>
    ),
    label: f.name,
    onClick: () => openCustomApp(f.id),
    accentColor: "#f59e0b",
    deletable: true,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setCfCtxMenu({ x: e.clientX, y: e.clientY, featureId: f.id, featureName: f.name });
    },
    onDelete: () => {
      closeCustomApp(f.id);
      deleteCustomFeature(f.id)
        .then(() => listCustomFeatures())
        .then((list) => setCustomFeatures(list.filter((cf) => cf.status === "active" || f.status === "pending_install")))
        .catch(console.error);
    },
  }));

  const allIcons = [...icons, ...customFeatureIcons];

  // 기본 아이콘 배치 — 한 줄에 최대 6개, 넘치면 다음 줄
  const ICONS_PER_ROW = 6;
  const DEFAULT_ICON_POSITIONS = allIcons.reduce<Record<string, { x: number; y: number }>>((acc, def, i) => {
    const col = i % ICONS_PER_ROW;
    const row = Math.floor(i / ICONS_PER_ROW);
    acc[def.id] = { x: 24 + col * ICON_GRID_X, y: 60 + row * ICON_GRID_Y };
    return acc;
  }, {});

  const quickLookProject = quickLookProjectId ? projects.find((p) => p.id === quickLookProjectId) ?? null : null;

  // 러버밴드 히트 테스트용 아이콘 위치 맵 갱신
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    allIcons.forEach((def, i) => {
      map.set(def.id, DEFAULT_ICON_POSITIONS[def.id] ?? { x: 24 + i * ICON_GRID_X, y: 60 });
    });
    pendingDocs.forEach((doc, i) => {
      map.set(`doc-${doc.id}`, { x: 24 + i * ICON_GRID_X, y: 60 + ICON_GRID_Y * 3 + ICON_GRID_Y });
    });
    folders.forEach((folder, i) => {
      map.set(`folder-${folder.id}`, { x: 24 + i * ICON_GRID_X, y: 60 + ICON_GRID_Y * 2 });
    });
    projects.filter((p) => !p.folder_id).forEach((project, i) => {
      const col = i % 9; const row = Math.floor(i / 9);
      map.set(`project-${project.id}`, { x: 24 + col * ICON_GRID_X, y: 60 + ICON_GRID_Y + row * ICON_GRID_Y });
    });
    iconPositionsRef.current = map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIcons.length, pendingDocs.length, folders.length, projects.length, desktopIconLayout]);

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
        onOpenMissionControl={() => setMissionControlOpen(true)}
        onOpenUserGuide={() => toggleWindow("user-guide")}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        runningAgentCount={runningAgentCount}
        yoloMode={settings.yoloMode === true}
        onToggleYoloMode={handleToggleYoloMode}
      />

      {/* 바탕화면 영역 (메뉴바 아래, Dock 위) */}
      <div
        onMouseDown={onContentMouseDown}
        onClick={onContentClick}
        style={{
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          bottom: 80,
          overflow: "hidden",
        }}
      >
        {/* 러버밴드 선택 사각형 */}
        {selectionRect && (
          <div
            style={{
              position: "absolute",
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.w,
              height: selectionRect.h,
              border: "1px solid rgba(0,122,255,0.75)",
              background: "rgba(0,122,255,0.10)",
              borderRadius: 3,
              pointerEvents: "none",
              zIndex: 50,
            }}
          />
        )}
        {/* 시스템 앱 아이콘 + 위젯 아이콘 */}
        {allIcons.map((def) => {
          const defaultPos = DEFAULT_ICON_POSITIONS[def.id];
          return (
            <DesktopIcon
              key={def.id}
              def={def}
              defaultX={defaultPos.x}
              defaultY={defaultPos.y}
              isSelected={selectedIconIds.has(def.id)}
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
              isSelected={selectedIconIds.has(def.id)}
            />
          );
        })}

        {/* 폴더 아이콘 영역 */}
        {folders.map((folder, i) => (
            <FolderDesktopIcon
              key={folder.id}
              folder={folder}
              defaultX={24 + i * ICON_GRID_X}
              defaultY={60 + ICON_GRID_Y * 2}
              isSelected={selectedIconIds.has(`folder-${folder.id}`)}
              onSelect={() => setSelectedIconIds(new Set([`folder-${folder.id}`]))}
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
        ))}

        {/* 휴지통 — 우하단 고정 */}
        <TrashIcon t={t} />

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
              setSelectedIconIds(new Set([`project-${project.id}`]));
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
              isSelected={selectedIconIds.has(`project-${project.id}`)}
            />
          );
        })}

      </div>

      {/* Dock */}
      <Dock
        onCreateTask={onCreateTask}
        onCreateProject={onProjectCreate}
        onCreateAgent={() => setShowQuickCreateAgent(true)}
        onCreateFeature={() => openWindow("feature-builder")}
      />

      {/* 앱 창들 */}
      {openWindows.has("dashboard")      && <DashboardWindow />}
      {openWindows.has("tasks")         && <TaskBoardWindow />}
      {openWindows.has("synapse")       && <SynapseWindow />}
      {openWindows.has("image-studio")  && <ImageStudioWindow />}
      {openWindows.has("file-tree")     && <FileTreeWindow />}
      {openWindows.has("alerts")        && <AlertsWindow />}
      {openWindows.has("cli-usage")     && <CliCostWindow />}
      {openWindows.has("local-llm")     && <LocalLlmWindow />}
      {openWindows.has("workflow")      && <WorkflowWindow />}
      {openWindows.has("library")       && <LibraryWindow />}
      {openWindows.has("library-guide") && <LibraryGuideWindow />}
      {openWindows.has("settings")      && (
        <SettingsWindow
          onSaveSettings={onSaveSettings}
          onRefreshCli={onRefreshCli}
          oauthResult={oauthResult}
          onOauthResultClear={onOauthResultClear}
        />
      )}
      {openWindows.has("agent-manager") && <AgentManagerWindow onAgentsChange={onAgentsChange} createTrigger={agentManagerCreateCount} />}
      {showQuickCreateAgent && (
        <QuickCreateAgentModal
          onClose={() => setShowQuickCreateAgent(false)}
          onCreated={onAgentsChange}
        />
      )}
      {openWindows.has("cli")           && <CliWindow />}
      {[...openCliAgentIds].map((agentId) => (
        <CliWindow key={`cli-agent-${agentId}`} agentId={agentId} onClose={() => closeCliWindow(agentId)} />
      ))}
      {openWindows.has("reports")       && <ReportWindow />}
      {[...openCustomApps].map((id) => (
        <CustomFeatureWindow key={id} featureId={id} initialFeature={customFeatures.find((f) => f.id === id)} onClose={() => closeCustomApp(id)} />
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
          onProjectCreated={(newProject) => {
            setProjects((prev) => [...prev, newProject]);
          }}
          onProjectPathChanged={(projectId, newPath) => {
            setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, project_path: newPath } : p));
          }}
          onProjectEjected={(projectId) => {
            setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, folder_id: null } : p));
          }}
          onProjectAdded={(projectId, newPath) => {
            setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, folder_id: folder.id, project_path: newPath } : p));
          }}
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

      {/* 배경화면 피커 */}
      {showWallpaperPicker && <WallpaperPicker onClose={() => setShowWallpaperPicker(false)} />}

      {/* 데이터 내보내기 */}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}

      {/* 새 기능 만들기 */}
      {openWindows.has("feature-builder") && <FeatureBuilderWindow />}
      {openWindows.has("flow-graph")     && <FlowGraphWindow />}
      {openWindows.has("git-import")     && <GitImportWindow />}

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
            initialX={Math.max(20, (window.innerWidth - 720) / 2) + i * 28}
            initialY={Math.max(44, (window.innerHeight - 540) / 3) + i * 28}
          />
        );
      })}

      {/* Mission Control */}
      {missionControlOpen && (
        <MissionControl
          openWindows={openWindows}
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

      {/* Custom Feature 우클릭 컨텍스트 메뉴 */}
      {cfCtxMenu && (
        <div
          data-no-ctx="true"
          style={{
            position: "fixed",
            left: cfCtxMenu.x,
            top: cfCtxMenu.y,
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
            ✦ {cfCtxMenu.featureName}
          </div>
          {[
            {
              label: t({ ko: "열기", en: "Open", ja: "開く", zh: "打开" }),
              icon: "▶",
              danger: false,
              action: () => { openCustomApp(cfCtxMenu.featureId); setCfCtxMenu(null); },
            },
            {
              label: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
              icon: "🗑",
              danger: true,
              action: () => {
                const { featureId } = cfCtxMenu;
                setCfCtxMenu(null);
                closeCustomApp(featureId);
                deleteCustomFeature(featureId)
                  .then(() => listCustomFeatures())
                  .then((list) => setCustomFeatures(list.filter((cf) => cf.status === "active" || cf.status === "pending_install")))
                  .catch(console.error);
              },
            },
          ].map(({ label, icon, danger, action }) => (
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
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = danger ? "var(--th-danger-bg)" : "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                {label}
              </span>
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
        onOpenShortcutsGuide={() => { setShowCommandPalette(false); toggleWindow("user-guide"); }}
      />

      {/* 유저 가이드 패널 */}
      {openWindows.has("user-guide") && <UserGuidePanel />}

      {/* 에이전트 상세 패널 */}
      <AgentDetailPanel />

      {/* 기존 오버레이/모달 (TaskPanel, DecisionInbox 등) */}
      {children}
    </div>
  );
}
