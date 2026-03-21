export type RuntimeRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type RuntimeEventType = "text" | "tool_call" | "tool_result" | "error" | "status";

export interface RuntimeRun {
  id: string;
  task_id: string;
  agent_id: string;
  project_id: string | null;
  status: RuntimeRunStatus;
  model: string | null;
  provider: string | null;
  input_tokens: number;
  output_tokens: number;
  tool_calls_count: number;
  error_message: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
}

export interface RuntimeEvent {
  id: number;
  run_id: string;
  seq: number;
  event_type: RuntimeEventType;
  content: string | null;
  token_count: number;
  created_at: number;
}

// Anthropic tool definition
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

// Internal tool call resolved from LLM response
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Result of executing a tool
export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

// Message format compatible with Anthropic API
export type LlmMessage =
  | { role: "user"; content: string | LlmContent[] }
  | { role: "assistant"; content: string | LlmContent[] };

export type LlmContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface StartRunOptions {
  agentId: string;
  taskId: string;
  projectId?: string;
  projectPath?: string;
  model?: string;
  maxTurns?: number;
  apiProviderId?: string;
}
