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

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  group?: string;   // MX-12: group key for collapsing
  count: number;    // MX-12: how many have been grouped
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, group?: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Config ────────────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, {
  sigil: string;
  sigilColor: string;
  accentBar: string;
  border: string;
  bg: string;
}> = {
  success: {
    sigil: "✓",
    sigilColor: "#3fb950",
    accentBar: "#3fb950",
    border: "rgba(63,185,80,0.25)",
    bg: "var(--th-bg-elevated)",
  },
  error: {
    sigil: "✗",
    sigilColor: "#f85149",
    accentBar: "#f85149",
    border: "rgba(248,81,73,0.25)",
    bg: "var(--th-bg-elevated)",
  },
  warning: {
    sigil: "~",
    sigilColor: "#f59e0b",
    accentBar: "#f59e0b",
    border: "rgba(245,158,11,0.25)",
    bg: "var(--th-bg-elevated)",
  },
  info: {
    sigil: "ℹ",
    sigilColor: "#58a6ff",
    accentBar: "#58a6ff",
    border: "rgba(88,166,255,0.25)",
    bg: "var(--th-bg-elevated)",
  },
};

const AUTO_DISMISS_MS: Record<ToastVariant, number | null> = {
  success: 3000,
  error:   5000,
  warning: null,
  info:    4000,
};

const MAX_TOASTS = 3;
const mono = "var(--th-font-mono)";

// ── Single Toast ──────────────────────────────────────────────────────────────

function Toast({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const cfg = VARIANT_CONFIG[item.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissMs = AUTO_DISMISS_MS[item.variant];

  useEffect(() => {
    if (dismissMs === null) return;
    timerRef.current = setTimeout(() => onRemove(item.id), dismissMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [item.id, item.count, dismissMs, onRemove]); // restart timer on count change

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "10px 14px",
        borderRadius: 0,
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.accentBar}`,
        background: cfg.bg,
        minWidth: "260px",
        maxWidth: "400px",
        fontFamily: mono,
        position: "relative",
      }}
    >
      {/* Sigil */}
      <span style={{
        fontSize: "11px",
        fontWeight: 700,
        color: cfg.sigilColor,
        flexShrink: 0,
        paddingTop: "1px",
      }}>
        {cfg.sigil}
      </span>

      {/* Message */}
      <span style={{
        fontFamily: mono,
        fontSize: "12px",
        color: "var(--th-text-primary)",
        flex: 1,
        lineHeight: 1.5,
      }}>
        {item.message}
      </span>

      {/* MX-12: group count badge */}
      {item.count > 1 && (
        <span style={{
          fontSize: 9,
          fontFamily: mono,
          fontWeight: 700,
          background: cfg.accentBar,
          color: "#fff",
          borderRadius: 10,
          padding: "1px 5px",
          flexShrink: 0,
          alignSelf: "center",
        }}>
          ×{item.count}
        </span>
      )}

      {/* [×] dismiss */}
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--th-text-muted)",
          padding: "0 2px",
          fontFamily: mono,
          fontSize: "11px",
          flexShrink: 0,
          lineHeight: 1,
          transition: "color 0.1s",
        }}
        className="hover:!text-[var(--th-text-secondary)]"
      >
        [×]
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "info", group?: string) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => {
      // MX-12: if group is set, collapse into existing grouped toast
      if (group) {
        const idx = prev.findIndex((t) => t.group === group);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], message, count: updated[idx].count + 1 };
          return updated;
        }
      }
      const next = [...prev, { id, message, variant, group, count: 1 }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div
          aria-label="Notifications"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            alignItems: "flex-end",
          }}
        >
          {toasts.map((item) => (
            <Toast key={item.id} item={item} onRemove={removeToast} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
