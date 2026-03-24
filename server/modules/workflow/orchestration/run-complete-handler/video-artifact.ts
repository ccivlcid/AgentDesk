/**
 * Video artifact sync: copy from worktree to project, discover and verify artifact.
 * Used by run-complete handler for video_preprod / VIDEO_FINAL_RENDER tasks.
 */

import fs from "node:fs";
import path from "node:path";
import {
  discoverVideoArtifact,
  resolveVideoArtifactRelativeCandidates,
  resolveVideoArtifactSpecForTask,
} from "../../packs/video-artifact.ts";
import type { DatabaseSync } from "node:sqlite";
import type { VideoArtifactSpec } from "../../packs/video-artifact.ts";

export type VideoArtifactSyncResult = {
  videoArtifactReady: boolean;
  videoArtifactSpec: VideoArtifactSpec;
  projectCandidates: string[];
};

export type VideoArtifactSyncDeps = {
  db: DatabaseSync;
  taskWorktrees: Map<string, { worktreePath?: string; projectPath?: string }>;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
};

/**
 * Probe and sync video artifact: copy from worktree to project if present,
 * then verify at project path or discover in video_output/out. Returns
 * artifact readiness and spec for gate/recovery logic.
 */
export function handleVideoArtifactSync(
  taskId: string,
  task: {
    project_id: string | null;
    project_path: string | null;
    department_id: string | null;
    workflow_pack_key: string | null;
    context_hint?: string | null;
  },
  deps: VideoArtifactSyncDeps,
): VideoArtifactSyncResult {
  const { db, taskWorktrees, appendTaskLog } = deps;
  const videoArtifactSpec = resolveVideoArtifactSpecForTask(db, {
    project_id: task.project_id,
    project_path: task.project_path,
    department_id: task.department_id,
    workflow_pack_key: task.context_hint ?? task.workflow_pack_key,
  });
  const candidateRelativePaths = resolveVideoArtifactRelativeCandidates(videoArtifactSpec);
  const wtInfo = taskWorktrees.get(taskId) as { worktreePath?: string; projectPath?: string } | undefined;
  const outputRoot = task.project_path || wtInfo?.projectPath || process.cwd();
  const projectCandidates = candidateRelativePaths.map((relative) => path.join(outputRoot, relative));

  let videoArtifactReady = false;

  if (wtInfo?.worktreePath) {
    const worktreeCandidates = candidateRelativePaths.map((relative) =>
      path.join(wtInfo.worktreePath!, relative),
    );
    let sourceVideo: string | null = null;
    for (const candidate of worktreeCandidates) {
      if (!fs.existsSync(candidate)) continue;
      try {
        if (fs.statSync(candidate).size > 0) {
          sourceVideo = candidate;
          break;
        }
      } catch {
        // Ignore stat errors and continue searching candidates.
      }
    }

    if (!sourceVideo) {
      sourceVideo = discoverVideoArtifact(wtInfo.worktreePath!);
      if (sourceVideo) {
        appendTaskLog(
          taskId,
          "system",
          `Video artifact discovered via directory scan in worktree: ${sourceVideo}`,
        );
      }
    }

    if (sourceVideo) {
      try {
        const destVideo = path.join(outputRoot, videoArtifactSpec.relativePath);
        fs.mkdirSync(path.dirname(destVideo), { recursive: true });
        fs.copyFileSync(sourceVideo, destVideo);
        const size = fs.statSync(destVideo).size;
        if (size > 0) {
          videoArtifactReady = true;
          appendTaskLog(
            taskId,
            "system",
            `Video artifact synchronized: ${destVideo} (${size} bytes, source=${sourceVideo})`,
          );
        } else {
          appendTaskLog(taskId, "system", `Video artifact sync failed: rendered file is empty (${destVideo})`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        appendTaskLog(taskId, "system", `Video artifact sync failed: ${msg}`);
      }
    } else {
      appendTaskLog(
        taskId,
        "system",
        `Video artifact not found in worktree (checked: ${worktreeCandidates.join(", ")})`,
      );
    }
  }

  if (!videoArtifactReady) {
    for (const projectVideo of projectCandidates) {
      if (!fs.existsSync(projectVideo)) continue;
      try {
        const size = fs.statSync(projectVideo).size;
        if (size > 0) {
          videoArtifactReady = true;
          appendTaskLog(
            taskId,
            "system",
            `Video artifact verified at project path: ${projectVideo} (${size} bytes)`,
          );
          break;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        appendTaskLog(taskId, "system", `Video artifact verification failed: ${msg}`);
      }
    }
  }

  if (!videoArtifactReady) {
    const discovered = discoverVideoArtifact(outputRoot);
    if (discovered) {
      videoArtifactReady = true;
      appendTaskLog(
        taskId,
        "system",
        `Video artifact discovered via directory scan at project root: ${discovered}`,
      );
    }
  }

  return {
    videoArtifactReady,
    videoArtifactSpec,
    projectCandidates,
  };
}
