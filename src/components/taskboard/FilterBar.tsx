import type { Agent, Department } from "../../types";
import { useI18n } from "../../i18n";
import AgentSelect from "../AgentSelect";
import { TASK_TYPE_OPTIONS, taskTypeLabel } from "./constants";

interface FilterBarProps {
  agents: Agent[];
  departments: Department[];
  filterDept: string;
  filterAgent: string;
  filterType: string;
  search: string;
  onFilterDept: (value: string) => void;
  onFilterAgent: (value: string) => void;
  onFilterType: (value: string) => void;
  onSearch: (value: string) => void;
}

export default function FilterBar({
  agents,
  departments,
  filterDept,
  filterAgent,
  filterType,
  search,
  onFilterDept,
  onFilterAgent,
  onFilterType,
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
          className="w-full rounded-lg border py-1.5 pl-3 pr-3 text-sm outline-none transition focus:ring-1"
          style={{
            borderColor: "var(--th-border)",
            background: "var(--th-bg-surface)",
            color: "var(--th-text-primary)",
          }}
          aria-label={t({ ko: "업무 검색", en: "Search tasks", ja: "タスク検索", zh: "搜索任务" })}
        />
      </div>

      <select
        value={filterDept}
        onChange={(event) => onFilterDept(event.target.value)}
        className="rounded-lg border px-3 py-1.5 text-sm outline-none transition focus:ring-1"
        style={{
          borderColor: "var(--th-border)",
          background: "var(--th-bg-surface)",
          color: "var(--th-text-secondary)",
        }}
      >
        <option value="">{t({ ko: "전체 부서", en: "All Departments", ja: "全部署", zh: "全部门" })}</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.icon} {locale === "ko" ? department.name_ko : department.name}
          </option>
        ))}
      </select>

      <AgentSelect
        agents={agents}
        departments={departments}
        value={filterAgent}
        onChange={onFilterAgent}
        placeholder={t({ ko: "전체 에이전트", en: "All Agents", ja: "全エージェント", zh: "全部代理" })}
        size="md"
      />

      <select
        value={filterType}
        onChange={(event) => onFilterType(event.target.value)}
        className="rounded-lg border px-3 py-1.5 text-sm outline-none transition focus:ring-1"
        style={{
          borderColor: "var(--th-border)",
          background: "var(--th-bg-surface)",
          color: "var(--th-text-secondary)",
        }}
      >
        <option value="">{t({ ko: "전체 유형", en: "All Types", ja: "全タイプ", zh: "全部类型" })}</option>
        {TASK_TYPE_OPTIONS.map((typeOption) => (
          <option key={typeOption.value} value={typeOption.value}>
            {taskTypeLabel(typeOption.value, t)}
          </option>
        ))}
      </select>
    </div>
  );
}
