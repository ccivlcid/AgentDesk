import type { FormData } from "../types";
import { AgentFormModalCliBlock } from "./AgentFormModalCliBlock";
import { AgentFormModalPersonaBlock } from "./AgentFormModalPersonaBlock";
import { AgentFormModalProviderBlocks } from "./AgentFormModalProviderBlocks";
import { agentFormSectionLabelStyle } from "./sectionStyles";
import type { ApiProviderOption } from "./types";
import type { LocalModelOption } from "./useAgentFormModalResources";

export function AgentFormModalAdvancedSection({
  tr,
  form,
  setForm,
  isKo,
  apiProviders,
  setApiProviders,
  localModels,
  connectingLocal,
  setConnectingLocal,
  generatingPersona,
  handleGeneratePersona,
  showPersonaCatalog,
  setShowPersonaCatalog,
}: {
  tr: (ko: string, en: string) => string;
  form: FormData;
  setForm: (f: FormData) => void;
  isKo: boolean;
  apiProviders: ApiProviderOption[];
  setApiProviders: (p: ApiProviderOption[]) => void;
  localModels: LocalModelOption[];
  connectingLocal: boolean;
  setConnectingLocal: (v: boolean) => void;
  generatingPersona: boolean;
  handleGeneratePersona: () => void;
  showPersonaCatalog: boolean;
  setShowPersonaCatalog: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
  return (
    <div>
      <div className="mb-3 pb-1" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <span style={agentFormSectionLabelStyle}>ADVANCED</span>
      </div>

      <AgentFormModalCliBlock tr={tr} form={form} setForm={setForm} />

      <AgentFormModalProviderBlocks
        form={form}
        setForm={setForm}
        apiProviders={apiProviders}
        setApiProviders={setApiProviders}
        localModels={localModels}
        connectingLocal={connectingLocal}
        setConnectingLocal={setConnectingLocal}
      />

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
