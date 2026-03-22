# Phase 23: Optimize 학습 루프 — 구현 스펙

> **목표**: 완료된 태스크에서 자동으로 패턴을 학습하고, 다음 프로젝트에 적용하는 피드백 루프 구축
>
> **핵심 원칙**: 학습도 이벤트 기반으로 자동 실행. 태스크 완료 이벤트가 학습을 트리거.
>
> **예상 작업량**: 대규모 (파일 12~18개 수정/생성)
>
> **선행 조건**: Phase 21 (Run 안정성), Phase 22 (Debug 경험) 완료
>
> **이벤트 연동**: Phase 21의 EventBus 활용
> - `task_status_changed` (toStatus: "done") → 자동으로 `runAutoLearning()` 트리거
> - 프로젝트 내 모든 태스크 done → 자동으로 `generateProjectRetrospective()` 트리거

---

## 23-1. 태스크 완료 후 자동 학습

### 목적
태스크가 done 상태가 되면 LLM이 결과를 분석하여 Rules/Memory를 자동 생성.

### 서버 변경

**새 파일**: `server/modules/workflow/orchestration/run-complete-handler/auto-learning.ts`

```typescript
export async function runAutoLearning(deps: {
  taskId: string;
  taskTitle: string;
  projectId: string | null;
  agentId: string | null;
  logsDir: string;
  db: DatabaseSync;
  findApiProvider: Function;
  callProvider: Function;
  resolveModel: Function;
  appendTaskLog: Function;
}): Promise<void> {
  // 1. 태스크 로그 + 프롬프트 읽기
  // 2. LLM에게 "이 태스크에서 배울 점" 분석 요청
  // 3. 결과를 rules/memory에 자동 저장

  const systemPrompt = loadPrompt("system/auto-learning");
  // ... LLM 호출 ...
  // 응답: { rules: [...], memories: [...] }
  // rules → rule_entries 테이블 (scope: project)
  // memories → skill_learning_history 테이블
}
```

**새 프롬프트 파일**: `prompts/system/auto-learning.md`

```markdown
You are a learning extraction agent. Given a completed task's prompt and output log,
extract reusable knowledge.

Respond with JSON:
{
  "rules": [
    { "title": "brief rule name", "content": "rule description", "category": "coding|testing|architecture|workflow" }
  ],
  "memories": [
    { "title": "brief memory name", "content": "what was learned", "category": "pattern|pitfall|preference" }
  ]
}

Rules:
- Only extract knowledge that would be useful for FUTURE similar tasks
- Do NOT extract task-specific details (file names, variable names)
- Focus on patterns: "이 프로젝트에서 React 컴포넌트는 항상 Tailwind CSS를 사용한다"
- Focus on pitfalls: "npm install --save-dev 대신 pnpm add -D를 사용해야 한다"
- Max 3 rules, max 3 memories per task
- If nothing useful, return empty arrays
```

### 호출 위치

**파일**: `server/modules/workflow/orchestration/review-finalize-tools/finalize-approved-review.ts`

```typescript
// 태스크 done 마킹 후:
void runAutoLearning({ taskId, taskTitle, projectId, agentId, ... });
```

### 프론트엔드 변경

**파일**: `src/components/TaskReportPopup.tsx`

보고서에 "자동 학습 결과" 섹션 추가:
- 추출된 Rules 목록
- 추출된 Memory 목록
- "삭제" 버튼 (잘못 추출된 것 제거)

---

## 23-2. 에이전트-태스크 적합도 추적

### 목적
어떤 에이전트가 어떤 유형의 태스크에서 성공률이 높은지 추적.

### DB 변경

```sql
-- migration: 2026-03-29-001-agent-task-fitness
CREATE TABLE IF NOT EXISTS agent_task_fitness (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,          -- 'frontend', 'backend', 'testing', 'devops', etc.
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  last_updated INTEGER DEFAULT (unixepoch()*1000)
);
CREATE INDEX IF NOT EXISTS idx_agent_fitness ON agent_task_fitness(agent_id, task_type);
```

### 서버 변경

태스크 완료/실패 시 fitness 테이블 업데이트:

```typescript
// finalize-approved-review.ts 또는 state-updates.ts:
function updateAgentFitness(agentId: string, taskType: string, success: boolean, durationMs: number) {
  const existing = db.prepare(
    "SELECT * FROM agent_task_fitness WHERE agent_id = ? AND task_type = ?"
  ).get(agentId, taskType);

  if (existing) {
    const field = success ? "success_count" : "failure_count";
    const newAvg = Math.round((existing.avg_duration_ms * (existing.success_count + existing.failure_count) + durationMs) /
      (existing.success_count + existing.failure_count + 1));
    db.prepare(
      `UPDATE agent_task_fitness SET ${field} = ${field} + 1, avg_duration_ms = ?, last_updated = ? WHERE id = ?`
    ).run(newAvg, Date.now(), existing.id);
  } else {
    db.prepare(
      "INSERT INTO agent_task_fitness (agent_id, task_type, success_count, failure_count, avg_duration_ms) VALUES (?, ?, ?, ?, ?)"
    ).run(agentId, taskType, success ? 1 : 0, success ? 0 : 1, durationMs);
  }
}
```

### 킥오프 태스크 배정 시 활용

**파일**: `prompts/system/project-kickoff.md`

프롬프트에 에이전트별 적합도 정보 추가:
```
Available agents (with fitness scores):
- Alice [PM] — frontend: 95% (12/12), backend: 80% (8/10)
- Bob [Dev] — backend: 100% (5/5), testing: 60% (3/5)
```

---

## 23-3. 프롬프트 버전 관리

### 목적
프롬프트 변경 이력 추적. 어떤 프롬프트 버전이 성공률이 높은지 비교.

### DB 변경

```sql
-- migration: 2026-03-29-002-prompt-versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  prompt_name TEXT NOT NULL,         -- 'system/project-kickoff'
  version INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT NOT NULL,        -- MD5 of prompt content
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()*1000),
  UNIQUE(prompt_name, content_hash)
);
```

### 서버 변경

**파일**: `server/lib/prompt-loader.ts`

프롬프트 로드 시 자동으로 버전 기록:

```typescript
export function loadPromptWithVersion(name: string, vars?: Record<string, string>): { content: string; versionId: string } {
  const content = loadPrompt(name, vars);
  const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
  // DB에 버전 기록 (없으면 생성)
  // 반환: content + versionId
}
```

태스크 완료/실패 시 해당 프롬프트 버전의 success/failure count 업데이트.

### 프론트엔드 변경

Settings → "프롬프트 성과" 탭:
- 프롬프트별 성공률 표시
- 버전 히스토리 (언제 변경됐는지)
- 성공률이 떨어진 프롬프트 경고

---

## 23-4. 프로젝트 완료 후 회고 보고서

### 목적
프로젝트의 모든 태스크가 완료되면 자동으로 회고 보고서 생성.

### 서버 변경

PM Oversight sweep에서 프로젝트 완료 감지 시:

```typescript
// kickoff.ts - 프로젝트 완료 시 (planned=0, in_progress=0):
void generateProjectRetrospective(projectId);
```

**새 함수**: `generateProjectRetrospective()`

```typescript
async function generateProjectRetrospective(projectId: string) {
  // 1. 프로젝트 정보 + 모든 태스크 요약 수집
  // 2. LLM에게 회고 분석 요청
  // 3. 결과를 project에 저장

  const systemPrompt = loadPrompt("system/project-retrospective");
  // 응답: { summary, what_went_well, what_to_improve, recommendations }
  // DB에 저장 → 프로젝트 폴더 창에 표시
}
```

**새 프롬프트 파일**: `prompts/system/project-retrospective.md`

---

## 구현 순서

```
23-1 자동 학습          (1.5시간, LLM + DB + UI)
23-2 적합도 추적        (1시간, DB + 킥오프 연동)
23-4 회고 보고서        (1시간, LLM + 프로젝트 뷰)
23-3 프롬프트 버전 관리 (2시간, 복잡도 높음)
```

### 검증 기준

- [ ] 태스크 완료 → 자동으로 Rules 1~3개 생성 → Library에서 확인 가능
- [ ] 10개 태스크 완료 → 에이전트별 적합도 표 생성
- [ ] 킥오프 시 적합도 점수 기반 에이전트 추천
- [ ] 프로젝트 전체 완료 → 회고 보고서 자동 생성
- [ ] 프롬프트 파일 수정 → 새 버전 자동 기록 → 성공률 비교 가능
