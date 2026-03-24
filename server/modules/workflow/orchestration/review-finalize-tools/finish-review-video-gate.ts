import fs from "node:fs";
import path from "node:path";
import {
  discoverVideoArtifact,
  resolveVideoArtifactRelativeCandidates,
  resolveVideoArtifactSpecForTask,
} from "../../packs/video-artifact.ts";
import { evaluateRemotionOnlyGateFromLogFiles } from "../../packs/video-render-engine-gate.ts";
import type { CreateReviewFinalizeToolsDeps } from "./types.ts";

type CurrentTaskShape = {
  project_id: string | null;
  project_path: string | null;
  department_id: string | null;
  workflow_pack_key: string | null;
  source_task_id: string | null;
};

/** @returns true if finishReview should return early (blocked). */
export function shouldAbortFinishReviewForVideoPreprodPack(params: {
  taskId: string;
  taskTitle: string;
  lang: string;
  currentTask: CurrentTaskShape;
  deps: CreateReviewFinalizeToolsDeps;
}): boolean {
  const { taskId, taskTitle, lang, currentTask, deps } = params;
  const { db, logsDir, appendTaskLog, notifyClient, pickL, l, taskWorktrees } = deps;

  if (currentTask.workflow_pack_key !== "video_preprod" || currentTask.source_task_id) {
    return false;
  }

  const wtInfo = taskWorktrees.get(taskId) as
    | { worktreePath?: string; projectPath?: string; branchName?: string }
    | undefined;
  const outputRoot = currentTask.project_path || wtInfo?.projectPath || process.cwd();
  const videoArtifactSpec = resolveVideoArtifactSpecForTask(db, {
    project_id: currentTask.project_id,
    project_path: currentTask.project_path,
    department_id: currentTask.department_id,
    workflow_pack_key: currentTask.workflow_pack_key,
  });
  const candidateRelativePaths = resolveVideoArtifactRelativeCandidates(videoArtifactSpec);
  const candidatePaths = [
    ...candidateRelativePaths.map((relative) =>
      wtInfo?.worktreePath ? path.join(wtInfo.worktreePath, relative) : null,
    ),
    ...candidateRelativePaths.map((relative) => (outputRoot ? path.join(outputRoot, relative) : null)),
  ].filter((entry): entry is string => Boolean(entry));

  let verifiedPath: string | null = null;
  let verifiedSize = 0;
  for (const candidate of candidatePaths) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const stat = fs.statSync(candidate);
      if (stat.size > 0) {
        verifiedPath = candidate;
        verifiedSize = stat.size;
        break;
      }
    } catch {
      // best effort
    }
  }

  if (!verifiedPath) {
    const searchRoots = [wtInfo?.worktreePath, outputRoot].filter(Boolean) as string[];
    for (const root of searchRoots) {
      const discovered = discoverVideoArtifact(root);
      if (discovered) {
        try {
          const stat = fs.statSync(discovered);
          if (stat.size > 0) {
            verifiedPath = discovered;
            verifiedSize = stat.size;
            appendTaskLog(
              taskId,
              "system",
              `Review gate: video artifact discovered via directory scan: ${discovered} (${stat.size} bytes)`,
            );
            break;
          }
        } catch {
          // best effort
        }
      }
    }
  }

  if (!verifiedPath) {
    appendTaskLog(
      taskId,
      "system",
      `Review hold: video artifact gate blocked approval (missing/empty video file). checked=${candidatePaths.join(", ")}`,
    );
    notifyClient(
      pickL(
        l(
          [
            `'${taskTitle}' 는 영상 산출물(\`${videoArtifactSpec.relativePath}\`)이 확인되지 않아 팀장회의 승인/머지가 보류되었습니다. 렌더 결과를 확인한 뒤 다시 승인해 주세요.`,
          ],
          [
            `'${taskTitle}' approval/merge is on hold because \`${videoArtifactSpec.relativePath}\` is not verified. Verify rendered output first, then approve again.`,
          ],
          [
            `'${taskTitle}' は \`${videoArtifactSpec.relativePath}\` 未確認のため承認/マージが保留されました。レンダー結果確認後に再承認してください。`,
          ],
          [
            `'${taskTitle}' 因 \`${videoArtifactSpec.relativePath}\` 未验证，审批/合并已暂停。请先确认渲染结果后再审批。`,
          ],
        ),
        lang,
      ),
      taskId,
    );
    return true;
  }

  appendTaskLog(
    taskId,
    "system",
    `Review gate: video artifact verified for approval (${verifiedPath}, ${verifiedSize} bytes)`,
  );

  const remotionEvidenceTaskIds = new Set<string>([taskId]);
  try {
    const renderDelegatedRows = db
      .prepare(
        `
              SELECT delegated_task_id
              FROM subtasks
              WHERE task_id = ?
                AND title LIKE '%[VIDEO_FINAL_RENDER]%'
                AND delegated_task_id IS NOT NULL
                AND TRIM(delegated_task_id) != ''
            `,
      )
      .all(taskId) as Array<{ delegated_task_id: string | null }>;
    for (const row of renderDelegatedRows) {
      const id = String(row?.delegated_task_id ?? "").trim();
      if (id) remotionEvidenceTaskIds.add(id);
    }
  } catch {
    // best effort
  }
  try {
    const childRows = db
      .prepare(
        `
              SELECT id
              FROM tasks
              WHERE source_task_id = ?
                AND status IN ('in_progress', 'review', 'done')
            `,
      )
      .all(taskId) as Array<{ id: string }>;
    for (const row of childRows) {
      const id = String(row?.id ?? "").trim();
      if (id) remotionEvidenceTaskIds.add(id);
    }
  } catch {
    // best effort
  }

  const remotionGate = evaluateRemotionOnlyGateFromLogFiles({
    logsDir: String(logsDir ?? process.cwd()),
    taskIds: [...remotionEvidenceTaskIds],
  });
  if (!remotionGate.passed) {
    appendTaskLog(
      taskId,
      "system",
      `Review hold: video artifact gate blocked approval (remotion evidence missing/invalid). checked_tasks=${remotionGate.checkedTaskIds.join(", ")}, remotion_tasks=${remotionGate.remotionEvidenceTaskIds.join(", ") || "none"}, forbidden_tasks=${remotionGate.forbiddenEngineTaskIds.join(", ") || "none"}`,
    );
    notifyClient(
      pickL(
        l(
          [
            `'${taskTitle}' 는 Remotion 렌더 실행 증빙이 확인되지 않아 승인/머지가 보류되었습니다. [VIDEO_FINAL_RENDER]는 Remotion으로 다시 렌더 후 승인해 주세요.`,
          ],
          [
            `'${taskTitle}' approval/merge is on hold because Remotion render evidence was not verified. Re-render [VIDEO_FINAL_RENDER] with Remotion, then approve again.`,
          ],
          [
            `'${taskTitle}' は Remotion レンダー実行の証跡が確認できないため承認/マージを保留しました。[VIDEO_FINAL_RENDER] を Remotion で再レンダー後に再承認してください。`,
          ],
          [
            `'${taskTitle}' 因未验证到 Remotion 渲染证据，审批/合并已暂停。请使用 Remotion 重新渲染 [VIDEO_FINAL_RENDER] 后再审批。`,
          ],
        ),
        lang,
      ),
      taskId,
    );
    return true;
  }

  appendTaskLog(
    taskId,
    "system",
    `Review gate: remotion runtime evidence verified (${remotionGate.remotionEvidenceTaskIds.join(", ")})`,
  );
  return false;
}
