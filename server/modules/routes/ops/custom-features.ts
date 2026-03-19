import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { runAiGeneration, runGithubImport, runGithubRepoImport, compileFeature } from "./custom-features-ai.ts";

/** 실행 중인 web-app dev 서버 추적 */
const devServers = new Map<string, { port: number; proc: ChildProcess }>();

const TEMPLATE_DIR = join(process.cwd(), "feature", "template");

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
      if (type !== "app") return res.status(400).json({ ok: false, error: "type must be app" });
      if (!["template", "ai"].includes(source)) return res.status(400).json({ ok: false, error: "source must be template or ai" });

      const id = randomUUID();
      const now = nowMs();
      const configStr = JSON.stringify(config ?? {});
      const status = source === "ai" ? "draft" : "active";

      db.prepare(
        `INSERT INTO custom_features (id, name, type, source, template_id, config, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, trimmedName, type, source, template_id ?? null, configStr, status, now, now);

      // 템플릿인 경우 feature/template/<id>.json 에 설정 저장
      if (source === "template") {
        try {
          mkdirSync(TEMPLATE_DIR, { recursive: true });
          writeFileSync(
            join(TEMPLATE_DIR, `${id}.json`),
            JSON.stringify({ id, name: trimmedName, type, template_id: template_id ?? null, config: config ?? {} }, null, 2),
            "utf-8",
          );
        } catch { /* ignore */ }
      }

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

  // GET /api/custom-features/:id/render — AI 앱 iframe 렌더 페이지
  app.get("/api/custom-features/:id/render", (req, res) => {
    try {
      const row = db
        .prepare("SELECT id, name, config, status, bundle, error_msg FROM custom_features WHERE id = ?")
        .get(req.params.id) as { id: string; name: string; config: string; status: string; bundle: string | null; error_msg: string | null } | undefined;
      if (!row) return res.status(404).send("<h1>Not found</h1>");

      const CSS_VARS = `
:root{--th-bg-primary:#0f1117;--th-bg-elevated:#1a1d27;--th-bg-panel:#13161e;--th-border:rgba(255,255,255,0.08);--th-text-primary:#e2e4eb;--th-text-muted:#6b7280;--th-text-heading:#f3f4f6;--th-accent:#f59e0b;--th-attr-elite:#22c55e;--th-danger-text:#f87171;--th-danger-bg:rgba(239,68,68,0.1);--th-danger-border:rgba(239,68,68,0.3);--th-font-mono:'JetBrains Mono','Fira Code',monospace;}
*{box-sizing:border-box;margin:0;padding:0;}html,body{width:100%;height:100%;background:var(--th-bg-elevated);color:var(--th-text-primary);font-family:var(--th-font-mono);overflow:hidden;}#root{width:100%;height:100%;}`;

      // bundle이 없으면 자동 설치 페이지 (pending_install / draft)
      if (!row.bundle) {
        const safeId = row.id.replace(/[^a-zA-Z0-9-]/g, "");
        // pending_install이지만 error_msg 있으면 이전 컴파일 실패
        const isError = row.status === "error" || (row.status === "pending_install" && !!row.error_msg);
        const errorMsg = (row.error_msg ?? "알 수 없는 오류").replace(/</g, "&lt;");
        const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>${CSS_VARS}
.wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;padding:24px;}
.icon{font-size:36px;}
.title{font-size:13px;font-weight:700;color:var(--th-text-heading);}
.msg{font-size:11px;color:var(--th-text-muted);text-align:center;}
.err{font-size:10px;color:var(--th-danger-text);background:var(--th-danger-bg);border:1px solid var(--th-danger-border);border-radius:4px;padding:8px 12px;max-width:320px;word-break:break-all;}
.btn{font-size:11px;font-family:var(--th-font-mono);padding:6px 16px;border:1px solid var(--th-accent);border-radius:4px;background:rgba(245,158,11,0.15);color:var(--th-accent);cursor:pointer;}
.spin{display:inline-block;animation:sp 1s linear infinite;}
@keyframes sp{to{transform:rotate(360deg);}}
</style></head><body>
<div class="wrap" id="wrap">
${isError
  ? `<div class="icon">✗</div>
     <div class="title">설치 실패</div>
     <div class="err">${errorMsg}</div>
     <button class="btn" onclick="doInstall()">↺ 재시도</button>`
  : `<div class="icon"><span class="spin">⟳</span></div>
     <div class="title" id="title">설치 준비 중...</div>
     <div class="msg" id="msg">잠시만 기다려 주세요</div>`}
</div>
<script>
(function(){
  var id="${safeId}";
  function doInstall(){
    document.getElementById("title") && (document.getElementById("title").textContent="설치 중...");
    document.getElementById("msg") && (document.getElementById("msg").textContent="번들 컴파일 중...");
    fetch("/api/custom-features/"+id+"/compile",{method:"POST"})
      .catch(function(){});
    var t=setInterval(function(){
      fetch("/api/custom-features/"+id)
        .then(function(r){return r.json();})
        .then(function(j){
          var f=j.feature||j;
          if(f.status==="active"){clearInterval(t);window.location.reload();}
          else if(f.status==="error"){
            clearInterval(t);
            document.getElementById("wrap").innerHTML='<div class="icon">\u2717</div><div class="title">\uc124\uce58 \uc2e4\ud328</div><div class="err">'+(f.error_msg||"\uc54c \uc218 \uc5c6\ub294 \uc624\ub958")+'</div><button class="btn" onclick="location.reload()">\u21ba \uc7ac\uc2dc\ub3c4</button>';
          }
        }).catch(function(){});
    },2000);
  }
  ${isError ? "" : "doInstall();"}
  window.doInstall=doInstall;
})();
</script></body></html>`;
        return res.type("text/html").send(html);
      }

      // 정상 렌더
      let config: Record<string, unknown> = {};
      try { config = JSON.parse(row.config); } catch { /* ignore */ }
      const configJson = JSON.stringify(config).replace(/<\/script>/gi, "<\\/script>");
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS_VARS}</style></head><body><div id="root"></div><script>window.__agdConfig=${configJson};</script><script src="/api/custom-features/${row.id}/bundle.js"></script></body></html>`;
      res.type("text/html").send(html);
    } catch {
      res.status(500).send("<h1>Internal error</h1>");
    }
  });

  // POST /api/custom-features/:id/compile — pending_install 앱 컴파일 (앱 첫 실행 시)
  app.post("/api/custom-features/:id/compile", (req, res) => {
    try {
      const row = db
        .prepare("SELECT status FROM custom_features WHERE id = ?")
        .get(req.params.id) as { status: string } | undefined;
      if (!row) return res.status(404).json({ ok: false, error: "Not found" });
      // 이미 컴파일됐으면 즉시 반환
      if (row.status === "active") return res.json({ ok: true, cached: true });
      // 백그라운드 컴파일 (fire-and-forget)
      void compileFeature(db, req.params.id, nowMs);
      res.json({ ok: true, compiling: true });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to start compile" });
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
      const featureType = "app";
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
         VALUES (?, ?, 'app', 'ai', '{}', 'draft', ?, ?)`,
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

  // POST /api/custom-features/:id/run-dev — web-app 개발 서버 시작
  app.post("/api/custom-features/:id/run-dev", (req, res) => {
    const { id } = req.params;
    const existing = devServers.get(id);
    if (existing) {
      return res.json({ ok: true, port: existing.port });
    }
    try {
      const row = db.prepare("SELECT config FROM custom_features WHERE id = ?").get(id) as
        | { config: string | null } | undefined;
      if (!row) return res.status(404).json({ ok: false, error: "Not found" });
      let cfg: Record<string, unknown> = {};
      try { cfg = JSON.parse(row.config ?? "{}") as Record<string, unknown>; } catch { /* ignore */ }
      if (cfg.type !== "web-app" || typeof cfg.repo_dir !== "string") {
        return res.status(400).json({ ok: false, error: "Not a web-app feature" });
      }
      const repoDir  = cfg.repo_dir as string;
      const devCmd   = typeof cfg.dev_cmd === "string" ? cfg.dev_cmd : "npm run dev";
      const [cmd, ...args] = devCmd.split(" ");
      const isWin = process.platform === "win32";
      const child = spawn(cmd, args, { cwd: repoDir, shell: isWin, stdio: ["ignore", "pipe", "pipe"] });
      let responded = false;

      const tryExtractPort = (text: string) => {
        const m = text.match(/localhost:(\d{4,5})/i) ?? text.match(/:(\d{4,5})/);
        if (m) {
          const p = parseInt(m[1], 10);
          if (!responded) {
            responded = true;
            devServers.set(id, { port: p, proc: child });
            res.json({ ok: true, port: p });
          }
        }
      };
      child.stdout?.on("data", (d: Buffer) => tryExtractPort(d.toString()));
      child.stderr?.on("data", (d: Buffer) => tryExtractPort(d.toString()));
      child.on("close", () => devServers.delete(id));
      child.on("error", (e: Error) => {
        devServers.delete(id);
        if (!responded) { responded = true; res.status(500).json({ ok: false, error: e.message }); }
      });
      // 30초 안에 포트 감지 안 되면 기본 포트 5173 사용
      setTimeout(() => {
        if (!responded) {
          responded = true;
          devServers.set(id, { port: 5173, proc: child });
          res.json({ ok: true, port: 5173 });
        }
      }, 30_000);
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // POST /api/custom-features/:id/stop-dev — web-app 개발 서버 중지
  app.post("/api/custom-features/:id/stop-dev", (req, res) => {
    const existing = devServers.get(req.params.id);
    if (existing) {
      try { existing.proc.kill(); } catch { /* ignore */ }
      devServers.delete(req.params.id);
    }
    res.json({ ok: true });
  });

  // GET /api/custom-features/:id/dev-status — dev 서버 실행 여부 확인
  app.get("/api/custom-features/:id/dev-status", (req, res) => {
    const existing = devServers.get(req.params.id);
    res.json({ ok: true, running: !!existing, port: existing?.port ?? null });
  });
}
