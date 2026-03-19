import React, { useState, useCallback, useMemo } from "react";
import Defuddle from "defuddle";

interface WidgetConfig {
  refresh: string;
  theme: string;
  sizePreset: string;
  params?: Record<string, unknown>;
}

const SAMPLE_HTML = `<!DOCTYPE html>
<html><head><title>Sample Article</title>
<meta name="author" content="Jane Doe">
<meta name="description" content="A brief look at content extraction.">
</head><body>
<header><nav>Home | About | Contact</nav></header>
<main>
<article>
<h1>Understanding Content Extraction</h1>
<p>Content extraction is the process of isolating the main readable content from a web page, stripping away navigation, ads, footers, and other clutter.</p>
<p>Tools like <strong>Defuddle</strong> make this easy by analyzing the DOM structure and identifying the primary content area automatically.</p>
<h2>How It Works</h2>
<p>Defuddle examines each element's text density, position, and semantic tags to score content relevance. Elements with low scores are removed.</p>
<p>The result is clean, readable HTML or Markdown — perfect for archiving, reading, or further processing.</p>
</article>
</main>
<footer><p>© 2026 Example Corp. All rights reserved.</p></footer>
<aside><h3>Related Posts</h3><ul><li>Post A</li><li>Post B</li></ul></aside>
</body></html>`;

type ParsedResult = {
  title?: string;
  author?: string;
  description?: string;
  domain?: string;
  wordCount?: number;
  content?: string;
};

type ViewMode = "meta" | "content" | "input";

export default function CustomFeatureWidget({ config }: { config: WidgetConfig }) {
  const [htmlInput, setHtmlInput] = useState(SAMPLE_HTML);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("input");

  const handleParse = useCallback(() => {
    try {
      setError(null);
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInput, "text/html");
      const defuddled = new Defuddle(doc);
      const parsed = defuddled.parse();
      setResult({
        title: parsed.title || undefined,
        author: parsed.author || undefined,
        description: parsed.description || undefined,
        domain: parsed.domain || undefined,
        wordCount: parsed.wordCount ?? undefined,
        content: parsed.content || undefined,
      });
      setView("meta");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Parse failed");
      setResult(null);
    }
  }, [htmlInput]);

  const handleLoadSample = useCallback(() => {
    setHtmlInput(SAMPLE_HTML);
    setResult(null);
    setError(null);
    setView("input");
  }, []);

  const metaFields = useMemo(() => {
    if (!result) return [];
    const fields: { label: string; value: string }[] = [];
    if (result.title) fields.push({ label: "title", value: result.title });
    if (result.author) fields.push({ label: "author", value: result.author });
    if (result.description) fields.push({ label: "description", value: result.description });
    if (result.domain) fields.push({ label: "domain", value: result.domain });
    if (result.wordCount !== undefined) fields.push({ label: "words", value: String(result.wordCount) });
    return fields;
  }, [result]);

  const contentPreview = useMemo(() => {
    if (!result?.content) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = result.content;
    return tmp.textContent || tmp.innerText || "";
  }, [result]);

  return (
    <div
      style={{
        fontFamily: "var(--th-font-mono)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-elevated)",
        color: "var(--th-text-primary)",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid var(--th-border)",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "var(--th-text-muted)", fontSize: 12 }}>
          $ defuddle
          <span style={{ color: "var(--th-accent)", marginLeft: 4 }}>›</span>
          <span style={{ marginLeft: 4 }}>
            {view === "input" ? "input" : view === "meta" ? "metadata" : "content"}
          </span>
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["input", "meta", "content"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                background: view === v ? "var(--th-accent)" : "transparent",
                color: view === v ? "#000" : "var(--th-text-muted)",
                border: `1px solid ${view === v ? "var(--th-accent)" : "var(--th-border)"}`,
                borderRadius: 3,
                padding: "2px 8px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
              }}
            >
              {v === "input" ? "[html]" : v === "meta" ? "[meta]" : "[text]"}
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {view === "input" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              placeholder="Paste HTML here..."
              spellCheck={false}
              style={{
                flex: 1,
                background: "var(--th-bg-panel)",
                color: "var(--th-text-primary)",
                border: "1px solid var(--th-border)",
                borderRadius: 4,
                padding: 10,
                fontSize: 12,
                fontFamily: "var(--th-font-mono)",
                resize: "none",
                outline: "none",
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleParse}
                style={{
                  flex: 1,
                  background: "var(--th-accent)",
                  color: "#000",
                  border: "none",
                  borderRadius: 4,
                  padding: "8px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--th-font-mono)",
                }}
              >
                [parse]
              </button>
              <button
                onClick={handleLoadSample}
                style={{
                  background: "transparent",
                  color: "var(--th-text-muted)",
                  border: "1px solid var(--th-border)",
                  borderRadius: 4,
                  padding: "8px 14px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--th-font-mono)",
                }}
              >
                [sample]
              </button>
            </div>
          </div>
        )}

        {view === "meta" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {!result && !error && (
              <span style={{ color: "var(--th-text-muted)", fontSize: 12 }}>
                No data — paste HTML and run [parse] first.
              </span>
            )}
            {error && (
              <div
                style={{
                  color: "var(--th-danger-text)",
                  background: "var(--th-bg-panel)",
                  padding: 10,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                error: {error}
              </div>
            )}
            {metaFields.map((f, i) => (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  padding: "8px 0",
                  borderBottom:
                    i < metaFields.length - 1 ? "1px solid var(--th-border)" : "none",
                  gap: 12,
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    color: "var(--th-accent)",
                    fontSize: 11,
                    minWidth: 90,
                    flexShrink: 0,
                  }}
                >
                  {f.label}
                </span>
                <span style={{ fontSize: 13, color: "var(--th-text-primary)", lineHeight: 1.4 }}>
                  {f.value}
                </span>
              </div>
            ))}
            {result && metaFields.length === 0 && (
              <span style={{ color: "var(--th-text-muted)", fontSize: 12 }}>
                No metadata extracted.
              </span>
            )}
          </div>
        )}

        {view === "content" && (
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--th-text-primary)" }}>
            {!result && !error && (
              <span style={{ color: "var(--th-text-muted)", fontSize: 12 }}>
                No data — paste HTML and run [parse] first.
              </span>
            )}
            {error && (
              <div style={{ color: "var(--th-danger-text)", fontSize: 12 }}>error: {error}</div>
            )}
            {contentPreview ? (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  margin: 0,
                  fontFamily: "var(--th-font-mono)",
                  fontSize: 12,
                  background: "var(--th-bg-panel)",
                  padding: 12,
                  borderRadius: 4,
                  border: "1px solid var(--th-border)",
                }}
              >
                {contentPreview}
              </pre>
            ) : result ? (
              <span style={{ color: "var(--th-text-muted)", fontSize: 12 }}>
                No content extracted.
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* footer */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid var(--th-border)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--th-text-muted)",
          flexShrink: 0,
        }}
      >
        <span>defuddle · content extractor</span>
        <span style={{ color: result ? "var(--th-attr-elite)" : "var(--th-text-muted)" }}>
          {result ? "● parsed" : "○ idle"}
        </span>
      </div>
    </div>
  );
}