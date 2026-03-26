import type { Persona } from "../../types";

interface PersonaCardProps {
  persona: Persona;
  selected: boolean;
  onSelect: () => void;
}

export default function PersonaCard({ persona, selected, onSelect }: PersonaCardProps) {
  return (
    <button
      onClick={onSelect}
      className={[
        "w-full text-left p-3 rounded border transition-all",
        selected
          ? "border-l-4 bg-[#FFFFFF]"
          : "border-[var(--th-border)] bg-[var(--th-bg-surface)] hover:border-[#BFDBFE]",
      ].join(" ")}
      style={selected ? { borderLeftColor: persona.accent_color, borderColor: `${persona.accent_color}60` } : {}}
    >
      {/* 방식 키워드 — 헤더 (크게, 방식 우선) */}
      <div className="text-xs font-semibold leading-snug mb-1" style={{ color: selected ? persona.accent_color : undefined }}>
        {persona.style_keywords.slice(0, 2).join(" · ")}
      </div>

      {/* 인물명 — 보조 텍스트 */}
      <div className="text-[10px] text-[var(--th-text-muted)] font-mono mb-2">
        {persona.name} 방식
      </div>

      {/* 적합한 태스크 태그 */}
      <div className="flex flex-wrap gap-1">
        {persona.best_for.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[9px] px-1.5 py-0.5 border border-[var(--th-border)] text-[var(--th-text-muted)] font-mono rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
