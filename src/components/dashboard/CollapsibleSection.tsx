import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  subtitle?: string;
  right?: ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  open,
  onToggle,
  children,
  subtitle,
  right,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-surface)] shadow-sm overflow-hidden">
      <button
        type="button"
        id={`dashboard-section-${id}`}
        aria-expanded={open}
        aria-controls={`dashboard-section-${id}-content`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--th-bg-surface-hover)]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--th-border)] bg-[var(--th-bg-primary)] text-[var(--th-text-muted)] transition-transform duration-200"
            aria-hidden
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--th-text-heading)]">{title}</span>
            {subtitle != null && (
              <span className="block truncate text-[10px] text-[var(--th-text-muted)]">{subtitle}</span>
            )}
          </div>
        </div>
        {right != null && <div className="flex-shrink-0">{right}</div>}
      </button>
      <div
        id={`dashboard-section-${id}-content`}
        role="region"
        aria-labelledby={`dashboard-section-${id}`}
        hidden={!open}
        className="border-t border-[var(--th-border)] p-5 pt-4"
      >
        {open ? children : null}
      </div>
    </div>
  );
}
