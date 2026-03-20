import type { Message } from "../../../types";
import TrafficLights from "../../desktop/TrafficLights";
import type { Tr } from "./types";

export interface AnnouncementCliPanelHeaderProps {
  embedded: boolean;
  onClose: () => void;
  tr: Tr;
  agentCount: number;
  displayMessageCount: number;
  messages: Message[];
  searchOpen: boolean;
  searchQuery: string;
  searchResultCount: number;
  onSearchToggle: () => void;
  onClearMessages?: () => void;
  onSearchChange: (q: string) => void;
}

export function AnnouncementCliPanelHeader({
  embedded,
  onClose,
  tr,
  agentCount,
  displayMessageCount,
  messages,
  searchOpen,
  searchQuery,
  searchResultCount,
  onSearchToggle,
  onClearMessages,
  onSearchChange,
}: AnnouncementCliPanelHeaderProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px 10px",
          borderLeft: "3px solid var(--th-accent)",
        }}
      >
        {!embedded && <TrafficLights onClose={onClose} />}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            width={18}
            height={18}
            style={{ color: "var(--th-accent)", flexShrink: 0 }}
          >
            <path d="M3 7v6h3l5 4V3L6 7H3z" />
            <path d="M15.5 7.5a4 4 0 010 5" />
            <path d="M17.5 5.5a7 7 0 010 9" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--th-text-heading)",
                letterSpacing: "0.03em",
                lineHeight: 1.2,
              }}
            >
              {tr("전사 공지 채널", "Broadcast Channel", "全社告知チャンネル", "全员广播频道")}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--th-text-muted)",
                marginTop: 2,
                letterSpacing: "0.04em",
              }}
            >
              {agentCount} {tr("에이전트 수신 중", "agents receiving", "エージェント受信中", "个代理接收中")}
              {" · "}
              {displayMessageCount} {tr("건", "messages", "件", "条")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onSearchToggle}
            title={tr("검색", "Search")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              border: "1px solid",
              borderColor: searchOpen ? "var(--th-accent)" : "var(--th-border)",
              borderRadius: 6,
              background: searchOpen ? "var(--th-accent-glow)" : "transparent",
              color: searchOpen ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
              <circle cx="6.5" cy="6.5" r="4" />
              <path d="M10 10l3.5 3.5" strokeLinecap="round" />
            </svg>
          </button>

          {onClearMessages && messages.length > 0 && (
            <button
              type="button"
              onClick={onClearMessages}
              title={tr("내역 삭제", "Clear history")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                border: "1px solid var(--th-border)",
                borderRadius: 6,
                background: "transparent",
                color: "var(--th-text-muted)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-danger, #ef4444)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--th-danger, #ef4444)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)";
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 12, height: 12 }}
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {searchOpen && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderTop: "1px solid var(--th-border)",
            background: "var(--th-bg-elevated)",
          }}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ width: 11, height: 11, color: "var(--th-accent)", flexShrink: 0 }}
          >
            <circle cx="6.5" cy="6.5" r="4" />
            <path d="M10 10l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tr("메시지 검색...", "Search messages...", "メッセージ検索...", "搜索消息...")}
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12,
              color: "var(--th-text-primary)",
              caretColor: "var(--th-accent)",
              fontFamily: "var(--th-font-mono)",
            }}
          />
          {searchQuery.trim() && (
            <span style={{ fontSize: 10, color: "var(--th-accent)", flexShrink: 0 }}>
              {searchResultCount} {tr("건", "hits")}
            </span>
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--th-text-muted)" }}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
