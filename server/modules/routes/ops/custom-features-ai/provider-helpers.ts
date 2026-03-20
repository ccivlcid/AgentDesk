import logger from "../../../../lib/logger.ts";
import type { ApiProviderRow, ApiProviderType, DbLike } from "./types.ts";

/** CliProvider → ApiProviderType 매핑 */
const CLI_TO_API_TYPE: Record<string, ApiProviderType> = {
  claude:      "anthropic",
  "claude-code": "anthropic",
  cursor:      "anthropic",   // Cursor uses Claude/GPT — prefer Anthropic key
  windsurf:    "anthropic",
  codex:       "openai",
  "codex-cli": "openai",
  opencode:    "openai",
  gemini:      "google",
  "gemini-cli": "google",
  copilot:     "openai",
  antigravity: "google",
  ollama:      "ollama",
};

/** Settings DB에서 defaultProvider(CliProvider) 읽기 */
export function readDefaultProvider(db: DbLike): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'defaultProvider'").get() as
    | { value: string }
    | undefined;
  return row?.value?.replace(/"/g, "").trim() || "claude";
}

/** 적합한 api_providers 행 찾기 */
export function findApiProvider(db: DbLike, cliProvider: string): ApiProviderRow | null {
  const targetType = CLI_TO_API_TYPE[cliProvider] ?? null;

  // 1. cliProvider === "api" 이면 첫 번째 enabled provider 사용
  if (cliProvider === "api") {
    return (db
      .prepare("SELECT * FROM api_providers WHERE enabled = 1 ORDER BY created_at ASC LIMIT 1")
      .get() as ApiProviderRow | undefined) ?? null;
  }

  // 2. 타입이 일치하는 첫 번째 enabled provider
  if (targetType) {
    const matched = (db
      .prepare("SELECT * FROM api_providers WHERE type = ? AND enabled = 1 ORDER BY created_at ASC LIMIT 1")
      .get(targetType) as ApiProviderRow | undefined) ?? null;
    if (matched) return matched;
  }

  // 3. 폴백: 어떤 enabled provider든 사용 (타입 무관)
  return (db
    .prepare("SELECT * FROM api_providers WHERE enabled = 1 ORDER BY created_at ASC LIMIT 1")
    .get() as ApiProviderRow | undefined) ?? null;
}

/** 진행 로그를 DB에 한 줄 추가 */
export function appendLog(db: DbLike, featureId: string, msg: string, nowMs: () => number): void {
  try {
    const row = db.prepare("SELECT progress_log FROM custom_features WHERE id = ?").get(featureId) as
      | { progress_log: string | null }
      | undefined;
    const ts = new Date().toTimeString().slice(0, 8); // HH:MM:SS
    const line = `[${ts}] ${msg}`;
    const updated = row?.progress_log ? `${row.progress_log}\n${line}` : line;
    db.prepare("UPDATE custom_features SET progress_log = ?, updated_at = ? WHERE id = ?")
      .run(updated, nowMs(), featureId);
    logger.info(`[feature] ${featureId}: ${msg}`);
  } catch { /* ignore */ }
}

/** 모델 결정: models_cache 첫 번째 or provider 타입별 기본값 */
export function resolveModel(provider: ApiProviderRow): string {
  if (provider.models_cache) {
    try {
      const models = JSON.parse(provider.models_cache) as string[];
      if (models.length > 0) return models[0];
    } catch { /* ignore */ }
  }
  const defaults: Partial<Record<ApiProviderType, string>> = {
    anthropic: "claude-opus-4-6",
    openai:    "gpt-4o",
    google:    "gemini-2.0-flash",
    ollama:    "llama3",
  };
  return defaults[provider.type] ?? "gpt-4o";
}
