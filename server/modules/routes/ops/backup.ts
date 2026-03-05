import fs from "node:fs";
import path from "node:path";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

export function registerBackupRoutes(ctx: RuntimeContext): void {
  const { app, db, dbPath, nowMs } = ctx;

  // GET /api/backup — download SQLite DB as file
  app.get("/api/backup", (_req, res) => {
    try {
      // Force WAL checkpoint so the main .sqlite file is up-to-date
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");

      const filename = `agentdesk-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;

      if (!fs.existsSync(dbPath)) {
        return res.status(500).json({ error: "db_not_found" });
      }

      res.setHeader("Content-Type", "application/x-sqlite3");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const stream = fs.createReadStream(dbPath);
      stream.pipe(res);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/backup/restore — upload SQLite DB to replace current
  app.post("/api/backup/restore", (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const buf = Buffer.concat(chunks);

        // Validate SQLite magic header
        if (buf.length < 16 || buf.toString("utf8", 0, 15) !== "SQLite format 3") {
          return res.status(400).json({ error: "invalid_sqlite", message: "Not a valid SQLite file" });
        }

        // Create backup of current DB before overwriting
        const backupDir = path.join(path.dirname(dbPath), "backups");
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(backupDir, `pre-restore-${timestamp}.sqlite`);
        fs.copyFileSync(dbPath, backupPath);

        // Close DB, write new file, reopen
        db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        fs.writeFileSync(dbPath, buf);

        // Remove WAL/SHM files if present
        for (const suffix of ["-wal", "-shm"]) {
          const f = dbPath + suffix;
          if (fs.existsSync(f)) fs.rmSync(f);
        }

        res.json({
          ok: true,
          message: "Database restored. Please restart the server for changes to take effect.",
          backupPath,
        });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });
  });

  // GET /api/tasks/export — export tasks as CSV
  app.get("/api/tasks/export", (req, res) => {
    const format = String(req.query.format || "csv");

    const rows = db
      .prepare(
        `SELECT t.id, t.title, t.description, t.status, t.priority,
                t.task_type, t.workflow_pack_key,
                t.project_id, COALESCE(p.name, '') AS project_name,
                t.assigned_agent_id, COALESCE(a.name, '') AS agent_name,
                t.department_id, COALESCE(d.name, '') AS department_name,
                t.created_at, t.updated_at
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         LEFT JOIN agents a ON a.id = t.assigned_agent_id
         LEFT JOIN departments d ON d.id = t.department_id
         ORDER BY t.created_at DESC`,
      )
      .all() as any[];

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="tasks-export.json"`);
      return res.json({ ok: true, tasks: rows });
    }

    // CSV
    const headers = [
      "id",
      "title",
      "description",
      "status",
      "priority",
      "task_type",
      "workflow_pack_key",
      "project_id",
      "project_name",
      "assigned_agent_id",
      "agent_name",
      "department_id",
      "department_name",
      "created_at",
      "updated_at",
    ];

    const escapeCsv = (val: unknown): string => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tasks-export.csv"`);
    res.send("\uFEFF" + lines.join("\n"));
  });
}
