import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import { getScreenGuide } from "../../data/screen-guide";

const mono = "var(--th-font-mono)";
const sysFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

export default function LibraryGuideWindow() {
  const { t } = useI18n();
  const entry = getScreenGuide("library");

  return (
    <AppWindow
      windowType="library-guide"
      title={t({ ko: "라이브러리 가이드", en: "Library Guide", ja: "ライブラリガイド", zh: "库指南" })}
      emoji="📚"
      defaultWidth={420}
      defaultHeight={520}
    >
      <div style={{ padding: "20px 22px 32px", overflowY: "auto", height: "100%" }}>
        {/* 설명 */}
        <p style={{
          fontFamily: sysFont,
          fontSize: 13,
          lineHeight: 1.75,
          color: "var(--th-text-secondary)",
          margin: "0 0 22px",
        }}>
          {t(entry.description)}
        </p>

        {/* 섹션 레이블 */}
        <div style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--th-text-muted)",
          marginBottom: 10,
        }}>
          {t({ ko: "탭별 기능", en: "What each tab does", ja: "タブ別機能", zh: "各选项卡功能" })}
        </div>

        {/* Tip 카드 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entry.tips.map((tip, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "9px 14px",
                background: "var(--th-hover-overlay-subtle)",
                border: "1px solid #E5E7EB",
                borderLeft: "3px solid #3B82F6",
                borderRadius: 7,
              }}
            >
              <span style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 700,
                color: "var(--th-accent)",
                flexShrink: 0,
                marginTop: 2,
                minWidth: 18,
              }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{
                fontFamily: sysFont,
                fontSize: 12,
                lineHeight: 1.65,
                color: "var(--th-text-secondary)",
              }}>
                {t(tip)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}
