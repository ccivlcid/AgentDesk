# 에이전트 룰 학습 완료 후 UI 반영 분석

## 구조 요약

### 1. 데이터 흐름

- **useAgentRulesState** (상태)
  - `learnJob`: 학습 작업 폴링 (`getRuleLearningJob` 1.5초 간격)
  - `learnedRows`: `getAvailableLearnedRules({ limit: 500 })` 결과 → **historyRefreshToken**이 바뀔 때만 refetch
  - `learnedProvidersByRule`: `learnedRows`로부터 rule_id별 학습한 provider 목록 계산 (Map)
  - `historyRefreshToken`: 학습 완료 시 bump → 학습 이력/카드 쪽 refetch 유도

- **학습 완료 시 (learnJob.status === "succeeded" | "failed")**
  - `useEffect`에서 `setHistoryRefreshToken((t) => t + 1)` 호출 (즉시 1회)
  - 1.2초 후 한 번 더 bump
  - 그에 따라 `learnedRows`를 refetch하는 effect와 **RuleHistoryPanel**의 `load()`가 다시 실행됨

### 2. 관련 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| **RuleMemorySection** | "학습 메모리" 섹션, `historyRefreshToken` / `onRefreshHistory` 전달 |
| **RuleHistoryPanel** | "학습 이력" 탭 – `getRuleLearningHistory` + `getAvailableLearnedRules` 호출, refreshToken 변경 시 `load()` 재실행 |
| **AgentRulesGrid** | 룰 카드 목록 – `learnedProvidersByRule`로 카드별 학습한 provider 표시(아바타), "학습" 버튼 |
| **RuleLearningModal** | 학습 모달 – `modalLearnedProviders`로 이미 학습된 provider 표시 |

### 3. 서버 동작 (learn-core)

- `createRuleLearnJob` 내부 `setTimeout(0)`에서:
  1. `job.status = "running"` 후 `recordRuleLearnHistoryState(job, "running")`
  2. `.agents/<agent>/rules/<ruleId>.md` 파일 기록
  3. `job.status = "succeeded"` (또는 실패 시 `"failed"`)
  4. `recordRuleLearnHistoryState(job, job.status, ...)` 로 DB `rule_learning_history`에 반영
- `/api/agent-rules/history` → `rule_learning_history` 테이블 조회
- `/api/agent-rules/available` → 동일 테이블에서 `status = 'succeeded'` 만 조회

즉, job이 "succeeded"로 바뀌는 시점에 이미 DB에는 저장된 상태임.

## 학습 완료 후 UI가 안 바뀌는 가능 원인

1. **refetch 타이밍**
   - bump 직후 한 번의 refetch만으로는, 네트워크/서버 지연 시 아직 갱신되지 않은 데이터가 올 수 있음.
   - 1.2초 지연 bump는 있으나, 그 사이에 사용자가 이미 모달을 닫거나 다른 탭을 보면 “방금 완료”가 반영 안 된 것처럼 보일 수 있음.

2. **완전히 refetch에만 의존**
   - `learnedRows`와 학습 이력 목록이 **서버 refetch 결과**에만 의존하므로, refetch가 끝나기 전까지 UI는 예전 상태로 남음.
   - 학습 완료 직후에 “Succeeded” 행이 바로 안 보이거나, 카드에 학습 완료 표시가 늦게 뜨는 현상이 나올 수 있음.

3. **카드의 "학습" 버튼**
   - `AgentRulesGrid`에서는 `learnedProviders.length > 0`일 때 아바타만 표시하고, **"학습" 버튼은 항상 동일한 문구/스타일**로만 렌더링됨.
   - 이미지처럼 “학습 완료된 룰은 버튼이 다르게 보여야 한다”는 기대와 맞지 않을 수 있음.

## 수정 방향

1. **낙관적 업데이트**
   - `learnJob.status === "succeeded"`인 순간, 해당 job의 `ruleId` + `providers`를 사용해 `learnedRows`에 임시 항목을 바로 반영.
   - 이후 `historyRefreshToken` bump로 refetch한 결과로 다시 덮어쓰면, 서버와 일치하는 상태로 수렴.

2. **학습 완료 후 refetch 보강**
   - 즉시 1회 + 1.2초 1회에 더해, 필요 시 2.5초 등 한 번 더 bump하거나, 모달을 닫을 때 한 번 더 bump하여 이력/카드가 확실히 최신 데이터를 가져오게 함.

3. **카드 "학습" 버튼 상태**
   - `learnedProviders.length > 0`이면 “학습됨” 등으로 문구/스타일을 바꿔서, 학습 완료 상태가 카드에서도 명확히 보이게 함.

위 방향으로 수정 시, “학습이 완료되면 이미지처럼 학습 이력에 Succeeded가 나오고, 카드에도 학습 완료가 바로 반영”되도록 맞출 수 있음.
