import type { DbLike } from "./types.ts";

export function seedPipelineGates(db: DbLike): void {
  const existing = db.prepare("SELECT COUNT(*) AS cnt FROM pipeline_gates").get() as { cnt: number };
  if (existing.cnt > 0) return;

  const gates: Array<[string, string, string, string, number, string, string | null, number | null]> = [
    // [pack_key, gate_key, label, label_ko, order, type, check_expr, sla_min]
    ["development", "test_evidence", "Test Evidence", "테스트 증거", 1, "auto", "test|spec|passing|passed|PASS|✓", 60],
    ["development", "security_scan", "Security Scan", "보안 스캔", 2, "auto", null, 30],
    ["development", "code_review", "Code Review", "코드 리뷰", 3, "auto", null, 120],
    ["report", "data_confirmation", "Data Confirmation", "데이터 확정", 1, "auto", null, 30],
    ["report", "fact_check", "Fact Check", "팩트체크", 2, "auto", "http|https|출처|source|reference", 60],
    ["report", "final_review", "Final Review", "최종 검토", 3, "manual", null, 120],
    ["web_research_report", "citation_check", "Citation Check", "인용 확인", 1, "auto", "https?://", 30],
    ["web_research_report", "accuracy_review", "Accuracy Review", "정확성 검토", 2, "manual", null, 60],
    ["video_preprod", "render_verify", "Render Verification", "렌더링 검증", 1, "auto", null, 60],
    ["video_preprod", "creative_review", "Creative Review", "크리에이티브 리뷰", 2, "manual", null, 120],
    ["asset_management", "compliance_check", "Compliance Check", "컴플라이언스 체크", 1, "auto", null, 30],
    ["asset_management", "risk_review", "Risk Review", "리스크 리뷰", 2, "manual", null, 60],
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO pipeline_gates (workflow_pack_key, gate_key, gate_label, gate_label_ko, gate_order, gate_type, check_expression, sla_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const g of gates) {
    insert.run(...g);
  }
}

export function migrateCodeReviewGateToAuto(db: DbLike): void {
  db.prepare(
    "UPDATE pipeline_gates SET gate_type = 'auto' WHERE workflow_pack_key = 'development' AND gate_key = 'code_review' AND gate_type = 'manual'",
  ).run();
}
