import { useEffect } from "react";
import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import { IconDockWorkflow, IconDockLibrary, IconDockSettings, IconDockChat, IconDockTasks } from "./DesktopIcons";

const mono = "var(--th-font-mono)";

const DOCK_WINDOW_ICONS: Partial<Record<WindowType, (c: string) => React.ReactNode>> = {
  tasks: (c) => <IconDockTasks color={c} />,
  workflow: (c) => <IconDockWorkflow color={c} />,
  library: (c) => <IconDockLibrary color={c} />,
  settings: (c) => <IconDockSettings color={c} />,
  chat: (c) => <IconDockChat color={c} />,
};

export default function AppSwitcher() {
  const { t } = useI18n();
  const {
    openWindows,
    windowFocusOrder,
    minimizedWindows,
    appSwitcherOpen,
    appSwitcherIndex,
    setAppSwitcherOpen,
    setAppSwitcherIndex,
    bringWindowToFront,
  } = useUiStore();

  const WINDOW_LABELS: Record<WindowType, string> = {
    workflow: t({ ko: "워크플로", en: "Workflow", ja: "ワークフロー", zh: "工作流" }),
    library: t({ ko: "라이브러리", en: "Library", ja: "ライブラリ", zh: "库" }),
    settings: t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" }),
    chat: t({ ko: "채팅", en: "Chat", ja: "チャット", zh: "聊天" }),
    "agent-manager": t({ ko: "에이전트 설정", en: "Agent Manager", ja: "エージェント設定", zh: "代理设置" }),
    cli: t({ ko: "Agent CLI", en: "CLI", ja: "Agent CLI", zh: "Agent CLI" }),
    reports: t({ ko: "보고서", en: "Reports", ja: "レポート", zh: "报告" }),
    tasks: t({ ko: "태스크 보드", en: "Board", ja: "タスクボード", zh: "工作看板" }),
    "create-task": t({ ko: "새 태스크", en: "New Task", ja: "新しいタスク", zh: "新任务" }),
    "llm-guide": t({ ko: "LLM 가이드", en: "LLM Guide", ja: "LLMガイド", zh: "LLM指南" }),
    synapse: t({ ko: "시냅스", en: "Synapse", ja: "シナプス", zh: "知识库" }),
    "image-studio": t({ ko: "이미지 스튜디오", en: "Image Studio", ja: "イメージスタジオ", zh: "图像工作室" }),
    folder: t({ ko: "폴더", en: "Folder", ja: "フォルダ", zh: "文件夹" }),
    "create-agent": t({ ko: "신규 직원 채용", en: "Hire Agent", ja: "エージェント採用", zh: "招聘员工" }),
    "create-department": t({ ko: "신규 부서 추가", en: "Add Department", ja: "部署追加", zh: "添加部门" }),
    "library-guide": t({ ko: "라이브러리 가이드", en: "Library Guide", ja: "ライブラリガイド", zh: "库指南" }),
    "user-guide": t({ ko: "사용자 가이드", en: "User Guide", ja: "ユーザーガイド", zh: "用户指南" }),
    "file-tree": t({ ko: "파일 탐색기", en: "File Explorer", ja: "ファイル", zh: "文件管理" }),
    alerts: t({ ko: "알림", en: "Alerts", ja: "アラート", zh: "警报" }),
    "cli-usage": t({ ko: "CLI 비용", en: "CLI Cost", ja: "CLIコスト", zh: "CLI成本" }),
    "local-llm": t({ ko: "로컬 LLM", en: "Local LLM", ja: "ローカルLLM", zh: "本地LLM" }),
    "feature-builder": t({ ko: "새 기능 만들기", en: "New Feature", ja: "新機能作成", zh: "新建功能" }),
    "flow-graph": t({ ko: "에이전트 그래프", en: "Agent Graph", ja: "エージェントグラフ", zh: "代理图" }),
    "git-import": t({ ko: "Git 가져오기", en: "Git Import", ja: "Gitインポート", zh: "Git导入" }),
    dashboard: t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "控制台" }),
    "widget-board": t({ ko: "위젯 보드", en: "Widget Board", ja: "ウィジェットボード", zh: "小组件板" }),
  };

  const ordered = [...windowFocusOrder].filter((w) => openWindows.has(w)).reverse();
  const selectedIndex = ordered.length > 0 ? ((appSwitcherIndex % ordered.length) + ordered.length) % ordered.length : 0;
  const selected = ordered[selectedIndex] ?? null;

  useEffect(() => {
    if (!appSwitcherOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAppSwitcherOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appSwitcherOpen, setAppSwitcherOpen]);

  if (!appSwitcherOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "24px 32px",
          background: "var(--th-bg-surface)",
          border: "1px solid var(--th-border)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        {ordered.map((w, i) => {
          const isSelected = i === selectedIndex;
          const isMinimized = minimizedWindows.has(w);
          const Icon = DOCK_WINDOW_ICONS[w];
          return (
            <div
              key={w}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 12,
                border: `2px solid ${isSelected ? "var(--th-accent)" : "transparent"}`,
                background: isSelected ? "var(--th-accent-glow)" : "transparent",
                transform: isSelected ? "scale(1.05)" : "scale(1)",
                transition: "border 0.12s, background 0.12s, transform 0.12s",
                opacity: isMinimized ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--th-bg-secondary)",
                  color: "var(--th-text-primary)",
                }}
              >
                {Icon ? Icon("var(--th-text-primary)") : <span style={{ fontSize: 20 }}>▦</span>}
              </div>
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-secondary)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                {WINDOW_LABELS[w] ?? w}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useAppSwitcherKeyboard() {
  const {
    openWindows,
    windowFocusOrder,
    appSwitcherOpen,
    setAppSwitcherOpen,
    setAppSwitcherIndex,
    appSwitcherIndex,
    bringWindowToFront,
  } = useUiStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || (!e.metaKey && !e.ctrlKey)) return;
      const ordered = [...windowFocusOrder].filter((w) => openWindows.has(w)).reverse();
      if (ordered.length === 0) return;
      e.preventDefault();
      if (!appSwitcherOpen) {
        setAppSwitcherOpen(true);
        setAppSwitcherIndex(0);
        return;
      }
      const next = e.shiftKey ? appSwitcherIndex - 1 : appSwitcherIndex + 1;
      setAppSwitcherIndex((next % ordered.length + ordered.length) % ordered.length);
    }

    function onKeyUp(e: KeyboardEvent) {
      if ((e.key === "Meta" || e.key === "Control") && useUiStore.getState().appSwitcherOpen) {
        const state = useUiStore.getState();
        const ordered = [...state.windowFocusOrder].filter((w) => state.openWindows.has(w)).reverse();
        const idx = ordered.length > 0 ? ((state.appSwitcherIndex % ordered.length) + ordered.length) % ordered.length : 0;
        const w = ordered[idx];
        if (w) state.bringWindowToFront(w);
        state.setAppSwitcherOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [openWindows, windowFocusOrder, appSwitcherOpen, appSwitcherIndex, setAppSwitcherOpen, setAppSwitcherIndex, bringWindowToFront]);
}
