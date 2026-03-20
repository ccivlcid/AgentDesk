import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import logger from "../../../../lib/logger.ts";
import type { DbLike } from "./types.ts";
import { extractSvg } from "./extract-code.ts";
import { callProvider } from "./llm-providers.ts";
import { appendLog, findApiProvider, readDefaultProvider, resolveModel } from "./provider-helpers.ts";
import { GITHUB_DIR, ensureDir } from "./paths.ts";
import { SYSTEM_PROMPT_ICON } from "./prompts.ts";
import { callClaudeCli, gitClone, parseGithubRepo } from "./repo-helpers.ts";

export async function runGithubRepoImport(
  db: DbLike,
  featureId: string,
  repoUrl: string,
  nowMs: () => number,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2분

  try {
    const parsed = parseGithubRepo(repoUrl);
    if (!parsed) throw new Error("유효한 GitHub 레포 URL이 아닙니다.");
    const { user, repo } = parsed;

    // git clone → feature/github/<user>-<repo>/
    ensureDir(GITHUB_DIR);
    const repoDir = join(GITHUB_DIR, `${user}-${repo}`);

    if (existsSync(repoDir)) {
      appendLog(db, featureId, `기존 클론 재사용: ${user}/${repo}`, nowMs);
    } else {
      appendLog(db, featureId, `다운로드 중: ${user}/${repo}...`, nowMs);
      await gitClone(`https://github.com/${user}/${repo}`, repoDir, controller.signal);
      appendLog(db, featureId, `다운로드 완료`, nowMs);
    }

    // README + package.json 읽기 (아이콘 생성용)
    const readmePath = join(repoDir, "README.md");
    const pkgPath    = join(repoDir, "package.json");
    const readme     = existsSync(readmePath) ? readFileSync(readmePath, "utf-8") : null;
    const pkgJsonText = existsSync(pkgPath)   ? readFileSync(pkgPath, "utf-8")   : null;

    let npmName = "";
    let pkgDescription = "";
    if (pkgJsonText) {
      try {
        const pkg = JSON.parse(pkgJsonText) as Record<string, unknown>;
        npmName = typeof pkg.name === "string" ? pkg.name : "";
        pkgDescription = typeof pkg.description === "string" ? pkg.description : "";
      } catch { /* ignore */ }
    }

    // AI로 SVG 아이콘만 생성 (실패해도 클론은 성공으로 처리)
    appendLog(db, featureId, "아이콘 생성 중...", nowMs);
    const iconPrompt = [
      `Repository: ${repoUrl}`,
      npmName      ? `Package: ${npmName}`           : "",
      pkgDescription ? `Description: ${pkgDescription}` : "",
      readme       ? `README (first 400 chars):\n${readme.slice(0, 400)}` : "",
    ].filter(Boolean).join("\n");

    const cliProvider = readDefaultProvider(db);
    const provider    = findApiProvider(db, cliProvider);
    let svg: string | null = null;
    try {
      const raw = provider
        ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT_ICON, iconPrompt, controller.signal)
        : await callClaudeCli(SYSTEM_PROMPT_ICON, iconPrompt, controller.signal);
      svg = extractSvg(raw);
    } catch { /* 아이콘 실패해도 진행 */ }

    // config에 repo_dir 저장 → compileFeature가 첫 실행 시 코드베이스 분석에 사용
    const config = JSON.stringify({ repo_dir: repoDir });
    db.prepare("UPDATE custom_features SET icon_svg = ?, config = ?, status = 'pending_install', error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(svg ?? null, config, nowMs(), featureId);

    appendLog(db, featureId, "✓ 다운로드 완료! 앱 아이콘을 클릭하면 설치됩니다.", nowMs);
    logger.info(`[github-repo] downloaded feature=${featureId} repoDir=${repoDir}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[github-repo] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
      .run("error", msg.slice(0, 400), nowMs(), featureId);
  } finally {
    clearTimeout(timeout);
  }
}
