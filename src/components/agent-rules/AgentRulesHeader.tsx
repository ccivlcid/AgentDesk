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
    <div className="border rounded p-5" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
            <span className="text-2xl">🛡️</span>
            {t({
              ko: "에이전트 룰 문서고",
              en: "Agent Rules Library",
              ja: "エージェントルール ライブラリ",
              zh: "代理规则资料库",
            })}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "에이전트 행동 규칙 · 태스크 실행 시 프롬프트에 자동 주입",
              en: "Agent behavior rules · Auto-injected into prompts during task execution",
              ja: "エージェント行動ルール · タスク実行時にプロンプトへ自動注入",
              zh: "代理行为规则 · 任务执行时自动注入提示",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-violet-600/20 text-violet-300 border border-violet-500/30 transition-all"
            style={{ borderRadius: "2px" }}
            title={t({
              ko: "새 룰 추가",
              en: "Add new rule",
              ja: "新しいルールを追加",
              zh: "添加新规则",
            })}
          >
            <span className="text-base">✏️</span>
            {t({ ko: "룰 추가", en: "Add Rule", ja: "ルール追加", zh: "添加规则" })}
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono" style={{ color: "var(--th-accent)" }}>{rulesCount}</div>
            <div className="text-xs" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "등록된 룰", en: "Registered rules", ja: "登録済みルール", zh: "已注册规则" })}
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
              ko: "룰 검색... (제목, 설명, 내용, 스코프)",
              en: "Search rules... (title, description, content, scope)",
              ja: "ルール検索...（タイトル・説明・内容・スコープ）",
              zh: "搜索规则...（标题、描述、内容、范围）",
            })}
            className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
            style={{ background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)" }}
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
          className="rounded px-3 py-2.5 text-sm focus:outline-none"
          style={{ background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
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
