import { useRef, useState } from "react";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";

const JIGGLE_STYLE = `
@keyframes jiggle {
  0%,100% { transform: rotate(-2.5deg) scale(1.02); }
  50%     { transform: rotate(2.5deg)  scale(1.02); }
}
`;

export interface DesktopIconDef {
  id: string;
  emoji: string;
  label: string;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  deletable?: boolean;
  onDelete?: () => void;
}

interface DesktopIconProps {
  def: DesktopIconDef;
  defaultX: number;
  defaultY: number;
}

export default function DesktopIcon({ def, defaultX, defaultY }: DesktopIconProps) {
  const { desktopIconLayout, setDesktopIconLayout, jiggleMode } = useUiStore();
  const saved = desktopIconLayout[def.id];
  const [pos, setPos] = useState({ x: saved?.x ?? defaultX, y: saved?.y ?? defaultY });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);

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

  function onContextMenuHandler(e: React.MouseEvent) {
    if (def.onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      def.onContextMenu(e);
    }
  }

  const isJiggling = jiggleMode;

  return (
    <>
      <style>{JIGGLE_STYLE}</style>
      <div
        onMouseDown={onMouseDown}
        onClick={onClick}
        onContextMenu={onContextMenuHandler}
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: 72,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          cursor: dragging ? "grabbing" : "pointer",
          userSelect: "none",
          zIndex: dragging ? 100 : 10,
          animation: isJiggling ? "jiggle 0.18s ease-in-out infinite alternate" : "none",
        }}
      >
        {/* 삭제 배지 — jiggle 모드에서 deletable 아이콘에만 표시 */}
        {isJiggling && def.deletable && def.onDelete && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              def.onDelete!();
            }}
            style={{
              position: "absolute",
              top: -6,
              left: -6,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ff3b30",
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
            }}
          >
            ✕
          </div>
        )}

        <div
          style={{
            width: 56,
            height: 56,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--th-border)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            transition: dragging ? "none" : "background 0.15s",
          }}
          onMouseEnter={(e) => { if (!dragging) (e.currentTarget as HTMLDivElement).style.background = "rgba(245,158,11,0.12)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
        >
          {def.emoji}
        </div>
        <span
          style={{
            fontFamily: mono,
            fontSize: 10,
            color: "var(--th-text-secondary)",
            textAlign: "center",
            lineHeight: 1.3,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            maxWidth: 72,
            wordBreak: "keep-all",
          }}
        >
          {def.label}
        </span>
      </div>
    </>
  );
}
