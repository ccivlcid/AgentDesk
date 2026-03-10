import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";

const AVATARS_DIR = path.join(process.cwd(), "public", "avatars");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB input limit
const OUTPUT_SIZE = 256; // px — square output

function ensureAvatarsDir(): void {
  if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

export function registerAgentAvatarRoutes(ctx: RuntimeContext): void {
  const { app, db } = ctx;

  /** POST /api/agents/:id/avatar — upload base64 image, save as WebP */
  app.post("/api/agents/:id/avatar", async (req, res) => {
    try {
      const agentId = req.params.id as string;
      const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
      if (!agent) return res.status(404).json({ error: "agent_not_found" });

      const { image } = req.body as { image?: string };
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "image_required" });
      }

      const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: "invalid_image_format" });

      const imgBuf = Buffer.from(match[2], "base64");
      if (imgBuf.length === 0) return res.status(400).json({ error: "empty_image" });
      if (imgBuf.length > MAX_BYTES) return res.status(400).json({ error: "image_too_large" });

      ensureAvatarsDir();

      const outFile = path.join(AVATARS_DIR, `${agentId}.webp`);
      await sharp(imgBuf)
        .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "center" })
        .webp({ quality: 85 })
        .toFile(outFile);

      const avatar_url = `/avatars/${agentId}.webp`;
      db.prepare("UPDATE agents SET avatar_url = ? WHERE id = ?").run(avatar_url, agentId);

      return res.json({ ok: true, avatar_url });
    } catch (err) {
      console.error("[avatar upload]", err);
      return res.status(500).json({ error: "upload_failed" });
    }
  });

  /** DELETE /api/agents/:id/avatar — remove avatar */
  app.delete("/api/agents/:id/avatar", (req, res) => {
    try {
      const agentId = req.params.id as string;
      const agent = db.prepare("SELECT id, avatar_url FROM agents WHERE id = ?").get(agentId) as
        | { id: string; avatar_url: string | null }
        | undefined;
      if (!agent) return res.status(404).json({ error: "agent_not_found" });

      if (agent.avatar_url) {
        const filePath = path.join(process.cwd(), "public", agent.avatar_url);
        try { fs.unlinkSync(filePath); } catch { /* file may not exist */ }
      }

      db.prepare("UPDATE agents SET avatar_url = NULL WHERE id = ?").run(agentId);
      return res.json({ ok: true });
    } catch (err) {
      console.error("[avatar delete]", err);
      return res.status(500).json({ error: "delete_failed" });
    }
  });
}
