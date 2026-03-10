# Office Pack 제거 계획

**작성일:** 2026-03-10
**우선순위:** HIGH
**예상 범위:** 대규모 (330+ 참조, 약 15개 파일 주요 수정)
**전제 문서:** [product-design.md](../product-design.md)

---

## 1. 왜 제거해야 하는가

### 현재 구조 (1.x)
```
officeWorkflowPack: "development" | "novel" | "report" | "video_preprod" | ...
```
- 에이전트·부서를 미리 정해진 "팩"으로 묶어 배포하는 오피스 시뮬레이터 기능
- `novel`, `report`, `video_preprod`, `web_research_report`, `roleplay`, `asset_management`
- 사용자는 팩을 선택하면 에이전트/부서가 자동으로 생성됨

### 2.0 Product OS와의 충돌
| 항목 | Office Pack (1.x) | Project OS (2.0) |
|------|-------------------|------------------|
| 팀 정의 | 팩 선택 → 전사 에이전트 자동 배포 | 사용자가 에이전트 직접 생성, 프로젝트별 팀원 선택 |
| 도메인 | IT/소설/보고서 등 고정 도메인 | 카테고리로 어떤 도메인도 적용 가능 |
| 컨텍스트 단위 | 전사 오피스 | 프로젝트 |
| 에이전트 수명 | 팩 전환 시 리셋 | 지속적, 프로젝트 간 공유 가능 |

**결론:** Office Pack은 "CEO 역할극 오피스 시뮬레이터" 패러다임의 핵심이었으나, "Project OS"에서는 불필요하며 혼란을 유발한다.

---

## 2. 현재 Office Pack이 하는 일

### 2-A. 에이전트/부서 시드
- `officePackProfiles` 설정에 팩별 에이전트/부서를 저장
- 부트스트랩 시 팩에 맞는 에이전트를 DB에 자동 생성 (`seedCategories` 연계)
- `generateOfficePresentation()` → 팩 테마에 맞는 UI 요소 주입

### 2-B. 헤더 팩 선택기
- `AppHeaderBar`의 `officePackControl` 드롭다운
- 팩 전환 시 에이전트/부서 재배포

### 2-C. 태스크 워크플로우 어휘
- `usePackVocab()` — 팩별로 "Task/업무", "Tasks/업무들" 단어를 다르게 표시
- `WorkflowPackKey` 타입 전파 (TaskBoard, AgentManager 등)

### 2-D. 오피스 뷰 테마
- `buildOfficePackPresentation()` — 팩별 부서 색상·아이콘 오버라이드
- Room Themes (`customRoomThemes`) — 이미 삭제 진행 중

---

## 3. 대체 방안

### 핵심 원칙
> 팩(Pack) = 전사 설정이 아니라, **카테고리 기반 역할 제안**으로 전환

| 현재 | 대체 |
|------|------|
| 오피스 팩 선택 → 전사 에이전트 자동 생성 | 카테고리 선택 → 프로젝트에 필요한 **역할 목록 제안** |
| 팩별 어휘 ("Novel: Story", "Report: Report") | 단일 어휘 ("Task", "Tasks") |
| 팩 전환 시 에이전트 교체 | 에이전트는 영속, 프로젝트 팀원만 변경 |
| 헤더 팩 드롭다운 | 제거 |

### 3-A. 카테고리 역할 템플릿 (신규)
```typescript
// Category에 추가
interface Category {
  // 기존
  id, name, color, icon, ...
  // 신규
  suggested_roles?: AgentRole[];  // 이 카테고리에서 필요한 역할 제안
}
```
- 프로젝트 생성 시 카테고리를 선택하면 "추천 역할: PM, 개발자, QA" 같이 에이전트 역할만 제안
- 실제 에이전트 생성은 사용자가 결정

### 3-B. 어휘 단일화
- `usePackVocab()` → 삭제
- 모든 곳에서 "Task / Tasks" (ko: 업무 / 업무들) 사용
- `WorkflowPackKey` 타입 → 삭제

---

## 4. 제거 대상 파일 목록

### 완전 삭제
```
src/app/office-workflow-pack.ts          (진입점)
src/app/office-workflow-pack/
  ├── pack-presets-a.ts
  ├── pack-presets-b.ts
  ├── presentation.ts
  ├── starter.ts
  ├── themes.ts
  ├── types.ts
  └── name-pool-a.ts
src/app/office-pack-display.ts
src/components/office-theme/            (테마 프리셋)
```

### 수정 필요 파일 (주요)
```
src/app/AppMainLayout.tsx              officePackKey 관련 로직 제거
src/app/AppHeaderBar.tsx               officePackControl 제거
src/app/useAppBootstrapData.ts         roomThemes 관련 제거
src/components/AgentManager.tsx        activeOfficeWorkflowPack 제거
src/components/agent-manager/types.ts  AgentManagerProps 수정
src/components/TaskBoard.tsx           activeWorkflowPackKey, usePackVocab 제거
src/types/index.ts                     WorkflowPackKey 타입 단순화
src/components/OfficeView.tsx          buildOfficePackPresentation 제거
src/App.tsx                            officeWorkflowPack 상태 제거
```

### 테스트 파일
```
src/app/office-workflow-pack.test.ts   삭제
src/app/office-pack-display.test.ts    삭제
src/app/AppHeaderBar.mobile-office-pack.test.tsx  삭제
```

---

## 5. 마이그레이션 전략

### Phase A — 어휘 단일화 (낮은 위험)
1. `usePackVocab()` 결과를 모두 하드코딩("업무/업무들")으로 교체
2. `WorkflowPackKey` 타입을 `"development"` 단일값으로 교체 후 추후 삭제

### Phase B — 헤더/UI 제거 (중간 위험)
1. `officePackControl` 헤더 드롭다운 제거
2. `AppHeaderBar` Props 정리
3. `buildOfficePackPresentation()` → 단순 pass-through 함수로 교체

### Phase C — 상태/로직 제거 (높은 위험)
1. `officeWorkflowPack` 설정 필드 제거
2. `officePackProfiles` 제거
3. DB 설정 컬럼 마이그레이션

### Phase D — 파일 삭제
1. `office-workflow-pack/` 폴더 전체 삭제
2. 테스트 파일 삭제
3. `ICON_SPRITE_POOL`, `pickRandomSpritePair` 등 잔여 유틸 정리

---

## 6. 결정 필요 사항

| 항목 | 선택지 |
|------|--------|
| `WorkflowPackKey` → `agent.workflow_pack_key` DB 컬럼 | A) DB에서 제거 + 마이그레이션 / B) 내부 필드로 유지(무시) |
| 기존 팩 에이전트 데이터 | A) 모두 유지 (팩 컬럼만 무시) / B) 마이그레이션 스크립트로 정규화 |
| `officePackProfiles` 설정 | A) 즉시 삭제 / B) deprecated로 마킹 후 다음 메이저 버전에서 삭제 |

---

## 7. 현재 상태

- [x] 픽셀 스프라이트 이미지 제거 (이번 세션)
- [x] `StackedSpriteIcon` 제거 (이번 세션)
- [x] 헤더 스프라이트 이미지 제거 (이번 세션)
- [x] `customRoomThemes` 옵셔널화 (임시)
- [x] Phase A — 어휘 단일화
- [x] Phase B — 헤더 UI 제거
- [x] Phase C — 상태/로직 제거 (클라이언트 컴포넌트)
- [x] Phase D — 파일 삭제 (vocabulary.ts, office-theme/, office-pack-sync)
