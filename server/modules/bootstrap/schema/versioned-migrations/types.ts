import type { DatabaseSync } from "node:sqlite";

export type DbLike = Pick<DatabaseSync, "exec" | "prepare">;

export type Migration = {
  /** Unique, immutable identifier. Convention: YYYY-MM-DD-NNN-short-description */
  id: string;
  up: (db: DbLike) => void;
};
