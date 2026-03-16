import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../i18n";
import {
  getProjectTemplates,
  createProjectTemplate,
  deleteProjectTemplate,
  type ProjectTemplate,
} from "../../api/organization-projects";
import { getTaskTemplates, deleteTaskTemplate, type TaskTemplate } from "../../api/task-templates";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

type Tab = "project" | "task";

interface NewProjectTemplateForm {
  name: string;
  description: string;
  category: string;
  core_goal_template: string;
  objectives: string[];
  gates: Array<{ title: string; gate_type: string }>;
}

const EMPTY_FORM: NewProjectTemplateForm = {
  name: "",
  description: "",
  category: "custom",
  core_goal_template: "",
  objectives: [""],
  gates: [],
};

const CATEGORY_OPTIONS = [
  { value: "custom",              ko: "커스텀",         en: "Custom" },
  { value: "web_application",    ko: "웹 애플리케이션", en: "Web Application" },
  { value: "research",           ko: "리서치",          en: "Research" },
  { value: "video_production",   ko: "영상 제작",       en: "Video Production" },
  { value: "data_analysis",      ko: "데이터 분석",     en: "Data Analysis" },
];

const GATE_TYPE_OPTIONS = [
  { value: "review",    ko: "리뷰",    en: "Review" },
  { value: "approval",  ko: "승인",    en: "Approval" },
  { value: "qa",        ko: "QA",      en: "QA" },
  { value: "milestone", ko: "마일스톤", en: "Milestone" },
];

function categoryLabel(cat: string, isKo: boolean): string {
  const found = CATEGORY_OPTIONS.find((c) => c.value === cat);
  if (!found) return cat;
  return isKo ? found.ko : found.en;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" }).format(new Date(ts));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", padding: "5px 14px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      {children}
    </div>
  );
}

// ── Project Template card ──────────────────────────────────────────────
function ProjectTemplateCard({
  tpl, isKo, onDelete, deleting,
}: {
  tpl: ProjectTemplate;
  isKo: boolean;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const catLabel = categoryLabel(tpl.category, isKo);

  return (
    <div style={{ borderBottom: "1px solid var(--th-border)", borderLeft: "3px solid " + (tpl.is_builtin ? "var(--th-border)" : "var(--th-accent)"), opacity: deleting ? 0.4 : 1 }}>
      {/* header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          ...mono, width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "9px 14px", background: expanded ? "var(--th-bg-elevated)" : "var(--th-bg-primary)",
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 9, color: "var(--th-text-muted)", width: 10, flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>
        {/* builtin badge */}
        {tpl.is_builtin ? (
          <span style={{ ...mono, fontSize: 8, fontWeight: 700, padding: "1px 5px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", letterSpacing: "0.08em", flexShrink: 0 }}>BUILT-IN</span>
        ) : (
          <span style={{ ...mono, fontSize: 8, fontWeight: 700, padding: "1px 5px", border: "1px solid rgba(245,158,11,0.4)", color: "var(--th-accent)", background: "rgba(245,158,11,0.08)", letterSpacing: "0.08em", flexShrink: 0 }}>CUSTOM</span>
        )}
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--th-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.name}</span>
        <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0, marginRight: 8 }}>{catLabel}</span>
        <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", width: 90, flexShrink: 0 }}>
          {tpl.objectives.length} obj · {tpl.gates.length} gate
        </span>
        {!tpl.is_builtin && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(tpl.id); }}
            disabled={deleting}
            style={{ ...mono, fontSize: 9, padding: "2px 6px", border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", flexShrink: 0 }}
          >
            {isKo ? "삭제" : "Delete"}
          </button>
        )}
      </button>

      {expanded && (
        <div style={{ padding: "8px 14px 10px 27px", borderTop: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
          {tpl.description && (
            <p style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 8 }}>{tpl.description}</p>
          )}
          {tpl.core_goal_template && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ ...mono, fontSize: 9, color: "var(--th-accent)", fontWeight: 700, marginRight: 6 }}>GOAL TEMPLATE</span>
              <span style={{ ...mono, fontSize: 10, color: "var(--th-text-secondary)" }}>{tpl.core_goal_template}</span>
            </div>
          )}
          {tpl.objectives.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: "var(--th-text-muted)", marginBottom: 3 }}>{isKo ? "목표" : "OBJECTIVES"}</div>
              {tpl.objectives.map((obj, i) => (
                <div key={obj.id} style={{ ...mono, fontSize: 10, color: "var(--th-text-secondary)", padding: "1px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--th-text-muted)", width: 16, flexShrink: 0 }}>{i + 1}.</span>
                  <span>{obj.title}</span>
                </div>
              ))}
            </div>
          )}
          {tpl.gates.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: "var(--th-text-muted)", marginBottom: 3 }}>{isKo ? "게이트" : "GATES"}</div>
              {tpl.gates.map((gate) => (
                <div key={gate.id} style={{ ...mono, fontSize: 10, color: "var(--th-text-secondary)", padding: "1px 0", display: "flex", gap: 6 }}>
                  <span style={{ ...mono, fontSize: 8, padding: "1px 4px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", flexShrink: 0, alignSelf: "center" }}>{gate.gate_type}</span>
                  <span>{gate.title}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 8, opacity: 0.5 }}>{formatDate(tpl.created_at)}</div>
        </div>
      )}
    </div>
  );
}

// ── New Project Template form ──────────────────────────────────────────
function NewTemplateForm({
  isKo, onSave, onCancel,
}: {
  isKo: boolean;
  onSave: (form: NewProjectTemplateForm) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NewProjectTemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof NewProjectTemplateForm>(key: K, val: NewProjectTemplateForm[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const inputStyle: React.CSSProperties = { ...mono, fontSize: 11, padding: "4px 8px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none", width: "100%" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} style={{ padding: "14px 16px", background: "var(--th-bg-elevated)", borderBottom: "1px solid var(--th-border)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: "var(--th-accent)", marginBottom: 2 }}>
        $ {isKo ? "새 프로젝트 템플릿 생성" : "Create Project Template"}
      </div>

      {/* name + category row */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{isKo ? "이름 *" : "Name *"}</label>
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder={isKo ? "템플릿 이름" : "Template name"} required style={inputStyle} />
        </div>
        <div style={{ width: 160, display: "flex", flexDirection: "column", gap: 3 }}>
          <label style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{isKo ? "카테고리" : "Category"}</label>
          <select value={form.category} onChange={(e) => setField("category", e.target.value)} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{isKo ? c.ko : c.en}</option>)}
          </select>
        </div>
      </div>

      {/* description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <label style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{isKo ? "설명" : "Description"}</label>
        <input value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder={isKo ? "프로젝트 템플릿 설명" : "Template description"} style={inputStyle} />
      </div>

      {/* core goal template */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <label style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{isKo ? "목표 템플릿 (선택)" : "Goal Template (optional)"}</label>
        <input value={form.core_goal_template} onChange={(e) => setField("core_goal_template", e.target.value)} placeholder={isKo ? "예: {프로젝트명}을 위한 웹 앱 개발" : "e.g. Build a web app for {project_name}"} style={inputStyle} />
      </div>

      {/* objectives */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{isKo ? "목표 (Objectives)" : "Objectives"}</label>
          <button type="button" onClick={() => setField("objectives", [...form.objectives, ""])} style={{ ...mono, fontSize: 9, padding: "1px 6px", border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 3 }}>+ {isKo ? "추가" : "Add"}</button>
        </div>
        {form.objectives.map((obj, i) => (
          <div key={i} style={{ display: "flex", gap: 4 }}>
            <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", alignSelf: "center", width: 16, flexShrink: 0 }}>{i + 1}.</span>
            <input
              value={obj}
              onChange={(e) => {
                const next = [...form.objectives];
                next[i] = e.target.value;
                setField("objectives", next);
              }}
              placeholder={isKo ? "목표 입력..." : "Objective..."}
              style={{ ...inputStyle, flex: 1 }}
            />
            {form.objectives.length > 1 && (
              <button type="button" onClick={() => setField("objectives", form.objectives.filter((_, j) => j !== i))} style={{ ...mono, fontSize: 9, padding: "2px 6px", border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#f87171", cursor: "pointer", borderRadius: 3, flexShrink: 0 }}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* gates */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{isKo ? "게이트 (Gates)" : "Gates"}</label>
          <button type="button" onClick={() => setField("gates", [...form.gates, { title: "", gate_type: "review" }])} style={{ ...mono, fontSize: 9, padding: "1px 6px", border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 3 }}>+ {isKo ? "추가" : "Add"}</button>
        </div>
        {form.gates.map((gate, i) => (
          <div key={i} style={{ display: "flex", gap: 4 }}>
            <select
              value={gate.gate_type}
              onChange={(e) => {
                const next = [...form.gates];
                next[i] = { ...next[i], gate_type: e.target.value };
                setField("gates", next);
              }}
              style={{ ...inputStyle, width: 90, flexShrink: 0, cursor: "pointer" }}
            >
              {GATE_TYPE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{isKo ? g.ko : g.en}</option>)}
            </select>
            <input
              value={gate.title}
              onChange={(e) => {
                const next = [...form.gates];
                next[i] = { ...next[i], title: e.target.value };
                setField("gates", next);
              }}
              placeholder={isKo ? "게이트 제목..." : "Gate title..."}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" onClick={() => setField("gates", form.gates.filter((_, j) => j !== i))} style={{ ...mono, fontSize: 9, padding: "2px 6px", border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#f87171", cursor: "pointer", borderRadius: 3, flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
        <button type="button" onClick={onCancel} style={{ ...mono, fontSize: 10, padding: "4px 12px", border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer", borderRadius: 4 }}>
          {isKo ? "취소" : "Cancel"}
        </button>
        <button type="submit" disabled={saving || !form.name.trim()} style={{ ...mono, fontSize: 10, fontWeight: 700, padding: "4px 12px", border: "1px solid rgba(245,158,11,0.4)", background: saving ? "transparent" : "rgba(245,158,11,0.12)", color: saving ? "var(--th-text-muted)" : "var(--th-accent)", cursor: saving ? "not-allowed" : "pointer", borderRadius: 4 }}>
          {saving ? "..." : isKo ? "저장" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function TemplatesLibrary() {
  const { language } = useI18n();
  const isKo = language === "ko";

  const [activeTab, setActiveTab] = useState<Tab>("project");
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pt, tt] = await Promise.all([getProjectTemplates(), getTaskTemplates()]);
      setProjectTemplates(pt);
      setTaskTemplates(tt);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const handleCreateProjectTemplate = useCallback(async (form: NewProjectTemplateForm) => {
    const objectives = form.objectives.filter((o) => o.trim()).map((title) => ({ title }));
    const gates = form.gates.filter((g) => g.title.trim()).map((g) => ({ title: g.title, gate_type: g.gate_type }));
    await createProjectTemplate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      core_goal_template: form.core_goal_template.trim() || undefined,
      objectives,
      gates,
    });
    setShowCreateForm(false);
    void loadAll();
  }, [loadAll]);

  const handleDeleteProjectTemplate = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProjectTemplate(id);
      setProjectTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleDeleteTaskTemplate = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTaskTemplate(id);
      setTaskTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const builtinPT = projectTemplates.filter((t) => t.is_builtin);
  const customPT  = projectTemplates.filter((t) => !t.is_builtin);

  return (
    <div style={{ ...mono, display: "flex", flexDirection: "column", background: "var(--th-bg-primary)", height: "100%" }}>
      {/* ── 헤더 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", padding: "12px 18px", background: "var(--th-bg-panel)", display: "flex", alignItems: "center", gap: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
        <span style={{ fontSize: "11px", color: "var(--th-text-secondary)" }}>ls templates/</span>
        {!loading && (
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.6 }}>
            {projectTemplates.length} project · {taskTemplates.length} task
          </span>
        )}
      </div>

      {/* ── 탭 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", padding: "4px 12px", background: "var(--th-bg-primary)", display: "flex", gap: 4 }}>
        {(["project", "task"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              ...mono, fontSize: 9, fontWeight: 700, padding: "2px 10px", borderRadius: 4,
              border: `1px solid ${activeTab === tab ? "rgba(245,158,11,0.5)" : "var(--th-border)"}`,
              background: activeTab === tab ? "rgba(245,158,11,0.08)" : "transparent",
              color: activeTab === tab ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer", letterSpacing: "0.06em",
            }}
          >
            {tab === "project" ? (isKo ? "프로젝트 템플릿" : "PROJECT") : (isKo ? "태스크 템플릿" : "TASK")}
          </button>
        ))}
      </div>

      {/* ── 컨텐츠 ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 44, borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", opacity: 0.3, borderLeft: "3px solid var(--th-border)" }} />
            ))}
          </div>
        ) : activeTab === "project" ? (
          <>
            {/* ── 커스텀 + 생성 폼 ── */}
            <div style={{ borderBottom: "1px solid var(--th-border)", padding: "5px 14px", background: "var(--th-bg-primary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                {isKo ? `커스텀 (${customPT.length})` : `CUSTOM (${customPT.length})`}
              </span>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  style={{ ...mono, fontSize: 9, fontWeight: 700, padding: "2px 8px", border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)", color: "var(--th-accent)", cursor: "pointer", borderRadius: 3 }}
                >
                  + {isKo ? "새 템플릿" : "New Template"}
                </button>
              )}
            </div>

            {showCreateForm && (
              <NewTemplateForm
                isKo={isKo}
                onSave={handleCreateProjectTemplate}
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            {customPT.length === 0 && !showCreateForm && (
              <div style={{ ...mono, padding: "16px 18px", fontSize: 10, color: "var(--th-text-muted)", opacity: 0.5 }}>
                {isKo ? "커스텀 템플릿 없음 — 위의 + 버튼으로 생성하세요" : "No custom templates — click + New Template to create one"}
              </div>
            )}
            {customPT.map((tpl) => (
              <ProjectTemplateCard key={tpl.id} tpl={tpl} isKo={isKo} onDelete={(id) => { void handleDeleteProjectTemplate(id); }} deleting={deletingId === tpl.id} />
            ))}

            {/* ── 빌트인 ── */}
            <SectionLabel>{isKo ? `빌트인 (${builtinPT.length})` : `BUILT-IN (${builtinPT.length})`}</SectionLabel>
            {builtinPT.map((tpl) => (
              <ProjectTemplateCard key={tpl.id} tpl={tpl} isKo={isKo} onDelete={() => {}} deleting={false} />
            ))}
          </>
        ) : (
          /* ── Task Templates tab ── */
          <>
            <SectionLabel>
              {isKo ? `저장된 태스크 템플릿 (${taskTemplates.length})` : `SAVED TASK TEMPLATES (${taskTemplates.length})`}
            </SectionLabel>
            {taskTemplates.length === 0 ? (
              <div style={{ ...mono, padding: "16px 18px", fontSize: 10, color: "var(--th-text-muted)", opacity: 0.5 }}>
                {isKo ? "저장된 태스크 템플릿 없음 — 태스크 생성 모달에서 SAVE 버튼으로 추가하세요" : "No saved task templates — use the SAVE button in Create Task modal to add one"}
              </div>
            ) : (
              <>
                {/* column header */}
                <div style={{ ...mono, display: "flex", alignItems: "center", padding: "4px 14px", borderBottom: "1px solid var(--th-border)", gap: 8 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", flex: 1 }}>NAME</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 160 }}>TITLE</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 70 }}>TYPE</span>
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 30 }}>P</span>
                  <span style={{ width: 52, flexShrink: 0 }} />
                </div>
                {taskTemplates.map((tpl) => (
                  <div key={tpl.id} style={{ ...mono, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent)", opacity: deletingId === tpl.id ? 0.4 : 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.name}</span>
                    <span style={{ fontSize: 10, color: "var(--th-text-secondary)", width: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.title || "—"}</span>
                    <span style={{ fontSize: 9, color: "var(--th-text-muted)", width: 70 }}>{tpl.task_type}</span>
                    <span style={{ fontSize: 9, color: "var(--th-text-muted)", width: 30 }}>{tpl.priority}</span>
                    <button
                      type="button"
                      onClick={() => { void handleDeleteTaskTemplate(tpl.id); }}
                      disabled={deletingId === tpl.id}
                      style={{ ...mono, fontSize: 9, padding: "2px 6px", border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer", flexShrink: 0, width: 52 }}
                    >
                      {isKo ? "삭제" : "Delete"}
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
