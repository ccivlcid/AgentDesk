import { createPortal } from "react-dom";
import type { I18nContextValue } from "../../../i18n";
import type { FreeModeComparisonRow } from "./freeModeComparisonRows";
import { IconCheck, IconClose, IconDash } from "./FreeModeNoticeIcons";

interface FreeModeNoticePortalProps {
  open: boolean;
  t: I18nContextValue["t"];
  rows: FreeModeComparisonRow[];
  onDismiss: (hideToday: boolean) => void;
}

export function FreeModeNoticePortal({ open, t, rows, onDismiss }: FreeModeNoticePortalProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      onClick={() => onDismiss(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--th-modal-overlay)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="free-mode-notice-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(400px, calc(100vw - 40px))",
          maxHeight: "min(90vh, 560px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "var(--th-bg-elevated)",
          border: "1px solid #D1D5DB",
          borderRadius: 12,
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 64px rgba(0,0,0,0.45), 0 12px 24px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "18px 20px 14px",
            borderBottom: "1px solid #E5E7EB",
            background: "linear-gradient(180deg, #EBF5FF 0%, transparent 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: "var(--th-accent)",
              borderRadius: "12px 0 0 0",
              opacity: 0.85,
            }}
          />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingLeft: 6 }}>
            <div>
              <h2
                id="free-mode-notice-title"
                style={{
                  margin: 0,
                  fontFamily: "var(--th-font-display)",
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--th-text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {t({ ko: "자유 모드 안내", en: "Free Mode Notice", ja: "フリーモード", zh: "自由模式说明" })}
              </h2>
              <p
                style={{
                  margin: "8px 0 0",
                  fontFamily: "var(--th-font-body)",
                  fontSize: 12,
                  fontWeight: 400,
                  lineHeight: 1.65,
                  color: "var(--th-text-muted)",
                }}
              >
                {t({
                  ko: "보고서·로그가 생성되지 않습니다. 산출물만 확인 가능합니다.",
                  en: "No logs or reports will be generated. Only deliverables are available.",
                  ja: "ログ・レポートは生成されません。成果物のみ確認可能です。",
                  zh: "不生成日志和报告，仅可查看交付物。",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(false)}
              aria-label={t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                margin: "-4px -6px 0 0",
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: "var(--th-text-muted)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--th-bg-primary)";
                e.currentTarget.style.color = "var(--th-text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--th-text-muted)";
              }}
            >
              <IconClose />
            </button>
          </div>
        </div>

        <div style={{ padding: "14px 20px 18px", flex: 1, minHeight: 0, overflow: "auto" }}>
          <div
            style={{
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: "var(--th-bg-surface)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 52px 52px",
                alignItems: "center",
                gap: 0,
                padding: "10px 14px",
                fontFamily: "var(--th-font-mono)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--th-text-secondary)",
                borderBottom: "1px solid #E5E7EB",
                background: "var(--th-bg-surface)",
              }}
            >
              <span>{t({ ko: "기능", en: "Feature", ja: "機能", zh: "功能" })}</span>
              <span style={{ textAlign: "center" }}>
                {t({ ko: "자유", en: "Free", ja: "フリー", zh: "自由" })}
              </span>
              <span style={{ textAlign: "center" }}>
                {t({ ko: "업무", en: "Task", ja: "タスク", zh: "任务" })}
              </span>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 52px 52px",
                  alignItems: "center",
                  padding: "10px 14px",
                  fontFamily: "var(--th-font-body)",
                  fontSize: 12,
                  color: "var(--th-text-primary)",
                  borderBottom: i < rows.length - 1 ? "1px solid #E5E7EB" : "none",
                  background: i % 2 === 1 ? "var(--th-bg-primary)" : "transparent",
                }}
              >
                <span style={{ lineHeight: 1.45, paddingRight: 8 }}>{row.label}</span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: row.free ? "var(--th-success)" : "var(--th-text-muted)",
                    opacity: row.free ? 1 : 0.45,
                  }}
                >
                  {row.free ? <IconCheck /> : <IconDash />}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--th-success)",
                  }}
                >
                  <IconCheck />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "14px 20px 18px",
            borderTop: "1px solid #E5E7EB",
            background: "var(--th-bg-surface)",
          }}
        >
          <button
            type="button"
            onClick={() => onDismiss(true)}
            style={{
              fontSize: 11,
              fontFamily: "var(--th-font-mono)",
              color: "var(--th-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 4px",
              letterSpacing: "0.02em",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              textDecorationColor: "var(--th-border-strong)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--th-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--th-text-muted)";
            }}
          >
            {t({ ko: "오늘 하루 안 보기", en: "Don't show today", ja: "今日は表示しない", zh: "今天不再显示" })}
          </button>
          <button
            type="button"
            onClick={() => onDismiss(false)}
            style={{
              fontSize: 12,
              fontFamily: "var(--th-font-mono)",
              fontWeight: 600,
              color: "var(--th-bg-primary)",
              background: "var(--th-text-primary)",
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              cursor: "pointer",
              padding: "9px 22px",
              letterSpacing: "0.02em",
              boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = "brightness(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "none";
            }}
          >
            {t({ ko: "확인", en: "Got it", ja: "確認", zh: "确认" })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
