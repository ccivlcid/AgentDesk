/**
 * Project-scoped rules prompt injection.
 *
 * Loads enabled rules from agent_rules table filtered by project/agent/department/global scope,
 * then builds a prompt block for injection into the agent execution prompt.
 *
 * Priority resolution: project > agent > department > global
 */

interface RuleRow {
  rule_content: string;
  scope_type: string;
  priority: number;
  title: string;
}

interface DbLike {
  prepare(sql: string): { all(...params: unknown[]): unknown[] };
}

/**
 * Query enabled rules matching the given scope hierarchy and build a prompt block.
 * Returns empty string if no rules match.
 */
export function buildRulesPromptBlock(
  db: DbLike,
  context: {
    projectId: string | null;
    agentId: string | null;
    departmentId: string | null;
  },
  lang: string,
): string {
  const { projectId, agentId, departmentId } = context;

  const scopeConditions: string[] = ["(scope_type = 'global')"];
  const params: unknown[] = [];

  if (projectId) {
    scopeConditions.push("(scope_type = 'project' AND scope_id = ?)");
    params.push(projectId);
  }
  if (agentId) {
    scopeConditions.push("(scope_type = 'agent' AND scope_id = ?)");
    params.push(agentId);
  }
  if (departmentId) {
    scopeConditions.push("(scope_type = 'department' AND scope_id = ?)");
    params.push(departmentId);
  }

  const scopeWhere = scopeConditions.join(" OR ");
  const rules = db
    .prepare(
      `SELECT rule_content, scope_type, priority, title
       FROM agent_rules
       WHERE enabled = 1 AND (${scopeWhere})
       ORDER BY
         CASE scope_type
           WHEN 'project' THEN 1
           WHEN 'agent' THEN 2
           WHEN 'department' THEN 3
           WHEN 'global' THEN 4
         END,
         priority DESC
       LIMIT 30`,
    )
    .all(...params) as RuleRow[];

  if (rules.length === 0) return "";

  const header =
    lang === "ko"
      ? "[Agent Rules] 프로젝트/에이전트/부서/글로벌 규칙이 적용됩니다:"
      : lang === "ja"
        ? "[Agent Rules] プロジェクト/エージェント/部署/グローバルルールが適用されます:"
        : lang === "zh"
          ? "[Agent Rules] 项目/代理/部门/全局规则已应用:"
          : "[Agent Rules] Project/agent/department/global rules applied:";

  const scopeLabels: Record<string, string> = {
    project: "project",
    agent: "agent",
    department: "dept",
    global: "global",
  };

  const lines = rules.map(
    (r, i) =>
      `  ${i + 1}. [${scopeLabels[r.scope_type] || r.scope_type}] ${r.title}: ${r.rule_content.slice(0, 400)}${r.rule_content.length > 400 ? "..." : ""}`,
  );

  return `${header}\n${lines.join("\n")}`;
}
