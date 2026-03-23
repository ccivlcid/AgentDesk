import { useRef, useState, useCallback, useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { useTheme } from "../../ThemeContext";
import { isLightWallpaper } from "./WallpaperPicker";
import { snapToFreeCell } from "./snapToFreeCell";

const JIGGLE_STYLE = `
@keyframes jiggle {
  0%,100% { transform: rotate(-2.5deg) scale(1.02); }
  50%     { transform: rotate(2.5deg)  scale(1.02); }
}
@keyframes iconDrop {
  0%   { opacity: 0; transform: translateY(-60px) scale(0.5); }
  60%  { opacity: 1; transform: translateY(6px) scale(1.05); }
  80%  { transform: translateY(-3px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
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
  /** 설정 시 이 아이콘은 HTML5 드래그 가능한 문서 아이콘 (docId = pendingDoc.id) */
  docId?: string;
  /** 설정 시 이 아이콘은 문서 드롭 대상 (프로젝트 폴더) */
  onDropDoc?: (docId: string) => void;
}

interface DesktopIconProps {
  def: DesktopIconDef;
  defaultX: number;
  defaultY: number;
  isSelected?: boolean;
  isNewlyInstalled?: boolean;
  onDragStart?: (id: string, x: number, y: number) => void;
  onDragMove?: (dx: number, dy: number) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
}

export default function DesktopIcon({ 
  def, 
  defaultX, 
  defaultY, 
  isSelected = false, 
  isNewlyInstalled = false,
  onDragStart,
  onDragMove,
  onDragEnd
}: DesktopIconProps) {
  const { desktopIconLayout, setDesktopIconLayout, desktopIconLabels, setDesktopIconLabel, jiggleMode, wallpaper } = useUiStore();
  const { theme } = useTheme();
  // light = 라이트 테마이거나 라이트 배경화면인 경우
  const light = theme === "light" || isLightWallpaper(wallpaper);

  const saved = desktopIconLayout[def.id];
  const [pos, setPos] = useState({ x: saved?.x ?? defaultX, y: saved?.y ?? defaultY });
  const [dragging, setDragging] = useState(false);

  // store에서 외부(정렬/스냅)로 layout이 바뀌면 로컬 pos 동기화
  // 저장된 위치가 없으면 defaultX/Y 변경도 반영 (프로젝트 추가/삭제 시 인덱스 이동)
  useEffect(() => {
    if (dragging) return;
    const entry = desktopIconLayout[def.id];
    if (entry) {
      setPos({ x: entry.x, y: entry.y });
    } else {
      setPos({ x: defaultX, y: defaultY });
    }
  }, [desktopIconLayout, def.id, dragging, defaultX, defaultY]);
  const [hovered, setHovered] = useState(false);
  const [dropTarget, setDropTarget] = useState(false); // 문서 드래그 오버 중인 폴더
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
    if (def.docId) return;
    e.preventDefault();
    e.stopPropagation();

    // Bring desktop to front if needed
    useUiStore.getState().bringWindowToFront("settings" as any); 

    moved.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);

    if (onDragStart) onDragStart(def.id, pos.x, pos.y);

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
        onDragEnd(def.id, finalX, finalY);
      } else {
        const currentLayout = useUiStore.getState().desktopIconLayout;
        const { x, y } = snapToFreeCell(finalX, finalY, def.id, currentLayout);
        setPos({ x, y });
        setDesktopIconLayout({ ...currentLayout, [def.id]: { x, y } });
      }
      
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
        draggable={!!def.docId}
        onDragStart={def.docId ? (e) => {
          e.dataTransfer.setData("application/agentdesk-doc", def.docId!);
          e.dataTransfer.effectAllowed = "move";
        } : undefined}
        onDragOver={def.onDropDoc ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(true); } : undefined}
        onDragLeave={def.onDropDoc ? () => setDropTarget(false) : undefined}
        onDrop={def.onDropDoc ? (e) => {
          e.preventDefault();
          setDropTarget(false);
          const docId = e.dataTransfer.getData("application/agentdesk-doc");
          if (docId) def.onDropDoc!(docId);
        } : undefined}
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
          animation: jiggleMode
            ? "jiggle 0.18s ease-in-out infinite alternate"
            : isNewlyInstalled
              ? "iconDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
              : "none",
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
            background: dropTarget ? "rgba(245,158,11,0.30)" : iconBg,
            border: dropTarget
              ? "2px solid var(--th-accent)"
              : isSelected
                ? "2px solid rgba(0,122,255,0.85)"
                : iconBorder,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow: dropTarget
              ? `0 0 0 3px var(--th-accent)44`
              : isSelected
                ? `0 0 0 3px rgba(0,122,255,0.25), ${iconShadow}`
                : iconShadow,
            transition: "background 0.12s, box-shadow 0.12s, border 0.12s",
            transform: (hovered || dropTarget) && !dragging ? "scale(1.08)" : "scale(1)",
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

        {/* 선택 배경 (label 위) */}
        {isSelected && !editing && (
          <div style={{
            position: "absolute", inset: -4,
            background: "rgba(0,122,255,0.12)",
            borderRadius: 16,
            pointerEvents: "none",
            zIndex: -1,
          }} />
        )}

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
