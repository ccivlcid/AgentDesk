# AgentDesk — 전체 기능 목록

> Last updated: 2026-03-25
> Purpose: 현재 시스템의 모든 기능을 코드 기반으로 정확하게 기록. 핵심 강화 vs 정리 대상 판단의 기준.

---

## 1. Desktop OS (macOS 메타포)

| 기능 | 파일 | 설명 |
|------|------|------|
| **Desktop** | `Desktop.tsx` | 자유 배치 아이콘, 드래그 이동, jiggle 모드 (600ms 롱프레스 → 삭제 뱃지) |
| **MenuBar** | `MenuBar.tsx` | 로고, 앱 메뉴, 프로젝트 셀렉터, 킥오프 인디케이터, 진행률 바, 비용, 알림, 시계 |
| **Dock** | `Dock.tsx` | 하단 고정 7개 앱 (Tasks, Workflow, Library, Settings, Chat, Dashboard + 추가) + 실행 뱃지 |
| **Mission Control** | `MissionControl.tsx` | `Ctrl+↑` 전체 윈도우 그리드 뷰 |
| **Command Palette** | `CommandPalette.tsx` | `Cmd+K` Spotlight 검색 (에이전트/태스크/프로젝트/뷰) |
| **Quick Look** | `QuickLook.tsx` | `Space` 프로젝트 미리보기 (태스크, 에이전트, 통계) |
| **Notification Center** | `NotificationCenter.tsx` | 벨 아이콘 → 320px 슬라이드 패널 (날짜 그룹, 필터) |
| **App Switcher** | `AppSwitcher.tsx` | `Cmd+Tab` 윈도우 전환 |
| **Wallpaper** | `WallpaperPicker.tsx` | 10개 그라디언트 프리셋 |
| **PM Activity Shelf** | `RightShelf.tsx` | 우측 슬라이드 — PM 활동 타임라인 (회의, 리뷰, 승인, 메시지) |
| **Desktop Icons** | `DesktopIcon.tsx`, `FolderDesktopIcon.tsx` | 시스템 앱 아이콘 + 프로젝트 폴더 아이콘, 우클릭 메뉴 |
| **Keyboard Shortcuts** | `useDesktopKeyboard.ts` | `g w/l/s/c/a/e/i/d`, `Esc`, `?`, `Space` |

---

## 2. 윈도우 시스템

| 윈도우 | 파일 | 설명 |
|--------|------|------|
| **Tasks (칸반)** | `TaskBoardWindow.tsx` | 태스크 보드 — planned/in_progress/review/done 칸반 |
| **Workflow** | `WorkflowWindow.tsx` | 워크플로우 빌더 + 스케줄 + 컴포지션 (3탭) |
| **Library** | `LibraryWindow.tsx` | 스킬/룰/메모리/훅/산출물 (5탭) |
| **Settings** | `SettingsWindow.tsx` | 일반/API/OAuth/CLI/게이트웨이/데이터/웹훅/로컬LLM (8탭) |
| **Chat** | `ChatWindow.tsx` | 다이렉트/그룹/공지/디렉티브 (4탭) |
| **Agent Manager** | `AgentManagerWindow.tsx` | 에이전트/부서 CRUD, 카드 그리드 |
| **CLI** | `CliWindow.tsx` | PTY 터미널, 에이전트 셀렉터, 자동 CLI 실행 |
| **Project Folder** | `ProjectFolderWindow.tsx` | Files/Tasks/Agents/Terminal/Details/Git (6탭) |
| **App Runner** | `AppRunnerWindow.tsx` | AI 분석 → 설치 → 실행 자동 파이프라인 |
| **Image Studio** | `ImageStudioWindow.tsx` | 텍스트→이미지 생성 + 갤러리 |
| **Synapse** | `SynapseWindow.tsx` | Notion/Obsidian/NotebookLM/Figma 연동 |
| **Local LLM** | `LocalLlmWindow.tsx` | Ollama/LM Studio/llama.cpp/Jan 관리 |
| **Repo Store** | `GitImportWindow.tsx` | GitHub 트렌딩 + 클론 + GitLab 임포트 |
| **Dashboard** | `DashboardWindow.tsx` | KPI, 비용, 프로젝트 건강, 에이전트 메트릭 |
| **Reports** | `ReportsWindow.tsx` | 태스크 리포트, 아카이브 |
| **Decision Inbox** | `DecisionInboxModal.tsx` | 중간 의사결정 승인 (APPROVE/REVISE) |

---

## 3. 에이전트 시스템

### 에이전트 속성

| 속성 | DB 컬럼 | 설명 |
|------|---------|------|
| 이름 | `name`, `name_ko/ja/zh` | 다국어 이름 |
| 역할 | `role` | `team_leader`(PM), `senior`, `junior`, `intern`(미사용) |
| 부서 | `department_id` | 전문 분야 (dev, planning, design 등) |
| CLI 도구 | `cli_provider` | claude, codex, gemini, cursor, opencode, copilot, antigravity, api, ollama |
| API 프로바이더 | `api_provider_id` | api_providers 테이블 참조 (HTTP API 모드) |
| 모델 | `api_model`, `cli_model` | 프로바이더별 모델 지정 |
| 페르소나 | `persona_id` | 사고 스타일 (structured, creative, analytical 등) |
| 아바타 | `avatar_emoji`, `avatar_url`, `sprite_number` | UI 표현 |
| 상태 | `status` | idle, working, break, offline |

### 에이전트 실행 분기

```
agent.cli_provider === "api" && api_provider_id
  → HTTP API 스트리밍 (Anthropic/OpenAI-compatible)

agent.cli_provider === "copilot" | "antigravity"
  → OAuth HTTP agent

agent.cli_provider === "claude" | "codex" | "gemini" | "cursor" | "opencode"
  → CLI subprocess spawn (PTY)

agent.cli_provider === "ollama" && api_provider_id
  → 로컬 Ollama HTTP API
```

### Fitness 기반 배정

| 테이블 | 설명 |
|--------|------|
| `agent_task_fitness` | 에이전트별 task_type별 성공률 |
| 점수 | `successRate - (currentLoad * 0.1)` |
| Fallback | fitness 데이터 없으면 round-robin |

---

## 4. 태스크 시스템

### 태스크 상태 흐름

```
inbox → planned → collaborating / in_progress → review → done
                                                  ↓
                                             (PM REVISE)
                                                  ↓
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
| 칸반 보드 | 드래그 리오더, 상태별 컬럼 |
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
| `"app"` | 킥오프 불가, 클릭 시 App Runner로 열림 |

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
     ▼
[2] 회의 (runKickoffMeeting)              ← stage: "meeting"
     │  PM이 목표 공유, 에이전트 역량 보고
     ▼
[3] 태스크 생성 (LLM)                     ← stage: "planning"
     │  callLlmOneShotAuto() → JSON → INSERT tasks
     │  task_type LLM이 지정
     ▼
[4] 에이전트 배정 (fitness 기반)           ← stage: "assigning"
     │  PM 제외, round-robin fallback
     ▼
[5] 실행 시작                              ← stage: "executing"
     │  에이전트별 첫 planned 태스크 시작
     ▼
[6] 개별 태스크 → PM 리뷰 → done
     ▼
[7] 모든 태스크 done → 프로젝트 리뷰 (최대 3라운드)
     │  SATISFIED → 완료
     │  GAPS_FOUND → 추가 태스크 생성 → [4]로
```

---

## 7. PM 오케스트레이션

### 개별 태스크 리뷰

PM이 LLM으로 4-point 체크리스트 평가:
1. Scope match (범위 일치)
2. Errors (에러 유무)
3. Minimal scope (최소 범위)
4. Completeness (완성도)

→ **APPROVE**: done + progress.md + ship automation + 다음 태스크
→ **REVISE**: planned으로 되돌림 + PM 피드백

### 프로젝트 레벨 리뷰

모든 태스크 done → PM이 프로젝트 전체를 목표 대비 평가
→ **SATISFIED**: 회고 보고서 + 프로젝트 완료
→ **GAPS_FOUND**: 추가 태스크 자동 생성 (최대 3라운드)

### YOLO 모드

PM이 자동 결정. 사용자 승인 창 비활성화. LLM 리뷰는 동일하게 수행.

### Ship Automation

태스크 완료 시: 버전 범프 (0.1.2 → 0.1.3) + CHANGELOG 생성 + 파일 동기화

---

## 8. 채팅 시스템

| 탭 | 기능 |
|----|------|
| **Direct** | 1:1 에이전트 채팅 |
| **Group** | 프로젝트 팀 그룹 채팅 |
| **Announcement** | 전체 에이전트 브로드캐스트 |

### 메시지 프리픽스 (메신저 웹훅 전용)

| 프리픽스 | 의미 |
|---------|------|
| `$` | 회사 전체 디렉티브 |
| `!` | 업무 태스크 등록 |
| `#` | 오케스트레이터 태스크 |
| (없음) | 일반 채팅 |

---

## 9. Library (지식 베이스)

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

## 10. 워크플로우 빌더

| 탭 | 기능 |
|----|------|
| **Builder** | @xyflow/react 노드 에디터 (Agent, Condition, Merge, Trigger 노드) |
| **Scheduled** | 크론 기반 워크플로우 스케줄 (5-field cron) |
| **Composition** | 에이전트 조합 캔버스 (템플릿 저장/로드) |

### 워크플로우 팩

`development` | `novel` | `report` | `video_preprod` | `web_research_report` | `roleplay` | `asset_management`

---

## 11. Image Studio

| 탭 | 기능 |
|----|------|
| **Generate** | 텍스트→이미지 생성 (DALL-E 3, Flux, SD-XL 등) |
| **Gallery** | 생성 이미지 갤러리 (검색, 삭제) |

- 프로바이더: api_providers 테이블에서 이미지 지원 모델 자동 감지
- 인페인팅: 마스크 캔버스 + 입력 이미지
- 태스크 연동: `task_id`로 태스크에 이미지 링크

---

## 12. Synapse (외부 지식 통합)

| 플랫폼 | 기능 |
|---------|------|
| **Notion** | OAuth 연결 → 페이지 검색 → 마크다운 컨텍스트 |
| **Obsidian** | 볼트 경로 연결 → 파일 워치 → 자동 싱크 |
| **NotebookLM** | 스냅샷 저장/조회 |
| **Figma** | PAT 연결 → 디자인 컨텍스트 |
| **Rules** | 자동화 규칙 (소스 → 트리거 → 조건 → 액션) |

- 에이전트 실행 시 컨텍스트 블록으로 프롬프트에 주입

---

## 13. Local LLM 관리

| 탭 | 기능 |
|----|------|
| **Backends** | Ollama, LM Studio, llama.cpp, Jan 상태 관리 (시작/중지) |
| **Models** | 설치 모델 목록 + 갤러리 (20개 추천) + 풀/삭제 |
| **Metrics** | GPU/RAM 사용량, 추론 속도, 토큰 처리량 (5초 간격 WS) |

- `POST /api/local-llm/setup-provider` — Ollama/LM Studio를 api_providers로 자동 등록

---

## 14. App Runner

```
우클릭 "앱 실행" → AppRunnerWindow (autoRun=true)
  ▼
[1] 정적 분석 (analyzeProject)
    파일 존재 여부로 타입/언어/프레임워크/명령어 감지
  ▼
[2] AI 분석 (callLlmOneShotAuto)
    README + package.json + 엔트리파일 → LLM → 설명 + 커맨드 오버라이드
  ▼
[3] 설치 (spawn install_command)
    120초 타임아웃, WS 로그 스트리밍
  ▼
[4] 실행 (spawn run_command)
    PORT 환경변수 주입, 포트 충돌 자동 해결
```

---

## 15. 메신저 통합

| 채널 | 프로토콜 |
|------|---------|
| Telegram | 웹훅/폴링 |
| Discord | 봇 토큰 폴링 |
| Slack | 봇 토큰 폴링 |
| WhatsApp | Cloud API |
| Google Chat | 웹훅 |
| Signal | RPC |
| iMessage | macOS 런타임 |

- 세션 바인딩: 채널 세션 → 특정 에이전트
- 태스크 리포트 릴레이: 완료 시 원래 메신저로 전달
- 타이핑 인디케이터: Telegram/Discord

---

## 16. 설정 윈도우 (8탭)

| 탭 | 내용 |
|----|------|
| General | 언어, 테마, 회사명, YOLO 모드, 기본 CLI 프로바이더 |
| API | API 프로바이더 CRUD (Anthropic, OpenAI, Ollama 등) |
| OAuth | GitHub, Google 계정 연결 |
| CLI | CLI 인증 상태, 모델, 사용량 |
| Gateway | 메신저 채널 설정 (Telegram/Discord/Slack) |
| Data | DB 백업/리셋 |
| Webhooks | 웹훅 엔드포인트 관리 |
| Local LLM | 로컬 추론 백엔드 설정 |

---

## 17. 데이터 내보내기

| 타입 | 포맷 |
|------|------|
| Tasks | CSV / JSON |
| Deliverables | CSV / JSON |
| Agents | CSV / JSON |
| Costs | CSV / JSON |

- 프로젝트/상태/기간 필터
- UTF-8 BOM (엑셀 호환)

---

## 18. Decision Inbox

- 에이전트 실행 중 의사결정 요청 큐
- 사용자가 APPROVE / REVISE / CANCEL 응답
- YOLO 모드에서는 PM이 자동 결정
- `GET /api/decision-inbox` — 대기 항목 조회
- `POST /api/decision-inbox/:id/reply` — 응답

---

## 19. 비용 추적

| 항목 | 설명 |
|------|------|
| 프로젝트별 비용 | `GET /api/projects/:id/cost-summary` |
| 에이전트별 비용 | `GET /api/agents/:id/cost-summary` |
| 전체 비용 | `GET /api/cost-summary` |
| 토큰 단위 | input_tokens, output_tokens, total_cost_usd |
| CLI 사용량 | `cli_usage_cache` 테이블 |

---

## 20. 에이전트 퍼포먼스

`GET /api/agents/performance?project_id=&days=30`

| 메트릭 | 설명 |
|--------|------|
| success_rate | 완료율 (done / total) |
| avg_duration_ms | 평균 소요 시간 |
| trend | 7일 일별 완료 수 |
| total/done/failed/cancelled | 태스크 카운트 |

---

## 21. 실시간 통신 (WebSocket)

### 주요 이벤트 (30개)

| 이벤트 | 설명 |
|--------|------|
| `task_update` | 태스크 상태 변경 |
| `agent_status` | 에이전트 상태 변경 |
| `cli_output` | 터미널 출력 (구독 기반) |
| `chat_stream` | 채팅 스트리밍 (start/delta/end) |
| `kickoff_stage` | 킥오프 단계 변경 |
| `pm_activity` | PM 활동 (승인/수정/에스컬레이션) |
| `notification` | 시스템 알림 |
| `subtask_update` | 서브태스크 변경 |
| `runtime_status` | 런타임 실행 상태 (토큰, 실행 중) |
| `project_app_output` | App Runner 프로세스 출력 |

### 배치

| 이벤트 | 간격 | 최대 큐 |
|--------|------|---------|
| `cli_output` | 250ms | 60 |
| `subtask_update` | 150ms | 60 |

---

## 22. i18n (국제화)

| 언어 | 코드 |
|------|------|
| 한국어 | `ko` |
| 영어 | `en` |
| 일본어 | `ja` |
| 중국어 | `zh` |

- 프론트엔드: `useI18n().t({ ko, en, ja, zh })` + `tk("key", vars)`
- 서버: `translateMessage(lang, "key", vars)`
- 미완료: 2,454개 하드코딩 문자열 남음 (`strategy/I18N-AGENT-WORKPACK.md`)

---

## 23. 보안

| 항목 | 구현 |
|------|------|
| API 인증 | `Authorization: Bearer <API_AUTH_TOKEN>` (원격) |
| CSRF | `x-csrf-token` (쿠키 인증 mutation) |
| 웹훅 | `x-inbox-secret` 헤더 |
| 인터럽트 | `session_id` + `interrupt_token` |
| API 키 암호화 | AES-256-GCM (`OAUTH_ENCRYPTION_SECRET`) |
| 에러 마스킹 | 홈 디렉토리, API 키, 토큰 자동 마스킹 |
| 경로 제한 | `PROJECT_PATH_ALLOWED_ROOTS` |
