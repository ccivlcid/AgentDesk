import { ALL_CATEGORIES, CATEGORY_ICONS, categoryLabel, type TFunction } from "./model";

interface AgentRulesCategoryBarProps {
  t: TFunction;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts: Record<string, number>;
  filteredLength: number;
  search: string;
}

export default function AgentRulesCategoryBar({
  t,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  filteredLength,
  search,
}: AgentRulesCategoryBarProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className="px-3 py-1.5 text-xs font-medium font-mono border transition-all"
              style={{
                borderRadius: 6,
                background: isActive ? "#EBF5FF" : "#FFFFFF",
                borderColor: isActive ? "#BFDBFE" : "#E5E7EB",
                color: isActive ? "#3B82F6" : "#6B7280",
              }}
            >
              {CATEGORY_ICONS[category]} {categoryLabel(category, t)}
              <span className="ml-1" style={{ color: "#9CA3AF" }}>{categoryCounts[category] || 0}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs px-1 font-mono" style={{ color: "#9CA3AF" }}>
        {filteredLength}
        {t({ ko: "개 룰 표시중", en: " rules shown", ja: "件のルールを表示中", zh: " 条规则已显示" })}
        {search &&
          ` · "${search}" ${t({ ko: "검색 결과", en: "search results", ja: "検索結果", zh: "搜索结果" })}`}
      </div>
    </>
  );
}
