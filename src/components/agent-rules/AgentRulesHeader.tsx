import type { TFunction, RuleSortBy } from "./model";

interface AgentRulesHeaderProps {
  t: TFunction;
  rulesCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: RuleSortBy;
  onSortByChange: (value: RuleSortBy) => void;
  onOpenCreateModal: () => void;
}

export default function AgentRulesHeader({
  t,
  rulesCount,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  onOpenCreateModal,
}: AgentRulesHeaderProps) {
  return (
    <div className="border p-4" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)", borderRadius: 0 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-heading)", textTransform: "uppercase" }}>
            AGENT RULES
          </span>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", color: "var(--th-text-muted)" }}>
            · {rulesCount} rules
          </span>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
          style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", fontFamily: "var(--th-font-mono)" }}
          title={t({ ko: "새 룰 추가", en: "Add new rule", ja: "新しいルールを追加", zh: "添加新规则" })}
        >
          + {t({ ko: "Add Rule", en: "Add Rule", ja: "Add Rule", zh: "Add Rule" })}
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t({
              ko: "룰 검색... (제목, 설명, 내용, 스코프)",
              en: "Search rules... (title, description, content, scope)",
              ja: "ルール検索...（タイトル・説明・内容・スコープ）",
              zh: "搜索规则...（标题、描述、内容、范围）",
            })}
            className="w-full px-4 py-2 text-sm focus:outline-none"
            style={{ background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)", borderRadius: 0, fontFamily: "var(--th-font-mono)", fontSize: "12px" }}
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--th-text-muted)" }}
            >
              &times;
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as RuleSortBy)}
          className="px-3 py-2 text-xs focus:outline-none"
          style={{ background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", borderRadius: 0, fontFamily: "var(--th-font-mono)" }}
        >
          <option value="priority">
            {t({ ko: "우선순위순", en: "By Priority", ja: "優先順位順", zh: "按优先级" })}
          </option>
          <option value="name">{t({ ko: "이름순", en: "By Name", ja: "名前順", zh: "按名称" })}</option>
          <option value="date">{t({ ko: "최신순", en: "By Date", ja: "日付順", zh: "按日期" })}</option>
        </select>
      </div>
    </div>
  );
}
