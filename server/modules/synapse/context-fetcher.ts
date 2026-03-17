/**
 * Synapse Context Fetcher
 * Assembles KB content from Notion pages, Obsidian files, and NotebookLM snapshots
 * into a Markdown block suitable for injection into agent prompts.
 */
import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";
import { getNotionPageContent } from "./notion-client.ts";
import { readVaultFile } from "./obsidian-client.ts";

export interface KbSourceRef {
  type: "notion_page" | "obsidian_file" | "notebooklm_snapshot";
  id: string;
  label?: string;
}

const MAX_CHARS_PER_SOURCE = 8000;
const MAX_TOTAL_CHARS = 20000;

async function fetchNotionPage(db: DatabaseSync, pageId: string): Promise<string | null> {
  try {
    const conn = db.prepare("SELECT config_json FROM synapse_connections WHERE platform = 'notion' AND status = 'connected'").get() as
      | { config_json: string }
      | undefined;
    if (!conn) return null;
    const cfg = JSON.parse(conn.config_json) as Record<string, unknown>;
    const token = cfg.token as string;
    return await getNotionPageContent(token, pageId);
  } catch (err) {
    logger.warn({ err, pageId }, "[synapse-ctx] notion page fetch failed");
    return null;
  }
}

function fetchObsidianFile(db: DatabaseSync, filePath: string): string | null {
  try {
    const conn = db.prepare("SELECT config_json FROM synapse_connections WHERE platform = 'obsidian' AND status = 'connected'").get() as
      | { config_json: string }
      | undefined;
    if (!conn) return null;
    const cfg = JSON.parse(conn.config_json) as Record<string, unknown>;
    if (cfg.mode !== "local" || typeof cfg.vault_path !== "string") return null;
    return readVaultFile(cfg.vault_path, filePath);
  } catch (err) {
    logger.warn({ err, filePath }, "[synapse-ctx] obsidian file read failed");
    return null;
  }
}

function fetchSnapshot(db: DatabaseSync, snapshotId: string): string | null {
  try {
    const row = db.prepare("SELECT content FROM synapse_snapshots WHERE id = ?").get(snapshotId) as
      | { content: string }
      | undefined;
    return row?.content ?? null;
  } catch {
    return null;
  }
}

/** Truncate long content with a note */
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[... content truncated at ${maxChars} chars ...]`;
}

/**
 * Fetches content for each KbSourceRef and returns a formatted Markdown string.
 * Returns empty string if all sources fail or sources array is empty.
 */
export async function fetchKbContextBlock(
  db: DatabaseSync,
  sources: KbSourceRef[],
): Promise<string> {
  if (!sources || sources.length === 0) return "";

  const parts: string[] = [];
  let totalChars = 0;

  for (const src of sources) {
    if (totalChars >= MAX_TOTAL_CHARS) break;

    let content: string | null = null;
    let sourceLabel = src.label ?? src.id;

    if (src.type === "notion_page") {
      content = await fetchNotionPage(db, src.id);
      sourceLabel = `Notion: ${src.label ?? src.id}`;
    } else if (src.type === "obsidian_file") {
      content = fetchObsidianFile(db, src.id);
      sourceLabel = `Obsidian: ${src.label ?? src.id}`;
    } else if (src.type === "notebooklm_snapshot") {
      content = fetchSnapshot(db, src.id);
      sourceLabel = `NotebookLM: ${src.label ?? src.id}`;
    }

    if (!content) continue;

    const remaining = MAX_TOTAL_CHARS - totalChars;
    const truncated = truncate(content, Math.min(MAX_CHARS_PER_SOURCE, remaining));
    totalChars += truncated.length;

    parts.push(`### ${sourceLabel}\n\n${truncated}`);
  }

  if (parts.length === 0) return "";
  return `[Knowledge Base Context]\n\n${parts.join("\n\n---\n\n")}`;
}

/**
 * Resolves KB sources for a task+agent pair and returns the context block.
 * Priority: task-level sources > agent default sources (merged, deduplicated by id).
 */
export async function buildKbContextBlock(
  db: DatabaseSync,
  taskId: string,
  agentId: string | null,
): Promise<string> {
  const sources: KbSourceRef[] = [];
  const seen = new Set<string>();

  const addSources = (json: string | null | undefined) => {
    if (!json) return;
    try {
      const parsed = JSON.parse(json) as KbSourceRef[];
      if (!Array.isArray(parsed)) return;
      for (const s of parsed) {
        if (s.id && !seen.has(s.id)) {
          seen.add(s.id);
          sources.push(s);
        }
      }
    } catch { /* ignore malformed JSON */ }
  };

  // Task-level sources
  const task = db.prepare("SELECT kb_context_sources FROM tasks WHERE id = ?").get(taskId) as
    | { kb_context_sources: string | null }
    | undefined;
  addSources(task?.kb_context_sources);

  // Agent default sources (if no task sources or as supplement)
  if (agentId) {
    const agent = db.prepare("SELECT kb_default_sources FROM agents WHERE id = ?").get(agentId) as
      | { kb_default_sources: string | null }
      | undefined;
    addSources(agent?.kb_default_sources);
  }

  if (sources.length === 0) return "";
  return fetchKbContextBlock(db, sources);
}
