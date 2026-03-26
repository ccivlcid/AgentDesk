import type { TFunction } from "./model";

interface SkillsHeaderProps {
  t: TFunction;
  skillsCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: "rank" | "name" | "installs";
  onSortByChange: (value: "rank" | "name" | "installs") => void;
  onOpenCustomSkillModal: () => void;
}

export default function SkillsHeader({
  t,
  skillsCount,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  onOpenCustomSkillModal,
}: SkillsHeaderProps) {
  return (
    <div
      className="border p-4"
      style={{
        background: "var(--th-bg-elevated)",
        borderColor: "var(--th-border)",
        borderRadius: "10px 10px 0 0",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-primary)", textTransform: "uppercase" }}>
            {t({ ko: "SKILLS LIBRARY", en: "SKILLS LIBRARY", ja: "SKILLS LIBRARY", zh: "SKILLS LIBRARY" })}
          </span>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", color: "var(--th-text-muted)" }}>
            · {skillsCount} {t({ ko: "skills", en: "skills", ja: "skills", zh: "skills" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCustomSkillModal}
            className="custom-skill-add-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
            style={{ borderRadius: 6, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", fontFamily: "var(--th-font-mono)" }}
            title={t({ ko: "커스텀 스킬 직접 추가", en: "Add custom skill", ja: "カスタムスキルを追加", zh: "添加自定义技能" })}
          >
            + {t({ ko: "Add Skill", en: "Add Skill", ja: "Add Skill", zh: "Add Skill" })}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t({
              ko: "스킬 검색... (이름, 저장소, 카테고리)",
              en: "Search skills... (name, repo, category)",
              ja: "スキル検索...（名前・リポジトリ・カテゴリ）",
              zh: "搜索技能...（名称、仓库、分类）",
            })}
            className="w-full px-4 py-2 text-sm focus:outline-none"
            style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)", borderRadius: 6, fontFamily: "var(--th-font-mono)", fontSize: "12px" }}
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
          onChange={(e) => onSortByChange(e.target.value as "rank" | "name" | "installs")}
          className="px-3 py-2 text-xs focus:outline-none"
          style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", borderRadius: 6, fontFamily: "var(--th-font-mono)" }}
        >
          <option value="rank">{t({ ko: "순위순", en: "By Rank", ja: "順位順", zh: "按排名" })}</option>
          <option value="installs">
            {t({ ko: "설치순", en: "By Installs", ja: "インストール順", zh: "按安装量" })}
          </option>
          <option value="name">{t({ ko: "이름순", en: "By Name", ja: "名前順", zh: "按名称" })}</option>
        </select>
      </div>
    </div>
  );
}
