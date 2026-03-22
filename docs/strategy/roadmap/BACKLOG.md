# AgentDesk — Development Backlog & Priority

> Last updated: 2026-03-28
> Phase 31 완료 후 남은 작업 목록. P1~P3 전체 완료.

---

## Priority 1: Core Engine (Agent Runtime 완성)

> 에이전트가 실제로 동작하는 엔진의 완성도. 오픈소스 공개 전 필수.

### P1-1. 멀티 프로바이더 Agent Runtime

**현황**: `llm-client.ts`가 Anthropic API만 지원. Settings에서 OpenAI/Ollama/Groq 등을 등록해도 Agent Runtime에서 사용 불가.

**작업**:
- `llm-client.ts`에 OpenAI Chat Completions API 스트리밍 + tool use 추가
- 프로바이더 타입에 따라 자동 분기 (Anthropic → Messages API, 나머지 → OpenAI 호환)
- Ollama/LM Studio/Groq/Together/OpenRouter 자동 지원 (OpenAI 호환 API)

**영향**: 에이전트별 모델 선택이 실제로 동작. "OpenAI 키만 있어도 사용 가능" → 진입 장벽 제거.

**파일**: `server/modules/agent-runtime/llm-client.ts`, `execution-loop.ts`

---

### P1-2. PM 적합도 기반 에이전트 배정

**현황**: PM 오케스트레이터가 라운드 로빈으로 배정 중. `agent_task_fitness` 테이블에 성공/실패/소요시간 데이터 수집 중.

**작업**:
- PM의 `postMeetingCreateAndRun` 배정 로직에 fitness 데이터 반영
- 라운드 로빈 대신 태스크 유형별 최적 에이전트 매칭

**영향**: 프로젝트가 반복될수록 에이전트 배정 정확도 향상.

**파일**: `server/modules/routes/core/projects/kickoff.ts`

---

### P1-3. run_command 도구 추가

**현황**: Spec에 정의되어 있지만 `tools.ts`에 미구현. 현재 list_files/read_file/write_file/search_files 4개만 제공.

**작업**:
- `run_command` 도구 추가 (셸 명령 실행, 타임아웃 30s)
- 허용 목록 or 사용자 확인 기반 보안

**영향**: 에이전트가 빌드/테스트/린트 등 실행 가능. "진짜 개발 자동화" 가능.

**파일**: `server/modules/agent-runtime/tools.ts`

---

## Priority 2: UI/UX 완성

> 기존 선언된 UI 컴포넌트 완성 + 대시보드.

### P2-1. Reports 윈도우

**현황**: WindowType `"reports"` 선언됨. 컴포넌트는 있지만 데이터 연결 미확인.

**작업**:
- 프로젝트별 진행률 (planned/in_progress/done/failed 비율)
- 에이전트별 가동률 + 성공률 (agent_task_fitness 활용)
- 토큰 소비량 / 비용 추정 (agent_runtime_runs 집계)
- 기간별 트렌드 차트

**파일**: `src/components/windows/ReportsWindow.tsx` (확인/생성 필요)

---

### P2-2. 미사용 WindowType 정리

**현황**: 모달로 대체된 WindowType들이 타입 선언에 남아있음.

| WindowType | 상태 | 조치 |
|------------|------|------|
| `create-task` | CreateTaskModal로 대체 | 제거 검토 |
| `create-agent` | QuickCreateAgentModal로 대체 | 제거 검토 |
| `create-department` | Agent Manager 내 모달로 대체 | 제거 검토 |
| `project-create` | ProjectCreateModal로 대체 | 제거 검토 |
| `llm-guide` | 미구현, 필요성 검토 | 제거 or 구현 |
| `user-guide` | 미구현, KeyboardShortcutsGuide와 중복? | 제거 or 구현 |

---

## Priority 3: 안정성 + 개발자 경험

> 오픈소스 공개 품질 기준.

### P3-1. 1분 설치 경험 검증

**현황**: `git clone → pnpm install → pnpm dev`로 실행 가능하지만, 첫 사용 시 API 키 설정 가이드 부족.

**작업**:
- 첫 실행 시 온보딩 플로우 (Settings → API 탭으로 안내)
- API 키 없이도 Local LLM으로 바로 시작할 수 있는 경로
- 에러 메시지 개선 ("No API key" → 구체적 안내)

---

### P3-2. README 리브랜딩

**현황**: `AgentDesk_OpenSource_Product_Strategy.md`에 "Agent Operating System" 포지셔닝이 정리되어 있지만 GitHub README에 미반영.

**작업**:
- README에 데모 GIF/스크린샷
- 기능 목록 + 아키텍처 다이어그램
- "Agent Operating System for Developers" 포지셔닝

---

### P3-3. 테스트 커버리지 강화

**현황**: vitest 테스트 존재하지만 Agent Runtime 관련 테스트 미확인.

**작업**:
- Agent Runtime execution-loop 단위 테스트
- PM 오케스트레이터 이벤트 흐름 테스트
- API 엔드포인트 통합 테스트

---

## Priority 4: 확장성 (Phase 2+)

> 오픈소스 공개 이후 로드맵.

### P4-1. PostgreSQL 지원

**현황**: SQLite (better-sqlite3) 단일 사용자 전용.

**작업**: DB 추상화 레이어 + PostgreSQL 드라이버

---

### P4-2. Queue/Worker 아키텍처

**현황**: in-process 실행. 동시 에이전트 수 제한.

**작업**: Redis/BullMQ 기반 작업 큐

---

### P4-3. Team Workspace

**현황**: 로컬 단독 사용.

**작업**: 멀티 유저, 권한 관리, 공유 프로젝트

---

## 완료 현황

```
✅ P1-1  멀티 프로바이더 (Phase 27)
✅ P1-2  PM 적합도 활용 (Phase 28-29)
✅ P1-3  run_command 도구 (Phase 29)
✅ P2-1  Reports 대시보드 (Phase 30)
✅ P2-2  WindowType 검토 — 제거 불필요 확인
✅ P3-1  온보딩 토스트 (Phase 31)
✅ P3-2  README 리브랜딩 (Phase 32)
⏭️ P4-*  확장성 (PostgreSQL, Queue, Team) — 공개 이후
```
