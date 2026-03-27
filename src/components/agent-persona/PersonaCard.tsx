import type { PersonaMeta } from "../../data/personas";

interface PersonaCardProps {
  persona: PersonaMeta;
  selected: boolean;
  onSelect: (id: string) => void;
  compact?: boolean;
  isKo?: boolean;
}

export function PersonaCard({ persona, selected, onSelect, compact, isKo }: PersonaCardProps) {
  const name = isKo && persona.name_ko ? persona.name_ko : persona.name;
  const tagline = isKo && persona.tagline_ko ? persona.tagline_ko : persona.tagline;
  const traits = isKo && persona.traits_ko ? persona.traits_ko : persona.traits;
  const bestFor = isKo && persona.bestFor_ko ? persona.bestFor_ko : persona.bestFor;

  return (
    <button
      type="button"
      onClick={() => onSelect(persona.id)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: compact ? "6px 8px" : "10px 12px",
        border: selected ? `1px solid ${persona.color}80` : "1px solid var(--th-border)",
        borderRadius: 8,
        background: selected ? `${persona.color}12` : "var(--th-bg-surface)",
        cursor: "pointer",
        transition: "all 0.1s linear",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            fontWeight: 600,
            color: persona.color,
            letterSpacing: "0.04em",
          }}
        >
          {persona.badge}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: selected ? persona.color : "var(--th-text-primary)" }}>
          {name}
        </span>
      </div>
      {!compact && (
        <div style={{ fontSize: 9, color: "var(--th-text-muted)", fontFamily: "monospace", marginBottom: 4 }}>
          {tagline}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {(compact ? traits.slice(0, 2) : bestFor.slice(0, 3)).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 9,
              padding: "1px 5px",
              border: "1px solid var(--th-border)",
              borderRadius: 4,
              color: "var(--th-text-muted)",
              fontFamily: "monospace",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
