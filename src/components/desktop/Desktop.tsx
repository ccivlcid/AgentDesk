import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import AppSwitcher, { useAppSwitcherKeyboard } from "./AppSwitcher";
import { deleteProject, createProject, deleteTrashedProjectDirectories } from "../../api/organization-projects";
import { createProjectFolder, addProjectToFolder, deleteProjectFolder, updateProjectFolder } from "../../api/project-folders";
import NotificationCenter from "../NotificationCenter";
// ── Kickoff Stage Overlay ────────────────────────────────────────────────────
type KickoffStage = "idle" | "planning" | "meeting" | "assigning" | "executing" | "done";

const KICKOFF_STEPS: { key: KickoffStage; label: { ko: string; en: string; ja: string; zh: string } }[] = [
  { key: "meeting", label: { ko: "킥오프 회의", en: "Meeting", ja: "会議", zh: "会议" } },
  { key: "planning", label: { ko: "태스크 생성", en: "Planning", ja: "タスク生成", zh: "任务创建" } },
  { key: "assigning", label: { ko: "에이전트 배정", en: "Assigning", ja: "配属", zh: "分配" } },
  { key: "executing", label: { ko: "업무 실행", en: "Executing", ja: "実行", zh: "执行" } },
];

const STAGE_ORDER: KickoffStage[] = ["meeting", "planning", "assigning", "executing"];

function getStepState(stepKey: KickoffStage, currentStage: KickoffStage): "done" | "active" | "pending" {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stepIdx = STAGE_ORDER.indexOf(stepKey);
  if (currentStage === "done") return "done";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

function KickoffStageOverlay() {
  const kickoffStage = useUiStore((s) => s.kickoffStage);
  const { t } = useI18n();
  const visible = kickoffStage !== "idle";

  return (
    <AnimatePresence>
      {visible && (<>
        <style>{`
          @keyframes kickoff-pulse { 0%,100%{box-shadow:0 0 4px var(--th-accent,#f59e0b)} 50%{box-shadow:0 0 12px var(--th-accent,#f59e0b)} }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 900,
            pointerEvents: "none",
          }}
        >
        <div
          style={{
            background: "var(--th-panel-bg, rgba(18,18,18,0.92))",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            padding: "12px 24px",
            boxShadow: "0 12px 40px var(--th-modal-overlay)",
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {KICKOFF_STEPS.map((step, i) => {
            const state = getStepState(step.key, kickoffStage);
            return (
              <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
                {/* Connector line (before each step except first) */}
                {i > 0 && (
                  <div style={{
                    width: 32,
                    height: 2,
                    borderRadius: 1,
                    background: state === "pending"
                      ? "var(--th-text-muted)"
                      : "var(--th-success, #22c55e)",
                    transition: "background 0.3s ease",
                    margin: "0 4px",
                    marginBottom: 18,
                  }} />
                )}
                {/* Step circle + label */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 56 }}>
                  {state === "done" ? (
                    /* Green checkmark circle */
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--th-success, #22c55e)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      color: "#fff",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : state === "active" ? (
                    /* Active: accent circle with spinner */
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--th-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 0 8px #3B82F6",
                      animation: "kickoff-pulse 1.5s ease-in-out infinite",
                      color: "#fff",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </div>
                  ) : (
                    /* Pending: gray outline */
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      border: "2px solid #9CA3AF",
                      background: "transparent",
                      flexShrink: 0,
                    }} />
                  )}
                  {/* Label */}
                  <span style={{
                    fontFamily: "var(--th-font-mono)",
                    fontSize: 11,
                    fontWeight: state === "active" ? 700 : 500,
                    color: state === "done"
                      ? "var(--th-success, #22c55e)"
                      : state === "active"
                        ? "var(--th-accent)"
                        : "var(--th-text-muted)",
                    whiteSpace: "nowrap",
                    transition: "color 0.3s ease",
                  }}>
                    {t(step.label)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  );
}

export default function Desktop({
  connected,
  on,
  onSaveSettings,
  onRefreshCli,
  oauthResult,
  onOauthResultClear,
  onAgentsChange,
  onProjectCreate,
  onOpenDecisionInbox,
  children,
}: DesktopProps) {
  const {
    openWindows,
    openWindow,
    openSettings,
    toggleWindow,
    jiggleMode,
    setJiggleMode,
    missionControlOpen,
    setMissionControlOpen,
    setDesktopIconLayout,
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
  } = useUiStore();

  const { projects, categories, currentProjectId, projectAgentIds, setCurrentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { agents } = useAgentStore();
  const { tasks, decisionInboxItems } = useTaskStore();
  const runningAgentCount = agents.filter((a) => a.status === "working").length;
  const projectAgentCount = projectAgentIds.size;
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
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [projectCtxMenu, setProjectCtxMenu] = useState<{ x: number; y: number; projectId: string; projectName: string } | null>(null);
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
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderPreName, setNewFolderPreName] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const { setProjects } = useProjectStore();
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const handleEmptyTrash = useCallback(async () => {
    const items = [...useUiStore.getState().trashedProjects];
    if (items.length === 0) return;
    const { removedIds, failedCount } = await deleteTrashedProjectDirectories(items);
    for (const id of removedIds) removeFromTrash(id);
    if (failedCount === 0) {
      showToast(
        t({
          ko: "휴지통 항목의 폴더를 삭제했습니다",
          en: "Deleted project folders from disk",
          ja: "ゴミ箱のプロジェクトフォルダを削除しました",
          zh: "已删除垃圾桶中项目的文件夹",
        }),
        "success",
      );
    } else if (removedIds.length > 0) {
      showToast(
        t({
          ko: `일부 폴더만 삭제됨 (${failedCount}개 실패)`,
          en: `Some folders could not be deleted (${failedCount} failed)`,
          ja: `一部のフォルダを削除できませんでした（失敗 ${failedCount}）`,
          zh: `部分文件夹未删除（${failedCount} 个失败）`,
        }),
        "error",
      );
    } else {
      showToast(
        t({
          ko: "폴더 삭제에 실패했습니다",
          en: "Could not delete folders on disk",
          ja: "フォルダを削除できませんでした",
          zh: "无法删除磁盘上的文件夹",
        }),
        "error",
      );
    }
  }, [removeFromTrash, showToast, t]);
  useAppSwitcherKeyboard();
  useDesktopData(
    setFolders,
    newFolderPos,
    newFolderInputRef,
    newFolderCreating,
  );
  const handleDropDocToProject = useCallback(async (docId: string, project: { id: string; project_path: string; name: string }) => {
    const doc = useUiStore.getState().pendingDocs.find((d) => d.id === docId);
    if (!doc) return;
    const filename = `${doc.title.replace(/[/\\:*?"<>|]/g, "_")}.md`;
    try {
      const res = await fetch("/api/projects/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_path: project.project_path, filename, content: doc.content }),
      });
      if (res.ok && (await res.json()).ok) removePendingDoc(docId);
    } catch { /* network error — doc stays in pendingDocs for retry */ }
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
    openSettings,
    openCli,
    toggleWindow,
    onOpenDecisionInbox,
    decisionInboxItems,
  });
  const { sortByName, sortByDefault, snapToGrid, sortByLastUsed } = useDesktopSortSnap(icons, projects);
  const { onDesktopMouseDown, onDesktopMouseMove, onDesktopMouseUp, onDesktopClick } = useDesktopJiggle({
    jiggleMode,
    setJiggleMode,
    setCtxMenu,
    setProjectCtxMenu,
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
      runProjectInfo, setRunProjectInfo, projectCtxMenu, setProjectCtxMenu, ctxMenu, setCtxMenu,
      agentManagerCreateCount, showQuickCreateAgent, setShowQuickCreateAgent, newFolderModalOpen, newFolderPreName,
      setNewFolderModalOpen, newFolderCreatingRef: newFolderCreating, createProjectFolder, setNewFolderPreName,
      showExportModal, setShowExportModal, showMarkdownEditor, setShowMarkdownEditor,
      quickLookProjectId, setQuickLookProjectId, missionControlOpen, setMissionControlOpen, handleDeleteProject,
      openProjectWindowIds, setOpenProjectWindowIds, setCurrentProjectId, setSelectedProjectId, addProjectToFolder, setFolders,
      newFolderPos, setNewFolderPos, newFolderName, setNewFolderName, newFolderInputRef,
      showCommandPalette, setShowCommandPalette, sortByName, sortByDefault, sortByLastUsed, snapToGrid, setDesktopIconLayout, createProject,
      showTrash, setShowTrash, folders,
      onSaveSettings, onRefreshCli, oauthResult, onOauthResultClear, onAgentsChange,
    }),
    // overlay block deps (stable refs/setters omitted)
    [runProjectInfo, projectCtxMenu, ctxMenu, agentManagerCreateCount, showQuickCreateAgent, newFolderModalOpen, newFolderPreName, newFolderCreating, showExportModal, showMarkdownEditor, quickLookProjectId, missionControlOpen, handleDeleteProject, openProjectWindowIds, setFolders, newFolderPos, newFolderName, newFolderInputRef, showCommandPalette, sortByName, sortByDefault, sortByLastUsed, snapToGrid, setDesktopIconLayout, showTrash, folders, onSaveSettings, onRefreshCli, oauthResult, onOauthResultClear, onAgentsChange, setCurrentProjectId, setMissionControlOpen],
  );
  const overlayBlockProps = useDesktopOverlayBlockProps(overlayBridge);
  return (
    <DesktopChrome
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
        onOpenMissionControl: () => setMissionControlOpen(true),
        onOpenUserGuide: () => toggleWindow("user-guide"),
        onOpenCommandPalette: () => setShowCommandPalette(true),
        onOpenExportModal: () => setShowExportModal(true),
        runningAgentCount,
        projectAgentCount,
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
        onEmptyTrash: handleEmptyTrash,
      }}
      dockProps={{
        onCreateProject: onProjectCreate,
        onCreateAgent: () => setShowQuickCreateAgent(true),
        onImportRepo: () => openWindow("repo-store"),
      }}
    >
      <KickoffStageOverlay />
      <DesktopOverlayBlock {...overlayBlockProps}>{children}</DesktopOverlayBlock>
    </DesktopChrome>
  );
}
