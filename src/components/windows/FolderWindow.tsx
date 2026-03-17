import { useState, useCallback, useRef } from "react";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import TrafficLights from "../desktop/TrafficLights";
import { addProjectToFolder, removeProjectFromFolder } from "../../api/project-folders";
import type { ProjectFolder, Project } from "../../types";

interface FolderWindowProps {
  folder: ProjectFolder;
  allProjects: Project[];
  onClose: () => void;
  onFolderUpdate: (updated: ProjectFolder) => void;
}

interface ProjectPickerDropdownProps {
  folder: ProjectFolder;
  allProjects: Project[];
  onAdd: (projectId: string) => void;
  onClose: () => void;
}

function ProjectPickerDropdown({ folder, allProjects, onAdd, onClose }: ProjectPickerDropdownProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const folderProjectIds = new Set(folder.projects.map((p) => p.id));
  const available = allProjects.filter(
    (p) => !folderProjectIds.has(p.id) && p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} onClick={onClose} />
      <div style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 0,
        maxHeight: 240,
        overflowY: "auto",
        marginBottom: 4,
        fontFamily: "var(--th-font-mono)",
      }}>
        <div style={{ padding: 8, borderBottom: "1px solid var(--th-border)" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder={t({ ko: "프로젝트 검색...", en: "Search projects...", ja: "プロジェクト検索...", zh: "搜索项目..." })}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--th-input-bg)",
              border: "1px solid var(--th-border)",
              borderRadius: 0,
              color: "var(--th-text-primary)",
              fontFamily: "var(--th-font-mono)",
              fontSize: 10,
              padding: "5px 8px",
              outline: "none",
            }}
          />
        </div>
        {available.length === 0 ? (
          <div style={{ padding: "10px 12px", fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "추가 가능한 프로젝트 없음", en: "No projects available", ja: "追加可能なプロジェクトなし", zh: "没有可添加的项目" })}
          </div>
        ) : (
          available.map((p) => (
            <button
              key={p.id}
              onClick={() => { onAdd(p.id); onClose(); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 12px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--th-border)",
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-bg-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 11, color: "var(--th-text-primary)" }}>🗂 {p.name}</div>
              <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>{p.project_path}</div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

const WIN_DEFAULTS = { x: 200, y: 100, w: 640, h: 440 };

export default function FolderWindow({ folder, allProjects, onClose, onFolderUpdate }: FolderWindowProps) {
  const { t } = useI18n();
  const { closeFolder } = useUiStore();
  const [pos, setPos] = useState(WIN_DEFAULTS);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPos((p) => ({ ...p, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleClose = useCallback(() => {
    closeFolder(folder.id);
    onClose();
  }, [closeFolder, folder.id, onClose]);

  const handleRemove = useCallback(async (projectId: string) => {
    setBusyProjectId(projectId);
    try {
      await removeProjectFromFolder(folder.id, projectId);
      const updated: ProjectFolder = {
        ...folder,
        projects: folder.projects.filter((p) => p.id !== projectId),
      };
      onFolderUpdate(updated);
    } catch { /* ignore */ } finally {
      setBusyProjectId(null);
    }
  }, [folder, onFolderUpdate]);

  const handleAdd = useCallback(async (projectId: string) => {
    setBusyProjectId(projectId);
    try {
      const result = await addProjectToFolder(folder.id, projectId);
      const proj = allProjects.find((p) => p.id === projectId);
      if (proj) {
        const updated: ProjectFolder = {
          ...folder,
          projects: [
            ...folder.projects,
            { id: proj.id, name: proj.name, project_path: result.new_path, category_id: proj.category_id ?? null },
          ],
        };
        onFolderUpdate(updated);
      }
    } catch { /* ignore */ } finally {
      setBusyProjectId(null);
    }
  }, [folder, allProjects, onFolderUpdate]);

  return (
    <div
      style={{ position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh", zIndex: 800, pointerEvents: "none" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: pos.w,
        minHeight: pos.h,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
        overflow: "hidden",
        fontFamily: "var(--th-font-mono)",
      }}>
        {/* Header */}
        <div
          onMouseDown={handleHeaderMouseDown}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          <TrafficLights onClose={handleClose} onMinimize={() => {}} onMaximize={() => {}} />
          <span style={{ fontSize: 22 }}>{folder.icon ?? "📁"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)", fontWeight: 600 }}>
              {folder.name}
            </div>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>
              {folder.base_path} · {t({ ko: `${folder.projects.length}개 프로젝트`, en: `${folder.projects.length} projects`, ja: `${folder.projects.length}件`, zh: `${folder.projects.length}个项目` })}
            </div>
          </div>
        </div>

        {/* Project grid */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          {folder.projects.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--th-text-muted)", padding: "32px 0", textAlign: "center" }}>
              {t({ ko: "폴더가 비어 있습니다", en: "Folder is empty", ja: "フォルダが空です", zh: "文件夹为空" })}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {folder.projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    width: 140,
                    minHeight: 120,
                    background: "var(--th-bg-elevated)",
                    border: "1px solid var(--th-border)",
                    borderRadius: 0,
                    padding: "12px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    cursor: "default",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-bg-surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--th-bg-elevated)")}
                >
                  <div style={{ fontSize: 28 }}>🗂</div>
                  <div style={{
                    fontSize: 11,
                    color: "var(--th-text-primary)",
                    fontFamily: "var(--th-font-mono)",
                    textAlign: "center",
                    wordBreak: "break-word",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    width: "100%",
                  }}>
                    {p.name}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: "var(--th-text-muted)",
                    fontFamily: "var(--th-font-mono)",
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}>
                    {p.project_path}
                  </div>
                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={busyProjectId === p.id}
                    style={{
                      marginTop: "auto",
                      background: "transparent",
                      border: "1px solid var(--th-danger-border)",
                      borderRadius: 0,
                      color: "var(--th-danger-text)",
                      fontFamily: "var(--th-font-mono)",
                      fontSize: 9,
                      padding: "3px 8px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-danger-border)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {t({ ko: "꺼내기", en: "Remove", ja: "取り出す", zh: "移出" })}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add project */}
          <div style={{ position: "relative", marginTop: 16 }}>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              style={{
                width: "100%",
                height: 40,
                background: "transparent",
                border: "1px dashed var(--th-border)",
                borderRadius: 0,
                color: "var(--th-text-muted)",
                fontFamily: "var(--th-font-mono)",
                fontSize: 11,
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--th-accent)";
                e.currentTarget.style.color = "var(--th-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--th-border)";
                e.currentTarget.style.color = "var(--th-text-muted)";
              }}
            >
              {t({ ko: "+ 프로젝트 추가", en: "+ Add Project", ja: "+ プロジェクト追加", zh: "+ 添加项目" })}
            </button>
            {pickerOpen && (
              <ProjectPickerDropdown
                folder={folder}
                allProjects={allProjects}
                onAdd={handleAdd}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
