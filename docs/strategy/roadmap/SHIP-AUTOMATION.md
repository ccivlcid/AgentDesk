# Ship Automation — 버전 관리 + 변경 이력 + PR 생성

> Status: **설계 완료 — 구현 대기**
> Priority: Phase 40 후보
> Estimated: 30~45h (human) / 2~3h (CC)

---

## 현재 상태 (As-Is)

PM 오케스트레이터가 태스크를 승인하면:
1. `finishReview()` → 태스크 status = 'done'
2. worktree가 있으면 main 브랜치로 merge 시도
3. merge 성공/실패 로그
4. **끝** — 버전 관리, 변경 이력, PR 생성 없음

### 부족한 점
- 프로젝트의 현재 버전이 뭔지 추적 안 됨
- 어떤 태스크가 어떤 변경을 만들었는지 이력 없음 (git log에만 존재)
- 외부 협업용 PR이 자동 생성되지 않음
- CHANGELOG가 없어 릴리스 노트 수동 작성 필요

---

## 목표 상태 (To-Be)

PM이 태스크 승인 시:
1. `finishReview()` → merge
2. **자동 VERSION 범프** (semver patch)
3. **CHANGELOG 엔트리 생성** (커밋 메시지 + 태스크 설명 기반)
4. **PR 생성** (선택적, 프로젝트 설정에 따라)
5. PM Activity에 "v1.2.3 released" 로그

---

## 설계

### 1. VERSION 관리

**저장 위치:** `projects` 테이블에 `current_version TEXT DEFAULT '0.1.0'` 컬럼 추가

**범프 로직:**
- 태스크 완료(done) 시 patch 자동 증가: `0.1.0 → 0.1.1 → 0.1.2`
- 킥오프(새 라운드) 시 minor 증가: `0.1.2 → 0.2.0`
- 유저가 수동으로 major 범프 가능 (프로젝트 설정)

**프로젝트 루트 파일 동기화:**
- `projects.project_path`가 있으면 `VERSION` 파일에도 기록
- `package.json`의 `version` 필드도 업데이트 (존재 시)

### 2. CHANGELOG 자동 생성

**저장:** `project_changelog_entries` 테이블

```sql
CREATE TABLE project_changelog_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  version TEXT NOT NULL,        -- "0.1.3"
  task_id TEXT,                 -- 관련 태스크
  entry_type TEXT NOT NULL,     -- "feature" | "fix" | "refactor" | "docs"
  summary TEXT NOT NULL,        -- 한 줄 요약
  detail TEXT,                  -- 상세 (optional)
  created_at INTEGER NOT NULL
);
```

**생성 시점:** `finishReview()` 완료 직후
**내용:** PM 리뷰 결과 + 태스크 제목/설명 + git diff stat 요약
**분류:** 태스크 타입(general → feature, bug → fix, refactor, docs)

**파일 동기화:** 프로젝트 루트에 `CHANGELOG.md` 자동 업데이트

```markdown
## [0.1.3] - 2026-03-28
### Features
- 채팅 검색 및 핀 기능 추가 (#task-id)
### Fixes
- 킥오프 타임아웃 30s → 120s (#task-id)
```

### 3. PR 자동 생성

**조건:** 프로젝트에 `auto_create_pr` 설정이 켜져있고, GitHub remote가 있을 때

**흐름:**
1. merge 완료 후
2. `gh pr create --title "v0.1.3: {태스크 제목}" --body "{CHANGELOG 엔트리}"`
3. PR URL을 PM Activity + 알림에 기록

**설정:** `projects` 테이블에 `auto_create_pr INTEGER DEFAULT 0`

### 4. UI

**프로젝트 폴더 창:**
- 현재 버전 표시 (헤더)
- CHANGELOG 탭 추가

**PM Activity:**
- "v0.1.3 released — {태스크 제목}" 로그
- PR 링크 (있으면)

**메뉴바 진행률:**
- 버전 표시: `v0.1.3 · 3/8 done`

---

## 구현 순서

### Step 1: DB 스키마 (마이그레이션)
- `projects.current_version` 컬럼
- `projects.auto_create_pr` 컬럼
- `project_changelog_entries` 테이블

### Step 2: finishReview 확장
- VERSION 범프 로직
- CHANGELOG 엔트리 생성
- PM Activity 로그

### Step 3: 파일 동기화
- `VERSION` 파일 쓰기
- `package.json` version 업데이트
- `CHANGELOG.md` 생성/업데이트

### Step 4: PR 생성
- `gh` CLI 연동
- 프로젝트 설정 UI

### Step 5: UI
- 프로젝트 폴더 창 버전 + CHANGELOG 탭
- 메뉴바 버전 표시

---

## 의존성

- `finishReview()` 흐름 이해 필요 (`review-finalize-tools/`)
- `gh` CLI가 시스템에 설치되어 있어야 PR 생성 가능
- 프로젝트에 git remote가 설정되어 있어야 함

## 리스크

- merge conflict 시 VERSION/CHANGELOG 충돌 가능 → conflict resolver 필요
- PR 생성 실패 시 (인증, 네트워크) 조용히 실패하고 로그만 남기기
- 멀티 에이전트가 동시에 태스크 완료 시 VERSION 충돌 → DB 트랜잭션으로 보호
