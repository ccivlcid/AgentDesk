import type { I18nContextValue } from "../../i18n";
import type { Project, ProjectFolder } from "../../types";
import ContextMenu, { type ContextMenuEntry } from "../ui/ContextMenu";

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

export function DesktopProjectCtxMenu({
  projectCtxMenu,
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
  const entries: ContextMenuEntry[] = [
    {
      label: t({ ko: "▶ 앱 실행", en: "▶ Run App", ja: "▶ 実行", zh: "▶ 运行应用" }),
      icon: "▶",
      onClick: () => onRunApp(projectCtxMenu.projectId),
    },
    {
      label: t({ ko: "열기", en: "Open", ja: "開く", zh: "打开" }),
      icon: "📂",
      onClick: () => onOpen(projectCtxMenu.projectId),
    },
    {
      label: t({ ko: "빠른 미리보기", en: "Quick Look", ja: "クイックルック", zh: "快速预览" }),
      icon: "⌃",
      shortcut: "Space",
      onClick: () => onQuickLook(projectCtxMenu.projectId),
    },
    {
      label: t({ ko: "프로젝트 전환", en: "Switch Project", ja: "プロジェクト切替", zh: "切换项目" }),
      icon: "↩",
      onClick: () => onSwitchProject(projectCtxMenu.projectId),
    },
    { type: "separator" },
    {
      label: t({ ko: "프로젝트 삭제", en: "Delete Project", ja: "プロジェクト削除", zh: "删除项目" }),
      icon: "🗑",
      danger: true,
      onClick: () => onDelete(projectCtxMenu.projectId),
    },
    ...(folders.length > 0
      ? [
          { type: "separator" } as ContextMenuEntry,
          {
            type: "section",
            label: t({ ko: "폴더로 이동", en: "MOVE TO FOLDER", ja: "フォルダへ移動", zh: "移动到文件夹" }),
          } as ContextMenuEntry,
          ...folders.map(
            (folder): ContextMenuEntry => ({
              label: folder.name,
              icon: "📁",
              onClick: () => {
                onMoveToFolder(projectCtxMenu.projectId, folder.id).catch(() => {});
              },
            })
          ),
        ]
      : []),
  ];

  return (
    <ContextMenu
      x={projectCtxMenu.x}
      y={projectCtxMenu.y}
      onClose={onClose}
      entries={entries}
      data-no-ctx="true"
    />
  );
}
