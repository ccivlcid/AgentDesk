import { useState, useEffect } from "react";
import { getSynapseRules, createSynapseRule, updateSynapseRule, deleteSynapseRule } from "../../../api/synapse";
import type { SynapseRule } from "../../../api/synapse";
import { tl } from "./tl";
import { base } from "./constants";
import { SectionLabel, Btn, Input, Card } from "./ui";

const BLANK_RULE = {
  name: "",
  source: "obsidian" as "obsidian" | "notion",
  triggerPattern: "",
  titleTemplate: tl("{{filename}} 파일 변경됨", "{{filename}} file changed"),
};

export function RulesTab() {
  const [rules, setRules] = useState<SynapseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_RULE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSynapseRules().then(setRules).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (rule: SynapseRule) => {
    try {
      const updated = await updateSynapseRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => r.id === rule.id ? updated : r));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    await deleteSynapseRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!form.name || !form.titleTemplate) return;
    setSaving(true);
    setError("");
    try {
      const created = await createSynapseRule({
        name: form.name,
        source: form.source,
        trigger: { type: form.source === "obsidian" ? "file_change" : "page_updated", pattern: form.triggerPattern || undefined },
        action: { type: "create_task", title_template: form.titleTemplate },
      });
      setRules((prev) => [created, ...prev]);
      setForm(BLANK_RULE);
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Card>
        <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
          {tl("Obsidian 파일 변경 또는 Notion 페이지 업데이트 시 태스크를 자동 생성합니다.", "Auto-create tasks on Obsidian file changes or Notion page updates.")}
          {" "}{tl("제목 템플릿에서", "Template variables:")} <code style={{ color: "var(--th-accent)", fontFamily: base.fontFamily }}>{"{{filename}}"}</code>,{" "}
          <code style={{ color: "var(--th-accent)", fontFamily: base.fontFamily }}>{"{{path}}"}</code>,{" "}
          <code style={{ color: "var(--th-accent)", fontFamily: base.fontFamily }}>{"{{title}}"}</code> {tl("사용 가능합니다.", "available.")}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn primary small onClick={() => { setShowForm(!showForm); setError(""); }}>
          {showForm ? tl("취소", "Cancel") : tl("+ 규칙 추가", "+ Add Rule")}
        </Btn>
      </div>

      {showForm && (
        <Card accent>
          <SectionLabel>New Rule</SectionLabel>
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("규칙 이름", "Rule Name")}</div>
            <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder={tl("예: .md 변경 시 리뷰 태스크 생성", "e.g. Create review task on .md change")} fullWidth />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("트리거 소스", "Trigger Source")}</div>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as "obsidian" | "notion" }))}
                style={{
                  ...base, fontSize: 11, padding: "7px 10px",
                  background: "var(--th-input-bg, var(--th-bg-primary))",
                  border: "1px solid var(--th-border)",
                  borderRadius: 6,
                  color: "var(--th-text-primary)",
                  width: "100%",
                  outline: "none",
                }}
              >
                <option value="obsidian">{tl("Obsidian (파일 변경)", "Obsidian (file change)")}</option>
                <option value="notion">{tl("Notion (페이지 업데이트)", "Notion (page update)")}</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("패턴 필터 (비우면 전체)", "Pattern filter (empty = all)")}</div>
              <Input value={form.triggerPattern} onChange={(v) => setForm((f) => ({ ...f, triggerPattern: v }))} placeholder="Daily" fullWidth />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>{tl("태스크 제목 템플릿", "Task Title Template")}</div>
            <Input value={form.titleTemplate} onChange={(v) => setForm((f) => ({ ...f, titleTemplate: v }))} placeholder="{{filename}} changed — review needed" fullWidth />
          </div>
          {error && <div style={{ ...base, fontSize: 10, color: "#ff453a", marginBottom: 8 }}>{error}</div>}
          <Btn primary onClick={handleSave} disabled={saving || !form.name || !form.titleTemplate}>
            {saving ? tl("저장 중...", "Saving...") : tl("규칙 생성", "Create Rule")}
          </Btn>
        </Card>
      )}

      <SectionLabel>Active Rules</SectionLabel>
      {loading && <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "8px 0" }}>{tl("로드 중...", "Loading...")}</div>}
      {!loading && rules.length === 0 && (
        <div style={{ ...base, fontSize: 11, color: "var(--th-text-muted)", padding: "12px 0" }}>
          {tl("규칙 없음 — 위의 규칙 추가로 자동화를 설정하세요.", "No rules — click '+ Add Rule' above to set up automation.")}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rules.map((rule) => (
          <div key={rule.id} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 12px",
            background: "var(--th-hover-overlay-subtle)",
            border: `1px solid ${rule.enabled ? "rgba(245,158,11,0.3)" : "var(--th-border)"}`,
            borderRadius: 6,
            opacity: rule.enabled ? 1 : 0.55,
            transition: "opacity 0.15s, border-color 0.15s",
          }}>
            <button
              type="button"
              onClick={() => void handleToggle(rule)}
              style={{
                ...base, fontSize: 9, fontWeight: 700,
                padding: "3px 7px",
                borderRadius: 4,
                border: `1px solid ${rule.enabled ? "rgba(245,158,11,0.4)" : "var(--th-border)"}`,
                background: rule.enabled ? "rgba(245,158,11,0.12)" : "transparent",
                color: rule.enabled ? "var(--th-accent)" : "var(--th-text-muted)",
                cursor: "pointer",
                flexShrink: 0,
                letterSpacing: "0.06em",
              }}
            >
              {rule.enabled ? "ON" : "OFF"}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...base, fontSize: 11, fontWeight: 600, color: "var(--th-text-primary)" }}>{rule.name}</div>
              <div style={{ ...base, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                {rule.source}&nbsp;
                {rule.trigger.pattern ? `· pattern: ${rule.trigger.pattern}` : "· all files"}
                &nbsp;→&nbsp;{rule.action.title_template}
              </div>
              {rule.last_fired_at && (
                <div style={{ ...base, fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>
                  {tl("마지막 실행:", "Last run:")} {new Date(rule.last_fired_at).toLocaleString()}
                </div>
              )}
            </div>

            <Btn small danger onClick={() => void handleDelete(rule.id)}>{tl("삭제", "Delete")}</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}
