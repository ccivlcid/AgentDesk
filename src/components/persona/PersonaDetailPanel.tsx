import type { Persona } from "../../types";

interface PersonaDetailPanelProps {
  persona: Persona;
}

const CATEGORY_LABEL: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  tech:      { ko: "기술 혁신", en: "Tech Innovation", ja: "技術革新",   zh: "技术创新" },
  biz:       { ko: "비즈니스",  en: "Business",        ja: "ビジネス",   zh: "商业" },
  creative:  { ko: "크리에이티브", en: "Creative",     ja: "クリエイティブ", zh: "创意" },
  investor:  { ko: "투자",      en: "Investor",        ja: "投資家",     zh: "投资" },
  scientist: { ko: "연구",      en: "Scientist",       ja: "研究者",     zh: "研究" },
  operator:  { ko: "운영",      en: "Operator",        ja: "オペレーター", zh: "运营" },
};

export default function PersonaDetailPanel({ persona }: PersonaDetailPanelProps) {
  const categoryLabel = CATEGORY_LABEL[persona.category];

  // Build a sentence from style_keywords
  const stylePhrase = persona.style_keywords.join(", ");

  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{
        borderLeft: `3px solid ${persona.accent_color}`,
        background: `${persona.accent_color}08`,
        border: `1px solid ${persona.accent_color}30`,
        borderLeftWidth: 3,
        borderLeftColor: persona.accent_color,
        borderRadius: 10,
        fontFamily: "var(--th-font-mono)",
      }}
    >
      {/* 인물명 + 카테고리 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div
            className="text-sm font-bold"
            style={{ color: persona.accent_color }}
          >
            {persona.name}
          </div>
          <div
            className="text-[10px] mt-0.5 uppercase tracking-widest"
            style={{ color: "var(--th-text-muted)" }}
          >
            {categoryLabel?.en ?? persona.category}
          </div>
        </div>
        <span
          className="text-[9px] px-2 py-1 font-mono shrink-0"
          style={{
            background: `${persona.accent_color}18`,
            color: persona.accent_color,
            border: `1px solid ${persona.accent_color}40`,
          }}
        >
          {persona.icon ?? "✦"}
        </span>
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: `${persona.accent_color}30` }} />

      {/* style_keywords 전체 */}
      <div>
        <div
          className="text-[9px] uppercase font-bold tracking-widest mb-1.5"
          style={{ color: "var(--th-text-muted)" }}
        >
          // STYLE KEYWORDS
        </div>
        <div className="flex flex-wrap gap-1">
          {persona.style_keywords.map((keyword) => (
            <span
              key={keyword}
              className="text-[10px] px-2 py-0.5 font-mono"
              style={{
                background: `${persona.accent_color}15`,
                color: persona.accent_color,
                border: `1px solid ${persona.accent_color}35`,
              }}
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      {/* best_for 태그 */}
      <div>
        <div
          className="text-[9px] uppercase font-bold tracking-widest mb-1.5"
          style={{ color: "var(--th-text-muted)" }}
        >
          // BEST FOR
        </div>
        <div className="flex flex-wrap gap-1">
          {persona.best_for.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 font-mono"
              style={{
                background: "var(--th-bg-elevated)",
                color: "var(--th-text-secondary)",
                border: "1px solid var(--th-border)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* "이 방식으로 작업합니다" 설명 섹션 */}
      <div>
        <div
          className="text-[9px] uppercase font-bold tracking-widest mb-1.5"
          style={{ color: "var(--th-text-muted)" }}
        >
          // THINKING STYLE
        </div>
        <div
          className="text-[11px] leading-relaxed"
          style={{ color: "var(--th-text-secondary)" }}
        >
          {persona.description_ko
            ? persona.description_ko
            : persona.description
              ? persona.description
              : `${stylePhrase}의 방식으로 작업합니다.`}
        </div>
      </div>
    </div>
  );
}
