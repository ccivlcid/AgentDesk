import { useState, useRef, useCallback, useEffect } from "react";
import type { Project, Agent, Task, TaskStatus } from "../../types";
import type { TaskReportDetail } from "../../api/providers-reports-github";
import { getTaskReportDetail, cloneGitHubRepo, cloneGitLabRepo, getCloneStatus, getGitLabCloneStatus } from "../../api/providers-reports-github";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";
import TrafficLights from "./TrafficLights";

interface Props {
  project: Project;
  tasks: Task[];
  agents: Agent[];
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  initialX?: number;
  initialY?: number;
}

type Tab = "files" | "tasks" | "agents" | "details" | "git";

const STATUS_COLORS: Record<TaskStatus, string> = {
  inbox:         "var(--th-text-muted)",
  planned:       "var(--th-info, #60a5fa)",
  collaborating: "var(--th-accent, #f59e0b)",
  in_progress:   "var(--th-success, #22c55e)",
  review:        "var(--th-accent, #f59e0b)",
  done:          "var(--th-text-muted)",
  pending:       "var(--th-text-secondary)",
  cancelled:     "var(--th-danger, #ef4444)",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox:         "Inbox",
  planned:       "Planned",
  collaborating: "Collab",
  in_progress:   "Running",
  review:        "Review",
  done:          "Done",
  pending:       "Pending",
  cancelled:     "Cancelled",
};

const AGENT_STATUS_COLOR: Record<string, string> = {
  working: "var(--th-success, #22c55e)",
  idle:    "var(--th-text-muted)",
  break:   "var(--th-accent, #f59e0b)",
  offline: "var(--th-danger, #ef4444)",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function elapsed(start: number | null | undefined, end: number | null | undefined): string {
  if (!start || !end) return "—";
  const ms = end - start;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export default function ProjectFolderWindow({
  project,
  tasks,
  agents,
  onClose,
  onSelectProject,
  onDeleteProject,
  initialX = 160,
  initialY = 80,
}: Props) {
  const [tab, setTab] = useState<Tab>("files");
  const { t } = useI18n();
  const { currentProjectId, setCurrentProjectId } = useProjectStore();
  const isActive = currentProjectId === project.id;
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: 860, h: 560 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // 마운트 시 API에서 신선한 에이전트 목록을 가져옴 (스토어 캐시 무효화 대응)
  const [assignedAgentIds, setAssignedAgentIds] = useState<Set<string>>(
    new Set(project.assigned_agent_ids ?? []),
  );
  useEffect(() => {
    fetch(`/api/projects/${project.id}/agents`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { agents: Array<{ id: string }> } | null) => {
        if (data?.agents) setAssignedAgentIds(new Set(data.agents.map((a) => a.id)));
      })
      .catch(() => { /* 실패 시 prop 값 유지 */ });
  }, [project.id]);

  const projectTasks = tasks.filter((t) => t.project_id === project.id && !t.hidden);
  const projectAgents = assignedAgentIds.size > 0
    ? agents.filter((a) => assignedAgentIds.has(a.id))
    : [];

  const statusCounts = projectTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  // ── Drag ────────────────────────────────────────────────────────
  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragging.current) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (resizing.current) {
        setSize({
          w: Math.max(520, resizeStart.current.w + e.clientX - resizeStart.current.x),
          h: Math.max(360, resizeStart.current.h + e.clientY - resizeStart.current.y),
        });
      }
    }
    function onMouseUp() { dragging.current = false; resizing.current = false; }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
  }, [size]);

  const activeTasks  = projectTasks.filter((t) => t.status === "in_progress" || t.status === "collaborating");
  const doneTasks    = projectTasks.filter((t) => t.status === "done");

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "files",   label: t({ ko: "파일",    en: "Files",   ja: "ファイル", zh: "文件" }) },
    { id: "tasks",   label: t({ ko: "태스크",  en: "Tasks",   ja: "タスク",   zh: "任务" }),  count: projectTasks.length },
    { id: "agents",  label: t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" }), count: projectAgents.length },
    { id: "details", label: t({ ko: "상세",    en: "Details", ja: "詳細",     zh: "详情" }) },
    { id: "git",     label: t({ ko: "Git",     en: "Git",     ja: "Git",      zh: "Git" }) },
  ];

  return (
    <div
      data-no-ctx="true"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 800,
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-surface)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--th-border-strong)",
        borderRadius: 12,
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        fontFamily: "var(--th-font-mono)",
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
          height: 40,
          flexShrink: 0,
          background: "var(--th-glass-bg)",
          borderBottom: "1px solid var(--th-border)",
          cursor: "default",
          userSelect: "none",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        <TrafficLights onClose={onClose} />
        <span style={{ fontSize: 13, marginLeft: 4 }}>📁</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }} onMouseDown={(e) => e.stopPropagation()}>
          {isActive ? (
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontFamily: "var(--th-font-mono)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 7 }}>◉</span> {t({ ko: "활성", en: "Active", ja: "アクティブ", zh: "活跃" })}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { onSelectProject(project.id); setCurrentProjectId(project.id); }}
              style={{ fontSize: 10, padding: "3px 10px", background: "var(--th-accent-glow)", border: "1px solid var(--th-accent-border)", borderRadius: 4, color: "var(--th-accent)", cursor: "pointer", fontFamily: "var(--th-font-mono)" }}
            >
              ▶ {t({ ko: "활성화", en: "Activate", ja: "起動", zh: "激活" })}
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, height: 30, borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)", flexShrink: 0, padding: "0 16px" }}>
        <StatPill icon="▦" value={`${activeTasks.length} ${t({ ko: "실행중", en: "running", ja: "実行中", zh: "运行中" })}`} color={activeTasks.length > 0 ? "var(--th-success, #22c55e)" : "var(--th-text-muted)"} />
        <Divider />
        <StatPill icon="✓" value={`${doneTasks.length} ${t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}`} color="var(--th-text-muted)" />
        <Divider />
        <StatPill icon="👤" value={`${projectAgents.length} ${t({ ko: "에이전트", en: "agents", ja: "エージェント", zh: "代理" })}`} color="var(--th-text-muted)" />
        <Divider />
        <StatPill icon="🕐" value={project.last_used_at ? timeAgo(project.last_used_at) : t({ ko: "없음", en: "never", ja: "なし", zh: "无" })} color="var(--th-text-muted)" />
        {project.project_path && (
          <>
            <Divider />
            <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
              {project.project_path}
            </span>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", padding: "0 12px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", flexShrink: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 14px",
              fontSize: 11,
              fontFamily: "var(--th-font-mono)",
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "var(--th-accent)" : "var(--th-text-secondary)",
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--th-accent)" : "2px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: -1,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 10, background: tab === t.id ? "var(--th-accent-glow)" : "var(--th-bg-surface)", color: tab === t.id ? "var(--th-accent)" : "var(--th-text-muted)", border: "1px solid var(--th-border)" }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "files"   && <FilesTab projectPath={project.project_path} projectName={project.name} />}
        {tab === "tasks"   && <TasksTab tasks={projectTasks} statusCounts={statusCounts} allAgents={agents} />}
        {tab === "agents"  && <AgentsTab agents={projectAgents} projectTasks={projectTasks} />}
        {tab === "details" && <DetailsTab project={project} taskCount={projectTasks.length} agentCount={projectAgents.length} onDelete={() => { onDeleteProject(project.id); onClose(); }} />}
        {tab === "git"     && <GitTab project={project} />}
      </div>

      {/* Resize handle */}
      <div onMouseDown={onResizeMouseDown} style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-border)", fontSize: 10, userSelect: "none" }}>
        ⌟
      </div>
    </div>
  );
}

// ── Files Tab ─────────────────────────────────────────────────────────────────

interface FileTreeNode {
  name: string;
  type: "dir" | "file";
  path: string; // absolute path built on client
  children?: FileTreeNode[];
}

const FILE_ICONS: Record<string, string> = {
  ts: "📄", tsx: "⚛", js: "📄", jsx: "⚛", mjs: "📄",
  json: "📋", yaml: "📋", yml: "📋", toml: "📋",
  md: "📝", mdx: "📝", txt: "📝",
  sh: "⚡", bash: "⚡", zsh: "⚡", fish: "⚡",
  py: "🐍", rb: "💎", go: "🐹", rs: "🦀",
  html: "🌐", css: "🎨", scss: "🎨", sass: "🎨",
  svg: "🖼", png: "🖼", jpg: "🖼", gif: "🖼", webp: "🖼",
  sql: "🗄", prisma: "🗄",
  env: "🔑", lock: "🔒",
};

const RUNNABLE_EXTENSIONS = new Set(["sh", "bash", "zsh", "fish", "py", "js", "ts", "mjs"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function buildTree(nodes: Array<{ name: string; type: "dir" | "file"; children?: unknown[] }>, basePath: string): FileTreeNode[] {
  return nodes.map((n) => ({
    name: n.name,
    type: n.type,
    path: basePath + "/" + n.name,
    children: n.type === "dir" && n.children
      ? buildTree(n.children as Array<{ name: string; type: "dir" | "file"; children?: unknown[] }>, basePath + "/" + n.name)
      : undefined,
  }));
}

function FileNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (node: FileTreeNode) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const indent = depth * 14;

  if (node.type === "dir") {
    return (
      <div>
        <div
          onClick={() => setOpen((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0", paddingLeft: 8 + indent, cursor: "pointer", fontSize: 11, color: "var(--th-text-secondary)", userSelect: "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-elevated)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <span style={{ opacity: 0.5, fontSize: 9, width: 10, flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
          <span style={{ flexShrink: 0 }}>📁</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        </div>
        {open && node.children?.map((child, i) => (
          <FileNode key={i} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  const ext = getExt(node.name);
  const icon = FILE_ICONS[ext] ?? "·";
  const isSelected = node.path === selectedPath;

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        width: "100%",
        padding: "2px 0",
        paddingLeft: 8 + indent + 14,
        fontSize: 11,
        color: isSelected ? "var(--th-accent)" : "var(--th-text-muted)",
        background: isSelected ? "var(--th-accent-glow)" : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--th-font-mono)",
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--th-bg-elevated)"; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span style={{ flexShrink: 0, opacity: 0.7 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
    </button>
  );
}

function FilesTab({ projectPath, projectName }: { projectPath: string | null; projectName: string }) {
  const { t } = useI18n();
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileTreeNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileTruncated, setFileTruncated] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  useEffect(() => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/path-tree?path=${encodeURIComponent(projectPath)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setTree(buildTree(data.tree ?? [], data.root ?? projectPath));
        else setError(data.error ?? "error");
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoading(false));
  }, [projectPath]);

  const handleSelectFile = (node: FileTreeNode) => {
    setSelectedFile(node);
    setFileContent(null);
    setFileTruncated(false);
    const ext = getExt(node.name);
    if (IMAGE_EXTENSIONS.has(ext)) return; // show via <img>
    setFileLoading(true);
    fetch(`/api/projects/file-content?path=${encodeURIComponent(node.path)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setFileContent(data.content ?? "");
          setFileTruncated(data.truncated ?? false);
        } else {
          setFileContent(`// ${data.error ?? "Cannot read file"}`);
        }
      })
      .catch(() => setFileContent("// Failed to load file"))
      .finally(() => setFileLoading(false));
  };

  const handleOpenInOS = () => {
    if (!selectedFile) return;
    fetch("/api/projects/open-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedFile.path }),
    }).then(() => {
      setOpenSuccess(true);
      setTimeout(() => setOpenSuccess(false), 2000);
    }).catch(() => {});
  };

  const handleRunScript = () => {
    if (!selectedFile) return;
    // Open the REPL window and paste the run command
    const cmd = buildRunCommand(selectedFile.name, selectedFile.path);
    navigator.clipboard.writeText(cmd).catch(() => {});
    fetch("/api/projects/open-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedFile.path }),
    }).catch(() => {});
  };

  if (!projectPath) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
        {t({ ko: "프로젝트 경로가 설정되지 않았습니다", en: "No project path configured", ja: "プロジェクトパス未設定", zh: "未配置项目路径" })}
      </div>
    );
  }

  const selectedExt = selectedFile ? getExt(selectedFile.name) : "";
  const isImage = IMAGE_EXTENSIONS.has(selectedExt);
  const isRunnable = RUNNABLE_EXTENSIONS.has(selectedExt);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: file tree */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--th-border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Path breadcrumb */}
        <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--th-border)", fontSize: 10, color: "var(--th-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
          📁 {projectName}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {loading && <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: "var(--th-text-muted)" }}>{t({ ko: "로딩중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}</div>}
          {error && <div style={{ padding: "12px", fontSize: 11, color: "var(--th-danger, #ef4444)" }}>{error}</div>}
          {!loading && !error && tree.length === 0 && (
            <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: "var(--th-text-muted)" }}>{t({ ko: "빈 디렉토리", en: "Empty directory", ja: "空のディレクトリ", zh: "空目录" })}</div>
          )}
          {tree.map((node, i) => (
            <FileNode key={i} node={node} depth={0} selectedPath={selectedFile?.path ?? null} onSelect={handleSelectFile} />
          ))}
        </div>
      </div>

      {/* Right: file content viewer */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid var(--th-border)", flexShrink: 0, background: "var(--th-bg-elevated)" }}>
              <span style={{ fontSize: 12, flex: 1, color: "var(--th-text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {FILE_ICONS[selectedExt] ?? "·"} {selectedFile.name}
              </span>
              {fileTruncated && (
                <span style={{ fontSize: 10, color: "var(--th-accent)", padding: "1px 6px", borderRadius: 3, border: "1px solid var(--th-accent-border)", background: "var(--th-accent-glow)" }}>
                  {t({ ko: "잘림", en: "truncated", ja: "省略", zh: "截断" })}
                </span>
              )}
              {isRunnable && (
                <ToolbarBtn
                  icon="▶"
                  label={t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
                  color="var(--th-success, #22c55e)"
                  bg="var(--th-green-glow, rgba(34,197,94,0.1))"
                  border="rgba(34,197,94,0.3)"
                  title={`Run ${selectedFile.name} with default runner`}
                  onClick={handleRunScript}
                />
              )}
              <ToolbarBtn
                icon="↗"
                label={openSuccess ? t({ ko: "열렸습니다!", en: "Opened!", ja: "開きました!", zh: "已打开!" }) : t({ ko: "열기", en: "Open", ja: "開く", zh: "打开" })}
                color={openSuccess ? "var(--th-success, #22c55e)" : "var(--th-accent)"}
                bg="var(--th-accent-glow)"
                border="var(--th-accent-border)"
                title="Open with OS default app (VS Code, Finder, etc.)"
                onClick={handleOpenInOS}
              />
            </div>

            {/* Content area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {fileLoading && (
                <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "로딩중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}</div>
              )}
              {!fileLoading && isImage && (
                <img
                  src={`/api/projects/file-content?path=${encodeURIComponent(selectedFile.path)}&raw=1`}
                  alt={selectedFile.name}
                  style={{ maxWidth: "100%", borderRadius: 6 }}
                />
              )}
              {!fileLoading && !isImage && fileContent !== null && (
                <pre
                  style={{
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: "var(--th-text-primary)",
                    whiteSpace: "pre",
                    overflowX: "auto",
                    margin: 0,
                    fontFamily: "var(--th-font-mono)",
                    tabSize: 2,
                  }}
                >
                  <code>{fileContent}</code>
                </pre>
              )}
            </div>

            {/* Status bar */}
            <div style={{ padding: "4px 12px", borderTop: "1px solid var(--th-border)", fontSize: 10, color: "var(--th-text-muted)", display: "flex", gap: 16, flexShrink: 0 }}>
              <span>{selectedExt.toUpperCase() || "FILE"}</span>
              {fileContent !== null && <span>{fileContent.split("\n").length} lines</span>}
              <span style={{ marginLeft: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.path}</span>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", gap: 8 }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>📄</span>
            <span style={{ fontSize: 12 }}>{t({ ko: "파일을 선택하면 미리봅니다", en: "Select a file to preview", ja: "ファイルを選択してプレビュー", zh: "选择文件以预览" })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ icon, label, color, bg, border, title, onClick }: { icon: string; label: string; color: string; bg: string; border: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "3px 8px", borderRadius: 4, background: bg, border: `1px solid ${border}`, color, cursor: "pointer", fontFamily: "var(--th-font-mono)", flexShrink: 0 }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function buildRunCommand(fileName: string, filePath: string): string {
  const ext = getExt(fileName);
  switch (ext) {
    case "sh": case "bash": case "zsh": case "fish": return `bash "${filePath}"`;
    case "py": return `python "${filePath}"`;
    case "js": case "mjs": return `node "${filePath}"`;
    case "ts": return `npx tsx "${filePath}"`;
    default: return `"${filePath}"`;
  }
}

// ── Tasks Tab (split-pane) ────────────────────────────────────────────────────

function TasksTab({ tasks, statusCounts, allAgents }: { tasks: Task[]; statusCounts: Record<string, number>; allAgents: Agent[] }) {
  const { t } = useI18n();
  const [filter, setFilter]         = useState<TaskStatus | "all">("all");
  const [search, setSearch]         = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeStatuses = Object.keys(statusCounts) as TaskStatus[];
  const visible = tasks.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedTask = visible.find((t) => t.id === selectedId) ?? visible[0] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, padding: "7px 12px", flexShrink: 0, borderBottom: "1px solid var(--th-border)", flexWrap: "wrap", rowGap: 4 }}>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>{t({ ko: "전체", en: "All", ja: "全て", zh: "全部" })} ({tasks.length})</FilterBtn>
        {activeStatuses.map((s) => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
            <span style={{ color: STATUS_COLORS[s], fontSize: 7 }}>●</span>
            {STATUS_LABEL[s]} ({statusCounts[s]})
          </FilterBtn>
        ))}
        <input
          type="text"
          placeholder={t({ ko: "검색...", en: "search...", ja: "検索...", zh: "搜索..." })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: "auto", fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", outline: "none", width: 110 }}
        />
      </div>

      {/* Split pane */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: task list */}
        <div style={{ width: 240, flexShrink: 0, overflowY: "auto", borderRight: "1px solid var(--th-border)" }}>
          {visible.length === 0 && (
            <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--th-text-muted)", fontSize: 11 }}>{t({ ko: "태스크 없음", en: "No tasks", ja: "タスクなし", zh: "无任务" })}</div>
          )}
          {visible.map((task) => {
            const isSelected = task.id === (selectedTask?.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedId(task.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  width: "100%",
                  padding: "9px 12px",
                  borderBottom: "1px solid var(--th-border)",
                  background: isSelected ? "var(--th-accent-glow)" : "transparent",
                  border: "none",
                  borderBottomColor: "var(--th-border)",
                  borderBottomWidth: 1,
                  borderBottomStyle: "solid",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--th-bg-elevated)"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{ color: STATUS_COLORS[task.status], fontSize: 7, marginTop: 4, flexShrink: 0 }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "var(--th-accent)" : (task.status === "done" || task.status === "cancelled" ? "var(--th-text-muted)" : "var(--th-text-primary)"),
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: task.status === "cancelled" ? "line-through" : "none",
                  }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                    {task.agent_avatar ?? ""} {task.agent_name ?? "—"} · {timeAgo(task.created_at)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: preview pane */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {selectedTask
            ? <TaskPreview task={selectedTask} allAgents={allAgents} />
            : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "태스크를 선택하세요", en: "Select a task", ja: "タスクを選択", zh: "选择任务" })}</div>
          }
        </div>
      </div>
    </div>
  );
}

// ── Task Preview (right pane) ─────────────────────────────────────────────────

function TaskPreview({ task, allAgents }: { task: Task; allAgents: Agent[] }) {
  const { t } = useI18n();
  const [report, setReport]     = useState<TaskReportDetail | null>(null);
  const [loading, setLoading]   = useState(false);
  const [reportTab, setReportTab] = useState<"result" | "logs" | "subtasks">("result");

  // fetch report when done task selected
  useEffect(() => {
    setReport(null);
    setReportTab("result");
    if (task.status === "done") {
      setLoading(true);
      getTaskReportDetail(task.id)
        .then((d) => setReport(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [task.id, task.status]);

  const agent = allAgents.find((a) => a.id === task.assigned_agent_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--th-text-heading)", lineHeight: 1.3, wordBreak: "break-word" }}>
              {task.title}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {/* Status badge */}
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: STATUS_COLORS[task.status], display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 7 }}>●</span>{STATUS_LABEL[task.status]}
              </span>
              {/* Agent */}
              {agent && (
                <span style={{ fontSize: 10, color: "var(--th-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  {agent.avatar_emoji} {agent.name}
                </span>
              )}
              {/* Duration */}
              {task.started_at && (
                <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
                  ⏱ {elapsed(task.started_at, task.completed_at ?? Date.now())}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 10, color: "var(--th-text-muted)" }}>
          <span>{t({ ko: "생성:", en: "Created:", ja: "作成:", zh: "创建:" })} {fmtTime(task.created_at)}</span>
          {task.started_at && <span>{t({ ko: "시작:", en: "Started:", ja: "開始:", zh: "开始:" })} {fmtTime(task.started_at)}</span>}
          {task.completed_at && <span>{t({ ko: "완료:", en: "Done:", ja: "完了:", zh: "完成:" })} {fmtTime(task.completed_at)}</span>}
        </div>
      </div>

      {/* Body */}
      {task.status === "done" ? (
        <DonePreview report={report} loading={loading} reportTab={reportTab} setReportTab={setReportTab} task={task} />
      ) : task.status === "in_progress" || task.status === "collaborating" ? (
        <RunningPreview task={task} />
      ) : (
        <PendingPreview task={task} />
      )}
    </div>
  );
}

// ── Done: report preview ──────────────────────────────────────────────────────

function DonePreview({
  report,
  loading,
  reportTab,
  setReportTab,
  task,
}: {
  report: TaskReportDetail | null;
  loading: boolean;
  reportTab: "result" | "logs" | "subtasks";
  setReportTab: (t: "result" | "logs" | "subtasks") => void;
  task: Task;
}) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
        <span style={{ animation: "pulse 1s infinite" }}>{t({ ko: "리포트 로딩중...", en: "loading report...", ja: "レポート読み込み中...", zh: "加载报告..." })}</span>
      </div>
    );
  }

  const RTABS: { id: "result" | "logs" | "subtasks"; label: string }[] = [
    { id: "result",   label: t({ ko: "결과", en: "Result", ja: "結果", zh: "结果" }) },
    { id: "logs",     label: `${t({ ko: "로그", en: "Logs", ja: "ログ", zh: "日志" })} (${report?.logs?.length ?? 0})` },
    { id: "subtasks", label: `${t({ ko: "서브태스크", en: "Subtasks", ja: "サブタスク", zh: "子任务" })} (${report?.subtasks?.length ?? 0})` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Inner tabs */}
      <div style={{ display: "flex", gap: 0, padding: "0 16px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", flexShrink: 0 }}>
        {RTABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setReportTab(t.id)}
            style={{
              padding: "6px 12px",
              fontSize: 10,
              fontFamily: "var(--th-font-mono)",
              fontWeight: reportTab === t.id ? 600 : 400,
              color: reportTab === t.id ? "var(--th-accent)" : "var(--th-text-secondary)",
              background: "none",
              border: "none",
              borderBottom: reportTab === t.id ? "2px solid var(--th-accent)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {reportTab === "result" && (
          <ResultPane report={report} task={task} />
        )}
        {reportTab === "logs" && (
          <LogsPane logs={report?.logs ?? []} />
        )}
        {reportTab === "subtasks" && (
          <SubtasksPane subtasks={report?.subtasks ?? []} />
        )}
      </div>
    </div>
  );
}

function ResultPane({ report, task }: { report: TaskReportDetail | null; task: Task }) {
  // Try planning summary first, then team reports, then raw result
  const content =
    report?.planning_summary?.content ||
    report?.team_reports?.map((tr) => tr.title + "\n" + tr.summary).join("\n\n") ||
    task.result ||
    null;

  const { t } = useI18n();

  if (!content) {
    return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "결과 없음", en: "No result content", ja: "結果なし", zh: "无结果内容" })}</div>;
  }

  return (
    <pre
      style={{
        fontSize: 11,
        lineHeight: 1.6,
        color: "var(--th-text-primary)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: 0,
        fontFamily: "var(--th-font-mono)",
      }}
    >
      {content}
    </pre>
  );
}

function LogsPane({ logs }: { logs: Array<{ kind: string; message: string; created_at: number }> }) {
  const { t } = useI18n();
  if (logs.length === 0) return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "로그 없음", en: "No logs", ja: "ログなし", zh: "无日志" })}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {logs.map((log, i) => (
        <div key={i} style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--th-text-secondary)" }}>
          <span style={{ color: "var(--th-text-muted)", flexShrink: 0, width: 90 }}>{fmtTime(log.created_at)}</span>
          <span style={{ color: log.kind === "error" ? "var(--th-danger, #ef4444)" : "var(--th-text-muted)", flexShrink: 0, width: 60 }}>[{log.kind}]</span>
          <span style={{ flex: 1, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

function SubtasksPane({ subtasks }: { subtasks: Array<{ id: string; title: string; status: string; agent_name: string; completed_at: number | null }> }) {
  const { t } = useI18n();
  if (subtasks.length === 0) return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>{t({ ko: "서브태스크 없음", en: "No subtasks", ja: "サブタスクなし", zh: "无子任务" })}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {subtasks.map((st) => (
        <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, padding: "6px 0", borderBottom: "1px solid var(--th-border)" }}>
          <span style={{ fontSize: 9, color: st.status === "done" ? "var(--th-success, #22c55e)" : "var(--th-text-muted)" }}>
            {st.status === "done" ? "✓" : "○"}
          </span>
          <span style={{ flex: 1, color: st.status === "done" ? "var(--th-text-muted)" : "var(--th-text-primary)" }}>{st.title}</span>
          <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{st.agent_name}</span>
        </div>
      ))}
    </div>
  );
}

// ── Running preview ───────────────────────────────────────────────────────────

function RunningPreview({ task }: { task: Task }) {
  const { t } = useI18n();
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((v) => v + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Pulse indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--th-success, #22c55e)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: 12, color: "var(--th-success, #22c55e)", fontWeight: 600 }}>
          {t({ ko: "실행중", en: "Running", ja: "実行中", zh: "运行中" })}
          {task.execution_state && ` — ${task.execution_state.replace(/_/g, " ")}`}
        </span>
      </div>
      {task.description && (
        <div style={{ fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {task.description}
        </div>
      )}
      {task.last_output_at && (
        <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
          {t({ ko: "마지막 출력:", en: "Last output:", ja: "最終出力:", zh: "最后输出:" })} {timeAgo(task.last_output_at)}
        </div>
      )}
      {task.subtask_total != null && task.subtask_total > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6 }}>
            {t({ ko: "서브태스크:", en: "Subtasks:", ja: "サブタスク:", zh: "子任务:" })} {task.subtask_done ?? 0} / {task.subtask_total}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--th-bg-elevated)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              borderRadius: 2,
              background: "var(--th-success, #22c55e)",
              width: `${Math.round(((task.subtask_done ?? 0) / task.subtask_total) * 100)}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pending/Inbox/Planned preview ─────────────────────────────────────────────

function PendingPreview({ task }: { task: Task }) {
  return (
    <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {task.description && (
        <div style={{ fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {task.description}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {task.priority !== undefined && (
          <MetaChip label="Priority" value={String(task.priority)} />
        )}
        {task.task_type && (
          <MetaChip label="Type" value={task.task_type} />
        )}
        {task.timeout_minutes != null && (
          <MetaChip label="Timeout" value={`${task.timeout_minutes}m`} />
        )}
        {task.context_hint && (
          <MetaChip label="Hint" value={task.context_hint} />
        )}
      </div>
      {task.execution_error_summary && (
        <div style={{ padding: "10px 12px", borderRadius: 6, background: "var(--th-danger-bg, rgba(239,68,68,0.08))", border: "1px solid var(--th-danger-border, rgba(239,68,68,0.3))", fontSize: 11, color: "var(--th-danger-text, #f85149)", lineHeight: 1.5 }}>
          ⚠ {task.execution_error_summary}
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      <span style={{ color: "var(--th-text-muted)" }}>{label}:</span>
      <span style={{ color: "var(--th-text-primary)" }}>{value}</span>
    </div>
  );
}

// ── Agents Tab ────────────────────────────────────────────────────────────────

function AgentsTab({ agents, projectTasks }: { agents: Agent[]; projectTasks: Task[] }) {
  const { t } = useI18n();
  if (agents.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
        {t({ ko: "이 프로젝트에 배정된 에이전트가 없습니다", en: "No agents assigned to this project", ja: "エージェント未割当", zh: "无代理分配至此项目" })}
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {agents.map((agent) => {
        const agentTasks = projectTasks.filter((t) => t.assigned_agent_id === agent.id);
        const activeTasks = agentTasks.filter((t) => t.status === "in_progress" || t.status === "collaborating");
        const doneTasks = agentTasks.filter((t) => t.status === "done");
        return (
          <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--th-border)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {agent.avatar_emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)" }}>{agent.name}</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: AGENT_STATUS_COLOR[agent.status] ?? "var(--th-text-muted)" }}>
                  <span style={{ color: AGENT_STATUS_COLOR[agent.status] ?? "var(--th-text-muted)", fontSize: 7 }}>●</span>
                  {" "}{agent.status}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                {agent.role} · {activeTasks.length > 0 ? `${activeTasks.length} ${t({ ko: "활성", en: "active", ja: "アクティブ", zh: "活跃" })}` : t({ ko: "유휴", en: "idle", ja: "待機", zh: "空闲" })} · {doneTasks.length} {t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--th-text-heading)", lineHeight: 1 }}>{agentTasks.length}</div>
              <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>{t({ ko: "태스크", en: "tasks", ja: "タスク", zh: "任务" })}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Details Tab ───────────────────────────────────────────────────────────────

function DetailsTab({ project, taskCount, agentCount, onDelete }: { project: Project; taskCount: number; agentCount: number; onDelete: () => void }) {
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
        <div key={label} style={{ display: "flex", gap: 12, padding: "8px 16px", borderBottom: "1px solid var(--th-border)" }}>
          <span style={{ fontSize: 11, color: "var(--th-text-muted)", width: 90, flexShrink: 0, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 11, color: "var(--th-text-primary)", flex: 1, overflow: "hidden", textOverflow: multiline ? undefined : "ellipsis", whiteSpace: multiline ? "normal" : "nowrap", wordBreak: multiline ? "break-word" : undefined }}>
            {value?.toString() ?? "—"}
          </span>
        </div>
      ))}

      {/* 위험 구역 */}
      <div style={{ margin: "20px 16px 12px", padding: "14px 16px", borderRadius: 8, border: "1px solid var(--th-danger-border, rgba(239,68,68,0.3))", background: "var(--th-danger-bg, rgba(239,68,68,0.06))" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--th-danger-text, #f85149)", marginBottom: 8 }}>{t({ ko: "위험 구역", en: "Danger Zone", ja: "危険ゾーン", zh: "危险区域" })}</div>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatPill({ icon, value, color }: { icon: string; value: string; color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color, fontFamily: "var(--th-font-mono)", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 10 }}>{icon}</span>{value}
    </span>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 12, background: "var(--th-border)", margin: "0 10px", flexShrink: 0 }} />;
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 4,
        border: "1px solid var(--th-border)",
        background: active ? "var(--th-accent-glow)" : "var(--th-bg-elevated)",
        color: active ? "var(--th-accent)" : "var(--th-text-secondary)",
        cursor: "pointer",
        fontFamily: "var(--th-font-mono)",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </button>
  );
}

function DeleteProjectButton({ projectName, onConfirm }: { projectName: string; onConfirm: () => void }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--th-danger-text, #f85149)", fontFamily: "var(--th-font-mono)" }}>
          &ldquo;{projectName}&rdquo; {t({ ko: "삭제?", en: "Delete?", ja: "削除?", zh: "删除?" })}
        </span>
        <button
          type="button"
          onClick={onConfirm}
          style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "var(--th-danger, #ef4444)", border: "none", color: "#fff", cursor: "pointer", fontFamily: "var(--th-font-mono)", fontWeight: 600 }}
        >
          {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "pointer", fontFamily: "var(--th-font-mono)" }}
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
      style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "var(--th-danger-bg, rgba(239,68,68,0.08))", border: "1px solid var(--th-danger-border, rgba(239,68,68,0.3))", color: "var(--th-danger-text, #f85149)", cursor: "pointer", fontFamily: "var(--th-font-mono)", flexShrink: 0 }}
    >
      🗑 {t({ ko: "프로젝트 삭제", en: "Delete Project", ja: "プロジェクト削除", zh: "删除项目" })}
    </button>
  );
}

// ── GitTab ────────────────────────────────────────────────────────────────────
type GitProvider = "github" | "gitlab";
type CloneStep = "idle" | "cloning" | "done" | "error";

function GitTab({ project }: { project: Project }) {
  const { t } = useI18n();
  const mono = "var(--th-font-mono)";

  const [provider, setProvider] = useState<GitProvider>("github");

  // GitHub
  const [ghUrl, setGhUrl]       = useState("");
  const [ghToken, setGhToken]   = useState("");
  const [ghBranch, setGhBranch] = useState("");

  // GitLab
  const [glUrl, setGlUrl]       = useState("");
  const [glToken, setGlToken]   = useState("");
  const [glBranch, setGlBranch] = useState("");

  const [step, setStep]     = useState<CloneStep>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  function parseGitHubOwnerRepo(url: string): { owner: string; repo: string } | null {
    const m = url.trim().replace(/\.git$/, "").match(/github\.com[/:]([^/]+)\/([^/]+)/);
    return m ? { owner: m[1], repo: m[2] } : null;
  }

  async function handleClone() {
    setStep("cloning");
    setProgress(5);
    setErrorMsg("");
    try {
      let cloneId: string;
      if (provider === "github") {
        const parsed = parseGitHubOwnerRepo(ghUrl);
        if (!parsed) throw new Error(t({ ko: "GitHub URL 형식이 잘못되었습니다.", en: "Invalid GitHub URL format.", ja: "GitHub URLの形式が正しくありません。", zh: "GitHub URL 格式无效。" }));
        const res = await cloneGitHubRepo({
          owner: parsed.owner,
          repo: parsed.repo,
          branch: ghBranch.trim() || undefined,
          target_path: project.project_path,
          pat: ghToken.trim() || undefined,
        });
        if (res.already_exists) { setStep("done"); return; }
        cloneId = res.clone_id!;
      } else {
        const res = await cloneGitLabRepo({
          repo_url: glUrl.trim(),
          token: glToken.trim(),
          branch: glBranch.trim() || undefined,
          target_path: project.project_path,
        });
        if (res.already_exists) { setStep("done"); return; }
        cloneId = res.clone_id!;
      }

      pollRef.current = setInterval(async () => {
        try {
          const status = provider === "github"
            ? await getCloneStatus(cloneId)
            : await getGitLabCloneStatus(cloneId);
          setProgress(status.progress ?? 0);
          if (status.status === "done") {
            stopPoll(); setProgress(100); setStep("done");
          } else if (status.status === "error") {
            stopPoll();
            setErrorMsg(status.error ?? t({ ko: "클론 실패", en: "Clone failed", ja: "クローン失敗", zh: "克隆失败" }));
            setStep("error");
          }
        } catch { /* 무시 */ }
      }, 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const ghReady = ghUrl.trim().length > 0;
  const glReady = glUrl.trim().length > 0 && glToken.trim().length > 0;
  const canClone = provider === "github" ? ghReady : glReady;

  const s: React.CSSProperties = { fontFamily: mono };
  const inputStyle: React.CSSProperties = {
    ...s, fontSize: 11, padding: "6px 10px",
    background: "var(--th-bg-panel)", border: "1px solid var(--th-border)",
    borderRadius: 6, color: "var(--th-text-primary)", outline: "none", width: "100%",
  };

  if (step === "cloning") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
        <div style={{ ...s, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
          {t({ ko: "클론 중...", en: "Cloning...", ja: "クローン中...", zh: "正在克隆..." })}
        </div>
        <div style={{ width: 280, height: 6, borderRadius: 3, background: "var(--th-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--th-accent)", transition: "width 0.4s ease", borderRadius: 3 }} />
        </div>
        <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)" }}>{progress}%</div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="19" stroke="#30d158" strokeWidth="2" fill="none" opacity="0.2"/><path d="M13 22L19 28L31 16" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div style={{ ...s, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>
          {t({ ko: "완료!", en: "Done!", ja: "完了!", zh: "完成!" })}
        </div>
        <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)" }}>{project.project_path}</div>
        <button onClick={() => { setStep("idle"); setProgress(0); }} style={{ ...s, fontSize: 11, padding: "5px 16px", borderRadius: 6, border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}>
          {t({ ko: "다시 가져오기", en: "Import again", ja: "再インポート", zh: "重新导入" })}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, height: "100%", overflowY: "auto" }}>
      {/* 설명 */}
      <div style={{ ...s, fontSize: 11, color: "var(--th-text-muted)", padding: "8px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6 }}>
        {t({
          ko: `저장소를 이 프로젝트 경로(${project.project_path})로 클론합니다.`,
          en: `Clone a repository into this project path (${project.project_path}).`,
          ja: `リポジトリをこのプロジェクトパス(${project.project_path})にクローンします。`,
          zh: `将仓库克隆到此项目路径（${project.project_path}）。`,
        })}
      </div>

      {/* 에러 */}
      {step === "error" && (
        <div style={{ ...s, fontSize: 11, color: "var(--th-danger-text)", padding: "8px 12px", background: "var(--th-danger-bg)", border: "1px solid var(--th-danger-border)", borderRadius: 6 }}>
          {errorMsg}
        </div>
      )}

      {/* 플랫폼 선택 */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["github", "gitlab"] as GitProvider[]).map((p) => {
          const active = provider === p;
          const isGh = p === "github";
          const color      = isGh ? "var(--th-text-heading)" : "#fc6d26";
          const activeBg   = isGh ? "var(--th-hover-overlay-subtle)" : "rgba(252,109,38,0.1)";
          const activeBorder = isGh ? "var(--th-border-strong)" : "rgba(252,109,38,0.5)";
          return (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              style={{
                ...s, fontSize: 11, fontWeight: active ? 700 : 500,
                padding: "6px 16px", borderRadius: 6,
                border: `1px solid ${active ? activeBorder : "var(--th-border)"}`,
                background: active ? activeBg : "transparent",
                color: active ? color : "var(--th-text-muted)",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {p === "github" ? "GitHub" : "GitLab"}
            </button>
          );
        })}
      </div>

      {/* GitHub 입력 */}
      {provider === "github" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t({ ko: "저장소 URL", en: "Repository URL", ja: "リポジトリURL", zh: "仓库 URL" })}
            </div>
            <input value={ghUrl} onChange={(e) => setGhUrl(e.target.value)} placeholder="https://github.com/owner/repo" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Personal Access Token <span style={{ opacity: 0.6 }}>({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})</span>
              </div>
              <input value={ghToken} onChange={(e) => setGhToken(e.target.value)} type="password" placeholder="ghp_..." style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t({ ko: "브랜치", en: "Branch", ja: "ブランチ", zh: "分支" })} <span style={{ opacity: 0.6 }}>({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})</span>
              </div>
              <input value={ghBranch} onChange={(e) => setGhBranch(e.target.value)} placeholder="main" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {/* GitLab 입력 */}
      {provider === "gitlab" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t({ ko: "저장소 URL", en: "Repository URL", ja: "リポジトリURL", zh: "仓库 URL" })}
            </div>
            <input value={glUrl} onChange={(e) => setGlUrl(e.target.value)} placeholder="https://gitlab.com/username/repo" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Personal Access Token
              </div>
              <input value={glToken} onChange={(e) => setGlToken(e.target.value)} type="password" placeholder="glpat-xxxxxxxxxxxxxxxxxxxx" style={inputStyle} />
              <div style={{ ...s, fontSize: 9, color: "var(--th-text-muted)", marginTop: 4, opacity: 0.7 }}>
                {t({ ko: "read_repository 스코프 필요", en: "Requires read_repository scope", ja: "read_repositoryスコープが必要", zh: "需要 read_repository 权限" })}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...s, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t({ ko: "브랜치", en: "Branch", ja: "ブランチ", zh: "分支" })} <span style={{ opacity: 0.6 }}>({t({ ko: "선택", en: "optional", ja: "任意", zh: "可选" })})</span>
              </div>
              <input value={glBranch} onChange={(e) => setGlBranch(e.target.value)} placeholder="main" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {/* 클론 버튼 */}
      <button
        type="button"
        onClick={handleClone}
        disabled={!canClone}
        style={{
          ...s, fontSize: 12, fontWeight: 700, padding: "9px 0", borderRadius: 6, border: "none",
          background: canClone ? "var(--th-accent)" : "rgba(245,158,11,0.2)",
          color: canClone ? "#000" : "var(--th-text-muted)",
          cursor: canClone ? "pointer" : "not-allowed",
          marginTop: 4,
        }}
      >
        {t({ ko: "저장소 클론", en: "Clone Repository", ja: "リポジトリをクローン", zh: "克隆仓库" })}
      </button>
    </div>
  );
}
