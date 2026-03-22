import type { ReactElement } from "react";
import { useRef, useState } from "react";
import type { DirectiveTemplateItem } from "../../api/organization-projects";
import type { I18nContextValue } from "../../i18n";

const DIRECTIVE_ICON_SVG: Record<string, ReactElement> = {
  "🚀": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  "🏗️": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="6" height="18"/><rect x="16" y="3" width="6" height="18"/><path d="M8 12h8"/><path d="M8 7h8"/><path d="M8 17h8"/></svg>,
  "📱": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  "🔌": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13H4a2 2 0 0 1-2-2V7h20v4a2 2 0 0 1-2 2h-2"/><rect x="6" y="13" width="12" height="4" rx="2"/></svg>,
  "🎨": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  "🤖": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M9 6V4"/><path d="M15 6V4"/><path d="M9 20v2"/><path d="M15 20v2"/></svg>,
  "📦": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.5 2.5 8 4.5v9l-8 4.5-8-4.5v-9z"/><path d="m12.5 2.5v18"/><path d="m20.5 7-8 4.5L4.5 7"/></svg>,
  "⚙️": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  "🏢": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  "🔬": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg>,
};

function DirectiveIcon({ icon, size = 14 }: { icon: string; size?: number }) {
  const svg = DIRECTIVE_ICON_SVG[icon];
  if (svg) return <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, width: size, height: size }}>{svg}</span>;
  return <span style={{ fontSize: size - 2 }}>{icon}</span>;
}

interface DirectiveEditorStepProps {
  directive: string;
  directiveTypeSlug: string | null;
  templates: DirectiveTemplateItem[];
  onDirectiveChange: (value: string) => void;
  onTemplateLoad: (tpl: DirectiveTemplateItem) => void;
  t: I18nContextValue["t"];
}

export default function DirectiveEditorStep({
  directive,
  directiveTypeSlug,
  templates,
  onDirectiveChange,
  onTemplateLoad,
  t,
}: DirectiveEditorStepProps) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      setFileError(t({ ko: ".md 또는 .txt 파일만 지원", en: "Only .md or .txt files", ja: ".mdまたは.txtのみ", zh: "仅支持 .md 或 .txt" }));
      return;
    }
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") onDirectiveChange(text);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const currentTemplate = templates.find((tpl) => tpl.slug === directiveTypeSlug);
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  return (
    <div className="space-y-4">
      {/* Toolbar row */}
      <div className="flex items-center gap-2">
        {/* Current template badge */}
        {currentTemplate && (
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            style={{
              padding: "6px 12px",
              borderLeft: `3px solid ${currentTemplate.color}`,
              background: `${currentTemplate.color}08`,
            }}
          >
            <DirectiveIcon icon={currentTemplate.icon} size={14} />
            <span style={{ ...mono, fontSize: "11px", fontWeight: 600, color: currentTemplate.color }}>
              {currentTemplate.name_ko}
            </span>
          </div>
        )}
        {!currentTemplate && <div className="flex-1" />}

        {/* File import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 transition-colors"
          style={{
            ...mono, fontSize: "10px", padding: "5px 10px",
            border: "1px solid var(--th-border)",
            background: "transparent",
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          .md
        </button>

        {/* Template loader */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="flex items-center gap-1 transition-colors"
            style={{
              ...mono, fontSize: "10px", padding: "5px 10px",
              border: `1px solid ${showTemplateMenu ? "var(--th-accent)" : "var(--th-border)"}`,
              background: "transparent",
              color: showTemplateMenu ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
            }}
          >
            {t({ ko: "템플릿", en: "Templates", ja: "テンプレート", zh: "模板" })}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showTemplateMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showTemplateMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 w-60"
              style={{
                border: "1px solid var(--th-border)",
                background: "var(--th-bg-elevated)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {templates.map((tpl) => (
                <button
                  key={tpl.slug}
                  type="button"
                  onClick={() => {
                    onTemplateLoad(tpl);
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left flex items-center gap-3 transition-colors"
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--th-border)",
                    background: tpl.slug === directiveTypeSlug ? "rgba(245,158,11,0.06)" : "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--th-hover-overlay-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = tpl.slug === directiveTypeSlug ? "rgba(245,158,11,0.06)" : "transparent"; }}
                >
                  <DirectiveIcon icon={tpl.icon} />
                  <div className="flex-1 min-w-0">
                    <div style={{ ...mono, fontSize: "11px", color: tpl.slug === directiveTypeSlug ? "var(--th-accent)" : "var(--th-text-primary)" }}>
                      {tpl.name_ko}
                    </div>
                    <div className="truncate" style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", marginTop: 1 }}>
                      {tpl.description_ko}
                    </div>
                  </div>
                  {tpl.slug === directiveTypeSlug && (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: "var(--th-accent)" }}>
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={directive}
        onChange={(e) => onDirectiveChange(e.target.value)}
        placeholder={t({
          ko: "## 기술스택\n- 언어: TypeScript\n- 프레임워크: React + Express\n- DB: PostgreSQL\n\n## 작업 원칙\n- 이 프로젝트에서 에이전트가 지켜야 할 규칙\n\n## 태스크 분해\n- 큰 목표를 어떻게 쪼갤지\n\n## 품질 기준\n- 어디까지가 '완료'인지",
          en: "## Tech Stack\n- Language: TypeScript\n- Framework: React + Express\n- DB: PostgreSQL\n\n## Work Principles\n- Rules agents should follow\n\n## Task Decomposition\n- How to break down goals\n\n## Quality Criteria\n- Definition of done",
          ja: "## 技術スタック\n- 言語: TypeScript\n- フレームワーク: React + Express\n- DB: PostgreSQL\n\n## 作業原則\n- エージェントが守るべきルール\n\n## タスク分解\n- 目標の分割方法\n\n## 品質基準\n- 完了の定義",
          zh: "## 技术栈\n- 语言: TypeScript\n- 框架: React + Express\n- 数据库: PostgreSQL\n\n## 工作原则\n- 代理应遵循的规则\n\n## 任务分解\n- 如何拆解目标\n\n## 质量标准\n- 完成的定义",
        })}
        spellCheck={false}
        className="w-full resize-none focus:outline-none"
        style={{
          ...mono,
          fontSize: "11px",
          lineHeight: "1.7",
          padding: "16px",
          border: "1px solid var(--th-border)",
          background: "var(--th-bg-elevated)",
          color: "var(--th-text-primary)",
          minHeight: "300px",
          maxHeight: "400px",
        }}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <span style={{ ...mono, fontSize: "10px", color: fileError ? "#fb7185" : "var(--th-text-muted)" }}>
          {fileError ?? t({
            ko: "비워두면 디렉티브 없이 진행",
            en: "Leave empty to skip",
            ja: "空のままで進行",
            zh: "留空则跳过",
          })}
        </span>
        <span style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)" }}>
          {directive.length.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
}
