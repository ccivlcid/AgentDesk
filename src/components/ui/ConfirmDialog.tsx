import {
  createContext,
  useCallback,
  useContext,
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

  const confirmStyle: React.CSSProperties =
    variant === "danger"
      ? { background: "transparent", border: "1px solid rgba(248,81,73,0.4)", color: "#f85149" }
      : variant === "info"
        ? { background: "transparent", border: "1px solid var(--th-border-strong)", color: "var(--th-text-secondary)" }
        : { background: "var(--th-accent-glow)", border: "1px solid var(--th-accent-border)", color: "var(--th-accent)" };

  return createPortal(
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--th-modal-overlay)",
        fontFamily: mono,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={options.message ? "confirm-message" : undefined}
        style={{
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border-strong)",
          borderRadius: 10,
          padding: 0,
          width: "min(400px, 92vw)",
          fontFamily: mono,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }}>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onClose(false)}
              aria-label="Close"
              className="h-3 w-3 flex-shrink-0 rounded-full border-0 transition-opacity hover:opacity-90"
              style={{ background: "#ff5f57" }}
            />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
          </div>
          <span id="confirm-title" style={{ fontSize: "12px", fontWeight: 600, color: "var(--th-text-heading)", fontFamily: mono }}>{options.title}</span>
        </div>
        {options.message && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--th-border)" }}>
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
          gap: "8px",
          justifyContent: "flex-end",
          padding: "10px 16px",
          borderTop: "1px solid var(--th-border)",
        }}>
          <button
            onClick={() => onClose(false)}
            style={{
              background: "transparent",
              border: "1px solid var(--th-border-strong)",
              borderRadius: 0,
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
            className="hover:!text-[var(--th-text)] hover:!border-[var(--th-border-strong)]"
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={() => onClose(true)}
            style={{
              ...confirmStyle,
              borderRadius: 0,
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
