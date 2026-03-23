/**
 * FileTreeWindow -- Global File System Explorer.
 * Functions exactly like Windows Explorer or macOS Finder.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  RotateCw, 
  Search,
  HardDrive,
  Home,
  Clock,
  ExternalLink,
  Check,
  FileCode,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";

// ── API 인터페이스 (Global FS용) ──────────────────────────────────────────────
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

export default function FileTreeWindow() {
  const { t } = useI18n();
  const [currentPath, setCurrentDir] = useState<string>(""); // 빈 문자열은 루트/홈
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [selectedEntry, setSelectedEntry] = useState<FsEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  // 파일 목록 로드 (Global FS API 사용)
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
    loadPath(""); // 초기 로드
  }, []);

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
      // 텍스트 파일인 경우 미리보기
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
      emoji={<Folder size={14} className="text-amber-400" />}
      defaultWidth={1080}
      defaultHeight={720}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "transparent", fontFamily: "var(--th-font-body)" }}>
        
        {/* ── Explorer Toolbar ── */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", 
          borderBottom: "1px solid var(--th-glass-border-subtle)", background: "rgba(255,255,255,0.015)" 
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={goBack} disabled={historyIdx <= 0} style={{ padding: 6, background: "none", border: "none", color: historyIdx <= 0 ? "var(--th-text-muted)" : "var(--th-text-primary)", cursor: "pointer", opacity: historyIdx <= 0 ? 0.3 : 1 }}><ArrowLeft size={18} /></button>
            <button onClick={goUp} style={{ padding: 6, background: "none", border: "none", color: "var(--th-text-primary)", cursor: "pointer" }}><ArrowUp size={18} /></button>
          </div>
          
          {/* Real Address Bar (Editable) */}
          <div style={{ 
            flex: 1, display: "flex", alignItems: "center", gap: 10, 
            background: "rgba(0,0,0,0.2)", border: "1px solid var(--th-glass-border-strong)", 
            borderRadius: 12, padding: "0 14px", height: 36, fontSize: 13, color: "var(--th-text-secondary)" 
          }}>
            <HardDrive size={14} className="text-blue-400 opacity-70" />
            <input 
              value={currentPath} 
              onChange={(e) => setCurrentDir(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") loadPath(currentPath); }}
              style={{ background: "none", border: "none", outline: "none", color: "var(--th-text-primary)", flex: 1, fontSize: 13 }}
            />
            <RotateCw size={14} className="opacity-50 cursor-pointer hover:opacity-100" onClick={() => loadPath(currentPath)} />
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--th-glass-border-subtle)", borderRadius: 10, padding: "0 12px", height: 36 }}>
            <Search size={14} className="opacity-50" />
            <input placeholder="Search files" style={{ background: "none", border: "none", outline: "none", color: "var(--th-text-primary)", fontSize: 12, width: 120 }} />
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          
          {/* Sidebar: Quick Access */}
          <div style={{ 
            width: 240, flexShrink: 0, borderRight: "1px solid var(--th-glass-border-subtle)", 
            display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(0,0,0,0.1)"
          }}>
            <div style={{ padding: "20px 24px 10px", fontSize: 10, fontWeight: 800, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Favorites</div>
            <div style={{ padding: "4px 12px" }}>
              {[
                { icon: Home, label: "User Home", path: "" },
                { icon: Clock, label: "Recents", path: "recent" },
                { icon: HardDrive, label: "Local Disk (C:)", path: "C:/" }
              ].map((fav, i) => (
                <button 
                  key={i} onClick={() => loadPath(fav.path)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", border: "none", background: "none", color: "var(--th-text-secondary)", fontSize: 13, cursor: "pointer", borderRadius: 10, transition: "all 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
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
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)" }}>
                <RotateCw size={24} className="animate-spin" />
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", padding: "12px" }} className="pm-shelf-scroll">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {entries.map((entry, i) => (
                    <motion.button
                      key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handleEntryClick(entry)}
                      style={{ 
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 10px",
                        background: selectedEntry?.path === entry.path ? "var(--th-accent-glow)" : "rgba(255,255,255,0.02)",
                        border: selectedEntry?.path === entry.path ? "1px solid var(--th-accent-border)" : "1px solid var(--th-glass-border-subtle)",
                        borderRadius: 16, cursor: "pointer", transition: "all 0.2s"
                      }}
                    >
                      {entry.type === "dir" ? <Folder size={40} className="text-amber-400 opacity-80" /> : <FileCode size={40} className="text-blue-400 opacity-70" />}
                      <span style={{ fontSize: 12, color: "var(--th-text-primary)", textAlign: "center", wordBreak: "break-all", width: "100%", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {entry.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Bar */}
            <div style={{ 
              padding: "10px 24px", borderTop: "1px solid var(--th-glass-border-subtle)", 
              fontSize: 11, color: "var(--th-text-muted)", display: "flex", justifyContent: "space-between",
              background: "rgba(0,0,0,0.15)"
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
                style={{ width: 320, borderLeft: "1px solid var(--th-glass-border-subtle)", background: "var(--th-glass-surface-active)", display: "flex", flexDirection: "column" }}
              >
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--th-glass-border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Preview</div>
                  <button onClick={() => setSelectedEntry(null)} style={{ background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer" }}><XCircle size={18} /></button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }} className="pm-shelf-scroll">
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <FileText size={64} style={{ margin: "0 auto", opacity: 0.2 }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{selectedEntry.name}</div>
                  <div style={{ fontSize: 11, color: "var(--th-text-muted)", marginBottom: 20, wordBreak: "break-all" }}>{selectedEntry.path}</div>
                  
                  {previewContent && (
                    <pre style={{ fontSize: 11, lineHeight: 1.6, background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 10, overflowX: "auto", color: "var(--th-text-secondary)" }}>
                      {previewContent.slice(0, 1000)}{previewContent.length > 1000 ? "..." : ""}
                    </pre>
                  )}
                </div>
                <div style={{ padding: "20px" }}>
                  <button 
                    onClick={handleOpenInOS}
                    style={{ width: "100%", height: 40, background: "var(--th-accent)", color: "black", border: "none", borderRadius: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {openSuccess ? <Check size={18} /> : <ExternalLink size={18} />}
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

function XCircle({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}
