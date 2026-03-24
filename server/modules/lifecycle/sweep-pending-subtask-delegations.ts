import type { DatabaseSync } from "node:sqlite";

type SweepDeps = {
  db: DatabaseSync;
  processSubtaskDelegations: (parentTaskId: string) => void;
};

export function sweepPendingSubtaskDelegations({ db, processSubtaskDelegations }: SweepDeps): void {
  const parents = db
    .prepare(
      `
    SELECT DISTINCT t.id
    FROM tasks t
    JOIN subtasks s ON s.task_id = t.id
    WHERE t.status IN ('planned', 'collaborating', 'in_progress', 'review')
      AND s.target_department_id IS NOT NULL
      AND s.status != 'done'
      AND (s.delegated_task_id IS NULL OR s.delegated_task_id = '')
    ORDER BY t.updated_at ASC
    LIMIT 80
  `,
    )
    .all() as Array<{ id: string }>;

  for (const row of parents) {
    if (!row.id) continue;
    processSubtaskDelegations(row.id);
  }
}
