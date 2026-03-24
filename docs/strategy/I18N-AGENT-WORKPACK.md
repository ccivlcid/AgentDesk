# AgentDesk i18n Agent Workpack

> Last updated: 2026-03-24
> Audience: Cursor / Codex / Claude Code / other CLI agents
> Goal: An execution document that allows other agents to safely continue i18n separation work, even while other agents are modifying the codebase in parallel.

---

## 1. Purpose of This Document

This document is not a simple directional overview — it is a **workpack that can be used directly as task instructions**.

AgentDesk has currently begun the following transition:

- Common catalog added: `shared/i18n`
- Frontend key-based API added: `useI18n().tk()`
- Server key-based API added: `translateMessage()`
- Only some representative areas have been migrated

In other words, the full migration is not yet complete, and the purpose is to **safely divide the remaining hardcoded strings by area** and delegate them to different agents.

---

## 2. Current Baseline

### Already Applied Foundation

- Common message catalog
  - [shared/i18n/index.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/index.ts)
  - [shared/i18n/messages/en.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/en.ts)
  - [shared/i18n/messages/ko.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/ko.ts)
  - [shared/i18n/messages/ja.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/ja.ts)
  - [shared/i18n/messages/zh.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/zh.ts)

- Frontend API
  - [src/i18n.ts](/mnt/c/PythonProjects/AgentDesk/src/i18n.ts)

- Sample migration completed files
  - [src/app/useAppLabels.ts](/mnt/c/PythonProjects/AgentDesk/src/app/useAppLabels.ts)
  - [src/app/decision-inbox.ts](/mnt/c/PythonProjects/AgentDesk/src/app/decision-inbox.ts)
  - [src/App.tsx](/mnt/c/PythonProjects/AgentDesk/src/App.tsx)
  - [server/gateway/client/task-notifications.ts](/mnt/c/PythonProjects/AgentDesk/server/gateway/client/task-notifications.ts)

### Existing Strategy Document

- Strategy document: [docs/strategy/I18N-LOCALIZATION-PLAN.md](/mnt/c/PythonProjects/AgentDesk/docs/strategy/I18N-LOCALIZATION-PLAN.md)

This document is an **execution specification** that supplements the strategy document above.

---

## 3. Absolute Rules

1. Do not add new UI strings as inline `{ ko, en, ja, zh }` objects.
2. Add new strings by first adding the key to [shared/i18n/messages/en.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/en.ts).
3. The same key must also be added to the `ko/ja/zh` files.
4. Frontend should preferentially use `tk("key", vars)`.
5. Server should preferentially use `translateMessage(lang, "key", vars)`.
6. **Content data** like `name`, `name_ko`, `name_ja`, `name_zh` in the DB is not included in this work scope.
7. Since other agents may be modifying simultaneously, **separate work scope by file** and do not revert other agents' modifications.

---

## 4. Work Scope Division Principles

The most important thing during parallel work is write set separation.

### Shared Common Files

The files below have high conflict potential if multiple agents touch them simultaneously.

- [shared/i18n/messages/en.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/en.ts)
- [shared/i18n/messages/ko.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/ko.ts)
- [shared/i18n/messages/ja.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/ja.ts)
- [shared/i18n/messages/zh.ts](/mnt/c/PythonProjects/AgentDesk/shared/i18n/messages/zh.ts)

Therefore, when multiple agents work in parallel, proceed with one of the following approaches:

- Approach A: One agent exclusively handles message files, other agents only modify code files
- Approach B: Divide message key prefixes by workpack to minimize conflicts

Recommended prefix examples:

- `office.*`
- `settings.*`
- `library.*`
- `desktop.*`
- `reports.*`
- `errors.*`

---

## 5. Parallelizable Workpacks

The workpacks below are divided based on **distinct file groupings**.

### Workpack A. Office / CLI / Usage UI

Goal:

- Remove hardcoded strings in `office-view` and `cli` related code

Priority targets:

- [src/components/office-view/cli-locale.ts](/mnt/c/PythonProjects/AgentDesk/src/components/office-view/cli-locale.ts)
- `src/components/office-view/**`
- `src/components/windows/*CLI*`

Key prefix:

- `office.*`
- `cli.*`

Completion criteria:

- Common catalog used instead of local constant objects
- No new inline multilingual objects added

### Workpack B. Settings / Provider / Onboarding UI

Goal:

- Remove hardcoded strings related to settings screens and provider configuration

Priority targets:

- `src/components/windows/Settings*`
- `src/api/providers-*`
- `src/app/useAppActions.ts` — settings toast/notification strings

Key prefix:

- `settings.*`
- `providers.*`

Completion criteria:

- Settings-related buttons/labels/toasts migrated to catalog

### Workpack C. Desktop Shell / Window Titles

Goal:

- Separate desktop shell, window titles, and global UI labels

Priority targets:

- `src/components/desktop/**`
- `src/components/windows/**`
- `src/app/**` — window title/empty state strings

Key prefix:

- `desktop.*`
- `windows.*`

Completion criteria:

- Global UI strings organized by per-screen keys

### Workpack D. Task / Review / PM Activity UI

Goal:

- Clean up task board, review, and PM Activity strings

Priority targets:

- `src/components/task-board/**`
- `src/components/desktop/RightShelf.tsx`
- `src/components/chat/decision-inbox/**`
- `src/app/useAppActions.ts`

Key prefix:

- `task.*`
- `review.*`
- `pm.*`

Completion criteria:

- Status/button/toast/panel strings operate based on the common catalog

### Workpack E. Server Notifications / Route Messages

Goal:

- Eliminate `if (lang === "ko")` style branching in the server

Priority targets:

- `server/gateway/**`
- `server/modules/routes/**`
- `server/modules/workflow/**` — user-facing strings

Key prefix:

- `gateway.*`
- `serverMessages.*`
- `errors.*`

Completion criteria:

- User-facing text unified under `translateMessage()` as much as possible

### Workpack F. Tooling / Guardrails

Goal:

- Add detection tools to prevent hardcoded strings from being reintroduced

Priority targets:

- `scripts/`
- `eslint.config.mjs`
- `package.json`
- `docs/strategy/I18N-LOCALIZATION-PLAN.md`

Example tasks:

- Script to detect inline `{ ko, en, ja, zh }` objects
- Script to check for missing translation keys
- Add CI or local check commands

Completion criteria:

- At least one automated verification mechanism added to prevent new hardcoded strings

---

## 6. Procedure Each Agent Must Follow

1. First declare the workpack scope you are taking on.
2. Read only the files within that scope; do not touch files in other workpacks.
3. Add necessary keys to the message catalog.
4. Replace inline multilingual objects in code with `tk()` or `translateMessage()`.
5. Preserve existing behavior.
6. When reporting results, include the list of changed files and the key prefixes added.

---

## 7. Conflict Avoidance Rules When Working Simultaneously with Other AI Agents

If another agent is currently modifying the overall codebase, the following rules must be observed.

### Do NOT

- Large-scale formatting
- Unrelated refactoring
- Broad modifications under the guise of import cleanup
- Global renames
- Structural changes to files that another agent is already touching

### Recommended Approach

- Proceed in small file group units
- Only add message keys for your assigned prefix
- Maintain existing logic and only change string lookups
- For files with high conflict potential, re-read and apply them at the end in a rebase-style fashion

---

## 8. Completion Report Template

Other agents should report in the following format upon task completion:

```md
## I18N Workpack Report

- Workpack: D. Task / Review / PM Activity UI
- Key prefixes added: `task.*`, `review.*`, `pm.*`
- Updated files:
  - src/components/task-board/...
  - src/components/desktop/RightShelf.tsx
- Validation:
  - searched remaining inline multilingual objects in owned scope
  - verified no behavior change in owned scope
- Risks:
  - some DB-backed localized fields intentionally left as-is
```

---

## 9. Final Completion Definition

For the i18n separation work to be considered substantially complete, the following conditions must be met:

- New UI strings are no longer added as inline multilingual objects.
- Major frontend UI is looked up via `tk()`.
- Major server notification/status strings are looked up via `translateMessage()`.
- Remaining hardcoded strings are only in intentionally excluded scopes such as DB content or long-form prompts.
- A detection script or lint rule exists.

---

## 10. Recommended Execution Order

The most efficient execution order is as follows:

1. Add guardrails first with Workpack F
2. Clean up frontend common screens with Workpacks A/B/C
3. Clean up task/review screens with Workpack D
4. Clean up server-facing messages with Workpack E

This order is good because it allows stabilizing key patterns on the frontend first, then extending the same approach to server strings.
