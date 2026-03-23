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
    <div className="p-4 space-y-4" style={{ borderRadius: 20, border: "1px solid rgba(59, 130, 246, 0.1)", background: "#F0F7FF" }}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-black font-mono uppercase tracking-widest" style={{ color: "#4B5563" }}>
          {t({ ko: "채팅 세션 리스트", en: "Active Chat Sessions", ja: "チャットセッション", zh: "活动聊天会话" })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex items-center justify-center w-8 h-8 transition-all hover:bg-white hover:shadow-sm"
            style={{ borderRadius: 10, border: "1px solid #E5E7EB", color: "#6B7280", background: "rgba(255,255,255,0.5)" }}
            title={t({ ko: "설정 가이드", en: "Setup Guide", ja: "設定ガイド", zh: "设置指南" })}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          <button
            onClick={openCreateModal}
            className="text-[11px] px-4 py-1.5 font-bold font-mono transition-all hover:brightness-110 active:scale-95"
            style={{ borderRadius: 12, background: "#3B82F6", color: "#FFFFFF", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)" }}
          >
            + {t({ ko: "새 채팅 추가", en: "Add Chat", ja: "チャット追加", zh: "新增聊天" })}
          </button>
        </div>
      </div>

      {chatRows.length === 0 ? (
        <div className="text-xs font-mono py-6 text-center opacity-50" style={{ color: "#6B7280" }}>
          — {t({
            ko: "등록된 채팅 세션이 없습니다.",
            en: "No active chat sessions.",
            ja: "등록된 채트 세션이 없습니다.",
            zh: "暂无活动聊天会话。",
          })} —
        </div>
      ) : (
        <div className="space-y-3">
          {chatRows.map((row) => {
            const meta = CHANNEL_META[row.channel];
            const assignedAgent = row.session.agentId ? agentById.get(row.session.agentId) : undefined;
            const assignedAgentName = assignedAgent ? (assignedAgent.name_ko || assignedAgent.name) : row.session.agentId || "";
            const workflowPackKey = isWorkflowPackKey(row.session.workflowPackKey) ? row.session.workflowPackKey : "development";
            const workflowPackLabel = defaultWorkflowPackLabel(t, workflowPackKey);
            const tokenReady = row.token.trim().length > 0;
            return (
              <div key={row.key} className="px-4 py-3.5 transition-all hover:bg-white hover:shadow-sm" style={{ borderRadius: 16, border: "1px solid #E5E7EB", background: "#FFFFFF" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-bold" style={{ color: "#111827" }}>{row.session.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 font-black uppercase tracking-tighter" style={{ borderRadius: 6, background: "#F3F4F6", color: "#6B7280" }}>
                        {meta.label}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 font-black uppercase tracking-tighter"
                        style={{ borderRadius: 6, background: meta.transportReady ? "#ECFDF5" : "#FFFBEB", color: meta.transportReady ? "#059669" : "#D97706" }}
                      >
                        {meta.transportReady
                          ? t({ ko: "NATIVE", en: "Native", ja: "直接連携", zh: "直连" })
                          : t({ ko: "COMPAT", en: "Compat", ja: "互換設定", zh: "兼容" })}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 font-black uppercase tracking-tighter text-indigo-600" style={{ borderRadius: 6, background: "#EEF2FF" }}>
                        {workflowPackLabel}
                      </span>
                      {!tokenReady && (
                        <span className="text-[9px] px-1.5 py-0.5 font-black uppercase tracking-tighter text-red-600" style={{ borderRadius: 6, background: "#FEF2F2" }}>
                          {t({ ko: "NO TOKEN", en: "No token", ja: "토큰 없음", zh: "无令牌" })}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono opacity-60 mb-2 truncate" style={{ color: "#4B5563" }}>{row.session.targetId}</div>
                    <div className="flex items-center gap-2">
                      {assignedAgentName ? (
                        <div className="flex items-center gap-1.5 px-2 py-1" style={{ borderRadius: 10, background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                          {assignedAgent && <AgentAvatar agent={assignedAgent} size={14} rounded="full" />}
                          <span className="text-[11px] font-bold" style={{ color: "#374151" }}>{assignedAgentName}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] opacity-40 italic">{t({ ko: "Agent 미지정", en: "No agent assigned", ja: "Agent未指定", zh: "未指定 Agent" })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-center">
                    <button
                      onClick={() => openEditModal(row)}
                      className="p-2 transition-all hover:bg-gray-50"
                      style={{ borderRadius: 10, border: "1px solid #E5E7EB", color: "#6B7280", background: "white" }}
                      title={t({ ko: "편집", en: "Edit", ja: "편집", zh: "编辑" })}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeChat(row)}
                      className="p-2 transition-all hover:bg-red-50"
                      style={{ borderRadius: 10, border: "1px solid #FCA5A5", color: "#DC2626", background: "white" }}
                      title={t({ ko: "삭제", en: "Delete", ja: "삭제", zh: "删除" })}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[11px] font-mono opacity-60 pt-2 border-t border-gray-200" style={{ color: "#6B7280" }}>
        {t({
          ko: "• $ 전사 공지, ! 업무(태스크), 일반 메시지는 선택된 Agent 1:1 대화.",
          en: "• $ company directive, ! work (task), normal messages go 1:1 to the selected agent.",
          ja: "• $ 全社通知, ! 業務(태스크), 보통은 선택된 Agent 1:1 대화.",
          zh: "• $ 全员公告，! 工作（任务），普通消息为所选 Agent 1:1 对话。",
        })}
      </div>
    </div>
  );
}
