import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../i18n";
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  WEBHOOK_EVENTS,
  type Webhook,
} from "../../api/webhooks";

interface WebhookSettingsTabProps {
  /** 외부에서 웹훅 목록 갱신 요청 (예: 채널 추가 모달에서 웹훅 생성 후) */
  refreshTrigger?: number;
}

export default function WebhookSettingsTab({ refreshTrigger }: WebhookSettingsTabProps) {
  const { t } = useI18n();
  const tr = (ko: string, en: string, ja?: string, zh?: string) => t({ ko, en, ja: ja ?? en, zh: zh ?? en });

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["task_done"]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setWebhooks(await getWebhooks());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshTrigger]);

  function resetForm() {
    setFormName(""); setFormUrl(""); setFormSecret(""); setFormEvents(["task_done"]); setFormError("");
  }

  async function handleSubmit() {
    if (!formName.trim() || !formUrl.trim()) { setFormError(tr("이름과 URL은 필수입니다", "Name and URL are required", "名前とURLは必須です", "名称和URL为必填项")); return; }
    try { new URL(formUrl.trim()); } catch { setFormError(tr("유효한 URL을 입력하세요", "Enter a valid URL", "有効なURLを入力してください", "请输入有效的URL")); return; }
    setSubmitting(true);
    try {
      await createWebhook({ name: formName.trim(), url: formUrl.trim(), events: formEvents, secret: formSecret.trim() || undefined });
      resetForm(); setShowForm(false); refresh();
    } catch { setFormError(tr("저장에 실패했습니다", "Failed to save", "保存に失敗しました", "保存失败")); }
    finally { setSubmitting(false); }
  }

  async function handleToggle(hook: Webhook) {
    await updateWebhook(hook.id, { enabled: !hook.enabled });
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteWebhook(id); setDeletingId(null); refresh();
  }

  async function handleTest(id: string) {
    setTestingId(id); setTestResult(null);
    const result = await testWebhook(id);
    setTestResult({ id, ok: result.ok, msg: result.ok ? `HTTP ${result.status ?? "OK"}` : (result.error ?? "Failed") });
    setTestingId(null);
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 animate-spin" style={{ borderRadius: "50%", borderColor: "var(--th-border)", borderTopColor: "var(--th-accent)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase", borderLeft: "3px solid var(--th-accent)", paddingLeft: "8px", marginBottom: "4px" }}>
            // webhook integration
          </div>
          <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("태스크 이벤트를 Slack, Discord 등 외부 채널로 전송", "Send task events to Slack, Discord, or any HTTP endpoint", "タスクイベントをSlack、Discordなど外部チャンネルに送信", "将任务事件发送到Slack、Discord等外部频道")}
          </p>
        </div>
        <button
          onClick={() => { if (showForm) { resetForm(); setShowForm(false); } else { resetForm(); setShowForm(true); } }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition"
          style={showForm
            ? { border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", borderRadius: 0 }
            : { border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.12)", color: "var(--th-accent)", borderRadius: 0 }}
        >
          {showForm ? tr("취소", "Cancel", "キャンセル", "取消") : `+ ${tr("웹훅 추가", "Add Webhook", "Webhook追加", "添加Webhook")}`}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="space-y-4 p-4" style={{ border: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent)", borderRadius: 0, background: "var(--th-bg-elevated)" }}>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-accent)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            // new webhook
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>{tr("이름", "Name", "名前", "名称")} *</label>
              <input
                type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder={tr("예: Slack 완료 알림", "e.g. Slack completion alert", "例: Slack完了通知", "例: Slack完成通知")}
                className="w-full text-xs font-mono px-3 py-2 outline-none"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", borderRadius: 0 }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>URL *</label>
              <input
                type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full text-xs font-mono px-3 py-2 outline-none"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", borderRadius: 0 }}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>{tr("시크릿 키 (선택)", "Secret key (optional)", "シークレットキー (任意)", "密钥 (可选)")}</label>
              <input
                type="text" value={formSecret} onChange={(e) => setFormSecret(e.target.value)}
                placeholder={tr("X-AgentDesk-Secret 헤더로 전송됨", "Sent as X-AgentDesk-Secret header", "X-AgentDesk-Secretヘッダーで送信", "通过X-AgentDesk-Secret标头发送")}
                className="w-full text-xs font-mono px-3 py-2 outline-none"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", borderRadius: 0 }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>{tr("이벤트 선택", "Events", "イベント選択", "选择事件")}</label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                    className="px-2.5 py-1 text-[10px] font-mono transition"
                    style={formEvents.includes(ev.value)
                      ? { border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.12)", color: "var(--th-accent)", borderRadius: 0 }
                      : { border: "1px solid var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-muted)", borderRadius: 0 }}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-[10px] font-mono" style={{ color: "rgb(253,164,175)" }}>{formError}</p>
          )}

          <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid var(--th-border)" }}>
            <button
              onClick={() => void handleSubmit()} disabled={submitting}
              className="px-4 py-1.5 text-xs font-mono font-bold transition disabled:opacity-40"
              style={{ border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.1)", color: "rgb(167,243,208)", borderRadius: 0 }}
            >
              {submitting ? "..." : tr("저장", "Save", "保存", "保存")}
            </button>
            <button onClick={() => { resetForm(); setShowForm(false); }} className="px-3 py-1.5 text-xs font-mono transition" style={{ color: "var(--th-text-muted)" }}>
              {tr("취소", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 && !showForm ? (
        <div className="py-10 text-center" style={{ border: "1px dashed var(--th-border)", borderRadius: 0 }}>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("$ ls webhooks/ (empty)", "$ ls webhooks/ (empty)")}
          </div>
          <div className="text-[10px] font-mono mt-2" style={{ color: "var(--th-text-muted)" }}>
            {tr("웹훅을 추가하면 태스크 완료 시 외부 채널로 알림을 받을 수 있습니다", "Add a webhook to receive notifications when tasks complete", "Webhookを追加してタスク完了時に通知を受け取れます", "添加Webhook以在任务完成时接收通知")}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((hook) => {
            const tr2 = testResult?.id === hook.id ? testResult : null;
            return (
              <div
                key={hook.id}
                className="group"
                style={{
                  border: "1px solid var(--th-border)",
                  borderLeft: `3px solid ${hook.enabled ? "rgba(52,211,153,0.5)" : "var(--th-border)"}`,
                  background: "var(--th-bg-elevated)",
                  borderRadius: 0,
                  opacity: hook.enabled ? 1 : 0.6,
                }}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Toggle */}
                  <button
                    onClick={() => void handleToggle(hook)}
                    style={{
                      fontFamily: "var(--th-font-mono)",
                      fontSize: "9px",
                      letterSpacing: "0.06em",
                      padding: "2px 5px",
                      borderRadius: 0,
                      border: hook.enabled ? "1px solid rgba(52,211,153,0.5)" : "1px solid var(--th-border)",
                      background: hook.enabled ? "rgba(52,211,153,0.12)" : "var(--th-bg-elevated)",
                      color: hook.enabled ? "rgb(167,243,208)" : "var(--th-text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {hook.enabled ? "ON" : "OFF"}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold truncate" style={{ color: "var(--th-text-heading)" }}>{hook.name}</span>
                      <div className="flex gap-1 flex-wrap">
                        {hook.events.map((ev) => (
                          <span key={ev} className="text-[9px] font-mono px-1.5 py-0.5" style={{ border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.06)", color: "var(--th-accent)", borderRadius: 0 }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: "var(--th-text-muted)" }}>{hook.url}</div>
                    {tr2 && (
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: tr2.ok ? "rgb(167,243,208)" : "rgb(253,164,175)" }}>
                        {tr2.ok ? `✓ ${tr2.msg}` : `✗ ${tr2.msg}`}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => void handleTest(hook.id)}
                      disabled={testingId === hook.id}
                      className="px-2 py-1 text-[10px] font-mono transition disabled:opacity-40"
                      style={{ border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-primary)", borderRadius: 0 }}
                    >
                      {testingId === hook.id ? "..." : tr("테스트", "Test", "テスト", "测试")}
                    </button>
                    <button
                      onClick={() => setDeletingId(hook.id)}
                      className="px-2 py-1 text-[10px] font-mono transition hover:opacity-70"
                      style={{ border: "1px solid rgba(244,63,94,0.3)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.06)", borderRadius: 0 }}
                    >
                      {tr("삭제", "Del", "削除", "删除")}
                    </button>
                  </div>
                </div>

                {deletingId === hook.id && (
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <span className="text-[10px] font-mono" style={{ color: "rgb(253,164,175)" }}>{tr("정말 삭제하시겠습니까?", "Delete this webhook?", "本当に削除しますか？", "确定删除此Webhook吗？")}</span>
                    <button onClick={() => void handleDelete(hook.id)} className="px-2 py-0.5 text-[10px] font-mono" style={{ border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)", borderRadius: 0 }}>
                      {tr("삭제", "Delete", "削除", "删除")}
                    </button>
                    <button onClick={() => setDeletingId(null)} className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {tr("취소", "Cancel", "キャンセル", "取消")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payload reference */}
      <div className="p-3 text-[10px] font-mono" style={{ border: "1px solid var(--th-border)", background: "var(--th-terminal-bg, var(--th-bg-primary))", borderRadius: 0, color: "var(--th-text-muted)" }}>
        <div className="mb-1 font-bold" style={{ color: "var(--th-accent)" }}>POST payload (task_done)</div>
        <pre style={{ color: "var(--th-text-secondary)" }}>{`{
  "event": "task_done",
  "task_id": "uuid",
  "title": "Task title",
  "completed_at": 1700000000000
}`}</pre>
      </div>
    </div>
  );
}
