import { useState } from "react";
import type { Project } from "../../../types";
import { useI18n } from "../../../i18n";
import { timeAgo } from "./utils";

function StatPill({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color, fontFamily: "var(--th-font-mono)", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 10, display: "flex", alignItems: "center" }}>{icon}</span>{value}
    </span>
  );
}

export function Divider() {
  return <span style={{ width: 1, height: 12, background: "var(--th-border)", margin: "0 10px", flexShrink: 0 }} />;
}

function DeleteProjectButton({ projectName, onConfirm }: { projectName: string; onConfirm: () => void }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--th-danger-text)", fontFamily: "var(--th-font-mono)" }}>
          &ldquo;{projectName}&rdquo; {t({ ko: "삭제?", en: "Delete?", ja: "削除?", zh: "删除?" })}
        </span>
        <button
          type="button"
          onClick={onConfirm}
          style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "var(--th-danger-text)", border: "none", color: "#fff", cursor: "pointer", fontFamily: "var(--th-font-mono)", fontWeight: 600 }}
        >
          {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--th-bg-elevated)", border: "1px solid #E5E7EB", color: "var(--th-text-muted)", cursor: "pointer", fontFamily: "var(--th-font-mono)" }}
        >
          {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "var(--th-danger-bg)", border: "1px solid #FECACA", color: "var(--th-danger-text)", cursor: "pointer", fontFamily: "var(--th-font-mono)", flexShrink: 0 }}
    >
      🗑 {t({ ko: "프로젝트 삭제", en: "Delete Project", ja: "プロジェクト削除", zh: "删除项目" })}
    </button>
  );
}

export function DetailsTab({ project, taskCount, agentCount, onDelete }: { project: Project; taskCount: number; agentCount: number; onDelete: () => void }) {
  const { t } = useI18n();
  const rows: Array<{ label: string; value: string | number | null | undefined; multiline?: boolean }> = [
    { label: t({ ko: "이름",        en: "Name",        ja: "名前",         zh: "名称" }),        value: project.name },
    { label: t({ ko: "경로",        en: "Path",        ja: "パス",         zh: "路径" }),        value: project.project_path || "—" },
    { label: t({ ko: "목표",        en: "Goal",        ja: "目標",         zh: "目标" }),        value: project.core_goal || "—", multiline: true },
    { label: t({ ko: "태스크",      en: "Tasks",       ja: "タスク",        zh: "任务" }),       value: taskCount },
    { label: t({ ko: "에이전트",    en: "Agents",      ja: "エージェント",   zh: "代理" }),      value: agentCount },
    { label: t({ ko: "생성일",      en: "Created",     ja: "作成日",        zh: "创建日期" }),    value: project.created_at ? new Date(project.created_at).toLocaleDateString() : "—" },
    { label: t({ ko: "마지막 사용", en: "Last used",   ja: "最終使用",       zh: "最后使用" }),   value: project.last_used_at ? timeAgo(project.last_used_at) : "—" },
    { label: t({ ko: "깃허브",      en: "GitHub",      ja: "GitHub",        zh: "GitHub" }),     value: project.github_repo || "—" },
    { label: t({ ko: "리스크",      en: "Risk",        ja: "リスク",        zh: "风险" }),        value: project.risk_profile || "—" },
    { label: t({ ko: "성공 KPI",    en: "Success KPI", ja: "成功KPI",       zh: "成功KPI" }),    value: project.success_metric || "—", multiline: true },
  ];

  return (
    <div style={{ overflowY: "auto", flex: 1, padding: "12px 0" }}>
      {rows.map(({ label, value, multiline }) => (
        <div key={label} style={{ display: "flex", gap: 12, padding: "8px 16px", borderBottom: "1px solid #E5E7EB" }}>
          <span style={{ fontSize: 11, color: "var(--th-text-muted)", width: 90, flexShrink: 0, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 11, color: "var(--th-text-primary)", flex: 1, overflow: "hidden", textOverflow: multiline ? undefined : "ellipsis", whiteSpace: multiline ? "normal" : "nowrap", wordBreak: multiline ? "break-word" : undefined }}>
            {value?.toString() ?? "—"}
          </span>
        </div>
      ))}

      <div style={{ margin: "20px 16px 12px", padding: "14px 16px", borderRadius: 8, border: "1px solid #FECACA", background: "var(--th-danger-bg)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--th-danger-text)", marginBottom: 8 }}>{t({ ko: "위험 구역", en: "Danger Zone", ja: "危険ゾーン", zh: "危险区域" })}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 11, color: "var(--th-text-muted)" }}>
            {t({ ko: "이 프로젝트를 삭제합니다. 되돌릴 수 없습니다.", en: "This action permanently deletes the project.", ja: "このプロジェクトを削除します。元に戻せません。", zh: "此操作将永久删除该项目。" })}
          </span>
          <DeleteProjectButton projectName={project.name} onConfirm={onDelete} />
        </div>
      </div>
    </div>
  );
}

// StatPill is used by the main window stats bar — export for index
export { StatPill };
