import { useState } from "react";
import type { Persona } from "../../types";
import PersonaCard from "./PersonaCard";

interface PersonaCatalogProps {
  personas: Persona[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

type CategoryFilter = "all" | Persona["category"];

const CATEGORY_LABELS: Record<string, string> = {
  all: "전체",
  tech: "기술 혁신",
  biz: "비즈니스",
  creative: "크리에이티브",
  investor: "투자",
  scientist: "연구",
  operator: "운영",
};

export default function PersonaCatalog({ personas, selectedId, onSelect }: PersonaCatalogProps) {
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const categories = ["all", ...Array.from(new Set(personas.map((p) => p.category)))] as CategoryFilter[];
  const filtered = filter === "all" ? personas : personas.filter((p) => p.category === filter);

  return (
    <div className="flex flex-col gap-3">
      {/* 카테고리 탭 필터 */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={[
              "text-[10px] px-2 py-1 rounded border transition-colors",
              filter === cat
                ? "bg-[var(--th-accent)] border-[var(--th-accent)] text-white"
                : "border-[var(--th-border)] text-[var(--th-text-muted)] hover:border-[var(--th-border-accent)]",
            ].join(" ")}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* 페르소나 카드 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            selected={persona.id === selectedId}
            onSelect={() => onSelect(persona.id === selectedId ? null : persona.id)}
          />
        ))}
      </div>

      {/* 선택 없이 사용 */}
      {selectedId && (
        <button
          onClick={() => onSelect(null)}
          className="text-[10px] text-[var(--th-text-muted)] hover:text-[var(--th-text)] underline underline-offset-2 text-center"
        >
          사고 방식 없이 사용하기
        </button>
      )}
    </div>
  );
}
