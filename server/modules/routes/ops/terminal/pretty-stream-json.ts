// Type for JSON.parse results that need deep property access without `any`.
// Each property access returns the same union, allowing chaining and string comparison.
type JsonParsed = string | number | boolean | null | undefined | JsonParsed[] | { [key: string]: JsonParsed };
type JsonObj = { [key: string]: JsonParsed };

/** Narrow a JsonParsed value to its object form (returns undefined for primitives/arrays). */
function asObj(v: JsonParsed): JsonObj | undefined {
  return (v !== null && typeof v === "object" && !Array.isArray(v)) ? v : undefined;
}

export function prettyStreamJson(raw: string, opts: { includeReasoning?: boolean } = {}): string {
  const chunks: string[] = [];
  let sawJson = false;
  let sawClaudeTextDelta = false;
  const includeReasoning = opts.includeReasoning === true;
  const pushReasoningChunk = (text: string): void => {
    if (!text) return;
    pushMessageChunk(`[reasoning] ${text}`);
  };
  const pushMessageChunk = (text: string): void => {
    if (!text) return;
    if (chunks.length > 0 && !chunks[chunks.length - 1].endsWith("\n")) {
      chunks.push("\n");
    }
    chunks.push(text);
    if (!text.endsWith("\n")) {
      chunks.push("\n");
    }
  };

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (!t.startsWith("{")) continue;

    try {
      const j = JSON.parse(t) as { [key: string]: JsonParsed };
      sawJson = true;

      if (j.type === "stream_event") {
        const ev = asObj(j.event);
        const delta = asObj(ev?.delta);
        const contentBlock = asObj(ev?.content_block);
        if (ev?.type === "content_block_delta" && delta?.type === "text_delta") {
          sawClaudeTextDelta = true;
          chunks.push(String(delta.text ?? ""));
          continue;
        }
        if (ev?.type === "content_block_start" && contentBlock?.type === "text" && contentBlock?.text) {
          chunks.push(String(contentBlock.text));
          continue;
        }
        continue;
      }

      if (j.type === "assistant") {
        const msg = asObj(j.message);
        const contentArr = Array.isArray(msg?.content) ? msg.content : undefined;
        if (contentArr) {
          let assistantText = "";
          for (const block of contentArr) {
            const b = asObj(block);
            if (b?.type === "text" && b.text && !sawClaudeTextDelta) {
              assistantText += String(b.text);
            }
          }
          pushMessageChunk(assistantText);
          continue;
        }
      }

      if (j.type === "result" && j.result) {
        pushMessageChunk(String(j.result));
        continue;
      }

      if (j.type === "message" && j.role === "assistant" && j.content) {
        pushMessageChunk(String(j.content));
        continue;
      }

      if (j.type === "item.completed" && j.item) {
        const item = asObj(j.item);
        if (item?.type === "agent_message" && item.text) {
          pushMessageChunk(String(item.text));
        }
        continue;
      }

      if (j.type === "text") {
        const part = asObj(j.part);
        if (part?.type === "reasoning" || part?.type === "thinking") {
          if (!includeReasoning) continue;
          const reasoningVal =
            typeof part?.text === "string" ? part.text : typeof j.text === "string" ? j.text : "";
          if (reasoningVal) pushReasoningChunk(String(reasoningVal));
          continue;
        }
        const textVal = typeof part?.text === "string" ? part.text : typeof j.text === "string" ? j.text : "";
        if (textVal) chunks.push(String(textVal));
        continue;
      }

      if (j.type === "thinking" || j.type === "reasoning") {
        if (includeReasoning) {
          const part = asObj(j.part);
          const reasoningVal =
            typeof part?.text === "string"
              ? part.text
              : typeof j.text === "string"
                ? j.text
                : typeof j.content === "string"
                  ? j.content
                  : "";
          if (reasoningVal) pushReasoningChunk(String(reasoningVal));
        }
        continue;
      }

      if (j.type === "content" && (j.content || j.text)) {
        chunks.push(String(j.content ?? j.text));
        continue;
      }

      if (j.type === "step_finish" || j.type === "step-finish") {
        continue;
      }
      if ((j.type === "tool_use" || j.type === "tool_result") && j.part) {
        continue;
      }

      if (j.role === "assistant") {
        if (typeof j.content === "string") {
          pushMessageChunk(j.content);
        } else if (Array.isArray(j.content)) {
          const parts: string[] = [];
          for (const part of j.content) {
            if (typeof part === "string") {
              parts.push(part);
            } else {
              const p = asObj(part);
              if (p && typeof p.text === "string") {
                parts.push(p.text);
              }
            }
          }
          pushMessageChunk(parts.join("\n"));
        }
        continue;
      }

      if (typeof j.text === "string" && (j.type === "assistant_message" || j.type === "output_text")) {
        pushMessageChunk(j.text);
        continue;
      }
    } catch {
      // malformed stream-json line
    }
  }

  if (!sawJson) {
    return raw.trim();
  }

  const stitched = chunks.join("");
  const normalized = stitched
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return normalized;
}
