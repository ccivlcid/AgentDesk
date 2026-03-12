import { useI18n } from "../../i18n";
import { dashboardEmptyGuide } from "../../data/screen-guide";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

/**
 * 프로젝트 없을 때 대시보드에 표시하는 "시작하기" 가이드 패널.
 * 대시보드·프로젝트 유형과 동일한 macOS 카드(터미널 헤더 + 본문) 스타일로 통일.
 */
export default function GettingStartedGuidePanel() {
  const { t } = useI18n();
  const entry = dashboardEmptyGuide;
  const stepsLabel = t({ ko: "단계", en: "Steps", ja: "手順", zh: "步骤" });

  return (
    <aside
      role="complementary"
      aria-label={t(entry.title)}
      style={{
        flexShrink: 0,
        width: 320,
        maxWidth: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        ...mono,
      }}
      className="lg:min-h-0"
    >
      {/* 터미널 헤더 (macOS) — 대시보드·프로젝트 유형과 동일 */}
      <div
        style={{
          borderBottom: "1px solid var(--th-border)",
          padding: "12px 18px",
          background: "var(--th-bg-panel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex flex-shrink-0 items-center gap-1.5" aria-hidden>
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: "#27c93f" }} />
        </div>
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
        <span style={{ fontSize: "11px", color: "var(--th-text-secondary)" }}>cat getting-started.md</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: "var(--th-text-muted)",
            background: "var(--th-bg-surface)",
            padding: "2px 8px",
            borderRadius: 6,
            border: "1px solid var(--th-border)",
          }}
        >
          {entry.tips.length} {stepsLabel}
        </span>
      </div>

      {/* 본문 (대시보드·프로젝트 유형과 동일 패딩) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          background: "var(--th-bg-primary)",
          padding: "20px 18px 24px",
          fontSize: "12px",
          lineHeight: 1.6,
          color: "var(--th-text-secondary)",
        }}
      >
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "12px",
            lineHeight: 1.5,
            color: "var(--th-text-muted)",
          }}
        >
          {t(entry.description)}
        </p>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--th-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}
        >
          {stepsLabel}
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: "20px",
            listStyle: "decimal",
          }}
        >
          {entry.tips.map((tip, i) => (
            <li key={i} style={{ marginBottom: 10 }}>
              {t(tip)}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
