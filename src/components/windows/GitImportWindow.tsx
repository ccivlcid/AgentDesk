import { useState } from "react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import GitHubImportPanel from "../GitHubImportPanel";
import GitLabImportPanel from "../gitlab-import/GitLabImportPanel";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { getProjectDetail } from "../../api/organization-projects";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

type Provider = "github" | "gitlab";

function GitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="1.05" y1="12" x2="7" y2="12"/>
      <line x1="17.01" y1="12" x2="22.96" y2="12"/>
    </svg>
  );
}

export default function GitImportWindow() {
  const { t } = useI18n();
  const [provider, setProvider] = useState<Provider>("github");
  const { setProjects, setCurrentProjectId } = useProjectStore();
  const { closeWindow } = useUiStore();

  async function handleComplete(projectId: string) {
    try {
      const detail = await getProjectDetail(projectId);
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === projectId);
        return exists ? prev.map((p) => p.id === projectId ? detail.project : p) : [...prev, detail.project];
      });
      setCurrentProjectId(projectId);
    } catch { /* 무시 */ }
    closeWindow("git-import");
  }

  const PROVIDERS: Array<{ key: Provider; label: string; desc: string; color: string; activeBg: string; activeBorder: string; icon: React.ReactNode }> = [
    {
      key: "github",
      label: "GitHub",
      desc: t({ ko: "OAuth · PAT 지원", en: "OAuth · PAT support", ja: "OAuth · PAT 対応", zh: "支持 OAuth · PAT" }),
      color: "var(--th-text-heading)",
      activeBg: "var(--th-hover-overlay-subtle)",
      activeBorder: "var(--th-border-strong)",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
    },
    {
      key: "gitlab",
      label: "GitLab",
      desc: t({ ko: "PAT 지원 (read_repository)", en: "PAT support (read_repository)", ja: "PAT 対応", zh: "支持 PAT" }),
      color: "#fc6d26",
      activeBg: "rgba(252,109,38,0.1)",
      activeBorder: "rgba(252,109,38,0.4)",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z"/>
        </svg>
      ),
    },
  ];

  return (
    <AppWindow
      windowType="git-import"
      title={t({ ko: "Git 저장소 가져오기", en: "Import Git Repository", ja: "Git リポジトリのインポート", zh: "导入 Git 仓库" })}
      emoji={<GitIcon />}
      defaultWidth={640}
      defaultHeight={520}
    >
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* 왼쪽 사이드바 */}
        <div style={{
          width: 150,
          flexShrink: 0,
          borderRight: "1px solid var(--th-border)",
          display: "flex",
          flexDirection: "column",
          padding: "12px 8px",
          gap: 4,
          background: "var(--th-bg-sidebar, rgba(0,0,0,0.15))",
        }}>
          <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", padding: "0 8px 8px", textTransform: "uppercase" }}>
            {t({ ko: "플랫폼 선택", en: "Platform", ja: "プラットフォーム", zh: "平台" })}
          </div>
          {PROVIDERS.map((p) => {
            const active = provider === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setProvider(p.key)}
                style={{
                  ...mono,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 7,
                  border: "none",
                  background: active ? p.activeBg : "transparent",
                  color: active ? p.color : "var(--th-text-secondary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s, color 0.12s",
                  width: "100%",
                  borderLeft: `3px solid ${active ? p.activeBorder : "transparent"}`,
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--th-hover-overlay)"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; } }}
              >
                <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0, color: active ? p.color : "inherit" }}>{p.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, lineHeight: 1.2 }}>{p.label}</div>
                  <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 1, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 오른쪽 콘텐츠 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* 헤더 */}
          <div style={{
            padding: "12px 18px 11px",
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ color: PROVIDERS.find((p) => p.key === provider)?.color }}>
              {PROVIDERS.find((p) => p.key === provider)?.icon}
            </span>
            <div>
              <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)", lineHeight: 1 }}>
                {provider === "github" ? "GitHub" : "GitLab"}
              </div>
              <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                {PROVIDERS.find((p) => p.key === provider)?.desc}
              </div>
            </div>
          </div>

          {/* 패널 콘텐츠 */}
          <div style={{ flex: 1, overflow: "auto", padding: "16px 18px" }}>
            {provider === "github" && (
              <GitHubImportPanel
                onComplete={({ projectId }) => { void handleComplete(projectId); }}
                onCancel={() => closeWindow("git-import")}
              />
            )}
            {provider === "gitlab" && (
              <GitLabImportPanel
                onComplete={({ projectId }) => { void handleComplete(projectId); }}
                onCancel={() => closeWindow("git-import")}
              />
            )}
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
