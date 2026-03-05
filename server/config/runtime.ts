import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// When packaged (e.g. Electron CJS bundle), set AGENTDESK_SERVER_DIR to the bundle directory.
const _serverDirEnv = process.env.AGENTDESK_SERVER_DIR?.trim();
function resolveServerDirname(): string {
  if (_serverDirEnv) return path.resolve(_serverDirEnv);
  try {
    const u = (typeof import.meta !== "undefined" && import.meta.url) || "";
    if (u) return path.dirname(fileURLToPath(u));
  } catch {
    /* CJS bundle may have empty import.meta.url */
  }
  return process.cwd();
}
export const SERVER_DIRNAME = resolveServerDirname();

// ---------------------------------------------------------------------------
// .env loader (no dotenv dependency)
// ---------------------------------------------------------------------------
// Try multiple candidate paths so .env is found both in dev and packaged exe.
const envCandidates = [
  path.resolve(SERVER_DIRNAME, "..", "..", ".env"),       // dev: server/config/../../.env
  path.resolve(SERVER_DIRNAME, "..", ".env"),              // packaged: dist-server/../.env (app root)
  path.resolve(process.cwd(), ".env"),                    // cwd fallback (exe directory)
];
const envFilePath = envCandidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) ?? envCandidates[0];
try {
  if (fs.existsSync(envFilePath)) {
    const envContent = fs.readFileSync(envFilePath, "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes (single or double)
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
} catch {
  // ignore .env read errors
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const PKG_VERSION: string = (() => {
  if (process.env.AGENTDESK_VERSION?.trim()) return process.env.AGENTDESK_VERSION.trim();
  try {
    return (
      JSON.parse(fs.readFileSync(path.resolve(SERVER_DIRNAME, "..", "..", "package.json"), "utf8")).version ?? "1.0.0"
    );
  } catch {
    return "1.0.0";
  }
})();

export const PORT = Number(process.env.PORT ?? 8790);
export const HOST = process.env.HOST ?? "127.0.0.1";
export const OAUTH_BASE_HOST = HOST === "0.0.0.0" || HOST === "::" ? "127.0.0.1" : HOST;
export const SESSION_COOKIE_NAME = "agentdesk_session";

export function normalizeSecret(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed || trimmed === "__CHANGE_ME__") return "";
  return trimmed;
}

export function normalizePathEnv(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed || trimmed === "__CHANGE_ME__") return "";
  if (!trimmed.startsWith("~")) return trimmed;

  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return trimmed;

  const suffix = trimmed.slice(1).replace(/^[\\/]+/, "");
  return suffix ? path.resolve(home, suffix) : home;
}

export const AGENTDESK_CONFIG_PATH = normalizePathEnv(process.env.AGENTDESK_CONFIG);
export const API_AUTH_TOKEN = normalizeSecret(process.env.API_AUTH_TOKEN);
export const INBOX_WEBHOOK_SECRET = normalizeSecret(process.env.INBOX_WEBHOOK_SECRET);
export const SESSION_AUTH_TOKEN = API_AUTH_TOKEN || randomBytes(32).toString("hex");
export const ALLOWED_ORIGIN_SUFFIXES = (process.env.ALLOWED_ORIGIN_SUFFIXES ?? ".ts.net")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Production static file serving
// When packaged (e.g. Electron), set AGENTDESK_DIST_DIR to the actual dist path.
// ---------------------------------------------------------------------------
const distDirEnv = process.env.AGENTDESK_DIST_DIR?.trim();
export const DIST_DIR = distDirEnv
  ? path.resolve(distDirEnv)
  : path.resolve(SERVER_DIRNAME, "..", "..", "dist");
export const IS_PRODUCTION = !process.env.VITE_DEV && fs.existsSync(path.join(DIST_DIR, "index.html"));

// ---------------------------------------------------------------------------
// Database defaults
// ---------------------------------------------------------------------------
export const DEFAULT_DB_PATH = path.join(process.cwd(), "agentdesk.sqlite");
export const LEGACY_DB_PATH = path.join(process.cwd(), "agentdesk.sqlite");
