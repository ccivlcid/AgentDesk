import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export type WorktreeInfo = {
  worktreePath: string;
  branchName: string;
  projectPath: string;
  /** true when git is unavailable and agent works directly in the project dir */
  directMode?: boolean;
};

type CreateWorktreeLifecycleToolsDeps = {
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  taskWorktrees: Map<string, WorktreeInfo>;
};

export function createWorktreeLifecycleTools(deps: CreateWorktreeLifecycleToolsDeps) {
  const { appendTaskLog, taskWorktrees } = deps;

  function isGitRepo(dir: string): boolean {
    try {
      execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, stdio: "pipe", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Check if git is available in PATH */
  function isGitAvailable(): boolean {
    try {
      execFileSync("git", ["--version"], { stdio: "pipe", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Detect if a directory looks like an Electron/packaged app directory (not a real project) */
  function looksLikePackagedAppDir(dir: string): boolean {
    const markers = ["resources", "locales", "AgentDesk.exe", "agentdesk.exe"];
    try {
      const entries = fs.readdirSync(dir);
      const found = markers.filter((m) => entries.some((e) => e.toLowerCase() === m.toLowerCase()));
      return found.length >= 2;
    } catch {
      return false;
    }
  }

  function ensureWorktreeBootstrapRepo(projectPath: string, taskId: string): boolean {
    if (isGitRepo(projectPath)) return true;
    const shortId = taskId.slice(0, 8);

    // Check git availability first
    if (!isGitAvailable()) {
      appendTaskLog(taskId, "error", `Git is not installed or not in PATH. Cannot create worktree.`);
      console.error(`[AgentDesk] Git not found in PATH for task ${shortId}`);
      return false;
    }

    try {
      if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
        appendTaskLog(taskId, "system", `Git bootstrap skipped: invalid project path (${projectPath})`);
        return false;
      }
    } catch {
      appendTaskLog(taskId, "system", `Git bootstrap skipped: cannot access project path (${projectPath})`);
      return false;
    }

    // Refuse to bootstrap in a packaged app directory — it's not a real project
    if (looksLikePackagedAppDir(projectPath)) {
      appendTaskLog(
        taskId,
        "error",
        `Git bootstrap skipped: '${projectPath}' appears to be an Electron app directory, not a project. ` +
          `Please set a valid project_path on the task or project.`,
      );
      console.error(`[AgentDesk] Refusing git bootstrap in app dir for task ${shortId}: ${projectPath}`);
      return false;
    }

    try {
      appendTaskLog(
        taskId,
        "system",
        `Git repository not found at '${projectPath}'. Bootstrapping local repository for worktree execution...`,
      );

      try {
        execFileSync("git", ["init", "-b", "main"], { cwd: projectPath, stdio: "pipe", timeout: 10000 });
      } catch {
        execFileSync("git", ["init"], { cwd: projectPath, stdio: "pipe", timeout: 10000 });
      }

      const excludePath = path.join(projectPath, ".git", "info", "exclude");
      const baseIgnore = [
        "node_modules/",
        "dist/",
        "dist-server/",
        ".agentdesk-worktrees/",
        ".agentdesk/",
        ".DS_Store",
        "*.log",
        "*.exe",
        "*.asar",
        "resources/",
        "locales/",
        "release/",
      ];
      let existingExclude = "";
      try {
        existingExclude = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, "utf8") : "";
      } catch {
        existingExclude = "";
      }
      const appendLines = baseIgnore.filter((line) => !existingExclude.includes(line));
      if (appendLines.length > 0) {
        const prefix = existingExclude && !existingExclude.endsWith("\n") ? "\n" : "";
        fs.appendFileSync(excludePath, `${prefix}${appendLines.join("\n")}\n`, "utf8");
      }

      const readConfig = (key: string): string => {
        try {
          return execFileSync("git", ["config", "--get", key], { cwd: projectPath, stdio: "pipe", timeout: 3000 })
            .toString()
            .trim();
        } catch {
          return "";
        }
      };
      if (!readConfig("user.name")) {
        execFileSync("git", ["config", "user.name", "AgentDesk Bot"], {
          cwd: projectPath,
          stdio: "pipe",
          timeout: 3000,
        });
      }
      if (!readConfig("user.email")) {
        execFileSync("git", ["config", "user.email", "agentdesk@local"], {
          cwd: projectPath,
          stdio: "pipe",
          timeout: 3000,
        });
      }

      execFileSync("git", ["add", "-A"], { cwd: projectPath, stdio: "pipe", timeout: 30000 });
      const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
        cwd: projectPath,
        stdio: "pipe",
        timeout: 5000,
      })
        .toString()
        .trim();
      if (staged) {
        execFileSync("git", ["commit", "-m", "chore: initialize project for AgentDesk worktrees"], {
          cwd: projectPath,
          stdio: "pipe",
          timeout: 30000,
        });
      } else {
        execFileSync("git", ["commit", "--allow-empty", "-m", "chore: initialize project for AgentDesk worktrees"], {
          cwd: projectPath,
          stdio: "pipe",
          timeout: 10000,
        });
      }

      appendTaskLog(taskId, "system", "Git repository initialized automatically for worktree execution.");
      console.log(`[AgentDesk] Auto-initialized git repo for task ${shortId} at ${projectPath}`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stderr = (err as any)?.stderr ? (err as any).stderr.toString().trim() : "";
      const detail = stderr ? `${msg} | stderr: ${stderr}` : msg;
      appendTaskLog(taskId, "error", `Git bootstrap failed: ${detail}`);
      console.error(`[AgentDesk] Failed git bootstrap for task ${shortId}: ${detail}`);
      return false;
    }
  }

  function createWorktree(projectPath: string, taskId: string, agentName: string, baseBranch?: string): string | null {
    // If git is not available, fall back to direct mode (no isolation)
    if (!isGitAvailable()) {
      const shortId = taskId.slice(0, 8);
      appendTaskLog(
        taskId,
        "system",
        `Git is not installed. Running in direct mode (no worktree isolation) at '${projectPath}'.`,
      );
      console.log(
        `[AgentDesk] Git not available — direct mode for task ${shortId} at ${projectPath} (agent: ${agentName})`,
      );
      taskWorktrees.set(taskId, {
        worktreePath: projectPath,
        branchName: "",
        projectPath,
        directMode: true,
      });
      return projectPath;
    }

    if (!ensureWorktreeBootstrapRepo(projectPath, taskId) || !isGitRepo(projectPath)) {
      // Bootstrap failed but git exists — fall back to direct mode instead of blocking
      const shortId = taskId.slice(0, 8);
      appendTaskLog(
        taskId,
        "system",
        `Git worktree bootstrap failed for '${projectPath}'. Falling back to direct mode (no isolation).`,
      );
      console.log(
        `[AgentDesk] Worktree bootstrap failed — direct mode fallback for task ${shortId} at ${projectPath} (agent: ${agentName})`,
      );
      taskWorktrees.set(taskId, {
        worktreePath: projectPath,
        branchName: "",
        projectPath,
        directMode: true,
      });
      return projectPath;
    }

    const shortId = taskId.slice(0, 8);
    const branchName = `agentdesk/${shortId}`;
    const worktreeBase = path.join(projectPath, ".agentdesk-worktrees");
    const worktreePath = path.join(worktreeBase, shortId);

    try {
      fs.mkdirSync(worktreeBase, { recursive: true });
      execFileSync("git", ["worktree", "prune"], { cwd: projectPath, stdio: "pipe", timeout: 5000 });

      // Get current branch/HEAD as base
      let base: string;
      if (baseBranch) {
        try {
          base = execFileSync("git", ["rev-parse", baseBranch], { cwd: projectPath, stdio: "pipe", timeout: 5000 })
            .toString()
            .trim();
        } catch {
          base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: projectPath, stdio: "pipe", timeout: 5000 })
            .toString()
            .trim();
        }
      } else {
        base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: projectPath, stdio: "pipe", timeout: 5000 })
          .toString()
          .trim();
      }

      const branchCandidates = [branchName, `${branchName}-1`, `${branchName}-2`, `${branchName}-3`];
      let created = false;
      let selectedBranch = branchName;
      let selectedWorktreePath = worktreePath;
      let lastError: unknown = null;

      for (let idx = 0; idx < branchCandidates.length; idx += 1) {
        const candidateBranch = branchCandidates[idx]!;
        const candidatePath = idx === 0 ? worktreePath : path.join(worktreeBase, `${shortId}-${idx}`);
        try {
          if (fs.existsSync(candidatePath)) {
            fs.rmSync(candidatePath, { recursive: true, force: true });
          }
        } catch {
          // best effort cleanup
        }

        const branchExists = (() => {
          try {
            execFileSync("git", ["show-ref", "--verify", `refs/heads/${candidateBranch}`], {
              cwd: projectPath,
              stdio: "pipe",
              timeout: 5000,
            });
            return true;
          } catch {
            return false;
          }
        })();

        const addArgs = branchExists
          ? ["worktree", "add", candidatePath, candidateBranch]
          : ["worktree", "add", candidatePath, "-b", candidateBranch, base];

        try {
          execFileSync("git", addArgs, {
            cwd: projectPath,
            stdio: "pipe",
            timeout: 15000,
          });
          selectedBranch = candidateBranch;
          selectedWorktreePath = candidatePath;
          created = true;
          break;
        } catch (err: unknown) {
          const stderr = (err as any)?.stderr ? (err as any).stderr.toString().trim() : "";
          console.error(
            `[AgentDesk] git worktree add failed for branch ${candidateBranch}: ${err instanceof Error ? err.message : String(err)}${stderr ? ` | stderr: ${stderr}` : ""}`,
          );
          lastError = err;
        }
      }

      if (!created) {
        const errMsg = lastError instanceof Error ? lastError.message : String(lastError ?? "worktree_add_failed");
        const stderr = (lastError as any)?.stderr ? (lastError as any).stderr.toString().trim() : "";
        const detail = stderr ? `${errMsg} | stderr: ${stderr}` : errMsg;
        appendTaskLog(taskId, "error", `Failed to create git worktree at '${worktreePath}': ${detail}`);
        throw new Error(detail);
      }

      // Propagate .claude/skills into the worktree so agents can resolve installed skills
      try {
        const serverSkillsDir = path.join(process.cwd(), ".claude", "skills");
        if (fs.existsSync(serverSkillsDir)) {
          const wtClaudeDir = path.join(selectedWorktreePath, ".claude");
          const wtSkillsLink = path.join(wtClaudeDir, "skills");
          if (!fs.existsSync(wtSkillsLink)) {
            fs.mkdirSync(wtClaudeDir, { recursive: true });
            fs.symlinkSync(serverSkillsDir, wtSkillsLink, "junction");
          }
        }
      } catch {
        // best effort — skill propagation failure should not block execution
      }

      taskWorktrees.set(taskId, { worktreePath: selectedWorktreePath, branchName: selectedBranch, projectPath });
      console.log(
        `[AgentDesk] Created worktree for task ${shortId}: ${selectedWorktreePath} (branch: ${selectedBranch}, agent: ${agentName})`,
      );
      return selectedWorktreePath;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stderr = (err as any)?.stderr ? (err as any).stderr.toString().trim() : "";
      const detail = stderr ? `${msg} | stderr: ${stderr}` : msg;
      appendTaskLog(
        taskId,
        "error",
        `Worktree creation failed: ${detail}. Falling back to direct mode (no isolation).`,
      );
      console.error(`[AgentDesk] Failed to create worktree for task ${shortId}: ${detail} — falling back to direct mode`);
      // Fall back to direct mode instead of blocking execution
      taskWorktrees.set(taskId, {
        worktreePath: projectPath,
        branchName: "",
        projectPath,
        directMode: true,
      });
      return projectPath;
    }
  }

  function cleanupWorktree(projectPath: string, taskId: string): void {
    const info = taskWorktrees.get(taskId);
    if (!info) return;

    // Direct mode: no worktree to clean up
    if (info.directMode) {
      taskWorktrees.delete(taskId);
      console.log(`[AgentDesk] Direct mode cleanup for task ${taskId.slice(0, 8)} (no-op)`);
      return;
    }

    const shortId = taskId.slice(0, 8);

    try {
      execFileSync("git", ["worktree", "remove", info.worktreePath, "--force"], {
        cwd: projectPath,
        stdio: "pipe",
        timeout: 10000,
      });
    } catch {
      console.warn(`[AgentDesk] git worktree remove failed for ${shortId}, falling back to manual cleanup`);
      try {
        if (fs.existsSync(info.worktreePath)) {
          fs.rmSync(info.worktreePath, { recursive: true, force: true });
        }
        execFileSync("git", ["worktree", "prune"], { cwd: projectPath, stdio: "pipe", timeout: 5000 });
      } catch {
        /* ignore */
      }
    }

    try {
      execFileSync("git", ["branch", "-D", info.branchName], {
        cwd: projectPath,
        stdio: "pipe",
        timeout: 5000,
      });
    } catch {
      console.warn(`[AgentDesk] Failed to delete branch ${info.branchName} — may need manual cleanup`);
    }

    taskWorktrees.delete(taskId);
    console.log(`[AgentDesk] Cleaned up worktree for task ${shortId}`);
  }

  return {
    isGitRepo,
    createWorktree,
    cleanupWorktree,
  };
}
