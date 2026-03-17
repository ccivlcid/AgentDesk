/**
 * Synapse API — frontend fetch functions
 */

export interface SynapseConnectionInfo {
  status: "connected" | "disconnected";
  config: Record<string, unknown> | null;
}

export interface NotionPage {
  id: string;
  type: "page" | "database";
  title: string;
  url: string;
  last_edited_time: string;
}

export interface ObsidianNote {
  path: string;
  name: string;
  size: number;
  modified: number;
}

export interface SynapseSnapshot {
  id: string;
  name: string;
  source: string | null;
  created_at: number;
}

export async function getSynapseConnections(): Promise<Record<string, SynapseConnectionInfo>> {
  const res = await fetch("/api/synapse/connections");
  const data = await res.json() as { ok: boolean; connections: Record<string, SynapseConnectionInfo> };
  return data.connections ?? {};
}

export async function disconnectSynapse(platform: string): Promise<void> {
  await fetch(`/api/synapse/connections/${platform}`, { method: "DELETE" });
}

// ─── Notion ──────────────────────────────────────────────────────────────────

export async function connectNotion(token: string): Promise<{ workspace_name: string }> {
  const res = await fetch("/api/synapse/notion/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await res.json() as { ok: boolean; workspace_name: string; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Notion connect failed");
  return { workspace_name: data.workspace_name };
}

export async function getNotionInfo(): Promise<{ connected: boolean; workspace_name?: string }> {
  const res = await fetch("/api/synapse/notion/info");
  return res.json() as Promise<{ connected: boolean; workspace_name?: string }>;
}

export async function searchNotionPages(q = ""): Promise<NotionPage[]> {
  const res = await fetch(`/api/synapse/notion/pages?q=${encodeURIComponent(q)}`);
  const data = await res.json() as { ok: boolean; pages: NotionPage[] };
  return data.pages ?? [];
}

// ─── Obsidian ────────────────────────────────────────────────────────────────

export async function validateObsidianVault(vault_path: string): Promise<{ ok: boolean; noteCount: number; lastModified: number }> {
  const res = await fetch("/api/synapse/obsidian/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vault_path }),
  });
  return res.json() as Promise<{ ok: boolean; noteCount: number; lastModified: number }>;
}

export async function connectObsidianLocal(vault_path: string): Promise<{ noteCount: number }> {
  const res = await fetch("/api/synapse/obsidian/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "local", vault_path }),
  });
  const data = await res.json() as { ok: boolean; noteCount: number; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Obsidian connect failed");
  return { noteCount: data.noteCount };
}

export async function connectObsidianRest(host: string, port: number, api_key: string): Promise<void> {
  const res = await fetch("/api/synapse/obsidian/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "rest", rest_host: host, rest_port: port, api_key }),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Obsidian REST connect failed");
}

export async function pingObsidianRest(host: string, port: number, api_key: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/synapse/obsidian/ping-rest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host, port, api_key }),
  });
  return res.json() as Promise<{ ok: boolean; error?: string }>;
}

export async function getObsidianInfo(): Promise<{ connected: boolean; mode?: string; vault_path?: string; noteCount?: number }> {
  const res = await fetch("/api/synapse/obsidian/info");
  return res.json() as Promise<{ connected: boolean; mode?: string; vault_path?: string; noteCount?: number }>;
}

export async function searchObsidianFiles(q = ""): Promise<ObsidianNote[]> {
  const res = await fetch(`/api/synapse/obsidian/files?q=${encodeURIComponent(q)}`);
  const data = await res.json() as { ok: boolean; files: ObsidianNote[] };
  return data.files ?? [];
}

// ─── Figma ───────────────────────────────────────────────────────────────────

export async function connectFigma(token: string): Promise<{ handle: string; email: string }> {
  const res = await fetch("/api/synapse/figma/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await res.json() as { ok: boolean; handle?: string; email?: string; error?: string };
  if (!data.ok) throw new Error(data.error ?? "connect failed");
  return { handle: data.handle ?? "", email: data.email ?? "" };
}

export async function getFigmaInfo(): Promise<{ connected: boolean; handle?: string; email?: string }> {
  const res = await fetch("/api/synapse/figma/info");
  return res.json() as Promise<{ connected: boolean; handle?: string; email?: string }>;
}

// ─── Export (Phase 2) ────────────────────────────────────────────────────────

export async function exportToNotion(title: string, content: string, parentPageId: string): Promise<{ id: string; url: string }> {
  const res = await fetch("/api/synapse/export/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, parent_page_id: parentPageId }),
  });
  const data = await res.json() as { ok: boolean; id: string; url: string; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Notion export failed");
  return { id: data.id, url: data.url };
}

export async function exportToObsidian(title: string, content: string, folder?: string): Promise<{ path: string }> {
  const res = await fetch("/api/synapse/export/obsidian", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, folder }),
  });
  const data = await res.json() as { ok: boolean; path: string; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Obsidian export failed");
  return { path: data.path };
}

// ─── NotebookLM Snapshots ─────────────────────────────────────────────────────

export async function getSynapseSnapshots(): Promise<SynapseSnapshot[]> {
  const res = await fetch("/api/synapse/notebooklm/snapshots");
  const data = await res.json() as { ok: boolean; snapshots: SynapseSnapshot[] };
  return data.snapshots ?? [];
}

export async function createSynapseSnapshot(name: string, content: string, source?: string): Promise<string> {
  const res = await fetch("/api/synapse/notebooklm/snapshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content, source }),
  });
  const data = await res.json() as { ok: boolean; id: string; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Snapshot save failed");
  return data.id;
}

export async function deleteSynapseSnapshot(id: string): Promise<void> {
  await fetch(`/api/synapse/notebooklm/snapshots/${id}`, { method: "DELETE" });
}

// ─── Automation Rules (Phase 3) ───────────────────────────────────────────────

export interface SynapseTrigger {
  type: "file_change" | "page_updated";
  pattern?: string;
}

export interface SynapseRuleAction {
  type: "create_task";
  title_template: string;
  agent_id?: string;
  project_id?: string;
}

export interface SynapseRule {
  id: string;
  name: string;
  enabled: boolean;
  source: "obsidian" | "notion";
  trigger: SynapseTrigger;
  condition: Record<string, unknown>;
  action: SynapseRuleAction;
  last_fired_at: number | null;
  created_at: number;
  updated_at: number;
}

export async function getSynapseRules(): Promise<SynapseRule[]> {
  const res = await fetch("/api/synapse/rules");
  const data = await res.json() as { ok: boolean; rules: SynapseRule[] };
  return data.rules ?? [];
}

export async function createSynapseRule(rule: {
  name: string;
  source: "obsidian" | "notion";
  trigger: SynapseTrigger;
  action: SynapseRuleAction;
  enabled?: boolean;
}): Promise<SynapseRule> {
  const res = await fetch("/api/synapse/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  const data = await res.json() as { ok: boolean; rule: SynapseRule; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Create rule failed");
  return data.rule;
}

export async function updateSynapseRule(id: string, patch: Partial<Pick<SynapseRule, "name" | "source" | "trigger" | "action" | "enabled">>): Promise<SynapseRule> {
  const res = await fetch(`/api/synapse/rules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await res.json() as { ok: boolean; rule: SynapseRule; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Update rule failed");
  return data.rule;
}

export async function deleteSynapseRule(id: string): Promise<void> {
  await fetch(`/api/synapse/rules/${id}`, { method: "DELETE" });
}

// ─── KB Source Types (Phase 4) ────────────────────────────────────────────────

export interface KbSourceRef {
  type: "notion_page" | "obsidian_file" | "notebooklm_snapshot";
  id: string;
  label?: string;
}

export async function fetchSynapseContext(sources: KbSourceRef[]): Promise<string> {
  const res = await fetch("/api/synapse/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sources }),
  });
  const data = await res.json() as { ok: boolean; content: string; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Context fetch failed");
  return data.content;
}
