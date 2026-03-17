import { useState } from "react";
import type { TFunction } from "../constants";

interface FigmaUrlSectionProps {
  figmaUrl: string;
  onChange: (url: string) => void;
  t: TFunction;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

function parseFigmaFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:design|file)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function isValidFigmaUrl(url: string): boolean {
  return /figma\.com\/(?:design|file)\/[^/?#]+/.test(url);
}

export function FigmaUrlSection({ figmaUrl, onChange, t }: FigmaUrlSectionProps) {
  const [open, setOpen] = useState(false);

  const fileKey = figmaUrl ? parseFigmaFileKey(figmaUrl) : null;
  const isValid = figmaUrl ? isValidFigmaUrl(figmaUrl) : false;
  const hasUrl = Boolean(figmaUrl.trim());

  return (
    <div style={{ borderTop: "1px solid var(--th-border)", padding: "0 16px" }}>
      {/* 토글 헤더 */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          ...mono,
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", padding: "8px 0",
          background: "none", border: "none",
          color: "var(--th-text-muted)",
          cursor: "pointer", fontSize: "9px",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}
      >
        <span style={{ color: hasUrl ? "var(--th-accent)" : undefined }}>
          {open ? "▾" : "▸"}
        </span>
        {t({ ko: "피그마 디자인", en: "FIGMA DESIGN", ja: "Figmaデザイン", zh: "Figma设计" })}
        {hasUrl && (
          <span style={{
            background: "var(--th-accent)", color: "var(--th-bg-primary)",
            borderRadius: 2, padding: "0 5px", fontSize: "8px", fontWeight: 700,
          }}>
            1
          </span>
        )}
      </button>

      {/* 선택된 URL 미리보기 (닫힌 상태에서도 표시) */}
      {hasUrl && !open && (
        <div style={{ paddingBottom: 6 }}>
          <span style={{
            ...mono, fontSize: "9px",
            padding: "1px 6px",
            border: "1px solid var(--th-accent)",
            color: "var(--th-accent)",
            borderRadius: 2, cursor: "pointer",
          }}
            onClick={() => setOpen(true)}
          >
            {fileKey ?? figmaUrl.slice(0, 24)}… ✕
          </span>
        </div>
      )}

      {open && (
        <div style={{ paddingBottom: 10 }}>
          <input
            type="url"
            placeholder="https://www.figma.com/design/..."
            value={figmaUrl}
            onChange={(e) => onChange(e.target.value)}
            style={{
              ...mono,
              width: "100%", fontSize: "10px",
              padding: "5px 8px",
              background: "var(--th-bg-elevated)",
              border: `1px solid ${figmaUrl && !isValid ? "#ff453a" : "var(--th-border)"}`,
              borderRadius: 0,
              color: "var(--th-text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {/* 파싱 결과 미리보기 */}
          {figmaUrl && isValid && fileKey && (
            <div style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", marginTop: 4 }}>
              ✓ file: {fileKey}
            </div>
          )}
          {/* 잘못된 URL 경고 */}
          {figmaUrl && !isValid && (
            <div style={{ ...mono, fontSize: "9px", color: "#ff453a", marginTop: 4 }}>
              {t({ ko: "올바른 Figma URL이 아닙니다", en: "Not a valid Figma URL", ja: "有効なFigma URLではありません", zh: "不是有效的Figma URL" })}
            </div>
          )}
          {/* URL 지우기 버튼 */}
          {hasUrl && (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{
                ...mono, fontSize: "9px", marginTop: 6,
                padding: "1px 6px", borderRadius: 0,
                border: "1px solid var(--th-border)",
                background: "transparent",
                color: "var(--th-text-muted)",
                cursor: "pointer",
              }}
            >
              {t({ ko: "지우기", en: "Clear", ja: "クリア", zh: "清除" })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
