import type { DatabaseSync } from "node:sqlite";
import logger from "../../../lib/logger.ts";
import { DIRECTIVE_TEMPLATES } from "../../directive-templates.ts";

type DbLike = Pick<DatabaseSync, "exec" | "prepare">;

interface CategorySeed {
  id: string;
  name: string;
  name_ko: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  pack_key: string;
  kpi_schema: string;
  risk_schema: string;
  gate_schema: string;
  deliverable_schema: string;
}

/* ------------------------------------------------------------------ */
/*  KPI / Risk / Gate / Deliverable schemas per project type           */
/* ------------------------------------------------------------------ */

const SCHEMAS: Record<string, Pick<CategorySeed, "kpi_schema" | "risk_schema" | "gate_schema" | "deliverable_schema">> = {
  mvp: {
    kpi_schema: JSON.stringify([
      { key: "time_to_launch", label: "출시까지 소요 시간", type: "number" },
      { key: "hypothesis_validated", label: "검증된 가설 수", type: "number" },
    ]),
    risk_schema: JSON.stringify([
      { key: "scope_creep", label: "범위 확장", severity: "high" },
      { key: "wrong_hypothesis", label: "잘못된 가설", severity: "medium" },
    ]),
    gate_schema: JSON.stringify([
      { key: "mvp_demo", label: "MVP 데모", sort_order: 1 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "prototype", label: "프로토타입", type: "spec" },
      { key: "validation_report", label: "검증 보고서", type: "report" },
    ]),
  },
  fullstack: {
    kpi_schema: JSON.stringify([
      { key: "deploy_count", label: "배포 횟수", type: "number" },
      { key: "bug_rate", label: "버그 발생률 (%)", type: "percent" },
      { key: "code_coverage", label: "코드 커버리지 (%)", type: "percent" },
    ]),
    risk_schema: JSON.stringify([
      { key: "tech_debt", label: "기술 부채", severity: "medium" },
      { key: "scope_creep", label: "범위 확장", severity: "high" },
      { key: "resource_shortage", label: "인력 부족", severity: "medium" },
    ]),
    gate_schema: JSON.stringify([
      { key: "design_review", label: "설계 검토", sort_order: 1 },
      { key: "code_review", label: "코드 리뷰", sort_order: 2 },
      { key: "qa_sign_off", label: "QA 승인", sort_order: 3 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "technical_spec", label: "기술 명세서", type: "document" },
      { key: "source_code", label: "소스 코드", type: "spec" },
      { key: "test_report", label: "테스트 보고서", type: "report" },
    ]),
  },
  mobile: {
    kpi_schema: JSON.stringify([
      { key: "crash_rate", label: "크래시율 (%)", type: "percent" },
      { key: "app_startup_time", label: "앱 시작 시간 (ms)", type: "number" },
      { key: "store_rating", label: "스토어 평점", type: "number" },
    ]),
    risk_schema: JSON.stringify([
      { key: "platform_fragmentation", label: "플랫폼 파편화", severity: "medium" },
      { key: "performance_regression", label: "성능 저하", severity: "high" },
    ]),
    gate_schema: JSON.stringify([
      { key: "design_review", label: "디자인 리뷰", sort_order: 1 },
      { key: "performance_audit", label: "성능 점검", sort_order: 2 },
      { key: "store_submission", label: "스토어 제출", sort_order: 3 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "app_binary", label: "앱 바이너리", type: "other" },
      { key: "design_spec", label: "디자인 명세서", type: "document" },
    ]),
  },
  "ai-ml": {
    kpi_schema: JSON.stringify([
      { key: "model_accuracy", label: "모델 정확도 (%)", type: "percent" },
      { key: "experiment_count", label: "실험 횟수", type: "number" },
      { key: "inference_latency", label: "추론 지연시간 (ms)", type: "number" },
    ]),
    risk_schema: JSON.stringify([
      { key: "data_leakage", label: "데이터 누수", severity: "high" },
      { key: "reproducibility", label: "재현 불가", severity: "high" },
    ]),
    gate_schema: JSON.stringify([
      { key: "data_validation", label: "데이터 검증", sort_order: 1 },
      { key: "baseline_comparison", label: "베이스라인 비교", sort_order: 2 },
      { key: "deployment_review", label: "배포 리뷰", sort_order: 3 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "experiment_log", label: "실험 로그", type: "report" },
      { key: "model_artifact", label: "모델 아티팩트", type: "other" },
    ]),
  },
  custom: {
    kpi_schema: JSON.stringify([
      { key: "goal_completion", label: "목표 달성률 (%)", type: "percent" },
    ]),
    risk_schema: JSON.stringify([
      { key: "scope_creep", label: "범위 확장", severity: "medium" },
    ]),
    gate_schema: JSON.stringify([
      { key: "final_review", label: "최종 검토", sort_order: 1 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "output", label: "결과물", type: "other" },
    ]),
  },
  enterprise: {
    kpi_schema: JSON.stringify([
      { key: "regression_count", label: "회귀 버그 수", type: "number" },
      { key: "change_success_rate", label: "변경 성공률 (%)", type: "percent" },
      { key: "rollback_count", label: "롤백 횟수", type: "number" },
    ]),
    risk_schema: JSON.stringify([
      { key: "breaking_existing", label: "기존 기능 깨짐", severity: "high" },
      { key: "compliance_violation", label: "규정 위반", severity: "high" },
      { key: "migration_failure", label: "마이그레이션 실패", severity: "high" },
    ]),
    gate_schema: JSON.stringify([
      { key: "impact_analysis", label: "영향 분석", sort_order: 1 },
      { key: "full_regression", label: "전체 회귀 테스트", sort_order: 2 },
      { key: "rollback_plan", label: "롤백 계획 확인", sort_order: 3 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "impact_doc", label: "영향 분석 문서", type: "document" },
      { key: "migration_guide", label: "마이그레이션 가이드", type: "document" },
    ]),
  },
  research: {
    kpi_schema: JSON.stringify([
      { key: "hypotheses_tested", label: "검증된 가설 수", type: "number" },
      { key: "findings_documented", label: "문서화된 발견 수", type: "number" },
    ]),
    risk_schema: JSON.stringify([
      { key: "inconclusive_results", label: "결론 불충분", severity: "medium" },
      { key: "scope_drift", label: "범위 이탈", severity: "low" },
    ]),
    gate_schema: JSON.stringify([
      { key: "hypothesis_review", label: "가설 리뷰", sort_order: 1 },
      { key: "findings_review", label: "결과 리뷰", sort_order: 2 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "research_report", label: "리서치 보고서", type: "report" },
      { key: "experiment_log", label: "실험 로그", type: "report" },
    ]),
  },
};

/* ------------------------------------------------------------------ */
/*  Build seeds from DIRECTIVE_TEMPLATES                               */
/* ------------------------------------------------------------------ */

const CATEGORY_SEEDS: CategorySeed[] = DIRECTIVE_TEMPLATES.map((dt) => ({
  id: `cat_${dt.slug.replace(/-/g, "_")}`,
  name: dt.name,
  name_ko: dt.name_ko,
  slug: dt.slug,
  description: dt.description_ko,
  icon: dt.icon,
  color: dt.color,
  pack_key: dt.pack_key,
  ...(SCHEMAS[dt.slug] ?? {
    kpi_schema: "[]",
    risk_schema: "[]",
    gate_schema: "[]",
    deliverable_schema: "[]",
  }),
}));

export function seedCategories(db: DbLike): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO categories (
      id, name, name_ko, slug, description, icon, color, pack_key,
      kpi_schema, risk_schema, gate_schema, deliverable_schema,
      is_template, owner_scope
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'global')
  `);

  for (const cat of CATEGORY_SEEDS) {
    try {
      insert.run(
        cat.id,
        cat.name,
        cat.name_ko,
        cat.slug,
        cat.description,
        cat.icon,
        cat.color,
        cat.pack_key,
        cat.kpi_schema,
        cat.risk_schema,
        cat.gate_schema,
        cat.deliverable_schema,
      );
    } catch (err) {
      logger.warn({ err }, `[AgentDesk] Skip seeding category "${cat.name}"`);
    }
  }

  logger.info(`[AgentDesk] Ensured ${CATEGORY_SEEDS.length} default categories`);
}
