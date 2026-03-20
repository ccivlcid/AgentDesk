import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { prettyStreamJson } from "../terminal/pretty-stream-json.ts";

type PrepareDb = Pick<DatabaseSync, "prepare">;

/** Clean up markdown links with dead worktree paths → show just the filename */
export function cleanWorktreePaths(text: string): string {
  let cleaned = text.replace(
    /\[([^\]]+)\]\([^)]*\.agentdesk-worktrees[^)]*\)/g,
    "$1",
  );
  cleaned = cleaned.replace(
    /[A-Za-z]:[/\\][^\s]*?\.agentdesk-worktrees[/\\][^\s)}[\]"]*/g,
    "",
  );
  cleaned = cleaned.replace(/^-\s*:?\s*$/gm, "").trim();
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned;
}

export function createCleanResultText(db: PrepareDb) {
  function replaceStaleFilenames(text: string, taskId: string): string {
    const artifacts = db
      .prepare("SELECT file_name FROM task_artifacts WHERE task_id = ?")
      .all(taskId) as Array<{ file_name: string }>;
    if (artifacts.length === 0) return text;

    const byExt = new Map<string, string[]>();
    for (const a of artifacts) {
      const ext = path.extname(a.file_name).toLowerCase();
      if (!byExt.has(ext)) byExt.set(ext, []);
      byExt.get(ext)!.push(a.file_name);
    }
    const artifactNameSet = new Set(artifacts.map((a) => a.file_name));

    return text.replace(
      /([A-Za-z0-9가-힣_-]+\.(pptx|docx|xlsx|pdf|mp4|mp3|zip|html|csv|md|txt))/gi,
      (match) => {
        if (artifactNameSet.has(match)) return match;
        const ext = path.extname(match).toLowerCase();
        const candidates = byExt.get(ext);
        if (candidates && candidates.length === 1) return candidates[0];
        return match;
      },
    );
  }

  function cleanResultText(raw: unknown, taskId?: string): string {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return "";
    let result: string;
    const looksLikeStreamJson =
      (text.includes('"type"') && text.includes('"item"')) ||
      (text.includes('"session_id"') && text.includes('"uuid"')) ||
      (text.includes('"type"') && text.includes('"result"'));
    if (!looksLikeStreamJson) {
      result = cleanWorktreePaths(text);
    } else {
      const pretty = prettyStreamJson(text);
      if (pretty) {
        result = cleanWorktreePaths(pretty);
      } else {
        const messages: string[] = [];
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            if (obj?.item?.type === "agent_message" && obj.item.text) {
              messages.push(obj.item.text);
            }
          } catch {
            // partial line or plain text
          }
        }
        result = messages.length > 0 ? messages.join("\n\n") : text;
        result = cleanWorktreePaths(result);
      }
    }
    if (taskId) {
      result = replaceStaleFilenames(result, taskId);
    }
    return result;
  }

  return { cleanResultText };
}
