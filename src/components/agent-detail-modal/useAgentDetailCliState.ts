import { useCallback, useEffect, useMemo, useState } from "react";
import type { OAuthAccountInfo, OAuthStatus } from "../../api/messaging-runtime-oauth";
import * as api from "../../api";
import type { I18nContextValue } from "../../i18n";
import type { Agent, CliModelInfo } from "../../types";
import { CLI_MODEL_OVERRIDE_PROVIDERS, CODEX_REASONING_FALLBACK_OPTIONS } from "./constants";

export interface UseAgentDetailCliStateResult {
  editingCli: boolean;
  setEditingCli: (v: boolean) => void;
  selectedCli: Agent["cli_provider"];
  setSelectedCli: (v: Agent["cli_provider"]) => void;
  selectedOAuthAccountId: string;
  setSelectedOAuthAccountId: (v: string) => void;
  selectedApiProviderId: string;
  setSelectedApiProviderId: (v: string) => void;
  selectedApiModel: string;
  setSelectedApiModel: (v: string) => void;
  selectedCliModel: string;
  setSelectedCliModel: (v: string) => void;
  selectedCliReasoningLevel: string;
  setSelectedCliReasoningLevel: (v: string) => void;
  savingCli: boolean;
  oauthLoading: boolean;
  cliModelsLoading: boolean;
  activeOAuthAccounts: OAuthAccountInfo[];
  requiresOAuthAccount: boolean;
  requiresApiProvider: boolean;
  supportsCliModelOverride: boolean;
  selectedCliModelOptions: CliModelInfo[];
  codexReasoningOptions: { effort: string; description?: string }[];
  canSaveCli: boolean;
  getReasoningDescription: (effort: string, fallback?: string) => string;
  handleSaveCli: () => Promise<void>;
  handleCancelCliEdit: () => void;
}

export function useAgentDetailCliState(
  agent: Agent,
  onAgentUpdated: (() => void) | undefined,
  t: I18nContextValue["t"],
): UseAgentDetailCliStateResult {
  const [editingCli, setEditingCli] = useState(false);
  const [selectedCli, setSelectedCli] = useState(agent.cli_provider);
  const [selectedOAuthAccountId, setSelectedOAuthAccountId] = useState(agent.oauth_account_id ?? "");
  const [selectedApiProviderId, setSelectedApiProviderId] = useState(agent.api_provider_id ?? "");
  const [selectedApiModel, setSelectedApiModel] = useState(agent.api_model ?? "");
  const [selectedCliModel, setSelectedCliModel] = useState(agent.cli_model ?? "");
  const [selectedCliReasoningLevel, setSelectedCliReasoningLevel] = useState(agent.cli_reasoning_level ?? "");
  const [savingCli, setSavingCli] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [cliModels, setCliModels] = useState<Record<string, CliModelInfo[]>>({});
  const [cliModelsLoading, setCliModelsLoading] = useState(false);

  const oauthProviderKey =
    selectedCli === "copilot" ? "github-copilot" : selectedCli === "antigravity" ? "antigravity" : null;
  const activeOAuthAccounts = useMemo(() => {
    if (!oauthProviderKey || !oauthStatus) return [];
    return (oauthStatus.providers[oauthProviderKey]?.accounts ?? []).filter(
      (account) => account.active && account.status === "active",
    );
  }, [oauthProviderKey, oauthStatus]);
  const requiresOAuthAccount = selectedCli === "copilot" || selectedCli === "antigravity";
  const requiresApiProvider = selectedCli === "api";
  const supportsCliModelOverride = CLI_MODEL_OVERRIDE_PROVIDERS.includes(selectedCli);
  const selectedCliModelOptions = useMemo(() => cliModels[selectedCli] ?? [], [cliModels, selectedCli]);
  const selectedCliModelMeta = useMemo(
    () => selectedCliModelOptions.find((model) => model.slug === selectedCliModel),
    [selectedCliModelOptions, selectedCliModel],
  );
  const codexReasoningOptions = useMemo(() => {
    if (selectedCli !== "codex") return [];
    if (selectedCliModelMeta?.reasoningLevels && selectedCliModelMeta.reasoningLevels.length > 0) {
      return selectedCliModelMeta.reasoningLevels;
    }
    return CODEX_REASONING_FALLBACK_OPTIONS;
  }, [selectedCli, selectedCliModelMeta]);
  const canSaveCli = requiresApiProvider ? false : !requiresOAuthAccount || Boolean(selectedOAuthAccountId);

  const getReasoningDescription = useCallback(
    (effort: string, fallback?: string) => {
      switch (effort) {
        case "low":
          return t({ ko: "빠름, 낮은 깊이", en: "Faster, lower depth", ja: "高速・浅い推論", zh: "更快，较浅推理" });
        case "medium":
          return t({ ko: "균형 기본값", en: "Balanced default", ja: "バランス既定", zh: "均衡默认" });
        case "high":
          return t({ ko: "높은 추론 깊이", en: "Higher reasoning depth", ja: "高い推論深度", zh: "更高推理深度" });
        case "xhigh":
          return t({
            ko: "최대 추론 깊이",
            en: "Maximum reasoning depth",
            ja: "最大推論深度",
            zh: "最高推理深度",
          });
        default:
          return fallback || "";
      }
    },
    [t],
  );

  useEffect(() => {
    setSelectedCli(agent.cli_provider);
    setSelectedOAuthAccountId(agent.oauth_account_id ?? "");
    setSelectedApiProviderId(agent.api_provider_id ?? "");
    setSelectedApiModel(agent.api_model ?? "");
    setSelectedCliModel(agent.cli_model ?? "");
    setSelectedCliReasoningLevel(agent.cli_reasoning_level ?? "");
  }, [
    agent.id,
    agent.cli_provider,
    agent.oauth_account_id,
    agent.api_provider_id,
    agent.api_model,
    agent.cli_model,
    agent.cli_reasoning_level,
  ]);

  useEffect(() => {
    if (!editingCli || !requiresOAuthAccount) return;
    setOauthLoading(true);
    api
      .getOAuthStatus()
      .then(setOauthStatus)
      .catch((err) => console.error("Failed to load OAuth status:", err))
      .finally(() => setOauthLoading(false));
  }, [editingCli, requiresOAuthAccount]);

  useEffect(() => {
    if (!editingCli || !supportsCliModelOverride || Object.keys(cliModels).length > 0) return;
    let cancelled = false;
    setCliModelsLoading(true);
    api
      .getCliModels()
      .then((models) => {
        if (cancelled) return;
        setCliModels(models);
      })
      .catch((err) => console.error("Failed to load CLI models:", err))
      .finally(() => {
        if (!cancelled) setCliModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingCli, supportsCliModelOverride, cliModels]);

  useEffect(() => {
    if (!requiresOAuthAccount) {
      if (selectedOAuthAccountId) setSelectedOAuthAccountId("");
      return;
    }
    if (activeOAuthAccounts.length === 0) return;
    if (!selectedOAuthAccountId || !activeOAuthAccounts.some((account) => account.id === selectedOAuthAccountId)) {
      setSelectedOAuthAccountId(activeOAuthAccounts[0].id);
    }
  }, [requiresOAuthAccount, activeOAuthAccounts, selectedOAuthAccountId]);

  useEffect(() => {
    if (!supportsCliModelOverride && selectedCliModel) {
      setSelectedCliModel("");
    }
  }, [supportsCliModelOverride, selectedCliModel]);

  useEffect(() => {
    if (selectedCli !== "codex" && selectedCliReasoningLevel) {
      setSelectedCliReasoningLevel("");
      return;
    }
    if (selectedCli === "codex" && selectedCliReasoningLevel) {
      const isValid = codexReasoningOptions.some((level) => level.effort === selectedCliReasoningLevel);
      if (!isValid) setSelectedCliReasoningLevel("");
    }
  }, [selectedCli, selectedCliReasoningLevel, codexReasoningOptions]);

  const handleSaveCli = useCallback(async () => {
    setSavingCli(true);
    try {
      await api.updateAgent(agent.id, {
        cli_provider: selectedCli,
        oauth_account_id: requiresOAuthAccount ? selectedOAuthAccountId || null : null,
        api_provider_id: requiresApiProvider ? selectedApiProviderId || null : null,
        api_model: requiresApiProvider ? selectedApiModel || null : null,
        cli_model: supportsCliModelOverride ? selectedCliModel || null : null,
        cli_reasoning_level: selectedCli === "codex" ? selectedCliReasoningLevel || null : null,
      });
      onAgentUpdated?.();
      setEditingCli(false);
    } catch (error) {
      console.error("Failed to update CLI:", error);
    } finally {
      setSavingCli(false);
    }
  }, [
    agent.id,
    selectedCli,
    requiresOAuthAccount,
    selectedOAuthAccountId,
    requiresApiProvider,
    selectedApiProviderId,
    selectedApiModel,
    supportsCliModelOverride,
    selectedCliModel,
    selectedCliReasoningLevel,
    onAgentUpdated,
  ]);

  const handleCancelCliEdit = useCallback(() => {
    setEditingCli(false);
    setSelectedCli(agent.cli_provider);
    setSelectedOAuthAccountId(agent.oauth_account_id ?? "");
    setSelectedApiProviderId(agent.api_provider_id ?? "");
    setSelectedApiModel(agent.api_model ?? "");
    setSelectedCliModel(agent.cli_model ?? "");
    setSelectedCliReasoningLevel(agent.cli_reasoning_level ?? "");
  }, [
    agent.cli_provider,
    agent.oauth_account_id,
    agent.api_provider_id,
    agent.api_model,
    agent.cli_model,
    agent.cli_reasoning_level,
  ]);

  return {
    editingCli,
    setEditingCli,
    selectedCli,
    setSelectedCli,
    selectedOAuthAccountId,
    setSelectedOAuthAccountId,
    selectedApiProviderId,
    setSelectedApiProviderId,
    selectedApiModel,
    setSelectedApiModel,
    selectedCliModel,
    setSelectedCliModel,
    selectedCliReasoningLevel,
    setSelectedCliReasoningLevel,
    savingCli,
    oauthLoading,
    cliModelsLoading,
    activeOAuthAccounts,
    requiresOAuthAccount,
    requiresApiProvider,
    supportsCliModelOverride,
    selectedCliModelOptions,
    codexReasoningOptions,
    canSaveCli,
    getReasoningDescription,
    handleSaveCli,
    handleCancelCliEdit,
  };
}
