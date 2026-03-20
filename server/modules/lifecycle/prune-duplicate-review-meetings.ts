type PruneDeps = {
  db: any;
  runInTransaction: (fn: () => void) => void;
};

export function pruneDuplicateReviewMeetings({ db, runInTransaction }: PruneDeps): void {
  const rows = db
    .prepare(
      `
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY task_id, round, status
          ORDER BY started_at DESC, created_at DESC, id DESC
        ) AS rn
      FROM meeting_minutes
      WHERE meeting_type = 'review'
        AND status IN ('in_progress', 'failed')
    )
    SELECT id
    FROM ranked
    WHERE rn > 1
  `,
    )
    .all() as Array<{ id: string }>;
  if (rows.length === 0) return;

  const delEntries = db.prepare("DELETE FROM meeting_minute_entries WHERE meeting_id = ?");
  const delMeetings = db.prepare("DELETE FROM meeting_minutes WHERE id = ?");
  runInTransaction(() => {
    for (const id of rows.map((r) => r.id)) {
      delEntries.run(id);
      delMeetings.run(id);
    }
  });
}
