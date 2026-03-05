import type { Agent, Department } from "../../types";
import { localeName } from "../../i18n";
import AgentCard from "./AgentCard";
import { StackedSpriteIcon } from "./EmojiPicker";
import type { Translator } from "./types";

interface AgentsTabProps {
  tr: Translator;
  locale: string;
  isKo: boolean;
  agents: Agent[];
  departments: Department[];
  deptTab: string;
  setDeptTab: (deptId: string) => void;
  search: string;
  setSearch: (next: string) => void;
  sortedAgents: Agent[];
  spriteMap: Map<string, number>;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onEditAgent: (agent: Agent) => void;
  onEditDepartment: (department: Department) => void;
  onDeleteAgent: (agentId: string) => void;
  saving: boolean;
  randomIconSprites: {
    total: [number, number];
  };
}

export default function AgentsTab({
  tr,
  locale,
  isKo,
  agents,
  departments,
  deptTab,
  setDeptTab,
  search,
  setSearch,
  sortedAgents,
  spriteMap,
  confirmDeleteId,
  setConfirmDeleteId,
  onEditAgent,
  onEditDepartment,
  onDeleteAgent,
  saving,
  randomIconSprites,
}: AgentsTabProps) {
  const workingCount = agents.filter((agent) => agent.status === "working").length;
  const deptCounts = new Map<string, { total: number; working: number }>();
  for (const agent of agents) {
    const key = agent.department_id || "__none";
    const count = deptCounts.get(key) ?? { total: 0, working: 0 };
    count.total += 1;
    if (agent.status === "working") count.working += 1;
    deptCounts.set(key, count);
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: tr("전체 인원", "Total"),
            value: agents.length,
            icon: <StackedSpriteIcon sprites={randomIconSprites.total} />,
          },
          { label: tr("근무 중", "Working"), value: workingCount, icon: null },
          { label: tr("부서", "Departments"), value: departments.length, icon: null },
        ].map((summary) => (
          <div
            key={summary.label}
            className="rounded-xl px-4 py-3"
            style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
          >
            <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "var(--th-text-muted)" }}>
              {summary.icon}
              {summary.label}
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--th-text-heading)" }}>
              {summary.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <button
          type="button"
          onClick={() => setDeptTab("all")}
          className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
            deptTab === "all" ? "" : "border-transparent"
          }`}
          style={{
            color: deptTab === "all" ? "var(--th-text-heading)" : "var(--th-text-muted)",
            borderColor: deptTab === "all" ? "var(--th-accent, #2563eb)" : undefined,
          }}
        >
          {tr("전체", "All")} <span className="opacity-60">{agents.length}</span>
        </button>
        {departments.map((department) => {
          const count = deptCounts.get(department.id);
          const isActive = deptTab === department.id;
          return (
            <button
              key={department.id}
              type="button"
              onClick={() => setDeptTab(department.id)}
              onDoubleClick={(e) => {
                e.preventDefault();
                onEditDepartment(department);
              }}
              title={tr("더블클릭: 부서 편집", "Double-click: edit dept")}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                isActive ? "" : "border-transparent"
              }`}
              style={{
                color: isActive ? "var(--th-text-heading)" : "var(--th-text-muted)",
                borderColor: isActive ? "var(--th-accent, #2563eb)" : undefined,
              }}
            >
              <span className="hidden sm:inline">{localeName(locale, department)}</span>
              <span className="opacity-60">{count?.total ?? 0}</span>
            </button>
          );
        })}
        <div className="ml-auto pb-1">
          <input
            type="text"
            placeholder={`${tr("검색", "Search")}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none transition-shadow w-36 focus:ring-1"
            style={{
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              color: "var(--th-text-primary)",
            }}
          />
        </div>
      </div>

      {sortedAgents.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "var(--th-text-muted)" }}>
          {tr("검색 결과 없음", "No agents found")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              spriteMap={spriteMap}
              isKo={isKo}
              locale={locale}
              tr={tr}
              departments={departments}
              onEdit={() => onEditAgent(agent)}
              confirmDeleteId={confirmDeleteId}
              onDeleteClick={() => setConfirmDeleteId(agent.id)}
              onDeleteConfirm={() => onDeleteAgent(agent.id)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
              saving={saving}
            />
          ))}
        </div>
      )}
    </>
  );
}
