import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_WORKFLOW_PACK_KEY, isWorkflowPackKey, type WorkflowPackKey } from "./definitions.ts";

const PACKS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../prompts/packs");

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
  const marker = `<!-- [${lang}] -->`;
  const idx = content.indexOf(marker);
  if (idx === -1) {
    if (lang !== "en") return extractLangSection(content, "en");
    // No language markers at all — return full content
    if (!content.includes("<!-- [")) return content.trim();
    return "";
  }
  const start = idx + marker.length;
  const nextIdx = content.slice(start).search(/<!-- \[[a-z]+\] -->/);
  const end = nextIdx === -1 ? content.length : start + nextIdx;
  return content.slice(start, end).trim();
}

/**
 * Load and return the execution guidance for a workflow pack.
 *
 * Reads from `server/prompts/packs/{packKey}.md`, extracts the appropriate
 * language section, and substitutes template variables.
 */
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
