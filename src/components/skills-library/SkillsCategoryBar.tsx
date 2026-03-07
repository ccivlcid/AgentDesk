import { CATEGORIES, CATEGORY_ICONS, categoryLabel, type TFunction } from "./model";

interface SkillsCategoryBarProps {
  t: TFunction;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts: Record<string, number>;
  filteredLength: number;
  search: string;
}

export default function SkillsCategoryBar({
  t,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  filteredLength,
  search,
}: SkillsCategoryBarProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className="px-3 py-1.5 text-xs font-medium font-mono border transition-all"
              style={{
                borderRadius: "2px",
                background: isActive ? "rgba(251,191,36,0.1)" : "var(--th-bg-elevated)",
                borderColor: isActive ? "rgba(251,191,36,0.5)" : "var(--th-border)",
                color: isActive ? "var(--th-accent)" : "var(--th-text-secondary)",
              }}
            >
              {CATEGORY_ICONS[category]} {categoryLabel(category, t)}
              <span className="ml-1" style={{ color: "var(--th-text-muted)" }}>{categoryCounts[category] || 0}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs px-1 font-mono" style={{ color: "var(--th-text-muted)" }}>
        {filteredLength}
        {t({ ko: "개 스킬 표시중", en: " skills shown", ja: "件のスキルを表示中", zh: " 个技能已显示" })}
        {search && ` · "${search}" ${t({ ko: "검색 결과", en: "search results", ja: "検索結果", zh: "搜索结果" })}`}
      </div>
    </>
  );
}
