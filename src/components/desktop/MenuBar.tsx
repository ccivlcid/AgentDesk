import { useEffect, useState } from "react";
import type { Project, Category } from "../../types";
import { useUiStore } from "../../store/uiStore";
import ProjectSelector from "../project-selector/ProjectSelector";

const mono = "var(--th-font-mono)";

interface MenuBarProps {
  projects: Project[];
  categories: Category[];
  currentProject: Project | null;
  onProjectSelect: (id: string) => void;
  onProjectCreate: () => void;
  connected: boolean;
  totalCostToday?: string;
  notificationSlot?: React.ReactNode;
}

export default function MenuBar({
  projects,
  categories,
  currentProject,
  onProjectSelect,
  onProjectCreate,
  connected,
  totalCostToday,
  notificationSlot,
}: MenuBarProps) {
  const [now, setNow] = useState(() => new Date());
  const { openWindow } = useUiStore();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        zIndex: 1000,
        background: "rgba(12,12,12,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--th-border)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        fontFamily: mono,
        fontSize: 12,
      }}
    >
      {/* 로고 */}
      <button
        onClick={() => {}}
        style={{
          background: "none",
          border: "none",
          color: "var(--th-accent)",
          fontFamily: mono,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          padding: "2px 6px",
          letterSpacing: 1,
        }}
      >
        AgentDesk
      </button>

      {/* 연결 상태 */}
      <span style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: 10 }}>
        {connected ? "●" : "○"}
      </span>

      {/* 프로젝트 선택 */}
      <div style={{ flex: 1, maxWidth: 260 }}>
        <ProjectSelector
          currentProject={currentProject}
          projects={projects}
          categories={categories}
          onSelect={onProjectSelect}
          onCreateNew={onProjectCreate}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* CLI 비용 */}
      {totalCostToday && (
        <button
          onClick={() => openWindow("settings")}
          style={{
            background: "none",
            border: "none",
            color: "var(--th-text-secondary)",
            fontFamily: mono,
            fontSize: 11,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          ${totalCostToday}
        </button>
      )}

      {/* 알림 */}
      {notificationSlot}

      {/* 시각 */}
      <span style={{ color: "var(--th-text-secondary)", fontSize: 11, minWidth: 40, textAlign: "right" }}>
        {timeStr}
      </span>
    </div>
  );
}
