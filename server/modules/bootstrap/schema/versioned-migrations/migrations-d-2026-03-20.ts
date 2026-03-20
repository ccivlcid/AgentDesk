import type { Migration } from "./types.ts";

export const VERSIONED_MIGRATIONS_D_2026_03_20: Migration[] = [
  {
    id: "2026-03-20-001-tasks-figma-url",
    up: (db) => {
      try {
        db.exec("ALTER TABLE tasks ADD COLUMN figma_url TEXT");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-20-002-projects-figma-url",
    up: (db) => {
      try {
        db.exec("ALTER TABLE projects ADD COLUMN figma_url TEXT");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-20-003-category-design",
    up: (db) => {
      const existing = db.prepare("SELECT id FROM categories WHERE id = 'cat_design'").get();
      if (!existing) {
        const now = Date.now();
        db.prepare(`
          INSERT INTO categories (
            id, name, name_ko, description, icon, color, slug,
            kpi_schema, risk_schema, gate_schema, deliverable_schema,
            pack_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "cat_design", "Design & Figma", "디자인 & Figma",
          "Figma 디자인을 코드로 연결할 때 사용해요. 컴포넌트 분석, 코드 생성, 리뷰를 지원해요.",
          "pen-tool", "#f24e1e", "design",
          JSON.stringify([
            { key: "components_built",  label: "컴포넌트 구현 수",   type: "number"  },
            { key: "design_accuracy",   label: "디자인 일치율 (%)",  type: "percent" },
            { key: "accessibility",     label: "접근성 점수 (%)",    type: "percent" },
          ]),
          JSON.stringify([
            { key: "design_drift",      label: "디자인 불일치",      severity: "high"   },
            { key: "component_drift",   label: "컴포넌트 드리프트",   severity: "medium" },
            { key: "accessibility_gap", label: "접근성 미흡",         severity: "medium" },
          ]),
          JSON.stringify([
            { key: "design_review",     label: "디자인 검토",         sort_order: 1 },
            { key: "component_review",  label: "컴포넌트 코드 리뷰",  sort_order: 2 },
            { key: "handoff_approval",  label: "핸드오프 승인",       sort_order: 3 },
          ]),
          JSON.stringify([
            { key: "design_spec",       label: "디자인 명세서",       type: "document" },
            { key: "component_code",    label: "컴포넌트 코드",       type: "spec"     },
            { key: "design_review_report", label: "디자인 검토 보고서", type: "report" },
          ]),
          "development", now, now,
        );
      }
    },
  },
  {
    id: "2026-03-20-004-category-design-schemas",
    up: (db) => {
      // 빈 스키마로 INSERT된 기존 cat_design 레코드에 올바른 스키마 채우기
      db.prepare(`
        UPDATE categories SET
          kpi_schema        = ?,
          risk_schema       = ?,
          gate_schema       = ?,
          deliverable_schema = ?
        WHERE id = 'cat_design'
          AND (kpi_schema = '[]' OR kpi_schema IS NULL)
      `).run(
        JSON.stringify([
          { key: "components_built", label: "컴포넌트 구현 수",  type: "number"  },
          { key: "design_accuracy",  label: "디자인 일치율 (%)", type: "percent" },
          { key: "accessibility",    label: "접근성 점수 (%)",   type: "percent" },
        ]),
        JSON.stringify([
          { key: "design_drift",      label: "디자인 불일치",    severity: "high"   },
          { key: "component_drift",   label: "컴포넌트 드리프트", severity: "medium" },
          { key: "accessibility_gap", label: "접근성 미흡",       severity: "medium" },
        ]),
        JSON.stringify([
          { key: "design_review",    label: "디자인 검토",        sort_order: 1 },
          { key: "component_review", label: "컴포넌트 코드 리뷰", sort_order: 2 },
          { key: "handoff_approval", label: "핸드오프 승인",      sort_order: 3 },
        ]),
        JSON.stringify([
          { key: "design_spec",          label: "디자인 명세서",     type: "document" },
          { key: "component_code",       label: "컴포넌트 코드",     type: "spec"     },
          { key: "design_review_report", label: "디자인 검토 보고서", type: "report"  },
        ]),
      );
    },
  },
  {
    id: "2026-03-20-005-category-design-desc-ko",
    up: (db) => {
      db.prepare(
        "UPDATE categories SET description = ? WHERE id = 'cat_design' AND description = ?",
      ).run(
        "Figma 디자인을 코드로 연결할 때 사용해요. 컴포넌트 분석, 코드 생성, 리뷰를 지원해요.",
        "Figma design-to-code: design analysis, component building, code review",
      );
    },
  },
  {
    id: "2026-03-20-005-image-generations-task-id",
    up: (db) => {
      try {
        db.exec("ALTER TABLE image_generations ADD COLUMN task_id TEXT");
      } catch { /* already exists */ }
      try {
        db.exec("CREATE INDEX IF NOT EXISTS idx_image_generations_task ON image_generations(task_id)");
      } catch { /* already exists */ }
    },
  },
];
