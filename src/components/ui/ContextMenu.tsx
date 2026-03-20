import { useEffect, useRef, useState, type ReactNode } from "react";

const mono = "var(--th-font-mono)";

export interface ContextMenuItem {
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: ReactNode;
  shortcut?: string;
}

export interface ContextMenuSection {
  type: "section";
  label: ReactNode;
}

export interface ContextMenuSeparator {
  type: "separator";
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSection | ContextMenuSeparator;

function isItem(e: ContextMenuEntry): e is ContextMenuItem {
  return !("type" in e);
}
function isSection(e: ContextMenuEntry): e is ContextMenuSection {
  return (e as ContextMenuSection).type === "section";
}
function isSeparator(e: ContextMenuEntry): e is ContextMenuSeparator {
  return (e as ContextMenuSeparator).type === "separator";
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  entries: ContextMenuEntry[];
  "data-no-ctx"?: string;
}

export default function ContextMenu({ x, y, onClose, entries, "data-no-ctx": dataNoCtx }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ left: x, top: y });

  const focusableIndices = entries
    .map((e, i) => (isItem(e) && !e.disabled ? i : -1))
    .filter((i) => i >= 0);
  const firstFocusable = focusableIndices[0] ?? 0;
  const [focusedIndex, setFocusedIndex] = useState(firstFocusable);

  useEffect(() => {
    setFocusedIndex(firstFocusable);
  }, [firstFocusable]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x;
    let top = y;
    if (left + rect.width > vw - 8) left = vw - rect.width - 8;
    if (left < 8) left = 8;
    if (top + rect.height > vh - 8) top = vh - rect.height - 8;
    if (top < 8) top = 8;
    setStyle({ left, top });
  }, [x, y]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = focusableIndices.indexOf(focusedIndex);
        const next = focusableIndices[idx + 1] ?? focusableIndices[0];
        if (next !== undefined) setFocusedIndex(next);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = focusableIndices.indexOf(focusedIndex);
        const next = focusableIndices[idx - 1] ?? focusableIndices[focusableIndices.length - 1];
        if (next !== undefined) setFocusedIndex(next);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const entry = entries[focusedIndex];
        if (entry && isItem(entry) && entry.onClick && !entry.disabled) {
          entry.onClick();
          onClose();
        }
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, focusedIndex, focusableIndices, entries]);

  return (
    <div
      ref={ref}
      data-no-ctx={dataNoCtx}
      style={{
        position: "fixed",
        ...style,
        zIndex: 2000,
        background: "var(--th-bg-secondary)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--th-border)",
        borderRadius: 8,
        padding: "4px 0",
        minWidth: 180,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {entries.map((entry, i) => {
        if (isSeparator(entry)) {
          return <div key={i} style={{ margin: "4px 0", borderTop: "1px solid var(--th-border)" }} />;
        }
        if (isSection(entry)) {
          return (
            <div
              key={i}
              style={{
                padding: "3px 12px 2px",
                fontSize: 10,
                color: "var(--th-text-muted)",
                fontFamily: mono,
                letterSpacing: "0.06em",
              }}
            >
              {entry.label}
            </div>
          );
        }
        const item = entry as ContextMenuItem;
        const isFocused = focusedIndex === i;
        return (
          <button
            key={i}
            type="button"
            disabled={item.disabled}
            onClick={() => { if (item.onClick) item.onClick(); onClose(); }}
            onMouseEnter={() => setFocusedIndex(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              height: 28,
              padding: "0 12px",
              background: isFocused ? "var(--th-accent-glow)" : item.danger ? "transparent" : "none",
              border: "none",
              cursor: item.disabled ? "default" : "pointer",
              fontFamily: mono,
              fontSize: 12,
              color: item.danger ? "var(--th-danger-text)" : item.disabled ? "var(--th-text-muted)" : "var(--th-text-primary)",
              textAlign: "left",
              opacity: item.disabled ? 0.4 : 1,
              pointerEvents: item.disabled ? "none" : "auto",
            }}
          >
            {item.icon != null && <span style={{ fontSize: 11, display: "flex" }}>{item.icon}</span>}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}
