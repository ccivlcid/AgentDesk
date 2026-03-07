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
      const j: any = JSON.parse(t);

      // Claude stream_event: thinking_delta accumulates text within one block
      if (j.type === "stream_event") {
        const ev = j.event;
        if (ev?.type === "content_block_start" && ev?.content_block?.type === "thinking") {
          flushCurrent();
          insideThinkingBlock = true;
          if (ev.content_block.thinking) {
            currentChunks.push(String(ev.content_block.thinking));
          }
          continue;
        }
        if (ev?.type === "content_block_delta" && ev?.delta?.type === "thinking_delta") {
          if (!insideThinkingBlock) {
            // delta without a prior start — treat as new block
            insideThinkingBlock = true;
          }
          currentChunks.push(String(ev.delta.thinking ?? ""));
          continue;
        }
        if (ev?.type === "content_block_stop" && insideThinkingBlock) {
          flushCurrent();
          continue;
        }
        continue;
      }

      // assistant message with thinking blocks in content array (Claude API format)
      if (j.type === "assistant" && Array.isArray(j.message?.content)) {
        for (const block of j.message.content) {
          if (block.type === "thinking" && block.thinking) {
            flushCurrent();
            blocks.push({ text: String(block.thinking), truncated: Boolean(block.truncated) });
          }
        }
        continue;
      }

      // Direct thinking/reasoning top-level types
      if (j.type === "thinking" || j.type === "reasoning") {
        flushCurrent();
        const text =
          typeof j.thinking === "string"
            ? j.thinking
            : typeof j.text === "string"
              ? j.text
              : typeof j.content === "string"
                ? j.content
                : typeof j.part?.text === "string"
                  ? j.part.text
                  : "";
        if (text) blocks.push({ text, truncated: Boolean(j.truncated) });
        continue;
      }

      // { type: "text", part: { type: "reasoning"|"thinking", text: "..." } }
      if (j.type === "text" && (j.part?.type === "reasoning" || j.part?.type === "thinking")) {
        flushCurrent();
        const text = typeof j.part?.text === "string" ? j.part.text : typeof j.text === "string" ? j.text : "";
        if (text) blocks.push({ text, truncated: false });
        continue;
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
