import { useI18n } from "../../i18n";
import type { Agent, Department } from "../../types";

const mono = "var(--th-font-mono)";

const STATUS_COLOR: Record<string, string> = {
  working: "#30d158",
  idle:    "rgba(255,255,255,0.3)",
  break:   "#f59e0b",
  offline: "rgba(255,255,255,0.15)",
};

const ROLE_LABEL: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  team_leader: { ko: "팀장",   en: "Lead",   ja: "リーダー", zh: "组长" },
  senior:      { ko: "시니어", en: "Senior",  ja: "シニア",   zh: "高级" },
  junior:      { ko: "주니어", en: "Junior",  ja: "ジュニア", zh: "初级" },
  intern:      { ko: "인턴",   en: "Intern",  ja: "インターン",zh: "实习" },
};

interface Props {
  agent: Agent;
  department: Department | null;
  isLight: boolean;
}

export default function AgentDetailHeader({ agent, department, isLight }: Props) {
  const { t } = useI18n();

  const statusLabel: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
    working: { ko: "작업 중", en: "WORKING", ja: "作業中",    zh: "工作中" },
    idle:    { ko: "대기",   en: "IDLE",    ja: "待機",      zh: "空闲" },
    break:   { ko: "휴식",   en: "BREAK",   ja: "休憩",      zh: "休息" },
    offline: { ko: "오프",   en: "OFFLINE", ja: "オフライン", zh: "离线" },
  };

  const statusColor = STATUS_COLOR[agent.status] ?? (isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)");
  const roleEntry = ROLE_LABEL[agent.role];
  const isWorking = agent.status === "working";

  const avatarBg     = isLight ? "rgba(0,0,0,0.04)"   : "rgba(255,255,255,0.06)";
  const avatarBorder = isLight ? "rgba(0,0,0,0.08)"   : "rgba(255,255,255,0.08)";
  const dotBorder    = isLight ? "rgba(248,248,250,1)" : "rgba(16,18,26,0.92)";
  const nameColor    = isLight ? "rgba(0,0,0,0.88)"   : "rgba(255,255,255,0.92)";
  const roleBg       = isLight ? "rgba(0,0,0,0.05)"   : "rgba(255,255,255,0.07)";
  const roleBorder   = isLight ? "rgba(0,0,0,0.08)"   : "rgba(255,255,255,0.09)";
  const roleColor    = isLight ? "rgba(0,0,0,0.45)"   : "rgba(255,255,255,0.45)";
  const metaColor    = isLight ? "rgba(0,0,0,0.3)"    : "rgba(255,255,255,0.25)";

  return (
    <div style={{ padding: "18px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* 아바타 */}
        <div style={{
          position: "relative",
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: 14,
          background: avatarBg,
          border: `1px solid ${avatarBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
        }}>
          {agent.avatar_emoji || "🤖"}
          {/* 상태 dot */}
          <span style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: statusColor,
            border: `2px solid ${dotBorder}`,
            ...(isWorking ? { boxShadow: `0 0 6px ${statusColor}` } : {}),
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          {/* 이름 */}
          <div style={{
            fontFamily: mono,
            fontSize: 15,
            fontWeight: 700,
            color: nameColor,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}>
            {agent.name_ko || agent.name}
          </div>

          {/* 역할 + 상태 뱃지 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            {roleEntry && (
              <span style={{
                fontFamily: mono,
                fontSize: 10,
                color: roleColor,
                background: roleBg,
                border: `1px solid ${roleBorder}`,
                padding: "2px 7px",
                borderRadius: 4,
                letterSpacing: "0.04em",
              }}>
                {t(roleEntry)}
              </span>
            )}
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: mono,
              fontSize: 10,
              color: statusColor,
              letterSpacing: "0.06em",
            }}>
              <span style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
                ...(isWorking ? { boxShadow: `0 0 4px ${statusColor}` } : {}),
              }} />
              {t(statusLabel[agent.status] ?? { ko: agent.status, en: agent.status, ja: agent.status, zh: agent.status })}
            </span>
          </div>

          {/* 모델 + 부서 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
            fontFamily: mono,
            fontSize: 10,
            color: metaColor,
          }}>
            {(agent.api_model || agent.cli_model || agent.cli_provider) && (
              <span>{agent.api_model || agent.cli_model || agent.cli_provider}</span>
            )}
            {department && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{department.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
