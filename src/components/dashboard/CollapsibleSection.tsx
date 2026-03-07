import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  subtitle?: string;
  right?: ReactNode;
  dragHandle?: ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  open,
  onToggle,
  children,
  subtitle,
  right,
  dragHandle,
}: CollapsibleSectionProps) {
  return (
    <div
      style={{
        border: "1px solid var(--th-border)",
        borderRadius: "4px",
        overflow: "hidden",
        background: "var(--th-bg-surface)",
      }}
    >
      {/* FM2024 panel header: amber left border */}
      <div className="flex items-stretch" style={{ borderLeft: "3px solid var(--th-accent, #f59e0b)" }}>
        {dragHandle}
      <button
        type="button"
        id={`dashboard-section-${id}`}
        aria-expanded={open}
        aria-controls={`dashboard-section-${id}-content`}
        onClick={onToggle}
        className="flex flex-1 items-center justify-between gap-3 px-4 py-2.5 text-left"
        style={{
          transition: "background 0.1s linear",
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            aria-hidden
            style={{
              color: "var(--th-text-accent)",
              fontFamily: "var(--th-font-mono)",
              fontSize: "0.75rem",
              flexShrink: 0,
              transition: "transform 0.1s linear",
              display: "inline-block",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ▶
          </span>
          <div className="min-w-0">
            <span
              className="block text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}
            >
              {title}
            </span>
            {subtitle != null && (
              <span
                className="block truncate"
                style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: "0.625rem", letterSpacing: "0.05em" }}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {right != null && <div className="flex-shrink-0">{right}</div>}
      </button>
      </div>

      <div
        id={`dashboard-section-${id}-content`}
        role="region"
        aria-labelledby={`dashboard-section-${id}`}
        hidden={!open}
        style={{ borderTop: "1px solid var(--th-border)", padding: "1rem 1.25rem 1.25rem" }}
      >
        {open ? children : null}
      </div>
    </div>
  );
}
