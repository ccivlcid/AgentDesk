import { createPortal } from "react-dom";
import type { I18nContextValue } from "../../../i18n";
import type { FreeModeComparisonRow } from "./freeModeComparisonRows";

interface FreeModeNoticePortalProps {
  open: boolean;
  t: I18nContextValue["t"];
  rows: FreeModeComparisonRow[];
  onDismiss: (hideToday: boolean) => void;
}

export function FreeModeNoticePortal({ open, t, rows, onDismiss }: FreeModeNoticePortalProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div style={{
      position: "fixed",
      top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: 340, zIndex: 9999,
      background: "var(--th-bg-elevated)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset",
      overflow: "hidden",
      fontFamily: "var(--th-font-mono)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px 11px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-secondary)", letterSpacing: "0.04em" }}>
          {t({ ko: "자유 모드 안내", en: "Free Mode Notice", ja: "フリーモード", zh: "自由模式说明" })}
        </span>
        <button type="button" onClick={() => onDismiss(false)}
          style={{ background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
          ✕
        </button>
      </div>

      <div style={{ padding: "14px 18px 10px", fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.65 }}>
        {t({
          ko: "보고서·로그가 생성되지 않습니다. 산출물만 확인 가능합니다.",
          en: "No logs or reports will be generated. Only deliverables are available.",
          ja: "ログ・レポートは生成されません。成果物のみ確認可能です。",
          zh: "不生成日志和报告，仅可查看交付物。",
        })}
      </div>

      <div style={{ padding: "4px 0 8px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "3px 18px 6px",
          fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.2)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span />
          <div style={{ display: "flex", gap: 20 }}>
            <span style={{ width: 30, textAlign: "center" }}>{t({ ko: "자유", en: "free", ja: "フリー", zh: "自由" })}</span>
            <span style={{ width: 30, textAlign: "center" }}>{t({ ko: "업무", en: "task", ja: "タスク", zh: "任务" })}</span>
          </div>
        </div>
        {rows.map((row) => (
          <div key={row.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "5px 18px", fontSize: 11,
          }}>
            <span style={{ color: "var(--th-text-muted)" }}>{row.label}</span>
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ width: 30, textAlign: "center", color: row.free ? "#4ade80" : "rgba(100,116,139,0.4)" }}>
                {row.free ? "✓" : "—"}
              </span>
              <span style={{ width: 30, textAlign: "center", color: "#4ade80" }}>✓</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center", justifyContent: "space-between",
        padding: "10px 18px 14px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button type="button" onClick={() => onDismiss(true)}
          style={{
            fontSize: 10, fontFamily: "var(--th-font-mono)",
            color: "rgba(255,255,255,0.28)", background: "none", border: "none",
            cursor: "pointer", padding: "4px 0", letterSpacing: "0.02em",
          }}>
          {t({ ko: "오늘 하루 안 보기", en: "Don't show today", ja: "今日は表示しない", zh: "今天不再显示" })}
        </button>
        <button type="button" onClick={() => onDismiss(false)}
          style={{
            fontSize: 11, fontFamily: "var(--th-font-mono)", fontWeight: 700,
            color: "var(--th-bg-primary)", background: "var(--th-text-primary)",
            border: "none", borderRadius: 7, cursor: "pointer",
            padding: "6px 20px", letterSpacing: "0.02em",
          }}>
          {t({ ko: "확인", en: "Got it", ja: "確認", zh: "确认" })}
        </button>
      </div>
    </div>,
    document.body,
  );
}
