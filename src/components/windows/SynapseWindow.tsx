import { useState } from "react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import SynapseSettingsTab, { type SubTab } from "../synapse/SynapseSettingsTab";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

function SynapseIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" width={14} height={14}>
      <circle cx="4" cy="9" r="2" />
      <circle cx="14" cy="4" r="2" />
      <circle cx="14" cy="14" r="2" />
      <line x1="6" y1="8.3" x2="12" y2="5" />
      <line x1="6" y1="9.7" x2="12" y2="13" />
    </svg>
  );
}

interface NavItem {
  key: SubTab;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "notion",
    label: "Notion",
    desc: "페이지 · 스냅샷",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "obsidian",
    label: "Obsidian",
    desc: "Vault · 노트",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
        <polygon points="8,4 12,6.5 12,9.5 8,12 4,9.5 4,6.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    ),
  },
  {
    key: "notebooklm",
    label: "NotebookLM",
    desc: "Google AI",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "figma",
    label: "Figma",
    desc: "디자인 컨텍스트",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="3" y="6" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="10.5" cy="11.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="3" y="11" width="5" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    key: "rules",
    label: "Rules",
    desc: "컨텍스트 규칙",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="13" cy="8" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
];

export default function SynapseWindow() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SubTab>("notion");
  const [showHelp, setShowHelp] = useState(false);

  const current = NAV_ITEMS.find((n) => n.key === activeTab)!;

  return (
    <AppWindow
      windowType="synapse"
      title={t({ ko: "Synapse", en: "Synapse", ja: "シナプス", zh: "知识库" })}
      emoji={<SynapseIcon />}
      defaultWidth={760}
      defaultHeight={560}
    >
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* ── 왼쪽 사이드바 ── */}
        <div style={{
          width: 160,
          flexShrink: 0,
          borderRight: "1px solid var(--th-border)",
          display: "flex",
          flexDirection: "column",
          padding: "12px 8px",
          gap: 2,
          background: "var(--th-bg-sidebar, rgba(0,0,0,0.15))",
        }}>
          {/* 소스 제목 */}
          <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", padding: "0 8px 8px", textTransform: "uppercase" }}>
            {t({ ko: "지식 소스", en: "Sources", ja: "ソース", zh: "来源" })}
          </div>

          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                style={{
                  ...mono,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 7,
                  border: "none",
                  background: active ? "rgba(245,158,11,0.12)" : "transparent",
                  color: active ? "var(--th-accent)" : "var(--th-text-secondary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s, color 0.12s",
                  width: "100%",
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--th-hover-overlay)"; e.currentTarget.style.color = "var(--th-text-primary)"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--th-text-secondary)"; } }}
              >
                <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 1, opacity: 0.8 }}>{item.desc}</div>
                </div>
              </button>
            );
          })}

          {/* 스페이서 */}
          <div style={{ flex: 1 }} />

          {/* 도움말 버튼 */}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            style={{
              ...mono,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 7,
              border: "none",
              background: "transparent",
              color: "var(--th-text-muted)",
              cursor: "pointer",
              fontSize: 11,
              width: "100%",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-text-secondary)"; e.currentTarget.style.background = "var(--th-hover-overlay)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M6 6.2C6 5 7 4 8.2 4 9.4 4 10.4 5 10.4 6.2c0 1-0.6 1.5-1.2 2C8.5 8.8 8 9.2 8 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="8" cy="12" r="0.7" fill="currentColor"/>
            </svg>
            {t({ ko: "도움말", en: "Help", ja: "ヘルプ", zh: "帮助" })}
          </button>
        </div>

        {/* ── 오른쪽 콘텐츠 ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* 컨텐츠 헤더 */}
          <div style={{
            padding: "12px 18px 11px",
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ color: "var(--th-accent)", opacity: 0.9 }}>{current.icon}</span>
            <div>
              <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)", lineHeight: 1 }}>{current.label}</div>
              <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>{current.desc}</div>
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div style={{ flex: 1, overflow: "hidden", padding: "14px 18px 0" }}>
            <SynapseSettingsTab
              activeTab={activeTab}
              showHelp={showHelp}
              onHideHelp={() => setShowHelp(false)}
            />
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
