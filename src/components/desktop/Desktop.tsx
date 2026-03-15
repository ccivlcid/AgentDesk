import { useState, useEffect, useRef, lazy, Suspense, useCallback, type ReactNode } from "react";
import type { Project, Category, CompanySettings, WSEventType } from "../../types";
import type { OAuthCallbackResult, ProjectMetaPayload } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import CommandPalette from "../CommandPalette";
import KeyboardShortcutsGuide from "../KeyboardShortcutsGuide";
import UserGuidePanel from "./UserGuidePanel";
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
import FileTreeWidget from "./widgets/FileTreeWidget";
import WallpaperPicker from "./WallpaperPicker";
import QuickLook from "./QuickLook";
import MissionControl from "./MissionControl";
import { deleteProject } from "../../api/organization-projects";
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
  "file-tree":  "File Tree",
};

function WidgetContent({ id }: { id: string }) {
  switch (id) {
    case "heartbeat":   return <AgentsWidget />;
    case "task-board":  return <TasksWidget />;
    case "alerts":      return <AlertsWidget />;
    case "cli-usage":   return <CliCostWidget />;
    case "flow-graph":  return <FlowGraphWidget />;
    case "file-tree":   return <FileTreeWidget />;
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
    wallpaper,
    jiggleMode,
    setJiggleMode,
    missionControlOpen,
    setMissionControlOpen,
  } = useUiStore();

  const { projects, categories, currentProjectId, setCurrentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();

  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [projectCtxMenu, setProjectCtxMenu] = useState<{ x: number; y: number; projectId: string; projectName: string } | null>(null);
  const [quickLookProjectId, setQuickLookProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { setProjects } = useProjectStore();

  const handleDeleteProject = useCallback(async (projectId: string) => {
    setProjectCtxMenu(null);
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProjectId === projectId) setCurrentProjectId(null);
  }, [currentProjectId, setCurrentProjectId, setProjects]);

  // ── 롱프레스 Jiggle Mode ────────────────────────────────────────
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressMoved = useRef(false);
  const longPressStartPos = useRef({ x: 0, y: 0 });

  function onDesktopMouseDown(e: React.MouseEvent) {
    // 아이콘/위젯 위에서는 무시
    if ((e.target as HTMLElement).closest("[data-no-ctx]") ||
        (e.target as HTMLElement) !== e.currentTarget) return;
    if (e.button !== 0) return;
    longPressMoved.current = false;
    longPressStartPos.current = { x: e.clientX, y: e.clientY };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (!longPressMoved.current) setJiggleMode(true);
    }, 600);
  }

  function onDesktopMouseMove(e: React.MouseEvent) {
    const dx = e.clientX - longPressStartPos.current.x;
    const dy = e.clientY - longPressStartPos.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      longPressMoved.current = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }

  function onDesktopMouseUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  // ── 키보드 단축키 ───────────────────────────────────────────────
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      // Esc — jiggle 해제, quickLook 닫기
      if (e.key === "Escape") {
        if (jiggleMode) { setJiggleMode(false); return; }
        if (quickLookProjectId) { setQuickLookProjectId(null); return; }
        if (missionControlOpen) { setMissionControlOpen(false); return; }
      }

      // Ctrl+Shift+K or Cmd+K — CommandPalette
      if ((e.ctrlKey && e.shiftKey && e.key === "K") || (e.metaKey && e.key === "k")) {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
        return;
      }

      // Ctrl+ArrowUp — Mission Control
      if (e.ctrlKey && e.key === "ArrowUp") {
        e.preventDefault();
        setMissionControlOpen((v) => !v);
        return;
      }

      if (isInput) return;

      // Space — Quick Look on selected project
      if (e.key === " " && selectedProjectId) {
        e.preventDefault();
        setQuickLookProjectId(selectedProjectId);
        return;
      }

      // ? — UserGuide
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        setShowUserGuide((v) => !v);
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
  }, [toggleWindow, jiggleMode, setJiggleMode, missionControlOpen, setMissionControlOpen, quickLookProjectId, selectedProjectId]);

  // jiggle 모드에서 바탕화면 클릭 시 해제
  function onDesktopClick(e: React.MouseEvent) {
    setCtxMenu(null);
    setProjectCtxMenu(null);
    if (jiggleMode && e.target === e.currentTarget) {
      setJiggleMode(false);
    }
  }

  // 데스크톱 아이콘 정의 (채팅·라이브러리는 Dock에서 제공)
  const icons: DesktopIconDef[] = [
    { id: "agent-manager",  emoji: "👤", label: "에이전트 설정",  onClick: () => openWindow("agent-manager") },
    { id: "project-create", emoji: "📁", label: "프로젝트 생성", onClick: onProjectCreate },
    { id: "create-task",    emoji: "▶",  label: "태스크 실행",   onClick: onCreateTask },
    { id: "workflow",       emoji: "⚡", label: "워크플로 빌더", onClick: () => openWindow("workflow") },
    { id: "repl",           emoji: ">_", label: "에이전트 REPL", onClick: () => openWindow("repl") },
  ];

  // 기본 아이콘 배치 (수평으로 배열)
  const DEFAULT_ICON_POSITIONS = icons.reduce<Record<string, { x: number; y: number }>>((acc, def, i) => {
    acc[def.id] = { x: 40 + i * 90, y: 60 };
    return acc;
  }, {});

  const quickLookProject = quickLookProjectId ? projects.find((p) => p.id === quickLookProjectId) ?? null : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: wallpaper,
        overflow: "hidden",
        fontFamily: "var(--th-font-mono)",
        transition: "background 0.4s ease",
      }}
      onContextMenu={(e) => {
        const tag = (e.target as HTMLElement).closest("[data-no-ctx]");
        if (tag) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onClick={onDesktopClick}
      onMouseDown={onDesktopMouseDown}
      onMouseMove={onDesktopMouseMove}
      onMouseUp={onDesktopMouseUp}
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
        onOpenWallpaperPicker={() => setShowWallpaperPicker(true)}
        onOpenWidgetPicker={() => setShowWidgetPicker(true)}
        onOpenMissionControl={() => setMissionControlOpen(true)}
        onOpenUserGuide={() => setShowUserGuide(true)}
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
        {/* 시스템 앱 아이콘 */}
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

        {/* 프로젝트 폴더 아이콘 */}
        {projects.map((project, i) => {
          const col = i % 8;
          const row = Math.floor(i / 8);
          const isActive = project.id === currentProjectId;
          const def: DesktopIconDef = {
            id: `project-${project.id}`,
            emoji: isActive ? "📂" : "📁",
            label: project.name,
            deletable: true,
            onDelete: () => handleDeleteProject(project.id),
            onClick: () => {
              setCurrentProjectId(project.id);
              setSelectedProjectId(project.id);
            },
            onContextMenu: (e) => setProjectCtxMenu({ x: e.clientX, y: e.clientY, projectId: project.id, projectName: project.name }),
          };
          return (
            <DesktopIcon
              key={def.id}
              def={def}
              defaultX={40 + col * 90}
              defaultY={160 + row * 100}
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

      {/* 배경화면 피커 */}
      {showWallpaperPicker && <WallpaperPicker onClose={() => setShowWallpaperPicker(false)} />}

      {/* Quick Look */}
      {quickLookProject && (
        <QuickLook project={quickLookProject} onClose={() => setQuickLookProjectId(null)} />
      )}

      {/* Mission Control */}
      {missionControlOpen && (
        <MissionControl
          openWindows={openWindows}
          widgetLayout={widgetLayout}
          onClose={() => setMissionControlOpen(false)}
          onFocusWindow={(w) => { openWindow(w); setMissionControlOpen(false); }}
        />
      )}

      {/* 프로젝트 아이콘 우클릭 메뉴 */}
      {projectCtxMenu && (
        <div
          data-no-ctx="true"
          style={{
            position: "fixed",
            left: projectCtxMenu.x,
            top: projectCtxMenu.y,
            zIndex: 2000,
            background: "var(--th-panel-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--th-border)",
            borderRadius: 10,
            padding: "4px 0",
            minWidth: 180,
            boxShadow: "0 16px 40px var(--th-glass-shadow)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "6px 14px 6px", fontFamily: "var(--th-font-mono)", fontSize: 10, color: "var(--th-text-muted)", borderBottom: "1px solid var(--th-border)", marginBottom: 4 }}>
            📁 {projectCtxMenu.projectName}
          </div>
          {[
            {
              label: "빠른 미리보기",
              icon: "⌃",
              shortcut: "Space",
              action: () => { setSelectedProjectId(projectCtxMenu.projectId); setQuickLookProjectId(projectCtxMenu.projectId); setProjectCtxMenu(null); },
            },
            {
              label: "프로젝트 전환",
              icon: "↩",
              action: () => { setCurrentProjectId(projectCtxMenu.projectId); setProjectCtxMenu(null); },
            },
            {
              label: "프로젝트 삭제",
              icon: "🗑",
              danger: true,
              action: () => handleDeleteProject(projectCtxMenu.projectId),
            },
          ].map(({ label, icon, shortcut, danger, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "7px 14px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--th-font-mono)", fontSize: 12,
                color: danger ? "var(--th-danger-text)" : "var(--th-text-primary)",
                textAlign: "left",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = danger ? "var(--th-danger-bg)" : "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                {label}
              </span>
              {shortcut && <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{shortcut}</span>}
            </button>
          ))}
        </div>
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      {ctxMenu && (
        <div
          data-no-ctx="true"
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            zIndex: 2000,
            background: "var(--th-panel-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--th-border)",
            borderRadius: 10,
            padding: "4px 0",
            minWidth: 180,
            boxShadow: "0 16px 40px var(--th-glass-shadow)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: "배경화면 변경", icon: "🖼", action: () => { setShowWallpaperPicker(true); setCtxMenu(null); } },
            { label: "위젯 추가", icon: "＋", action: () => { setShowWidgetPicker(true); setCtxMenu(null); } },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "7px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
                fontSize: 12,
                color: "var(--th-text-primary)",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}

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
        onOpenShortcutsGuide={() => { setShowCommandPalette(false); setShowUserGuide(true); }}
      />

      {/* 유저 가이드 패널 */}
      <UserGuidePanel open={showUserGuide} onClose={() => setShowUserGuide(false)} />

      {/* 기존 오버레이/모달 (TaskPanel, DecisionInbox 등) */}
      {children}
    </div>
  );
}
