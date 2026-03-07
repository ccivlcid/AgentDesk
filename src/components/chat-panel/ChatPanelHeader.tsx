import AgentAvatar from "../AgentAvatar";
import type { Agent } from "../../types";

type Tr = (ko: string, en: string, ja?: string, zh?: string) => string;

interface ChatPanelHeaderProps {
  selectedAgent: Agent | null;
  selectedDeptName?: string | null;
  spriteMap: ReturnType<typeof import("../AgentAvatar").buildSpriteMap>;
  tr: Tr;
  getAgentName: (agent: Agent | null | undefined) => string;
  getRoleLabel: (role: string) => string;
  getStatusLabel: (status: string) => string;
  statusColors: Record<string, string>;
  showAnnouncementBanner: boolean;
  visibleMessagesLength: number;
  onClearMessages?: (agentId?: string) => void;
  onClose: () => void;
  searchOpen: boolean;
  searchQuery: string;
  searchResultCount: number;
  onSearchToggle: () => void;
  onSearchChange: (q: string) => void;
}

export default function ChatPanelHeader({
  selectedAgent,
  selectedDeptName,
  spriteMap,
  tr,
  getAgentName,
  getRoleLabel,
  getStatusLabel,
  statusColors,
  showAnnouncementBanner,
  visibleMessagesLength,
  onClearMessages,
  onClose,
  searchOpen,
  searchQuery,
  searchResultCount,
  onSearchToggle,
  onSearchChange,
}: ChatPanelHeaderProps) {
  return (
    <>
      <div className="chat-header flex flex-shrink-0 items-center gap-3 px-4 py-3" style={{ background: "var(--th-bg-elevated)" }}>
        {selectedAgent ? (
          <>
            <div className="relative flex-shrink-0">
              <AgentAvatar agent={selectedAgent} spriteMap={spriteMap} size={40} />
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 ${
                  statusColors[selectedAgent.status] ?? "bg-[#64748b]"
                }`}
                style={{ borderColor: "var(--th-bg-elevated)" }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">{getAgentName(selectedAgent)}</span>
                <span className="px-1.5 py-0.5 text-xs font-mono" style={{ borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}>
                  {getRoleLabel(selectedAgent.role)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="truncate text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{selectedDeptName}</span>
                <span style={{ color: "var(--th-border)" }}>·</span>
                <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{getStatusLabel(selectedAgent.status)}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-xl">
              📢
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">
                {tr("전사 공지", "Company Announcement", "全体告知", "全员公告")}
              </div>
              <div className="mt-0.5 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                {tr(
                  "모든 에이전트에게 전달됩니다",
                  "Sent to all agents",
                  "すべてのエージェントに送信されます",
                  "将发送给所有代理",
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-shrink-0 items-center gap-1">
          {/* Search toggle */}
          <button
            onClick={onSearchToggle}
            className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--th-bg-surface-hover)]"
            style={{ borderRadius: "2px", color: searchOpen ? "var(--th-accent)" : "var(--th-text-muted)" }}
            aria-label={tr("메시지 검색", "Search messages", "メッセージを検索", "搜索消息")}
            title={tr("메시지 검색", "Search messages", "メッセージを検索", "搜索消息")}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6.5" cy="6.5" r="4" />
              <path d="M10 10l3.5 3.5" strokeLinecap="round" />
            </svg>
          </button>

          {onClearMessages && visibleMessagesLength > 0 && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    selectedAgent
                      ? tr(
                          `${getAgentName(selectedAgent)}와의 대화를 삭제하시겠습니까?`,
                          `Delete conversation with ${getAgentName(selectedAgent)}?`,
                          `${getAgentName(selectedAgent)}との会話を削除しますか？`,
                          `要删除与 ${getAgentName(selectedAgent)} 的对话吗？`,
                        )
                      : tr(
                          "전사 공지 내역을 삭제하시겠습니까?",
                          "Delete announcement history?",
                          "全体告知履歴を削除しますか？",
                          "要删除全员公告记录吗？",
                        ),
                  )
                ) {
                  onClearMessages(selectedAgent?.id);
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--th-bg-surface-hover)] hover:text-red-400"
              style={{ color: "var(--th-text-muted)" }}
              aria-label={tr("대화 내역 삭제", "Clear message history", "会話履歴を削除", "清除消息记录")}
              title={tr("대화 내역 삭제", "Clear message history", "会話履歴を削除", "清除消息记录")}
            >
              <svg
                className="block h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--th-bg-surface-hover)] hover:text-white"
            style={{ color: "var(--th-text-secondary)" }}
            aria-label={tr("닫기", "Close", "閉じる", "关闭")}
          >
            ✕
          </button>
        </div>
      </div>

      {showAnnouncementBanner && (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2">
          <span className="text-sm font-medium text-yellow-400">
            📢{" "}
            {tr(
              "전사 공지 모드 - 모든 에이전트에게 전달됩니다",
              "Announcement mode - sent to all agents",
              "全体告知モード - すべてのエージェントに送信",
              "全员公告模式 - 将发送给所有代理",
            )}
          </span>
        </div>
      )}

      {searchOpen && (
        <div className="flex flex-shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
          <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--th-text-muted)" }}>
            <circle cx="6.5" cy="6.5" r="4" />
            <path d="M10 10l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tr("메시지 검색...", "Search messages...", "メッセージを検索...", "搜索消息...")}
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-xs font-mono outline-none"
            style={{ color: "var(--th-text-primary)" }}
          />
          {searchQuery.trim() && (
            <span className="flex-shrink-0 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              {searchResultCount} {tr("건", "results", "件", "条")}
            </span>
          )}
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="flex-shrink-0 text-[10px] font-mono"
              style={{ color: "var(--th-text-muted)" }}
              aria-label={tr("검색어 지우기", "Clear search", "検索をクリア", "清除搜索")}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </>
  );
}
