import { useState, useEffect, useRef, lazy, Suspense, type ReactNode } from "react";
import type { Project, Category, CompanySettings, WSEventType } from "../../types";
import type { OAuthCallbackResult, ProjectMetaPayload } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import CommandPalette from "../CommandPalette";
import KeyboardShortcutsGuide from "../KeyboardShortcutsGuide";
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
import ReplWindow from "../windows/ReplWindow";
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
    toggleWindow,
    widgetLayout,
  } = useUiStore();

  const { projects, categories, currentProjectId, setCurrentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();

  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);

  // ── 키보드 단축키 ───────────────────────────────────────────────
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      // Ctrl+Shift+K — CommandPalette
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
        return;
      }

      if (isInput) return;

      // ? — ShortcutsGuide
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        setShowShortcutsGuide((v) => !v);
        return;
      }

      // g 코드 단축키
      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        gPending.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => { gPending.current = false; }, 800);
        return;
      }

      if (gPending.current) {
        gPending.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        const map: Record<string, () => void> = {
          w: () => toggleWindow("workflow"),
          l: () => toggleWindow("library"),
          s: () => toggleWindow("settings"),
          c: () => toggleWindow("chat"),
          a: () => toggleWindow("agent-manager"),
          e: () => toggleWindow("repl"),
        };
        map[e.key]?.();
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [toggleWindow]);

  // 데스크톱 아이콘 정의 (채팅은 Dock에서 제공)
  const icons: DesktopIconDef[] = [
    { id: "agent-manager",  emoji: "👤", label: "에이전트 설정",  onClick: () => openWindow("agent-manager") },
    { id: "project-create", emoji: "📁", label: "프로젝트 생성", onClick: onProjectCreate },
    { id: "create-task",    emoji: "▶",  label: "태스크 실행",   onClick: onCreateTask },
    { id: "workflow",       emoji: "⚡", label: "워크플로 빌더", onClick: () => openWindow("workflow") },
    { id: "library",        emoji: "📋", label: "라이브러리",    onClick: () => openWindow("library") },
    { id: "repl",           emoji: ">_", label: "에이전트 REPL", onClick: () => openWindow("repl") },
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

        {/* macOS 스타일 시스템 가이드 */}
        <div
          style={{
            position: "absolute",
            top: 100,
            left: 40,
            right: 40,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* 카드 1: AgentDesk 소개 */}
          <div style={{
            background: "rgba(38,38,42,0.62)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>🤖</span>
              <div>
                <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--th-text-primary)", letterSpacing: "0.02em" }}>AgentDesk</div>
                <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-accent)" }}>Developer OS v1.0</div>
              </div>
            </div>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.7, marginBottom: 12 }}>
              여러 AI 에이전트를 동시에 실행·모니터링·제어하는 개발자 OS입니다.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                { icon: "⚡", text: "워크플로 빌더 — 에이전트 파이프라인 설계" },
                { icon: "📚", text: "라이브러리 — 스킬·규칙·메모리 관리" },
                { icon: "💬", text: "채팅 — 에이전트 직접 메시지" },
                { icon: "⚙",  text: "설정 — 시스템 환경 구성" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-muted)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 카드 2: 키보드 단축키 */}
          <div style={{
            background: "rgba(38,38,42,0.62)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)", marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ⌨  키보드 단축키
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { key: "g  w",       desc: "Workflow 빌더" },
                { key: "g  l",       desc: "Library" },
                { key: "g  s",       desc: "Settings" },
                { key: "g  c",       desc: "Chat" },
                { key: "g  a",       desc: "Agent Manager" },
                { key: "g  e",       desc: "REPL" },
                { key: "Ctrl⇧K",    desc: "Command Palette" },
                { key: "?",          desc: "단축키 가이드" },
              ].map(({ key, desc }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <code style={{
                    fontFamily: "var(--th-font-mono)",
                    fontSize: 10,
                    color: "var(--th-accent)",
                    background: "rgba(245,158,11,0.10)",
                    border: "1px solid rgba(245,158,11,0.20)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    whiteSpace: "nowrap",
                  }}>{key}</code>
                  <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-secondary)", textAlign: "right" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 카드 3: 데스크톱 & 위젯 */}
          <div style={{
            background: "rgba(38,38,42,0.62)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)", marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              🖥  데스크톱 아이콘
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
              {[
                { icon: "👤", text: "에이전트 설정" },
                { icon: "📁", text: "프로젝트 생성" },
                { icon: "▶",  text: "태스크 실행" },
                { icon: "⚡", text: "워크플로 빌더" },
                { icon: "📋", text: "라이브러리" },
                { icon: ">_", text: "에이전트 REPL" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, flexShrink: 0, width: 18, textAlign: "center" }}>{icon}</span>
                  <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-secondary)" }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10 }}>
              <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)", marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                📦  위젯 (+ 위젯 추가)
              </div>
              {[
                { icon: "💓", text: "Agents — 에이전트 상태" },
                { icon: "📋", text: "Tasks — 태스크 목록" },
                { icon: "🔔", text: "Alerts — 이상 감지" },
                { icon: "💰", text: "CLI Cost — 비용 현황" },
                { icon: "🕸", text: "Flow — 에이전트 그래프" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, flexShrink: 0, width: 18, textAlign: "center" }}>{icon}</span>
                  <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-secondary)" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

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
      {openWindows.has("repl")          && <ReplWindow />}
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

      {/* CommandPalette */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        agents={agents}
        tasks={tasks}
        projects={projects}
        currentProject={currentProject}
        onNavigate={(view) => {
          setShowCommandPalette(false);
          const viewWindowMap: Record<string, () => void> = {
            "workflow-builder": () => openWindow("workflow"),
            "skills":           () => openWindow("library"),
            "agent-rules":      () => openWindow("library"),
            "memory":           () => openWindow("library"),
            "hooks":            () => openWindow("library"),
            "settings":         () => openWindow("settings"),
            "agents":           () => openWindow("agent-manager"),
          };
          viewWindowMap[view]?.();
        }}
        onCreateTask={() => { setShowCommandPalette(false); onCreateTask(); }}
        onSelectProject={(p) => { setShowCommandPalette(false); setCurrentProjectId(p.id); }}
        onOpenShortcutsGuide={() => { setShowCommandPalette(false); setShowShortcutsGuide(true); }}
      />

      {/* 단축키 가이드 */}
      <KeyboardShortcutsGuide open={showShortcutsGuide} onClose={() => setShowShortcutsGuide(false)} />

      {/* 기존 오버레이/모달 (TaskPanel, DecisionInbox 등) */}
      {children}
    </div>
  );
}
