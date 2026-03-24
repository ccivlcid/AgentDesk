import type { SQLOutputValue } from "node:sqlite";

/** Row shape from DatabaseSync Statement.get() / .all() before domain typing */
type SqliteRow = Record<string, SQLOutputValue>;

/**
 * Bridge untyped sqlite rows to domain types. Use only at query boundaries —
 * node:sqlite does not model column shapes.
 */
export function castSqliteRow<T>(row: SqliteRow | undefined): T | undefined {
  if (row === undefined) return undefined;
  return row as T;
}

export function castSqliteRows<T>(rows: SqliteRow[]): T[] {
  return rows as T[];
}
