import { useMemo, useRef, useState, useEffect } from "react";
import type React from "react";
import type { Agent, Department } from "../types";
import type { TaskReportDetail, TaskReportDocument, TaskReportTeamSection, TaskArtifact } from "../api";
import { archiveTaskReport, getTaskReportDetail, getTaskArtifacts, getTaskArtifactDownloadUrl } from "../api";
import { uploadTaskArtifacts, getTaskArtifactsZipUrl } from "../api/providers-reports-github";
import type { UiLanguage } from "../i18n";
import { pickLang } from "../i18n";
import AgentAvatar from "./AgentAvatar";
import HeaderModalChrome from "./ui/HeaderModalChrome";

interface TaskReportPopupProps {
  report: TaskReportDetail;
  agents: Agent[];
  departments: Department[];
  uiLanguage: UiLanguage;
  onClose: () => void;
}

const DOCUMENTS_PER_PAGE = 3;

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return "-";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function elapsed(start: number | null | undefined, end: number | null | undefined): string {
  if (!start || !end) return "-";
  const ms = end - start;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function projectNameFromPath(projectPath: string | null | undefined): string {
  if (!projectPath) return "General";
  const trimmed = projectPath.replace(/[\\/]+$/, "");
  const seg = trimmed.split(/[\\/]/).pop();
  return seg || "General";
}

function statusStyle(status: string): React.CSSProperties {
  if (status === "done") return { background: "var(--th-green-glow)", color: "var(--th-attr-elite)" };
  if (status === "review") return { background: "var(--th-amber-glow)", color: "var(--th-accent)" };
  if (status === "in_progress") return { background: "var(--th-amber-glow)", color: "var(--th-accent)" };
  return { background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" };
}

export default function TaskReportPopup({ report, agents, departments, uiLanguage, onClose }: TaskReportPopupProps) {
  const t = (text: { ko: string; en: string; ja?: string; zh?: string }) => pickLang(uiLanguage, text);

  const [currentReport, setCurrentReport] = useState<TaskReportDetail>(report);
  const [refreshingArchive, setRefreshingArchive] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("planning");
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [documentPages, setDocumentPages] = useState<Record<string, number>>({});
  const [uploadPending, setUploadPending] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const artifactFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentReport(report);
  }, [report]);

  const rootTaskId = currentReport.project?.root_task_id || currentReport.task.id;
  const teamReports = useMemo(() => currentReport.team_reports ?? [], [currentReport.team_reports]);
  const projectName = currentReport.project?.project_name || projectNameFromPath(currentReport.task.project_path);
  const projectPath = currentReport.project?.project_path || currentReport.task.project_path;
  const planningSummary = currentReport.planning_summary;

  const refreshArchive = async () => {
    if (!rootTaskId || refreshingArchive) return;
    setRefreshingArchive(true);
    try {
      await archiveTaskReport(rootTaskId);
      const refreshed = await getTaskReportDetail(rootTaskId);
      setCurrentReport(refreshed);
    } catch (err) {
      console.error("Failed to refresh planning archive:", err);
    } finally {
      setRefreshingArchive(false);
    }
  };

  const [artifacts, setArtifacts] = useState<TaskArtifact[] | null>(null);

  useEffect(() => {
    setActiveTab("planning");
    setExpandedDocs({});
    setDocumentPages({});
    setArtifacts(null);
    // Fetch artifacts if project_path exists
    const taskId = currentReport.project?.root_task_id || currentReport.task.id;
    if (currentReport.task.project_path || currentReport.project?.project_path) {
      getTaskArtifacts(taskId)
        .then(setArtifacts)
        .catch(() => setArtifacts([]));
    } else {
      setArtifacts([]);
    }
  }, [currentReport.task.id, currentReport.requested_task_id, teamReports.length, currentReport.task.project_path, currentReport.project?.project_path, currentReport.project?.root_task_id]);

  const taskAgent = agents.find((a) => a.id === currentReport.task.assigned_agent_id);
  const departmentById = useMemo(() => {
    const map = new Map<string, Department>();
    for (const department of departments) {
      map.set(department.id, department);
    }
    return map;
  }, [departments]);
  const taskDeptFromMap = currentReport.task.department_id
    ? departmentById.get(currentReport.task.department_id)
    : undefined;
  const taskAgentName =
    uiLanguage === "ko"
      ? currentReport.task.agent_name_ko || currentReport.task.agent_name
      : currentReport.task.agent_name;
  const taskDeptName =
    uiLanguage === "ko"
      ? taskDeptFromMap?.name_ko || currentReport.task.dept_name_ko || currentReport.task.dept_name
      : taskDeptFromMap?.name || currentReport.task.dept_name || currentReport.task.dept_name_ko;

  const selectedTeam = useMemo(() => {
    if (activeTab === "planning") return null;
    return teamReports.find((team) => team.id === activeTab || team.task_id === activeTab) ?? null;
  }, [activeTab, teamReports]);

  const planningDocs = planningSummary?.documents ?? [];

  const toggleDoc = (docId: string) => {
    setExpandedDocs((prev) => {
      const current = prev[docId] !== false;
      return { ...prev, [docId]: !current };
    });
  };

  const renderDocuments = (documents: TaskReportDocument[], scopeKey: string) => {
    if (!documents.length) {
      return (
        <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "문서가 없습니다", en: "No documents", ja: "ドキュメントなし", zh: "暂无文档" })}
        </p>
      );
    }

    const totalPages = Math.max(1, Math.ceil(documents.length / DOCUMENTS_PER_PAGE));
    const rawPage = documentPages[scopeKey] ?? 1;
    const currentPage = Math.min(Math.max(rawPage, 1), totalPages);
    const start = (currentPage - 1) * DOCUMENTS_PER_PAGE;
    const visibleDocs = documents.slice(start, start + DOCUMENTS_PER_PAGE);

    return (
      <div className="space-y-2">
        {visibleDocs.map((doc) => {
          const isExpanded = expandedDocs[doc.id] !== false;
          return (
            <div key={doc.id} className="p-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{doc.title}</p>
                  <p className="truncate text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {doc.source}
                    {doc.path ? ` · ${doc.path}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleDoc(doc.id)}
                  className="px-2 py-1 text-[11px] font-mono transition-all"
                  style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
                >
                  {isExpanded
                    ? t({ ko: "접기", en: "Collapse", ja: "折りたたむ", zh: "收起" })
                    : t({ ko: "확장", en: "Expand", ja: "展開", zh: "展开" })}
                </button>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-2 text-[11px] leading-relaxed" style={{ borderRadius: 0, background: "var(--th-bg-surface)", color: "var(--th-text-primary)" }}>
                {isExpanded ? doc.content : doc.text_preview}
              </pre>
            </div>
          );
        })}
        {totalPages > 1 && (
          <div className="mt-1 flex items-center justify-between px-3 py-2" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <button
              type="button"
              onClick={() => setDocumentPages((prev) => ({ ...prev, [scopeKey]: Math.max(1, currentPage - 1) }))}
              disabled={currentPage <= 1}
              className={`px-2 py-1 text-[11px] font-mono transition-all ${currentPage <= 1 ? "cursor-not-allowed" : ""}`}
              style={{
                borderRadius: 0,
                border: `1px solid ${currentPage <= 1 ? "rgba(51,65,85,1)" : "var(--th-border)"}`,
                color: currentPage <= 1 ? "var(--th-text-muted)" : "var(--th-text-secondary)",
                background: "transparent",
              }}
            >
              {t({ ko: "이전", en: "Prev", ja: "前へ", zh: "上一页" })}
            </button>
            <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: `페이지 ${currentPage}/${totalPages}`,
                en: `Page ${currentPage}/${totalPages}`,
                ja: `ページ ${currentPage}/${totalPages}`,
                zh: `第 ${currentPage}/${totalPages} 页`,
              })}
            </span>
            <button
              type="button"
              onClick={() =>
                setDocumentPages((prev) => ({ ...prev, [scopeKey]: Math.min(totalPages, currentPage + 1) }))
              }
              disabled={currentPage >= totalPages}
              className={`px-2 py-1 text-[11px] font-mono transition-all ${currentPage >= totalPages ? "cursor-not-allowed" : ""}`}
              style={{
                borderRadius: 0,
                border: `1px solid var(--th-border)`,
                color: currentPage >= totalPages ? "var(--th-text-muted)" : "var(--th-text-secondary)",
                background: "transparent",
              }}
            >
              {t({ ko: "다음", en: "Next", ja: "次へ", zh: "下一页" })}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPlanningSummary = () => (
    <div className="space-y-3">
      <div className="p-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-green-glow)" }}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold font-mono" style={{ color: "var(--th-attr-elite)" }}>
            {t({
              ko: "기획팀장 최종 취합본",
              en: "Planning Lead Consolidated Summary",
              ja: "企画リード統合サマリー",
              zh: "规划负责人汇总摘要",
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshArchive}
              disabled={refreshingArchive}
              className={`px-2 py-1 text-[11px] font-mono transition-all ${refreshingArchive ? "cursor-not-allowed" : ""}`}
              style={{
                borderRadius: 0,
                border: `1px solid ${refreshingArchive ? "rgba(52,211,153,0.2)" : "rgba(52,211,153,0.4)"}`,
                color: refreshingArchive ? "rgba(110,231,183,0.7)" : "rgb(167,243,208)",
                background: refreshingArchive ? "rgba(52,211,153,0.1)" : "rgba(52,211,153,0.15)",
              }}
            >
              {refreshingArchive
                ? t({ ko: "갱신 중...", en: "Refreshing...", ja: "更新中...", zh: "刷新中..." })
                : t({ ko: "취합 갱신", en: "Refresh Consolidation", ja: "統合更新", zh: "刷新汇总" })}
            </button>
            <span className="text-[11px]" style={{ color: "var(--th-attr-elite)" }}>{fmtTime(planningSummary?.generated_at)}</span>
          </div>
        </div>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
          {planningSummary?.content ||
            t({ ko: "요약 내용이 없습니다", en: "No summary text", ja: "サマリーなし", zh: "暂无摘要内容" })}
        </pre>
      </div>
      <div>
        <p className="mb-2 text-xs font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "문서 원문", en: "Source Documents", ja: "原本文書", zh: "原始文档" })}
        </p>
        {renderDocuments(planningDocs, "planning")}
      </div>
    </div>
  );

  const renderTeamReport = (team: TaskReportTeamSection) => {
    const teamDeptFromMap = team.department_id ? departmentById.get(team.department_id) : undefined;
    const teamName =
      uiLanguage === "ko"
        ? teamDeptFromMap?.name_ko || team.department_name_ko || team.department_name
        : teamDeptFromMap?.name || team.department_name || team.department_name_ko;
    const teamAgent = uiLanguage === "ko" ? team.agent_name_ko || team.agent_name : team.agent_name;
    const logs = team.logs ?? [];
    const keyLogs = logs.filter((lg) => lg.kind === "system" || lg.message.includes("Status")).slice(-20);

    return (
      <div className="space-y-3">
        <div className="p-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{team.title}</p>
            <span className="px-2 py-0.5 text-[11px] font-mono" style={{ borderRadius: 0, ...statusStyle(team.status) }}>{team.status}</span>
          </div>
          <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {teamName} · {teamAgent || "-"}
          </p>
          <p className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "완료", en: "Completed", ja: "完了", zh: "完成" })}: {fmtTime(team.completed_at)}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{team.summary || "-"}</p>
        </div>

        {team.linked_subtasks.length > 0 && (
          <div className="p-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <p className="mb-2 text-xs font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "연결된 서브태스크", en: "Linked Subtasks", ja: "関連サブタスク", zh: "关联子任务" })}
            </p>
            <div className="space-y-1.5">
              {team.linked_subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px]"
                  style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}
                >
                  <span className="min-w-0 flex-1 truncate font-mono" style={{ color: "var(--th-text-secondary)" }}>{st.title}</span>
                  <span className="px-1.5 py-0.5 font-mono" style={{ borderRadius: 0, ...statusStyle(st.status) }}>{st.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "팀 문서", en: "Team Documents", ja: "チーム文書", zh: "团队文档" })}
          </p>
          {renderDocuments(team.documents ?? [], `team:${team.id}`)}
        </div>

        {keyLogs.length > 0 && (
          <div className="p-3" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            <p className="mb-2 text-xs font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "진행 로그", en: "Progress Logs", ja: "進行ログ", zh: "进度日志" })}
            </p>
            <div className="space-y-1">
              {keyLogs.map((lg, idx) => (
                <div key={`${lg.created_at}-${idx}`} className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  <span className="mr-2" style={{ color: "var(--th-text-muted)" }}>{fmtTime(lg.created_at)}</span>
                  {lg.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ARTIFACT_ICONS: Record<string, string> = {
    ".pptx": "\uD83D\uDCCA", ".ppt": "\uD83D\uDCCA",
    ".xlsx": "\uD83D\uDCC8", ".xls": "\uD83D\uDCC8",
    ".docx": "\uD83D\uDCC4", ".doc": "\uD83D\uDCC4",
    ".pdf": "\uD83D\uDCD5",
    ".mp4": "\uD83C\uDFAC", ".mp3": "\uD83C\uDFB5",
    ".html": "\uD83C\uDF10", ".htm": "\uD83C\uDF10",
    ".md": "\uD83D\uDCDD", ".txt": "\uD83D\uDCDD", ".json": "\uD83D\uDCDD", ".csv": "\uD83D\uDCDD",
    ".png": "\uD83D\uDDBC\uFE0F", ".jpg": "\uD83D\uDDBC\uFE0F", ".jpeg": "\uD83D\uDDBC\uFE0F",
    ".gif": "\uD83D\uDDBC\uFE0F", ".svg": "\uD83D\uDDBC\uFE0F", ".webp": "\uD83D\uDDBC\uFE0F",
    ".zip": "\uD83D\uDCE6",
  };

  const getArtifactIcon = (fileName: string) => {
    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    return ARTIFACT_ICONS[ext] || "\uD83D\uDCC1";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleArtifactUpload = async () => {
    if (uploadPending.length === 0 || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const added = await uploadTaskArtifacts(rootTaskId, uploadPending);
      setArtifacts((prev) => [...(prev ?? []), ...added]);
      setUploadPending([]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message.slice(0, 80) : t({ ko: "업로드 실패", en: "Upload failed", ja: "アップロード失敗", zh: "上传失败" }));
    } finally {
      setUploading(false);
    }
  };

  const renderArtifacts = () => {
    const taskId = rootTaskId;
    if (artifacts === null) {
      return (
        <div className="flex items-center justify-center py-8 text-sm font-mono animate-pulse" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "산출물 로딩중...", en: "Loading artifacts...", ja: "成果物を読み込み中...", zh: "加载产出物..." })}
        </div>
      );
    }

    const totalSize = (artifacts ?? []).reduce((s, a) => s + a.size, 0);
    return (
      <div className="space-y-3">
        {/* Upload area */}
        <div className="space-y-2">
          <input
            ref={artifactFileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (!e.target.files) return;
              const incoming = Array.from(e.target.files).filter((f) => f.size <= 50 * 1024 * 1024);
              setUploadPending((prev) => {
                const merged = [...prev];
                for (const f of incoming) {
                  if (!merged.some((x) => x.name === f.name && x.size === f.size)) merged.push(f);
                }
                return merged.slice(0, 10);
              });
              e.target.value = "";
            }}
          />
          {uploadPending.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)" }}>
              {uploadPending.map((f, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono" style={{ background: "var(--th-bg-primary)", border: "1px solid var(--th-border)", borderRadius: 0, color: "var(--th-text-secondary)" }}>
                  <span>{getArtifactIcon(f.name)}</span>
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <span style={{ color: "var(--th-text-muted)" }}>({formatFileSize(f.size)})</span>
                  <button onClick={() => setUploadPending((prev) => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:opacity-70" style={{ color: "var(--th-text-muted)" }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => artifactFileInputRef.current?.click()}
              className="px-3 py-1.5 text-[11px] font-mono transition hover:opacity-80"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
            >
              📎 {t({ ko: "파일 선택", en: "Choose Files", ja: "ファイル選択", zh: "选择文件" })}
            </button>
            {uploadPending.length > 0 && (
              <button
                onClick={() => { void handleArtifactUpload(); }}
                disabled={uploading}
                className="px-3 py-1.5 text-[11px] font-mono font-bold transition disabled:opacity-50"
                style={{ borderRadius: 0, border: "1px solid var(--th-border-accent)", background: "var(--th-amber-glow)", color: "var(--th-accent)" }}
              >
                {uploading
                  ? t({ ko: "업로드 중...", en: "Uploading...", ja: "アップロード中...", zh: "上传中..." })
                  : t({ ko: `${uploadPending.length}개 업로드`, en: `Upload ${uploadPending.length} file${uploadPending.length > 1 ? "s" : ""}`, ja: `${uploadPending.length}件アップロード`, zh: `上传 ${uploadPending.length} 个文件` })}
              </button>
            )}
            <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "최대 50MB / 파일 10개", en: "Max 50MB per file, 10 files", ja: "最大50MB×10ファイル", zh: "每文件最大50MB，最多10个" })}
            </span>
          </div>
          {uploadError && <p className="text-[11px] font-mono" style={{ color: "var(--th-danger-text)" }}>{uploadError}</p>}
        </div>

        {artifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6" style={{ color: "var(--th-text-muted)" }}>
            <span className="mb-2 text-3xl opacity-40">&#x1F4E6;</span>
            <p className="text-sm font-mono">
              {t({ ko: "산출물 파일이 없습니다", en: "No artifact files found", ja: "成果物ファイルはありません", zh: "没有产出文件" })}
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "산출물 파일", en: "Artifact Files", ja: "成果物ファイル", zh: "产出文件" })}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {artifacts.length} {t({ ko: "파일", en: "files", ja: "ファイル", zh: "文件" })} ({formatFileSize(totalSize)})
            </span>
            {artifacts.length > 0 && (
              <a
                href={getTaskArtifactsZipUrl(taskId)}
                download
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold transition-all hover:opacity-80"
                style={{
                  borderRadius: 0,
                  border: "1px solid var(--th-border-accent)",
                  background: "var(--th-amber-glow)",
                  color: "var(--th-accent)",
                  textDecoration: "none",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3v10M6 9l4 4 4-4" />
                  <path d="M3 17h14" />
                </svg>
                {t({ ko: "전체 다운로드 (ZIP)", en: "Download All (ZIP)", ja: "全てDL (ZIP)", zh: "全部下载 (ZIP)" })}
              </a>
            )}
          </div>
        </div>
        <div className="divide-y" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderColor: "var(--th-border)" }}>
          {artifacts.map((art) => {
            const isText = art.type === "text" && art.mime !== "text/html";
            const isHtml = art.mime === "text/html";
            const downloadUrl = getTaskArtifactDownloadUrl(taskId, art.relativePath);
            const previewUrl = getTaskArtifactDownloadUrl(taskId, art.relativePath, true);
            return (
              <div key={art.id} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-[var(--th-bg-surface-hover)]">
                <span className="text-lg shrink-0">{getArtifactIcon(art.title)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium font-mono truncate" style={{ color: "var(--th-text-primary)" }} title={art.relativePath}>{art.title}</p>
                  <p className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{formatFileSize(art.size)} · {art.relativePath}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isText && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 text-[10px] font-mono transition-all"
                      style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
                    >
                      {t({ ko: "보기", en: "View", ja: "表示", zh: "查看" })}
                    </a>
                  )}
                  {isHtml && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 text-[10px] font-mono transition-all"
                      style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-primary)", background: "var(--th-bg-surface)" }}
                    >
                      {t({ ko: "미리보기", en: "Preview", ja: "プレビュー", zh: "预览" })}
                    </a>
                  )}
                  <a
                    href={downloadUrl}
                    download
                    className="px-2 py-0.5 text-[10px] font-mono transition"
                    style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-elevated)" }}
                  >
                    {t({ ko: "다운로드", en: "Download", ja: "DL", zh: "下载" })}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const reportTitle = t({
    ko: "작업 완료 보고서",
    en: "Task Completion Report",
    ja: "タスク完了レポート",
    zh: "任务完成报告",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--th-modal-overlay)" }}
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex w-full max-w-4xl flex-col overflow-hidden"
        style={{
          borderRadius: 10,
          border: "1px solid var(--th-border)",
          background: "var(--th-bg-elevated)",
          maxHeight: "90vh",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <HeaderModalChrome title={reportTitle} onClose={onClose} />
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--th-border)] bg-[var(--th-bg-panel)] px-4 py-2.5">
          <span className="px-2 py-0.5 text-xs font-mono" style={{ borderRadius: 6, background: "var(--th-green-glow)", color: "var(--th-attr-elite)" }}>
            {projectName}
          </span>
          <span className="truncate text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{projectPath || "-"}</span>
        </div>

        <div className="px-6 py-3" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div className="flex items-start gap-3">
            <AgentAvatar agent={taskAgent} agents={agents} size={40} rounded="xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{currentReport.task.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                <span className="px-1.5 py-0.5" style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}>{taskDeptName}</span>
                <span>
                  {taskAgentName} ({currentReport.task.agent_role})
                </span>
                <span>
                  {t({ ko: "완료", en: "Completed", ja: "完了", zh: "完成" })}:{" "}
                  {fmtTime(currentReport.task.completed_at)}
                </span>
                <span className="px-1.5 py-0.5" style={{ borderRadius: 0, background: "var(--th-green-glow)", color: "var(--th-attr-elite)" }}>
                  {elapsed(currentReport.task.created_at, currentReport.task.completed_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-2.5" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("planning")}
              className="px-3 py-1.5 text-xs font-mono transition-all"
              style={{
                borderRadius: 0,
                border: `1px solid ${activeTab === "planning" ? "var(--th-border)" : "var(--th-border)"}`,
                background: activeTab === "planning" ? "var(--th-green-glow)" : "var(--th-bg-elevated)",
                color: activeTab === "planning" ? "var(--th-attr-elite)" : "var(--th-text-secondary)",
              }}
            >
              {t({ ko: "기획팀장 취합본", en: "Planning Summary", ja: "企画サマリー", zh: "规划汇总" })}
            </button>
            <button
              onClick={() => setActiveTab("artifacts")}
              className="px-3 py-1.5 text-xs font-mono transition-all"
              style={{
                borderRadius: 0,
                border: `1px solid ${activeTab === "artifacts" ? "var(--th-border-accent)" : "var(--th-border)"}`,
                background: activeTab === "artifacts" ? "var(--th-amber-glow)" : "var(--th-bg-elevated)",
                color: activeTab === "artifacts" ? "var(--th-accent)" : "var(--th-text-secondary)",
              }}
            >
              {t({ ko: "산출물", en: "Artifacts", ja: "成果物", zh: "产出物" })}
              {artifacts && artifacts.length > 0 && (
                <span className="ml-1 px-1.5 text-[10px]" style={{ borderRadius: 0, background: "var(--th-amber-glow)" }}>{artifacts.length}</span>
              )}
            </button>
            {teamReports.map((team) => {
              const label =
                uiLanguage === "ko"
                  ? team.department_name_ko || team.department_name || team.department_id || "팀"
                  : team.department_name || team.department_id || "Team";
              return (
                <button
                  key={team.id}
                  onClick={() => setActiveTab(team.id)}
                  className="px-3 py-1.5 text-xs font-mono transition-all"
                  style={{
                    borderRadius: 0,
                    border: `1px solid ${activeTab === team.id ? "var(--th-border)" : "var(--th-border)"}`,
                    background: activeTab === team.id ? "var(--th-bg-surface)" : "var(--th-bg-elevated)",
                    color: activeTab === team.id ? "var(--th-text-heading)" : "var(--th-text-secondary)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-4">
          {activeTab === "planning" ? (
            renderPlanningSummary()
          ) : activeTab === "artifacts" ? (
            renderArtifacts()
          ) : selectedTeam ? (
            renderTeamReport(selectedTeam)
          ) : (
            <p className="text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "표시할 보고서가 없습니다",
                en: "No report to display",
                ja: "表示するレポートがありません",
                zh: "没有可显示的报告",
              })}
            </p>
          )}
        </div>

        <div className="px-6 py-3" style={{ borderTop: "1px solid var(--th-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: `팀 보고서 ${teamReports.length}개`,
                en: `${teamReports.length} team reports`,
                ja: `チームレポート ${teamReports.length}件`,
                zh: `${teamReports.length} 个团队报告`,
              })}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-mono uppercase tracking-wide transition-all"
              style={{ borderRadius: 0, background: "var(--th-accent)", color: "#000", border: "none" }}
            >
              {t({ ko: "확인", en: "OK", ja: "OK", zh: "确认" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
