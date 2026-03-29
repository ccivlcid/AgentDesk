# Orchestration Window — 버그 및 UX 개선 계획

> 분석일: 2026-03-29
> 대상: `src/components/orchestration/` 전체
> 우선순위: 버그 → UX Top 5 → 소규모 개선

---

## 1. 버그 (즉시 수정)

### BUG-1: PM 식별 로직 불일치 ⚠️ 심각

**증상**: 제갈량을 프로젝트 PM으로 지정해도 레오나르도 다 빈치(team_leader)가 PM으로 표시됨.

**근본 원인**:
- 서버: `project_agents.project_role = "pm"` 기준으로 PM 식별
- 프론트: `agents.role === "team_leader"` 기준 — 글로벌 직급과 프로젝트 역할을 혼동

```
서버 kickoff.ts:327
  pmAgent = assignedAgents.find(a => a.project_role === "pm")  ✓ 정확

프론트 RoomTab.tsx:51
  pmAgent = agents.find(a => a.role === "team_leader")          ✗ 잘못됨

프론트 AgentsTab.tsx:609
  pmAgent = agents.find(a => a.role === "team_leader")          ✗ 잘못됨
```

**영향 범위**:
- `RoomTab.tsx:51` — PM 이름 표시 오류
- `RoomTab.tsx:119` — 채팅 bubble PM 분기 오류 (`agents.some(a => a.role === "team_leader" && ...)`)
- `AgentsTab.tsx:609` — PM 카드 대상 에이전트 오류
- `AgentsTab.tsx:73,163` — PM 제외 필터가 잘못된 에이전트를 제외

**수정 방향**:
1. `GET /api/projects/:id/agents` 응답에 `project_role` 포함
2. `projectStore`에 `agentId → projectRole` 맵 추가 (또는 Agent 타입 확장)
3. 프론트에서 `project_role === "pm"` 기준으로 교체

---

### BUG-2: "로그 보기" agentId 미전달

**증상**: AgentsTab에서 "로그 보기" 클릭 시 Logs 탭으로 전환되지만 해당 에이전트가 자동 선택되지 않음.

```
AgentsTab.tsx:100
  onSwitchToLogs?.(agentId)  // agentId 정상 전달

OrchestrationWindow.tsx:161
  onSwitchToLogs={() => { setActiveTab("logs"); }}  // agentId 무시 ✗
```

**수정 방향**: `OrchestrationWindow`에서 `agentId` 수신 후 `LogsTab`의 초기 선택 에이전트로 전달.

---

### BUG-3: 액션 실패 시 사용자 피드백 없음

**증상**: stop/pause/resume/재배정 실패 시 에러를 무음으로 삼킴. 사용자는 성공한 줄 앎.

```
AgentsTab.tsx:109,120,131,155
  catch { /* best effort */ }  // 에러 표시 없음 ✗
```

**수정 방향**: catch 블록에서 `useToast()`로 에러 메시지 표시.

---

### BUG-4: CSS 변수 + hex alpha 연산 오류 ⚠️ 확정

**증상**: `TimelineTab`에서 `${clusterColor}12` 패턴 사용 → `var(--th-success)12` 유효하지 않은 CSS 생성 **확정**.

```
TimelineTab.tsx:43
  clusterColor = clusterStatus === "ALL_COMPLETE" ? "var(--th-success)"  // CSS 변수 ✗

TimelineTab.tsx:121-122
  background: `${clusterColor}12`          // "var(--th-success)12" → 무효
  border: `1px solid ${clusterColor}30`    // "var(--th-success)30" → 무효
```

**수정 방향**: `clusterColor`를 실제 hex 값(`#22c55e` 등)으로 교체하거나, `rgba()` + CSS 변수 대신 `color-mix(in srgb, var(--th-success) 7%, transparent)` 사용.

---

### BUG-5: TabBar 키보드 단축키 전역 등록

**증상**: Orchestration Window가 포커스 상태가 아닐 때도 숫자키 0-3이 탭을 전환함.

```
TabBar.tsx:21-29
  window.addEventListener("keydown", ...)  // 전역 등록 ✗
```

**수정 방향**: 윈도우 포커스 상태 조건 추가. input/textarea 외에도 다른 인터랙션과 간섭.

---

## 2. UX Top 5

### UX-1: 로그/CLI 출력 잘림 — 디버깅 불가 🔴

**문제**: 개발자가 이 화면을 여는 주된 이유가 디버깅인데, 출력이 잘려 읽을 수가 없음.

| 위치 | 제한 | 결과 |
|------|------|------|
| `LogsTab.tsx:499` | 150자 truncation | 에러 메시지 잘림 |
| `LogsTab.tsx:313` | 1000자 truncation | PM 검토 리포트 잘림 |
| `TimelineTab.tsx:320` | 90자 truncation | execution_error_summary 잘림 |
| `TimelineTab.tsx` TaskInspector | `maxHeight: 300px` | 스택 트레이스 스크롤 지옥 |
| `RoomTab.tsx:515` | 400자 truncation | 채팅 피드 메시지 잘림 |

**개선 방향**:
- 로그 항목 클릭 시 전체 내용 모달/인라인 펼침
- TaskInspector 높이 resizable 또는 최소 500px로 증가
- "전체 복사" 버튼 추가

---

### UX-2: 전체 에이전트 교차 로그 없음 🔴

**문제**: 에이전트 A → 에이전트 B 흐름 디버깅 시 탭을 왔다갔다하며 타임스탬프를 수동 비교해야 함.

**현재**: LogsTab이 에이전트 단위 뷰만 제공. "ALL" 선택지 없음.

**개선 방향**:
- LogsTab 에이전트 사이드바 최상단에 "ALL AGENTS" 옵션 추가
- 교차 뷰에서는 각 로그 줄 앞에 에이전트 이름 레이블 표시
- 시간순 정렬 기준으로 인터리브

---

### UX-3: 실행 시간(elapsed) 없음 🟡

**문제**: 진행률 72%인 태스크가 정상 진행 중인지 스톨인지 알 방법이 없음.

**현재**: 진행률 % 바만 표시. 시작 시각/경과 시간/예상 완료 시간 없음.

**개선 방향**:
- 실행 중 태스크에 경과 시간 표시 (예: `3m 42s`)
- 임계값 초과 태스크(예: 10분 이상)에 `STALLED` 경고 배지
- MetricsHeader에 `STALLED N` 배지 추가 (FAILED와 같은 방식)

---

### UX-4: RoomTab PM 이벤트 N+1 쿼리 🟡

**문제**: 태스크 N개 프로젝트 → PM 이벤트 로드에 N번 순차 HTTP 요청. 15개 태스크면 15번 호출.

```
RoomTab.tsx:62-78
  for (const task of tasks) {
    await getTaskExecutionEvents(task.id, 20)  // 순차 호출 ✗
  }
```

**개선 방향**:
- `GET /api/projects/:id/pm-events` 프로젝트 단위 엔드포인트 신설
- 또는 단기 해결: `Promise.all()` 병렬 호출로 전환

---

### UX-5: StageRail/TabBar 가독성 🟡

**문제**:
- StageRail 레이블 `fontSize: 8` — 대부분 해상도에서 읽기 불가
- TabBar 키보드 단축키(0-3) 숨겨져 있어 발견 불가
- `stage === "idle"` 상태에서 "아직 시작 안 함" 표시 없음

**개선 방향**:
- StageRail 폰트 8 → 10
- TabBar 탭 레이블에 단축키 힌트 표시 (예: `TIMELINE  0`)
- `idle` 상태일 때 StageRail 전체를 흐리게 + "킥오프를 시작하세요" 안내 오버레이

---

## 3. 소규모 즉시 개선

| # | 위치 | 내용 |
|---|------|------|
| S-1 | `LogsTab` | 검색바를 하단 → 상단으로 이동 |
| S-2 | `TimelineTab` TaskCard | hover 배경색 변화 추가 (현재 cursor:pointer만 있고 시각 피드백 없음) |
| S-3 | `RoomTab` 우측 사이드바 | 280px → 320px, 태스크 타이틀 tooltip 추가 |
| S-4 | `AgentsTab` 액션 메뉴 | `onMouseLeave` 대신 click-outside + Escape 키로 닫기 |
| S-5 | `MetricsHeader` | $1.00/$5.00 비용 임계값을 Settings에서 설정 가능하게 |
| S-6 | `LogsTab` 에이전트 사이드바 | `name.split(" ")[0]` → 전체 이름 또는 tooltip으로 전체 표시 |
| S-7 | `AgentsTab` PM 카드 | PM 카드에도 "로그 보기" 액션 추가 |

---

## 4. 수정 우선순위 로드맵

```
Phase 1 — 버그 수정 (기능 오류)
  BUG-1  PM 식별 로직 (서버 API + store + 프론트)
  BUG-2  onSwitchToLogs agentId 전달
  BUG-3  액션 실패 토스트 피드백

Phase 2 — UX 핵심 개선
  UX-1  로그/CLI 출력 truncation 해소
  UX-2  LogsTab ALL AGENTS 교차 뷰
  UX-4  RoomTab pm-events 단일 API 엔드포인트

Phase 3 — 개발자 편의 기능
  UX-3  실행 시간(elapsed) + STALLED 감지
  UX-5  StageRail/TabBar 가독성
  S-1 ~ S-7  소규모 개선

Phase 4 — 안정성
  BUG-4  CSS 변수 alpha 수정
  BUG-5  TabBar 키보드 전역 등록
```

---

## 5. 관련 파일 경로

| 파일 | 역할 |
|------|------|
| `src/components/orchestration/OrchestrationWindow.tsx` | 메인 윈도우, props 라우팅 |
| `src/components/orchestration/tabs/AgentsTab.tsx` | 에이전트 테이블 + 액션 |
| `src/components/orchestration/tabs/LogsTab.tsx` | 로그 뷰어 |
| `src/components/orchestration/tabs/TimelineTab.tsx` | 타임라인 + TaskInspector |
| `src/components/orchestration/tabs/RoomTab.tsx` | 채팅 피드 + PM 이벤트 |
| `src/components/orchestration/StageRail.tsx` | 파이프라인 스테이지 |
| `src/components/orchestration/TabBar.tsx` | 탭 + 키보드 단축키 |
| `src/store/projectStore.ts` | projectAgentIds (project_role 없음) |
| `server/modules/routes/core/projects/register-crud-routes.ts` | project_role 저장 |
| `server/modules/routes/core/projects/kickoff.ts` | 서버 PM 로직 |
