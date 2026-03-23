/**
 * 데스크톱 시스템 앱 아이콘 정의 및 기본 배치 계산.
 * Desktop.tsx에서 호출해 allIcons, DEFAULT_ICON_POSITIONS를 사용한다.
 */

import {
  IconAgents,
  IconRepl,
  IconDecisions,
  IconReports,
  IconImageStudio,
  IconHeartbeat,
  IconAlerts,
  IconCliCost,
  IconFileTree,
  IconLocalLlm,
  IconDashboard,
} from "./DesktopIcons";
import type { DesktopIconDef } from "./DesktopIcon";
import type { I18nContextValue } from "../../i18n";
import type { WindowType } from "../../app/types";
import type { SettingsTab } from "../settings/types";
import { ICON_GRID_X, ICON_GRID_Y, GRID_ORIGIN_X, GRID_ORIGIN_Y, getIconsPerColumn } from "./snapToFreeCell";

export interface UseDesktopIconsParams {
  t: I18nContextValue["t"];
  openWindow: (w: WindowType) => void;
  openSettings: (tab?: SettingsTab) => void;
  openCli: () => void;
  clearUnreadReportCount: () => void;
  toggleWindow: (w: WindowType) => void;
  unreadReportCount: number;
  onOpenDecisionInbox: () => void;
  decisionInboxItems: unknown[];
}

export function useDesktopIcons(params: UseDesktopIconsParams) {
  const {
    t,
    openWindow,
    openSettings,
    openCli,
    clearUnreadReportCount,
    toggleWindow,
    unreadReportCount,
    onOpenDecisionInbox,
    decisionInboxItems,
  } = params;

  const icons: DesktopIconDef[] = [
    { id: "agent-manager", icon: (c) => <IconAgents color={c} />, label: t({ ko: "에이전트 설정", en: "Agents", ja: "エージェント設定", zh: "代理设置" }), onClick: () => openWindow("agent-manager"), accentColor: "#5e5ce6" },
    { id: "cli", icon: (c) => <IconRepl color={c} />, label: t({ ko: "에이전트 CLI", en: "Agent CLI", ja: "エージェントCLI", zh: "代理CLI" }), onClick: openCli, accentColor: "#32ade6" },
    { id: "image-studio", icon: (c) => <IconImageStudio color={c} />, label: t({ ko: "이미지 스튜디오", en: "Image Studio", ja: "イメージスタジオ", zh: "图像工作室" }), onClick: () => openWindow("image-studio"), accentColor: "#ec4899" },
    { id: "decision-inbox", icon: (c) => <IconDecisions color={c} />, label: t({ ko: "의사결정", en: "Decisions", ja: "意思決定", zh: "决策" }), onClick: onOpenDecisionInbox, accentColor: "#ff453a", badge: decisionInboxItems.length || undefined },
    { id: "report-history", icon: (c) => <IconReports color={c} />, label: t({ ko: "보고서", en: "Reports", ja: "レポート", zh: "报告" }), onClick: () => { clearUnreadReportCount(); toggleWindow("reports"); }, accentColor: "#64d2ff", badge: unreadReportCount || undefined },
{ id: "synapse-app", icon: (c) => <IconHeartbeat color={c} />, label: t({ ko: "시냅스", en: "Synapse", ja: "シナプス", zh: "知识库" }), onClick: () => openWindow("synapse"), accentColor: "#bf5af2" },
    { id: "file-tree-app", icon: (c) => <IconFileTree color={c} />, label: t({ ko: "파일 탐색기", en: "File Explorer", ja: "ファイルエクスプローラー", zh: "文件管理" }), onClick: () => openWindow("file-tree"), accentColor: "#f59e0b" },
    { id: "alerts-app", icon: (c) => <IconAlerts color={c} />, label: t({ ko: "알림", en: "Alerts", ja: "アラート", zh: "警报" }), onClick: () => openWindow("alerts"), accentColor: "#ff453a" },
    { id: "cli-cost-app", icon: (c) => <IconCliCost color={c} />, label: t({ ko: "CLI 비용", en: "CLI Cost", ja: "CLIコスト", zh: "CLI成本" }), onClick: () => openWindow("cli-usage"), accentColor: "#32ade6" },
    { id: "local-llm-app", icon: (c) => <IconLocalLlm color={c} />, label: t({ ko: "로컬 LLM", en: "Local LLM", ja: "ローカルLLM", zh: "本地LLM" }), onClick: () => openWindow("local-llm"), accentColor: "#bf5af2" },
  ];

  const allIcons = [...icons];

  // Arrange icons top-to-bottom, then left-to-right (macOS desktop style)
  const perCol = getIconsPerColumn();

  const DEFAULT_ICON_POSITIONS: Record<string, { x: number; y: number }> = {};
  icons.forEach((def, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    DEFAULT_ICON_POSITIONS[def.id] = { x: GRID_ORIGIN_X + col * ICON_GRID_X, y: GRID_ORIGIN_Y + row * ICON_GRID_Y };
  });

  return { icons, allIcons, DEFAULT_ICON_POSITIONS };
}
