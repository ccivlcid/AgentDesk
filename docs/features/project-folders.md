# Project Folders — Feature Spec

> Status: PLANNED
> Author: AI-generated spec for developer implementation
> Last updated: 2026-03-17
> Design reference: `docs/design/DESIGN.md`, `docs/design/UI-SCREENS.md`

---

## 1. 개요

**프로젝트 폴더(Project Folders)** — 복수의 관련 프로젝트를 하나의 폴더 컨테이너로 묶는 시스템.

현재 "새 폴더" 버튼은 `project` 레코드를 생성하는 임시 구현이다.
이 스펙은 폴더를 **독립적인 엔티티**로 분리하고, 프로젝트를 폴더 안으로 이동할 때
**디스크 경로도 함께 변경**하는 완전한 기능을 정의한다.

```
[데스크탑 — 폴더 영역]
┌─────────────────────────────────────────────────────────┐
│  📁 클라이언트 A (3)   📁 내부 도구 (2)   📁 연구 (5)   │  ← 폴더 아이콘 행
├─────────────────────────────────────────────────────────┤
│  🗂 쇼핑몰 UI      🗂 백엔드 API     🗂 마케팅 캠페인   │  ← 폴더 없는 프로젝트
└─────────────────────────────────────────────────────────┘

[폴더 클릭 시 → FolderWindow 열림]
┌─ 클라이언트 A ──────────────────────────────────────────┐
│  ~/work/client-a/  · 3개 프로젝트                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 쇼핑몰   │  │ 랜딩페이지│  │ 앱 리뉴얼│              │
│  │ 디자인   │  │ 퍼블리싱 │  │          │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                            [+ 프로젝트 추가]            │
└─────────────────────────────────────────────────────────┘
```

**폴더의 핵심 속성:**
- 폴더는 `project`가 아니다 — `project_folders` 테이블에 독립 존재
- `base_path`: 해당 폴더에 속한 프로젝트들이 위치하는 디스크 상위 디렉터리
- 프로젝트를 폴더로 이동하면 `project.project_path`가 `<base_path>/<dir-name>/`으로 변경됨
- 폴더 삭제 시 포함 프로젝트는 고아(orphan)가 되며 삭제되지 않음

---

## 2. 디자인 시스템 규칙 (AI 구현 필수 준수)

> 이 섹션의 규칙은 **모든 UI 컴포넌트에 예외 없이 적용**된다.

### 2-1. Border Radius (Dual-layer 원칙)

| 요소 | borderRadius | 예시 |
|------|-------------|------|
| 모달·패널·위젯·앱 윈도우 (Chrome) | `10` | FolderWindow, 모달 |
| 버튼·입력·배지·토스트 (Content) | `0` | button, input, span 배지 |
| 상태 도트·아바타 | `"50%"` | 연결 상태 표시 점 |

### 2-2. 폰트

모든 텍스트는 **반드시** `fontFamily: "var(--th-font-mono)"` 사용. sans-serif 절대 금지.

### 2-3. 색상 — CSS 변수만 사용

하드코딩 hex 금지. 단, `folder.color` 같은 사용자 지정 색상은 예외.

| 용도 | 변수 |
|------|------|
| 기본 텍스트 | `var(--th-text-primary)` |
| 보조 텍스트 | `var(--th-text-secondary)` |
| 흐린 텍스트 | `var(--th-text-muted)` |
| 강조(amber) | `var(--th-accent)` |
| 배경 기본 | `var(--th-bg-primary)` |
| 배경 표면 | `var(--th-bg-surface)` |
| 배경 높임 | `var(--th-bg-elevated)` |
| 테두리 | `var(--th-border)` |
| 입력 배경 | `var(--th-input-bg)` |
| 위험/삭제 | `var(--th-danger-text)`, `var(--th-danger-border)` |

### 2-4. 상태 색상 (인라인 hex 허용 예외)

| 상태 | 색상 |
|------|------|
| 완료·성공 | `#3fb950` |
| 경고 | `#f59e0b` |
| 위험·오류 | `#f85149` |

### 2-5. i18n

모든 UI 텍스트는 `t({ ko, en, ja, zh })` 패턴으로 4개 언어 처리.

---

## 3. 데이터 모델

### 3-1. DB 마이그레이션

`server/modules/bootstrap/schema/versioned-migrations.ts` 끝에 APPEND:

```typescript
// ─── Migration 1: project_folders 테이블 생성 ───────────────────────────────
{
  id: "2026-03-22-001-project-folders",
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_folders (
        id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name        TEXT NOT NULL,
        base_path   TEXT NOT NULL,
        color       TEXT NOT NULL DEFAULT '#f59e0b',
        icon        TEXT,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000),
        updated_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
      )
    `);
  },
},

// ─── Migration 2: projects에 folder_id 컬럼 추가 ────────────────────────────
{
  id: "2026-03-22-002-projects-folder-id",
  up: (db) => {
    db.exec(`
      ALTER TABLE projects
        ADD COLUMN folder_id TEXT REFERENCES project_folders(id) ON DELETE SET NULL
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_folder_id
        ON projects(folder_id)
    `);
  },
},
```

### 3-2. 스키마 설명

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | UUID (randomblob 16바이트, hex) |
| `name` | TEXT NOT NULL | 폴더 표시 이름 (예: "클라이언트 A") |
| `base_path` | TEXT NOT NULL | 포함 프로젝트들의 상위 디렉터리 절대 경로 (예: `/home/user/work/client-a`) |
| `color` | TEXT NOT NULL DEFAULT `#f59e0b` | 폴더 아이콘 색상 (hex, 사용자 선택) |
| `icon` | TEXT | 선택적 이모지/텍스트 아이콘 (null = 기본 폴더 SVG) |
| `sort_order` | INTEGER | 데스크탑 렌더링 순서 |
| `created_at` | INTEGER | Unix epoch ms |
| `updated_at` | INTEGER | Unix epoch ms (PATCH 시 갱신) |

`projects.folder_id` — `project_folders(id)` 참조. 폴더 삭제 시 `ON DELETE SET NULL`로
포함 프로젝트를 자동 고아 처리(데이터 유지).

---

## 4. 서버 API

### 4-1. 라우터 등록

`server/modules/routes/ops.ts` 또는 `server/modules/routes/core.ts` 에서 신규 라우터 마운트:

```typescript
import projectFoldersRouter from "./ops/project-folders.ts";
// ...
app.use("/api", projectFoldersRouter);
```

신규 파일: `server/modules/routes/ops/project-folders.ts`

### 4-2. 엔드포인트 전체 목록

```
GET    /api/project-folders
POST   /api/project-folders
PATCH  /api/project-folders/:id
DELETE /api/project-folders/:id
POST   /api/project-folders/:id/projects
DELETE /api/project-folders/:id/projects/:projectId
```

---

### 4-3. `GET /api/project-folders`

폴더 목록 조회. 각 폴더에 포함된 프로젝트 배열 포함.

**응답:**
```typescript
{
  folders: Array<{
    id: string;
    name: string;
    base_path: string;
    color: string;
    icon: string | null;
    sort_order: number;
    created_at: number;
    updated_at: number;
    projects: Array<{
      id: string;
      name: string;
      project_path: string;
      category_id: string | null;
    }>;
  }>;
}
```

**구현 SQL:**
```sql
-- 폴더 목록
SELECT id, name, base_path, color, icon, sort_order, created_at, updated_at
FROM project_folders
ORDER BY sort_order ASC, created_at ASC;

-- 각 폴더의 프로젝트 (folder_id = ?)
SELECT id, name, project_path, category_id
FROM projects
WHERE folder_id = ?
ORDER BY name ASC;
```

서버에서 폴더 목록 iterate 후 각각에 프로젝트 배열을 join하여 반환.

---

### 4-4. `POST /api/project-folders`

새 폴더 생성.

**요청 바디:**
```typescript
{
  name: string;       // 필수 — 폴더 표시 이름
  base_path: string;  // 필수 — 상위 디렉터리 절대 경로
  color?: string;     // 선택 — hex 색상 (기본값 "#f59e0b")
  icon?: string;      // 선택 — 이모지 또는 텍스트
}
```

**검증:**
- `name`: 1자 이상 100자 이하
- `base_path`: 공백 불허. `path.isAbsolute()` 체크 (상대 경로 거부 → 400)
- `color`: `/^#[0-9a-fA-F]{6}$/` 검증 (실패 시 기본값 사용)

**응답:**
```typescript
{
  ok: true;
  folder: {
    id: string;
    name: string;
    base_path: string;
    color: string;
    icon: string | null;
    sort_order: number;
    created_at: number;
    updated_at: number;
    projects: [];  // 신규 생성이므로 항상 빈 배열
  };
}
```

**에러:**
```typescript
// 400
{ error: "name_required" }
{ error: "base_path_required" }
{ error: "base_path_not_absolute" }
```

---

### 4-5. `PATCH /api/project-folders/:id`

폴더 메타데이터 수정.

**요청 바디 (모두 선택적):**
```typescript
{
  name?: string;
  color?: string;
  icon?: string | null;
  sort_order?: number;
}
```

**구현:**
- 제공된 필드만 업데이트
- `updated_at = unixepoch()*1000` 갱신
- 존재하지 않는 id → 404

**응답:**
```typescript
{
  ok: true;
  folder: { /* 전체 폴더 객체 (projects 배열 포함) */ }
}
```

---

### 4-6. `DELETE /api/project-folders/:id`

폴더 삭제. **포함 프로젝트는 삭제하지 않고 고아 처리** (`folder_id = NULL`).

**구현:**
1. `UPDATE projects SET folder_id = NULL WHERE folder_id = ?` (고아 처리)
2. `DELETE FROM project_folders WHERE id = ?`

> `ON DELETE SET NULL`이 스키마에 선언되어 있으므로 (1)단계는 생략 가능하나,
> 명시적으로 처리하여 의도를 코드에서 명확히 한다.

**응답:**
```typescript
{ ok: true; orphaned_project_count: number }
```

**에러:**
```typescript
// 404
{ error: "folder_not_found" }
```

---

### 4-7. `POST /api/project-folders/:id/projects`

프로젝트를 폴더로 이동.

**요청 바디:**
```typescript
{ project_id: string }
```

**서버 처리 순서:**
1. 폴더 존재 확인 → 없으면 404
2. 프로젝트 존재 확인 → 없으면 404
3. `project.folder_id === folder.id` 이면 이미 포함 — `{ ok: true, already_in_folder: true }` 반환
4. `project.folder_id !== NULL` 이고 다른 폴더이면 → 이전 폴더에서 제거 후 진행 (자동 이동)
5. `current_dir_name = path.basename(project.project_path)`
6. `new_path = path.join(folder.base_path, current_dir_name)`
7. 디스크 이동 시도:
   - `project.project_path`가 실제 디렉터리로 존재하는지 (`fs.existsSync`)
   - `new_path`에 이미 파일/디렉터리가 없는지 확인
   - 두 조건 충족 시: `fs.renameSync(old_path, new_path)` → `moved_on_disk = true`
   - 조건 미충족 시: DB만 갱신, `moved_on_disk = false` (경로 문자열만 업데이트)
8. `UPDATE projects SET project_path = new_path, folder_id = folder.id WHERE id = project_id`
9. 응답 반환

**응답:**
```typescript
{
  ok: true;
  new_path: string;
  moved_on_disk: boolean;  // true = 실제 디렉터리 이동됨, false = DB만 업데이트
  already_in_folder?: boolean;
}
```

**에러:**
```typescript
// 404
{ error: "folder_not_found" }
{ error: "project_not_found" }
// 409 — new_path에 다른 파일이 있고 source도 없는 경우 (moved_on_disk=false로 처리하여 409 안 발생)
```

> 디스크 이동 실패는 에러가 아니다. `moved_on_disk: false`로 반환하고 DB는 업데이트한다.
> 경로 충돌이나 권한 문제는 `warn` 로그로 기록한다.

---

### 4-8. `DELETE /api/project-folders/:id/projects/:projectId`

프로젝트를 폴더에서 꺼내기. **경로는 변경하지 않는다.**

**구현:**
```sql
UPDATE projects SET folder_id = NULL WHERE id = :projectId AND folder_id = :folderId
```

**응답:**
```typescript
{ ok: true }
```

**에러:**
```typescript
// 404 — 해당 폴더에 해당 프로젝트가 없는 경우
{ error: "project_not_in_folder" }
```

---

## 5. 프론트엔드 타입

`src/types/index.ts` 에 추가:

```typescript
export interface ProjectFolder {
  id: string;
  name: string;
  base_path: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
  projects: Array<{
    id: string;
    name: string;
    project_path: string;
    category_id: string | null;
  }>;
}

export interface ProjectFolderMoveResult {
  ok: boolean;
  new_path: string;
  moved_on_disk: boolean;
  already_in_folder?: boolean;
}
```

---

## 6. API 함수 (`src/api/project-folders.ts` 신규)

```typescript
import { del, patch, post, request } from "./core";
import type { ProjectFolder, ProjectFolderMoveResult } from "../types";

// ─── 폴더 목록 조회 ──────────────────────────────────────────────────────────
export async function getProjectFolders(): Promise<ProjectFolder[]> {
  const j = await request<{ folders: ProjectFolder[] }>("/api/project-folders");
  return j.folders;
}

// ─── 폴더 생성 ───────────────────────────────────────────────────────────────
export async function createProjectFolder(input: {
  name: string;
  base_path: string;
  color?: string;
  icon?: string;
}): Promise<ProjectFolder> {
  const j = await post("/api/project-folders", input) as { ok: boolean; folder: ProjectFolder };
  return j.folder;
}

// ─── 폴더 수정 ───────────────────────────────────────────────────────────────
export async function updateProjectFolder(
  id: string,
  input: { name?: string; color?: string; icon?: string | null; sort_order?: number },
): Promise<ProjectFolder> {
  const j = await patch(`/api/project-folders/${id}`, input) as { ok: boolean; folder: ProjectFolder };
  return j.folder;
}

// ─── 폴더 삭제 ───────────────────────────────────────────────────────────────
export async function deleteProjectFolder(
  id: string,
): Promise<{ ok: boolean; orphaned_project_count: number }> {
  return del(`/api/project-folders/${id}`) as Promise<{ ok: boolean; orphaned_project_count: number }>;
}

// ─── 프로젝트를 폴더로 이동 ──────────────────────────────────────────────────
export async function addProjectToFolder(
  folderId: string,
  projectId: string,
): Promise<ProjectFolderMoveResult> {
  return post(`/api/project-folders/${folderId}/projects`, { project_id: projectId }) as Promise<ProjectFolderMoveResult>;
}

// ─── 프로젝트를 폴더에서 꺼내기 ──────────────────────────────────────────────
export async function removeProjectFromFolder(
  folderId: string,
  projectId: string,
): Promise<{ ok: boolean }> {
  return del(`/api/project-folders/${folderId}/projects/${projectId}`) as Promise<{ ok: boolean }>;
}
```

---

## 7. UI 와이어프레임

### 7-1. 데스크탑 레이아웃

폴더 아이콘은 프로젝트 아이콘보다 **위 영역(상단 행)**에 별도 렌더링한다.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           [데스크탑]                                      │
│                                                                          │
│  ─── FOLDERS ───────────────────────────────────────────────────────     │
│                                                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                          │
│   │  [SVG]   │    │  [SVG]   │    │  [SVG]   │                          │
│   │ ●●●      │    │ ●●       │    │ ●●●●●    │                          │
│   │ 클라이언트A│   │ 내부도구  │    │ 연구     │                          │
│   │   (3)    │    │   (2)    │    │   (5)    │                          │
│   └──────────┘    └──────────┘    └──────────┘                          │
│                                                                          │
│  ─── PROJECTS ──────────────────────────────────────────────────────     │
│                                                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                          │
│   │    🗂    │    │    🗂    │    │    🗂    │                          │
│   │ 마케팅   │    │ 개인블로그│    │ 사이드프젝│                          │
│   └──────────┘    └──────────┘    └──────────┘                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

폴더 아이콘 세부:
  [SVG] = 적층 폴더 SVG (macOS 스타일, 64×64px)
          fill: folder.color (사용자 지정 색상)
  ●●●   = 포함 프로젝트 미리보기 도트 (최대 5개, 8px 원, gap 2px)
          overflow 시 "+N" 텍스트 표시
  (3)   = 배지 — 9px, fontFamily var(--th-font-mono),
                 background folder.color, color white, borderRadius 0
                 position: absolute top-right of icon
```

**폴더 아이콘 SVG 구조 (FolderStackIcon 컴포넌트):**

```
┌────────────────────┐
│     뒷 폴더        │  ← 약간 오른쪽 위로 offset, fill opacity 0.5
│  ┌──────────────┐  │
│  │  앞 폴더     │  │  ← fill: folder.color
│  │  탭이 있음   │  │
│  └──────────────┘  │
└────────────────────┘
64×64px SVG, viewBox="0 0 64 64"
```

### 7-2. 폴더 아이콘 상호작용

| 동작 | 결과 |
|------|------|
| 단일 클릭 | 아이콘 선택 (선택 테두리 표시) |
| 더블 클릭 | FolderWindow 열기 |
| 우클릭 | 컨텍스트 메뉴 (이름 변경 / 색상 변경 / 폴더 삭제) |
| 프로젝트 아이콘 드래그 → 폴더 아이콘 위에 드롭 | `POST /api/project-folders/:id/projects` |
| 드래그 오버 중 | 폴더 아이콘에 `box-shadow: 0 0 0 2px folder.color` 하이라이트 |

### 7-3. FolderWindow 레이아웃

`src/components/windows/FolderWindow.tsx` 신규 파일.
`ProjectFolderWindow.tsx`를 대체하는 것이 아닌 **별도 컴포넌트**로 작성.
(기존 `ProjectFolderWindow.tsx`는 단일 프로젝트 상세 뷰이므로 유지)

```
┌─ FolderWindow ─────────────────────────────────────────────────────────────┐
│ ● ● ●   📁 클라이언트 A                                              [편집] │  ← 헤더
│         ~/work/client-a  ·  3개 프로젝트                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │       🗂       │  │       🗂       │  │       🗂       │               │
│  │                │  │                │  │                │               │
│  │  쇼핑몰 디자인 │  │ 랜딩페이지     │  │ 앱 리뉴얼      │               │
│  │  /client-a/..  │  │ /client-a/..   │  │ /client-a/..   │               │
│  │                │  │                │  │                │               │
│  │  [꺼내기]      │  │  [꺼내기]      │  │  [꺼내기]      │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  + 프로젝트 추가 (드래그하거나 여기서 선택)                         │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘

헤더 상세:
  - TrafficLights 컴포넌트 (기존 패턴 재사용)
  - 폴더 이모지: folder.icon ?? "📁" (28px)
  - 폴더 이름: 13px, var(--th-font-mono), var(--th-text-heading)
  - 경로: 10px, var(--th-text-muted)
  - 프로젝트 수: 10px, var(--th-text-muted)
  - [편집] 버튼: 9px, var(--th-text-muted), hover var(--th-accent)
                borderRadius 0, border 1px solid var(--th-border)

프로젝트 카드:
  - 크기: 140×120px
  - background: var(--th-bg-elevated)
  - border: 1px solid var(--th-border)
  - borderRadius: 0
  - padding: 12px 8px
  - gap: 12px (grid)
  - 아이콘: 🗂 32px
  - 이름: 11px, var(--th-font-mono), var(--th-text-primary), 2줄 ellipsis
  - 경로: 9px, var(--th-text-muted), 1줄 ellipsis
  - [꺼내기] 버튼: 9px, var(--th-danger-text), borderRadius 0
                  border 1px solid var(--th-danger-border)
                  hover: background var(--th-danger-border)
  - hover 전체: background var(--th-bg-surface)

"+ 프로젝트 추가" 버튼:
  - width: 100%, height: 40px
  - border: 1px dashed var(--th-border)
  - background: transparent
  - borderRadius: 0
  - text: 11px, var(--th-text-muted), var(--th-font-mono)
  - hover: border-color var(--th-accent), color var(--th-accent)
  - 클릭 시: ProjectPickerDropdown 표시 (7-5 참조)
```

### 7-4. "새 폴더" 생성 플로우 (2단계)

현재 1단계(이름 입력 → `createProject` 호출)를 2단계 플로우로 교체.

```
[Step 1] 이름 입력
─────────────────────────────────────────────────────────
  📁
  ┌───────────────────────────────────┐
  │ 폴더 이름을 입력하세요            │  ← inline input (현재와 동일한 위치)
  └───────────────────────────────────┘
  [Enter] → Step 2로 이동

[Step 2] base_path 입력 (모달)
┌─ 새 폴더 만들기 ─────────────────────────────────────────────────────┐
│                                                                      │
│  FOLDER NAME                                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 클라이언트 A                                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  BASE PATH  (이 폴더에 속한 프로젝트들이 저장될 상위 디렉터리)       │
│  ┌────────────────────────────────────────────────┐  [경로 선택] │   │
│  │ /home/user/work/client-a                       │              │   │
│  └────────────────────────────────────────────────┘              │   │
│                                                                      │
│  COLOR                                                               │
│  ● ● ● ● ● ●  (6개 프리셋 색상 도트)                                │
│                                                                      │
│                                       [취소]  [폴더 만들기]          │
└──────────────────────────────────────────────────────────────────────┘

모달 스타일:
  - borderRadius: 10 (외곽), 내부 모든 input/button: 0
  - width: 480px
  - background: var(--th-bg-elevated)
  - border: 1px solid var(--th-border)

섹션 레이블:
  - 9px, uppercase, letterSpacing 0.1em, var(--th-text-muted)

input:
  - 11px, var(--th-font-mono), var(--th-input-bg)
  - border: 1px solid var(--th-border), borderRadius: 0
  - padding: 7px 10px

[경로 선택] 버튼:
  - 9px, var(--th-font-mono), borderRadius: 0
  - border: 1px solid var(--th-border)
  - 클릭 시 → POST /api/projects/path-native-picker (기존 native picker 재사용)

색상 도트 6개 프리셋:
  #f59e0b (amber), #3b82f6 (blue), #22c55e (green),
  #ef4444 (red), #a855f7 (purple), #64748b (slate)
  각 도트: 18×18px, borderRadius "50%"
  선택됨: 테두리 2px solid var(--th-text-primary)

[폴더 만들기] 버튼:
  - background: var(--th-accent), color: var(--th-accent-text)
  - borderRadius: 0, padding: 7px 16px, 11px font
  - 클릭 → POST /api/project-folders → 성공 시 모달 닫힘 + 데스크탑 폴더 아이콘 추가

[취소] 버튼:
  - background: transparent, border: 1px solid var(--th-border)
  - borderRadius: 0, color: var(--th-text-secondary)
```

### 7-5. ProjectPickerDropdown

FolderWindow 안 "+ 프로젝트 추가" 클릭 시 표시되는 드롭다운.
폴더에 속하지 않은 프로젝트 목록 표시.

```
┌─ 프로젝트 추가 ─────────────────────────────────────────┐
│ 🔍 [프로젝트 검색...                              ]      │
├─────────────────────────────────────────────────────────┤
│  🗂  마케팅 캠페인          ~/work/marketing/            │
│  🗂  개인 블로그            ~/projects/blog/             │
│  🗂  사이드 프로젝트        ~/side/                      │
└─────────────────────────────────────────────────────────┘

- 이미 이 폴더에 속한 프로젝트는 목록에서 제외
- 다른 폴더에 속한 프로젝트 표시 (이동 가능 — 경고 없이 진행, moved_on_disk 결과만 토스트)
- background: var(--th-bg-elevated), border: 1px solid var(--th-border)
- borderRadius: 0, maxHeight: 240px, overflowY: auto
- 검색 input: 10px, var(--th-font-mono), borderRadius: 0
- 각 항목:
    padding: 7px 10px
    hover: background var(--th-bg-surface)
    borderBottom: 1px solid var(--th-border)
    이름: 11px, var(--th-text-primary)
    경로: 9px, var(--th-text-muted)
- 선택 시 → POST /api/project-folders/:id/projects
          → moved_on_disk:true 면 "📁 {이름}이(가) {new_path}로 이동됨" 토스트
          → moved_on_disk:false 면 "📁 {이름}이(가) 폴더에 추가됨 (경로 불변)" 토스트
```

### 7-6. 프로젝트 아이콘 우클릭 컨텍스트 메뉴 — "폴더로 이동" 항목

기존 프로젝트 아이콘 우클릭 메뉴에 "폴더로 이동 ▶" 서브메뉴 추가.

```
┌─ 컨텍스트 메뉴 ──────────────────────────────────┐
│  프로젝트 열기                                    │
│  ─────────────────                               │
│  폴더로 이동 ▶ ─────────────────────────────┐    │
│  프로젝트 삭제  │  📁 클라이언트 A           │    │
│               │  📁 내부 도구              │    │
│               │  📁 연구                   │    │
│               │  ──────────────────        │    │
│               │  + 새 폴더에 넣기...        │    │
│               └────────────────────────────┘    │
└─────────────────────────────────────────────────┘

폴더 없을 때:
  "폴더로 이동" 항목 그레이아웃 + "(폴더 없음)" 텍스트

폴더 선택 시:
  → POST /api/project-folders/:folderId/projects { project_id }
  → 성공 시 토스트 (7-5와 동일 형식)

"+ 새 폴더에 넣기..." 선택 시:
  → "새 폴더" 생성 플로우 진입 (Step 1부터) + 생성 완료 후 자동으로 해당 프로젝트 이동
```

### 7-7. 드래그 앤 드롭

데스크탑에서 프로젝트 아이콘을 폴더 아이콘 위로 드래그.

```
드래그 시작:
  - 드래그 중인 아이콘: opacity 0.5
  - 데이터: dragType = "project", projectId = "..."

폴더 아이콘 위 드래그 오버:
  - 폴더 아이콘: box-shadow 0 0 0 3px folder.color
  - 배경: rgba(folder.color, 0.1) 오버레이

드롭 완료:
  - POST /api/project-folders/:folderId/projects { project_id }
  - 데스크탑에서 프로젝트 아이콘 제거 (폴더 안으로 이동됨)
  - 폴더 배지 카운트 +1
  - 토스트 알림
```

---

## 8. Desktop.tsx 변경 체크리스트

`src/components/desktop/Desktop.tsx`에 필요한 변경사항:

```
[ ] state 추가
    const [folders, setFolders] = useState<ProjectFolder[]>([]);
    const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
    const [newFolderPreName, setNewFolderPreName] = useState("");  // Step 1에서 입력한 이름

[ ] 초기 로드
    useEffect → getProjectFolders() → setFolders(...)
    (기존 projects 로드와 동일한 패턴)

[ ] "새 폴더" 인라인 입력 onKeyDown/onBlur 변경
    기존: createProject({ name, project_path: name, ... })
    변경: setNewFolderPreName(name); setNewFolderPos(null); setNewFolderModalOpen(true);
    (이름만 받고 Step 2 모달로 전환)

[ ] 폴더 아이콘 렌더링 추가
    projects 아이콘 렌더링 위에 folders 섹션 추가
    FolderDesktopIcon 컴포넌트 사용 (신규)
    위치: 데스크탑 왼쪽 상단 영역, 프로젝트 아이콘과 구분된 행

[ ] 드래그 핸들러
    onDragStart (프로젝트 아이콘): setDraggingProjectId(projectId)
    onDragOver (폴더 아이콘): setDragOverFolderId(folderId); e.preventDefault()
    onDragLeave (폴더 아이콘): setDragOverFolderId(null)
    onDrop (폴더 아이콘):
      addProjectToFolder(folderId, draggingProjectId)
      → setFolders 업데이트 + setProjects에서 제거
      → 토스트 표시

[ ] 우클릭 메뉴 확장 (프로젝트 아이콘)
    기존 ctxMenu 아이템 배열에 "폴더로 이동" 항목 추가
    folders 상태에서 서브메뉴 항목 생성

[ ] FolderWindow 렌더링
    openFolders: Set<string> (state 또는 uiStore)
    → folders.filter(f => openFolders.has(f.id)).map(f => <FolderWindow ... />)

[ ] import 추가
    import FolderWindow from "../windows/FolderWindow";
    import FolderDesktopIcon from "./FolderDesktopIcon";
    import NewFolderModal from "./NewFolderModal";
    import { getProjectFolders, createProjectFolder, addProjectToFolder } from "../../api/project-folders";
    import type { ProjectFolder } from "../../types";
```

---

## 9. 파일 변경 체크리스트

### 9-1. 신규 생성 파일

```
[ ] server/modules/routes/ops/project-folders.ts
    → GET    /api/project-folders
    → POST   /api/project-folders
    → PATCH  /api/project-folders/:id
    → DELETE /api/project-folders/:id
    → POST   /api/project-folders/:id/projects  (경로 이동 포함)
    → DELETE /api/project-folders/:id/projects/:projectId

[ ] src/api/project-folders.ts
    → getProjectFolders()
    → createProjectFolder(input)
    → updateProjectFolder(id, input)
    → deleteProjectFolder(id)
    → addProjectToFolder(folderId, projectId)
    → removeProjectFromFolder(folderId, projectId)

[ ] src/components/windows/FolderWindow.tsx
    → FolderWindow 컴포넌트 (7-3 와이어프레임 기준)
    → props: folder, allProjects, onClose, onRemoveProject, onAddProject

[ ] src/components/desktop/FolderDesktopIcon.tsx
    → 폴더 아이콘 컴포넌트
    → FolderStackIcon SVG 내장
    → 프로젝트 수 배지
    → 드래그 오버 하이라이트 상태
    → 더블클릭: openFolder(folder.id)
    → 우클릭: 폴더 컨텍스트 메뉴 (이름 변경 / 색상 변경 / 삭제)

[ ] src/components/desktop/NewFolderModal.tsx
    → 2단계 폴더 생성 모달 (7-4 와이어프레임 기준)
    → props: initialName, onConfirm(name, base_path, color), onCancel
    → 내부 state: name, base_path, color
    → [경로 선택] 버튼: POST /api/projects/path-native-picker 재사용
```

### 9-2. 수정 파일

```
[ ] server/modules/bootstrap/schema/versioned-migrations.ts
    → 2026-03-22-001-project-folders APPEND
    → 2026-03-22-002-projects-folder-id APPEND

[ ] server/modules/routes/ops.ts (또는 core.ts)
    → import projectFoldersRouter
    → app.use("/api", projectFoldersRouter)

[ ] src/types/index.ts
    → ProjectFolder 인터페이스 추가
    → ProjectFolderMoveResult 인터페이스 추가

[ ] src/app/types.ts
    → WindowType에 "folder" 추가 (FolderWindow 열기 용도)

[ ] src/store/uiStore.ts
    → openFolders: Set<string> 상태 추가
    → openFolder(id: string) / closeFolder(id: string) 액션 추가

[ ] src/components/desktop/Desktop.tsx
    → 8. Desktop.tsx 변경 체크리스트 기준으로 전면 수정

[ ] src/components/desktop/DesktopIcons.tsx (있는 경우)
    → 폴더/프로젝트 분리 렌더링 반영

[ ] docs/progress.md
    → Project Folders 기능 항목 추가
```

---

## 10. i18n 레이블 전체 목록

| 한국어 | 영어 | 일본어 | 중국어 |
|--------|------|--------|--------|
| 새 폴더 | New Folder | 新規フォルダ | 新建文件夹 |
| 폴더 이름 | Folder name | フォルダ名 | 文件夹名称 |
| 기본 경로 | Base path | ベースパス | 基础路径 |
| 폴더 만들기 | Create Folder | フォルダを作成 | 创建文件夹 |
| 경로 선택 | Browse | 参照 | 浏览 |
| 프로젝트 추가 | Add Project | プロジェクト追加 | 添加项目 |
| 꺼내기 | Remove from folder | フォルダから取り出す | 从文件夹中移出 |
| 폴더로 이동 | Move to folder | フォルダへ移動 | 移动到文件夹 |
| 폴더 삭제 | Delete Folder | フォルダを削除 | 删除文件夹 |
| 폴더 없음 | No folders | フォルダなし | 无文件夹 |
| 새 폴더에 넣기... | Move to new folder... | 新しいフォルダへ... | 移至新文件夹... |
| {n}개 프로젝트 | {n} projects | {n}件プロジェクト | {n}个项目 |
| 디스크에서 이동됨 | Moved on disk | ディスクで移動済み | 已在磁盘移动 |
| 경로 불변 (DB만 업데이트) | Path unchanged (DB only) | パス変更なし (DBのみ) | 路径不变 (仅DB) |
| 이 폴더에 속한 프로젝트들이 저장될 상위 디렉터리 | Parent directory for projects in this folder | このフォルダのプロジェクトが保存される親ディレクトリ | 此文件夹中项目的父目录 |

---

## 11. 제약 및 주의사항

- `base_path`는 절대 경로만 허용. 서버에서 `path.isAbsolute()` 검증.
- 디스크 이동(`fs.renameSync`) 실패는 경고 토스트만 표시하고 DB 업데이트는 진행함.
- 동일 `base_path` 하위에 같은 `dir-name`이 이미 존재하면 `moved_on_disk: false` 반환.
- 폴더 삭제는 포함 프로젝트를 삭제하지 않는다 (`ON DELETE SET NULL`).
- `ProjectFolderWindow.tsx` (단일 프로젝트 상세 뷰)는 **삭제하지 않는다**. `FolderWindow.tsx`는 별개 컴포넌트.
- 폴더는 중첩 불가 (폴더 안에 폴더 없음). `project_folders`에 `parent_id` 없음.
- `sort_order` 기본값 0. 데스크탑 드래그 정렬 기능은 이 스펙 범위 밖.

---

## 12. 구현 우선순위

```
Phase 1 — 데이터 계층 (먼저)
  ├─ DB: versioned-migrations.ts에 두 마이그레이션 APPEND
  ├─ Server: project-folders.ts 라우터 (CRUD + move)
  └─ Frontend Types + API 함수 (src/api/project-folders.ts)

Phase 2 — 핵심 UI
  ├─ FolderDesktopIcon.tsx (데스크탑 폴더 아이콘)
  ├─ NewFolderModal.tsx (2단계 생성 플로우)
  ├─ Desktop.tsx 수정 (폴더 로드 + 아이콘 렌더링 + 새 폴더 플로우 교체)
  └─ uiStore.ts openFolders 추가

Phase 3 — FolderWindow + 상호작용
  ├─ FolderWindow.tsx (폴더 내부 프로젝트 그리드)
  ├─ Desktop.tsx 드래그 앤 드롭
  └─ 프로젝트 우클릭 "폴더로 이동" 서브메뉴
```
