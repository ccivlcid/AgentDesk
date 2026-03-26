import { mono } from "./theme";
import type { ToolTheme } from "./theme";

export function ToolInputBlock({ input, toolName, isLight = false }: { input: unknown; toolName?: string; isLight?: boolean }) {
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
