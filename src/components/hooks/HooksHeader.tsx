import type { TFunction, HookSortBy } from "./model";

interface HooksHeaderProps {
  t: TFunction;
  hooksCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: HookSortBy;
  onSortByChange: (value: HookSortBy) => void;
  onOpenCreateModal: () => void;
}

export default function HooksHeader({
  t,
  hooksCount,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  onOpenCreateModal,
}: HooksHeaderProps) {
  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">{"\u{1F517}"}</span>
            {t({
              ko: "\uD6C5 \uAD00\uB9AC",
              en: "Hooks Manager",
              ja: "\u30D5\u30C3\u30AF\u7BA1\u7406",
              zh: "\u94A9\u5B50\u7BA1\u7406",
            })}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t({
              ko: "\uC5D0\uC774\uC804\uD2B8 \uD0DC\uC2A4\uD06C \uB77C\uC774\uD504\uC0AC\uC774\uD074 \uD6C5 \uAD00\uB9AC",
              en: "Manage agent task lifecycle hooks",
              ja: "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u30BF\u30B9\u30AF\u30E9\u30A4\u30D5\u30B5\u30A4\u30AF\u30EB\u30D5\u30C3\u30AF\u7BA1\u7406",
              zh: "\u7BA1\u7406\u4EE3\u7406\u4EFB\u52A1\u751F\u547D\u5468\u671F\u94A9\u5B50",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded-lg hover:bg-violet-600/30 transition-all"
            title={t({
              ko: "\uC0C8 \uD6C5 \uCD94\uAC00",
              en: "Add new hook",
              ja: "\u65B0\u3057\u3044\u30D5\u30C3\u30AF\u3092\u8FFD\u52A0",
              zh: "\u6DFB\u52A0\u65B0\u94A9\u5B50",
            })}
          >
            <span className="text-base">{"\u2795"}</span>
            {t({ ko: "\uD6C5 \uCD94\uAC00", en: "Add Hook", ja: "\u30D5\u30C3\u30AF\u8FFD\u52A0", zh: "\u6DFB\u52A0\u94A9\u5B50" })}
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold text-empire-gold">{hooksCount}</div>
            <div className="text-xs text-slate-500">
              {t({ ko: "\uB4F1\uB85D\uB41C \uD6C5", en: "Registered hooks", ja: "\u767B\u9332\u6E08\u307F\u30D5\u30C3\u30AF", zh: "\u5DF2\u6CE8\u518C\u94A9\u5B50" })}
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
              ko: "훅 검색... (제목, 설명, 명령어)",
              en: "Search hooks... (title, description, command)",
              ja: "フック検索...（タイトル・説明・コマンド）",
              zh: "搜索钩子...（标题、描述、命令）",
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
          onChange={(e) => onSortByChange(e.target.value as HookSortBy)}
          className="bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          <option value="priority">
            {t({ ko: "\uC6B0\uC120\uC21C\uC704\uC21C", en: "By Priority", ja: "\u512A\u5148\u9806\u4F4D\u9806", zh: "\u6309\u4F18\u5148\u7EA7" })}
          </option>
          <option value="name">{t({ ko: "\uC774\uB984\uC21C", en: "By Name", ja: "\u540D\u524D\u9806", zh: "\u6309\u540D\u79F0" })}</option>
          <option value="date">{t({ ko: "\uCD5C\uC2E0\uC21C", en: "By Date", ja: "\u65E5\u4ED8\u9806", zh: "\u6309\u65E5\u671F" })}</option>
          <option value="executions">{t({ ko: "\uC2E4\uD589\uD69F\uC218\uC21C", en: "By Executions", ja: "\u5B9F\u884C\u56DE\u6570\u9806", zh: "\u6309\u6267\u884C\u6B21\u6570" })}</option>
        </select>
      </div>
    </div>
  );
}
