import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import type { createProjectRouteHelpers } from "./helpers.ts";

export type ProjectRoutesDeps = {
  app: Express;
  db: DatabaseSync;
  firstQueryValue: (value: unknown) => string | undefined;
  normalizeTextField: (value: unknown) => string | null;
  runInTransaction: (fn: () => void) => void;
  nowMs: () => number;
  helpers: ReturnType<typeof createProjectRouteHelpers>;
};
