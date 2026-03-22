import { useCallback, useEffect, useState } from "react";
import type { TFunction } from "./types";
import {
  fetchProjectTypeTemplates,
  createProjectTypeTemplate,
  updateProjectTypeTemplate,
  deleteProjectTypeTemplate,
} from "../../api/project-type-templates";
import type { ProjectTypeTemplate } from "../../api/project-type-templates";
import { useConfirm } from "../ui/ConfirmDialog";

interface ProjectTypeTemplatesTabProps {
  t: TFunction;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const EMPTY_FORM = {
  name: "",
  name_ko: "",
  name_ja: "",
  name_zh: "",
  description: "",
  default_directive: "",
  placeholder_goal: "",
  recommended_agent_count: 3,
  tags: "",
};

type FormState = typeof EMPTY_FORM;

/* ── Icons (inline SVG, no emoji) ── */
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const ChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  fontWeight: 600,
  color: "var(--th-text-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  ...mono,
  fontSize: 11,
  padding: "6px 8px",
  background: "var(--th-bg-surface)",
  border: "1px solid var(--th-border)",
  borderRadius: 4,
  color: "var(--th-text-primary)",
  width: "100%",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 60,
  resize: "vertical" as const,
};

const btnBase: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  padding: "5px 10px",
  border: "1px solid var(--th-border)",
  borderRadius: 4,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

export default function ProjectTypeTemplatesTab({ t }: ProjectTypeTemplatesTabProps) {
  const { confirm } = useConfirm();
  const [templates, setTemplates] = useState<ProjectTypeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchProjectTypeTemplates();
      setTemplates(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createProjectTypeTemplate({
        name: form.name.trim(),
        name_ko: form.name_ko.trim() || null,
        name_ja: form.name_ja.trim() || null,
        name_zh: form.name_zh.trim() || null,
        description: form.description.trim() || null,
        default_directive: form.default_directive.trim() || null,
        placeholder_goal: form.placeholder_goal.trim() || null,
        recommended_agent_count: form.recommended_agent_count,
        tags: form.tags.trim() || null,
      });
      setForm({ ...EMPTY_FORM });
      setShowAddForm(false);
      await load();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const handleUpdate = useCallback(async () => {
    if (!editingId || !form.name.trim()) return;
    setSaving(true);
    try {
      await updateProjectTypeTemplate(editingId, {
        name: form.name.trim(),
        name_ko: form.name_ko.trim() || null,
        name_ja: form.name_ja.trim() || null,
        name_zh: form.name_zh.trim() || null,
        description: form.description.trim() || null,
        default_directive: form.default_directive.trim() || null,
        placeholder_goal: form.placeholder_goal.trim() || null,
        recommended_agent_count: form.recommended_agent_count,
        tags: form.tags.trim() || null,
      });
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      await load();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [editingId, form, load]);

  const handleDelete = useCallback(
    async (tpl: ProjectTypeTemplate) => {
      const ok = await confirm({
        title: t({ ko: "프로젝트 유형 삭제", en: "Delete Project Type", ja: "プロジェクトタイプ削除", zh: "删除项目类型" }),
        message: t({
          ko: `"${tpl.name}" 유형을 삭제하시겠습니까?`,
          en: `Delete "${tpl.name}" type?`,
          ja: `「${tpl.name}」タイプを削除しますか？`,
          zh: `删除"${tpl.name}"类型？`,
        }),
        confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
        cancelLabel: t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
        variant: "danger",
      });
      if (!ok) return;
      try {
        await deleteProjectTypeTemplate(tpl.id);
        await load();
      } catch {
        /* ignore */
      }
    },
    [confirm, t, load],
  );

  const startEdit = useCallback((tpl: ProjectTypeTemplate) => {
    setEditingId(tpl.id);
    setShowAddForm(false);
    setForm({
      name: tpl.name,
      name_ko: tpl.name_ko ?? "",
      name_ja: tpl.name_ja ?? "",
      name_zh: tpl.name_zh ?? "",
      description: tpl.description ?? "",
      default_directive: tpl.default_directive ?? "",
      placeholder_goal: tpl.placeholder_goal ?? "",
      recommended_agent_count: tpl.recommended_agent_count,
      tags: tpl.tags ?? "",
    });
    setExpandedId(tpl.id);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setShowAddForm(false);
    setForm({ ...EMPTY_FORM });
  }, []);

  const startAdd = useCallback(() => {
    setShowAddForm(true);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setExpandedId(null);
  }, []);

  const updateField = useCallback((key: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (loading) {
    return (
      <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: 20, textAlign: "center" }}>
        {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-primary)" }}>
            {t({ ko: "프로젝트 유형 템플릿", en: "Project Type Templates", ja: "プロジェクトタイプテンプレート", zh: "项目类型模板" })}
          </div>
          <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
            {t({
              ko: "프로젝트 생성 시 사용할 유형 템플릿을 관리합니다",
              en: "Manage type templates used when creating projects",
              ja: "プロジェクト作成時に使用するタイプテンプレートを管理",
              zh: "管理创建项目时使用的类型模板",
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={startAdd}
          style={{
            ...btnBase,
            background: "var(--th-accent)",
            color: "var(--th-bg-primary)",
            border: "none",
            fontWeight: 600,
          }}
        >
          <PlusIcon />
          {t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div
          style={{
            background: "var(--th-bg-surface)",
            border: "1px solid var(--th-accent)",
            borderRadius: 6,
            padding: 14,
          }}
        >
          <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "var(--th-accent)", marginBottom: 10 }}>
            {t({ ko: "새 프로젝트 유형", en: "New Project Type", ja: "新しいプロジェクトタイプ", zh: "新项目类型" })}
          </div>
          <TemplateForm form={form} onChange={updateField} t={t} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !form.name.trim()}
              style={{
                ...btnBase,
                background: "var(--th-accent)",
                color: "var(--th-bg-primary)",
                border: "none",
                fontWeight: 600,
                opacity: saving || !form.name.trim() ? 0.5 : 1,
              }}
            >
              {saving
                ? t({ ko: "저장 중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })
                : t({ ko: "생성", en: "Create", ja: "作成", zh: "创建" })}
            </button>
            <button type="button" onClick={cancelEdit} style={{ ...btnBase, background: "transparent", color: "var(--th-text-muted)" }}>
              {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {templates.map((tpl) => {
          const isExpanded = expandedId === tpl.id;
          const isEditing = editingId === tpl.id;
          const isDefault = !!tpl.is_default;

          return (
            <div
              key={tpl.id}
              style={{
                background: "var(--th-bg-surface)",
                border: `1px solid ${isEditing ? "var(--th-accent)" : "var(--th-border)"}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              {/* Row header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  cursor: "pointer",
                  gap: 8,
                }}
                onClick={() => {
                  if (!isEditing) setExpandedId(isExpanded ? null : tpl.id);
                }}
              >
                <span style={{ color: "var(--th-text-muted)" }}>
                  {isExpanded ? <ChevronUp /> : <ChevronDown />}
                </span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)", flex: 1 }}>
                  {tpl.name}
                  {tpl.name_ko ? (
                    <span style={{ color: "var(--th-text-muted)", fontWeight: 400, marginLeft: 6, fontSize: 10 }}>
                      {tpl.name_ko}
                    </span>
                  ) : null}
                </span>
                {isDefault && (
                  <span
                    style={{
                      ...mono,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 9,
                      color: "var(--th-text-muted)",
                      background: "var(--th-bg-primary)",
                      padding: "2px 6px",
                      borderRadius: 3,
                      letterSpacing: "0.04em",
                    }}
                  >
                    <LockIcon />
                    {t({ ko: "기본", en: "DEFAULT", ja: "デフォルト", zh: "默认" })}
                  </span>
                )}
                {tpl.tags && (
                  <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                    {tpl.tags}
                  </span>
                )}
                {!isEditing && (
                  <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => startEdit(tpl)}
                      style={{ ...btnBase, background: "transparent", color: "var(--th-text-secondary)", border: "none", padding: 4 }}
                      title={t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                    >
                      <EditIcon />
                    </button>
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(tpl)}
                        style={{ ...btnBase, background: "transparent", color: "var(--th-status-error)", border: "none", padding: 4 }}
                        title={t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded detail / edit form */}
              {isExpanded && (
                <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--th-border)" }}>
                  {isEditing ? (
                    <>
                      <div style={{ marginTop: 10 }}>
                        <TemplateForm form={form} onChange={updateField} t={t} />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={handleUpdate}
                          disabled={saving || !form.name.trim()}
                          style={{
                            ...btnBase,
                            background: "var(--th-accent)",
                            color: "var(--th-bg-primary)",
                            border: "none",
                            fontWeight: 600,
                            opacity: saving || !form.name.trim() ? 0.5 : 1,
                          }}
                        >
                          {saving
                            ? t({ ko: "저장 중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })
                            : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                        </button>
                        <button type="button" onClick={cancelEdit} style={{ ...btnBase, background: "transparent", color: "var(--th-text-muted)" }}>
                          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                        </button>
                      </div>
                    </>
                  ) : (
                    <TemplateDetail tpl={tpl} t={t} />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {templates.length === 0 && (
          <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", padding: 20 }}>
            {t({ ko: "프로젝트 유형이 없습니다", en: "No project types yet", ja: "プロジェクトタイプがありません", zh: "暂无项目类型" })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TemplateForm({
  form,
  onChange,
  t,
}: {
  form: FormState;
  onChange: (key: keyof FormState, value: string | number) => void;
  t: TFunction;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Names row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <div>
          <div style={labelStyle}>
            {t({ ko: "이름 (EN)", en: "Name (EN)", ja: "名前 (EN)", zh: "名称 (EN)" })} *
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            style={inputStyle}
            placeholder="e.g. Mobile App"
          />
        </div>
        <div>
          <div style={labelStyle}>
            {t({ ko: "이름 (KO)", en: "Name (KO)", ja: "名前 (KO)", zh: "名称 (KO)" })}
          </div>
          <input
            type="text"
            value={form.name_ko}
            onChange={(e) => onChange("name_ko", e.target.value)}
            style={inputStyle}
            placeholder="e.g. 모바일 앱"
          />
        </div>
        <div>
          <div style={labelStyle}>
            {t({ ko: "이름 (JA)", en: "Name (JA)", ja: "名前 (JA)", zh: "名称 (JA)" })}
          </div>
          <input
            type="text"
            value={form.name_ja}
            onChange={(e) => onChange("name_ja", e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <div style={labelStyle}>
            {t({ ko: "이름 (ZH)", en: "Name (ZH)", ja: "名前 (ZH)", zh: "名称 (ZH)" })}
          </div>
          <input
            type="text"
            value={form.name_zh}
            onChange={(e) => onChange("name_zh", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <div style={labelStyle}>
          {t({ ko: "설명", en: "Description", ja: "説明", zh: "描述" })}
        </div>
        <input
          type="text"
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          style={inputStyle}
          placeholder={t({ ko: "유형에 대한 짧은 설명", en: "Short description of this type", ja: "タイプの簡単な説明", zh: "类型的简短描述" })}
        />
      </div>

      {/* Directive template */}
      <div>
        <div style={labelStyle}>
          {t({ ko: "기본 디렉티브", en: "Default Directive", ja: "デフォルトディレクティブ", zh: "默认指令" })}
        </div>
        <textarea
          value={form.default_directive}
          onChange={(e) => onChange("default_directive", e.target.value)}
          style={textareaStyle}
          placeholder={t({
            ko: "이 유형 선택 시 자동 입력되는 디렉티브",
            en: "Pre-filled directive when this type is selected",
            ja: "このタイプ選択時に自動入力されるディレクティブ",
            zh: "选择此类型时自动填充的指令",
          })}
        />
      </div>

      {/* Goal placeholder */}
      <div>
        <div style={labelStyle}>
          {t({ ko: "목표 힌트 텍스트", en: "Goal Placeholder", ja: "目標ヒントテキスト", zh: "目标提示文本" })}
        </div>
        <input
          type="text"
          value={form.placeholder_goal}
          onChange={(e) => onChange("placeholder_goal", e.target.value)}
          style={inputStyle}
          placeholder={t({ ko: "목표 입력 필드에 보여줄 힌트", en: "Hint text for the goal input field", ja: "目標入力フィールドに表示するヒント", zh: "目标输入字段的提示" })}
        />
      </div>

      {/* Agent count + tags */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
        <div>
          <div style={labelStyle}>
            {t({ ko: "추천 에이전트 수", en: "Recommended Agents", ja: "推奨エージェント数", zh: "推荐代理数量" })}
          </div>
          <input
            type="number"
            min={1}
            max={20}
            value={form.recommended_agent_count}
            onChange={(e) => onChange("recommended_agent_count", Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            style={{ ...inputStyle, width: 80 }}
          />
        </div>
        <div>
          <div style={labelStyle}>
            {t({ ko: "태그 (쉼표 구분)", en: "Tags (comma-separated)", ja: "タグ (カンマ区切り)", zh: "标签（逗号分隔）" })}
          </div>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => onChange("tags", e.target.value)}
            style={inputStyle}
            placeholder="e.g. mobile,ios,android"
          />
        </div>
      </div>
    </div>
  );
}

function TemplateDetail({ tpl, t }: { tpl: ProjectTypeTemplate; t: TFunction }) {
  const row = (label: string, value: string | number | null | undefined) => {
    if (!value && value !== 0) return null;
    return (
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", minWidth: 120, flexShrink: 0, textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ ...mono, fontSize: 11, color: "var(--th-text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {String(value)}
        </span>
      </div>
    );
  };

  return (
    <div style={{ paddingTop: 8 }}>
      {row(t({ ko: "설명", en: "Description", ja: "説明", zh: "描述" }), tpl.description)}
      {row(t({ ko: "디렉티브", en: "Directive", ja: "ディレクティブ", zh: "指令" }), tpl.default_directive)}
      {row(t({ ko: "목표 힌트", en: "Goal hint", ja: "目標ヒント", zh: "目标提示" }), tpl.placeholder_goal)}
      {row(t({ ko: "추천 에이전트", en: "Rec. agents", ja: "推奨エージェント", zh: "推荐代理" }), tpl.recommended_agent_count)}
      {row(t({ ko: "태그", en: "Tags", ja: "タグ", zh: "标签" }), tpl.tags)}
      {row(
        t({ ko: "이름 (KO)", en: "Name (KO)", ja: "名前 (KO)", zh: "名称 (KO)" }),
        tpl.name_ko,
      )}
      {row(
        t({ ko: "이름 (JA)", en: "Name (JA)", ja: "名前 (JA)", zh: "名称 (JA)" }),
        tpl.name_ja,
      )}
      {row(
        t({ ko: "이름 (ZH)", en: "Name (ZH)", ja: "名前 (ZH)", zh: "名称 (ZH)" }),
        tpl.name_zh,
      )}
    </div>
  );
}
