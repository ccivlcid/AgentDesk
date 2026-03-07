import { useState } from "react";
import { PERSONA_CATALOG, PERSONA_CATEGORIES, type PersonaCategory } from "../../data/personas";
import { PersonaCard } from "./PersonaCard";

interface PersonaCatalogProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function PersonaCatalog({ selectedId, onSelect }: PersonaCatalogProps) {
  const [category, setCategory] = useState<PersonaCategory | "all">("all");

  const filtered =
    category === "all"
      ? PERSONA_CATALOG
      : PERSONA_CATALOG.filter((p) => p.category === category);

  return (
    <div>
      {/* Category filter tabs */}
      <div className="mb-2 flex flex-wrap gap-1">
        {PERSONA_CATEGORIES.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id as PersonaCategory | "all")}
              className="font-mono text-[9px] uppercase transition-colors"
              style={{
                border: active ? "1px solid var(--th-accent, #f59e0b)" : "1px solid var(--th-border)",
                borderRadius: "2px",
                padding: "2px 6px",
                background: active ? "rgba(245,158,11,0.1)" : "var(--th-bg-primary)",
                color: active ? "#f59e0b" : "var(--th-text-muted)",
                transition: "all 0.1s linear",
              }}
            >
              {cat.label}
            </button>
          );
        })}
        {selectedId && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="font-mono text-[9px] uppercase transition-colors ml-auto"
            style={{
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "2px",
              padding: "2px 6px",
              background: "rgba(248,113,113,0.08)",
              color: "#f87171",
              transition: "all 0.1s linear",
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Persona grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            selected={selectedId === persona.id}
            onSelect={onSelect}
            compact
          />
        ))}
      </div>
    </div>
  );
}
