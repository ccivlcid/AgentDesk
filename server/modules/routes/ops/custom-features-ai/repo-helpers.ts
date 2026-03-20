import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import logger from "../../../../lib/logger.ts";
import { ensureDir, FEATURE_DIR } from "./paths.ts";

export function parseGithubRepo(repoUrl: string): { user: string; repo: string } | null {
  try {
    const u = new URL(repoUrl);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { user: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch { return null; }
}

/** GitHub raw URL로 텍스트 파일 fetch (없으면 null) */
export async function fetchGithubRaw(user: string, repo: string, filePath: string, signal: AbortSignal): Promise<string | null> {
  for (const branch of ["main", "master", "HEAD"]) {
    try {
      const url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
      const r = await fetch(url, { headers: { "User-Agent": "AgentDesk/1.0" }, signal });
      if (r.ok) return await r.text();
    } catch { /* 다음 branch 시도 */ }
  }
  return null;
}

/** npm 패키지 설치 — feature/node_modules/ 에 격리 설치 (--prefix, 프로젝트 package.json 미수정) */
export function installNpmPackages(pkgNames: string[]): Promise<void> {
  if (pkgNames.length === 0) return Promise.resolve();
  ensureDir(FEATURE_DIR);
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const child = spawn(
      "npm", ["install", "--prefix", FEATURE_DIR, "--no-save", ...pkgNames],
      { shell: isWin, stdio: "ignore" },
    );
    child.on("close", () => resolve());
    child.on("error", () => resolve());
    setTimeout(() => { try { child.kill(); } catch { /* ignore */ } resolve(); }, 90_000);
  });
}

/** source code에서 npm 패키지 import 이름 추출 (relative/node-builtin 제외) */
export function extractNpmImports(code: string): string[] {
  const importRe = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  const SKIP = new Set(["react", "react-dom", "react-dom/client", "react/jsx-runtime"]);
  const pkgs = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(code)) !== null) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) continue;
    if (SKIP.has(spec)) continue;
    // scoped: @scope/pkg → 두 세그먼트, 일반: pkg → 첫 세그먼트
    const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    pkgs.add(pkg);
  }
  return [...pkgs];
}

/** git clone --depth=1 */
export function gitClone(repoUrl: string, destDir: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const child = spawn(
      "git", ["clone", "--depth=1", "--single-branch", repoUrl, destDir],
      { shell: isWin, stdio: ["ignore", "pipe", "pipe"] },
    );
    let errOut = "";
    child.stderr?.on("data", (d: Buffer) => { errOut += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone 실패 (exit ${code}): ${errOut.slice(0, 200)}`));
    });
    child.on("error", (e: Error) => reject(new Error(`git 실행 실패: ${e.message}`)));
    signal.addEventListener("abort", () => { try { child.kill(); } catch { /* ignore */ } });
    setTimeout(() => { try { child.kill(); } catch { /* ignore */ } reject(new Error("git clone 타임아웃 (60초)")); }, 60_000);
  });
}

/** API provider가 없을 때 Claude Code CLI로 폴백 호출
 *  임시 파일 + 셸 리다이렉션(< tmpfile)으로 전달 — Windows CLI 인수 길이 제한 우회
 */
export async function callClaudeCli(systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  const combined = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  // 임시 파일에 프롬프트 저장
  const tmpFile = join(tmpdir(), `agd-${Date.now()}.txt`);
  writeFileSync(tmpFile, combined, "utf-8");

  // 셸 리다이렉션으로 stdin 전달: claude -p < tmpfile
  // shell: true 로 < 리다이렉션 사용, stdio["ignore"] — 셸이 파일을 stdin으로 넘김
  const shellCmd = `claude -p < "${tmpFile.replace(/\\/g, "/")}"`;

  return new Promise((resolve, reject) => {
    const child = spawn(shellCmd, [], {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
    child.stderr?.on("data", (d: Buffer) => { err += d.toString(); });
    child.on("close", (code, sig) => {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error(
        sig        ? `claude CLI 시그널 종료: ${sig}` :
        code !== 0 ? `claude CLI 오류 (exit ${code}): ${err.slice(0, 400)}` :
                     "claude CLI 응답이 비어있습니다.",
      ));
    });
    child.on("error", (e: Error) => {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      reject(new Error(`claude CLI 실행 실패: ${e.message}`));
    });
    signal.addEventListener("abort", () => { try { child.kill(); } catch { /* ignore */ } });
  });
}

export function runNpmInstallInDir(dir: string): Promise<void> {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    // lockfile로 패키지 매니저 감지
    let pm = "npm";
    if (existsSync(join(dir, "pnpm-lock.yaml"))) pm = "pnpm";
    else if (existsSync(join(dir, "yarn.lock"))) pm = "yarn";
    const args = pm === "yarn" ? ["install"] : ["install", "--include=dev"];
    logger.info(`[install] ${pm} ${args.join(" ")} in ${dir}`);
    const child = spawn(pm, args, { cwd: dir, shell: isWin, stdio: "inherit" });
    child.on("close", () => resolve());
    child.on("error", () => resolve());
    setTimeout(() => { try { child.kill(); } catch { /* ignore */ } resolve(); }, 300_000);
  });
}
