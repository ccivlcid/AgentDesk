import type { DbLike } from "./types.ts";
import { applyTaskSchemaInlineDDL } from "./apply-inline-ddl.ts";
import { ensureOfficePackScopedDepartmentSchema } from "./ensure-office-pack-departments.ts";
import { migrateMessagesDirectiveType } from "./migrate-messages-directive-type.ts";
import { migrateLegacyTasksStatusSchema } from "./migrate-legacy-tasks-status.ts";
import { repairLegacyTaskForeignKeys } from "./repair-legacy-task-fks.ts";
import { ensureMessagesIdempotencySchema } from "./ensure-messages-idempotency.ts";
import { migrateCodeReviewGateToAuto, seedPipelineGates } from "./seed-pipeline-gates.ts";
import { applyMessageAttachmentsColumn, migrateCeoClientNaming } from "./apply-client-label-migrations.ts";
import { applyV2CategoryMigrations } from "./apply-v2-category-migrations.ts";
import { migrateProjectScopeType } from "./migrate-project-scope-type.ts";
import { migrateSkillLearningHistoryScope } from "./migrate-skill-learning-history-scope.ts";

export function applyTaskSchemaMigrations(db: DbLike): void {
  applyTaskSchemaInlineDDL(db);

  ensureOfficePackScopedDepartmentSchema(db);

  migrateMessagesDirectiveType(db);
  migrateLegacyTasksStatusSchema(db);
  repairLegacyTaskForeignKeys(db);
  ensureMessagesIdempotencySchema(db);
  seedPipelineGates(db);
  migrateCodeReviewGateToAuto(db);

  applyMessageAttachmentsColumn(db);

  applyV2CategoryMigrations(db);

  migrateCeoClientNaming(db);

  migrateProjectScopeType(db);
  migrateSkillLearningHistoryScope(db);
}

export type { DbLike } from "./types.ts";
