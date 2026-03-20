import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { createProjectRouteHelpers } from "./projects/helpers.ts";
import type { ProjectRoutesDeps } from "./projects/types.ts";
import { registerPathRoutes } from "./projects/register-path-routes.ts";
import { registerFileRoutes } from "./projects/register-file-routes.ts";
import { registerCrudRoutes } from "./projects/register-crud-routes.ts";
import { registerProjectDetailRoute } from "./projects/register-project-detail-route.ts";
import { registerFeatureRoutes } from "./projects/register-feature-routes.ts";

type FirstQueryValue = (value: unknown) => string | undefined;
type NormalizeTextField = (value: unknown) => string | null;
type RunInTransaction = (fn: () => void) => void;

export interface RegisterProjectRoutesOptions {
  app: Express;
  db: DatabaseSync;
  firstQueryValue: FirstQueryValue;
  normalizeTextField: NormalizeTextField;
  runInTransaction: RunInTransaction;
  nowMs: () => number;
}

export function registerProjectRoutes({
  app,
  db,
  firstQueryValue,
  normalizeTextField,
  runInTransaction,
  nowMs,
}: RegisterProjectRoutesOptions): void {
  const helpers = createProjectRouteHelpers({ db, normalizeTextField });
  const deps: ProjectRoutesDeps = {
    app,
    db,
    firstQueryValue,
    normalizeTextField,
    runInTransaction,
    nowMs,
    helpers,
  };

  registerPathRoutes(deps);
  registerFileRoutes(deps);
  registerCrudRoutes(deps);
  registerProjectDetailRoute(deps);
  registerFeatureRoutes(deps);
}
