/**
 * App Runner API — Repo Store 앱 분석/실행 관리
 */

import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync } from "fs";
import { join, isAbsolute, normalize, resolve } from "path";
import { homedir } from "os";
import { createServer } from "net";
import logger from "../../../lib/logger.ts";
import { resolveProvider, getDefaultModel } from "../../agent-runtime/llm-client.ts";
import { loadPrompt } from "../../../lib/prompt-loader.ts";

interface AnalysisResult {
  type: string;
  language: string | null;
  framework: string | null;
  install_command: string | null;
  run_command: string | null;
  default_port: number | null;
  warnings: string[];
  summary: string;
  ai_description: string | null;
}

function resolveHomePath(p: string): string {
  let candidate = p;
  if (candidate === "~") {
    candidate = homedir();
  } else if (candidate.startsWith("~/")) {
    candidate = join(homedir(), candidate.slice(2));
  } else if (candidate === "/Projects" || candidate.startsWith("/Projects/")) {
    const suffix = candidate.slice("/Projects".length).replace(/^\/+/, "");
    candidate = suffix ? join(homedir(), "Projects", suffix) : join(homedir(), "Projects");
  } else if (candidate === "/projects" || candidate.startsWith("/projects/")) {
    const suffix = candidate.slice("/projects".length).replace(/^\/+/, "");
    candidate = suffix ? join(homedir(), "projects", suffix) : join(homedir(), "projects");
  }
  const absolute = isAbsolute(candidate) ? candidate : resolve(process.cwd(), candidate);
  return normalize(absolute);
}

/** Check if a port is available. Returns true if free. */
function checkPortFree(port: number): Promise<boolean> {
  return new Promise((res) => {
    const srv = createServer();
    srv.once("error", () => res(false));
    srv.listen(port, "127.0.0.1", () => { srv.close(() => res(true)); });
  });
}

/** Find a free port starting from `start`, trying up to `maxAttempts`. */
async function findFreePort(start: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const p = start + i;
    if (await checkPortFree(p)) return p;
  }
  return start; // fallback
}

function analyzeProject(projectPath: string): AnalysisResult {
  const result: AnalysisResult = {
    type: "unknown",
    language: null,
    framework: null,
    install_command: null,
    run_command: null,
    default_port: null,
    warnings: [],
    summary: "",
    ai_description: null,
  };

  const has = (name: string) => existsSync(join(projectPath, name));
  const readJson = (name: string) => {
    try { return JSON.parse(readFileSync(join(projectPath, name), "utf-8")); } catch { return null; }
  };
  const readText = (name: string) => {
    try { return readFileSync(join(projectPath, name), "utf-8"); } catch { return null; }
  };

  // Node.js / JavaScript / TypeScript
  if (has("package.json")) {
    const pkg = readJson("package.json");
    result.language = has("tsconfig.json") ? "TypeScript" : "JavaScript";

    // Detect package manager
    const pm = has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : "npm";
    result.install_command = `${pm} install`;

    if (pkg?.scripts?.dev) {
      result.run_command = `${pm} run dev`;
      result.type = "webapp";
    } else if (pkg?.scripts?.start) {
      result.run_command = `${pm} start`;
      result.type = "webapp";
    } else if (pkg?.scripts?.serve) {
      result.run_command = `${pm} run serve`;
      result.type = "webapp";
    } else if (pkg?.scripts?.build) {
      result.run_command = `${pm} run build`;
      result.type = "library";
    } else if (pkg?.main) {
      result.run_command = `node ${pkg.main}`;
      result.type = "webapp";
    }

    // Detect framework
    const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
    if (deps?.next) result.framework = "Next.js";
    else if (deps?.nuxt) result.framework = "Nuxt";
    else if (deps?.vite) result.framework = "Vite";
    else if (deps?.express) result.framework = "Express";
    else if (deps?.fastify) result.framework = "Fastify";
    else if (deps?.react) result.framework = "React";
    else if (deps?.vue) result.framework = "Vue";
    else if (deps?.svelte) result.framework = "Svelte";

    // Detect port from scripts
    const devScript = pkg?.scripts?.dev ?? pkg?.scripts?.start ?? "";
    const portMatch = devScript.match(/--port\s+(\d+)|-p\s+(\d+)|PORT=(\d+)/);
    if (portMatch) result.default_port = parseInt(portMatch[1] || portMatch[2] || portMatch[3], 10);
    else if (deps?.next) result.default_port = 3000;
    else if (deps?.vite) result.default_port = 5173;
    else result.default_port = 3000;
  }

  // Python
  if (has("requirements.txt") || has("pyproject.toml") || has("setup.py")) {
    result.language = "Python";
    result.install_command = has("requirements.txt") ? "pip install -r requirements.txt" : "pip install -e .";

    const req = readText("requirements.txt") ?? "";
    if (req.includes("flask")) { result.framework = "Flask"; result.default_port = 5000; result.type = "webapp"; }
    else if (req.includes("django")) { result.framework = "Django"; result.default_port = 8000; result.type = "webapp"; }
    else if (req.includes("fastapi")) { result.framework = "FastAPI"; result.default_port = 8000; result.type = "api"; }
    else if (req.includes("streamlit")) { result.framework = "Streamlit"; result.default_port = 8501; result.type = "webapp"; }
    else if (req.includes("gradio")) { result.framework = "Gradio"; result.default_port = 7860; result.type = "webapp"; }

    if (has("main.py")) result.run_command = "python main.py";
    else if (has("app.py")) result.run_command = "python app.py";
    else if (has("manage.py")) result.run_command = "python manage.py runserver";
    else result.run_command = "python -m app";

    // Check for .env requirement
    if (has(".env.example") && !has(".env")) result.warnings.push(".env file required (copy from .env.example)");
  }

  // Go
  if (has("go.mod")) {
    result.language = "Go";
    result.install_command = "go mod download";
    result.run_command = "go run .";
    result.type = "cli";
    result.default_port = 8080;
  }

  // Rust
  if (has("Cargo.toml")) {
    result.language = "Rust";
    result.install_command = "cargo build";
    result.run_command = "cargo run";
    result.type = "cli";
  }

  // Docker
  if (has("docker-compose.yml") || has("docker-compose.yaml") || has("compose.yml")) {
    result.warnings.push("Docker Compose detected — use docker compose up");
    if (!result.run_command) result.run_command = "docker compose up";
    if (!result.type || result.type === "unknown") result.type = "webapp";
  } else if (has("Dockerfile")) {
    result.warnings.push("Dockerfile detected — may need docker build & run");
  }

  // Check for env vars
  const readme = readText("README.md") ?? "";
  const envMatches = readme.match(/[A-Z_]{3,}(?:_KEY|_TOKEN|_SECRET|_API|_URL)\b/g);
  if (envMatches) {
    const unique = [...new Set(envMatches)].slice(0, 5);
    result.warnings.push(`Environment variables may be needed: ${unique.join(", ")}`);
  }

  // Detect port from README
  if (!result.default_port) {
    const readmePortMatch = readme.match(/localhost:(\d{4,5})/);
    if (readmePortMatch) result.default_port = parseInt(readmePortMatch[1], 10);
  }

  // If no run command found, try immediate subdirectories (1 level deep)
  if (!result.run_command && result.type === "unknown") {
    try {
      const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
      const entries = readdirSync(projectPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__") continue;
        const subPath = join(projectPath, entry.name);
        const subResult = analyzeProject(subPath);
        if (subResult.run_command) {
          // Found a runnable subproject — use it but adjust cwd
          result.type = subResult.type;
          result.language = subResult.language;
          result.framework = subResult.framework;
          result.install_command = subResult.install_command ? `cd ${entry.name} && ${subResult.install_command}` : null;
          result.run_command = `cd ${entry.name} && ${subResult.run_command}`;
          result.default_port = subResult.default_port;
          result.warnings = [...result.warnings, ...subResult.warnings, `Running from subdirectory: ${entry.name}/`];
          break;
        }
      }
    } catch { /* ignore readdir errors */ }
  }

  // Summary
  const parts: string[] = [];
  if (result.language) parts.push(result.language);
  if (result.framework) parts.push(result.framework);
  parts.push(result.type);
  result.summary = parts.join(" / ");

  return result;
}

export function registerAppRunnerRoutes({ app, db, broadcast }: { app: Express; db: DatabaseSync; broadcast?: (type: string, payload: unknown) => void }) {
  // Analyze project (file scan + LLM description)
  app.post("/api/apps/:projectId/analyze", async (req, res) => {
    const { projectId } = req.params;
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as { project_path: string; project_type: string; name: string } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });

    try {
      const projectPath = resolveHomePath(project.project_path);
      const analysis = analyzeProject(projectPath);

      // AI description — read key project files and ask LLM for deep analysis
      try {
        const MAX_FILE_CHARS = 2000;
        const readFile = (name: string) => {
          try {
            const fp = join(projectPath, name);
            return existsSync(fp) ? readFileSync(fp, "utf-8").slice(0, MAX_FILE_CHARS) : null;
          } catch { return null; }
        };

        const readme = readFile("README.md");
        const pkgJsonRaw = readFile("package.json");
        // Try to find a main entry file
        const mainEntryNames = ["index.ts", "index.js", "main.ts", "main.js", "src/index.ts", "src/index.js", "src/main.ts", "src/main.js", "app.ts", "app.js", "app.py", "main.py", "src/App.tsx", "src/app.tsx"];
        let mainEntry: string | null = null;
        let mainEntryName: string | null = null;
        for (const name of mainEntryNames) {
          const content = readFile(name);
          if (content) { mainEntry = content; mainEntryName = name; break; }
        }

        // Build context for LLM
        const contextParts: string[] = [];
        if (readme) contextParts.push(`## README.md (first ${MAX_FILE_CHARS} chars)\n${readme}`);
        if (pkgJsonRaw) contextParts.push(`## package.json (first ${MAX_FILE_CHARS} chars)\n${pkgJsonRaw}`);
        if (mainEntry && mainEntryName) contextParts.push(`## ${mainEntryName} (first ${MAX_FILE_CHARS} chars)\n${mainEntry}`);

        // List top-level directory entries for folder structure context
        try {
          const { readdirSync } = require("node:fs") as typeof import("node:fs");
          const entries = readdirSync(projectPath, { withFileTypes: true });
          const listing = entries
            .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "__pycache__" && e.name !== ".git")
            .slice(0, 40)
            .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
            .join("\n");
          if (listing) contextParts.push(`## Top-level directory listing\n${listing}`);
        } catch { /* ignore */ }

        if (contextParts.length > 0) {
          const provider = resolveProvider(db);
          const model = getDefaultModel(provider.providerType);
          const isAnthropic = provider.type === "anthropic";

          // Read language setting
          const langRow = db.prepare("SELECT value FROM settings WHERE key = 'language'").get() as { value: string } | undefined;
          let lang = "en";
          try { const v = langRow ? JSON.parse(langRow.value) : "en"; if (typeof v === "string") lang = v; } catch { /* ignore */ }
          const langLabel: Record<string, string> = { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese" };

          const prompt = loadPrompt("system/project-analysis", {
            projectName: project.name,
            language: analysis.language ?? "unknown",
            framework: analysis.framework ?? "unknown",
            type: analysis.type,
            context: contextParts.join("\n\n"),
            lang: langLabel[lang] ?? "English",
          });

          const url = isAnthropic ? `${provider.baseUrl}/messages` : `${provider.baseUrl}/chat/completions`;
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (isAnthropic) {
            headers["x-api-key"] = provider.apiKey;
            headers["anthropic-version"] = "2023-06-01";
          } else {
            headers["Authorization"] = `Bearer ${provider.apiKey}`;
          }

          const body = isAnthropic
            ? JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
            : JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] });

          const llmRes = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(30_000) });
          if (llmRes.ok) {
            const llmJson = await llmRes.json() as Record<string, unknown>;
            let rawText: string | null = null;
            if (isAnthropic) {
              const content = llmJson.content as Array<{ text: string }> | undefined;
              rawText = content?.[0]?.text?.trim() ?? null;
            } else {
              const choices = llmJson.choices as Array<{ message: { content: string } }> | undefined;
              rawText = choices?.[0]?.message?.content?.trim() ?? null;
            }

            if (rawText) {
              // Split markdown and JSON parts by ---JSON--- separator
              const jsonSep = rawText.indexOf("---JSON---");
              if (jsonSep >= 0) {
                analysis.ai_description = rawText.slice(0, jsonSep).trim();
                const jsonPart = rawText.slice(jsonSep + 10);
                // Extract JSON from code block or raw
                const jsonMatch = jsonPart.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  try {
                    const cmds = JSON.parse(jsonMatch[0]) as {
                      install_command?: string;
                      run_command?: string;
                      default_port?: number;
                      env_vars?: string[];
                      prerequisites?: string[];
                    };
                    // Override static analysis with LLM suggestions
                    if (cmds.install_command) analysis.install_command = cmds.install_command;
                    if (cmds.run_command) analysis.run_command = cmds.run_command;
                    if (cmds.default_port) analysis.default_port = cmds.default_port;
                    if (cmds.env_vars?.length) {
                      for (const e of cmds.env_vars) {
                        if (!analysis.warnings.includes(e)) analysis.warnings.push(e);
                      }
                    }
                    if (cmds.prerequisites?.length) {
                      for (const p of cmds.prerequisites) {
                        if (!analysis.warnings.includes(p)) analysis.warnings.push(`Requires: ${p}`);
                      }
                    }
                    logger.info({ projectId, install: cmds.install_command, run: cmds.run_command }, "[app-runner] LLM provided commands");
                  } catch { /* JSON parse failed — use static analysis */ }
                }
              } else {
                analysis.ai_description = rawText;
              }
            }
          }
        }
      } catch (llmErr) {
        logger.warn({ llmErr, projectId }, "AI description generation failed — continuing with file analysis only");
      }

      const analysisJson = JSON.stringify(analysis);
      db.prepare("UPDATE projects SET app_analysis = ?, app_status = ?, app_port = COALESCE(app_port, ?) WHERE id = ?")
        .run(analysisJson, "analyzed", analysis.default_port, projectId);
      res.json({ ok: true, analysis });
    } catch (err) {
      logger.warn({ err, projectId }, "app analysis failed");
      res.status(500).json({ error: "analysis_failed" });
    }
  });

  // Get app status
  app.get("/api/apps/:projectId/status", (req, res) => {
    const { projectId } = req.params;
    const row = db.prepare("SELECT app_status, app_analysis, app_port, app_pid FROM projects WHERE id = ?").get(projectId) as {
      app_status: string | null; app_analysis: string | null; app_port: number | null; app_pid: number | null;
    } | undefined;
    if (!row) return res.status(404).json({ error: "project_not_found" });

    let analysis = null;
    try { if (row.app_analysis) analysis = JSON.parse(row.app_analysis); } catch { /* ignore */ }

    res.json({
      ok: true,
      status: row.app_status ?? "downloaded",
      analysis,
      port: row.app_port,
      pid: row.app_pid,
      url: row.app_port ? `http://localhost:${row.app_port}` : null,
    });
  });

  // Update port
  app.patch("/api/apps/:projectId/port", (req, res) => {
    const { projectId } = req.params;
    const port = typeof req.body?.port === "number" ? req.body.port : null;
    db.prepare("UPDATE projects SET app_port = ? WHERE id = ?").run(port, projectId);
    res.json({ ok: true, port });
  });

  // Install & Run — execute install_command then run_command via spawn
  const runningProcesses = new Map<string, { pid: number; kill: () => void }>();
  const appLogs = new Map<string, Array<{ ts: number; line: string; phase: string }>>();
  const MAX_LOG_LINES = 500;

  function appendLog(projectId: string, phase: string, line: string) {
    let logs = appLogs.get(projectId);
    if (!logs) { logs = []; appLogs.set(projectId, logs); }
    const ts = Date.now();
    logs.push({ ts, line, phase });
    if (logs.length > MAX_LOG_LINES) logs.splice(0, logs.length - MAX_LOG_LINES);
    // Broadcast via WebSocket for real-time streaming
    if (broadcast) {
      broadcast("project_app_output", { projectId, data: line, phase, ts });
    }
  }

  app.post("/api/apps/:projectId/run", async (req, res) => {
    const { projectId } = req.params;
    const project = db.prepare("SELECT project_path, app_analysis, app_port, name FROM projects WHERE id = ?").get(projectId) as {
      project_path: string; app_analysis: string | null; app_port: number | null; name: string;
    } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });

    const projectPath = resolveHomePath(project.project_path);
    if (!existsSync(projectPath)) {
      return res.status(400).json({ error: "path_not_found", message: `Project path not found: ${projectPath}` });
    }

    let analysis: AnalysisResult | null = null;
    try { if (project.app_analysis) analysis = JSON.parse(project.app_analysis); } catch { /* ignore */ }

    const installCmd = analysis?.install_command;
    const runCmd = analysis?.run_command;
    const requestedPort = typeof req.body?.port === "number" ? req.body.port : (project.app_port ?? analysis?.default_port ?? 3000);

    if (!runCmd) {
      return res.status(400).json({ error: "no_run_command", message: "Run analysis first to detect run command" });
    }

    // Kill existing process if running
    const existing = runningProcesses.get(projectId);
    if (existing) {
      try { existing.kill(); } catch { /* ignore */ }
      runningProcesses.delete(projectId);
    }

    // Port conflict check — find a free port
    const port = await findFreePort(requestedPort);
    if (port !== requestedPort) {
      logger.info({ projectId, requestedPort, actualPort: port }, "[app-runner] port conflict — using alternative");
    }

    // Clear previous logs
    appLogs.delete(projectId);

    db.prepare("UPDATE projects SET app_status = 'installing', app_port = ? WHERE id = ?").run(port, projectId);

    // Respond immediately — installation runs in background
    res.json({ ok: true, port, status: "installing", portChanged: port !== requestedPort });

    // Background: install then run
    const { spawn } = require("node:child_process") as typeof import("node:child_process");
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "/bin/sh";
    const shellFlag = isWin ? "/c" : "-c";

    function startRun() {
      appendLog(projectId, "run", `$ ${runCmd}`);
      db.prepare("UPDATE projects SET app_status = 'running' WHERE id = ?").run(projectId);
      const portEnv = { ...process.env, PORT: String(port) };
      const child = spawn(shell, [shellFlag, runCmd!], { cwd: projectPath, stdio: "pipe", env: portEnv, detached: !isWin });
      const pid = child.pid ?? 0;
      db.prepare("UPDATE projects SET app_pid = ? WHERE id = ?").run(pid, projectId);

      child.stdout?.on("data", (d: Buffer) => {
        for (const l of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "run", l);
      });
      child.stderr?.on("data", (d: Buffer) => {
        for (const l of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "run", l);
      });

      const killFn = () => {
        try {
          if (isWin) {
            spawn("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
          } else {
            process.kill(-pid, "SIGTERM");
          }
        } catch { /* ignore */ }
      };
      runningProcesses.set(projectId, { pid, kill: killFn });

      child.on("close", (code) => {
        runningProcesses.delete(projectId);
        appendLog(projectId, "run", `Process exited (code ${code})`);
        db.prepare("UPDATE projects SET app_status = 'stopped', app_pid = NULL WHERE id = ?").run(projectId);
      });

      logger.info({ projectId, pid, port, runCmd }, "[app-runner] app started");
    }

    // Step 1: Install
    if (installCmd) {
      appendLog(projectId, "install", `$ ${installCmd}`);
      const installChild = spawn(shell, [shellFlag, installCmd], { cwd: projectPath, stdio: "pipe" });

      installChild.stdout?.on("data", (d: Buffer) => {
        for (const l of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "install", l);
      });
      installChild.stderr?.on("data", (d: Buffer) => {
        for (const l of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "install", l);
      });

      installChild.on("close", (code) => {
        if (code === 0) {
          appendLog(projectId, "install", "Install completed successfully");
          startRun();
        } else {
          appendLog(projectId, "install", `Install failed (exit code ${code})`);
          db.prepare("UPDATE projects SET app_status = 'analyzed' WHERE id = ?").run(projectId);
        }
      });

      installChild.on("error", (err) => {
        appendLog(projectId, "install", `Install error: ${err.message}`);
        db.prepare("UPDATE projects SET app_status = 'analyzed' WHERE id = ?").run(projectId);
      });

      const timeout = setTimeout(() => { installChild.kill(); appendLog(projectId, "install", "Install timeout (120s)"); }, 120_000);
      installChild.on("close", () => clearTimeout(timeout));
    } else {
      // No install needed, run directly
      startRun();
    }
  });

  // Get logs (polling)
  app.get("/api/apps/:projectId/logs", (req, res) => {
    const { projectId } = req.params;
    const since = Number(req.query.since) || 0;
    const logs = appLogs.get(projectId) ?? [];
    const filtered = since > 0 ? logs.filter((l) => l.ts > since) : logs;
    res.json({ ok: true, logs: filtered });
  });

  // Stop running app
  app.post("/api/apps/:projectId/stop", (req, res) => {
    const { projectId } = req.params;
    const proc = runningProcesses.get(projectId);
    if (proc) {
      proc.kill();
      runningProcesses.delete(projectId);
    }
    db.prepare("UPDATE projects SET app_status = 'stopped', app_pid = NULL WHERE id = ?").run(projectId);
    res.json({ ok: true });
  });

  // Restart
  app.post("/api/apps/:projectId/restart", async (req, res) => {
    const { projectId } = req.params;
    // Stop first
    const proc = runningProcesses.get(projectId);
    if (proc) { proc.kill(); runningProcesses.delete(projectId); }
    db.prepare("UPDATE projects SET app_status = 'stopped', app_pid = NULL WHERE id = ?").run(projectId);
    // Re-trigger run (forward to run handler)
    // Simple: redirect client to call /run again
    res.json({ ok: true, message: "stopped — call /run to restart" });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Project-level run-app endpoints (used by TerminalTab)
  // These auto-detect and run the project without requiring prior analysis.
  // ─────────────────────────────────────────────────────────────────────────

  app.post("/api/projects/:id/run-app", (req, res) => {
    const projectId = req.params.id;
    const { custom_command } = (req.body ?? {}) as { custom_command?: string };
    const project = db.prepare("SELECT id, project_path, name FROM projects WHERE id = ?").get(projectId) as {
      id: string; project_path: string; name: string;
    } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });
    if (!project.project_path) return res.status(400).json({ error: "no_project_path", message: "Project path not set. Set it in project settings." });

    const projectPath = resolveHomePath(project.project_path);
    if (!existsSync(projectPath)) {
      return res.status(400).json({ error: "path_not_found" });
    }

    // Use custom command if provided, otherwise auto-detect
    const analysis = analyzeProject(projectPath);
    const runCmd = custom_command?.trim() || analysis.run_command;
    if (!runCmd) {
      return res.status(400).json({ error: "no_run_command", message: "Could not detect a run command. Enter a custom command (e.g., npm run dev, python app.py)" });
    }

    // Kill existing process if running
    const existing = runningProcesses.get(projectId);
    if (existing) {
      try { existing.kill(); } catch { /* ignore */ }
      runningProcesses.delete(projectId);
    }

    // Clear previous logs
    appLogs.delete(projectId);

    const { spawn: spawnChild } = require("node:child_process") as typeof import("node:child_process");
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "/bin/sh";
    const shellFlag = isWin ? "/c" : "-c";

    appendLog(projectId, "run", `$ ${runCmd}`);
    if (broadcast) {
      broadcast("project_app_output", { projectId, data: `$ ${runCmd}`, phase: "run", ts: Date.now(), status: "running" });
    }

    const portEnv = { ...process.env, PORT: String(analysis.default_port ?? 3000) };
    const child = spawnChild(shell, [shellFlag, runCmd], { cwd: projectPath, stdio: "pipe", env: portEnv, detached: !isWin });
    const pid = child.pid ?? 0;

    child.stdout?.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "run", line);
    });
    child.stderr?.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "run", line);
    });

    const killFn = () => {
      try {
        if (isWin) {
          spawnChild("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
        } else {
          process.kill(-pid, "SIGTERM");
        }
      } catch { /* ignore */ }
    };
    runningProcesses.set(projectId, { pid, kill: killFn });

    child.on("close", (code) => {
      runningProcesses.delete(projectId);
      appendLog(projectId, "run", `Process exited (code ${code})`);
      if (broadcast) {
        broadcast("project_app_output", { projectId, data: `Process exited (code ${code})`, phase: "exit", ts: Date.now(), status: "stopped" });
      }
    });

    logger.info({ projectId, pid, runCmd }, "[app-runner] project app started via run-app");

    res.json({ ok: true, command: runCmd, pid, summary: analysis.summary });
  });

  app.post("/api/projects/:id/stop-app", (req, res) => {
    const projectId = req.params.id;
    const proc = runningProcesses.get(projectId);
    if (proc) {
      proc.kill();
      runningProcesses.delete(projectId);
      logger.info({ projectId }, "[app-runner] project app stopped via stop-app");
    }
    res.json({ ok: true });
  });

  app.get("/api/projects/:id/app-status", (req, res) => {
    const projectId = req.params.id;
    const proc = runningProcesses.get(projectId);
    const logs = appLogs.get(projectId) ?? [];
    res.json({
      ok: true,
      running: !!proc,
      pid: proc?.pid ?? null,
      logCount: logs.length,
      recentLogs: logs.slice(-50),
    });
  });

  // ── Install App (separate from run) ─────────────────────────────────────
  app.post("/api/projects/:id/install-app", (req, res) => {
    const projectId = req.params.id;
    const { custom_command } = (req.body ?? {}) as { custom_command?: string };
    const project = db.prepare("SELECT id, project_path, name FROM projects WHERE id = ?").get(projectId) as {
      id: string; project_path: string; name: string;
    } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });
    if (!project.project_path) return res.status(400).json({ error: "no_project_path" });

    const projectPath = resolveHomePath(project.project_path);
    if (!existsSync(projectPath)) {
      return res.status(400).json({ error: "path_not_found" });
    }

    const analysis = analyzeProject(projectPath);
    const installCmd = custom_command?.trim() || analysis.install_command;
    if (!installCmd) {
      return res.status(400).json({ error: "no_install_command", message: "Could not detect an install command." });
    }

    // Clear previous logs and start install
    appLogs.delete(projectId);
    appendLog(projectId, "install", `$ ${installCmd}`);

    const { spawn: spawnChild } = require("node:child_process") as typeof import("node:child_process");
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "/bin/sh";
    const shellFlag = isWin ? "/c" : "-c";

    const child = spawnChild(shell, [shellFlag, installCmd], { cwd: projectPath, stdio: "pipe" });

    child.stdout?.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "install", line);
    });
    child.stderr?.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n").filter(Boolean)) appendLog(projectId, "install", line);
    });

    child.on("close", (code) => {
      if (code === 0) {
        appendLog(projectId, "install", "Install completed successfully");
        if (broadcast) {
          broadcast("project_app_output", { projectId, data: "Install completed successfully", phase: "install_done", ts: Date.now(), status: "install_done" });
        }
      } else {
        appendLog(projectId, "install", `Install failed (exit code ${code})`);
        if (broadcast) {
          broadcast("project_app_output", { projectId, data: `Install failed (exit code ${code})`, phase: "install_error", ts: Date.now(), status: "install_error" });
        }
      }
    });

    child.on("error", (err) => {
      appendLog(projectId, "install", `Install error: ${err.message}`);
      if (broadcast) {
        broadcast("project_app_output", { projectId, data: `Install error: ${err.message}`, phase: "install_error", ts: Date.now(), status: "install_error" });
      }
    });

    // Timeout after 180s
    const timeout = setTimeout(() => { child.kill(); appendLog(projectId, "install", "Install timeout (180s)"); }, 180_000);
    child.on("close", () => clearTimeout(timeout));

    logger.info({ projectId, installCmd }, "[app-runner] install started via install-app");
    res.json({ ok: true, command: installCmd });
  });

  // Clean up all running processes on server shutdown
  const cleanupRunningApps = () => {
    for (const [id, proc] of runningProcesses) {
      try { proc.kill(); } catch { /* ignore */ }
      logger.info({ projectId: id }, "[app-runner] killed process on shutdown");
    }
    runningProcesses.clear();
  };
  process.on("SIGINT", cleanupRunningApps);
  process.on("SIGTERM", cleanupRunningApps);
}
