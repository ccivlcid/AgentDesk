import type { FormData } from "../types";
import { AgentFormModalCliBlock } from "./AgentFormModalCliBlock";
import { AgentFormModalPersonaBlock } from "./AgentFormModalPersonaBlock";
import { AgentFormModalPmSection } from "./AgentFormModalPmSection";
import { agentFormSectionLabelStyle } from "./sectionStyles";

export function AgentFormModalAdvancedSection({
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
    <div>
      {/* PM Orchestration section - always shown */}
      <AgentFormModalPmSection tr={tr} form={form} setForm={setForm} />

      {/* CLI settings */}
      <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <span style={agentFormSectionLabelStyle}>ADVANCED</span>
      </div>

      <AgentFormModalCliBlock tr={tr} form={form} setForm={setForm} />

      <AgentFormModalPersonaBlock
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
}
