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

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Icons ────────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const AUTO_DISMISS_BY_VARIANT: Record<ToastVariant, number | null> = {
  success: 3000,
  error: 5000,
  warning: null,
  info: 4000,
};

const COLORS: Record<ToastVariant, { text: string; border: string; bg: string }> = {
  success: {
    text: "#3fb950",
    border: "rgba(63,185,80,0.3)",
    bg: "rgba(63,185,80,0.08)",
  },
  error: {
    text: "#f85149",
    border: "rgba(248,81,73,0.3)",
    bg: "rgba(248,81,73,0.08)",
  },
  warning: {
    text: "#f59e0b",
    border: "rgba(245,158,11,0.3)",
    bg: "rgba(245,158,11,0.08)",
  },
  info: {
    text: "#58a6ff",
    border: "rgba(88,166,255,0.3)",
    bg: "rgba(88,166,255,0.08)",
  },
};

// ── Single Toast ─────────────────────────────────────────────────────────────

const MAX_TOASTS = 3;

function Toast({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: string) => void;
}) {
  const colors = COLORS[item.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissMs = AUTO_DISMISS_BY_VARIANT[item.variant];

  useEffect(() => {
    if (dismissMs === null) return;
    timerRef.current = setTimeout(() => onRemove(item.id), dismissMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, dismissMs, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        borderRadius: "0",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        backdropFilter: "none",
        minWidth: "260px",
        maxWidth: "420px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--th-font-mono)",
          fontSize: "0.65rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: colors.text,
          flexShrink: 0,
        }}
      >
        {ICONS[item.variant]}
      </span>
      <span
        style={{
          fontFamily: "var(--th-font-mono)",
          fontSize: "0.8rem",
          color: "var(--th-text-primary)",
          flex: 1,
          lineHeight: 1.4,
        }}
      >
        {item.message}
      </span>
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--th-text-muted)",
          padding: "0 2px",
          lineHeight: 1,
          fontSize: "0.85rem",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, variant }];
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
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
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
