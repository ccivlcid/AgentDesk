import type { Chapter } from "./types";
import { MONO_FONT } from "./constants";
import { ChapterBtn } from "./ChapterBtn";

interface UserGuideSidebarProps {
  search: string;
  setSearch: (v: string) => void;
  filteredChapters: Chapter[];
  selectedId: string;
  onSelectChapter: (id: string) => void;
  t: (v: { ko: string; en: string; ja: string; zh: string }) => string;
}

export function UserGuideSidebar({
  search,
  setSearch,
  filteredChapters,
  selectedId,
  onSelectChapter,
  t,
}: UserGuideSidebarProps) {
  return (
    <div style={{
      width: 168, flexShrink: 0,
      borderRight: "1px solid #E5E7EB",
      display: "flex", flexDirection: "column",
      background: "var(--th-bg-surface)",
    }}>
      <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="var(--th-text-muted)" strokeWidth={1.5}
            width={10} height={10}
            style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="6.5" cy="6.5" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t({ ko: "검색...", en: "Search...", ja: "検索...", zh: "搜索..." })}
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: MONO_FONT, fontSize: 10,
              padding: "5px 8px 5px 22px",
              background: "var(--th-bg-primary)",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              color: "var(--th-text-primary)",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--th-accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {filteredChapters.length === 0 && (
          <div style={{ padding: "12px 14px", fontSize: 10, color: "var(--th-text-muted)", textAlign: "center" }}>
            {t({ ko: "결과 없음", en: "No results", ja: "結果なし", zh: "无结果" })}
          </div>
        )}
        {filteredChapters.map((c) => (
          <ChapterBtn
            key={c.id}
            color={c.color}
            icon={c.icon}
            title={c.title}
            active={c.id === selectedId}
            onClick={() => onSelectChapter(c.id)}
          />
        ))}
      </div>

      <div style={{
        padding: "6px 12px",
        borderTop: "1px solid #E5E7EB",
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158", boxShadow: "0 0 4px #30d158" }} />
        <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontFamily: MONO_FONT }}>AgentDesk v0.9</span>
      </div>
    </div>
  );
}
