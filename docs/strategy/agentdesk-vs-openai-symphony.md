# AgentDesk vs OpenAI Symphony

기준 시점: 2026-03-09

- 로컬 기준 프로젝트: AgentDesk (`README.md`, `package.json`, `docs/specs/api.md`, `docs/reference/progress.md` 기준)
- 비교 대상: OpenAI Symphony 공개 저장소
  - https://github.com/openai/symphony
  - https://github.com/openai/symphony/blob/main/README.md
  - https://github.com/openai/symphony/blob/main/SPEC.md
  - https://github.com/openai/symphony/blob/main/elixir/README.md

## 한 줄 요약

AgentDesk는 "AI 에이전트 조직을 운영하는 제품"에 가깝고, Symphony는 "이슈 트래커 기반으로 코딩 에이전트를 지속 실행하는 오케스트레이터 스펙/레퍼런스 구현"에 가깝다.

## 1. 제품 목적 차이

### AgentDesk

- CEO 대시보드, 칸반, 메신저 연동, 부서/에이전트 관리, 오피스 뷰를 포함한 운영형 애플리케이션이다.
- 사용자 관점에서 에이전트 회사 전체를 관리하는 UX가 중심이다.
- 실제 코드베이스 기준으로 Claude Code, Codex CLI, Gemini CLI 등 여러 CLI 에이전트를 하나의 앱 안에서 운영하도록 설계되어 있다.

근거:

- `README.md`는 AgentDesk를 "AI Agent Office Simulator"로 설명한다.
- 주요 기능에 KPI 대시보드, 칸반 보드, 메신저 통합, 멀티 언어 UI가 포함되어 있다.
- `docs/specs/api.md`에는 메시징, 디렉티브, 디시전 인박스, 부서/에이전트/태스크 API가 폭넓게 정의되어 있다.

### Symphony

- README 기준 Symphony는 프로젝트 작업을 "isolated, autonomous implementation runs"로 바꾸는 서비스다.
- 핵심 초점은 사람이 코딩 에이전트를 직접 붙잡고 있지 않아도, Linear 보드를 감시하며 작업을 분배하고 증빙을 남기도록 하는 데 있다.
- 즉 제품 UI보다 작업 오케스트레이션 서비스 성격이 더 강하다.

근거:

- `README.md`는 Symphony를 "manage work instead of supervising coding agents"라고 설명한다.
- `SPEC.md`는 Symphony를 "issue tracker를 지속적으로 읽고, 이슈별 격리 워크스페이스를 만들고, 그 안에서 coding agent session을 실행하는 long-running automation service"로 정의한다.

## 2. 아키텍처 관점 비교

| 항목 | AgentDesk | Symphony |
| --- | --- | --- |
| 제품 형태 | 사용자-facing 운영 앱 | 백그라운드 오케스트레이터 서비스 |
| 기본 인터페이스 | React UI + Express API + WebSocket + SQLite | 스펙 중심, Elixir 레퍼런스는 서비스 + 최소 대시보드 |
| 핵심 엔터티 | 부서, 에이전트, 태스크, 메시지, 디렉티브, 프로젝트 | 이슈, 워크플로우, 워크스페이스, 런 어템프트, 오케스트레이터 상태 |
| 상태 저장 | SQLite 기반 영속 상태 | 스펙상 오케스트레이터 DB 비필수, 런타임 메모리 상태 중심 |
| 운영 대상 | 다수 에이전트와 다수 협업 채널 | 이슈 트래커에서 가져온 작업 실행 |

### AgentDesk의 구조

- 프론트엔드: React 19 + Vite + Tailwind
- 서버: Express 5 + SQLite + WebSocket
- UI에서 운영 상태를 직접 보고 조작하는 구조가 강하다.
- 오피스 뷰와 설정 화면, 메신저 수신기, 스킬 라이브러리 같은 운영 부가 기능이 크다.

### Symphony의 구조

- `SPEC.md`는 구조를 명확히 계층화한다.
- 주요 계층은 `Workflow Loader`, `Config Layer`, `Issue Tracker Client`, `Orchestrator`, `Workspace Manager`, `Agent Runner`, `Status Surface`, `Logging`이다.
- Elixir 구현은 Phoenix LiveView 기반 최소 대시보드와 JSON API를 추가한 형태다.

## 3. 오케스트레이션 모델 차이

### AgentDesk

- 태스크, 디렉티브, 메신저 입력이 시스템 진입점이다.
- `AGENTS.md` 기준으로 `$` CEO directive, `#` task, 메신저 인박스 등 사람 중심 이벤트가 강하게 모델링돼 있다.
- 내부적으로 부서, 팀장 회의, 리뷰, 보고 흐름까지 포함한 "조직 시뮬레이션형 협업 프로세스"를 가진다.

### Symphony

- 진입점이 사람 메시지보다 이슈 트래커 polling이다.
- `SPEC.md`에서 오케스트레이터는 poll tick, claim, running, retry, reconciliation을 단일 권위 상태로 관리한다.
- 워크플로우 정책은 저장소 안의 `WORKFLOW.md`에 두고, 런타임은 이를 읽어 동작한다.

### 해석

AgentDesk는 "사람이 회사 운영 콘솔에서 에이전트 조직을 지휘"하는 모델이고, Symphony는 "저장소에 붙은 자동화 데몬이 이슈를 계속 집행"하는 모델이다.

## 4. 실행 단위와 격리 전략

### AgentDesk

- 프로젝트, 태스크, 에이전트 단위 실행이 중심이다.
- 여러 메신저 채널과 수동/반자동 지시 흐름을 지원한다.
- 코드상 worktree/프로젝트 경로/태스크 로그/중단 토큰 등 실행 관리 요소가 있지만, 제품 표면은 태스크 보드와 조직 운영에 맞춰져 있다.

### Symphony

- 이슈별 격리 워크스페이스가 핵심이다.
- `SPEC.md`는 워크스페이스 루트, 생성 훅, 실행 전/후 훅, 제거 전 훅, retry/backoff, stall timeout까지 명세한다.
- Elixir README는 "candidate work를 poll -> issue별 isolated workspace 생성 -> Codex app-server mode 실행" 흐름을 직접 설명한다.

## 5. 에이전트 및 툴 결합 방식

### AgentDesk

- 멀티 에이전트 런타임 자체가 제품 핵심이다.
- 로컬 코드와 문서상 Claude Code, Codex, Gemini를 병렬 운용 대상으로 본다.
- 메신저 채널, 디시전 인박스, 직접 assign/run/stop API가 있어 운영 제어면이 넓다.

### Symphony

- 스펙상 coding-agent executable은 교체 가능하지만, 현재 레퍼런스 구현은 Codex app-server 중심이다.
- `SPEC.md`는 app-server 호환 프로토콜과 Codex 설정(`approval_policy`, `thread_sandbox`, `turn_sandbox_policy`)을 핵심 런타임 입력으로 본다.
- Elixir README도 Codex App Server mode를 전면에 둔다.

## 6. 설정과 정책 소유권

### AgentDesk

- 앱 설정, 에이전트 설정, 메신저 채널 설정, 프로젝트 경로, UI/운영 정책이 애플리케이션 내부에 넓게 퍼져 있다.
- SQLite와 서버 설정 API를 통해 운영 중 값을 다루는 애플리케이션 성격이 강하다.

### Symphony

- 정책의 1차 소유자가 저장소 내부 `WORKFLOW.md`다.
- `SPEC.md`는 prompt body와 YAML front matter를 통해 tracker, polling, workspace, hooks, agent, codex 설정을 선언적으로 소유하게 한다.
- 또한 `WORKFLOW.md` 변경 시 동적 reload까지 요구한다.

### 해석

Symphony는 "repo-owned workflow contract"를 강하게 밀고, AgentDesk는 "application-owned control plane"에 더 가깝다.

## 7. 관측성과 운영 UX

### AgentDesk

- 대시보드, 칸반, 오피스 뷰, 메신저 수신 상태, 에이전트/부서 관리 등 가시화 계층이 두텁다.
- 사용자에게 시각적 운영 경험을 주는 것이 차별점이다.

### Symphony

- 스펙은 최소한의 observability를 요구하지만, rich web UI는 non-goal로 둔다.
- 즉 운영자 UI는 부가 요소이고, 본질은 안전한 스케줄링과 재시도, 상태 조정이다.
- Elixir 구현은 최소 Phoenix 대시보드를 제공하지만 제품의 중심은 아니다.

## 8. 외부 시스템 통합 관점

### AgentDesk

- Telegram, Discord, Slack 등 메신저 통합이 이미 중요한 축이다.
- 사람과 에이전트, 외부 채널 간 상호작용을 제품 안으로 끌어온다.

### Symphony

- 현재 스펙 버전의 핵심 외부 통합은 Linear다.
- PR 링크, 코멘트, 상태 전환 같은 쓰기 작업은 기본적으로 coding agent가 workflow/runtime 툴을 통해 수행한다고 본다.

## 9. 지금 기준에서의 장단점

### AgentDesk가 더 강한 부분

- 운영 UI와 사용자 경험
- 다중 메신저/다중 에이전트 통합
- 조직 모델링과 업무지시 흐름
- 앱 형태로 바로 시연 가능한 완성도

### Symphony가 더 강한 부분

- 이슈 기반 자동 실행 모델의 명확성
- 워크스페이스 격리와 재시도/복구 상태기계의 엄밀함
- 저장소 내 `WORKFLOW.md`로 정책을 버전 관리하는 단순한 계약 구조
- "트래커 기반 무인 실행 서비스"라는 포지셔닝의 선명함

## 10. AgentDesk에 적용해볼 만한 Symphony 아이디어

1. `WORKFLOW.md` 같은 저장소-소유 정책 계약 도입
2. 태스크/프로젝트별 격리 워크스페이스와 훅 체계 표준화
3. claim/running/retry/reconciliation 상태기계 명시화
4. 동적 설정 reload 규칙을 문서와 코드에서 더 일관되게 정리
5. "사람 지시 기반"과 "트래커 polling 기반"을 함께 지원하는 하이브리드 모드 설계

상세 적용안은 별도 문서(통합/제거됨) 참조.

## 11. 결론

AgentDesk와 Symphony는 경쟁 관계라기보다 레이어가 다르다.

- AgentDesk는 운영 콘솔과 협업 제품이다.
- Symphony는 이슈 트래커 중심 자동 집행 엔진이다.

현재 AgentDesk는 제품 표면과 협업 UX가 훨씬 풍부하고, Symphony는 오케스트레이터 코어 모델이 더 날카롭다.  
따라서 AgentDesk를 Symphony와 비교할 때 가장 현실적인 방향은 "Symphony식 워크플로우 계약과 상태기계를 AgentDesk의 실행 엔진에 흡수하고, AgentDesk의 강한 UI/메신저/조직 운영층은 유지"하는 것이다.
