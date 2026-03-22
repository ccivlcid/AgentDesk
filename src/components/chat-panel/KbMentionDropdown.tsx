/**
 * KbMentionDropdown — @notion / @obsidian 인라인 검색 드롭다운
 *
 * ChatComposer 내부의 textarea 위에 absolute 배치.
 * 부모에서 `mentionTarget` ("notion"|"obsidian"|null) + `query` 를 받아
 * 검색 결과를 보여주고 `onSelect(ref)` 를 통해 선택한 소스를 반환한다.
 */

import { useEffect, useRef, useState } from "react";
import type { KbSourceRef, NotionPage, ObsidianNote } from "../../api/synapse";
import { searchNotionPages, searchObsidianFiles, getNotionInfo, getObsidianInfo } from "../../api/synapse";
import { useI18n } from "../../i18n";
import { IconBookOpen, IconNotebook, IconX } from "../ui/SvgIcons";

interface KbMentionDropdownProps {
  mentionTarget: "notion" | "obsidian" | null;
  query: string;
  onSelect: (ref: KbSourceRef) => void;
  onClose: () => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function KbMentionDropdown({ mentionTarget, query, onSelect, onClose }: KbMentionDropdownProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<KbSourceRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mentionTarget) return;
    setActiveIdx(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (mentionTarget === "notion") {
          const info = await getNotionInfo();
          if (!info.connected) { setConnected(false); setItems([]); return; }
          setConnected(true);
          const pages = await searchNotionPages(query);
          setItems(pages.slice(0, 8).map((p: NotionPage) => ({
            type: "notion_page" as const,
            id: p.id,
            label: p.title || p.id,
          })));
        } else {
          const info = await getObsidianInfo();
          if (!info.connected) { setConnected(false); setItems([]); return; }
          setConnected(true);
          const files = await searchObsidianFiles(query);
          setItems(files.slice(0, 8).map((f: ObsidianNote) => ({
            type: "obsidian_file" as const,
            id: f.path,
            label: f.name,
          })));
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [mentionTarget, query]);

  // 키보드 이벤트
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!mentionTarget) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items[activeIdx]) {
        e.preventDefault();
        onSelect(items[activeIdx]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [mentionTarget, items, activeIdx, onSelect, onClose]);

  if (!mentionTarget) return null;

  const label = mentionTarget === "notion" ? "Notion" : "Obsidian";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        marginBottom: 4,
        zIndex: 200,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 0,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
        maxHeight: 220,
        overflowY: "auto",
      }}
    >
      {/* 헤더 */}
      <div style={{
        ...mono,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontSize: 9,
        color: "var(--th-text-muted)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: "var(--th-bg-surface)",
      }}>
        <span style={{ display: "flex", color: "var(--th-accent)" }}>
          {mentionTarget === "notion" ? <IconBookOpen size={12} /> : <IconNotebook size={12} />}
        </span>
        <span>{label} {t({ ko: "검색", en: "Search", ja: "検索", zh: "搜索" })}</span>
        {query && <span style={{ color: "var(--th-accent)" }}>"{query}"</span>}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onClose(); }}
          style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}
          aria-label="Close"
        >
          <IconX size={12} />
        </button>
      </div>

      {/* 결과 목록 */}
      {!connected ? (
        <div style={{ ...mono, fontSize: 10, padding: "8px 10px", color: "var(--th-text-muted)" }}>
          {mentionTarget === "notion"
            ? t({ ko: "Notion이 연결되지 않았습니다. Settings → Synapse에서 연결하세요.", en: "Notion not connected. Connect in Settings → Synapse.", ja: "Notionが接続されていません。設定 → Synapseで接続してください。", zh: "Notion未连接。请在设置 → Synapse中连接。" })
            : t({ ko: "Obsidian이 연결되지 않았습니다. Settings → Synapse에서 연결하세요.", en: "Obsidian not connected. Connect in Settings → Synapse.", ja: "Obsidianが接続されていません。設定 → Synapseで接続してください。", zh: "Obsidian未连接。请在设置 → Synapse中连接。" })}
        </div>
      ) : loading ? (
        <div style={{ ...mono, fontSize: 10, padding: "8px 10px", color: "var(--th-text-muted)" }}>
          {t({ ko: "검색 중...", en: "Searching...", ja: "検索中...", zh: "搜索中..." })}
        </div>
      ) : items.length === 0 ? (
        <div style={{ ...mono, fontSize: 10, padding: "8px 10px", color: "var(--th-text-muted)" }}>
          {t({ ko: "결과 없음", en: "No results", ja: "結果なし", zh: "无结果" })}
        </div>
      ) : (
        items.map((item, idx) => (
          <button
            key={item.id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
            style={{
              ...mono,
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 10px",
              fontSize: 11,
              border: "none",
              borderBottom: idx < items.length - 1 ? "1px solid var(--th-border)" : "none",
              background: idx === activeIdx ? "var(--th-active-bg)" : "transparent",
              color: idx === activeIdx ? "var(--th-accent)" : "var(--th-text-secondary)",
              cursor: "pointer",
            }}
            onMouseEnter={() => setActiveIdx(idx)}
          >
            <span style={{ marginRight: 6, display: "inline-flex", verticalAlign: "middle", color: "var(--th-accent)" }}>
              {item.type === "notion_page" ? <IconBookOpen size={12} /> : <IconNotebook size={12} />}
            </span>
            <span style={{ fontWeight: idx === activeIdx ? 600 : 400 }}>{item.label}</span>
          </button>
        ))
      )}
    </div>
  );
}
