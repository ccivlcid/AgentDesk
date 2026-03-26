/**
 * FileTreeWindow -- Global File System Explorer.
 * Functions exactly like Windows Explorer or macOS Finder.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";

// ── Inline SVG Icon Components ──────────────────────────────────────────────

function IconFolder({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconFileCode({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconFileText({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconArrowLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconArrowUp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function IconRotateCw({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function IconSearch({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconHardDrive({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
  );
}

function IconHome({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconClock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconExternalLink({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XCircle({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}

// ── API interface (Global FS) ──────────────────────────────────────────────
interface FsEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  mtime?: number;
  modified?: number;
  ext?: string;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Sidebar favorites config
const FAVORITES = [
  { icon: IconHome, label: "User Home", path: "" },
  { icon: IconClock, label: "Recents", path: "recent" },
  { icon: IconHardDrive, label: "Local Disk (C:)", path: "C:/" },
] as const;

export default function FileTreeWindow() {
  const { t } = useI18n();
  const [currentPath, setCurrentDir] = useState<string>("");
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [selectedEntry, setSelectedEntry] = useState<FsEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  const loadPath = useCallback((path: string, addToHistory = true) => {
    setLoading(true);
    fetch(`/api/fs/browse?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setEntries(data.entries);
          setCurrentDir(data.current_path);
          if (addToHistory) {
            const newHistory = history.slice(0, historyIdx + 1);
            newHistory.push(data.currentPath);
            setHistory(newHistory);
            setHistoryIdx(newHistory.length - 1);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [history, historyIdx]);

  useEffect(() => {
    loadPath("");
  }, [loadPath]);

  const goBack = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      loadPath(prev, false);
    }
  };

  const goUp = () => {
    const parent = currentPath.split(/[\\/]/).slice(0, -1).join("/");
    loadPath(parent || "/");
  };

  const handleEntryClick = (entry: FsEntry) => {
    if (entry.type === "dir") {
      loadPath(entry.path);
    } else {
      setSelectedEntry(entry);
      setPreviewContent(null);
      if (entry.name.match(/\.(txt|md|js|ts|json|tsx|jsx|css|py|sh|html)$/i)) {
        setPreviewLoading(true);
        fetch(`/api/fs/read?path=${encodeURIComponent(entry.path)}`)
          .then(r => r.json())
          .then(data => { if (data.ok) setPreviewContent(data.content); })
          .finally(() => setPreviewLoading(false));
      }
    }
  };

  const handleOpenInOS = () => {
    if (!selectedEntry) return;
    fetch("/api/projects/open-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedEntry.path }),
    }).then(() => {
      setOpenSuccess(true);
      setTimeout(() => setOpenSuccess(false), 2000);
    });
  };

  return (
    <AppWindow
      windowType="file-tree"
      title={t({ ko: "파일 탐색기", en: "File Explorer", ja: "ファイルエクスプローラー", zh: "文件管理" })}
      emoji={<IconFolder size={14} style={{ color: "#F59E0B" }} />}
      defaultWidth={1080}
      defaultHeight={720}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "transparent", fontFamily: "var(--th-font-mono)" }}>

        {/* ── Explorer Toolbar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 24px",
          borderBottom: "1px solid #E5E7EB", background: "#FFFFFF"
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={goBack} disabled={historyIdx <= 0} style={{ padding: 6, background: "none", border: "none", color: historyIdx <= 0 ? "#9CA3AF" : "#111827", cursor: "pointer", opacity: historyIdx <= 0 ? 0.3 : 1 }}>
              <IconArrowLeft size={18} />
            </button>
            <button onClick={goUp} style={{ padding: 6, background: "none", border: "none", color: "#111827", cursor: "pointer" }}>
              <IconArrowUp size={18} />
            </button>
          </div>

          {/* Real Address Bar (Editable) */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            background: "#FFFFFF", border: "1px solid #D1D5DB",
            borderRadius: 12, padding: "0 14px", height: 36, fontSize: 13, color: "#6B7280"
          }}>
            <IconHardDrive size={14} style={{ color: "#3B82F6", opacity: 0.7 }} />
            <input
              value={currentPath}
              onChange={(e) => setCurrentDir(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") loadPath(currentPath); }}
              style={{ background: "none", border: "none", outline: "none", color: "#111827", flex: 1, fontSize: 13 }}
            />
            <IconRotateCw size={14} style={{ opacity: 0.5, cursor: "pointer" }} onClick={() => loadPath(currentPath)} />
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 12, padding: "0 12px", height: 36 }}>
            <IconSearch size={14} style={{ opacity: 0.5 }} />
            <input placeholder="Search files" style={{ background: "none", border: "none", outline: "none", color: "#111827", fontSize: 12, width: 120 }} />
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar: Quick Access */}
          <div style={{
            width: 240, flexShrink: 0, borderRight: "1px solid #E5E7EB",
            display: "flex", flexDirection: "column", overflow: "hidden", background: "#F9FAFB"
          }}>
            <div style={{ padding: "20px 24px 10px", fontSize: 10, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.1em" }}>Favorites</div>
            <div style={{ padding: "4px 12px" }}>
              {FAVORITES.map((fav, i) => (
                <button
                  key={i} onClick={() => loadPath(fav.path)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", border: "none", background: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", borderRadius: 12, transition: "all 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F3F4F6")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <fav.icon size={16} /> {fav.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main: Entry List & Preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>
                <IconRotateCw size={24} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {entries.map((entry, i) => (
                    <motion.button
                      key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handleEntryClick(entry)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 10px",
                        background: selectedEntry?.path === entry.path ? "#EBF5FF" : "#FFFFFF",
                        border: selectedEntry?.path === entry.path ? "1px solid #BFDBFE" : "1px solid #E5E7EB",
                        borderRadius: 16, cursor: "pointer", transition: "all 0.2s"
                      }}
                    >
                      {entry.type === "dir"
                        ? <IconFolder size={40} style={{ color: "#F59E0B", opacity: 0.8 }} />
                        : <IconFileCode size={40} style={{ color: "#3B82F6", opacity: 0.7 }} />
                      }
                      <span style={{ fontSize: 12, color: "#111827", textAlign: "center", wordBreak: "break-all", width: "100%", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {entry.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Bar */}
            <div style={{
              padding: "10px 24px", borderTop: "1px solid #E5E7EB",
              fontSize: 11, color: "#9CA3AF", display: "flex", justifyContent: "space-between",
              background: "#F9FAFB"
            }}>
              <span>{entries.length} items</span>
              {selectedEntry && <span>{selectedEntry.name} ({formatBytes(selectedEntry.size)})</span>}
            </div>
          </div>

          {/* Right Sidebar: Preview (If selected) */}
          <AnimatePresence>
            {selectedEntry && (
              <motion.div
                initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
                style={{ width: 320, borderLeft: "1px solid #E5E7EB", background: "#F9FAFB", display: "flex", flexDirection: "column" }}
              >
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Preview</div>
                  <button onClick={() => setSelectedEntry(null)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}><XCircle size={18} /></button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <IconFileText size={64} style={{ margin: "0 auto", opacity: 0.2 }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{selectedEntry.name}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 20, wordBreak: "break-all" }}>{selectedEntry.path}</div>

                  {previewContent && (
                    <pre style={{ fontSize: 11, lineHeight: 1.6, background: "#FFFFFF", padding: 12, borderRadius: 12, overflowX: "auto", color: "#6B7280", border: "1px solid #E5E7EB" }}>
                      {previewContent.slice(0, 1000)}{previewContent.length > 1000 ? "..." : ""}
                    </pre>
                  )}
                </div>
                <div style={{ padding: "20px" }}>
                  <button
                    onClick={handleOpenInOS}
                    style={{ width: "100%", height: 40, background: "#3B82F6", color: "#FFFFFF", border: "none", borderRadius: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {openSuccess ? <IconCheck size={18} /> : <IconExternalLink size={18} />}
                    {openSuccess ? "Opened!" : "Open in System"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppWindow>
  );
}
