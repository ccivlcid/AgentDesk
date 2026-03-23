import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  ExternalLink, 
  Image as ImageIcon,
  FileCode,
  FileText,
  Search,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCw,
  MoreVertical,
  HardDrive
} from "lucide-react";
import { useI18n } from "../../../i18n";
import type { FileTreeNode } from "./types";
import { FILE_ICONS, RUNNABLE_EXTENSIONS, IMAGE_EXTENSIONS } from "./constants";
import { buildTree, getExt, buildRunCommand } from "./utils";

// ── FileNode (Recursive Tree) ───────────────────────────────────────────────
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
  const [open, setOpen] = useState(depth < 1);
  const isSelected = node.path === selectedPath;
  const indent = depth * 12;

  if (node.type === "dir") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ 
            display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", 
            paddingLeft: 12 + indent, cursor: "pointer", fontSize: 12, 
            color: "var(--th-text-secondary)", border: "none", background: "none",
            width: "100%", textAlign: "left", transition: "all 0.2s"
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          {open ? <ChevronDown size={14} opacity={0.5} /> : <ChevronRight size={14} opacity={0.5} />}
          <Folder size={14} className="text-amber-400 opacity-80" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
              {node.children?.map((child, i) => (
                <FileNode key={i} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const ext = getExt(node.name);
  const isImage = IMAGE_EXTENSIONS.has(ext);

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 12px",
        paddingLeft: 12 + indent + 22, fontSize: 12, border: "none", cursor: "pointer", textAlign: "left",
        transition: "all 0.2s", borderRadius: 8, margin: "1px 0",
        background: isSelected ? "var(--th-accent-glow)" : "transparent",
        color: isSelected ? "var(--th-text-primary)" : "var(--th-text-muted)",
        boxShadow: isSelected ? "inset 0 0 0 1px var(--th-accent-border)" : "none"
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "none"; }}
    >
      {isImage ? <ImageIcon size={14} className="text-purple-400" /> : <FileCode size={14} className="opacity-70" />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
    </button>
  );
}

// ── Main FilesTab Component (Full Functionality Restored) ──────────────────────
export function FilesTab({ projectPath, projectName }: { projectPath: string | null; projectName: string }) {
  const { t } = useI18n();
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileTreeNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  // 로컬 경로 히스토리 및 탐색 상태 (기능 복구)
  const [currentDir, setCurrentDir] = useState<string | null>(projectPath);

  const loadTree = useCallback((path: string) => {
    setLoading(true);
    fetch(`/api/projects/path-tree?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setTree(buildTree(data.tree ?? [], data.root ?? path));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projectPath) loadTree(projectPath);
  }, [projectPath, loadTree]);

  const handleSelectFile = (node: FileTreeNode) => {
    if (node.type === "dir") {
      // 폴더일 경우 이동 로직 추가 가능 (기능 확장성)
      return;
    }
    setSelectedFile(node);
    setFileContent(null);
    const ext = getExt(node.name);
    if (IMAGE_EXTENSIONS.has(ext)) return;
    setFileLoading(true);
    fetch(`/api/projects/file-content?path=${encodeURIComponent(node.path)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setFileContent(data.content ?? "");
      })
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
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "transparent" }}>
      {/* ── Explorer Toolbar (Windows Style) ── */}
      <div style={{ 
        display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", 
        borderBottom: "1px solid var(--th-glass-border-subtle)", background: "rgba(255,255,255,0.01)" 
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={{ padding: 6, background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer" }}><ArrowLeft size={16} /></button>
          <button style={{ padding: 6, background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer" }}><ArrowRight size={16} /></button>
          <button style={{ padding: 6, background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer" }}><ArrowUp size={16} /></button>
        </div>
        
        {/* Address Bar */}
        <div style={{ 
          flex: 1, display: "flex", alignItems: "center", gap: 10, 
          background: "rgba(0,0,0,0.2)", border: "1px solid var(--th-glass-border-strong)", 
          borderRadius: 10, padding: "0 12px", height: 32, fontSize: 12, color: "var(--th-text-secondary)" 
        }}>
          <HardDrive size={14} className="opacity-50" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentDir || projectName}</span>
          <RotateCw size={12} style={{ marginLeft: "auto" }} className="opacity-50 cursor-pointer hover:opacity-100" onClick={() => projectPath && loadTree(projectPath)} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 1, height: 20, background: "var(--th-glass-border-subtle)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--th-glass-border-subtle)", borderRadius: 8, padding: "0 10px", height: 32 }}>
            <Search size={14} className="opacity-50" />
            <input placeholder="Search" style={{ background: "none", border: "none", outline: "none", color: "var(--th-text-primary)", fontSize: 11, width: 100 }} />
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar: Tree */}
        <div style={{ 
          width: 260, flexShrink: 0, borderRight: "1px solid var(--th-glass-border-subtle)", 
          display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(0,0,0,0.1)"
        }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }} className="pm-shelf-scroll">
            {loading && <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: "var(--th-text-muted)" }}>Scanning...</div>}
            {tree.map((node, i) => (
              <FileNode key={i} node={node} depth={0} selectedPath={selectedFile?.path ?? null} onSelect={handleSelectFile} />
            ))}
          </div>
        </div>

        {/* Main: Viewer */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedFile ? (
            <>
              <div style={{ 
                display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", 
                borderBottom: "1px solid var(--th-glass-border-subtle)", background: "rgba(255,255,255,0.01)" 
              }}>
                <FileText size={16} className="text-blue-400" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{selectedFile.path}</div>
                </div>
                <button
                  onClick={handleOpenInOS}
                  style={{
                    height: 30, padding: "0 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", 
                    border: "1px solid var(--th-glass-border-strong)", color: "var(--th-text-primary)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  {openSuccess ? <Check size={14} className="text-emerald-400" /> : <ExternalLink size={14} />}
                  {openSuccess ? "Opened" : "Open"}
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }} className="pm-shelf-scroll">
                {fileLoading ? (
                  <div style={{ color: "var(--th-text-muted)", fontSize: 12 }}>Loading file...</div>
                ) : IMAGE_EXTENSIONS.has(getExt(selectedFile.name)) ? (
                  <img src={`/api/projects/file-content?path=${encodeURIComponent(selectedFile.path)}&raw=1`} style={{ maxWidth: "100%", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }} />
                ) : (
                  <pre style={{ fontSize: 12, lineHeight: 1.7, color: "var(--th-text-primary)", margin: 0, fontFamily: "var(--th-font-mono)" }}>
                    <code>{fileContent}</code>
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.3, gap: 16 }}>
              <File size={64} strokeWidth={1} />
              <div style={{ fontSize: 13 }}>Select a file to preview</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
