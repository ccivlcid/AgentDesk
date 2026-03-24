import React from "react";
import type { TerminalProgressHintsPayload, TerminalProgressHint } from "../../api";

export interface ProgressHintsStripProps {
  progressHints: TerminalProgressHintsPayload;
  activeToolHint: { tool: string } | null;
  shortPath: (v: string) => string;
  compactHintText: (v: string, max?: number) => string;
  hintLineLabel: (hint: TerminalProgressHint) => string;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  isLight?: boolean;
}

const mono = "var(--th-font-mono)";

/* ── 도구별 색상 ─────────────────────────────────────────────────── */
function toolColor(name: string): { bg: string; border: string; text: string } {
  const n = name.toLowerCase();
  if (n === "bash")       return { bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)",  text: "#4ade80" };
  if (n === "write")      return { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  text: "#60a5fa" };
  if (n === "edit")       return { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  text: "#60a5fa" };
  if (n === "read")       return { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", text: "#94a3b8" };
  if (n === "glob")       return { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", text: "#a78bfa" };
  if (n === "grep")       return { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", text: "#a78bfa" };
  if (n === "websearch")  return { bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.3)",  text: "#fb923c" };
  if (n === "webfetch")   return { bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.3)",  text: "#fb923c" };
  if (n === "agent")      return { bg: "rgba(232,121,249,0.12)", border: "rgba(232,121,249,0.3)", text: "#e879f9" };
  return                         { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  text: "var(--th-accent)" };
}

/* ── 도구 아이콘 ──────────────────────────────────────────────────── */
function toolIcon(name: string): string {
  const n = name.toLowerCase();
  if (n === "bash")                 return "⌗";
  if (n === "write" || n === "edit") return "✎";
  if (n === "read")                 return "◎";
  if (n === "glob" || n === "grep") return "⌕";
  if (n === "websearch")            return "⊙";
  if (n === "webfetch")             return "⤓";
  if (n === "agent")                return "◈";
  return "◆";
}

/* ── 힌트 phase 아이콘 ──────────────────────────────────────────── */
function phaseIcon(phase: string): React.ReactNode {
  if (phase === "ok")    return "✓";
  if (phase === "error") return <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  return "›";
}

export function ProgressHintsStrip({
  progressHints,
  activeToolHint,
  shortPath,
  compactHintText,
  tr,
  isLight = false,
}: ProgressHintsStripProps) {
  const recentHints = progressHints.hints.slice(-5);
  const tc = activeToolHint ? toolColor(activeToolHint.tool) : null;

  /* glassmorphism 배경 */
  const bg = isLight
    ? "rgba(248,248,250,0.88)"
    : "rgba(18,20,28,0.82)";
  const borderColor = isLight
    ? "rgba(0,0,0,0.09)"
    : "rgba(255,255,255,0.07)";

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${borderColor}`,
        background: bg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "7px 18px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      {/* ── Row 1: 활성 도구 + 상태 + 파일 ─────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {/* 펄스 dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#4ade80",
            flexShrink: 0,
            boxShadow: "0 0 0 2px rgba(74,222,128,0.25)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />

        {/* 활성 도구 뱃지 */}
        {activeToolHint && tc && (
          <span
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "2px 7px 2px 5px",
              borderRadius: 5,
              background: tc.bg,
              border: `1px solid ${tc.border}`,
              color: tc.text,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 9, opacity: 0.85 }}>{toolIcon(activeToolHint.tool)}</span>
            {activeToolHint.tool}
          </span>
        )}

        {/* 상태 텍스트 */}
        <span
          style={{
            fontFamily: mono,
            fontSize: 10,
            color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.38)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {activeToolHint
            ? tr("실행 중…", "running…", "実行中…", "运行中…")
            : tr("처리 중…", "processing…", "処理中…", "处理中…")}
        </span>

        {/* 현재 파일 (오른쪽) */}
        {progressHints.current_file && (
          <span
            style={{
              fontFamily: mono,
              fontSize: 9,
              color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.28)",
              flexShrink: 0,
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              borderLeft: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
              paddingLeft: 8,
            }}
          >
            {shortPath(progressHints.current_file)}
          </span>
        )}
      </div>

      {/* ── Row 2: 최근 힌트 pill 트레일 ────────────────────────── */}
      {recentHints.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "nowrap", overflow: "hidden" }}>
          {recentHints.map((hint, idx) => {
            const isOk    = hint.phase === "ok";
            const isError = hint.phase === "error";
            const isActive = idx === recentHints.length - 1;
            const hc = toolColor(hint.tool);

            return (
              <span
                key={`${hint.tool}-${hint.phase}-${idx}`}
                title={compactHintText(hint.summary, 120)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  padding: "1px 6px 1px 4px",
                  borderRadius: 4,
                  background: isError
                    ? "rgba(253,164,175,0.1)"
                    : isOk
                      ? "rgba(74,222,128,0.08)"
                      : isActive
                        ? hc.bg
                        : isLight
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(255,255,255,0.05)",
                  border: `1px solid ${
                    isError ? "rgba(253,164,175,0.25)"
                    : isOk   ? "rgba(74,222,128,0.22)"
                    : isActive ? hc.border
                    : isLight   ? "rgba(0,0,0,0.08)"
                    : "rgba(255,255,255,0.08)"
                  }`,
                  color: isError
                    ? "rgb(253,164,175)"
                    : isOk
                      ? "#4ade80"
                      : isActive
                        ? hc.text
                        : isLight
                          ? "rgba(0,0,0,0.42)"
                          : "rgba(255,255,255,0.35)",
                  flexShrink: idx < recentHints.length - 3 ? 1 : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  maxWidth: isActive ? 160 : 90,
                  textOverflow: "ellipsis",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 8, opacity: isOk || isError ? 1 : 0.7 }}>
                  {phaseIcon(hint.phase)}
                </span>
                {hint.tool}
              </span>
            );
          })}

          {/* 구분선 + 완료된 아이템 수 */}
          {progressHints.ok_items.length > 0 && (
            <>
              <span
                style={{
                  width: 1,
                  height: 10,
                  background: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
                  flexShrink: 0,
                  marginLeft: 3,
                  marginRight: 3,
                }}
              />
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 9,
                  color: "#4ade80",
                  letterSpacing: "0.03em",
                  flexShrink: 0,
                }}
              >
                ✓ {progressHints.ok_items.length}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
