/** Minimal 5-field cron parser (minute hour day-of-month month day-of-week). */

function parseCronField(field: string, min: number, max: number): Set<number> {
  const result = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) result.add(i);
    } else if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2), 10);
      if (isNaN(step) || step < 1) throw new Error(`Bad cron step: ${part}`);
      for (let i = min; i <= max; i += step) result.add(i);
    } else if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= b; i++) result.add(i);
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n)) throw new Error(`Bad cron field value: ${part}`);
      result.add(n);
    }
  }
  return result;
}

/**
 * Returns the next timestamp (ms) at which the cron expression fires,
 * strictly after `afterMs`.
 */
export function nextCronRunAfter(cronExpr: string, afterMs: number): number {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron (need 5 fields): "${cronExpr}"`);
  const [minPart, hourPart, domPart, monPart, dowPart] = parts;
  const minutes = parseCronField(minPart, 0, 59);
  const hours   = parseCronField(hourPart, 0, 23);
  const doms    = parseCronField(domPart, 1, 31);
  const months  = parseCronField(monPart, 1, 12);
  const dows    = parseCronField(dowPart, 0, 6);

  // Advance to next whole minute
  const cur = new Date(afterMs + 60_000);
  cur.setSeconds(0, 0);

  const limit = new Date(afterMs + 366 * 24 * 60 * 60_000); // max 1 year scan

  while (cur < limit) {
    if (
      months.has(cur.getMonth() + 1) &&
      doms.has(cur.getDate()) &&
      dows.has(cur.getDay()) &&
      hours.has(cur.getHours()) &&
      minutes.has(cur.getMinutes())
    ) {
      return cur.getTime();
    }
    cur.setMinutes(cur.getMinutes() + 1);
  }
  throw new Error(`No next run found within 1 year for cron: "${cronExpr}"`);
}

