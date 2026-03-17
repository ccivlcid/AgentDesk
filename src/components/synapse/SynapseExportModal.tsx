/**
 * Harness Export Modal — deliverable를 Notion/Obsidian으로 내보내기 (Phase 2)
 */
import { useState, useEffect } from "react";
import {
  getNotionInfo, searchNotionPages,
  getObsidianInfo,
  exportToNotion, exportToObsidian,
} from "../../api/synapse";
import type { NotionPage } from "../../api/synapse";

const mono = "var(--th-font-mono)";
const base: React.CSSProperties = { fontFamily: mono };

interface Props {
  title: string;
  content: string;
  onClose: () => void;
}

type TargetTab = "notion" | "obsidian";
type ExportStatus = "idle" | "loading" | "success" | "error";

export default function SynapseExportModal({ title, content, onClose }: Props) {
  const [tab, setTab] = useState<TargetTab>("notion");

  // Notion state
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionWorkspace, setNotionWorkspace] = useState("");
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [pageQuery, setPageQuery] = useState("");
  const [pagesLoading, setPagesLoading] = useState(false);

  // Obsidian state
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [obsidianFolder, setObsidianFolder] = useState("AgentDesk-Output");

  // Export state
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [resultUrl, setResultUrl] = useState("");
  const [resultPath, setResultPath] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getNotionInfo(), getObsidianInfo()]).then(([nInfo, oInfo]) => {
      setNotionConnected(nInfo.connected);
      if (nInfo.workspace_name) setNotionWorkspace(nInfo.workspace_name);
      setObsidianConnected(oInfo.connected && oInfo.mode === "local");
      if (nInfo.connected) loadPages("");
    }).catch(() => {});
  }, []);

  const loadPages = async (q: string) => {
    setPagesLoading(true);
    try {
      const result = await searchNotionPages(q);
      setPages(result);
    } catch {
      // ignore
    } finally {
      setPagesLoading(false);
    }
  };

  const handleExportNotion = async () => {
    if (!selectedPageId) return;
    setStatus("loading");
    setError("");
    try {
      const result = await exportToNotion(title, content, selectedPageId);
      setResultUrl(result.url);
      setStatus("success");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  const handleExportObsidian = async () => {
    setStatus("loading");
    setError("");
    try {
      const result = await exportToObsidian(title, content, obsidianFolder);
      setResultPath(result.path);
      setStatus("success");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--th-bg-surface)",
        border: "1px solid var(--th-border)",
        borderRadius: 10,
        width: 480,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* 헤더 */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--th-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["red", "amber", "green"] as const).map((c) => (
              <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c === "red" ? "#ff5f57" : c === "amber" ? "#ffbd2e" : "#28c840", cursor: c === "red" ? "pointer" : "default" }} onClick={c === "red" ? onClose : undefined} />
            ))}
          </div>
          <span style={{ ...base, fontSize: 12, fontWeight: 700, flex: 1 }}>⇄ 지식베이스로 내보내기</span>
        </div>

        {/* 산출물 제목 */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
          <div style={{ ...base, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>// DELIVERABLE</div>
          <div style={{ ...base, fontSize: 12, fontWeight: 700, color: "var(--th-text-primary)" }}>{title}</div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--th-border)" }}>
          {(["notion", "obsidian"] as const).map((t) => {
            const active = tab === t;
            return (
              <button key={t} type="button" onClick={() => { setTab(t); setStatus("idle"); setError(""); }}
                style={{ ...base, fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: "0.06em", padding: "8px 16px", background: active ? "var(--th-bg-primary)" : "transparent", color: active ? "var(--th-accent)" : "var(--th-text-muted)", border: "none", borderBottom: active ? "2px solid var(--th-accent)" : "2px solid transparent", cursor: "pointer", borderRadius: "6px 6px 0 0" }}
              >
                {t === "notion" ? "📘 NOTION" : "📓 OBSIDIAN"}
              </button>
            );
          })}
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ ...base, fontSize: 24, marginBottom: 12 }}>✓</div>
              <div style={{ ...base, fontSize: 13, fontWeight: 700, color: "var(--th-success, #3fb950)", marginBottom: 8 }}>내보내기 완료</div>
              {resultUrl && (
                <a href={resultUrl} target="_blank" rel="noopener noreferrer" style={{ ...base, fontSize: 11, color: "var(--th-accent)", textDecoration: "underline" }}>
                  Notion에서 열기 →
                </a>
              )}
              {resultPath && (
                <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)" }}>저장 위치: {resultPath}</div>
              )}
              <button type="button" onClick={onClose} style={{ ...base, marginTop: 16, fontSize: 11, padding: "6px 20px", background: "transparent", border: "1px solid var(--th-border)", borderRadius: 0, color: "var(--th-text-muted)", cursor: "pointer" }}>닫기</button>
            </div>
          ) : tab === "notion" ? (
            notionConnected ? (
              <div>
                <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>workspace: {notionWorkspace}</div>
                <div style={{ ...base, fontSize: 10, fontWeight: 700, color: "var(--th-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>// 상위 페이지 선택</div>
                <input
                  value={pageQuery}
                  onChange={(e) => { setPageQuery(e.target.value); loadPages(e.target.value); }}
                  placeholder="페이지 검색..."
                  style={{ ...base, width: "100%", boxSizing: "border-box", fontSize: 11, padding: "6px 10px", background: "var(--th-input-bg, var(--th-bg-primary))", border: "1px solid var(--th-input-border, var(--th-border))", borderRadius: 0, color: "var(--th-text-primary)", outline: "none", marginBottom: 8 }}
                />
                <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
                  {pagesLoading && <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", padding: 8 }}>검색 중...</div>}
                  {pages.map((p) => (
                    <button key={p.id} type="button" onClick={() => setSelectedPageId(p.id)}
                      style={{ ...base, fontSize: 11, padding: "7px 10px", textAlign: "left", background: selectedPageId === p.id ? "rgba(245,158,11,0.12)" : "var(--th-bg-surface)", border: `1px solid ${selectedPageId === p.id ? "var(--th-accent)" : "var(--th-border)"}`, color: "var(--th-text-primary)", cursor: "pointer" }}
                    >
                      {p.type === "database" ? "📊" : "📄"} {p.title}
                    </button>
                  ))}
                </div>
                {error && <div style={{ ...base, fontSize: 10, color: "var(--th-danger, #f85149)", marginBottom: 8 }}>{error}</div>}
                <button type="button" onClick={handleExportNotion} disabled={!selectedPageId || status === "loading"}
                  style={{ ...base, fontSize: 11, fontWeight: 700, padding: "8px 20px", background: "var(--th-accent)", border: "none", borderRadius: 0, color: "#000", cursor: !selectedPageId || status === "loading" ? "not-allowed" : "pointer", opacity: !selectedPageId || status === "loading" ? 0.5 : 1 }}
                >
                  {status === "loading" ? "내보내는 중..." : "→ Notion으로 내보내기"}
                </button>
              </div>
            ) : (
              <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "20px 0" }}>
                Notion이 연결되지 않았습니다.<br />설정 → SYNAPSE → NOTION에서 먼저 연결하세요.
              </div>
            )
          ) : (
            obsidianConnected ? (
              <div>
                <div style={{ ...base, fontSize: 10, fontWeight: 700, color: "var(--th-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>// 저장 폴더</div>
                <input
                  value={obsidianFolder}
                  onChange={(e) => setObsidianFolder(e.target.value)}
                  placeholder="AgentDesk-Output"
                  style={{ ...base, width: "100%", boxSizing: "border-box", fontSize: 11, padding: "6px 10px", background: "var(--th-input-bg, var(--th-bg-primary))", border: "1px solid var(--th-input-border, var(--th-border))", borderRadius: 0, color: "var(--th-text-primary)", outline: "none", marginBottom: 12 }}
                />
                <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 12 }}>
                  파일명: <span style={{ color: "var(--th-accent)" }}>{title.replace(/[\\/:*?"<>|]/g, "_")}.md</span>
                </div>
                {error && <div style={{ ...base, fontSize: 10, color: "var(--th-danger, #f85149)", marginBottom: 8 }}>{error}</div>}
                <button type="button" onClick={handleExportObsidian} disabled={status === "loading"}
                  style={{ ...base, fontSize: 11, fontWeight: 700, padding: "8px 20px", background: "var(--th-accent)", border: "none", borderRadius: 0, color: "#000", cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.5 : 1 }}
                >
                  {status === "loading" ? "저장 중..." : "→ Obsidian으로 저장"}
                </button>
              </div>
            ) : (
              <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "20px 0" }}>
                Obsidian이 연결되지 않았습니다.<br />설정 → SYNAPSE → OBSIDIAN에서 먼저 연결하세요.<br />(로컬 파일시스템 모드만 지원)
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
