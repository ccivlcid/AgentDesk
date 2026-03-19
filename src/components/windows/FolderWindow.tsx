import { useState, useCallback, useRef, useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";
import TrafficLights from "../desktop/TrafficLights";
import {
  addProjectToFolder,
  removeProjectFromFolder,
  fsBrowse,
  type FsEntry,
} from "../../api/project-folders";
import { createProject, addProjectSource } from "../../api/organization-projects";
import type { ProjectFolder, Project } from "../../types";

interface FolderWindowProps {
  folder: ProjectFolder;
  allProjects: Project[];
  onClose: () => void;
  onFolderUpdate: (updated: ProjectFolder) => void;
  onProjectCreated?: (project: Project) => void;
  onProjectPathChanged?: (projectId: string, newPath: string) => void;
  onProjectEjected?: (projectId: string) => void;
  onProjectAdded?: (projectId: string, newPath: string) => void;
}

// ─── ProjectPickerDropdown ───────────────────────────────────────────────────

function ProjectPickerDropdown({
  folder, allProjects, onAdd, onClose,
}: {
  folder: ProjectFolder; allProjects: Project[];
  onAdd: (id: string) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const folderIds = new Set(folder.projects.map((p) => p.id));
  const available = allProjects.filter(
    (p) => !folderIds.has(p.id) && p.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} onClick={onClose} />
      <div style={{
        position: "absolute", bottom: "100%", left: 0, right: 0, zIndex: 10000,
        background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)",
        maxHeight: 240, overflowY: "auto", marginBottom: 4, fontFamily: "var(--th-font-mono)",
      }}>
        <div style={{ padding: 8, borderBottom: "1px solid var(--th-border)" }}>
          <input
            autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t({ ko: "프로젝트 검색...", en: "Search projects...", ja: "プロジェクト検索...", zh: "搜索项目..." })}
            style={{
              width: "100%", boxSizing: "border-box", background: "var(--th-input-bg)",
              border: "1px solid var(--th-border)", color: "var(--th-text-primary)",
              fontFamily: "var(--th-font-mono)", fontSize: 10, padding: "5px 8px", outline: "none",
            }}
          />
        </div>
        {available.length === 0
          ? <div style={{ padding: "10px 12px", fontSize: 10, color: "var(--th-text-muted)" }}>
              {t({ ko: "추가 가능한 프로젝트 없음", en: "No projects available", ja: "追加可能なプロジェクトなし", zh: "没有可添加的项目" })}
            </div>
          : available.map((p) => (
            <button key={p.id} onClick={() => { onAdd(p.id); onClose(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px",
                background: "transparent", border: "none", borderBottom: "1px solid var(--th-border)",
                cursor: "pointer", fontFamily: "var(--th-font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-bg-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 11, color: "var(--th-text-primary)" }}>🗂 {p.name}</div>
              <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>{p.project_path}</div>
            </button>
          ))
        }
      </div>
    </>
  );
}

// ─── FsTreeNode ──────────────────────────────────────────────────────────────

function FsTreeNode({ entry, depth, folderProjects }: {
  entry: FsEntry; depth: number; folderProjects: Array<{ id: string; name: string; project_path: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { setCurrentProjectId } = useProjectStore();

  const matchedProject = folderProjects.find(
    (p) => p.project_path === entry.path || p.project_path.replace(/\\/g, "/") === entry.path.replace(/\\/g, "/"),
  );

  async function toggle() {
    if (entry.type !== "dir") return;
    if (!open) {
      setLoading(true);
      try {
        const result = await fsBrowse(entry.path);
        setChildren(result.entries);
      } catch { setChildren([]); }
      setLoading(false);
    }
    setOpen((v) => !v);
  }

  const indent = depth * 14;
  const isProject = !!matchedProject;

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 6px 3px", paddingLeft: 6 + indent,
          cursor: entry.type === "dir" ? "pointer" : "default",
          borderRadius: 0,
          background: isProject ? "rgba(245,158,11,0.08)" : "transparent",
          borderLeft: isProject ? "2px solid var(--th-accent)" : "2px solid transparent",
        }}
        onClick={toggle}
        onDoubleClick={() => { if (matchedProject) setCurrentProjectId(matchedProject.id); }}
        onMouseEnter={(e) => { if (!isProject) e.currentTarget.style.background = "var(--th-bg-surface)"; }}
        onMouseLeave={(e) => { if (!isProject) e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ fontSize: 10, color: "var(--th-text-muted)", width: 12, textAlign: "center", flexShrink: 0 }}>
          {entry.type === "dir" ? (open ? "▾" : "▸") : "·"}
        </span>
        <span style={{ fontSize: 12 }}>
          {entry.type === "dir" ? (open ? "📂" : "📁") : fileIcon(entry.ext)}
        </span>
        <span style={{
          fontSize: 10, fontFamily: "var(--th-font-mono)",
          color: isProject ? "var(--th-accent)" : "var(--th-text-primary)",
          fontWeight: isProject ? 600 : 400,
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {entry.name}
        </span>
        {isProject && (
          <span style={{
            fontSize: 8, background: "rgba(245,158,11,0.15)", color: "var(--th-accent)",
            padding: "1px 4px", borderRadius: 0, border: "1px solid rgba(245,158,11,0.3)",
            flexShrink: 0,
          }}>
            PROJECT
          </span>
        )}
        {entry.type === "file" && entry.size > 0 && (
          <span style={{ fontSize: 8, color: "var(--th-text-muted)", flexShrink: 0 }}>
            {formatSize(entry.size)}
          </span>
        )}
        {loading && <span style={{ fontSize: 8, color: "var(--th-text-muted)" }}>…</span>}
      </div>
      {open && children.map((child) => (
        <FsTreeNode key={child.path} entry={child} depth={depth + 1} folderProjects={folderProjects} />
      ))}
    </div>
  );
}

function fileIcon(ext: string): string {
  const e = ext.toLowerCase();
  if ([".ts", ".tsx", ".js", ".jsx"].includes(e)) return "📜";
  if ([".md", ".txt"].includes(e)) return "📄";
  if ([".json", ".yaml", ".yml"].includes(e)) return "⚙️";
  if ([".png", ".jpg", ".svg", ".gif", ".webp"].includes(e)) return "🖼";
  if ([".css", ".scss"].includes(e)) return "🎨";
  return "·";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// ─── FileTreeTab ──────────────────────────────────────────────────────────────

function FileTreeTab({ folder }: { folder: ProjectFolder }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fsBrowse(folder.base_path)
      .then((r) => { setEntries(r.entries); setLoading(false); })
      .catch(() => {
        setError(t({ ko: "경로를 읽을 수 없습니다.", en: "Cannot read path.", ja: "パスを読み取れません。", zh: "无法读取路径。" }));
        setLoading(false);
      });
  }, [folder.base_path]);

  if (loading) return (
    <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
      {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--th-danger-text)", fontFamily: "var(--th-font-mono)" }}>
      {error}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
      {/* root label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 6px",
        borderBottom: "1px solid var(--th-border)", marginBottom: 4,
      }}>
        <span style={{ fontSize: 14 }}>{folder.icon ?? "📁"}</span>
        <span style={{ fontSize: 10, color: "var(--th-accent)", fontFamily: "var(--th-font-mono)", fontWeight: 600 }}>
          {folder.base_path}
        </span>
      </div>
      <div style={{ fontSize: 9, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", padding: "0 10px 6px" }}>
        {t({ ko: "프로젝트 아이콘 더블클릭 → 현재 프로젝트로 선택", en: "Double-click project → set as current project", ja: "プロジェクトをダブルクリック → 現在のプロジェクトに設定", zh: "双击项目图标 → 设为当前项目" })}
      </div>
      {entries.length === 0
        ? <div style={{ padding: "16px 10px", fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "폴더가 비어 있습니다.", en: "Folder is empty.", ja: "フォルダが空です。", zh: "文件夹为空。" })}
          </div>
        : entries.map((e) => (
          <FsTreeNode key={e.path} entry={e} depth={0} folderProjects={folder.projects} />
        ))
      }
    </div>
  );
}

// ─── MergeTab ────────────────────────────────────────────────────────────────

function MergeTab({ folder, onProjectCreated }: {
  folder: ProjectFolder; onProjectCreated: (p: Project) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(`${folder.name} — 통합`);
  const [projectPath, setProjectPath] = useState(
    folder.base_path ? `${folder.base_path}/integrated` : "",
  );
  const [coreGoal, setCoreGoal] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(folder.projects.map((p) => p.id)));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; projectName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const MAX_SOURCES = 5;
  const overLimit = selectedIds.size > MAX_SOURCES;

  function toggleProject(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim() || !projectPath.trim() || !coreGoal.trim()) {
      setError(t({ ko: "이름·경로·목표를 모두 입력하세요.", en: "Name, path, and goal are required.", ja: "名前・パス・目標をすべて入力してください。", zh: "请填写名称、路径和目标。" }));
      return;
    }
    if (overLimit) return;
    setError(null);
    setSubmitting(true);
    try {
      const newProject = await createProject({
        name: name.trim(), project_path: projectPath.trim(), core_goal: coreGoal.trim(), create_path_if_missing: true,
      });
      const sources = folder.projects.filter((p) => selectedIds.has(p.id)).slice(0, MAX_SOURCES);
      for (const src of sources) {
        try { await addProjectSource(newProject.id, src.id, src.name); } catch { /* ignore */ }
      }
      setResult({ ok: true, projectName: newProject.name });
      onProjectCreated(newProject);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 13, color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)", fontWeight: 600, marginBottom: 6 }}>
        {t({ ko: "통합 프로젝트 생성 완료", en: "Integrated project created", ja: "統合プロジェクト作成完了", zh: "集成项目已创建" })}
      </div>
      <div style={{ fontSize: 11, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)", marginBottom: 16 }}>
        «{result.projectName}»
      </div>
      <div style={{
        fontSize: 10, color: "var(--th-text-secondary)", fontFamily: "var(--th-font-mono)",
        background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
        padding: "10px 14px", textAlign: "left",
      }}>
        {t({
          ko: "💡 소스 프로젝트들의 완료 deliverable이 에이전트 프롬프트에 자동 주입됩니다.",
          en: "💡 Completed deliverables from source projects are automatically injected into agent prompts.",
          ja: "💡 ソースプロジェクトの完了デリバラブルが自動的にエージェントプロンプトに注入されます。",
          zh: "💡 源项目的已完成交付物将自动注入到智能体提示词中。",
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 16, overflowY: "auto", fontFamily: "var(--th-font-mono)" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>{t({ ko: "합칠 프로젝트 선택", en: "Select projects to merge", ja: "統合するプロジェクトを選択", zh: "选择要合并的项目" })}</span>
          <span style={{ color: overLimit ? "var(--th-danger-text)" : "var(--th-text-muted)" }}>{selectedIds.size} / {MAX_SOURCES}{overLimit && " ⚠️"}</span>
        </div>
        {folder.projects.length === 0
          ? <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{t({ ko: "폴더에 프로젝트가 없습니다.", en: "No projects in folder.", ja: "フォルダにプロジェクトがありません。", zh: "文件夹中没有项目。" })}</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {folder.projects.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <label key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", cursor: "pointer",
                    border: `1px solid ${checked ? "rgba(245,158,11,0.4)" : "var(--th-border)"}`,
                    background: checked ? "rgba(245,158,11,0.07)" : "var(--th-bg-surface)",
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleProject(p.id)}
                      style={{ accentColor: "var(--th-accent)", width: 14, height: 14, cursor: "pointer" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--th-text-primary)", fontWeight: checked ? 600 : 400 }}>🗂 {p.name}</div>
                      <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.project_path}</div>
                    </div>
                  </label>
                );
              })}
            </div>
        }
        {overLimit && <div style={{ fontSize: 9, color: "var(--th-danger-text)", marginTop: 6 }}>{t({ ko: "최대 5개까지 연결 가능합니다.", en: "Up to 5 source projects can be linked.", ja: "最大5件まで連結できます。", zh: "最多可关联5个项目。" })}</div>}
      </div>

      <div style={{ borderTop: "1px solid var(--th-border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginBottom: 2 }}>{t({ ko: "통합 프로젝트 정보", en: "Integrated project info", ja: "統合プロジェクト情報", zh: "集成项目信息" })}</div>
        {[
          { label: { ko: "프로젝트 이름", en: "Project name", ja: "プロジェクト名", zh: "项目名称" }, value: name, set: setName, multiline: false },
          { label: { ko: "프로젝트 경로", en: "Project path", ja: "プロジェクトパス", zh: "项目路径" }, value: projectPath, set: setProjectPath, multiline: false },
        ].map(({ label, value, set }) => {
          return (
            <div key={t(label)}>
              <label style={{ fontSize: 9, color: "var(--th-text-muted)", display: "block", marginBottom: 4 }}>{t(label)} *</label>
              <input type="text" value={value} onChange={(e) => set(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: 11, padding: "6px 8px", outline: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--th-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--th-border)")} />
            </div>
          );
        })}
        <div>
          <label style={{ fontSize: 9, color: "var(--th-text-muted)", display: "block", marginBottom: 4 }}>{t({ ko: "핵심 목표", en: "Core goal", ja: "コアゴール", zh: "核心目标" })} *</label>
          <textarea value={coreGoal} onChange={(e) => setCoreGoal(e.target.value)} rows={3}
            placeholder={t({ ko: "예: 디자인·리서치·개발 산출물을 통합하여 제품 출시 준비", en: "e.g. Integrate design, research, and development outputs for product launch", ja: "例: デザイン・開発成果物を統合して製品リリースを準備", zh: "例如：整合各项目成果，准备产品发布" })}
            style={{ width: "100%", boxSizing: "border-box", background: "var(--th-input-bg)", border: "1px solid var(--th-border)", color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: 11, padding: "6px 8px", outline: "none", resize: "vertical" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--th-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--th-border)")} />
        </div>
        {error && <div style={{ fontSize: 10, color: "var(--th-danger-text)", padding: "6px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
        <button onClick={() => { void handleCreate(); }} disabled={submitting || overLimit || folder.projects.length === 0}
          style={{
            width: "100%", padding: "9px 0", fontSize: 11, fontFamily: "var(--th-font-mono)", fontWeight: 600,
            background: (submitting || overLimit) ? "transparent" : "rgba(245,158,11,0.12)",
            color: (submitting || overLimit) ? "var(--th-text-muted)" : "var(--th-accent)",
            border: `1px solid ${(submitting || overLimit) ? "var(--th-border)" : "rgba(245,158,11,0.4)"}`,
            cursor: (submitting || overLimit) ? "not-allowed" : "pointer",
          }}>
          {submitting ? t({ ko: "생성 중...", en: "Creating...", ja: "作成中...", zh: "创建中..." }) : t({ ko: "⊕ 통합 프로젝트 생성", en: "⊕ Create Integrated Project", ja: "⊕ 統合プロジェクトを作成", zh: "⊕ 创建集成项目" })}
        </button>
      </div>
    </div>
  );
}

// ─── FolderWindow ─────────────────────────────────────────────────────────────

const WIN_W = 680;
const WIN_H = 520;
type Tab = "projects" | "tree" | "merge";

function folderWindowDefaults() {
  return {
    x: Math.max(20, (window.innerWidth - WIN_W) / 2),
    y: Math.max(44, (window.innerHeight - WIN_H) / 3),
    w: WIN_W,
    h: WIN_H,
  };
}

export default function FolderWindow({
  folder, allProjects, onClose, onFolderUpdate, onProjectCreated, onProjectPathChanged,
  onProjectEjected, onProjectAdded,
}: FolderWindowProps) {
  const { t } = useI18n();
  const { closeFolder } = useUiStore();
  const { setCurrentProjectId } = useProjectStore();
  const [pos, setPos] = useState(folderWindowDefaults);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("projects");
  const [ejectMsg, setEjectMsg] = useState<string | null>(null);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPos((p) => ({ ...p, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }));
  }, [dragging]);
  const handleMouseUp = useCallback(() => setDragging(false), []);
  const handleClose = useCallback(() => { closeFolder(folder.id); onClose(); }, [closeFolder, folder.id, onClose]);

  const handleRemove = useCallback(async (projectId: string) => {
    setBusyProjectId(projectId);
    setEjectMsg(null);
    try {
      const result = await removeProjectFromFolder(folder.id, projectId);
      onFolderUpdate({ ...folder, projects: folder.projects.filter((p) => p.id !== projectId) });
      onProjectEjected?.(projectId);
      if (result.moved_on_disk) {
        setEjectMsg(t({ ko: `📂 ${result.new_path} 로 이동됨`, en: `📂 Moved to ${result.new_path}`, ja: `📂 ${result.new_path} へ移動しました`, zh: `📂 已移동到 ${result.new_path}` }));
        onProjectPathChanged?.(projectId, result.new_path);
      }
    } catch { /* ignore */ }
    finally { setBusyProjectId(null); }
  }, [folder, onFolderUpdate, onProjectPathChanged, onProjectEjected, t]);

  const handleAdd = useCallback(async (projectId: string) => {
    setBusyProjectId(projectId);
    try {
      const result = await addProjectToFolder(folder.id, projectId);
      const proj = allProjects.find((p) => p.id === projectId);
      if (proj) {
        onFolderUpdate({
          ...folder,
          projects: [
            ...folder.projects,
            { id: proj.id, name: proj.name, project_path: result.new_path, category_id: proj.category_id ?? null },
          ],
        });
        onProjectAdded?.(projectId, result.new_path);
        if (result.moved_on_disk) onProjectPathChanged?.(projectId, result.new_path);
      }
    } catch { /* ignore */ }
    finally { setBusyProjectId(null); }
  }, [folder, allProjects, onFolderUpdate, onProjectPathChanged, onProjectAdded]);

  const TABS: { id: Tab; icon: string; label: { ko: string; en: string; ja: string; zh: string } }[] = [
    { id: "projects", icon: "🗂", label: { ko: "프로젝트",  en: "Projects",   ja: "プロジェクト", zh: "项目" } },
    { id: "tree",     icon: "📂", label: { ko: "파일 탐색기", en: "File Tree", ja: "ファイル",     zh: "文件树" } },
    { id: "merge",    icon: "⊕",  label: { ko: "통합",       en: "Merge",      ja: "統合",         zh: "合并" } },
  ];

  return (
    <div
      style={{ position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh", zIndex: 800, pointerEvents: "none" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{
        position: "absolute", left: pos.x, top: pos.y, width: pos.w, height: pos.h,
        background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 10,
        display: "flex", flexDirection: "column", pointerEvents: "auto", overflow: "hidden",
        fontFamily: "var(--th-font-mono)",
      }}>
        {/* Header */}
        <div onMouseDown={handleHeaderMouseDown} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-surface)",
          cursor: dragging ? "grabbing" : "grab", userSelect: "none", flexShrink: 0,
        }}>
          <TrafficLights onClose={handleClose} onMinimize={() => {}} onMaximize={() => {}} />
          <span style={{ fontSize: 22 }}>{folder.icon ?? "📁"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--th-text-heading)", fontWeight: 600 }}>{folder.name}</div>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>
              {folder.base_path} · {t({ ko: `${folder.projects.length}개 프로젝트`, en: `${folder.projects.length} projects`, ja: `${folder.projects.length}件`, zh: `${folder.projects.length}个项目` })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-surface)", flexShrink: 0 }}>
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, padding: "8px 0", fontSize: 11, fontFamily: "var(--th-font-mono)",
              background: "transparent", border: "none",
              borderBottom: tab === tb.id ? "2px solid var(--th-accent)" : "2px solid transparent",
              color: tab === tb.id ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer", transition: "color 0.15s",
            }}>
              {tb.icon} {t(tb.label)}
            </button>
          ))}
        </div>

        {/* Tab: Projects */}
        {tab === "projects" && (
          <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
            {ejectMsg && (
              <div style={{
                fontSize: 10, padding: "6px 10px", marginBottom: 10,
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                color: "var(--th-accent)", fontFamily: "var(--th-font-mono)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span>{ejectMsg}</span>
                <button onClick={() => setEjectMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--th-text-muted)", fontSize: 11 }}>✕</button>
              </div>
            )}
            {folder.projects.length === 0 ? (
              <div style={{ fontSize: 11, color: "var(--th-text-muted)", padding: "32px 0", textAlign: "center" }}>
                {t({ ko: "폴더가 비어 있습니다", en: "Folder is empty", ja: "フォルダが空です", zh: "文件夹为空" })}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {folder.projects.map((p) => (
                  <div key={p.id}
                    style={{
                      width: 150, minHeight: 130, background: "var(--th-bg-elevated)",
                      border: "1px solid var(--th-border)", padding: "12px 8px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      cursor: "pointer", transition: "background 0.1s, border-color 0.1s",
                    }}
                    onClick={() => setCurrentProjectId(p.id)}
                    onDoubleClick={() => setCurrentProjectId(p.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--th-bg-surface)";
                      e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--th-bg-elevated)";
                      e.currentTarget.style.borderColor = "var(--th-border)";
                    }}
                  >
                    <div style={{ fontSize: 28 }}>🗂</div>
                    <div style={{
                      fontSize: 11, color: "var(--th-text-primary)", textAlign: "center",
                      wordBreak: "break-word", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", width: "100%",
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontSize: 9, color: "var(--th-text-muted)", width: "100%",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center",
                    }}>
                      {p.project_path}
                    </div>
                    <div style={{ fontSize: 8, color: "var(--th-text-muted)", marginTop: "auto" }}>
                      {t({ ko: "클릭으로 선택", en: "click to select", ja: "クリックで選択", zh: "点击选择" })}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleRemove(p.id); }}
                      disabled={busyProjectId === p.id}
                      style={{
                        background: "transparent", border: "1px solid var(--th-danger-border)",
                        color: "var(--th-danger-text)", fontFamily: "var(--th-font-mono)",
                        fontSize: 9, padding: "3px 8px", cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--th-danger-border)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {busyProjectId === p.id
                        ? t({ ko: "이동 중...", en: "Moving...", ja: "移動中...", zh: "移动中..." })
                        : t({ ko: "꺼내기", en: "Eject", ja: "取り出す", zh: "移出" })}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ position: "relative", marginTop: 16 }}>
              <button onClick={() => setPickerOpen((v) => !v)} style={{
                width: "100%", height: 40, background: "transparent",
                border: "1px dashed var(--th-border)", color: "var(--th-text-muted)",
                fontFamily: "var(--th-font-mono)", fontSize: 11, cursor: "pointer",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--th-accent)"; e.currentTarget.style.color = "var(--th-accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; e.currentTarget.style.color = "var(--th-text-muted)"; }}
              >
                {t({ ko: "+ 프로젝트 추가", en: "+ Add Project", ja: "+ プロジェクト追加", zh: "+ 添加项目" })}
              </button>
              {pickerOpen && (
                <ProjectPickerDropdown folder={folder} allProjects={allProjects} onAdd={handleAdd} onClose={() => setPickerOpen(false)} />
              )}
            </div>
          </div>
        )}

        {/* Tab: File Tree */}
        {tab === "tree" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <FileTreeTab folder={folder} />
          </div>
        )}

        {/* Tab: Merge */}
        {tab === "merge" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <MergeTab
              folder={folder}
              onProjectCreated={(project) => {
                onProjectCreated?.(project);
                setTimeout(() => setTab("projects"), 1800);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
