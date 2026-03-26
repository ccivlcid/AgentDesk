import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import TrafficLights from "../desktop/TrafficLights";

export type ModalWidth = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: ModalWidth;
  persistent?: boolean;
  className?: string;
}

const WIDTH_CLASS: Record<ModalWidth, string> = {
  sm:   "w-[min(400px,95vw)]",
  md:   "w-[min(560px,95vw)]",
  lg:   "w-[min(720px,95vw)]",
  xl:   "w-[min(960px,95vw)]",
  full: "w-[min(1180px,95vw)]",
};

const mono = "var(--th-font-mono)";

/**
 * Shared modal — Modern Terminal CLI style.
 * Focus trap, Escape to close, overlay click to close.
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable[0] ?? el).focus();
    }, 0);
    return () => {
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const el = containerRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }, []);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--th-modal-overlay)", backdropFilter: "blur(3px)", fontFamily: mono, zIndex: 1100 }}
      onClick={persistent ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`${WIDTH_CLASS[width]} max-h-[90vh] flex flex-col overflow-hidden ${className}`}
        style={{
          borderRadius: 10,
          border: "1px solid #D1D5DB",
          background: "var(--th-bg-elevated)",
          fontFamily: mono,
          boxShadow: "0 20px 50px var(--th-modal-overlay)",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

interface ModalHeaderProps {
  children: ReactNode;
  subtitle?: string;
  onClose?: () => void;
  /** macOS 스타일: 트래픽 라이트(빨강=닫기) + 둥근 헤더 */
  macOSStyle?: boolean;
}

export function ModalHeader({ children, subtitle, onClose, macOSStyle = true }: ModalHeaderProps) {
  return (
    <div
      className="flex flex-shrink-0 items-center gap-3 px-4 py-2.5"
      style={{
        borderBottom: "1px solid #E5E7EB",
        background: "var(--th-bg-elevated)",
        fontFamily: mono,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
      }}
    >
      {macOSStyle && onClose && (
        <TrafficLights onClose={onClose} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h2
          className="truncate text-[12px] font-semibold"
          style={{ color: "var(--th-text-primary)", fontFamily: mono }}
        >
          {children}
        </h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--th-text-muted)", fontFamily: mono }}>
            {subtitle}
          </p>
        )}
      </div>
      {!macOSStyle && onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "1px solid #E5E7EB",
            borderRadius: 0,
            padding: "2px 8px",
            fontFamily: mono,
            fontSize: "12px",
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
          className="hover:!text-[#111827] hover:!border-[#D1D5DB]"
        >
          ✕
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
    <div className={`flex-1 overflow-y-auto p-4 ${className}`} style={{ fontFamily: mono }}>
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
      className={`flex items-center justify-end gap-2 px-4 py-3 flex-shrink-0 ${className}`}
      style={{ borderTop: "1px solid #E5E7EB", fontFamily: mono }}
    >
      {children}
    </div>
  );
}
