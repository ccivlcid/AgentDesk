/**
 * Ship Automation — version bump + CHANGELOG entry on task completion.
 *
 * Called from finalizeApprovedReview after a task is marked done.
 * Bumps the project's semver patch version, inserts a changelog row,
 * logs to PM Activity, and syncs VERSION / package.json / CHANGELOG.md
 * to disk when the project has a project_path.
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../../../lib/logger.ts";

interface ShipAutomationParams {
  db: DatabaseSync;
  projectId: string;
  taskId: string;
  taskTitle: string;
  taskType?: string;
  projectPath: string | null;
  nowMs: number;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  broadcast: (type: string, payload: unknown) => void;
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

export function shipAutomation(params: ShipAutomationParams): void {
  const { db, projectId, taskId, taskTitle, taskType, projectPath, nowMs, appendTaskLog, broadcast } = params;

  try {
    // 1. Read current version
    const projectRow = db
      .prepare("SELECT current_version, project_path FROM projects WHERE id = ?")
      .get(projectId) as { current_version: string | null; project_path: string | null } | undefined;

    const currentVersion = projectRow?.current_version || "0.1.0";
    const newVersion = bumpPatch(currentVersion);
    const resolvedProjectPath = projectPath || projectRow?.project_path || null;

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

    // 5. Broadcast pm_activity event
    broadcast("pm_activity", {
      projectId,
      type: "version_released",
      version: newVersion,
      taskId,
      taskTitle,
      timestamp: nowMs,
    });

    // 6. Sync to files if project has a path
    if (resolvedProjectPath) {
      syncVersionFiles(resolvedProjectPath, newVersion, entryType, taskTitle, taskId, nowMs);
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
