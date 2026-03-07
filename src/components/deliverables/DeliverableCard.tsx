import { useState } from "react";
import { useI18n } from "../../i18n";
import type { DeliverableItem, TaskArtifact } from "../../api";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import ArtifactList from "./ArtifactList";
import CollaboratorSection from "./CollaboratorSection";
import GitSection from "./GitSection";
import TextPreviewModal from "./TextPreviewModal";

interface DeliverableCardProps {
  report: DeliverableItem;
  artifacts: TaskArtifact[] | null;
  agent: Agent | null;
  agents: Agent[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number | null): string {
  if (!ts) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function SectionToggle({ label, open, onToggle, borderColor = "border-[var(--th-border)]", children }: {
  label: string; open: boolean; onToggle: () => void; borderColor?: string; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--th-bg-surface-hover)] transition"
      >
        <span className="text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--th-text-muted)" }}>
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}

export default function DeliverableCard({ report, artifacts, agent, agents }: DeliverableCardProps) {
  const { t, locale } = useI18n();
  const [previewArtifact, setPreviewArtifact] = useState<TaskArtifact | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({
    result: false,
    collaborators: false,
    artifacts: false,
    git: false,
  });
  const toggleSection = (key: string) => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const expandAllSections = () =>
    setSectionOpen({ result: true, collaborators: true, artifacts: true, git: true });
  const collapseAllSections = () =>
    setSectionOpen({ result: false, collaborators: false, artifacts: false, git: false });

  const preferKo = locale === "ko";
  const agentName = agent
    ? preferKo
      ? agent.name_ko || agent.name
      : agent.name || agent.name_ko
    : report.agent_name_ko || report.agent_name || "-";
  const deptName = preferKo ? report.dept_name_ko || report.dept_name : report.dept_name || report.dept_name_ko;

  const statusBadge = report.status === "done"
    ? { label: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }), cls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" }
    : { label: t({ ko: "리뷰", en: "Review", ja: "レビュー", zh: "审核" }), cls: "border-amber-500/40 bg-amber-500/15 text-amber-300" };

  const hasArtifacts = artifacts && artifacts.length > 0;
  const totalSize = artifacts ? artifacts.reduce((s, a) => s + a.size, 0) : 0;

  return (
    <>
      <div className="transition" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
        {/* Card header — always visible */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-start gap-3 p-4 text-left"
        >
          <AgentAvatar agent={agent ?? undefined} agents={agents} size={40} rounded="xl" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">{report.title}</span>
              <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-medium font-mono ${statusBadge.cls}`} style={{ borderRadius: "2px" }}>
                {statusBadge.label}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>
              <span>{agentName}</span>
              {deptName && (
                <>
                  <span style={{ color: "var(--th-border-strong)" }}>·</span>
                  <span>{deptName}</span>
                </>
              )}
              <span style={{ color: "var(--th-border-strong)" }}>·</span>
              <span>{formatDate(report.completed_at)}</span>
              {hasArtifacts && (
                <>
                  <span style={{ color: "var(--th-border-strong)" }}>·</span>
                  <span style={{ color: "var(--th-text-muted)" }}>
                    {artifacts!.length} {t({ ko: "파일", en: "files", ja: "ファイル", zh: "文件" })} ({formatSize(totalSize)})
                  </span>
                </>
              )}
            </div>
          </div>

          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`}
            style={{ color: "var(--th-text-muted)" }}
          >
            <path d="M6 8l4 4 4-4" />
          </svg>
        </button>

        {/* Expanded body — collapsible sections */}
        {expanded && (
          <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--th-border)" }}>
            <div className="flex items-center justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={expandAllSections}
                className="font-mono transition" style={{ color: "var(--th-text-muted)" }}
              >
                {t({ ko: "전체 펼치기", en: "Expand all", ja: "すべて展開", zh: "全部展开" })}
              </button>
              <span style={{ color: "var(--th-border-strong)" }}>|</span>
              <button
                type="button"
                onClick={collapseAllSections}
                className="font-mono transition" style={{ color: "var(--th-text-muted)" }}
              >
                {t({ ko: "전체 접기", en: "Collapse all", ja: "すべて折りたたむ", zh: "全部折叠" })}
              </button>
            </div>

            {/* Section A: Result Summary */}
            {report.result && (
              <SectionToggle
                label={t({ ko: "결과 요약", en: "Result Summary", ja: "結果要約", zh: "结果摘要" })}
                open={!!sectionOpen.result}
                onToggle={() => toggleSection("result")}
                borderColor="border-emerald-500/25"
              >
                <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(52,211,153,0.15)", background: "var(--th-terminal-bg)" }}>
                  <div className="text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                    {report.result.length > 600 ? `${report.result.slice(0, 600)}...` : report.result}
                  </div>
                </div>
              </SectionToggle>
            )}

            {/* Section B: Collaborators */}
            <CollaboratorSection taskId={report.id} agents={agents} sectionOpen={!!sectionOpen.collaborators} onToggleSection={() => toggleSection("collaborators")} />

            {/* Section C: Artifact Files */}
            {artifacts === null ? (
              <SectionToggle
                label={t({ ko: "산출물 파일", en: "Artifact Files", ja: "成果物ファイル", zh: "产出文件" })}
                open={!!sectionOpen.artifacts}
                onToggle={() => toggleSection("artifacts")}
              >
                <div className="px-3 py-2 text-[11px] font-mono animate-pulse" style={{ borderTop: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
                  {t({ ko: "산출물 로딩중...", en: "Loading artifacts...", ja: "成果物を読み込み中...", zh: "加载中..." })}
                </div>
              </SectionToggle>
            ) : artifacts.length > 0 ? (
              <SectionToggle
                label={`${t({ ko: "산출물 파일", en: "Artifact Files", ja: "成果物ファイル", zh: "产出文件" })} (${artifacts.length})`}
                open={!!sectionOpen.artifacts}
                onToggle={() => toggleSection("artifacts")}
              >
                <ArtifactList
                  taskId={report.id}
                  artifacts={artifacts}
                  onPreview={setPreviewArtifact}
                />
              </SectionToggle>
            ) : (
              <SectionToggle
                label={t({ ko: "산출물 파일", en: "Artifact Files", ja: "成果物ファイル", zh: "产出文件" })}
                open={!!sectionOpen.artifacts}
                onToggle={() => toggleSection("artifacts")}
              >
                <div className="px-3 py-2 text-[11px] font-mono" style={{ borderTop: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}>
                  {t({ ko: "산출물 파일 없음", en: "No artifact files", ja: "成果物ファイルなし", zh: "无产出文件" })}
                </div>
              </SectionToggle>
            )}

            {/* Section D: Git Changes */}
            {report.project_path && (
              <GitSection taskId={report.id} sectionOpen={!!sectionOpen.git} onToggleSection={() => toggleSection("git")} />
            )}
          </div>
        )}
      </div>

      {/* Text Preview Modal */}
      {previewArtifact && (
        <TextPreviewModal
          taskId={report.id}
          artifact={previewArtifact}
          onClose={() => setPreviewArtifact(null)}
        />
      )}
    </>
  );
}
