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

export default function WebhookSettingsTab() {
  const { t } = useI18n();
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

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

  useEffect(() => { refresh(); }, [refresh]);

  function resetForm() {
    setFormName(""); setFormUrl(""); setFormSecret(""); setFormEvents(["task_done"]); setFormError("");
  }

  async function handleSubmit() {
    if (!formName.trim() || !formUrl.trim()) { setFormError(tr("이름과 URL은 필수입니다", "Name and URL are required")); return; }
    try { new URL(formUrl.trim()); } catch { setFormError(tr("유효한 URL을 입력하세요", "Enter a valid URL")); return; }
    setSubmitting(true);
    try {
      await createWebhook({ name: formName.trim(), url: formUrl.trim(), events: formEvents, secret: formSecret.trim() || undefined });
      resetForm(); setShowForm(false); refresh();
    } catch { setFormError(tr("저장에 실패했습니다", "Failed to save")); }
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
          <h2 className="text-sm font-bold font-mono uppercase tracking-widest" style={{ color: "var(--th-text-heading)" }}>
            {tr("웹훅 연동", "Webhook Integration")}
          </h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
            {tr("태스크 이벤트를 Slack, Discord 등 외부 채널로 전송", "Send task events to Slack, Discord, or any HTTP endpoint")}
          </p>
        </div>
        <button
          onClick={() => { if (showForm) { resetForm(); setShowForm(false); } else { resetForm(); setShowForm(true); } }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition"
          style={showForm
            ? { border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", borderRadius: "2px" }
            : { border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.12)", color: "var(--th-accent)", borderRadius: "2px" }}
        >
          {showForm ? tr("취소", "Cancel") : `+ ${tr("웹훅 추가", "Add Webhook")}`}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="space-y-4 p-4" style={{ border: "1px solid var(--th-border)", borderLeft: "3px solid var(--th-accent)", borderRadius: "2px", background: "var(--th-bg-elevated)" }}>
          <h3 className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--th-accent)" }}>
            {tr("새 웹훅", "New Webhook")}
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>{tr("이름", "Name")} *</label>
              <input
                type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder={tr("예: Slack 완료 알림", "e.g. Slack completion alert")}
                className="w-full text-xs font-mono px-3 py-2 outline-none"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", borderRadius: "2px" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>URL *</label>
              <input
                type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full text-xs font-mono px-3 py-2 outline-none"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", borderRadius: "2px" }}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>{tr("시크릿 키 (선택)", "Secret key (optional)")}</label>
              <input
                type="text" value={formSecret} onChange={(e) => setFormSecret(e.target.value)}
                placeholder={tr("X-AgentDesk-Secret 헤더로 전송됨", "Sent as X-AgentDesk-Secret header")}
                className="w-full text-xs font-mono px-3 py-2 outline-none"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-input-bg, var(--th-bg-primary))", color: "var(--th-text-primary)", borderRadius: "2px" }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-mono uppercase" style={{ color: "var(--th-text-muted)" }}>{tr("이벤트 선택", "Events")}</label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                    className="px-2.5 py-1 text-[10px] font-mono transition"
                    style={formEvents.includes(ev.value)
                      ? { border: "1px solid rgba(251,191,36,0.5)", background: "rgba(251,191,36,0.12)", color: "var(--th-accent)", borderRadius: "2px" }
                      : { border: "1px solid var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-muted)", borderRadius: "2px" }}
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
              style={{ border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.1)", color: "rgb(167,243,208)", borderRadius: "2px" }}
            >
              {submitting ? "..." : tr("저장", "Save")}
            </button>
            <button onClick={() => { resetForm(); setShowForm(false); }} className="px-3 py-1.5 text-xs font-mono transition" style={{ color: "var(--th-text-muted)" }}>
              {tr("취소", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 && !showForm ? (
        <div className="py-10 text-center" style={{ border: "1px dashed var(--th-border)", borderRadius: "2px" }}>
          <div className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("$ ls webhooks/ (empty)", "$ ls webhooks/ (empty)")}
          </div>
          <div className="text-[10px] font-mono mt-2" style={{ color: "var(--th-text-muted)" }}>
            {tr("웹훅을 추가하면 태스크 완료 시 외부 채널로 알림을 받을 수 있습니다", "Add a webhook to receive notifications when tasks complete")}
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
                  borderRadius: "2px",
                  opacity: hook.enabled ? 1 : 0.6,
                }}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Toggle */}
                  <button onClick={() => void handleToggle(hook)} title={hook.enabled ? "ON" : "OFF"}>
                    <div className="relative w-8 h-4 transition-colors" style={{ borderRadius: "999px", background: hook.enabled ? "rgba(52,211,153,0.7)" : "var(--th-bg-primary)", border: "1px solid var(--th-border)" }}>
                      <div className={`absolute top-0.5 w-3 h-3 shadow transition-transform ${hook.enabled ? "translate-x-4" : "translate-x-0.5"}`} style={{ borderRadius: "50%", background: "#fff" }} />
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold truncate" style={{ color: "var(--th-text-heading)" }}>{hook.name}</span>
                      <div className="flex gap-1 flex-wrap">
                        {hook.events.map((ev) => (
                          <span key={ev} className="text-[9px] font-mono px-1.5 py-0.5" style={{ border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.06)", color: "var(--th-accent)", borderRadius: "2px" }}>
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
                      style={{ border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-primary)", borderRadius: "2px" }}
                    >
                      {testingId === hook.id ? "..." : tr("테스트", "Test")}
                    </button>
                    <button
                      onClick={() => setDeletingId(hook.id)}
                      className="px-2 py-1 text-[10px] font-mono transition hover:opacity-70"
                      style={{ border: "1px solid rgba(244,63,94,0.3)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.06)", borderRadius: "2px" }}
                    >
                      {tr("삭제", "Del")}
                    </button>
                  </div>
                </div>

                {deletingId === hook.id && (
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <span className="text-[10px] font-mono" style={{ color: "rgb(253,164,175)" }}>{tr("정말 삭제하시겠습니까?", "Delete this webhook?")}</span>
                    <button onClick={() => void handleDelete(hook.id)} className="px-2 py-0.5 text-[10px] font-mono" style={{ border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)", borderRadius: "2px" }}>
                      {tr("삭제", "Delete")}
                    </button>
                    <button onClick={() => setDeletingId(null)} className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {tr("취소", "Cancel")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payload reference */}
      <div className="p-3 text-[10px] font-mono" style={{ border: "1px solid var(--th-border)", background: "var(--th-terminal-bg, var(--th-bg-primary))", borderRadius: "2px", color: "var(--th-text-muted)" }}>
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
