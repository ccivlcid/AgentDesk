import { useState, type ReactNode } from "react";
import type { TaskLogEntry } from "./model";
import type { TerminalProgressHintsPayload, TerminalThinkingBlock } from "../../api";
import type { UseTerminalPanelDataRefs } from "./useTerminalPanelData";

/* ─── JSON 파싱 유틸 ─────────────────────────────────────────────── */

interface CliLine {
  kind: "text" | "tool_use" | "tool_result" | "system" | "result" | "raw";
  toolName?: string;
  toolInput?: unknown;
  text?: string;
  cost?: number;
  duration?: number;
  raw: string;
  /** 스트리밍 중 text_delta 조각임을 표시 — parseCliText에서 집계 후 제거 */
  _streamDelta?: boolean;
}

/** 한 raw 줄 → 0개 이상의 CliLine (multi-block assistant 지원) */
function parseCliLines(raw: string): CliLine[] {
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

    // 스트리밍 이벤트 — text_delta만 추출해 _streamDelta로 표시
    if (type === "stream_event") {
      const ev = obj.event as Record<string, unknown> | undefined;
      const evType = ev?.type as string | undefined;
      if (evType === "content_block_delta") {
        const delta = ev?.delta as Record<string, unknown> | undefined;
        if (delta?.type === "text_delta" && typeof delta.text === "string" && delta.text) {
          return [{ kind: "text", text: delta.text, raw, _streamDelta: true }];
        }
      }
      return []; // 나머지 스트림 이벤트는 무시
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

function parseCliText(raw: string): CliLine[] {
  if (!raw.trim()) return [];
  const all = raw.split("\n").flatMap(parseCliLines);

  // 완료된 메시지 라인이 있으면 → 스트리밍 조각 제거 (최종본 우선)
  const hasFinalContent = all.some(
    (l) => !l._streamDelta && (l.kind === "text" || l.kind === "tool_use" || l.kind === "tool_result" || l.kind === "result"),
  );
  if (hasFinalContent) {
    return all.filter((l) => !l._streamDelta);
  }

  // 아직 스트리밍 중 → text_delta 조각을 하나의 텍스트 블록으로 합치기
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

/* ─── 디자인 토큰 ────────────────────────────────────────────────── */

const mono = "var(--th-font-mono)";

interface ToolTheme {
  accent: string;
  bg: string;
  border: string;
  icon: string;
  label: string;
}

function getToolTheme(name: string): ToolTheme {
  const n = (name ?? "").toLowerCase();
  if (n === "bash" || n === "computer")
    return { accent: "#4ade80", bg: "rgba(74,222,128,0.06)",  border: "rgba(74,222,128,0.18)",  icon: "⌗", label: name };
  if (n === "write")
    return { accent: "#60a5fa", bg: "rgba(96,165,250,0.06)",  border: "rgba(96,165,250,0.18)",  icon: "✎", label: name };
  if (n === "edit" || n === "multiedit")
    return { accent: "#38bdf8", bg: "rgba(56,189,248,0.06)",  border: "rgba(56,189,248,0.18)",  icon: "✐", label: name };
  if (n === "read")
    return { accent: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.18)", icon: "◎", label: name };
  if (n === "glob")
    return { accent: "#a78bfa", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.18)", icon: "⌕", label: name };
  if (n === "grep")
    return { accent: "#c084fc", bg: "rgba(192,132,252,0.06)", border: "rgba(192,132,252,0.18)", icon: "⌕", label: name };
  if (n === "websearch")
    return { accent: "#fb923c", bg: "rgba(251,146,60,0.06)",  border: "rgba(251,146,60,0.18)",  icon: "⊙", label: name };
  if (n === "webfetch")
    return { accent: "#f97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.18)",  icon: "⤓", label: name };
  if (n === "task" || n === "agent" || n === "todocreate" || n === "todowrite")
    return { accent: "#e879f9", bg: "rgba(232,121,249,0.06)", border: "rgba(232,121,249,0.18)", icon: "◈", label: name };
  return   { accent: "#f59e0b", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  icon: "◆", label: name };
}

/* ─── 인풋 요약 한 줄 ────────────────────────────────────────────── */

function toolInputSummary(input: unknown, toolName?: string): string {
  if (input == null) return "";
  const n = (toolName ?? "").toLowerCase();
  if (typeof input === "string") return input.slice(0, 80);
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const cmd = obj.command ?? obj.action;
    if (cmd && typeof cmd === "string") return cmd.slice(0, 80);
    const fp = obj.file_path ?? obj.path ?? obj.filename;
    if (fp && typeof fp === "string") {
      if (n === "read") return String(fp);
      const content = obj.content ?? obj.new_string;
      if (typeof content === "string") return `${fp}  ·  ${content.split("\n").length} lines`;
      return String(fp);
    }
    const pattern = obj.pattern ?? obj.query ?? obj.prompt;
    if (pattern && typeof pattern === "string") return pattern.slice(0, 80);
  }
  return "";
}

/* ─── ToolInputBlock ─────────────────────────────────────────────── */

function ToolInputBlock({ input, toolName, isLight = false }: { input: unknown; toolName?: string; isLight?: boolean }) {
  if (input == null) return null;
  const n = (toolName ?? "").toLowerCase();
  const isStr = typeof input === "string";
  const isObj = typeof input === "object" && input !== null;

  const c = {
    bash:    isLight ? "#0369a1" : "#7dd3fc",
    path:    isLight ? "#166534" : "#86efac",
    oldStr:  isLight ? "#9f1239" : "#fca5a5",
    pattern: isLight ? "#5b21b6" : "#c4b5fd",
  };

  // bash command
  if (n === "bash" || n === "computer") {
    const obj = isObj ? (input as Record<string, unknown>) : null;
    const cmd = obj?.command ?? obj?.action ?? (isStr ? input : null);
    if (cmd && typeof cmd === "string") {
      return (
        <pre style={{ fontFamily: mono, fontSize: 11, color: c.bash, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
          <span style={{ opacity: 0.5, userSelect: "none" }}>$ </span>{cmd}
        </pre>
      );
    }
  }

  if (isObj) {
    const obj = input as Record<string, unknown>;
    const fp = obj.file_path ?? obj.path ?? obj.filename;

    // file-based tools
    if (fp) {
      const rawContent = obj.content ?? obj.new_string;
      const rawOldStr  = obj.old_string;
      const contentStr = typeof rawContent === "string" && rawContent.length < 400 ? rawContent : null;
      const oldStrStr  = typeof rawOldStr  === "string" && rawOldStr.length  < 300 ? rawOldStr  : null;
      return (
        <div>
          <div style={{ fontFamily: mono, fontSize: 11, color: c.path, marginBottom: contentStr || oldStrStr ? 6 : 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ opacity: 0.45, fontSize: 9 }}>path</span>
            <span>{String(fp)}</span>
          </div>
          {oldStrStr !== null && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginBottom: 2, opacity: 0.6 }}>old</div>
              <pre style={{ fontFamily: mono, fontSize: 10, color: c.oldStr, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.55 }}>{oldStrStr}</pre>
            </div>
          )}
          {contentStr !== null && (
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginBottom: 2, opacity: 0.6 }}>content</div>
              <pre style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.55 }}>{contentStr}</pre>
            </div>
          )}
        </div>
      );
    }

    // search tools
    const pattern = obj.pattern ?? obj.query ?? obj.prompt;
    if (pattern && typeof pattern === "string") {
      const searchPath = obj.path ?? obj.directory ?? obj.glob;
      const searchPathStr = typeof searchPath === "string" ? searchPath : null;
      return (
        <div>
          <pre style={{ fontFamily: mono, fontSize: 11, color: c.pattern, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            <span style={{ opacity: 0.45, fontSize: 9, marginRight: 6 }}>pattern</span>{pattern}
          </pre>
          {searchPathStr !== null && (
            <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 3, opacity: 0.7 }}>
              in {searchPathStr}
            </div>
          )}
        </div>
      );
    }

    // generic
    const str = JSON.stringify(input, null, 2);
    return (
      <pre style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflowY: "auto", lineHeight: 1.55 }}>
        {str}
      </pre>
    );
  }

  if (isStr) {
    return (
      <pre style={{ fontFamily: mono, fontSize: 11, color: c.bash, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
        {input as string}
      </pre>
    );
  }
  return null;
}

/* ─── ToolCard (tool_use / tool_result) ─────────────────────────── */

function ToolCard({
  theme,
  headerRight,
  summary,
  children,
  defaultOpen = true,
  isResult = false,
  isLight = false,
}: {
  theme: ToolTheme;
  headerRight?: ReactNode;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  isResult?: boolean;
  isLight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // 라이트 모드에서 border·bg를 조금 더 진하게
  const cardBorder = isLight
    ? theme.border.replace(/[\d.]+\)$/, (m) => String(Math.min(1, parseFloat(m) * 2.5)) + ")")
    : theme.border;
  const cardBg = isLight
    ? theme.bg.replace(/[\d.]+\)$/, (m) => String(Math.min(1, parseFloat(m) * 3)) + ")")
    : theme.bg;

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${cardBorder}`,
        background: cardBg,
        overflow: "hidden",
        marginBottom: 2,
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          width: "100%",
          padding: "0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            width: 3,
            alignSelf: "stretch",
            background: isResult ? "#4ade80" : theme.accent,
            borderRadius: "8px 0 0 8px",
            flexShrink: 0,
          }}
        />

        {/* Header content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 10px 7px 10px",
            minWidth: 0,
          }}
        >
          {/* Chevron */}
          <span
            style={{
              fontFamily: mono,
              fontSize: 9,
              color: theme.accent,
              opacity: 0.7,
              flexShrink: 0,
              transition: "transform 0.15s",
              display: "inline-block",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ▶
          </span>

          {/* Icon + label */}
          <span
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: isResult ? "#4ade80" : theme.accent,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.8 }}>{isResult ? "✓" : theme.icon}</span>
            {isResult ? "result" : theme.label}
          </span>

          {/* Summary preview */}
          {summary && !open && (
            <span
              style={{
                fontFamily: mono,
                fontSize: 10,
                color: "var(--th-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                opacity: 0.65,
              }}
            >
              {summary}
            </span>
          )}

          {/* Right slot */}
          {headerRight && (
            <span style={{ marginLeft: "auto", flexShrink: 0 }}>
              {headerRight}
            </span>
          )}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div
          style={{
            borderTop: `1px solid ${theme.border}`,
            padding: "8px 12px 9px 15px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── LineBadge ─────────────────────────────────────────────────── */

function LineBadge({ count, color }: { count: number; color: string }) {
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: 9,
        padding: "1px 6px",
        borderRadius: 10,
        background: `${color}14`,
        border: `1px solid ${color}28`,
        color,
        letterSpacing: "0.04em",
      }}
    >
      {count} {count === 1 ? "line" : "lines"}
    </span>
  );
}

/* ─── CliLineRow ─────────────────────────────────────────────────── */

function CliLineRow({ line, search, isLight = false }: { line: CliLine; search: string; isLight?: boolean }) {
  function highlight(text: string): ReactNode {
    if (!search) return text;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} style={{ background: "rgba(251,191,36,0.3)", color: "#fcd34d", borderRadius: 2, padding: "0 1px" }}>{part}</mark>
        : part,
    );
  }

  /* system */
  if (line.kind === "system") {
    return (
      <div
        style={{
          fontFamily: mono,
          fontSize: 9,
          color: "var(--th-text-muted)",
          opacity: 0.5,
          padding: "3px 0 3px 6px",
          borderLeft: "2px solid var(--th-border)",
          letterSpacing: "0.04em",
        }}
      >
        {line.text}
      </div>
    );
  }

  /* assistant text */
  if (line.kind === "text" && line.text) {
    const text = line.text.trim();
    if (!text) return null;
    const lineCount = text.split("\n").length;
    const isLong = text.length > 500 || lineCount > 12;

    if (isLong) {
      const preview = text.split("\n").slice(0, 2).join("\n").slice(0, 100);
      const theme: ToolTheme = { accent: "#c4b5fd", bg: "rgba(196,181,253,0.04)", border: "rgba(196,181,253,0.14)", icon: "✦", label: "assistant" };
      return (
        <ToolCard
          theme={theme}
          summary={preview}
          headerRight={<LineBadge count={lineCount} color="#c4b5fd" />}
          defaultOpen={false}
        >
          <pre style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.65 }}>
            {highlight(text)}
          </pre>
        </ToolCard>
      );
    }

    return (
      <div style={{ padding: "4px 0 4px 6px", borderLeft: "2px solid rgba(196,181,253,0.2)" }}>
        <pre style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.65 }}>
          {highlight(text)}
        </pre>
      </div>
    );
  }

  /* tool_use */
  if (line.kind === "tool_use") {
    const name = line.toolName ?? "tool";
    const theme = getToolTheme(name);
    const summary = toolInputSummary(line.toolInput, name);
    return (
      <ToolCard theme={theme} summary={summary} defaultOpen isLight={isLight}>
        <ToolInputBlock input={line.toolInput} toolName={name} isLight={isLight} />
      </ToolCard>
    );
  }

  /* tool_result */
  if (line.kind === "tool_result" && line.text != null) {
    const text = line.text.trim();
    if (!text) return null;
    const lineCount = text.split("\n").length;
    const isLong = text.length > 400 || lineCount > 10;
    const outputTextColor = isLight ? "#065f46" : "#a7f3d0";
    const resultTheme: ToolTheme = {
      accent: "#6ee7b7",
      bg: "rgba(110,231,183,0.04)",
      border: "rgba(110,231,183,0.16)",
      icon: "◀",
      label: "output",
    };
    return (
      <ToolCard
        theme={resultTheme}
        headerRight={isLong ? <LineBadge count={lineCount} color="#6ee7b7" /> : undefined}
        defaultOpen={!isLong}
        isLight={isLight}
      >
        <pre
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: outputTextColor,
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            lineHeight: 1.6,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {highlight(text)}
        </pre>
      </ToolCard>
    );
  }

  /* final result — 대형 완료 배너 */
  if (line.kind === "result") {
    const parts: string[] = [];
    if (line.duration != null) parts.push(`${(line.duration / 1000).toFixed(1)}s`);
    if (line.cost != null) parts.push(`$${line.cost.toFixed(4)}`);
    const resultTextColor = isLight ? "#166534" : "#86efac";
    const accentGreen = "#4ade80";

    return (
      <div
        style={{
          marginTop: 10,
          borderRadius: 10,
          border: `1px solid ${isLight ? "rgba(74,222,128,0.35)" : "rgba(74,222,128,0.28)"}`,
          background: isLight ? "rgba(74,222,128,0.08)" : "rgba(74,222,128,0.07)",
          overflow: "hidden",
        }}
      >
        {/* 상단 완료 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: isLight ? "rgba(74,222,128,0.12)" : "rgba(74,222,128,0.1)",
            borderBottom: line.text ? `1px solid ${isLight ? "rgba(74,222,128,0.2)" : "rgba(74,222,128,0.15)"}` : undefined,
          }}
        >
          {/* 녹색 체크 아이콘 */}
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: isLight ? "rgba(74,222,128,0.25)" : "rgba(74,222,128,0.2)",
              border: `1.5px solid ${isLight ? "rgba(74,222,128,0.5)" : "rgba(74,222,128,0.4)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 12,
              color: accentGreen,
            }}
          >
            ✓
          </div>
          <span
            style={{
              fontFamily: mono,
              fontSize: 12,
              fontWeight: 700,
              color: isLight ? "#166534" : accentGreen,
              letterSpacing: "0.04em",
              flex: 1,
            }}
          >
            {isLight ? "Task Complete" : "done"}
          </span>
          {parts.length > 0 && (
            <span
              style={{
                fontFamily: mono,
                fontSize: 10,
                color: isLight ? "#166534" : accentGreen,
                opacity: 0.7,
                letterSpacing: "0.04em",
              }}
            >
              {parts.join("  ·  ")}
            </span>
          )}
        </div>
        {/* 결과 텍스트 */}
        {line.text && (
          <pre
            style={{
              fontFamily: mono,
              fontSize: 12,
              color: resultTextColor,
              margin: 0,
              padding: "10px 14px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.7,
            }}
          >
            {line.text}
          </pre>
        )}
      </div>
    );
  }

  /* raw JSON → collapsible */
  if (line.raw.trim().startsWith("{")) {
    const rawTheme: ToolTheme = {
      accent: "var(--th-text-muted)",
      bg: "rgba(255,255,255,0.02)",
      border: "var(--th-border)",
      icon: "{ }",
      label: "raw",
    };
    return (
      <ToolCard theme={rawTheme} defaultOpen={false}>
        <pre style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.55 }}>
          {line.raw}
        </pre>
      </ToolCard>
    );
  }

  if (!line.raw.trim()) return null;

  return (
    <pre
      style={{
        fontFamily: mono,
        fontSize: 12,
        color: "var(--th-text-secondary)",
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        padding: "2px 0",
        lineHeight: 1.6,
      }}
    >
      {highlight(line.raw)}
    </pre>
  );
}

/* ─── Search highlight (raw mode) ───────────────────────────────── */

function highlightSearchMatches(text: string, search: string): ReactNode {
  if (!search) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} className="bg-yellow-400/40 text-yellow-200 rounded-sm px-[1px]">{part}</mark>
      : part,
  );
}

/* ─── Props ──────────────────────────────────────────────────────── */

type SubTab = "output" | "logs" | "thinking";

export interface TerminalTabContentProps {
  text: string;
  task: { status?: string } | undefined;
  filteredTaskLogs: TaskLogEntry[];
  logSearch: string;
  setLogSearch: (v: string) => void;
  logKindFilter: "all" | "system" | "error";
  setLogKindFilter: (v: "all" | "system" | "error") => void;
  showSearchBar: boolean;
  setShowSearchBar: (v: boolean) => void;
  searchMatchCount: number;
  progressHints: TerminalProgressHintsPayload | null;
  thinkingBlocks: TerminalThinkingBlock[];
  showThinking: boolean;
  shouldShowProgressHints: boolean;
  taskLogTimeFormatter: Intl.DateTimeFormat;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  refs: UseTerminalPanelDataRefs;
  handleScroll: () => void;
  isLight?: boolean;
}

/* ─── Main ───────────────────────────────────────────────────────── */

export function TerminalTabContent({
  text,
  task,
  filteredTaskLogs,
  logSearch,
  setLogSearch,
  logKindFilter,
  setLogKindFilter,
  showSearchBar,
  setShowSearchBar,
  searchMatchCount,
  thinkingBlocks,
  shouldShowProgressHints,
  taskLogTimeFormatter,
  tr,
  refs,
  handleScroll,
  isLight = false,
}: TerminalTabContentProps) {
  const { containerRef, preRef, searchInputRef } = refs;
  const [subTab, setSubTab] = useState<SubTab>("output");

  // 텍스트 내 어딘가에 JSON 라인이 존재하면 structured 모드
  // (첫 줄이 ANSI / 빈 줄이어도 안전하게 감지)
  const isStructured = (() => {
    if (!text) return false;
    return text.split("\n").some((l) => l.trim().startsWith("{"));
  })();

  const parsedLines = isStructured ? parseCliText(text) : null;

  const visibleParsedLines = parsedLines && logSearch
    ? parsedLines.filter((line) => {
        const needle = logSearch.toLowerCase();
        if (line.raw.toLowerCase().includes(needle)) return true;
        if (line.text?.toLowerCase().includes(needle)) return true;
        if (line.toolName?.toLowerCase().includes(needle)) return true;
        if (line.toolInput) {
          try { if (JSON.stringify(line.toolInput).toLowerCase().includes(needle)) return true; } catch { /**/ }
        }
        return false;
      })
    : parsedLines;

  const hasThinking = thinkingBlocks.length > 0;
  const hasErrors   = filteredTaskLogs.some((l) => l.kind === "error");

  const subTabs: { key: SubTab; label: string; badge?: string | number }[] = [
    { key: "output", label: tr("출력", "Output", "出力", "输出") },
    {
      key: "logs",
      label: tr("로그", "Logs", "ログ", "日志"),
      badge: filteredTaskLogs.length > 0 ? filteredTaskLogs.length : undefined,
    },
    ...(hasThinking
      ? [{ key: "thinking" as SubTab, label: tr("사고", "Thinking", "思考", "推理"), badge: thinkingBlocks.length }]
      : []),
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── 서브탭 바 ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center"
        style={{
          padding: "0 14px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
          height: 34,
          gap: 0,
        }}
      >
        {subTabs.map(({ key, label, badge }) => {
          const isActive = subTab === key;
          const isError  = key === "logs" && hasErrors;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSubTab(key)}
              style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.05em",
                padding: "0 12px",
                height: 33,
                border: "none",
                borderBottom: isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--th-accent)" : isError ? "rgb(253,164,175)" : "var(--th-text-muted)",
                cursor: "pointer",
                transition: "color 0.1s",
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
              }}
            >
              {label}
              {badge !== undefined && (
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 10,
                    background: isActive ? "rgba(245,158,11,0.18)" : isError ? "rgba(253,164,175,0.15)" : "var(--th-bg-surface)",
                    border: `1px solid ${isActive ? "rgba(245,158,11,0.35)" : isError ? "rgba(253,164,175,0.3)" : "var(--th-border)"}`,
                    color: isActive ? "var(--th-accent)" : isError ? "rgb(253,164,175)" : "var(--th-text-muted)",
                    lineHeight: 1,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Output 탭 ──────────────────────────────────────────── */}
      {subTab === "output" && (
        <>
          {showSearchBar && (
            <div
              className="flex items-center gap-2 flex-shrink-0"
              style={{ padding: "6px 14px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-panel)" }}
            >
              <input
                ref={searchInputRef}
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setShowSearchBar(false); setLogSearch(""); }
                }}
                placeholder={tr("로그 검색...", "Search logs...", "ログ検索...", "搜索日志...")}
                style={{
                  flex: 1,
                  fontFamily: mono,
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 5,
                  border: "1px solid var(--th-border)",
                  background: "var(--th-bg-surface)",
                  color: "var(--th-text-primary)",
                  outline: "none",
                }}
              />
              {logSearch && (
                <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", whiteSpace: "nowrap" }}>
                  {searchMatchCount} {tr("줄", "lines", "行", "行")}
                </span>
              )}
              <select
                value={logKindFilter}
                onChange={(e) => setLogKindFilter(e.target.value as "all" | "system" | "error")}
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  padding: "3px 6px",
                  borderRadius: 5,
                  border: "1px solid var(--th-border)",
                  background: "var(--th-bg-surface)",
                  color: "var(--th-text-secondary)",
                  outline: "none",
                }}
              >
                <option value="all">{tr("전체", "All", "全て", "全部")}</option>
                <option value="system">{tr("시스템", "System", "システム", "系统")}</option>
                <option value="error">{tr("에러", "Error", "エラー", "错误")}</option>
              </select>
            </div>
          )}

          <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "12px 14px" }} onScroll={handleScroll}>
            {!text ? (
              /* ── 빈 상태 ── */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--th-text-muted)" }}>
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.35 }}>
                  {task?.status === "in_progress" ? "⚙" : "⬜"}
                </div>
                <div style={{ fontFamily: mono, fontSize: 11 }}>
                  {task?.status === "in_progress"
                    ? shouldShowProgressHints
                      ? tr("도구 실행 중…", "Tool running…", "ツール実行中…", "工具运行中…")
                      : tr("출력 대기 중…", "Waiting for output…", "出力待機中…", "等待输出…")
                    : tr("터미널 출력 없음", "No terminal output", "ターミナル出力なし", "暂无终端输出")}
                </div>
              </div>
            ) : visibleParsedLines ? (
              /* ── Structured (JSON → 카드) 모드 ── */
              <div
                ref={preRef as unknown as React.RefObject<HTMLDivElement>}
                style={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                {logSearch && visibleParsedLines.length === 0 && (
                  <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "8px 0" }}>
                    {tr(`"${logSearch}" 에 대한 결과 없음`, `No matches for "${logSearch}"`, `"${logSearch}" の一致なし`, `"${logSearch}" 无结果`)}
                  </div>
                )}
                {visibleParsedLines.map((line, idx) => (
                  <CliLineRow key={idx} line={line} search={logSearch} isLight={isLight} />
                ))}
              </div>
            ) : (
              /* ── Raw 텍스트 모드 ── */
              <pre
                ref={preRef as unknown as React.RefObject<HTMLPreElement>}
                style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, color: "var(--th-text-primary)" }}
                className="terminal-output-text"
              >
                {logSearch ? highlightSearchMatches(text, logSearch) : text}
              </pre>
            )}
          </div>
        </>
      )}

      {/* ── Logs 탭 ──────────────────────────────────────────────── */}
      {subTab === "logs" && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredTaskLogs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--th-text-muted)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ marginBottom: 8, opacity: 0.3 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <div style={{ fontFamily: mono, fontSize: 11 }}>
                {tr("시스템 로그 없음", "No system logs", "システムログなし", "无系统日志")}
              </div>
            </div>
          ) : (
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 3 }}>
              {filteredTaskLogs.map((log) => {
                const isError  = log.kind === "error";
                const isSystem = log.kind === "system";
                const time = taskLogTimeFormatter.format(new Date(log.created_at));
                return (
                  <div
                    key={log.id}
                    style={{
                      borderRadius: 7,
                      border: `1px solid ${isError ? "rgba(253,164,175,0.22)" : "var(--th-border)"}`,
                      background: isError ? "rgba(253,164,175,0.05)" : "var(--th-bg-surface)",
                      padding: "5px 10px",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0, paddingTop: 2, minWidth: 58 }}>
                      {time}
                    </span>
                    <span
                      style={{
                        fontFamily: mono,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        padding: "1px 5px",
                        borderRadius: 4,
                        flexShrink: 0,
                        background: isError ? "rgba(253,164,175,0.12)" : isSystem ? "rgba(245,158,11,0.12)" : "var(--th-bg-elevated)",
                        border: `1px solid ${isError ? "rgba(253,164,175,0.3)" : isSystem ? "rgba(245,158,11,0.3)" : "var(--th-border)"}`,
                        color: isError ? "rgb(253,164,175)" : isSystem ? "var(--th-accent)" : "var(--th-text-secondary)",
                      }}
                    >
                      {log.kind}
                    </span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: isError ? "rgb(253,164,175)" : "var(--th-text-primary)", lineHeight: 1.5, wordBreak: "break-word" }}>
                      {log.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Thinking 탭 ──────────────────────────────────────────── */}
      {subTab === "thinking" && (
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ background: isLight ? "var(--th-bg-surface)" : "var(--th-bg-primary)" }}
        >
          {thinkingBlocks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--th-text-muted)" }}>
              <div style={{ fontFamily: mono, fontSize: 11 }}>
                {tr("사고 블록 없음", "No thinking blocks", "思考ブロックなし", "无推理块")}
              </div>
            </div>
          ) : (
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {thinkingBlocks.map((block, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: 8,
                    border: isLight ? "1px solid rgba(180,83,9,0.2)" : "1px solid rgba(245,158,11,0.2)",
                    background: isLight ? "rgba(180,83,9,0.04)" : "rgba(245,158,11,0.04)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 12px",
                      borderBottom: isLight ? "1px solid rgba(180,83,9,0.12)" : "1px solid rgba(245,158,11,0.15)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: isLight ? "rgba(180,83,9,0.06)" : "rgba(245,158,11,0.06)",
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: "var(--th-accent)", letterSpacing: "0.08em" }}>
                      ◆ REASONING #{idx + 1}
                    </span>
                    {idx === thinkingBlocks.length - 1 && (
                      <span style={{ fontFamily: mono, fontSize: 9, padding: "1px 6px", borderRadius: 4, background: isLight ? "rgba(180,83,9,0.1)" : "rgba(245,158,11,0.15)", border: isLight ? "1px solid rgba(180,83,9,0.25)" : "1px solid rgba(245,158,11,0.3)", color: "var(--th-accent)", marginLeft: "auto" }}>
                        {tr("최신", "latest", "最新", "最新")}
                      </span>
                    )}
                    {block.truncated && (
                      <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginLeft: idx === thinkingBlocks.length - 1 ? 8 : "auto" }}>
                        (truncated)
                      </span>
                    )}
                  </div>
                  <pre
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      lineHeight: 1.65,
                      color: isLight ? "#92400e" : "rgba(251,191,36,0.8)",
                      margin: 0,
                      padding: "10px 14px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {block.text}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
