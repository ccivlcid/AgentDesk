# API Contract Baseline

This document defines a contributor-facing API baseline for AgentDesk.
It is intentionally compact and focused on frequently used endpoints.
Current baseline target: `v1.2.5` (local snapshot, 2026-03-14).

## Base

- Base URL (local): `http://127.0.0.1:8790`
- API prefix: `/api`
- Health endpoint: `/healthz`
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/openapi.json`

## Authentication

- Loopback/local usage usually works without extra headers.
- Remote/non-loopback deployments can require:
  - `Authorization: Bearer <API_AUTH_TOKEN>`
- Inbox webhook endpoint requires:
  - `x-inbox-secret: <INBOX_WEBHOOK_SECRET>`
- Browser session bootstrap (`GET /api/auth/session`) returns `csrf_token`.
  - For cookie-authenticated mutation requests (`POST/PUT/PATCH/DELETE`), send:
    - `x-csrf-token: <csrf_token>`
- Interrupt injection endpoint (`POST /api/tasks/:id/inject`) additionally requires:
  - `session_id`
  - `interrupt_token` (or header `x-task-interrupt-token`)
  - Terminal API (`GET /api/tasks/:id/terminal`) exposes `interrupt.session_id` + `interrupt.control_token`
- Swagger note:
  - `/api/docs` opens with an automatic `/api/auth/session` bootstrap attempt (loopback/local case).
  - If you still get `401 unauthorized`, set `Bearer <API_AUTH_TOKEN>` via Swagger `Authorize`.

## Common Error Shape

Error payloads can vary by route, but API clients should handle:

```json
{
  "error": "error_code",
  "message": "human-readable detail"
}
```

The frontend client wraps non-2xx responses with `ApiRequestError` (`status`, `code`, `details`, `url`).

## Messenger Session Contract (v1.2.3)

Messenger channel settings are stored in `settings.key = "messengerChannels"` and can include:

- `token`: channel token (encrypted at rest with AES-256-GCM using `OAUTH_ENCRYPTION_SECRET`, fallback: `SESSION_SECRET`)
- `sessions[]`:
  - `id`
  - `name`
  - `targetId`
  - `enabled` (default true)
  - `agentId` (optional, binds session to a specific agent for direct chat/task routing)

Supported channel ids (AgentDesk parity):

- `telegram`
- `whatsapp`
- `discord`
- `googlechat`
- `slack`
- `signal`
- `imessage`

Runtime behavior highlights:

- Task report relays are route-pinned to the task's originating messenger target (`[messenger-route]` audit marker in task logs).
- Channel spread is prevented for route-pinned task reports.
- Typing indicators are emitted during direct-chat generation for Telegram/Discord; other channels are no-op.
- Native direct send runtime exists for all AgentDesk-parity channels (`telegram`, `whatsapp`, `discord`, `googlechat`, `slack`, `signal`, `imessage`).
- Per-channel setup requirements differ (e.g., WhatsApp Cloud API token + phone number id, Google Chat webhook URL or `key|token`, Signal RPC base URL, macOS iMessage runtime).
- New project creation path in direct-chat escalation is restricted by `PROJECT_PATH_ALLOWED_ROOTS`.

**Direct chat / 메신저 접두사**

- `$` — 전사 공지(CEO Directive). Inbox 웹훅 등으로 `$`로 시작하는 메시지는 기획팀 소집·팀장 회의·태스크 배정 등 전사 지시 흐름으로 처리된다.
- `!` — 일반 채팅 중 “업무”로 명시. 에이전트에게 보내는 메시지가 `!`로 시작하면 접두사는 제거한 뒤 업무(태스크 플로우)로 판단하며, 필요 시 프로젝트 선택을 요청한다. 예: `!네이버 금융 확인해줘` → 업무로 처리, `네이버 금융 확인해줘` → 정보 요청으로 일반 답변.

## Core Endpoint Groups

### Messenger (Built-in Channels)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/messenger/sessions` | List runtime messenger sessions resolved from persisted settings |
| GET | `/api/messenger/receiver/telegram` | Telegram webhook/poll receiver status |
| GET | `/api/messenger/receiver/discord` | Discord polling receiver status |
| GET | `/api/messenger/receiver/slack` | Slack polling receiver status (Bot Token `xoxb-...`) |
| POST | `/api/messenger/discord/channels` | Discover accessible Discord text channels by Bot token |
| POST | `/api/messenger/send` | Send message by `sessionKey` or (`channel` + `targetId`) |

`POST /api/messenger/send` request body:

```json
{
  "sessionKey": "telegram:my-session",
  "text": "hello"
}
```

or

```json
{
  "channel": "discord",
  "targetId": "123456789012345678",
  "text": "hello"
}
```

### Workflow Pack Routing

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/workflow-packs` | List workflow packs and effective enable state |
| PUT | `/api/workflow-packs/:key` | Update workflow pack metadata/flags/json fields |
| POST | `/api/workflow/route` | Resolve workflow pack by explicit/session/project/text context |

### Runtime / Org

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/departments` | List departments |
| POST | `/api/departments` | Create department |
| PATCH | `/api/departments/:id` | Update department |
| PATCH | `/api/departments/reorder` | Reorder departments |
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| PATCH | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |
| GET | `/api/stats` | Dashboard/company stats |
| GET | `/api/settings` | Read settings |
| PUT | `/api/settings` | Save settings |

### Tasks / Execution

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/tasks` | List tasks (supports filters) |
| GET | `/api/tasks/:id` | Task detail |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/assign` | Assign agent |
| POST | `/api/tasks/:id/run` | Start task |
| POST | `/api/tasks/:id/stop` | Cancel or pause task |
| POST | `/api/tasks/:id/resume` | Resume paused task |
| POST | `/api/tasks/:id/inject` | Queue sanitized interrupt prompt (paused session) |
| GET | `/api/tasks/:id/terminal` | Task terminal logs |
| GET | `/api/tasks/:id/meeting-minutes` | Meeting minutes |
| GET | `/api/subtasks?active=1` | Active subtasks |
| POST | `/api/tasks/:id/subtasks` | Create subtask |
| PATCH | `/api/subtasks/:id` | Update subtask |

`GET /api/tasks` supports query filters: `status`, `department_id`, `agent_id`, `project_id`, `workflow_pack_key`.

### Messaging / Inbox / Decision

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/messages` | Message history |
| POST | `/api/messages` | Send message |
| POST | `/api/announcements` | Broadcast announcement |
| POST | `/api/directives` | Send directive |
| DELETE | `/api/messages` | Clear messages |
| POST | `/api/inbox` | External webhook ingestion |
| GET | `/api/decision-inbox` | Decision inbox items |
| POST | `/api/decision-inbox/:id/reply` | Decision reply |

### Skills / Providers / OAuth

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/skills` | Skill catalog |
| GET | `/api/skills/detail` | Skill detail |
| POST | `/api/skills/learn` | Start learn job |
| GET | `/api/skills/learn/:jobId` | Learn job status |
| GET | `/api/skills/history` | Learn history |
| POST | `/api/skills/unlearn` | Unlearn skill |
| POST | `/api/skills/custom` | Upload custom skill |
| GET | `/api/skills/custom` | List custom skills |
| DELETE | `/api/skills/custom/:skillName` | Delete custom skill |
| GET | `/api/api-providers` | List API providers |
| POST | `/api/api-providers` | Create API provider |
| PUT | `/api/api-providers/:id` | Update API provider |
| DELETE | `/api/api-providers/:id` | Delete API provider |
| GET | `/api/oauth/status` | OAuth status |
| POST | `/api/oauth/disconnect` | OAuth disconnect |
| POST | `/api/oauth/refresh` | OAuth token refresh |

### Project / GitHub / Update

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/path-check` | Validate project path |
| GET | `/api/projects/path-suggestions` | Suggested paths |
| POST | `/api/projects/path-native-picker` | Native path picker |
| GET | `/api/github/status` | GitHub integration status |
| GET | `/api/github/repos` | Repositories |
| POST | `/api/github/clone` | Clone repository |
| GET | `/api/update-status` | Update status |
| POST | `/api/update-auto-config` | Toggle auto update |

### 2.0 카테고리 & 프로젝트 팀 (Phase 1–2 신규)

> **2.0 리뉴얼** 에서 추가되는 엔드포인트. 구현: `server/modules/routes/core/categories.ts`, `project-dashboard.ts`.

#### Categories (프로젝트 유형)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/categories` | 카테고리 목록 (시스템 템플릿 + 사용자 정의) |
| POST | `/api/categories` | 카테고리 생성 |
| PATCH | `/api/categories/:id` | 카테고리 수정 (버전 자동 증가) |
| DELETE | `/api/categories/:id` | 카테고리 삭제 (시스템 템플릿 불가) |
| GET | `/api/categories/:id/versions` | 버전 이력 조회 |
| POST | `/api/categories/:id/clone` | 카테고리 복제 |

`GET /api/categories` 응답 필드: `id`, `name`, `slug`, `description`, `icon`, `color`, `kpi_schema`, `risk_schema`, `gate_schema`, `deliverable_schema`, `is_template`, `version`, `owner_scope`

`PATCH /api/categories/:id` 동작:
- 수정 시 `version` 자동 증가
- 기존 프로젝트의 `category_version`은 변경되지 않음 (재현성 보장)

#### Project Team (프로젝트 팀원)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects/:id/agents` | 프로젝트 팀원 목록 |
| POST | `/api/projects/:id/agents` | 팀원 추가 (`{ agent_id }`) |
| DELETE | `/api/projects/:id/agents/:agentId` | 팀원 제거 |

#### Project Dashboard Quadrants (대시보드 4분면)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects/:id/objectives` | 목표 목록 |
| POST | `/api/projects/:id/objectives` | 목표 추가 |
| PATCH | `/api/projects/:id/objectives/:objId` | 목표 수정 |
| DELETE | `/api/projects/:id/objectives/:objId` | 목표 삭제 |
| GET | `/api/projects/:id/risks` | 리스크 목록 |
| POST | `/api/projects/:id/risks` | 리스크 추가 |
| PATCH | `/api/projects/:id/risks/:riskId` | 리스크 수정 |
| DELETE | `/api/projects/:id/risks/:riskId` | 리스크 삭제 |
| GET | `/api/projects/:id/gates` | 검토 단계 목록 |
| POST | `/api/projects/:id/gates` | 검토 단계 추가 |
| PATCH | `/api/projects/:id/gates/:gateId` | 검토 단계 수정 (상태 포함) |
| DELETE | `/api/projects/:id/gates/:gateId` | 검토 단계 삭제 |
| GET | `/api/projects/:id/outputs` | 결과물 목록 |
| POST | `/api/projects/:id/outputs` | 결과물 항목 추가 |
| PATCH | `/api/projects/:id/outputs/:outputId` | 결과물 수정 |
| DELETE | `/api/projects/:id/outputs/:outputId` | 결과물 삭제 |

> **주의**: `/api/projects/:id/outputs`는 프로젝트 레벨의 계획된 산출물(PRD, API 명세서 등)이다.
> 태스크 실행 결과물(파일, Git diff)은 기존 `/api/deliverables` 및 `/api/task-reports/:id/artifacts`를 사용한다.

#### Projects 기존 엔드포인트 확장

`POST /api/projects` 요청 바디에 2.0 필드 추가:
```json
{
  "name": "string",
  "category_id": "string",       // 선택. 없으면 Custom Blank 적용
  "description": "string"
}
```

응답에 추가 필드: `category_id`, `category_version`, `success_metric`, `risk_profile`, `required_gates`, `deliverable_schema`

---

### Rules / Memory / Hooks

에이전트 프롬프트에 자동 주입되는 룰·메모리·훅 관리 엔드포인트.

#### Agent Rules

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/agent-rules` | 룰 목록 |
| POST | `/api/agent-rules` | 룰 생성 |
| PATCH | `/api/agent-rules/:id` | 룰 수정/활성화 토글 |
| DELETE | `/api/agent-rules/:id` | 룰 삭제 |

`GET /api/agent-rules` 쿼리 파라미터:

| 파라미터 | 설명 |
| --- | --- |
| `project_id` | 해당 프로젝트에 배정된 에이전트의 룰만 반환 (project-scope + 소속 agent-scope + global). `scope_type`/`scope_id`보다 우선 적용 |
| `scope_type` | `global` \| `agent` \| `department` \| `workflow_pack` \| `project` |
| `scope_id` | scope 대상 ID |
| `enabled` | `1` \| `0` |

#### Memory

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/memory` | 메모리 목록 |
| POST | `/api/memory` | 메모리 생성 |
| PATCH | `/api/memory/:id` | 메모리 수정 |
| DELETE | `/api/memory/:id` | 메모리 삭제 |

`GET /api/memory` 쿼리 파라미터: `project_id`, `scope_type`, `scope_id`, `enabled` (Rules와 동일 동작)

#### Hooks

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/hooks` | 훅 목록 |
| POST | `/api/hooks` | 훅 생성 |
| PATCH | `/api/hooks/:id` | 훅 수정 |
| DELETE | `/api/hooks/:id` | 훅 삭제 |

`GET /api/hooks` 쿼리 파라미터: `project_id`, `event_type`, `scope_type`, `scope_id`, `enabled` (`project_id`는 Rules와 동일 동작)

#### Skills (History / Available)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/skills/history` | 스킬 학습 이력 |
| GET | `/api/skills/available` | 학습 완료 스킬 목록 |

두 엔드포인트 모두 `project_id` 파라미터 지원: 해당 프로젝트에 배정된 에이전트의 스킬만 반환 (project-scope + 소속 agent-scope + global).

> **`project_id` 필터 동작 원리**: `project_agents` 테이블을 조인하여 프로젝트에 배정된 에이전트의 `scope_type='agent'` 항목만 포함. `scope_type='global'` 및 `scope_type='project' AND scope_id=<project_id>`도 함께 포함.

---

## 서버 전용·기타 엔드포인트 (본 문서 미수록)

아래는 실제 서버에 등록되어 있으나 본 baseline에는 생략된 항목이다. 전체 목록은 `server/modules/routes/**/*.ts` 검색 참고.

- **에이전트:** `GET /api/agents/active`, `GET /api/agents/cli-processes`, `POST /api/agents/:id/spawn`, `POST/DELETE /api/agents/:id/avatar`
- **태스크:** `GET /api/tasks/:id/execution`, `GET /api/tasks/:id/execution-events`, `GET /api/tasks/:id/dependencies`, `POST /api/tasks/:id/dependencies`, `DELETE /api/tasks/:id/dependencies/:depId`, `GET /api/tasks/:id/diff`, `POST /api/tasks/:id/merge`, `POST /api/tasks/:id/discard`, `POST /api/tasks/bulk-hide`
- **프로젝트:** `GET /api/projects/:id`, `GET /api/projects/:id/burndown`, `GET /api/projects/path-browse`, `GET /api/projects/path-tree`, `GET /api/projects/:id/branches`, `GET /api/github/repos/:owner/:repo/branches`, `GET /api/github/clone/:cloneId`
- **스킬:** `GET /api/skills/available`, `GET /api/skills/custom/:skillName/export`, `POST /api/skills/custom/import`
- **기타:** `GET /api/agent-usage`, `GET /api/agent-usage/trends/daily`, `GET /api/agent-usage/:agentId`, `GET /api/decision-inbox` 등. task-reports, deliverables, pipeline-gates, webhooks, backup, notifications, task-templates, custom-packs, worktrees, cli-usage, cost-alerts, oauth 콜백·device 플로우, update-auto-status, update-apply 등은 서버 라우트 등록처 참조.

## OpenAPI

- **스펙 파일:** `docs/specs/openapi.json`
- **서빙:** 서버가 해당 파일을 읽어 `GET /api/openapi.json`으로 제공하며, Swagger UI는 `/api/docs`에서 제공.
- **로드 경로:** 서버 코드 `server/modules/routes/ops/api-docs.ts`에서 `docs/specs/openapi.json`을 사용.

## Known Follow-up

- OpenAPI 스펙을 점진적으로 확장: auth/session, tasks/subtasks, inbox/directives, project/github, categories·project team·dashboard quadrants 등.
