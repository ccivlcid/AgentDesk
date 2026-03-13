import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_WORKFLOW_PACK_KEY, isWorkflowPackKey, WORKFLOW_PACK_KEYS, type WorkflowPackKey } from "./definitions.ts";

const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../prompts/packs");

// ---------------------------------------------------------------------------
// Pack config — machine-readable metadata embedded in each .md file
// ---------------------------------------------------------------------------

export type PackConfig = {
  /** Department IDs in priority order for agent auto-selection */
  preferredDepartments: string[];
  /** Agent roles in priority order (team_leader > senior > ...) */
  preferredRoles: string[];
  /** CLI providers in priority order */
  preferredProviders: string[];
  /** Reasoning level passed to the agent CLI */
  reasoningLevel: "high" | "medium" | "low";
  /** Max execution rounds before giving up */
  maxRounds: number;
  /** Max input tokens for the task prompt */
  maxInputTokens: number;
  /** Max output tokens per round */
  maxOutputTokens: number;
  /** Keywords used by the auto-router to classify tasks into this pack */
  routingKeywords: string[];
};

const DEFAULT_PACK_CONFIG: PackConfig = {
  preferredDepartments: ["dev", "planning", "qa", "design", "operations", "devsecops"],
  preferredRoles: ["senior", "team_leader", "junior", "intern"],
  preferredProviders: ["claude", "codex", "gemini", "opencode"],
  reasoningLevel: "medium",
  maxRounds: 3,
  maxInputTokens: 12000,
  maxOutputTokens: 6000,
  routingKeywords: [],
};

const _configCache = new Map<WorkflowPackKey, PackConfig>();

/**
 * Parse the `<!-- pack-config ... -->` block from .md file content.
 * Returns null if the block is missing or malformed.
 */
function parsePackConfigBlock(content: string): Partial<PackConfig> | null {
  const START = "<!-- pack-config";
  const END = "-->";
  const start = content.indexOf(START);
  if (start === -1) return null;
  const jsonStart = start + START.length;
  const end = content.indexOf(END, jsonStart);
  if (end === -1) return null;
  try {
    return JSON.parse(content.slice(jsonStart, end).trim()) as Partial<PackConfig>;
  } catch {
    return null;
  }
}

/**
 * Load and cache the machine-readable config for a workflow pack.
 * Falls back to DEFAULT_PACK_CONFIG if the file is missing or the block is absent.
 */
export function loadPackConfig(packKey: WorkflowPackKey): PackConfig {
  const cached = _configCache.get(packKey);
  if (cached) return cached;

  let parsed: Partial<PackConfig> | null = null;
  try {
    const content = readFileSync(join(PACKS_DIR, `${packKey}.md`), "utf-8");
    parsed = parsePackConfigBlock(content);
  } catch { /* file missing */ }

  const config: PackConfig = { ...DEFAULT_PACK_CONFIG, ...(parsed ?? {}) };
  _configCache.set(packKey, config);
  return config;
}

/**
 * Load configs for all packs at once (used by the keyword router).
 */
export function loadAllPackConfigs(): Map<WorkflowPackKey, PackConfig> {
  const out = new Map<WorkflowPackKey, PackConfig>();
  for (const key of WORKFLOW_PACK_KEYS) {
    out.set(key, loadPackConfig(key));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Language extraction helpers
// ---------------------------------------------------------------------------

type SupportedLang = "ko" | "en" | "ja" | "zh";

function normalizeLang(raw: string | null | undefined): SupportedLang {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v.startsWith("ko")) return "ko";
  if (v.startsWith("ja")) return "ja";
  if (v.startsWith("zh")) return "zh";
  return "en";
}

function normalizePackKey(raw: string | null | undefined): WorkflowPackKey {
  if (isWorkflowPackKey(raw)) return raw;
  return DEFAULT_WORKFLOW_PACK_KEY;
}

/**
 * Extract a language-tagged section from pack .md content.
 * Sections are delimited by `<!-- [lang] -->` HTML comment markers.
 * Falls back to "en" if the requested language section is not found.
 * If no language markers exist at all, returns the full content trimmed.
 */
function extractLangSection(content: string, lang: SupportedLang): string {
  // Strip the pack-config block before extracting language sections
  const cleaned = content.replace(/<!--\s*pack-config[\s\S]*?-->/g, "");

  const marker = `<!-- [${lang}] -->`;
  const idx = cleaned.indexOf(marker);
  if (idx === -1) {
    if (lang !== "en") return extractLangSection(content, "en");
    if (!cleaned.includes("<!-- [")) return cleaned.trim();
    return "";
  }
  const start = idx + marker.length;
  const nextIdx = cleaned.slice(start).search(/<!-- \[[a-z]+\] -->/);
  const end = nextIdx === -1 ? cleaned.length : start + nextIdx;
  return cleaned.slice(start, end).trim();
}

// ---------------------------------------------------------------------------
// Guidance builder (injected into agent prompt)
// ---------------------------------------------------------------------------

function loadPackGuidance(
  packKey: WorkflowPackKey,
  lang: SupportedLang,
  options?: { videoArtifactRelativePath?: string | null },
): string {
  let content: string;
  try {
    content = readFileSync(join(PACKS_DIR, `${packKey}.md`), "utf-8");
  } catch {
    return "";
  }

  const artifactPath = options?.videoArtifactRelativePath?.trim() || "video_output/final.mp4";
  content = content.replaceAll("{{ARTIFACT_PATH}}", artifactPath);

  return extractLangSection(content, lang);
}

export function buildWorkflowPackExecutionGuidance(
  packKeyRaw: string | null | undefined,
  langRaw: string | null | undefined,
  options?: {
    videoArtifactRelativePath?: string | null;
    /** @deprecated qaRules are now embedded in pack .md files */
    qaRulesJson?: string | null;
  },
): string {
  const packKey = normalizePackKey(packKeyRaw);
  const lang = normalizeLang(langRaw);
  return loadPackGuidance(packKey, lang, options);
}
