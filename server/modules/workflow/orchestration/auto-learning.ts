/**
 * Auto-Learning — PM extracts Rules/Memory from completed tasks.
 * Called by PM Orchestrator when task status → done.
 * No timers. Triggered by event only.
 */

import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { loadPrompt } from "../../../lib/prompt-loader.ts";
import logger from "../../../lib/logger.ts";
import type { AgentRow } from "../core/conversation-types.ts";

interface AutoLearnDeps {
  db: DatabaseSync;
  nowMs: () => number;
  runAgentOneShot: (agent: AgentRow, prompt: string, options: { projectPath?: string; timeoutMs?: number; noTools?: boolean }) => Promise<{ text?: string | null }>;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  broadcast: (type: string, payload: unknown) => void;
  getPreferredLanguage: () => string;
  resolveProjectPath: (projectId: string) => string;
}

interface LearnedRule {
  title: string;
  content: string;
  category: string;
}

interface LearnedMemory {
  title: string;
  content: string;
  category: string;
}

export async function runAutoLearning(
  pm: AgentRow,
  taskId: string,
  projectId: string,
  deps: AutoLearnDeps,
): Promise<void> {
  const { db, nowMs, runAgentOneShot, appendTaskLog, broadcast, getPreferredLanguage, resolveProjectPath } = deps;

  try {
    const task = db.prepare(
      "SELECT title, description, result FROM tasks WHERE id = ?",
    ).get(taskId) as { title: string; description: string | null; result: string | null } | undefined;
    if (!task) return;

    const project = db.prepare(
      "SELECT name FROM projects WHERE id = ?",
    ).get(projectId) as { name: string } | undefined;

    const lang = getPreferredLanguage();
    let resultTail = "";
    if (task.result) {
      resultTail = task.result.length > 1500 ? "..." + task.result.slice(-1500) : task.result;
    }

    const prompt = loadPrompt("pm/auto-learn", {
      projectName: project?.name ?? projectId,
      taskTitle: task.title,
      taskDescription: task.description ?? "",
      taskResult: resultTail || "(no output)",
      lang,
    });

    if (!prompt) return;

    let projectPath = "";
    try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

    const response = await runAgentOneShot(pm, prompt, {
      projectPath,
      timeoutMs: 20_000,
      noTools: true,
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    let parsed: { rules?: LearnedRule[]; memories?: LearnedMemory[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      logger.debug({ taskId }, "[auto-learning] JSON parse failed");
      return;
    }

    const t = nowMs();

    // Rules → rule_entries 테이블
    const rules = (parsed.rules ?? []).slice(0, 2);
    for (const rule of rules) {
      if (!rule.title?.trim() || !rule.content?.trim()) continue;
      try {
        db.prepare(
          `INSERT INTO rule_entries (id, title, content, category, scope_type, scope_id, priority, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'project', ?, 50, 1, ?, ?)`,
        ).run(randomUUID(), rule.title.trim(), rule.content.trim(), rule.category || "general", projectId, t, t);
      } catch { /* ignore duplicates or missing table */ }
    }

    // Memories → skill_learning_history 테이블
    const memories = (parsed.memories ?? []).slice(0, 2);
    for (const mem of memories) {
      if (!mem.title?.trim() || !mem.content?.trim()) continue;
      try {
        db.prepare(
          `INSERT INTO skill_learning_history (id, task_id, agent_id, skill_key, lesson, scope_type, scope_id, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'project', ?, 'confirmed', ?, ?)`,
        ).run(randomUUID(), taskId, pm.id as string, mem.title.trim(), mem.content.trim(), projectId, t, t);
      } catch { /* ignore missing table */ }
    }

    const total = rules.length + memories.length;
    if (total > 0) {
      appendTaskLog(taskId, "pm_oversight", `Auto-learned: ${rules.length} rules, ${memories.length} memories`);
      logger.info({ taskId, rules: rules.length, memories: memories.length }, "[auto-learning] extracted");
    }
  } catch (err) {
    logger.debug({ err, taskId }, "[auto-learning] failed (best effort)");
  }
}

/**
 * Project Retrospective — PM generates a summary when all tasks complete.
 */
export async function generateProjectRetrospective(
  pm: AgentRow,
  projectId: string,
  deps: AutoLearnDeps,
): Promise<void> {
  const { db, nowMs, runAgentOneShot, broadcast, getPreferredLanguage, resolveProjectPath } = deps;

  try {
    const project = db.prepare(
      "SELECT name, core_goal FROM projects WHERE id = ?",
    ).get(projectId) as { name: string; core_goal: string } | undefined;
    if (!project) return;

    const tasks = db.prepare(
      "SELECT title, status, retry_count, completed_at, created_at FROM tasks WHERE project_id = ? ORDER BY created_at ASC",
    ).all(projectId) as { title: string; status: string; retry_count: number; completed_at: number | null; created_at: number }[];

    const totalTasks = tasks.length;
    const firstTryCount = tasks.filter((t) => t.status === "done" && (t.retry_count ?? 0) === 0).length;
    const retryCount = tasks.filter((t) => t.status === "done" && (t.retry_count ?? 0) > 0).length;
    const failedCount = tasks.filter((t) => t.status === "failed" || t.status === "inbox").length;

    const taskSummaries = tasks.map((t, i) =>
      `${i + 1}. ${t.title} — ${t.status}${(t.retry_count ?? 0) > 0 ? ` (${t.retry_count} retries)` : ""}`,
    ).join("\n");

    const lang = getPreferredLanguage();
    const prompt = loadPrompt("pm/project-retrospective", {
      projectName: project.name,
      coreGoal: project.core_goal ?? "",
      taskSummaries,
      totalTasks: String(totalTasks),
      firstTryCount: String(firstTryCount),
      retryCount: String(retryCount),
      failedCount: String(failedCount),
      lang,
    });

    if (!prompt) return;

    let projectPath = "";
    try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

    const response = await runAgentOneShot(pm, prompt, {
      projectPath,
      timeoutMs: 30_000,
      noTools: true,
    });

    const retro = response.text ?? "";
    if (!retro.trim()) return;

    // 회고 보고서를 프로젝트에 저장
    try {
      db.prepare("UPDATE projects SET directive = directive || ? WHERE id = ?")
        .run(`\n\n---\n## Project Retrospective\n${retro}`, projectId);
    } catch { /* best effort */ }

    logger.info({ projectId }, "[auto-learning] retrospective generated");
  } catch (err) {
    logger.debug({ err, projectId }, "[auto-learning] retrospective failed");
  }
}

/**
 * Agent-Task Fitness Tracking — 에이전트별 태스크 유형 성공/실패 기록.
 * 킥오프 시 에이전트 추천에 활용.
 */
export function updateAgentFitness(
  db: DatabaseSync,
  agentId: string,
  taskType: string,
  success: boolean,
  durationMs: number,
): void {
  try {
    const existing = db.prepare(
      "SELECT id, success_count, failure_count, avg_duration_ms FROM agent_task_fitness WHERE agent_id = ? AND task_type = ?",
    ).get(agentId, taskType) as { id: string; success_count: number; failure_count: number; avg_duration_ms: number } | undefined;

    if (existing) {
      const total = existing.success_count + existing.failure_count;
      const newAvg = total > 0 ? Math.round((existing.avg_duration_ms * total + durationMs) / (total + 1)) : durationMs;
      const field = success ? "success_count" : "failure_count";
      db.prepare(
        `UPDATE agent_task_fitness SET ${field} = ${field} + 1, avg_duration_ms = ?, last_updated = ? WHERE id = ?`,
      ).run(newAvg, Date.now(), existing.id);
    } else {
      db.prepare(
        "INSERT INTO agent_task_fitness (id, agent_id, task_type, success_count, failure_count, avg_duration_ms) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(randomUUID(), agentId, taskType, success ? 1 : 0, success ? 0 : 1, durationMs);
    }
  } catch {
    // agent_task_fitness 테이블 없으면 무시 (마이그레이션 전)
  }
}
