import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import type { ProjectMetaPayload } from "../../app/types";
import { useI18n } from "../../i18n";

const ChatPanel = lazy(() => import("../ChatPanel").then((m) => ({ default: m.ChatPanel })));
const GroupChatPanel = lazy(() => import("../chat-panel/GroupChatPanel"));

function Loading() {
  const { t } = useI18n();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
      {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
    </div>
  );
}

interface ChatWindowProps {
  onSendMessage: (
    content: string,
    receiverType: "agent" | "department" | "all",
    receiverId?: string,
    messageType?: string,
    projectMeta?: ProjectMetaPayload,
  ) => Promise<void>;
  onSendAnnouncement: (content: string) => Promise<void>;
  onSendDirective: (content: string, projectMeta?: ProjectMetaPayload) => Promise<void>;
  onClearMessages: (agentId?: string) => Promise<void>;
}

export default function ChatWindow({
  onSendMessage,
  onSendAnnouncement,
  onSendDirective,
  onClearMessages,
}: ChatWindowProps) {
  const { agents, chatAgent, streamingMessage } = useAgentStore();
  const { messages } = useTaskStore();
  const { closeWindow } = useUiStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { t } = useI18n();

  /** 전사 공지·단톡: 선택 프로젝트에 배정된 에이전트만 (미선택·로딩 중은 빈 목록) */
  const projectAgents =
    currentProjectId && projectAgentsLoaded
      ? agents.filter((a) => projectAgentIds.has(a.id))
      : [];

  return (
    <AppWindow
      windowType="chat"
      title={t({ ko: "채팅", en: "Chat", ja: "チャット", zh: "聊天" })}
      emoji="💬"
      defaultWidth={760}
      defaultHeight={560}
      tabs={[
        {
          id: "direct",
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
                <path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 2 3-2h3a1 1 0 001-1V3a1 1 0 00-1-1z" />
                <line x1="5" y1="6" x2="11" y2="6" />
                <line x1="5" y1="9" x2="9" y2="9" />
              </svg>
              {t({ ko: "공지", en: "Broadcast", ja: "告知", zh: "广播" })}
            </span>
          ),
          content: (
            <Suspense fallback={<Loading />}>
              <ChatPanel
                selectedAgent={chatAgent}
                messages={messages}
                agents={agents}
                broadcastAgents={projectAgents}
                streamingMessage={streamingMessage}
                onSendMessage={onSendMessage}
                onSendAnnouncement={onSendAnnouncement}
                onSendDirective={onSendDirective}
                onClearMessages={onClearMessages}
                onClose={() => closeWindow("chat")}
                embedded
              />
            </Suspense>
          ),
        },
        {
          id: "group",
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
                <circle cx="5" cy="5" r="2" />
                <circle cx="11" cy="5" r="2" />
                <path d="M1 14c0-2.2 1.8-4 4-4h6c2.2 0 4 1.8 4 4" />
              </svg>
              {t({ ko: "단톡방", en: "Group Chat", ja: "グループ", zh: "群聊" })}
            </span>
          ),
          content: (
            <Suspense fallback={<Loading />}>
              <GroupChatPanel
                agents={projectAgents}
                onClose={() => closeWindow("chat")}
              />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
