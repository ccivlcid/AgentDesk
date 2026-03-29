import { useState, useCallback } from "react";
import { useI18n } from "../../i18n";
import { useAgentStore } from "../../store/agentStore";
import * as api from "../../api";
import AgentFormModal from "./AgentFormModal";
import { BLANK } from "./constants";
import type { FormData } from "./types";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function QuickCreateAgentModal({ onClose, onCreated }: Props) {
  const { departments } = useAgentStore();
  const { locale } = useI18n();
  const isKo = locale.startsWith("ko");
  const tr = (ko: string, en: string) => (isKo ? ko : en);

  const [form, setForm] = useState<FormData>({
    ...BLANK,
    department_id: departments[0]?.id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const departmentId = form.department_id.trim();
      const payload = {
        name: form.name.trim(),
        role: form.role,
        cli_provider: form.cli_provider,
        api_provider_id: form.api_provider_id || null,
        api_model: form.api_model?.trim() || null,
        avatar_emoji: form.avatar_emoji || "🤖",
        sprite_number: form.sprite_number,
        personality: form.personality.trim() || null,
        persona_id: form.persona_id || null,
        department_id: departmentId || null,
      };
      const created = await api.createAgent(payload);
      if (form.pendingAvatarDataUrl) {
        await api.uploadAgentAvatar(created.id, form.pendingAvatarDataUrl).catch(() => {});
      }
      onCreated();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [form, onClose, onCreated]);

  return (
    <AgentFormModal
      isKo={isKo}
      locale={locale}
      tr={tr}
      form={form}
      setForm={setForm}
      departments={departments}
      isEdit={false}
      saving={saving}
      saveError={saveError}
      onSave={handleSave}
      onClose={onClose}
      asWindow={true}
    />
  );
}
