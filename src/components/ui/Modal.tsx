import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ModalWidth = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when the modal requests to close (Escape, overlay click) */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Width preset. Defaults to "md" */
  width?: ModalWidth;
  /** If true, clicking overlay does NOT close the modal */
  persistent?: boolean;
  /** Additional className on the content container */
  className?: string;
}

const WIDTH_CLASS: Record<ModalWidth, string> = {
  sm: "w-[min(400px,95vw)]",
  md: "w-[min(560px,95vw)]",
  lg: "w-[min(720px,95vw)]",
  xl: "w-[min(960px,95vw)]",
  full: "w-[min(1180px,95vw)]",
};

/**
 * Shared modal primitive.
 *
 * - Consistent overlay, border-radius, z-index
 * - Focus trap (Tab / Shift+Tab cycle)
 * - Escape to close
 * - Overlay click to close (unless `persistent`)
 * - Renders via portal to document.body
 */
export default function Modal({
  open,
  onClose,
  children,
  width = "md",
  persistent = false,
  className = "",
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /* ── Escape key ── */
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  /* ── Focus trap ── */
  useEffect(() => {
    if (!open) return;

    // Save previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus first focusable element inside modal
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        el.focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    };
  }, [open]);

  /* ── Tab trap ── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const el = containerRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--th-modal-overlay)" }}
      onClick={persistent ? undefined : (e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`${WIDTH_CLASS[width]} max-h-[90vh] flex flex-col bg-[var(--th-bg-base,var(--th-bg-elevated))] border border-[var(--th-border)] shadow-xl overflow-hidden ${className}`}
        style={{ borderRadius: 0 }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ── Sub-components for consistent layout ── */

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 flex-shrink-0"
      style={{ borderBottom: "1px solid var(--th-border)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
        {children}
      </h2>
      {onClose && (
        <button
          onClick={onClose}
          className="flex items-center justify-center w-6 h-6 transition-colors"
          style={{ color: "var(--th-text-muted)" }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 4l12 12M4 16L16 4" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export function ModalBody({ children, className = "" }: ModalBodyProps) {
  return (
    <div className={`flex-1 overflow-y-auto p-5 ${className}`}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-2 px-5 py-4 flex-shrink-0 ${className}`}
      style={{ borderTop: "1px solid var(--th-border)" }}
    >
      {children}
    </div>
  );
}
