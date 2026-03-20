/**
 * DesktopOverlayBlock에 넘길 props를 스토어 + bridge로부터 조합.
 */

import { useMemo } from "react";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useI18n } from "../../i18n";
import { useToast } from "../ui/Toast";
import type { Project, ProjectFolder } from "../../types";
import type { DesktopOverlayBlockProps } from "./DesktopOverlayBlock";

export interface DesktopOverlayBlockBridge {
  runProjectInfo: { projectId: string; projectName: string; projectPath: string } | null;
  setRunProjectInfo: (v: { projectId: string; projectName: string; projectPath: string } | null) => void;
  projectCtxMenu: { x: number; y: number; projectId: string; projectName: string } | null;
  setProjectCtxMenu: (v: { x: number; y: number; projectId: string; projectName: string } | null) => void;
  cfCtxMenu: { x: number; y: number; featureId: string; featureName: string } | null;
  setCfCtxMenu: (v: { x: number; y: number; featureId: string; featureName: string } | null) => void;
  ctxMenu: { x: number; y: number } | null;
  setCtxMenu: (v: { x: number; y: number } | null) => void;
  agentManagerCreateCount: number;
  showQuickCreateAgent: boolean;
  setShowQuickCreateAgent: (v: boolean) => void;
  newFolderModalOpen: boolean;
  newFolderPreName: string;
  setNewFolderModalOpen: (v: boolean) => void;
  newFolderCreatingRef: React.MutableRefObject<boolean>;
  createProjectFolder: (params: { name: string; base_path: string; color: string }) => Promise<import("../../types").ProjectFolder>;
  setNewFolderPreName: (v: string) => void;
  showWallpaperPicker: boolean;
  setShowWallpaperPicker: (v: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (v: boolean) => void;
  showMarkdownEditor: boolean;
  setShowMarkdownEditor: (v: boolean) => void;
  quickLookProjectId: string | null;
  setQuickLookProjectId: (v: string | null) => void;
  missionControlOpen: boolean;
  setMissionControlOpen: (v: boolean) => void;
  handleDeleteProject: (projectId: string) => Promise<void>;
  openProjectWindowIds: Set<string>;
  setOpenProjectWindowIds: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setCurrentProjectId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  addProjectToFolder: (folderId: string, projectId: string) => Promise<{ new_path: string }>;
  setFolders: (v: import("../../types").ProjectFolder[] | ((prev: import("../../types").ProjectFolder[]) => import("../../types").ProjectFolder[])) => void;
  openCustomApp: (id: string) => void;
  closeCustomApp: (id: string) => void;
  addFeatureToTrash: (v: { id: string; name: string; icon_svg: string | null }) => void;
  setCustomFeatures: (v: import("../../types").CustomFeature[] | ((prev: import("../../types").CustomFeature[]) => import("../../types").CustomFeature[])) => void;
  newFolderPos: { x: number; y: number } | null;
  setNewFolderPos: (v: { x: number; y: number } | null) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  newFolderInputRef: React.RefObject<HTMLInputElement | null>;
  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;
  sortByName: () => void;
  sortByDefault: () => void;
  sortByLastUsed: () => void;
  snapToGrid: () => void;
  setDesktopIconLayout: (v: Record<string, { x: number; y: number }>) => void;
  createProject: (params: { name: string; project_path: string; core_goal: string; create_path_if_missing: boolean }) => Promise<import("../../types").Project>;
  showTrash: boolean;
  setShowTrash: (v: boolean) => void;
  folders: import("../../types").ProjectFolder[];
  customFeatures: import("../../types").CustomFeature[];
  onSaveSettings: (settings: import("../../types").CompanySettings) => Promise<void>;
  onRefreshCli: () => Promise<void>;
  oauthResult: import("../../app/types").OAuthCallbackResult | null;
  onOauthResultClear: () => void;
  onAgentsChange: () => void;
  onSendMessage: (content: string, receiverType: "agent" | "department" | "all", receiverId?: string, messageType?: string, projectMeta?: import("../../app/types").ProjectMetaPayload) => Promise<void>;
  onSendAnnouncement: (content: string) => Promise<void>;
  onSendDirective: (content: string, projectMeta?: import("../../app/types").ProjectMetaPayload) => Promise<void>;
  onClearMessages: (agentId?: string) => Promise<void>;
  onCreateTask: () => void;
}

export function useDesktopOverlayBlockProps(bridge: DesktopOverlayBlockBridge): Omit<DesktopOverlayBlockProps, "children"> {
  const {
    openWindows,
    openWindow,
    toggleWindow,
    openCliAgentIds,
    closeCliWindow,
    openCustomApps,
    closeCustomApp,
    openFolders,
    closeFolder,
    openCliWindow,
    trashedProjects,
    trashedFeatures,
    removeFromTrash,
    emptyTrash,
    removeFeatureFromTrash,
    setDesktopIconLayout,
  } = useUiStore();
  const { projects, categories, currentProjectId, setCurrentProjectId, setProjects } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const { t } = useI18n();
  const { showToast } = useToast();

  return useMemo(() => {
    const {
      runProjectInfo,
      setRunProjectInfo,
      projectCtxMenu,
      setProjectCtxMenu,
      cfCtxMenu,
      setCfCtxMenu,
      ctxMenu,
      setCtxMenu,
      agentManagerCreateCount,
      showQuickCreateAgent,
      setShowQuickCreateAgent,
      newFolderModalOpen,
      newFolderPreName,
      setNewFolderModalOpen,
      newFolderCreatingRef,
      createProjectFolder,
      setNewFolderPreName,
      showWallpaperPicker,
      setShowWallpaperPicker,
      showExportModal,
      setShowExportModal,
      showMarkdownEditor,
      setShowMarkdownEditor,
      quickLookProjectId,
      setQuickLookProjectId,
      missionControlOpen,
      setMissionControlOpen,
      handleDeleteProject,
      openProjectWindowIds,
      setOpenProjectWindowIds,
      setCurrentProjectId,
      setSelectedProjectId,
      addProjectToFolder,
      setFolders,
      openCustomApp,
      closeCustomApp,
      addFeatureToTrash,
      setCustomFeatures,
      newFolderPos,
      setNewFolderPos,
      newFolderName,
      setNewFolderName,
      newFolderInputRef,
      showCommandPalette,
      setShowCommandPalette,
      sortByName,
      sortByDefault,
      sortByLastUsed,
      snapToGrid,
      createProject,
      showTrash,
      setShowTrash,
      folders,
      customFeatures,
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
    } = bridge;

    const windowStackProps = {
      openWindows,
      openWindow,
      openCliAgentIds,
      closeCliWindow,
      openCustomApps,
      customFeatures,
      closeCustomApp,
      folders,
      openFolders,
      closeFolder,
      projects,
      setFolders,
      setProjects,
      openProjectWindowIds,
      setOpenProjectWindowIds,
      setCurrentProjectId,
      tasks,
      agents,
      onSaveSettings,
      onRefreshCli,
      oauthResult,
      onOauthResultClear,
      onAgentsChange,
      onSendMessage,
      onSendAnnouncement,
      onSendDirective,
      onClearMessages,
      agentManagerCreateCount,
      showQuickCreateAgent,
      setShowQuickCreateAgent,
      newFolderModalOpen,
      newFolderPreName,
      setNewFolderModalOpen,
      newFolderCreatingRef,
      createProjectFolder,
      setNewFolderPreName,
      showWallpaperPicker,
      setShowWallpaperPicker,
      showExportModal,
      setShowExportModal,
      showMarkdownEditor,
      setShowMarkdownEditor,
      currentProject,
      quickLookProjectId,
      setQuickLookProjectId,
      missionControlOpen,
      setMissionControlOpen,
      handleDeleteProject,
    };

    const projectCtxMenuProps = {
      projects,
      folders,
      t,
      onClose: () => setProjectCtxMenu(null),
      onRunApp: (projectId: string) => {
        const proj = projects.find((p) => p.id === projectId);
        if (proj) setRunProjectInfo({ projectId: proj.id, projectName: proj.name, projectPath: proj.project_path });
      },
      onOpen: (projectId: string) => {
        setOpenProjectWindowIds((prev) => new Set([...prev, projectId]));
        setCurrentProjectId(projectId);
      },
      onQuickLook: (projectId: string) => {
        setSelectedProjectId(projectId);
        setQuickLookProjectId(projectId);
      },
      onSwitchProject: setCurrentProjectId,
      onDelete: handleDeleteProject,
      onMoveToFolder: async (projectId: string, folderId: string) => {
        const result = await addProjectToFolder(folderId, projectId);
        const proj = projects.find((p: Project) => p.id === projectId);
        setFolders((prev: ProjectFolder[]) =>
          prev.map((f: ProjectFolder) =>
            f.id !== folderId
              ? f
              : !proj
                ? f
                : {
                    ...f,
                    projects: [
                      ...f.projects.filter((p) => p.id !== proj.id),
                      { id: proj.id, name: proj.name, project_path: result.new_path, category_id: proj.category_id ?? null },
                    ],
                  },
          ),
        );
        setProjects((prev: Project[]) =>
          prev.map((p: Project) => (p.id === projectId ? { ...p, folder_id: folderId, project_path: result.new_path } : p)),
        );
      },
    };

    const cfCtxMenuProps = {
      customFeatures,
      t,
      onClose: () => setCfCtxMenu(null),
      onOpen: openCustomApp,
      onDelete: (featureId: string, featureName: string, iconSvg: string | null) => {
        closeCustomApp(featureId);
        addFeatureToTrash({ id: featureId, name: featureName, icon_svg: iconSvg });
        setCustomFeatures((prev) => prev.filter((cf) => cf.id !== featureId));
      },
    };

    const overlayProps = {
      ctxMenu,
      setCtxMenu,
      t,
      sortByName,
      sortByDefault,
      sortByLastUsed,
      snapToGrid,
      setShowWallpaperPicker,
      setNewFolderPos,
      setNewFolderName,
      setShowMarkdownEditor,
      setDesktopIconLayout,
      newFolderPos,
      newFolderInputRef,
      newFolderName,
      newFolderCreatingRef,
      setNewFolderPreName,
      setNewFolderModalOpen,
      showCommandPalette,
      setShowCommandPalette,
      agents,
      tasks,
      projects,
      currentProject,
      openWindow,
      onCreateTask,
      setCurrentProjectId,
      toggleWindow,
      openWindows,
      runProjectInfo,
      setRunProjectInfo,
      openCliWindow,
      trashedProjects,
      trashedFeatures,
      showTrash,
      setShowTrash,
      removeFromTrash,
      createProject,
      setProjects,
      showToast,
      setCustomFeatures,
      removeFeatureFromTrash,
      emptyTrash,
    };

    return {
      windowStackProps,
      projectCtxMenu,
      projectCtxMenuProps,
      cfCtxMenu,
      cfCtxMenuProps,
      overlayProps,
    };
  }, [
    bridge,
    openWindows,
    openWindow,
    openCliAgentIds,
    closeCliWindow,
    openCustomApps,
    bridge.customFeatures,
    closeCustomApp,
    bridge.folders,
    openFolders,
    closeFolder,
    projects,
    bridge.setFolders,
    setProjects,
    tasks,
    agents,
    currentProject,
    trashedProjects,
    trashedFeatures,
    openCliWindow,
    removeFromTrash,
    emptyTrash,
    removeFeatureFromTrash,
    setDesktopIconLayout,
  ]);
}
