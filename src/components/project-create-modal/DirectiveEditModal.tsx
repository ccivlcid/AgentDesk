import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "../ui";
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

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  return (
    <Modal open onClose={() => setEditDirectiveProjectId(null)} width="lg">
      <ModalHeader onClose={() => setEditDirectiveProjectId(null)}>
        <span style={mono}>
          {t({ ko: "프로젝트 디렉티브", en: "Project Directive", ja: "プロジェクトディレクティブ", zh: "项目指令" })}
        </span>
        <span className="ml-2 text-xs" style={{ color: "var(--th-text-muted)" }}>
          — {project.name}
        </span>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px]" style={{ ...mono, color: "var(--th-text-muted)" }}>
              {t({
                ko: "에이전트가 이 프로젝트에서 지켜야 할 규칙을 정의합니다. 태스크 실행 시 프롬프트에 주입됩니다.",
                en: "Define rules for agents on this project. Injected into prompts during task execution.",
                ja: "このプロジェクトでのエージェントルールを定義します。タスク実行時にプロンプトに注入されます。",
                zh: "定义此项目的代理规则。在任务执行期间注入到提示中。",
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
                {t({ ko: "템플릿 불러오기 ▾", en: "Load template ▾", ja: "テンプレート読込 ▾", zh: "加载模板 ▾" })}
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
                        <span style={{ color: "var(--th-accent)", fontSize: "10px" }}>✓</span>
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
              style={{ border: `1px solid ${currentTemplate.color}44`, background: `${currentTemplate.color}11`, color: currentTemplate.color }}
            >
              <span>{currentTemplate.icon}</span>
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
              lineHeight: "1.6",
              padding: "12px",
              border: "1px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
              color: "var(--th-text-primary)",
              minHeight: "360px",
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
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={() => setEditDirectiveProjectId(null)}>
          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
        </Button>
        <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving
            ? t({ ko: "저장 중…", en: "Saving…", ja: "保存中…", zh: "保存中…" })
            : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
