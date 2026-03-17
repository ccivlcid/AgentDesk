/**
 * Synapse — REST API routes
 * Phase 1+2+3: Notion + Obsidian read/write, NotebookLM snapshots, automation rules
 */
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Express, Request, Response } from "express";

interface SynapseRuleRow {
  id: string;
  name: string;
  enabled: number;
  source: string;
  trigger_json: string;
  condition_json: string;
  action_json: string;
  last_fired_at: number | null;
  created_at: number;
  updated_at: number;
}
import logger from "../../../lib/logger.ts";
import {
  getNotionWorkspaceInfo,
  searchNotionPages,
  getNotionPageContent,
  createNotionPage,
} from "../../synapse/notion-client.ts";
import {
  validateVaultPath,
  listVaultFiles,
  searchVaultFiles,
  readVaultFile,
  writeVaultFile,
  pingObsidianRestApi,
  listFilesRestApi,
} from "../../synapse/obsidian-client.ts";
import { fetchKbContextBlock } from "../../synapse/context-fetcher.ts";
import type { KbSourceRef } from "../../synapse/context-fetcher.ts";

interface Deps { app: Express; db: DatabaseSync }

interface SynapseConnection {
  platform: string;
  status: string;
  config_json: string | null;
}

function getConnection(db: DatabaseSync, platform: string): SynapseConnection | null {
  const row = db.prepare("SELECT * FROM synapse_connections WHERE platform = ?").get(platform) as unknown as SynapseConnection | undefined;
  return row ?? null;
}

function upsertConnection(db: DatabaseSync, platform: string, status: string, config: unknown): void {
  db.prepare(`
    INSERT INTO synapse_connections (platform, status, config_json, updated_at)
    VALUES (?, ?, ?, unixepoch()*1000)
    ON CONFLICT(platform) DO UPDATE SET status = excluded.status, config_json = excluded.config_json, updated_at = excluded.updated_at
  `).run(platform, status, JSON.stringify(config));
}

export function registerSynapseRoutes({ app, db }: Deps): void {

  // ─── Connections ──────────────────────────────────────────────────────────

  /** GET /api/synapse/connections */
  app.get("/api/synapse/connections", (_req: Request, res: Response) => {
    try {
      const rows = db.prepare("SELECT platform, status, config_json FROM synapse_connections").all() as unknown as SynapseConnection[];
      const result: Record<string, { status: string; config: unknown }> = {};
      for (const row of rows) {
        const cfg = row.config_json ? (JSON.parse(row.config_json) as unknown) : null;
        // strip secret fields before sending to client
        if (cfg && typeof cfg === "object") {
          const safe = { ...(cfg as Record<string, unknown>) };
          delete safe.token;
          delete safe.api_key;
          result[row.platform] = { status: row.status, config: safe };
        } else {
          result[row.platform] = { status: row.status, config: null };
        }
      }
      res.json({ ok: true, connections: result });
    } catch (err) {
      logger.error({ err }, "[synapse] connections error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** DELETE /api/synapse/connections/:platform */
  app.delete("/api/synapse/connections/:platform", (req: Request, res: Response) => {
    const { platform } = req.params as { platform: string };
    db.prepare("DELETE FROM synapse_connections WHERE platform = ?").run(platform);
    res.json({ ok: true });
  });

  // ─── Notion ───────────────────────────────────────────────────────────────

  /** POST /api/synapse/notion/connect — save token + verify */
  app.post("/api/synapse/notion/connect", async (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ ok: false, error: "token required" });
    try {
      const info = await getNotionWorkspaceInfo(token);
      upsertConnection(db, "notion", "connected", {
        token,
        workspace_name: info.workspace_name,
        workspace_icon: info.workspace_icon,
        bot_id: info.bot_id,
      });
      res.json({ ok: true, workspace_name: info.workspace_name, bot_id: info.bot_id });
    } catch (err) {
      logger.warn({ err }, "[synapse] notion connect failed");
      res.status(400).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/synapse/notion/info — workspace info (no secret) */
  app.get("/api/synapse/notion/info", (req: Request, res: Response) => {
    try {
      const conn = getConnection(db, "notion");
      if (!conn || conn.status !== "connected") return res.json({ ok: false, connected: false });
      const cfg = conn.config_json ? (JSON.parse(conn.config_json) as Record<string, unknown>) : {};
      res.json({
        ok: true,
        connected: true,
        workspace_name: cfg.workspace_name ?? "Notion Workspace",
        workspace_icon: cfg.workspace_icon ?? null,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/synapse/notion/pages?q= */
  app.get("/api/synapse/notion/pages", async (req: Request, res: Response) => {
    const q = (req.query.q as string) ?? "";
    try {
      const conn = getConnection(db, "notion");
      if (!conn || conn.status !== "connected") return res.status(400).json({ ok: false, error: "Notion not connected" });
      const cfg = JSON.parse(conn.config_json ?? "{}") as Record<string, unknown>;
      const token = cfg.token as string;
      const pages = await searchNotionPages(token, q);
      res.json({ ok: true, pages });
    } catch (err) {
      logger.error({ err }, "[synapse] notion pages error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/synapse/notion/page/:id/content */
  app.get("/api/synapse/notion/page/:id/content", async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    try {
      const conn = getConnection(db, "notion");
      if (!conn || conn.status !== "connected") return res.status(400).json({ ok: false, error: "Notion not connected" });
      const cfg = JSON.parse(conn.config_json ?? "{}") as Record<string, unknown>;
      const content = await getNotionPageContent(cfg.token as string, id);
      res.json({ ok: true, content });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── Obsidian ─────────────────────────────────────────────────────────────

  /** POST /api/synapse/obsidian/validate — check vault path */
  app.post("/api/synapse/obsidian/validate", (req: Request, res: Response) => {
    const { vault_path } = req.body as { vault_path?: string };
    if (!vault_path) return res.status(400).json({ ok: false, error: "vault_path required" });
    const result = validateVaultPath(vault_path);
    res.json({ ok: result.ok, noteCount: result.noteCount, lastModified: result.lastModified });
  });

  /** POST /api/synapse/obsidian/connect — save config */
  app.post("/api/synapse/obsidian/connect", (req: Request, res: Response) => {
    const { mode, vault_path, rest_host, rest_port, api_key } = req.body as {
      mode?: "local" | "rest";
      vault_path?: string;
      rest_host?: string;
      rest_port?: number;
      api_key?: string;
    };
    try {
      if (mode === "local") {
        if (!vault_path) return res.status(400).json({ ok: false, error: "vault_path required" });
        const info = validateVaultPath(vault_path);
        if (!info.ok) return res.status(400).json({ ok: false, error: "Vault path not found or not readable" });
        upsertConnection(db, "obsidian", "connected", { mode: "local", vault_path, noteCount: info.noteCount });
        res.json({ ok: true, noteCount: info.noteCount });
      } else {
        // rest mode — just save; actual ping done separately
        upsertConnection(db, "obsidian", "connected", {
          mode: "rest",
          rest_host: rest_host ?? "localhost",
          rest_port: rest_port ?? 27123,
          api_key,
        });
        res.json({ ok: true });
      }
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** POST /api/synapse/obsidian/ping-rest — test REST API plugin */
  app.post("/api/synapse/obsidian/ping-rest", async (req: Request, res: Response) => {
    const { host, port, api_key } = req.body as { host?: string; port?: number; api_key?: string };
    const result = await pingObsidianRestApi(host ?? "localhost", port ?? 27123, api_key ?? "");
    res.json(result);
  });

  /** GET /api/synapse/obsidian/info */
  app.get("/api/synapse/obsidian/info", (req: Request, res: Response) => {
    try {
      const conn = getConnection(db, "obsidian");
      if (!conn || conn.status !== "connected") return res.json({ ok: false, connected: false });
      const cfg = conn.config_json ? (JSON.parse(conn.config_json) as Record<string, unknown>) : {};
      res.json({ ok: true, connected: true, mode: cfg.mode, vault_path: cfg.vault_path, noteCount: cfg.noteCount });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/synapse/obsidian/files?q= */
  app.get("/api/synapse/obsidian/files", async (req: Request, res: Response) => {
    const q = (req.query.q as string) ?? "";
    try {
      const conn = getConnection(db, "obsidian");
      if (!conn || conn.status !== "connected") return res.status(400).json({ ok: false, error: "Obsidian not connected" });
      const cfg = JSON.parse(conn.config_json ?? "{}") as Record<string, unknown>;

      let files;
      if (cfg.mode === "rest") {
        files = await listFilesRestApi(
          (cfg.rest_host as string) ?? "localhost",
          (cfg.rest_port as number) ?? 27123,
          (cfg.api_key as string) ?? "",
        );
        if (q) files = files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) || f.path.toLowerCase().includes(q.toLowerCase()));
      } else {
        files = q
          ? searchVaultFiles(cfg.vault_path as string, q)
          : listVaultFiles(cfg.vault_path as string);
      }
      res.json({ ok: true, files });
    } catch (err) {
      logger.error({ err }, "[synapse] obsidian files error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/synapse/obsidian/file?path= — read file content */
  app.get("/api/synapse/obsidian/file", (req: Request, res: Response) => {
    const filePath = (req.query.path as string) ?? "";
    if (!filePath) return res.status(400).json({ ok: false, error: "path required" });
    try {
      const conn = getConnection(db, "obsidian");
      if (!conn || conn.status !== "connected") return res.status(400).json({ ok: false, error: "Obsidian not connected" });
      const cfg = JSON.parse(conn.config_json ?? "{}") as Record<string, unknown>;
      if (cfg.mode === "rest") return res.status(400).json({ ok: false, error: "Use REST API plugin for file read" });
      const content = readVaultFile(cfg.vault_path as string, filePath);
      res.json({ ok: true, content });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── Export (Phase 2) ─────────────────────────────────────────────────────

  /** POST /api/synapse/export/notion — deliverable → Notion page */
  app.post("/api/synapse/export/notion", async (req: Request, res: Response) => {
    const { title, content, parent_page_id } = req.body as {
      title?: string;
      content?: string;
      parent_page_id?: string;
    };
    if (!title || !content) return res.status(400).json({ ok: false, error: "title and content required" });
    try {
      const conn = getConnection(db, "notion");
      if (!conn || conn.status !== "connected") return res.status(400).json({ ok: false, error: "Notion not connected" });
      const cfg = JSON.parse(conn.config_json ?? "{}") as Record<string, unknown>;
      if (!parent_page_id) return res.status(400).json({ ok: false, error: "parent_page_id required" });
      const result = await createNotionPage(cfg.token as string, parent_page_id, title, content);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error({ err }, "[synapse] export to notion error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** POST /api/synapse/export/obsidian — deliverable → Obsidian .md file */
  app.post("/api/synapse/export/obsidian", (req: Request, res: Response) => {
    const { title, content, folder } = req.body as {
      title?: string;
      content?: string;
      folder?: string;
    };
    if (!title || !content) return res.status(400).json({ ok: false, error: "title and content required" });
    try {
      const conn = getConnection(db, "obsidian");
      if (!conn || conn.status !== "connected") return res.status(400).json({ ok: false, error: "Obsidian not connected" });
      const cfg = JSON.parse(conn.config_json ?? "{}") as Record<string, unknown>;
      if (cfg.mode !== "local") return res.status(400).json({ ok: false, error: "Local filesystem mode required for export" });
      const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
      const filePath = folder ? `${folder}/${safeTitle}.md` : `AgentDesk-Output/${safeTitle}.md`;
      writeVaultFile(cfg.vault_path as string, filePath, content);
      res.json({ ok: true, path: filePath });
    } catch (err) {
      logger.error({ err }, "[synapse] export to obsidian error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── Figma ────────────────────────────────────────────────────────────────

  /** POST /api/synapse/figma/connect — save Personal Access Token + verify */
  app.post("/api/synapse/figma/connect", async (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ ok: false, error: "token required" });
    try {
      const verifyRes = await fetch("https://api.figma.com/v1/me", {
        headers: { "X-Figma-Token": token, Accept: "application/json" },
      });
      if (!verifyRes.ok) {
        return res.status(400).json({ ok: false, error: "Invalid Figma token" });
      }
      const me = await verifyRes.json() as { email?: string; handle?: string };
      upsertConnection(db, "figma", "connected", {
        token,
        handle: me.handle ?? "",
        email: me.email ?? "",
      });
      res.json({ ok: true, handle: me.handle ?? "", email: me.email ?? "" });
    } catch (err) {
      logger.warn({ err }, "[synapse] figma connect failed");
      res.status(400).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/synapse/figma/info */
  app.get("/api/synapse/figma/info", (req: Request, res: Response) => {
    try {
      const conn = getConnection(db, "figma");
      if (!conn || conn.status !== "connected") return res.json({ ok: false, connected: false });
      const cfg = conn.config_json ? (JSON.parse(conn.config_json) as Record<string, unknown>) : {};
      res.json({
        ok: true,
        connected: true,
        handle: cfg.handle ?? "",
        email: cfg.email ?? "",
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── NotebookLM Snapshots ─────────────────────────────────────────────────

  /** GET /api/synapse/notebooklm/snapshots */
  app.get("/api/synapse/notebooklm/snapshots", (_req: Request, res: Response) => {
    try {
      const rows = db.prepare("SELECT id, name, source, created_at FROM synapse_snapshots ORDER BY created_at DESC").all() as unknown as Array<{
        id: string; name: string; source: string | null; created_at: number;
      }>;
      res.json({ ok: true, snapshots: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** POST /api/synapse/notebooklm/snapshots */
  app.post("/api/synapse/notebooklm/snapshots", (req: Request, res: Response) => {
    const { name, content, source } = req.body as { name?: string; content?: string; source?: string };
    if (!name || !content) return res.status(400).json({ ok: false, error: "name and content required" });
    try {
      const id = randomUUID();
      db.prepare("INSERT INTO synapse_snapshots (id, name, content, source) VALUES (?, ?, ?, ?)").run(id, name, content, source ?? null);
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** DELETE /api/synapse/notebooklm/snapshots/:id */
  app.delete("/api/synapse/notebooklm/snapshots/:id", (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    db.prepare("DELETE FROM synapse_snapshots WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  // ─── Context Fetcher (Phase 4) ────────────────────────────────────────────

  /** POST /api/synapse/context — fetch and assemble KB content for given sources */
  app.post("/api/synapse/context", async (req: Request, res: Response) => {
    const { sources } = req.body as { sources?: KbSourceRef[] };
    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({ ok: false, error: "sources array required" });
    }
    try {
      const content = await fetchKbContextBlock(db, sources);
      res.json({ ok: true, content });
    } catch (err) {
      logger.error({ err }, "[synapse] context fetch error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── Automation Rules (Phase 3) ────────────────────────────────────────────

  /** GET /api/synapse/rules */
  app.get("/api/synapse/rules", (_req: Request, res: Response) => {
    try {
      const rows = db.prepare("SELECT * FROM synapse_rules ORDER BY created_at DESC").all() as unknown as SynapseRuleRow[];
      const rules = rows.map((r) => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled === 1,
        source: r.source,
        trigger: JSON.parse(r.trigger_json) as unknown,
        condition: JSON.parse(r.condition_json) as unknown,
        action: JSON.parse(r.action_json) as unknown,
        last_fired_at: r.last_fired_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
      res.json({ ok: true, rules });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** POST /api/synapse/rules */
  app.post("/api/synapse/rules", (req: Request, res: Response) => {
    const { name, source, trigger, condition, action, enabled } = req.body as {
      name?: string;
      source?: string;
      trigger?: unknown;
      condition?: unknown;
      action?: unknown;
      enabled?: boolean;
    };
    if (!name || !source || !trigger || !action) {
      return res.status(400).json({ ok: false, error: "name, source, trigger, action required" });
    }
    try {
      const id = randomUUID();
      const now = Date.now();
      db.prepare(`
        INSERT INTO synapse_rules (id, name, enabled, source, trigger_json, condition_json, action_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, name,
        enabled !== false ? 1 : 0,
        source,
        JSON.stringify(trigger),
        JSON.stringify(condition ?? {}),
        JSON.stringify(action),
        now, now,
      );
      const rule = db.prepare("SELECT * FROM synapse_rules WHERE id = ?").get(id) as unknown as SynapseRuleRow;
      res.json({ ok: true, rule: { ...rule, trigger: JSON.parse(rule.trigger_json), condition: JSON.parse(rule.condition_json), action: JSON.parse(rule.action_json), enabled: rule.enabled === 1 } });
    } catch (err) {
      logger.error({ err }, "[synapse] create rule error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** PUT /api/synapse/rules/:id */
  app.put("/api/synapse/rules/:id", (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { name, source, trigger, condition, action, enabled } = req.body as {
      name?: string;
      source?: string;
      trigger?: unknown;
      condition?: unknown;
      action?: unknown;
      enabled?: boolean;
    };
    try {
      const existing = db.prepare("SELECT id FROM synapse_rules WHERE id = ?").get(id);
      if (!existing) return res.status(404).json({ ok: false, error: "Rule not found" });
      const now = Date.now();
      const fields: string[] = ["updated_at = ?"];
      const params: unknown[] = [now];
      if (name !== undefined) { fields.push("name = ?"); params.push(name); }
      if (source !== undefined) { fields.push("source = ?"); params.push(source); }
      if (trigger !== undefined) { fields.push("trigger_json = ?"); params.push(JSON.stringify(trigger)); }
      if (condition !== undefined) { fields.push("condition_json = ?"); params.push(JSON.stringify(condition)); }
      if (action !== undefined) { fields.push("action_json = ?"); params.push(JSON.stringify(action)); }
      if (enabled !== undefined) { fields.push("enabled = ?"); params.push(enabled ? 1 : 0); }
      params.push(id);
      db.prepare(`UPDATE synapse_rules SET ${fields.join(", ")} WHERE id = ?`).run(...(params as never[]));
      const rule = db.prepare("SELECT * FROM synapse_rules WHERE id = ?").get(id) as unknown as SynapseRuleRow;
      res.json({ ok: true, rule: { ...rule, trigger: JSON.parse(rule.trigger_json), condition: JSON.parse(rule.condition_json), action: JSON.parse(rule.action_json), enabled: rule.enabled === 1 } });
    } catch (err) {
      logger.error({ err }, "[synapse] update rule error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** DELETE /api/synapse/rules/:id */
  app.delete("/api/synapse/rules/:id", (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    db.prepare("DELETE FROM synapse_rules WHERE id = ?").run(id);
    res.json({ ok: true });
  });
}
