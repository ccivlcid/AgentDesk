# AgentDesk — 프로젝트 OS 개요

> **핵심 컨셉:** 다양한 AI 에이전트를 등록해 개발 작업을 수행할 때,
> UI/UX를 통해 모든 과정을 실시간으로 모니터링하고 제어한다.

---

## 1. 왜 AgentDesk인가

### 근본 문제

AI 에이전트가 여러 개 돌아갈 때:
- 어떤 에이전트가 무슨 태스크를 하고 있는지 보이지 않는다
- 룰·메모리·훅·스킬이 어디에 적용되는지 알 수 없다
- 에이전트 간 협업 흐름을 추적할 수 없다
- 문제가 생겨도 어디서 왜 생겼는지 파악하기 어렵다

### AgentDesk의 답

```
에이전트는 CLI 프로세스다.
프로젝트는 그 에이전트들이 일하는 OS다.
UI/UX는 그 OS의 제어판이다.
```

개발자·팀 리드가 **여러 에이전트를 동시에 돌리면서**, 각 에이전트의 실행 상태, 출력, 의사결정, 협업 흐름을 **한 화면에서 실시간으로 모니터링**할 수 있게 한다.

---

## 2. Project OS 개념

AgentDesk는 단순한 태스크 관리 툴이 아니라 **에이전트를 위한 운영체제**다.

```
┌─────────────────────────────────────────────────────────────┐
│                      AgentDesk — Project OS                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   PROJECT    │  │    AGENTS    │  │   LIBRARY    │       │
│  │              │  │              │  │              │       │
│  │ 목표·리스크   │  │ 에이전트 팀  │  │ Skills       │       │
│  │ 게이트·산출물 │  │ 부서 구조    │  │ Rules        │       │
│  │ 번다운 차트   │  │ 페르소나     │  │ Memory       │       │
│  │              │  │              │  │ Hooks        │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         └────────────────►│◄─────────────────┘               │
│                           │                                  │
│                    ┌──────▼───────┐                          │
│                    │    TASKS     │                          │
│                    │              │                          │
│                    │ 태스크 보드   │                          │
│                    │ 실행·스케줄   │                          │
│                    │ 모니터 뷰    │                          │
│                    └──────┬───────┘                          │
│                           │                                  │
│              ┌────────────▼────────────┐                     │
│              │   MONITORING / UIUX     │                     │
│              │                         │                     │
│              │ 터미널 스트리밍          │                     │
│              │ 에이전트 상태 실시간     │                     │
│              │ CLI 사용량 추적          │                     │
│              │ 이상 감지 알림          │                     │
│              └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### OS 계층 구조

```
Organization
  └── Department (부서 — 에이전트 그룹)
        └── Agent (에이전트 — CLI 프로세스)
              └── Task (태스크 — 실행 단위)

Category (프로젝트 유형 템플릿)
  └── Project (프로젝트 — 작업 공간)
        ├── Objectives / Risks / Gates / Outputs
        └── project_agents (배정된 에이전트 팀)
```

---

## 3. 에이전트 모니터링 — UIUX가 보여주는 것

AgentDesk의 핵심 가치는 **"보이지 않던 것을 보이게 만드는 UI"**다.

### 실시간 모니터링 요소

| 화면 | 모니터링 내용 |
|---|---|
| **태스크 보드** | 전체 태스크 상태(대기/실행/완료/실패), 에이전트 배정 현황 |
| **터미널 패널** | 에이전트 CLI 출력 실시간 스트리밍 (stdout) |
| **에이전트 상세** | 현재 상태, 실행 중인 태스크, 스킬·룰·메모리 적용 현황 |
| **현황 모니터** | 에이전트 전체 활동 대시보드, 이상 감지 |
| **CLI 사용량** | 에이전트별 토큰 소비, 비용 추적 |
| **태스크 리포트** | 완료된 태스크의 결과물·diff·로그 |

### 프로젝트 범위 Library 필터링

에이전트를 프로젝트에 배정하면, 해당 프로젝트에서 보이는 스킬·룰·메모리·훅은 **그 프로젝트에 배정된 에이전트의 것만** 표시된다. 사용자가 "어떤 에이전트가 어떤 설정으로 돌아가는지"를 명확히 이해할 수 있다.

```
GET /api/agent-rules?project_id=<id>
  → 프로젝트 배정 에이전트의 룰 + 프로젝트 룰 + 글로벌 룰
  (다른 프로젝트 에이전트의 룰은 보이지 않음)
```

동일하게 `/api/memory`, `/api/hooks`, `/api/skills/available`도 `project_id` 필터 적용.

---

## 4. 에이전트 실행 파이프라인

사용자가 태스크를 실행하면 내부에서 일어나는 일:

```
사용자: "이 태스크 실행"
    │
    ▼
① 에이전트 배정 (자동 또는 수동)
    │
    ▼
② 프롬프트 빌드
   ├── 워크플로우 팩 가이던스 (role, 행동 방침)
   ├── 페르소나 블록 (Jobs, Torvalds 등)
   ├── Rules 주입  ←── 캐시 (5분 TTL)
   ├── Memory 주입 ←── 캐시 (5분 TTL)
   └── 사용 가능한 스킬 목록
    │
    ▼
③ pre-task Hooks 실행 (병렬 async)
    │
    ▼
④ CLI 프로세스 spawn (child_process)
   → stdout 스트리밍 → WebSocket → 터미널 패널
    │
    ▼
⑤ 완료 처리
   ├── post-task / on-error Hooks (fire-and-forget 병렬)
   ├── 스킬 학습 기록
   ├── Memory 자동 추출·저장
   └── task.status = done | failed → broadcast
```

### Library가 에이전트 프롬프트에 주입되는 방식

```
우선순위: project > agent > department > global

[Agent Rules]
  1. [project] 코드 리뷰 필수: PR 전 항상 테스트 실행
  2. [agent]   TypeScript strict 모드 사용
  3. [global]  한국어로 응답

[Agent Memory]
  1. [context] 이전에 발견한 API 버그 패턴
  2. [knowledge] 자주 사용하는 라이브러리 설정
```

---

## 5. 핵심 구성 요소 — Library

에이전트의 행동을 정의하는 4가지 레고 블록:

| 요소 | 역할 | 스코프 |
|---|---|---|
| **Skills** | 에이전트가 학습한 도구·명령 모음 | provider/repo/agent |
| **Rules** | 에이전트가 따라야 할 규칙 | global/dept/agent/project |
| **Memory** | 에이전트가 기억하는 맥락·지식 | global/dept/agent/project |
| **Hooks** | 태스크 이벤트에 자동 실행되는 스크립트 | global/dept/agent/project |

이 4가지를 **프로젝트 단위**로 관리하면, 같은 에이전트도 프로젝트마다 다른 행동 방식을 가질 수 있다.

---

## 6. 현재 시스템 상태

### 완성도 (2026-03-13 기준)

```
에이전트 스폰·관리          ██████████████████░░ 95%
멀티에이전트 오케스트레이션  ██████████████████░░ 90%
데이터베이스·인프라          ██████████████████░░ 90%
스킬 학습·메모리             █████████████████░░░ 85%
하트비트·이상 감지           █████████████████░░░ 85%
스케줄링                    █████████████████░░░ 85%
UIUX 모니터링               ████████████████░░░░ 80%
시각적 에이전트 그래프       ████████░░░░░░░░░░░░ 40%
```

### 동시 실행 안전 한계

| 동시 에이전트 수 | Phase 1 전 | Phase 1 후 (현재) | Phase 2 후 |
|:-:|:-:|:-:|:-:|
| 1~3개 | ✅ | ✅ | ✅ |
| 5개 | ⚠️ 체감 지연 | ✅ | ✅ |
| 10개 | ❌ 블로킹 위험 | ⚠️ 경미한 지연 | ✅ |
| 20개+ | ❌ 자원 고갈 | ⚠️ 큐 없어 위험 | ✅ 큐 제어 |

### Phase 1 성능 개선 완료 (2026-03-13)

- **훅 병렬 실행**: `execFileSync` → `execFileAsync + Promise.all` (최대 600s 블로킹 제거)
- **DB 복합 인덱스 4개 추가**: enabled+scope 필터 풀스캔 해소
- **Rules·Memory 5분 TTL 캐시**: 동일 프로젝트 10개 태스크 동시 시작 시 DB 재조회 제거

---

## 7. 로드맵

### Phase 2 — 확장성 (예정)

- **P1-A**: spawn 시 DB 쿼리 배치화 (현재 6회 → 1~2회)
- **P2-A**: 동시 에이전트 수 상한 + FIFO 대기 큐
- **P2-C**: WebSocket broadcast 100ms debounce 배치화

### Phase 3 — 장기 안정화 (예정)

- **시각적 에이전트 그래프**: 에이전트 간 관계·흐름 실시간 그래프 뷰
- **이상 감지 인덱스 최적화**: 60초 주기 풀스캔 → 인덱스 기반 빠른 쿼리
- **Slack 연동**: 실무 메신저 지원

---

## 8. 문서 지도

| 문서 | 내용 |
|---|---|
| [`docs/OVERVIEW.md`](./OVERVIEW.md) | **지금 이 문서** — 전체 개요 |
| [`docs/specs/api.md`](./specs/api.md) | REST API 전체 명세 |
| [`docs/architecture/SYSTEM-STRUCTURE-MAP.md`](./architecture/SYSTEM-STRUCTURE-MAP.md) | 시스템 구조 맵 |
| [`docs/architecture/README.md`](./architecture/README.md) | 아키텍처 상세 (자동 생성) |
| [`docs/architecture/ARCHITECTURE-AUDIT-2026-Q1.md`](./architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | 아키텍처 품질 감사 |
| [`docs/strategy/agent-performance-audit.md`](./strategy/agent-performance-audit.md) | 에이전트 실행 성능 감사 + 로드맵 |
| [`docs/strategy/backend-engine-audit.md`](./strategy/backend-engine-audit.md) | 백엔드 엔진 품질 감사 |
| [`docs/strategy/bigger-ide-vision.md`](./strategy/bigger-ide-vision.md) | "더 큰 IDE" 전략 비전 |
| [`docs/strategy/agent-persona-system.md`](./strategy/agent-persona-system.md) | 에이전트 페르소나 시스템 |
| [`docs/design/DESIGN.md`](./design/DESIGN.md) | UI/UX 디자인 시스템 |

---

## 9. 빠른 시작

```bash
pnpm install
cp .env.example .env
pnpm setup
pnpm dev
# → http://localhost:8800
```

### 첫 에이전트 등록 흐름

```
1. Settings → API Provider 설정 (Claude / OpenAI / 등)
2. Agents → 에이전트 생성 + 페르소나 설정
3. Projects → 프로젝트 생성 + 에이전트 배정
4. Library → 프로젝트용 Rules / Memory / Hooks 설정
5. Tasks → 태스크 생성 → 실행 → 터미널 패널에서 실시간 모니터링
```
