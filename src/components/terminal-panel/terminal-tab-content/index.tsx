import { useState } from "react";
import type { TaskLogEntry } from "../model";
import type { TerminalProgressHintsPayload, TerminalThinkingBlock } from "../../../api";
import type { UseTerminalPanelDataRefs } from "../useTerminalPanelData";
import { parseCliText } from "./parseCli";
import { mono } from "./theme";
import { highlightSearchMatches } from "./utils";
import { CliLineRow } from "./CliLineRow";

export type SubTab = "output" | "logs" | "thinking";

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
  const { containerRef, parsedOutputRef, rawOutputPreRef, searchInputRef } = refs;
  const [subTab, setSubTab] = useState<SubTab>("output");

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
      <div
        className="flex-shrink-0 flex items-center"
        style={{
          padding: "0 14px",
          borderBottom: "1px solid #E5E7EB",
          background: "#FFFFFF",
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
                borderBottom: isActive ? "2px solid #3B82F6" : "2px solid transparent",
                background: "transparent",
                color: isActive ? "#3B82F6" : isError ? "rgb(253,164,175)" : "#9CA3AF",
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
                    background: isActive ? "rgba(245,158,11,0.18)" : isError ? "rgba(253,164,175,0.15)" : "#F9FAFB",
                    border: `1px solid ${isActive ? "rgba(245,158,11,0.35)" : isError ? "rgba(253,164,175,0.3)" : "#E5E7EB"}`,
                    color: isActive ? "#3B82F6" : isError ? "rgb(253,164,175)" : "#9CA3AF",
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

      {subTab === "output" && (
        <>
          {showSearchBar && (
            <div
              className="flex items-center gap-2 flex-shrink-0"
              style={{ padding: "6px 14px", borderBottom: "1px solid #E5E7EB", background: "#FFFFFF" }}
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
                  border: "1px solid #E5E7EB",
                  background: "#F9FAFB",
                  color: "#111827",
                  outline: "none",
                }}
              />
              {logSearch && (
                <span style={{ fontFamily: mono, fontSize: 9, color: "#9CA3AF", whiteSpace: "nowrap" }}>
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
                  border: "1px solid #E5E7EB",
                  background: "#F9FAFB",
                  color: "#6B7280",
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9CA3AF" }}>
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
              <div
                ref={parsedOutputRef}
                style={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                {logSearch && visibleParsedLines.length === 0 && (
                  <div style={{ fontFamily: mono, fontSize: 11, color: "#9CA3AF", padding: "8px 0" }}>
                    {tr(`"${logSearch}" 에 대한 결과 없음`, `No matches for "${logSearch}"`, `"${logSearch}" の一致なし`, `"${logSearch}" 无结果`)}
                  </div>
                )}
                {visibleParsedLines.map((line, idx) => (
                  <CliLineRow key={idx} line={line} search={logSearch} isLight={isLight} />
                ))}
              </div>
            ) : (
              <pre
                ref={rawOutputPreRef}
                style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, color: "#111827" }}
                className="terminal-output-text"
              >
                {logSearch ? highlightSearchMatches(text, logSearch) : text}
              </pre>
            )}
          </div>
        </>
      )}

      {subTab === "logs" && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredTaskLogs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9CA3AF" }}>
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
                      border: `1px solid ${isError ? "rgba(253,164,175,0.22)" : "#E5E7EB"}`,
                      background: isError ? "rgba(253,164,175,0.05)" : "#F9FAFB",
                      padding: "5px 10px",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 9, color: "#9CA3AF", flexShrink: 0, paddingTop: 2, minWidth: 58 }}>
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
                        background: isError ? "rgba(253,164,175,0.12)" : isSystem ? "rgba(245,158,11,0.12)" : "#FFFFFF",
                        border: `1px solid ${isError ? "rgba(253,164,175,0.3)" : isSystem ? "rgba(245,158,11,0.3)" : "#E5E7EB"}`,
                        color: isError ? "rgb(253,164,175)" : isSystem ? "#3B82F6" : "#6B7280",
                      }}
                    >
                      {log.kind}
                    </span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: isError ? "rgb(253,164,175)" : "#111827", lineHeight: 1.5, wordBreak: "break-word" }}>
                      {log.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === "thinking" && (
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ background: isLight ? "#F9FAFB" : "#F3F4F6" }}
        >
          {thinkingBlocks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9CA3AF" }}>
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
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: "#3B82F6", letterSpacing: "0.08em" }}>
                      ◆ REASONING #{idx + 1}
                    </span>
                    {idx === thinkingBlocks.length - 1 && (
                      <span style={{ fontFamily: mono, fontSize: 9, padding: "1px 6px", borderRadius: 4, background: isLight ? "rgba(180,83,9,0.1)" : "rgba(245,158,11,0.15)", border: isLight ? "1px solid rgba(180,83,9,0.25)" : "1px solid rgba(245,158,11,0.3)", color: "#3B82F6", marginLeft: "auto" }}>
                        {tr("최신", "latest", "最新", "最新")}
                      </span>
                    )}
                    {block.truncated && (
                      <span style={{ fontFamily: mono, fontSize: 9, color: "#9CA3AF", marginLeft: idx === thinkingBlocks.length - 1 ? 8 : "auto" }}>
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
