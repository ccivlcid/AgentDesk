import { useCallback, useState } from "react";
import * as api from "../../../api";
import { useI18n } from "../../../i18n";
import { useToast } from "../../ui";
import type { FormData } from "../types";

export function useAgentFormModalResources(
  form: FormData,
  setForm: (f: FormData) => void,
  isKo: boolean,
) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const [showPersonaCatalog, setShowPersonaCatalog] = useState(false);

  const handleGeneratePersona = useCallback(async () => {
    if (!form.name.trim() || generatingPersona) return;
    setGeneratingPersona(true);
    try {
      const personality = await api.generatePersona({
        name: form.name.trim(),
        role: form.role,
        department_id: form.department_id || null,
        lang: isKo ? "ko" : "en",
      });
      if (personality) setForm({ ...form, personality });
    } catch (err) {
      console.error("Persona generation failed:", err);
      showToast(
        t({
          ko: "페르소나 생성에 실패했습니다.",
          en: "Failed to generate persona.",
          ja: "ペルソナ生成に失敗しました。",
          zh: "人物角色生成失败。",
        }),
        "error",
      );
    } finally {
      setGeneratingPersona(false);
    }
  }, [form, isKo, generatingPersona, setForm, showToast, t]);

  return {
    generatingPersona,
    showPersonaCatalog,
    setShowPersonaCatalog,
    handleGeneratePersona,
  };
}
