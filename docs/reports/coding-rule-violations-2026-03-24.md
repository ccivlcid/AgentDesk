# Coding Rule Violations Report — 2026-03-24

> **Purpose**: List of CLAUDE.md coding rule violations. Cursor AI should fix these in order.
> **Reference**: `/CLAUDE.md` Section 0 (Coding Rules)
> **After every fix**: Run `npx tsc -b --noEmit` — zero errors required.

---

## Fix Rules (Must Follow)

1. **Run `npx tsc -b --noEmit` after every file change** — zero errors required.
2. Only edit existing files. Do not create new files (including util/helper files).
3. SVG replacements must follow Lucide icon style: `width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"`
4. When removing `any`, do NOT use `@ts-expect-error` or `@ts-ignore` as a workaround — define proper types instead.
5. One commit = one rule x one file (or a closely related file group).

---

## Task 1: Rule 0-1 — Replace Emoji/Unicode Symbols with SVG in UI Components (60+ cases)

Replace all emoji/unicode symbols with inline SVG.

### Replacement Mapping Table

| Symbol | Usage | SVG Replacement (24x24 viewBox path) |
|--------|-------|--------------------------------------|
| `✓` | check / done | `<polyline points="20 6 9 17 4 12"/>` |
| `✕` / `✗` | close / delete | `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>` |
| `▶` | run / play | `<polygon points="5 3 19 12 5 21 5 3"/>` |
| `▾` / `▴` | dropdown arrow | `<polyline points="6 9 12 15 18 9"/>` (▾) / `<polyline points="6 15 12 9 18 15"/>` (▴) |
| `▸` | collapsed item | `<polyline points="9 6 15 12 9 18"/>` |
| `↓` | download | `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>` |
| `⚠` / `⚠️` | warning | `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>` |
| `💡` | tip / idea | `<line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>` |
| `ℹ️` | info | `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>` |
| `🤖` | agent (fallback) | `<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/>` |
| `−` | minimize | `<line x1="5" y1="12" x2="19" y2="12"/>` |
| `＋` | maximize | `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>` |
| `○` | empty circle | `<circle cx="12" cy="12" r="10"/>` |
| `·` | separator dot | `<circle cx="12" cy="12" r="2"/>` |

### File-by-File Fix List

#### P0 — Highest Violation Count

**`src/components/desktop/TrafficLights.tsx`** (12+ cases)
- Line 13: `✕` → SVG (x)
- Line 14: `−` → SVG (minus)
- Line 15: `＋` → SVG (plus)
- Lines 19-26: `⇠`, `⇢`, `⤢`, `◎`, `↖`, `↗`, `↙`, `↘` → SVG arrows respectively
- Lines 102, 173: Also fix rendering of the above symbols

**`src/components/desktop/user-guide-panel/CalloutBox.tsx`** (3 cases)
- Line 5: `💡` → SVG (lightbulb)
- Line 6: `⚠️` → SVG (alert-triangle)
- Line 7: `ℹ️` → SVG (info)
- Line 23: Also fix rendering section

**`src/components/image-studio/GenerateTab.tsx`** (3 cases)
- Lines 374-375: `▶` → SVG (play)
- Line 509: `↓` → SVG (download)
- Line 573: `✕` → SVG (x)

**`src/components/image-studio/GalleryTab.tsx`** (2 cases)
- Lines 169, 226: `✕` → SVG (x)

#### P1 — Medium Frequency

**`src/components/desktop/DesktopRunProjectModal.tsx`**
- Line 105: `▶` → SVG (play)
- Line 187: `✓` → SVG (check)
- Line 229: `▶` → SVG (play)

**`src/components/agent-composition/AgentCompositionBuilder.tsx`**
- Line 341: `▶` → SVG (play)
- Line 490: `🤖` → SVG (robot)

**`src/components/agent-composition/AgentCompositionRunModal.tsx`**
- Line 188: `▶` → SVG (play)
- Line 368: `✓` → SVG (check)
- Line 485: `▶` → SVG (play)

**`src/components/agent-composition/nodes/CompAgentNode.tsx`**
- Line 70: `🤖` → SVG (robot)

**`src/components/agent-detail/AgentDetailSections.tsx`**
- Line 190: `✓` / `✗` → SVG (check / x)

**`src/components/agent-detail/AgentDetailTabContent.tsx`**
- Line 420: `▶` → SVG (play)

**`src/components/agent-manager/agent-form-modal/KbSourcesSection.tsx`**
- Line 124: `✕` → SVG (x)

**`src/components/agent-rules/RuleHistoryPanel.tsx`**
- Lines 320, 336: `✓` → SVG (check)
- Line 348: `✕` → SVG (x)

**`src/components/agent-rules/RuleMemorySection.tsx`**
- Line 41: `▾` → SVG (chevron-down)

**`src/components/hooks/HookHistoryPanel.tsx`**
- Line 327: `▴` / `▾` → SVG (chevron-up / chevron-down)
- Lines 351, 367: `✓` → SVG (check)

**`src/components/hooks/HookMemorySection.tsx`**
- Line 38: `▾` → SVG (chevron-down)

**`src/components/memory/MemoryHistoryPanel.tsx`**
- Line 343: `▴` / `▾` → SVG (chevron-up / chevron-down)
- Lines 367, 383: `✓` → SVG (check)

**`src/components/deliverables/DeliverableCard.tsx`**
- Lines 48, 135: `▾` / `▸` → SVG (chevron-down / chevron-right)

**`src/components/deliverables/ArtifactList.tsx`**
- Line 169: `↓` → SVG (download)

**`src/components/desktop/MenuBar.tsx`**
- Lines 426, 437: `✓` → SVG (check)

**`src/components/desktop/WallpaperPicker.tsx`**
- Line 281: `✓` → SVG (check)
- Line 411: `⚠` → SVG (alert-triangle)

**`src/components/desktop/MarkdownEditorModal.tsx`**
- Lines 333, 338: `✓` → SVG (check)
- Line 402: `↓` → SVG (download)

**`src/components/desktop/project-folder-window/index.tsx`**
- Line 113: `▶` → SVG (play)
- Line 122: `✓` → SVG (check)

**`src/components/desktop/project-folder-window/TaskPreviewPanels.tsx`**
- Line 62: `✓` / `○` → SVG (check / circle)
- Line 216: `⚠` → SVG (alert-triangle)

**`src/components/local-llm/AdvancedSettingsPanel.tsx`**
- Line 206: `✓` → SVG (check)

**`src/components/local-llm/BackendCard.tsx`**
- Lines 197-208: `✓` → SVG (check) x multiple locations

**`src/components/command-palette/CommandPaletteResults.tsx`**
- Line 199: `✓` / `·` → SVG (check / dot)

**`src/components/DecisionInboxModal.tsx`**
- Line 482: `▶` → SVG (play)

**`src/components/image-studio/MaskCanvas.tsx`**
- Line 147: `✓` → SVG (check)

---

## Task 2: Rule 0-2 — Fix SVG Icon Convention Violations (35+ cases)

### 2-A. Hardcoded Hex Colors → `currentColor` (28+ cases)

> **Exception**: Brand logo SVGs in `Logos.tsx`, `model.tsx` etc. require specific colors — **excluded**.
> Only non-brand icon hex violations are listed below.

| File | Line | Current | Fix |
|------|------|---------|-----|
| `agent-detail/AgentDetailTabContent.tsx` | 406 | `stroke="#f59e0b"` | `stroke="currentColor"` + parent `style={{ color: "#f59e0b" }}` |
| `desktop/Desktop.tsx` | 119 | `stroke="#fff"` | `stroke="currentColor"` + parent `style={{ color: "#fff" }}` |
| `desktop/Desktop.tsx` | 133 | `stroke="#fff"` | Same |
| `desktop/project-folder-window/GitTab.tsx` | 108 | `stroke="#30d158"` x2 | `stroke="currentColor"` + parent color |
| `settings/ApiSettingsTab.tsx` | 47 | `stroke="#3B82F6"` | `stroke="currentColor"` + parent color |
| `settings/CliSettingsTab.tsx` | 64 | `stroke="#3B82F6"` | Same |
| `settings/gateway-settings/index.tsx` | 43 | `stroke="#3B82F6"` | Same |
| `settings/GeneralSettingsTab.tsx` | 34 | `stroke="#3B82F6"` | Same |
| `settings/OAuthSettingsTab.tsx` | 58 | `stroke="#3B82F6"` | Same |
| `windows/AppRunnerWindow.tsx` | 302 | `stroke="#fff"` | `stroke="currentColor"` + parent color |
| `gitlab-import/GitLabImportPanel.tsx` | 139 | `stroke="#30d158"` x2 | `stroke="currentColor"` + parent color |

### 2-B. SVG Size: style → attribute (5 cases)

| File | Line | Current | Fix |
|------|------|---------|-----|
| `chat-panel/announcement-cli-panel/AnnouncementCliPanelComposer.tsx` | 190 | `style={{ width: 12, height: 12 }}` | `width="12" height="12"` |
| Same file | 218 | `style={{ width: 13, height: 13 }}` | `width="13" height="13"` |
| `chat-panel/announcement-cli-panel/AnnouncementCliPanelHeader.tsx` | 119 | `style={{ width: 12, height: 12 }}` | `width="12" height="12"` |
| `chat-panel/group-chat-panel/GroupChatComposerInputBlock.tsx` | 181 | `style={{ width: 14, height: 14 }}` | `width="14" height="14"` |
| `local-llm/MetricsPanel.tsx` | 97 | `style={{ width: "100%", height: 32 }}` | Chart SVG — exception allowed |

---

## Task 3: Rule 0-3 — Remove `as unknown as` Double-Casts (40+ cases, highest priority)

> Double-casts completely bypass the type system and are the most dangerous pattern.

### Production Code (highest priority)

| File | Line | Current Code | Fix Direction |
|------|------|-------------|---------------|
| `src/app/utils.ts` | 141-142 | `a as unknown as Record<string, unknown>` | Type function params as `Record<string, unknown>` |
| `src/app/utils.ts` | 181-182 | Same pattern (tasks) | Same |
| `src/components/SettingsPanel.tsx` | 74 | `next as unknown as CompanySettings` | Unify `LocalSettings` and `CompanySettings` types, or add conversion function |
| `src/components/terminal-panel/terminal-tab-content/index.tsx` | 223 | `preRef as unknown as React.RefObject<HTMLDivElement>` | Separate refs: `divRef` + `preRef` |
| `src/components/terminal-panel/terminal-tab-content/index.tsx` | 237 | `preRef as unknown as React.RefObject<HTMLPreElement>` | Same |
| `server/modules/workflow.ts` | 105 | Large object `as unknown as WorkflowCoreExports & ...` | Add proper types to each module export |
| `server/modules/workflow/workflow-scheduler.ts` | 49 | `.all(now) as unknown as ScheduleRow[]` | Add generic type to DB wrapper |
| `server/modules/routes/core/tasks/execution-run.ts` | 642, 723, 797 | `agent as unknown as AgentRow` | Correctly type the variable as `AgentRow` |
| `server/modules/figma/context-fetcher.ts` | 61, 66 | `.get(taskId) as unknown as FigmaTaskRow` | Typed DB wrapper |
| `server/modules/routes/core/webhooks.ts` | 26, 120 | `.all() as unknown as WebhookRow[]` | Typed DB wrapper |
| `server/modules/routes/collab/task-delegation.ts` | 244 | Complex double-cast for property access | Add property to interface |

### Test Code (defer)

| File | Count | Content |
|------|-------|---------|
| `server/ws/hub.test.ts` | 6 | Mock WebSocket |
| `server/gateway/client.test.ts` | 14+ | Mock fetch |
| `server/security/auth.test.ts` | 3 | Mock Request |
| `src/api.test.ts` | 10+ | Mock fetch |

> Mock casts in test code are acceptable with comment: `// test mock — third-party boundary`

---

## Task 4: Rule 0-3 — Remove `any` Types (server core modules first, ~1,500 cases)

> Too many to fix at once — start with **Top 10 files** sequentially.

### Phase 1: Top 10 Files (163+ cases)

| # | File | Count | Fix Direction |
|---|------|-------|---------------|
| 1 | `server/modules/routes/ops/terminal/progress-hints.ts` | 26 | Define proper interfaces for parsed results |
| 2 | `server/modules/workflow/core.ts` | 25 | Define types for workflow context/state |
| 3 | `server/modules/workflow/orchestration/planned-approval.ts` | 20 | Define approval-related types |
| 4 | `server/types/runtime-context.ts` | 18 | Replace deferred function signatures with proper overloads |
| 5 | `server/modules/workflow/orchestration/meetings/review-consensus.ts` | 18 | Define meeting/review types |
| 6 | `server/modules/routes/core.ts` | 17 | Type route handler request/response |
| 7 | `server/modules/workflow/orchestration.ts` | 14 | Type orchestration context |
| 8 | `server/modules/routes/ops/models-routes.ts` | 12 | Type model API responses |
| 9 | `server/modules/workflow/orchestration/autonomous-memory.ts` | 11 | Type memory data structures |
| 10 | `server/modules/workflow/agents/providers/http-agent-tools.ts` | 11 | Type HTTP tool params/responses |

### Phase 2: Remaining Server Files (~1,280 cases)

Proceed after Phase 1 is complete. Start from `server/modules/workflow/` subdirectories.

### Phase 3: Frontend (~60 cases)

Files under `src/`. Mostly missing API response types — resolve with `src/types/` or inline interfaces.

### Task 4 Progress Log (Updated: 2026-03-24)

#### Completed

- **Task 4 Phase 1 완료** (Top 10 대상 정리 완료, 단 `runtime-context.ts`는 비파괴 점진 전환 대상으로 이관)
  - `server/modules/routes/ops/terminal/progress-hints.ts`
  - `server/modules/workflow/core.ts`
  - `server/modules/workflow/orchestration/planned-approval.ts`
  - `server/modules/workflow/orchestration/meetings/review-consensus.ts`
  - `server/modules/routes/core.ts`
  - `server/modules/workflow/orchestration.ts`
  - `server/modules/routes/ops/models-routes.ts`
  - `server/modules/workflow/orchestration/autonomous-memory.ts`
  - `server/modules/workflow/agents/providers/http-agent-tools.ts`
  - 보강 정리: `server/modules/workflow/orchestration/run-complete-handler/learnings.ts`

- **Task 4 Phase 2 진행 완료(라운드 1)**
  - 워크플로우 코어/오케스트레이션
    - `server/modules/deferred-runtime.ts`
    - `server/modules/workflow/agents.ts`
    - `server/modules/workflow/orchestration/task-scheduler.ts`
    - `server/modules/workflow/orchestration/pm-orchestrator.ts`
    - `server/modules/workflow/orchestration/auto-learning.ts`
    - `server/modules/workflow/core/one-shot-runner.ts`
    - `server/modules/workflow/agents/subtask-routing.ts`
  - 라우트 영역
    - `server/modules/routes/core/tasks/crud.ts`
    - `server/modules/routes/core/tasks/execution-run.ts`
    - `server/modules/routes/core/departments.ts`
  - 연관 타입 호환 정리
    - `server/modules/workflow/core/video-skill-bootstrap.ts`
    - `server/modules/workflow/packs/video-artifact.ts`

#### Verification

- `npx tsc -p tsconfig.node.json --noEmit` 통과
- `npx tsc -b --noEmit` 통과

#### Remaining Work (Next Queue)

1. **`server/types/runtime-context.ts` 점진 타입화**
   - 현재 광범위한 `(...args: any[]) => any`가 남아 있음
   - 비호환 리스크가 큰 파일이므로 한 번에 교체하지 않고, 사용처 단위로 시그니처를 수렴
2. **Phase 2 잔여 파일 (우선순위 높은 순)**
   - `server/modules/routes/core/tasks/execution-control.ts`
   - `server/modules/routes/core/tasks/subtasks.ts`
   - `server/modules/routes/core/github-routes.ts`
   - `server/modules/workflow/orchestration/report-workflow-tools.ts`
   - `server/modules/workflow/orchestration/execution-start-task.ts`
3. **Phase 3 (`src/`)**
   - API 응답/요청 타입 누락 구간 중심으로 `any` 축소

#### Notes / Risk

- `runtime-context.ts`를 일괄 `unknown`으로 치환하면 기존 모듈 할당 호환성이 깨질 수 있음.
- 따라서 런타임 안정성을 위해, **호출부/제공부를 함께 맞추는 소규모 배치 방식**으로 진행.

---

## Task 5 (Reference): Rules With No Violations

| Rule | Status |
|------|--------|
| 0-5 DB Migrations Append Only | Not inspected (requires runtime check) |
| 0-7 Server `console.log` ban | **Passed** — 0 violations |

---

## Recommended Execution Order

```
1. Task 1 (emoji → SVG)           — high visual impact, straightforward fixes
2. Task 2 (SVG conventions)       — can be done alongside Task 1
3. Task 3 (double-cast removal)   — highest type safety priority
4. Task 4 Phase 1 (any Top 10)   — core module type safety
5. Task 4 Phase 2-3 (any rest)   — incremental improvement
```

After each task:
- `npx tsc -b --noEmit` → zero errors
- `pnpm lint` → minimize warnings
- Commit message format: `fix(rule-0-N): <file or area> — <change summary>`
