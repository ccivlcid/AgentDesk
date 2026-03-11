# AgentDesk Screen Review — 2026 Q1

**Date:** 2026-03-11
**Reviewer:** Claude Code
**Design direction:** CLI Concept (see `ux-renewal-2.0.md`, `DESIGN.md`)
**Scope:** All 13 views — visual consistency, UX quality, CLI concept alignment

---

## 0. Summary

| View | CLI Feel | UX Quality | Critical Issues |
|------|----------|------------|-----------------|
| Dashboard | ⚠ Partial | ✅ Good | `rounded` in loading placeholder |
| WorkMap | ✅ Strong | ✅ Good | Activity bars purely decorative |
| TaskBoard | ⚠ Partial | ✅ Good | `.catch(() => {})` silent error |
| Terminal Panel | ✅ Excellent | ✅ Good | None found |
| Agent Manager | ⚠ Partial | ⚠ Fair | 13+ fields visible at once |
| Heartbeat | ⚠ Partial | ⚠ Fair | 6× `alert/confirm` |
| Skills Library | ⚠ Partial | ✅ Good | Alert on import error |
| Memory Library | ⚠ Partial | ✅ Good | Alert on file size |
| Rules Library | ⚠ Partial | ✅ Good | Alert on file size |
| Hooks Library | ⚠ Partial | ✅ Good | Alert on file size |
| CLI Usage | ✅ Good | ✅ Good | 3× `.catch(() => {})` |
| Settings | ⚠ Partial | ⚠ Fair | 8 flat tabs, cognitive overload |
| WorkMap Chat | ⚠ Partial | ✅ Good | — |

---

## 1. Dashboard (`Dashboard2.tsx`)

### What's working
- 2×2 QuadPanel grid is information-dense and appropriate
- `?` help button on each panel (newly added) — excellent progressive disclosure
- Agent Activity panel on the right shows real-time feed
- `ConfirmDialog` + `useToast` used for project deletion ✅
- Category badge in header (project type visible at a glance)

### Issues

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| `LoadingPlaceholder` uses `rounded` class | Low | `Dashboard2.tsx:52` | Remove `rounded`, use no border-radius |
| Empty state button uses `borderRadius: "2px"` | Low | `Dashboard2.tsx:92` | Use `borderRadius: 0` |
| DashTab is inline in the file — no keyboard nav | Medium | `Dashboard2.tsx` | Add keyboard shortcuts for tab switching |
| Project goal (`core_goal`) not prominent in header | Medium | Header area | Show `project.core_goal` as subtitle under project name |

### CLI Concept Alignment
- ✅ Monospace used for badges and IDs
- ⚠ Panel headers use sans-serif — good
- ⚠ No keyboard shortcut to navigate between dashboard panels
- ⚠ No status line showing project summary (e.g., `3 running / 7 done / 2 blocked`)

### Recommendation
Add a **status bar** between header and panels:
```
[Project Alpha]  ●3 running  ○12 done  ✕1 failed  ⋯5 pending
```

---

## 2. WorkMap / OfficeView (`OfficeView.tsx`)

### What's working
- **Best CLI feel in the app** — already terminal-native in style
- Uppercase status labels: `RUNNING`, `IDLE`, `BREAK`, `OFFLINE` ✅
- Monospace agent names + role badges ✅
- Green left-border indicator for running agents ✅
- `↳ task title` pattern for current task is nice CLI shorthand ✅
- Activity bar as a compact progress indicator ✅
- Hover-reveal team add/remove buttons ✅

### Issues

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| Activity bars are decorative (hardcoded %) | Medium | `OfficeView.tsx:34` | Connect to real task progress or remove |
| Agent rows not keyboard-navigable (J/K) | Medium | `AgentRow` component | Add `onKeyDown` for vim-style nav |
| No "offline" dimming explanation | Low | Agent row | Add tooltip: "Agent is not connected" |
| `rounded-full` on unread dot | Low | `OfficeView.tsx:101` | Keep (dots/avatars exempt from border-radius rule) |

### CLI Concept Alignment
- ✅ Strong — this screen already embodies the CLI concept most effectively
- ✅ Status labels are terminal process states
- ✅ Dense information layout

### Recommendation
Add a **header status line** above the agent list:
```
WORKMAP  [Alpha Project]  3 online · 1 running · last updated 12s ago
```

---

## 3. TaskBoard (`TaskBoard.tsx`)

### What's working
- Kanban columns with DnD (dnd-kit) ✅
- Filter bar with dept/type/agent/project/execution filters ✅
- `useConfirm()` for bulk delete ✅
- Gantt chart + Dependency graph views (impressive feature set) ✅
- Collapsible columns + cards ✅

### Issues

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| `.catch(() => {})` on project load | High | `TaskBoard.tsx:166` | Show error toast |
| No keyboard shortcut for "New Task" | Medium | Header | Add `N` key shortcut |
| `viewMode` shows "board" / "gantt" / "dag" — labels not CLI-style | Low | View toggle | Change to: `[BOARD]` / `[GANTT]` / `[DAG]` in mono |
| Task IDs not shown on cards | Low | `TaskCard` | Show `#id` in mono, muted |
| No task count summary per column | Medium | Column header | Show `[3]` count badge in mono next to column title |

### CLI Concept Alignment
- ⚠ Task cards could lean more into CLI style (show task ID, agent PID-style)
- ⚠ Column headers (`TODO`, `IN_PROGRESS`, `DONE`, `FAILED`) should be in monospace uppercase
- ✅ DnD behavior is functional and smooth

### Recommendation
Column header format:
```
┌─────────────────────────┐
│  IN_PROGRESS  [3]       │
├─────────────────────────┤
│  Task card...           │
```

---

## 4. Terminal Panel (`TerminalPanel.tsx`)

### What's working
- **The app's showcase feature** — already excellent CLI implementation
- Dark background (`#010409`), JetBrains Mono ✅
- Streaming log output with follow mode ✅
- Search bar with match count ✅
- Tab system: Terminal | Minutes | Ops Details ✅
- Intervention panel (inject prompt mid-execution) ✅
- Progress hints strip ✅
- Copy + Download log ✅

### Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Search not `/`-activated (vim-style) | Low | Wire `Cmd+F` or `/` to open search |
| Intervention section visible even when not running | Medium | Hide intervention when task is not `in_progress` |
| OpsDetails panel header not consistent with rest of UI | Low | Apply same panel header style |

### CLI Concept Alignment
- ✅ Strongest CLI-concept screen in the app
- ✅ Amber prompt indicator, monospace, dark BG
- 💡 Add vim-style `/` search activation

---

## 5. Agent Manager (`AgentManager.tsx`)

### What's working
- Tabs: Agents | Departments ✅
- Search filter ✅
- Department-based filtering ✅
- Drag-to-reorder departments ✅
- `ConfirmDialog` for agent deletion (partially) ✅

### Issues

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| Agent form has 13+ fields visible at once | High | `AgentFormModal.tsx` | Split into Basic / [+ Advanced] |
| 5× `alert()` in `DepartmentFormModal` | High | `DepartmentFormModal.tsx:151-182` | Replace with Toast |
| 1× `alert()` in `AgentFormModal` (image size) | Medium | `AgentFormModal.tsx:100` | Replace with inline validation message |
| CLI Provider: no explanation | Medium | `AgentFormModal` | Add ⓘ: "The AI model service (e.g., Anthropic = Claude Code)" |
| Agent cards not keyboard-navigable | Low | Agent list | Add J/K navigation |

### CLI Concept Alignment
- ⚠ The agent form is the least CLI-like screen
- ⚠ Too many fields visible at once — opposite of progressive disclosure
- 💡 Agent list rows should show agent ID in mono (`#ag-001`) and status

---

## 6. Heartbeat (`HeartbeatPanel.tsx`)

### What's working
- Process log monitoring ✅
- Watchlist concept is good for monitoring agents ✅
- Real-time log streaming ✅

### Issues

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| 6× `alert/confirm` (lines 492, 499, 611, 618, 691, 698) | High | `HeartbeatPanel.tsx` | Replace all with Toast + ConfirmDialog |
| Log list not searchable | Medium | Heartbeat log view | Add `/` search |
| No bulk action keyboard shortcut | Low | — | Add `D` for delete selected |

### CLI Concept Alignment
- ✅ Log display is already terminal-like
- ✅ Watchlist concept is like `top` / `ps aux`
- 💡 Add process-style header: `PID  AGENT  STATUS  CPU  UPTIME`

---

## 7. Library Views (Skills / Rules / Memory / Hooks)

### General Pattern
All four follow the same pattern: Category bar → Grid → Form modal. Consistent ✅

### Issues (across all four)

| Issue | Severity | Fix |
|-------|----------|-----|
| `alert()` on file size validation | Medium | Inline validation message |
| `alert()` on custom skill import error | High | Toast with i18n |
| Grid cards use `rounded` in some places | Low | Remove `rounded-*` |
| Category bar filtering is click-only | Low | Add keyboard shortcut to cycle categories |

### CLI Concept Alignment
- ✅ Lists use `border + divide-y` pattern ✅
- ✅ Status badges on skill/memory items ✅
- ⚠ Some cards still use rounded corners from older code

---

## 8. CLI Usage (`CliUsagePanel.tsx`)

### What's working
- Token count display per agent ✅
- Cost calculation ✅
- Usage trend chart ✅
- CLI-appropriate monospace for numbers ✅

### Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| 3× `.catch(() => {})` | High | Show error toast on data load failure |
| No keyboard refresh shortcut | Low | Add `R` to refresh usage data |

### CLI Concept Alignment
- ✅ This screen already feels like a CLI monitoring tool
- 💡 Show data as a table with `AGENT_ID  MODEL  TOKENS  COST  LAST_USED` columns

---

## 9. Settings (`SettingsPanel.tsx`)

### What's working
- 8 tabs covering different configuration areas ✅
- OAuth connection cards ✅
- Toast feedback on save ✅

### Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| 8 flat tabs = cognitive overload | Medium | Group into 3: Basic / Integrations / Advanced |
| `window.confirm()` for OAuth deletion | High | `SettingsPanel.tsx:382` — replace with ConfirmDialog |
| `window.confirm()` for data reset | High | `DataSettingsTab.tsx:70` — replace with ConfirmDialog |
| No keyboard navigation between tabs | Low | `Tab` key to cycle, `Enter` to activate |

### CLI Concept Alignment
- ⚠ Settings feel like a standard SaaS settings page
- 💡 Could add a `~/.agentdesk/config` file view for power users

---

## 10. Design System Consistency Issues (Global)

Found across multiple screens:

| Issue | Count | Fix |
|-------|-------|-----|
| `rounded` / `rounded-*` on UI elements (not avatars) | ~15 | Remove |
| `borderRadius: "2px"` in inline styles | ~8 | Change to `0` |
| Hardcoded `rgba()` not using `--th-*` variables | 313 | Long-term: replace with CSS vars |
| `!important` in CSS | 380 | Long-term: fix cascade |

---

## 11. Priority Action Plan

### P0 — Fix Immediately (breaks core experience)

1. Replace remaining `window.alert()` — 21 places (see `ux-audit-2026-q1.md` appendix)
2. Replace remaining `window.confirm()` — 9 places
3. Fix `.catch(() => {})` silenced errors — 12 places

### P1 — Next Sprint (CLI concept + UX quality)

4. **AgentManager**: Split agent form into Basic / Advanced (2 steps)
5. **TaskBoard**: Show task IDs in mono, column count badges, `N` shortcut
6. **Global**: Remove all `rounded-*` from non-avatar elements
7. **Dashboard**: Add status summary line (running/done/failed counts)
8. **WorkMap**: Connect activity bars to real data

### P2 — Backlog (enhancement)

9. Command palette (`Cmd+K`) — primary power-user navigation
10. Keyboard navigation (J/K) for agent list, task list
11. Settings restructure: 8 tabs → 3 groups
12. Terminal panel: `/` search activation (vim-style)
13. Heartbeat: process-style header row

### P3 — Long-term

14. CSS cleanup: `!important` (380) + hardcoded `rgba()` (313)
15. URL-based routing (deep linking)
16. Mobile responsive overhaul
17. State management refactor (App.tsx 60+ useState)
