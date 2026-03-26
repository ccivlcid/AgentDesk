import { useState, useCallback, useRef, useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import { snapToFreeCell } from "./snapToFreeCell";
import type { ProjectFolder } from "../../types";

interface FolderDesktopIconProps {
  folder: ProjectFolder;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onRename: (folder: ProjectFolder) => void;
  onDelete: (folder: ProjectFolder) => void;
  onColorChange: (folder: ProjectFolder) => void;
  defaultX: number;
  defaultY: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onDragStart?: (id: string, x: number, y: number) => void;
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
}

function FolderStackIcon({ color, size = 64 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* back folder */}
      <rect x="10" y="12" width="46" height="34" rx="3" fill={color} fillOpacity={0.45} />
      <rect x="10" y="10" width="20" height="6" rx="2" fill={color} fillOpacity={0.45} />
      {/* front folder */}
      <rect x="6" y="18" width="52" height="34" rx="3" fill={color} />
      <rect x="6" y="16" width="22" height="6" rx="2" fill={color} />
    </svg>
  );
}

export default function FolderDesktopIcon({
  folder,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onRename,
  onDelete,
  onColorChange,
  defaultX,
  defaultY,
  isSelected = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd
}: FolderDesktopIconProps) {
  const { openFolder, desktopIconLayout, setDesktopIconLayout } = useUiStore();
  const { t } = useI18n();
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const iconId = `folder-${folder.id}`;
  const saved = desktopIconLayout[iconId];
  const [pos, setPos] = useState({ x: saved?.x ?? defaultX, y: saved?.y ?? defaultY });
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (dragging) return;
    const entry = desktopIconLayout[iconId];
    if (entry) {
      setPos({ x: entry.x, y: entry.y });
    } else {
      setPos({ x: defaultX, y: defaultY });
    }
  }, [desktopIconLayout, iconId, dragging, defaultX, defaultY]);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    moved.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
    
    if (onSelect) onSelect();
    if (onDragStart) onDragStart(iconId, pos.x, pos.y);

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
      
      setPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
      if (onDragMove) onDragMove(dx, dy);
    }

    function onUp(ev: MouseEvent) {
      if (!dragStart.current) return;
      
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      const finalX = dragStart.current.ox + dx;
      const finalY = dragStart.current.oy + dy;
      
      if (onDragEnd) {
        onDragEnd(iconId, finalX, finalY);
      } else {
        const currentLayout = useUiStore.getState().desktopIconLayout;
        const { x, y } = snapToFreeCell(finalX, finalY, iconId, currentLayout);
        setPos({ x, y });
        setDesktopIconLayout({ ...currentLayout, [iconId]: { x, y } });
      }
      
      dragStart.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const handleClick = useCallback(() => {
    if (moved.current) return;
    onSelect?.();
    openFolder(folder.id);
  }, [folder.id, onSelect, openFolder]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxPos({ x: e.clientX, y: e.clientY });
    setCtxOpen(true);
  }, []);

  const projectCount = folder.projects.length;
  const previewDots = folder.projects.slice(0, 5);
  const overflow = projectCount > 5 ? projectCount - 5 : 0;

  return (
    <div
      data-no-ctx="true"
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        userSelect: "none",
        cursor: dragging ? "grabbing" : "pointer",
        zIndex: dragging ? 100 : 10,
      }}
    >
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          position: "relative",
          cursor: "pointer",
          padding: 4,
          borderRadius: 8,
          boxShadow: isSelected && isDragOver
            ? `0 0 0 3px rgba(0,122,255,0.6), 0 0 0 5px ${folder.color}`
            : isSelected
              ? "0 0 0 3px rgba(0,122,255,0.6)"
              : isDragOver ? `0 0 0 3px ${folder.color}` : "none",
          background: isSelected
            ? "rgba(0,122,255,0.12)"
            : isDragOver ? `${folder.color}18` : "transparent",
          transition: "box-shadow 0.15s, background 0.15s",
        }}
      >
        <FolderStackIcon color={folder.color} size={56} />
        {/* project count badge */}
        <span style={{
          position: "absolute",
          top: 2,
          right: 2,
          background: folder.color,
          color: "#fff",
          fontFamily: "var(--th-font-mono)",
          fontSize: 9,
          borderRadius: 0,
          padding: "1px 4px",
          lineHeight: 1.4,
          pointerEvents: "none",
        }}>
          {projectCount}
        </span>
        {/* preview dots */}
        {previewDots.length > 0 && (
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2, alignItems: "center" }}>
            {previewDots.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.7 }} />
            ))}
            {overflow > 0 && (
              <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 8, color: "#fff", opacity: 0.7 }}>+{overflow}</span>
            )}
          </div>
        )}
      </div>
      <span style={{
        fontFamily: "var(--th-font-mono)",
        fontSize: 10,
        color: "var(--th-text-primary)",
        textAlign: "center",
        maxWidth: 72,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        textShadow: "0 1px 3px rgba(0,0,0,0.7)",
      }}>
        {folder.name}
      </span>

      {/* Context menu */}
      {ctxOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setCtxOpen(false)}
          />
          <div style={{
            position: "fixed",
            left: ctxPos.x,
            top: ctxPos.y,
            zIndex: 9999,
            background: "var(--th-bg-elevated)",
            border: "1px solid #E5E7EB",
            borderRadius: 0,
            minWidth: 160,
            fontFamily: "var(--th-font-mono)",
            fontSize: 11,
          }}>
            <button
              onClick={() => { setCtxOpen(false); openFolder(folder.id); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", background: "transparent", border: "none", color: "var(--th-text-primary)", cursor: "pointer", fontFamily: "var(--th-font-mono)", fontSize: 11 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-bg-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {t({ ko: "폴더 열기", en: "Open Folder", ja: "フォルダを開く", zh: "打开文件夹" })}
            </button>
            <div style={{ height: 1, background: "var(--th-border)", margin: "2px 0" }} />
            <button
              onClick={() => { setCtxOpen(false); onRename(folder); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", background: "transparent", border: "none", color: "var(--th-text-primary)", cursor: "pointer", fontFamily: "var(--th-font-mono)", fontSize: 11 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-bg-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {t({ ko: "이름 변경", en: "Rename", ja: "名前を変更", zh: "重命名" })}
            </button>
            <button
              onClick={() => { setCtxOpen(false); onColorChange(folder); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", background: "transparent", border: "none", color: "var(--th-text-primary)", cursor: "pointer", fontFamily: "var(--th-font-mono)", fontSize: 11 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-bg-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {t({ ko: "색상 변경", en: "Change Color", ja: "色を変更", zh: "更改颜色" })}
            </button>
            <div style={{ height: 1, background: "var(--th-border)", margin: "2px 0" }} />
            <button
              onClick={() => { setCtxOpen(false); onDelete(folder); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", background: "transparent", border: "none", color: "var(--th-danger-text)", cursor: "pointer", fontFamily: "var(--th-font-mono)", fontSize: 11 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-bg-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {t({ ko: "폴더 삭제", en: "Delete Folder", ja: "フォルダを削除", zh: "删除文件夹" })}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
