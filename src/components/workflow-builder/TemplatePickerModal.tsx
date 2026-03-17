import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BUILTIN_PRESETS, type BuiltinPreset } from "./presets/design-workflow";
import { useI18n } from "../../i18n";

interface TemplatePickerModalProps {
  onSelect: (preset: BuiltinPreset, figmaUrl: string) => void;
  onClose: () => void;
}

const mono = "var(--th-font-mono)";

function PresetCategoryIcon({ category }: { category: string }) {
  if (category === "design") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="var(--th-accent)" opacity="0.85" />
        <rect x="7.5" y="1" width="5.5" height="5.5" rx="1" fill="var(--th-accent)" opacity="0.45" />
        <rect x="1" y="7.5" width="5.5" height="5.5" rx="1" fill="var(--th-accent)" opacity="0.45" />
        <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" fill="var(--th-accent)" opacity="0.25" />
      </svg>
    );
  }
  if (category === "development") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
        <polyline points="3,4.5 1,7 3,9.5" stroke="var(--th-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <polyline points="11,4.5 13,7 11,9.5" stroke="var(--th-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <line x1="8.5" y1="2" x2="5.5" y2="12" stroke="var(--th-accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </svg>
    );
  }
  if (category === "analysis") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
        <rect x="1" y="8" width="2.5" height="5" rx="0.5" fill="var(--th-accent)" opacity="0.5" />
        <rect x="5" y="5" width="2.5" height="8" rx="0.5" fill="var(--th-accent)" opacity="0.7" />
        <rect x="9" y="2" width="2.5" height="11" rx="0.5" fill="var(--th-accent)" opacity="0.9" />
        <line x1="1" y1="1" x2="13" y2="1" stroke="var(--th-border)" strokeWidth="0.5" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="var(--th-accent)" strokeWidth="1.4" opacity="0.7" />
      <line x1="4" y1="7" x2="10" y2="7" stroke="var(--th-accent)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

const CATEGORIES = ["all", "design", "development", "analysis", "general"] as const;
type Category = (typeof CATEGORIES)[number];

export default function TemplatePickerModal({ onSelect, onClose }: TemplatePickerModalProps) {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [selectedPreset, setSelectedPreset] = useState<BuiltinPreset | null>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaUrlError, setFigmaUrlError] = useState(false);

  const filtered = BUILTIN_PRESETS.filter(
    (p) => activeCategory === "all" || p.category === activeCategory,
  );

  function handleConfirm() {
    if (!selectedPreset) return;
    if (selectedPreset.figma_required) {
      const valid = /figma\.com\/(?:design|file)\/[^/?#]+/.test(figmaUrl.trim());
      if (!figmaUrl.trim() || !valid) {
        setFigmaUrlError(true);
        return;
      }
    }
    onSelect(selectedPreset, figmaUrl.trim());
  }

  const categoryLabel = (cat: Category) => {
    const map: Record<Category, ReturnType<typeof t>> = {
      all: t({ ko: "전체", en: "All", ja: "すべて", zh: "全部" }),
      design: t({ ko: "디자인", en: "Design", ja: "デザイン", zh: "设计" }),
      development: t({ ko: "개발", en: "Development", ja: "開発", zh: "开发" }),
      analysis: t({ ko: "분석", en: "Analysis", ja: "分析", zh: "分析" }),
      general: t({ ko: "일반", en: "General", ja: "一般", zh: "通用" }),
    };
    return map[cat];
  };

  return (
    <AnimatePresence>
      <>
        {/* 백드롭 */}
        <motion.div
          key="tpm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "linear" }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)",
          }}
        />

        {/* 모달 */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 1201,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <motion.div
            key="tpm-modal"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 480, maxHeight: "80vh",
              background: "var(--th-bg-elevated)",
              border: "1px solid var(--th-border)",
              borderRadius: 10,
              overflow: "hidden",
              pointerEvents: "auto",
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px 10px",
              borderBottom: "1px solid var(--th-border)",
              background: "var(--th-bg-panel)",
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                // {t({ ko: "템플릿으로 시작", en: "Start from Template", ja: "テンプレートから開始", zh: "从模板开始" })}
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontFamily: mono, fontSize: 11, background: "none", border: "none",
                  color: "var(--th-text-muted)", cursor: "pointer", padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* 카테고리 탭 */}
            <div style={{
              display: "flex", gap: 0,
              borderBottom: "1px solid var(--th-border)",
              flexShrink: 0,
            }}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      fontFamily: mono, fontSize: 9, fontWeight: isActive ? 700 : 500,
                      padding: "6px 12px",
                      border: "none", borderBottom: isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
                      background: "transparent",
                      color: isActive ? "var(--th-accent)" : "var(--th-text-muted)",
                      cursor: "pointer",
                      letterSpacing: "0.05em", textTransform: "uppercase",
                    }}
                  >
                    {categoryLabel(cat)}
                  </button>
                );
              })}
            </div>

            {/* 프리셋 목록 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.length === 0 && (
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 24 }}>
                  {t({ ko: "해당 카테고리에 템플릿이 없습니다", en: "No templates in this category", ja: "このカテゴリにはテンプレートがありません", zh: "此类别中没有模板" })}
                </div>
              )}
              {filtered.map((preset) => {
                const isSelected = selectedPreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => { setSelectedPreset(preset); setFigmaUrlError(false); }}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      border: `1px solid ${isSelected ? "var(--th-border-accent)" : "var(--th-border)"}`,
                      background: isSelected ? "rgba(245,158,11,0.07)" : "var(--th-bg-surface)",
                      borderRadius: 0,
                      cursor: "pointer",
                      transition: "border-color 0.1s, background 0.1s",
                    }}
                  >
                    {/* 아이콘 + 이름 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <PresetCategoryIcon category={preset.category} />
                      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: isSelected ? "var(--th-accent)" : "var(--th-text-primary)" }}>
                        {t({ ko: preset.name_ko, en: preset.name, ja: preset.name, zh: preset.name })}
                      </span>
                      {preset.figma_required && (
                        <span style={{ fontFamily: mono, fontSize: 8, padding: "1px 5px", border: "1px solid var(--th-border-accent)", color: "var(--th-accent)", borderRadius: 2 }}>
                          Figma
                        </span>
                      )}
                    </div>
                    {/* 설명 */}
                    <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginBottom: 6 }}>
                      {t({ ko: preset.description_ko, en: preset.description, ja: preset.description, zh: preset.description })}
                    </div>
                    {/* 단계 배지 */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {preset.steps.map((step) => (
                        <span key={step} style={{
                          fontFamily: mono, fontSize: 8,
                          padding: "1px 5px", borderRadius: 0,
                          border: "1px solid var(--th-border)",
                          color: "var(--th-text-muted)",
                        }}>
                          {step}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Figma URL 입력 (figma_required && 선택됨) */}
            {selectedPreset?.figma_required && (
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid var(--th-border)",
                flexShrink: 0,
              }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  // figma design url
                </div>
                <input
                  type="url"
                  placeholder="https://www.figma.com/design/..."
                  value={figmaUrl}
                  onChange={(e) => { setFigmaUrl(e.target.value); setFigmaUrlError(false); }}
                  style={{
                    fontFamily: mono, width: "100%", fontSize: "10px",
                    padding: "5px 8px",
                    background: "var(--th-bg-surface)",
                    border: `1px solid ${figmaUrlError ? "#ff453a" : "var(--th-border)"}`,
                    borderRadius: 0,
                    color: "var(--th-text-primary)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {figmaUrlError && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: "#ff453a", marginTop: 3 }}>
                    {t({ ko: "올바른 Figma URL을 입력하세요", en: "Enter a valid Figma URL", ja: "有効なFigma URLを入力してください", zh: "请输入有效的Figma URL" })}
                  </div>
                )}
              </div>
            )}

            {/* 하단 버튼 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
              padding: "10px 16px",
              borderTop: "1px solid var(--th-border)",
              background: "var(--th-bg-panel)",
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontFamily: mono, fontSize: 10, padding: "5px 14px",
                  background: "transparent", border: "1px solid var(--th-border)",
                  borderRadius: 0, color: "var(--th-text-muted)", cursor: "pointer",
                }}
              >
                {t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedPreset}
                style={{
                  fontFamily: mono, fontSize: 11, fontWeight: 700,
                  padding: "5px 20px",
                  background: selectedPreset ? "var(--th-accent)" : "var(--th-bg-surface)",
                  border: "none", borderRadius: 0,
                  color: selectedPreset ? "var(--th-bg-primary)" : "var(--th-text-muted)",
                  cursor: selectedPreset ? "pointer" : "not-allowed",
                  transition: "background 0.1s",
                }}
              >
                {t({ ko: "이 템플릿 사용", en: "Use Template", ja: "このテンプレートを使用", zh: "使用此模板" })}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
}
