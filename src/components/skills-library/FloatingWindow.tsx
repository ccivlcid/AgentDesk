import { useRef, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface FloatingWindowProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  disableClose?: boolean;
  closeBtnLabel?: string;
  defaultWidth?: number;
  children: ReactNode;
}

export default function FloatingWindow({
  title,
  subtitle,
  onClose,
  disableClose,
  closeBtnLabel,
  defaultWidth = 720,
  children,
}: FloatingWindowProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const winRef = useRef<HTMLDivElement>(null);

  // Center on first render
  const getInitialPos = useCallback(() => {
    if (pos) return pos;
    const x = Math.round((window.innerWidth - defaultWidth) / 2);
    const y = Math.round((window.innerHeight - 560) / 2);
    return { x: Math.max(0, x), y: Math.max(44, y) };
  }, [pos, defaultWidth]);

  const currentPos = getInitialPos();

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: currentPos.x, oy: currentPos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const nx = dragRef.current.ox + ev.clientX - dragRef.current.startX;
      const ny = dragRef.current.oy + ev.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 200, nx)),
        y: Math.max(44, Math.min(window.innerHeight - 100, ny)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [currentPos]);

  return createPortal(
    <div
      ref={winRef}
      className="fixed z-[90] flex flex-col overflow-hidden shadow-2xl"
      style={{
        left: currentPos.x,
        top: currentPos.y,
        width: defaultWidth,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 100px)",
        border: "1px solid #E5E7EB",
        background: "var(--th-bg-surface)",
        borderRadius: 8,
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0 select-none cursor-move"
        style={{ borderBottom: "1px solid #E5E7EB", background: "var(--th-bg-elevated)" }}
        onMouseDown={onMouseDown}
      >
        {/* Traffic lights */}
        <button
          type="button"
          onClick={disableClose ? undefined : onClose}
          disabled={disableClose}
          className="w-3 h-3 rounded-full shrink-0 transition-opacity"
          style={{
            background: disableClose ? "var(--th-border)" : "#ff5f57",
            opacity: disableClose ? 0.5 : 1,
            cursor: disableClose ? "not-allowed" : "pointer",
          }}
          title={closeBtnLabel ?? "Close"}
        />
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#febc2e", opacity: 0.4 }} />
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#28c840", opacity: 0.4 }} />

        <div className="flex-1 min-w-0 ml-1">
          <h3 className="text-[13px] font-semibold font-mono truncate" style={{ color: "var(--th-text-primary)", margin: 0 }}>
            {title}
          </h3>
          {subtitle && (
            <div className="text-[11px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
              {subtitle}
            </div>
          )}
        </div>

        {disableClose && (
          <div
            className="text-[11px] font-mono px-2 py-0.5"
            style={{ border: "1px solid rgba(59,130,246,0.25)", color: "var(--th-accent)", background: "rgba(59,130,246,0.05)" }}
          >
            {closeBtnLabel}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>,
    document.body,
  );
}
