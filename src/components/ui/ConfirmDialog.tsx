import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' shows the confirm button in red. Default is 'default' (amber). */
  variant?: "default" | "danger";
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

function Dialog({ state, onClose }: { state: DialogState; onClose: (result: boolean) => void }) {
  const { options } = state;
  const variant = options.variant ?? "default";
  const confirmLabel = options.confirmLabel ?? "Confirm";
  const cancelLabel = options.cancelLabel ?? "Cancel";

  const confirmColors =
    variant === "danger"
      ? {
          bg: "transparent",
          border: "1px solid rgba(248,81,73,0.5)",
          color: "#f85149",
          hoverBg: "rgba(248,81,73,0.1)",
        }
      : {
          bg: "#f59e0b",
          border: "none",
          color: "#000",
          hoverBg: "#d97706",
        };

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
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={options.message ? "confirm-message" : undefined}
        style={{
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border-strong)",
          borderRadius: "4px",
          padding: "24px",
          width: "min(400px, 92vw)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Title */}
        <p
          id="confirm-title"
          style={{
            fontFamily: "var(--th-font-display)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: "var(--th-text-heading)",
            marginBottom: options.message ? "8px" : "20px",
          }}
        >
          {options.title}
        </p>

        {/* Message */}
        {options.message && (
          <p
            id="confirm-message"
            style={{
              fontFamily: "var(--th-font-body)",
              fontSize: "0.875rem",
              color: "var(--th-text-secondary)",
              lineHeight: 1.5,
              marginBottom: "20px",
            }}
          >
            {options.message}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={() => onClose(false)}
            style={{
              background: "transparent",
              border: "1px solid var(--th-border)",
              borderRadius: "2px",
              padding: "6px 14px",
              fontFamily: "var(--th-font-mono)",
              fontSize: "0.75rem",
              color: "var(--th-text-secondary)",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={() => onClose(true)}
            style={{
              background: confirmColors.bg,
              border: confirmColors.border,
              borderRadius: "2px",
              padding: "6px 14px",
              fontFamily: "var(--th-font-mono)",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: confirmColors.color,
              cursor: "pointer",
            }}
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
