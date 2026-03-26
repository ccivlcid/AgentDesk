import { useI18n } from "../../../i18n";
import type { FormData } from "../types";
import { AUTONOMY_LEVELS, AUTONOMY_LABEL } from "../constants";
import { agentFormSectionLabelStyle } from "./sectionStyles";

export function AgentFormModalPmSection({
  tr,
  form,
  setForm,
}: {
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const { t } = useI18n();

  const isPm = form.role === "team_leader";

  return (
    <div>
      <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <span style={agentFormSectionLabelStyle}>
          {t({ ko: "역량 설정", en: "CAPABILITIES", ja: "能力設定", zh: "能力设置" })}
        </span>
      </div>

      {/* PM info banner */}
      {isPm && (
        <div
          className="flex items-start gap-2 mb-4 px-3 py-2.5"
          style={{
            background: "var(--th-accent-bg)",
            border: "1px solid var(--th-accent-border-subtle)",
            borderRadius: 6,
            borderLeft: "3px solid var(--th-accent)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--th-accent)", flexShrink: 0, marginTop: 1 }}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <div>
            <div
              className="text-[11px] font-mono font-semibold mb-0.5"
              style={{ color: "var(--th-accent)" }}
            >
              {t({
                ko: "PM 에이전트",
                en: "PM Agent",
                ja: "PMエージェント",
                zh: "PM代理",
              })}
            </div>
            <div
              className="text-[10px] font-mono"
              style={{ color: "var(--th-text-muted)", lineHeight: 1.4 }}
            >
              {t({
                ko: "이 에이전트는 태스크를 배정하고 리뷰합니다. 직접 코딩하지 않습니다.",
                en: "This agent assigns and reviews tasks. Does not code directly.",
                ja: "このエージェントはタスクを配属しレビューします。直接コーディングしません。",
                zh: "此代理分配和审核任务。不直接编码。",
              })}
            </div>
          </div>
        </div>
      )}

      {/* Autonomy level */}
      <div className="mb-4">
        <label
          className="block text-xs mb-1.5 font-medium"
          style={{ color: "var(--th-text-secondary)" }}
        >
          {t({
            ko: "자율도",
            en: "Autonomy Level",
            ja: "自律度",
            zh: "自主级别",
          })}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {AUTONOMY_LEVELS.map((level) => {
            const active = (form.autonomy_level ?? "balanced") === level;
            const label = AUTONOMY_LABEL[level];
            return (
              <button
                key={level}
                type="button"
                onClick={() => setForm({ ...form, autonomy_level: level })}
                className="flex flex-col items-center px-2 py-2 text-[11px] font-mono border transition-all"
                style={{
                  borderRadius: 6,
                  ...(active
                    ? {
                        background: "var(--th-accent-glow)",
                        color: "var(--th-accent)",
                        borderColor: "var(--th-accent-border)",
                      }
                    : {
                        borderColor: "var(--th-border)",
                        color: "var(--th-text-muted)",
                      }),
                }}
              >
                <span className="font-semibold">
                  {t({
                    ko: label.ko,
                    en: label.en,
                    ja: label.ja,
                    zh: label.zh,
                  })}
                </span>
                <span
                  className="text-[9px] mt-0.5"
                  style={{ color: active ? "var(--th-accent)" : "var(--th-text-muted)", opacity: 0.7 }}
                >
                  {t({
                    ko: label.desc_ko,
                    en: label.desc_en,
                    ja: label.desc_en,
                    zh: label.desc_en,
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
