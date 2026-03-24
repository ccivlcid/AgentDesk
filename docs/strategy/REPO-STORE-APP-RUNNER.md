# Repo Store — App Execution Engine Design

> Flow for analyzing → installing → running repositories downloaded from the Repo Store as "apps."
> A completely different lifecycle from regular projects (kickoff → task decomposition).

---

## 1. Core Distinction: Projects vs Apps

| | Regular Project | Repo Store App |
|---|---|---|
| **Creation** | Project creation modal | Repo Store download |
| **Flow** | Kickoff → Task decomposition → Agent execution | Analysis → Installation → Execution |
| **Task Board** | Displayed | **Not displayed** |
| **Desktop** | Folder icon | App icon (green download) |
| **Double-click** | Project folder window | **App runner window** |
| **DB distinction** | `project_type = 'project'` (default) | `project_type = 'app'` |

### DB Changes

```sql
ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'project';
-- 'project' = Regular project (kickoff/tasks)
-- 'app'     = Repo Store app (analysis/installation/execution)
```

### Task Board Filter

Projects with `project_type = 'app'` are **excluded from the list** in the Task Board.

---

## 2. App State Machine

```
Download complete
    │
    ▼
[downloaded]  ←── Desktop icon created
    │
    ├── "Analyze" click ─────────► [analyzing] → [analyzed]
    │                                              │
    └── "Install & Run" click ──► [installing] ──► [installed]
                                                   │
                                               [running] ←→ [stopped]
```

| Status | Description | UI |
|--------|-------------|-----|
| `downloaded` | Clone completed, nothing else done | "Analyze" + "Install & Run" buttons |
| `analyzing` | Agent is analyzing code structure | Spinner + real-time logs |
| `analyzed` | Analysis complete, results displayed | Analysis report + "Install & Run" button |
| `installing` | Installing dependencies | Progress bar + terminal output |
| `installed` | Installation complete, ready to run | "Run" button |
| `running` | Running | Port display + "Stop" + "Open in Browser" |
| `stopped` | Execution stopped | "Restart" button |

### DB Storage

```sql
ALTER TABLE projects ADD COLUMN app_status TEXT DEFAULT NULL;
-- NULL (regular project) | 'downloaded' | 'analyzed' | 'installed' | 'running' | 'stopped'

ALTER TABLE projects ADD COLUMN app_analysis TEXT DEFAULT NULL;
-- JSON: { type, framework, language, run_command, install_command, port, warnings }

ALTER TABLE projects ADD COLUMN app_port INTEGER DEFAULT NULL;
-- User-specified port (NULL means auto-detect)

ALTER TABLE projects ADD COLUMN app_pid INTEGER DEFAULT NULL;
-- PID of the running process (for stop/restart)
```

---

## 3. App Runner Window (AppRunnerWindow)

The window that opens when double-clicking an app icon on the desktop.

### 3-1. First Launch (downloaded state)

```
┌─ MoneyPrinterV2 ──────────────────────────────────────────┐
│                                                            │
│  ● GitHub: FujiwaraChoki/MoneyPrinterV2                    │
│  ★ 20k   Python   ~/Projects/MoneyPrinterV2               │
│                                                            │
│  ┌─ README.md ────────────────────────────────────────┐    │
│  │ # MoneyPrinterV2                                   │    │
│  │ Automate the process of making money online.       │    │
│  │                                                    │    │
│  │ ## Installation                                    │    │
│  │ ```                                                │    │
│  │ pip install -r requirements.txt                    │    │
│  │ cp .env.example .env                               │    │
│  │ ```                                                │    │
│  │ ## Usage                                           │    │
│  │ ```                                                │    │
│  │ python main.py                                     │    │
│  │ ```                                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────┐  ┌─────────────────────────────────┐     │
│  │              │  │                                 │     │
│  │   Analyze    │  │   Install & Run                 │     │
│  │              │  │                                 │     │
│  │  Agent       │  │  Agent reads the README and     │     │
│  │  analyzes    │  │  automatically proceeds from    │     │
│  │  the code    │  │  dependency installation        │     │
│  │  structure   │  │  through execution              │     │
│  │  and writes  │  │                                 │     │
│  │  a report    │  │                                 │     │
│  └──────────────┘  └─────────────────────────────────┘     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3-2. Analysis Results (analyzed state)

```
┌─ MoneyPrinterV2 — Analysis Complete ─────────────────────┐
│                                                            │
│  ┌─ Analysis Results ───────────────────────────────┐     │
│  │                                                    │    │
│  │  Type        Python CLI App                        │    │
│  │  Framework   Flask + Selenium                      │    │
│  │  Dependencies requirements.txt (23 packages)       │    │
│  │  Run Command  python main.py                       │    │
│  │  Default Port 5000                                 │    │
│  │                                                    │    │
│  │  Warnings:                                         │    │
│  │  - OPENAI_API_KEY must be set in .env file         │    │
│  │  - Chrome browser installation required (Selenium) │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  Port  [ 5000  ]                                           │
│                                                            │
│  [Install & Run]                                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3-3. Installing & Running (installing → running)

```
┌─ MoneyPrinterV2 — Running ───────────────────────────────┐
│                                                            │
│  ● Running   http://localhost:5000   PID: 12345            │
│                                                            │
│  ┌─ Terminal ──────────────────────────────────────────┐   │
│  │ [1/3] Installing dependencies...                    │   │
│  │ $ pip install -r requirements.txt                   │   │
│  │ Installing collected packages: flask, selenium...   │   │
│  │ Successfully installed 23 packages                  │   │
│  │                                                     │   │
│  │ [2/3] Configuring environment...                    │   │
│  │ $ cp .env.example .env                              │   │
│  │                                                     │   │
│  │ [3/3] Starting...                                   │   │
│  │ $ PORT=5000 python main.py                          │   │
│  │ * Running on http://127.0.0.1:5000                  │   │
│  │ * Press CTRL+C to quit                              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  [Open in Browser]  [Stop]  [Restart]  [Expand Terminal]   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3-4. Revisit (installed/stopped state)

```
┌─ MoneyPrinterV2 ──────────────────────────────────────────┐
│                                                            │
│  ● Installation Complete   Python   Port: 5000             │
│                                                            │
│  Port  [ 5000  ]  (Available)                              │
│                                                            │
│  [Run]  [View Analysis]  [Terminal]  [Delete]              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Port Management

### 4-1. Auto-Detection

Priority order for agent port detection during analysis:

1. Extract `localhost:XXXX` patterns from README
2. Scan source code for `.listen(PORT)`, `--port`, `EXPOSE` patterns
3. Check `--port` option in `package.json` `scripts.dev`
4. Assign default value 3000 if detection fails

### 4-2. Conflict Prevention

```
Before execution:
  1. Check if the specified port is in use (net.createServer or netstat)
  2. If in use → increment by +1 to find an available port (up to 10 attempts)
  3. If available port found → show notification "5000 in use → changed to 5001"
  4. User can manually enter a port if desired
```

### 4-3. Port Injection Methods

The agent injects the port using the appropriate method based on project type:

| Type | Injection Method |
|------|-----------------|
| Node.js | `PORT=5001 npm run dev` or `--port 5001` |
| Python (Flask) | `FLASK_RUN_PORT=5001 flask run` |
| Python (other) | `PORT=5001 python main.py` |
| Docker | `-p 5001:internal_port` mapping |
| Go | Environment variable or `-port` flag |
| Other | Environment variable `PORT=5001` (universal) |

---

## 5. Agent Analysis Prompt

### Analysis Task

```
Analyze this GitHub repository.

Project path: {project_path}

Respond with JSON for the following items:
{
  "type": "webapp|cli|library|api|ml|other",
  "language": "python|javascript|typescript|go|rust|java|...",
  "framework": "flask|django|express|nextjs|fastapi|...|null",
  "install_command": "pip install -r requirements.txt",
  "run_command": "python main.py",
  "default_port": 5000,
  "env_vars": ["OPENAI_API_KEY", "DATABASE_URL"],
  "warnings": ["Chrome installation required (Selenium)", ".env file configuration required"],
  "summary": "Automated monetization tool using AI. Flask web server + Selenium automation."
}

Refer to README.md, package.json, requirements.txt, Dockerfile, Makefile, etc.
If a port cannot be found, set default_port: null.
```

### Install & Run Task

```
Install and run this project.

Project path: {project_path}
Analysis results: {app_analysis JSON}
Specified port: {app_port}

Steps:
1. Install dependencies: run {install_command}
2. Environment setup: if .env.example exists, copy to .env, check required environment variables
3. Run: PORT={app_port} {run_command}
4. Report the URL once the server starts successfully

If errors occur during execution, analyze the error message and attempt resolution.
You can retry up to 3 times.
```

---

## 6. Process Management

### 6-1. Server Side (ProcessManager)

```typescript
// server/modules/app-runner/process-manager.ts

interface RunningApp {
  projectId: string;
  pid: number;
  port: number;
  command: string;
  startedAt: number;
}

class AppProcessManager {
  private apps = new Map<string, RunningApp>();

  start(projectId: string, command: string, port: number, cwd: string): RunningApp;
  stop(projectId: string): void;
  restart(projectId: string): RunningApp;
  getStatus(projectId: string): RunningApp | null;
  listAll(): RunningApp[];
  stopAll(): void;  // Called on server shutdown
}
```

### 6-2. Process Termination

On Windows, use `taskkill /F /T /PID <pid>` (kills the entire process tree).
On Unix, use `kill -TERM <pid>` → wait 5 seconds → `kill -9 <pid>`.

### 6-3. On Server Restart

When the AgentDesk server restarts, all app processes are terminated.
Projects with `app_status = 'running'` in the DB are reset to `'stopped'` on server startup.

---

## 7. API Design

### `POST /api/apps/:projectId/analyze`

Creates an agent task to analyze the project.

```typescript
// Response
{
  ok: true,
  task_id: string  // Agent task ID (for tracking progress)
}
```

### `POST /api/apps/:projectId/run`

Creates an agent task to install and run the project.

```typescript
// Request
{ port?: number }

// Response
{
  ok: true,
  task_id: string
}
```

### `POST /api/apps/:projectId/stop`

Stops a running app.

```typescript
// Response
{ ok: true }
```

### `POST /api/apps/:projectId/restart`

Restarts an app.

```typescript
// Request
{ port?: number }

// Response
{ ok: true, pid: number, port: number }
```

### `GET /api/apps/:projectId/status`

Queries the app execution status.

```typescript
// Response
{
  ok: true,
  status: "downloaded" | "analyzing" | "analyzed" | "installing" | "running" | "stopped",
  analysis: AppAnalysis | null,
  port: number | null,
  pid: number | null,
  url: string | null  // "http://localhost:5000"
}
```

### `GET /api/apps/running`

List of all currently running apps.

```typescript
// Response
{
  ok: true,
  apps: Array<{ project_id, name, port, pid, url, started_at }>
}
```

---

## 8. File Structure

```
server/
  modules/
    app-runner/
      process-manager.ts    ← App process start/stop/restart
      port-utils.ts         ← Port conflict detection, find available port
      register-routes.ts    ← /api/apps/* route registration

src/
  components/
    app-runner/
      AppRunnerWindow.tsx   ← App runner main window
      AppAnalysisPanel.tsx  ← Analysis results display panel
      AppTerminalPanel.tsx  ← Terminal output panel
      AppControlBar.tsx     ← Run/stop/restart/port settings bar
```

---

## 9. Implementation Order

| Step | Task | Priority |
|------|------|----------|
| 1 | DB migration: `project_type`, `app_status`, `app_analysis`, `app_port`, `app_pid` | Required |
| 2 | Set `project_type = 'app'` when `createProject` from Repo Store | Required |
| 3 | Filter `project_type = 'app'` in Task Board (exclude from list) | Required |
| 4 | `AppRunnerWindow` basic frame (README display + analyze/run buttons) | Required |
| 5 | Desktop app icon double-click → open `AppRunnerWindow` | Required |
| 6 | `POST /api/apps/:id/analyze` — agent analysis task | Required |
| 7 | `POST /api/apps/:id/run` — agent install+run task | Required |
| 8 | `process-manager.ts` — process start/stop | Required |
| 9 | `port-utils.ts` — port conflict detection + auto-change | Required |
| 10 | `AppTerminalPanel` — real-time terminal output | Important |
| 11 | State persistence (run button immediately on revisit) | Important |
| 12 | "Open in Browser" button | Convenience |

---

## 10. Constraints & Risks

| Risk | Mitigation |
|------|------------|
| Agent misjudges the execution method | Show analysis results to user and allow modification |
| Process becomes a zombie | PID tracking + `stopAll()` on server shutdown |
| Port conflict | Auto-detection + suggest available port + allow manual change |
| Secrets like .env needed | Warn during analysis → user configures manually |
| Repo requires Docker | Check Docker installation → provide guidance if not installed |
| Windows/Mac/Linux differences | Branch process termination method (taskkill vs kill) |
