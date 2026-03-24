import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import logger from "../../../lib/logger.ts";
import { castSqliteRow, castSqliteRows } from "../../../lib/sqlite-row-cast.ts";

interface RegisterProjectFolderRoutesOptions {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

interface FolderRow {
  id: string;
  name: string;
  base_path: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

interface ProjectRow {
  id: string;
  name: string;
  project_path: string;
  category_id: string | null;
}

function getFolderWithProjects(db: DatabaseSync, folderId: string) {
  const folder = castSqliteRow<FolderRow>(
    db
      .prepare("SELECT id, name, base_path, color, icon, sort_order, created_at, updated_at FROM project_folders WHERE id = ?")
      .get(folderId),
  );
  if (!folder) return null;
  const projects = castSqliteRows<ProjectRow>(
    db.prepare("SELECT id, name, project_path, category_id FROM projects WHERE folder_id = ? ORDER BY name ASC").all(folderId),
  );
  return { ...folder, projects };
}

export function registerProjectFolderRoutes({ app, db, nowMs }: RegisterProjectFolderRoutesOptions) {
  // GET /api/project-folders
  app.get("/api/project-folders", (_req, res) => {
    try {
      const folders = castSqliteRows<FolderRow>(
        db
          .prepare("SELECT id, name, base_path, color, icon, sort_order, created_at, updated_at FROM project_folders ORDER BY sort_order ASC, created_at ASC")
          .all(),
      );
      const result = folders.map((f) => {
        const projects = castSqliteRows<ProjectRow>(
          db.prepare("SELECT id, name, project_path, category_id FROM projects WHERE folder_id = ? ORDER BY name ASC").all(f.id),
        );
        return { ...f, projects };
      });
      res.json({ folders: result });
    } catch (err) {
      logger.error({ err }, "[project-folders] GET /api/project-folders error");
      res.status(500).json({ error: "internal_error" });
    }
  });

  // POST /api/project-folders
  app.post("/api/project-folders", (req, res) => {
    try {
      const { name, base_path, color, icon } = req.body as {
        name?: string; base_path?: string; color?: string; icon?: string;
      };
      if (!name || String(name).trim().length === 0) return res.status(400).json({ error: "name_required" });
      if (!base_path || String(base_path).trim().length === 0) return res.status(400).json({ error: "base_path_required" });
      if (!path.isAbsolute(String(base_path))) return res.status(400).json({ error: "base_path_not_absolute" });

      const validColor = /^#[0-9a-fA-F]{6}$/.test(String(color ?? "")) ? String(color) : "#f59e0b";
      const ts = nowMs();
      const row = db
        .prepare("INSERT INTO project_folders (name, base_path, color, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?) RETURNING id")
        .get(String(name).trim(), String(base_path).trim(), validColor, icon ?? null, ts, ts) as { id: string } | undefined;
      if (!row) return res.status(500).json({ error: "insert_failed" });
      const folder = getFolderWithProjects(db, row.id);
      res.json({ ok: true, folder });
    } catch (err) {
      logger.error({ err }, "[project-folders] POST /api/project-folders error");
      res.status(500).json({ error: "internal_error" });
    }
  });

  // PATCH /api/project-folders/:id
  app.patch("/api/project-folders/:id", (req, res) => {
    try {
      const { id } = req.params;
      const existing = db.prepare("SELECT id FROM project_folders WHERE id = ?").get(id);
      if (!existing) return res.status(404).json({ error: "folder_not_found" });

      const { name, color, icon, sort_order } = req.body as {
        name?: string; color?: string; icon?: string | null; sort_order?: number;
      };
      const sets: string[] = ["updated_at = ?"];
      const vals: (string | number | null)[] = [nowMs()];
      if (name !== undefined) { sets.push("name = ?"); vals.push(String(name).trim()); }
      if (color !== undefined) { sets.push("color = ?"); vals.push(/^#[0-9a-fA-F]{6}$/.test(String(color)) ? String(color) : "#f59e0b"); }
      if ("icon" in req.body) { sets.push("icon = ?"); vals.push(icon ?? null); }
      if (sort_order !== undefined) { sets.push("sort_order = ?"); vals.push(Number(sort_order)); }
      vals.push(id);
      db.prepare(`UPDATE project_folders SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
      const folder = getFolderWithProjects(db, id);
      res.json({ ok: true, folder });
    } catch (err) {
      logger.error({ err }, "[project-folders] PATCH /:id error");
      res.status(500).json({ error: "internal_error" });
    }
  });

  // DELETE /api/project-folders/:id
  app.delete("/api/project-folders/:id", (req, res) => {
    try {
      const { id } = req.params;
      const existing = db.prepare("SELECT id FROM project_folders WHERE id = ?").get(id);
      if (!existing) return res.status(404).json({ error: "folder_not_found" });
      const countRow = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE folder_id = ?").get(id) as { cnt: number };
      db.prepare("UPDATE projects SET folder_id = NULL WHERE folder_id = ?").run(id);
      db.prepare("DELETE FROM project_folders WHERE id = ?").run(id);
      res.json({ ok: true, orphaned_project_count: countRow.cnt });
    } catch (err) {
      logger.error({ err }, "[project-folders] DELETE /:id error");
      res.status(500).json({ error: "internal_error" });
    }
  });

  // POST /api/project-folders/:id/projects  (move project into folder)
  app.post("/api/project-folders/:id/projects", (req, res) => {
    try {
      const { id: folderId } = req.params;
      const { project_id: projectId } = req.body as { project_id?: string };
      if (!projectId) return res.status(400).json({ error: "project_id_required" });

      const folder = db
        .prepare("SELECT id, base_path FROM project_folders WHERE id = ?")
        .get(folderId) as { id: string; base_path: string } | undefined;
      if (!folder) return res.status(404).json({ error: "folder_not_found" });

      const project = db
        .prepare("SELECT id, project_path, folder_id FROM projects WHERE id = ?")
        .get(projectId) as { id: string; project_path: string; folder_id: string | null } | undefined;
      if (!project) return res.status(404).json({ error: "project_not_found" });

      if (project.folder_id === folderId) {
        return res.json({ ok: true, new_path: project.project_path, moved_on_disk: false, already_in_folder: true });
      }

      const dirName = path.basename(project.project_path);
      const newPath = path.join(folder.base_path, dirName);
      let movedOnDisk = false;

      try {
        const srcExists = fs.existsSync(project.project_path);
        const dstFree = !fs.existsSync(newPath);
        if (srcExists && dstFree) {
          fs.renameSync(project.project_path, newPath);
          movedOnDisk = true;
        } else {
          logger.warn({ src: project.project_path, dst: newPath, srcExists, dstFree }, "[project-folders] disk move skipped");
        }
      } catch (moveErr) {
        logger.warn({ moveErr }, "[project-folders] fs.renameSync failed — DB-only update");
      }

      db.prepare("UPDATE projects SET project_path = ?, folder_id = ? WHERE id = ?").run(newPath, folderId, projectId);
      res.json({ ok: true, new_path: newPath, moved_on_disk: movedOnDisk });
    } catch (err) {
      logger.error({ err }, "[project-folders] POST /:id/projects error");
      res.status(500).json({ error: "internal_error" });
    }
  });

  // DELETE /api/project-folders/:id/projects/:projectId  (eject from folder — moves project dir outside)
  app.delete("/api/project-folders/:id/projects/:projectId", (req, res) => {
    try {
      const { id: folderId, projectId } = req.params;

      const folder = db
        .prepare("SELECT id, base_path FROM project_folders WHERE id = ?")
        .get(folderId) as { id: string; base_path: string } | undefined;
      if (!folder) return res.status(404).json({ error: "folder_not_found" });

      const project = db
        .prepare("SELECT id, project_path, folder_id FROM projects WHERE id = ?")
        .get(projectId) as { id: string; project_path: string; folder_id: string | null } | undefined;
      if (!project) return res.status(404).json({ error: "project_not_found" });
      if (project.folder_id !== folderId) return res.status(404).json({ error: "project_not_in_folder" });

      let movedOnDisk = false;
      let newPath = project.project_path;

      // Move project dir to parent of folder.base_path if it currently lives inside it
      const normalizedProjectPath = path.normalize(project.project_path);
      const normalizedBasePath = path.normalize(folder.base_path);
      if (normalizedProjectPath.startsWith(normalizedBasePath + path.sep) ||
          normalizedProjectPath.startsWith(normalizedBasePath + "/")) {
        const dirName = path.basename(project.project_path);
        const parentDir = path.dirname(folder.base_path);
        const targetPath = path.join(parentDir, dirName);
        try {
          const srcExists = fs.existsSync(project.project_path);
          const dstFree = !fs.existsSync(targetPath);
          if (srcExists && dstFree) {
            fs.renameSync(project.project_path, targetPath);
            newPath = targetPath;
            movedOnDisk = true;
          } else {
            logger.warn({ src: project.project_path, dst: targetPath, srcExists, dstFree },
              "[project-folders] eject disk move skipped");
          }
        } catch (moveErr) {
          logger.warn({ moveErr }, "[project-folders] eject fs.renameSync failed — DB-only update");
        }
      }

      db.prepare("UPDATE projects SET folder_id = NULL, project_path = ? WHERE id = ?")
        .run(newPath, projectId);

      res.json({ ok: true, new_path: newPath, moved_on_disk: movedOnDisk });
    } catch (err) {
      logger.error({ err }, "[project-folders] DELETE /:id/projects/:projectId error");
      res.status(500).json({ error: "internal_error" });
    }
  });
}
