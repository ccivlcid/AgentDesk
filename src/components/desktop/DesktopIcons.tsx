/**
 * Desktop icon SVG components — stroke-based, Lucide-style (28×28 viewBox).
 * Each component accepts an explicit `color` prop for reliable light/dark mode.
 */

interface IconProps { color: string }
const S = 1.6; // strokeWidth

export function IconAgents({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      {/* 뒤쪽 에이전트 (보조) */}
      <circle cx="20.5" cy="10" r="3.5" strokeOpacity={0.4} />
      <path d="M14 23c.5-3.8 3.4-6.5 6.5-7" strokeOpacity={0.4} />
      {/* 앞쪽 에이전트 (주) */}
      <circle cx="11" cy="9" r="4" />
      <path d="M3 23c0-4.42 3.58-8 8-8s8 3.58 8 8" />
    </svg>
  );
}

export function IconNewProject({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h4.086a2 2 0 0 1 1.414.586L13.414 8H21.5A2.5 2.5 0 0 1 24 10.5v10A2.5 2.5 0 0 1 21.5 23h-15A2.5 2.5 0 0 1 4 20.5z" />
      <line x1="14" y1="13" x2="14" y2="19" />
      <line x1="11" y1="16" x2="17" y2="16" />
    </svg>
  );
}

export function IconRunTask({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <circle cx="14" cy="14" r="10" />
      <polygon points="11,10 20,14 11,18" fill={color} stroke="none" />
    </svg>
  );
}

export function IconWorkflow({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="3" y="11" width="7" height="6" rx="1.5" />
      <rect x="18" y="5" width="7" height="6" rx="1.5" />
      <rect x="18" y="17" width="7" height="6" rx="1.5" />
      <path d="M10 14h4M14 14V8h4M14 14v6h4" />
    </svg>
  );
}

export function IconRepl({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="3" y="5" width="22" height="18" rx="3" />
      <path d="M8 11l4 3-4 3" />
      <line x1="14" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function IconDecisions({ color }: IconProps) {
  // 플로우차트 결정 다이아몬드: 의사결정 지점 표현
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      {/* 다이아몬드 (결정 기호) */}
      <path d="M14 4L25 14L14 24L3 14Z" />
      {/* 내부 체크 (승인 대기) */}
      <path d="M10.5 14l2.5 2.5 4.5-4.5" />
    </svg>
  );
}

export function IconReports({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <line x1="4" y1="23" x2="24" y2="23" stroke={color} />
      <rect x="5" y="15" width="5" height="8" rx="1" fill={color} stroke="none" opacity={0.45} />
      <rect x="11.5" y="9" width="5" height="14" rx="1" fill={color} stroke="none" opacity={0.7} />
      <rect x="18" y="4" width="5" height="19" rx="1" fill={color} stroke="none" />
    </svg>
  );
}

export function IconFolder({ color, open = false }: IconProps & { open?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      {open ? (
        <>
          <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h4.086a2 2 0 0 1 1.414.586L13.414 9H21.5A2.5 2.5 0 0 1 24 11.5v.5H4V9.5z" fill={color} fillOpacity={0.15} />
          <path d="M4 12h20l-2.5 9.5a2 2 0 0 1-1.936 1.5H8.436A2 2 0 0 1 6.5 21.5z" />
        </>
      ) : (
        <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h4.086a2 2 0 0 1 1.414.586L13.414 9H21.5A2.5 2.5 0 0 1 24 11.5v9A2.5 2.5 0 0 1 21.5 23h-15A2.5 2.5 0 0 1 4 20.5z" />
      )}
    </svg>
  );
}

// ── Widget icons ─────────────────────────────────────────────────────────────

export function IconHeartbeat({ color }: IconProps) {
  // Synapse: 두 지식소스(Notion·Obsidian)가 중앙 노드로 수렴하는 모양
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      {/* 왼쪽 지식소스 박스 */}
      <rect x="2" y="4" width="9" height="7" rx="1.5" />
      {/* 오른쪽 지식소스 박스 */}
      <rect x="17" y="4" width="9" height="7" rx="1.5" />
      {/* 중앙 시냅스 노드로 수렴 */}
      <path d="M6.5 11L14 20" />
      <path d="M21.5 11L14 20" />
      {/* 중앙 노드 */}
      <circle cx="14" cy="23" r="2.5" fill={color} fillOpacity={0.35} />
    </svg>
  );
}

export function IconTaskBoard({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="4" y="5" width="20" height="18" rx="2.5" />
      <line x1="4" y1="10" x2="24" y2="10" />
      <path d="M9 14.5l2 2 4-4" />
      <line x1="17" y1="14.5" x2="20" y2="14.5" />
      <line x1="9" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function IconAlerts({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M14 4a7 7 0 0 1 7 7v5l2 2H5l2-2v-5a7 7 0 0 1 7-7z" />
      <path d="M11.5 21a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function IconCliCost({ color }: IconProps) {
  // CLI 비용: 터미널 프레임 안에 $ 달러 기호로 비용 표현
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="3" y="5" width="22" height="18" rx="3" />
      {/* 수직선 (달러 기호 기둥) */}
      <line x1="14" y1="9" x2="14" y2="19" />
      {/* $ 물결 (위→아래 S자 곡선) */}
      <path d="M11 11.5c0-.9.7-1.5 3-1.5s3 .6 3 1.5c0 .8-.7 1.2-3 1.5s-3 .9-3 1.5c0 .9.7 1.5 3 1.5s3-.6 3-1.5" />
    </svg>
  );
}

export function IconFlowGraph({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <circle cx="14" cy="14" r="3" />
      <circle cx="5" cy="7" r="2.5" />
      <circle cx="23" cy="7" r="2.5" />
      <circle cx="5" cy="21" r="2.5" />
      <circle cx="23" cy="21" r="2.5" />
      <line x1="7" y1="8.5" x2="11.8" y2="12.2" />
      <line x1="21" y1="8.5" x2="16.2" y2="12.2" />
      <line x1="7" y1="19.5" x2="11.8" y2="15.8" />
      <line x1="21" y1="19.5" x2="16.2" y2="15.8" />
    </svg>
  );
}

export function IconFileTree({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M5 6h6M5 6v16M5 14h8M5 22h6" />
      <rect x="11" y="4" width="10" height="5" rx="1.5" />
      <rect x="13" y="11.5" width="10" height="5" rx="1.5" />
      <rect x="11" y="19" width="10" height="5" rx="1.5" />
    </svg>
  );
}

export function IconLocalLlm({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="4" y="7" width="20" height="14" rx="3" />
      <rect x="8" y="11" width="4" height="4" rx="1" />
      <rect x="16" y="11" width="4" height="4" rx="1" />
      <line x1="2" y1="11" x2="4" y2="11" />
      <line x1="2" y1="17" x2="4" y2="17" />
      <line x1="24" y1="11" x2="26" y2="11" />
      <line x1="24" y1="17" x2="26" y2="17" />
      <line x1="10" y1="21" x2="10" y2="24" />
      <line x1="18" y1="21" x2="18" y2="24" />
      <line x1="7" y1="24" x2="21" y2="24" />
    </svg>
  );
}

export function IconMarkdownDoc({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M6 3h11l5 5v17a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M17 3v5h5" />
      <line x1="9" y1="13" x2="19" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
      <path d="M9 21h3l2-3 2 3h1" strokeWidth={1.4} />
    </svg>
  );
}

// ── Dock icons ────────────────────────────────────────────────────────────────

export function IconDockTasks({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="4" y="5" width="20" height="18" rx="2.5" />
      <line x1="4" y1="10" x2="24" y2="10" />
      <path d="M9 14.5l2 2 4-4" />
      <line x1="17" y1="14.5" x2="20" y2="14.5" />
      <line x1="9" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function IconDockWorkflow({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M14 4v6M14 4l-3 3M14 4l3 3" />
      <path d="M14 10c0 4-5 5-5 9h10c0-4-5-5-5-9z" />
      <line x1="10" y1="22" x2="18" y2="22" />
    </svg>
  );
}

export function IconDockLibrary({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="4" y="5" width="4" height="18" rx="1" />
      <rect x="10" y="5" width="4" height="18" rx="1" />
      <path d="M17 5.5l4 17" strokeLinecap="round" />
    </svg>
  );
}

export function IconDockSettings({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <circle cx="14" cy="14" r="3" />
      <path d="M14 4v3M14 21v3M4 14h3M21 14h3M6.4 6.4l2.1 2.1M19.5 19.5l2.1 2.1M6.4 21.6l2.1-2.1M19.5 8.5l2.1-2.1" />
    </svg>
  );
}

export function IconDockChat({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M4 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-4 4V6z" />
      <line x1="9" y1="11" x2="19" y2="11" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

export function IconDockSynapse({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
      <rect x="4" y="6" width="8" height="6" rx="1.5" />
      <rect x="16" y="16" width="8" height="6" rx="1.5" />
      <path d="M8 12v4h12v-4" />
      <line x1="14" y1="9" x2="20" y2="9" strokeDasharray="2 2" />
      <line x1="8" y1="19" x2="14" y2="19" strokeDasharray="2 2" />
    </svg>
  );
}

// ── Project category icons ────────────────────────────────────────────────────

/** cat_software_dev — 코드 brackets */
export function IconProjectSoftware({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <polyline points="9,8 4,14 9,20" />
      <polyline points="19,8 24,14 19,20" />
      <line x1="16" y1="7" x2="12" y2="21" />
    </svg>
  );
}

/** cat_marketing — 메가폰 */
export function IconProjectMarketing({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M5 11v6h4l7 5V6L9 11z" />
      <path d="M21 11c1.1.9 1.8 2.3 1.8 3.7 0 1.4-.7 2.8-1.8 3.7" />
      <line x1="9" y1="17" x2="9" y2="22" />
    </svg>
  );
}

/** cat_research — 돋보기 */
export function IconProjectResearch({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <circle cx="12" cy="12" r="7" />
      <line x1="17.5" y1="17.5" x2="24" y2="24" />
    </svg>
  );
}

/** cat_product_launch — 로켓 */
export function IconProjectProduct({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M14 4c0 0 5 2 5 9l-5 2-5-2c0-7 5-9 5-9z" />
      <path d="M9 13l-3 5h16l-3-5" />
      <line x1="14" y1="18" x2="14" y2="24" />
    </svg>
  );
}

/** cat_content — 문서 + 펜 */
export function IconProjectContent({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M6 4h11l5 5v15H6z" />
      <polyline points="17,4 17,9 22,9" />
      <line x1="10" y1="14" x2="18" y2="14" />
      <line x1="10" y1="18" x2="15" y2="18" />
    </svg>
  );
}

/** cat_operations — 기어 */
export function IconProjectOperations({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <circle cx="14" cy="14" r="3.5" />
      <path d="M14 4v3M14 21v3M4 14h3M21 14h3M7.05 7.05l2.12 2.12M18.83 18.83l2.12 2.12M7.05 20.95l2.12-2.12M18.83 9.17l2.12-2.12" />
    </svg>
  );
}

/** cat_design — 펜 툴 */
export function IconProjectDesign({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <path d="M4 24l4-4 10-10-4-4L4 16z" />
      <path d="M14 6l4-2 6 6-2 4" />
      <circle cx="8" cy="20" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}

export function IconImageStudio({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      <rect x="3" y="5" width="22" height="18" rx="2.5" />
      <circle cx="9.5" cy="11" r="2" />
      <polyline points="3,22 10,15 14,19 18,14 25,22" />
    </svg>
  );
}

export function IconAgentGraph({ color }: IconProps) {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
      {/* 엣지 */}
      <line x1="14" y1="5" x2="6" y2="14" />
      <line x1="14" y1="5" x2="22" y2="14" />
      <line x1="6" y1="14" x2="14" y2="23" />
      <line x1="22" y1="14" x2="14" y2="23" />
      <line x1="6" y1="14" x2="22" y2="14" />
      {/* 노드 */}
      <circle cx="14" cy="5" r="2.5" fill={color} stroke="none" />
      <circle cx="6" cy="14" r="2.5" fill={color} stroke="none" />
      <circle cx="22" cy="14" r="2.5" fill={color} stroke="none" />
      <circle cx="14" cy="23" r="2.5" fill={color} stroke="none" />
    </svg>
  );
}

