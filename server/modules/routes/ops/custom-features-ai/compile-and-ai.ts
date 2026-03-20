import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import logger from "../../../../lib/logger.ts";
import type { DbLike } from "./types.ts";
import { compileToIife } from "./compile-iife.ts";
import { assertValidCode, extractCodeBlock } from "./extract-code.ts";
import { AI_DIR, ensureDir, saveSource } from "./paths.ts";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_USAGE } from "./prompts.ts";
import { callProvider } from "./llm-providers.ts";
import { appendLog, findApiProvider, readDefaultProvider, resolveModel } from "./provider-helpers.ts";
import { validateBundle } from "./validate-bundle.ts";
import {
  callClaudeCli,
  extractNpmImports,
  installNpmPackages,
  runNpmInstallInDir,
} from "./repo-helpers.ts";

function extractJsonBlock(text: string): Record<string, unknown> | null {
  const m = text.match(/```json\s*\n?([\s\S]+?)```/);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()) as Record<string, unknown>; } catch { return null; }
}

export async function compileFeature(
  db: DbLike,
  featureId: string,
  nowMs: () => number,
): Promise<void> {
  const row = db.prepare("SELECT status, config FROM custom_features WHERE id = ?").get(featureId) as
    | { status: string; config: string | null } | undefined;
  if (!row) return;
  if (row.status === "active" || row.status === "draft") return;

  // repo_dir이 있으면 코드베이스 분석 후 컴파일 (GitHub 레포 임포트 경로)
  let repoDir: string | null = null;
  try {
    const cfg = JSON.parse(row.config ?? "{}") as Record<string, unknown>;
    if (typeof cfg.repo_dir === "string" && existsSync(cfg.repo_dir)) {
      repoDir = cfg.repo_dir;
    }
  } catch { /* ignore */ }

  if (repoDir) {
    return compileFromRepo(db, featureId, repoDir, nowMs);
  }

  // 기존 경로: feature/ai/<featureId>.tsx 직접 컴파일
  const srcPath = join(AI_DIR, `${featureId}.tsx`);
  if (!existsSync(srcPath)) {
    db.prepare("UPDATE custom_features SET status = 'error', error_msg = ?, updated_at = ? WHERE id = ?")
      .run("소스 파일을 찾을 수 없습니다: " + srcPath, nowMs(), featureId);
    return;
  }

  db.prepare("UPDATE custom_features SET status = 'draft', error_msg = NULL, bundle = NULL, updated_at = ? WHERE id = ?")
    .run(nowMs(), featureId);

  try {
    const code = readFileSync(srcPath, "utf-8");
    const blocked = validateBundle(code);
    if (blocked) throw new Error(`Safety check failed: ${blocked}`);

    const npmPkgs = extractNpmImports(code);
    if (npmPkgs.length > 0) {
      logger.info(`[compile] npm install --no-save ${npmPkgs.join(" ")}`);
      await installNpmPackages(npmPkgs);
    }

    const iife = await compileToIife(code);
    db.prepare("UPDATE custom_features SET bundle = ?, status = 'active', error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, nowMs(), featureId);
    logger.info(`[compile] done feature=${featureId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[compile] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = 'pending_install', error_msg = ?, updated_at = ? WHERE id = ?")
      .run(msg.slice(0, 400), nowMs(), featureId);
  }
}

async function compileFromRepo(
  db: DbLike,
  featureId: string,
  repoDir: string,
  nowMs: () => number,
): Promise<void> {
  db.prepare("UPDATE custom_features SET status = 'draft', error_msg = NULL, bundle = NULL, updated_at = ? WHERE id = ?")
    .run(nowMs(), featureId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000); // 3분

  try {
    appendLog(db, featureId, "레포 분석 중...", nowMs);

    const readmePath  = join(repoDir, "README.md");
    const pkgPath     = join(repoDir, "package.json");
    const readme      = existsSync(readmePath) ? readFileSync(readmePath, "utf-8") : null;
    const pkgJsonText = existsSync(pkgPath)    ? readFileSync(pkgPath, "utf-8")    : null;

    let npmName = "";
    let pkgDescription = "";

    if (pkgJsonText) {
      try {
        const pkg = JSON.parse(pkgJsonText) as Record<string, unknown>;
        npmName        = typeof pkg.name        === "string" ? pkg.name        : "";
        pkgDescription = typeof pkg.description === "string" ? pkg.description : "";
      } catch { /* ignore */ }
    }

    if (!readme) throw new Error("README.md를 찾을 수 없습니다.");

    // AI로 README 분석 — 타입 판단 + 사용법 추출 한 번에
    appendLog(db, featureId, "README 분석 중 (AI)...", nowMs);

    const readmeTruncated = readme.slice(0, 4000) + (readme.length > 4000 ? "\n...(truncated)" : "");
    const analysisPrompt = [
      npmName        ? `Package: ${npmName}`        : "",
      pkgDescription ? `Description: ${pkgDescription}` : "",
      pkgJsonText    ? `package.json scripts: ${JSON.stringify(JSON.parse(pkgJsonText || "{}").scripts ?? {})}` : "",
      "",
      "README:",
      readmeTruncated,
    ].filter(Boolean).join("\n");

    const cliProvider = readDefaultProvider(db);
    const provider    = findApiProvider(db, cliProvider);

    let repoType: "web-app" | "library" | "cli" = "library";
    let description  = pkgDescription || npmName || "GitHub 레포";
    let devCmd       = "npm run dev";
    let installCmd   = npmName ? `npm install ${npmName}` : "";
    let commands: Array<{ cmd: string; desc: string }> = [];

    try {
      const raw = provider
        ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT_USAGE, analysisPrompt, controller.signal)
        : await callClaudeCli(SYSTEM_PROMPT_USAGE, analysisPrompt, controller.signal);
      const parsed = extractJsonBlock(raw);
      if (parsed) {
        if (parsed.type === "web-app" || parsed.type === "library" || parsed.type === "cli") repoType = parsed.type;
        if (typeof parsed.description === "string") description = parsed.description;
        if (typeof parsed.dev_cmd     === "string") devCmd      = parsed.dev_cmd;
        if (typeof parsed.install_cmd === "string") installCmd  = parsed.install_cmd;
        if (Array.isArray(parsed.commands))         commands    = parsed.commands as Array<{ cmd: string; desc: string }>;
      }
    } catch (e) {
      logger.warn(`[compile-repo] AI analysis failed feature=${featureId}: ${e}`);
      // README 코드 블록에서 폴백 파싱
      const codeBlocks = readme.matchAll(/```(?:bash|sh|shell|cmd)?\s*\n([\s\S]+?)```/g);
      let idx = 0;
      for (const m of codeBlocks) {
        if (idx >= 5) break;
        const cmd = m[1].trim().split("\n")[0].trim();
        if (cmd && cmd.length < 120) { commands.push({ cmd, desc: "" }); idx++; }
      }
    }

    if (repoType === "web-app") {
      // Web-app: npm install 후 dev_cmd 저장
      appendLog(db, featureId, `웹 앱으로 판단됨. npm install 중...`, nowMs);
      await runNpmInstallInDir(repoDir);
      appendLog(db, featureId, "npm install 완료", nowMs);

      const config = JSON.stringify({ type: "web-app", repo_dir: repoDir, dev_cmd: devCmd, description, npm_name: npmName });
      db.prepare("UPDATE custom_features SET config = ?, status = 'active', error_msg = NULL, bundle = NULL, updated_at = ? WHERE id = ?")
        .run(config, nowMs(), featureId);
      appendLog(db, featureId, `✓ 준비 완료! [실행] 버튼으로 앱을 시작하세요. (${devCmd})`, nowMs);
      logger.info(`[compile-repo] web-app ready feature=${featureId} cmd=${devCmd}`);

    } else {
      // Library / CLI: 사용법 저장
      const config = JSON.stringify({ type: "cli-usage", repo_dir: repoDir, npm_name: npmName, description, install_cmd: installCmd, commands });
      db.prepare("UPDATE custom_features SET config = ?, status = 'active', error_msg = NULL, bundle = NULL, updated_at = ? WHERE id = ?")
        .run(config, nowMs(), featureId);
      appendLog(db, featureId, `✓ ${repoType === "cli" ? "CLI 도구" : "라이브러리"} 분석 완료!`, nowMs);
      logger.info(`[compile-repo] ${repoType} ready feature=${featureId} cmds=${commands.length}`);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[compile-repo] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = 'pending_install', error_msg = ?, updated_at = ? WHERE id = ?")
      .run(msg.slice(0, 400), nowMs(), featureId);
  } finally {
    clearTimeout(timeout);
  }
}

export async function runAiGeneration(
  db: DbLike,
  featureId: string,
  userPrompt: string,
  nowMs: () => number,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const cliProvider = readDefaultProvider(db);
    const provider = findApiProvider(db, cliProvider);

    const providerLabel = provider
      ? `${provider.name} / ${resolveModel(provider)}`
      : `claude CLI 폴백 (Settings > API Providers에 키 없음 — defaultProvider: ${cliProvider})`;
    appendLog(db, featureId, `AI 호출 중: ${providerLabel}`, nowMs);
    logger.info(`[custom-feature-ai] generating feature=${featureId} provider=${providerLabel}`);

    const raw = provider
      ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT, userPrompt, controller.signal)
      : await callClaudeCli(SYSTEM_PROMPT, userPrompt, controller.signal);
    appendLog(db, featureId, "AI 응답 완료 — 코드 파싱 중...", nowMs);
    let code = extractCodeBlock(raw);
    // 코드 블록이 없으면 1회 재시도
    try { assertValidCode(code); } catch {
      appendLog(db, featureId, "코드 블록 없음 — AI 재시도 중...", nowMs);
      const raw2 = provider
        ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT, userPrompt, controller.signal)
        : await callClaudeCli(SYSTEM_PROMPT, userPrompt, controller.signal);
      code = extractCodeBlock(raw2);
      assertValidCode(code);
    }

    // feature/ai/<featureId>.tsx 에 소스 저장
    ensureDir(AI_DIR);
    saveSource(join(AI_DIR, `${featureId}.tsx`), code);
    appendLog(db, featureId, `소스 저장: feature/ai/${featureId}.tsx`, nowMs);

    const blocked = validateBundle(code);
    if (blocked) {
      appendLog(db, featureId, `✗ Safety check: ${blocked}`, nowMs);
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", `Safety check failed: ${blocked}`, nowMs(), featureId);
      return;
    }

    appendLog(db, featureId, "esbuild 번들 컴파일 중...", nowMs);
    logger.info(`[custom-feature-ai] compiling feature=${featureId}`);
    let iife: string;
    try {
      iife = await compileToIife(code);
    } catch (buildErr) {
      const buildMsg = buildErr instanceof Error ? buildErr.message : String(buildErr);
      appendLog(db, featureId, `✗ 컴파일 실패: ${buildMsg}`, nowMs);
      throw buildErr;
    }

    db.prepare("UPDATE custom_features SET bundle = ?, status = ?, error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, "active", nowMs(), featureId);

    appendLog(db, featureId, "✓ 완료!", nowMs);
    logger.info(`[custom-feature-ai] done feature=${featureId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[custom-feature-ai] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
      .run("error", msg.slice(0, 400), nowMs(), featureId);
  } finally {
    clearTimeout(timeout);
  }
}
