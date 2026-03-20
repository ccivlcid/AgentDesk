import { useState, useEffect } from "react";
import { useI18n } from "../../../i18n";
import type { FileTreeNode } from "./types";
import { FILE_ICONS, RUNNABLE_EXTENSIONS, IMAGE_EXTENSIONS } from "./constants";
import { buildTree, getExt, buildRunCommand } from "./utils";

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

export function FilesTab({ projectPath, projectName }: { projectPath: string | null; projectName: string }) {
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
    if (IMAGE_EXTENSIONS.has(ext)) return;
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
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--th-border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedFile ? (
          <>
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
