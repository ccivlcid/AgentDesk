import { useState, lazy, Suspense, type ReactNode } from "react";
import type { Project, Category, CompanySettings, WSEventType } from "../../types";
import type { OAuthCallbackResult, ProjectMetaPayload } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import MenuBar from "./MenuBar";
import DesktopIcon, { type DesktopIconDef } from "./DesktopIcon";
import Widget from "./Widget";
import Dock from "./Dock";
import WidgetPicker from "./WidgetPicker";
import AgentsWidget from "./widgets/AgentsWidget";
import TasksWidget from "./widgets/TasksWidget";
import AlertsWidget from "./widgets/AlertsWidget";
import CliCostWidget from "./widgets/CliCostWidget";
import FlowGraphWidget from "./widgets/FlowGraphWidget";
import WorkflowWindow from "../windows/WorkflowWindow";
import LibraryWindow from "../windows/LibraryWindow";
import SettingsWindow from "../windows/SettingsWindow";
import AgentManagerWindow from "../windows/AgentManagerWindow";
import NotificationCenter from "../NotificationCenter";

const ChatWindow = lazy(() => import("../windows/ChatWindow"));

const WIDGET_LABELS: Record<string, string> = {
  heartbeat:   "Agents",
  "task-board": "Tasks",
  alerts:      "Alerts",
  "cli-usage": "CLI Cost",
  "flow-graph": "Flow Graph",
};

function WidgetContent({ id }: { id: string }) {
  switch (id) {
    case "heartbeat":   return <AgentsWidget />;
    case "task-board":  return <TasksWidget />;
    case "alerts":      return <AlertsWidget />;
    case "cli-usage":   return <CliCostWidget />;
    case "flow-graph":  return <FlowGraphWidget />;
    default:            return null;
  }
}

interface DesktopProps {
  connected: boolean;
  on: (event: WSEventType, handler: (payload: unknown) => void) => () => void;
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onRefreshCli: () => Promise<void>;
  oauthResult: OAuthCallbackResult | null;
  onOauthResultClear: () => void;
  onAgentsChange: () => void;
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
  onProjectCreate: () => void;
  onCreateTask: () => void;
  children?: ReactNode;
}

export default function Desktop({
  connected,
  on,
  onSaveSettings,
  onRefreshCli,
  oauthResult,
  onOauthResultClear,
  onAgentsChange,
  onSendMessage,
  onSendAnnouncement,
  onSendDirective,
  onClearMessages,
  onProjectCreate,
  onCreateTask,
  children,
}: DesktopProps) {
  const {
    openWindows,
    openWindow,
    widgetLayout,
  } = useUiStore();

  const { projects, categories, currentProjectId, setCurrentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  // 데스크톱 아이콘 정의
  const icons: DesktopIconDef[] = [
    { id: "agent-manager", emoji: "👤", label: "에이전트 설정",  onClick: () => openWindow("agent-manager") },
    { id: "project-create", emoji: "📁", label: "프로젝트 생성", onClick: onProjectCreate },
    { id: "create-task",    emoji: "▶",  label: "태스크 실행",   onClick: onCreateTask },
    { id: "workflow",       emoji: "⚡", label: "워크플로 빌더", onClick: () => openWindow("workflow") },
    { id: "library",        emoji: "📋", label: "라이브러리",    onClick: () => openWindow("library") },
    { id: "chat",           emoji: "💬", label: "채팅",          onClick: () => openWindow("chat") },
  ];

  // 기본 아이콘 배치 (수평으로 배열)
  const DEFAULT_ICON_POSITIONS = icons.reduce<Record<string, { x: number; y: number }>>((acc, def, i) => {
    acc[def.id] = { x: 40 + i * 90, y: 60 };
    return acc;
  }, {});

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--th-bg-primary)",
        overflow: "hidden",
        fontFamily: "var(--th-font-mono)",
      }}
    >
      {/* 메뉴바 */}
      <MenuBar
        projects={projects}
        categories={categories}
        currentProject={currentProject}
        onProjectSelect={setCurrentProjectId}
        onProjectCreate={onProjectCreate}
        connected={connected}
        notificationSlot={
          <NotificationCenter on={on} />
        }
      />

      {/* 바탕화면 영역 (메뉴바 아래, Dock 위) */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          bottom: 80,
          overflow: "hidden",
        }}
      >
        {/* 데스크톱 아이콘 */}
        {icons.map((def) => {
          const defaultPos = DEFAULT_ICON_POSITIONS[def.id];
          return (
            <DesktopIcon
              key={def.id}
              def={def}
              defaultX={defaultPos.x}
              defaultY={defaultPos.y}
            />
          );
        })}

        {/* 위젯들 */}
        {widgetLayout.map((entry) => (
          <Widget
            key={entry.id}
            id={entry.id}
            title={WIDGET_LABELS[entry.id] ?? entry.id}
            x={entry.x}
            y={entry.y}
            w={entry.w}
            h={entry.h}
          >
            <WidgetContent id={entry.id} />
          </Widget>
        ))}

        {/* 위젯 추가 버튼 */}
        <button
          onClick={() => setShowWidgetPicker(true)}
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.04)",
            border: "1px dashed var(--th-border)",
            borderRadius: 8,
            padding: "6px 16px",
            fontFamily: "var(--th-font-mono)",
            fontSize: 11,
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--th-accent)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; }}
        >
          + 위젯 추가
        </button>
      </div>

      {/* Dock */}
      <Dock />

      {/* 앱 창들 */}
      {openWindows.has("workflow")      && <WorkflowWindow />}
      {openWindows.has("library")       && <LibraryWindow />}
      {openWindows.has("settings")      && (
        <SettingsWindow
          onSaveSettings={onSaveSettings}
          onRefreshCli={onRefreshCli}
          oauthResult={oauthResult}
          onOauthResultClear={onOauthResultClear}
        />
      )}
      {openWindows.has("agent-manager") && <AgentManagerWindow onAgentsChange={onAgentsChange} />}
      {openWindows.has("chat")          && (
        <Suspense fallback={null}>
          <ChatWindow
            onSendMessage={onSendMessage}
            onSendAnnouncement={onSendAnnouncement}
            onSendDirective={onSendDirective}
            onClearMessages={onClearMessages}
          />
        </Suspense>
      )}

      {/* 위젯 피커 */}
      {showWidgetPicker && <WidgetPicker onClose={() => setShowWidgetPicker(false)} />}

      {/* 기존 오버레이/모달 (TaskPanel, DecisionInbox 등) */}
      {children}
    </div>
  );
}
