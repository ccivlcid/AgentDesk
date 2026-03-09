import type { PackPreset, WorkflowPackKey } from "./types";
import { PACK_PRESETS_A } from "./pack-presets-a";
import { PACK_PRESETS_B } from "./pack-presets-b";

export const PACK_PRESETS: Record<WorkflowPackKey, PackPreset> = {
  ...PACK_PRESETS_A,
  ...PACK_PRESETS_B,
} as Record<WorkflowPackKey, PackPreset>;
