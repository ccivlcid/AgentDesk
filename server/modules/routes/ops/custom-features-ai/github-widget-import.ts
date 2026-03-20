import { join } from "node:path";

import logger from "../../../../lib/logger.ts";
import type { DbLike } from "./types.ts";
import { compileToIife } from "./compile-iife.ts";
import { assertValidCode, extractCodeBlock } from "./extract-code.ts";
import { GITHUB_DIR, ensureDir, saveSource } from "./paths.ts";
import { validateBundle } from "./validate-bundle.ts";

export function toRawUrl(inputUrl: string): string {
  try {
    const u = new URL(inputUrl);

    // 이미 raw URL
    if (u.hostname === "raw.githubusercontent.com" || u.hostname === "gist.githubusercontent.com") {
      return inputUrl;
    }

    // gist.github.com — raw 변환
    if (u.hostname === "gist.github.com") {
      const parts = u.pathname.split("/").filter(Boolean); // [user, gistId]
      if (parts.length >= 2) {
        return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`;
      }
    }

    // github.com/user/repo/blob/branch/path → raw
    if (u.hostname === "github.com") {
      // /blob/ → /raw/ 치환으로도 되지만 raw.githubusercontent 형식이 더 안정적
      const path = u.pathname.replace(/^\//, "");
      // e.g. user/repo/blob/main/foo.tsx  OR  user/repo/raw/main/foo.tsx
      const m = path.match(/^([^/]+)\/([^/]+)\/(blob|raw)\/(.+)$/);
      if (m) {
        const [, user, repo, , rest] = m;
        return `https://raw.githubusercontent.com/${user}/${repo}/${rest}`;
      }
    }

    // 변환 불가 → 그대로 반환 (fetch 시 실패)
    return inputUrl;
  } catch {
    return inputUrl;
  }
}

export async function runGithubImport(
  db: DbLike,
  featureId: string,
  githubUrl: string,
  nowMs: () => number,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const rawUrl = toRawUrl(githubUrl);
    logger.info(`[github-import] fetching feature=${featureId} url=${rawUrl}`);

    const resp = await fetch(rawUrl, {
      headers: { "User-Agent": "AgentDesk/1.0" },
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`GitHub fetch failed: HTTP ${resp.status} — ${rawUrl}`);
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      throw new Error("URL이 HTML 페이지를 반환했습니다. raw 파일 URL을 사용하세요.");
    }

    const code = (await resp.text()).trim();
    if (!code) throw new Error("빈 파일입니다.");

    const cleaned = extractCodeBlock(code);
    assertValidCode(cleaned);

    // feature/github/<featureId>.tsx 에 소스 저장
    ensureDir(GITHUB_DIR);
    const urlFilename = githubUrl.split("/").filter(Boolean).pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "widget.tsx";
    const srcPath = join(GITHUB_DIR, `${featureId}-${urlFilename}`);
    saveSource(srcPath, cleaned);
    logger.info(`[github-import] saved source: ${srcPath}`);

    const blocked = validateBundle(cleaned);
    if (blocked) {
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", `Safety check failed: ${blocked}`, nowMs(), featureId);
      return;
    }

    logger.info(`[github-import] compiling feature=${featureId}`);
    const iife = await compileToIife(cleaned);

    db.prepare("UPDATE custom_features SET bundle = ?, status = ?, error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, "active", nowMs(), featureId);

    logger.info(`[github-import] done feature=${featureId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[github-import] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
      .run("error", msg.slice(0, 400), nowMs(), featureId);
  } finally {
    clearTimeout(timeout);
  }
}
