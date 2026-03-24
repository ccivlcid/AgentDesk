import { useEffect, useState } from "react";
import { getNotionInfo, getObsidianInfo, searchNotionPages, searchObsidianFiles } from "../../../api/synapse";
import type { KbSourceRef, NotionPage, ObsidianNote } from "../../../api/synapse";

export function KbSourcesSection({
  sources,
  onChange,
  tr,
}: {
  sources: KbSourceRef[];
  onChange: (sources: KbSourceRef[]) => void;
  tr: (ko: string, en: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [obsidianFiles, setObsidianFiles] = useState<ObsidianNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getNotionInfo(), getObsidianInfo()])
      .then(([n, o]) => {
        setNotionConnected(n.connected);
        setObsidianConnected(o.connected && o.mode === "local");
        const fetches: Promise<void>[] = [];
        if (n.connected) fetches.push(searchNotionPages("").then(setNotionPages).catch(() => {}));
        if (o.connected) fetches.push(searchObsidianFiles("").then(setObsidianFiles).catch(() => {}));
        return Promise.all(fetches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const isSelected = (type: KbSourceRef["type"], id: string) =>
    sources.some((s) => s.type === type && s.id === id);

  const toggle = (ref: KbSourceRef) => {
    if (isSelected(ref.type, ref.id)) {
      onChange(sources.filter((s) => !(s.type === ref.type && s.id === ref.id)));
    } else {
      onChange([...sources, ref]);
    }
  };

  const mono = "var(--th-font-mono)";

  return (
    <div style={{ borderTop: "1px solid var(--th-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2"
        style={{ borderLeft: "3px solid var(--th-accent)", paddingLeft: "0.5rem" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest font-mono"
            style={{ color: "var(--th-text-muted)" }}
          >
            {tr("기본 지식 소스", "Default Knowledge Sources")}
          </span>
          {sources.length > 0 && (
            <span
              className="font-mono text-[9px] font-semibold"
              style={{
                color: "var(--th-accent)",
                border: "1px solid var(--th-accent)40",
                borderRadius: 6,
                padding: "0 4px",
                background: "var(--th-accent)12",
              }}
            >
              {sources.length} {tr("개 연결됨", "attached")}
            </span>
          )}
        </div>
        <span
          className="font-mono text-[10px]"
          style={{
            color: "var(--th-text-muted)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.1s linear",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          <p className="text-[10px] mb-2" style={{ fontFamily: mono, color: "var(--th-text-muted)" }}>
            {tr(
              "이 에이전트가 태스크를 실행할 때 선택한 문서들이 시스템 프롬프트에 자동으로 주입됩니다.",
              "Selected documents will be automatically injected into the system prompt when this agent runs tasks.",
            )}
          </p>

          {loading && (
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>Loading...</div>
          )}

          {sources.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
              {sources.map((s) => (
                <span
                  key={`${s.type}:${s.id}`}
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    padding: "2px 8px",
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid var(--th-accent)",
                    borderRadius: 0,
                    color: "var(--th-accent)",
                    cursor: "pointer",
                  }}
                  onClick={() => toggle(s)}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ opacity: 0.85 }}>
                      {s.type === "notion_page" ? "N" : s.type === "obsidian_file" ? "O" : "K"}
                    </span>
                    <span>
                      {s.label ?? s.id}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-80" aria-hidden>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                </span>
              ))}
            </div>
          )}

          {!notionConnected && !obsidianConnected && !loading && (
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
              {tr("설정 → SYNAPSE에서 Notion/Obsidian을 먼저 연결하세요.", "Connect Notion/Obsidian first in Settings → SYNAPSE.")}
            </div>
          )}

          {notionConnected && notionPages.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--th-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                // NOTION
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 140, overflowY: "auto" }}>
                {notionPages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle({ type: "notion_page", id: p.id, label: p.title })}
                    style={{
                      fontFamily: mono,
                      fontSize: 10,
                      textAlign: "left",
                      padding: "5px 8px",
                      background: isSelected("notion_page", p.id) ? "rgba(245,158,11,0.12)" : "var(--th-bg-surface)",
                      border: `1px solid ${isSelected("notion_page", p.id) ? "var(--th-accent)" : "var(--th-border)"}`,
                      color: "var(--th-text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    {p.type === "database" ? "📊" : "📄"} {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {obsidianConnected && obsidianFiles.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--th-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                // OBSIDIAN
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 140, overflowY: "auto" }}>
                {obsidianFiles.slice(0, 30).map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => toggle({ type: "obsidian_file", id: f.path, label: f.name })}
                    style={{
                      fontFamily: mono,
                      fontSize: 10,
                      textAlign: "left",
                      padding: "5px 8px",
                      background: isSelected("obsidian_file", f.path) ? "rgba(245,158,11,0.12)" : "var(--th-bg-surface)",
                      border: `1px solid ${isSelected("obsidian_file", f.path) ? "var(--th-accent)" : "var(--th-border)"}`,
                      color: "var(--th-text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    📓 {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
