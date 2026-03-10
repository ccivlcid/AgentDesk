# AgentDesk 2.0 기술 구현 계획서

**버전:** 1.0
**작성일:** 2026-03-10
**목적:** 2.0 리뉴얼을 실제로 코딩할 때 어떻게 구현할지 기술적 접근 방식을 정의한다.
**전제 문서:** [ux-renewal-2.0.md](../design/ux-renewal-2.0.md), [specs/api.md](../specs/api.md), [product-design.md](../product-design.md)

---

## 1. 기술 스택 & 현황

### 1-1. 확정 스택 (변경 없음)

| 레이어 | 기술 | 버전 |
|--------|------|------|
| Frontend | React | 19.2.0 |
| Frontend | TypeScript | ~5.9.3 |
| Frontend | Vite | 7.2.4 |
| Frontend | Tailwind CSS | 4.1.8 |
| Frontend | Framer Motion | 12.35.0 |
| Frontend | @dnd-kit | 6.3.1 |
| Backend | Express | 5.2.1 |
| Backend | Node.js SQLite | node:sqlite (built-in) |
| Backend | WebSocket | ws 8.19.0 |
| Backend | Zod | 4.3.6 |
| Desktop | Electron | 35.0.0 |
| Styling | CSS Variables + Tailwind | 테마 시스템 유지 |

### 1-2. 현재 아키텍처 핵심

```
App.tsx (100+ useState)
  ├─ useWebSocket()         WebSocket 실시간 동기화
  ├─ useRealtimeSync()      폴링 기반 보조 동기화
  ├─ useAppActions()        CRUD 액션 모음
  └─ AppMainLayout.tsx      뷰 라우팅 (view 문자열 기반)

server/
  ├─ modules/routes/core.ts    에이전트·태스크·프로젝트 라우트
  ├─ modules/routes/collab.ts  협업·채팅 라우트
  ├─ modules/routes/ops.ts     스킬·메시지·OAuth 라우트
  └─ modules/bootstrap/schema/ DB 스키마 + 마이그레이션
```

---

## 2. DB 스키마 변경

### 2-1. 파일 위치

- 신규 테이블: `server/modules/bootstrap/schema/base-schema.ts`
- 기존 테이블 컬럼 추가: `server/modules/bootstrap/schema/task-schema-migrations.ts`

### 2-2. base-schema.ts 추가 테이블

기존 테이블들 정의 끝에 다음을 추가한다.

#### categories 테이블

```sql
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name        TEXT NOT NULL,
  name_ko     TEXT,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT DEFAULT 'folder',
  color       TEXT DEFAULT '#f59e0b',
  kpi_schema        TEXT DEFAULT '[]',   -- JSON array
  risk_schema       TEXT DEFAULT '[]',   -- JSON array
  gate_schema       TEXT DEFAULT '[]',   -- JSON array
  deliverable_schema TEXT DEFAULT '[]',  -- JSON array
  routing_policy    TEXT DEFAULT '{}',   -- JSON object
  is_template INTEGER DEFAULT 1 CHECK(is_template IN (0,1)),
  version     INTEGER DEFAULT 1,
  owner_scope TEXT DEFAULT 'global' CHECK(owner_scope IN ('global','org','team')),
  created_at  INTEGER DEFAULT (unixepoch() * 1000),
  updated_at  INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_owner_scope ON categories(owner_scope);
```

#### category_versions 테이블

```sql
CREATE TABLE IF NOT EXISTS category_versions (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,  -- JSON snapshot of categories row at that version
  created_at   INTEGER DEFAULT (unixepoch() * 1000),
  UNIQUE(category_id, version)
);

CREATE INDEX IF NOT EXISTS idx_category_versions_cid ON category_versions(category_id);
```

#### project_agents 테이블 (junction)

```sql
CREATE TABLE IF NOT EXISTS project_agents (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_id   TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  added_at   INTEGER DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (project_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_project_agents_pid ON project_agents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_agents_aid ON project_agents(agent_id);
```

#### project_objectives 테이블

```sql
CREATE TABLE IF NOT EXISTS project_objectives (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
  progress    INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  sort_order  INTEGER DEFAULT 0,
  created_at  INTEGER DEFAULT (unixepoch() * 1000),
  updated_at  INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_project_objectives_pid ON project_objectives(project_id);
```

#### project_risks 테이블

```sql
CREATE TABLE IF NOT EXISTS project_risks (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  severity    TEXT DEFAULT 'medium' CHECK(severity IN ('high','medium','low')),
  status      TEXT DEFAULT 'open' CHECK(status IN ('open','mitigated','closed')),
  mitigation  TEXT,
  owner       TEXT,
  created_at  INTEGER DEFAULT (unixepoch() * 1000),
  updated_at  INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_project_risks_pid ON project_risks(project_id);
```

#### project_gates 테이블

```sql
CREATE TABLE IF NOT EXISTS project_gates (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  criteria    TEXT,
  status      TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','passed','failed')),
  due_date    INTEGER,
  completed_at INTEGER,
  sort_order  INTEGER DEFAULT 0,
  created_at  INTEGER DEFAULT (unixepoch() * 1000),
  updated_at  INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_project_gates_pid ON project_gates(project_id);
```

#### project_outputs 테이블

```sql
CREATE TABLE IF NOT EXISTS project_outputs (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT DEFAULT 'document',  -- document, spec, report, other
  status      TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done')),
  version     TEXT,
  url         TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  INTEGER DEFAULT (unixepoch() * 1000),
  updated_at  INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_project_outputs_pid ON project_outputs(project_id);
```

### 2-3. projects 테이블 컬럼 추가 (마이그레이션)

`task-schema-migrations.ts`의 `applyTaskSchemaMigrations()` 함수에 새 마이그레이션 블록을 추가한다.

```typescript
// 2.0 카테고리 & 대시보드 마이그레이션
function applyV2CategoryMigrations(db: DatabaseSync) {
  const cols = db
    .prepare("PRAGMA table_info(projects)")
    .all() as { name: string }[];
  const names = cols.map((c) => c.name);

  if (!names.includes("category_id")) {
    db.exec("ALTER TABLE projects ADD COLUMN category_id TEXT REFERENCES categories(id)");
  }
  if (!names.includes("category_version")) {
    db.exec("ALTER TABLE projects ADD COLUMN category_version INTEGER");
  }
  if (!names.includes("success_metric")) {
    db.exec("ALTER TABLE projects ADD COLUMN success_metric TEXT DEFAULT '{}'");
  }
  if (!names.includes("risk_profile")) {
    db.exec("ALTER TABLE projects ADD COLUMN risk_profile TEXT DEFAULT '{}'");
  }
  if (!names.includes("required_gates")) {
    db.exec("ALTER TABLE projects ADD COLUMN required_gates TEXT DEFAULT '[]'");
  }
  if (!names.includes("deliverable_schema")) {
    db.exec("ALTER TABLE projects ADD COLUMN deliverable_schema TEXT DEFAULT '[]'");
  }
}
```

`applyTaskSchemaMigrations()` 맨 끝에 `applyV2CategoryMigrations(db)` 호출을 추가한다.

### 2-4. 카테고리 시드 데이터

`server/modules/bootstrap/seeds/` 디렉토리에 `category-seeds.ts`를 추가한다.

```typescript
// server/modules/bootstrap/seeds/category-seeds.ts
export const CATEGORY_SEEDS = [
  {
    id: "cat_software_dev",
    name: "Software Development",
    name_ko: "소프트웨어 개발",
    slug: "software-development",
    description: "개발 팀에서 제품을 만들 때 사용해요.",
    icon: "code-2",
    color: "#3b82f6",
    is_template: 1,
    owner_scope: "global",
    kpi_schema: JSON.stringify([
      { key: "deploy_count", label: "배포 횟수", type: "number" },
      { key: "bug_rate", label: "버그 발생률 (%)", type: "percent" },
    ]),
    gate_schema: JSON.stringify([
      { title: "코드 리뷰", description: "PR 승인 완료" },
      { title: "QA 테스트", description: "테스트 케이스 통과" },
      { title: "배포 승인", description: "운영 배포 전 최종 확인" },
    ]),
    deliverable_schema: JSON.stringify([
      { title: "기획서 (PRD)", type: "document" },
      { title: "API 명세서", type: "spec" },
      { title: "배포 가이드", type: "document" },
    ]),
  },
  {
    id: "cat_it_delivery",
    name: "IT Delivery",
    name_ko: "IT 납품",
    slug: "it-delivery",
    description: "고객사에 시스템을 납품할 때 사용해요.",
    icon: "server",
    color: "#8b5cf6",
    is_template: 1,
    owner_scope: "global",
  },
  {
    id: "cat_investment",
    name: "Investment Ops",
    name_ko: "투자 운영",
    slug: "investment-ops",
    description: "펀드·포트폴리오를 운영할 때 사용해요.",
    icon: "trending-up",
    color: "#10b981",
    is_template: 1,
    owner_scope: "global",
  },
  {
    id: "cat_research",
    name: "Research / Strategy",
    name_ko: "리서치·전략",
    slug: "research-strategy",
    description: "분석·리포트 작성 프로젝트에 적합해요.",
    icon: "search",
    color: "#a855f7",
    is_template: 1,
    owner_scope: "global",
  },
  {
    id: "cat_marketing",
    name: "Marketing / Growth",
    name_ko: "마케팅·성장",
    slug: "marketing-growth",
    description: "캠페인·콘텐츠 프로젝트에 적합해요.",
    icon: "megaphone",
    color: "#f43f5e",
    is_template: 1,
    owner_scope: "global",
  },
  {
    id: "cat_custom",
    name: "Custom Blank",
    name_ko: "직접 설정",
    slug: "custom-blank",
    description: "처음부터 원하는 대로 설정해요.",
    icon: "square",
    color: "#6b7280",
    is_template: 1,
    owner_scope: "global",
  },
];

export function seedCategories(db: DatabaseSync) {
  const existing = db.prepare("SELECT id FROM categories WHERE is_template = 1").all();
  if (existing.length > 0) return; // 이미 시드됨

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO categories
      (id, name, name_ko, slug, description, icon, color,
       kpi_schema, gate_schema, deliverable_schema, is_template, owner_scope)
    VALUES
      (@id, @name, @name_ko, @slug, @description, @icon, @color,
       @kpi_schema, @gate_schema, @deliverable_schema, @is_template, @owner_scope)
  `);

  for (const cat of CATEGORY_SEEDS) {
    stmt.run({
      kpi_schema: "[]",
      gate_schema: "[]",
      deliverable_schema: "[]",
      ...cat,
    });
  }
}
```

`server/modules/bootstrap/index.ts`의 `runBootstrap()` 함수에서 `seedCategories(db)` 호출을 추가한다.

---

## 3. 백엔드 라우트 구현

### 3-1. 파일 위치 결정

새 라우트는 `server/modules/routes/core.ts`에 추가한다. (categories와 project 하위 리소스는 핵심 엔티티이므로 Part A)

### 3-2. Categories 라우트

```typescript
// server/modules/routes/core.ts 내부 추가

// ─── Categories ───────────────────────────────────────────────────────────────

app.get("/api/categories", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM categories ORDER BY is_template DESC, created_at ASC")
    .all();
  res.json(rows);
});

app.post("/api/categories", (req, res) => {
  const { name, name_ko, slug, description, icon, color,
          kpi_schema, risk_schema, gate_schema, deliverable_schema } = req.body;

  if (!name || !slug) return res.status(400).json({ error: "name and slug required" });

  const id = db
    .prepare(`
      INSERT INTO categories (name, name_ko, slug, description, icon, color,
        kpi_schema, risk_schema, gate_schema, deliverable_schema, is_template, owner_scope)
      VALUES (@name, @name_ko, @slug, @description, @icon, @color,
        @kpi_schema, @risk_schema, @gate_schema, @deliverable_schema, 0, 'org')
    `)
    .run({
      name, name_ko: name_ko ?? null, slug, description: description ?? null,
      icon: icon ?? "folder", color: color ?? "#6b7280",
      kpi_schema: JSON.stringify(kpi_schema ?? []),
      risk_schema: JSON.stringify(risk_schema ?? []),
      gate_schema: JSON.stringify(gate_schema ?? []),
      deliverable_schema: JSON.stringify(deliverable_schema ?? []),
    }).lastInsertRowid;

  // 버전 1 스냅샷 저장
  const created = db.prepare("SELECT * FROM categories WHERE rowid = ?").get(id);
  db.prepare("INSERT INTO category_versions (category_id, version, snapshot_json) VALUES (?,?,?)")
    .run(created.id, 1, JSON.stringify(created));

  res.status(201).json(created);
});

app.patch("/api/categories/:id", (req, res) => {
  const { id } = req.params;
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
  if (!cat) return res.status(404).json({ error: "not found" });
  if (cat.owner_scope === "global")
    return res.status(403).json({ error: "system templates cannot be modified" });

  const allowed = ["name","name_ko","description","icon","color",
                   "kpi_schema","risk_schema","gate_schema","deliverable_schema"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      updates[k] = typeof req.body[k] === "object"
        ? JSON.stringify(req.body[k])
        : req.body[k];
    }
  }

  const newVersion = cat.version + 1;
  db.prepare(`
    UPDATE categories SET ${Object.keys(updates).map(k => `${k} = @${k}`).join(", ")},
      version = @version, updated_at = @now
    WHERE id = @id
  `).run({ ...updates, version: newVersion, now: Date.now(), id });

  const updated = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);

  // 버전 스냅샷 저장
  db.prepare("INSERT INTO category_versions (category_id, version, snapshot_json) VALUES (?,?,?)")
    .run(id, newVersion, JSON.stringify(updated));

  res.json(updated);
});

app.delete("/api/categories/:id", (req, res) => {
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!cat) return res.status(404).json({ error: "not found" });
  if (cat.owner_scope === "global")
    return res.status(403).json({ error: "system templates cannot be deleted" });

  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/categories/:id/versions", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM category_versions WHERE category_id = ? ORDER BY version DESC")
    .all(req.params.id);
  res.json(rows);
});

app.post("/api/categories/:id/clone", (req, res) => {
  const source = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!source) return res.status(404).json({ error: "not found" });

  const { name } = req.body;
  const newSlug = `${source.slug}-copy-${Date.now()}`;

  const result = db.prepare(`
    INSERT INTO categories (name, name_ko, slug, description, icon, color,
      kpi_schema, risk_schema, gate_schema, deliverable_schema, is_template, owner_scope)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'org')
  `).run(
    name ?? `${source.name} (복사)`, source.name_ko, newSlug, source.description,
    source.icon, source.color,
    source.kpi_schema, source.risk_schema, source.gate_schema, source.deliverable_schema,
  );

  const cloned = db.prepare("SELECT * FROM categories WHERE rowid = ?").get(result.lastInsertRowid);
  db.prepare("INSERT INTO category_versions (category_id, version, snapshot_json) VALUES (?,?,?)")
    .run(cloned.id, 1, JSON.stringify(cloned));

  res.status(201).json(cloned);
});
```

### 3-3. Project Team (project_agents) 라우트

```typescript
// server/modules/routes/core.ts 내 프로젝트 섹션에 추가

app.get("/api/projects/:id/agents", (req, res) => {
  const rows = db.prepare(`
    SELECT a.* FROM agents a
    JOIN project_agents pa ON pa.agent_id = a.id
    WHERE pa.project_id = ?
    ORDER BY pa.added_at ASC
  `).all(req.params.id);
  res.json(rows);
});

app.post("/api/projects/:id/agents", (req, res) => {
  const { agent_id } = req.body;
  if (!agent_id) return res.status(400).json({ error: "agent_id required" });

  db.prepare(
    "INSERT OR IGNORE INTO project_agents (project_id, agent_id) VALUES (?, ?)"
  ).run(req.params.id, agent_id);

  res.status(201).json({ ok: true });
});

app.delete("/api/projects/:id/agents/:agentId", (req, res) => {
  db.prepare(
    "DELETE FROM project_agents WHERE project_id = ? AND agent_id = ?"
  ).run(req.params.id, req.params.agentId);
  res.json({ ok: true });
});
```

### 3-4. 대시보드 4분면 라우트 (패턴 반복)

objectives / risks / gates / outputs 모두 동일한 CRUD 패턴. 아래는 objectives 예시:

```typescript
// 공통 CRUD 팩토리로 구현하면 코드 중복 최소화
function makeQuadrantRouter(
  table: string,
  parentKey: string,
  extraValidate?: (body: Record<string, unknown>) => string | null
) {
  app.get(`/api/projects/:id/${table}`, (req, res) => {
    const rows = db
      .prepare(`SELECT * FROM ${table} WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC`)
      .all(req.params.id);
    res.json(rows);
  });

  app.post(`/api/projects/:id/${table}`, (req, res) => {
    if (!req.body.title) return res.status(400).json({ error: "title required" });
    if (extraValidate) {
      const err = extraValidate(req.body);
      if (err) return res.status(400).json({ error: err });
    }

    const fields = Object.keys(req.body).filter(k => k !== "id" && k !== "project_id");
    const result = db.prepare(`
      INSERT INTO ${table} (project_id, ${fields.join(", ")})
      VALUES (?, ${fields.map(() => "?").join(", ")})
    `).run(req.params.id, ...fields.map(f => req.body[f]));

    const created = db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).get(result.lastInsertRowid);
    res.status(201).json(created);
  });

  app.patch(`/api/projects/:id/${table}/:itemId`, (req, res) => {
    const allowed = Object.keys(req.body).filter(k => !["id","project_id","created_at"].includes(k));
    if (!allowed.length) return res.status(400).json({ error: "nothing to update" });

    db.prepare(`
      UPDATE ${table} SET ${allowed.map(k => `${k} = ?`).join(", ")}, updated_at = ?
      WHERE id = ? AND project_id = ?
    `).run(...allowed.map(k => req.body[k]), Date.now(), req.params.itemId, req.params.id);

    const updated = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.itemId);
    res.json(updated);
  });

  app.delete(`/api/projects/:id/${table}/:itemId`, (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ? AND project_id = ?`)
      .run(req.params.itemId, req.params.id);
    res.json({ ok: true });
  });
}

makeQuadrantRouter("project_objectives");
makeQuadrantRouter("project_risks");
makeQuadrantRouter("project_gates");
makeQuadrantRouter("project_outputs");
```

### 3-5. 페르소나 라우트

```typescript
// server/modules/routes/core.ts 추가
import { PERSONAS } from "../../data/personas/index.js";

app.get("/api/personas", (_req, res) => {
  // system_prompt_core는 서버 사이드에서만 사용, 클라이언트에는 노출하지 않음
  const safe = PERSONAS.map(({ system_prompt_core: _, ...rest }) => rest);
  res.json(safe);
});
```

### 3-6. POST /api/projects 확장

기존 프로젝트 생성 라우트에 `category_id` 처리 추가:

```typescript
// 기존 POST /api/projects 내부에 추가
if (req.body.category_id) {
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.body.category_id);
  if (cat) {
    // 카테고리 버전 고정
    projectData.category_id = cat.id;
    projectData.category_version = cat.version;
    // 카테고리 스키마를 프로젝트 필드에 복사 (이후 카테고리 수정과 독립)
    projectData.required_gates = cat.gate_schema;
    projectData.deliverable_schema = cat.deliverable_schema;
  }
}
```

---

## 4. 프론트엔드 타입 추가

### 4-1. src/types/index.ts에 추가

```typescript
// ─── 2.0 카테고리 & 프로젝트팀 ─────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  name_ko: string | null;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  kpi_schema: string;        // JSON string → parse as KpiField[]
  risk_schema: string;
  gate_schema: string;
  deliverable_schema: string;
  routing_policy: string;
  is_template: 0 | 1;
  version: number;
  owner_scope: "global" | "org" | "team";
  created_at: number;
  updated_at: number;
}

// ─── 대시보드 4분면 ──────────────────────────────────────────────────────────

export interface ProjectObjective {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "cancelled";
  progress: number;         // 0-100
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: "high" | "medium" | "low";
  status: "open" | "mitigated" | "closed";
  mitigation: string | null;
  owner: string | null;
  created_at: number;
  updated_at: number;
}

export interface ProjectGate {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  criteria: string | null;
  status: "pending" | "in_progress" | "passed" | "failed";
  due_date: number | null;
  completed_at: number | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface ProjectOutput {
  id: string;
  project_id: string;
  title: string;
  type: "document" | "spec" | "report" | "other";
  status: "pending" | "in_progress" | "done";
  version: string | null;
  url: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

// ─── Project 타입 확장 (기존 Project에 필드 추가) ────────────────────────────
// 기존 Project 인터페이스에 다음 필드를 추가:
//   category_id?: string | null;
//   category_version?: number | null;
//   success_metric?: string;    // JSON
//   risk_profile?: string;      // JSON
//   required_gates?: string;    // JSON
//   deliverable_schema?: string; // JSON

// ─── 페르소나 ─────────────────────────────────────────────────────────────────

export type PersonaCategory =
  | "tech" | "biz" | "creative" | "investor" | "scientist" | "operator";

export interface Persona {
  id: string;
  name: string;
  category: PersonaCategory;
  tagline: string;
  style_keywords: string[];   // 방식 키워드 (UX "방식 우선" 표시용)
  traits: string[];
  best_for: string[];
  accent_color: string;
}
```

### 4-2. API 레이어 추가

`src/api/` 디렉토리에 `categories-dashboard.ts` 파일을 추가한다.

```typescript
// src/api/categories-dashboard.ts

import { apiGet, apiPost, apiPatch, apiDelete } from "./core";
import type {
  Category, ProjectObjective, ProjectRisk, ProjectGate, ProjectOutput, Persona
} from "../types";

// Categories
export const categoriesApi = {
  list: () => apiGet<Category[]>("/api/categories"),
  create: (data: Partial<Category>) => apiPost<Category>("/api/categories", data),
  update: (id: string, data: Partial<Category>) => apiPatch<Category>(`/api/categories/${id}`, data),
  delete: (id: string) => apiDelete(`/api/categories/${id}`),
  versions: (id: string) => apiGet(`/api/categories/${id}/versions`),
  clone: (id: string, name?: string) => apiPost(`/api/categories/${id}/clone`, { name }),
};

// Project Team
export const projectTeamApi = {
  list: (projectId: string) => apiGet<Agent[]>(`/api/projects/${projectId}/agents`),
  add: (projectId: string, agentId: string) =>
    apiPost(`/api/projects/${projectId}/agents`, { agent_id: agentId }),
  remove: (projectId: string, agentId: string) =>
    apiDelete(`/api/projects/${projectId}/agents/${agentId}`),
};

// 대시보드 4분면 - 팩토리 패턴으로 중복 제거
function makeQuadrantApi<T>(resource: string) {
  return {
    list: (projectId: string) => apiGet<T[]>(`/api/projects/${projectId}/${resource}`),
    create: (projectId: string, data: Partial<T>) =>
      apiPost<T>(`/api/projects/${projectId}/${resource}`, data),
    update: (projectId: string, itemId: string, data: Partial<T>) =>
      apiPatch<T>(`/api/projects/${projectId}/${resource}/${itemId}`, data),
    delete: (projectId: string, itemId: string) =>
      apiDelete(`/api/projects/${projectId}/${resource}/${itemId}`),
  };
}

export const objectivesApi = makeQuadrantApi<ProjectObjective>("objectives");
export const risksApi = makeQuadrantApi<ProjectRisk>("risks");
export const gatesApi = makeQuadrantApi<ProjectGate>("gates");
export const outputsApi = makeQuadrantApi<ProjectOutput>("outputs");

// Personas
export const personasApi = {
  list: () => apiGet<Persona[]>("/api/personas"),
};
```

---

## 5. 프론트엔드 상태 관리

### 5-1. App.tsx에 추가할 상태

```typescript
// App.tsx에 추가
const [categories, setCategories] = useState<Category[]>([]);
const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

// 현재 프로젝트 - 파생 상태
const currentProject = useMemo(
  () => projects.find((p) => p.id === currentProjectId) ?? null,
  [projects, currentProjectId]
);

// localStorage에 마지막 프로젝트 저장
useEffect(() => {
  if (currentProjectId)
    localStorage.setItem("agentdesk_current_project", currentProjectId);
}, [currentProjectId]);

// 초기 로드
useEffect(() => {
  const saved = localStorage.getItem("agentdesk_current_project");
  if (saved) setCurrentProjectId(saved);
}, []);
```

### 5-2. 초기 데이터 로드에 categories 추가

`useRealtimeSync.tsx` 또는 초기 fetch 블록에 categories 로드 추가:

```typescript
const [cats] = await Promise.all([
  categoriesApi.list(),
  // ... 기존 로드
]);
setCategories(cats);
```

### 5-3. 대시보드 4분면 상태

Dashboard 컴포넌트 내 로컬 상태로 관리한다. (App.tsx까지 올리지 않음 — 프로젝트별 데이터이므로)

```typescript
// src/components/dashboard/Dashboard2.tsx
const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
const [risks, setRisks] = useState<ProjectRisk[]>([]);
const [gates, setGates] = useState<ProjectGate[]>([]);
const [outputs, setOutputs] = useState<ProjectOutput[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!projectId) return;
  setLoading(true);
  Promise.all([
    objectivesApi.list(projectId),
    risksApi.list(projectId),
    gatesApi.list(projectId),
    outputsApi.list(projectId),
  ]).then(([objs, rsks, gts, outs]) => {
    setObjectives(objs);
    setRisks(rsks);
    setGates(gts);
    setOutputs(outs);
    setLoading(false);
  });
}, [projectId]);
```

---

## 6. 컴포넌트 구현

### 6-1. 컴포넌트 파일 구조 (신규)

```
src/components/
├── project-selector/
│   ├── ProjectSelector.tsx        사이드바 프로젝트 셀렉터
│   ├── ProjectDropdown.tsx        드롭다운 목록
│   └── CategoryBadge.tsx          유형 배지
│
├── dashboard/
│   ├── Dashboard2.tsx             2.0 대시보드 (기존 Dashboard.tsx 대체)
│   ├── QuadrantPanel.tsx          분면 공통 패널 컴포넌트
│   ├── ObjectivesPanel.tsx        목표 분면
│   ├── RisksPanel.tsx             리스크 분면
│   ├── GatesPanel.tsx             검토 단계 분면
│   └── OutputsPanel.tsx           결과물 분면
│
├── onboarding/
│   ├── WelcomeScreen.tsx          환영 화면 (Step 1)
│   ├── CategoryPicker.tsx         유형 선택 카드 그리드 (Step 2)
│   └── ProjectNameStep.tsx        이름 입력 (Step 3)
│
├── project-create-modal/
│   ├── ProjectCreateModal.tsx     2-스텝 프로젝트 생성 모달
│   └── CategorySelectStep.tsx     카테고리 선택 스텝
│
├── category-editor/
│   ├── CategoryEditor.tsx         카테고리 에디터 (설정 탭)
│   ├── CategoryCard.tsx           카테고리 카드
│   └── CategoryFormModal.tsx      생성/수정 모달
│
└── persona/
    ├── PersonaCatalog.tsx         방식 선택 카탈로그 (모달/스텝)
    ├── PersonaCard.tsx            방식 카드 ("방식 우선")
    └── PersonaBadge.tsx           에이전트 카드 방식 배지
```

### 6-2. ProjectSelector 컴포넌트

사이드바 상단에 삽입. `Sidebar.tsx`에서 브랜드 영역을 교체한다.

```tsx
// src/components/project-selector/ProjectSelector.tsx
interface Props {
  currentProject: Project | null;
  projects: Project[];
  categories: Category[];
  onSelect: (projectId: string) => void;
  onCreateNew: () => void;
}

export default function ProjectSelector({
  currentProject, projects, categories, onSelect, onCreateNew
}: Props) {
  const [open, setOpen] = useState(false);

  const getCategoryLabel = (project: Project) => {
    if (!project.category_id) return null;
    const cat = categories.find(c => c.id === project.category_id);
    return cat?.name_ko ?? cat?.name ?? null;
  };

  return (
    <div className="relative px-3 py-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left rounded border border-[var(--th-border)]
                   hover:border-[var(--th-border-accent)] px-3 py-2
                   bg-[var(--th-bg-surface)] transition-colors"
      >
        {currentProject ? (
          <>
            <div className="text-sm font-medium truncate">{currentProject.name}</div>
            {getCategoryLabel(currentProject) && (
              <CategoryBadge label={getCategoryLabel(currentProject)!} />
            )}
          </>
        ) : (
          <span className="text-sm text-[var(--th-text-muted)]">
            프로젝트 선택 또는 만들기 +
          </span>
        )}
      </button>

      {open && (
        <ProjectDropdown
          projects={projects}
          categories={categories}
          currentProjectId={currentProject?.id ?? null}
          onSelect={(id) => { onSelect(id); setOpen(false); }}
          onCreateNew={() => { onCreateNew(); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
```

### 6-3. Dashboard2.tsx 구조

기존 `Dashboard.tsx`를 대체하지 않고 `Dashboard2.tsx`를 새로 만든다. `AppMainLayout.tsx`에서 뷰 조건에 따라 전환한다.

```tsx
// src/components/dashboard/Dashboard2.tsx
export default function Dashboard2({
  project,
  agents,
  categories,
}: {
  project: Project | null;
  agents: Agent[];
  categories: Category[];
}) {
  // 프로젝트 없을 때 온보딩 표시
  if (!project) {
    return <WelcomeScreen />;
  }

  const { objectives, risks, gates, outputs, loading } = useDashboardData(project.id);
  const category = categories.find(c => c.id === project.category_id);

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--th-border)]">
        <h1 className="text-sm font-semibold">{project.name}</h1>
        {category && <CategoryBadge label={category.name_ko ?? category.name} />}
      </div>

      {/* 4분면 그리드 */}
      <div className="grid grid-cols-2 gap-3 p-4 flex-1 min-h-0">
        <ObjectivesPanel
          objectives={objectives}
          projectId={project.id}
          onUpdate={setObjectives}
        />
        <RisksPanel
          risks={risks}
          projectId={project.id}
          onUpdate={setRisks}
        />
        <GatesPanel
          gates={gates}
          projectId={project.id}
          onUpdate={setGates}
        />
        <OutputsPanel
          outputs={outputs}
          projectId={project.id}
          onUpdate={setOutputs}
        />
      </div>
    </div>
  );
}
```

### 6-4. QuadrantPanel 공통 컴포넌트

4분면이 공통 구조를 가지므로 공통 Panel 컴포넌트를 만든다.

```tsx
// src/components/dashboard/QuadrantPanel.tsx
interface Props {
  title: string;
  subtitle: string;
  emptyText: string;
  emptyAction: string;
  onAdd: () => void;
  children: React.ReactNode;
}

export default function QuadrantPanel({
  title, subtitle, emptyText, emptyAction, onAdd, children
}: Props) {
  return (
    <div className="flex flex-col border border-[var(--th-border)] rounded
                    bg-[var(--th-panel-bg)] overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-[var(--th-border)]
                      border-l-2 border-l-[var(--th-accent)]">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-[var(--th-text-muted)] mt-0.5">{subtitle}</div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-3">
        {children}
      </div>

      {/* 추가 버튼 */}
      <div className="px-3 pb-3">
        <button
          onClick={onAdd}
          className="w-full text-xs text-[var(--th-text-muted)] hover:text-[var(--th-accent)]
                     py-1.5 border border-dashed border-[var(--th-border)]
                     hover:border-[var(--th-accent)] rounded transition-colors"
        >
          + {emptyAction}
        </button>
      </div>
    </div>
  );
}
```

### 6-5. 온보딩 컴포넌트 — useDashboardData 훅

반복 사용되는 데이터 로드 로직을 커스텀 훅으로 분리한다.

```typescript
// src/hooks/useDashboardData.ts
export function useDashboardData(projectId: string) {
  const [state, setState] = useState({
    objectives: [] as ProjectObjective[],
    risks: [] as ProjectRisk[],
    gates: [] as ProjectGate[],
    outputs: [] as ProjectOutput[],
    loading: true,
  });

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      objectivesApi.list(projectId),
      risksApi.list(projectId),
      gatesApi.list(projectId),
      outputsApi.list(projectId),
    ]).then(([objectives, risks, gates, outputs]) => {
      setState({ objectives, risks, gates, outputs, loading: false });
    });
  }, [projectId]);

  const setObjectives = (v: ProjectObjective[]) => setState(s => ({ ...s, objectives: v }));
  const setRisks = (v: ProjectRisk[]) => setState(s => ({ ...s, risks: v }));
  const setGates = (v: ProjectGate[]) => setState(s => ({ ...s, gates: v }));
  const setOutputs = (v: ProjectOutput[]) => setState(s => ({ ...s, outputs: v }));

  return { ...state, setObjectives, setRisks, setGates, setOutputs };
}
```

### 6-6. Sidebar.tsx 변경

**변경 범위 최소화** 원칙: NAV_STRUCTURE 순서 변경 + 브랜드 영역 교체.

```typescript
// src/components/Sidebar.tsx — NAV_STRUCTURE 변경
const NAV_STRUCTURE: NavEntry[] = [
  { kind: "item", view: "dashboard" },           // 1번 (변경)
  { kind: "item", view: "office" },
  {
    kind: "group",
    id: "tasks",                                  // tasks 그룹을 위로 (변경)
    children: [
      { view: "tasks-board" },
      { view: "tasks-deliverables" },
      { view: "tasks-scheduled" },
    ],
  },
  {
    kind: "group",
    id: "agents",                                 // "팀"으로 레이블 변경
    children: [{ view: "agents" }, { view: "heartbeat" }],
  },
  {
    kind: "group",
    id: "library",
    children: [
      { view: "skills" },
      { view: "agent-rules" },
      { view: "memory" },
      { view: "hooks" },
    ],
  },
  { kind: "item", view: "cli-usage" },
  { kind: "item", view: "game-room" },
  { kind: "item", view: "settings" },
];
```

브랜드 영역 JSX:

```tsx
{/* 기존 CEO/company 영역 제거, ProjectSelector로 교체 */}
<div className="px-2 py-3 border-b border-[var(--th-border)]">
  <div className="text-xs font-bold tracking-widest text-[var(--th-accent)] mb-2 px-1">
    AGENTDESK
  </div>
  <ProjectSelector
    currentProject={currentProject}
    projects={projects}
    categories={categories}
    onSelect={onProjectSelect}
    onCreateNew={onProjectCreate}
  />
</div>
```

### 6-7. PersonaCatalog — "방식 우선" 카드

```tsx
// src/components/persona/PersonaCard.tsx
interface Props {
  persona: Persona;
  selected: boolean;
  onSelect: () => void;
}

export default function PersonaCard({ persona, selected, onSelect }: Props) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded border transition-all
        ${selected
          ? "border-l-4 border-[var(--th-accent)] bg-[var(--th-bg-elevated)]"
          : "border-[var(--th-border)] bg-[var(--th-bg-surface)] hover:border-[var(--th-border-accent)]"
        }
      `}
    >
      {/* 방식 키워드 — 헤더 (크게) */}
      <div className="text-sm font-semibold leading-snug mb-1">
        {persona.style_keywords.slice(0, 2).join(" · ")}
      </div>

      {/* 인물명 — 보조 텍스트 (작게) */}
      <div className="text-xs text-[var(--th-text-muted)] font-mono mb-2">
        {persona.name} 방식
      </div>

      {/* 적합한 태스크 태그 */}
      <div className="flex flex-wrap gap-1">
        {persona.best_for.slice(0, 2).map(tag => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 border border-[var(--th-border)]
                       text-[var(--th-text-muted)] font-mono"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
```

---

## 7. 뷰 라우팅 변경

### 7-1. AppMainLayout.tsx

뷰 추가 및 Dashboard → Dashboard2 전환 처리:

```typescript
// src/app/AppMainLayout.tsx
// view === "dashboard" 일 때 Dashboard2 렌더

case "dashboard":
  return (
    <Dashboard2
      project={currentProject}
      agents={agents}
      categories={categories}
    />
  );
```

> **주의**: 기존 `Dashboard.tsx`는 바로 삭제하지 않는다. `view === "dashboard-legacy"`로 접근 가능하게 유지하다가 Phase 2 안정화 후 제거한다.

---

## 8. 메뉴 레이블 다국어 처리

### 8-1. i18n.ts 추가

```typescript
// src/i18n.ts 의 navLabels에 추가
ko: {
  // 기존
  office: "오피스",
  agents: "팀",           // "에이전트" → "팀"
  library: "라이브러리",
  dashboard: "대시보드",
  "cli-usage": "CLI 사용량",
  tasks: "태스크",
  "game-room": "라운지",
  settings: "설정",
  // 신규
  heartbeat: "Heartbeat",
  skills: "스킬",
  "agent-rules": "에이전트 규칙",
  memory: "메모리",
  hooks: "훅",
  "tasks-board": "태스크 보드",
  "tasks-deliverables": "산출물",
  "tasks-scheduled": "스케줄러",
}
```

---

## 9. Phase별 구현 순서

### Phase 1 (0–20일): 스키마 + 메뉴 + 브랜드

**Day 1–5: DB & 백엔드 기반**

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `base-schema.ts` | categories, category_versions, project_agents, project_objectives, project_risks, project_gates, project_outputs 테이블 추가 |
| 2 | `task-schema-migrations.ts` | projects 테이블 컬럼 추가 마이그레이션 |
| 3 | `seeds/category-seeds.ts` | 시드 6개 작성 |
| 4 | `bootstrap/index.ts` | seedCategories() 호출 추가 |
| 5 | `routes/core.ts` | GET /api/categories 라우트만 먼저 추가 |

**Day 6–10: 타입 & API 레이어**

| 순서 | 파일 | 작업 |
|------|------|------|
| 6 | `src/types/index.ts` | Category, ProjectObjective/Risk/Gate/Output, Persona 인터페이스 추가 |
| 7 | `src/api/categories-dashboard.ts` | 신규 API 파일 추가 |
| 8 | `src/App.tsx` | categories 상태 추가, currentProjectId 상태 추가 |

**Day 11–15: 사이드바 & 메뉴**

| 순서 | 파일 | 작업 |
|------|------|------|
| 9 | `Sidebar.tsx` | NAV_STRUCTURE 순서 변경 (dashboard 1번) |
| 10 | `Sidebar.tsx` | 브랜드 영역 → ProjectSelector로 교체 |
| 11 | `ProjectSelector.tsx` | 신규 컴포넌트 작성 |
| 12 | `CategoryBadge.tsx` | 신규 컴포넌트 |
| 13 | `i18n.ts` | 레이블 변경 (에이전트 → 팀) |

**Day 16–20: 검증 & 정리**

- DB 마이그레이션이 기존 데이터를 깨지 않는지 확인
- `category_id = null`인 기존 프로젝트가 정상 동작하는지 확인
- ProjectSelector에서 프로젝트 없는 경우 안내 문구 표시 확인

---

### Phase 2 (21–40일): 카테고리 CRUD + 프로젝트 생성 + 대시보드

**Day 21–25: 카테고리 API 완성**

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `routes/core.ts` | POST/PATCH/DELETE/clone categories 라우트 추가 |
| 2 | `routes/core.ts` | project_agents CRUD 라우트 추가 |
| 3 | `routes/core.ts` | 대시보드 4분면 CRUD 라우트 추가 (makeQuadrantRouter 패턴) |
| 4 | `routes/core.ts` | GET /api/personas 라우트 추가 |

**Day 26–30: 프로젝트 생성 플로우**

| 순서 | 파일 | 작업 |
|------|------|------|
| 5 | `ProjectCreateModal.tsx` | 2-스텝 모달 (카테고리 선택 + 이름 입력) |
| 6 | `CategoryPicker.tsx` | 유형 선택 카드 그리드 |
| 7 | `routes/core.ts` | POST /api/projects에 category_id 처리 추가 |

**Day 31–35: 대시보드 2.0**

| 순서 | 파일 | 작업 |
|------|------|------|
| 8 | `useDashboardData.ts` | 커스텀 훅 |
| 9 | `QuadrantPanel.tsx` | 공통 분면 패널 |
| 10 | `ObjectivesPanel.tsx` | 목표 분면 (CRUD 포함) |
| 11 | `RisksPanel.tsx` | 리스크 분면 |
| 12 | `GatesPanel.tsx` | 검토 단계 분면 |
| 13 | `OutputsPanel.tsx` | 결과물 분면 |
| 14 | `Dashboard2.tsx` | 4분면 조합 |
| 15 | `AppMainLayout.tsx` | dashboard 뷰 → Dashboard2로 교체 |

**Day 36–40: 온보딩 + 팀 구성 + 페르소나**

| 순서 | 파일 | 작업 |
|------|------|------|
| 16 | `WelcomeScreen.tsx` | 온보딩 Step 1 |
| 17 | `CategoryPicker.tsx` | 온보딩 Step 2 (재사용) |
| 18 | `ProjectNameStep.tsx` | 온보딩 Step 3 |
| 19 | `server/data/personas/` | 페르소나 메타데이터 + 10개 프롬프트 |
| 20 | `PersonaCard.tsx`, `PersonaCatalog.tsx`, `PersonaBadge.tsx` | 방식 우선 UI |
| 21 | `AgentFormModal.tsx` | 사고 방식 선택 스텝 추가 |

---

### Phase 3 (41–60일): 자동화 & 카테고리 에디터

| 순서 | 작업 |
|------|------|
| 1 | `CategoryEditor.tsx` — 설정 탭에 카테고리 에디터 추가 |
| 2 | `CategoryFormModal.tsx` — 카테고리 생성/수정 모달 (폼 기반) |
| 3 | KPI 기반 목표 진행률 자동 업데이트 로직 |
| 4 | 리스크 심각도 임계치 자동 홀드 |
| 5 | 산출물 재사용 추천 (기존 deliverables와 연동) |

---

## 10. 코딩 규칙 & 주의사항

### 10-1. 기존 패턴 준수

```
기존 CRUD 패턴:
  1. useState로 목록 관리
  2. api.xxx() 호출 후 setXxx() 업데이트
  3. WebSocket 이벤트로 실시간 반영
  4. 모달 open/close: useState(false)

새 코드도 동일 패턴을 따른다.
Redux, Zustand 등 새 상태 라이브러리 추가하지 않는다.
```

### 10-2. DB 마이그레이션 안전 규칙

```
ALTER TABLE는 항상 PRAGMA table_info로 컬럼 존재 여부 확인 후 추가:
  if (!names.includes("column_name")) {
    db.exec("ALTER TABLE t ADD COLUMN column_name ...");
  }

새 테이블은 CREATE TABLE IF NOT EXISTS 사용 (멱등성 보장).
시드 데이터는 INSERT OR IGNORE 또는 존재 여부 확인 후 실행.
```

### 10-3. JSON 필드 처리

categories의 `kpi_schema`, `gate_schema` 등은 SQLite에 JSON 문자열로 저장된다.

```typescript
// 저장 시
JSON.stringify(schemaArray)

// 읽을 때 (프론트엔드)
const parsed = JSON.parse(category.kpi_schema ?? "[]") as KpiField[];

// 또는 API 레이어에서 parse 후 반환하는 것을 검토
```

### 10-4. 기존 기능 보호

- 기존 `Project` 타입에 필드를 추가할 때 **모두 optional**로 선언 (기존 코드 호환)
- `category_id = null`인 프로젝트는 2.0 대시보드에서 "유형 없음"으로 표시, 기능은 정상 동작
- 기존 `Dashboard.tsx`는 즉시 삭제하지 않고 레거시 경로로 유지 후 Phase 2 검증 후 제거

### 10-5. 컴포넌트 파일 크기

```
기존 코드베이스 관찰:
- 큰 컴포넌트(Dashboard.tsx, TaskBoard.tsx)는 200-400줄
- 복잡한 기능은 서브컴포넌트로 분리 (dashboard/ 하위 분면별 파일)

신규 컴포넌트도 동일: 단일 파일 300줄 초과 시 분리 검토.
```

### 10-6. Tailwind + CSS 변수 혼용

```
색상: var(--th-*) CSS 변수 사용 (테마 전환 지원)
레이아웃: Tailwind 유틸리티 사용
폰트: 기존 CSS 클래스 재사용 (font-mono = JetBrains Mono)

신규 CSS 클래스는 src/styles/index.part05.css에 추가.
```

---

## 11. 테스트 전략

### 11-1. 백엔드 API 테스트

```
파일: server/tests/categories.test.ts
도구: vitest + supertest (기존 패턴)

테스트 케이스:
- GET /api/categories → 시드 6개 반환
- POST /api/categories → 생성 + 버전 1 스냅샷 확인
- PATCH /api/categories/:id → 버전 증가 확인
- DELETE /api/categories/:id (global scope) → 403
- POST /api/categories/:id/clone → 새 ID + owner_scope = 'org'
- POST /api/projects/:id/agents → junction 생성
- DELETE /api/projects/:id/agents/:agentId → junction 삭제
```

### 11-2. 프론트엔드 컴포넌트 테스트

```
도구: vitest + @testing-library/react (기존 패턴)

테스트 케이스:
- ProjectSelector: 프로젝트 없을 때 "만들기 +" 표시
- CategoryPicker: 카드 클릭 시 선택 상태 변경
- PersonaCard: 방식 키워드가 인물명보다 먼저 렌더
- QuadrantPanel: 빈 상태 메시지 표시
```

---

## 12. 관련 문서

| 문서 | 내용 |
|------|------|
| [ux-renewal-2.0.md](../design/ux-renewal-2.0.md) | UX 스펙 (와이어프레임, 컴포넌트 상세) |
| [specs/api.md](../specs/api.md) | API 계약 (엔드포인트 목록) |
| [strategy/claw-empire-differentiation-plan.md](../strategy/claw-empire-differentiation-plan.md) | 데이터 모델 & 카테고리 시스템 정의 |
| [strategy/agent-persona-system.md](../strategy/agent-persona-system.md) | 페르소나 아키텍처 & 프롬프트 구조 |
| [review/prd-planning-review-2026-03-09.md](../review/prd-planning-review-2026-03-09.md) | Phase별 구현 순서 (PRD 검토) |
| [architecture/SYSTEM-STRUCTURE-MAP.md](../architecture/SYSTEM-STRUCTURE-MAP.md) | 시스템 구조 맵 |

---

## 13. 변경 이력

| 버전 | 일자 | 내용 |
|------|------|------|
| 1.0 | 2026-03-10 | 초안. DB 스키마·백엔드 라우트·프론트엔드 타입·컴포넌트 구조·Phase별 구현 순서 정의. |
