# 프로젝트 생성 플로우 통일화 계획

**작성일:** 2026-03-10
**우선순위:** HIGH
**전제 문서:** [product-design.md](../product-design.md), [ux-renewal-2.0.md](../design/ux-renewal-2.0.md)

---

## 1. 현재 상태 (As-Is)

### 진입점 1 — 대시보드 온보딩 (`ProjectCreateModal`)
**파일:** `src/components/project-create-modal/ProjectCreateModal.tsx`
**진입:** 대시보드에 프로젝트가 없을 때 → WelcomeScreen → 프로젝트 만들기 클릭

```
Step 1: 카테고리 선택 (CategorySelectStep)
Step 2: 프로젝트 이름 입력
       → onConfirm({ name, categoryId })
```

**누락 필드:**
- ❌ `project_path` — CLI 에이전트 실행에 **필수**
- ❌ `core_goal` — 프로젝트 목표 (선택적이나 중요)
- ❌ `assignment_mode` — 에이전트 자동/수동 배정

---

### 진입점 2 — 태스크 보드 "PROJ" (`ProjectManagerModal`)
**파일:** `src/components/ProjectManagerModal.tsx`
**진입:** 태스크 보드 상단 → "PROJ" 버튼 → 모달 내 "새 프로젝트" 버튼

```
단일 폼:
- 프로젝트 이름 (필수)
- 프로젝트 경로 (필수: canSave = !!name && !!projectPath && !!coreGoal)
- 핵심 목표 (필수)
- 오피스 팩 선택 (제거 예정)
- 담당 에이전트 선택
- 배정 방식 (auto/manual)
```

**문제:**
- ❌ 카테고리 선택 없음
- ❌ 진입점이 태스크 보드에 묻혀 있음
- ⚠️ 오피스 팩 선택이 포함되어 있음 (제거 예정)

---

### 진입점 3 — 사이드바 프로젝트 셀렉터
**파일:** `src/components/project-selector/ProjectSelector.tsx`
**진입:** 사이드바 상단 → 프로젝트 드롭다운 → "+ 새 프로젝트"
→ `onProjectCreate` 콜백 → `ProjectCreateModal` 호출 (진입점 1과 동일 모달)

---

## 2. 문제 요약

| 항목 | 대시보드/사이드바 | 태스크 보드 PROJ |
|------|-----------------|----------------|
| 카테고리 선택 | ✅ | ❌ |
| 프로젝트 이름 | ✅ | ✅ |
| **project_path** | ❌ | ✅ |
| core_goal | ❌ | ✅ |
| 에이전트 배정 | ❌ | ✅ |

**핵심 이슈:**
1. `project_path`가 없으면 CLI 에이전트가 실행 불가 → **필수 입력**
2. 두 모달이 다른 UX/필드를 가짐 → 사용자 혼란
3. 사이드바에서 생성하면 `project_path` 없이 만들어짐

---

## 3. 목표 상태 (To-Be)

### 단일 통합 생성 플로우

```
Step 1: 프로젝트 유형 (카테고리 선택)
        "어떤 종류의 프로젝트인가요?"
        → 카테고리 그리드 (IT개발 / 마케팅 / 리서치 / 투자 / ...)
        → "유형 없이 시작" 링크

Step 2: 기본 정보
        - 프로젝트 이름 [필수]
        - 프로젝트 경로 [필수] ← 신규 추가
          · 로컬 경로 직접 입력
          · 폴더 선택 버튼 (electron IPC / file picker)
          · 예: /Users/me/projects/my-app
        - 한 줄 목표 [선택]
          · 예: "2026년 Q2 출시를 위한 신규 기능 개발"

Step 3: (선택) 팀 구성
        - 나중에 추가하기 (스킵)
        - 에이전트 선택 (기존 에이전트 목록에서)

→ 완료: 대시보드로 이동
```

---

## 4. 구현 계획

### 4-A. `ProjectCreateModal` 확장

**파일:** `src/components/project-create-modal/ProjectCreateModal.tsx`

```typescript
// 변경 전
onConfirm: (params: { name: string; categoryId: string | null }) => void;

// 변경 후
onConfirm: (params: {
  name: string;
  categoryId: string | null;
  project_path: string;        // 필수
  core_goal?: string;          // 선택
}) => void;
```

**Step 2에 추가:**
```tsx
{/* 프로젝트 경로 — 필수 */}
<div>
  <label>
    프로젝트 경로 <span style={{ color: "var(--th-error)" }}>*</span>
  </label>
  <p className="hint">AI 에이전트가 실행될 로컬 폴더 경로입니다.</p>
  <div className="flex gap-2">
    <input
      type="text"
      value={projectPath}
      onChange={...}
      placeholder="/Users/me/projects/my-app"
      required
    />
    <button onClick={handleBrowseFolder}>폴더 선택</button>
  </div>
  {!projectPath.trim() && submitted && (
    <p className="error">프로젝트 경로는 필수입니다.</p>
  )}
</div>
```

**완료 조건:**
```typescript
const canProceed = projectName.trim() && projectPath.trim();
```

### 4-B. 모든 진입점을 통합 모달로 연결

```
사이드바 "+ 새 프로젝트" → ProjectCreateModal (확장버전)
대시보드 온보딩           → ProjectCreateModal (확장버전)
태스크 보드 "PROJ"        → ProjectManagerModal 내 신규 생성 시 ProjectCreateModal 사용
                            (편집은 기존 ProjectEditorPanel 유지)
```

### 4-C. 폴더 선택 UX

**옵션 A) 직접 입력만** (가장 단순, 우선 구현)
- `<input type="text" placeholder="/path/to/project" />`
- 유효성: 비어있으면 저장 불가

**옵션 B) 파일 시스템 브라우저** (추후)
- Electron IPC `dialog.showOpenDialog` (데스크탑 앱)
- 웹에서는 직접 입력만 허용

**현재 결정: A (직접 입력) 우선 구현**

### 4-D. `ProjectManagerModal` 처리
- **신규 생성** 버튼 → `ProjectCreateModal` 위임
- **편집** → 기존 `ProjectEditorPanel` 유지 (이미 `project_path` 있음)
- 결과적으로 `ProjectManagerModal`의 `isCreating` 상태 제거

---

## 5. API 레이어 변경

### `createProject` 함수 (src/api/organization-projects.ts)
```typescript
// 현재
interface CreateProjectParams {
  name: string;
  project_path?: string;  // 옵셔널
  category_id?: string;
}

// 변경 후
interface CreateProjectParams {
  name: string;
  project_path: string;   // 필수
  category_id?: string;
  core_goal?: string;
}
```

### 서버 검증 강화
```typescript
// server/modules/routes/core/projects.ts
if (!body.project_path?.trim()) {
  return res.status(400).json({ error: "project_path_required" });
}
```
(이미 테스트 파일에 `project_path_required` 에러 코드가 있음 → 서버 이미 검증 중일 수 있음)

---

## 6. 마이그레이션

### 기존 프로젝트 (project_path 없는 경우)
- 대시보드/팀 보드 상단에 배너 표시:
  > "프로젝트 경로가 설정되지 않았습니다. [지금 설정하기]"
- 에이전트 실행 시 경고: "project_path 없이는 CLI 에이전트 실행 불가"

---

## 7. 구현 체크리스트

- [ ] `ProjectCreateModal` — Step 2에 `project_path` 입력 추가 (필수)
- [ ] `ProjectCreateModal` — `onConfirm` 타입에 `project_path` 추가
- [ ] `App.tsx` `handleProjectCreate` — `project_path` 전달 처리
- [ ] `ProjectManagerModal` — 신규 생성을 `ProjectCreateModal`로 위임
- [ ] `createProject` API — `project_path` 필수화
- [ ] 기존 프로젝트 누락 경로 안내 배너
- [ ] `core_goal` 선택 입력 추가 (Step 2)
- [ ] 빌드 검증

---

## 8. 현재 상태

- [ ] 계획 작성 완료
- [ ] 구현 미착수
