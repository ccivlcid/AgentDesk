# AgentDesk 2.0 UX Renewal Spec

**Version:** 2.1
**Date:** 2026-03-11
**Purpose:** UX spec covering screens, flows, and components for the 2.0 renewal.
**Core identity:** **CLI Management Tool** — a professional control plane for AI agents that run as CLI processes.
**Prerequisite docs:** [product-design.md](../product-design.md), [DESIGN.md](DESIGN.md), [design-system.md](design-system.md)

---

## 0. Design Philosophy — "CLI Concept"

AgentDesk is not a general-purpose dashboard. It is a **CLI agent management tool** — the operator's cockpit for AI agents that execute as command-line processes (Claude Code CLI, OpenAI CLI, etc.).

The UI should feel like a **professional CLI management interface** — think `k9s`, `lazygit`, `htop`, or a sophisticated terminal multiplexer wrapped in a web shell:

- **Keyboard-first**: Every critical action has a keyboard shortcut
- **Dense, precise information**: Monospace data, tight spacing, status indicators
- **Terminal aesthetic pervasive**: Not just in the execution viewer — the whole app should feel CLI-native
- **Dark theme as default**: The terminal is dark; the control plane mirrors it
- **Command palette as primary navigation**: `Cmd+K` is the power user's home

This does NOT mean ignoring usability. The 7 UX principles still apply — but the *visual language* is that of a professional CLI tool, not a marketing SaaS.

---

## 1. Core UX Principles — "Powerful and Precise"

| Principle | Meaning | CLI Context Example |
|-----------|---------|---------|
| **Plain language first** | Use everyday words before technical jargon. When technical terms are unavoidable, add a tooltip. | "CLI Provider" → keep label, add ⓘ "The AI model service running your agent (e.g., Anthropic, OpenAI)" |
| **One thing at a time** | Each screen has a primary focus; secondary actions are accessible but not dominant. | Task creation: title + description first; advanced options collapsed |
| **Explain the why** | Every input request comes with a one-line reason. | Project path: "The directory where the agent will execute commands." |
| **Empty screens are signposts** | Design the empty state to be informative and actionable. | "No tasks running. Press N to create one." |
| **Progressive disclosure** | Start simple. Show advanced features only when the user is ready. | Agent form: Basic tab → [+ Advanced Settings] collapsed section |
| **Prevent mistakes** | Always confirm before destructive actions. State what cannot be undone. | Modal ConfirmDialog (not browser alert) with explicit consequence |
| **Always show status** | Always show where the user is and what is happening. | Status bar, live indicators, agent process state |

---

## 2. Terminology Guide

| Internal concept | Display label | Tooltip (ⓘ hover) |
|------------------|--------------|-------------------|
| Objective | **Goal** | The high-level outcome the project must achieve. |
| Initiative | **Sub-task** | A concrete unit of work contributing to a goal. |
| Gate | **Review Stage** | A checkpoint before moving to the next phase. |
| Deliverable | **Output** | Something that must be produced by project end. |
| KPI | **Success Metric** | How the project's success will be measured. |
| Category | **Project Type** | A template with goals, metrics, and output templates. |
| Risk | **Risk** | A threat that could block project progress. |
| CLI Provider | **CLI Provider** ⓘ | The AI model service running your agent (e.g., Anthropic → Claude Code, OpenAI → GPT CLI). Term retained; explanation added inline. |
| category_version | (not exposed) | — |
| routing_policy | (not exposed) | — |

> **Rule**: Internal DB field names (snake_case) must never appear in the UI.

---

## 3. Information Architecture

### Navigation Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  [Project Selector ▾]                 [Cmd+K]   │  ← Header
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  Sidebar │              Main Content                   │
│          │                                              │
│ ─ Dashboard                                             │
│ ─ WorkMap                                               │
│ ─ Tasks ▾                                               │
│   ├ Board                                               │
│   ├ Scheduled                                           │
│   └ Deliverables                                        │
│ ─ Agents ▾                                              │
│   ├ Team                                                │
│   └ Heartbeat                                           │
│ ─ Library ▾                                             │
│   ├ Skills                                              │
│   ├ Rules                                               │
│   ├ Memory                                              │
│   └ Hooks                                               │
│ ─ CLI Usage                                             │
│ ─ Settings                                              │
│                                                         │
└──────────┴──────────────────────────────────────────────┘
```

### View Descriptions

| View | Purpose | Primary Action |
|------|---------|----------------|
| **Dashboard** | Project health — Goals, Risks, Outputs, Team | Add goal / Assign agent |
| **WorkMap** | Real-time agent status & activity map | Monitor / Intervene |
| **Tasks > Board** | Kanban task management | Create / Assign / Run task |
| **Tasks > Scheduled** | Cron-based scheduled tasks | Schedule task |
| **Tasks > Deliverables** | File outputs from completed tasks | Review / Download |
| **Agents > Team** | Agent roster management | Create / Edit agent |
| **Agents > Heartbeat** | Agent process monitoring (logs, health) | View logs / Remove |
| **Library** | Skills / Rules / Memory / Hooks shared resources | Add / Learn |
| **CLI Usage** | Token/cost consumption by agent | Monitor spend |
| **Settings** | API keys, OAuth, CLI config, data | Configure |

---

## 4. Screen-by-Screen Spec

### 4-1. Dashboard

**Primary goal:** Project health at a glance.

**Layout:** 2×2 quad panel grid + right sidebar (Agent Activity)

```
┌─────────────────┬─────────────────┬──────────────┐
│  Goals          │  Risks          │              │
│  (Objectives)   │                 │  Agent       │
│                 │                 │  Activity    │
├─────────────────┼─────────────────┤  Panel       │
│  Review Stages  │  Outputs        │              │
│  (Gates)        │  (Deliverables) │              │
│                 │                 │              │
└─────────────────┴─────────────────┴──────────────┘
```

**Panel headers:** Include `?` help button (tooltip explaining purpose + usage example).
**Empty states:** Each panel shows a specific message — not generic "No data".
**Progress:** Always visible (not hover-only).

### 4-2. WorkMap (OfficeView)

**Primary goal:** Real-time visibility of what each agent is doing right now.

**Layout:** Agent cards in a grid. Each card shows:
- Agent avatar + name (mono)
- Current task title (truncated)
- Process status badge: `● RUNNING` / `○ IDLE` / `✕ ERROR`
- Last activity timestamp (relative, mono)
- Click → opens TerminalPanel overlay

**CLI aesthetic:** Status indicators should feel like process monitors. Use `[PID]`, `[STATUS]`, `[ELAPSED]` labels in mono.

### 4-3. TaskBoard

**Primary goal:** Create, assign, and track tasks.

**Views:** Kanban (default) | List

**Kanban columns:** `TODO` / `IN_PROGRESS` / `DONE` / `FAILED`

**Task card:** Title + agent badge + status indicator + priority chip (all in system font; IDs in mono)

**CLI feel:** Task IDs shown as `#1234` in mono. Status badges styled like terminal process states.

### 4-4. Terminal Panel (Execution Viewer)

**Primary goal:** Raw CLI output monitoring and intervention.

**This is the most "CLI" screen** — preserve and enhance:
- JetBrains Mono, dark background `#010409`
- Amber prompt indicator `▶`
- Line-by-line streaming output
- Search bar (`/` to activate, like vim)
- Tabs: Terminal | Minutes | Ops Details

**Intervention panel:** Styled like a terminal prompt — `> [input]` with amber cursor.

### 4-5. Settings

**Structure:** 3 groups (not 8 flat tabs)

| Group | Tabs |
|-------|------|
| **Basic** | General · Project |
| **Integrations** | OAuth · API Keys · CLI Providers |
| **Advanced** | Gateway · Data · Categories |

---

## 5. CLI Concept Implementation Checklist

### Visual

- [ ] Dark theme is default (`#010409` background, `#0d1117` surface)
- [ ] All data/IDs/timestamps in monospace (`var(--th-font-mono)`)
- [ ] Status badges use terminal-style labels: `RUNNING`, `IDLE`, `FAILED`, `DONE`
- [ ] No border-radius on any interactive element (avatars excepted)
- [ ] Amber `#f59e0b` used only for: live indicators, active nav, primary CTA
- [ ] Green `#22c55e` used only for: success states, active/running processes
- [ ] Red `#ef4444` used only for: errors, failed states

### Interaction

- [ ] `Cmd+K` → Command palette (global search + actions)
- [ ] `N` → New item (contextual: new task / new agent)
- [ ] `Escape` → Close modal/panel
- [ ] `?` → Show keyboard shortcut reference
- [ ] `/` → Search (in task board, terminal viewer)
- [ ] `J/K` → Navigate list items (vim-style)

### Feedback

- [ ] All `window.alert()` replaced with Toast
- [ ] All `window.confirm()` replaced with ConfirmDialog
- [ ] API errors always surfaced via Toast (not silenced)
- [ ] Loading states: spinner + disabled button (not blank)

---

## 6. Component Specifications

### 6-1. StatusBadge (CLI-style)

```tsx
// Terminal process state badges
const STATUS_MAP = {
  running:  { bg: "rgba(34,197,94,0.1)",  text: "#22c55e", border: "rgba(34,197,94,0.3)",  label: "● RUNNING" },
  idle:     { bg: "rgba(110,118,129,0.1)",text: "#6e7681", border: "rgba(110,118,129,0.3)",label: "○ IDLE" },
  failed:   { bg: "rgba(239,68,68,0.1)",  text: "#ef4444", border: "rgba(239,68,68,0.3)",  label: "✕ FAILED" },
  done:     { bg: "rgba(34,197,94,0.05)", text: "#6e7681", border: "rgba(34,197,94,0.15)", label: "✓ DONE" },
  pending:  { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "⋯ PENDING" },
};
```

### 6-2. ConfirmDialog

Replaces all 9 `window.confirm()` calls.

```tsx
<ConfirmDialog
  title="Delete Project"
  message="This project and all its data will be permanently deleted. This cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => setOpen(false)}
/>
```

### 6-3. Toast

Replaces all 21 `window.alert()` calls.

```tsx
const { showToast } = useToast();
showToast("Task started successfully", "success");  // auto-close 3s
showToast("Failed to connect to agent", "error");   // auto-close 5s
```

### 6-4. CommandPalette (Future — P1)

```
Cmd+K
┌─────────────────────────────────────────────┐
│ > _                                         │
├─────────────────────────────────────────────┤
│ Recent                                      │
│  ▶ Run task #1234                          │
│  ▶ Open terminal for Agent Alpha           │
│  ▶ New task in Project X                  │
├─────────────────────────────────────────────┤
│ Actions                                     │
│  + New Task           N                    │
│  + New Agent                               │
│  ⚙ Settings          ,                    │
└─────────────────────────────────────────────┘
```

---

## 7. Empty States

All empty states follow this pattern:

```tsx
<div className="flex flex-col items-center justify-center py-12 px-4 text-center"
     style={{ border: "1px dashed var(--th-border)" }}>
  <p className="text-sm font-medium mb-1" style={{ color: "var(--th-text)" }}>
    {title}  {/* e.g., "No tasks yet." */}
  </p>
  <p className="text-[11px] mb-4" style={{ color: "var(--th-text-muted)" }}>
    {description}  {/* e.g., "Press N to create your first task." */}
  </p>
  {actionLabel && (
    <button onClick={onAction} className="px-3 py-1.5 text-xs border border-[var(--th-border)]
                                          hover:bg-[var(--th-hover-bg)] transition-colors"
            style={{ color: "var(--th-text)", fontFamily: "var(--th-font-mono)" }}>
      {actionLabel}
    </button>
  )}
</div>
```

---

## 8. Deprecated Patterns (Do Not Use)

| Pattern | Reason | Replacement |
|---------|--------|-------------|
| `window.alert()` | Browser native, breaks immersion | `useToast()` |
| `window.confirm()` | Not customizable, not themed | `useConfirm()` + `ConfirmDialog` |
| `border-radius > 0` on UI elements | Violates CLI aesthetic | Remove `rounded-*` classes |
| Gradient backgrounds | Not CLI-native | Flat surfaces only |
| `!important` in CSS | Specificity hack | Fix cascade properly |
| Hardcoded `rgba()` colors | Bypasses theme | Use `--th-*` variables |
| `.catch(() => {})` | Silent failures | Always show error toast |
