import type { DatabaseSync } from "node:sqlite";

export type DbLike = Pick<DatabaseSync, "exec" | "prepare">;
