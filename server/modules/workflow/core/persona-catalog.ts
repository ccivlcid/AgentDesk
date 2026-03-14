import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PERSONAS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../../prompts/personas");

const _cache = new Map<string, string | null>();

/**
 * Load a famous persona prompt from server/prompts/personas/{personaId}.md.
 * Returns null if the file does not exist.
 */
export function getPersonaPrompt(personaId: string | null | undefined): string | null {
  if (!personaId) return null;

  const cached = _cache.get(personaId);
  if (cached !== undefined) return cached;

  let text: string | null = null;
  try {
    const content = readFileSync(join(PERSONAS_DIR, `${personaId}.md`), "utf-8").trim();
    text = content.length > 0 ? content : null;
  } catch { /* file not found — unknown personaId */ }

  _cache.set(personaId, text);
  return text;
}
