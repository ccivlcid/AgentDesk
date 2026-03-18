import type { DatabaseSync } from "node:sqlite";
import logger from "../../../lib/logger.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

interface RuleSeed {
  id: string;
  title: string;
  rule_content: string;
  category: string;
  priority: number;
}

const DEFAULT_RULES: RuleSeed[] = [
  // ── coding (8) ────────────────────────────────────────────────────────────
  {
    id: "rule-default-coding-001",
    title: "Write self-documenting code",
    rule_content: "Use clear, descriptive variable and function names that explain intent without needing comments. Avoid abbreviations unless they are universally understood in context.",
    category: "coding",
    priority: 80,
  },
  {
    id: "rule-default-coding-002",
    title: "Single responsibility principle",
    rule_content: "Each function, class, or module should have exactly one reason to change. If a function does more than one thing, split it.",
    category: "coding",
    priority: 78,
  },
  {
    id: "rule-default-coding-003",
    title: "Write tests for all new functions",
    rule_content: "Every new function or method must have corresponding unit tests covering the happy path, edge cases, and error conditions before the task is marked complete.",
    category: "coding",
    priority: 75,
  },
  {
    id: "rule-default-coding-004",
    title: "Use early returns to reduce nesting",
    rule_content: "Prefer guard clauses and early returns over deeply nested if-else blocks. Code should read top-to-bottom with minimal indentation.",
    category: "coding",
    priority: 65,
  },
  {
    id: "rule-default-coding-005",
    title: "No magic numbers or strings",
    rule_content: "Never use unexplained numeric or string literals in logic. Always extract them into named constants with clear names that convey their purpose.",
    category: "coding",
    priority: 70,
  },
  {
    id: "rule-default-coding-006",
    title: "Prefer immutability",
    rule_content: "Treat data as immutable wherever possible. Avoid mutating function arguments or shared state. Return new values instead of modifying existing ones.",
    category: "coding",
    priority: 60,
  },
  {
    id: "rule-default-coding-007",
    title: "Handle errors explicitly",
    rule_content: "Never silently swallow exceptions. All errors must be either handled with specific logic, re-thrown with added context, or surfaced to the caller. Empty catch blocks are forbidden.",
    category: "coding",
    priority: 85,
  },
  {
    id: "rule-default-coding-008",
    title: "Comment the WHY, not the WHAT",
    rule_content: "Code explains what is happening. Comments should explain why a decision was made — especially for non-obvious logic, workarounds, or business constraints.",
    category: "coding",
    priority: 55,
  },

  // ── communication (7) ────────────────────────────────────────────────────
  {
    id: "rule-default-comm-001",
    title: "Use concise, clear language",
    rule_content: "Be direct and precise in all responses. Avoid unnecessary filler phrases. Lead with the answer, then provide supporting detail if needed.",
    category: "communication",
    priority: 80,
  },
  {
    id: "rule-default-comm-002",
    title: "Summarize changes at session end",
    rule_content: "At the end of each work session or after completing a significant block of changes, provide a brief summary of what was done and why.",
    category: "communication",
    priority: 65,
  },
  {
    id: "rule-default-comm-003",
    title: "Ask before starting complex tasks",
    rule_content: "Before beginning any task that involves significant architectural decisions or irreversible changes, clarify requirements and confirm the approach with the user.",
    category: "communication",
    priority: 75,
  },
  {
    id: "rule-default-comm-004",
    title: "Break long explanations into structured lists",
    rule_content: "When explaining multi-step processes or complex topics, use bullet points or numbered lists rather than long prose paragraphs.",
    category: "communication",
    priority: 55,
  },
  {
    id: "rule-default-comm-005",
    title: "State assumptions explicitly",
    rule_content: "When making assumptions about requirements, constraints, or behavior, state them clearly before proceeding. Never act on silent assumptions.",
    category: "communication",
    priority: 70,
  },
  {
    id: "rule-default-comm-006",
    title: "Use examples to illustrate abstract concepts",
    rule_content: "When explaining abstract patterns, architectures, or rules, always provide a concrete code example or real-world analogy to ground the explanation.",
    category: "communication",
    priority: 50,
  },
  {
    id: "rule-default-comm-007",
    title: "Confirm understanding before proceeding",
    rule_content: "For ambiguous requests, restate your interpretation in one sentence and confirm with the user before executing. This prevents rework from misunderstandings.",
    category: "communication",
    priority: 72,
  },

  // ── quality (8) ──────────────────────────────────────────────────────────
  {
    id: "rule-default-quality-001",
    title: "Review code before submitting",
    rule_content: "Always re-read generated or modified code end-to-end before marking a task complete. Check for typos, logic errors, missing edge case handling, and style inconsistencies.",
    category: "quality",
    priority: 85,
  },
  {
    id: "rule-default-quality-002",
    title: "Follow the DRY principle",
    rule_content: "Do not repeat yourself. If the same logic appears more than twice, extract it into a reusable function, constant, or abstraction.",
    category: "quality",
    priority: 75,
  },
  {
    id: "rule-default-quality-003",
    title: "Keep functions small",
    rule_content: "Functions should ideally be under 30 lines. If a function grows beyond 50 lines, treat it as a sign it should be decomposed into smaller units.",
    category: "quality",
    priority: 65,
  },
  {
    id: "rule-default-quality-004",
    title: "Maintain consistent code style",
    rule_content: "Follow the existing style of the codebase — indentation, naming conventions, import ordering, and bracket placement. Consistency matters more than personal preference.",
    category: "quality",
    priority: 70,
  },
  {
    id: "rule-default-quality-005",
    title: "Test boundary conditions",
    rule_content: "Always test edge cases: empty inputs, null/undefined values, maximum and minimum values, and invalid inputs. Don't only test the happy path.",
    category: "quality",
    priority: 80,
  },
  {
    id: "rule-default-quality-006",
    title: "Remove dead code promptly",
    rule_content: "Delete commented-out code, unused variables, unreachable branches, and deprecated functions as soon as they are no longer needed. Don't leave dead code as reference.",
    category: "quality",
    priority: 60,
  },
  {
    id: "rule-default-quality-007",
    title: "Validate inputs at system boundaries",
    rule_content: "Validate all external inputs — user input, API responses, file contents, environment variables — at the point they enter the system. Trust internal code; validate external data.",
    category: "quality",
    priority: 82,
  },
  {
    id: "rule-default-quality-008",
    title: "Document public APIs",
    rule_content: "Every public function, class, or API endpoint should have a docstring or comment describing its purpose, parameters, return value, and any exceptions it may throw.",
    category: "quality",
    priority: 58,
  },

  // ── execution (7) ─────────────────────────────────────────────────────────
  {
    id: "rule-default-exec-001",
    title: "Break large tasks into subtasks",
    rule_content: "Before starting any task estimated to take more than 30 minutes, decompose it into discrete subtasks with clear completion criteria. Work through them sequentially.",
    category: "execution",
    priority: 75,
  },
  {
    id: "rule-default-exec-002",
    title: "Complete one task before starting another",
    rule_content: "Do not start a new task until the current one is fully completed, tested, and committed. Partial work in multiple areas simultaneously leads to context loss and bugs.",
    category: "execution",
    priority: 70,
  },
  {
    id: "rule-default-exec-003",
    title: "Use incremental commits",
    rule_content: "Commit small, logical units of work frequently rather than one large commit at the end. Each commit should represent a single coherent change that passes all tests.",
    category: "execution",
    priority: 65,
  },
  {
    id: "rule-default-exec-004",
    title: "Verify outputs before marking complete",
    rule_content: "Before declaring a task done, manually verify that the output meets the stated requirements. Run the code, check the output, and confirm it behaves as expected.",
    category: "execution",
    priority: 80,
  },
  {
    id: "rule-default-exec-005",
    title: "Log progress on long-running tasks",
    rule_content: "For tasks expected to run more than a few seconds, emit progress logs at meaningful milestones so the user can track status without polling.",
    category: "execution",
    priority: 55,
  },
  {
    id: "rule-default-exec-006",
    title: "Never skip pre-commit checks",
    rule_content: "Always run linting, type checking, and tests before committing. Never use --no-verify or force-push to bypass CI checks. Fix the underlying issue instead.",
    category: "execution",
    priority: 88,
  },
  {
    id: "rule-default-exec-007",
    title: "Prioritize by impact and urgency",
    rule_content: "When multiple tasks are pending, always work on the highest-impact item first. Bugs in production take priority over new features. Security issues take priority over everything else.",
    category: "execution",
    priority: 77,
  },

  // ── security (7) ──────────────────────────────────────────────────────────
  {
    id: "rule-default-sec-001",
    title: "Never hardcode credentials",
    rule_content: "API keys, passwords, tokens, and secrets must never appear in source code or version control. Always use environment variables or a secrets manager.",
    category: "security",
    priority: 95,
  },
  {
    id: "rule-default-sec-002",
    title: "Sanitize all user inputs",
    rule_content: "Treat all user-provided data as untrusted. Sanitize and validate inputs before using them in database queries, shell commands, file paths, or HTML output.",
    category: "security",
    priority: 90,
  },
  {
    id: "rule-default-sec-003",
    title: "Apply least privilege principle",
    rule_content: "Services, users, and processes should only have the minimum permissions required to perform their function. Never grant broad permissions for convenience.",
    category: "security",
    priority: 85,
  },
  {
    id: "rule-default-sec-004",
    title: "Never log sensitive data",
    rule_content: "Do not log passwords, tokens, personal identifiable information (PII), or financial data. When in doubt about whether data is sensitive, omit it from logs.",
    category: "security",
    priority: 88,
  },
  {
    id: "rule-default-sec-005",
    title: "Use parameterized queries",
    rule_content: "Always use parameterized queries or prepared statements for database access. Never concatenate user input directly into SQL strings. This prevents SQL injection.",
    category: "security",
    priority: 92,
  },
  {
    id: "rule-default-sec-006",
    title: "Keep dependencies up to date",
    rule_content: "Regularly audit and update third-party dependencies. Prioritize security patches. Use automated tools like Dependabot or `npm audit` to detect vulnerabilities.",
    category: "security",
    priority: 75,
  },
  {
    id: "rule-default-sec-007",
    title: "Use HTTPS for all external communications",
    rule_content: "All external API calls, webhook deliveries, and data transfers must use HTTPS/TLS. Never transmit sensitive data over plain HTTP.",
    category: "security",
    priority: 80,
  },

  // ── workflow (6) ──────────────────────────────────────────────────────────
  {
    id: "rule-default-wf-001",
    title: "Write descriptive commit messages",
    rule_content: "Commit messages must describe what changed and why, not just what files were touched. Use the imperative mood: 'Add feature X' not 'Added feature X'. Include ticket references when applicable.",
    category: "workflow",
    priority: 70,
  },
  {
    id: "rule-default-wf-002",
    title: "Create a branch for every feature or fix",
    rule_content: "Never commit directly to the main or master branch. Every change — even small fixes — should live on a dedicated branch named with a clear descriptor.",
    category: "workflow",
    priority: 75,
  },
  {
    id: "rule-default-wf-003",
    title: "Keep pull requests small and focused",
    rule_content: "A PR should address exactly one concern. Large PRs are hard to review and review fatigue leads to missed bugs. If a PR exceeds 400 lines, consider splitting it.",
    category: "workflow",
    priority: 65,
  },
  {
    id: "rule-default-wf-004",
    title: "Run all tests before merging",
    rule_content: "All tests must pass on the feature branch before a PR is merged. Never merge with a failing test suite, even if the failure seems unrelated to the change.",
    category: "workflow",
    priority: 85,
  },
  {
    id: "rule-default-wf-005",
    title: "Document breaking changes",
    rule_content: "Any change to a public API, configuration schema, or data format must be documented as a breaking change in the PR description, CHANGELOG, and migration guide.",
    category: "workflow",
    priority: 80,
  },
  {
    id: "rule-default-wf-006",
    title: "Link issues to pull requests",
    rule_content: "Every PR should reference the issue or task it resolves using keywords like 'Closes #123' in the description. This keeps work traceable from ticket to code.",
    category: "workflow",
    priority: 55,
  },

  // ── general (7) ───────────────────────────────────────────────────────────
  {
    id: "rule-default-gen-001",
    title: "Prefer simple solutions",
    rule_content: "Always choose the simplest solution that correctly solves the problem. Complexity should only be introduced when simpler solutions are provably insufficient.",
    category: "general",
    priority: 75,
  },
  {
    id: "rule-default-gen-002",
    title: "Optimize for readability first",
    rule_content: "Code is read far more often than it is written. Optimize for the next developer who reads it, not for clever brevity. Readable code is maintainable code.",
    category: "general",
    priority: 70,
  },
  {
    id: "rule-default-gen-003",
    title: "When in doubt, ask",
    rule_content: "It is always better to ask a clarifying question than to guess and implement the wrong thing. Wasted clarification time is far cheaper than wasted implementation time.",
    category: "general",
    priority: 72,
  },
  {
    id: "rule-default-gen-004",
    title: "Follow existing patterns in the codebase",
    rule_content: "Before introducing a new pattern or library, check how similar problems are solved elsewhere in the codebase. Consistency reduces cognitive load for the whole team.",
    category: "general",
    priority: 68,
  },
  {
    id: "rule-default-gen-005",
    title: "Consider performance early, not late",
    rule_content: "While premature optimization is a trap, known performance bottlenecks (N+1 queries, large memory allocations in hot paths) should be addressed at design time, not as a post-launch emergency.",
    category: "general",
    priority: 60,
  },
  {
    id: "rule-default-gen-006",
    title: "Document decisions and trade-offs",
    rule_content: "When making a design decision with meaningful trade-offs, record the reasoning in a comment, ADR (Architecture Decision Record), or PR description. Future maintainers need context, not just code.",
    category: "general",
    priority: 58,
  },
  {
    id: "rule-default-gen-007",
    title: "Think about maintenance cost",
    rule_content: "Every line of code you add is a line that someone must understand, debug, and eventually change. Prefer less code over more code when both solve the problem equally well.",
    category: "general",
    priority: 65,
  },
];

export function seedDefaultRules(db: DbLike): void {
  const rulesCount = (db.prepare("SELECT COUNT(*) as cnt FROM agent_rules").get() as { cnt: number }).cnt;
  if (rulesCount > 0) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO agent_rules
      (id, title, title_ko, title_ja, title_zh, description, rule_content, category, scope_type, scope_id, priority, enabled)
     VALUES (?, ?, '', '', '', '', ?, ?, 'global', NULL, ?, 1)`,
  );

  for (const rule of DEFAULT_RULES) {
    insert.run(rule.id, rule.title, rule.rule_content, rule.category, rule.priority);
  }

  logger.info(`[AgentDesk] Seeded ${DEFAULT_RULES.length} default agent rules`);
}
