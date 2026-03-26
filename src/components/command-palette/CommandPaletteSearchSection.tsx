import type { RefObject, KeyboardEvent } from "react";
import type { I18nContextValue } from "../../i18n";
import type { Project } from "../../types";
import TrafficLights from "../desktop/TrafficLights";
import { SPOTLIGHT_SF_FONT } from "./spotlightFontStyle";

interface CommandPaletteSearchSectionProps {
  t: I18nContextValue["t"];
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  setSelectedIndex: (i: number | ((n: number) => number)) => void;
  currentProject: Project | null | undefined;
  showSearchBottomBorder: boolean;
  onClose: () => void;
  onInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function CommandPaletteSearchSection({
  t,
  inputRef,
  query,
  setQuery,
  setSelectedIndex,
  currentProject,
  showSearchBottomBorder,
  onClose,
  onInputKeyDown,
}: CommandPaletteSearchSectionProps) {
  const sf = SPOTLIGHT_SF_FONT;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 14px 6px",
        }}
      >
        <TrafficLights onClose={onClose} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          height: 56,
          borderBottom: showSearchBottomBorder
            ? "1px solid #E5E7EB"
            : "none",
        }}
      >
        <svg
          width="20" height="20" viewBox="0 0 20 20" fill="none"
          style={{ flexShrink: 0, color: "#9CA3AF" }}
        >
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.8" />
          <line x1="12.9" y1="12.9" x2="17.5" y2="17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          onKeyDown={onInputKeyDown}
          placeholder={t({ ko: "AgentDesk 검색...", en: "Search AgentDesk...", ja: "AgentDesk を検索...", zh: "搜索 AgentDesk..." })}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            ...sf,
            fontSize: 22,
            fontWeight: 300,
            color: "#111827",
            minWidth: 0,
            letterSpacing: "-0.01em",
          }}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "#F3F4F6",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#9CA3AF", fontSize: 12, flexShrink: 0,
            }}
          >
            ✕
          </button>
        ) : (
          <kbd
            style={{
              ...sf,
              fontSize: 11,
              color: "#9CA3AF",
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 5,
              padding: "2px 7px",
              flexShrink: 0,
            }}
          >
            Esc
          </kbd>
        )}
      </div>

      {currentProject && (
        <div
          style={{
            padding: "5px 18px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ ...sf, fontSize: 11, color: "#9CA3AF" }}>
            {t({ ko: "현재 프로젝트", en: "Project", ja: "現在", zh: "当前" })}
          </span>
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>›</span>
          <span style={{ ...sf, fontSize: 11, color: "#3B82F6", fontWeight: 600 }}>{currentProject.name}</span>
        </div>
      )}
    </>
  );
}
