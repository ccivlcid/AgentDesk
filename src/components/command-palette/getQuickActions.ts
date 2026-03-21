import type { I18nContextValue } from "../../i18n";
import type { QuickActionRow } from "./types";

export function getQuickActions(t: I18nContextValue["t"]): QuickActionRow[] {
  return [
    { label: t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "仪表板" }), icon: "▦", bg: "#636366", action: "dashboard" },
    { label: t({ ko: "태스크 보드", en: "Task Board", ja: "タスクボード", zh: "任务板" }), icon: "≡", bg: "#30d158", action: "tasks-board" },
    { label: t({ ko: "에이전트 관리", en: "Agents", ja: "エージェント", zh: "代理管理" }), icon: "◎", bg: "#ff9f0a", action: "agents" },
    { label: t({ ko: "스킬 라이브러리", en: "Skills", ja: "スキル", zh: "技能库" }), icon: "⬡", bg: "#bf5af2", action: "skills" },
    { label: t({ ko: "메모리", en: "Memory", ja: "メモリー", zh: "记忆" }), icon: "◈", bg: "#ff375f", action: "memory" },
    { label: t({ ko: "에이전트 룰", en: "Agent Rules", ja: "エージェントルール", zh: "代理规则" }), icon: "⊞", bg: "#ffd60a", action: "agent-rules" },
    { label: t({ ko: "훅", en: "Hooks", ja: "フック", zh: "钩子" }), icon: "⤷", bg: "#32ade6", action: "hooks" },
    { label: t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" }), icon: "⚙", bg: "#636366", action: "settings" },
  ];
}
