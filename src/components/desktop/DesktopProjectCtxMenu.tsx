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
  onEditDirective?: (projectId: string) => void;
  onCreateTask?: (projectId: string) => void;
}

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
  onEditDirective,
  onCreateTask,
}: DesktopProjectCtxMenuProps) {
  const project = projects.find((p) => p.id === projectCtxMenu.projectId);
  const isApp = project?.project_type === "app";

  const entries: ContextMenuEntry[] = isApp
    ? [
        {
          label: t({ ko: "앱 러너 열기", en: "Open App Runner", ja: "App Runner を開く", zh: "打开 App Runner" }),
          icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
          onClick: () => onRunApp(projectCtxMenu.projectId),
        },
        {
          label: t({ ko: "빠른 미리보기", en: "Quick Look", ja: "クイックルック", zh: "快速预览" }),
          icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
          shortcut: "Space",
          onClick: () => onQuickLook(projectCtxMenu.projectId),
        },
        { type: "separator" },
        {
          label: t({ ko: "앱 삭제", en: "Delete App", ja: "アプリ削除", zh: "删除应用" }),
          icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
          danger: true,
          onClick: () => onDelete(projectCtxMenu.projectId),
        },
      ]
    : [
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
          label: t({ ko: "새 업무 만들기", en: "Create Task", ja: "新しいタスク", zh: "新建任务" }),
          icon: "➕",
          onClick: () => onCreateTask?.(projectCtxMenu.projectId),
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
          label: t({ ko: "디렉티브 편집", en: "Edit Directive", ja: "ディレクティブ編集", zh: "编辑指令" }),
          icon: "📝",
          onClick: () => onEditDirective?.(projectCtxMenu.projectId),
        },
        { type: "separator" },
        {
          label: t({ ko: "프로젝트 삭제", en: "Delete Project", ja: "プロジェクト削除", zh: "删除項目" }),
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
