/**
 * Terminal UI helpers — colors, tables, status indicators
 */
import chalk from "chalk";

// ── Status badges ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, (s: string) => string> = {
  done: chalk.green,
  in_progress: chalk.yellow,
  running: chalk.yellow,
  planned: chalk.blue,
  review: chalk.magenta,
  paused: chalk.gray,
  failed: chalk.red,
  blocked: chalk.red,
};

export function badge(status: string): string {
  const colorFn = STATUS_COLORS[status] ?? chalk.white;
  return colorFn(` ${status.toUpperCase()} `);
}

// ── Simple table ───────────────────────────────────────────────

export function table(
  headers: string[],
  rows: string[][],
  colWidths?: number[],
): string {
  const widths =
    colWidths ??
    headers.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => stripAnsi(r[i] ?? "").length)) + 2,
    );

  const fmt = (vals: string[]) =>
    vals.map((v, i) => pad(v, widths[i])).join("  ");

  const headerLine = fmt(headers.map((h) => chalk.bold.dim(h)));
  const divider = widths.map((w) => chalk.dim("-".repeat(w))).join("  ");
  const body = rows.map((r) => fmt(r)).join("\n");

  return `${headerLine}\n${divider}\n${body}`;
}

function pad(str: string, width: number): string {
  const len = stripAnsi(str).length;
  return str + " ".repeat(Math.max(0, width - len));
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// ── Misc helpers ───────────────────────────────────────────────

export function header(text: string): string {
  return `\n${chalk.bold.cyan(text)}\n`;
}

export function dim(text: string): string {
  return chalk.dim(text);
}

export function error(text: string): string {
  return chalk.red(`ERROR: ${text}`);
}

export function success(text: string): string {
  return chalk.green(text);
}

export function serverDownMessage(): string {
  return [
    error("AgentDesk server is not running."),
    "",
    `  Start it with: ${chalk.bold("pnpm dev")}`,
    `  Or API only:   ${chalk.bold("pnpm start")}`,
    "",
  ].join("\n");
}

/** Truncate string to maxLen with ellipsis */
export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "\u2026";
}

/** Format timestamp to relative time */
export function timeAgo(isoOrMs: string | number): string {
  const ms =
    typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
