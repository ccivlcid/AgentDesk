import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useUiStore } from "../../store/uiStore";
import type { ProjectMetaPayload } from "../../app/types";

const ChatPanel = lazy(() => import("../ChatPanel").then((m) => ({ default: m.ChatPanel })));
const GroupChatPanel = lazy(() => import("../chat-panel/GroupChatPanel"));

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      loading...
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

  return (
    <AppWindow
      windowType="chat"
      title="Chat"
      emoji="💬"
      defaultWidth={760}
      defaultHeight={560}
      tabs={[
        {
          id: "direct",
          label: "Direct",
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
          label: "Group",
          content: (
            <Suspense fallback={<Loading />}>
              <GroupChatPanel
                agents={agents}
                onClose={() => closeWindow("chat")}
              />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
