import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { sendDeliverableFiles } from "../../../../gateway/client.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

export function trySendTaskDeliverablesToMessenger(params: {
  db: DbLike;
  taskId: string;
  taskTitle: string;
  lang: string;
  projectPathFallback: string | null | undefined;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
}): void {
  const { db, taskId, taskTitle, lang, projectPathFallback, appendTaskLog } = params;
  try {
    const DELIVERABLE_EXTS = new Set([
      ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".mp4", ".mp3", ".zip",
    ]);
    const artifactRows = db
      .prepare("SELECT file_path, file_name FROM task_artifacts WHERE task_id = ?")
      .all(taskId) as Array<{ file_path: string; file_name: string }>;
    const projectPath = projectPathFallback || process.cwd();
    const deliverableFiles = artifactRows
      .filter((a) => DELIVERABLE_EXTS.has(path.extname(a.file_name).toLowerCase()))
      .map((a) => ({
        absolutePath: path.resolve(projectPath, a.file_path),
        fileName: a.file_name,
      }))
      .filter((f) => fs.existsSync(f.absolutePath));
    if (deliverableFiles.length > 0) {
      void sendDeliverableFiles(taskTitle, deliverableFiles, lang).catch((err) => {
        appendTaskLog(taskId, "system", `Messenger file delivery failed: ${err}`);
      });
    }
  } catch {
    /* best effort */
  }
}
