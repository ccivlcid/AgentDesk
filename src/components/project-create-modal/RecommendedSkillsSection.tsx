import { useEffect, useMemo, useState } from "react";
import { getSkills } from "../../api";
import { categorize, formatInstalls, CATEGORY_COLORS, CATEGORY_ICONS } from "../skills-library/model";
import { PROJECT_CATEGORY_TO_SKILL_CATEGORIES } from "./projectCategorySkillMap";

interface Props {
  categoryId: string;
}

const MAX_SKILLS = 6;

export default function RecommendedSkillsSection({ categoryId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [allSkills, setAllSkills] = useState<
    { name: string; repo: string; rank: number; installs: number; skillId?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSkills()
      .then((skills) => {
        if (!cancelled) setAllSkills(skills);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommended = useMemo(() => {
    const targetCategories = PROJECT_CATEGORY_TO_SKILL_CATEGORIES[categoryId];
    if (!targetCategories || targetCategories.length === 0) return [];

    const targetSet = new Set(targetCategories);
    return allSkills
      .map((skill) => ({
        ...skill,
        category: categorize(skill.name, skill.repo),
      }))
      .filter((s) => targetSet.has(s.category))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_SKILLS);
  }, [allSkills, categoryId]);

  if (loading || recommended.length === 0) return null;

  return (
    <div
      className="border"
      style={{
        borderRadius: 0,
        borderColor: "var(--th-border)",
        background: "var(--th-bg-surface)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <span>💡</span>
          <span>추천 스킬</span>
          <span
            className="px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              borderRadius: 0,
              background: "rgba(251,191,36,0.1)",
              color: "var(--th-accent)",
            }}
          >
            {recommended.length}
          </span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: "var(--th-text-muted)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {recommended.map((skill) => {
            const colorClass = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.Other;
            const iconText = CATEGORY_ICONS[skill.category];
            const iconNode = iconText
              ? iconText
              : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
            return (
              <div
                key={skill.name}
                className="flex items-center gap-2 px-2.5 py-2 border"
                style={{
                  borderRadius: 0,
                  borderColor: "var(--th-border)",
                  background: "var(--th-bg-elevated)",
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-bold font-mono"
                  style={{
                    borderRadius: 0,
                    background: "rgba(251,191,36,0.15)",
                    color: "var(--th-accent)",
                  }}
                >
                  {skill.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[11px] font-medium font-mono"
                    style={{ color: "var(--th-text-primary)" }}
                    title={skill.name}
                  >
                    {skill.name.split(":").pop()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1 py-px text-[9px] border ${colorClass}`}
                      style={{ borderRadius: 0 }}
                    >
                      {iconNode}
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {formatInstalls(skill.installs, "ko-KR")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
