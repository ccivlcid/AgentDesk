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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
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

  // 현재 프로젝트에 배정된 에이전트만 필터링 (프로젝트 미선택 또는 로딩 전이면 전체)
  const projectAgents = currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

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
          label: t({ ko: "다이렉트", en: "Direct", ja: "ダイレクト", zh: "直接" }),
          content: (
            <Suspense fallback={<Loading />}>
              <ChatPanel
                selectedAgent={chatAgent}
                messages={messages}
                agents={agents}
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
          label: t({ ko: "그룹", en: "Group", ja: "グループ", zh: "群组" }),
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
