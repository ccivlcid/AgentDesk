import { getPersonaById } from "../../../data/personas";
import { PersonaCatalog } from "../../agent-persona/PersonaCatalog";
import { Button, Textarea } from "../../ui";
import type { FormData } from "../types";

export function AgentFormModalPersonaBlock({
  tr,
  form,
  setForm,
  isKo,
  generatingPersona,
  handleGeneratePersona,
  showPersonaCatalog,
  setShowPersonaCatalog,
}: {
  tr: (ko: string, en: string) => string;
  form: FormData;
  setForm: (f: FormData) => void;
  isKo: boolean;
  generatingPersona: boolean;
  handleGeneratePersona: () => void;
  showPersonaCatalog: boolean;
  setShowPersonaCatalog: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium" style={{ color: "var(--th-text-secondary)" }}>
            {tr("캐릭터 페르소나", "Character Persona")}
          </label>
          {form.name && (
            <Button
              variant="secondary"
              size="sm"
              disabled={generatingPersona || !form.name.trim()}
              onClick={handleGeneratePersona}
              style={{ borderColor: "var(--th-accent-border)", background: "var(--th-accent-glow)", color: "var(--th-accent)" }}
            >
              {generatingPersona
                ? tr("생성 중...", "Generating...")
                : form.personality
                  ? tr("AI 재생성", "AI Regenerate")
                  : tr("AI 자동생성", "AI Generate")}
            </Button>
          )}
        </div>
        <Textarea
          value={form.personality}
          onChange={(e) => setForm({ ...form, personality: e.target.value })}
          rows={4}
          placeholder={
            isKo
              ? "예: 나는 제갈량, 천하삼분지계의 전략가다. 항상 세 수 앞을 내다보고, '상중하 세 가지 전략'을 제시하는 것이 습관이다. 고사성어와 역사적 비유로 논점을 풀어내고, 은유적이지만 결론은 명쾌하다..."
              : "e.g. I am Ada Lovelace, the world's first programmer. I approach problems by grasping the underlying structure first. I speak with Victorian formality, combining technical rigor with poetic expression..."
          }
        />
        <p className="text-[10px] mt-1" style={{ color: "var(--th-text-muted)" }}>
          {tr(
            "말투, 사고방식, 입버릇, 습관 등을 구체적으로 작성하면 AI가 그 인물처럼 행동합니다.",
            "Define speech patterns, thinking style, catchphrases, and habits for the AI to embody this character.",
          )}
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--th-border)" }}>
        <button
          type="button"
          onClick={() => setShowPersonaCatalog((v) => !v)}
          className="flex w-full items-center justify-between py-2"
          style={{ borderLeft: "3px solid var(--th-accent)", paddingLeft: "0.5rem" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest font-mono"
              style={{ color: "var(--th-text-muted)" }}
            >
              {tr("유명인 페르소나", "Famous Persona")}
            </span>
            {form.persona_id &&
              (() => {
                const p = getPersonaById(form.persona_id);
                return p ? (
                  <span
                    className="font-mono text-[9px] font-semibold uppercase"
                    style={{
                      color: p.color,
                      border: `1px solid ${p.color}40`,
                      borderRadius: 6,
                      padding: "0 4px",
                      background: `${p.color}12`,
                    }}
                  >
                    {p.badge}
                  </span>
                ) : null;
              })()}
          </div>
          <span
            className="font-mono text-[10px]"
            style={{
              color: "var(--th-text-muted)",
              transform: showPersonaCatalog ? "rotate(90deg)" : "rotate(0deg)",
              display: "inline-block",
              transition: "transform 0.1s linear",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6,3 20,12 6,21"/></svg>
          </span>
        </button>
        {showPersonaCatalog && (
          <div className="mt-3">
            <PersonaCatalog
              selectedId={form.persona_id ?? ""}
              onSelect={(id) => setForm({ ...form, persona_id: id || undefined })}
            />
            <p className="mt-2 text-[10px]" style={{ color: "var(--th-text-muted)" }}>
              {tr(
                "유명인의 사고방식과 철학이 AI 시스템 프롬프트에 주입됩니다.",
                "The selected persona's philosophy is injected into the AI system prompt.",
              )}
            </p>
          </div>
        )}
      </div>

    </>
  );
}
