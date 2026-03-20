/**
 * CLI 출력 파싱: raw 텍스트 → CliLine[] (JSON 라인, 스트리밍, assistant/user/result 등)
 */

export interface CliLine {
  kind: "text" | "tool_use" | "tool_result" | "system" | "result" | "raw";
  toolName?: string;
  toolInput?: unknown;
  text?: string;
  cost?: number;
  duration?: number;
  raw: string;
  _streamDelta?: boolean;
}

/** 한 raw 줄 → 0개 이상의 CliLine */
export function parseCliLines(raw: string): CliLine[] {
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.startsWith("{")) {
    return trimmed ? [{ kind: "raw", text: raw, raw }] : [];
  }

  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const type = obj.type as string | undefined;

    if (type === "system") {
      const sub = obj.subtype as string | undefined;
      const tools = obj.tools;
      const toolCount = Array.isArray(tools) ? tools.length : undefined;
      return [{
        kind: "system",
        text: sub === "init"
          ? `session init${toolCount != null ? ` · ${toolCount} tools available` : ""}`
          : `system: ${sub ?? "?"}`,
        raw,
      }];
    }

    if (type === "stream_event") {
      const ev = obj.event as Record<string, unknown> | undefined;
      const evType = ev?.type as string | undefined;
      if (evType === "content_block_delta") {
        const delta = ev?.delta as Record<string, unknown> | undefined;
        if (delta?.type === "text_delta" && typeof delta.text === "string" && delta.text) {
          return [{ kind: "text", text: delta.text, raw, _streamDelta: true }];
        }
      }
      return [];
    }

    if (type === "assistant") {
      const msg = obj.message as Record<string, unknown> | undefined;
      const content = msg?.content as unknown[] | undefined;
      if (!content) return [{ kind: "raw", text: trimmed, raw }];
      const parts: CliLine[] = [];
      for (const item of content) {
        const block = item as Record<string, unknown>;
        if (block.type === "text") {
          const t = (block.text as string ?? "").trim();
          if (t) parts.push({ kind: "text", text: t, raw });
        } else if (block.type === "tool_use") {
          parts.push({ kind: "tool_use", toolName: block.name as string, toolInput: block.input, raw });
        }
      }
      return parts.length > 0 ? parts : [{ kind: "raw", text: trimmed, raw }];
    }

    if (type === "user") {
      const msg = obj.message as Record<string, unknown> | undefined;
      const content = msg?.content as unknown[] | undefined;
      if (!content) return [{ kind: "raw", text: trimmed, raw }];
      const results: CliLine[] = [];
      for (const item of content) {
        const block = item as Record<string, unknown>;
        if (block.type !== "tool_result") continue;
        const rc = block.content;
        let resultText = "";
        if (typeof rc === "string") {
          resultText = rc;
        } else if (Array.isArray(rc)) {
          resultText = rc
            .map((c) => (typeof (c as Record<string, unknown>).text === "string" ? (c as Record<string, unknown>).text : ""))
            .join("\n");
        }
        results.push({ kind: "tool_result", text: resultText, raw });
      }
      return results.length > 0 ? results : [{ kind: "raw", text: trimmed, raw }];
    }

    if (type === "result") {
      return [{
        kind: "result",
        cost: obj.cost_usd as number | undefined,
        duration: obj.duration_ms as number | undefined,
        text: obj.result as string | undefined,
        raw,
      }];
    }

    if (type === "tool_use") {
      return [{ kind: "tool_use", toolName: obj.name as string, toolInput: obj.input, raw }];
    }

    if (type === "text" && typeof obj.text === "string") {
      return [{ kind: "text", text: obj.text, raw }];
    }

    return [{ kind: "raw", text: trimmed, raw }];
  } catch {
    return [{ kind: "raw", text: raw, raw }];
  }
}

export function parseCliText(raw: string): CliLine[] {
  if (!raw.trim()) return [];
  const all = raw.split("\n").flatMap(parseCliLines);

  const hasFinalContent = all.some(
    (l) => !l._streamDelta && (l.kind === "text" || l.kind === "tool_use" || l.kind === "tool_result" || l.kind === "result"),
  );
  if (hasFinalContent) {
    return all.filter((l) => !l._streamDelta);
  }

  const streamText = all
    .filter((l) => l._streamDelta && l.text)
    .map((l) => l.text!)
    .join("");

  const nonDelta = all.filter((l) => !l._streamDelta);
  if (streamText) {
    return [...nonDelta, { kind: "text", text: streamText, raw: streamText }];
  }
  return nonDelta;
}
