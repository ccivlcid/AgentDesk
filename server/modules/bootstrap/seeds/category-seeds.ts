import type { DatabaseSync } from "node:sqlite";

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

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    id: "cat_software_dev",
    name: "Software Development",
    name_ko: "소프트웨어 개발",
    slug: "software-development",
    description: "개발 팀에서 제품을 만들 때 사용해요.",
    icon: "code-2",
    color: "#3b82f6",
    pack_key: "development",
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
  {
    id: "cat_marketing",
    name: "Marketing Campaign",
    name_ko: "마케팅 캠페인",
    slug: "marketing-campaign",
    description: "브랜드 홍보나 캠페인을 기획할 때 사용해요.",
    icon: "megaphone",
    color: "#ec4899",
    pack_key: "asset_management",
    kpi_schema: JSON.stringify([
      { key: "reach", label: "도달 수", type: "number" },
      { key: "conversion_rate", label: "전환율 (%)", type: "percent" },
      { key: "roi", label: "ROI (%)", type: "percent" },
    ]),
    risk_schema: JSON.stringify([
      { key: "budget_overrun", label: "예산 초과", severity: "high" },
      { key: "low_engagement", label: "낮은 참여율", severity: "medium" },
    ]),
    gate_schema: JSON.stringify([
      { key: "creative_approval", label: "크리에이티브 승인", sort_order: 1 },
      { key: "launch_readiness", label: "출시 준비 완료", sort_order: 2 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "campaign_brief", label: "캠페인 기획서", type: "document" },
      { key: "creative_assets", label: "크리에이티브 자산", type: "other" },
      { key: "performance_report", label: "성과 보고서", type: "report" },
    ]),
  },
  {
    id: "cat_research",
    name: "Research & Analysis",
    name_ko: "리서치 & 분석",
    slug: "research-analysis",
    description: "시장 조사나 데이터 분석 프로젝트에 사용해요.",
    icon: "search",
    color: "#8b5cf6",
    pack_key: "web_research_report",
    kpi_schema: JSON.stringify([
      { key: "data_sources", label: "데이터 소스 수", type: "number" },
      { key: "accuracy", label: "분석 정확도 (%)", type: "percent" },
    ]),
    risk_schema: JSON.stringify([
      { key: "data_quality", label: "데이터 품질 문제", severity: "high" },
      { key: "bias", label: "편향 리스크", severity: "medium" },
    ]),
    gate_schema: JSON.stringify([
      { key: "data_validation", label: "데이터 검증", sort_order: 1 },
      { key: "peer_review", label: "동료 검토", sort_order: 2 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "research_report", label: "리서치 보고서", type: "report" },
      { key: "data_dashboard", label: "데이터 대시보드", type: "other" },
    ]),
  },
  {
    id: "cat_product_launch",
    name: "Product Launch",
    name_ko: "제품 출시",
    slug: "product-launch",
    description: "신제품이나 서비스를 출시할 때 사용해요.",
    icon: "rocket",
    color: "#f97316",
    pack_key: "development",
    kpi_schema: JSON.stringify([
      { key: "launch_date_met", label: "출시일 준수", type: "percent" },
      { key: "initial_sales", label: "초기 판매량", type: "number" },
      { key: "nps", label: "NPS 점수", type: "number" },
    ]),
    risk_schema: JSON.stringify([
      { key: "delay", label: "출시 지연", severity: "high" },
      { key: "market_fit", label: "시장 적합성", severity: "high" },
      { key: "support_load", label: "지원 부하", severity: "medium" },
    ]),
    gate_schema: JSON.stringify([
      { key: "feature_freeze", label: "기능 동결", sort_order: 1 },
      { key: "beta_sign_off", label: "베타 승인", sort_order: 2 },
      { key: "go_live", label: "출시 승인", sort_order: 3 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "product_spec", label: "제품 명세서", type: "spec" },
      { key: "launch_plan", label: "출시 계획서", type: "document" },
      { key: "press_kit", label: "보도 자료", type: "other" },
    ]),
  },
  {
    id: "cat_content",
    name: "Content Production",
    name_ko: "콘텐츠 제작",
    slug: "content-production",
    description: "영상, 글, 디자인 등 콘텐츠를 만들 때 사용해요.",
    icon: "pen-tool",
    color: "#10b981",
    pack_key: "novel",
    kpi_schema: JSON.stringify([
      { key: "pieces_produced", label: "제작 콘텐츠 수", type: "number" },
      { key: "engagement_rate", label: "참여율 (%)", type: "percent" },
    ]),
    risk_schema: JSON.stringify([
      { key: "creative_block", label: "크리에이티브 막힘", severity: "low" },
      { key: "deadline_miss", label: "마감 미준수", severity: "high" },
    ]),
    gate_schema: JSON.stringify([
      { key: "draft_review", label: "초안 검토", sort_order: 1 },
      { key: "final_approval", label: "최종 승인", sort_order: 2 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "content_pieces", label: "콘텐츠 파일", type: "other" },
      { key: "style_guide", label: "스타일 가이드", type: "document" },
    ]),
  },
  {
    id: "cat_operations",
    name: "Operations & Process",
    name_ko: "운영 & 프로세스",
    slug: "operations-process",
    description: "내부 운영 개선이나 프로세스 최적화 프로젝트에 사용해요.",
    icon: "settings",
    color: "#64748b",
    pack_key: "report",
    kpi_schema: JSON.stringify([
      { key: "efficiency_gain", label: "효율 개선율 (%)", type: "percent" },
      { key: "cost_reduction", label: "비용 절감율 (%)", type: "percent" },
    ]),
    risk_schema: JSON.stringify([
      { key: "change_resistance", label: "변화 저항", severity: "medium" },
      { key: "process_disruption", label: "업무 중단", severity: "high" },
    ]),
    gate_schema: JSON.stringify([
      { key: "stakeholder_approval", label: "이해관계자 승인", sort_order: 1 },
      { key: "pilot_complete", label: "파일럿 완료", sort_order: 2 },
    ]),
    deliverable_schema: JSON.stringify([
      { key: "process_doc", label: "프로세스 문서", type: "document" },
      { key: "training_material", label: "교육 자료", type: "other" },
    ]),
  },
];

export function seedCategories(db: DbLike): void {
  const existing = (db.prepare("SELECT COUNT(*) as cnt FROM categories").get() as { cnt: number }).cnt;
  if (existing > 0) return;

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
      console.warn(`[AgentDesk] Skip seeding category "${cat.name}":`, err);
    }
  }

  console.log(`[AgentDesk] Seeded ${CATEGORY_SEEDS.length} default categories`);
}
