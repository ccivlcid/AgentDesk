/**
 * File Explorer Widget — PC filesystem browser (read-only, like macOS Finder)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "../../../i18n";

const mono = "var(--th-font-mono)";
const IS_WIN = navigator.platform.startsWith("Win") || navigator.userAgent.includes("Windows");

interface FsEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: number;
  ext: string;
}

interface BrowseResult {
  ok: boolean;
  current_path: string;
  parent_path: string | null;
  is_root: boolean;
  entries: FsEntry[];
  truncated: boolean;
  error?: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconFolder({ open = false, color = "currentColor" }: { open?: boolean; color?: string }) {
  return open ? (
    <svg width={14} height={14} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M2 9a2 2 0 0 1 2-2h4l2-2h8a2 2 0 0 1 2 2v1H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2H20a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H2V9z" opacity={0.85} />
    </svg>
  ) : (
    <svg width={14} height={14} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M2 7a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293L11 7h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" opacity={0.85} />
    </svg>
  );
}

function IconFile({ ext }: { ext: string }) {
  const color = EXT_COLORS[ext] ?? "var(--th-text-muted)";
  return (
    <svg width={13} height={14} viewBox="0 0 24 28" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
      <path d="M4 2h10l6 6v18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v6h6" strokeOpacity={0.5} />
    </svg>
  );
}

function IconDrive() {
  return (
    <svg width={15} height={14} viewBox="0 0 24 24" fill="none" stroke="#64d2ff" strokeWidth={1.6} strokeLinecap="round">
      <ellipse cx="12" cy="16" rx="10" ry="4" />
      <path d="M2 12c0-2.21 4.48-4 10-4s10 1.79 10 4" />
      <path d="M2 8c0-2.21 4.48-4 10-4s10 1.79 10 4" />
    </svg>
  );
}

function IconUp() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// ─── Extension colors & labels ────────────────────────────────────────────────

const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#61dafb",
  py: "#3572a5", rb: "#cc342d", go: "#00add8", rs: "#dea584",
  java: "#b07219", cs: "#178600", cpp: "#f34b7d", c: "#555599",
  json: "#f59e0b", yaml: "#cb171e", yml: "#cb171e", toml: "#9c4221",
  md: "#083fa1", txt: "var(--th-text-muted)", html: "#e34c26", css: "#563d7c",
  scss: "#c6538c", svg: "#ff9800", png: "#30d158", jpg: "#30d158",
  jpeg: "#30d158", gif: "#30d158", webp: "#30d158",
  mp4: "#bf5af2", mp3: "#bf5af2", wav: "#bf5af2",
  zip: "#ff9f0a", tar: "#ff9f0a", gz: "#ff9f0a", rar: "#ff9f0a",
  pdf: "#ff453a", exe: "#ff453a", sh: "#30d158", bat: "#3178c6",
};

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

function Breadcrumbs({ path: p, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  if (!p) return <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>내 PC</span>;

  const sep = IS_WIN ? "\\" : "/";
  const parts = p.replace(/\\/g, "/").split("/").filter(Boolean);

  // Windows: parts[0] will be "C:", make it "C:\"
  const crumbs: { label: string; path: string }[] = [];
  if (IS_WIN) {
    if (parts.length > 0) {
      const drive = parts[0] + "\\";
      crumbs.push({ label: drive, path: drive });
      for (let i = 1; i < parts.length; i++) {
        const prev = crumbs[crumbs.length - 1].path;
        crumbs.push({ label: parts[i], path: prev.endsWith("\\") ? prev + parts[i] : prev + "\\" + parts[i] });
      }
    }
  } else {
    crumbs.push({ label: "/", path: "/" });
    let acc = "";
    for (const part of parts) {
      acc += sep + part;
      crumbs.push({ label: part, path: acc });
    }
  }

  const MAX_SHOW = 3;
  const visible = crumbs.length > MAX_SHOW ? crumbs.slice(-MAX_SHOW) : crumbs;
  const hasHidden = crumbs.length > MAX_SHOW;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, overflow: "hidden", flex: 1, minWidth: 0 }}>
      {hasHidden && <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>…</span>}
      {hasHidden && <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-border)" }}>/</span>}
      {visible.map((crumb, i) => (
        <span key={crumb.path} style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0, overflow: "hidden" }}>
          {i > 0 && <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-border)", flexShrink: 0 }}>/</span>}
          <button
            type="button"
            onClick={() => onNavigate(crumb.path)}
            style={{
              fontFamily: mono, fontSize: 10,
              color: i === visible.length - 1 ? "var(--th-text-primary)" : "var(--th-text-muted)",
              background: "none", border: "none", cursor: "pointer", padding: "0 2px",
              fontWeight: i === visible.length - 1 ? 600 : 400,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 90,
            }}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function FileTreeWidget() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [result, setResult] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const navigate = useCallback((targetPath: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setSearch("");

    const url = targetPath
      ? `/api/fs/browse?path=${encodeURIComponent(targetPath)}`
      : `/api/fs/browse`;

    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: BrowseResult) => {
        if (!data.ok) { setError(data.error ?? "오류"); setLoading(false); return; }
        setResult(data);
        setCurrentPath(data.current_path ?? "");
        setHistory((prev) => {
          if (prev[prev.length - 1] === targetPath) return prev;
          return [...prev, targetPath];
        });
      })
      .catch((e) => { if (e.name !== "AbortError") setError("서버 연결 실패"); })
      .finally(() => setLoading(false));
  }, []);

  // Initial load: Windows → drives, Unix → home
  useEffect(() => { navigate(""); }, [navigate]);

  const goUp = () => {
    if (result?.parent_path != null) navigate(result.parent_path);
    else if (IS_WIN && !result?.is_root) navigate("");
  };

  const goHome = () => navigate("");

  const entries = result?.entries ?? [];
  const filtered = search
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const folders = filtered.filter((e) => e.type === "dir");
  const files = filtered.filter((e) => e.type === "file");

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      fontFamily: mono, fontSize: 11, overflow: "hidden",
      background: "var(--th-bg-surface)",
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "5px 8px",
        borderBottom: "1px solid var(--th-border)",
        flexShrink: 0,
        background: "var(--th-glass-bg)",
      }}>
        {/* Nav buttons */}
        <NavBtn onClick={goUp} disabled={!result?.parent_path && !IS_WIN} title="위로">
          <IconUp />
        </NavBtn>
        <NavBtn onClick={goHome} title="홈">
          <IconHome />
        </NavBtn>
        <NavBtn onClick={() => navigate(currentPath)} title="새로고침">
          <IconRefresh />
        </NavBtn>

        {/* Breadcrumbs */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Breadcrumbs path={currentPath} onNavigate={navigate} />
        </div>

        {loading && (
          <span style={{ fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>…</span>
        )}
      </div>

      {/* ── Search ── */}
      <div style={{ padding: "5px 8px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <svg
            viewBox="0 0 16 16" fill="none" stroke="var(--th-text-muted)" strokeWidth={1.5}
            width={11} height={11}
            style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="6.5" cy="6.5" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름으로 필터..."
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: mono, fontSize: 10,
              padding: "4px 8px 4px 22px",
              background: "var(--th-hover-overlay-subtle)",
              border: "1px solid var(--th-border)",
              borderRadius: 5,
              color: "var(--th-text-primary)",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(10,132,255,0.5)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--th-text-muted)", fontSize: 12, lineHeight: 1,
              }}
            >×</button>
          )}
        </div>
      </div>

      {/* ── File list ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Error state */}
        {error && (
          <div style={{ padding: "16px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#ff453a", marginBottom: 6 }}>
              {error === "path_not_found" ? "경로를 찾을 수 없습니다"
               : error === "access_denied" ? "접근 권한이 없습니다"
               : error}
            </div>
            <button
              type="button"
              onClick={goHome}
              style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)", background: "none", border: "none", cursor: "pointer" }}
            >
              홈으로 돌아가기
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && !loading && filtered.length === 0 && (
          <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--th-text-muted)", fontSize: 10 }}>
            {search ? "일치하는 항목 없음" : "빈 폴더"}
          </div>
        )}

        {/* Root drives (Windows) */}
        {!error && result?.is_root && (
          <div style={{ padding: "4px 0" }}>
            <SectionHeader label="드라이브" count={entries.length} />
            {entries.map((entry) => (
              <EntryRow
                key={entry.path}
                entry={entry}
                isDrive
                onNavigate={navigate}
              />
            ))}
          </div>
        )}

        {/* Normal directory listing */}
        {!error && !result?.is_root && (
          <div style={{ padding: "2px 0 8px" }}>
            {folders.length > 0 && (
              <>
                <SectionHeader label="폴더" count={folders.length} />
                {folders.map((entry) => (
                  <EntryRow key={entry.path} entry={entry} onNavigate={navigate} />
                ))}
              </>
            )}
            {files.length > 0 && (
              <>
                <SectionHeader label="파일" count={files.length} />
                {files.map((entry) => (
                  <EntryRow key={entry.path} entry={entry} onNavigate={navigate} />
                ))}
              </>
            )}
          </div>
        )}

        {result?.truncated && (
          <div style={{ padding: "4px 12px 8px", fontSize: 9, color: "var(--th-text-muted)", textAlign: "center" }}>
            항목이 많아 일부만 표시됩니다
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{
        padding: "3px 10px",
        borderTop: "1px solid var(--th-border)",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>
          {filtered.length > 0 ? `${folders.length}개 폴더 · ${files.length}개 파일` : ""}
        </span>
        {result?.truncated && (
          <span style={{ fontSize: 9, color: "var(--th-accent)" }}>+ 더 있음</span>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 24, height: 24,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 5,
        background: hovered && !disabled ? "var(--th-hover-overlay)" : "transparent",
        border: "1px solid transparent",
        color: disabled ? "var(--th-text-muted)" : "var(--th-text-secondary)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
        transition: "background 0.1s",
      }}
    >
      {children}
    </button>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 10px 3px",
    }}>
      <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--th-border)" }} />
      <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>{count}</span>
    </div>
  );
}

function EntryRow({ entry, onNavigate, isDrive }: {
  entry: FsEntry;
  onNavigate: (p: string) => void;
  isDrive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isDir = entry.type === "dir";

  const folderColor = isDrive ? "#64d2ff" : "#ff9f0a";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (isDir) onNavigate(entry.path); }}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "4px 10px",
        background: hovered ? "var(--th-hover-overlay)" : "transparent",
        cursor: isDir ? "pointer" : "default",
        transition: "background 0.08s",
        userSelect: "none",
      }}
    >
      {/* Icon */}
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center", width: 16 }}>
        {isDrive ? <IconDrive /> :
         isDir ? <IconFolder color={folderColor} /> :
         <IconFile ext={entry.ext} />}
      </span>

      {/* Name */}
      <span style={{
        flex: 1, minWidth: 0,
        fontFamily: mono, fontSize: 11,
        fontWeight: isDir ? 500 : 400,
        color: isDir ? "var(--th-text-primary)" : "var(--th-text-secondary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {entry.name}
        {isDir && !isDrive && (
          <span style={{ color: "var(--th-text-muted)", marginLeft: 1, opacity: 0.5 }}>/</span>
        )}
      </span>

      {/* Meta (only on hover or always for files) */}
      {!isDir && (
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>
          {formatSize(entry.size)}
        </span>
      )}
      {hovered && entry.modified > 0 && (
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0, marginLeft: 4 }}>
          {formatDate(entry.modified)}
        </span>
      )}

      {/* Arrow for dirs */}
      {isDir && hovered && (
        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="var(--th-text-muted)" strokeWidth={2} strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </div>
  );
}
