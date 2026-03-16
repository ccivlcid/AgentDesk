import { useRef, useState, useCallback } from "react";
import { useUiStore } from "../../store/uiStore";
import { useTheme } from "../../ThemeContext";
import { isLightWallpaper } from "./WallpaperPicker";

const JIGGLE_STYLE = `
@keyframes jiggle {
  0%,100% { transform: rotate(-2.5deg) scale(1.02); }
  50%     { transform: rotate(2.5deg)  scale(1.02); }
}
`;

export interface DesktopIconDef {
  id: string;
  icon: (color: string) => React.ReactNode;
  label: string;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  deletable?: boolean;
  onDelete?: () => void;
  badge?: number;
  /** macOS 스타일 아이콘 배경 accent 색상 (예: "#5e5ce6"). 없으면 glass 기본값 사용 */
  accentColor?: string;
}

interface DesktopIconProps {
  def: DesktopIconDef;
  defaultX: number;
  defaultY: number;
}

export default function DesktopIcon({ def, defaultX, defaultY }: DesktopIconProps) {
  const { desktopIconLayout, setDesktopIconLayout, desktopIconLabels, setDesktopIconLabel, jiggleMode, wallpaper } = useUiStore();
  const { theme } = useTheme();
  // light = 라이트 테마이거나 라이트 배경화면인 경우
  const light = theme === "light" || isLightWallpaper(wallpaper);

  const saved = desktopIconLayout[def.id];
  const [pos, setPos] = useState({ x: saved?.x ?? defaultX, y: saved?.y ?? defaultY });
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);

  const displayLabel = desktopIconLabels[def.id] ?? def.label;

  const startEdit = useCallback(() => {
    setEditValue(displayLabel);
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  }, [displayLabel]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    setDesktopIconLabel(def.id, editValue);
  }, [def.id, editValue, setDesktopIconLabel]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    moved.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    }

    function onUp(ev: MouseEvent) {
      if (!dragStart.current) return;
      const nx = dragStart.current.ox + (ev.clientX - dragStart.current.mx);
      const ny = dragStart.current.oy + (ev.clientY - dragStart.current.my);
      setPos({ x: nx, y: ny });
      setDesktopIconLayout({ ...useUiStore.getState().desktopIconLayout, [def.id]: { x: nx, y: ny } });
      dragStart.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onClick() {
    if (!moved.current) def.onClick();
  }

  function onDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!moved.current) startEdit();
  }

  function onContextMenuHandler(e: React.MouseEvent) {
    if (def.onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      def.onContextMenu(e);
    }
  }

  // ── 모드별 토큰 ───────────────────────────────────────────────────
  const { accentColor } = def;

  // accentColor가 있으면 macOS 컬러 아이콘 스타일, 없으면 glass 기본값
  const iconBg = accentColor
    ? hovered
      ? `${accentColor}ee`   // hover: 거의 불투명
      : `${accentColor}cc`   // 기본: 살짝 투명 (macOS 아이콘 느낌)
    : light
      ? hovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.65)"
      : hovered ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)";

  const iconBorder = accentColor
    ? `1px solid ${accentColor}55`
    : light
      ? "1px solid rgba(0,0,0,0.08)"
      : "1px solid rgba(255,255,255,0.12)";

  const iconShadow = accentColor
    ? hovered
      ? `0 4px 16px ${accentColor}88, 0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)`
      : `0 2px 10px ${accentColor}55, 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)`
    : light
      ? "0 2px 8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)"
      : "0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)";

  const labelColor = light ? "rgba(0,0,0,0.82)" : "rgba(255,255,255,0.95)";

  const labelBg = light
    ? "rgba(255,255,255,0.72)"
    : "rgba(0,0,0,0.48)";

  const labelShadow = light
    ? "none"
    : "none"; // pill bg가 충분한 대비를 줌

  return (
    <>
      <style>{JIGGLE_STYLE}</style>
      <div
        data-no-ctx
        onMouseDown={onMouseDown}
        onClick={onClick}
        onContextMenu={onContextMenuHandler}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: 72,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 5,
          cursor: dragging ? "grabbing" : "pointer",
          userSelect: "none",
          zIndex: dragging ? 100 : 10,
          animation: jiggleMode ? "jiggle 0.18s ease-in-out infinite alternate" : "none",
        }}
      >
        {/* 삭제 배지 — jiggle 모드에서만 표시 (실수 삭제 방지) */}
        {def.deletable && def.onDelete && jiggleMode && (
          <div
            onClick={(e) => { e.stopPropagation(); def.onDelete!(); }}
            style={{
              position: "absolute",
              top: -6,
              left: -6,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--th-danger, #ff3b30)",
              border: "2px solid rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "white",
              fontWeight: "bold",
              zIndex: 200,
              cursor: "pointer",
              lineHeight: 1,
              opacity: 1,
            }}
          >
            ✕
          </div>
        )}

        {/* 알림 뱃지 */}
        {!jiggleMode && def.badge != null && def.badge > 0 && (
          <div
            style={{
              position: "absolute",
              top: -5,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "var(--th-danger, #ff3b30)",
              border: "2px solid rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "white",
              fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              padding: "0 3px",
              zIndex: 150,
              pointerEvents: "none",
              letterSpacing: 0,
            }}
          >
            {def.badge > 99 ? "99+" : def.badge}
          </div>
        )}

        {/* 아이콘 박스 */}
        <div
          style={{
            width: 56,
            height: 56,
            background: iconBg,
            border: iconBorder,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow: iconShadow,
            transition: dragging ? "none" : "background 0.12s, box-shadow 0.12s",
            transform: hovered && !dragging ? "scale(1.06)" : "scale(1)",
          }}
        >
          {def.icon(
            accentColor
              ? "rgba(255,255,255,0.95)"   // 컬러 배경 위 → 흰색 아이콘
              : light
                ? "rgba(0,0,0,0.72)"       // 밝은 배경 → 어두운 아이콘
                : "rgba(255,255,255,0.88)" // 어두운 배경 → 밝은 아이콘
          )}
        </div>

        {/* 레이블 */}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
              if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: labelColor,
              textAlign: "center",
              width: 72,
              background: labelBg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 4,
              padding: "2px 6px",
              border: "1px solid var(--th-accent, #f59e0b)",
              outline: "none",
              lineHeight: 1.25,
            }}
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={onDoubleClick}
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: labelColor,
              textAlign: "center",
              lineHeight: 1.25,
              maxWidth: 72,
              wordBreak: "keep-all",
              background: labelBg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 4,
              padding: "2px 6px",
              textShadow: labelShadow,
            }}
          >
            {displayLabel}
          </span>
        )}
      </div>
    </>
  );
}
