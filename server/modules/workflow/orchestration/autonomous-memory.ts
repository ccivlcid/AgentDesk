/**
 * Autonomous Memory Accumulation Protocol
 *
 * 1. On task start: search relevant memories → inject into prompt
 * 2. On task completion: extract learnings from task log → save to memory_entries
 * 3. Memory dedup: skip if similar memory already exists (title match)
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  scope_type: string;
  scope_id: string | null;
  priority: number;
}

interface AutonomousMemoryDeps {
  db: any;
  nowMs: () => number;
  logsDir: string;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
}

/**
 * Search relevant memories for a task based on:
 * - Global memories (scope_type = 'global')
 * - Agent-scoped memories (scope_type = 'agent', scope_id = agentId)
 * - Department-scoped memories (scope_type = 'department', scope_id = departmentId)
 * - Workflow pack-scoped memories (scope_type = 'workflow_pack', scope_id = packKey)
 * - Keyword match from task title/description
 */
export function searchRelevantMemories(
  deps: Pick<AutonomousMemoryDeps, "db">,
  context: {
    agentId: string | null;
    departmentId: string | null;
    workflowPackKey: string | null;
    taskTitle: string;
    taskDescription: string | null;
  },
): MemoryEntry[] {
  const { db } = deps;
  const { agentId, departmentId, workflowPackKey, taskTitle, taskDescription } = context;

  // Get all enabled memories that match scope
  const scopeConditions: string[] = ["(scope_type = 'global')"];
  const params: any[] = [];

  if (agentId) {
    scopeConditions.push("(scope_type = 'agent' AND scope_id = ?)");
    params.push(agentId);
  }
  if (departmentId) {
    scopeConditions.push("(scope_type = 'department' AND scope_id = ?)");
    params.push(departmentId);
  }
  if (workflowPackKey) {
    scopeConditions.push("(scope_type = 'workflow_pack' AND scope_id = ?)");
    params.push(workflowPackKey);
  }

  const scopeWhere = scopeConditions.join(" OR ");
  const memories = db
    .prepare(
      `SELECT id, title, content, category, scope_type, scope_id, priority
       FROM memory_entries
       WHERE enabled = 1 AND (${scopeWhere})
       ORDER BY priority DESC, updated_at DESC
       LIMIT 50`,
    )
    .all(...params) as MemoryEntry[];

  // Score memories by keyword relevance to task
  const searchText = `${taskTitle} ${taskDescription || ""}`.toLowerCase();
  const keywords = searchText
    .split(/[\s,./\\:;!?()[\]{}'"]+/)
    .filter((w) => w.length > 2)
    .slice(0, 20);

  const scored = memories.map((m) => {
    const memText = `${m.title} ${m.content}`.toLowerCase();
    let score = m.priority / 100; // base score from priority
    // Scope-specific memories get a bonus
    if (m.scope_type === "agent") score += 2;
    if (m.scope_type === "department") score += 1.5;
    if (m.scope_type === "workflow_pack") score += 1;
    // Keyword match bonus
    for (const kw of keywords) {
      if (memText.includes(kw)) score += 0.5;
    }
    return { ...m, score };
  });

  // Sort by score and take top 10
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10);
}

/**
 * Build a prompt block with relevant memories for injection into task execution prompt.
 */
export function buildMemoryPromptBlock(
  deps: Pick<AutonomousMemoryDeps, "db">,
  context: {
    agentId: string | null;
    departmentId: string | null;
    workflowPackKey: string | null;
    taskTitle: string;
    taskDescription: string | null;
  },
  lang: string,
): string {
  const memories = searchRelevantMemories(deps, context);
  if (memories.length === 0) return "";

  const header =
    lang === "ko"
      ? "[Agent Memory] 관련 메모리가 자동 검색되었습니다:"
      : lang === "ja"
        ? "[Agent Memory] 関連メモリが自動検索されました:"
        : lang === "zh"
          ? "[Agent Memory] 相关记忆已自动检索:"
          : "[Agent Memory] Relevant memories auto-retrieved:";

  const lines = memories.map(
    (m, i) => `  ${i + 1}. [${m.category}] ${m.title}: ${m.content.slice(0, 300)}${m.content.length > 300 ? "..." : ""}`,
  );

  return `${header}\n${lines.join("\n")}`;
}

/**
 * Extract learnings from completed task log and save as memory entries.
 * Looks for patterns like:
 * - Error resolution patterns
 * - Important file paths discovered
 * - Configuration insights
 * - Tool/library usage patterns
 */
export function extractAndSaveTaskLearnings(
  deps: AutonomousMemoryDeps,
  taskInfo: {
    taskId: string;
    taskTitle: string;
    agentId: string | null;
    departmentId: string | null;
    workflowPackKey: string | null;
    exitCode: number;
    result: string | null;
  },
): number {
  const { db, nowMs, logsDir, appendTaskLog } = deps;
  const { taskId, taskTitle, agentId, departmentId, workflowPackKey, exitCode, result } = taskInfo;

  // Only extract from successful completions (or capture failure patterns)
  const logPath = path.join(logsDir, `${taskId}.log`);
  let logTail = result || "";
  if (!logTail) {
    try {
      if (fs.existsSync(logPath)) {
        const raw = fs.readFileSync(logPath, "utf8");
        logTail = raw.slice(-3000);
      }
    } catch {
      return 0;
    }
  }

  if (!logTail || logTail.length < 50) return 0;

  const now = nowMs();
  let savedCount = 0;

  // Pattern 1: Error resolution — if task failed, capture the error pattern
  if (exitCode !== 0) {
    const errorLines = logTail
      .split("\n")
      .filter((line) => /error|failed|exception|cannot|unable/i.test(line))
      .slice(0, 3);

    if (errorLines.length > 0) {
      const errorSummary = errorLines.join("\n").slice(0, 500);
      const title = `Error in: ${taskTitle.slice(0, 80)}`;

      if (!memoryTitleExists(db, title, agentId)) {
        insertAutoMemory(db, {
          title,
          content: `Task "${taskTitle}" failed (exit ${exitCode}). Key errors:\n${errorSummary}`,
          category: "knowledge",
          scope_type: agentId ? "agent" : departmentId ? "department" : "global",
          scope_id: agentId || departmentId || null,
          priority: 40,
          now,
        });
        savedCount++;
      }
    }
    return savedCount;
  }

  // Pattern 2: Successful task — extract insights from output
  // Look for structured completion markers
  const completionPatterns = [
    /(?:learned|discovered|insight|note|important):\s*(.+)/gi,
    /(?:TODO|FIXME|NOTE|HACK|WARNING):\s*(.+)/gi,
  ];

  const insights: string[] = [];
  for (const pattern of completionPatterns) {
    let match;
    while ((match = pattern.exec(logTail)) !== null) {
      const text = match[1].trim();
      if (text.length > 10 && text.length < 500) {
        insights.push(text);
      }
    }
  }

  // Pattern 3: File modification patterns — what files were changed
  const filePatterns = logTail.match(/(?:created|modified|updated|wrote)\s+(?:file\s+)?([^\s]+\.\w{1,6})/gi);
  if (filePatterns && filePatterns.length > 0) {
    const uniqueFiles = [...new Set(filePatterns.map((f) => f.replace(/^(created|modified|updated|wrote)\s+(file\s+)?/i, "").trim()))];
    if (uniqueFiles.length > 0 && uniqueFiles.length <= 10) {
      insights.push(`Files modified: ${uniqueFiles.join(", ")}`);
    }
  }

  // Save unique insights as memories
  for (const insight of insights.slice(0, 3)) {
    const title = `[Auto] ${taskTitle.slice(0, 60)}: ${insight.slice(0, 40)}`;

    if (!memoryTitleExists(db, title, agentId)) {
      insertAutoMemory(db, {
        title,
        content: `From task "${taskTitle}":\n${insight}`,
        category: "knowledge",
        scope_type: agentId ? "agent" : departmentId ? "department" : "global",
        scope_id: agentId || departmentId || null,
        priority: 30,
        now,
      });
      savedCount++;
    }
  }

  if (savedCount > 0) {
    appendTaskLog(taskId, "system", `[Memory] Auto-saved ${savedCount} learning(s) from task completion`);
  }

  return savedCount;
}

function memoryTitleExists(db: any, title: string, agentId: string | null): boolean {
  const scopeCondition = agentId
    ? "AND scope_type = 'agent' AND scope_id = ?"
    : "AND scope_type = 'global'";
  const params = agentId ? [title, agentId] : [title];
  const row = db
    .prepare(`SELECT id FROM memory_entries WHERE title = ? ${scopeCondition} LIMIT 1`)
    .get(...params);
  return !!row;
}

function insertAutoMemory(
  db: any,
  params: {
    title: string;
    content: string;
    category: string;
    scope_type: string;
    scope_id: string | null;
    priority: number;
    now: number;
  },
): void {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO memory_entries (id, title, content, category, scope_type, scope_id, priority, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(id, params.title, params.content, params.category, params.scope_type, params.scope_id, params.priority, params.now, params.now);
}
