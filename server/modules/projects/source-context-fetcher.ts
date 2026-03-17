import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

export async function buildSourceContextBlock(
  db: DbLike,
  taskId: string,
): Promise<string | null> {
  try {
    // 1. 태스크 → 프로젝트
    const task = db
      .prepare("SELECT project_id FROM tasks WHERE id = ?")
      .get(taskId) as { project_id: string | null } | null;
    if (!task?.project_id) return null;

    // 2. 소스 프로젝트 목록
    const sources = db
      .prepare(`
        SELECT
          ps.source_project_id,
          p.name AS source_name,
          COALESCE(c.name_ko, c.name) AS category_name
        FROM project_sources ps
        JOIN projects p ON p.id = ps.source_project_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ps.project_id = ?
        ORDER BY ps.sort_order ASC
      `)
      .all(task.project_id) as Array<{
      source_project_id: string;
      source_name: string;
      category_name: string | null;
    }>;
    if (sources.length === 0) return null;

    // 3. 각 소스 프로젝트의 완료 결과물
    const blocks: string[] = [];
    for (const src of sources) {
      const checks = db
        .prepare(`
          SELECT label, note
          FROM project_deliverable_checks
          WHERE project_id = ? AND checked = 1
          ORDER BY checked_at ASC
        `)
        .all(src.source_project_id) as Array<{
        label: string;
        note: string | null;
      }>;
      if (checks.length === 0) continue;

      const lines = checks
        .map((c) => `  - ${c.label}${c.note ? ` (${c.note})` : ""}`)
        .join("\n");
      blocks.push(
        `## 소스 프로젝트: ${src.source_name}` +
          (src.category_name ? ` [${src.category_name}]` : "") +
          `\n완료된 결과물:\n${lines}`,
      );
    }
    if (blocks.length === 0) return null;

    return [
      "# 연결된 프로젝트 결과물",
      "다음 프로젝트의 결과물을 참고하여 작업하세요.",
      ...blocks,
    ].join("\n\n");
  } catch (err) {
    logger.warn({ err }, "[source-context-fetcher] failed to build source context block");
    return null;
  }
}
