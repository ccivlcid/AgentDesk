import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";

const TOAST_ACCENT: Record<string, string> = {
  success: "var(--th-accent)",
  error: "#ef4444",
  info: "#3b82f6",
  progress: "#8b5cf6",
};

function ToastIcon({ type }: { type: string }) {
  if (type === "success") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  if (type === "info") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    );
  }
  if (type === "progress") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.8s linear infinite" }}>
        <path d="M21 12a9 9 0 1 1-6.22-8.56" />
      </svg>
    );
  }
  return null;
}

export default function ToastContainer() {
  const { toasts, dismissToast, doNotDisturb } = useUiStore();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    toasts.forEach((t) => {
      const duration = t.duration ?? (t.type === "error" ? 6000 : 4000);
      if (duration > 0 && !timers.has(t.id)) {
        const tid = setTimeout(() => {
          dismissToast(t.id);
          timers.delete(t.id);
        }, duration);
        timers.set(t.id, tid);
      }
    });
    const currentIds = new Set(toasts.map((x) => x.id));
    prevIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        const tid = timers.get(id);
        if (tid) {
          clearTimeout(tid);
          timers.delete(id);
        }
      }
    });
    prevIdsRef.current = currentIds;
    return () => {
      timers.forEach((tid) => clearTimeout(tid));
      timers.clear();
    };
  }, [toasts, dismissToast]);

  return (
    <div
      style={{
        position: "fixed",
        top: 36,
        right: 16,
        width: 320,
        zIndex: 1500,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <AnimatePresence initial={false}>
        {!doNotDisturb && toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 336 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 336 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            style={{
              pointerEvents: "auto",
              display: "flex",
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              overflow: "hidden",
            }}
            onClick={toast.onClick}
          >
            <div
              style={{
                width: 3,
                flexShrink: 0,
                background: TOAST_ACCENT[toast.type] ?? "var(--th-accent)",
              }}
            />
            <div style={{ flex: 1, padding: "10px 12px", minWidth: 0, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: TOAST_ACCENT[toast.type], flexShrink: 0, marginTop: 1 }}>
                <ToastIcon type={toast.type} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)" }}>
                  {toast.title}
                </div>
                {toast.body && (
                  <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-secondary)", marginTop: 2 }}>
                    {toast.body}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                style={{
                  flexShrink: 0,
                  padding: 2,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "var(--th-text-muted)",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
        {doNotDisturb && toasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 336 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 336 }}
            transition={{ duration: 0.3 }}
            style={{
              pointerEvents: "auto",
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              borderRadius: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: mono,
              fontSize: 11,
              color: "var(--th-text-muted)",
            }}
          >
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
            <span>{toasts.length} notification{toasts.length > 1 ? "s" : ""} suppressed</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
