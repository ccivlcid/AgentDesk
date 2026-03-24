import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";
import { castSqliteRow } from "../../lib/sqlite-row-cast.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

interface FigmaConnectionRow {
  config_json: string | null;
}

interface FigmaTaskRow {
  figma_url: string | null;
}

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
  const fileKeyMatch = url.match(/figma\.com\/(?:design|file)\/([^/?#]+)/);
  const fileKey = fileKeyMatch?.[1] ?? "";
  const nodeIdMatch = url.match(/node-id=([^&]+)/);
  const nodeId = nodeIdMatch ? decodeURIComponent(nodeIdMatch[1]).replace(/-/g, ":") : "";
  return { fileKey, nodeId };
}

function formatFigmaContext(fileKey: string, nodeId: string, data: unknown): string {
  const lines: string[] = [
    `[Figma Design Context]`,
    `file=${fileKey}${nodeId ? ` node=${nodeId}` : ""}`,
  ];

  try {
    const payload = data as {
      nodes?: Record<string, { document?: { name?: string; type?: string; absoluteBoundingBox?: { width?: number; height?: number } } }>;
      name?: string;
    };

    if (payload.name) lines.push(`file_name=${payload.name}`);

    if (payload.nodes) {
      for (const [id, nodeData] of Object.entries(payload.nodes)) {
        const doc = nodeData.document;
        if (!doc) continue;
        lines.push(`node_id=${id} name="${doc.name ?? ""}" type=${doc.type ?? ""}`);
        if (doc.absoluteBoundingBox) {
          const { width, height } = doc.absoluteBoundingBox;
          if (width != null && height != null) {
            lines.push(`  size=${Math.round(width)}x${Math.round(height)}px`);
          }
        }
      }
    }
  } catch { /* formatting failed — return minimal context */ }

  lines.push(`[/Figma Design Context]`);
  return lines.join("\n");
}

/**
 * Fetches Figma design context for the given task.
 * API token is read from synapse_connections WHERE platform = 'figma'.
 * Returns empty string if task has no figma_url, Figma is not connected, or API call fails (non-fatal).
 */
export async function buildFigmaContextBlock(db: DbLike, taskId: string): Promise<string> {
  const taskRow = castSqliteRow<FigmaTaskRow>(db.prepare("SELECT figma_url FROM tasks WHERE id = ?").get(taskId));
  if (!taskRow?.figma_url) return "";

  const connRow = castSqliteRow<FigmaConnectionRow>(
    db.prepare("SELECT config_json FROM synapse_connections WHERE platform = 'figma' AND status = 'connected'").get(),
  );
  if (!connRow?.config_json) return "";

  let apiKey: string;
  try {
    const cfg = JSON.parse(connRow.config_json) as Record<string, unknown>;
    apiKey = typeof cfg.token === "string" ? cfg.token : "";
  } catch { return ""; }
  if (!apiKey) return "";

  const { fileKey, nodeId } = parseFigmaUrl(taskRow.figma_url);
  if (!fileKey) return "";

  try {
    const url = nodeId
      ? `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`
      : `https://api.figma.com/v1/files/${fileKey}?depth=1`;

    const res = await fetch(url, {
      headers: { "X-Figma-Token": apiKey, Accept: "application/json" },
    });

    if (!res.ok) {
      logger.warn({ status: res.status, fileKey, nodeId }, "[figma] API request failed");
      return "";
    }

    const data = await res.json();
    return formatFigmaContext(fileKey, nodeId, data);
  } catch (err) {
    logger.warn({ err }, "[figma] context fetch error");
    return "";
  }
}
