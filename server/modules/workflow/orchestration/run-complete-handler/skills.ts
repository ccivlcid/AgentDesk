/**
 * Extract and register skills on task completion.
 *
 * Parses explicit [SKILL SAVE] directives from agent output and records them
 * in skill_learning_history so they appear in future agent prompts.
 * Skills are saved with project scope (like rules/memory/hooks).
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { classifySkillCategory } from "../../../routes/ops/custom-skills.ts";

interface ExtractSkillsDeps {
  db: any;
  nowMs: () => number;
  logsDir: string;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
}

interface TaskForSkills {
  title: string;
  assigned_agent_id: string | null;
  department_id: string | null;
  project_id?: string | null;
}

type ValidProvider =
  | "claude" | "codex" | "gemini" | "opencode"
  | "copilot" | "antigravity" | "cursor" | "api" | "ollama";

const VALID_PROVIDERS: ValidProvider[] = [
  "claude", "codex", "gemini", "opencode", "copilot", "antigravity", "cursor", "api", "ollama",
];

function resolveProvider(db: any, agentId: string | null): ValidProvider {
  if (!agentId) return "claude";
  try {
    const row = db
      .prepare("SELECT cli_provider FROM agents WHERE id = ?")
      .get(agentId) as { cli_provider?: string | null } | undefined;
    const p = row?.cli_provider || "";
    return (VALID_PROVIDERS.includes(p as ValidProvider) ? p : "claude") as ValidProvider;
  } catch {
    return "claude";
  }
}

function skillAlreadyExists(db: any, jobId: string, provider: string): boolean {
  try {
    const row = db
      .prepare("SELECT id FROM skill_learning_history WHERE job_id = ? AND provider = ? LIMIT 1")
      .get(jobId, provider);
    return !!row;
  } catch {
    return false;
  }
}

/**
 * Parse [SKILL SAVE] directives from task output and register them in skill_learning_history.
 *
 * Format expected in agent output:
 *
 *   [SKILL SAVE]
 *   label: React Testing Library Pattern
 *   repo: @myorg/skill-react-testing
 *   skill_id: react-testing-pattern
 *   command: npx @myorg/skill-react-testing@latest
 *
 * All fields except `label` are optional; defaults will be generated if absent.
 * Skills are saved with project scope when a project_id is available,
 * matching the same scope model used by rules/memory/hooks.
 * Only runs on successful task completion.
 */
export function runExtractSkills(
  taskId: string,
  task: TaskForSkills,
  finalExitCode: number,
  result: string | null,
  deps: ExtractSkillsDeps,
): void {
  // Only extract from successful completions
  if (finalExitCode !== 0) return;

  const { db, nowMs, logsDir, appendTaskLog } = deps;
  const { assigned_agent_id: agentId, department_id: departmentId, project_id: projectId } = task;

  const logPath = path.join(logsDir, `${taskId}.log`);
  let logTail = result || "";
  if (!logTail) {
    try {
      if (fs.existsSync(logPath)) {
        logTail = fs.readFileSync(logPath, "utf8").slice(-3000);
      }
    } catch {
      return;
    }
  }

  if (!logTail || logTail.length < 20) return;

  const now = nowMs();
  const provider = resolveProvider(db, agentId);

  // Determine scope: project > agent > department > global (same as rules/memory/hooks)
  const scope_type =
    projectId ? "project"
    : agentId ? "agent"
    : departmentId ? "department"
    : "global";
  const scope_id =
    scope_type === "project" ? projectId || null
    : scope_type === "agent" ? agentId
    : scope_type === "department" ? departmentId
    : null;

  let savedCount = 0;

  // Match [SKILL SAVE] blocks — capture everything until next block or end
  const skillSaveMatches = logTail.matchAll(
    /\[SKILL SAVE\]\s*\n([\s\S]+?)(?=\n\s*\[SKILL SAVE\]|\n\s*\[(?:MEMORY|RULE) SAVE\]|$)/gi,
  );

  for (const m of skillSaveMatches) {
    const block = m[1];

    const labelMatch = block.match(/^\s*label:\s*(.+)/im);
    const repoMatch = block.match(/^\s*repo:\s*(.+)/im);
    const skillIdMatch = block.match(/^\s*skill_id:\s*(.+)/im);
    const commandMatch = block.match(/^\s*command:\s*(.+)/im);

    const label = (labelMatch?.[1] || "").trim().slice(0, 120);
    if (!label) continue;

    const skillIdRaw = (skillIdMatch?.[1] || "").trim().slice(0, 80);
    const skillId = skillIdRaw || label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
    const repo = (repoMatch?.[1] || "").trim().slice(0, 200) || `agentdesk-auto/${skillId}`;
    const command = (commandMatch?.[1] || "").trim().slice(0, 300) || `npx ${repo}@latest`;

    const jobId = `${taskId}:${skillId}`;

    if (!skillAlreadyExists(db, jobId, provider)) {
      const id = randomUUID();
      try {
        db.prepare(
          `INSERT INTO skill_learning_history
            (id, job_id, provider, repo, skill_id, skill_label, status, command, scope_type, scope_id, run_started_at, run_completed_at, created_at, updated_at, category)
           VALUES (?, ?, ?, ?, ?, ?, 'succeeded', ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(id, jobId, provider, repo, skillId, label, command, scope_type, scope_id, now, now, now, now,
          classifySkillCategory(skillId, label));
        savedCount++;
      } catch {
        /* ignore constraint violations */
      }
    }
  }

  if (savedCount > 0) {
    appendTaskLog(taskId, "system", `[Skills] Auto-registered ${savedCount} skill(s) from task completion (scope=${scope_type})`);
  }
}
