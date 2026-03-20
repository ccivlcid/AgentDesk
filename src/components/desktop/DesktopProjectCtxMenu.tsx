import type { I18nContextValue } from "../../i18n";
import type { Project, ProjectFolder } from "../../types";

export interface DesktopProjectCtxMenuProps {
  projectCtxMenu: { x: number; y: number; projectId: string; projectName: string };
  projects: Project[];
  folders: ProjectFolder[];
  t: I18nContextValue["t"];
  onClose: () => void;
  onRunApp: (projectId: string) => void;
  onOpen: (projectId: string) => void;
  onQuickLook: (projectId: string) => void;
  onSwitchProject: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onMoveToFolder: (projectId: string, folderId: string) => Promise<void>;
}

const menuStyle = {
  position: "fixed" as const,
  zIndex: 2000,
  background: "var(--th-panel-bg)",
  backdropFilter: "blur(20px)",
  border: "1px solid var(--th-border)",
  borderRadius: 10,
  padding: "4px 0",
  minWidth: 180,
  boxShadow: "0 16px 40px var(--th-glass-shadow)",
};

export function DesktopProjectCtxMenu({
  projectCtxMenu,
  projects,
  folders,
  t,
  onClose,
  onRunApp,
  onOpen,
  onQuickLook,
  onSwitchProject,
  onDelete,
  onMoveToFolder,
}: DesktopProjectCtxMenuProps) {
  const entries: Array<{
    label: string;
    icon: string;
    shortcut?: string;
    danger?: boolean;
    accent?: boolean;
    action: () => void;
  }> = [
    {
      label: t({ ko: "▶ 앱 실행", en: "▶ Run App", ja: "▶ 実行", zh: "▶ 运行应用" }),
      icon: "▶",
      accent: true,
      action: () => {
        onRunApp(projectCtxMenu.projectId);
        onClose();
      },
    },
    {
      label: t({ ko: "열기", en: "Open", ja: "開く", zh: "打开" }),
      icon: "📂",
      action: () => {
        onOpen(projectCtxMenu.projectId);
        onClose();
      },
    },
    {
      label: t({ ko: "빠른 미리보기", en: "Quick Look", ja: "クイックルック", zh: "快速预览" }),
      icon: "⌃",
      shortcut: "Space",
      action: () => {
        onQuickLook(projectCtxMenu.projectId);
        onClose();
      },
    },
    {
      label: t({ ko: "프로젝트 전환", en: "Switch Project", ja: "プロジェクト切替", zh: "切换项目" }),
      icon: "↩",
      action: () => {
        onSwitchProject(projectCtxMenu.projectId);
        onClose();
      },
    },
    {
      label: t({ ko: "프로젝트 삭제", en: "Delete Project", ja: "プロジェクト削除", zh: "删除项目" }),
      icon: "🗑",
      danger: true,
      action: () => onDelete(projectCtxMenu.projectId),
    },
  ];

  return (
    <div
      data-no-ctx="true"
      style={{ ...menuStyle, left: projectCtxMenu.x, top: projectCtxMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: "6px 14px 6px",
          fontFamily: "var(--th-font-mono)",
          fontSize: 10,
          color: "var(--th-text-muted)",
          borderBottom: "1px solid var(--th-border)",
          marginBottom: 4,
        }}
      >
        📁 {projectCtxMenu.projectName}
      </div>
      {entries.map(({ label, icon, shortcut, danger, accent, action }) => (
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
            color: danger ? "var(--th-danger-text)" : accent ? "#22c55e" : "var(--th-text-primary)",
            textAlign: "left",
            justifyContent: "space-between",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = danger
              ? "var(--th-danger-bg)"
              : accent
                ? "rgba(34,197,94,0.1)"
                : "var(--th-accent-glow)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11 }}>{icon}</span>
            {label}
          </span>
          {shortcut && (
            <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{shortcut}</span>
          )}
        </button>
      ))}
      {folders.length > 0 && (
        <>
          <div style={{ margin: "4px 12px", borderTop: "1px solid var(--th-border)" }} />
          <div
            style={{
              padding: "3px 12px 2px",
              fontSize: 10,
              color: "var(--th-text-muted)",
              fontFamily: "var(--th-font-mono)",
              letterSpacing: "0.06em",
            }}
          >
            {t({ ko: "폴더로 이동", en: "MOVE TO FOLDER", ja: "フォルダへ移動", zh: "移动到文件夹" })}
          </div>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={async () => {
                onClose();
                try {
                  await onMoveToFolder(projectCtxMenu.projectId, folder.id);
                } catch { /* ignore */ }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
                fontSize: 12,
                color: "var(--th-text-primary)",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "none";
              }}
            >
              <span>📁</span>
              <span
                style={{
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {folder.name}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
