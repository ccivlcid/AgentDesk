import AgentAvatar from "../../AgentAvatar";
import { CHANNEL_META, isWorkflowPackKey } from "./constants";
import { defaultWorkflowPackLabel } from "./state";
import type { GatewaySettingsTabState } from "./useGatewaySettingsTab";

interface ChatSessionsSectionProps {
  state: GatewaySettingsTabState;
}

export function ChatSessionsSection({ state }: ChatSessionsSectionProps) {
  const {
    t,
    chatRows,
    agentById,
    setGuideOpen,
    openCreateModal,
    openEditModal,
    removeChat,
  } = state;

  return (
    <div className="p-3 space-y-3" style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "채팅 세션", en: "Chat Sessions", ja: "チャットセッション", zh: "聊天会话" })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex items-center justify-center w-7 h-7 transition-colors"
            style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)" }}
            title={t({ ko: "설정 가이드", en: "Setup Guide", ja: "設定ガイド", zh: "设置指南" })}
            aria-label={t({ ko: "설정 가이드", en: "Setup Guide", ja: "設定ガイド", zh: "设置指南" })}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          <button
            onClick={openCreateModal}
            className="text-xs px-3 py-1 font-mono transition-colors"
            style={{ borderRadius: 0, background: "var(--th-accent)", color: "var(--th-accent-text)" }}
          >
            + {t({ ko: "새 채팅 추가", en: "Add Chat", ja: "チャット追加", zh: "新增聊天" })}
          </button>
        </div>
      </div>

      {chatRows.length === 0 ? (
        <div className="text-xs font-mono py-2" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "등록된 채팅이 없습니다. '새 채팅 추가'로 메신저/토큰/채널을 등록하세요.",
            en: "No chats yet. Use 'Add Chat' to register messenger/token/channel.",
            ja: "チャットがありません。'チャット追加'でメッセンジャー/トークン/チャネルを登録してください。",
            zh: "暂无聊天。请通过“新增聊天”注册消息渠道/令牌/频道。",
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {chatRows.map((row) => {
            const meta = CHANNEL_META[row.channel];
            const assignedAgent = row.session.agentId ? agentById.get(row.session.agentId) : undefined;
            const assignedAgentName = assignedAgent ? (assignedAgent.name_ko || assignedAgent.name) : row.session.agentId || "";
            const workflowPackKey = isWorkflowPackKey(row.session.workflowPackKey) ? row.session.workflowPackKey : "development";
            const workflowPackLabel = defaultWorkflowPackLabel(t, workflowPackKey);
            const tokenReady = row.token.trim().length > 0;
            return (
              <div key={row.key} className="px-3 py-2" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{row.session.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 font-mono uppercase" style={{ borderRadius: 0, background: "var(--th-bg-surface-hover)", color: "var(--th-text-secondary)" }}>
                        {meta.label}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 font-mono"
                        style={{ borderRadius: 0, background: meta.transportReady ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: meta.transportReady ? "#34d399" : "#fbbf24" }}
                      >
                        {meta.transportReady
                          ? t({ ko: "직접연동", en: "Native", ja: "直接連携", zh: "直连" })
                          : t({ ko: "호환설정", en: "Compat", ja: "互換設定", zh: "兼容配置" })}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 font-mono text-indigo-300" style={{ borderRadius: 0, background: "rgba(99,102,241,0.15)" }}>
                        {workflowPackLabel}
                      </span>
                      {!tokenReady && (
                        <span className="text-[10px] px-1.5 py-0.5 font-mono text-red-300" style={{ borderRadius: 0, background: "rgba(239,68,68,0.15)" }}>
                          {t({ ko: "토큰 없음", en: "No token", ja: "トークンなし", zh: "无令牌" })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-mono break-all" style={{ color: "var(--th-text-muted)" }}>{row.session.targetId}</div>
                    <div className="mt-1 text-[11px] font-mono flex items-center gap-1.5" style={{ color: "var(--th-text-muted)" }}>
                      {assignedAgentName ? (
                        <>
                          <span>{t({ ko: "대화 Agent", en: "Agent", ja: "担当Agent", zh: "对话 Agent" })}:</span>
                          {assignedAgent && <AgentAvatar agent={assignedAgent} size={14} rounded="xl" />}
                          <span className="truncate">{assignedAgentName}</span>
                        </>
                      ) : (
                        <span>{t({ ko: "대화 Agent 미지정", en: "No agent assigned", ja: "Agent未指定", zh: "未指定 Agent" })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(row)}
                      className="px-2 py-1 text-[11px] font-mono transition-colors"
                      style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                    >
                      {t({ ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })}
                    </button>
                    <button
                      onClick={() => removeChat(row)}
                      className="px-2 py-1 text-[11px] font-mono text-red-300 transition-colors"
                      style={{ borderRadius: 0, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
        {t({
          ko: "$ 전사 공지, ! 업무(태스크), 일반 메시지는 선택된 Agent 1:1 대화.",
          en: "$ company directive, ! work (task), normal messages go 1:1 to the selected agent.",
          ja: "$ 全社通知、! 業務（タスク）、通常は選択 Agent に 1:1。",
          zh: "$ 全员公告，! 工作（任务），普通消息为所选 Agent 1:1 对话。",
        })}
      </div>
    </div>
  );
}
