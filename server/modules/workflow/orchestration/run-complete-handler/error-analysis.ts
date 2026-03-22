/**
 * AI-powered task failure analysis.
 * Called by PM Orchestrator when a task fails — PM decides action,
 * this module provides the analysis data for PM Activity UI.
 */

import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import logger from "../../../../lib/logger.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- provider types vary across modules
interface ErrorAnalysisDeps {
  db: DatabaseSync;
  logsDir: string;
  findApiProvider: (db: any, scope: string) => any;
  resolveModel: (provider: any) => string;
  callProvider: (provider: any, model: string, system: string, user: string, signal: AbortSignal) => Promise<string>;
  getPreferredLanguage: () => string;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
}

export interface ErrorAnalysisResult {
  summary: string;
  cause: string;
  suggestion: string;
  analyzed_at: number;
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

  // 3. LLM에게 분석 요청
  const lang = getPreferredLanguage();
  const systemPrompt = loadPrompt("system/error-analysis", {
    taskTitle,
    exitCode: String(exitCode),
    promptTail: promptTail || "(not available)",
    logContent: logContent || "(no log output)",
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
      summary: parsed.summary ?? "Unknown error",
      cause: parsed.cause ?? "unknown",
      suggestion: parsed.suggestion ?? "",
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
