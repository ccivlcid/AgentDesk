/**
 * 데스크톱 시스템/커스텀 앱 아이콘 정의 및 기본 배치 계산.
 * Desktop.tsx에서 호출해 allIcons, DEFAULT_ICON_POSITIONS를 사용한다.
 */

import type React from "react";
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
import type { CustomFeature } from "../../types";
import type { I18nContextValue } from "../../i18n";
import type { WindowType } from "../../app/types";
import { ICON_GRID_X, ICON_GRID_Y, GRID_ORIGIN_X, GRID_ORIGIN_Y, getIconsPerColumn } from "./snapToFreeCell";

function getCustomFeatureIcon(templateId: string | null | undefined, color: string): React.ReactNode {
  const S = 1.5;
  const base = {
    fill: "none",
    stroke: color,
    strokeWidth: S,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (templateId) {
    case "agent-dept-status":
      return (
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="8" width="14" height="9" rx="1.5" {...base} />
          <rect x="7" y="3" width="6" height="5" rx="1" {...base} />
          <line x1="7" y1="12" x2="7" y2="14" {...base} />
          <line x1="10" y1="12" x2="10" y2="14" {...base} />
          <line x1="13" y1="12" x2="13" y2="14" {...base} />
        </svg>
      );
    case "agent-single-monitor":
      return (
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="9" r="5" {...base} />
          <circle cx="10" cy="9" r="2" fill={color} stroke="none" opacity={0.5} />
          <line x1="14" y1="13" x2="17" y2="16" {...base} />
        </svg>
      );
    case "task-daily-counter":
      return (
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="2.5" {...base} />
          <path d="M7 10L9.2 12.5L13 7.5" {...base} />
        </svg>
      );
    case "task-assignee-progress":
      return (
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="13" width="3" height="4" rx="1" fill={color} stroke="none" opacity={0.4} />
          <rect x="8.5" y="9" width="3" height="8" rx="1" fill={color} stroke="none" opacity={0.7} />
          <rect x="14" y="5" width="3" height="12" rx="1" fill={color} stroke="none" />
        </svg>
      );
    case "notification-filter-feed":
      return (
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <path d="M10 3C7.24 3 5 5.24 5 8v4l-1.5 2h13L15 12V8c0-2.76-2.24-5-5-5z" {...base} />
          <path d="M8.5 15.5a1.5 1.5 0 003 0" {...base} />
        </svg>
      );
    case "cli-cost-summary":
      return (
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" {...base} />
          <path d="M10 6v1.5M10 12.5V14M7.5 8.5C7.5 7.67 8.17 7 9 7h2a1.5 1.5 0 010 3H9a1.5 1.5 0 000 3h2a1.5 1.5 0 010 3H9c-.83 0-1.5-.67-1.5-1.5" {...base} />
        </svg>
      );
    case "memo-board":
      return (
        <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="3" width="12" height="14" rx="2" {...base} />
          <line x1="7" y1="7.5" x2="13" y2="7.5" {...base} />
          <line x1="7" y1="10" x2="13" y2="10" {...base} />
          <line x1="7" y1="12.5" x2="10.5" y2="12.5" {...base} />
        </svg>
      );
    default:
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            stroke={color}
            strokeWidth="1.4"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
  }
}

export interface UseDesktopIconsParams {
  t: I18nContextValue["t"];
  openWindow: (w: WindowType) => void;
  openCli: () => void;
  clearUnreadReportCount: () => void;
  toggleWindow: (w: WindowType) => void;
  unreadReportCount: number;
  onOpenDecisionInbox: () => void;
  decisionInboxItems: unknown[];
  customFeatures: CustomFeature[];
  openCustomApp: (id: string) => void;
  setCfCtxMenu: (v: { x: number; y: number; featureId: string; featureName: string } | null) => void;
  closeCustomApp: (id: string) => void;
  addFeatureToTrash: (v: { id: string; name: string; icon_svg: string | null }) => void;
  setCustomFeatures: (v: CustomFeature[] | ((prev: CustomFeature[]) => CustomFeature[])) => void;
}

export function useDesktopIcons(params: UseDesktopIconsParams) {
  const {
    t,
    openWindow,
    openCli,
    clearUnreadReportCount,
    toggleWindow,
    unreadReportCount,
    onOpenDecisionInbox,
    decisionInboxItems,
    customFeatures,
    openCustomApp,
    setCfCtxMenu,
    closeCustomApp,
    addFeatureToTrash,
    setCustomFeatures,
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

  const customFeatureIcons: DesktopIconDef[] = customFeatures.map((f) => ({
    id: `cf-${f.id}`,
    icon: (c: string) => (
      <div style={{ position: "relative", width: 26, height: 26 }}>
        {f.icon_svg ? (
          <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: c }} dangerouslySetInnerHTML={{ __html: f.icon_svg }} />
        ) : (
          getCustomFeatureIcon(f.template_id, c)
        )}
        {f.status === "pending_install" && (
          <div
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#f59e0b",
              border: "1.5px solid #0f1117",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 6, color: "#000", fontWeight: 900, lineHeight: 1 }}>↓</span>
          </div>
        )}
      </div>
    ),
    label: f.name,
    onClick: () => openCustomApp(f.id),
    accentColor: "#f59e0b",
    deletable: true,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setCfCtxMenu({ x: e.clientX, y: e.clientY, featureId: f.id, featureName: f.name });
    },
    onDelete: () => {
      closeCustomApp(f.id);
      addFeatureToTrash({ id: f.id, name: f.name, icon_svg: f.icon_svg ?? null });
      setCustomFeatures((prev) => prev.filter((cf) => cf.id !== f.id));
    },
  }));

  const allIcons = [...icons, ...customFeatureIcons];

  // Arrange icons top-to-bottom, then left-to-right (macOS desktop style)
  const perCol = getIconsPerColumn();

  const DEFAULT_ICON_POSITIONS: Record<string, { x: number; y: number }> = {};
  icons.forEach((def, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    DEFAULT_ICON_POSITIONS[def.id] = { x: GRID_ORIGIN_X + col * ICON_GRID_X, y: GRID_ORIGIN_Y + row * ICON_GRID_Y };
  });
  // Custom feature icons continue after system icons in the same column-first flow
  const cfOffset = icons.length;
  customFeatureIcons.forEach((def, i) => {
    const gi = cfOffset + i;
    const col = Math.floor(gi / perCol);
    const row = gi % perCol;
    DEFAULT_ICON_POSITIONS[def.id] = { x: GRID_ORIGIN_X + col * ICON_GRID_X, y: GRID_ORIGIN_Y + row * ICON_GRID_Y };
  });

  return { icons, customFeatureIcons, allIcons, DEFAULT_ICON_POSITIONS };
}
