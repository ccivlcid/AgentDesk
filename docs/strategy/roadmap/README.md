# AgentDesk Development Roadmap

> AI 에이전트가 개발을 진행하기 위한 구현 스펙 문서 모음

---

## 현재 상태

```
Create   ████████░░  80%
Run      █████████░  85%  ✅ Phase 21 완료
Observe  █████████░  90%  ✅ Phase 25 완료
Debug    ████████░░  75%  ✅ Phase 22 완료
Optimize ███████░░░  65%  ✅ Phase 23 완료

전체     ████████░░  79%
```

**Phase 21-25 모두 완료.**

---

## Phase 구성

| Phase | 목표 | 문서 | 작업량 | 의존성 |
|-------|------|------|--------|--------|
| **21** | **PM 오케스트레이션** | [PHASE-21-RUN-STABILITY.md](./PHASE-21-RUN-STABILITY.md) | 중규모 | 없음 |
| **22** | **Debug 경험** | [PHASE-22-DEBUG-EXPERIENCE.md](./PHASE-22-DEBUG-EXPERIENCE.md) | 중규모 | Phase 21 필수 |
| **23** | **Optimize 학습** | [PHASE-23-OPTIMIZE-LEARNING.md](./PHASE-23-OPTIMIZE-LEARNING.md) | 대규모 | Phase 21, 22 |

---

## Phase 21: PM 에이전트 오케스트레이션

**핵심**: 타이머/시스템 코드가 하던 오케스트레이션을 PM 에이전트가 LLM 판단으로 수행.

| # | 항목 | 핵심 변경 |
|---|------|---------|
| 21-1 | PM 오케스트레이션 엔진 | pm-orchestrator.ts — PM이 이벤트 수신 → LLM 판단 → 행동 |
| 21-2 | PM 프롬프트 파일 | prompts/pm/review-task.md, handle-failure.md |
| 21-3 | 이벤트 버스 | event-bus.ts — 태스크 상태 변경 이벤트 |
| 21-4 | 기존 폴링 제거 | PM oversight setInterval, YOLO 정규식 자동 클릭 제거 |
| 21-5 | 실패 재시도 (PM 판단) | PM이 retry/reassign/escalate 결정 |
| 21-6 | 서버 복원 + Shutdown | pm_oversight_state 테이블, graceful shutdown |

## Phase 22: Debug 경험

PM이 실패를 분석하고, 프롬프트 히스토리를 확인할 수 있는 단계. (Phase 21에서 PM의 `pmHandleFailure()`가 기본 분석 수행. Phase 22는 UI/UX 강화.)

| # | 항목 | 핵심 변경 |
|---|------|---------|
| 22-1 | PM 실패 분석 결과 UI | PM의 error_analysis를 카드에 표시 |
| 22-2 | 프롬프트 히스토리 UI | /api/tasks/:id/prompt + 뷰어 컴포넌트 |
| 22-3 | 원클릭 태스크 재실행 | POST /api/tasks/:id/retry → PM에게 재실행 요청 |
| 22-4 | 에이전트 충돌 감지 | PM이 동시 실행 상황 감지 → 경고 |

## Phase 23: Optimize 학습 루프

시스템이 점점 나아지는 피드백 루프 구축.

| # | 항목 | 핵심 변경 |
|---|------|---------|
| 23-1 | 자동 학습 | 태스크 완료 시 Rules/Memory 자동 추출 |
| 23-2 | 에이전트 적합도 추적 | agent_task_fitness 테이블 + 킥오프 추천 |
| 23-3 | 프롬프트 버전 관리 | prompt_versions 테이블 + 성공률 비교 |
| 23-4 | 프로젝트 회고 보고서 | 전체 완료 시 자동 회고 생성 |

---

## AI 에이전트 개발 가이드

### 각 Phase 문서 구성

모든 Phase 문서는 동일한 구조:

1. **목적** — 왜 이 작업이 필요한지
2. **DB 변경** — 마이그레이션 SQL (CLAUDE.md 규칙 준수)
3. **서버 변경** — 파일 경로 + 코드 스니펫 + 호출 위치
4. **프론트엔드 변경** — 컴포넌트 + API 함수
5. **테스트 시나리오** — 검증 기준
6. **구현 순서** — 의존관계 기반 실행 순서

### 개발 시 준수 사항 (CLAUDE.md 엄격 준수)

- **0-1**: JSX/TSX에 이모지 문자 절대 금지. 모든 아이콘은 inline SVG
- **0-2**: SVG는 width/height px 명시, viewBox="0 0 24 24", stroke="currentColor"
- **0-3**: `npx tsc -b --noEmit` 에러 0건 필수. `any` 사용 시 주석으로 사유 명시. `as Foo` 타입 단언 금지
- **0-4**: 신규 파일은 80줄 이상 또는 2곳 이상 재사용 시에만 생성
- **0-5**: DB 마이그레이션은 `migrations-e-recent.ts`에 append-only. DDL은 try/catch 래핑
- **0-6**: 글로벌 상태는 Zustand store 사용. 불필요한 useCallback/useMemo 금지
- **0-7**: 새 엔드포인트는 `docs/specs/api.md`에 문서화 (버전 bump). 응답은 `{ ok: true }` / `{ error: "snake_case" }`. console.log 대신 pino logger
- 프롬프트는 `prompts/` 디렉토리에 .md 파일로 분리
- Last migration ID: `2026-03-26-004-yolo-mode-default-on`

### 아키텍처 원칙 (Phase 21+)

- **이벤트 기반**: `setInterval` 폴링 금지. `server/lib/event-bus.ts`의 EventBus 사용
- **즉시 반응**: 태스크 상태 변경 → 이벤트 발행 → 리스너가 즉시 처리
- **AI 판단**: 시간 기반 체크(TTL, 타이머) 대신 AI가 상황을 판단하고 결정
- **폴링 허용 예외**: WS 배치(150-250ms), cron(60s), 외부 API 폴링(OAuth/Notion)

### 작업 진행 방법

```
1. Phase 문서 읽기
2. 구현 순서대로 진행
3. 각 항목 완료 시 검증 기준 확인
4. 타입 체크 통과 확인
5. docs/progress.md 업데이트
```
