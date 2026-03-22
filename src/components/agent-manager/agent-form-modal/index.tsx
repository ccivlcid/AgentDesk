import { createPortal } from "react-dom";
import AppWindow from "../../windows/AppWindow";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui";
import { useI18n } from "../../../i18n";
import { AgentFormModalAdvancedSection } from "./AgentFormModalAdvancedSection";
import { AgentFormModalBasicSection } from "./AgentFormModalBasicSection";
import { AgentFormModalFooter } from "./AgentFormModalFooter";
import type { AgentFormModalProps } from "./types";
import { useAgentFormModalResources } from "./useAgentFormModalResources";

export default function AgentFormModal({
  isKo,
  locale,
  tr,
  form,
  setForm,
  departments,
  isEdit,
  saving,
  saveError,
  onSave,
  onClose,
  asWindow = false,
}: AgentFormModalProps) {
  const { t } = useI18n();
  const {
    generatingPersona,
    showPersonaCatalog,
    setShowPersonaCatalog,
    handleGeneratePersona,
  } = useAgentFormModalResources(form, setForm, isKo);

  const title = isEdit
    ? t({ ko: "에이전트 설정", en: "Agent Settings", ja: "エージェント設定", zh: "代理设置" })
    : t({ ko: "새 에이전트 등록", en: "Register New Agent", ja: "新規エージェント登録", zh: "注册新代理" });

  const formFields = (
    <div className="space-y-5">
      <AgentFormModalBasicSection tr={tr} locale={locale} form={form} setForm={setForm} departments={departments} />
      <AgentFormModalAdvancedSection
        tr={tr}
        form={form}
        setForm={setForm}
        isKo={isKo}
        generatingPersona={generatingPersona}
        handleGeneratePersona={handleGeneratePersona}
        showPersonaCatalog={showPersonaCatalog}
        setShowPersonaCatalog={setShowPersonaCatalog}
      />
    </div>
  );

  const footerButtons = (
    <AgentFormModalFooter
      tr={tr}
      saveError={saveError}
      onClose={onClose}
      onSave={onSave}
      saving={saving}
      form={form}
      isEdit={isEdit}
    />
  );

  if (asWindow) {
    return createPortal(
      <AppWindow
        windowType="create-agent"
        title={title}
        emoji={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
        defaultWidth={720}
        defaultHeight={680}
        defaultX={Math.max(0, Math.round((window.innerWidth - 720) / 2))}
        defaultY={Math.max(44, Math.round((window.innerHeight - 680) / 2))}
        onClose={onClose}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", fontFamily: "var(--th-font-mono)" }}>
            {formFields}
          </div>
          <div
            style={{
              borderTop: "1px solid var(--th-border)",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: 8,
              flexShrink: 0,
              fontFamily: "var(--th-font-mono)",
              background: "var(--th-bg-surface)",
            }}
          >
            {footerButtons}
          </div>
        </div>
      </AppWindow>,
      document.body,
    );
  }

  return (
    <Modal open onClose={onClose} width="lg">
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      <ModalBody>{formFields}</ModalBody>
      <ModalFooter>{footerButtons}</ModalFooter>
    </Modal>
  );
}
