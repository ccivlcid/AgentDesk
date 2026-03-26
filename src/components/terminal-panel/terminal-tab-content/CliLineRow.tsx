import type { ReactNode } from "react";
import type { CliLine } from "./parseCli";
import { mono, getToolTheme, toolInputSummary } from "./theme";
import type { ToolTheme } from "./theme";
import { ToolInputBlock } from "./ToolInputBlock";
import { ToolCard, LineBadge } from "./ToolCard";

export function CliLineRow({ line, search, isLight = false }: { line: CliLine; search: string; isLight?: boolean }) {
  function highlight(text: string): ReactNode {
    if (!search) return text;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      i % 2 === 1
        ? <mark key={i} style={{ background: "rgba(59,130,246,0.2)", color: "#fcd34d", borderRadius: 2, padding: "0 1px" }}>{part}</mark>
        : part,
    );
  }

  if (line.kind === "system") {
    return (
      <div
        style={{
          fontFamily: mono,
          fontSize: 9,
          color: "var(--th-text-muted)",
          opacity: 0.5,
          padding: "3px 0 3px 6px",
          borderLeft: "2px solid #E5E7EB",
          letterSpacing: "0.04em",
        }}
      >
        {line.text}
      </div>
    );
  }

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
        isResult
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
