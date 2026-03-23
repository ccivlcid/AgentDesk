import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TaskCardState } from "./useTaskCardState";

interface TaskCardContextMenuProps {
  state: TaskCardState;
  x: number;
  y: number;
  onClose: () => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  danger?: boolean;
  hidden?: boolean;
  separator?: boolean;
}

export function TaskCardContextMenu({ state, x, y, onClose }: TaskCardContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const {
    t, task,
    canRun, canStop, canPause, canResume, canDelete,
    onRunTask, onPauseTask, onResumeTask,
    onOpenTerminal, onOpenMeetingMinutes,
    onHideTask, onUnhideTask,
    isHiddenTask, canHideTask,
    setShowDiff, setCardCollapsed, cardCollapsed,
    handleStopTask, handleDeleteTask,
  } = state;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const ctxHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("contextmenu", ctxHandler);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("contextmenu", ctxHandler);
    };
  }, [onClose]);

  // Intelligent positioning logic
  useLayoutEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    
    let left = x + 2; // Slight offset from cursor
    let top = y + 2;

    // Flip horizontally if space is tight on the right
    if (left + width > window.innerWidth - 10) {
      left = x - width - 2;
    }

    // Flip vertically if space is tight at the bottom
    if (top + height > window.innerHeight - 10) {
      top = y - height - 2;
    }

    // Final safety clamp to window edges
    left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - height - 10));

    setPos({ left, top });
  }, [x, y]);

  const items: MenuItem[] = [
    {
      label: cardCollapsed
        ? t({ ko: "카드 펼치기", en: "Expand card", ja: "カード展開", zh: "展开卡片" })
        : t({ ko: "카드 접기", en: "Collapse card", ja: "カード折畳", zh: "收起卡片" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={cardCollapsed ? "M6 9l6 6 6-6" : "M18 15l-6-6-6 6"}/></svg>,
      onClick: () => { setCardCollapsed((v) => !v); onClose(); },
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
      onClick: () => { onRunTask(task.id); onClose(); },
      color: "rgb(34,197,94)",
      hidden: !canRun,
    },
    {
      label: t({ ko: "일시중지", en: "Pause", ja: "一時停止", zh: "暂停" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
      onClick: () => { onPauseTask?.(task.id); onClose(); },
      color: "rgb(234,88,12)",
      hidden: !canPause,
    },
    {
      label: t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
      onClick: () => { void handleStopTask(); onClose(); },
      danger: true,
      hidden: !canStop,
    },
    {
      label: t({ ko: "재개", en: "Resume", ja: "再開", zh: "恢复" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 019-9 9 9 0 010 18"/><path d="M12 7v5l3 3"/></svg>,
      onClick: () => { onResumeTask?.(task.id); onClose(); },
      color: "var(--th-accent)",
      hidden: !canResume,
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: t({ ko: "터미널 보기", en: "Terminal", ja: "ターミナル", zh: "终端" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
      onClick: () => { onOpenTerminal?.(task.id); onClose(); },
      hidden: !onOpenTerminal,
    },
    /* 회의록 — PM Activity 패널에서 확인 */
    {
      label: t({ ko: "Diff 보기", en: "View Diff", ja: "差分表示", zh: "查看差异" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18"/></svg>,
      onClick: () => { setShowDiff(true); onClose(); },
      hidden: task.status !== "review",
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: isHiddenTask
        ? t({ ko: "복원", en: "Restore", ja: "復元", zh: "恢复" })
        : t({ ko: "숨기기", en: "Hide", ja: "非表示", zh: "隐藏" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={isHiddenTask ? "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" : "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"}/>{!isHiddenTask && <line x1="1" y1="1" x2="23" y2="23"/>}</svg>,
      onClick: () => {
        if (isHiddenTask) onUnhideTask?.(task.id);
        else onHideTask?.(task.id);
        onClose();
      },
      hidden: !canHideTask,
    },
    {
      label: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
      onClick: () => { void handleDeleteTask(); onClose(); },
      danger: true,
      hidden: !canDelete,
    },
  ];

  // Remove hidden items, then strip leading/trailing/consecutive separators
  const visibleItems = items
    .filter((i) => !i.hidden)
    .reduce<MenuItem[]>((acc, item) => {
      if (item.separator) {
        // Skip if first item or previous visible item was also a separator
        if (acc.length === 0 || acc[acc.length - 1].separator) return acc;
        acc.push(item);
      } else {
        acc.push(item);
      }
      return acc;
    }, [])
    .filter((item, i, arr) => !(item.separator && i === arr.length - 1)); // strip trailing

  return (
    <div
      ref={ref}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        zIndex: 9999,
        minWidth: 200,
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        borderRadius: 16,
        boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 0 1px 0 rgba(0, 0, 0, 0.1)",
        padding: "6px",
        ...mono,
        fontSize: "12.5px",
        fontWeight: 600,
      }}
    >
      {visibleItems.map((item, i) => {
        if (item.separator) {
          return <div key={i} style={{ height: 1, background: "rgba(0, 0, 0, 0.04)", margin: "6px 8px" }} />;
        }
        return (
          <button
            key={i}
            type="button"
            onClick={item.onClick}
            className="w-full flex items-center gap-3 text-left transition-all duration-150 rounded-lg"
            style={{
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: item.danger ? "#EF4444" : item.color ?? "#4B5563",
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)"; 
              e.currentTarget.style.color = item.danger ? "#DC2626" : "#111827";
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.background = "transparent"; 
              e.currentTarget.style.color = item.danger ? "#EF4444" : item.color ?? "#4B5563";
            }}
          >
            <span style={{ 
              flexShrink: 0, 
              display: "flex", 
              alignItems: "center",
              opacity: 0.7
            }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
