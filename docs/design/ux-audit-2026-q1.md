# AgentDesk UX Comprehensive Audit Report — 2026 Q1

**Version:** 1.1
**Date:** 2026-03-11
**Reference Documents:** [product-design.md](../product-design.md), [ux-renewal-2.0.md](ux-renewal-2.0.md), [design-system.md](design-system.md), [DESIGN.md](DESIGN.md)

---

## 0. Audit Criteria

### Product Definition

> **AgentDesk is a CLI Agent Management Tool — a professional control plane for AI agents that execute as CLI processes.**

The design identity is **CLI Concept**: the UI should feel like a sophisticated terminal management interface (k9s, lazygit, htop-class) rather than a marketing SaaS dashboard. This audit evaluates the current state against both usability principles and the CLI concept design direction.

### Design Direction Update (2026-03-11)

| Dimension | Old Direction | New Direction (CLI Concept) |
|-----------|---------------|-----------------------------|
| Visual identity | Game/simulator aesthetic | CLI management tool — dark, dense, precise |
| Typography | Mixed (mono everywhere) | Sans-serif UI layer + mono for data/IDs/status |
| Interaction model | Click-first | Keyboard-first (`Cmd+K`, `N`, `J/K`, `/`) |
| Status display | Varied approaches | Terminal process states: `RUNNING`, `IDLE`, `FAILED` |
| Empty states | Generic messages | Actionable with keyboard hint ("Press N to create") |
| Feedback | `window.alert/confirm` | Toast + ConfirmDialog (themed, non-blocking) |

### 7 UX Principles (`ux-renewal-2.0.md`)

| # | Principle | Core Idea |
|---|-----------|-----------|
| 1 | **Plain Language First** | Use everyday language over jargon. If technical terms are unavoidable, explain them inline. |
| 2 | **One Thing at a Time** | One user action per screen. |
| 3 | **Explain Why** | Every input request should include one line explaining the reason. |
| 4 | **Empty State = Guidance** | Screens with no data should be the most helpful. |
| 5 | **Progressive Disclosure** | Start simple; surface advanced features only when the user is ready. |
| 6 | **Error Prevention** | Confirm before destructive actions. Explicitly state when something cannot be undone. |
| 7 | **Always Show State** | Always communicate where the user is and what is happening. |

### Audit Scope

- All front-end code (TSX components, CSS styles, i18n)
- 7 core user journeys
- Accessibility, mobile responsiveness, and design system consistency

---

## 1. Current UX Issues — Diagnosis by User Journey

### Journey A: Project Creation (Onboarding)

| Item | Current State | Violated Principle | Severity |
|------|---------------|--------------------|----------|
| Category selection → Basic info (2 steps) | Follows principle ✅ | — | — |
| Project path input (`~/projects/...`) | Technical barrier for non-developers | #1 Plain Language First | High |
| Dashboard empty state when no category exists | Guidance message present but CTA is weak | #4 Empty State = Guidance | Medium |
| Auto-generated project path logic | May break with non-ASCII (e.g., Korean) characters | #6 Error Prevention | Low |

**Code locations:**
- `src/components/project-create-modal/ProjectCreateModal.tsx` — project creation modal
- `src/components/dashboard/Dashboard2.tsx` — empty state WelcomeScreen

---

### Journey B: Agent Team Setup

| Item | Current State | Violated Principle | Severity |
|------|---------------|--------------------|----------|
| Agent creation form with 13+ fields | All fields exposed on one screen | #5 Progressive Disclosure | High |
| CLI provider selection (Anthropic, OpenAI, etc.) | No explanation or tooltip for the term | #3 Explain Why | Medium |
| Avatar file size validation | Uses `alert()` | #6 Error Prevention (UX substandard) | High |
| Agent deletion confirmation | Uses `window.confirm()` | #6 Error Prevention (UX substandard) | High |
| Department management errors | Uses `alert()` in 5 places | #6 Error Prevention (UX substandard) | High |

**Code locations:**
- `src/components/agent-manager/AgentFormModal.tsx:100` — alert (image size)
- `src/components/AgentDetail.tsx:288` — window.confirm (delete)
- `src/components/agent-manager/DepartmentFormModal.tsx:151,153,178,180,182` — alert in 5 places

---

### Journey C: Task Execution (Task Management)

| Item | Current State | Violated Principle | Severity |
|------|---------------|--------------------|----------|
| Task creation | 2 clicks, acceptable ✅ | — | — |
| Drag-and-drop status change | Acceptable ✅ (@dnd-kit) | — | — |
| Bulk delete confirmation | Uses `window.confirm()` | #6 Error Prevention (UX substandard) | High |
| Silent failure on API error | `.catch(() => {})` | #7 Always Show State | Critical |
| Task run/stop/pause/resume failure | Uses `window.alert()` in 4 places | #6 Error Prevention (UX substandard) | High |
| Cost limit exceeded notification | Uses `alert()` (English hardcoded) | #1 Plain Language First, #6 Error Prevention | High |
| Project list load failure | Error silently ignored | #7 Always Show State | High |
| Loading state | Missing in some places (no spinner) | #7 Always Show State | Medium |

**Code locations:**
- `src/app/useAppActions.ts:193,329,379,412,429` — alert in 5 places (task execution errors, cost limit)
- `src/components/TaskBoard.tsx:323` — window.confirm (bulk delete)
- `src/components/TaskBoard.tsx` — .catch(() => {})
- `src/components/taskboard/CreateTaskModal.tsx` — .catch(() => {})

---

### Journey D: Decision Making (Decision Inbox)

| Item | Current State | Violated Principle | Severity |
|------|---------------|--------------------|----------|
| Option selection UI | Numbered buttons + multi-select, acceptable ✅ | — | — |
| Empty selection validation | Uses `window.alert()` | #6 Error Prevention (UX substandard) | High |
| Submission loading state | "Sending..." text, acceptable ✅ | — | — |

**Code locations:**
- `src/components/DecisionInboxModal.tsx:164` — window.alert (validation)

---

### Journey E: Settings & Integrations

| Item | Current State | Violated Principle | Severity |
|------|---------------|--------------------|----------|
| 8 tabs | Cognitive overload | #5 Progressive Disclosure | Medium |
| OAuth account deletion | Uses `window.confirm()` | #6 Error Prevention (UX substandard) | High |
| Data reset | Uses `window.confirm()` | #6 Error Prevention (UX substandard) | High |
| Save success feedback | 2-second toast, acceptable ✅ | — | — |

**Code locations:**
- `src/components/SettingsPanel.tsx:382` — window.confirm (OAuth deletion)
- `src/components/settings/DataSettingsTab.tsx:70` — window.confirm (data reset)

---

### Journey F: Library Management (Memory, Rules, Hooks, Skills)

| Item | Current State | Violated Principle | Severity |
|------|---------------|--------------------|----------|
| File size validation | Uses `alert()` (memory, rules, hooks) | #6 Error Prevention (UX substandard) | Medium |
| Custom skill import error | Hardcoded English alert | #1 Plain Language First, #6 Error Prevention | High |
| Chat history deletion | Uses `window.confirm()` | #6 Error Prevention (UX substandard) | Medium |

**Code locations:**
- `src/components/memory/MemoryFormModal.tsx:195` — alert (file size)
- `src/components/agent-rules/RuleFormModal.tsx:192` — alert (file size)
- `src/components/hooks/HookFormModal.tsx:244` — alert (file size)
- `src/components/skills-library/CustomSkillSection.tsx:42,49` — alert (English hardcoded)
- `src/components/chat-panel/ChatPanelHeader.tsx:112` — window.confirm (history deletion)

---

### Journey G: Heartbeat (Agent Monitoring)

| Item | Current State | Violated Principle | Severity |
|------|---------------|--------------------|----------|
| Watchlist removal confirmation | Uses `window.confirm()` | #6 Error Prevention (UX substandard) | Medium |
| Log deletion confirmation | Uses `window.confirm()` | #6 Error Prevention (UX substandard) | Medium |
| Error display on failure | Uses `window.alert()` | #7 Always Show State (UX substandard) | Medium |

**Code locations:**
- `src/components/office-view/HeartbeatPanel.tsx:492,499,611,618,691,698` — confirm/alert in 6 places

---

### Technical Issues (Global)

| Issue | Count | Impact |
|-------|-------|--------|
| `window.alert()` | **21 places** | Browser-native dialogs destroy the product experience |
| `window.confirm()` | **9 places** | Non-standard confirmation dialogs, not customizable |
| `.catch(() => {})` (silenced errors) | **12 places**, 8 files | Failures with no user feedback |
| `!important` | **380 occurrences** | Degrades CSS maintainability and predictability |
| Hardcoded rgba() | **313 instances** | Bypasses theme variable system, risks inconsistency |
| Mobile media queries | **8** | Insufficient responsive design coverage |
| ARIA attributes | **Nearly absent** | Lack of screen reader and keyboard accessibility |
| `console.error` (in production) | **105+ places** | Users cannot detect errors without developer tools |
| App.tsx `useState` hooks | **60+** | Extreme root component state complexity, prop drilling |
| AppMainLayout props | **58** | Excessive parameter passing |
| Modal implementations | **28** | Many do not use the shared Modal primitive |
| URL routing | **None** | Deep linking, bookmarking, and back-navigation unsupported |
| Breadcrumbs | **None** | Difficult to understand current location |
| Responsive code | **16 places** | Mobile optimization is effectively absent |

---

## 2. Root Cause Analysis

| Cause | Affected Scope | Description |
|-------|---------------|-------------|
| **No unified feedback system** | All journeys | No shared Toast/ConfirmDialog system, so `window.alert/confirm` is used as a fallback |
| **Immature design system** | Global | Shared UI primitives (Modal, Button, etc.) were only recently created; older code has per-component ad-hoc styling |
| **No error handling strategy** | Journeys B–G | No consistent pattern for handling API failures; `.catch(() => {})` is the de facto approach |
| **Tailwind v4 migration in progress** | CSS | Conflicts between CSS variable-based tokens and legacy utility classes lead to overuse of `!important` |
| **Retro terminal theme specificity** | CSS | Removing glassmorphism, flattening border-radius, etc. requires large numbers of overrides |
| **Mobile treated as secondary** | Layout | Desktop-first design; responsive support is patch-level |
| **No explanations for technical terms** | Journeys A, B | CLI provider (the AI model vendor, e.g., Anthropic, OpenAI) and similar terms lack explanations or tooltips, making them opaque to non-developers |
| **Root state overload** | Global | 60+ useState hooks in App.tsx, 58 props in AppMainLayout → degraded maintainability and performance |
| **No URL routing** | Navigation | Pure state-based view switching → deep linking, bookmarking, and back-navigation impossible |
| **Modal standardization incomplete** | Global | Many of the 28 modals are independently implemented and do not use the shared Modal primitive |

---

## 3. UX Improvement Strategy — Impact × Effort Matrix

### Priority Definitions
- **P0 (Immediate):** Directly damages the core product experience
- **P1 (Next sprint):** Violates the "anyone can use it easily" principle; reasonable effort to fix
- **P2 (Backlog):** Meaningful improvement but requires significant effort
- **P3 (Long-term):** Maintainability improvements

| Improvement Item | Related Principle | Impact | Effort | Priority |
|-----------------|-------------------|--------|--------|----------|
| Build ConfirmDialog/Toast system | #6 Error Prevention, #7 Always Show State | ★★★ | ★☆☆ | **P0** |
| Consistent API error feedback | #7 Always Show State | ★★★ | ★★☆ | **P0** |
| Progressive disclosure for agent form | #5 Progressive Disclosure | ★★☆ | ★☆☆ | **P1** |
| Add explanations/tooltips for technical terms (CLI provider, etc.) | #3 Explain Why | ★★☆ | ★☆☆ | **P1** |
| Unified empty state (EmptyState) guidance | #4 Empty State = Guidance | ★★☆ | ★☆☆ | **P1** |
| Accessibility (ARIA, keyboard navigation) | "Anyone can use it" | ★★★ | ★★☆ | **P1** |
| Inline feedback for form validation | #3 Explain Why | ★★☆ | ★☆☆ | **P1** |
| Restructure settings from 8 tabs → 3 groups | #5 Progressive Disclosure | ★☆☆ | ★☆☆ | **P2** |
| Full mobile responsive overhaul | "Anyone can use it" | ★★☆ | ★★★ | **P2** |
| Migrate remaining 28 modals → shared Modal | (Consistency) | ★★☆ | ★★☆ | **P2** |
| Introduce URL-based routing (deep linking, back-navigation) | #7 Always Show State | ★★☆ | ★★★ | **P2** |
| State management refactor (App.tsx 60+ useState) | (Maintainability / Performance) | ★★☆ | ★★★ | **P3** |
| Clean up CSS !important / rgba hardcoding | (Maintainability) | ★☆☆ | ★★★ | **P3** |

---

## 4. Layout Improvements

### Current Structure (retained)

```
┌──────────┬───────────────────────────────────┐
│          │ [Header: Logo + View Title + Actions] │
│ Sidebar  ├───────────────────────────────────┤
│ (Nav)    │                                   │
│          │        Main Content Area          │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

### Proposed Improvements

| Area | Current | Proposed |
|------|---------|----------|
| Header "Tasks" button | Duplicates sidebar "Task Management" | Differentiate header button as "Tasks" or icon-only |
| Dashboard empty state | WelcomeScreen present but minimal | Strengthen CTA: "Ready to add your first goal?" + large button |
| Settings tabs | 8 horizontal tabs (General, CLI, OAuth, API, Gateway, Data, Categories, Project) | 3 groups: **Basic** (General · Project) / **Integrations** (OAuth · API · CLI) / **Advanced** (Gateway · Data · Categories) |
| Mobile sidebar | Hamburger toggle | Overlay drawer + outside-click / swipe-to-close |

---

## 5. Component Improvements

### 5-1. New Primitives

#### ConfirmDialog

Replaces all 25 uses of `window.confirm()` / `window.alert()`.

```
┌────────────────────────────────────────┐
│ ⚠ Are you sure you want to delete?     │
│                                        │
│ 3 tasks will be permanently deleted.   │
│ This action cannot be undone.          │
│                                        │
│              [Cancel]  [Delete]        │
└────────────────────────────────────────┘
```

- Built on top of the existing `src/components/ui/Modal.tsx`
- Props: `title`, `message`, `confirmLabel`, `cancelLabel`, `variant` (danger/warning/info)
- i18n support (uses `t` function)

#### Toast / Snackbar

For API success and failure feedback.

```
┌──────────────────────────────────┐
│ ✓ Saved successfully             │  ← Auto-closes after 3 seconds
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✕ Save failed. Please try again. │  ← Auto-closes after 5 seconds
└──────────────────────────────────┘
```

- `createPortal` + `position: fixed` (bottom-center)
- Context-based management (`useToast` hook)
- Reference the existing `src/components/NotificationCenter.tsx` pattern

#### EmptyState

A unified pattern for empty-screen guidance.

```
┌────────────────────────────────────────┐
│                                        │
│               📋                       │
│       No goals yet.                    │
│   Ready to add your first goal?        │
│                                        │
│         [ + Add a Goal ]               │
│                                        │
└────────────────────────────────────────┘
```

- Props: `icon`, `title`, `description`, `actionLabel`, `onAction`

### 5-2. Existing Component Improvements

#### Agent Creation Form — Progressive Disclosure

**Current:** 13+ fields all visible on one screen (2-column layout)

**Proposed:** Split into 2 steps

| Step | Fields | Notes |
|------|--------|-------|
| Step 1 (Basic) | Name (EN), Name (KO), emoji, department, role | Minimum information required to create an agent |
| Step 2 (Advanced, collapsed) | CLI provider (AI model vendor, e.g., Anthropic, OpenAI), persona, avatar | Expanded on "Open advanced settings" click |

**Code location:** `src/components/agent-manager/AgentFormModal.tsx`

#### Project Path — Lowering the Technical Barrier

**Current:** User manually types `~/projects/project-name`

**Proposed:**
- Keep auto-generation of default value (same as current)
- Add explanatory text above the input field: "This is the folder where the agent will work. You can keep the default value."
- Future: Native folder picker integration (when migrating to Electron/Tauri)

---

## 6. Interaction Improvements

### 6-1. Destructive Action Flow

**Current:** `window.confirm("Are you sure you want to delete?")` → immediately executes

**Proposed:**
1. User clicks the delete button
2. ConfirmDialog modal appears (explicitly states the action cannot be undone)
3. User confirms → loading indicator shown → API call made
4. Success → Toast ("Deleted successfully") + UI updated
5. Failure → Toast ("Deletion failed")

### 6-2. Consistent API Call Feedback

**Current:** `.catch(() => {})` — failure produces no feedback whatsoever (12 places, 8 files)

**Proposed:** Add error toast to every API call

Files to update:
- `src/app/AppMainLayout.tsx` — 1 place
- `src/components/NotificationCenter.tsx` — 3 places
- `src/components/dashboard/AgentActivityPanel.tsx` — 1 place
- `src/components/TaskBoard.tsx` — 1 place
- `src/components/taskboard/CreateTaskModal.tsx` — 1 place
- `src/components/settings/GitHubOAuthAppConfig.tsx` — 1 place
- `src/components/project-create-modal/RecommendedSkillsSection.tsx` — 1 place
- `src/components/office-view/CliUsagePanel.tsx` — 3 places

### 6-3. Loading State Standardization

| Situation | Current | Proposed |
|-----------|---------|----------|
| After button click, API call in flight | Only some buttons are disabled | Consistently disabled + label change ("Saving...") |
| Panel data loading | Some have skeletons, some show blank | Unified skeleton placeholder |
| View transitions | framer-motion fade, acceptable ✅ | Retain as-is |

### 6-4. Keyboard Shortcuts (Future)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Global search |
| `Cmd/Ctrl + N` | New item (contextual to the current view) |
| `Escape` | Close modal/panel (already implemented ✅) |

---

## 7. Mobile UX Improvements

### Current State

- Only **8** media queries used (across 4,934 lines of CSS)
- Sidebar: mobile hamburger toggle present but not optimized
- Task board: multiple columns require horizontal scrolling on mobile
- Touch targets: some buttons are smaller than 44px

### Proposed Improvements

| Area | Current | Proposed |
|------|---------|----------|
| Breakpoints | Ad-hoc (639, 1023, 1279px) | Standardize: sm(640), md(768), lg(1024), xl(1280) |
| Sidebar | Simple toggle | Overlay drawer + outside-click / swipe-to-close |
| Task board | Multi-column horizontal scroll | Single column + left/right swipe to switch |
| Agent cards | Grid layout | Stacked (vertical list) |
| Touch targets | Non-standard | Minimum 44×44px |
| Dashboard | 2×2 grid | Vertical stack (1 column) |

---

## 8. Front-End Implementation Proposals

### P0: ConfirmDialog + Toast System

**New files:**

| File | Description |
|------|-------------|
| `src/components/ui/ConfirmDialog.tsx` | Modal-based confirmation dialog |
| `src/components/ui/Toast.tsx` | Portal-based toast notifications |
| `src/hooks/useToast.ts` | Context + hook for toast management |

**Existing code to leverage:**
- `src/components/ui/Modal.tsx` — foundation for ConfirmDialog
- `src/components/ui/Button.tsx` — confirm/cancel buttons
- `src/components/NotificationCenter.tsx` — notification pattern reference

**Replacement targets:** `window.alert` (21 places) + `window.confirm` (9 places) = **30 places total**

### P1: Progressive Disclosure + Plain Language + Empty States

**Agent form refactor:**
- `src/components/agent-manager/AgentFormModal.tsx` — split into 2 steps (Basic / Advanced)
- Advanced settings collapsed using `<details>` or a toggle button

**Unified empty states:**
- Create `src/components/ui/EmptyState.tsx`
- Apply to dashboard, task board, agent list, and other empty states

**Plain language for technical terms:**
- Apply terminology guide from `ux-renewal-2.0.md` §2
- Add ⓘ tooltip explanations for technical terms such as CLI provider (the AI model vendor, e.g., Anthropic, OpenAI) — the terms themselves are retained

### P1: Accessibility

**Can be applied immediately:**
- Add `aria-label` to all icon-only buttons
- Add `role="listbox"` + `aria-expanded` to custom `<select>` elements
- `prefers-reduced-motion` media query already present in CSS ✅

**Already completed:**
- Skip-to-content link ✅ (`src/app/AppMainLayout.tsx`)
- Modal focus trap ✅ (`src/components/ui/Modal.tsx`)
- WCAG AA contrast ratio ✅ (`--th-text-muted` at 4.5:1 or higher)

### P2: Mobile Responsiveness

**New:**
- `src/hooks/useMediaQuery.ts` — responsive breakpoint hook

**Files to update:**
- `src/components/Sidebar.tsx` — overlay drawer
- `src/components/TaskBoard.tsx` — mobile single column
- `src/components/AgentManager.tsx` — mobile stacked layout
- `src/components/dashboard/Dashboard2.tsx` — mobile 1-column stack

---

## Appendix: Metrics Summary

| Metric | Value |
|--------|-------|
| CSS files | 5 files, 4,934 lines |
| CSS variables (--th-*) | 68 |
| !important usage | 380 occurrences |
| Hardcoded rgba() | 313 instances |
| @keyframes animations | 57 |
| Custom CSS classes | 407 |
| window.alert() | 21 places |
| window.confirm() | 9 places |
| .catch(() => {}) | 12 places (8 files) |
| console.error (in production) | 105+ places |
| Media queries | 8 |
| i18n supported languages | 4 (ko, en, ja, zh) |
| Shared UI primitives | 5 (Modal, Button, Input, Textarea, FormField) |
| Modal/dialog implementations | 28 (many do not use shared Modal) |
| App.tsx useState hooks | 60+ |
| AppMainLayout props | 58 |
| URL routing | None (state-based view switching) |
| Number of views | 13 |
| Total component lines | ~44,000 lines (50+ files) |

---

## Appendix: Full List of `window.alert` / `window.confirm` Locations

### window.alert (21 places)

| File | Line | Description |
|------|------|-------------|
| `app/useAppActions.ts` | 193 | Cost limit exceeded (English hardcoded) |
| `app/useAppActions.ts` | 329 | Task execution failed |
| `app/useAppActions.ts` | 379 | Task stop failed |
| `app/useAppActions.ts` | 412 | Task pause failed |
| `app/useAppActions.ts` | 429 | Task resume failed |
| `agent-manager/AgentFormModal.tsx` | 100 | Image exceeds 5MB |
| `agent-manager/DepartmentFormModal.tsx` | 151 | Duplicate department ID |
| `agent-manager/DepartmentFormModal.tsx` | 153 | Department creation failed |
| `agent-manager/DepartmentFormModal.tsx` | 178 | Cannot delete: department has members |
| `agent-manager/DepartmentFormModal.tsx` | 180 | Cannot delete: department has linked tasks |
| `agent-manager/DepartmentFormModal.tsx` | 182 | Cannot delete: system department |
| `memory/MemoryFormModal.tsx` | 195 | File exceeds 1MB |
| `agent-rules/RuleFormModal.tsx` | 192 | File exceeds 512KB |
| `hooks/HookFormModal.tsx` | 244 | File size exceeded |
| `skills-library/CustomSkillSection.tsx` | 42 | Invalid skill package (English hardcoded) |
| `skills-library/CustomSkillSection.tsx` | 49 | Import failed (English hardcoded) |
| `DecisionInboxModal.tsx` | 164 | Submission attempted with no selection |
| `office-view/HeartbeatPanel.tsx` | 499 | Watchlist removal failed |
| `office-view/HeartbeatPanel.tsx` | 618 | Bulk deletion failed |
| `office-view/HeartbeatPanel.tsx` | 698 | Log deletion failed |
| `office-view/HeartbeatPanel.tsx` | (1 additional) | — |

### window.confirm (9 places)

| File | Line | Description |
|------|------|-------------|
| `AgentDetail.tsx` | 288 | Agent deletion |
| `ProjectManagerModal.tsx` | 264 | Project deletion |
| `TaskBoard.tsx` | 323 | Bulk task deletion |
| `SettingsPanel.tsx` | 382 | OAuth account deletion |
| `settings/DataSettingsTab.tsx` | 70 | Data reset |
| `chat-panel/ChatPanelHeader.tsx` | 112 | Chat history deletion |
| `deliverables/GitSection.tsx` | 62 | Git operation confirmation |
| `office-view/HeartbeatPanel.tsx` | 492 | Watchlist item removal |
| `office-view/HeartbeatPanel.tsx` | 611 | Bulk log deletion |
| `office-view/HeartbeatPanel.tsx` | 691 | Individual log deletion |
