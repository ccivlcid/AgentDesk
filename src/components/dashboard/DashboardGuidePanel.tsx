import { useI18n } from "../../i18n";
import { getScreenGuide } from "../../data/screen-guide";

const mono = "var(--th-font-mono)";

/**
 * 프로젝트가 있을 때 대시보드 오른쪽에 표시하는 macOS 스타일 가이드 패널.
 * 헤더 ? 패널과 동일한 내용을 인라인으로 제공한다.
 */
export default function DashboardGuidePanel() {
  const { t } = useI18n();
  const entry = getScreenGuide("dashboard", { hasProject: true });

  return (
    <aside
      role="complementary"
      aria-label={t(entry.title)}
      style={{
        flexShrink: 0,
        width: 320,
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-elevated)",
        borderLeft: "1px solid var(--th-border)",
        borderTop: "1px solid var(--th-border)",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.12)",
        fontFamily: "var(--th-font-body)",
      }}
      className="lg:min-h-0"
    >
      <div
        style={{
          flexShrink: 0,
          padding: "12px 14px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--th-text-heading)",
            fontFamily: mono,
            letterSpacing: "0.02em",
          }}
        >
          {t(entry.title)}
        </h3>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "11px",
            lineHeight: 1.5,
            color: "var(--th-text-muted)",
          }}
        >
          {t(entry.description)}
        </p>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "12px 14px",
          fontSize: "12px",
          lineHeight: 1.55,
          color: "var(--th-text-secondary)",
        }}
      >
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
          {t({ ko: "이 화면에서 할 수 있는 것", en: "You can", ja: "この画面でできること", zh: "在此画面您可以" })}
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
    </aside>
  );
}
