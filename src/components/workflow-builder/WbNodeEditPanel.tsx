import type { Node } from "@xyflow/react";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";

const TRIGGER_OPTIONS = [
  { value: "manual",    icon: "▶", label: { ko: "수동",    en: "Manual",    ja: "手動",         zh: "手动"    } },
  { value: "schedule",  icon: "⏱", label: { ko: "스케줄",  en: "Schedule",  ja: "スケジュール", zh: "定时"    } },
  { value: "webhook",   icon: "⚡", label: { ko: "웹훅",    en: "Webhook",   ja: "ウェブフック", zh: "网络钩子" } },
  { value: "messenger", icon: "✉", label: { ko: "메신저",  en: "Messenger", ja: "メッセンジャー", zh: "消息"   } },
] as const;

const BRANCH_OPTIONS = [
  { value: "success", color: "#10b981", label: { ko: "성공",     en: "Success", ja: "成功",         zh: "成功" } },
  { value: "failure", color: "#ef4444", label: { ko: "실패",     en: "Failure", ja: "失敗",         zh: "失败" } },
  { value: "timeout", color: "#f59e0b", label: { ko: "타임아웃", en: "Timeout", ja: "タイムアウト", zh: "超时" } },
] as const;

const TYPE_META: Record<string, { label: { ko: string; en: string; ja: string; zh: string }; color: string }> = {
  trigger:   { label: { ko: "트리거",   en: "Trigger",   ja: "トリガー",     zh: "触发器" }, color: "#3b82f6" },
  agent:     { label: { ko: "에이전트", en: "Agent",     ja: "エージェント", zh: "代理"   }, color: "var(--th-accent)" },
  gate:      { label: { ko: "게이트",   en: "Gate",      ja: "ゲート",       zh: "门控"   }, color: "#8b5cf6" },
  condition: { label: { ko: "조건",     en: "Condition", ja: "条件",         zh: "条件"   }, color: "#f59e0b" },
};

type Props = {
  node: Node;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
};

export default function WbNodeEditPanel({ node, onUpdate, onDelete }: Props) {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const mono = "var(--th-font-mono)";
  const d = node.data as Record<string, unknown>;

  const availableAgents =
    currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
      ? agents.filter((a) => projectAgentIds.has(a.id))
      : agents;

  const meta = TYPE_META[node.type ?? ""] ?? {
    label: { ko: node.type ?? "", en: node.type ?? "", ja: node.type ?? "", zh: node.type ?? "" },
    color: "var(--th-text-muted)",
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: mono, fontSize: 11, padding: "5px 8px",
    background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)",
    borderRadius: 4, color: "var(--th-text)", outline: "none", width: "100%", boxSizing: "border-box",
  };

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        {children}
      </div>
    );
  }

  return (
    <div style={{
      width: 220, flexShrink: 0,
      borderLeft: "1px solid var(--th-border)",
      background: "var(--th-bg-panel)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px", borderBottom: "1px solid var(--th-border)",
        display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
      }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: "var(--th-text-heading)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {t(meta.label)}
        </span>
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginLeft: "auto" }}>
          #{node.id.slice(-6)}
        </span>
      </div>

      {/* Fields */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Label — common */}
        <Field label={t({ ko: "라벨", en: "Label", ja: "ラベル", zh: "标签" })}>
          <input
            style={inputStyle}
            value={(d.label as string) ?? ""}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          />
        </Field>

        {/* ── Trigger ── */}
        {node.type === "trigger" && (
          <>
            <Field label={t({ ko: "트리거 유형", en: "Trigger Type", ja: "タイプ", zh: "触发类型" })}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {TRIGGER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate(node.id, { triggerType: opt.value })}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "5px 8px", borderRadius: 4, cursor: "pointer",
                      fontFamily: mono, fontSize: 10, textAlign: "left",
                      background: d.triggerType === opt.value ? "var(--th-active-bg)" : "var(--th-bg-elevated)",
                      border: `1px solid ${d.triggerType === opt.value ? "var(--th-accent)" : "var(--th-border)"}`,
                      color: d.triggerType === opt.value ? "var(--th-accent)" : "var(--th-text-muted)",
                    }}
                  >
                    <span>{opt.icon}</span>
                    {t(opt.label)}
                  </button>
                ))}
              </div>
            </Field>

            {d.triggerType === "schedule" && (
              <Field label={t({ ko: "크론 표현식", en: "Cron Expression", ja: "Cron式", zh: "Cron表达式" })}>
                <input
                  style={inputStyle}
                  placeholder="0 9 * * 1-5"
                  value={(d.cron as string) ?? ""}
                  onChange={(e) => onUpdate(node.id, { cron: e.target.value })}
                />
              </Field>
            )}

            {d.triggerType === "webhook" && (
              <Field label={t({ ko: "웹훅 경로", en: "Webhook Path", ja: "パス", zh: "路径" })}>
                <input
                  style={inputStyle}
                  placeholder="/webhook/my-event"
                  value={(d.webhookPath as string) ?? ""}
                  onChange={(e) => onUpdate(node.id, { webhookPath: e.target.value })}
                />
              </Field>
            )}
          </>
        )}

        {/* ── Agent ── */}
        {node.type === "agent" && (
          <>
            <Field label={t({ ko: "에이전트", en: "Agent", ja: "エージェント", zh: "代理" })}>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={(d.agentId as string) ?? ""}
                onChange={(e) => {
                  const agent = agents.find((a) => a.id === e.target.value);
                  if (agent) {
                    onUpdate(node.id, { agentId: agent.id, agentName: agent.name, emoji: agent.avatar_emoji });
                  } else {
                    onUpdate(node.id, { agentId: "", agentName: "", emoji: "⊙" });
                  }
                }}
              >
                <option value="">— {t({ ko: "선택", en: "select", ja: "選択", zh: "选择" })} —</option>
                {availableAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.avatar_emoji} {a.name}</option>
                ))}
              </select>
            </Field>

            <Field label={t({ ko: "스킬", en: "Skill", ja: "スキル", zh: "技能" })}>
              <input
                style={inputStyle}
                placeholder="e.g. code-review"
                value={(d.skill as string) ?? ""}
                onChange={(e) => onUpdate(node.id, { skill: e.target.value })}
              />
            </Field>

            <Field label={t({ ko: "지시사항", en: "Instruction", ja: "指示", zh: "指令" })}>
              <textarea
                style={{ ...inputStyle, minHeight: 72, resize: "vertical" } as React.CSSProperties}
                placeholder={t({ ko: "이 스텝의 지시사항...", en: "Instructions for this step...", ja: "このステップへの指示...", zh: "此步骤的指令..." })}
                value={(d.instruction as string) ?? ""}
                onChange={(e) => onUpdate(node.id, { instruction: e.target.value })}
              />
            </Field>
          </>
        )}

        {/* ── Gate ── */}
        {node.type === "gate" && (
          <Field label={t({ ko: "분기 유형", en: "Branches", ja: "分岐タイプ", zh: "分支类型" })}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {BRANCH_OPTIONS.map((opt) => {
                const branches = (d.branches as string[]) ?? ["success", "failure"];
                const active = branches.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const next = active
                        ? branches.filter((b) => b !== opt.value)
                        : [...branches, opt.value];
                      if (next.length > 0) onUpdate(node.id, { branches: next });
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "5px 8px", borderRadius: 4, cursor: "pointer",
                      fontFamily: mono, fontSize: 10,
                      background: active ? `${opt.color}22` : "var(--th-bg-elevated)",
                      border: `1px solid ${active ? opt.color : "var(--th-border)"}`,
                      color: active ? opt.color : "var(--th-text-muted)",
                    }}
                  >
                    <span style={{ fontSize: 11 }}>{active ? "✓" : "○"}</span>
                    {t(opt.label)}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {/* ── Condition ── */}
        {node.type === "condition" && (
          <Field label={t({ ko: "조건 표현식", en: "Expression", ja: "条件式", zh: "条件表达式" })}>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" } as React.CSSProperties}
              placeholder="task.status === 'done'"
              value={(d.expression as string) ?? ""}
              onChange={(e) => onUpdate(node.id, { expression: e.target.value })}
            />
          </Field>
        )}
      </div>

      {/* Delete */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--th-border)", flexShrink: 0 }}>
        <button
          onClick={() => onDelete(node.id)}
          style={{
            width: "100%", fontFamily: mono, fontSize: 10, padding: "5px 0",
            background: "transparent", border: "1px solid var(--th-border)",
            borderRadius: 4, cursor: "pointer", color: "#ef4444",
          }}
          className="hover:bg-red-950/30"
        >
          {t({ ko: "노드 삭제", en: "Delete Node", ja: "ノード削除", zh: "删除节点" })}
        </button>
      </div>
    </div>
  );
}
