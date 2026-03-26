import type { I18nContextValue } from "../../i18n";
import type { AgentDetailTabKey } from "./types";

interface AgentDetailModalTabBarProps {
  tab: AgentDetailTabKey;
  setTab: (k: AgentDetailTabKey) => void;
  t: I18nContextValue["t"];
  agentTasksLength: number;
}

export function AgentDetailModalTabBar({
  tab,
  setTab,
  t,
  agentTasksLength,
}: AgentDetailModalTabBarProps) {
  const items: { key: AgentDetailTabKey; label: string }[] = [
    { key: "info", label: t({ ko: "정보", en: "Info", ja: "情報", zh: "信息" }) },
    {
      key: "tasks",
      label: `${t({ ko: "업무", en: "Tasks", ja: "タスク", zh: "任务" })} (${agentTasksLength})`,
    },
    {
      key: "performance",
      label: t({ ko: "성과", en: "Performance", ja: "実績", zh: "绩効" }),
    },
    {
      key: "chat",
      label: t({ ko: "채팅", en: "Chat", ja: "チャット", zh: "聊天" }),
    },
    {
      key: "timeline",
      label: t({ ko: "타임라인", en: "Timeline", ja: "タイムライン", zh: "时间线" }),
    },
  ];

  return (
    <div className="flex" style={{ borderBottom: "1px solid #E5E7EB" }}>
      {items.map((tabItem) => (
        <button
          key={tabItem.key}
          type="button"
          onClick={() => setTab(tabItem.key)}
          className="flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
          style={{
            fontFamily: "var(--th-font-mono)",
            color: tab === tabItem.key ? "#3B82F6" : "#9CA3AF",
            borderBottom: `2px solid ${tab === tabItem.key ? "#3B82F6" : "transparent"}`,
            background: "transparent",
          }}
        >
          {tabItem.label}
        </button>
      ))}
    </div>
  );
}
