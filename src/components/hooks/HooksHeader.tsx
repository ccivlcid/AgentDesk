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
    <div
      className="border p-4"
      style={{
        background: "var(--th-bg-panel)",
        borderColor: "var(--th-border)",
        borderRadius: "10px 10px 0 0",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* macOS 트래픽 라이트 (●●●) */}
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ff5f57" }} aria-hidden />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} aria-hidden />
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} aria-hidden />
          </div>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-heading)", textTransform: "uppercase" }}>
            HOOKS
          </span>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", color: "var(--th-text-muted)" }}>
            · {hooksCount} hooks
          </span>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
          style={{ borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", fontFamily: "var(--th-font-mono)" }}
          title={t({ ko: "새 훅 추가", en: "Add new hook", ja: "新しいフックを追加", zh: "添加新钩子" })}
        >
          + {t({ ko: "Add Hook", en: "Add Hook", ja: "Add Hook", zh: "Add Hook" })}
        </button>
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
            className="w-full px-4 py-2 text-sm focus:outline-none"
            style={{ background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)", borderRadius: 6, fontFamily: "var(--th-font-mono)", fontSize: "12px" }}
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
          onChange={(e) => onSortByChange(e.target.value as HookSortBy)}
          className="px-3 py-2 text-xs focus:outline-none"
          style={{ background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", borderRadius: 6, fontFamily: "var(--th-font-mono)" }}
        >
          <option value="priority">{t({ ko: "우선순위순", en: "By Priority", ja: "優先順位順", zh: "按优先级" })}</option>
          <option value="name">{t({ ko: "이름순", en: "By Name", ja: "名前順", zh: "按名称" })}</option>
          <option value="date">{t({ ko: "최신순", en: "By Date", ja: "日付順", zh: "按日期" })}</option>
          <option value="executions">{t({ ko: "실행횟수순", en: "By Executions", ja: "実行回数順", zh: "按执行次数" })}</option>
        </select>
      </div>
    </div>
  );
}
