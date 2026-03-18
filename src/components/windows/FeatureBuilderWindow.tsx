import { useState } from "react";
import AppWindow from "./AppWindow";
import { FEATURE_TEMPLATES, TEMPLATE_CATEGORY_LABELS, type FeatureTemplate } from "../widget-builder/templates";
import type { CustomFeature, CustomFeatureConfig } from "../../types";
import { createCustomFeature, getCustomFeature } from "../../api/custom-features";
import { useI18n } from "../../i18n";
import { useAgentStore } from "../../store/agentStore";
import { useUiStore } from "../../store/uiStore";
import CustomFeatureRenderer from "../widget-builder/CustomFeatureRenderer";
import StepAiGenerate from "../widget-builder/steps/StepAiGenerate";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
const SIZE_PRESETS = { sm: { w: 320, h: 240 }, md: { w: 420, h: 280 }, lg: { w: 560, h: 360 } };

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "agent-dept-status": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="8" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <rect x="7" y="3" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <line x1="7" y1="12" x2="7" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="10" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13" y1="12" x2="13" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  "agent-single-monitor": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="9" r="5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <circle cx="10" cy="9" r="2" fill="currentColor" opacity="0.5"/>
      <line x1="14" y1="13" x2="17" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  "task-daily-counter": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M7 10L9.2 12.5L13 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  "task-assignee-progress": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="13" width="3" height="4" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="8.5" y="9" width="3" height="8" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="14" y="5" width="3" height="12" rx="1" fill="currentColor"/>
    </svg>
  ),
  "notification-filter-feed": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3C7.24 3 5 5.24 5 8v4l-1.5 2h13L15 12V8c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
      <path d="M8.5 15.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  "cli-cost-summary": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M10 6v1.5M10 12.5V14M7.5 8.5C7.5 7.67 8.17 7 9 7h2a1.5 1.5 0 010 3H9a1.5 1.5 0 000 3h2a1.5 1.5 0 010 3H9c-.83 0-1.5-.67-1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  "memo-board": (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <line x1="7" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="7" y1="12.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
};

type Step = "method" | "template-select" | "params" | "preview" | "ai-generate";

function FeatureBuilderContent() {
  const { language } = useI18n();
  const isKo = language === "ko";
  const agents = useAgentStore((s) => s.agents);
  const bumpCustomFeaturesTick = useUiStore((s) => s.bumpCustomFeaturesTick);

  const [step, setStep] = useState<Step>("method");
  const [selectedTemplate, setSelectedTemplate] = useState<FeatureTemplate | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [name, setName] = useState("");
  const [sizePreset, setSizePreset] = useState<"sm" | "md" | "lg">("md");
  const [refresh, setRefresh] = useState<CustomFeatureConfig["refresh"]>("30s");
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [method, setMethod] = useState<"template" | "ai">("template");
  const [aiFeature, setAiFeature] = useState<CustomFeature | null>(null);
  const [saved, setSaved] = useState(false);

  function reset() {
    setStep("method");
    setSelectedTemplate(null);
    setParams({});
    setName("");
    setSizePreset("md");
    setRefresh("30s");
    setSaving(false);
    setActiveCategory("all");
    setMethod("template");
    setAiFeature(null);
    setSaved(false);
  }

  function selectTemplate(tpl: FeatureTemplate) {
    const defaultParams: Record<string, unknown> = {};
    tpl.params.forEach((p) => { if (p.defaultValue !== undefined) defaultParams[p.key] = p.defaultValue; });
    setSelectedTemplate(tpl);
    setParams(defaultParams);
    setName(isKo ? tpl.name_ko : tpl.name_en);
    setRefresh(tpl.defaultConfig.refresh);
    setSizePreset(tpl.defaultConfig.sizePreset);
    setStep("params");
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (method === "ai" && aiFeature) {
        setSaved(true);
        bumpCustomFeaturesTick();
        return;
      }
      if (!selectedTemplate || !name.trim()) return;
      const config: CustomFeatureConfig = {
        refresh,
        theme: selectedTemplate.defaultConfig.theme,
        sizePreset,
        params,
      };
      await createCustomFeature({
        name: name.trim(),
        type: "app",
        source: "template",
        template_id: selectedTemplate.id,
        config,
      });
      setSaved(true);
      bumpCustomFeaturesTick();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleAiGenerated(featureId: string) {
    try {
      const feature = await getCustomFeature(featureId);
      setAiFeature(feature);
      setName(feature.name);
      setStep("preview");
    } catch (e) {
      console.error(e);
    }
  }

  const previewFeature: CustomFeature | null = method === "ai" && aiFeature
    ? aiFeature
    : selectedTemplate
    ? {
        id: "__preview__",
        name,
        type: "app",
        source: "template" as const,
        template_id: selectedTemplate.id,
        config: { refresh, theme: selectedTemplate.defaultConfig.theme, sizePreset, params },
        status: "active" as const,
        error_msg: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      }
    : null;

  const categories = ["all", ...Array.from(new Set(FEATURE_TEMPLATES.map((t) => t.category)))];
  const filtered = activeCategory === "all" ? FEATURE_TEMPLATES : FEATURE_TEMPLATES.filter((t) => t.category === activeCategory);

  if (saved) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
        <span style={{ color: "var(--th-success, #22c55e)" }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="19" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2"/>
            <path d="M13 22L19 28L31 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <div style={{ ...mono, fontSize: 13, color: "var(--th-text-heading)", fontWeight: 700 }}>
          {isKo ? "등록 완료!" : "Registered!"}
        </div>
        <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
          {isKo ? `"${name}"이(가) 앱 창으로 추가됐습니다.` : `"${name}" added as app window.`}
        </div>
        <button
          onClick={reset}
          style={{ ...mono, fontSize: 11, padding: "6px 20px", border: "1px solid var(--th-border-accent)", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "var(--th-accent)", cursor: "pointer", marginTop: 8 }}
        >
          {isKo ? "+ 새 기능 만들기" : "+ Create Another"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
        <div style={{ ...mono, fontSize: 12, color: "var(--th-text-heading)", fontWeight: 700 }}>
          {step === "method" && (isKo ? "새 기능 만들기" : "Create New Feature")}
          {step === "template-select" && (isKo ? "템플릿 선택" : "Select Template")}
          {step === "params" && (isKo ? "옵션 설정" : "Configure Options")}
          {step === "ai-generate" && (isKo ? "AI로 생성" : "Generate with AI")}
          {step === "preview" && (isKo ? "미리보기 & 등록" : "Preview & Register")}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>

        {/* Step 1: 방법 선택 */}
        {step === "method" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 32 }}>
            <p style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center" }}>
              {isKo ? "어떻게 만드시겠어요?" : "How would you like to create it?"}
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              <button
                onClick={() => setStep("template-select")}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 20, border: "1px solid var(--th-border)", borderRadius: 8, background: "var(--th-hover-overlay-subtle)", cursor: "pointer", minWidth: 140 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border-strong)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)"; }}
              >
                <span style={{ color: "var(--th-text-secondary)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                    <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                    <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                    <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                  </svg>
                </span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)" }}>{isKo ? "템플릿으로" : "From Template"}</span>
                <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "center" }}>{isKo ? "미리 만들어진 템플릿 선택" : "Choose a ready-made template"}</span>
              </button>
              <button
                onClick={() => { setMethod("ai"); setStep("ai-generate"); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 20, border: "1px solid var(--th-border)", borderRadius: 8, background: "var(--th-hover-overlay-subtle)", cursor: "pointer", minWidth: 140 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border-strong)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)"; }}
              >
                <span style={{ color: "var(--th-accent)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
                    <circle cx="4" cy="4" r="1.2" fill="currentColor" opacity="0.4"/>
                    <circle cx="20" cy="20" r="1.2" fill="currentColor" opacity="0.4"/>
                  </svg>
                </span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)" }}>{isKo ? "AI에게" : "Ask AI"}</span>
                <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "center" }}>{isKo ? "자연어로 기능 생성" : "Generate from natural language"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 템플릿 선택 */}
        {step === "template-select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    ...mono, fontSize: 10, padding: "3px 10px",
                    border: "1px solid",
                    borderColor: activeCategory === cat ? "var(--th-border-accent)" : "var(--th-border)",
                    borderRadius: 20,
                    background: activeCategory === cat ? "rgba(245,158,11,0.15)" : "transparent",
                    color: activeCategory === cat ? "var(--th-accent)" : "var(--th-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {cat === "all" ? (isKo ? "전체" : "All") : (isKo ? TEMPLATE_CATEGORY_LABELS[cat]?.ko : TEMPLATE_CATEGORY_LABELS[cat]?.en) ?? cat}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {filtered.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, border: "1px solid var(--th-border)", borderRadius: 6, background: "var(--th-hover-overlay-subtle)", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-hover-overlay)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-hover-overlay-subtle)"; }}
                >
                  <span style={{ flexShrink: 0, color: "var(--th-text-secondary)", opacity: 0.85 }}>
                    {TEMPLATE_ICONS[tpl.id] ?? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
                    )}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--th-text-heading)" }}>{isKo ? tpl.name_ko : tpl.name_en}</div>
                    <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>{isKo ? tpl.desc_ko : tpl.desc_en}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step AI: AI 생성 */}
        {step === "ai-generate" && (
          <StepAiGenerate
            isKo={isKo}
            featureType="app"
            config={{ refresh, theme: "default", sizePreset, params }}
            onGenerated={handleAiGenerated}
          />
        )}

        {/* Step 3: 파라미터 설정 */}
        {step === "params" && selectedTemplate && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "var(--th-hover-overlay-subtle)", borderRadius: 6, border: "1px solid var(--th-border)" }}>
              <span style={{ color: "var(--th-accent)", flexShrink: 0 }}>
                {TEMPLATE_ICONS[selectedTemplate.id] ?? (
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
                )}
              </span>
              <div>
                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)" }}>{isKo ? selectedTemplate.name_ko : selectedTemplate.name_en}</div>
                <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? selectedTemplate.desc_ko : selectedTemplate.desc_en}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? "이름" : "Name"}</label>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} style={{ ...mono, fontSize: 11, padding: "5px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? "새로고침" : "Refresh"}</label>
                <select value={refresh} onChange={(e) => setRefresh(e.target.value as CustomFeatureConfig["refresh"])} style={{ ...mono, fontSize: 11, padding: "5px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}>
                  {(["manual", "5s", "30s", "1m", "5m"] as const).map((r) => (
                    <option key={r} value={r}>{r === "manual" ? (isKo ? "수동" : "Manual") : r}</option>
                  ))}
                </select>
              </div>
            </div>
            {selectedTemplate.params.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", borderBottom: "1px solid var(--th-border)", paddingBottom: 6 }}>
                  {isKo ? "템플릿 설정" : "Template Options"}
                </div>
                {selectedTemplate.params.map((p) => {
                  const inputStyle: React.CSSProperties = { ...mono, fontSize: 11, padding: "5px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none", width: "100%" };
                  const isOn = !!params[p.key];
                  return (
                    <div key={p.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                        {isKo ? p.label_ko : p.label_en}
                        {p.required && <span style={{ color: "var(--th-accent)" }}> *</span>}
                      </label>
                      {p.type === "toggle" ? (
                        <button type="button" onClick={() => setParams((prev) => ({ ...prev, [p.key]: !prev[p.key] }))} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <span style={{ display: "inline-block", width: 36, height: 20, borderRadius: 10, background: isOn ? "rgba(245,158,11,0.8)" : "var(--th-bg-elevated)", border: `1px solid ${isOn ? "var(--th-accent)" : "var(--th-border)"}`, position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
                            <span style={{ position: "absolute", top: 2, left: isOn ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: isOn ? "#fff" : "var(--th-text-muted)", transition: "left 0.15s" }} />
                          </span>
                          <span style={{ ...mono, fontSize: 10, color: isOn ? "var(--th-accent)" : "var(--th-text-muted)" }}>{isOn ? "ON" : "OFF"}</span>
                        </button>
                      ) : p.type === "select" ? (
                        <select value={String(params[p.key] ?? p.defaultValue ?? "")} onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))} style={inputStyle}>
                          {p.options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{isKo ? o.label_ko : o.label_en}</option>)}
                        </select>
                      ) : p.type === "number" ? (
                        <input type="number" value={String(params[p.key] ?? p.defaultValue ?? "")} onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))} min={p.min} max={p.max} step={p.step} placeholder={p.placeholder} style={inputStyle} />
                      ) : p.type === "agent" ? (
                        <select value={String(params[p.key] ?? "")} onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))} style={inputStyle}>
                          <option value="">{isKo ? "에이전트 선택..." : "Select agent..."}</option>
                          {agents.map((a) => <option key={a.id} value={a.id}>{isKo ? (a.name_ko || a.name) : (a.name || a.name_ko)}</option>)}
                        </select>
                      ) : p.multiline ? (
                        <textarea value={String(params[p.key] ?? p.defaultValue ?? "")} onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))} rows={4} placeholder={p.placeholder} style={{ ...inputStyle, resize: "vertical" }} />
                      ) : (
                        <input type="text" value={String(params[p.key] ?? p.defaultValue ?? "")} onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))} placeholder={p.placeholder} style={inputStyle} />
                      )}
                      {p.hint && <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.6, lineHeight: 1.4 }}>{p.hint}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 4: 미리보기 */}
        {step === "preview" && previewFeature && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <div style={{ width: SIZE_PRESETS[sizePreset].w, height: SIZE_PRESETS[sizePreset].h, maxWidth: "100%", border: "1px solid var(--th-border)", borderRadius: 8, background: "var(--th-bg-elevated)", overflow: "hidden" }}>
              <div style={{ ...mono, fontSize: 10, padding: "6px 10px", borderBottom: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-panel)" }}>
                {name || (isKo ? "이름 없음" : "Unnamed")}
              </div>
              <div style={{ height: "calc(100% - 33px)", overflow: "hidden" }}>
                <CustomFeatureRenderer feature={previewFeature} />
              </div>
            </div>
            <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
              {isKo ? "앱 창으로 등록됩니다" : "Will be registered as app window"}
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid var(--th-border)", flexShrink: 0 }}>
        {step !== "method" && (
          <button
            onClick={() => {
              if (step === "template-select") setStep("method");
              else if (step === "params") setStep("template-select");
              else if (step === "ai-generate") { setMethod("template"); setStep("method"); }
              else if (step === "preview") {
                if (method === "ai") { setAiFeature(null); setStep("ai-generate"); }
                else setStep("params");
              }
            }}
            style={{ ...mono, fontSize: 11, padding: "4px 14px", border: "1px solid var(--th-border)", borderRadius: 4, background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
          >
            {isKo ? "← 이전" : "← Back"}
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step === "params" && (
          <button
            onClick={() => setStep("preview")}
            disabled={!name.trim()}
            style={{ ...mono, fontSize: 11, padding: "4px 16px", border: "1px solid var(--th-border-accent)", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "var(--th-accent)", cursor: name.trim() ? "pointer" : "not-allowed", opacity: name.trim() ? 1 : 0.5 }}
          >
            {isKo ? "미리보기 →" : "Preview →"}
          </button>
        )}
        {step === "preview" && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...mono, fontSize: 11, padding: "4px 20px", border: "1px solid var(--th-border-accent)", borderRadius: 4, background: "var(--th-accent)", color: "#000", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700 }}
          >
            {saving ? (isKo ? "등록 중..." : "Saving...") : (isKo ? "✓ 등록하기" : "✓ Register")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function FeatureBuilderWindow() {
  const { t } = useI18n();
  return (
    <AppWindow
      windowType="feature-builder"
      title={t({ ko: "새 기능 만들기", en: "Create New Feature", ja: "新機能作成", zh: "新建功能" })}
      emoji={
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
          <circle cx="2.5" cy="2.5" r="1" fill="currentColor" opacity="0.5"/>
          <circle cx="13.5" cy="13.5" r="1" fill="currentColor" opacity="0.5"/>
        </svg>
      }
    >
      <FeatureBuilderContent />
    </AppWindow>
  );
}
