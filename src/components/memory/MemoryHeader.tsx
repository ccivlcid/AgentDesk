import type { TFunction, MemorySortBy } from "./model";

interface MemoryHeaderProps {
  t: TFunction;
  entriesCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: MemorySortBy;
  onSortByChange: (value: MemorySortBy) => void;
  onOpenCreateModal: () => void;
}

export default function MemoryHeader({
  t,
  entriesCount,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  onOpenCreateModal,
}: MemoryHeaderProps) {
  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">{"\u{1F9E0}"}</span>
            {t({
              ko: "Memory Manager",
              en: "Memory Manager",
              ja: "Memory Manager",
              zh: "Memory Manager",
            })}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t({
              ko: "\uC5D0\uC774\uC804\uD2B8 \uC601\uAD6C \uBA54\uBAA8\uB9AC \uAD00\uB9AC \u00B7 CLAUDE.md \uC2A4\uD0C0\uC77C",
              en: "Manage persistent agent memory \u00B7 CLAUDE.md style",
              ja: "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u6C38\u7D9A\u30E1\u30E2\u30EA\u7BA1\u7406 \u00B7 CLAUDE.md \u30B9\u30BF\u30A4\u30EB",
              zh: "\u7BA1\u7406\u4EE3\u7406\u6301\u4E45\u5316\u5185\u5B58 \u00B7 CLAUDE.md \u98CE\u683C",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded-lg hover:bg-violet-600/30 transition-all"
            title={t({
              ko: "\uC0C8 \uBA54\uBAA8\uB9AC \uCD94\uAC00",
              en: "Add new memory",
              ja: "\u65B0\u3057\u3044\u30E1\u30E2\u30EA\u3092\u8FFD\u52A0",
              zh: "\u6DFB\u52A0\u65B0\u5185\u5B58",
            })}
          >
            <span className="text-base">{"\u2728"}</span>
            {t({ ko: "Add Memory", en: "Add Memory", ja: "Add Memory", zh: "Add Memory" })}
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold text-empire-gold">{entriesCount}</div>
            <div className="text-xs text-slate-500">
              {t({
                ko: "\uB4F1\uB85D\uB41C \uBA54\uBAA8\uB9AC",
                en: "Registered entries",
                ja: "\u767B\u9332\u6E08\u307F\u30E1\u30E2\u30EA",
                zh: "\u5DF2\u6CE8\u518C\u6761\u76EE",
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t({
              ko: "메모리 검색... (제목, 설명, 내용)",
              en: "Search memory... (title, description, content)",
              ja: "メモリ検索...（タイトル・説明・内容）",
              zh: "搜索内存...（标题、描述、内容）",
            })}
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              &times;
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as MemorySortBy)}
          className="bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          <option value="priority">
            {t({ ko: "\uC6B0\uC120\uC21C\uC704\uC21C", en: "By Priority", ja: "\u512A\u5148\u9806\u4F4D\u9806", zh: "\u6309\u4F18\u5148\u7EA7" })}
          </option>
          <option value="name">
            {t({ ko: "\uC774\uB984\uC21C", en: "By Name", ja: "\u540D\u524D\u9806", zh: "\u6309\u540D\u79F0" })}
          </option>
          <option value="date">
            {t({ ko: "\uCD5C\uC2E0\uC21C", en: "By Date", ja: "\u65E5\u4ED8\u9806", zh: "\u6309\u65E5\u671F" })}
          </option>
        </select>
      </div>
    </div>
  );
}
