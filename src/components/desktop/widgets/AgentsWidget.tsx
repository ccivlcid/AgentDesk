import { useAgentStore } from "../../../store/agentStore";
import { useUiStore } from "../../../store/uiStore";
import { useI18n } from "../../../i18n";
import type { AgentStatus } from "../../../types";

const mono = "var(--th-font-mono)";

const STATUS_COLOR: Record<AgentStatus, string> = {
  working: "var(--th-success, #22c55e)",
  idle:    "var(--th-text-muted, #64748b)",
  break:   "var(--th-accent, #f59e0b)",
  offline: "var(--th-text-disabled, #3f3f3f)",
};

export default function AgentsWidget() {
  const { agents } = useAgentStore();
  const { openWindow } = useUiStore();
  const { t } = useI18n();

  const STATUS_LABEL: Record<AgentStatus, string> = {
    working: t({ ko: "작업 중", en: "working", ja: "作業中",   zh: "工作中" }),
    idle:    t({ ko: "대기",   en: "idle",    ja: "待機",     zh: "空闲" }),
    break:   t({ ko: "휴식",   en: "break",   ja: "休憩",     zh: "休息" }),
    offline: t({ ko: "오프",   en: "off",     ja: "オフ",     zh: "离线" }),
  };

  const STATUS_SUMMARY_LABEL: Record<string, string> = {
    working: t({ ko: "작업 중", en: "working", ja: "作業中", zh: "工作中" }),
    idle:    t({ ko: "대기",   en: "idle",    ja: "待機",   zh: "空闲" }),
    offline: t({ ko: "오프",   en: "offline", ja: "オフ",   zh: "离线" }),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 상단 요약 */}
      <div style={{
        display: "flex",
        gap: 12,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        flexShrink: 0,
      }}>
        {(["working", "idle", "offline"] as AgentStatus[]).map((s) => {
          const count = agents.filter((a) => a.status === s).length;
          return (
            <span key={s} style={{ color: STATUS_COLOR[s] }}>
              {count} {STATUS_SUMMARY_LABEL[s] ?? s}
            </span>
          );
        })}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => openWindow("agent-manager")}
          style={{ background: "none", border: "none", color: "var(--th-accent)", fontSize: 10, fontFamily: mono, cursor: "pointer" }}
        >
          {t({ ko: "[설정]", en: "[config]", ja: "[設定]", zh: "[设置]" })}
        </button>
      </div>

      {/* 에이전트 목록 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {agents.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            {t({ ko: "에이전트 없음", en: "No agents", ja: "エージェントなし", zh: "无代理" })}
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--th-hover-overlay-subtle)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 16 }}>{agent.avatar_emoji || "🤖"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {agent.name_ko || agent.name}
                </div>
                {agent.current_task_id && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                    task: {agent.current_task_id.slice(0, 8)}…
                  </div>
                )}
              </div>
              <span style={{ fontFamily: mono, fontSize: 9, color: STATUS_COLOR[agent.status] }}>
                {STATUS_LABEL[agent.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
