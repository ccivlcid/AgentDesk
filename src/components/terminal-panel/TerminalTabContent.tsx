import type { ReactNode } from "react";
import type { TaskLogEntry } from "./model";
import type { TerminalProgressHintsPayload, TerminalThinkingBlock } from "../../api";
import type { UseTerminalPanelDataRefs } from "./useTerminalPanelData";

function highlightSearchMatches(text: string, search: string): ReactNode {
  if (!search) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  // Odd-indexed parts are the regex captures (matches)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-400/40 text-yellow-200 rounded-sm px-[1px]">
        {part}
      </mark>
    ) : (
      part
    ),
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

  return (
    <>
      {showSearchBar && (
        <div
          className="flex items-center gap-2 border-b px-4 py-2"
          style={{ borderColor: "var(--th-border)" }}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowSearchBar(false);
                setLogSearch("");
              }
            }}
            placeholder={tr("로그 검색...", "Search logs...", "ログ検索...", "搜索日志...")}
            className="flex-1 border px-2 py-1 text-xs font-mono outline-none"
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-primary)" }}
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
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
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
              log.kind === "error" ? { color: "rgb(253,164,175)" } : log.kind === "system" ? { color: "var(--th-accent)" } : { color: "var(--th-text-muted)" };
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
            <pre
              className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words"
              style={{ color: "rgba(251,191,36,0.65)" }}
            >
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
                : tr(
                    "아직 터미널 출력이 없습니다",
                    "No terminal output yet",
                    "まだターミナル出力がありません",
                    "暂无终端输出",
                  )}
            </div>
          </div>
        ) : (
          <pre
            ref={preRef}
            className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap break-words terminal-output-text"
          >
            {logSearch ? highlightSearchMatches(text, logSearch) : text}
          </pre>
        )}
      </div>
    </>
  );
}
