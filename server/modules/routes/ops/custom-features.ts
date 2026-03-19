import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { runAiGeneration, runGithubImport, runGithubRepoImport } from "./custom-features-ai.ts";

interface Deps {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

/** custom_features 행에서 bundle을 제거하고 config를 파싱해서 반환 */
function sanitizeRow(row: Record<string, unknown>) {
  const { bundle: _bundle, config, ...rest } = row;
  return {
    ...rest,
    config: (() => {
      try { return JSON.parse(config as string); } catch { return {}; }
    })(),
  };
}

export function registerCustomFeatureRoutes({ app, db, nowMs }: Deps): void {
  // GET /api/custom-features — 목록 (bundle 제외)
  app.get("/api/custom-features", (_req, res) => {
    try {
      const rows = db
        .prepare(
          `SELECT id, name, type, source, template_id, config, status, error_msg, icon_svg, created_at, updated_at
           FROM custom_features
           ORDER BY updated_at DESC`,
        )
        .all() as Record<string, unknown>[];
      res.json({ ok: true, features: rows.map(sanitizeRow) });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to list custom features" });
    }
  });

  // GET /api/custom-features/:id — 단건 (bundle 제외)
  app.get("/api/custom-features/:id", (req, res) => {
    try {
      const row = db
        .prepare(
          `SELECT id, name, type, source, template_id, config, status, error_msg, icon_svg, progress_log, created_at, updated_at
           FROM custom_features WHERE id = ?`,
        )
        .get(req.params.id) as Record<string, unknown> | undefined;
      if (!row) return res.status(404).json({ ok: false, error: "Not found" });
      res.json({ ok: true, feature: sanitizeRow(row) });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to get custom feature" });
    }
  });

  // POST /api/custom-features — 생성
  app.post("/api/custom-features", (req, res) => {
    try {
      const { name, type, source, template_id, config } = req.body ?? {};
      const trimmedName = String(name ?? "").trim().slice(0, 40);
      if (!trimmedName) return res.status(400).json({ ok: false, error: "name required" });
      if (!["widget", "app"].includes(type)) return res.status(400).json({ ok: false, error: "type must be widget or app" });
      if (!["template", "ai"].includes(source)) return res.status(400).json({ ok: false, error: "source must be template or ai" });

      const id = randomUUID();
      const now = nowMs();
      const configStr = JSON.stringify(config ?? {});
      const status = source === "ai" ? "draft" : "active";

      db.prepare(
        `INSERT INTO custom_features (id, name, type, source, template_id, config, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, trimmedName, type, source, template_id ?? null, configStr, status, now, now);

      res.json({ ok: true, id });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to create custom feature" });
    }
  });

  // PUT /api/custom-features/:id — 이름/config 수정 (bundle은 ai-generate 전용)
  app.put("/api/custom-features/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, config } = req.body ?? {};
      const fields: string[] = [];
      const values: unknown[] = [];

      if (name !== undefined) {
        const trimmed = String(name).trim().slice(0, 40);
        if (!trimmed) return res.status(400).json({ ok: false, error: "name cannot be empty" });
        fields.push("name = ?");
        values.push(trimmed);
      }
      if (config !== undefined) {
        fields.push("config = ?");
        values.push(JSON.stringify(config));
      }
      if (fields.length === 0) return res.status(400).json({ ok: false, error: "Nothing to update" });

      fields.push("updated_at = ?");
      values.push(nowMs());
      values.push(id);

      const result = db
        .prepare(`UPDATE custom_features SET ${fields.join(", ")} WHERE id = ?`)
        .run(...(values as Parameters<typeof db.prepare>));

      if ((result as { changes: number }).changes === 0) {
        return res.status(404).json({ ok: false, error: "Not found" });
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to update custom feature" });
    }
  });

  // DELETE /api/custom-features/:id — 삭제
  app.delete("/api/custom-features/:id", (req, res) => {
    try {
      const result = db
        .prepare("DELETE FROM custom_features WHERE id = ?")
        .run(req.params.id);
      if ((result as { changes: number }).changes === 0) {
        return res.status(404).json({ ok: false, error: "Not found" });
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to delete custom feature" });
    }
  });

  // GET /api/custom-features/:id/bundle.js — 컴파일된 IIFE JS 반환 (iframe 전용)
  app.get("/api/custom-features/:id/bundle.js", (req, res) => {
    try {
      const row = db
        .prepare("SELECT bundle FROM custom_features WHERE id = ? AND status = 'active'")
        .get(req.params.id) as { bundle: string | null } | undefined;
      if (!row || !row.bundle) return res.status(404).type("text").send("// bundle not found");
      res.type("application/javascript").send(row.bundle);
    } catch {
      res.status(500).type("text").send("// internal error");
    }
  });

  // GET /api/custom-features/:id/render — AI 위젯 iframe 렌더 페이지
  app.get("/api/custom-features/:id/render", (req, res) => {
    try {
      const row = db
        .prepare("SELECT id, config, status FROM custom_features WHERE id = ?")
        .get(req.params.id) as { id: string; config: string; status: string } | undefined;
      if (!row) return res.status(404).send("<h1>Not found</h1>");

      let config: Record<string, unknown> = {};
      try { config = JSON.parse(row.config); } catch { /* ignore */ }

      const configJson = JSON.stringify(config).replace(/<\/script>/gi, "<\\/script>");
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root {
  --th-bg-primary: #0f1117;
  --th-bg-elevated: #1a1d27;
  --th-bg-panel: #13161e;
  --th-border: rgba(255,255,255,0.08);
  --th-border-strong: rgba(255,255,255,0.15);
  --th-border-accent: rgba(245,158,11,0.4);
  --th-text-primary: #e2e4eb;
  --th-text-muted: #6b7280;
  --th-text-heading: #f3f4f6;
  --th-accent: #f59e0b;
  --th-attr-elite: #22c55e;
  --th-danger-text: #f87171;
  --th-danger-bg: rgba(239,68,68,0.1);
  --th-danger-border: rgba(239,68,68,0.3);
  --th-font-mono: 'JetBrains Mono','Fira Code',monospace;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;height:100%;background:var(--th-bg-elevated);color:var(--th-text-primary);font-family:var(--th-font-mono);overflow:hidden;}
#root{width:100%;height:100%;}
</style>
</head>
<body>
<div id="root"></div>
<script>window.__agdConfig = ${configJson};</script>
<script src="/api/custom-features/${row.id}/bundle.js"></script>
</body>
</html>`;
      res.type("text/html").send(html);
    } catch {
      res.status(500).send("<h1>Internal error</h1>");
    }
  });

  // POST /api/custom-features/:id/bundle — AI 생성 bundle 저장 (서버 내부 전용)
  // 프론트에서 직접 호출하지 않음 — AI 파이프라인(Phase 4)이 사용
  app.post("/api/custom-features/:id/bundle", (req, res) => {
    try {
      const { bundle, status, error_msg } = req.body ?? {};
      if (typeof bundle !== "string" && status !== "error") {
        return res.status(400).json({ ok: false, error: "bundle required" });
      }
      const now = nowMs();
      const result = db
        .prepare(
          `UPDATE custom_features SET bundle = ?, status = ?, error_msg = ?, updated_at = ? WHERE id = ?`,
        )
        .run(bundle ?? null, status ?? "active", error_msg ?? null, now, req.params.id);
      if ((result as { changes: number }).changes === 0) {
        return res.status(404).json({ ok: false, error: "Not found" });
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to save bundle" });
    }
  });

  // POST /api/custom-features/ai-generate — AI 생성 트리거
  // 1. draft feature 레코드 생성 → feature_id 반환
  // 2. 백그라운드에서 AI 호출 (fire-and-forget)
  // 3. 프론트는 GET /api/custom-features/:id 로 polling
  app.post("/api/custom-features/ai-generate", (req, res) => {
    try {
      const { prompt, type, name, config } = req.body ?? {};
      const trimmedPrompt = String(prompt ?? "").trim();
      if (!trimmedPrompt) return res.status(400).json({ ok: false, error: "prompt required" });
      const featureType = ["widget", "app"].includes(type) ? type : "widget";
      const trimmedName = String(name ?? "").trim().slice(0, 40) || "AI 생성 기능";

      const id = randomUUID();
      const now = nowMs();
      db.prepare(
        `INSERT INTO custom_features (id, name, type, source, config, status, created_at, updated_at)
         VALUES (?, ?, ?, 'ai', ?, 'draft', ?, ?)`,
      ).run(id, trimmedName, featureType, JSON.stringify(config ?? {}), now, now);

      // 백그라운드 실행 (await 하지 않음)
      void runAiGeneration(db, id, trimmedPrompt, nowMs);

      res.json({ ok: true, feature_id: id });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to start AI generation" });
    }
  });

  // POST /api/custom-features/github-import — GitHub URL로 위젯 임포트
  // 1. GitHub URL → raw 콘텐츠 fetch
  // 2. validateBundle + compileToIife
  // 3. DB 저장 → feature_id 반환 (폴링 없음 — 동기 처리)
  app.post("/api/custom-features/github-import", (req, res) => {
    try {
      const { url, name } = req.body ?? {};
      const trimmedUrl = String(url ?? "").trim();
      if (!trimmedUrl) return res.status(400).json({ ok: false, error: "url required" });

      const id = randomUUID();
      const now = nowMs();
      const trimmedName = String(name ?? "").trim().slice(0, 40) || "GitHub 위젯";

      db.prepare(
        `INSERT INTO custom_features (id, name, type, source, config, status, created_at, updated_at)
         VALUES (?, ?, 'widget', 'ai', '{}', 'draft', ?, ?)`,
      ).run(id, trimmedName, now, now);

      // 백그라운드 실행
      void runGithubImport(db, id, trimmedUrl, nowMs);

      res.json({ ok: true, feature_id: id });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to start GitHub import" });
    }
  });

  // POST /api/custom-features/github-repo-import — GitHub 레포 URL로 앱 생성 (AI)
  // 1. README + package.json fetch → npm install
  // 2. AI로 컴포넌트 + SVG 아이콘 생성
  // 3. DB 저장 → feature_id 반환 (폴링 방식)
  app.post("/api/custom-features/github-repo-import", (req, res) => {
    try {
      const { url, name } = req.body ?? {};
      const trimmedUrl = String(url ?? "").trim();
      if (!trimmedUrl) return res.status(400).json({ ok: false, error: "url required" });

      const id = randomUUID();
      const now = nowMs();
      const trimmedName = String(name ?? "").trim().slice(0, 40) || "GitHub 앱";

      db.prepare(
        `INSERT INTO custom_features (id, name, type, source, config, status, created_at, updated_at)
         VALUES (?, ?, 'app', 'ai', '{}', 'draft', ?, ?)`,
      ).run(id, trimmedName, now, now);

      // 백그라운드 실행
      void runGithubRepoImport(db, id, trimmedUrl, nowMs);

      res.json({ ok: true, feature_id: id });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to start GitHub repo import" });
    }
  });
}
