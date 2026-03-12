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

type _AgentUnused = Agent; // suppress unused import warning

const EXECUTION_FILTER_OPTIONS: Array<{ value: "" | TaskExecutionState | "attention"; label: Record<string, string> }> = [
  { value: "", label: { ko: "전체 실행", en: "All Execution", ja: "全実行", zh: "全部执行" } },
  { value: "running", label: { ko: "실행 중", en: "Running", ja: "実行中", zh: "执行中" } },
  { value: "awaiting_review", label: { ko: "리뷰 대기", en: "Awaiting Review", ja: "レビュー待ち", zh: "等待审查" } },
  { value: "blocked", label: { ko: "보류", en: "Blocked", ja: "保留", zh: "阻塞" } },
  { value: "stalled", label: { ko: "멈춤", en: "Stalled", ja: "停止", zh: "停滞" } },
  { value: "failed", label: { ko: "실패", en: "Failed", ja: "失敗", zh: "失败" } },
  { value: "attention", label: { ko: "주의 필요", en: "Needs Attention", ja: "要注意", zh: "需要关注" } },
];

const selectStyle: React.CSSProperties = {
  border: "1px solid var(--th-border)",
  borderRadius: 6,
  padding: "0.25rem 0.5rem",
  background: "var(--th-bg-surface)",
  color: "var(--th-text-secondary)",
  fontFamily: "var(--th-font-mono)",
  fontSize: "0.75rem",
  outline: "none",
};

export default function FilterBar({
  departments,
  projects,
  filterDept,
  filterType,
  filterProject,
  filterExecution,
  search,
  onFilterDept,
  onFilterType,
  onFilterProject,
  onFilterExecution,
  onSearch,
}: Omit<FilterBarProps, "agents" | "filterAgent" | "onFilterAgent">) {
  const { t, language: locale } = useI18n();

  const hasFilter = !!(filterDept || filterType || filterProject || filterExecution || search);

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
      {/* 검색 */}
      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={t({ ko: "검색...", en: "search...", ja: "検索...", zh: "搜索..." })}
        style={{
          ...selectStyle,
          minWidth: 120,
          flex: 1,
          color: "var(--th-text-primary)",
          padding: "0.25rem 0.625rem",
        }}
        aria-label={t({ ko: "업무 검색", en: "Search tasks", ja: "タスク検索", zh: "搜索任务" })}
      />

      {/* 부서 */}
      <select value={filterDept} onChange={(e) => onFilterDept(e.target.value)} style={selectStyle}>
        <option value="">{t({ ko: "전체 부서", en: "ALL DEPT", ja: "全部署", zh: "全部门" })}</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.icon} {locale === "ko" ? d.name_ko : d.name}
          </option>
        ))}
      </select>

      {/* 유형 */}
      <select value={filterType} onChange={(e) => onFilterType(e.target.value)} style={selectStyle}>
        <option value="">{t({ ko: "전체 유형", en: "ALL TYPE", ja: "全タイプ", zh: "全类型" })}</option>
        {TASK_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{taskTypeLabel(o.value, t)}</option>
        ))}
      </select>

      {/* 프로젝트 */}
      {projects.length > 0 && (
        <select value={filterProject} onChange={(e) => onFilterProject(e.target.value)} style={selectStyle}>
          <option value="">{t({ ko: "전체 프로젝트", en: "ALL PROJ", ja: "全PJ", zh: "全项目" })}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {/* 실행 상태 */}
      <select value={filterExecution} onChange={(e) => onFilterExecution(e.target.value)} style={selectStyle}>
        {EXECUTION_FILTER_OPTIONS.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label[locale] ?? o.label.en}
          </option>
        ))}
      </select>

      {/* 필터 초기화 — 항상 표시, 필터 없으면 dim */}
      <button
        type="button"
        onClick={() => { onFilterDept(""); onFilterType(""); onFilterProject(""); onFilterExecution(""); onSearch(""); }}
        style={{
          fontFamily: "var(--th-font-mono)",
          fontSize: "10px",
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 6,
          border: `1px solid ${hasFilter ? "rgba(251,191,36,0.4)" : "var(--th-border)"}`,
          background: hasFilter ? "rgba(251,191,36,0.06)" : "transparent",
          color: hasFilter ? "var(--th-accent)" : "var(--th-text-muted)",
          cursor: "pointer",
          letterSpacing: "0.04em",
          opacity: hasFilter ? 1 : 0.4,
        }}
      >
        ✕ {t({ ko: "초기화", en: "RESET", ja: "リセット", zh: "重置" })}
      </button>
    </div>
  );
}
