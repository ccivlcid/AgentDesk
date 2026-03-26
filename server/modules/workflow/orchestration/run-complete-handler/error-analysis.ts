/**
 * AI-powered task failure analysis with pattern-based pre-classification.
 * Called by PM Orchestrator when a task fails — PM decides action,
 * this module provides the analysis data for PM Activity UI.
 *
 * Features:
 * - Pattern library: known error signatures → instant classification (no LLM needed)
 * - Error sanitization: strips user home paths, API keys, tokens before storing
 * - LLM fallback: unrecognized errors get full AI analysis
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import logger from "../../../../lib/logger.ts";

interface ErrorAnalysisDeps {
  db: DatabaseSync;
  logsDir: string;
  findApiProvider: (db: DatabaseSync, scope: string) => unknown;
  resolveModel: (provider: unknown) => string;
  callProvider: (provider: unknown, model: string, system: string, user: string, signal: AbortSignal) => Promise<string>;
  getPreferredLanguage: () => string;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
}

export interface ErrorAnalysisResult {
  summary: string;
  cause: string;
  suggestion: string;
  analyzed_at: number;
}

// ── Pattern Library: known error signatures ──────────────────────────

export interface ErrorPattern {
  /** Regex to match against error output / log content */
  pattern: RegExp;
  /** Human-readable category for this error type */
  category: string;
  /** Short cause label stored in analysis result */
  cause: string;
  /** Actionable suggestion */
  suggestion: string;
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /ECONNREFUSED|ETIMEDOUT|ECONNRESET|ENETUNREACH|getaddrinfo\s+ENOTFOUND/i,
    category: "network",
    cause: "network_service_issue",
    suggestion: "Check network connectivity and verify the target service is running and accessible.",
  },
  {
    pattern: /Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/i,
    category: "dependency",
    cause: "missing_dependency",
    suggestion: "Run `npm install` or `pnpm install` to restore missing dependencies.",
  },
  {
    pattern: /ENOENT[:\s]|no such file or directory/i,
    category: "filesystem",
    cause: "file_not_found",
    suggestion: "Verify the file path exists. The referenced file or directory may have been moved or deleted.",
  },
  {
    pattern: /ENOMEM|heap out of memory|JavaScript heap|allocation failed/i,
    category: "memory",
    cause: "memory_exhaustion",
    suggestion: "Increase Node.js heap size with --max-old-space-size or reduce data volume.",
  },
  {
    pattern: /EACCES|EPERM|Permission denied|access denied/i,
    category: "permission",
    cause: "permission_denied",
    suggestion: "Check file/directory permissions. The process may lack required access rights.",
  },
  {
    pattern: /SyntaxError[:\s]|Unexpected token|Unexpected end of/i,
    category: "code_error",
    cause: "syntax_error",
    suggestion: "Fix the syntax error in the referenced file. Check for missing brackets, commas, or quotes.",
  },
  {
    pattern: /TypeError[:\s]|is not a function|Cannot read propert|undefined is not/i,
    category: "code_error",
    cause: "type_error",
    suggestion: "Check for null/undefined values and verify function signatures match their call sites.",
  },
  {
    pattern: /timed?\s*out|timeout|ETIMEDOUT|deadline exceeded/i,
    category: "timeout",
    cause: "execution_timeout",
    suggestion: "Increase the timeout limit or optimize the operation to complete faster.",
  },
  {
    pattern: /merge conflict|CONFLICT.*Merge|Automatic merge failed/i,
    category: "git_conflict",
    cause: "merge_conflict",
    suggestion: "Resolve the merge conflict manually, then re-run the task.",
  },
  {
    pattern: /rate.?limit|429|too many requests|quota exceeded/i,
    category: "rate_limit",
    cause: "rate_limit_exceeded",
    suggestion: "Wait before retrying. Consider reducing request frequency or upgrading API tier.",
  },
  {
    pattern: /ENOSPC|No space left on device|disk full/i,
    category: "disk",
    cause: "disk_full",
    suggestion: "Free disk space by removing unused files, logs, or build artifacts.",
  },
];

/**
 * Match error text against the pattern library.
 * Returns the first matching pattern or null.
 */
export function matchErrorPattern(errorText: string): ErrorPattern | null {
  for (const ep of ERROR_PATTERNS) {
    if (ep.pattern.test(errorText)) return ep;
  }
  return null;
}

// ── Error message sanitization ──────────────────────────────────────

/** Regex patterns for sensitive content that should be redacted from stored logs */
const SENSITIVE_PATTERNS: RegExp[] = [
  // API keys / tokens (common prefixes)
  /\b(sk-[a-zA-Z0-9]{20,})\b/g,
  /\b(ghp_[a-zA-Z0-9]{36,})\b/g,
  /\b(gho_[a-zA-Z0-9]{36,})\b/g,
  /\b(xoxb-[a-zA-Z0-9-]{30,})\b/g,
  /\b(xoxp-[a-zA-Z0-9-]{30,})\b/g,
  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  // Generic long hex/base64 tokens (40+ chars)
  /\b(token|key|secret|password|apikey|api_key)[=:\s]+["']?[a-zA-Z0-9\-._~+/]{40,}["']?/gi,
];

/**
 * Strip user home directory paths and sensitive tokens/keys from error text.
 * Safe to call on any string — returns sanitized version.
 */
export function sanitizeErrorMessage(text: string): string {
  let result = text;

  // Replace user home directory path with ~
  try {
    const home = os.homedir();
    if (home) {
      // Escape for regex, handle both forward and back slashes
      const escaped = home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const homeRegex = new RegExp(escaped.replace(/\\\\/g, "[/\\\\]"), "gi");
      result = result.replace(homeRegex, "~");
    }
  } catch { /* os.homedir() can fail in edge cases */ }

  // Redact sensitive tokens/keys
  for (const re of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global regexes
    re.lastIndex = 0;
    result = result.replace(re, "[REDACTED]");
  }

  return result;
}

export async function analyzeTaskFailure(
  taskId: string,
  taskTitle: string,
  exitCode: number,
  deps: ErrorAnalysisDeps,
): Promise<ErrorAnalysisResult | null> {
  const { db, logsDir, findApiProvider, resolveModel, callProvider, getPreferredLanguage, appendTaskLog } = deps;

  // 1. 로그 파일 읽기 (마지막 2000자)
  const logFile = path.join(logsDir, `${taskId}.log`);
  let logContent = "";
  try {
    if (fs.existsSync(logFile)) {
      const raw = fs.readFileSync(logFile, "utf8");
      logContent = raw.length > 2000 ? "..." + raw.slice(-2000) : raw;
    }
  } catch { /* ignore */ }

  // 2. 프롬프트 파일 읽기 (마지막 500자)
  const promptFile = path.join(logsDir, `${taskId}.prompt.txt`);
  let promptTail = "";
  try {
    if (fs.existsSync(promptFile)) {
      const raw = fs.readFileSync(promptFile, "utf8");
      promptTail = raw.length > 500 ? "..." + raw.slice(-500) : raw;
    }
  } catch { /* optional */ }

  // 3. Pattern matching — check against known error signatures before LLM call
  const combinedText = `${logContent}\n${promptTail}`;
  const patternMatch = matchErrorPattern(combinedText);

  if (patternMatch) {
    logger.info(
      { taskId, category: patternMatch.category, cause: patternMatch.cause },
      "[error-analysis] pattern matched — skipping LLM call",
    );
    appendTaskLog(taskId, "pm_oversight", `Error pattern detected: [${patternMatch.category}] ${patternMatch.cause}`);

    const result: ErrorAnalysisResult = {
      summary: sanitizeErrorMessage(`[${patternMatch.category}] ${taskTitle} failed (exit ${exitCode})`),
      cause: patternMatch.cause,
      suggestion: patternMatch.suggestion,
      analyzed_at: Date.now(),
    };

    db.prepare("UPDATE tasks SET error_analysis = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(result), Date.now(), taskId);

    appendTaskLog(taskId, "system", `Error analysis (pattern): ${result.summary} (${result.cause})`);
    return result;
  }

  // 4. LLM fallback for unrecognized errors
  const lang = getPreferredLanguage();
  const systemPrompt = loadPrompt("system/error-analysis", {
    taskTitle,
    exitCode: String(exitCode),
    promptTail: sanitizeErrorMessage(promptTail || "(not available)"),
    logContent: sanitizeErrorMessage(logContent || "(no log output)"),
    lang,
  });

  const provider = findApiProvider(db, "api");
  if (!provider || !systemPrompt) return null;

  try {
    const model = resolveModel(provider);
    const signal = AbortSignal.timeout(15_000);
    const rawText = await callProvider(provider, model, systemPrompt, `Analyze failure for: ${taskTitle}`, signal);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; cause?: string; suggestion?: string };
    const result: ErrorAnalysisResult = {
      summary: sanitizeErrorMessage(parsed.summary ?? "Unknown error"),
      cause: parsed.cause ?? "unknown",
      suggestion: sanitizeErrorMessage(parsed.suggestion ?? ""),
      analyzed_at: Date.now(),
    };

    db.prepare("UPDATE tasks SET error_analysis = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(result), Date.now(), taskId);

    appendTaskLog(taskId, "system", `Error analysis: ${result.summary} (${result.cause})`);
    logger.info({ taskId, cause: result.cause }, "[error-analysis] completed");

    return result;
  } catch (err) {
    logger.debug({ err, taskId }, "[error-analysis] failed (best effort)");
    return null;
  }
}
