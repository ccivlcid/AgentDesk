import { saveImageFromUrl } from "../image-service.ts";
import logger from "../../../lib/logger.ts";
import sharp from "sharp";

export interface GenerateRequest {
  id: string;
  model: string;
  prompt: string;
  width: number;
  height: number;
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
  apiKey: string;
  baseUrl?: string;
}

export interface GenerateResult {
  filePath: string;
  thumbPath: string;
  revisedPrompt?: string;
}

function dalleSize(width: number, height: number): string {
  // DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
  if (width === 1024 && height === 1792) return "1024x1792";
  if (width === 1792 && height === 1024) return "1792x1024";
  return "1024x1024";
}

function dalle2Size(width: number, height: number): string {
  // DALL-E 2 supports: 256x256, 512x512, 1024x1024
  if (width <= 256) return "256x256";
  if (width <= 512) return "512x512";
  return "1024x1024";
}

export async function generateImage(req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = req.apiKey;
  if (!apiKey) throw Object.assign(new Error("API key is not configured for this provider"), { code: "missing_api_key" });
  const baseUrl = (req.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");

  const isDalle3 = req.model !== "dall-e-2";
  const size = isDalle3 ? dalleSize(req.width, req.height) : dalle2Size(req.width, req.height);

  const body: Record<string, unknown> = {
    model: isDalle3 ? "dall-e-3" : "dall-e-2",
    prompt: req.prompt,
    n: 1,
    size,
    response_format: "url",
  };
  if (isDalle3) {
    body.quality = req.quality ?? "standard";
    body.style = req.style ?? "vivid";
  }

  logger.info(`[image-studio/openai] generate model=${req.model} size=${size}`);

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const json = await res.json() as { data: Array<{ url?: string; revised_prompt?: string }> };
  const item = json.data?.[0];
  if (!item?.url) throw new Error("No image URL in OpenAI response");

  const { filePath, thumbPath } = await saveImageFromUrl(req.id, item.url);
  return { filePath, thumbPath, revisedPrompt: item.revised_prompt };
}

// ── strip "data:...;base64," prefix if present ──────────────────────────────
export function stripB64Prefix(b64: string): Buffer {
  const data = b64.includes(",") ? b64.split(",")[1] : b64;
  return Buffer.from(data, "base64");
}

// ── img2img: OpenAI /v1/images/variations ───────────────────────────────────
export interface GenerateVariationRequest {
  id: string;
  inputImageBuffer: Buffer;
  width: number;
  height: number;
  apiKey: string;
  baseUrl?: string;
}

export async function generateVariation(req: GenerateVariationRequest): Promise<GenerateResult> {
  const { apiKey, baseUrl: rawBase } = req;
  if (!apiKey) throw Object.assign(new Error("API key not configured"), { code: "missing_api_key" });
  const base = (rawBase ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const size = dalle2Size(req.width, req.height);

  const form = new FormData();
  form.append("image", new Blob([req.inputImageBuffer], { type: "image/png" }), "image.png");
  form.append("n", "1");
  form.append("size", size);
  form.append("response_format", "url");

  logger.info(`[image-studio/openai] variation size=${size}`);
  const res = await fetch(`${base}/images/variations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }
  const json = await res.json() as { data: Array<{ url?: string }> };
  const url = json.data?.[0]?.url;
  if (!url) throw new Error("No image URL in OpenAI response");
  const { filePath, thumbPath } = await saveImageFromUrl(req.id, url);
  return { filePath, thumbPath };
}

// ── inpaint: OpenAI /v1/images/edits ────────────────────────────────────────
export interface GenerateInpaintRequest {
  id: string;
  prompt: string;
  inputImageBuffer: Buffer;
  maskBuffer?: Buffer;
  width: number;
  height: number;
  apiKey: string;
  baseUrl?: string;
}

export async function generateInpaint(req: GenerateInpaintRequest): Promise<GenerateResult> {
  const { apiKey, baseUrl: rawBase } = req;
  if (!apiKey) throw Object.assign(new Error("API key not configured"), { code: "missing_api_key" });
  const base = (rawBase ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const size = dalle2Size(req.width, req.height);

  // Convert mask: white=replace → transparent (alpha=0), black=keep → opaque
  let maskBuffer = req.maskBuffer;
  if (maskBuffer) {
    const raw = await sharp(maskBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = raw;
    const rgba = Buffer.from(data);
    for (let i = 0; i < rgba.length; i += 4) {
      const brightness = rgba[i]; // R channel
      rgba[i] = 0; rgba[i + 1] = 0; rgba[i + 2] = 0;
      rgba[i + 3] = brightness > 128 ? 0 : 255; // white→transparent, black→opaque
    }
    maskBuffer = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  }

  const form = new FormData();
  form.append("image", new Blob([req.inputImageBuffer], { type: "image/png" }), "image.png");
  if (maskBuffer) form.append("mask", new Blob([maskBuffer], { type: "image/png" }), "mask.png");
  form.append("prompt", req.prompt);
  form.append("n", "1");
  form.append("size", size);
  form.append("response_format", "url");

  logger.info(`[image-studio/openai] inpaint size=${size}`);
  const res = await fetch(`${base}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }
  const json = await res.json() as { data: Array<{ url?: string; revised_prompt?: string }> };
  const item = json.data?.[0];
  if (!item?.url) throw new Error("No image URL in OpenAI response");
  const { filePath, thumbPath } = await saveImageFromUrl(req.id, item.url);
  return { filePath, thumbPath, revisedPrompt: item.revised_prompt };
}
