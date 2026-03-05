import { ALL_CATEGORIES, CATEGORY_ICONS, categoryLabel, type TFunction } from "./model";

interface MemoryCategoryBarProps {
  t: TFunction;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts: Record<string, number>;
  filteredLength: number;
  search: string;
}

export default function MemoryCategoryBar({
  t,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  filteredLength,
  search,
}: MemoryCategoryBarProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              selectedCategory === category
                ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700/40 hover:text-slate-300"
            }`}
          >
            {CATEGORY_ICONS[category]} {categoryLabel(category, t)}
            <span className="ml-1 text-slate-500">{categoryCounts[category] || 0}</span>
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-500 px-1">
        {filteredLength}
        {t({
          ko: "\uAC1C \uBA54\uBAA8\uB9AC \uD45C\uC2DC\uC911",
          en: " entries shown",
          ja: "\u4EF6\u306E\u30E1\u30E2\u30EA\u3092\u8868\u793A\u4E2D",
          zh: " \u6761\u6761\u76EE\u5DF2\u663E\u793A",
        })}
        {search &&
          ` \u00B7 "${search}" ${t({
            ko: "\uAC80\uC0C9 \uACB0\uACFC",
            en: "search results",
            ja: "\u691C\u7D22\u7D50\u679C",
            zh: "\u641C\u7D22\u7ED3\u679C",
          })}`}
      </div>
    </>
  );
}
