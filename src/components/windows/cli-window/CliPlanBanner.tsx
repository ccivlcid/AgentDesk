import type { I18nContextValue } from "../../../i18n";

interface CliPlanBannerProps {
  visible: boolean;
  t: I18nContextValue["t"];
  onDismiss: () => void;
}

export function CliPlanBanner({ visible, t, onDismiss }: CliPlanBannerProps) {
  if (!visible) return null;

  return (
    <div style={{
      padding: "6px 14px",
      background: "rgba(245,158,11,0.12)",
      borderBottom: "1px solid rgba(245,158,11,0.3)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "var(--th-font-mono)",
      fontSize: 11,
      color: "var(--th-accent)",
      flexShrink: 0,
    }}>
      <span>📋</span>
      <span>{t({ ko: "기획 완료 — .agentdesk-task.md에 실행 계획이 준비됐습니다.", en: "Planning complete — execution plan is ready in .agentdesk-task.md", ja: "計画完了 — .agentdesk-task.md に実行プランが用意されました", zh: "规划完成 — 执行计划已写入 .agentdesk-task.md" })}</span>
      <button
        type="button"
        onClick={onDismiss}
        style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: 12 }}
      >✕</button>
    </div>
  );
}
