import { useState, useCallback } from "react";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
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
}: FolderDesktopIconProps) {
  const { openFolder } = useUiStore();
  const { t } = useI18n();
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const [clickTimer, setClickTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
      // double-click
      openFolder(folder.id);
    } else {
      const t = setTimeout(() => setClickTimer(null), 280);
      setClickTimer(t);
    }
  }, [clickTimer, folder.id, openFolder]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxPos({ x: e.clientX, y: e.clientY });
    setCtxOpen(true);
  }, []);

  const projectCount = folder.projects.length;
  const previewDots = folder.projects.slice(0, 5);
  const overflow = projectCount > 5 ? projectCount - 5 : 0;

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none" }}>
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
          borderRadius: 0,
          boxShadow: isDragOver ? `0 0 0 3px ${folder.color}` : "none",
          background: isDragOver ? `${folder.color}18` : "transparent",
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
            border: "1px solid var(--th-border)",
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
