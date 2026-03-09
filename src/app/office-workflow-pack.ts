import type { WorkflowPackKey } from "../types";

export type { OfficePackSeedProvider, OfficePackStarterAgentDraft, UiLanguageLike } from "./office-workflow-pack/types";

export {
  buildOfficePackPresentation,
  getBuiltinPackList,
  getOfficePackMeta,
  getOfficePackRoomThemes,
  listOfficePackOptions,
} from "./office-workflow-pack/presentation";

export {
  buildOfficePackStarterAgents,
  resolveOfficePackSeedProvider,
} from "./office-workflow-pack/starter";

/**
 * Validates and normalizes an unknown value to a valid WorkflowPackKey.
 * Returns "development" for empty/invalid strings.
 */
export function normalizeOfficeWorkflowPack(value: unknown): WorkflowPackKey {
  if (typeof value !== "string" || !value.trim()) return "development";
  const VALID: WorkflowPackKey[] = [
    "development",
    "novel",
    "report",
    "video_preprod",
    "web_research_report",
    "roleplay",
    "asset_management",
  ];
  return (VALID.includes(value as WorkflowPackKey) ? value : "development") as WorkflowPackKey;
}
