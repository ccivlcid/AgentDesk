import { useState, useCallback } from "react";
import type { KbSourceRef, NotionPage, ObsidianNote } from "../../../api/synapse";
import { getNotionInfo, getObsidianInfo, searchNotionPages, searchObsidianFiles } from "../../../api/synapse";
import { useUiStore } from "../../../store/uiStore";
import type { TFunction } from "../constants";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface KbTaskSourcesSectionProps {
  sources: KbSourceRef[];
  onChange: (sources: KbSourceRef[]) => void;
  t: TFunction;
}

export function KbTaskSourcesSection({ sources, onChange, t }: KbTaskSourcesSectionProps) {
  const [open, setOpen] = useState(false);
  const { toggleWindow } = useUiStore();
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [obsidianFiles, setObsidianFiles] = useState<ObsidianNote[]>([]);
  const [notionConnected, setNotionConnected] = useState(false);
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = useCallback(async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const [nInfo, oInfo] = await Promise.all([getNotionInfo(), getObsidianInfo()]);
      setNotionConnected(nInfo.connected);
      setObsidianConnected(oInfo.connected);
      const [pages, files] = await Promise.all([
        nInfo.connected ? searchNotionPages("") : Promise.resolve([]),
        oInfo.connected ? searchObsidianFiles("") : Promise.resolve([]),
      ]);
      setNotionPages(pages);
      setObsidianFiles(files);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [open]);

  const toggle = useCallback((ref: KbSourceRef) => {
    const exists = sources.some((s) => s.id === ref.id);
    if (exists) {
      onChange(sources.filter((s) => s.id !== ref.id));
    } else {
      onChange([...sources, ref]);
    }
  }, [sources, onChange]);

  const isSelected = (id: string) => sources.some((s) => s.id === id);

  return (
    <div style={{ borderTop: "1px solid var(--th-border)", padding: "0 16px" }}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        style={{
          ...mono,
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "8px 0",
          background: "none",
          border: "none",
          color: "var(--th-text-muted)",
          cursor: "pointer",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: sources.length > 0 ? "var(--th-accent)" : undefined }}>
          {open ? "▾" : "▸"}
        </span>
        {t({ ko: "지식 베이스 소스", en: "KNOWLEDGE BASE SOURCES", ja: "ナレッジソース", zh: "知识库来源" })}
        {sources.length > 0 && (
          <span style={{ background: "var(--th-accent)", color: "var(--th-bg-primary)", borderRadius: 2, padding: "0 5px", fontSize: "8px", fontWeight: 700 }}>
            {sources.length}
          </span>
        )}
      </button>

      {sources.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 6 }}>
          {sources.map((s) => (
            <span
              key={s.id}
              style={{ ...mono, fontSize: "9px", padding: "1px 6px", border: "1px solid var(--th-accent)", color: "var(--th-accent)", borderRadius: 2, cursor: "pointer" }}
              onClick={() => toggle(s)}
              title={t({ ko: "클릭하여 제거", en: "Click to remove", ja: "クリックして削除", zh: "点击移除" })}
            >
              {s.label ?? s.id} ✕
            </span>
          ))}
        </div>
      )}

      {open && (
        <div style={{ paddingBottom: 10 }}>
          {loading ? (
            <div style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", padding: "4px 0" }}>
              {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
            </div>
          ) : (
            <>
              {/* NOTION */}
              {notionConnected && notionPages.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ ...mono, fontSize: "8px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                    Notion
                  </div>
                  <div style={{ maxHeight: 100, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                    {notionPages.map((page) => {
                      const ref: KbSourceRef = { type: "notion_page", id: page.id, label: page.title };
                      const sel = isSelected(page.id);
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => toggle(ref)}
                          style={{
                            ...mono,
                            textAlign: "left",
                            fontSize: "10px",
                            padding: "3px 6px",
                            borderRadius: 0,
                            border: `1px solid ${sel ? "var(--th-accent)" : "var(--th-border)"}`,
                            background: sel ? "rgba(245,158,11,0.1)" : "var(--th-bg-elevated)",
                            color: sel ? "var(--th-accent)" : "var(--th-text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          📄 {page.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OBSIDIAN */}
              {obsidianConnected && obsidianFiles.length > 0 && (
                <div>
                  <div style={{ ...mono, fontSize: "8px", color: "var(--th-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                    Obsidian
                  </div>
                  <div style={{ maxHeight: 100, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                    {obsidianFiles.map((file) => {
                      const ref: KbSourceRef = { type: "obsidian_file", id: file.path, label: file.name };
                      const sel = isSelected(file.path);
                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => toggle(ref)}
                          style={{
                            ...mono,
                            textAlign: "left",
                            fontSize: "10px",
                            padding: "3px 6px",
                            borderRadius: 0,
                            border: `1px solid ${sel ? "var(--th-accent)" : "var(--th-border)"}`,
                            background: sel ? "rgba(245,158,11,0.1)" : "var(--th-bg-elevated)",
                            color: sel ? "var(--th-accent)" : "var(--th-text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          🗒 {file.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!notionConnected && !obsidianConnected && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)" }}>
                    {t({ ko: "Notion/Obsidian 미연결", en: "Notion/Obsidian not connected", ja: "Notion/Obsidian未接続", zh: "未连接Notion/Obsidian" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleWindow("synapse")}
                    style={{ ...mono, fontSize: "9px", padding: "2px 8px", borderRadius: 0, border: "1px solid var(--th-accent)", background: "transparent", color: "var(--th-accent)", cursor: "pointer" }}
                  >
                    {t({ ko: "설정으로 이동 →", en: "Go to Settings →", ja: "設定へ →", zh: "前往设置 →" })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
