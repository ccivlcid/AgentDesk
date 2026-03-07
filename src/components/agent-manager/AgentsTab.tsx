import { motion } from "framer-motion";
import type { Agent, Department } from "../../types";
import { localeName } from "../../i18n";
import AgentCard from "./AgentCard";
import { StackedSpriteIcon } from "./EmojiPicker";
import type { Translator } from "./types";

const cardContainer = {
  show: { transition: { staggerChildren: 0.04 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.1, ease: "linear" as const } },
};

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
            style={{
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              borderRadius: "4px",
              padding: "0.625rem 0.875rem",
            }}
          >
            <div
              className="flex items-center gap-1.5 mb-1 uppercase tracking-wider"
              style={{ color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", fontSize: "0.625rem" }}
            >
              {summary.icon}
              {summary.label}
            </div>
            <div
              className="tabular-nums font-bold"
              style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)", fontSize: "1.5rem" }}
            >
              {summary.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-0 flex-wrap" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <button
          type="button"
          onClick={() => setDeptTab("all")}
          className="flex items-center gap-1 px-3 py-2 border-b-2 transition-colors"
          style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: "0.75rem",
            color: deptTab === "all" ? "var(--th-text-heading)" : "var(--th-text-muted)",
            borderColor: deptTab === "all" ? "var(--th-accent, #f59e0b)" : "transparent",
            transition: "color 0.1s linear, border-color 0.1s linear",
          }}
        >
          ALL <span style={{ opacity: 0.5, marginLeft: "0.25rem" }}>{agents.length}</span>
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
              className="flex items-center gap-1 px-3 py-2 border-b-2 transition-colors"
              style={{
                fontFamily: "var(--th-font-mono)",
                fontSize: "0.75rem",
                color: isActive ? "var(--th-text-heading)" : "var(--th-text-muted)",
                borderColor: isActive ? "var(--th-accent, #f59e0b)" : "transparent",
                transition: "color 0.1s linear, border-color 0.1s linear",
              }}
            >
              <span className="hidden sm:inline">{localeName(locale, department)}</span>
              <span style={{ opacity: 0.5, marginLeft: "0.25rem" }}>{count?.total ?? 0}</span>
            </button>
          );
        })}
        <div className="ml-auto pb-1">
          <input
            type="text"
            placeholder={`${tr("검색", "Search")}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              borderRadius: "2px",
              color: "var(--th-text-primary)",
              fontFamily: "var(--th-font-mono)",
              fontSize: "0.75rem",
              padding: "0.25rem 0.625rem",
              outline: "none",
              width: "9rem",
            }}
          />
        </div>
      </div>

      {sortedAgents.length === 0 ? (
        <div className="terminal-empty-state py-16">
          <p className="terminal-empty-state-cmd">$ ls agents/</p>
          <p className="terminal-empty-state-result">(empty)</p>
          <p className="terminal-empty-state-hint">{tr("검색 결과 없음", "No agents found")}</p>
        </div>
      ) : (
        <motion.div
          key={`${deptTab}:${search}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={cardContainer}
          initial="hidden"
          animate="show"
        >
          {sortedAgents.map((agent) => (
            <motion.div key={agent.id} variants={cardItem}>
              <AgentCard
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
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}
