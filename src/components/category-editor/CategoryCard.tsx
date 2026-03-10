import type { Category } from "../../types";

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

const SCOPE_LABEL: Record<string, string> = {
  global: "전역",
  org: "조직",
  team: "팀",
};

export default function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const label = category.name_ko ?? category.name;
  const isGlobal = category.owner_scope === "global";

  return (
    <div
      className="group flex items-start gap-3 p-3 rounded border transition-colors"
      style={{ borderColor: `${category.color}44`, backgroundColor: `${category.color}08` }}
    >
      {/* 색상 도트 + 아이콘 */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm"
        style={{ backgroundColor: `${category.color}22`, color: category.color }}
      >
        {category.icon || "📁"}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold truncate">{label}</span>
          <span
            className="text-[9px] px-1 py-px rounded font-mono"
            style={{
              backgroundColor: `${category.color}18`,
              color: category.color,
              border: `1px solid ${category.color}44`,
            }}
          >
            {SCOPE_LABEL[category.owner_scope] ?? category.owner_scope}
          </span>
          {category.is_template === 1 && (
            <span className="text-[9px] px-1 py-px rounded font-mono text-[var(--th-text-muted)] border border-[var(--th-border)]">
              템플릿
            </span>
          )}
        </div>
        {category.description && (
          <p className="text-[10px] text-[var(--th-text-muted)] mt-0.5 line-clamp-2">{category.description}</p>
        )}
        <div className="text-[9px] text-[var(--th-text-muted)] font-mono mt-1">
          v{category.version} · {category.slug}
        </div>
      </div>

      {/* 액션 버튼 (hover 시 표시) */}
      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(category)}
          className="p-1 rounded text-[var(--th-text-muted)] hover:text-[var(--th-text)] hover:bg-[var(--th-bg-elevated)] transition-colors"
          title="편집"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        {!isGlobal && (
          <button
            onClick={() => onDelete(category.id)}
            className="p-1 rounded text-[var(--th-text-muted)] hover:text-red-400 hover:bg-[var(--th-bg-elevated)] transition-colors"
            title="삭제"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
