import { useEffect } from "react";
import type { Project } from "../../types";
import { useI18n } from "../../i18n";

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const agentIds = project.assigned_agent_ids ?? [];

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
          background: "rgba(22,22,28,0.96)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          boxShadow: "0 32px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)",
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
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.03)",
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
          <span style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>
            {t({ ko: "빠른 미리보기", en: "Quick Look", ja: "クイックルック", zh: "快速预览" })}
          </span>
          <span style={{ fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
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
              <div style={{ fontFamily: mono, fontSize: 15, color: "rgba(255,255,255,0.9)", fontWeight: 600, marginBottom: 4 }}>
                {project.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                {project.project_path || t({ ko: "경로 없음", en: "No path", ja: "パスなし", zh: "无路径" })}
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }} />

          {/* 상세 정보 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {project.core_goal && (
              <Row label={t({ ko: "목표", en: "Goal", ja: "目標", zh: "目标" })} value={project.core_goal} multiline />
            )}
            <Row label={t({ ko: "태스크", en: "Tasks", ja: "タスク", zh: "任务" })} value={String(project.task_count ?? 0)} />
            <Row label={t({ ko: "마지막 사용", en: "Last used", ja: "最終使用", zh: "最近使用" })} value={fmt(project.last_used_at)} />
            <Row label={t({ ko: "생성일", en: "Created", ja: "作成日", zh: "创建日期" })} value={fmt(project.created_at)} />
            {project.github_repo && (
              <Row label="GitHub" value={project.github_repo} />
            )}
          </div>

          {/* 에이전트 아바타 */}
          {agentIds.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", marginBottom: 8 }}>
                {t({ ko: "배정된 에이전트", en: "Assigned agents", ja: "割り当てエージェント", zh: "分配的代理" })} ({agentIds.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {agentIds.map((id) => (
                  <div
                    key={id}
                    title={id}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(139,92,246,0.25)",
                      border: "1px solid rgba(139,92,246,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: mono,
                      fontSize: 9,
                      color: "rgba(196,181,253,0.9)",
                    }}
                  >
                    {id.slice(0, 2).toUpperCase()}
                  </div>
                ))}
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
          color: "rgba(255,255,255,0.35)",
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
          color: "rgba(255,255,255,0.75)",
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}
