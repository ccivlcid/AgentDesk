export function EmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 flex items-center justify-center mb-4" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--th-text-muted)" }}>
          <path d={icon} />
        </svg>
      </div>
      <p className="text-sm font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>{title}</p>
      <p className="text-xs font-mono mt-1.5 max-w-[280px]" style={{ color: "var(--th-text-muted)" }}>{description}</p>
      <button onClick={onAction}
        className="mt-5 flex items-center gap-2 px-4 py-2 text-sm font-mono transition-all"
        style={{ borderRadius: 0, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {actionLabel}
      </button>
    </div>
  );
}
