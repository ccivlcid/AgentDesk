/**
 * Task Scheduler Engine - Cron-based Repeated Task Creation
 *
 * Runs on a 60s sweep interval. For each enabled scheduled_task whose
 * next_run_at <= now, creates a new task from the linked template,
 * optionally auto-runs it, and advances next_run_at.
 *
 * Cron format: "minute hour day-of-month month day-of-week"
 * Supports: numbers, asterisk, ranges (1-5), steps, lists (1,3,5)
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Lightweight cron expression parser
// ---------------------------------------------------------------------------

interface CronField {
  values: Set<number>;
  any: boolean;
}

function parseCronField(field: string, min: number, max: number): CronField {
  if (field === "*") return { values: new Set(), any: true };

  const values = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(\*|(\d+)-(\d+))\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[4]);
      const start = stepMatch[1] === "*" ? min : Number(stepMatch[2]);
      const end = stepMatch[1] === "*" ? max : Number(stepMatch[3]);
      for (let i = start; i <= end; i += step) values.add(i);
      continue;
    }
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const lo = Number(rangeMatch[1]);
      const hi = Number(rangeMatch[2]);
      for (let i = lo; i <= hi; i++) values.add(i);
      continue;
    }
    const num = Number(part);
    if (Number.isFinite(num) && num >= min && num <= max) {
      values.add(num);
    }
  }
  return { values, any: false };
}

interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export function parseCronExpression(expr: string): ParsedCron | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return {
    minute: parseCronField(parts[0], 0, 59),
    hour: parseCronField(parts[1], 0, 23),
    dayOfMonth: parseCronField(parts[2], 1, 31),
    month: parseCronField(parts[3], 1, 12),
    dayOfWeek: parseCronField(parts[4], 0, 6), // 0=Sunday
  };
}

function fieldMatches(field: CronField, value: number): boolean {
  return field.any || field.values.has(value);
}

function cronMatchesDate(cron: ParsedCron, date: Date): boolean {
  return (
    fieldMatches(cron.minute, date.getMinutes()) &&
    fieldMatches(cron.hour, date.getHours()) &&
    fieldMatches(cron.dayOfMonth, date.getDate()) &&
    fieldMatches(cron.month, date.getMonth() + 1) &&
    fieldMatches(cron.dayOfWeek, date.getDay())
  );
}

/**
 * Compute the next matching minute from `from` (exclusive, rounded up to next minute).
 * Scans up to 366 days ahead. Returns epoch ms or null.
 */
export function getNextCronTime(expr: string, fromMs: number): number | null {
  const cron = parseCronExpression(expr);
  if (!cron) return null;

  // Start from the next full minute
  const start = new Date(fromMs);
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const maxIterations = 366 * 24 * 60; // 1 year in minutes
  for (let i = 0; i < maxIterations; i++) {
    const candidate = new Date(start.getTime() + i * 60_000);
    if (cronMatchesDate(cron, candidate)) {
      return candidate.getTime();
    }
  }
  return null;
}

export function isValidCronExpression(expr: string): boolean {
  return parseCronExpression(expr) !== null;
}

// ---------------------------------------------------------------------------
// Human-readable cron description (bilingual)
// ---------------------------------------------------------------------------

const WEEKDAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function describeCron(expr: string, lang: "en" | "ko" = "en"): string {
  const cron = parseCronExpression(expr);
  if (!cron) return lang === "ko" ? "잘못된 표현식" : "Invalid expression";

  const parts: string[] = [];

  // Day of week
  if (!cron.dayOfWeek.any) {
    const names = lang === "ko" ? WEEKDAY_NAMES_KO : WEEKDAY_NAMES_EN;
    const days = [...cron.dayOfWeek.values].sort().map((d) => names[d]);
    parts.push(days.join(", "));
  }

  // Time
  if (!cron.hour.any && !cron.minute.any) {
    const hours = [...cron.hour.values].sort();
    const mins = [...cron.minute.values].sort();
    if (hours.length === 1 && mins.length === 1) {
      parts.push(`${String(hours[0]).padStart(2, "0")}:${String(mins[0]).padStart(2, "0")}`);
    }
  } else if (cron.hour.any && !cron.minute.any) {
    const mins = [...cron.minute.values].sort();
    parts.push(lang === "ko" ? `매시 ${mins.join(",")}분` : `every hour at :${mins.map((m) => String(m).padStart(2, "0")).join(", :")}`);
  } else if (!cron.hour.any && cron.minute.any) {
    const hours = [...cron.hour.values].sort();
    parts.push(lang === "ko" ? `${hours.join(",")}시 매분` : `every minute at ${hours.join(", ")}h`);
  }

  // Interval patterns
  const rawParts = expr.trim().split(/\s+/);
  if (rawParts[0].startsWith("*/")) {
    const interval = Number(rawParts[0].slice(2));
    parts.length = 0;
    parts.push(lang === "ko" ? `${interval}분마다` : `every ${interval} min`);
  } else if (rawParts[1].startsWith("*/")) {
    const interval = Number(rawParts[1].slice(2));
    parts.length = 0;
    parts.push(lang === "ko" ? `${interval}시간마다` : `every ${interval}h`);
  }

  if (parts.length === 0) {
    return expr; // fallback: show raw expression
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Scheduler engine
// ---------------------------------------------------------------------------

interface ScheduledTaskRow {
  id: string;
  template_id: string | null;
  name: string;
  cron_expression: string;
  timezone: string;
  enabled: number;
  auto_run: number;
  assigned_agent_id: string | null;
  project_id: string | null;
  last_run_at: number | null;
  next_run_at: number | null;
  run_count: number;
}

interface TemplateRow {
  id: string;
  name: string;
  title: string;
  description: string;
  department_id: string | null;
  task_type: string;
  priority: number;
  workflow_pack_key: string | null;
  workflow_meta_json: string | null;
}

interface TaskSchedulerDeps {
  db: any;
  nowMs: () => number;
  broadcast: (type: string, payload: unknown) => void;
  insertNotification: (params: {
    type: string;
    title: string;
    message: string;
    metadata_json?: string;
  }) => void;
  startTaskExecutionForAgent?: (agentId: string, taskId: string) => void;
}

export function startTaskScheduler(deps: TaskSchedulerDeps): { stop: () => void } {
  const { db, nowMs, broadcast, insertNotification } = deps;

  const SWEEP_INTERVAL_MS = 60_000; // check every 60 seconds

  function sweep(): void {
    const now = nowMs();

    const dueSchedules = db
      .prepare(
        "SELECT * FROM scheduled_tasks WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?",
      )
      .all(now) as ScheduledTaskRow[];

    for (const schedule of dueSchedules) {
      try {
        createTaskFromSchedule(schedule, now);
      } catch (err) {
        // Log error but don't crash the sweep
        console.error(`[TaskScheduler] Error processing schedule ${schedule.id}:`, err);
      }
    }
  }

  function createTaskFromSchedule(schedule: ScheduledTaskRow, now: number): void {
    let title = schedule.name;
    let description: string | null = null;
    let departmentId: string | null = null;
    let taskType = "general";
    let priority = 3;
    let workflowPackKey: string | null = null;
    let workflowMetaJson: string | null = null;

    // Load template if linked
    if (schedule.template_id) {
      const template = db
        .prepare("SELECT * FROM task_templates WHERE id = ?")
        .get(schedule.template_id) as TemplateRow | undefined;

      if (template) {
        title = template.title || schedule.name;
        description = template.description || null;
        departmentId = template.department_id;
        taskType = template.task_type || "general";
        priority = template.priority ?? 3;
        workflowPackKey = template.workflow_pack_key;
        workflowMetaJson = template.workflow_meta_json;
      }
    }

    // Append timestamp to title for uniqueness
    const dateStr = new Date(now).toISOString().slice(0, 16).replace("T", " ");
    const fullTitle = `${title} [${dateStr}]`;

    const taskId = randomUUID();

    // Resolve project path if project_id is set
    let projectPath: string | null = null;
    if (schedule.project_id) {
      const project = db
        .prepare("SELECT project_path FROM projects WHERE id = ?")
        .get(schedule.project_id) as { project_path: string } | undefined;
      if (project) projectPath = project.project_path;
    }

    // Create the task
    const status = schedule.auto_run && schedule.assigned_agent_id ? "inbox" : "inbox";
    db.prepare(
      `INSERT INTO tasks (id, title, description, department_id, assigned_agent_id, project_id,
        status, priority, task_type, workflow_pack_key, workflow_meta_json,
        project_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      taskId,
      fullTitle,
      description,
      departmentId,
      schedule.assigned_agent_id,
      schedule.project_id,
      status,
      priority,
      taskType,
      workflowPackKey,
      workflowMetaJson,
      projectPath,
      now,
      now,
    );

    // Update schedule: advance next_run_at, increment run_count
    const nextRunAt = getNextCronTime(schedule.cron_expression, now);
    db.prepare(
      "UPDATE scheduled_tasks SET last_run_at = ?, next_run_at = ?, run_count = run_count + 1, updated_at = ? WHERE id = ?",
    ).run(now, nextRunAt, now, schedule.id);

    // Broadcast task creation
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
    broadcast("task_update", task);

    // Notification
    insertNotification({
      type: "system",
      title: `Scheduled task created: ${fullTitle}`,
      message: `Schedule "${schedule.name}" created a new task.`,
      metadata_json: JSON.stringify({ task_id: taskId, schedule_id: schedule.id }),
    });

    // Auto-run if configured
    if (schedule.auto_run && schedule.assigned_agent_id && deps.startTaskExecutionForAgent) {
      try {
        deps.startTaskExecutionForAgent(schedule.assigned_agent_id, taskId);
      } catch {
        // Auto-run failure is non-fatal
      }
    }
  }

  const intervalId = setInterval(sweep, SWEEP_INTERVAL_MS);

  // Initial sweep after a short delay
  setTimeout(sweep, 5_000);

  return {
    stop: () => clearInterval(intervalId),
  };
}
