# AgentDesk

**Product Requirements — Overview**

AgentDesk is a **Project OS**: an operator cockpit for AI agents that run as CLI processes. You manage projects, tasks, and agent teams in one place, with messenger integration.

---

## Concept

| Item | Description |
|------|-------------|
| **One-liner** | **Work your way, get the results you need** — you (the client) define projects, tasks, and agents; manage execution flow and deliverables in one place. |
| **Design concept** | **CLI management tool** feel (k9s, lazygit-style). Dark terminal tone, monospace, ⌘K command palette. Execution view uses terminal-output style. |
| **Tagline (EN)** | A Project Operating System Tailored to Your Workflow |
| **Tagline (KR)** | 어떤 팀이든 맞춤 설계하는 프로젝트 운영체제 |

---

## 1. Product Overview

| Item | Description |
|------|-------------|
| **Vision** | A project operating system tailored to your workflow — goals, risks, gates, and deliverables in one control plane. |
| **Positioning** | CLI agent management tool (k9s/lazygit-style), not a generic dashboard. |
| **Default** | Dark theme, mono typography, keyboard-first (e.g. ⌘K command palette). |

---

## 2. Goals & Success

- **Primary:** Operators can create projects, assign tasks to agents, and track execution (terminal logs, reports) without leaving the app.
- **Secondary:** Messenger-driven directives (`$` / `!`) and decision-inbox flows; project-level team and dashboard quadrants (objectives, risks, gates, outputs).

---

## 3. Target Users

- **Primary:** People who run projects and coordinate AI agents (team leads, PMs, small-org leads).
- **Usage:** Create/select project → dashboard/task board/team → run agents → review reports and deliverables.

---

## 4. In Scope (Key Features)

| Area | Description |
|------|-------------|
| **Dashboard** | Project overview, team panel, agent activity, ops sections. |
| **Tasks** | Kanban board, scheduled tasks, deliverables. |
| **Agents & Team** | Agents, departments, heartbeat monitor; project team assignment. |
| **Library** | Skills, Agent Rules, Memory, Hooks. |
| **CLI Usage** | Usage and cost views. |
| **Settings** | API providers, OAuth, gateway/messenger, data, etc. |
| **Messenger** | Telegram, Discord, Slack, etc.; inbox webhook; `$` directive / `!` task flows. |

---

## 5. Out of Scope (Current)

- Multi-tenant SaaS; SSO; mobile-only app; public marketplace for categories/skills.

---

## 6. Requirements & Quick Start

**Requirements:** Node.js ≥ 22, pnpm ≥ 10

```bash
git clone <repo-url> && cd AgentDesk
pnpm install
cp .env.example .env      # 환경변수 설정 (SESSION_SECRET 필수)
pnpm setup                # DB 초기화 + 마이그레이션
pnpm dev                  # 프론트(8800) + API 서버(8790) 동시 시작
```

Open **http://localhost:8800** in your browser.

### 첫 에이전트 등록 흐름

```
1. Settings → API Provider 설정 (Claude / OpenAI / Gemini 등)
2. Agents → 에이전트 생성 + 부서 배정
3. Projects → 프로젝트 생성 + 에이전트 배정
4. Library → Rules / Memory / Hooks 설정 (선택)
5. Tasks → 태스크 생성 → 실행 → 터미널 패널에서 실시간 모니터링
```

### 주요 명령어

| Command | Description |
|---------|-------------|
| `pnpm dev` | 개발 서버 시작 (프론트 + API) |
| `pnpm build` | 프로덕션 빌드 (`tsc -b && vite build`) |
| `pnpm test` | 전체 테스트 실행 (프론트 + 서버) |
| `pnpm run test:web` | 프론트 테스트만 (Vitest) |
| `pnpm run test:api` | 서버 테스트만 (Vitest) |
| `pnpm lint` | 린트 검사 |
| `pnpm lint:fix` | 린트 자동 수정 |
| `pnpm setup` | DB 초기화 + 마이그레이션 |

### 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 서버 시작 안 됨 | `.env` 누락 | `cp .env.example .env` 후 `SESSION_SECRET` 설정 |
| DB 오류 | 마이그레이션 미실행 | `pnpm setup` 재실행 |
| 포트 충돌 | 8790 / 8800 사용 중 | 프로세스 종료 후 재시작 |
| 타입 오류 | 타입 불일치 | `tsc -b` 로 확인 |
| 테스트 git 서명 오류 | GPG 서명 설정 | 테스트 내 `runGit(dir, ["config", "commit.gpgsign", "false"])` 추가 |

---

## 7. Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, PixiJS
- **Backend:** Express 5, SQLite, WebSocket
- **Testing:** Vitest, Playwright

---

## 8. Docs & License

- **Docs:** [docs/README.md](docs/README.md) — design, specs, architecture, strategy.
- **API:** [docs/specs/api.md](docs/specs/api.md); Swagger UI at `/api/docs` when server is running.
- **License:** Apache 2.0
