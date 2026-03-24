// Type for JSON.parse results that need deep property access without `any`.
// Each property access returns the same union, allowing chaining and string comparison.
type JsonParsed = string | number | boolean | null | undefined | JsonParsed[] | { [key: string]: JsonParsed };
type JsonObj = { [key: string]: JsonParsed };

/** Narrow a JsonParsed value to its object form (returns undefined for primitives/arrays). */
function asObj(v: JsonParsed): JsonObj | undefined {
  return (v !== null && typeof v === "object" && !Array.isArray(v)) ? v : undefined;
}
export type ThinkingBlock = {
  text: string;
  truncated: boolean;
};

export function extractThinkingBlocks(raw: string): ThinkingBlock[] {
  const blocks: ThinkingBlock[] = [];
  let currentChunks: string[] = [];
  let insideThinkingBlock = false;

  const flushCurrent = () => {
    if (currentChunks.length > 0) {
      const text = currentChunks.join("").trim();
      if (text) {
        blocks.push({ text, truncated: false });
      }
      currentChunks = [];
    }
    insideThinkingBlock = false;
  };

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || !t.startsWith("{")) continue;

    try {
      const j = JSON.parse(t) as { [key: string]: JsonParsed };

      // Claude stream_event: thinking_delta accumulates text within one block
      if (j.type === "stream_event") {
        const ev = asObj(j.event);
        const contentBlock = asObj(ev?.content_block);
        const delta = asObj(ev?.delta);
        if (ev?.type === "content_block_start" && contentBlock?.type === "thinking") {
          flushCurrent();
          insideThinkingBlock = true;
          if (contentBlock.thinking) {
            currentChunks.push(String(contentBlock.thinking));
          }
          continue;
        }
        if (ev?.type === "content_block_delta" && delta?.type === "thinking_delta") {
          if (!insideThinkingBlock) {
            // delta without a prior start — treat as new block
            insideThinkingBlock = true;
          }
          currentChunks.push(String(delta.thinking ?? ""));
          continue;
        }
        if (ev?.type === "content_block_stop" && insideThinkingBlock) {
          flushCurrent();
          continue;
        }
        continue;
      }

      // assistant message with thinking blocks in content array (Claude API format)
      if (j.type === "assistant") {
        const msg = asObj(j.message);
        const contentArr = Array.isArray(msg?.content) ? msg.content : undefined;
        if (contentArr) {
          for (const block of contentArr) {
            const b = asObj(block);
            if (b?.type === "thinking" && b.thinking) {
              flushCurrent();
              blocks.push({ text: String(b.thinking), truncated: Boolean(b.truncated) });
            }
          }
          continue;
        }
      }

      // Direct thinking/reasoning top-level types
      if (j.type === "thinking" || j.type === "reasoning") {
        flushCurrent();
        const part = asObj(j.part);
        const text =
          typeof j.thinking === "string"
            ? j.thinking
            : typeof j.text === "string"
              ? j.text
              : typeof j.content === "string"
                ? j.content
                : typeof part?.text === "string"
                  ? part.text
                  : "";
        if (text) blocks.push({ text, truncated: Boolean(j.truncated) });
        continue;
      }

      // { type: "text", part: { type: "reasoning"|"thinking", text: "..." } }
      if (j.type === "text") {
        const part = asObj(j.part);
        if (part?.type === "reasoning" || part?.type === "thinking") {
          flushCurrent();
          const text = typeof part?.text === "string" ? part.text : typeof j.text === "string" ? j.text : "";
          if (text) blocks.push({ text, truncated: false });
          continue;
        }
      }
    } catch {
      // malformed line — skip
    }
  }

  flushCurrent();

  // Deduplicate adjacent identical blocks
  const merged: ThinkingBlock[] = [];
  for (const block of blocks) {
    if (merged.length > 0 && merged[merged.length - 1].text === block.text) continue;
    merged.push(block);
  }

  return merged;
}
