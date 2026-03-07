import type { RuntimeContext } from "../../../types/runtime-context.ts";
import { decryptSecret } from "../../../oauth/helpers.ts";

const CUSTOM_PACKS_KEY = "customOfficePacks";

interface ApiProviderRow {
  id: string;
  type: string;
  api_key_enc: string | null;
  base_url: string | null;
}

interface CustomPackInput {
  name: string;
  name_ko?: string;
  icon?: string;
  color?: string;
  description?: string;
}

interface CustomPack {
  key: string;
  name: string;
  name_ko: string;
  icon: string;
  color: string;
  description: string;
  created_at: number;
}

function safeJsonParse(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readCustomPacks(db: RuntimeContext["db"]): CustomPack[] {
  const row = db.prepare("SELECT value FROM settings WHERE key = ? LIMIT 1").get(CUSTOM_PACKS_KEY) as
    | { value?: unknown }
    | undefined;
  if (!row) return [];
  const parsed = safeJsonParse(row.value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((p): p is CustomPack => typeof p === "object" && p !== null && typeof p.key === "string");
}

function saveCustomPacks(db: RuntimeContext["db"], packs: CustomPack[]): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(CUSTOM_PACKS_KEY, JSON.stringify(packs));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "custom-pack";
}

async function callClaudeForPackGeneration(
  apiKey: string,
  name: string,
  nameKo: string,
  description: string,
): Promise<{ departments: unknown[]; agents: unknown[] }> {
  const prompt = `You are an organizational design assistant. Design a fictional company's department structure.

Company Pack:
Name: ${name}
Korean Name: ${nameKo}
Description: ${description}

Return ONLY valid JSON, no explanation:
{
  "departments": [
    {
      "id": "lowercase-slug",
      "name": "English Name",
      "name_ko": "한국어 이름",
      "icon": "single emoji",
      "color": "#hexcolor",
      "description": "1 sentence role description",
      "prompt": "System prompt for agents in this department (2-3 sentences)"
    }
  ],
  "agents": [
    {
      "name": "Full Name",
      "name_ko": "이름",
      "department_id": "matching-department-id",
      "role": "leader",
      "avatar_emoji": "single emoji",
      "personality": "brief personality description"
    }
  ]
}

Requirements:
- 4-6 departments relevant to the pack's theme
- 1-2 agents per department (first agent role="leader", others role="member")
- Department IDs: unique lowercase slugs matching the theme
- Colors: visually distinct hex colors
- Korean names should be natural Korean
- All agent department_ids must match a department id`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(40_000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Anthropic API error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await resp.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");

  const parsed = JSON.parse(jsonMatch[0]) as { departments?: unknown[]; agents?: unknown[] };
  if (!Array.isArray(parsed.departments) || !Array.isArray(parsed.agents)) {
    throw new Error("Invalid AI response structure");
  }
  return { departments: parsed.departments, agents: parsed.agents };
}

export function registerOfficePackRoutes(ctx: RuntimeContext): void {
  const { app, db, nowMs } = ctx;

  // GET /api/custom-packs
  app.get("/api/custom-packs", (_req, res) => {
    try {
      res.json({ ok: true, packs: readCustomPacks(db) });
    } catch (err: unknown) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // POST /api/custom-packs
  app.post("/api/custom-packs", (req, res) => {
    const body = req.body as CustomPackInput & { key?: string };
    const name = String(body.name ?? "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "name_required" });

    const packs = readCustomPacks(db);

    let key = String(body.key ?? "").trim() || slugify(name);
    // Ensure key uniqueness
    const existingKeys = new Set(packs.map((p) => p.key));
    let suffix = 2;
    const baseKey = key;
    while (existingKeys.has(key)) {
      key = `${baseKey}-${suffix++}`;
    }

    const newPack: CustomPack = {
      key,
      name,
      name_ko: String(body.name_ko ?? name).trim() || name,
      icon: String(body.icon ?? "🏢").trim() || "🏢",
      color: String(body.color ?? "#6366f1").trim() || "#6366f1",
      description: String(body.description ?? "").trim(),
      created_at: nowMs(),
    };

    packs.push(newPack);
    saveCustomPacks(db, packs);
    res.json({ ok: true, pack: newPack });
  });

  // PUT /api/custom-packs/:key
  app.put("/api/custom-packs/:key", (req, res) => {
    const packKey = String(req.params.key ?? "");
    const body = req.body as Partial<CustomPackInput>;
    const packs = readCustomPacks(db);
    const idx = packs.findIndex((p) => p.key === packKey);
    if (idx === -1) return res.status(404).json({ ok: false, error: "not_found" });

    const updated: CustomPack = {
      ...packs[idx],
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.name_ko != null ? { name_ko: String(body.name_ko).trim() } : {}),
      ...(body.icon != null ? { icon: String(body.icon).trim() } : {}),
      ...(body.color != null ? { color: String(body.color).trim() } : {}),
      ...(body.description != null ? { description: String(body.description).trim() } : {}),
    };
    packs[idx] = updated;
    saveCustomPacks(db, packs);
    res.json({ ok: true, pack: updated });
  });

  // DELETE /api/custom-packs/:key
  app.delete("/api/custom-packs/:key", (req, res) => {
    const packKey = String(req.params.key ?? "");
    const packs = readCustomPacks(db);
    const filtered = packs.filter((p) => p.key !== packKey);
    if (filtered.length === packs.length) return res.status(404).json({ ok: false, error: "not_found" });
    saveCustomPacks(db, filtered);

    // Also remove the pack profile from officePackProfiles if present
    try {
      const profilesRow = db.prepare("SELECT value FROM settings WHERE key = 'officePackProfiles' LIMIT 1").get() as
        | { value?: unknown }
        | undefined;
      if (profilesRow) {
        const profiles = safeJsonParse(profilesRow.value);
        if (profiles && typeof profiles === "object" && !Array.isArray(profiles)) {
          const next = { ...(profiles as Record<string, unknown>) };
          delete next[packKey];
          db.prepare(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          ).run("officePackProfiles", JSON.stringify(next));
        }
      }
    } catch {
      // best-effort cleanup
    }

    res.json({ ok: true });
  });

  // POST /api/custom-packs/ai-generate
  app.post("/api/custom-packs/ai-generate", async (req, res) => {
    const body = req.body as { name?: string; name_ko?: string; description?: string };
    const name = String(body.name ?? "").trim();
    const nameKo = String(body.name_ko ?? name).trim();
    const description = String(body.description ?? "").trim();

    if (!name) return res.status(400).json({ ok: false, error: "name_required" });

    // Find a Claude API provider with a key
    const claudeRow = db
      .prepare("SELECT id, type, api_key_enc, base_url FROM api_providers WHERE type = 'claude' AND api_key_enc IS NOT NULL ORDER BY created_at ASC LIMIT 1")
      .get() as ApiProviderRow | undefined;

    if (!claudeRow?.api_key_enc) {
      return res.status(422).json({
        ok: false,
        error: "no_api_key",
        message: "Claude API key not configured. Add a Claude provider in API settings first.",
      });
    }

    const apiKey = decryptSecret(claudeRow.api_key_enc);
    if (!apiKey) {
      return res.status(422).json({ ok: false, error: "no_api_key", message: "Claude API key is empty." });
    }

    try {
      const result = await callClaudeForPackGeneration(apiKey, name, nameKo, description);
      res.json({ ok: true, departments: result.departments, agents: result.agents });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: "ai_generation_failed", message });
    }
  });
}
