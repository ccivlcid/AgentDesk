import { api } from "../../lib/api.js";

interface InterpretResult {
  intent: string;
  params: Record<string, unknown>;
  response?: string;
  confirmation?: string;
}

export async function interpret(
  text: string,
  sessionId: string,
  projectId?: string | null,
): Promise<InterpretResult> {
  try {
    const result = await api.post<{ ok: boolean } & InterpretResult>("/api/tui/interpret", {
      text,
      session_id: sessionId,
      project_id: projectId ?? undefined,
    });
    return {
      intent: result.intent ?? "unknown",
      params: result.params ?? {},
      response: result.response,
      confirmation: result.confirmation,
    };
  } catch {
    return { intent: "unknown", params: {}, response: "Failed to interpret input." };
  }
}
