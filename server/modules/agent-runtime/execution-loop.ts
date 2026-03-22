import type { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import logger from "../../lib/logger.ts";
import { eventBus } from "../../lib/event-bus.ts";
import { TOOL_DEFINITIONS, executeTool } from "./tools.ts";
import { callAnthropicStream, callOpenAICompatibleStream, resolveProvider, getDefaultModel } from "./llm-client.ts";
import { createRun, updateRunStatus, updateRunUsage, appendEvent, getRun } from "./store.ts";
import type { LlmMessage, LlmContent, StartRunOptions } from "./types.ts";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TURNS = 20;
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Parse a chunk of codex CLI JSON output into human-readable text.
 * Codex with --json outputs newline-delimited JSON objects like:
 *   {"type":"text","content":"Hello..."}
 *   {"type":"message","content":"..."}
 *   {"type":"tool_call","name":"write_file",...}
 *   {"type":"result","content":"Done"}
 *   {"type":"item.started","item":{...}}
 *   {"type":"item.completed","item":{...}}
 *
 * Returns readable text lines. If a line isn't JSON, returns it as-is.
 * Exported so cli-runtime.ts can reuse.
 */
export function parseCodexJsonChunk(chunk: string): string {
  const lines = chunk.split("\n");
  const parts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      parts.push("");
      continue;
    }

    // Only attempt JSON parse if it looks like a JSON object
    if (!trimmed.startsWith("{")) {
      parts.push(line);
      continue;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parts.push(line);
      continue;
    }

    const type = parsed.type as string | undefined;

    // Extract readable content based on event type
    if (type === "text" || type === "message" || type === "result") {
      const content = (parsed.content as string) ?? "";
      if (content) parts.push(content);
      continue;
    }

    if (type === "tool_call" || type === "function_call") {
      const name = (parsed.name as string) ?? (parsed.tool as string) ?? "tool";
      const args = parsed.arguments ?? parsed.input ?? parsed.params;
      const argStr = args ? ` ${typeof args === "string" ? args : JSON.stringify(args)}` : "";
      parts.push(`[tool] ${name}${argStr}`);
      continue;
    }

    if (type === "tool_result" || type === "function_call_output") {
      const output = (parsed.output as string) ?? (parsed.content as string) ?? "";
      if (output) parts.push(`[result] ${output.slice(0, 500)}${output.length > 500 ? "..." : ""}`);
      continue;
    }

    if (type === "error") {
      const msg = (parsed.message as string) ?? (parsed.content as string) ?? JSON.stringify(parsed);
      parts.push(`[error] ${msg}`);
      continue;
    }

    // item.started / item.completed — extract sub-agent or tool info
    if (type === "item.started" || type === "item.completed") {
      const item = parsed.item as Record<string, unknown> | undefined;
      if (item) {
        const tool = (item.tool as string) ?? (item.type as string) ?? "";
        const prompt = (item.prompt as string) ?? "";
        const status = type === "item.completed" ? "completed" : "started";
        const label = tool ? `[${tool} ${status}]` : `[${status}]`;
        parts.push(prompt ? `${label} ${prompt.split("\n")[0].slice(0, 100)}` : label);
        continue;
      }
    }

    // status / thinking / unknown types with content
    if (parsed.content && typeof parsed.content === "string") {
      parts.push(parsed.content as string);
      continue;
    }

    // Fallback: skip purely structural JSON events (no content to show)
    // This prevents "{ } raw" style output for empty/metadata-only events
    if (type) {
      // Known metadata types we can safely skip
      continue;
    }

    // Truly unknown structure — pass through as-is
    parts.push(line);
  }

  return parts.join("\n");
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

  let prompt = `You are ${agentName}, a ${agentRole}. You work autonomously to complete tasks using the tools available to you.

Always use tools to inspect the project before responding. Be thorough and accurate.

## Evidence-Based Execution Rules
- Never say "probably" or "I think" — cite the specific file, line, or error.
- Before recommending a pattern or library, verify it exists and is current best practice.
- If you attempt a fix 3 times without success, stop and report the issue with all evidence gathered.
- Keep changes minimal — only modify files directly related to the task.
- Every bug fix must include evidence of the root cause (stack trace, reproduction steps, or failing test).`;

  if (rules.length > 0) {
    prompt += `\n\n## Rules\n${rules.join("\n")}`;
  }
  if (memories.length > 0) {
    prompt += `\n\n## Context & Memory\n${memories.join("\n")}`;
  }

  prompt += `\n\nWhen you finish a task, provide a clear summary of what you did and the results.`;

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
    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      output += text;
      if (cliProvider === "codex") {
        const parsed = parseCodexJsonChunk(text);
        if (parsed.trim()) onChunk?.(parsed);
      } else {
        onChunk?.(text);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      output += text;
      onChunk?.(text);
    });
    child.on("error", (err) => {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", abortHandler);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", abortHandler);

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
