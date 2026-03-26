import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' shows confirm in red, 'warning' in amber, 'info' in neutral. Default is 'default' (amber). */
  variant?: "default" | "danger" | "warning" | "info";
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConfirm(): ConfirmDialogContextValue {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmDialogProvider>");
  return ctx;
}

// ── Dialog UI ─────────────────────────────────────────────────────────────────

interface DialogState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const mono = "var(--th-font-mono)";

function Dialog({ state, onClose }: { state: DialogState; onClose: (result: boolean) => void }) {
  const { options } = state;
  const variant = options.variant ?? "default";
  const confirmLabel = options.confirmLabel ?? "confirm";
  const cancelLabel  = options.cancelLabel  ?? "cancel";

  // ── Draggable ──
  const dialogRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    // Center on mount
    const el = dialogRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({ x: Math.round((window.innerWidth - rect.width) / 2), y: Math.round((window.innerHeight - rect.height) / 2) });
    }
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    e.preventDefault();
    const p = pos ?? { x: 0, y: 0 };
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const confirmStyle: React.CSSProperties =
    variant === "danger"
      ? { background: "transparent", border: "1px solid rgba(248,81,73,0.4)", color: "#f85149" }
      : variant === "info"
        ? { background: "transparent", border: "1px solid #D1D5DB", color: "var(--th-text-secondary)" }
        : { background: "var(--th-accent-glow)", border: "1px solid #BFDBFE", color: "var(--th-accent)" };

  return createPortal(
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={options.message ? "confirm-message" : undefined}
      style={{
        position: "fixed",
        left: pos?.x ?? "50%",
        top: pos?.y ?? "50%",
        transform: pos ? undefined : "translate(-50%, -50%)",
        zIndex: 10000,
        background: "var(--th-bg-elevated)",
        border: "1px solid #D1D5DB",
        borderRadius: 10,
        padding: 0,
        width: "min(420px, 92vw)",
        fontFamily: mono,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      {/* ── Title bar — draggable ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid #E5E7EB",
          background: "var(--th-bg-elevated)",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          cursor: "grab",
          userSelect: "none",
        }}
        onMouseDown={handleDragStart}
      >
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="Close"
            className="h-3 w-3 flex-shrink-0 rounded-full border-0 transition-opacity hover:opacity-90"
            style={{ background: "#ff5f57", cursor: "pointer" }}
          />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
        </div>
        <span id="confirm-title" style={{ fontSize: "12px", fontWeight: 600, color: "var(--th-text-primary)", fontFamily: mono }}>
          {options.title}
        </span>
      </div>

      {options.message && (
        <div style={{ padding: "14px 18px" }}>
          <p
            id="confirm-message"
            style={{
              fontFamily: mono,
              fontSize: "12px",
              color: "var(--th-text-secondary)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {options.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
        padding: "10px 16px",
        borderTop: "1px solid #E5E7EB",
      }}>
        <button
          onClick={() => onClose(false)}
          style={{
            background: "transparent",
            border: "1px solid #D1D5DB",
            borderRadius: 8,
            padding: "4px 14px",
            fontFamily: mono,
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--th-text-secondary)",
            cursor: "pointer",
            transition: "color 0.1s",
          }}
          className="hover:!text-[#111827] hover:!border-[#D1D5DB]"
        >
          {cancelLabel}
        </button>
        <button
          autoFocus
          onClick={() => onClose(true)}
          style={{
            ...confirmStyle,
            borderRadius: 8,
            padding: "4px 14px",
            fontFamily: mono,
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "opacity 0.1s",
          }}
          className="hover:opacity-80"
        >
          {confirmLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ options, resolve });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && <Dialog state={dialog} onClose={handleClose} />}
    </ConfirmDialogContext.Provider>
  );
}
