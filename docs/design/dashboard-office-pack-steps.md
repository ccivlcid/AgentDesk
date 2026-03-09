# 대시보드 오피스 팩 스코프 수정 단계

대시보드에 표시되는 데이터를 **선택한 오피스 팩** 기준으로만 보이도록 하는 구체적인 수정 단계입니다.

---

## 전제

- **agents**: 이미 `displayAgents`(오피스 팩 스코프)로 전달 중.
- **tasks**: 현재 전역 `tasks` 전달 → 팩 필터된 `tasksForActivePack`으로 변경 필요.
- **stats**: 서버 `GET /api/stats`는 전역 집계만 반환 → 비-development 팩에서는 stats 미사용(클라이언트에서 agents+tasks로 계산)하도록 처리.

---

## Phase 1 — 클라이언트만 수정 (서버 변경 없음)

### Step 1. AppMainLayout — 대시보드에 넘기는 props 변경

**파일**: `src/app/AppMainLayout.tsx`

**변경 내용**:

1. **tasks**: `tasks` → `tasksForActivePack`  
   - 대시보드의 미션 수, 완료율, 최근 미션 로그 등이 모두 현재 오피스 팩 태스크만 사용.

2. **stats**: development 팩일 때만 서버 stats 사용, 그 외에는 `null`  
   - `stats={officePackKey === "development" ? stats : null}`  
   - 비-development 팩에서는 Dashboard 내부에서 이미 구현된 fallback 로직이 동작:  
     `stats`가 없을 때 `tasks`/`agents` 배열로 total, done, working, top_agents, tasks_by_department, recentTasks 등을 계산하므로, 넘겨준 `tasksForActivePack` + `displayAgents` 기준으로 팩 스코프 숫자가 나옴.

**수정 후 예시**:

```tsx
{view === "dashboard" && (
  <Dashboard
    stats={officePackKey === "development" ? stats : null}
    agents={displayAgents}
    tasks={tasksForActivePack}
    companyName={settings.companyName}
    onPrimaryCtaClick={() => setView("tasks-board")}
  />
)}
```

**검증**:

- development 팩: 기존과 동일하게 서버 stats 사용, 전역 tasks가 아닌 `tasksForActivePack`(development 태스크만) 기준.
- novel / report / video 등 다른 팩: stats 없음 → 대시보드 숫자·랭킹·부서별·최근 미션이 모두 해당 팩의 agents + tasks 기준으로 표시.

---

### Step 2. (선택) Dashboard.tsx — 라벨만 팩별 용어 사용

**파일**: `src/components/Dashboard.tsx`

**목적**: 대시보드 내 문구(미션, 스쿼드, 클리어 등)를 pack-identity vocabulary와 맞추려면, Dashboard가 `workflowPackKey` 또는 `packVocabulary`를 받아 해당 팩 용어로 라벨을 바꿀 수 있음.

**필수는 아님**. Phase 1만으로도 **데이터**는 오피스 팩 기준으로 동작합니다.  
팩별 **용어** 통일은 별도 작업으로 진행하면 됩니다.

---

## Phase 2 — 서버 확장 (선택, 일관성·성능용)

클라이언트에서 매번 agents/tasks 배열로 집계하지 않고, 서버에서 팩별 집계를 내려받고 싶을 때 사용합니다.

### Step 2-1. API: GET /api/stats 에 쿼리 파라미터 추가

**파일**: `server/modules/routes/ops/settings-stats.ts`

- 쿼리: `workflowPackKey` (선택)
- 동작:
  - 없거나 `development`: 현재와 동일(전역 집계 + tasks_by_department는 development 기준).
  - 있으면: 해당 팩의 tasks/agents만 조건에 넣어 집계.
    - tasks: `COALESCE(workflow_pack_key, 'development') = ?`
    - agents: development면 전역 agents; 그 외에는 `office_pack_departments` 등으로 해당 팩에 속한 agent만 카운트/상위 N명 조회.
- 응답 형태는 기존 `CompanyStats` 유지.

### Step 2-2. 클라이언트: 팩별 stats 요청

**파일**: `src/api/messaging-runtime-oauth.ts`

- `getStats(packKey?: WorkflowPackKey)` 형태로 변경.
- `packKey`가 있으면 `GET /api/stats?workflowPackKey=<packKey>` 호출.

**파일**: `src/app/AppMainLayout.tsx` 또는 stats를 쓰는 부모

- 현재 선택된 `officePackKey`로 `getStats(officePackKey)` 호출하거나,  
  대시보드가 마운트될 때만 해당 팩 stats를 요청하도록 연결.

**주의**: 부트스트랩/라이브 동기화에서 `getStats()`를 한 번만 호출하는 현재 구조라면,  
- 전역 stats 1회 + 대시보드 진입 시 선택 팩 stats 추가 요청, 또는  
- 앱에서 “현재 선택된 팩”을 항상 알고 있고 모든 stats 요청에 해당 팩을 넘기는 방식 중 하나로 정리해야 합니다.

---

## 요약 체크리스트

| 단계 | 작업 | 파일 | 필수 |
|------|------|------|------|
| 1-1 | 대시보드에 `tasksForActivePack` 전달 | `AppMainLayout.tsx` | ✅ |
| 1-2 | (Phase 2 적용으로 대체) 팩 변경 시 stats 재요청 | `useAppActions`, `App.tsx` | ✅ |
| 2 (선택) | 대시보드 라벨 팩 vocabulary 연동 | `Dashboard.tsx` | ❌ |
| 3 | 서버 `/api/stats` 선택 팩 기준 집계 | `settings-stats.ts` | ✅ |
| 4 | 팩 변경 시 stats 재요청 | `useAppActions`, `App.tsx` | ✅ |

**Phase 2 적용**: 서버가 설정의 `officeWorkflowPack` 기준으로 stats를 반환하며, 설정/헤더에서 팩 변경 시 stats를 다시 불러와 대시보드에 항상 현재 팩 stats를 전달합니다.
