import { DEFAULT_WORKFLOW_PACK_KEY, WORKFLOW_PACK_KEYS, isWorkflowPackKey } from "../../../workflow/packs/definitions.ts";
import type { DbLike } from "./types.ts";
import { asObject, normalizeText, safeJsonParse } from "./json-helpers.ts";

export function ensureOfficePackScopedDepartmentSchema(db: DbLike): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS office_pack_departments (
        workflow_pack_key TEXT NOT NULL,
        department_id TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ko TEXT NOT NULL,
        name_ja TEXT NOT NULL DEFAULT '',
        name_zh TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT,
        prompt TEXT,
        sort_order INTEGER NOT NULL DEFAULT 99,
        created_at INTEGER DEFAULT (unixepoch()*1000),
        PRIMARY KEY (workflow_pack_key, department_id)
      )
    `);
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_office_pack_departments_pack_sort ON office_pack_departments(workflow_pack_key, sort_order)",
    );
  } catch {
    /* already exists */
  }

  try {
    db.exec("ALTER TABLE agents ADD COLUMN workflow_pack_key TEXT NOT NULL DEFAULT 'development'");
  } catch {
    /* already exists */
  }
  try {
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_agents_workflow_pack ON agents(workflow_pack_key, department_id, role, created_at)",
    );
  } catch {
    /* best effort */
  }

  // Seed-id based backfill for legacy rows before profile-based backfill.
  for (const packKey of WORKFLOW_PACK_KEYS) {
    if (packKey === DEFAULT_WORKFLOW_PACK_KEY) continue;
    try {
      db.prepare(
        `
          UPDATE agents
          SET workflow_pack_key = ?
          WHERE (workflow_pack_key IS NULL OR workflow_pack_key = '' OR workflow_pack_key = ?)
            AND id LIKE ?
        `,
      ).run(packKey, DEFAULT_WORKFLOW_PACK_KEY, `${packKey}-%`);
    } catch {
      // ignore
    }
  }

  const profileRow = db.prepare("SELECT value FROM settings WHERE key = 'officePackProfiles' LIMIT 1").get() as
    | { value?: unknown }
    | undefined;
  if (!profileRow) return;

  let parsedRoot: unknown = profileRow.value;
  if (typeof parsedRoot === "string") {
    parsedRoot = safeJsonParse(parsedRoot);
  }
  const root = asObject(parsedRoot);
  if (!root) return;

  const upsertPackDepartment = db.prepare(
    `
      INSERT INTO office_pack_departments (
        workflow_pack_key, department_id, name, name_ko, name_ja, name_zh,
        icon, color, description, prompt, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workflow_pack_key, department_id) DO UPDATE SET
        name = excluded.name,
        name_ko = excluded.name_ko,
        name_ja = excluded.name_ja,
        name_zh = excluded.name_zh,
        icon = excluded.icon,
        color = excluded.color,
        description = excluded.description,
        prompt = excluded.prompt,
        sort_order = excluded.sort_order
    `,
  );
  const updateAgentPack = db.prepare("UPDATE agents SET workflow_pack_key = ? WHERE id = ?");

  const now = Date.now();
  for (const [rawPackKey, rawProfile] of Object.entries(root)) {
    const packKey = normalizeText(rawPackKey);
    if (!isWorkflowPackKey(packKey) || packKey === DEFAULT_WORKFLOW_PACK_KEY) continue;
    const profile = asObject(rawProfile);
    if (!profile) continue;

    if (Array.isArray(profile.departments)) {
      for (const rawDepartment of profile.departments) {
        const department = asObject(rawDepartment);
        if (!department) continue;
        const departmentId = normalizeText(department.id);
        if (!departmentId) continue;

        const name = normalizeText(department.name) || departmentId;
        const nameKo = normalizeText(department.name_ko) || name;
        const nameJa = normalizeText(department.name_ja);
        const nameZh = normalizeText(department.name_zh);
        const icon = normalizeText(department.icon) || "🏢";
        const color = normalizeText(department.color) || "#64748b";
        const description = normalizeText(department.description) || null;
        const prompt = normalizeText(department.prompt) || null;
        const sortOrderRaw = Number(department.sort_order);
        const sortOrder = Number.isFinite(sortOrderRaw) ? Math.max(0, Math.trunc(sortOrderRaw)) : 99;
        const createdAtRaw = Number(department.created_at);
        const createdAt = Number.isFinite(createdAtRaw) ? Math.max(0, Math.trunc(createdAtRaw)) : now;

        try {
          upsertPackDepartment.run(
            packKey,
            departmentId,
            name,
            nameKo,
            nameJa,
            nameZh,
            icon,
            color,
            description,
            prompt,
            sortOrder,
            createdAt,
          );
        } catch {
          // ignore malformed profile rows
        }
      }
    }

    if (Array.isArray(profile.agents)) {
      for (const rawAgent of profile.agents) {
        const agent = asObject(rawAgent);
        if (!agent) continue;
        const agentId = normalizeText(agent.id);
        if (!agentId) continue;
        try {
          updateAgentPack.run(packKey, agentId);
        } catch {
          // ignore missing agents
        }
      }
    }
  }
}
