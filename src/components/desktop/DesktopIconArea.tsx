import type React from "react";
import { useEffect, useState } from "react";
import type { Project, Category, ProjectFolder } from "../../types";
import type { I18nContextValue } from "../../i18n";
import DesktopIcon, { type DesktopIconDef } from "./DesktopIcon";
import FolderDesktopIcon from "./FolderDesktopIcon";
import { TrashIcon } from "./DesktopTrash";
import { IconMarkdownDoc, IconFolder, IconRepoStore } from "./DesktopIcons";
import { getCategoryIcon } from "./getCategoryIcon";
import { useUiStore } from "../../store/uiStore";
import { ICON_GRID_X, ICON_GRID_Y, GRID_ORIGIN_X, GRID_ORIGIN_Y, getIconsPerColumn, snapToFreeCell } from "./snapToFreeCell";

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
  const { newlyInstalledProjectId, setNewlyInstalledProjectId, desktopIconLayout, setDesktopIconLayout, openWindow } = useUiStore();

  const [groupDragInitialPositions, setGroupDragInitialPositions] = useState<Record<string, { x: number; y: number }> | null>(null);

  const handleGroupDragStart = (draggedId: string, currentX: number, currentY: number) => {
    // If the dragged icon is part of current selection, start group drag
    const isAlreadySelected = selectedIconIds.has(draggedId);
    const targetSelection = isAlreadySelected ? selectedIconIds : new Set([draggedId]);
    
    if (!isAlreadySelected) {
      setSelectedIconIds(targetSelection);
    }

    const initial: Record<string, { x: number; y: number }> = {};
    targetSelection.forEach(id => {
      // 1. check layout store
      const entry = desktopIconLayout[id];
      if (entry) {
        initial[id] = { ...entry };
      } else {
        // 2. if not in layout, it's either currently being dragged (use currentX/Y)
        // or just sitting at its default position. 
        // We'll rely on the DesktopIcon reporting its current position via onDragStart call
        if (id === draggedId) {
          initial[id] = { x: currentX, y: currentY };
        } else {
          // This is a fallback - for other selected icons not in layout, 
          // we'd need to find their default positions.
          // For now, we prioritize the icons already in layout or the one being grabbed.
        }
      }
    });
    setGroupDragInitialPositions(initial);
  };

  const handleGroupDragMove = (dx: number, dy: number) => {
    if (!groupDragInitialPositions) return;
    
    const nextLayout = { ...desktopIconLayout };
    Object.keys(groupDragInitialPositions).forEach(id => {
      const startPos = groupDragInitialPositions[id];
      nextLayout[id] = { x: startPos.x + dx, y: startPos.y + dy };
    });
    setDesktopIconLayout(nextLayout);
  };

  const handleGroupDragEnd = (draggedId: string, finalX: number, finalY: number) => {
    const current = { ...useUiStore.getState().desktopIconLayout };
    
    if (groupDragInitialPositions) {
      // Final snap for all icons in the group
      const nextLayout = { ...current };
      Object.keys(groupDragInitialPositions).forEach(id => {
        const currentPos = nextLayout[id];
        if (currentPos) {
          const snapped = snapToFreeCell(currentPos.x, currentPos.y, id, nextLayout);
          nextLayout[id] = snapped;
        }
      });
      setDesktopIconLayout(nextLayout);
      setGroupDragInitialPositions(null);
    } else {
      // Single icon snap
      const snapped = snapToFreeCell(finalX, finalY, draggedId, current);
      setDesktopIconLayout({ ...current, [draggedId]: snapped });
    }
  };

  // 애니메이션 후 자동 클리어 (0.6초)
  useEffect(() => {
    if (!newlyInstalledProjectId) return;
    const timer = setTimeout(() => setNewlyInstalledProjectId(null), 600);
    return () => clearTimeout(timer);
  }, [newlyInstalledProjectId, setNewlyInstalledProjectId]);

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
            onDragStart={(id, x, y) => handleGroupDragStart(id, x, y)}
            onDragMove={handleGroupDragMove}
            onDragEnd={handleGroupDragEnd}
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
            onDragStart={(id, x, y) => handleGroupDragStart(id, x, y)}
            onDragMove={handleGroupDragMove}
            onDragEnd={handleGroupDragEnd}
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
          onSelect={() => {
            if (!selectedIconIds.has(`folder-${folder.id}`)) {
              setSelectedIconIds(new Set([`folder-${folder.id}`]));
            }
          }}
          onDragStart={(id, x, y) => handleGroupDragStart(id, x, y)}
          onDragMove={handleGroupDragMove}
          onDragEnd={handleGroupDragEnd}
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
          // Projects go after app icons + 1 (trash) + docs + folders
          const baseCol = Math.floor(allIcons.length / perCol) + 1;
          const extraBefore = pendingDocs.length + folders.length + 1; /* +1 for trash */
          const gi = baseCol * perCol + extraBefore + i;
          const col = Math.floor(gi / perCol);
          const row = gi % perCol;
          const isActive = project.id === currentProjectId;
          const isGitHubRepo = !!project.github_repo;
          const category = categories.find((c) => c.id === project.category_id);
          const catColor = isGitHubRepo ? "#30d158" : (category?.color ?? "#4a5568");
          const accentColor = isActive ? catColor : catColor;
          const ProjectIcon = getCategoryIcon(project.category_id);
          const iconFn = isGitHubRepo && !ProjectIcon
            ? (c: string) => <IconRepoStore color={c} />
            : ProjectIcon
              ? (c: string) => <ProjectIcon color={c} />
              : (c: string) => <IconFolder color={c} open={isActive} />;
          const def: DesktopIconDef = {
            id: `project-${project.id}`,
            icon: iconFn,
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
              isNewlyInstalled={project.id === newlyInstalledProjectId}
              onDragStart={(id, x, y) => handleGroupDragStart(id, x, y)}
              onDragMove={handleGroupDragMove}
              onDragEnd={handleGroupDragEnd}
            />
          );
        })}
    </div>
  );
}
