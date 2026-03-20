import { Button } from "../../ui";
import type { FormData } from "../types";

export function AgentFormModalFooter({
  tr,
  saveError,
  onClose,
  onSave,
  saving,
  form,
  isEdit,
}: {
  tr: (ko: string, en: string) => string;
  saveError?: string | null;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  form: FormData;
  isEdit: boolean;
}) {
  return (
    <>
      {saveError && (
        <p style={{ color: "var(--th-error, #ef4444)", fontSize: 12, flex: "1 1 100%", margin: "0 0 6px" }}>
          {saveError}
        </p>
      )}
      <Button variant="secondary" onClick={onClose}>
        {tr("취소", "Cancel")}
      </Button>
      <Button variant="primary" onClick={onSave} disabled={saving || !form.name.trim()} className="flex-1">
        {saving
          ? tr("처리 중...", "Saving...")
          : isEdit
            ? tr("변경사항 저장", "Save Changes")
            : tr("채용 확정", "Confirm Hire")}
      </Button>
    </>
  );
}
