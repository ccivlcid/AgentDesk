import { useCallback, useEffect, useState } from "react";
import type { Category, Project } from "../types";
import CategoryBadge from "./project-selector/CategoryBadge";
import { objectivesApi, fetchProjectAgents } from "../api/categories-dashboard";
import { useI18n } from "../i18n";

interface ProjectContextBarProps {
  project: Project;
  categories: Category[];
}

export default function ProjectContextBar({ project, categories }: ProjectContextBarProps) {
  const { t } = useI18n();
  const [objectivesTotal, setObjectivesTotal] = useState(0);
  const [objectivesDone, setObjectivesDone] = useState(0);
  const [teamCount, setTeamCount] = useState(0);

  const load = useCallback(async () => {
    const [objectives, teamAgents] = await Promise.all([
      objectivesApi.list(project.id).catch(() => []),
      fetchProjectAgents(project.id).catch(() => []),
    ]);
    setObjectivesTotal(objectives.length);
    setObjectivesDone(objectives.filter((o) => o.status === "completed").length);
    setTeamCount(teamAgents.length);
  }, [project.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const category = project.category_id
    ? categories.find((c) => c.id === project.category_id)
    : undefined;

  return (
    <div
      className="flex items-center gap-3 px-4 flex-shrink-0"
      style={{
        height: 32,
        background: "var(--th-bg-elevated)",
        borderBottom: "1px solid var(--th-border)",
        fontSize: "0.75rem",
      }}
    >
      {/* 프로젝트명 */}
      <span className="font-medium text-[var(--th-text)] truncate max-w-[200px]">
        {project.name}
      </span>

      {/* 카테고리 배지 */}
      {category && (
        <CategoryBadge
          label={category.name_ko ?? category.name}
          color={category.color}
          icon={category.icon}
        />
      )}

      <span className="text-[var(--th-border)] select-none">·</span>

      {/* 목표 달성률 */}
      <span className="flex items-center gap-1 text-[var(--th-text-muted)]">
        <span style={{ color: "#3b82f6" }}>●</span>
        {t({ ko: "목표", en: "Goals", ja: "目標", zh: "目标" })}{" "}
        <strong className="text-[var(--th-text)]">
          {objectivesDone}/{objectivesTotal}
        </strong>
      </span>

      <span className="text-[var(--th-border)] select-none">·</span>

      {/* 팀원 수 */}
      <span className="text-[var(--th-text-muted)]">
        {t({ ko: "팀원", en: "Team", ja: "チーム", zh: "团队" })}{" "}
        <strong className="text-[var(--th-text)]">
          {teamCount}{t({ ko: "명", en: "", ja: "人", zh: "人" })}
        </strong>
      </span>
    </div>
  );
}
