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
}

function parseCliLine(raw: string): CliLine {
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.startsWith("{")) return { kind: "raw", text: raw, raw };

  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;

    // top-level type
    const type = obj.type as string | undefined;

    // system init
    if (type === "system") {
      const sub = obj.subtype as string | undefined;
      const tools = (obj as Record<string, unknown>).tools;
      const toolCount = Array.isArray(tools) ? tools.length : undefined;
      return {
        kind: "system",
        text: sub === "init"
          ? `[session init${toolCount != null ? ` · ${toolCount} tools` : ""}]`
          : `[system: ${sub ?? "?"}]`,
        raw,
      };
    }

    // assistant message
    if (type === "assistant") {
      const msg = obj.message as Record<string, unknown> | undefined;
      const content = msg?.content as unknown[] | undefined;
      if (!content) return { kind: "raw", text: trimmed, raw };

      // collect all parts
      const parts: CliLine[] = [];
      for (const item of content) {
        const block = item as Record<string, unknown>;
        if (block.type === "text") {
          parts.push({ kind: "text", text: block.text as string, raw });
        } else if (block.type === "tool_use") {
          parts.push({
            kind: "tool_use",
            toolName: block.name as string,
            toolInput: block.input,
            raw,
          });
        }
      }
      if (parts.length === 1) return parts[0];
      if (parts.length === 0) return { kind: "raw", text: trimmed, raw };
      // multiple parts → return first text or first tool_use
      return parts[0];
    }

    // user message (tool results)
    if (type === "user") {
      const msg = obj.message as Record<string, unknown> | undefined;
      const content = msg?.content as unknown[] | undefined;
      if (!content) return { kind: "raw", text: trimmed, raw };
      const resultBlock = content.find((item) => (item as Record<string, unknown>).type === "tool_result") as Record<string, unknown> | undefined;
      if (!resultBlock) return { kind: "raw", text: trimmed, raw };
      const resultContent = resultBlock.content;
      let resultText = "";
      if (typeof resultContent === "string") {
        resultText = resultContent;
      } else if (Array.isArray(resultContent)) {
        resultText = resultContent
          .map((c) => (typeof (c as Record<string, unknown>).text === "string" ? (c as Record<string, unknown>).text : ""))
          .join("\n");
      }
      return { kind: "tool_result", text: resultText, raw };
    }

    // result (final summary)
    if (type === "result") {
      const cost = obj.cost_usd as number | undefined;
      const dur = obj.duration_ms as number | undefined;
      return {
        kind: "result",
        cost,
        duration: dur,
        text: obj.result as string | undefined,
        raw,
      };
    }

    // direct tool_use at top level
    if (type === "tool_use") {
      return { kind: "tool_use", toolName: obj.name as string, toolInput: obj.input, raw };
    }

    // direct text
    if (type === "text" && typeof obj.text === "string") {
      return { kind: "text", text: obj.text, raw };
    }

    return { kind: "raw", text: trimmed, raw };
  } catch {
    return { kind: "raw", text: raw, raw };
  }
}

function parseCliText(raw: string): CliLine[] {
  if (!raw.trim()) return [];
  return raw.split("\n").map(parseCliLine);
}

/* ─── 줄 렌더러 ──────────────────────────────────────────────────── */

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

function CollapsibleBlock({
  label,
  labelColor,
  children,
  defaultOpen = false,
  badge,
}: {
  label: string;
  labelColor: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left"
        style={{ ...mono, fontSize: "11px", color: labelColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{ fontSize: "9px", opacity: 0.7, flexShrink: 0 }}>{open ? "▼" : "▶"}</span>
        <span style={{ fontWeight: 700 }}>{label}</span>
        {badge && (
          <span style={{ fontSize: "9px", padding: "0 5px", border: `1px solid ${labelColor}30`, background: `${labelColor}10`, color: labelColor, marginLeft: 4 }}>
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            marginTop: 4,
            paddingLeft: 12,
            borderLeft: `2px solid ${labelColor}30`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ToolInputBlock({ input, toolName }: { input: unknown; toolName?: string }) {
  if (input == null) return null;
  const isStr = typeof input === "string";
  const isObj = typeof input === "object";

  // bash / command
  if (isObj && toolName === "Bash" || toolName === "bash" || toolName === "computer") {
    const cmd = (input as Record<string, unknown>).command as string | undefined
      || (input as Record<string, unknown>).action as string | undefined;
    if (cmd) {
      return (
        <pre style={{ ...mono, fontSize: "11px", color: "#7dd3fc", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          $ {cmd}
        </pre>
      );
    }
  }

  // Write / Edit: show file path
  if (isObj) {
    const obj = input as Record<string, unknown>;
    const filePath = obj.file_path ?? obj.path ?? obj.filename;
    if (filePath) {
      const content = obj.content ?? obj.new_string ?? obj.old_string;
      return (
        <div>
          <span style={{ ...mono, fontSize: "11px", color: "#86efac" }}>{String(filePath)}</span>
          {content !== undefined && content !== null && typeof content === "string" && content.length < 200 && (
            <pre style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", margin: "2px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {content}
            </pre>
          )}
        </div>
      );
    }
    // generic object: compact JSON
    const str = JSON.stringify(input, null, 2);
    return (
      <pre style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflowY: "auto" }}>
        {str}
      </pre>
    );
  }
  if (isStr) {
    return <pre style={{ ...mono, fontSize: "11px", color: "#7dd3fc", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{input as string}</pre>;
  }
  return null;
}

function CliLineRow({ line, search }: { line: CliLine; search: string }) {
  function highlight(text: string): ReactNode {
    if (!search) return text;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      i % 2 === 1 ? <mark key={i} style={{ background: "rgba(251,191,36,0.35)", color: "#fcd34d" }}>{part}</mark> : part,
    );
  }

  if (line.kind === "system") {
    return (
      <div style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.6, padding: "1px 0" }}>
        {line.text}
      </div>
    );
  }

  if (line.kind === "text" && line.text) {
    const text = line.text.trim();
    if (!text) return null;
    const isLong = text.length > 300;
    return (
      <div style={{ padding: "3px 0" }}>
        {isLong ? (
          <CollapsibleBlock label="assistant" labelColor="#c4b5fd" defaultOpen badge={`${text.length} chars`}>
            <pre style={{ ...mono, fontSize: "12px", color: "var(--th-text-primary)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
              {highlight(text)}
            </pre>
          </CollapsibleBlock>
        ) : (
          <pre style={{ ...mono, fontSize: "12px", color: "var(--th-text-primary)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
            {highlight(text)}
          </pre>
        )}
      </div>
    );
  }

  if (line.kind === "tool_use") {
    const name = line.toolName ?? "tool";
    const toolColor =
      name === "Bash" || name === "bash" ? "#4ade80"
      : name === "Write" || name === "Edit" ? "#60a5fa"
      : name === "Read" ? "#94a3b8"
      : name === "WebSearch" || name === "WebFetch" ? "#fb923c"
      : "#818cf8";
    return (
      <div style={{ padding: "3px 0" }}>
        <CollapsibleBlock label={`⚙ ${name}`} labelColor={toolColor} defaultOpen>
          <ToolInputBlock input={line.toolInput} toolName={name} />
        </CollapsibleBlock>
      </div>
    );
  }

  if (line.kind === "tool_result" && line.text != null) {
    const text = line.text.trim();
    if (!text) return null;
    const lines = text.split("\n").length;
    const isLong = text.length > 400 || lines > 10;
    return (
      <div style={{ padding: "2px 0" }}>
        <CollapsibleBlock
          label="◀ output"
          labelColor="#6ee7b7"
          defaultOpen={!isLong}
          badge={isLong ? `${lines} lines` : undefined}
        >
          <pre style={{ ...mono, fontSize: "11px", color: "#6ee7b7", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 300, overflowY: "auto" }}>
            {highlight(text)}
          </pre>
        </CollapsibleBlock>
      </div>
    );
  }

  if (line.kind === "result") {
    const parts: string[] = [];
    if (line.duration != null) parts.push(`${(line.duration / 1000).toFixed(1)}s`);
    if (line.cost != null) parts.push(`$${line.cost.toFixed(4)}`);
    return (
      <div style={{ ...mono, fontSize: "10px", color: "#4ade80", padding: "4px 0", opacity: 0.8 }}>
        ✓ done{parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
        {line.text && (
          <span style={{ color: "var(--th-text-muted)", marginLeft: 8 }}>{line.text.slice(0, 80)}</span>
        )}
      </div>
    );
  }

  // raw — show as-is but collapse if looks like JSON
  if (line.raw.trim().startsWith("{")) {
    return (
      <div style={{ padding: "2px 0" }}>
        <CollapsibleBlock label="raw" labelColor="var(--th-text-muted)" defaultOpen={false}>
          <pre style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {line.raw}
          </pre>
        </CollapsibleBlock>
      </div>
    );
  }

  if (!line.raw.trim()) return null;
  return (
    <pre style={{ ...mono, fontSize: "12px", color: "var(--th-text-secondary)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "1px 0", lineHeight: 1.6 }}>
      {highlight(line.raw)}
    </pre>
  );
}

/* ─── 메인 컴포넌트 ──────────────────────────────────────────────── */

function highlightSearchMatches(text: string, search: string): ReactNode {
  if (!search) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-400/40 text-yellow-200 rounded-sm px-[1px]">{part}</mark>
    ) : part,
  );
}

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
}

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
  progressHints,
  thinkingBlocks,
  showThinking,
  shouldShowProgressHints,
  taskLogTimeFormatter,
  tr,
  refs,
  handleScroll,
}: TerminalTabContentProps) {
  const { containerRef, preRef, searchInputRef } = refs;

  // JSON 구조 감지: 첫 번째 non-empty 줄이 `{`로 시작하면 structured mode
  const isStructured = (() => {
    if (!text) return false;
    const firstLine = text.split("\n").find((l) => l.trim());
    return Boolean(firstLine?.trim().startsWith("{"));
  })();

  const parsedLines = isStructured ? parseCliText(text) : null;

  return (
    <>
      {showSearchBar && (
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: "var(--th-border)" }}>
          <input
            ref={searchInputRef}
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setShowSearchBar(false); setLogSearch(""); }
            }}
            placeholder={tr("로그 검색...", "Search logs...", "ログ検索...", "搜索日志...")}
            className="flex-1 border px-2 py-1 text-xs font-mono outline-none"
            style={{ borderRadius: 0, borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-primary)" }}
          />
          {logSearch && (
            <span className="text-[10px] whitespace-nowrap" style={{ color: "var(--th-text-muted)" }}>
              {searchMatchCount} {tr("줄 일치", "lines", "行一致", "行匹配")}
            </span>
          )}
          <select
            value={logKindFilter}
            onChange={(e) => setLogKindFilter(e.target.value as "all" | "system" | "error")}
            className="border px-1.5 py-1 text-[10px] font-mono outline-none"
            style={{ borderRadius: 0, borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
          >
            <option value="all">{tr("전체", "All", "全て", "全部")}</option>
            <option value="system">{tr("시스템", "System", "システム", "系统")}</option>
            <option value="error">{tr("에러", "Error", "エラー", "错误")}</option>
          </select>
        </div>
      )}

      {filteredTaskLogs.length > 0 && (
        <div className="terminal-panel-strip max-h-24 space-y-0.5 overflow-y-auto border-b px-4 py-2">
          {filteredTaskLogs.map((log) => {
            const kindStyle =
              log.kind === "error" ? { color: "rgb(253,164,175)" }
              : log.kind === "system" ? { color: "var(--th-accent)" }
              : { color: "var(--th-text-muted)" };
            const time = taskLogTimeFormatter.format(new Date(log.created_at));
            return (
              <div key={log.id} className="text-[10px] font-mono" style={kindStyle}>
                [{time}] {log.message}
              </div>
            );
          })}
        </div>
      )}

      {showThinking && thinkingBlocks.length > 0 && (
        <div className="border-b" style={{ borderColor: "var(--th-border)", background: "rgba(15,17,23,0.9)" }}>
          <div className="max-h-52 overflow-y-auto px-4 py-2.5">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-mono" style={{ color: "var(--th-accent)" }}>
              <span>&#9670; REASONING</span>
              <span className="ml-auto" style={{ color: "var(--th-text-muted)" }}>
                {thinkingBlocks.length} {thinkingBlocks.length === 1 ? "block" : "blocks"}
                {thinkingBlocks[thinkingBlocks.length - 1].truncated ? " (truncated)" : ""}
              </span>
            </div>
            <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words" style={{ color: "rgba(251,191,36,0.65)" }}>
              {thinkingBlocks[thinkingBlocks.length - 1].text}
            </pre>
            {thinkingBlocks.length > 1 && (
              <div className="mt-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                + {thinkingBlocks.length - 1} earlier {thinkingBlocks.length === 2 ? "block" : "blocks"}
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
        {!text ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--th-text-muted)" }}>
            <div className="text-3xl mb-3">
              {task?.status === "in_progress" ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                <span>&#128421;</span>
              )}
            </div>
            <div className="text-sm">
              {task?.status === "in_progress"
                ? shouldShowProgressHints
                  ? tr("도구 실행 중...", "Tools are running...", "ツール実行中...", "工具正在运行...")
                  : tr("출력을 기다리는 중...", "Waiting for output...", "出力待機中...", "正在等待输出...")
                : tr("아직 터미널 출력이 없습니다", "No terminal output yet", "まだターミナル出力がありません", "暂无终端输出")}
            </div>
          </div>
        ) : parsedLines ? (
          /* ── Structured (JSON) 모드 ── */
          <div ref={preRef as unknown as React.RefObject<HTMLDivElement>} className="space-y-0.5">
            {parsedLines.map((line, idx) => (
              <CliLineRow key={idx} line={line} search={logSearch} />
            ))}
          </div>
        ) : (
          /* ── Raw 텍스트 모드 ── */
          <pre
            ref={preRef as unknown as React.RefObject<HTMLPreElement>}
            className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap break-words terminal-output-text"
          >
            {logSearch ? highlightSearchMatches(text, logSearch) : text}
          </pre>
        )}
      </div>
    </>
  );
}
