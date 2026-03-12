import type { DatabaseSync } from "node:sqlite";
import { DEFAULT_WORKFLOW_PACK_KEY, isWorkflowPackKey, type WorkflowPackKey } from "./definitions.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

export type DepartmentScopedRow = {
  id: string;
  name: string;
  name_ko: string;
  name_ja: string;
  name_zh: string;
  icon: string;
  color: string;
  description: string | null;
  prompt: string | null;
  sort_order: number;
  created_at: number;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseWorkflowPackKeyInput(value: unknown): WorkflowPackKey | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") candidate = parsed.trim();
  } catch {
    // keep raw string
  }
  return isWorkflowPackKey(candidate) ? candidate : null;
}

export function normalizeWorkflowPackKeyInput(value: unknown): WorkflowPackKey {
  return parseWorkflowPackKeyInput(value) ?? DEFAULT_WORKFLOW_PACK_KEY;
}

export function readActiveOfficeWorkflowPackKey(db: DbLike): WorkflowPackKey {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'officeWorkflowPack' LIMIT 1").get() as
    | { value?: unknown }
    | undefined;
  return normalizeWorkflowPackKeyInput(row?.value);
}

function mapBaseDepartmentRow(row: Record<string, unknown> | undefined): DepartmentScopedRow | null {
  if (!row) return null;
  const id = normalizeText(row.id);
  if (!id) return null;
  return {
    id,
    name: normalizeText(row.name) || id,
    name_ko: normalizeText(row.name_ko) || normalizeText(row.name) || id,
    name_ja: normalizeText(row.name_ja),
    name_zh: normalizeText(row.name_zh),
    icon: normalizeText(row.icon) || "🏢",
    color: normalizeText(row.color) || "#64748b",
    description: normalizeText(row.description) || null,
    prompt: normalizeText(row.prompt) || null,
    sort_order: Number.isFinite(Number(row.sort_order)) ? Math.max(0, Math.trunc(Number(row.sort_order))) : 99,
    created_at: Number.isFinite(Number(row.created_at)) ? Math.max(0, Math.trunc(Number(row.created_at))) : Date.now(),
  };
}

export function getDepartmentForPack(
  db: DbLike,
  departmentIdInput: unknown,
): DepartmentScopedRow | null {
  const departmentId = normalizeText(departmentIdInput);
  if (!departmentId) return null;

  try {
    const baseRow = db
      .prepare(
        `
          SELECT id, name, name_ko, name_ja, name_zh, icon, color, description, prompt, sort_order, created_at
          FROM departments
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(departmentId) as Record<string, unknown> | undefined;
    return mapBaseDepartmentRow(baseRow);
  } catch {
    return null;
  }
}

export function listDepartmentsForPack(db: DbLike): DepartmentScopedRow[] {
  try {
    const baseRows = db
      .prepare(
        `
          SELECT id, name, name_ko, name_ja, name_zh, icon, color, description, prompt, sort_order, created_at
          FROM departments
          ORDER BY sort_order ASC, id ASC
        `,
      )
      .all() as Record<string, unknown>[];
    return baseRows.map((row) => mapBaseDepartmentRow(row)).filter((row): row is DepartmentScopedRow => !!row);
  } catch {
    return [];
  }
}

export function getDepartmentPromptForPack(
  db: DbLike,
  departmentIdInput: unknown,
): string | null {
  return getDepartmentForPack(db, departmentIdInput)?.prompt ?? null;
}

export function getDepartmentSortOrderForPack(
  db: DbLike,
  departmentIdInput: unknown,
): number | null {
  const row = getDepartmentForPack(db, departmentIdInput);
  return row ? row.sort_order : null;
}
