import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";

import { OAUTH_BASE_HOST, PORT } from "../config/runtime.ts";

// ---------------------------------------------------------------------------
// OAuth encryption helpers
// ---------------------------------------------------------------------------
export const OAUTH_ENCRYPTION_SECRET = process.env.OAUTH_ENCRYPTION_SECRET || process.env.SESSION_SECRET || "";

// v1 key: SHA-256 (legacy — kept only for decrypting existing stored values)
function oauthEncryptionKeyV1(): Buffer {
  if (!OAUTH_ENCRYPTION_SECRET) throw new Error("Missing OAUTH_ENCRYPTION_SECRET");
  return createHash("sha256").update(OAUTH_ENCRYPTION_SECRET, "utf8").digest();
}

// v2 key: PBKDF2-SHA256 (100k iterations) — key stretching against weak secrets
const PBKDF2_SALT = Buffer.from("agentdesk-oauth-kdf-v2-salt", "utf8");
function oauthEncryptionKeyV2(): Buffer {
  if (!OAUTH_ENCRYPTION_SECRET) throw new Error("Missing OAUTH_ENCRYPTION_SECRET");
  return pbkdf2Sync(OAUTH_ENCRYPTION_SECRET, PBKDF2_SALT, 100_000, 32, "sha256");
}

function aesGcmEncrypt(key: Buffer, plaintext: string, version: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [version, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

function aesGcmDecrypt(key: Buffer, ivB64: string, tagB64: string, ctB64: string): string {
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function encryptSecret(plaintext: string): string {
  return aesGcmEncrypt(oauthEncryptionKeyV2(), plaintext, "v2");
}

export function decryptSecret(payload: string): string {
  const [ver, ivB64, tagB64, ctB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("invalid_encrypted_payload");
  if (ver === "v2") return aesGcmDecrypt(oauthEncryptionKeyV2(), ivB64, tagB64, ctB64);
  if (ver === "v1") return aesGcmDecrypt(oauthEncryptionKeyV1(), ivB64, tagB64, ctB64);
  throw new Error("invalid_encrypted_payload");
}

// ---------------------------------------------------------------------------
// OAuth web-auth constants & PKCE helpers
// ---------------------------------------------------------------------------
export const OAUTH_BASE_URL = process.env.OAUTH_BASE_URL || `http://${OAUTH_BASE_HOST}:${PORT}`;

// OAuth client credentials: set via environment variables (no built-in secrets in repo).
export const BUILTIN_GITHUB_CLIENT_ID = process.env.OAUTH_GITHUB_CLIENT_ID ?? "";
export const BUILTIN_GOOGLE_CLIENT_ID = process.env.OAUTH_GOOGLE_CLIENT_ID ?? "";
export const BUILTIN_GOOGLE_CLIENT_SECRET = process.env.OAUTH_GOOGLE_CLIENT_SECRET ?? "";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function pkceVerifier(): string {
  return b64url(randomBytes(32));
}

export async function pkceChallengeS256(verifier: string): Promise<string> {
  return b64url(createHash("sha256").update(verifier, "ascii").digest());
}

// ---------------------------------------------------------------------------
// OAuth helper functions
// ---------------------------------------------------------------------------
export function sanitizeOAuthRedirect(raw: string | undefined): string {
  if (!raw) return "/";
  try {
    const u = new URL(raw);
    if (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "::1" ||
      u.hostname.endsWith(".ts.net")
    )
      return raw;
  } catch {
    // not absolute URL - treat as path
  }
  if (raw.startsWith("/")) return raw;
  return "/";
}

export function appendOAuthQuery(url: string, key: string, val: string): string {
  const u = new URL(url);
  u.searchParams.set(key, val);
  return u.toString();
}
