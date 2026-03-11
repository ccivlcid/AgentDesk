import type { PersonaMeta } from "../../data/personas";

interface PersonaCardProps {
  persona: PersonaMeta;
  selected: boolean;
  onSelect: (id: string) => void;
  compact?: boolean;
  isKo?: boolean;
}

export function PersonaCard({ persona, selected, onSelect, compact = false, isKo = false }: PersonaCardProps) {
  const displayName = isKo && persona.name_ko ? `${persona.name_ko}` : persona.name;
  const tagline = isKo && persona.tagline_ko ? persona.tagline_ko : persona.tagline;
  const bestFor = isKo && persona.bestFor_ko ? persona.bestFor_ko : persona.bestFor;

  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? "" : persona.id)}
      className="w-full text-left transition-colors"
      style={{
        border: selected
          ? `1px solid ${persona.color}60`
          : "1px solid var(--th-border)",
        borderLeft: selected
          ? `3px solid ${persona.color}`
          : "3px solid transparent",
        borderRadius: 0,
        background: selected ? `${persona.color}10` : "var(--th-bg-primary)",
        padding: compact ? "0.5rem 0.625rem" : "0.625rem 0.75rem",
        transition: "border-color 0.1s linear, background 0.1s linear",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-[9px] font-semibold uppercase"
              style={{
                color: persona.color,
                border: `1px solid ${persona.color}40`,
                borderRadius: 0,
                padding: "0 4px",
                background: `${persona.color}12`,
              }}
            >
              {persona.badge}
            </span>
            <span
              className="text-xs font-semibold truncate"
              style={{ color: "var(--th-text-primary)" }}
            >
              {displayName}
            </span>
            {isKo && persona.name_ko && (
              <span
                className="text-[10px] truncate"
                style={{ color: "var(--th-text-muted)" }}
              >
                {persona.name}
              </span>
            )}
          </div>
          {!compact && (
            <p
              className="mt-1 text-[10px] italic truncate"
              style={{ color: "var(--th-text-muted)" }}
            >
              "{tagline}"
            </p>
          )}
        </div>
        {selected && (
          <span
            className="flex-shrink-0 font-mono text-[9px] font-semibold"
            style={{ color: persona.color }}
          >
            ✓
          </span>
        )}
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-1">
          {bestFor.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[9px] uppercase"
              style={{
                border: "1px solid var(--th-border)",
                borderRadius: 0,
                padding: "0 4px",
                color: "var(--th-text-muted)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
