import { useI18n } from "../../i18n";
import { dashboardEmptyGuide } from "../../data/screen-guide";

const mono = "var(--th-font-mono)";

/**
 * 프로젝트 없을 때 대시보드에 표시하는 macOS 스타일 "시작하기" 가이드 패널.
 * 인라인으로 화면 오른쪽(또는 하단)에 항상 노출되어 전체 흐름을 안내한다.
 */
export default function GettingStartedGuidePanel() {
  const { t } = useI18n();
  const entry = dashboardEmptyGuide;

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
        <ul
          style={{
            margin: 0,
            paddingLeft: "16px",
            listStyle: "decimal",
          }}
        >
          {entry.tips.map((tip, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              {t(tip)}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
