import type { ReactElement } from "react";
import type { Category } from "../../types";

interface CategorySelectStepProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function CategoryIcon({ cat }: { cat: Category }) {
  // Figma 카테고리는 Figma 로고 SVG
  if (cat.id === "cat_design") {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M5.333 16A2.667 2.667 0 0 1 5.333 10.667H8V16H5.333Z" fill="#0ACF83"/>
        <path d="M2.667 8A2.667 2.667 0 0 1 5.333 5.333H8V10.667H5.333A2.667 2.667 0 0 1 2.667 8Z" fill="#A259FF"/>
        <path d="M2.667 2.667A2.667 2.667 0 0 1 5.333 0H8V5.333H5.333A2.667 2.667 0 0 1 2.667 2.667Z" fill="#F24E1E"/>
        <path d="M8 0H10.667A2.667 2.667 0 0 1 10.667 5.333H8V0Z" fill="#FF7262"/>
        <path d="M13.333 8A2.667 2.667 0 1 1 8 8a2.667 2.667 0 0 1 5.333 0Z" fill="#1ABCFE"/>
      </svg>
    );
  }

  const TEXT_ICON_MAP: Record<string, string> = {
    "code-2": "{ }",
    "settings": "⚙",
    "folder": "▤",
  };
  const SVG_ICON_MAP: Record<string, ReactElement> = {
    megaphone: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
      </svg>
    ),
    search: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
    rocket: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
      </svg>
    ),
    "pen-tool": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        <path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>
      </svg>
    ),
  };

  if (SVG_ICON_MAP[cat.icon]) return SVG_ICON_MAP[cat.icon];
  if (TEXT_ICON_MAP[cat.icon]) return <span style={{ fontSize: "12px", fontFamily: "monospace" }}>{TEXT_ICON_MAP[cat.icon]}</span>;
  return <span style={{ fontSize: "12px" }}>{cat.icon}</span>;
}

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
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold"
              style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
            >
              <CategoryIcon cat={cat} />
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
