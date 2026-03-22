import type React from "react";
import type { Project, Category, ProjectFolder } from "../../types";
import type { I18nContextValue } from "../../i18n";
import DesktopIcon, { type DesktopIconDef } from "./DesktopIcon";
import FolderDesktopIcon from "./FolderDesktopIcon";
import { TrashIcon } from "./DesktopTrash";
import { IconMarkdownDoc, IconFolder } from "./DesktopIcons";
import { getCategoryIcon } from "./getCategoryIcon";
import { ICON_GRID_X, ICON_GRID_Y, GRID_ORIGIN_X, GRID_ORIGIN_Y, getIconsPerColumn } from "./snapToFreeCell";

export interface DesktopIconAreaProps {
  selectionRect: { x: number; y: number; w: number; h: number } | null;
  onContentMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContentClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  allIcons: DesktopIconDef[];
  DEFAULT_ICON_POSITIONS: Record<string, { x: number; y: number }>;
  selectedIconIds: Set<string>;
  setSelectedIconIds: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  pendingDocs: Array<{ id: string; title: string; content: string }>;
  removePendingDoc: (id: string) => void;
  folders: ProjectFolder[];
  projects: Project[];
  categories: Category[];
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setOpenProjectWindowIds: (v: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  dragOverFolderId: string | null;
  setDragOverFolderId: (v: string | null) => void;
  addProjectToFolder: (folderId: string, projectId: string) => Promise<{ new_path: string }>;
  setFolders: (v: ProjectFolder[] | ((prev: ProjectFolder[]) => ProjectFolder[])) => void;
  setProjects: (v: Project[] | ((prev: Project[]) => Project[])) => void;
  updateProjectFolder: (id: string, patch: { name?: string; color?: string }) => Promise<ProjectFolder>;
  deleteProjectFolder: (id: string) => Promise<unknown>;
  closeFolder: (id: string) => void;
  t: I18nContextValue["t"];
  showToast: (message: string, type: "success" | "error") => void;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleDropDocToProject: (docId: string, project: { id: string; project_path: string; name: string }) => Promise<void>;
  setProjectCtxMenu: (v: { x: number; y: number; projectId: string; projectName: string } | null) => void;
  trashedCount: number;
  setShowTrash: (v: boolean) => void;
  onEmptyTrash?: () => void;
}

export function DesktopIconArea({
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
  trashedCount,
  setShowTrash,
  onEmptyTrash,
}: DesktopIconAreaProps) {
  return (
    <div
      data-desktop-bg=""
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
      {pendingDocs.map((doc, i) => {
        const perCol = getIconsPerColumn();
        // Place pending docs after a gap from last app icon column
        const baseCol = Math.floor(allIcons.length / perCol) + 1;
        const gi = baseCol * perCol + i;
        const col = Math.floor(gi / perCol);
        const row = gi % perCol;
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
            defaultX={GRID_ORIGIN_X + col * ICON_GRID_X}
            defaultY={GRID_ORIGIN_Y + row * ICON_GRID_Y}
            isSelected={selectedIconIds.has(def.id)}
          />
        );
      })}
      {folders.map((folder, i) => {
        const perCol = getIconsPerColumn();
        // Place folders after app icons, continuing column-first
        const baseCol = Math.floor(allIcons.length / perCol) + 1;
        const gi = baseCol * perCol + pendingDocs.length + i;
        const col = Math.floor(gi / perCol);
        const row = gi % perCol;
        return (
        <FolderDesktopIcon
          key={folder.id}
          folder={folder}
          defaultX={GRID_ORIGIN_X + col * ICON_GRID_X}
          defaultY={GRID_ORIGIN_Y + row * ICON_GRID_Y}
          isSelected={selectedIconIds.has(`folder-${folder.id}`)}
          onSelect={() => setSelectedIconIds(new Set([`folder-${folder.id}`]))}
          isDragOver={dragOverFolderId === folder.id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverFolderId(folder.id);
          }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragOverFolderId(null);
            const pid = e.dataTransfer.getData("projectId");
            if (!pid) return;
            try {
              const result = await addProjectToFolder(folder.id, pid);
              const proj = projects.find((p) => p.id === pid);
              if (!proj) return;
              setFolders((prev) =>
                prev.map((f) =>
                  f.id !== folder.id
                    ? f
                    : { ...f, projects: [...f.projects, { id: proj.id, name: proj.name, project_path: result.new_path, category_id: proj.category_id ?? null }] },
                ),
              );
              setProjects((prev) => prev.map((p) => (p.id === pid ? { ...p, folder_id: folder.id, project_path: result.new_path } : p)));
            } catch {
              /* ignore */
            }
          }}
          onRename={(f) => {
            const name = window.prompt(t({ ko: "폴더 이름 변경", en: "Rename folder", ja: "フォルダ名変更", zh: "重命名文件夹" }), f.name);
            if (name?.trim()) {
              updateProjectFolder(f.id, { name: name.trim() })
                .then((updated) => {
                  setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, ...updated } : x)));
                })
                .catch(() => {
                  showToast(t({ ko: "폴더 이름 변경에 실패했습니다", en: "Failed to rename folder", ja: "フォルダ名の変更に失敗しました", zh: "重命名文件夹失败" }), "error");
                });
            }
          }}
          onDelete={(f) => {
            if (!window.confirm(t({ ko: `"${f.name}" 폴더를 삭제하시겠습니까?`, en: `Delete folder "${f.name}"?`, ja: `フォルダ"${f.name}"を削除しますか？`, zh: `删除文件夹"${f.name}"？` }))) return;
            deleteProjectFolder(f.id)
              .then(() => {
                setFolders((prev) => prev.filter((x) => x.id !== f.id));
                setProjects((prev) => prev.map((p) => (p.folder_id === f.id ? { ...p, folder_id: null } : p)));
                closeFolder(f.id);
              })
              .catch(() => {
                showToast(t({ ko: "폴더 삭제에 실패했습니다", en: "Failed to delete folder", ja: "フォルダの削除に失敗しました", zh: "删除文件夹失败" }), "error");
              });
          }}
          onColorChange={(f) => {
            const color = window.prompt(t({ ko: "색상 (hex, 예: #f59e0b)", en: "Color (hex, e.g. #3b82f6)", ja: "カラー (hex, 例: #f59e0b)", zh: "颜色 (hex, 如: #22c55e)" }), f.color);
            if (color?.trim()) {
              updateProjectFolder(f.id, { color: color.trim() })
                .then((updated) => {
                  setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, ...updated } : x)));
                })
                .catch(() => {
                  showToast(t({ ko: "폴더 색상 변경에 실패했습니다", en: "Failed to update folder color", ja: "フォルダカラーの変更に失敗しました", zh: "更新文件夹颜色失败" }), "error");
                });
            }
          }}
        />
      );
      })}
      <TrashIcon t={t} count={trashedCount} onClick={() => setShowTrash(true)} onEmptyTrash={onEmptyTrash} />
      {projects
        .filter((p) => !p.folder_id)
        .map((project, i) => {
          const perCol = getIconsPerColumn();
          // Projects go in a new column group after app icons, docs, and folders
          const baseCol = Math.floor(allIcons.length / perCol) + 1;
          const extraBefore = pendingDocs.length + folders.length;
          const gi = baseCol * perCol + extraBefore + i;
          const col = Math.floor(gi / perCol);
          const row = gi % perCol;
          const isActive = project.id === currentProjectId;
          const category = categories.find((c) => c.id === project.category_id);
          const catColor = category?.color ?? "#4a5568";
          const accentColor = isActive ? catColor : catColor + "99";
          const ProjectIcon = getCategoryIcon(project.category_id);
          const def: DesktopIconDef = {
            id: `project-${project.id}`,
            icon: (c) => (ProjectIcon ? <ProjectIcon color={c} /> : <IconFolder color={c} open={isActive} />),
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
              defaultX={GRID_ORIGIN_X + col * ICON_GRID_X}
              defaultY={GRID_ORIGIN_Y + row * ICON_GRID_Y}
              isSelected={selectedIconIds.has(`project-${project.id}`)}
            />
          );
        })}
    </div>
  );
}
