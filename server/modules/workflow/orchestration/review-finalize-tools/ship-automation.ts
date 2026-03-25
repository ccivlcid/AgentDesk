/**
 * Ship Automation — version bump + CHANGELOG entry on task completion.
 *
 * Called from finalizeApprovedReview after a task is marked done.
 * Bumps the project's semver patch version, inserts a changelog row,
 * logs to PM Activity, and syncs VERSION / package.json / CHANGELOG.md
 * to disk when the project has a project_path.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, isAbsolute, normalize, resolve } from "node:path";
import { homedir } from "node:os";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../../../lib/logger.ts";

function resolveHomePath(p: string): string {
  let candidate = p;
  if (candidate === "~") {
    candidate = homedir();
  } else if (candidate.startsWith("~/")) {
    candidate = join(homedir(), candidate.slice(2));
  } else if (candidate === "/Projects" || candidate.startsWith("/Projects/")) {
    const suffix = candidate.slice("/Projects".length).replace(/^\/+/, "");
    candidate = suffix ? join(homedir(), "Projects", suffix) : join(homedir(), "Projects");
  } else if (candidate === "/projects" || candidate.startsWith("/projects/")) {
    const suffix = candidate.slice("/projects".length).replace(/^\/+/, "");
    candidate = suffix ? join(homedir(), "projects", suffix) : join(homedir(), "projects");
  }
  const absolute = isAbsolute(candidate) ? candidate : resolve(process.cwd(), candidate);
  return normalize(absolute);
}

type Lang = "ko" | "en" | "ja" | "zh";

interface ShipAutomationParams {
  db: DatabaseSync;
  projectId: string;
  taskId: string;
  taskTitle: string;
  taskType?: string;
  taskDescription?: string | null;
  taskResult?: string | null;
  agentName?: string | null;
  projectPath: string | null;
  nowMs: number;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  broadcast: (type: string, payload: unknown) => void;
  insertNotification?: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string | void;
}

/** Bump semver patch: "0.1.2" -> "0.1.3" */
function bumpPatch(version: string): string {
  const parts = version.split(".");
  if (parts.length !== 3) return "0.1.1";
  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  const patch = (parseInt(parts[2], 10) || 0) + 1;
  return `${major}.${minor}.${patch}`;
}

/** Map task_type to changelog entry_type */
function resolveEntryType(taskType?: string): string {
  if (!taskType) return "feature";
  const t = taskType.toLowerCase();
  if (t === "bug" || t === "bugfix" || t === "fix") return "fix";
  if (t === "refactor") return "refactor";
  if (t === "docs" || t === "documentation") return "docs";
  return "feature";
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const ENTRY_TYPE_HEADING: Record<string, string> = {
  feature: "Features",
  fix: "Fixes",
  refactor: "Refactoring",
  docs: "Documentation",
};

function readLang(db: DatabaseSync): Lang {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'language'").get() as { value: string } | undefined;
  if (!row) return "en";
  try {
    const v = JSON.parse(row.value);
    return (typeof v === "string" && ["ko", "en", "ja", "zh"].includes(v)) ? v as Lang : "en";
  } catch { return "en"; }
}

export function shipAutomation(params: ShipAutomationParams): void {
  const { db, projectId, taskId, taskTitle, taskType, taskDescription, taskResult, agentName, projectPath, nowMs, appendTaskLog, broadcast, insertNotification } = params;

  try {
    // 1. Read current version
    const projectRow = db
      .prepare("SELECT current_version, project_path FROM projects WHERE id = ?")
      .get(projectId) as { current_version: string | null; project_path: string | null } | undefined;

    const currentVersion = projectRow?.current_version || "0.1.0";
    const newVersion = bumpPatch(currentVersion);
    const rawPath = projectPath || projectRow?.project_path || null;
    const resolvedProjectPath = rawPath ? resolveHomePath(rawPath) : null;

    // 2. Update projects.current_version
    db.prepare("UPDATE projects SET current_version = ?, updated_at = ? WHERE id = ?").run(newVersion, nowMs, projectId);

    // 3. Insert changelog entry
    const entryId = randomUUID();
    const entryType = resolveEntryType(taskType);
    db.prepare(
      `INSERT INTO project_changelog_entries (id, project_id, version, task_id, entry_type, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(entryId, projectId, newVersion, taskId, entryType, taskTitle, nowMs);

    // 4. Log to PM Activity
    appendTaskLog(taskId, "pm_oversight", `v${newVersion} released`);

    // 5. Notification for version bump
    insertNotification?.({
      type: "version_released",
      title: `v${newVersion} — ${taskTitle}`,
      body: `${resolveEntryType(taskType)} version bump`,
      task_id: taskId,
    });

    // 6. Sync version files if project has a path (progress.md는 PM 에이전트가 LLM으로 작성)
    if (resolvedProjectPath && existsSync(resolvedProjectPath)) {
      syncVersionFiles(resolvedProjectPath, newVersion, entryType, taskTitle, taskId, nowMs);
    } else {
      logger.warn({ projectId, resolvedProjectPath }, "[ship-automation] project_path missing or not found — skipped file sync");
    }

    logger.info({ projectId, taskId, version: newVersion }, "[ship-automation] version bumped");
  } catch (err) {
    logger.error({ err, projectId, taskId }, "[ship-automation] failed — continuing without version bump");
    appendTaskLog(taskId, "system", `Ship automation failed: ${err}`);
  }
}

function syncVersionFiles(
  projectPath: string,
  version: string,
  entryType: string,
  summary: string,
  taskId: string,
  nowMs: number,
): void {
  // Write VERSION file
  try {
    writeFileSync(join(projectPath, "VERSION"), version + "\n", "utf-8");
  } catch {
    /* best effort */
  }

  // Update package.json version field if it exists
  try {
    const pkgPath = join(projectPath, "package.json");
    if (existsSync(pkgPath)) {
      const raw = readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      pkg.version = version;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    }
  } catch {
    /* best effort */
  }

  // Append to CHANGELOG.md
  try {
    const changelogPath = join(projectPath, "CHANGELOG.md");
    const heading = ENTRY_TYPE_HEADING[entryType] || "Changes";
    const dateStr = formatDate(nowMs);
    const newEntry = `\n## [${version}] - ${dateStr}\n### ${heading}\n- ${summary} (#${taskId.slice(0, 8)})\n`;

    if (existsSync(changelogPath)) {
      const existing = readFileSync(changelogPath, "utf-8");
      // Insert after the first line (title) or at the top
      const titleEnd = existing.indexOf("\n");
      if (titleEnd > 0) {
        const updated = existing.slice(0, titleEnd + 1) + newEntry + existing.slice(titleEnd + 1);
        writeFileSync(changelogPath, updated, "utf-8");
      } else {
        writeFileSync(changelogPath, existing + newEntry, "utf-8");
      }
    } else {
      writeFileSync(changelogPath, `# Changelog\n${newEntry}`, "utf-8");
    }
  } catch {
    /* best effort */
  }
}

const PROGRESS_LABELS: Record<Lang, { completed: string; agent: string; status: string; result: string }> = {
  ko: { completed: "완료", agent: "에이전트", status: "상태", result: "결과" },
  en: { completed: "Completed", agent: "Agent", status: "Status", result: "Result" },
  ja: { completed: "完了", agent: "エージェント", status: "ステータス", result: "結果" },
  zh: { completed: "完成", agent: "代理", status: "状态", result: "结果" },
};

function syncProgressMd(
  projectPath: string,
  version: string,
  taskTitle: string,
  taskDescription: string | null,
  taskResult: string | null,
  agentName: string | null,
  nowMs: number,
  lang: Lang,
): void {
  try {
    const progressDir = join(projectPath, "docs");
    const progressPath = join(progressDir, "progress.md");
    const labels = PROGRESS_LABELS[lang] || PROGRESS_LABELS.en;
    const dateStr = formatDateTime(nowMs);
    const truncatedResult = taskResult ? taskResult.slice(-500) : "";

    const newEntry = [
      `\n## v${version} — ${taskTitle}`,
      "",
      `> ${labels.completed}: ${dateStr}`,
      agentName ? `> ${labels.agent}: ${agentName}` : null,
      `> ${labels.status}: Done`,
      "",
      taskDescription || "",
      "",
      `### ${labels.result}`,
      truncatedResult,
      "",
      "---",
      "",
    ].filter((line) => line !== null).join("\n");

    if (existsSync(progressPath)) {
      const existing = readFileSync(progressPath, "utf-8");
      // Insert after the first line (title) so newest is at the top
      const titleEnd = existing.indexOf("\n");
      if (titleEnd > 0) {
        const updated = existing.slice(0, titleEnd + 1) + newEntry + existing.slice(titleEnd + 1);
        writeFileSync(progressPath, updated, "utf-8");
      } else {
        writeFileSync(progressPath, existing + "\n" + newEntry, "utf-8");
      }
    } else {
      // Create docs/ directory if it doesn't exist
      if (!existsSync(progressDir)) {
        mkdirSync(progressDir, { recursive: true });
      }
      writeFileSync(progressPath, `# Progress\n${newEntry}`, "utf-8");
    }

    logger.info({ projectPath, version }, "[ship-automation] progress.md updated");
  } catch (err) {
    logger.warn({ err, projectPath }, "[ship-automation] progress.md update failed — continuing");
  }
}

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
