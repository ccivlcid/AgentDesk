import { lazy, Suspense } from "react";
import type { Project, ProjectFolder, Task, Agent, CompanySettings } from "../../types";
import type { OAuthCallbackResult, WindowType, ProjectMetaPayload } from "../../app/types";
import SettingsWindow from "../windows/SettingsWindow";
import AgentManagerWindow from "../windows/AgentManagerWindow";
import QuickCreateAgentModal from "../agent-manager/QuickCreateAgentModal";
import CliWindow from "../windows/CliWindow";
import ReportWindow from "../windows/ReportWindow";
import AppRunnerWindow from "../windows/AppRunnerWindow";
import FolderWindow from "../windows/FolderWindow";
import NewFolderModal from "./NewFolderModal";
import WallpaperPicker from "./WallpaperPicker";
import ExportModal from "../export/ExportModal";
import GitImportWindow from "../windows/GitImportWindow";
import MarkdownEditorModal from "./MarkdownEditorModal";
import QuickLook from "./QuickLook";
import ProjectFolderWindow from "./ProjectFolderWindow";
import MissionControl from "./MissionControl";
import DashboardWindow from "../windows/DashboardWindow";
import TaskBoardWindow from "../windows/TaskBoardWindow";
import SynapseWindow from "../windows/SynapseWindow";
import ImageStudioWindow from "../windows/ImageStudioWindow";
import FileTreeWindow from "../windows/FileTreeWindow";
import AlertsWindow from "../windows/AlertsWindow";
import CliCostWindow from "../windows/CliCostWindow";
import LocalLlmWindow from "../windows/LocalLlmWindow";
import WorkflowWindow from "../windows/WorkflowWindow";
import LibraryWindow from "../windows/LibraryWindow";
import LibraryGuideWindow from "../windows/LibraryGuideWindow";
import ChatEditorModal from "../settings/gateway-settings/ChatEditorModal";
import ChannelGuideModal from "../settings/gateway-settings/ChannelGuideModal";

const ChatWindow = lazy(() => import("../windows/ChatWindow").then((m) => ({ default: m.default })));

export interface DesktopWindowStackProps {
  openWindows: Set<WindowType>;
  openWindow: (w: WindowType) => void;
  openCliAgentIds: Set<string>;
  closeCliWindow: (agentId: string) => void;
  folders: ProjectFolder[];
  openFolders: Set<string>;
  closeFolder: (id: string) => void;
  projects: Project[];
  setFolders: (v: ProjectFolder[] | ((prev: ProjectFolder[]) => ProjectFolder[])) => void;
  setProjects: (v: Project[] | ((prev: Project[]) => Project[])) => void;
  openProjectWindowIds: Set<string>;
  setOpenProjectWindowIds: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setCurrentProjectId: (id: string | null) => void;
  tasks: Task[];
  agents: Agent[];
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
  agentManagerCreateCount: number;
  showQuickCreateAgent: boolean;
  setShowQuickCreateAgent: (v: boolean) => void;
  newFolderModalOpen: boolean;
  newFolderPreName: string;
  setNewFolderModalOpen: (v: boolean) => void;
  newFolderCreatingRef: React.MutableRefObject<boolean>;
  createProjectFolder: (params: { name: string; base_path: string; color: string }) => Promise<ProjectFolder>;
  setNewFolderPreName: (v: string) => void;
  showWallpaperPicker: boolean;
  setShowWallpaperPicker: (v: boolean) => void;
  showExportModal: boolean;
  setShowExportModal: (v: boolean) => void;
  showMarkdownEditor: boolean;
  setShowMarkdownEditor: (v: boolean) => void;
  currentProject: Project | null;
  quickLookProjectId: string | null;
  setQuickLookProjectId: (v: string | null) => void;
  missionControlOpen: boolean;
  setMissionControlOpen: (v: boolean) => void;
  handleDeleteProject: (projectId: string) => Promise<void>;
}

export function DesktopWindowStack({
  openWindows,
  openWindow,
  openCliAgentIds,
  closeCliWindow,
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
}: DesktopWindowStackProps) {
  const quickLookProject =
    quickLookProjectId ? projects.find((p) => p.id === quickLookProjectId) ?? null : null;

  return (
    <>
      {openWindows.has("dashboard") && <DashboardWindow />}
      {openWindows.has("tasks") && <TaskBoardWindow />}
      {openWindows.has("synapse") && <SynapseWindow />}
      {openWindows.has("image-studio") && <ImageStudioWindow />}
      {openWindows.has("file-tree") && <FileTreeWindow />}
      {openWindows.has("alerts") && <AlertsWindow />}
      {openWindows.has("cli-usage") && <CliCostWindow />}
      {openWindows.has("local-llm") && <LocalLlmWindow />}
      {openWindows.has("workflow") && <WorkflowWindow />}
      {openWindows.has("library") && <LibraryWindow />}
      {openWindows.has("library-guide") && <LibraryGuideWindow />}
      {openWindows.has("settings") && (
        <SettingsWindow
          onSaveSettings={onSaveSettings}
          onRefreshCli={onRefreshCli}
          oauthResult={oauthResult}
          onOauthResultClear={onOauthResultClear}
        />
      )}
      {openWindows.has("agent-manager") && (
        <AgentManagerWindow onAgentsChange={onAgentsChange} createTrigger={agentManagerCreateCount} />
      )}
      {showQuickCreateAgent && (
        <QuickCreateAgentModal
          onClose={() => setShowQuickCreateAgent(false)}
          onCreated={onAgentsChange}
        />
      )}
      {openWindows.has("cli") && <CliWindow />}
      {[...openCliAgentIds].map((agentId) => (
        <CliWindow
          key={`cli-agent-${agentId}`}
          agentId={agentId}
          onClose={() => closeCliWindow(agentId)}
        />
      ))}
      {openWindows.has("reports") && <ReportWindow />}
      {openWindows.has("chat") && (
        <Suspense fallback={null}>
          <ChatWindow
            onSendMessage={onSendMessage}
            onSendAnnouncement={onSendAnnouncement}
            onSendDirective={onSendDirective}
            onClearMessages={onClearMessages}
          />
        </Suspense>
      )}

      {folders.filter((f) => openFolders.has(f.id)).map((folder) => (
        <FolderWindow
          key={folder.id}
          folder={folder}
          allProjects={projects}
          onClose={() => closeFolder(folder.id)}
          onFolderUpdate={(updated) =>
            setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
          }
          onProjectCreated={(newProject) => setProjects((prev) => [...prev, newProject])}
          onProjectPathChanged={(projectId, newPath) =>
            setProjects((prev) =>
              prev.map((p) => (p.id === projectId ? { ...p, project_path: newPath } : p)),
            )
          }
          onProjectEjected={(projectId) =>
            setProjects((prev) =>
              prev.map((p) => (p.id === projectId ? { ...p, folder_id: null } : p)),
            )
          }
          onProjectAdded={(projectId, newPath) =>
            setProjects((prev) =>
              prev.map((p) =>
                p.id === projectId ? { ...p, folder_id: folder.id, project_path: newPath } : p,
              ),
            )
          }
        />
      ))}

      {newFolderModalOpen && (
        <NewFolderModal
          initialName={newFolderPreName}
          onConfirm={async (name, base_path, color) => {
            setNewFolderModalOpen(false);
            newFolderCreatingRef.current = false;
            try {
              const folder = await createProjectFolder({ name, base_path, color });
              setFolders((prev) => [...prev, folder]);
            } catch { /* ignore */ }
          }}
          onCancel={() => {
            setNewFolderModalOpen(false);
            newFolderCreatingRef.current = false;
          }}
        />
      )}

      {showWallpaperPicker && <WallpaperPicker onClose={() => setShowWallpaperPicker(false)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
      {openWindows.has("repo-store") && <GitImportWindow />}
      {openWindows.has("app-runner") && <AppRunnerWindow />}

      {showMarkdownEditor && (
        <MarkdownEditorModal
          onClose={() => setShowMarkdownEditor(false)}
          defaultProjectName={currentProject?.name}
        />
      )}

      {quickLookProject && (
        <QuickLook project={quickLookProject} onClose={() => setQuickLookProjectId(null)} />
      )}

      {[...openProjectWindowIds].map((pid, i) => {
        const proj = projects.find((p) => p.id === pid);
        if (!proj) return null;
        return (
          <ProjectFolderWindow
            key={pid}
            project={proj}
            tasks={tasks}
            agents={agents}
            onClose={() =>
              setOpenProjectWindowIds((prev) => {
                const next = new Set(prev);
                next.delete(pid);
                return next;
              })
            }
            onSelectProject={setCurrentProjectId}
            onDeleteProject={handleDeleteProject}
            initialX={Math.max(20, (window.innerWidth - 720) / 2) + i * 28}
            initialY={Math.max(44, (window.innerHeight - 540) / 3) + i * 28}
          />
        );
      })}

      {missionControlOpen && (
        <MissionControl
          openWindows={openWindows}
          onClose={() => setMissionControlOpen(false)}
          onFocusWindow={(w) => {
            openWindow(w);
            setMissionControlOpen(false);
          }}
        />
      )}
    </>
  );
}
