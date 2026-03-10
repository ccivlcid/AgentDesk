/**
 * Maps project category IDs (from category-seeds.ts)
 * to skill category names (from skills-library/model.tsx CATEGORIES).
 */
export const PROJECT_CATEGORY_TO_SKILL_CATEGORIES: Record<string, string[]> = {
  cat_software_dev: ["Frontend", "Backend", "DevOps", "Testing & QA", "Architecture"],
  cat_marketing: ["Marketing", "Design", "Productivity"],
  cat_research: ["AI & Agent", "Productivity", "Backend"],
  cat_product_launch: ["Frontend", "Marketing", "Design", "Testing & QA"],
  cat_content: ["Design", "Productivity", "Marketing"],
  cat_operations: ["DevOps", "Security", "Productivity"],
};
