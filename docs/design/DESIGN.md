# AgentDesk UI/UX Design Guide

> **Reference:** Current project implementation (src/styles, src/components/ui, Desktop, MenuBar, Dock, etc.)
> **Updated:** 2026-03-14

---

## 1. Design Philosophy

- **Theme:** Dark by default, light optional. macOS app-style outer chrome + terminal-style inner content.
- **Font:** Global `body` uses `var(--th-font-mono)` (JetBrains Mono). Headings/headers also use mono.
- **Border Radius (Dual-layer):**
  - Chrome (containers): `borderRadius: 10` — panels, modals, cards, app windows.
  - Content (inner elements): `borderRadius: 0` — buttons, inputs, toasts, list items.
  - Avatars & status dots: `borderRadius: 50%`.
- **Glassmorphism:** `backdropFilter: blur(12px)` applied to menu bar, Dock, and app window headers.
- **macOS Traffic Lights:** Header/modal decorations (#ff5f57, #ffbd2e, #27c93f).
- **Colors:** Use only CSS variables (`--th-*`). Inline hex is allowed only for status colors (danger/success/traffic lights).

---

## 2. Design System — Complete CSS Variable Reference

> **Defined in:** `src/styles/index.part01.css`
> **Themes:** `:root` / `[data-theme="dark"]` (default), `[data-theme="light"]` (light)

### 2-1. Fonts

| Variable | Value |
|----------|-------|
| `--th-font-display` | "Sora", "IBM Plex Sans KR", "Segoe UI", sans-serif |
| `--th-font-body` | "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif |
| `--th-font-mono` | "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace |

### 2-2. Backgrounds

| Variable | Dark | Light |
|----------|------|-------|
| `--th-bg-primary` | #0c0c0c | #f5f0e8 |
| `--th-bg-secondary` | #111111 | #ede8de |
| `--th-bg-surface` | #181818 | #faf7f2 |
| `--th-bg-surface-hover` | #1f1f1f | – |
| `--th-bg-header` | #0c0c0c | – |
| `--th-bg-sidebar` | #101010 | #f0ebe2 |
| `--th-bg-elevated` | #1c1c1c | – |

### 2-3. Borders

| Variable | Dark | Light |
|----------|------|-------|
| `--th-border` | #2a2a2a | #d4cfc6 |
| `--th-border-strong` | #3a3a3a | #b8b2a8 |
| `--th-border-accent` | rgba(245,158,11,0.35) | – |

### 2-4. Text

| Variable | Dark | Light |
|----------|------|-------|
| `--th-text-primary` | #e8e8e8 | #1a1a1a |
| `--th-text-secondary` | #888888 | #555555 |
| `--th-text-muted` | #737373 | #706b62 |
| `--th-text-heading` | #f0f0f0 | – |
| `--th-text-accent` | #f59e0b | – |
| `--th-text-code` | #22c55e | – |

### 2-5. Accent (Amber)

| Variable | Dark | Light |
|----------|------|-------|
| `--th-accent` | #f59e0b | #b45309 |
| `--th-accent-dim` | #d97706 | #92400e |
| `--th-accent-glow` | rgba(245,158,11,0.12) | – |
| `--th-accent-border` | rgba(245,158,11,0.28) | – |
| `--th-amber-glow` | rgba(245,158,11,0.15) | – |
| `--th-hover-bg` | rgba(255,255,255,0.04) | – |
| `--th-active-bg` | rgba(255,255,255,0.07) | – |

### 2-6. Input

| Variable | Dark | Light |
|----------|------|-------|
| `--th-input-bg` | #0c0c0c | #faf7f2 |
| `--th-input-border` | #2a2a2a | #d4cfc6 |

### 2-7. Card / Panel

| Variable | Value |
|----------|-------|
| `--th-card-bg` | #181818 |
| `--th-card-border` | #2a2a2a |
| `--th-card-bg-hover` | #1f1f1f |
| `--th-panel-bg` | #111111 |
| `--th-panel-border` | #2a2a2a |
| `--th-label-color` | #737373 |

### 2-8. Danger State

| Variable | Dark | Light |
|----------|------|-------|
| `--th-danger-bg` | rgba(248,81,73,0.1) | – |
| `--th-danger-border` | #f85149 | #cf222e |
| `--th-danger-text` | #f85149 | #cf222e |

### 2-9. Terminal

| Variable | Value |
|----------|-------|
| `--th-terminal-bg` | #010409 |
| `--th-terminal-text` | #e6edf3 |
| `--th-terminal-prompt` | #f59e0b |
| `--th-terminal-success` | #3fb950 |
| `--th-terminal-error` | #f85149 |
| `--th-terminal-info` | #58a6ff |

### 2-10. Miscellaneous

| Variable | Value |
|----------|-------|
| `--th-modal-overlay` | rgba(0,0,0,0.85) |
| `--th-focus-ring` | #f59e0b |
| `--th-focus-ring-shadow` | rgba(245,158,11,0.3) |
| `--th-scrollbar-thumb` | #2a2a2a |
| `--th-scrollbar-thumb-hover` | #3a3a3a |
| `--th-glass-bg` | rgba(255,255,255,0.02) |
| `--th-glass-border` | #2a2a2a |
| `--th-glass-shadow` | rgba(0,0,0,0.9) |
| `--th-green-glow` | rgba(63,185,80,0.12) |
| `--th-red-glow` | rgba(248,81,73,0.12) |

### 2-11. Performance Attribute Badges

| Variable | Value |
|----------|-------|
| `--th-attr-elite` | #22c55e |
| `--th-attr-good` | #86efac |
| `--th-attr-avg` | #fbbf24 |
| `--th-attr-poor` | #f87171 |
| `--th-attr-vlow` | #6e7681 |

### 2-12. Aliases

| Variable | Maps To |
|----------|---------|
| `--th-bg-base` | var(--th-bg-primary) |
| `--th-bg-panel` | var(--th-bg-sidebar) |
| `--th-text` | var(--th-text-primary) |
| `--th-green` | var(--th-terminal-success) |
| `--th-blue` | var(--th-terminal-info) |
| `--th-red` | var(--th-terminal-error) |

### 2-13. Tailwind Mapping (`index.part05.css`)

slate/gray utilities are remapped to `--th-*` variables:
- `bg-slate-950` → `var(--th-bg-primary)`
- `bg-slate-800` → `var(--th-bg-surface)`
- `border-slate-700` → `var(--th-border)`
- `text-slate-100` → `var(--th-text-primary)`
- `bg-blue-600` → `var(--th-accent)` + color #000

---

## 3. Typography

- **Font variables:** `--th-font-display` (Sora), `--th-font-body` (IBM Plex Sans KR), `--th-font-mono` (JetBrains Mono).
  The entire app currently uses `body { font-family: var(--th-font-mono) }`.
- **Sizes:**
  - Section/label: 10px, 700, uppercase, letter-spacing.
  - Nav/body: 12px.
  - Button: 11px, 600, uppercase.
  - Hint: 11px, muted.

---

## 4. Components (based on current implementation)

### 4-1. Button (`src/components/ui/Button.tsx`)

- **Variants:** `primary` | `secondary` | `ghost` | `danger`
- **Primary:** `--th-accent-glow` background, `--th-accent-border` border, `--th-accent` text. On hover: `--th-accent` background, black text.
- **Secondary:** Transparent background, `--th-border-strong` border, `--th-text-secondary`. Hover: `--th-hover-bg`, `--th-text`.
- **Ghost:** Transparent, `--th-text-muted`. Hover: `--th-hover-bg`, `--th-text-secondary`.
- **Danger:** Transparent, `rgba(248,81,73,0.35)` border, `#f85149` text. Hover: `rgba(248,81,73,0.08)` background.
- **Common:** `borderRadius: 0`, `fontFamily: var(--th-font-mono)`, `fontSize: 11px`, `textTransform: uppercase`, `letterSpacing: 0.04em`.

### 4-2. Input (`src/components/ui/Input.tsx`)

- `background: var(--th-input-bg)`, `border: 1px solid var(--th-input-border)`, `borderRadius: 0`, `color: var(--th-text-primary)`, `fontFamily: var(--th-font-mono)`, `fontSize: 12px`, `padding: 6px 10px`.
- Focus: `borderColor: var(--th-accent)`. Error: `borderColor: var(--th-danger-border)`.

### 4-3. FormField (`src/components/ui/FormField.tsx`)

- Label: `// field-name` pattern. `fontFamily: mono`, `fontSize: 10px`, `fontWeight: 700`, `letterSpacing: 0.06em`, `textTransform: uppercase`, `color: var(--th-text-muted)`. Required fields show `*` in accent color.

### 4-4. Modal (`src/components/ui/Modal.tsx`)

- Overlay + inner panel. `width`: sm/md/lg/xl/full. Inner content uses `--th-font-mono`. Supports Escape and focus trap.
- **Chrome:** `borderRadius: 10`, deep `boxShadow`. macOS traffic light decorations (HeaderModalChrome).

### 4-5. Toast (`src/components/ui/Toast.tsx`)

- Variants: `success` | `error` | `warning` | `info`. Sigil (✓✗⚠ℹ) + left accent bar + `--th-bg-elevated` background. `borderRadius: 0`.

### 4-6. ConfirmDialog (`src/components/ui/ConfirmDialog.tsx`)

- Primary button: `--th-accent-glow`, `--th-accent-border`, `--th-accent` (same tone as Button primary).

### 4-7. Dock (`src/components/desktop/Dock.tsx`)

- **Structure:** Bottom-fixed 3 app icons (Orchestration / Library / Settings).
- **Chrome:** `backdropFilter: blur(12px)` glassmorphism, macOS Dock feel.
- **Icons:** Inactive `color: var(--th-text-secondary)`, hover `background: var(--th-hover-bg)`.
  Running (window open) icons show an amber dot below: `background: var(--th-accent)`.
- **Font:** `var(--th-font-mono)`, 11px.

### 4-7b. Desktop Icons (`src/components/desktop/DesktopIcon.tsx`)

- **Structure:** Freely positioned on the desktop. Drag to reposition. Click to open the corresponding window/modal.
- **Style:** Icon box `borderRadius: 10`, `blur(8px)`, `border: 1px solid var(--th-border)`.
- **Label:** 12px text below icon, `var(--th-font-mono)`.

### 4-8. List Pattern

- `border: 1px solid var(--th-border)` + `divide-y divide-[var(--th-border)]` for row separators. Row hover: `hover:bg-[var(--th-hover-bg)]`.

### 4-9. Agent Flow Graph (`src/components/flow-graph/AgentFlowGraph.tsx`) — Implemented

- **Implementation:** Custom SVG + React (no external library).
- **Focus:** Project team agents (agent-centric, not department-centric).
- **Node (AgentNode):** `foreignObject`-based. Chrome: `borderRadius: 10`, shadow. Content: mono font, status bar. Department shown as a small tag.
  - Status borders: idle=`--th-border`, working=`--th-accent` (glow), break=`--th-text-muted`, offline=`--th-danger-border`.
- **Edges:** Bezier curves. delegation=solid, sub-agent=dashed, cross_dept=thick dashed, meeting=amber dashed.
- **Meeting cluster:** Circular area, amber dashed border, grouped attendee agents.
- **Interactions:** Zoom/pan (mouse wheel/drag), node click → agent detail, fit-to-view.
- **Difference from task board:** Task board is "task status"-centric; flow graph is "agent relationship"-centric.
- **Access:** Workflow window (`g w` shortcut) or `[Graph]` toggle inside the AgentManager window.
- Detailed design: `docs/strategy/agent-flow-graph-design.md`.

### 4-10. CommandPalette (`src/components/CommandPalette.tsx`)

- Triggered by `⌘+Shift+K`. z-index: 10100.
- Open app windows (Workflow/Library/Settings), switch projects, search agents/tasks.
- Fuzzy search + keyboard navigation (arrow keys, Enter, Esc).

### 4-11. Chat Panel (`src/components/chat-panel/`)

- 1:1 chat: Conversation with an agent. Task/notice/instruction modes.
- Group chat: Multi-agent group conversation.
- Message streaming, file attachments, search, and pinning.

### 4-12. Terminal Panel (`src/components/terminal-panel/`)

- Real-time streaming of task execution logs.
- Thinking blocks, progress hints, OPS details.
- Pause/resume/intervene/download logs.
- Uses `--th-terminal-*` color variables exclusively.

### 4-13. Decision Inbox (`src/components/DecisionInboxModal.tsx`)

- Manages items awaiting approval. Review/timeout/approval rounds.
- Interactive option selection, additional notes, chat/meeting integration.

---

## 5. Layout — macOS Desktop OS

- **Menu Bar:** `--th-bg-header`, `backdropFilter: blur(12px)`, pinned to top. `MenuBar.tsx`
  - Elements: AgentDesk logo, project selector, CLI cost summary, notification bell 🔔, clock.
- **Desktop:** `--th-bg-primary` background. `Desktop.tsx`
  - Desktop icon area.
- **Dock:** `--th-bg-sidebar`, `backdropFilter: blur(12px)`, pinned to bottom. `Dock.tsx`
  - 3 app icons (Orchestration / Library / Settings), amber dot for running apps.
- **App Windows:** `--th-bg-elevated`, `borderRadius: 10`, `boxShadow: 0 20px 60px rgba(0,0,0,0.9)`. `windows/*.tsx`
  - Window header: traffic lights + window title + tab bar.

---

## 6. Terminal Area

- Execution viewer/CLI output: `--th-terminal-bg`, `--th-terminal-text`, `--th-terminal-prompt`, `--th-terminal-success`, `--th-terminal-error`, `--th-terminal-info`. `font-family: var(--th-font-mono)`.

---

## 7. Rules Summary

| Item | Rule |
|------|------|
| border-radius | Chrome (panels/modals/cards): 10, Content (buttons/inputs/toasts): 0, Avatars/dots: 50% |
| Colors | Use `var(--th-*)`. Hex allowed only for status colors (success/error) |
| Font | `var(--th-font-mono)` throughout the UI |
| Buttons | Use `Button` component with consistent variant and size |
| Form labels | Use `FormField` or `// label` pattern |
| Modals/Toasts | Use `Modal`, `Toast`, `ConfirmDialog` |

---

## 8. Complete Screen Inventory — macOS Desktop OS

### Desktop Icons

| Label | Opens |
|-------|-------|
| Agent Settings | AgentManagerWindow |
| Create Project | ProjectCreateModal |
| Agent CLI | CliWindow |
| Decision Inbox | DecisionInboxModal |
| File Explorer | FileTreeWindow |
| CLI Cost | CliCostWindow |

### Dock App Windows (3)

| Dock | Window Component | Tabs |
|------|-----------------|------|
| Orchestration | `orchestration/OrchestrationWindow.tsx` | Timeline / Logs / Agents / Room |
| Library | `LibraryWindow.tsx` | Skills / Rules / Memory / Hooks |
| Settings | `SettingsWindow.tsx` | General / API / OAuth / CLI / Data / Project Types / Agents |

### Settings Window Tabs (7)

| Tab | Content |
|-----|---------|
| General | Language, theme, company settings |
| API | API provider (Anthropic, OpenAI, etc.) configuration |
| OAuth | OAuth account connection and management |
| CLI | CLI auth, models, usage details |
| Data | Data export/import |
| Project Types | Project type (template) management |
| Agents | Agent and department management |

### Modals / Overlays

**Project:** ProjectCreateModal, ProjectManagerModal, MissingPathPromptDialog, ManualPathPickerDialog, ManualAssignmentWarningDialog
**Task:** DiffModal, TaskReportPopup
**Agent:** AgentFormModal, DepartmentFormModal, AgentDetail (slide panel), AgentStatusPanel
**Terminal:** TerminalPanel (bottom drawer)
**Decision:** DecisionInboxModal
**Library:** CustomSkillModal, LearningModal (Skills), ClassroomOverlay, RuleFormModal, RuleLearningModal, RuleHistoryPanel, MemoryFormModal, MemoryLearningModal, HookFormModal, HookLearningModal, HookHistoryPanel
**Settings:** CategoryFormModal
**Other:** CommandPalette, KeyboardShortcutsGuide, NotificationCenter, TextPreviewModal, ConfirmDialog

---

## 9. Skills Library UI Patterns

> (Merged from legacy `DESIGN_SKILLS.md`)

### 9-1. List Row Pattern

```tsx
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)] overflow-hidden">
  {items.map((item) => (
    <div
      key={item.id}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--th-hover-bg)] transition-colors"
      style={{ fontFamily: "var(--th-font-mono)" }}
    >
      <span className="shrink-0">{/* icon/category */}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--th-text-primary)" }}>{item.name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>{item.meta}</p>
      </div>
      {/* status badge */}
    </div>
  ))}
</div>
```

### 9-2. Status Badge Rules

- `borderRadius: 0`, `fontFamily: var(--th-font-mono)`, `fontSize: 10px`, `textTransform: uppercase`
- Success (green `--th-terminal-success`), Learning (amber `--th-accent`), Error (red `--th-danger-text`), Inactive (`--th-text-muted`)

### 9-3. CLI Prompt Skill Display Format

```
[Skills: TypeScript-Strict Rust-Safety Git-Flow][+3 more]
```

- Label/brackets: `--th-text-muted` / skill name: `--th-text-code` (#22c55e) / overflow: muted
- Sorted by most recently learned/used. 3–4 per line → truncated as `+N more`. Hidden if no skills.

### 9-4. Per-Agent Group Header

- Group header: `--th-text-muted`, 11px, uppercase section label style
- Related components: `SkillsLibrary.tsx`, `SkillHistoryPanel.tsx`

---

## 10. Related Documents

- **UI-SCREENS.md** — Full screen and modal specifications (main screens + 36 overlays).
- **agent-flow-graph-design.md** — Agent flow graph design (detailed SVG specification).
