# App Runner Autonomous Execution (AutoRun) Design

> **Status**: Implemented
> **Goal**: When right-clicking "Run App", proceed automatically through **analysis → install → run** without user intervention.

---

## 1. Current Implementation

```
Click app icon → ProjectFolderWindow (same as regular projects: Files, Tasks, Agents, Terminal, Details, Git)

Right-click "Run App"
  → AppRunnerWindow opens (autoRun mode)
  → AI analysis starts automatically (LLM)
  → Analysis complete → Install & Run starts automatically
  → User monitors logs via prompt-based UI
  → On completion, "Open in Browser" + "Stop" buttons displayed
  → Prompt input always visible — user can type instructions at any time
  → On failure, error shown + prompt ready for retry/fix instructions
```

---

## 2. Scope of Changes

### 2-1. uiStore — Add autoRun Flag

```typescript
// Current
appRunnerProjectId: string | null;
openAppRunner: (projectId: string) => void;

// Changed
appRunnerProjectId: string | null;
appRunnerAutoRun: boolean;                          // ← added
openAppRunner: (projectId: string, autoRun?: boolean) => void;  // ← signature changed
```

```typescript
openAppRunner: (projectId, autoRun) => set((s) => {
  const next = new Set(s.openWindows);
  next.add("app-runner");
  return {
    appRunnerProjectId: projectId,
    appRunnerAutoRun: autoRun ?? false,             // ← added
    openWindows: next,
  };
}),
```

### 2-2. AppRunnerWindow — Add autoRun useEffect

```typescript
const { appRunnerProjectId, appRunnerAutoRun } = useUiStore();

// Add after existing state loading useEffect
useEffect(() => {
  if (!appRunnerAutoRun || !appRunnerProjectId) return;
  // Consume flag (run only once)
  useUiStore.getState().clearAppRunnerAutoRun();

  // Start autonomous pipeline
  (async () => {
    try {
      // Step 1: Analyze
      setStatus("analyzing");
      setAnalyzing(true);
      const aRes = await analyzeApp(appRunnerProjectId);
      setAnalysis(aRes.analysis);
      setStatus("analyzed");
      if (aRes.analysis.default_port) setPort(aRes.analysis.default_port);
      setAnalyzing(false);

      // Step 2: Install & Run
      setStatus("installing");
      setRunning(true);
      setLogs([]);
      const rRes = await runApp(
        appRunnerProjectId,
        aRes.analysis.default_port ?? undefined,
      );
      setPort(rRes.port);
      setRunUrl(`http://localhost:${rRes.port}`);
      startLogPoll();
    } catch (err) {
      setAnalyzing(false);
      setRunning(false);
      setRunError(err instanceof Error ? err.message : String(err));
      setStatus("downloaded");
    }
  })();
}, [appRunnerAutoRun, appRunnerProjectId]);
```

### 2-3. Call Sites — Pass autoRun: true

**useDesktopOverlayBlockProps.ts** — Right-click "Run App":

```typescript
onRunApp: (projectId: string) => {
  openAppRunner(projectId, true);  // ← autoRun: true
},
```

**DesktopIconArea.tsx** — Double-click (app type):

```typescript
onClick: () => {
  if (project.project_type === "app") {
    openAppRunner(project.id);  // ← no autoRun (default false)
  } else { ... }
},
```

| Entry Path | autoRun |
|-----------|---------|
| Right-click → "Run App" | `true` (auto analyze + run) |
| Double-click app icon | `false` (manual — for checking already-analyzed state) |
| Dock "+" → Repo Store → Download | `false` (AppRunnerWindow does not open) |

---

## 3. User Experience (UX)

### 3-1. Screen During Autonomous Execution

```
┌─ MoneyPrinterV2 ──────────────────────────── [Analyzing...] ─┐
│                                                               │
│  [GitHub Icon]  MoneyPrinterV2                                │
│                 FujiwaraChoki/MoneyPrinterV2                  │
│                                                               │
│  ── Auto-running ──────────────────────────────────────────── │
│  │ [1/2] Analyzing project...             ████████░░ 80%   │  │
│  │ [2/2] Install & Run                    Waiting          │  │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│                                              [Cancel]         │
└───────────────────────────────────────────────────────────────┘
```

### 3-2. Analysis Complete → Install Starts

```
┌─ MoneyPrinterV2 ──────────────────────────── [Installing...] ─┐
│                                                                │
│  ── Analysis Result ────────────────────────────────────────── │
│  Type: webapp  │  Language: Python  │  Framework: Flask        │
│  Port: 5000                                                    │
│                                                                │
│  ── TERMINAL ────────────────────────────────────────────────  │
│  │ $ pip install -r requirements.txt                        │  │
│  │ Installing collected packages: flask, selenium...        │  │
│  │ Successfully installed 23 packages                       │  │
│  │ $ PORT=5000 python main.py                               │  │
│  │ * Running on http://127.0.0.1:5000                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 3-3. Execution Complete

```
┌─ MoneyPrinterV2 ──────────────────────────── [Running] ───────┐
│                                                                │
│  ● Running   http://localhost:5000                             │
│                                                                │
│  [Open in Browser]  [Stop]  [Restart]                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Error Handling

| Step | On Failure | UI Display |
|------|-----------|------------|
| Analysis | LLM call failure / project path not found | "Analysis failed: {error}" + [Analyze] [Install & Run] buttons enabled |
| Install | npm install failure / timeout (120s) | "Install failed (exit code N)" + show logs + [Retry] button |
| Run | Process exits immediately / port conflict | "Process exited (code N)" + show logs + [Retry] button |

On autonomous execution failure, **falls back to manual mode** — buttons are re-enabled so the user can take direct control.

---

## 5. Implementation Order

| Step | File | Task |
|------|------|------|
| 1 | `src/store/uiStore.ts` | Add `appRunnerAutoRun` state + `clearAppRunnerAutoRun` action |
| 2 | `src/components/windows/AppRunnerWindow.tsx` | Add `autoRun` useEffect — auto pipeline: analyze → run |
| 3 | `src/components/desktop/useDesktopOverlayBlockProps.ts` | Pass `openAppRunner(projectId, true)` in `onRunApp` |
| 4 | TypeScript compile check | `npx tsc -b --noEmit` |

---

## 6. Things That Do NOT Change

- Server APIs (`analyze`, `run`, `stop`) — no changes, used as-is
- Manual buttons in AppRunnerWindow — kept (fallback on autoRun failure)
- App icon double-click — existing behavior maintained (opens without autoRun)
- Repo Store download flow — no changes
