import fs from "node:fs";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import logger from "../../../lib/logger.ts";
import { decryptSecret } from "../../../oauth/helpers.ts";
import {
  generateImage as openaiGenerate,
  generateVariation,
  generateInpaint,
  stripB64Prefix,
} from "../../image-studio/providers/openai.ts";
import { getImagePath, getThumbPath } from "../../image-studio/image-service.ts";

interface ApiProviderRow {
  id: string;
  name: string;
  type: string;
  base_url: string;
  api_key_enc: string | null;
  enabled: number;
  models_cache: string | null;
}

interface Deps {
  app: Express;
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
}

interface ImageRow {
  id: string;
  provider: string;
  model: string;
  prompt: string;
  neg_prompt: string | null;
  width: number;
  height: number;
  steps: number | null;
  seed: number | null;
  file_path: string;
  thumb_path: string | null;
  metadata: string | null;
  task_id: string | null;
  created_at: number;
}

// 타입별 이미지 생성 모델 기본값 (models_cache 없을 때 폴백)
const TYPE_DEFAULT_MODELS: Record<string, string[]> = {
  openai:     ["dall-e-3", "dall-e-2"],
  stability:  ["sd3.5-large", "sdxl-1.0"],
  together:   ["black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0"],
  openrouter: ["openai/dall-e-3"],
};

// 이미지 생성 모델 키워드 필터
const IMAGE_MODEL_KEYWORDS = ["dall-e", "imagen", "flux", "stable-diffusion", "sd-", "sdxl", "playground", "kandinsky", "midjourney", "wuerstchen", "deepfloyd"];

function filterImageModels(models: string[]): string[] {
  const filtered = models.filter((m) =>
    IMAGE_MODEL_KEYWORDS.some((kw) => m.toLowerCase().includes(kw))
  );
  return filtered.length > 0 ? filtered : models; // 필터 결과가 없으면 전체 반환
}

function resolveModels(type: string, modelsCache: string | null): string[] {
  if (modelsCache) {
    const cached = JSON.parse(modelsCache) as string[];
    if (cached.length > 0) return filterImageModels(cached);
  }
  return TYPE_DEFAULT_MODELS[type] ?? [];
}

export function registerImageStudioRoutes({ app, db, broadcast }: Deps): void {

  // GET /api/image-studio/providers — 활성화된 모든 프로바이더 목록
  app.get("/api/image-studio/providers", (req, res) => {
    const rows = db.prepare(
      "SELECT id, name, type, base_url, enabled, models_cache FROM api_providers WHERE enabled = 1 ORDER BY created_at ASC"
    ).all() as Omit<ApiProviderRow, "api_key_enc">[];

    res.json({
      ok: true,
      providers: rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        base_url: r.base_url,
        models: resolveModels(r.type, r.models_cache),
      })),
    });
  });

  // POST /api/image-studio/generate
  app.post("/api/image-studio/generate", async (req, res) => {
    const {
      api_provider_id, model = "dall-e-3", prompt, negPrompt,
      width = 1024, height = 1024, quality, style,
      mode = "txt2img", inputImageB64, maskB64, task_id,
    } = req.body as {
      api_provider_id?: string; model?: string; prompt?: string; negPrompt?: string;
      width?: number; height?: number; quality?: string; style?: string;
      mode?: string; inputImageB64?: string; maskB64?: string; task_id?: string;
    };

    // Prompt is required for txt2img and inpaint, optional for img2img
    if (mode !== "img2img") {
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ ok: false, error: "invalid_prompt", message: "prompt is required" });
      }
    }
    if (!api_provider_id) {
      return res.status(400).json({ ok: false, error: "missing_provider", message: "api_provider_id is required" });
    }

    const providerRow = db.prepare("SELECT * FROM api_providers WHERE id = ? AND enabled = 1").get(api_provider_id) as ApiProviderRow | undefined;
    if (!providerRow) {
      return res.status(422).json({ ok: false, error: "provider_not_found", message: "Provider not found or disabled" });
    }
    if (!providerRow.api_key_enc) {
      return res.status(422).json({ ok: false, error: "missing_api_key", message: "No API key configured for this provider" });
    }

    const apiKey = decryptSecret(providerRow.api_key_enc);
    const id = `img_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    try {
      let result: { filePath: string; thumbPath: string; revisedPrompt?: string };

      if (mode === "img2img") {
        if (!inputImageB64) {
          return res.status(400).json({ ok: false, error: "missing_image", message: "inputImageB64 is required for img2img mode" });
        }
        result = await generateVariation({
          id,
          inputImageBuffer: stripB64Prefix(inputImageB64),
          width,
          height,
          apiKey,
          baseUrl: providerRow.base_url,
        });
      } else if (mode === "inpaint") {
        if (!inputImageB64) {
          return res.status(400).json({ ok: false, error: "missing_image", message: "inputImageB64 is required for inpaint mode" });
        }
        if (!prompt?.trim()) {
          return res.status(400).json({ ok: false, error: "invalid_prompt", message: "prompt is required for inpaint mode" });
        }
        result = await generateInpaint({
          id,
          prompt: prompt.trim(),
          inputImageBuffer: stripB64Prefix(inputImageB64),
          maskBuffer: maskB64 ? stripB64Prefix(maskB64) : undefined,
          width,
          height,
          apiKey,
          baseUrl: providerRow.base_url,
        });
      } else {
        // txt2img — existing openaiGenerate path
        result = await openaiGenerate({
          id, model, prompt: (prompt as string).trim(), width, height,
          quality: quality as "standard" | "hd", style: style as "vivid" | "natural",
          apiKey, baseUrl: providerRow.base_url,
        });
      }

      const metadata = result.revisedPrompt ? JSON.stringify({ revisedPrompt: result.revisedPrompt }) : null;
      const savedPrompt = prompt?.trim() ?? "";

      db.prepare(`
        INSERT INTO image_generations (id, provider, model, prompt, neg_prompt, width, height, file_path, thumb_path, metadata, task_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, providerRow.name, model, savedPrompt, negPrompt ?? null, width, height, result.filePath, result.thumbPath ?? null, metadata, task_id ?? null);

      broadcast("image_studio_done", { id, provider: providerRow.name, model, prompt: savedPrompt, revisedPrompt: result.revisedPrompt });

      logger.info(`[image-studio] generated id=${id} provider=${providerRow.name} mode=${mode}`);
      res.json({ ok: true, id, provider: providerRow.name, model, prompt: savedPrompt, revisedPrompt: result.revisedPrompt, width, height, createdAt: Date.now() });
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      logger.error(`[image-studio] generate failed: ${String(err)}`);
      if (e.code === "missing_api_key") {
        return res.status(422).json({ ok: false, error: "missing_api_key", message: e.message });
      }
      res.status(500).json({ ok: false, error: "generate_failed", message: String(err) });
    }
  });

  // GET /api/image-studio/gallery
  app.get("/api/image-studio/gallery", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const provider = req.query.provider as string | undefined;
    const search = req.query.search as string | undefined;

    let where = "1=1";
    const params: string[] = [];
    if (provider) { where += " AND provider = ?"; params.push(provider); }
    if (search) { where += " AND prompt LIKE ?"; params.push(`%${search}%`); }

    const rows = (db.prepare(`SELECT * FROM image_generations WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as unknown) as ImageRow[];
    const total = ((db.prepare(`SELECT COUNT(*) as cnt FROM image_generations WHERE ${where}`).get(...params) as unknown) as { cnt: number }).cnt;

    res.json({
      ok: true,
      items: rows.map((r) => ({
        id: r.id, provider: r.provider, model: r.model, prompt: r.prompt,
        width: r.width, height: r.height, createdAt: r.created_at,
        metadata: r.metadata ? JSON.parse(r.metadata) : null,
      })),
      total,
    });
  });

  // GET /api/image-studio/image/:id
  app.get("/api/image-studio/image/:id", (req, res) => {
    const { id } = req.params;
    const thumb = req.query.thumb === "1";

    const row = db.prepare("SELECT file_path, thumb_path FROM image_generations WHERE id = ?").get(id) as Pick<ImageRow, "file_path" | "thumb_path"> | undefined;
    if (!row) return res.status(404).json({ ok: false, error: "not_found" });

    const filePath = thumb && row.thumb_path ? row.thumb_path : row.file_path;
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: "file_missing" });

    const ext = filePath.endsWith(".jpg") ? "image/jpeg" : "image/png";
    res.setHeader("Content-Type", ext);
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(filePath).pipe(res);
  });

  // GET /api/image-studio/task/:taskId/images
  app.get("/api/image-studio/task/:taskId/images", (req, res) => {
    const { taskId } = req.params;
    const rows = db.prepare(
      "SELECT id, provider, model, prompt, width, height, thumb_path, created_at, metadata FROM image_generations WHERE task_id = ? ORDER BY created_at DESC"
    ).all(taskId) as Pick<ImageRow, "id" | "provider" | "model" | "prompt" | "width" | "height" | "thumb_path" | "created_at" | "metadata">[];
    res.json({
      ok: true,
      items: rows.map((r) => ({
        id: r.id, provider: r.provider, model: r.model, prompt: r.prompt,
        width: r.width, height: r.height, createdAt: r.created_at,
        metadata: r.metadata ? JSON.parse(r.metadata) : null,
      })),
    });
  });

  // DELETE /api/image-studio/gallery/:id
  app.delete("/api/image-studio/gallery/:id", (req, res) => {
    const { id } = req.params;
    const row = db.prepare("SELECT file_path, thumb_path FROM image_generations WHERE id = ?").get(id) as Pick<ImageRow, "file_path" | "thumb_path"> | undefined;
    if (!row) return res.status(404).json({ ok: false, error: "not_found" });

    try { fs.unlinkSync(row.file_path); } catch { /* already gone */ }
    if (row.thumb_path) { try { fs.unlinkSync(row.thumb_path); } catch { /* already gone */ } }

    db.prepare("DELETE FROM image_generations WHERE id = ?").run(id);
    logger.info(`[image-studio] deleted id=${id}`);
    res.json({ ok: true });
  });
}
