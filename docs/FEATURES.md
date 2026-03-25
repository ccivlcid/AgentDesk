# AgentDesk — 전체 기능 목록

> **개발자를 위한 멀티 LLM 오케스트레이터 OS**
> Last updated: 2026-03-25
> Purpose: 현재 시스템의 모든 기능을 코드 기반으로 정확하게 기록.

AgentDesk는 여러 AI 에이전트(Claude, GPT, Gemini, Ollama 등)가 개발 태스크를 협업 수행하고, PM 오케스트레이션과 실시간 모니터링을 제공하는 데스크톱 OS 환경입니다. 핵심 차별점은 **9개 CLI 프로바이더 + API 프로바이더를 동시에 운용하는 멀티 프로바이더 에이전트 실행**입니다.

---

## 1. Desktop OS (macOS 메타포)

| 기능 | 파일 | 설명 |
|------|------|------|
| **Desktop** | `Desktop.tsx` | 자유 배치 아이콘, 드래그 이동, jiggle 모드 (600ms 롱프레스 → 삭제 뱃지) |
| **MenuBar** | `MenuBar.tsx` | 로고, 앱 메뉴, 프로젝트 셀렉터, 킥오프 인디케이터, 진행률 바, 비용, 알림, 시계 |
| **Dock** | `Dock.tsx` | 하단 고정 앱 바 + 실행 뱃지 |
| **Mission Control** | `MissionControl.tsx` | `Ctrl+Up` 전체 윈도우 그리드 뷰 |
| **Command Palette** | `CommandPalette.tsx` | `Cmd+K` Spotlight 검색 (에이전트/태스크/프로젝트/뷰) |
| **Quick Look** | `QuickLook.tsx` | `Space` 프로젝트 미리보기 (태스크, 에이전트, 통계) |
| **Notification Center** | `NotificationCenter.tsx` | 벨 아이콘 → 320px 슬라이드 패널 (날짜 그룹, 필터) |
| **App Switcher** | `AppSwitcher.tsx` | `Cmd+Tab` 윈도우 전환 |
| **Desktop Icons** | `DesktopIcon.tsx`, `FolderDesktopIcon.tsx` | 시스템 앱 아이콘 + 프로젝트 폴더 아이콘, 우클릭 메뉴 |
| **Keyboard Shortcuts** | `useDesktopKeyboard.ts` | `g l/s/a/e`, `Esc`, `?`, `Space` |

---

## 2. 윈도우 시스템

| 윈도우 | 파일 | 설명 |
|--------|------|------|
| **Orchestration Timeline** | `OrchestrationWindow.tsx` + `orchestration/` | Phase 1 구현 완료. 4탭 구성: Timeline (Agent Lanes + progress bars), Logs (Error-first log stream + command bar), Agents (Team table + fitness metrics), Room (Communication feed + Reasoning Tree). Dock 앰버 아이콘, 키보드 0-3 탭 전환, Stage Rail 파이프라인 표시 |
| **Library** | `LibraryWindow.tsx` | 스킬/룰/메모리/훅 (4탭) — 운영 지식 베이스 |
| **Settings** | `SettingsWindow.tsx` | 일반/API/OAuth/CLI/데이터 설정 |
| **Agent Manager** | `AgentManagerWindow.tsx` | 에이전트/전문분야 CRUD, 카드 그리드 |
| **CLI** | `CliWindow.tsx` | PTY 터미널, 에이전트 셀렉터, 자동 CLI 실행 |
| **Project Folder** | `ProjectFolderWindow.tsx` | Files/Tasks/Agents/Terminal/Details/Git (6탭) |
| **Repo Store** | `GitImportWindow.tsx` | GitHub 트렌딩 + 클론 + GitLab 임포트 |
| **Decision Inbox** | `DecisionInboxModal.tsx` | 중간 의사결정 승인 (APPROVE/REVISE/CANCEL) |

---

## 3. 에이전트 시스템 (멀티 프로바이더)

> AgentDesk의 핵심 차별점: 하나의 프로젝트에서 서로 다른 LLM 프로바이더를 사용하는 에이전트들이 동시에 협업합니다.

### 에이전트 속성

| 속성 | DB 컬럼 | 설명 |
|------|---------|------|
| 이름 | `name`, `name_ko/ja/zh` | 다국어 이름 |
| 역할 | `role` | `team_leader`(PM), `senior`, `junior` |
| 전문 분야 | `department_id` | dev, planning, design 등 12개 분야 |
| CLI 도구 | `cli_provider` | claude, codex, gemini, cursor, opencode, copilot, antigravity, api, ollama |
| API 프로바이더 | `api_provider_id` | api_providers 테이블 참조 (HTTP API 모드) |
| 모델 | `api_model`, `cli_model` | 프로바이더별 모델 지정 |
| 페르소나 | `persona_id` | 사고 스타일 (structured, creative, analytical 등) |
| 아바타 | `avatar_emoji`, `avatar_url`, `sprite_number` | UI 표현 |
| 상태 | `status` | idle, working, break, offline |

### 멀티 프로바이더 실행 분기

| 조건 | 실행 방식 |
|------|-----------|
| `cli_provider === "api"` + `api_provider_id` | HTTP API 스트리밍 (Anthropic/OpenAI-compatible) |
| `cli_provider === "copilot"` 또는 `"antigravity"` | OAuth HTTP agent |
| `cli_provider === "claude"/"codex"/"gemini"/"cursor"/"opencode"` | CLI subprocess spawn (PTY) |
| `cli_provider === "ollama"` + `api_provider_id` | 로컬 Ollama HTTP API |

> 하나의 프로젝트 내에서 Claude CLI 에이전트, GPT API 에이전트, Ollama 로컬 에이전트가 동시에 태스크를 수행할 수 있습니다.

### Fitness 기반 배정

| 항목 | 설명 |
|------|------|
| 테이블 | `agent_task_fitness` — 에이전트별 task_type별 성공률 |
| 점수 | `successRate - (currentLoad * 0.1)` |
| Fallback | fitness 데이터 없으면 round-robin |

---

## 4. 태스크 시스템

### 태스크 상태 흐름

```
inbox → planned → collaborating / in_progress → review → done
                                                  |
                                             (PM REVISE)
                                                  |
                                              planned (재시도)
```

### 실행 상태 (`execution_state`)

```
queued → claiming → workspace_preparing → ready → running
  → awaiting_review / succeeded / failed
  → retry_backoff / blocked / stalled / recovering / cancelled
```

### 태스크 타입 (LLM이 킥오프 시 지정)

`general` | `development` | `design` | `analysis` | `presentation` | `documentation`

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 서브태스크 | 에이전트가 다른 에이전트에게 위임 |
| 핸드오프 | `handoff_to_agent_id` + `handoff_condition` (always/on_success/on_fail) |
| 인터럽트 | `POST /api/tasks/:id/inject` — 실행 중 프롬프트 주입 |
| 워크트리 | 태스크별 git worktree 격리 실행 |
| 의존성 | `POST /api/tasks/:id/dependencies` — 게이트 조건 |
| 리포트 | 완료 후 `task_report_archives`에 요약 저장 |

---

## 5. 프로젝트 시스템

### 프로젝트 타입

| `project_type` | 설명 |
|----------------|------|
| `"project"` (기본) | 킥오프 가능, 태스크 보드 있음 |

### 프로젝트 폴더 윈도우 (6탭)

| 탭 | 기능 |
|----|------|
| Files | 파일 브라우저, 인라인 에디터 |
| Tasks | 프로젝트 태스크 목록 |
| Agents | 팀 멤버 (PM/Senior/Junior) |
| Terminal | PTY 터미널 (project_path cwd) |
| Details | 메타데이터, 설명, git 정보 |
| Git | 브랜치, 커밋, 디프 |

### 프로젝트 대시보드 4분면

1. **Objectives** — 프로젝트 목표
2. **Risks** — 리스크 항목
3. **Gates** — 리뷰 게이트
4. **Outputs** — 산출물 체크리스트

### 카테고리 (프로젝트 템플릿)

10개 시스템 템플릿: `mvp`, `fullstack`, `mobile`, `api-backend`, `frontend`, `ai-ml`, `open-source`, `devops`, `enterprise`, `research`

---

## 6. 킥오프 파이프라인

```
[1] POST /api/projects/:id/kickoff
     |
[2] 회의 (runKickoffMeeting)              <- stage: "meeting"
     |  PM이 목표 공유, 에이전트 역량 보고
     |
[3] 태스크 생성 (LLM)                     <- stage: "planning"
     |  callLlmOneShotAuto() -> JSON -> INSERT tasks
     |  task_type LLM이 지정
     |
[4] 에이전트 배정 (fitness 기반)           <- stage: "assigning"
     |  PM 제외, round-robin fallback
     |
[5] 실행 시작                              <- stage: "executing"
     |  에이전트별 첫 planned 태스크 시작
     |
[6] 개별 태스크 -> PM 리뷰 -> done
     |
[7] 모든 태스크 done -> 프로젝트 리뷰 (최대 3라운드)
     |  SATISFIED -> 완료
     |  GAPS_FOUND -> 추가 태스크 생성 -> [4]로
```

---

## 7. PM 오케스트레이션

### 개별 태스크 리뷰

PM이 LLM으로 4-point 체크리스트 평가:
1. Scope match (범위 일치)
2. Errors (에러 유무)
3. Minimal scope (최소 범위)
4. Completeness (완성도)

- **APPROVE**: done + progress.md 작성 + ship automation + 다음 태스크
- **REVISE**: planned으로 되돌림 + PM 피드백

### 프로젝트 레벨 리뷰

모든 태스크 done → PM이 프로젝트 전체를 목표 대비 평가
- **SATISFIED**: 회고 보고서 + 프로젝트 완료
- **GAPS_FOUND**: 추가 태스크 자동 생성 (최대 3라운드)

### YOLO 모드

PM이 자동 결정. 사용자 승인 창 비활성화. LLM 리뷰는 동일하게 수행.

### Ship Automation

태스크 완료 시: 버전 범프 (0.1.2 → 0.1.3) + CHANGELOG 생성 + 파일 동기화

---

## 8. Orchestration Timeline

> TaskBoard를 대체하는 새로운 실시간 모니터링 뷰.

| 기능 | 설명 |
|------|------|
| 에이전트 레인 | 에이전트별 수평 레인에 태스크 타임라인 표시 |
| 실시간 상태 | WebSocket 기반 실행 상태 실시간 반영 |
| 상태 흐름 | planned → in_progress → review → done 시각화 |
| PM 리뷰 추적 | 리뷰 요청/승인/수정 이벤트 타임라인 표시 |

---

## 9. Decision Inbox

| 기능 | 설명 |
|------|------|
| 의사결정 큐 | 에이전트 실행 중 의사결정 요청 대기열 |
| 사용자 응답 | APPROVE / REVISE / CANCEL |
| YOLO 모드 | PM이 자동 결정 (사용자 개입 불필요) |
| 조회 API | `GET /api/decision-inbox` |
| 응답 API | `POST /api/decision-inbox/:id/reply` |

---

## 10. Library (운영 지식 베이스)

### Skills — 학습된 능력

- LLM으로 자동 학습 (`POST /api/skills/learn`)
- 커스텀 업로드/임포트
- 범위: global, agent, department, project

### Rules — 행동 규칙

- 카테고리: coding, communication, quality, execution, security, workflow, general
- 프롬프트에 자동 주입
- 범위: global, agent, department, workflow_pack, project

### Memory — 기억 항목

- 카테고리: context, preference, convention, knowledge, instruction, reference
- 프롬프트에 자동 주입
- 범위: global, agent, department, project

### Hooks — 이벤트 트리거

- 이벤트: pre-task, post-task, on-error, on-complete, on-status-change, on-start
- 범위: global, agent, department, workflow_pack, project

### 범위 우선순위

```
project > agent > department > workflow_pack > global
```

---

## 11. 설정 윈도우

| 탭 | 내용 |
|----|------|
| General | 언어, 테마, 회사명, YOLO 모드, 기본 CLI 프로바이더 |
| API | API 프로바이더 CRUD (Anthropic, OpenAI, Ollama 등) |
| OAuth | GitHub, Google 계정 연결 |
| CLI | CLI 인증 상태, 모델, 사용량 |
| Data | DB 백업/리셋 |

---

## 12. Repo Store

| 기능 | 설명 |
|------|------|
| GitHub 트렌딩 | 언어별/기간별 트렌딩 저장소 탐색 |
| 클론 | 선택한 저장소를 로컬에 클론 |
| GitLab 임포트 | GitLab URL로 프로젝트 임포트 |

---

## 13. 데이터 내보내기

| 타입 | 포맷 |
|------|------|
| Tasks | CSV / JSON |
| Agents | CSV / JSON |
| Costs | CSV / JSON |

- 프로젝트/상태/기간 필터
- UTF-8 BOM (엑셀 호환)

---

## 14. 비용 추적

| 항목 | 설명 |
|------|------|
| 프로젝트별 비용 | `GET /api/projects/:id/cost-summary` |
| 에이전트별 비용 | `GET /api/agents/:id/cost-summary` |
| 전체 비용 | `GET /api/cost-summary` |
| 토큰 단위 | input_tokens, output_tokens, total_cost_usd |
| CLI 사용량 | `cli_usage_cache` 테이블 |

---

## 15. 에이전트 퍼포먼스

`GET /api/agents/performance?project_id=&days=30`

| 메트릭 | 설명 |
|--------|------|
| success_rate | 완료율 (done / total) |
| avg_duration_ms | 평균 소요 시간 |
| trend | 7일 일별 완료 수 |
| total/done/failed/cancelled | 태스크 카운트 |

---

## 16. 실시간 통신 (WebSocket)

### 주요 이벤트

| 이벤트 | 설명 |
|--------|------|
| `task_update` | 태스크 상태 변경 |
| `agent_status` | 에이전트 상태 변경 |
| `cli_output` | 터미널 출력 (구독 기반) |
| `kickoff_stage` | 킥오프 단계 변경 |
| `pm_activity` | PM 활동 (승인/수정/에스컬레이션) -- Orchestration Timeline Event Log에서 인라인 표시 |
| `notification` | 시스템 알림 |
| `subtask_update` | 서브태스크 변경 |
| `runtime_status` | 런타임 실행 상태 (토큰, 실행 중) |

### 배치

| 이벤트 | 간격 | 최대 큐 |
|--------|------|---------|
| `cli_output` | 250ms | 60 |
| `subtask_update` | 150ms | 60 |

---

## 17. Reports

| 기능 | 설명 |
|------|------|
| 태스크 리포트 | 태스크 완료 후 자동 생성되는 실행 보고서 |
| 아카이브 | `task_report_archives` 테이블에 요약 저장 |
| 조회 | ReportsWindow에서 프로젝트별/기간별 필터 |

---

## 18. i18n (국제화)

| 언어 | 코드 |
|------|------|
| 한국어 | `ko` |
| 영어 | `en` |
| 일본어 | `ja` |
| 중국어 | `zh` |

- 프론트엔드: `useI18n().t({ ko, en, ja, zh })` + `tk("key", vars)`
- 서버: `translateMessage(lang, "key", vars)`

---

## 19. 보안

| 항목 | 구현 |
|------|------|
| API 인증 | `Authorization: Bearer <API_AUTH_TOKEN>` (원격) |
| CSRF | `x-csrf-token` (쿠키 인증 mutation) |
| 웹훅 | `x-inbox-secret` 헤더 |
| 인터럽트 | `session_id` + `interrupt_token` |
| API 키 암호화 | AES-256-GCM (`OAUTH_ENCRYPTION_SECRET`) |
| 에러 마스킹 | 홈 디렉토리, API 키, 토큰 자동 마스킹 |
| 경로 제한 | `PROJECT_PATH_ALLOWED_ROOTS` |
