import { createPortal } from "react-dom";
import AppWindow from "../../windows/AppWindow";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../ui";
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
  const {
    generatingPersona,
    showPersonaCatalog,
    setShowPersonaCatalog,
    apiProviders,
    setApiProviders,
    localModels,
    connectingLocal,
    setConnectingLocal,
    handleGeneratePersona,
  } = useAgentFormModalResources(form, setForm, isKo);

  const title = isEdit ? tr("직원 정보 수정", "Edit Agent") : tr("신규 직원 채용", "Hire New Agent");

  const formFields = (
    <div className="space-y-5">
      <AgentFormModalBasicSection tr={tr} locale={locale} form={form} setForm={setForm} departments={departments} />
      <AgentFormModalAdvancedSection
        tr={tr}
        form={form}
        setForm={setForm}
        isKo={isKo}
        apiProviders={apiProviders}
        setApiProviders={setApiProviders}
        localModels={localModels}
        connectingLocal={connectingLocal}
        setConnectingLocal={setConnectingLocal}
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
        emoji="👤"
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
