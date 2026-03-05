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

function SectionToggle({ label, open, onToggle, borderColor = "border-slate-700/50", children }: {
  label: string; open: boolean; onToggle: () => void; borderColor?: string; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border ${borderColor} bg-slate-900/40 overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800/40 transition"
      >
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
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
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 transition hover:border-slate-600/80">
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
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
              <span>{agentName}</span>
              {deptName && (
                <>
                  <span className="text-slate-600">·</span>
                  <span>{deptName}</span>
                </>
              )}
              <span className="text-slate-600">·</span>
              <span>{formatDate(report.completed_at)}</span>
              {hasArtifacts && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">
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
            className={`shrink-0 mt-1 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M6 8l4 4 4-4" />
          </svg>
        </button>

        {/* Expanded body — collapsible sections */}
        {expanded && (
          <div className="border-t border-slate-700/50 px-4 pb-4 pt-3 space-y-3">
            <div className="flex items-center justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={expandAllSections}
                className="text-slate-500 hover:text-slate-300 transition"
              >
                {t({ ko: "전체 펼치기", en: "Expand all", ja: "すべて展開", zh: "全部展开" })}
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={collapseAllSections}
                className="text-slate-500 hover:text-slate-300 transition"
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
                <div className="border-t border-emerald-500/15 bg-slate-950/60 px-3 py-2">
                  <div className="text-xs text-slate-300 whitespace-pre-wrap break-words max-h-32 overflow-y-auto leading-relaxed">
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
                <div className="border-t border-slate-700/40 px-3 py-2 text-[11px] text-slate-500 animate-pulse">
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
                <div className="border-t border-slate-700/40 px-3 py-2 text-[11px] text-slate-500">
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
