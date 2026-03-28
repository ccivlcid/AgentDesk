export const WORKFLOW_PACK_KEYS = [
  "development",
] as const;

export type WorkflowPackKey = (typeof WORKFLOW_PACK_KEYS)[number];

export const DEFAULT_WORKFLOW_PACK_KEY: WorkflowPackKey = "development";

export function isWorkflowPackKey(value: unknown): value is WorkflowPackKey {
  return typeof value === "string" && (WORKFLOW_PACK_KEYS as readonly string[]).includes(value);
}

export type WorkflowPackSeed = {
  key: WorkflowPackKey;
  name: string;
  inputSchema: Record<string, unknown>;
  promptPreset: Record<string, unknown>;
  qaRules: Record<string, unknown>;
  outputTemplate: Record<string, unknown>;
  routingKeywords: string[];
  costProfile: Record<string, unknown>;
};

const COMMON_COST_PROFILE = {
  maxInputTokens: 12000,
  maxOutputTokens: 6000,
  maxRounds: 3,
};

export const DEFAULT_WORKFLOW_PACK_SEEDS: WorkflowPackSeed[] = [
  {
    key: "development",
    name: "Development",
    inputSchema: {
      required: ["project", "instruction"],
      optional: ["constraints", "acceptance_criteria", "deadline"],
    },
    promptPreset: {
      mode: "engineering",
      style: "pragmatic",
      enforceTests: true,
    },
    qaRules: {
      requireTestEvidence: true,
      requireRiskNotes: true,
      maxAutoFixPasses: 1,
    },
    outputTemplate: {
      sections: ["summary", "changes", "verification", "next_steps"],
    },
    routingKeywords: ["fix", "bug", "refactor", "build", "api", "test", "개발", "버그", "수정", "코드"],
    costProfile: {
      ...COMMON_COST_PROFILE,
      defaultReasoning: "high",
    },
  },
];
