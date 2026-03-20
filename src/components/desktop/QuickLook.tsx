import { useEffect } from "react";
import type { Project } from "../../types";
import { useI18n } from "../../i18n";
import { useTaskStore } from "../../store/taskStore";
import { useAgentStore } from "../../store/agentStore";

const mono = "var(--th-font-mono)";

interface QuickLookProps {
  project: Project;
  onClose: () => void;
}

function fmt(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

export default function QuickLook({ project, onClose }: QuickLookProps) {
  const { t } = useI18n();
  const { tasks } = useTaskStore();
  const { agents } = useAgentStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const agentIds = project.assigned_agent_ids ?? [];
  const projectTasks = tasks.filter((tk) => tk.project_id === project.id);
  const doneTasks = projectTasks.filter((tk) => tk.status === "done");
  const completionPct = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "var(--th-bg-elevated)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid var(--th-border-strong)",
          borderRadius: 16,
          boxShadow: "0 32px 64px var(--th-glass-shadow), inset 0 1px 0 var(--th-glass-highlight)",
          overflow: "hidden",
        }}
      >
        {/* 타이틀바 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-glass-bg)",
          }}
        >
          <div style={{ display: "flex", gap: 5 }}>
            <button
              onClick={onClose}
              style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", border: "none", cursor: "pointer", padding: 0 }}
            />
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#2a2a2a" }} />
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#2a2a2a" }} />
          </div>
          <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-secondary)", marginLeft: 4 }}>
            {t({ ko: "빠른 미리보기", en: "Quick Look", ja: "クイックルック", zh: "快速预览" })}
          </span>
          <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginLeft: "auto" }}>
            esc
          </span>
        </div>

        {/* 본문 */}
        <div style={{ padding: "20px 20px 24px" }}>
          {/* 프로젝트 아이콘 + 이름 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                flexShrink: 0,
              }}
            >
              📂
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 15, color: "var(--th-text-primary)", fontWeight: 600, marginBottom: 4 }}>
                {project.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                {project.project_path || t({ ko: "경로 없음", en: "No path", ja: "パ스なし", zh: "무路径" })}
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div style={{ borderTop: "1px solid var(--th-border)", marginBottom: 14 }} />

          {/* 상세 정보 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {project.core_goal && (
              <Row label={t({ ko: "목표", en: "Goal", ja: "目標", zh: "目标" })} value={project.core_goal} multiline />
            )}
            <Row label={t({ ko: "태스크", en: "Tasks", ja: "タスク", zh: "任务" })} value={projectTasks.length > 0 ? `${doneTasks.length}/${projectTasks.length}` : String(project.task_count ?? 0)} />
            {completionPct !== null && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", minWidth: 72, flexShrink: 0 }}>
                  {t({ ko: "완료율", en: "Progress", ja: "進捗率", zh: "进度" })}
                </span>
                <div style={{ flex: 1, height: 6, background: "var(--th-border)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${completionPct}%`, height: "100%", background: completionPct === 100 ? "#22c55e" : "var(--th-accent)", borderRadius: 4, transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", minWidth: 32, textAlign: "right" }}>{completionPct}%</span>
              </div>
            )}
            <Row label={t({ ko: "마지막 사용", en: "Last used", ja: "最終使用", zh: "最近使用" })} value={fmt(project.last_used_at)} />
            <Row label={t({ ko: "생성일", en: "Created", ja: "作成日", zh: "创建日期" })} value={fmt(project.created_at)} />
            {project.github_repo && (
              <Row label="GitHub" value={project.github_repo} />
            )}
          </div>

          {/* 에이전트 아바타 */}
          {agentIds.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.08em", marginBottom: 8 }}>
                {t({ ko: "배정된 에이전트", en: "Assigned agents", ja: "割り当てエージェント", zh: "分配的代理" })} ({agentIds.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {agentIds.map((id) => {
                  const agent = agents.find((a) => a.id === id);
                  const label = agent?.avatar_emoji ?? "👤";
                  const name = agent?.name ?? id.slice(0, 6);
                  return (
                    <div
                      key={id}
                      title={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px 2px 4px",
                        borderRadius: 12,
                        background: "var(--th-accent-glow)",
                        border: "1px solid var(--th-border-accent)",
                        fontFamily: mono,
                        fontSize: 10,
                        color: "var(--th-text-primary)",
                      }}
                    >
                      <span style={{ fontSize: 12 }}>{label}</span>
                      <span>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: multiline ? "flex-start" : "center" }}>
      <span
        style={{
          fontFamily: mono,
          fontSize: 10,
          color: "var(--th-text-muted)",
          minWidth: 72,
          flexShrink: 0,
          paddingTop: multiline ? 1 : 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono,
          fontSize: 11,
          color: "var(--th-text-primary)",
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}
