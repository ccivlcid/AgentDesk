import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";
import { TOOL_DEFINITIONS, executeTool } from "./tools.ts";
import { callAnthropicStream, resolveAnthropicKey } from "./llm-client.ts";
import { createRun, updateRunStatus, updateRunUsage, appendEvent, getRun } from "./store.ts";
import type { LlmMessage, LlmContent, StartRunOptions } from "./types.ts";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TURNS = 20;
const DEFAULT_MAX_TOKENS = 8192;

interface ExecutionLoopDeps {
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  nowMs: () => number;
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

Always use tools to inspect the project before responding. Be thorough and accurate.`;

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
  broadcast("cli_output", { taskId, line: text });
  if (text.trim()) appendTaskLog(taskId, "agent", text);
}

/** Broadcast status to Task Board / Flow Graph */
function broadcastStatus(
  broadcast: (type: string, payload: unknown) => void,
  taskId: string,
  agentId: string,
  status: string,
  runId: string,
) {
  broadcast("runtime_status", { taskId, agentId, status, runId });
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

  // Determine model
  const agentRow = db.prepare("SELECT api_model, api_provider_id FROM agents WHERE id = ?").get(agentId) as
    | { api_model: string | null; api_provider_id: string | null }
    | undefined;
  const model = options.model ?? agentRow?.api_model ?? DEFAULT_MODEL;
  const resolvedProviderId = apiProviderId ?? agentRow?.api_provider_id ?? undefined;

  // Create run record
  const run = createRun(db, { taskId, agentId, projectId, model, provider: "anthropic" }, nowMs);
  const runId = run.id;

  // Update task status to running
  db.prepare("UPDATE tasks SET status = 'running', execution_state = 'running' WHERE id = ?").run(taskId);
  broadcast("task_update", { taskId, status: "running" });
  broadcastStatus(broadcast, taskId, agentId, "thinking", runId);

  // Async execution — fire and forget, errors are caught and stored
  void (async () => {
    try {
      updateRunStatus(db, runId, "running", { started_at: nowMs() });

      const apiKey = resolveAnthropicKey(db, resolvedProviderId);
      const systemPrompt = buildSystemPrompt(db, agentId, projectId);
      const messages: LlmMessage[] = [{ role: "user", content: taskTitle }];

      let turn = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalToolCalls = 0;

      // Header line to CLI Window
      const header = `[runtime] Model: ${model} | Task: ${taskTitle}\n${"─".repeat(60)}\n`;
      broadcastText(broadcast, appendTaskLog, taskId, header);
      appendEvent(db, runId, "status", header, 0, nowMs);

      while (turn < maxTurns) {
        if (abortController.signal.aborted) break;
        turn++;

        broadcastStatus(broadcast, taskId, agentId, "thinking", runId);

        const pendingToolCalls: import("./types.ts").ToolCall[] = [];
        let turnInputTokens = 0;
        let turnOutputTokens = 0;

        const { stopReason, assistantContent } = await callAnthropicStream({
          apiKey,
          model,
          systemPrompt,
          messages,
          tools: TOOL_DEFINITIONS,
          maxTokens: DEFAULT_MAX_TOKENS,
          signal: abortController.signal,
          callbacks: {
            onText: (text) => {
              broadcastText(broadcast, appendTaskLog, taskId, text);
              appendEvent(db, runId, "text", text, 0, nowMs);
            },
            onToolCall: (call) => {
              pendingToolCalls.push(call);
              const line = `\n[tool] ${call.name}(${JSON.stringify(call.input)})\n`;
              broadcastText(broadcast, appendTaskLog, taskId, line);
              appendEvent(db, runId, "tool_call", JSON.stringify({ name: call.name, input: call.input }), 0, nowMs);
            },
            onDone: (usage) => {
              turnInputTokens = usage.inputTokens;
              turnOutputTokens = usage.outputTokens;
            },
            onError: (err) => {
              logger.error({ err, runId }, "[runtime] stream error");
            },
          },
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

      // Done
      const summary = `\n${"─".repeat(60)}\n[runtime] Completed in ${turn} turn(s) | Tokens: ${totalInputTokens} in / ${totalOutputTokens} out | Tools used: ${totalToolCalls}\n`;
      broadcastText(broadcast, appendTaskLog, taskId, summary);

      updateRunStatus(db, runId, "completed", { completed_at: nowMs() });
      db.prepare("UPDATE tasks SET status = 'done', execution_state = 'done' WHERE id = ?").run(taskId);
      broadcast("task_update", { taskId, status: "done" });
      broadcastStatus(broadcast, taskId, agentId, "complete", runId);

      logger.info({ runId, taskId, turns: turn, totalInputTokens, totalOutputTokens }, "[runtime] execution complete");
    } catch (err) {
      const msg = String(err);
      logger.error({ err, runId, taskId }, "[runtime] execution error");
      appendEvent(db, runId, "error", msg, 0, nowMs);
      updateRunStatus(db, runId, "failed", { error_message: msg, completed_at: nowMs() });
      db.prepare("UPDATE tasks SET status = 'failed', execution_state = 'failed' WHERE id = ?").run(taskId);
      broadcast("task_update", { taskId, status: "failed" });
      broadcastStatus(broadcast, taskId, agentId, "error", runId);
      broadcastText(broadcast, appendTaskLog, taskId, `\n[runtime] ERROR: ${msg}\n`);
    }
  })();

  return runId;
}

/** Cancel a running execution */
export function cancelRun(runId: string, abortControllers: Map<string, AbortController>) {
  abortControllers.get(runId)?.abort();
  abortControllers.delete(runId);
}
