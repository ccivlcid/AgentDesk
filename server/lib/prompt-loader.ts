/**
 * Prompt Loader — reads .md prompt files from the prompts/ directory.
 * Prompts are cached after first read for performance.
 *
 * Usage:
 *   loadPrompt("system/project-kickoff")  → reads prompts/system/project-kickoff.md
 *   loadPrompt("system/project-auto-assign", { agentList: "..." })  → replaces {{agentList}}
 *   loadPromptSection("execution/output-language-guidance", "ko")  → reads ## ko section
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROMPTS_DIR = path.resolve(
  import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url)),
  "../../prompts",
);

const cache = new Map<string, string>();

/**
 * Load a prompt file and optionally replace {{key}} placeholders.
 */
export function loadPrompt(
  name: string,
  vars?: Record<string, string>,
): string {
  let content = cache.get(name);
  if (!content) {
    const filePath = path.join(PROMPTS_DIR, `${name}.md`);
    try {
      content = fs.readFileSync(filePath, "utf8").trim();
    } catch {
      // Fallback: return empty string if file not found
      content = "";
    }
    cache.set(name, content);
  }

  if (vars && content) {
    let result = content;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
    return result;
  }
  return content;
}

/**
 * Load a specific language section from a sectioned prompt file.
 * Sections are delimited by ## lang headers (e.g., ## ko, ## en).
 */
export function loadPromptSection(
  name: string,
  lang: string,
  vars?: Record<string, string>,
): string {
  const full = loadPrompt(name);
  if (!full) return "";

  const sectionRegex = new RegExp(
    `^## ${lang}\\s*\\n([\\s\\S]*?)(?=^## \\w|$)`,
    "m",
  );
  const match = full.match(sectionRegex);
  let section = match ? match[1].trim() : "";

  // fallback to "en" if requested lang not found
  if (!section && lang !== "en") {
    const enMatch = full.match(/^## en\s*\n([\s\S]*?)(?=^## \w|$)/m);
    section = enMatch ? enMatch[1].trim() : "";
  }

  if (vars && section) {
    for (const [key, value] of Object.entries(vars)) {
      section = section.replaceAll(`{{${key}}}`, value);
    }
  }
  return section;
}

/**
 * Invalidate the cache (useful for dev/hot-reload).
 */
export function clearPromptCache(): void {
  cache.clear();
}
