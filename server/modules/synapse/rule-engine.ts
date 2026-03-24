/**
 * Synapse Rule Engine — evaluate trigger events and execute actions
 */
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";
import { castSqliteRows } from "../../lib/sqlite-row-cast.ts";

export interface SynapseTrigger {
  type: "file_change" | "page_updated";
  /** glob-style pattern or keyword — empty = match all */
  pattern?: string;
}

export interface SynapseAction {
  type: "create_task";
  /** May include {{filename}}, {{path}}, {{title}} placeholders */
  title_template: string;
  agent_id?: string;
  project_id?: string;
}

export interface SynapseRule {
  id: string;
  name: string;
  enabled: number;
  source: "obsidian" | "notion";
  trigger_json: string;
  condition_json: string;
  action_json: string;
  last_fired_at: number | null;
}

export interface TriggerEvent {
  source: "obsidian" | "notion";
  /** file path (obsidian) or page title (notion) */
  path: string;
  title?: string;
  eventType: "change" | "add" | "update";
}

function matchesPattern(pattern: string | undefined, event: TriggerEvent): boolean {
  if (!pattern || pattern.trim() === "") return true;
  const haystack = `${event.path} ${event.title ?? ""}`.toLowerCase();
  return haystack.includes(pattern.toLowerCase());
}

function applyTemplate(template: string, event: TriggerEvent): string {
  const filename = event.path.split("/").pop() ?? event.path;
  return template
    .replace(/\{\{filename\}\}/gi, filename)
    .replace(/\{\{path\}\}/gi, event.path)
    .replace(/\{\{title\}\}/gi, event.title ?? filename);
}

export function fireMatchingRules(
  db: DatabaseSync,
  event: TriggerEvent,
  broadcast: (type: string, payload: unknown) => void,
): void {
  let rows: SynapseRule[];
  try {
    rows = castSqliteRows<SynapseRule>(
      db.prepare("SELECT * FROM synapse_rules WHERE source = ? AND enabled = 1").all(event.source),
    );
  } catch (err) {
    logger.warn({ err }, "[synapse-rules] DB query failed");
    return;
  }

  for (const rule of rows) {
    let trigger: SynapseTrigger;
    let action: SynapseAction;
    try {
      trigger = JSON.parse(rule.trigger_json) as SynapseTrigger;
      action = JSON.parse(rule.action_json) as SynapseAction;
    } catch {
      continue;
    }

    if (!matchesPattern(trigger.pattern, event)) continue;

    // Rate-limit: don't fire same rule within 60 seconds for same path
    if (rule.last_fired_at && Date.now() - rule.last_fired_at < 60_000) continue;

    try {
      if (action.type === "create_task") {
        const title = applyTemplate(action.title_template, event);
        const taskId = randomUUID();
        const now = Date.now();
        db.prepare(`
          INSERT INTO tasks (id, title, status, assigned_agent_id, project_id, created_at, updated_at)
          VALUES (?, ?, 'inbox', ?, ?, ?, ?)
        `).run(taskId, title, action.agent_id ?? null, action.project_id ?? null, now, now);

        db.prepare("UPDATE synapse_rules SET last_fired_at = ? WHERE id = ?").run(now, rule.id);

        const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
        broadcast("task_update", task);

        logger.info({ ruleId: rule.id, taskId, title }, "[synapse-rules] rule fired → task created");
      }
    } catch (err) {
      logger.error({ err, ruleId: rule.id }, "[synapse-rules] action execution failed");
    }
  }
}
