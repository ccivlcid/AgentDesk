import { useState, useEffect } from "react";
import type { Category, Project } from "../../types";
import type { TFunction } from "./types";

interface ProjectSettingsTabProps {
  project: Project;
  categories: Category[];
  t: TFunction;
  onUpdate: (patch: { name?: string; core_goal?: string }) => Promise<void>;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

export default function ProjectSettingsTab({ project, categories, t, onUpdate }: ProjectSettingsTabProps) {
  const [name, setName] = useState(project.name);
  const [coreGoal, setCoreGoal] = useState(project.core_goal ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setName(project.name);
    setCoreGoal(project.core_goal ?? "");
  }, [project.id, project.name, project.core_goal]);

  const isDirty = name !== project.name || coreGoal !== (project.core_goal ?? "");

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await onUpdate({ name: name.trim() || project.name, core_goal: coreGoal });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPath = () => {
    void navigator.clipboard.writeText(project.project_path ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const category = categories.find((c) => c.id === project.category_id);

  return (
    <div className="flex flex-col gap-5">
      {/* Project badge */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", borderRadius: "4px" }}
      >
        <span style={{ fontSize: 28 }}>{"📁"}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold font-mono truncate" style={{ color: "var(--th-text-heading)" }}>
            {project.name}
          </p>
          <p className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "현재 선택된 프로젝트", en: "Currently selected project", ja: "現在選択中のプロジェクト", zh: "当前选择的项目" })}
          </p>
        </div>
        {category && (
          <span
            className="ml-auto text-[10px] font-mono px-2 py-0.5 shrink-0"
            style={{
              background: `${category.color ?? "var(--th-accent)"}18`,
              border: `1px solid ${category.color ?? "var(--th-accent)"}40`,
              color: category.color ?? "var(--th-accent)",
              borderRadius: "2px",
            }}
          >
            {category.icon} {category.name}
          </span>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium font-mono mb-1.5" style={{ color: "var(--th-text-secondary)" }}>
          {t({ ko: "프로젝트 이름", en: "Project Name", ja: "プロジェクト名", zh: "项目名称" })}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm font-mono outline-none"
          style={{
            borderRadius: "2px",
            border: "1px solid var(--th-border)",
            background: "var(--th-input-bg)",
            color: "var(--th-text-primary)",
          }}
        />
      </div>

      {/* Path */}
      <div>
        <label className="block text-xs font-medium font-mono mb-1.5" style={{ color: "var(--th-text-secondary)" }}>
          {t({ ko: "프로젝트 경로", en: "Project Path", ja: "プロジェクトパス", zh: "项目路径" })}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={project.project_path ?? ""}
            readOnly
            className="flex-1 px-3 py-2 text-sm font-mono outline-none"
            style={{
              borderRadius: "2px",
              border: "1px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
              color: "var(--th-text-muted)",
            }}
          />
          <button
            type="button"
            onClick={handleCopyPath}
            className="px-3 py-2 text-xs font-mono transition-colors"
            style={{
              borderRadius: "2px",
              border: "1px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
              color: copied ? "var(--th-attr-elite)" : "var(--th-text-muted)",
            }}
          >
            {copied
              ? t({ ko: "복사됨 ✓", en: "Copied ✓", ja: "コピー済み ✓", zh: "已复制 ✓" })
              : t({ ko: "복사", en: "Copy", ja: "コピー", zh: "复制" })}
          </button>
        </div>
      </div>

      {/* Core goal */}
      <div>
        <label className="block text-xs font-medium font-mono mb-1.5" style={{ color: "var(--th-text-secondary)" }}>
          {t({ ko: "핵심 목표", en: "Core Goal", ja: "コアゴール", zh: "核心目标" })}
        </label>
        <textarea
          value={coreGoal}
          onChange={(e) => setCoreGoal(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm font-mono outline-none resize-none"
          placeholder={t({ ko: "프로젝트의 핵심 목표를 입력하세요", en: "Describe the core goal of this project", ja: "プロジェクトのコアゴールを入力してください", zh: "输入项目核心目标" })}
          style={{
            borderRadius: "2px",
            border: "1px solid var(--th-border)",
            background: "var(--th-input-bg)",
            color: "var(--th-text-primary)",
          }}
        />
      </div>

      {/* Dates */}
      <div className="flex gap-4 text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
        <span>
          {t({ ko: "생성일", en: "Created", ja: "作成日", zh: "创建日期" })}: {formatDate(project.created_at)}
        </span>
        {project.updated_at && project.updated_at !== project.created_at && (
          <span>
            {t({ ko: "수정일", en: "Updated", ja: "更新日", zh: "更新日期" })}: {formatDate(project.updated_at)}
          </span>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { void handleSave(); }}
          disabled={!isDirty || saving}
          className="px-4 py-2 text-sm font-mono transition-all"
          style={{
            borderRadius: "2px",
            background: isDirty && !saving ? "var(--th-accent)" : "var(--th-bg-elevated)",
            color: isDirty && !saving ? "#000" : "var(--th-text-muted)",
            border: "1px solid transparent",
            opacity: saving ? 0.7 : 1,
            cursor: isDirty && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saved
            ? t({ ko: "저장됨 ✓", en: "Saved ✓", ja: "保存済み ✓", zh: "已保存 ✓" })
            : saving
            ? t({ ko: "저장 중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })
            : t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
        </button>
      </div>
    </div>
  );
}
