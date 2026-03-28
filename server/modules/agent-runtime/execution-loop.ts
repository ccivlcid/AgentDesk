import type { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import logger from "../../lib/logger.ts";
import { eventBus } from "../../lib/event-bus.ts";
import { TOOL_DEFINITIONS, executeTool } from "./tools.ts";
import { callAnthropicStream, callOpenAICompatibleStream, resolveProvider, getDefaultModel } from "./llm-client.ts";
import { createRun, updateRunStatus, updateRunUsage, appendEvent, getRun } from "./store.ts";
import { recordTaskExecutionEvent } from "../workflow/core/task-execution-meta.ts";
import { loadPrompt } from "../../lib/prompt-loader.ts";
import type { LlmMessage, LlmContent, StartRunOptions } from "./types.ts";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TURNS = 20;
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Line buffer for codex NDJSON streams.
 * stdout chunks may split a JSON line across two Buffer boundaries.
 * Call `push(chunk)` to feed data and get back complete lines.
 * Exported so cli-runtime.ts can create its own buffer instance.
 */
export class CodexLineBuffer {
  private remainder = "";
  push(chunk: string): string[] {
    const data = this.remainder + chunk;
    const lines = data.split("\n");
    // Last element is either "" (if chunk ended with \n) or a partial line
    this.remainder = lines.pop() ?? "";
    return lines;
  }
  /** Flush any remaining partial line (call on stream end). */
  flush(): string | null {
    if (!this.remainder) return null;
    const line = this.remainder;
    this.remainder = "";
    return line;
  }
}

/**
 * Parse a single line of codex CLI JSON output into human-readable text.
 * Codex `exec --json` outputs newline-delimited JSON objects.
 *
 * Known event types:
 *   {"type":"message.delta","delta":"Hello..."}
 *   {"type":"message.completed","message":{...}}
 *   {"type":"text","content":"Hello..."}
 *   {"type":"message","content":"..."}
 *   {"type":"tool_call","name":"write_file",...}
 *   {"type":"result","content":"Done"}
 *   {"type":"response.completed","response":{...}}
 *   {"type":"item.started","item":{...}}
 *   {"type":"item.completed","item":{...}}
 *   {"type":"error","message":"..."}
 *
 * Returns readable text or null if the event should be silently skipped.
 */
export function parseCodexJsonLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Only attempt JSON parse if it looks like a JSON object
  if (!trimmed.startsWith("{")) return trimmed;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Incomplete or non-JSON — pass through as-is
    return trimmed;
  }

  const type = parsed.type as string | undefined;

  // Streaming text delta (primary codex streaming event)
  if (type === "message.delta") {
    const delta = (parsed.delta as string) ?? "";
    return delta || null;
  }

  // Completed message — extract final text
  if (type === "message.completed") {
    const msg = parsed.message as Record<string, unknown> | undefined;
    const content = (msg?.content as string) ?? (parsed.content as string) ?? "";
    return content || null;
  }

  // Simple text / message / result events
  if (type === "text" || type === "message" || type === "result") {
    const content = (parsed.content as string) ?? "";
    return content || null;
  }

  // Response completion — extract summary if present
  if (type === "response.completed") {
    const resp = parsed.response as Record<string, unknown> | undefined;
    const output = (resp?.output_text as string) ?? (resp?.content as string) ?? "";
    return output || null;
  }

  // Tool calls
  if (type === "tool_call" || type === "function_call") {
    const name = (parsed.name as string) ?? (parsed.tool as string) ?? "tool";
    const args = parsed.arguments ?? parsed.input ?? parsed.params;
    const argStr = args ? ` ${typeof args === "string" ? args : JSON.stringify(args)}` : "";
    return `[tool] ${name}${argStr}`;
  }

  // Tool results
  if (type === "tool_result" || type === "function_call_output") {
    const output = (parsed.output as string) ?? (parsed.content as string) ?? "";
    if (output) return `[result] ${output.slice(0, 500)}${output.length > 500 ? "..." : ""}`;
    return null;
  }

  // Errors
  if (type === "error") {
    const msg = (parsed.message as string) ?? (parsed.content as string) ?? JSON.stringify(parsed);
    return `[error] ${msg}`;
  }

  // item.started / item.completed — extract sub-agent or tool info
  if (type === "item.started" || type === "item.completed") {
    const item = parsed.item as Record<string, unknown> | undefined;
    if (item) {
      const tool = (item.tool as string) ?? (item.type as string) ?? "";
      const prompt = (item.prompt as string) ?? "";
      const status = type === "item.completed" ? "completed" : "started";
      const label = tool ? `[${tool} ${status}]` : `[${status}]`;
      return prompt ? `${label} ${prompt.split("\n")[0].slice(0, 100)}` : label;
    }
  }

  // Generic content fallback (status / thinking / etc.)
  if (parsed.content && typeof parsed.content === "string") {
    return parsed.content as string;
  }

  // Known metadata-only event type — skip silently
  if (type) return null;

  // Truly unknown structure — pass through as-is
  return trimmed;
}

interface ExecutionLoopDeps {
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  nowMs: () => number;
  /** Resolve project working directory (needed for chained execution) */
  resolveProjectPath?: (projectId: string) => string;
  /** Shared map so chained runs can be cancelled from routes / kickoff */
  abortControllers?: Map<string, AbortController>;
}

/** Build system prompt from agent config + rules */
function buildSystemPrompt(db: DatabaseSync, agentId: string, projectId?: string | null): string {
  const agent = db.prepare("SELECT name, role, cli_provider FROM agents WHERE id = ?").get(agentId) as
    | { name: string; role: string; cli_provider: string }
    | undefined;

  const agentName = agent?.name ?? "Agent";
  const agentRole = agent?.role ?? "software engineer";

  // Collect rules (project > agent > global)
  const rules: string[] = [];
  const ruleRows = db.prepare(`
    SELECT content FROM rule_entries
    WHERE enabled = 1
      AND (scope_type = 'global'
        OR (scope_type = 'agent' AND scope_id = ?)
        OR (scope_type = 'project' AND scope_id = ?))
    ORDER BY CASE scope_type WHEN 'project' THEN 0 WHEN 'agent' THEN 1 ELSE 2 END,
             priority DESC
    LIMIT 20
  `).all(agentId, projectId ?? "") as { content: string }[];
  for (const r of ruleRows) rules.push(`- ${r.content}`);

  // Collect memory
  const memories: string[] = [];
  const memRows = db.prepare(`
    SELECT content FROM memory_entries
    WHERE enabled = 1
      AND (scope_type = 'global'
        OR (scope_type = 'agent' AND scope_id = ?)
        OR (scope_type = 'project' AND scope_id = ?))
    ORDER BY priority DESC
    LIMIT 10
  `).all(agentId, projectId ?? "") as { content: string }[];
  for (const m of memRows) memories.push(`- ${m.content}`);

  let prompt = loadPrompt("system/agent-runtime", { agentName, agentRole }) ?? `You are ${agentName}, a ${agentRole}. Complete tasks using available tools.`;

  if (rules.length > 0) {
    prompt += `\n\n## Rules\n${rules.join("\n")}`;
  }
  if (memories.length > 0) {
    prompt += `\n\n## Context & Memory\n${memories.join("\n")}`;
  }

  return prompt;
}

/** Broadcast text stream to CLI Window and task log */
function broadcastText(
  broadcast: (type: string, payload: unknown) => void,
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void,
  taskId: string,
  text: string,
) {
  // Use snake_case task_id + data to match AgentOffice broadcast convention
  broadcast("cli_output", { task_id: taskId, taskId, data: text, line: text });
  if (text.trim()) appendTaskLog(taskId, "agent", text);
}

/** Broadcast status to Task Board / Flow Graph */
function broadcastStatus(
  broadcast: (type: string, payload: unknown) => void,
  taskId: string,
  agentId: string,
  status: string,
  runId: string,
  tokenUsage?: { inputTokens: number; outputTokens: number; toolCalls: number },
) {
  broadcast("runtime_status", { taskId, agentId, status, runId, ...tokenUsage && { inputTokens: tokenUsage.inputTokens, outputTokens: tokenUsage.outputTokens, toolCalls: tokenUsage.toolCalls } });
}

/** Run task via CLI provider (claude/codex/gemini) — spawns subprocess with real-time streaming */
async function runViaCli(
  cliProvider: string,
  systemPrompt: string,
  taskTitle: string,
  projectPath: string,
  signal: AbortSignal,
  onChunk?: (text: string) => void,
): Promise<string> {
  let cmd: string;
  let args: string[];

  if (cliProvider === "codex") {
    cmd = "codex"; args = ["--enable", "multi_agent", "--yolo", "exec", "--json"];
  } else if (cliProvider === "gemini") {
    cmd = "gemini"; args = ["--yolo"];
  } else {
    // claude (default), cursor, opencode 등
    cmd = "claude";
    args = ["--dangerously-skip-permissions", "--print", "--verbose", "--max-turns", "200"];
  }

  const fullPrompt = `${systemPrompt}\n\n## Task\n${taskTitle}`;

  return new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectPath || undefined,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
    });

    const timeoutId = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      reject(new Error(`CLI provider '${cliProvider}' timed out after 120s`));
    }, 120_000);

    const abortHandler = () => {
      try { child.kill(); } catch { /* ignore */ }
      clearTimeout(timeoutId);
      reject(new Error("Aborted"));
    };
    signal.addEventListener("abort", abortHandler, { once: true });

    // Stall detection: kill process if no output for 5 minutes
    const STALL_TIMEOUT_MS = 300_000;
    const STALL_WARN_MS = 60_000;
    let lastOutputAt = Date.now();
    let stallWarned = false;
    const stallCheckId = setInterval(() => {
      const elapsed = Date.now() - lastOutputAt;
      if (!stallWarned && elapsed >= STALL_WARN_MS) {
        stallWarned = true;
        logger.warn({ cliProvider, elapsed }, "[execution-loop] CLI agent stalled — no output for 60s");
      }
      if (elapsed >= STALL_TIMEOUT_MS) {
        clearInterval(stallCheckId);
        logger.error({ cliProvider, elapsed }, "[execution-loop] CLI agent stalled — killing after 5min inactivity");
        try { child.kill(); } catch { /* ignore */ }
        reject(new Error(`CLI provider '${cliProvider}' stalled — no output for ${Math.round(STALL_TIMEOUT_MS / 1000)}s`));
      }
    }, 15_000);

    // Auth error patterns emitted by CLI providers when credentials are missing
    const AUTH_ERROR_PATTERNS = [
      "please set an auth method",
      "gemini_api_key",
      "google_genai_use_vertexai",
      "anthropic_api_key",
      "invalid api key",
      "not logged in",
      "authentication failed",
      "authorization failed",
      "api key not found",
      "set an auth",
    ];

    let output = "";
    // Use line buffer for codex to handle partial JSON lines across chunks
    const codexBuf = cliProvider === "codex" ? new CodexLineBuffer() : null;
    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      output += text;
      lastOutputAt = Date.now(); stallWarned = false;
      if (codexBuf) {
        const completeLines = codexBuf.push(text);
        const parts: string[] = [];
        for (const line of completeLines) {
          const parsed = parseCodexJsonLine(line);
          if (parsed !== null) parts.push(parsed);
        }
        const combined = parts.join("\n");
        if (combined.trim()) onChunk?.(combined);
      } else {
        onChunk?.(text);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      output += text;
      lastOutputAt = Date.now(); stallWarned = false;
      onChunk?.(text);
    });
    child.on("error", (err) => {
      clearInterval(stallCheckId);
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", abortHandler);
      reject(err);
    });
    child.on("close", (code) => {
      clearInterval(stallCheckId);
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", abortHandler);

      // Flush any remaining buffered codex output
      if (codexBuf) {
        const remaining = codexBuf.flush();
        if (remaining) {
          const parsed = parseCodexJsonLine(remaining);
          if (parsed) onChunk?.(parsed);
        }
      }

      // Detect auth/credential errors from CLI output
      const lower = output.toLowerCase();
      const isAuthError = AUTH_ERROR_PATTERNS.some((p) => lower.includes(p));
      if (isAuthError) {
        const firstLine = output.split("\n").find((l) => l.trim()) ?? output.slice(0, 200);
        reject(new Error(`CLI provider '${cliProvider}' auth error: ${firstLine.trim()}`));
        return;
      }

      // Non-zero exit with no meaningful output → treat as failure
      if (code !== 0 && output.trim().length < 20) {
        reject(new Error(`CLI provider '${cliProvider}' exited with code ${code}`));
        return;
      }

      resolve(output);
    });
    child.stdin?.write(fullPrompt);
    child.stdin?.end();
  });
}

/**
 * Main execution loop: LLM ↔ Tool ↔ LLM until end_turn or max turns.
 * Runs async, returns the runId.
 */
export async function startExecutionLoop(
  deps: ExecutionLoopDeps,
  options: StartRunOptions,
  taskTitle: string,
  abortController: AbortController,
): Promise<string> {
  const { db, broadcast, appendTaskLog, nowMs } = deps;
  const { agentId, taskId, projectId, projectPath = "", maxTurns = DEFAULT_MAX_TURNS, apiProviderId } = options;

  // Determine model & CLI provider
  const agentRow = db.prepare("SELECT api_model, api_provider_id, cli_provider FROM agents WHERE id = ?").get(agentId) as
    | { api_model: string | null; api_provider_id: string | null; cli_provider: string | null }
    | undefined;
  const resolvedProviderId = apiProviderId ?? agentRow?.api_provider_id ?? undefined;
  const cliProvider = agentRow?.cli_provider ?? null;

  // Determine execution mode: CLI-first if agent has cli_provider, API if api_provider_id
  const useCliMode = !!cliProvider && !resolvedProviderId;

  // Resolve provider + model for API mode
  let providerLabel = useCliMode ? (cliProvider ?? "cli") : "api";
  let resolvedModel = options.model ?? agentRow?.api_model ?? DEFAULT_MODEL;
  if (!useCliMode) {
    try {
      const prov = resolveProvider(db, resolvedProviderId);
      providerLabel = prov.providerType;
      if (!options.model && !agentRow?.api_model) {
        resolvedModel = getDefaultModel(prov.providerType);
      }
    } catch { /* will fail again in API mode with proper error */ }
  }

  // Create run record
  const run = createRun(db, { taskId, agentId, projectId, model: resolvedModel, provider: providerLabel }, nowMs);
  const runId = run.id;

  // Update task status to in_progress / running
  db.prepare("UPDATE tasks SET status = 'in_progress', execution_state = 'running' WHERE id = ?").run(taskId);
  broadcast("task_update", { id: taskId, status: "in_progress" });
  broadcastStatus(broadcast, taskId, agentId, "thinking", runId);

  // Record task_start event for timeline
  recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
    taskId,
    eventType: "task_started",
    fromState: "planned",
    toState: "in_progress",
    summary: `Task execution started (${useCliMode ? `CLI: ${cliProvider}` : `API: ${resolvedModel}`})`,
    createdAt: nowMs(),
  });

  // Async execution — fire and forget, errors are caught and stored
  void (async () => {
    try {
      updateRunStatus(db, runId, "running", { started_at: nowMs() });

      const systemPrompt = buildSystemPrompt(db, agentId, projectId);

      // ── CLI Mode: agent has cli_provider (claude/codex/gemini 등) ──
      if (useCliMode) {
        const cliHeader = `[runtime] CLI: ${cliProvider} | Task: ${taskTitle}\n${"─".repeat(60)}\n`;
        broadcastText(broadcast, appendTaskLog, taskId, cliHeader);
        appendEvent(db, runId, "status", cliHeader, 0, nowMs);

        const cliOutput = await runViaCli(
          cliProvider!, systemPrompt, taskTitle, projectPath, abortController.signal,
          (chunk) => {
            // 실시간 스트리밍: 각 청크를 즉시 브로드캐스트
            broadcastText(broadcast, appendTaskLog, taskId, chunk);
            appendEvent(db, runId, "text", chunk, 0, nowMs);
          },
        );

        const cliSummary = `\n${"─".repeat(60)}\n[runtime] CLI execution completed via ${cliProvider}\n`;
        broadcastText(broadcast, appendTaskLog, taskId, cliSummary);

        const doneAt = nowMs();
        updateRunStatus(db, runId, "completed", { completed_at: doneAt });
        // Set status to 'review' so PM orchestrator can review before marking done
        db.prepare("UPDATE tasks SET status = 'review', execution_state = 'succeeded', result = ?, updated_at = ? WHERE id = ?")
          .run(cliOutput.slice(-4000), doneAt, taskId);
        broadcast("task_update", { id: taskId, status: "review" });
        broadcastStatus(broadcast, taskId, agentId, "complete", runId);
        appendTaskLog(taskId, "system", "Status → review (CLI execution complete)");
        logger.info({ runId, taskId, cliProvider }, "[runtime] CLI execution complete → review");

        // Record task_complete event for timeline
        recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
          taskId,
          eventType: "task_complete",
          fromState: "in_progress",
          toState: "review",
          summary: `Task completed via CLI (${cliProvider}) — awaiting review`,
          createdAt: doneAt,
        });

        // Emit event for PM orchestrator
        eventBus.emitTaskStatus({
          type: "task_status_changed",
          taskId,
          projectId: projectId ?? null,
          fromStatus: "in_progress",
          toStatus: "review",
          agentId,
          resultTail: cliOutput.length > 2000 ? "…" + cliOutput.slice(-2000) : cliOutput,
        });
        return;
      }

      // ── API Mode: resolve provider and call LLM ──
      const provider = resolveProvider(db, resolvedProviderId);
      const model = resolvedModel;
      const messages: LlmMessage[] = [{ role: "user", content: taskTitle }];

      let turn = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalToolCalls = 0;
      let accumulatedText = ""; // for saving as task result

      // Header line to CLI Window
      const providerTag = provider.providerType !== "anthropic" ? ` (${provider.providerType})` : "";
      const header = `[runtime] Model: ${model}${providerTag} | Task: ${taskTitle}\n${"─".repeat(60)}\n`;
      broadcastText(broadcast, appendTaskLog, taskId, header);
      appendEvent(db, runId, "status", header, 0, nowMs);

      while (turn < maxTurns) {
        if (abortController.signal.aborted) break;
        turn++;

        broadcastStatus(broadcast, taskId, agentId, "thinking", runId);

        const pendingToolCalls: import("./types.ts").ToolCall[] = [];
        let turnInputTokens = 0;
        let turnOutputTokens = 0;

        const streamCallbacks = {
          onText: (text: string) => {
            broadcastText(broadcast, appendTaskLog, taskId, text);
            appendEvent(db, runId, "text", text, 0, nowMs);
            accumulatedText += text;
          },
          onToolCall: (call: import("./types.ts").ToolCall) => {
            pendingToolCalls.push(call);
            const line = `\n[tool] ${call.name}(${JSON.stringify(call.input)})\n`;
            broadcastText(broadcast, appendTaskLog, taskId, line);
            appendEvent(db, runId, "tool_call", JSON.stringify({ name: call.name, input: call.input }), 0, nowMs);
          },
          onDone: (usage: { inputTokens: number; outputTokens: number }) => {
            turnInputTokens = usage.inputTokens;
            turnOutputTokens = usage.outputTokens;
          },
          onError: (err: Error) => {
            logger.error({ err, runId }, "[runtime] stream error");
          },
        };

        // Call appropriate provider
        const { stopReason, assistantContent } = provider.type === "anthropic"
          ? await callAnthropicStream({
              apiKey: provider.apiKey,
              model,
              systemPrompt,
              messages,
              tools: TOOL_DEFINITIONS,
              maxTokens: DEFAULT_MAX_TOKENS,
              signal: abortController.signal,
              callbacks: streamCallbacks,
            })
          : await callOpenAICompatibleStream({
              apiKey: provider.apiKey,
              baseUrl: provider.baseUrl,
              model,
              systemPrompt,
              messages,
              tools: TOOL_DEFINITIONS,
              maxTokens: DEFAULT_MAX_TOKENS,
              signal: abortController.signal,
              callbacks: streamCallbacks,
            });

        totalInputTokens += turnInputTokens;
        totalOutputTokens += turnOutputTokens;
        updateRunUsage(db, runId, turnInputTokens, turnOutputTokens, pendingToolCalls.length);
        totalToolCalls += pendingToolCalls.length;

        // Append assistant message
        messages.push({ role: "assistant", content: assistantContent });

        if (stopReason === "tool_use" && pendingToolCalls.length > 0 && !abortController.signal.aborted) {
          // Execute all tools and collect results
          broadcastStatus(broadcast, taskId, agentId, "tool_use", runId);

          const toolResults: LlmContent[] = pendingToolCalls.map((call) => {
            const result = executeTool(call, projectPath);
            const resultLine = `[result] ${result.is_error ? "ERROR: " : ""}${result.content.slice(0, 500)}${result.content.length > 500 ? "…" : ""}\n`;
            broadcastText(broadcast, appendTaskLog, taskId, resultLine);
            appendEvent(db, runId, "tool_result", JSON.stringify(result), 0, nowMs);
            return {
              type: "tool_result" as const,
              tool_use_id: result.tool_use_id,
              content: result.content,
              is_error: result.is_error,
            };
          });

          // Add tool results as next user message
          messages.push({ role: "user", content: toolResults });
          continue; // next turn
        }

        // end_turn or no more tool calls
        break;
      }

      // Done — send to PM review
      const summary = `\n${"─".repeat(60)}\n[runtime] Completed in ${turn} turn(s) | Tokens: ${totalInputTokens} in / ${totalOutputTokens} out | Tools used: ${totalToolCalls}\n`;
      broadcastText(broadcast, appendTaskLog, taskId, summary);

      const apiDoneAt = nowMs();
      const resultText = accumulatedText.slice(-4000) || summary;
      updateRunStatus(db, runId, "completed", { completed_at: apiDoneAt });
      // Set status to 'review' so PM orchestrator can review before marking done
      db.prepare("UPDATE tasks SET status = 'review', execution_state = 'succeeded', result = ?, updated_at = ? WHERE id = ?")
        .run(resultText, apiDoneAt, taskId);
      broadcast("task_update", { id: taskId, status: "review" });
      broadcastStatus(broadcast, taskId, agentId, "complete", runId, { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, toolCalls: totalToolCalls });
      appendTaskLog(taskId, "system", `Status → review (API execution complete, ${turn} turns)`);

      // Record task_complete event for timeline
      recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
        taskId,
        eventType: "task_complete",
        fromState: "in_progress",
        toState: "review",
        summary: `Task completed via API (${model}, ${turn} turns, ${totalInputTokens}+${totalOutputTokens} tokens) — awaiting review`,
        createdAt: apiDoneAt,
      });

      logger.info({ runId, taskId, turns: turn, totalInputTokens, totalOutputTokens }, "[runtime] execution complete → review");

      // Emit event for PM orchestrator
      eventBus.emitTaskStatus({
        type: "task_status_changed",
        taskId,
        projectId: projectId ?? null,
        fromStatus: "in_progress",
        toStatus: "review",
        agentId,
        resultTail: resultText.length > 2000 ? "…" + resultText.slice(-2000) : resultText,
      });
    } catch (err) {
      const msg = String(err);
      logger.error({ err, runId, taskId }, "[runtime] execution error");
      appendEvent(db, runId, "error", msg, 0, nowMs);
      updateRunStatus(db, runId, "failed", { error_message: msg, completed_at: nowMs() });
      db.prepare("UPDATE tasks SET status = 'failed', execution_state = 'failed', last_error_summary = ?, updated_at = ? WHERE id = ?")
        .run(msg.slice(0, 500), nowMs(), taskId);
      broadcast("task_update", { id: taskId, status: "failed" });
      broadcastStatus(broadcast, taskId, agentId, "error", runId);
      appendTaskLog(taskId, "system", `Task failed: ${msg.slice(0, 200)}`);
      broadcastText(broadcast, appendTaskLog, taskId, `\n[runtime] ERROR: ${msg}\n`);

      // Record task_failed event for timeline
      recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
        taskId,
        eventType: "task_failed",
        fromState: "in_progress",
        toState: "failed",
        summary: `Task execution failed: ${msg.slice(0, 300)}`,
        createdAt: nowMs(),
      });

      // Emit event for PM orchestrator (failure handling)
      eventBus.emitTaskStatus({
        type: "task_status_changed",
        taskId,
        projectId: projectId ?? null,
        fromStatus: "in_progress",
        toStatus: "failed",
        agentId,
        exitCode: 1,
      });
    }
  })();

  return runId;
}

/** Cancel a running execution */
export function cancelRun(runId: string, abortControllers: Map<string, AbortController>) {
  abortControllers.get(runId)?.abort();
  abortControllers.delete(runId);
}
