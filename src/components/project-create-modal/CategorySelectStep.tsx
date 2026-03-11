import type { Category } from "../../types";

interface CategorySelectStepProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ICON_MAP: Record<string, string> = {
  "code-2": "{ }",
  megaphone: "📣",
  search: "🔍",
  rocket: "🚀",
  "pen-tool": "✏️",
  settings: "⚙️",
  folder: "📁",
};

export default function CategorySelectStep({ categories, selectedId, onSelect }: CategorySelectStepProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {categories.map((cat) => {
        const isSelected = cat.id === selectedId;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={[
              "flex items-start gap-3 p-3 border text-left transition-all",
              isSelected
                ? "border-[var(--th-accent)] bg-[var(--th-bg-elevated)]"
                : "border-[var(--th-border)] bg-[var(--th-bg-surface)] hover:border-[var(--th-border-accent)]",
            ].join(" ")}
          >
            <span
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
            >
              {ICON_MAP[cat.icon] ?? cat.icon}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-snug truncate">
                {cat.name_ko ?? cat.name}
              </div>
              {cat.description && (
                <div className="text-[10px] text-[var(--th-text-muted)] mt-0.5 leading-snug line-clamp-2">
                  {cat.description}
                </div>
              )}
            </div>
            {isSelected && (
              <span className="ml-auto flex-shrink-0 text-[var(--th-accent)]">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
