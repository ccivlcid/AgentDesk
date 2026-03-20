import type { ReactNode } from "react";
import type { Project, Agent, Task, CustomFeature } from "../../types";
import type { WindowType } from "../../app/types";
import type { I18nContextValue } from "../../i18n";
import type { TrashedProject, TrashedFeature } from "./DesktopTypes";
import ContextMenu from "../ui/ContextMenu";
import CommandPalette from "../CommandPalette";
import UserGuidePanel from "./UserGuidePanel";
import AgentDetailPanel from "../agent-detail/AgentDetailPanel";
import { RunProjectModal } from "./DesktopRunProjectModal";
import { TrashModal } from "./DesktopTrash";
import { buildRunPrompt } from "./DesktopRunProjectModal";
import { listCustomFeatures, deleteCustomFeature } from "../../api/custom-features";

export interface DesktopOverlaysProps {
  ctxMenu: { x: number; y: number } | null;
  setCtxMenu: (v: { x: number; y: number } | null) => void;
  t: I18nContextValue["t"];
  sortByName: () => void;
  sortByDefault: () => void;
  snapToGrid: () => void;
  setShowWallpaperPicker: (v: boolean) => void;
  setNewFolderPos: (v: { x: number; y: number } | null) => void;
  setNewFolderName: (v: string) => void;
  setShowMarkdownEditor: (v: boolean) => void;
  setDesktopIconLayout: (v: Record<string, { x: number; y: number }>) => void;
  newFolderPos: { x: number; y: number } | null;
  newFolderInputRef: React.RefObject<HTMLInputElement | null>;
  newFolderName: string;
  newFolderCreatingRef: React.MutableRefObject<boolean>;
  setNewFolderPreName: (v: string) => void;
  setNewFolderModalOpen: (v: boolean) => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;
  agents: Agent[];
  tasks: Task[];
  projects: Project[];
  currentProject: Project | null;
  openWindow: (w: WindowType) => void;
  onCreateTask: () => void;
  setCurrentProjectId: (id: string | null) => void;
  toggleWindow: (w: WindowType) => void;
  openWindows: Set<WindowType>;
  runProjectInfo: { projectId: string; projectName: string; projectPath: string } | null;
  setRunProjectInfo: (v: { projectId: string; projectName: string; projectPath: string } | null) => void;
  openCliWindow: (agentId: string, prompt: string) => void;
  trashedProjects: TrashedProject[];
  trashedFeatures: TrashedFeature[];
  showTrash: boolean;
  setShowTrash: (v: boolean) => void;
  removeFromTrash: (id: string) => void;
  createProject: (params: {
    name: string;
    project_path: string;
    core_goal: string;
    create_path_if_missing: boolean;
  }) => Promise<Project>;
  setProjects: (v: Project[] | ((prev: Project[]) => Project[])) => void;
  showToast: (message: string, type: "success" | "error") => void;
  setCustomFeatures: (v: CustomFeature[] | ((prev: CustomFeature[]) => CustomFeature[])) => void;
  removeFeatureFromTrash: (id: string) => void;
  emptyTrash: () => void;
  children?: ReactNode;
}

export function DesktopOverlays({
  ctxMenu,
  setCtxMenu,
  t,
  sortByName,
  sortByDefault,
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
  children,
}: DesktopOverlaysProps) {
  return (
    <>
      {ctxMenu && (
        <ContextMenu
          data-no-ctx="true"
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          entries={[
            { type: "section", label: t({ ko: "정렬 방식", en: "ARRANGE", ja: "並べ替え", zh: "排列方式" }) },
            {
              label: t({ ko: "이름순 정렬", en: "Sort by Name", ja: "名前順で並べ替え", zh: "按名称排序" }),
              icon: "Az",
              onClick: sortByName,
            },
            {
              label: t({ ko: "기본 순서로 정렬", en: "Sort by Default", ja: "デフォルト順", zh: "默认排序" }),
              icon: "↺",
              onClick: sortByDefault,
            },
            {
              label: t({ ko: "격자에 맞추기", en: "Snap to Grid", ja: "グリッドに合わせる", zh: "对齐网格" }),
              icon: "⊞",
              onClick: snapToGrid,
            },
            { type: "separator" },
            { type: "section", label: t({ ko: "바탕화면", en: "DESKTOP", ja: "デスクトップ", zh: "桌面" }) },
            {
              label: t({ ko: "배경화면 변경", en: "Change Wallpaper", ja: "壁紙を変更", zh: "更换壁纸" }),
              icon: "🖼",
              onClick: () => setShowWallpaperPicker(true),
            },
            {
              label: t({ ko: "새 폴더", en: "New Folder", ja: "新規フォルダ", zh: "新建文件夹" }),
              icon: "📁",
              onClick: () => {
                setNewFolderPos({ x: ctxMenu.x, y: ctxMenu.y });
                setNewFolderName("");
              },
            },
            {
              label: t({ ko: "마크다운 문서 만들기", en: "New Markdown Doc", ja: "Markdownドキュメント", zh: "新建Markdown文档" }),
              icon: "📝",
              onClick: () => setShowMarkdownEditor(true),
            },
            {
              label: t({ ko: "아이콘 위치 초기화", en: "Reset Icon Positions", ja: "アイコン位置をリセット", zh: "重置图标位置" }),
              icon: "⌖",
              onClick: () => setDesktopIconLayout({}),
            },
          ]}
        />
      )}

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
          <div
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              lineHeight: 1,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
            }}
          >
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
                if (newFolderCreatingRef.current) return;
                newFolderCreatingRef.current = true;
                const name =
                  newFolderName.trim() ||
                  t({ ko: "새 폴더", en: "New Folder", ja: "新規フォルダ", zh: "新建文件夹" });
                setNewFolderPreName(name);
                setNewFolderPos(null);
                setNewFolderModalOpen(true);
              } else if (e.key === "Escape") {
                newFolderCreatingRef.current = true;
                setNewFolderPos(null);
              }
            }}
            onBlur={() => {
              if (newFolderCreatingRef.current) return;
              newFolderCreatingRef.current = true;
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
            skills: () => openWindow("library"),
            "agent-rules": () => openWindow("library"),
            memory: () => openWindow("library"),
            hooks: () => openWindow("library"),
            settings: () => openWindow("settings"),
            agents: () => openWindow("agent-manager"),
          };
          viewWindowMap[view]?.();
        }}
        onCreateTask={() => {
          setShowCommandPalette(false);
          onCreateTask();
        }}
        onSelectProject={(p) => {
          setShowCommandPalette(false);
          setCurrentProjectId(p.id);
        }}
        onOpenShortcutsGuide={() => {
          setShowCommandPalette(false);
          toggleWindow("user-guide");
        }}
      />

      {openWindows.has("user-guide") && <UserGuidePanel />}
      <AgentDetailPanel />

      {runProjectInfo && (
        <RunProjectModal
          t={t}
          info={runProjectInfo}
          agents={agents}
          onClose={() => setRunProjectInfo(null)}
          onRun={(agentId) => {
            const prompt = buildRunPrompt(runProjectInfo.projectName, runProjectInfo.projectPath);
            openCliWindow(agentId, prompt);
            setRunProjectInfo(null);
          }}
        />
      )}

      {showTrash && (
        <TrashModal
          t={t}
          items={trashedProjects}
          features={trashedFeatures}
          onClose={() => setShowTrash(false)}
          onRestore={async (item) => {
            removeFromTrash(item.id);
            try {
              const proj = await createProject({
                name: item.name,
                project_path: item.project_path,
                core_goal: item.core_goal,
                create_path_if_missing: false,
              });
              setProjects((prev) => [...prev, proj]);
              showToast(
                t({
                  ko: `"${item.name}" 복원됨`,
                  en: `"${item.name}" restored`,
                  ja: `"${item.name}" を復元`,
                  zh: `"${item.name}" 已还原`,
                }),
                "success",
              );
            } catch {
              showToast(
                t({ ko: "복원 실패", en: "Restore failed", ja: "復元失敗", zh: "还原失败" }),
                "error",
              );
            }
          }}
          onDelete={(item) => removeFromTrash(item.id)}
          onRestoreFeature={(f) => {
            removeFeatureFromTrash(f.id);
            listCustomFeatures()
              .then((list) =>
                setCustomFeatures(
                  list.filter((cf) => cf.status === "active" || cf.status === "pending_install"),
                ),
              )
              .catch(() => {});
          }}
          onDeleteFeature={async (f) => {
            removeFeatureFromTrash(f.id);
            await deleteCustomFeature(f.id).catch(() => {});
          }}
          onEmpty={async () => {
            for (const f of trashedFeatures) {
              await deleteCustomFeature(f.id).catch(() => {});
            }
            emptyTrash();
          }}
        />
      )}

      {children}
    </>
  );
}
