# 대형 소스 파일 인벤토리

> 프로젝트 규칙: **단일 파일 300줄 이하** 권장 ([`.cursor/rules/coding-conventions.mdc`](../.cursor/rules/coding-conventions.mdc))  
> 이 문서는 리팩터 우선순위·분할 계획 수립용으로, 줄 수 기준 상위 파일을 정리한 것이다.

**마지막 집계:** 2026-03-20 (`review-finalize-tools`·`collab` 분할 후 server 상위 20 재집계)

---

## 1. `src/` — 상위 30개 (줄 수 내림차순)

| 줄 수 | 경로 |
|------|------|
| 709 | `src/components/CommandPalette.tsx` |
| 697 | `src/components/project-manager/ProjectEditorPanel.tsx` |
| 693 | `src/types/index.ts` |
| 682 | `src/components/NotificationCenter.tsx` |
| 676 | `src/components/TaskReportPopup.tsx` |
| 660 | `src/api/organization-projects.ts` |
| 631 | `src/components/terminal-panel/useTerminalPanelData.ts` |
| 618 | `src/components/image-studio/GenerateTab.tsx` |
| 610 | `src/components/workflow-builder/WorkflowBuilder.tsx` |
| 609 | `src/components/agent-composition/AgentCompositionBuilder.tsx` |
| 600 | `src/components/ChatPanel.tsx` |
| 599 | `src/components/local-llm/ModelsPanel.tsx` |
| 598 | `src/components/project-create-modal/ProjectCreateModal.tsx` |
| 590 | `src/components/SkillHistoryPanel.tsx` |
| 588 | `src/components/windows/FolderWindow.tsx` |
| 568 | `src/components/desktop/widgets/FileTreeWidget.tsx` |
| 558 | `src/components/ProjectManagerModal.tsx` |
| 557 | `src/components/memory/MemoryHistoryPanel.tsx` |
| 552 | `src/components/windows/DashboardWindow.tsx` |
| 547 | `src/components/taskboard/create-modal/CreateTaskModalView.tsx` |
| 543 | `src/app/useRealtimeSync.ts` |
| 542 | `src/components/hooks/HookHistoryPanel.tsx` |
| 542 | `src/components/desktop/user-guide-panel/getChapters.ts` |
| 537 | `src/components/local-llm/LlmGuideModal.tsx` |
| 532 | `src/components/agent-rules/RuleHistoryPanel.tsx` |
| 524 | `src/app/useAppActions.ts` |
| 522 | `src/components/desktop/MenuBar.tsx` |
| 509 | `src/components/DecisionInboxModal.tsx` |
| 508 | `src/components/SettingsPanel.tsx` |

---

## 2. `server/` — 상위 20개 (줄 수 내림차순, 2026-03-20 재집계 · `review-finalize-tools`·`collab` 분할 반영)

| 줄 수 | 경로 |
|------|------|
| 775 | `server/modules/workflow/orchestration.ts` |
| 770 | `server/modules/routes/core/tasks/execution-run.ts` |
| 687 | `server/modules/bootstrap/schema/base-schema.ts` |
| 667 | `server/modules/routes/ops/local-llm.ts` |
| 659 | `server/modules/routes/collab/subtask-delegation-batch.ts` |
| 646 | `server/modules/routes/ops/custom-features.ts` |
| 616 | `server/modules/routes/core/tasks/crud.ts` |
| 608 | `server/modules/routes/core/tasks/execution-control.ts` |
| 595 | `server/modules/workflow/orchestration/report-workflow-tools.ts` |
| 584 | `server/modules/routes/collab/subtask-delegation.ts` |
| 580 | `server/modules/routes/collab/coordination/cross-dept-cooperation.ts` |
| 570 | `server/modules/routes/collab/direct-chat-handlers.ts` |
| 536 | `server/modules/routes/collab/coordination/report-routing.ts` |
| 533 | `server/modules/routes/core/projects/helpers.ts` |
| 524 | `server/modules/workflow/orchestration/meetings/review-consensus.ts` |
| 522 | `server/messenger/telegram-receiver.ts` |
| 519 | `server/modules/workflow/orchestration/execution-start-task.ts` |
| 519 | `server/modules/routes/collab/direct-chat-project-binding.ts` |
| 515 | `server/modules/workflow/core/project-context-tools.ts` |
| 507 | `server/modules/routes/core/update-auto/register.ts` |

---

## 3. 리팩터 우선순위 요약

- **최대 덩치 (src):** `src/components/project-manager/ProjectEditorPanel.tsx` (표 §1 기준) — 다음 분할 권장 후보.
- **완료:** `AgentFormModal.tsx` (~708줄) → `agent-manager/agent-form-modal/` (`types`, `sectionStyles`, `fileToBase64`, `KbSourcesSection`, `useAgentFormModalResources`, `AgentFormModalBasicSection`, `AgentFormModalCliBlock`, `AgentFormModalProviderBlocks`, `AgentFormModalPersonaBlock`, `AgentFormModalAdvancedSection`, `AgentFormModalFooter`, `index`). 진입 `AgentFormModal.tsx`는 default·`AgentFormModalProps` re-export.
- **완료:** `CommandPalette.tsx` (~710줄) → `command-palette/` (types, constants, historyStorage, getQuickActions, buildPaletteModel, spotlightFontStyle, CommandPalettePrimitives, CommandPaletteSearchSection, CommandPaletteResults, CommandPaletteFooter, index). 진입 `CommandPalette.tsx`는 default·`CommandPaletteProps` re-export.
- **완료:** `CliWindow.tsx` (~776줄) → `cli-window/` (constants, cliCommands, types, freeModeComparisonRows, CliSpinnerFallback, FreeModeNoticePortal, CliAgentPicker, CliPlanBanner, CliTerminalPane, CliWindowBottomBar, index). 진입 `CliWindow.tsx`는 default·`CliWindowProps` re-export.
- **완료:** `AnnouncementCliPanel.tsx` (~737줄) → `announcement-cli-panel/` (constants, types, helpers, CliLine, AnnouncementCliPanelHeader, AnnouncementCliPanelMessageList, AnnouncementCliPanelComposer, index). 진입 `AnnouncementCliPanel.tsx`는 default·타입 re-export.
- **완료:** `task-schema-migrations.ts` (~1,182줄) → `task-schema-migrations/` (types, apply-inline-ddl, migrate-*, seed-pipeline-gates, ensure-*, index). 진입 `task-schema-migrations.ts`는 re-export.
- **완료:** `gateway/client.ts` (~1,085줄) → `gateway/client/` (constants, types, normalize, messenger-config, transport-parse, channel-transports, messenger-low-level, session-targets, messenger-public, task-notifications, index). 진입 `client.ts`는 `export *`.
- **완료:** `custom-features-ai.ts` (~1,127줄) → `custom-features-ai/` (paths, types, provider-helpers, validate-bundle, llm-providers, compile-iife, extract-code, prompts, github-widget-import, repo-helpers, github-repo-phase1, compile-and-ai, index). 진입 `custom-features-ai.ts`는 re-export.
- **완료:** `AgentDetail.tsx` (746줄) → `agent-detail-modal/` 분할 (types, constants, cliSelectStyles, useAgentDetailCliState, useAgentDetailPlanningLead, AgentDetailCliEditorCodex, AgentDetailCliEditorStandard, AgentDetailCliSummaryButton, AgentDetailCliControls, AgentDetailModalProfileHeader, AgentDetailModalTabBar, index). 진입 파일 `AgentDetail.tsx`는 default·타입 re-export.
- **완료:** `GroupChatPanel.tsx` (754줄) → `chat-panel/group-chat-panel/` 분할 (constants, types, utils, ModeIcons, useGroupChatSend, useGroupChatPanel, GroupChatToBar, GroupChatAgentSidebar, GroupChatMessageList, GroupChatComposerModes, GroupChatComposerAttachmentsBlock, GroupChatComposerInputBlock, GroupChatComposer, index). 진입 파일 `GroupChatPanel.tsx`는 re-export만 유지.
- **완료:** `TaskBoard.tsx` (767줄) → `task-board/` 분할 (types, collapsedCardStorage, styles, DndWrappers, useTaskBoard, TaskBoardToolbar, TaskBoardStatusBar, TaskBoardKanban, index).
- **완료:** `GatewaySettingsTab.tsx` (779줄) → `gateway-settings/` 분할 (useGatewaySettingsTab, ChatSessionsSection, TestSendSection, index).
- **완료:** `TaskCard.tsx` (795줄) → `task-card/` 분할 (types, constants, useTaskCardState, TaskCardHeader, TaskCardBody, TaskCardActions, TaskCardDeps, TaskCardGates, TaskCardImages, index).
- **완료:** `UserGuidePanel.tsx` (836줄) → `user-guide-panel/` 분할 (types, constants, getChapters, CalloutBox, FeatureGrid, ChapterBtn, UserGuideSidebar, UserGuideContent, index).
- **완료:** `HeartbeatPanel.tsx` (846줄) → `heartbeat-panel/` 분할 (constants, types, utils, HeartbeatBody, index).
- **완료:** `ProjectInsightsPanel.tsx` (949줄) → `project-insights-panel/` 분할 (constants, utils, ProjectDashboardSection, ProjectProgressSection, ProjectCostSection, DeliverableChecklistSection, ProjectInfoSection, TaskHistorySection, ReportsSection, DecisionEventsSection, index).
- **완료:** `ProjectFolderWindow.tsx` (1,656줄) → `project-folder-window/` 분할.
- **완료:** `SynapseSettingsTab.tsx` (1,167줄) → `synapse-settings/` 분할.
- **완료:** `TerminalTabContent.tsx` (1,046줄) → `terminal-tab-content/` 분할 (parseCli, theme, utils, ToolInputBlock, ToolCard, CliLineRow).
- **완료:** `ScheduledTasksPanel.tsx` (1,031줄) → `scheduled-tasks-panel/` 분할 (constants, utils, EmptyState, UserGuide, ScheduleForm, ScheduleRow, TemplateForm, TemplateRow, SchedulesTab, TemplatesTab, index).
- **완료:** `versioned-migrations.ts` (~876줄) → `bootstrap/schema/versioned-migrations/` (types, migrations-a … migrations-e-recent). 진입 `versioned-migrations.ts`는 `MIGRATIONS` 스프레드 + `runVersionedMigrations`만 유지.
- **완료:** `task-reports/routes.ts` (~935줄) → `deliverable-result-text.ts`, `git-artifact-backfill.ts`, `artifact-constants.ts`, `artifact-http-routes.ts`, `task-report-detail-route.ts`, `helpers.ts`에 `TaskReportRouteHelpers` 타입 추가. 진입 `routes.ts`는 목록·아카이브·deliverables + 위 모듈 등록.
- **완료:** `projects.ts` (~928줄) → `projects/` 하위 `register-*-routes.ts` 등 (진입 ~44줄). `helpers.ts`(533줄)는 별도 기술 부채.
- **완료:** `directives-inbox-routes.ts` (~792줄) → `directives-inbox/` (`types`, `agent-upgrade-payload`, `session-reset`, `directive-leader-lookup`, `register-api-directives-route`, `register-api-inbox-route`, `inbox-session-reset-branch`, `inbox-after-message-inserted`, `inbox-announcement-delegation`). 진입 `directives-inbox-routes.ts` ~17줄.
- **완료:** `lifecycle.ts` (~775줄) → `lifecycle/` (`break-rotation`, `prune-duplicate-review-meetings`, `recover-orphan-in-progress-tasks`, `recover-interrupted-workflow-on-startup`, `running-task-heartbeats`, `mark-stalled-in-progress-tasks`, `recover-stalled-tasks`, `enforce-task-timeouts`, `sweep-pending-subtask-delegations`). 진입 `lifecycle.ts` ~284줄.
- **완료:** `agents/crud.ts` (861줄) → `crud-helpers.ts`, `register-agent-routes-read.ts`, `register-agent-routes-persona.ts`, `register-agent-routes-write.ts`, `patch-body.ts`, `register-agent-patch.ts`, `register-agent-routes-metrics.ts`. 진입 `crud.ts` ~19줄.
- **완료:** `review-finalize-tools.ts` (863줄) → `review-finalize-tools/` (`types`, `reconcile-delegated-subtasks`, `review-artifact-recorders`, `finalize-deliverable-messenger`, `finalize-approved-review`, `finish-review-video-gate`, `finish-review`). 진입 `review-finalize-tools.ts` ~15줄.
- **완료:** `collab.ts` (861줄) → `collab/messenger-task-routing.ts`, `messenger-format-send.ts`, `part-b-dept-helpers.ts`. 진입 `collab.ts` ~285줄.
- **남은 대형 (서버):** `orchestration.ts`, `execution-run.ts`, `base-schema.ts` 등 §2 상위권 — 다음 분할 후보.
- **300줄 초과** 파일이 다수이므로, 분할 시 **줄 수가 큰 파일부터** 손보는 것을 권장한다.
- 분할 패턴: 훅 → `useXxx.ts` / UI 섹션 → `XxxSection.tsx` / 타입·상수 → `types.ts`, `constants.ts` (conventions 참고).

---

## 4. 집계 방법

PowerShell 예시 (재집계 시 참고):

```powershell
# src
Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | ForEach-Object {
  $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
  [PSCustomObject]@{ Lines=$lines; Path=$_.FullName }
} | Sort-Object -Property Lines -Descending | Select-Object -First 30

# server
Get-ChildItem -Path server -Recurse -Include *.ts | ForEach-Object {
  $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
  [PSCustomObject]@{ Lines=$lines; Path=$_.FullName }
} | Sort-Object -Property Lines -Descending | Select-Object -First 20
```

재집계 후 이 문서의 표와 **마지막 집계** 날짜를 갱신하면 된다.

**참고 (2026-03-20):** `task-reports/routes.ts`·`versioned-migrations.ts`·`projects.ts`·`directives-inbox-routes.ts`·`lifecycle.ts`·`agents/crud.ts`·`review-finalize-tools.ts`·`collab.ts` 분할 완료. 진입 줄 수: ~147·~75·~44·~17·~284·~19·~15·~285줄.
