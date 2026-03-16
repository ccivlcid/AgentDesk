import { useState, useRef } from "react";
import type React from "react";
import { useI18n } from "../../i18n";
import type { DeliverableItem, TaskArtifact } from "../../api";
import { getTaskArtifactsZipUrl, uploadTaskArtifacts } from "../../api/providers-reports-github";
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
  onArtifactsUploaded?: (taskId: string, newArtifacts: TaskArtifact[]) => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number | null): string {
  if (!ts) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}

function CliSection({ label, open, onToggle, action, children }: {
  label: string; open: boolean; onToggle: () => void; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: "1px solid var(--th-border)" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "var(--th-bg-elevated)", cursor: "pointer" }}
        onClick={onToggle}
      >
        <span style={{ ...mono, fontSize: "9px", color: "var(--th-accent)", fontWeight: 700 }}>
          {open ? "▾" : "▸"}
        </span>
        <span style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", flex: 1 }}>
          {label}
        </span>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </div>
      {open && (
        <div style={{ background: "var(--th-bg-primary)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function DeliverableCard({ report, artifacts, agent, agents, onArtifactsUploaded }: DeliverableCardProps) {
  const { t, locale } = useI18n();
  const [previewArtifact, setPreviewArtifact] = useState<TaskArtifact | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({
    result: false, collaborators: false, artifacts: false, git: false,
  });
  const toggleSection = (key: string) => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const expandAll   = () => setSectionOpen({ result: true,  collaborators: true,  artifacts: true,  git: true  });
  const collapseAll = () => setSectionOpen({ result: false, collaborators: false, artifacts: false, git: false });

  const preferKo = locale === "ko";
  const agentName = agent
    ? preferKo ? agent.name_ko || agent.name : agent.name || agent.name_ko
    : report.agent_name_ko || report.agent_name || "-";
  const deptName = preferKo ? report.dept_name_ko || report.dept_name : report.dept_name || report.dept_name_ko;

  const isDone = report.status === "done";
  const statusColor = isDone ? "#4ade80" : "var(--th-accent)";
  const statusLabel = isDone
    ? t({ ko: "완료", en: "DONE",   ja: "完了",     zh: "完成" })
    : t({ ko: "리뷰", en: "REVIEW", ja: "レビュー", zh: "审核" });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";
    setUploading(true);
    try {
      const newArtifacts = await uploadTaskArtifacts(report.id, files);
      onArtifactsUploaded?.(report.id, newArtifacts);
      setSectionOpen((prev) => ({ ...prev, artifacts: true }));
    } catch {
      // silently ignore — no toast dependency here
    } finally {
      setUploading(false);
    }
  };

  const hasArtifacts = artifacts && artifacts.length > 0;
  const totalSize = artifacts ? artifacts.reduce((s, a) => s + a.size, 0) : 0;

  return (
    <>
      <div style={{ borderBottom: "1px solid var(--th-border)", borderLeft: `3px solid ${statusColor}` }}>

        {/* ── 행 헤더 (항상 표시) ── */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            ...mono,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: expanded ? "var(--th-bg-elevated)" : "var(--th-bg-primary)",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => { if (!expanded) (e.currentTarget as HTMLElement).style.background = "var(--th-bg-elevated)"; }}
          onMouseLeave={(e) => { if (!expanded) (e.currentTarget as HTMLElement).style.background = "var(--th-bg-primary)"; }}
        >
          {/* 토글 아이콘 */}
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", width: 10, flexShrink: 0 }}>
            {expanded ? "▾" : "▸"}
          </span>

          {/* 상태 배지 */}
          <span style={{ fontSize: "8px", fontWeight: 700, padding: "2px 6px", border: `1px solid ${statusColor}44`, color: statusColor, background: `${statusColor}11`, letterSpacing: "0.08em", flexShrink: 0, width: 44, textAlign: "center" }}>
            {statusLabel}
          </span>

          {/* 에이전트 아바타 */}
          <AgentAvatar agent={agent ?? undefined} agents={agents} size={20} />

          {/* 제목 */}
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--th-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {report.title}
          </span>

          {/* 에이전트명 */}
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", width: 130, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agentName}{deptName ? ` · ${deptName}` : ""}
          </span>

          {/* 완료일시 */}
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", width: 120, flexShrink: 0 }}>
            {formatDate(report.completed_at)}
          </span>

          {/* 파일 수 */}
          <span style={{ fontSize: "9px", color: hasArtifacts ? "var(--th-text-secondary)" : "var(--th-text-muted)", width: 80, flexShrink: 0, opacity: hasArtifacts ? 1 : 0.3 }}>
            {artifacts === null ? "…" : hasArtifacts ? `${artifacts.length} file${artifacts.length !== 1 ? "s" : ""} (${formatSize(totalSize)})` : "—"}
          </span>
        </button>

        {/* ── 확장 바디 ── */}
        {expanded && (
          <div style={{ borderTop: "1px solid var(--th-border)" }}>
            {/* expand/collapse all */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
              <span style={{ ...mono, fontSize: "9px", color: "var(--th-accent)", fontWeight: 700 }}>$</span>
              <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)" }}>cat report/{report.id.slice(0, 8)}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button type="button" onClick={expandAll}   style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>expand all</button>
                <span style={{ fontSize: "9px", color: "var(--th-border)" }}>|</span>
                <button type="button" onClick={collapseAll} style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>collapse all</button>
              </div>
            </div>

            {/* RESULT */}
            {report.result && (
              <CliSection
                label={t({ ko: "RESULT SUMMARY", en: "RESULT SUMMARY", ja: "結果要約", zh: "结果摘要" })}
                open={!!sectionOpen.result}
                onToggle={() => toggleSection("result")}
              >
                <div style={{ padding: "10px 14px", borderLeft: "2px solid #4ade8033" }}>
                  <pre style={{ ...mono, fontSize: "10px", color: "var(--th-text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, maxHeight: 140, overflowY: "auto", lineHeight: 1.7 }}>
                    {report.result.length > 600 ? `${report.result.slice(0, 600)}…` : report.result}
                  </pre>
                </div>
              </CliSection>
            )}

            {/* COLLABORATORS */}
            <CollaboratorSection
              taskId={report.id}
              agents={agents}
              sectionOpen={!!sectionOpen.collaborators}
              onToggleSection={() => toggleSection("collaborators")}
            />

            {/* ARTIFACT FILES */}
            <input ref={uploadInputRef} type="file" multiple className="hidden" onChange={(e) => { void handleUpload(e); }} />
            {artifacts === null ? (
              <CliSection
                label={t({ ko: "ARTIFACT FILES", en: "ARTIFACT FILES", ja: "成果物ファイル", zh: "产出文件" })}
                open={!!sectionOpen.artifacts}
                onToggle={() => toggleSection("artifacts")}
              >
                <div style={{ ...mono, padding: "8px 14px", fontSize: "10px", color: "var(--th-text-muted)" }}>loading…</div>
              </CliSection>
            ) : (
              <CliSection
                label={artifacts.length > 0 ? `ARTIFACT FILES  (${artifacts.length})  ${formatSize(totalSize)}` : t({ ko: "ARTIFACT FILES", en: "ARTIFACT FILES", ja: "成果物ファイル", zh: "产出文件" })}
                open={!!sectionOpen.artifacts}
                onToggle={() => toggleSection("artifacts")}
                action={
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => uploadInputRef.current?.click()}
                      disabled={uploading}
                      style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "2px 8px", border: "1px solid var(--th-border)", background: uploading ? "var(--th-bg-elevated)" : "transparent", color: uploading ? "var(--th-text-muted)" : "var(--th-text-secondary)", cursor: uploading ? "not-allowed" : "pointer", letterSpacing: "0.04em" }}
                      title={t({ ko: "파일 업로드", en: "Upload files", ja: "ファイルアップロード", zh: "上传文件" })}
                    >
                      {uploading ? "…" : "↑ Upload"}
                    </button>
                    {artifacts.length > 0 && (
                      <a
                        href={getTaskArtifactsZipUrl(report.id)}
                        download
                        style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "2px 8px", border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)", color: "var(--th-accent)", textDecoration: "none", letterSpacing: "0.04em" }}
                        title={t({ ko: "전체 ZIP 다운로드", en: "Download all as ZIP", ja: "全てZIPでDL", zh: "全部下载ZIP" })}
                      >
                        ↓ ZIP
                      </a>
                    )}
                  </div>
                }
              >
                {artifacts.length === 0 ? (
                  <div style={{ ...mono, padding: "8px 14px", fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.4 }}>
                    {t({ ko: "파일 없음 — ↑ Upload로 추가하세요", en: "No files — click ↑ Upload to add", ja: "ファイルなし — ↑ Uploadで追加", zh: "无文件 — 点击 ↑ Upload 添加" })}
                  </div>
                ) : (
                  <ArtifactList taskId={report.id} artifacts={artifacts} onPreview={setPreviewArtifact} />
                )}
              </CliSection>
            )}

            {/* GIT */}
            {report.project_path && (
              <GitSection
                taskId={report.id}
                sectionOpen={!!sectionOpen.git}
                onToggleSection={() => toggleSection("git")}
              />
            )}
          </div>
        )}
      </div>

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
