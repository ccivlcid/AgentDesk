import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import { getScreenGuide } from "../data/screen-guide";
import type { View } from "../app/types";

const PANEL_WIDTH = 340;
const mono = "var(--th-font-mono)";

interface ScreenGuidePanelProps {
  open: boolean;
  view: View;
  /** 대시보드일 때 false면 "시작하기" 가이드 표시 */
  hasProject?: boolean;
  onClose: () => void;
}

export default function ScreenGuidePanel({ open, view, hasProject = true, onClose }: ScreenGuidePanelProps) {
  const { t } = useI18n();
  const entry = getScreenGuide(view, { hasProject });

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const helpTitle = t({ ko: "도움말", en: "Help", ja: "ヘルプ", zh: "帮助" });
  const youCanLabel = t({ ko: "이 화면에서 할 수 있는 것", en: "You can", ja: "この画面でできること", zh: "在此画面您可以" });

  const content = (
    <div
      role="dialog"
      aria-label={helpTitle}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: PANEL_WIDTH,
        maxWidth: "100vw",
        height: "100%",
        zIndex: 10100,
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-elevated)",
        borderLeft: "1px solid var(--th-border)",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.25)",
        fontFamily: "var(--th-font-body)",
        animation: "screenGuideSlideIn 0.2s ease-out",
      }}
    >
      {/* Header: title + close */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "14px 16px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--th-text-heading)",
            fontFamily: mono,
          }}
        >
          {t(entry.title)} — {helpTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            padding: 0,
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            background: "transparent",
            color: "var(--th-text-muted)",
            fontFamily: mono,
            fontSize: "14px",
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s, background 0.15s",
          }}
          className="hover:!text-[var(--th-text-secondary)] hover:!border-[var(--th-border-strong)] hover:!bg-[var(--th-bg-surface-hover)] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-1 focus-visible:!outline-[var(--th-accent)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* Body: scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          fontSize: "13px",
          lineHeight: 1.5,
          color: "var(--th-text-secondary)",
        }}
      >
        <p style={{ margin: "0 0 16px", color: "var(--th-text-secondary)" }}>
          {t(entry.description)}
        </p>
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--th-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
              fontFamily: mono,
            }}
          >
            {youCanLabel}
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              listStyle: "disc",
            }}
          >
            {entry.tips.map((tip, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {t(tip)}
              </li>
            ))}
          </ul>
        </div>
        <p
          style={{
            marginTop: 20,
            fontSize: "11px",
            color: "var(--th-text-muted)",
            fontFamily: mono,
          }}
        >
          {t({ ko: "Esc로 이 패널을 닫을 수 있습니다.", en: "Press Esc to close this panel.", ja: "Escでこのパネルを閉じます。", zh: "按 Esc 关闭此面板。" })}
        </p>
      </div>
    </div>
  );

  return createPortal(
    <>
      <div
        role="presentation"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10090,
          background: "rgba(0,0,0,0.2)",
          animation: "screenGuideOverlayIn 0.15s ease-out",
        }}
        onClick={onClose}
        aria-hidden
      />
      {content}
    </>,
    document.body,
  );
}
