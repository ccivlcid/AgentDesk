import { useState, useEffect } from "react";
import type { Category, Project } from "../../types";
import type { TFunction } from "./types";
import { useConfirm, useToast } from "../ui";
import { deleteProject } from "../../api/organization-projects";

interface ProjectSettingsTabProps {
  project: Project;
  categories: Category[];
  t: TFunction;
  onUpdate: (patch: { name?: string; core_goal?: string }) => Promise<void>;
  onDelete?: (id: string) => void;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

export default function ProjectSettingsTab({ project, categories, t, onUpdate, onDelete }: ProjectSettingsTabProps) {
  const [name, setName] = useState(project.name);
  const [coreGoal, setCoreGoal] = useState(project.core_goal ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const { confirm } = useConfirm();
  const { showToast } = useToast();

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

  const handleDelete = async () => {
    const ok = await confirm({
      title: t({ ko: `"${project.name}" 프로젝트를 삭제할까요?`, en: `Delete project "${project.name}"?`, ja: `「${project.name}」を削除しますか？`, zh: `删除项目"${project.name}"？` }),
      message: t({ ko: "프로젝트와 관련된 모든 업무·목표·결과물이 영구 삭제됩니다.", en: "All tasks, objectives, and outputs will be permanently deleted.", ja: "すべてのタスク・目標・成果物が永久に削除されます。", zh: "所有任务、目标和交付物将被永久删除。" }),
      confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteProject(project.id);
      onDelete?.(project.id);
    } catch {
      showToast(t({ ko: "삭제에 실패했습니다.", en: "Failed to delete project.", ja: "削除に失敗しました。", zh: "删除失败。" }), "error");
    }
  };

  const category = categories.find((c) => c.id === project.category_id);

  return (
    <div className="flex flex-col gap-5">
      {/* Project badge */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", borderRadius: 0 }}
      >
        <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "20px", color: "var(--th-accent)" }}>◈</span>
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
              borderRadius: 0,
            }}
          >
            {category.icon} {category.name}
          </span>
        )}
      </div>

      {/* Name */}
      <div>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
          // {t({ ko: "프로젝트 이름", en: "project name", ja: "プロジェクト名", zh: "项目名称" })}
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm font-mono outline-none"
          style={{
            borderRadius: 0,
            border: "1px solid var(--th-border)",
            background: "var(--th-input-bg)",
            color: "var(--th-text-primary)",
          }}
        />
      </div>

      {/* Path */}
      <div>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
          // {t({ ko: "프로젝트 경로", en: "project path", ja: "プロジェクトパス", zh: "项目路径" })}
        </div>
        <p className="text-[10px] font-mono mb-1.5" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "AI 에이전트가 작업할 실제 폴더 경로입니다. (생성 후 변경 불가)", en: "The actual folder where the AI agent will work. (Cannot be changed after creation)", ja: "AIエージェントが作業するフォルダパスです。(作成後に変更不可)", zh: "AI 代理工作的实际文件夹路径（创建后不可更改）" })}
        </p>
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={project.project_path ?? ""}
            readOnly
            className="flex-1 min-h-[2.5rem] px-3 py-2 text-sm font-mono outline-none"
            style={{
              borderRadius: 0,
              border: "1px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
              color: "var(--th-text-muted)",
            }}
          />
          <button
            type="button"
            onClick={handleCopyPath}
            className="flex-shrink-0 inline-flex items-center justify-center min-h-[2.5rem] px-3 py-2 text-xs font-mono leading-normal whitespace-nowrap transition-colors"
            style={{
              borderRadius: 0,
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
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
          // {t({ ko: "핵심 목표", en: "core goal", ja: "コアゴール", zh: "核心目标" })}
        </div>
        <textarea
          value={coreGoal}
          onChange={(e) => setCoreGoal(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm font-mono outline-none resize-none"
          placeholder={t({ ko: "프로젝트의 핵심 목표를 입력하세요", en: "Describe the core goal of this project", ja: "プロジェクトのコアゴールを入力してください", zh: "输入项目核心目标" })}
          style={{
            borderRadius: 0,
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
            borderRadius: 0,
            background: isDirty && !saving ? "var(--th-accent)" : "var(--th-bg-elevated)",
            color: isDirty && !saving ? "#000" : "var(--th-text-muted)",
            border: "1px solid transparent",
            opacity: saving ? 0.7 : 1,
            cursor: isDirty && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saved
            ? t({ ko: "✓ saved", en: "✓ saved", ja: "✓ saved", zh: "✓ saved" })
            : saving
            ? t({ ko: "saving...", en: "saving...", ja: "saving...", zh: "saving..." })
            : "SAVE ↵"}
        </button>
      </div>

      {/* Danger Zone */}
      {onDelete && (
        <div
          style={{
            borderTop: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.05)",
            paddingTop: "20px",
            paddingBottom: "4px",
          }}
        >
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px", borderLeft: "3px solid #f87171", paddingLeft: "8px" }}>
            // danger zone
          </div>
          <p className="text-[11px] font-mono mb-4 leading-relaxed" style={{ color: "rgba(248,113,113,0.95)" }}>
            {t({ ko: "프로젝트를 삭제하면 모든 업무·목표·결과물이 영구적으로 사라집니다.", en: "Deleting this project permanently removes all tasks, objectives, and outputs.", ja: "プロジェクトを削除すると、すべてのタスク・目標・成果物が永久に失われます。", zh: "删除项目将永久移除所有任务、目标和交付物。" })}
          </p>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="px-4 py-2.5 text-sm font-mono transition-all hover:opacity-90"
            style={{
              borderRadius: 0,
              background: "transparent",
              color: "#f87171",
              border: "1px solid rgba(248,113,113,0.5)",
              cursor: "pointer",
            }}
          >
            {t({ ko: "프로젝트 삭제", en: "Delete Project", ja: "プロジェクトを削除", zh: "删除项目" })}
          </button>
        </div>
      )}
    </div>
  );
}
