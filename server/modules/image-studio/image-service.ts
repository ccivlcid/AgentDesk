import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_STUDIO_DIR, IMAGE_STUDIO_THUMBS_DIR } from "../../db/runtime.ts";
import logger from "../../lib/logger.ts";

export function ensureImageDirs(): void {
  try { fs.mkdirSync(IMAGE_STUDIO_DIR, { recursive: true }); } catch { /* ignore */ }
  try { fs.mkdirSync(IMAGE_STUDIO_THUMBS_DIR, { recursive: true }); } catch { /* ignore */ }
}

export function getImagePath(id: string): string {
  return path.join(IMAGE_STUDIO_DIR, `${id}.png`);
}

export function getThumbPath(id: string): string {
  return path.join(IMAGE_STUDIO_THUMBS_DIR, `${id}.jpg`);
}

export async function saveImageFromUrl(id: string, url: string): Promise<{ filePath: string; thumbPath: string }> {
  ensureImageDirs();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return saveImageFromBuffer(id, buffer);
}

export async function saveImageFromBuffer(id: string, buffer: Buffer): Promise<{ filePath: string; thumbPath: string }> {
  ensureImageDirs();
  const filePath = getImagePath(id);
  const thumbPath = getThumbPath(id);

  fs.writeFileSync(filePath, buffer);
  logger.debug(`[image-studio] saved ${filePath}`);

  try {
    await sharp(buffer)
      .resize(240, 240, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
    logger.debug(`[image-studio] thumb ${thumbPath}`);
  } catch (err) {
    logger.warn(`[image-studio] thumb generation failed: ${String(err)}`);
  }

  return { filePath, thumbPath };
}
