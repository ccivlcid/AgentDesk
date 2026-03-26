import { useState, useEffect } from "react";
import { Button } from "../ui";
import AppWindow from "../windows/AppWindow";
import { useI18n } from "../../i18n";
import { useProjectStore } from "../../store/projectStore";
import { updateProject, fetchDirectiveTemplates, type DirectiveTemplateItem } from "../../api/organization-projects";

export default function DirectiveEditModal() {
  const { t } = useI18n();
  const { editDirectiveProjectId, setEditDirectiveProjectId, projects, setProjects } = useProjectStore();
  const project = projects.find((p) => p.id === editDirectiveProjectId);

  const [directive, setDirective] = useState("");
  const [directiveTypeSlug, setDirectiveTypeSlug] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DirectiveTemplateItem[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setDirective(project.directive ?? "");
      setDirectiveTypeSlug(project.directive_type_slug ?? null);
    }
  }, [project]);

  useEffect(() => {
    if (editDirectiveProjectId) {
      fetchDirectiveTemplates().then(setTemplates).catch(() => {});
    }
  }, [editDirectiveProjectId]);

  if (!editDirectiveProjectId || !project) return null;

  const currentTemplate = templates.find((tpl) => tpl.slug === directiveTypeSlug);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProject(editDirectiveProjectId, {
        directive: directive.trim() || null,
        directive_type_slug: directiveTypeSlug,
      });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setEditDirectiveProjectId(null);
    } catch (err) {
      console.error("Failed to save directive:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => setEditDirectiveProjectId(null);
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const windowIcon = (
    <svg viewBox="0 0 18 18" fill="none" stroke="var(--th-accent)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M3 3h12v12H3z" />
      <path d="M6 7h6M6 10h4" />
    </svg>
  );

  return (
    <AppWindow
      windowType="library"
      title={`${t({ ko: "디렉티브", en: "Directive", ja: "ディレクティブ", zh: "指令" })} — ${project.name}`}
      emoji={windowIcon}
      defaultWidth={720}
      defaultHeight={600}
      onClose={handleClose}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px]" style={{ ...mono, color: "var(--th-text-muted)" }}>
                {t({
                  ko: "에이전트가 이 프로젝트에서 지켜야 할 규칙을 정의합니다.",
                  en: "Define rules for agents on this project.",
                  ja: "このプロジェクトでのエージェントルールを定義します。",
                  zh: "定义此项目的代理规则。",
                })}
              </p>

              {/* Template loader */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  className="px-2 py-1 text-[10px] font-mono"
                  style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)", cursor: "pointer" }}
                >
                  {t({ ko: "템플릿", en: "Templates", ja: "テンプレート", zh: "模板" })}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ display: "inline", marginLeft: 4, transform: showTemplateMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showTemplateMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 z-50 w-56"
                    style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", maxHeight: 280, overflowY: "auto" }}
                  >
                    {templates.map((tpl) => (
                      <button
                        key={tpl.slug}
                        type="button"
                        onClick={() => {
                          setDirective(tpl.template);
                          setDirectiveTypeSlug(tpl.slug);
                          setShowTemplateMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 transition-colors flex items-center gap-2"
                        style={{
                          borderBottom: "1px solid var(--th-border)",
                          background: tpl.slug === directiveTypeSlug ? "rgba(245,158,11,0.08)" : "transparent",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--th-hover-overlay-subtle)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = tpl.slug === directiveTypeSlug ? "rgba(245,158,11,0.08)" : "transparent"; }}
                      >
                        <span className="text-sm">{tpl.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono truncate" style={{ color: tpl.slug === directiveTypeSlug ? "var(--th-accent)" : "var(--th-text-primary)" }}>
                            {tpl.name_ko}
                          </div>
                          <div className="text-[9px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
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

            {/* Current type badge */}
            {currentTemplate && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono"
                style={{ borderLeft: `3px solid ${currentTemplate.color}`, background: `${currentTemplate.color}08`, color: currentTemplate.color }}
              >
                <span className="font-bold">{currentTemplate.name_ko}</span>
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              spellCheck={false}
              className="w-full resize-none focus:outline-none"
              style={{
                ...mono,
                fontSize: "11px",
                lineHeight: "1.7",
                padding: "14px",
                border: "1px solid var(--th-border)",
                background: "var(--th-bg-elevated)",
                color: "var(--th-text-primary)",
                minHeight: "320px",
                maxHeight: "500px",
              }}
            />

            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                {t({ ko: "비워두면 디렉티브 없이 실행됩니다", en: "Leave empty to run without directive", ja: "空ならディレクティブなしで実行", zh: "留空则不使用指令" })}
              </span>
              <span className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                {directive.length.toLocaleString()} chars
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--th-border)", ...mono }}
        >
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving
              ? t({ ko: "저장 중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })
              : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
          </Button>
        </div>
      </div>
    </AppWindow>
  );
}
