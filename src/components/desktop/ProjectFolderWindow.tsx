import { useState, useRef, useCallback, useEffect } from "react";
import type { Project, Agent, Task, TaskStatus } from "../../types";
import type { TaskReportDetail } from "../../api/providers-reports-github";
import { getTaskReportDetail } from "../../api/providers-reports-github";
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

type Tab = "files" | "tasks" | "agents" | "info";

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

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "files",  label: "Files" },
    { id: "tasks",  label: "Tasks",  count: projectTasks.length },
    { id: "agents", label: "Agents", count: projectAgents.length },
    { id: "info",   label: "Info" },
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
        <div style={{ display: "flex", gap: 5 }} onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onSelectProject(project.id)}
            style={{ fontSize: 10, padding: "3px 8px", background: "var(--th-accent-glow)", border: "1px solid var(--th-accent-border)", borderRadius: 4, color: "var(--th-accent)", cursor: "pointer", fontFamily: "var(--th-font-mono)" }}
          >
            Switch
          </button>
          <DeleteProjectButton projectName={project.name} onConfirm={() => { onDeleteProject(project.id); onClose(); }} />
        </div>
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
        {tab === "files"  && <FilesTab projectPath={project.project_path} projectName={project.name} />}
        {tab === "tasks"  && <TasksTab tasks={projectTasks} statusCounts={statusCounts} allAgents={agents} />}
        {tab === "agents" && <AgentsTab agents={projectAgents} projectTasks={projectTasks} />}
        {tab === "info"   && <InfoTab project={project} taskCount={projectTasks.length} agentCount={projectAgents.length} onDelete={() => { onDeleteProject(project.id); onClose(); }} />}
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
        No project path configured
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
          {loading && <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: "var(--th-text-muted)" }}>loading...</div>}
          {error && <div style={{ padding: "12px", fontSize: 11, color: "var(--th-danger, #ef4444)" }}>{error}</div>}
          {!loading && !error && tree.length === 0 && (
            <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: "var(--th-text-muted)" }}>Empty directory</div>
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
                  truncated
                </span>
              )}
              {isRunnable && (
                <ToolbarBtn
                  icon="▶"
                  label="Run"
                  color="var(--th-success, #22c55e)"
                  bg="var(--th-green-glow, rgba(34,197,94,0.1))"
                  border="rgba(34,197,94,0.3)"
                  title={`Run ${selectedFile.name} with default runner`}
                  onClick={handleRunScript}
                />
              )}
              <ToolbarBtn
                icon="↗"
                label={openSuccess ? "Opened!" : "Open"}
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
                <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>loading...</div>
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
            <span style={{ fontSize: 12 }}>Select a file to preview</span>
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
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>All ({tasks.length})</FilterBtn>
        {activeStatuses.map((s) => (
          <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
            <span style={{ color: STATUS_COLORS[s], fontSize: 7 }}>●</span>
            {STATUS_LABEL[s]} ({statusCounts[s]})
          </FilterBtn>
        ))}
        <input
          type="text"
          placeholder="search..."
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
            <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--th-text-muted)", fontSize: 11 }}>No tasks</div>
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
            : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12 }}>Select a task</div>
          }
        </div>
      </div>
    </div>
  );
}

// ── Task Preview (right pane) ─────────────────────────────────────────────────

function TaskPreview({ task, allAgents }: { task: Task; allAgents: Agent[] }) {
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
          <span>Created: {fmtTime(task.created_at)}</span>
          {task.started_at && <span>Started: {fmtTime(task.started_at)}</span>}
          {task.completed_at && <span>Done: {fmtTime(task.completed_at)}</span>}
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
  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
        <span style={{ animation: "pulse 1s infinite" }}>loading report...</span>
      </div>
    );
  }

  const RTABS: { id: "result" | "logs" | "subtasks"; label: string }[] = [
    { id: "result",   label: "Result" },
    { id: "logs",     label: `Logs (${report?.logs?.length ?? 0})` },
    { id: "subtasks", label: `Subtasks (${report?.subtasks?.length ?? 0})` },
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

  if (!content) {
    return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>No result content</div>;
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
  if (logs.length === 0) return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>No logs</div>;
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
  if (subtasks.length === 0) return <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>No subtasks</div>;
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
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Pulse indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--th-success, #22c55e)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: 12, color: "var(--th-success, #22c55e)", fontWeight: 600 }}>
          Running
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
          Last output: {timeAgo(task.last_output_at)}
        </div>
      )}
      {task.subtask_total != null && task.subtask_total > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6 }}>
            Subtasks: {task.subtask_done ?? 0} / {task.subtask_total}
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
  if (agents.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
        No agents assigned to this project
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
                {agent.role} · {activeTasks.length > 0 ? `${activeTasks.length} active` : "idle"} · {doneTasks.length} done
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--th-text-heading)", lineHeight: 1 }}>{agentTasks.length}</div>
              <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>tasks</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Info Tab ──────────────────────────────────────────────────────────────────

function InfoTab({ project, taskCount, agentCount, onDelete }: { project: Project; taskCount: number; agentCount: number; onDelete: () => void }) {
  const rows: Array<{ label: string; value: string | number | null | undefined; multiline?: boolean }> = [
    { label: "Name",        value: project.name },
    { label: "Path",        value: project.project_path || "—" },
    { label: "Goal",        value: project.core_goal || "—", multiline: true },
    { label: "Tasks",       value: taskCount },
    { label: "Agents",      value: agentCount },
    { label: "Created",     value: project.created_at ? new Date(project.created_at).toLocaleDateString() : "—" },
    { label: "Last used",   value: project.last_used_at ? timeAgo(project.last_used_at) : "—" },
    { label: "GitHub",      value: project.github_repo || "—" },
    { label: "Risk",        value: project.risk_profile || "—" },
    { label: "Success KPI", value: project.success_metric || "—", multiline: true },
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
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--th-danger-text, #f85149)", marginBottom: 8 }}>Danger Zone</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 11, color: "var(--th-text-muted)" }}>
            이 프로젝트를 삭제합니다. 되돌릴 수 없습니다.
          </span>
          <DeleteProjectButton projectName={project.name} onConfirm={onDelete} />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--th-danger-text, #f85149)", fontFamily: "var(--th-font-mono)" }}>
          &ldquo;{projectName}&rdquo; 삭제?
        </span>
        <button
          type="button"
          onClick={onConfirm}
          style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "var(--th-danger, #ef4444)", border: "none", color: "#fff", cursor: "pointer", fontFamily: "var(--th-font-mono)", fontWeight: 600 }}
        >
          삭제
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", cursor: "pointer", fontFamily: "var(--th-font-mono)" }}
        >
          취소
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
      🗑 Delete Project
    </button>
  );
}
