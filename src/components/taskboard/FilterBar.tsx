import type { Agent, Department, TaskExecutionState } from "../../types";
import { useI18n } from "../../i18n";
import { TASK_TYPE_OPTIONS, taskTypeLabel } from "./constants";

interface ProjectOption {
  id: string;
  name: string;
}

interface FilterBarProps {
  departments: Department[];
  projects: ProjectOption[];
  agents?: Agent[];
  filterDept: string;
  filterType: string;
  filterProject: string;
  filterAgent: string;
  filterExecution: string;
  search: string;
  onFilterDept: (value: string) => void;
  onFilterType: (value: string) => void;
  onFilterProject: (value: string) => void;
  onFilterAgent: (value: string) => void;
  onFilterExecution: (value: string) => void;
  onSearch: (value: string) => void;
}

const EXECUTION_FILTER_OPTIONS: Array<{ value: "" | TaskExecutionState | "attention"; label: Record<string, string> }> = [
  { value: "", label: { ko: "전체 실행", en: "All Execution", ja: "全実行", zh: "全部执行" } },
  { value: "running", label: { ko: "실행 중", en: "Running", ja: "実行中", zh: "执行中" } },
  { value: "awaiting_review", label: { ko: "리뷰 대기", en: "Awaiting Review", ja: "レビュー待ち", zh: "等待审查" } },
  { value: "blocked", label: { ko: "보류", en: "Blocked", ja: "保留", zh: "阻塞" } },
  { value: "stalled", label: { ko: "멈춤", en: "Stalled", ja: "停止", zh: "停滞" } },
  { value: "failed", label: { ko: "실패", en: "Failed", ja: "失敗", zh: "失败" } },
  { value: "attention", label: { ko: "주의 필요", en: "Needs Attention", ja: "要注意", zh: "需要关注" } },
];

export default function FilterBar({
  departments,
  projects,
  agents = [],
  filterDept,
  filterType,
  filterProject,
  filterAgent,
  filterExecution,
  search,
  onFilterDept,
  onFilterType,
  onFilterProject,
  onFilterAgent,
  onFilterExecution,
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

      {agents.length > 0 && (
        <select
          value={filterAgent}
          onChange={(event) => onFilterAgent(event.target.value)}
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
          <option value="">{t({ ko: "전체 담당자", en: "All Agents", ja: "全担当", zh: "全部担当" })}</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.avatar_emoji} {locale === "ko" ? (agent.name_ko || agent.name) : agent.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={filterExecution}
        onChange={(event) => onFilterExecution(event.target.value)}
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
        {EXECUTION_FILTER_OPTIONS.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label[locale] ?? option.label.en}
          </option>
        ))}
      </select>
    </div>
  );
}
