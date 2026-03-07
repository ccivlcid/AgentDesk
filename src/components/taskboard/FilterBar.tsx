import type { Department } from "../../types";
import { useI18n } from "../../i18n";
import { TASK_TYPE_OPTIONS, taskTypeLabel } from "./constants";

interface ProjectOption {
  id: string;
  name: string;
}

interface FilterBarProps {
  departments: Department[];
  projects: ProjectOption[];
  filterDept: string;
  filterType: string;
  filterProject: string;
  search: string;
  onFilterDept: (value: string) => void;
  onFilterType: (value: string) => void;
  onFilterProject: (value: string) => void;
  onSearch: (value: string) => void;
}

export default function FilterBar({
  departments,
  projects,
  filterDept,
  filterType,
  filterProject,
  search,
  onFilterDept,
  onFilterType,
  onFilterProject,
  onSearch,
}: FilterBarProps) {
  const { t, language: locale } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[140px] flex-1 sm:min-w-[180px]">
        <input
          type="text"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t({ ko: "업무 검색...", en: "Search tasks...", ja: "タスク検索...", zh: "搜索任务..." })}
          className="w-full outline-none"
          style={{
            border: "1px solid var(--th-border)",
            borderRadius: "2px",
            padding: "0.3rem 0.625rem",
            background: "var(--th-bg-surface)",
            color: "var(--th-text-primary)",
            fontFamily: "var(--th-font-mono)",
            fontSize: "0.8125rem",
            transition: "border-color 0.1s linear",
          }}
          aria-label={t({ ko: "업무 검색", en: "Search tasks", ja: "タスク検索", zh: "搜索任务" })}
        />
      </div>

      <select
        value={filterDept}
        onChange={(event) => onFilterDept(event.target.value)}
        className="outline-none"
        style={{
          border: "1px solid var(--th-border)",
          borderRadius: "2px",
          padding: "0.3rem 0.625rem",
          background: "var(--th-bg-surface)",
          color: "var(--th-text-secondary)",
          fontFamily: "var(--th-font-mono)",
          fontSize: "0.8125rem",
        }}
      >
        <option value="">{t({ ko: "전체 부서", en: "All Departments", ja: "全部署", zh: "全部门" })}</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.icon} {locale === "ko" ? department.name_ko : department.name}
          </option>
        ))}
      </select>

      <select
        value={filterType}
        onChange={(event) => onFilterType(event.target.value)}
        className="outline-none"
        style={{
          border: "1px solid var(--th-border)",
          borderRadius: "2px",
          padding: "0.3rem 0.625rem",
          background: "var(--th-bg-surface)",
          color: "var(--th-text-secondary)",
          fontFamily: "var(--th-font-mono)",
          fontSize: "0.8125rem",
        }}
      >
        <option value="">{t({ ko: "전체 유형", en: "All Types", ja: "全タイプ", zh: "全部类型" })}</option>
        {TASK_TYPE_OPTIONS.map((typeOption) => (
          <option key={typeOption.value} value={typeOption.value}>
            {taskTypeLabel(typeOption.value, t)}
          </option>
        ))}
      </select>

      {projects.length > 0 && (
        <select
          value={filterProject}
          onChange={(event) => onFilterProject(event.target.value)}
          className="border outline-none transition"
          style={{
            borderRadius: "2px",
            padding: "0.3rem 0.625rem",
            borderColor: "var(--th-border)",
            background: "var(--th-bg-surface)",
            color: "var(--th-text-secondary)",
            fontFamily: "var(--th-font-mono)",
            fontSize: "0.8125rem",
          }}
        >
          <option value="">{t({ ko: "전체 프로젝트", en: "All Projects", ja: "全プロジェクト", zh: "全部项目" })}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
