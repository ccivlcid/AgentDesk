import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import type { ChildProcess } from "node:child_process";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { runAiGeneration, runGithubImport, runGithubRepoImport, compileFeature, AI_DIR, GITHUB_DIR } from "./custom-features-ai.ts";

/** 실행 중인 web-app dev 서버 추적 */
const devServers = new Map<string, { port: number; proc: ChildProcess; log: string[]; ready: boolean }>();

/** 단일 devServer 프로세스 강제 종료 */
function killDevServer(id: string): void {
  const entry = devServers.get(id);
  if (!entry) return;
  const pid = entry.proc.pid;
  if (process.platform === "win32" && pid) {
    spawn("taskkill", ["/F", "/T", "/PID", String(pid)], { shell: true, stdio: "ignore" });
  } else {
    try { entry.proc.kill("SIGTERM"); } catch { /* ignore */ }
  }
  devServers.delete(id);
}

/** 실행 중인 모든 devServer 강제 종료 */
function killAllDevServers(): void {
  for (const id of [...devServers.keys()]) killDevServer(id);
}

// 서버 종료 시 고아 프로세스 방지
process.on("SIGINT",  () => killAllDevServers());
process.on("SIGTERM", () => killAllDevServers());

/** 사용 가능한 빈 포트 찾기 (startPort부터 순서대로 탐색) */
function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      server.close(() => resolve(port));
    });
    server.on("error", () => findFreePort(startPort + 1).then(resolve));
  });
}

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

  // DELETE /api/custom-features/:id — 삭제 (dev 서버 종료 + 파일 정리)
  app.delete("/api/custom-features/:id", (req, res) => {
    const { id } = req.params;
    try {
      // 1. 실행 중인 dev 서버 종료
      killDevServer(id);

      // 2. 파일 삭제를 위해 config 먼저 읽기
      const cfgRow = db.prepare("SELECT config FROM custom_features WHERE id = ?").get(id) as
        | { config: string | null } | undefined;

      // 3. DB에서 삭제
      const result = db.prepare("DELETE FROM custom_features WHERE id = ?").run(id);
      if ((result as { changes: number }).changes === 0) {
        return res.status(404).json({ ok: false, error: "Not found" });
      }

      // 4. 파일 정리 (best-effort)
      try {
        if (cfgRow?.config) {
          const cfg = JSON.parse(cfgRow.config) as Record<string, unknown>;
          // GitHub 레포 클론 디렉토리 삭제
          if (typeof cfg.repo_dir === "string" && existsSync(cfg.repo_dir)) {
            rmSync(cfg.repo_dir, { recursive: true, force: true });
          }
        }
        // AI 생성 소스 파일 삭제
        const aiSrc = join(AI_DIR, `${id}.tsx`);
        if (existsSync(aiSrc)) unlinkSync(aiSrc);
        // GitHub 단일 파일 임포트 소스 삭제
        if (existsSync(GITHUB_DIR)) {
          for (const f of readdirSync(GITHUB_DIR).filter((f) => f.startsWith(`${id}-`))) {
            try { unlinkSync(join(GITHUB_DIR, f)); } catch { /* ignore */ }
          }
        }
      } catch { /* 파일 삭제 실패해도 DB 삭제는 성공 */ }

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

      // config 파싱 (bundle 없는 경우 포함해 사용)
      let cfgParsed: Record<string, unknown> = {};
      try { cfgParsed = JSON.parse(row.config ?? "{}"); } catch { /* ignore */ }

      // web-app 타입: bundle 없이 dev 서버로 실행하는 레포 임포트 앱
      if (!row.bundle && cfgParsed.type === "web-app") {
        const safeId = row.id.replace(/[^a-zA-Z0-9-]/g, "");
        const desc   = String(cfgParsed.description ?? "").replace(/</g, "&lt;");
        const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>${CSS_VARS}
*{box-sizing:border-box;margin:0;padding:0;}
body{height:100vh;display:flex;flex-direction:column;background:var(--th-bg-primary,#0f1117);font-family:var(--th-font-mono,monospace);}
.top{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px 24px 14px;}
.title{font-size:13px;font-weight:700;color:var(--th-text-heading,#e5e7eb);}
.desc{font-size:10px;color:var(--th-text-muted,#6b7280);text-align:center;max-width:340px;line-height:1.5;}
.btn{font-size:12px;font-weight:700;padding:7px 22px;border:none;border-radius:4px;background:var(--th-accent,#f59e0b);color:#000;cursor:pointer;}
.btn:disabled{opacity:0.5;cursor:not-allowed;}
.open-btn{font-size:12px;font-weight:700;padding:7px 22px;border:none;border-radius:4px;background:#22c55e;color:#000;cursor:pointer;text-decoration:none;display:inline-block;}
.terminal{flex:1;overflow-y:auto;background:#0d1117;border-top:1px solid #30363d;padding:10px 14px;font-size:10.5px;line-height:1.7;color:#c9d1d9;}
.terminal .sys{color:#6b7280;}.terminal .fe{color:#58a6ff;}.terminal .be{color:#d29922;}.terminal .err{color:#f85149;}
.status-bar{display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid #30363d;background:#0d1117;flex-shrink:0;}
.dot{width:8px;height:8px;border-radius:50%;background:#6b7280;flex-shrink:0;}
.dot.on{background:#22c55e;}.status-txt{font-size:10px;color:var(--th-text-muted,#6b7280);flex:1;}
</style></head><body>
<div class="top">
  <div class="title">🚀 Web App${desc ? " — " + desc : ""}</div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;">
    <button class="btn" id="startBtn" onclick="startDev()">▶ 실행</button>
    <a class="open-btn" id="openBtn" style="display:none" target="_blank">↗ 열기</a>
    <button class="btn" id="stopBtn" style="display:none;background:#374151;color:#e5e7eb;" onclick="stopDev()">■ 중지</button>
  </div>
</div>
<div class="terminal" id="term"><span class="sys">대기 중...</span></div>
<div class="status-bar"><div class="dot" id="dot"></div><div class="status-txt" id="stxt">서버 중지됨</div></div>
<script>
(function(){
  var id="${safeId}";
  var pollTimer=null;
  var running=false;
  var port=0;

  function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;");}
  function cls(line){
    if(line.startsWith("[system]")) return "sys";
    if(line.startsWith("[frontend]")||line.startsWith("[vite]")) return "fe";
    if(line.startsWith("[backend]")||line.startsWith("[dev]")) return "be";
    if(/error|오류|EADDRINUSE/i.test(line)) return "err";
    return "";
  }
  function renderLog(lines){
    var t=document.getElementById("term");
    t.innerHTML=lines.map(function(l){var c=cls(l);return '<span'+(c?' class="'+c+'"':'')+'>'+esc(l)+'</span>';}).join("<br>");
    t.scrollTop=t.scrollHeight;
  }
  function setStatus(on,txt){
    document.getElementById("dot").className="dot"+(on?" on":"");
    document.getElementById("stxt").textContent=txt;
  }
  function startPoll(){
    if(pollTimer) return;
    pollTimer=setInterval(function(){
      fetch("/api/custom-features/"+id+"/dev-log")
        .then(function(r){return r.json();})
        .then(function(j){
          if(j.log&&j.log.length) renderLog(j.log);
          // ready: Vite/Next가 실제로 포트를 열었을 때만 "실행 중" 표시
          if(j.ready&&j.port&&!running){
            running=true; port=j.port;
            setStatus(true,"실행 중 — 포트 "+port);
            var ob=document.getElementById("openBtn");
            ob.href="http://localhost:"+port;ob.style.display="inline-block";
            document.getElementById("stopBtn").style.display="inline-block";
            document.getElementById("startBtn").style.display="none";
          }
          if(!j.running&&!running){ setStatus(false,"서버 중지됨"); stopPoll(); showStart(); }
          if(!j.running&&running){ running=false; setStatus(false,"서버 종료됨"); stopPoll(); showStart(); }
        }).catch(function(){});
    },2000);
  }
  function stopPoll(){ if(pollTimer){clearInterval(pollTimer);pollTimer=null;} }
  function showStart(){
    document.getElementById("startBtn").disabled=false;
    document.getElementById("startBtn").textContent="▶ 실행";
    document.getElementById("startBtn").style.display="inline-block";
    document.getElementById("stopBtn").style.display="none";
    document.getElementById("openBtn").style.display="none";
  }
  function startDev(){
    document.getElementById("startBtn").disabled=true;
    document.getElementById("startBtn").textContent="시작 중...";
    document.getElementById("term").innerHTML='<span class="sys">dev 서버 시작 요청 중...</span>';
    fetch("/api/custom-features/"+id+"/run-dev",{method:"POST"})
      .then(function(r){return r.json();})
      .then(function(j){
        if(j.ok){
          if(j.log&&j.log.length) renderLog(j.log);
          setStatus(true,"포트 "+j.port+" 에서 시작 중...");
          startPoll();
        } else {
          document.getElementById("term").innerHTML='<span class="err">오류: '+esc(j.error||"알 수 없는 오류")+'</span>';
          showStart();
        }
      }).catch(function(e){ document.getElementById("term").innerHTML='<span class="err">오류: '+esc(e.message)+'</span>'; showStart(); });
  }
  function stopDev(){
    fetch("/api/custom-features/"+id+"/stop-dev",{method:"POST"}).catch(function(){});
    stopPoll(); running=false; setStatus(false,"중지됨"); showStart();
  }
  // onclick 속성에서 호출 가능하도록 window에 노출
  window.startDev=startDev;
  window.stopDev=stopDev;
  // 이미 실행 중인지 확인
  fetch("/api/custom-features/"+id+"/dev-log")
    .then(function(r){return r.json();})
    .then(function(j){
      if(j.log&&j.log.length) renderLog(j.log);
      if(j.running&&j.ready&&j.port){
        running=true; port=j.port;
        setStatus(true,"실행 중 — 포트 "+port);
        var ob=document.getElementById("openBtn");
        ob.href="http://localhost:"+port;ob.style.display="inline-block";
        document.getElementById("stopBtn").style.display="inline-block";
        document.getElementById("startBtn").style.display="none";
      } else if(j.running){
        // 프로세스는 살아있지만 아직 ready 아님 → 폴링 시작
        startPoll();
      }
    }).catch(function(){});
})();
</script></body></html>`;
        return res.type("text/html").send(html);
      }

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
    // 기존 프로세스 있으면 강제 종료 후 재시작
    const existing = devServers.get(id);
    if (existing) {
      try { existing.proc.kill(); } catch { /* ignore */ }
      devServers.delete(id);
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
      const repoDir = cfg.repo_dir as string;
      const devCmd  = typeof cfg.dev_cmd === "string" ? cfg.dev_cmd : "npm run dev";
      const isWin   = process.platform === "win32";
      const log: string[] = [];

      // node_modules 없으면 자동 설치 후 실행
      const needsInstall = !existsSync(join(repoDir, "node_modules", ".bin"));
      const installAndRun = needsInstall
        ? new Promise<void>((resolve) => {
            const isWinInner = process.platform === "win32";
            const pm = existsSync(join(repoDir, "pnpm-lock.yaml")) ? "pnpm"
                      : existsSync(join(repoDir, "yarn.lock")) ? "yarn" : "npm";
            const args = pm === "yarn" ? ["install"] : ["install", "--include=dev"];
            log.push(`[system] node_modules 없음 — ${pm} ${args.join(" ")} 설치 중...`);
            const inst = spawn(pm, args, { cwd: repoDir, shell: isWinInner, stdio: ["ignore", "pipe", "pipe"] });
            inst.stdout?.on("data", (d: Buffer) => d.toString().split("\n").filter(Boolean).forEach((l) => log.push(l.trimEnd())));
            inst.stderr?.on("data", (d: Buffer) => d.toString().split("\n").filter(Boolean).forEach((l) => log.push(l.trimEnd())));
            inst.on("close", () => { log.push("[system] 설치 완료"); resolve(); });
            inst.on("error", () => resolve());
          })
        : Promise.resolve();

      // 프런트/백엔드 각각 빈 포트 2개 확보 후 실행
      installAndRun.then(() => findFreePort(9000).then((frontPort) => findFreePort(frontPort + 1).then((backPort) => {
        // package.json 스크립트에서 실제 명령을 읽어 --port XXXX 교체 (프런트 포트)
        // package.json 스크립트 직접 읽어 --port 교체 (pnpm lifecycle hook 우회)
        // Bug fix: pnpm run dev / yarn run dev 모두 scriptName = "dev" 로 캡처
        let shellCmd: string | null = null;
        try {
          const pkg = JSON.parse(readFileSync(join(repoDir, "package.json"), "utf-8")) as { scripts?: Record<string, string> };
          const scriptNameMatch = devCmd.match(/(?:(?:pnpm|yarn)(?:\s+run)?|npm(?:\s+run)?)\s+(\S+)/);
          const scriptName = scriptNameMatch?.[1];
          if (scriptName && pkg.scripts?.[scriptName]) {
            let script = pkg.scripts[scriptName];
            // --port 이미 있으면 교체, 없으면 주입 (vite / next dev / etc.)
            if (/--port[\s=]\d+/.test(script)) {
              script = script
                .replace(/--port\s+\d+/g, `--port ${frontPort}`)
                .replace(/--port=\d+/g, `--port=${frontPort}`);
            } else {
              script = script.replace(/\bvite\b/, `vite --port ${frontPort}`)
                             .replace(/\bnext dev\b/, `next dev --port ${frontPort}`)
                             .replace(/\bnuxt dev\b/, `nuxt dev --port ${frontPort}`);
              // 위 패턴에 해당 없으면 그냥 추가
              if (script === pkg.scripts[scriptName]) script += ` --port ${frontPort}`;
            }
            shellCmd = script;
            log.push(`[system] 스크립트 "${scriptName}" 직접 실행 (lifecycle hook 건너뜀)`);
          } else {
            log.push(`[system] 스크립트 추출 실패 — devCmd 그대로 실행`);
          }
        } catch (e) {
          log.push(`[system] package.json 읽기 실패: ${(e as Error).message}`);
        }

        const finalCmd = shellCmd ?? devCmd;
        log.push(`[system] 프런트: ${frontPort} / 백엔드: ${backPort}`);
        log.push(`[system] 실행: ${finalCmd}`);

        const child = spawn(finalCmd, [], {
          cwd: repoDir,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            PORT: String(backPort),       // 백엔드가 process.env.PORT 읽음
            VITE_PORT: String(frontPort), // 일부 vite 설정이 이 변수 사용
            PATH: `${join(repoDir, "node_modules", ".bin")}${isWin ? ";" : ":"}${process.env.PATH ?? ""}`,
          },
        });
        devServers.set(id, { port: frontPort, proc: child, log, ready: false });

        const onData = (d: Buffer) => {
          d.toString().split("\n").filter(Boolean).forEach((raw) => {
            const line = raw.trimEnd();
            log.push(line);
            // ANSI 이스케이프 코드 제거 후 포트 감지
            const plain = line.replace(/\x1B\[[0-9;]*m/g, "");
            // Vite:   "Local:   http://localhost:5173/"
            // Next:   "ready - started server on 0.0.0.0:3000"
            // CRA:    "Local:  http://localhost:3000"
            const portMatch =
              plain.match(/Local[:\s]+http:\/\/localhost:(\d+)/i) ??
              plain.match(/started.*?(?:on\s+(?:0\.0\.0\.0:|localhost:)?)(\d{4,5})/i) ??
              plain.match(/localhost:(\d{4,5})/i);
            if (portMatch) {
              const detectedPort = parseInt(portMatch[1], 10);
              const entry = devServers.get(id);
              if (entry) { entry.port = detectedPort; entry.ready = true; }
            }
          });
        };
        child.stdout?.on("data", onData);
        child.stderr?.on("data", onData);
        child.on("close", (code) => { log.push(`[system] 종료 (exit ${code})`); devServers.delete(id); });
        child.on("error", (e) => { log.push(`[system] 오류: ${e.message}`); });

        res.json({ ok: true, port: frontPort, log });
      }))).catch((e: Error) => {
        res.status(500).json({ ok: false, error: "실행 실패: " + (e as Error).message });
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // POST /api/custom-features/:id/stop-dev — web-app 개발 서버 중지
  app.post("/api/custom-features/:id/stop-dev", (req, res) => {
    killDevServer(req.params.id);
    res.json({ ok: true });
  });

  // POST /api/custom-features/stop-all-dev — 실행 중인 모든 dev 서버 강제 종료
  app.post("/api/custom-features/stop-all-dev", (_req, res) => {
    const count = devServers.size;
    killAllDevServers();
    res.json({ ok: true, killed: count });
  });

  // GET /api/custom-features/:id/dev-status — dev 서버 실행 여부 확인
  app.get("/api/custom-features/:id/dev-status", (req, res) => {
    const existing = devServers.get(req.params.id);
    res.json({ ok: true, running: !!existing, port: existing?.port ?? null });
  });

  // GET /api/custom-features/:id/dev-log — dev 서버 출력 로그 폴링
  app.get("/api/custom-features/:id/dev-log", (req, res) => {
    const existing = devServers.get(req.params.id);
    res.json({ ok: true, running: !!existing, ready: existing?.ready ?? false, port: existing?.port ?? null, log: existing?.log ?? [] });
  });
}
