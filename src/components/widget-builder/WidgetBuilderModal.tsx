import { useState } from "react";
import Modal, { ModalHeader, ModalBody, ModalFooter } from "../ui/Modal";
import { FEATURE_TEMPLATES, TEMPLATE_CATEGORY_LABELS, type FeatureTemplate } from "./templates";
import type { CustomFeature, CustomFeatureConfig, CustomFeatureType } from "../../types";
import { createCustomFeature, getCustomFeature } from "../../api/custom-features";
import { useI18n } from "../../i18n";
import { useAgentStore } from "../../store/agentStore";
import CustomFeatureRenderer from "./CustomFeatureRenderer";
import StepAiGenerate from "./steps/StepAiGenerate";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
const SIZE_PRESETS = { sm: { w: 320, h: 240 }, md: { w: 420, h: 280 }, lg: { w: 560, h: 360 } };

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string, type: CustomFeatureType) => void;
}

type Step = "method" | "template-select" | "params" | "preview" | "ai-generate";

export default function WidgetBuilderModal({ open, onClose, onCreated }: Props) {
  const { language } = useI18n();
  const isKo = language === "ko";
  const agents = useAgentStore((s) => s.agents);

  const [step, setStep] = useState<Step>("method");
  const [selectedTemplate, setSelectedTemplate] = useState<FeatureTemplate | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [name, setName] = useState("");
  const [featureType, setFeatureType] = useState<CustomFeatureType>("widget");
  const [sizePreset, setSizePreset] = useState<"sm" | "md" | "lg">("md");
  const [refresh, setRefresh] = useState<CustomFeatureConfig["refresh"]>("30s");
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [method, setMethod] = useState<"template" | "ai">("template");
  const [aiFeature, setAiFeature] = useState<CustomFeature | null>(null);

  function reset() {
    setStep("method");
    setSelectedTemplate(null);
    setParams({});
    setName("");
    setFeatureType("widget");
    setSizePreset("md");
    setRefresh("30s");
    setSaving(false);
    setActiveCategory("all");
    setMethod("template");
    setAiFeature(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function selectTemplate(tpl: FeatureTemplate) {
    const defaultParams: Record<string, unknown> = {};
    tpl.params.forEach((p) => { if (p.defaultValue !== undefined) defaultParams[p.key] = p.defaultValue; });
    setSelectedTemplate(tpl);
    setParams(defaultParams);
    setName(isKo ? tpl.name_ko : tpl.name_en);
    setFeatureType(tpl.defaultType);
    setRefresh(tpl.defaultConfig.refresh);
    setSizePreset(tpl.defaultConfig.sizePreset);
    setStep("params");
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (method === "ai" && aiFeature) {
        onCreated(aiFeature.id, aiFeature.type as CustomFeatureType);
        handleClose();
        return;
      }
      if (!selectedTemplate || !name.trim()) return;
      const config: CustomFeatureConfig = {
        refresh,
        theme: selectedTemplate.defaultConfig.theme,
        sizePreset,
        params,
      };
      const { id } = await createCustomFeature({
        name: name.trim(),
        type: featureType,
        source: "template",
        template_id: selectedTemplate.id,
        config,
      });
      onCreated(id, featureType);
      handleClose();
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
      setFeatureType(feature.type as CustomFeatureType);
      setStep("preview");
    } catch (e) {
      console.error(e);
    }
  }

  // 현재 미리보기용 가상 feature 객체
  const previewFeature: CustomFeature | null = method === "ai" && aiFeature
    ? aiFeature
    : selectedTemplate
    ? {
        id: "__preview__",
        name,
        type: featureType,
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

  return (
    <Modal open={open} onClose={handleClose} width="lg">
      <ModalHeader onClose={handleClose}>
        {step === "method" && (isKo ? "✦ 새 기능 만들기" : "✦ Create New Feature")}
        {step === "template-select" && (isKo ? "템플릿 선택" : "Select Template")}
        {step === "params" && (isKo ? "옵션 설정" : "Configure Options")}
        {step === "ai-generate" && (isKo ? "✦ AI로 생성" : "✦ Generate with AI")}
        {step === "preview" && (isKo ? "미리보기 & 등록" : "Preview & Register")}
      </ModalHeader>

      <ModalBody className="flex flex-col gap-4 min-h-[360px]">

        {/* ── Step 1: 방법 선택 ── */}
        {step === "method" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <p style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center" }}>
              {isKo ? "어떻게 만드시겠어요?" : "How would you like to create it?"}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setStep("template-select")}
                className="flex flex-col items-center gap-2 p-5 transition-colors"
                style={{ border: "1px solid var(--th-border)", borderRadius: 8, background: "rgba(255,255,255,0.03)", cursor: "pointer", minWidth: 140 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border-strong)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)"; }}
              >
                <span style={{ fontSize: 28 }}>📋</span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)" }}>{isKo ? "템플릿으로" : "From Template"}</span>
                <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "center" }}>{isKo ? "미리 만들어진 템플릿 선택" : "Choose a ready-made template"}</span>
              </button>
              <button
                onClick={() => { setMethod("ai"); setStep("ai-generate"); }}
                className="flex flex-col items-center gap-2 p-5 transition-colors"
                style={{ border: "1px solid var(--th-border)", borderRadius: 8, background: "rgba(255,255,255,0.02)", cursor: "pointer", minWidth: 140 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border-strong)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)"; }}
              >
                <span style={{ fontSize: 28 }}>✦</span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)" }}>{isKo ? "AI에게" : "Ask AI"}</span>
                <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "center" }}>{isKo ? "자연어로 기능 생성" : "Generate from natural language"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: 템플릿 선택 ── */}
        {step === "template-select" && (
          <div className="flex flex-col gap-3">
            {/* 카테고리 탭 */}
            <div className="flex gap-1 flex-wrap">
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
                  {cat === "all"
                    ? (isKo ? "전체" : "All")
                    : (isKo ? TEMPLATE_CATEGORY_LABELS[cat]?.ko : TEMPLATE_CATEGORY_LABELS[cat]?.en) ?? cat}
                </button>
              ))}
            </div>

            {/* 템플릿 카드 */}
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl)}
                  className="flex items-start gap-3 p-3 text-left transition-colors"
                  style={{ border: "1px solid var(--th-border)", borderRadius: 6, background: "rgba(255,255,255,0.02)", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{tpl.emoji}</span>
                  <div className="min-w-0">
                    <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--th-text-heading)" }}>
                      {isKo ? tpl.name_ko : tpl.name_en}
                    </div>
                    <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }} className="line-clamp-2">
                      {isKo ? tpl.desc_ko : tpl.desc_en}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step AI: AI 생성 ── */}
        {step === "ai-generate" && (
          <StepAiGenerate
            isKo={isKo}
            featureType={featureType}
            config={{ refresh, theme: "dark", sizePreset, params }}
            onGenerated={handleAiGenerated}
          />
        )}

        {/* ── Step 3: 파라미터 설정 ── */}
        {step === "params" && selectedTemplate && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3" style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid var(--th-border)" }}>
              <span style={{ fontSize: 24 }}>{selectedTemplate.emoji}</span>
              <div>
                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)" }}>{isKo ? selectedTemplate.name_ko : selectedTemplate.name_en}</div>
                <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? selectedTemplate.desc_ko : selectedTemplate.desc_en}</div>
              </div>
            </div>

            {/* 공통 옵션 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? "이름" : "Name"}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 40))}
                  style={{ ...mono, fontSize: 11, padding: "5px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? "결과물" : "Output"}</label>
                <div className="flex gap-1">
                  {(["widget", "app"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFeatureType(t)}
                      style={{
                        ...mono, fontSize: 10, flex: 1, padding: "4px 0",
                        border: "1px solid",
                        borderColor: featureType === t ? "var(--th-border-accent)" : "var(--th-border)",
                        borderRadius: 4,
                        background: featureType === t ? "rgba(245,158,11,0.15)" : "transparent",
                        color: featureType === t ? "var(--th-accent)" : "var(--th-text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {t === "widget" ? (isKo ? "위젯" : "Widget") : (isKo ? "앱 창" : "App")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? "크기" : "Size"}</label>
                <div className="flex gap-1">
                  {(["sm", "md", "lg"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSizePreset(s)}
                      style={{
                        ...mono, fontSize: 10, flex: 1, padding: "4px 0",
                        border: "1px solid",
                        borderColor: sizePreset === s ? "var(--th-border-strong)" : "var(--th-border)",
                        borderRadius: 4,
                        background: sizePreset === s ? "rgba(255,255,255,0.08)" : "transparent",
                        color: sizePreset === s ? "var(--th-text-primary)" : "var(--th-text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {s === "sm" ? "소" : s === "md" ? "중" : "대"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>{isKo ? "새로고침" : "Refresh"}</label>
                <select
                  value={refresh}
                  onChange={(e) => setRefresh(e.target.value as CustomFeatureConfig["refresh"])}
                  style={{ ...mono, fontSize: 11, padding: "5px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none" }}
                >
                  {(["manual", "5s", "30s", "1m", "5m"] as const).map((r) => (
                    <option key={r} value={r}>{r === "manual" ? (isKo ? "수동" : "Manual") : r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 템플릿별 파라미터 */}
            {selectedTemplate.params.length > 0 && (
              <div className="flex flex-col gap-3">
                <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", borderBottom: "1px solid var(--th-border)", paddingBottom: 6 }}>
                  {isKo ? "템플릿 설정" : "Template Options"}
                </div>
                {selectedTemplate.params.map((p) => {
                  const inputStyle: React.CSSProperties = { ...mono, fontSize: 11, padding: "5px 8px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 4, color: "var(--th-text-primary)", outline: "none", width: "100%" };
                  const isOn = !!params[p.key];
                  return (
                    <div key={p.key} className="flex flex-col gap-1">
                      <label style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                        {isKo ? p.label_ko : p.label_en}
                        {p.required && <span style={{ color: "var(--th-accent)" }}> *</span>}
                      </label>
                      {p.type === "toggle" ? (
                        <button
                          type="button"
                          onClick={() => setParams((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "none", border: "none", cursor: "pointer", padding: 0,
                          }}
                        >
                          {/* visual switch */}
                          <span style={{
                            display: "inline-block", width: 36, height: 20, borderRadius: 10,
                            background: isOn ? "rgba(245,158,11,0.8)" : "var(--th-bg-elevated)",
                            border: `1px solid ${isOn ? "var(--th-accent)" : "var(--th-border)"}`,
                            position: "relative", transition: "background 0.15s",
                            flexShrink: 0,
                          }}>
                            <span style={{
                              position: "absolute", top: 2, left: isOn ? 17 : 2, width: 14, height: 14,
                              borderRadius: "50%", background: isOn ? "#fff" : "var(--th-text-muted)",
                              transition: "left 0.15s",
                            }} />
                          </span>
                          <span style={{ ...mono, fontSize: 10, color: isOn ? "var(--th-accent)" : "var(--th-text-muted)" }}>
                            {isOn ? "ON" : "OFF"}
                          </span>
                        </button>
                      ) : p.type === "select" ? (
                        <select
                          value={String(params[p.key] ?? p.defaultValue ?? "")}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          style={inputStyle}
                        >
                          {p.options?.map((o) => (
                            <option key={String(o.value)} value={String(o.value)}>
                              {isKo ? o.label_ko : o.label_en}
                            </option>
                          ))}
                        </select>
                      ) : p.type === "number" ? (
                        <input
                          type="number"
                          value={String(params[p.key] ?? p.defaultValue ?? "")}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))}
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          placeholder={p.placeholder}
                          style={inputStyle}
                        />
                      ) : p.type === "agent" ? (
                        <select
                          value={String(params[p.key] ?? "")}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          style={inputStyle}
                        >
                          <option value="">{isKo ? "에이전트 선택..." : "Select agent..."}</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {isKo ? (a.name_ko || a.name) : (a.name || a.name_ko)}
                            </option>
                          ))}
                        </select>
                      ) : p.multiline ? (
                        <textarea
                          value={String(params[p.key] ?? p.defaultValue ?? "")}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          rows={4}
                          placeholder={p.placeholder}
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(params[p.key] ?? p.defaultValue ?? "")}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          placeholder={p.placeholder}
                          style={inputStyle}
                        />
                      )}
                      {p.hint && (
                        <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.6, lineHeight: 1.4 }}>
                          {p.hint}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: 미리보기 ── */}
        {step === "preview" && previewFeature && (
          <div className="flex flex-col gap-4">
            <div
              style={{
                width: SIZE_PRESETS[sizePreset].w,
                height: SIZE_PRESETS[sizePreset].h,
                maxWidth: "100%",
                border: "1px solid var(--th-border)",
                borderRadius: 8,
                background: "var(--th-bg-elevated)",
                overflow: "hidden",
                alignSelf: "center",
              }}
            >
              <div style={{ ...mono, fontSize: 10, padding: "6px 10px", borderBottom: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-panel)" }}>
                {name || (isKo ? "이름 없음" : "Unnamed")}
              </div>
              <div style={{ height: "calc(100% - 33px)", overflow: "hidden" }}>
                <CustomFeatureRenderer feature={previewFeature} />
              </div>
            </div>
            <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "center" }}>
              {isKo ? `${featureType === "widget" ? "위젯" : "앱 창"}으로 등록됩니다` : `Will be registered as ${featureType === "widget" ? "widget" : "app window"}`}
            </div>
          </div>
        )}

      </ModalBody>

      <ModalFooter>
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
      </ModalFooter>
    </Modal>
  );
}
