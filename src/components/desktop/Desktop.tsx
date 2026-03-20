import { useState, useRef, useCallback, useMemo } from "react";
import { useI18n } from "../../i18n";
import { useToast } from "../ui/Toast";
import type { Project, Category, CompanySettings, ProjectFolder } from "../../types";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import type { DesktopProps } from "./DesktopTypes";
import { DesktopChrome } from "./DesktopChrome";
import { useDesktopRubberBand } from "./useDesktopRubberBand";
import { useDesktopKeyboard } from "./useDesktopKeyboard";
import { useDesktopSortSnap } from "./useDesktopSortSnap";
import { useDesktopJiggle } from "./useDesktopJiggle";
import { useDesktopIcons } from "./useDesktopIcons";
import { DesktopIconArea } from "./DesktopIconArea";
import { DesktopOverlayBlock } from "./DesktopOverlayBlock";
import { useDesktopOverlayBlockProps } from "./useDesktopOverlayBlockProps";
import { useDesktopIconPositionsSync } from "./useDesktopIconPositionsSync";
import { useDesktopData } from "./useDesktopData";
import type { CustomFeature } from "../../types";
import AppSwitcher, { useAppSwitcherKeyboard } from "./AppSwitcher";
import { deleteProject, createProject } from "../../api/organization-projects";
import { createProjectFolder, addProjectToFolder, deleteProjectFolder, updateProjectFolder } from "../../api/project-folders";
import NotificationCenter from "../NotificationCenter";
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
    openCliWindow,
    closeCliWindow,
    desktopIconLayout,
    settings,
    setSettings,
    trashedProjects,
    addToTrash,
    removeFromTrash,
    emptyTrash,
    trashedFeatures,
    addFeatureToTrash,
    removeFeatureFromTrash,
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

  const [showTrash, setShowTrash] = useState(false);
  const [runProjectInfo, setRunProjectInfo] = useState<{ projectId: string; projectName: string; projectPath: string } | null>(null);
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
  const {
    selectionRect,
    onContentMouseDown,
    onContentClick,
    iconPositionsRef,
  } = useDesktopRubberBand(setSelectedIconIds, setSelectedProjectId);

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
  useAppSwitcherKeyboard();
  useDesktopData(
    { openWindows, clearUnreadReportCount, customFeaturesTick },
    setFolders,
    setCustomFeatures,
    newFolderPos,
    newFolderInputRef,
    newFolderCreating,
  );
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
    const proj = useProjectStore.getState().projects.find((p) => p.id === projectId);
    if (proj) addToTrash({ id: proj.id, name: proj.name, project_path: proj.project_path, core_goal: proj.core_goal, category_id: proj.category_id ?? null });
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProjectId === projectId) setCurrentProjectId(null);
    setOpenProjectWindowIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
  }, [currentProjectId, setCurrentProjectId, setProjects, addToTrash]);
  const { icons, allIcons, DEFAULT_ICON_POSITIONS } = useDesktopIcons({
    t,
    openWindow,
    openCli,
    clearUnreadReportCount,
    toggleWindow,
    unreadReportCount,
    onOpenDecisionInbox,
    decisionInboxItems,
    customFeatures,
    openCustomApp,
    setCfCtxMenu,
    closeCustomApp,
    addFeatureToTrash,
    setCustomFeatures,
  });
  const { sortByName, sortByDefault, snapToGrid } = useDesktopSortSnap(icons, projects);
  const { onDesktopMouseDown, onDesktopMouseMove, onDesktopMouseUp, onDesktopClick } = useDesktopJiggle({
    jiggleMode,
    setJiggleMode,
    setCtxMenu,
    setProjectCtxMenu,
    setCfCtxMenu,
  });
  useDesktopKeyboard({
    jiggleMode,
    setJiggleMode,
    missionControlOpen,
    setMissionControlOpen,
    quickLookProjectId,
    setQuickLookProjectId,
    selectedProjectId,
    setSelectedProjectId,
    setOpenProjectWindowIds,
    selectedAgentId,
    setSelectedAgentId,
    selectedIconIds,
    setSelectedIconIds,
    setShowCommandPalette,
    handleDeleteProject,
    removePendingDoc,
    toggleWindow,
    openCli,
  });
  useDesktopIconPositionsSync(iconPositionsRef, allIcons, DEFAULT_ICON_POSITIONS, pendingDocs, folders, projects, desktopIconLayout);
  const overlayBridge = useMemo(
    () => ({
      runProjectInfo, setRunProjectInfo, projectCtxMenu, setProjectCtxMenu, cfCtxMenu, setCfCtxMenu, ctxMenu, setCtxMenu,
      agentManagerCreateCount, showQuickCreateAgent, setShowQuickCreateAgent, newFolderModalOpen, newFolderPreName,
      setNewFolderModalOpen, newFolderCreatingRef: newFolderCreating, createProjectFolder, setNewFolderPreName,
      showWallpaperPicker, setShowWallpaperPicker, showExportModal, setShowExportModal, showMarkdownEditor, setShowMarkdownEditor,
      quickLookProjectId, setQuickLookProjectId, missionControlOpen, setMissionControlOpen, handleDeleteProject,
      openProjectWindowIds, setOpenProjectWindowIds, setCurrentProjectId, setSelectedProjectId, addProjectToFolder, setFolders,
      openCustomApp, closeCustomApp, addFeatureToTrash, setCustomFeatures,
      newFolderPos, setNewFolderPos, newFolderName, setNewFolderName, newFolderInputRef,
      showCommandPalette, setShowCommandPalette, sortByName, sortByDefault, snapToGrid, setDesktopIconLayout, createProject,
      showTrash, setShowTrash, folders, customFeatures,
      onSaveSettings, onRefreshCli, oauthResult, onOauthResultClear, onAgentsChange, onSendMessage, onSendAnnouncement, onSendDirective, onClearMessages, onCreateTask,
    }),
    // overlay block deps (stable refs/setters omitted)
    [runProjectInfo, projectCtxMenu, cfCtxMenu, ctxMenu, agentManagerCreateCount, showQuickCreateAgent, newFolderModalOpen, newFolderPreName, newFolderCreating, createProjectFolder, showWallpaperPicker, showExportModal, showMarkdownEditor, quickLookProjectId, missionControlOpen, handleDeleteProject, openProjectWindowIds, addProjectToFolder, setFolders, openCustomApp, closeCustomApp, addFeatureToTrash, setCustomFeatures, newFolderPos, newFolderName, newFolderInputRef, showCommandPalette, sortByName, sortByDefault, snapToGrid, setDesktopIconLayout, createProject, showTrash, folders, customFeatures, onSaveSettings, onRefreshCli, oauthResult, onOauthResultClear, onAgentsChange, onSendMessage, onSendAnnouncement, onSendDirective, onClearMessages, onCreateTask],
  );
  const overlayBlockProps = useDesktopOverlayBlockProps(overlayBridge);
  return (
    <DesktopChrome
      wallpaper={wallpaper}
      setCtxMenu={setCtxMenu}
      onDesktopClick={onDesktopClick}
      onDesktopMouseDown={onDesktopMouseDown}
      onDesktopMouseMove={onDesktopMouseMove}
      onDesktopMouseUp={onDesktopMouseUp}
      menuBarProps={{
        projects,
        categories,
        currentProject,
        onProjectSelect: setCurrentProjectId,
        onProjectCreate,
        connected,
        notificationSlot: <NotificationCenter on={on} onOpenDecisionInbox={onOpenDecisionInbox} />,
        onOpenWallpaperPicker: () => setShowWallpaperPicker(true),
        onOpenMissionControl: () => setMissionControlOpen(true),
        onOpenUserGuide: () => toggleWindow("user-guide"),
        onOpenCommandPalette: () => setShowCommandPalette(true),
        onOpenExportModal: () => setShowExportModal(true),
        runningAgentCount,
        yoloMode: settings.yoloMode === true,
        onToggleYoloMode: handleToggleYoloMode,
      }}
      iconAreaProps={{
        selectionRect,
        onContentMouseDown,
        onContentClick,
        allIcons,
        DEFAULT_ICON_POSITIONS,
        selectedIconIds,
        setSelectedIconIds,
        pendingDocs,
        removePendingDoc,
        folders,
        projects,
        categories,
        currentProjectId,
        setCurrentProjectId,
        setSelectedProjectId,
        setOpenProjectWindowIds,
        dragOverFolderId,
        setDragOverFolderId,
        addProjectToFolder,
        setFolders,
        setProjects,
        updateProjectFolder,
        deleteProjectFolder,
        closeFolder,
        t,
        showToast,
        handleDeleteProject,
        handleDropDocToProject,
        setProjectCtxMenu,
        trashedCount: trashedProjects.length,
        setShowTrash,
      }}
      dockProps={{
        onCreateTask,
        onCreateProject: onProjectCreate,
        onCreateAgent: () => setShowQuickCreateAgent(true),
        onCreateFeature: () => openWindow("feature-builder"),
      }}
    >
      <DesktopOverlayBlock {...overlayBlockProps}>{children}</DesktopOverlayBlock>
    </DesktopChrome>
  );
}
