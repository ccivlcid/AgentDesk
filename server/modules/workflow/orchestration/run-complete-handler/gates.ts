/**
 * Post-exit gate evaluation: Remotion/video gate, QA rules, pipeline auto-gates.
 * Used by run-complete handler to adjust finalExitCode and append gate log messages.
 */

import { evaluateRemotionOnlyGateFromLogFiles } from "../../packs/video-render-engine-gate.ts";
import { evaluateAutoGates } from "../../../routes/core/pipeline-gates.ts";
import type { VideoArtifactSyncResult } from "./video-artifact.ts";

export type RunAfterExitGatesResult = { finalExitCode: number };

export type RunAfterExitGatesDeps = {
  db: {
    prepare: (sql: string) => {
      get: (...args: unknown[]) => unknown;
      run: (...args: unknown[]) => unknown;
    };
  };
  logsDir: string;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  nowMs: () => number;
};

export type TaskForGates = {
  title: string;
  workflow_pack_key: string | null;
};

/**
 * Evaluate Remotion-only gate, QA rules (requireSections, citations, test evidence),
 * and pipeline auto-gates. Adjusts finalExitCode for video final render (recovery or 86/87).
 */
export function runAfterExitGates(
  taskId: string,
  task: TaskForGates,
  result: string | null,
  initialExitCode: number,
  artifactSync: VideoArtifactSyncResult,
  deps: RunAfterExitGatesDeps,
): RunAfterExitGatesResult {
  const { db, logsDir, appendTaskLog, nowMs } = deps;
  let finalExitCode = initialExitCode;
  const isVideoFinalRenderTask = /\[VIDEO_FINAL_RENDER\]/i.test(task.title);

  // Remotion gate: recovery when exit !== 0, or set 86 when exit === 0 but gate failed
  if (finalExitCode !== 0 && isVideoFinalRenderTask) {
    const remotionGate = evaluateRemotionOnlyGateFromLogFiles({ logsDir, taskIds: [taskId] });
    if (remotionGate.passed && artifactSync.videoArtifactReady) {
      appendTaskLog(
        taskId,
        "system",
        "Final render recovery: detected valid Remotion output despite non-zero exit; continuing as success.",
      );
      finalExitCode = 0;
    } else {
      appendTaskLog(
        taskId,
        "system",
        `Final render recovery skipped: remotion_ok=${remotionGate.passed ? "yes" : "no"}, artifact_ok=${artifactSync.videoArtifactReady ? "yes" : "no"}`,
      );
    }
  }
  if (finalExitCode === 0 && isVideoFinalRenderTask) {
    const remotionGate = evaluateRemotionOnlyGateFromLogFiles({ logsDir, taskIds: [taskId] });
    if (!remotionGate.passed) {
      finalExitCode = 86;
      appendTaskLog(
        taskId,
        "system",
        `Video render engine gate failed: Remotion evidence required for [VIDEO_FINAL_RENDER]. checked_tasks=${remotionGate.checkedTaskIds.join(", ") || taskId}, remotion_tasks=${remotionGate.remotionEvidenceTaskIds.join(", ") || "none"}, forbidden_tasks=${remotionGate.forbiddenEngineTaskIds.join(", ") || "none"}`,
      );
    } else {
      appendTaskLog(
        taskId,
        "system",
        `Video render engine gate passed: Remotion evidence detected (${remotionGate.remotionEvidenceTaskIds.join(", ")})`,
      );
    }
  }

  // Generic QA gate for non-video packs
  if (finalExitCode === 0 && task.workflow_pack_key && task.workflow_pack_key !== "video_preprod") {
    try {
      const packRow = db.prepare("SELECT qa_rules_json FROM workflow_packs WHERE key = ?").get(
        task.workflow_pack_key,
      ) as { qa_rules_json: string } | undefined;
      if (packRow?.qa_rules_json) {
        const qaRules = JSON.parse(packRow.qa_rules_json);
        if (qaRules.requireSections && qaRules.failOnMissingSections && result) {
          const sections = qaRules.requireSections as string[];
          const missingSection = sections.find((s: string) => {
            const pattern = new RegExp(`(^|\\n)\\s*#{1,3}\\s*${s.replace(/_/g, "[_ ]")}`, "i");
            return !pattern.test(result);
          });
          if (missingSection) {
            appendTaskLog(
              taskId,
              "system",
              `QA gate warning: required section '${missingSection}' not found in output. Task marked for review attention.`,
            );
          }
        }
        if (qaRules.failWithoutCitations && result) {
          const hasLinks = /https?:\/\/[^\s)]+/.test(result);
          if (!hasLinks) {
            appendTaskLog(
              taskId,
              "system",
              `QA gate warning: no citations/links found in web research output. Review will require citation verification.`,
            );
          }
        }
        if (qaRules.requireTestEvidence && result) {
          const hasTestEvidence = /(?:test|spec|passing|passed|PASS|✓|✔|ok\s+\d+)/i.test(result);
          if (!hasTestEvidence) {
            appendTaskLog(
              taskId,
              "system",
              `QA gate warning: no test evidence found in output. Review will check for test coverage.`,
            );
          }
        }
      }
    } catch {
      /* ignore QA gate parse errors */
    }
  }

  // Pipeline auto-gates
  if (finalExitCode === 0 && task.workflow_pack_key) {
    try {
      const gateResults = evaluateAutoGates(db, taskId, task.workflow_pack_key, result, nowMs());
      const failed = gateResults.filter((g) => g.status === "failed");
      if (failed.length > 0) {
        const failedNames = failed.map((g) => `${g.gate_key}: ${g.note}`).join("; ");
        appendTaskLog(taskId, "system", `Pipeline gate(s) failed: ${failedNames}`);
      } else if (gateResults.length > 0) {
        appendTaskLog(taskId, "system", `Pipeline auto-gates passed (${gateResults.length} gates evaluated)`);
      }
    } catch {
      /* ignore gate evaluation errors */
    }
  }

  return { finalExitCode };
}

// ─── Video artifact gate (success path: defer or check now, may set exit 87) ───

export type VideoArtifactGateDeps = RunAfterExitGatesDeps & {
  notifyClient: (message: string, taskId: string) => void;
  pickL: (pool: unknown, lang: string) => string;
  l: (ko: string[], en: string[], ja?: string[], zh?: string[]) => unknown;
  resolveLang: (text: string) => string;
};

export type TaskForVideoGate = { title: string; description: string | null; source_task_id: string | null };

/**
 * Apply video preprod artifact gate on success: defer if open subtasks/children,
 * else check artifact and set finalExitCode 87 for VIDEO_FINAL_RENDER or notify for review.
 */
export function applyVideoArtifactGateAfterSuccess(
  taskId: string,
  task: TaskForVideoGate,
  isVideoFinalRenderTask: boolean,
  artifactSync: VideoArtifactSyncResult,
  deps: VideoArtifactGateDeps,
): { finalExitCode: number } {
  const { db, appendTaskLog, notifyClient, pickL, l, resolveLang } = deps;
  let finalExitCode = 0;
  const rootVideoTask = !task.source_task_id;
  const shouldCheckArtifactNow = rootVideoTask || isVideoFinalRenderTask;
  let deferArtifactGate = false;

  if (rootVideoTask && !isVideoFinalRenderTask) {
    const openSubtasksRow = db
      .prepare("SELECT COUNT(*) AS cnt FROM subtasks WHERE task_id = ? AND status NOT IN ('done', 'cancelled')")
      .get(taskId) as { cnt?: number } | undefined;
    const openChildTasksRow = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM tasks WHERE source_task_id = ? AND status NOT IN ('done', 'cancelled')`,
      )
      .get(taskId) as { cnt?: number } | undefined;
    const openSubtasks = Number(openSubtasksRow?.cnt ?? 0);
    const openChildTasks = Number(openChildTasksRow?.cnt ?? 0);
    deferArtifactGate = openSubtasks > 0 || openChildTasks > 0;
    if (deferArtifactGate) {
      appendTaskLog(
        taskId,
        "system",
        `Video sequencing notice: documentation/collaboration still in progress. Artifact gate deferred until review stage (open_subtasks=${openSubtasks}, open_collab_tasks=${openChildTasks})`,
      );
      notifyClient(
        pickL(
          l(
            [
              `'${task.title}' 는 문서화/협업 정리가 남아 있어 영상 품질 게이트를 Review 단계에서 이어서 확인합니다. (미완료 subtask ${openSubtasks}건, 협업 task ${openChildTasks}건)`,
            ],
            [
              `'${task.title}' still has documentation/collaboration work pending, so video quality gating will continue in Review stage. (open subtasks: ${openSubtasks}, open collaboration tasks: ${openChildTasks})`,
            ],
            [
              `'${task.title}' は文書化/協業の整理が残っているため、動画品質ゲートは Review 段階で継続確認します。（未完了 subtask: ${openSubtasks}件、協業 task: ${openChildTasks}件）`,
            ],
            [
              `'${task.title}' 仍有文档与协作收口工作，视频质量门禁将转入 Review 阶段继续检查。（未完成 subtask：${openSubtasks}，协作 task：${openChildTasks}）`,
            ],
          ),
          resolveLang(task.description ?? task.title),
        ),
        taskId,
      );
    }
  }

  if (shouldCheckArtifactNow && !deferArtifactGate && !artifactSync.videoArtifactReady) {
    if (isVideoFinalRenderTask) {
      finalExitCode = 87;
      appendTaskLog(
        taskId,
        "system",
        `Video artifact gate failed: [VIDEO_FINAL_RENDER] output missing/empty. checked=${artifactSync.projectCandidates.join(", ")}`,
      );
      notifyClient(
        pickL(
          l(
            [`'${task.title}' 의 최종 렌더 산출물이 확인되지 않아 실행을 실패 처리했습니다. Remotion으로 출력 파일을 생성한 뒤 다시 실행해 주세요.`],
            [`Marked '${task.title}' as failed because final render output is missing/empty. Generate the file with Remotion and retry.`],
            [`'${task.title}' の最終レンダー成果物が未確認のため失敗処理しました。Remotion で出力を生成後に再実行してください。`],
            [`'${task.title}' 最终渲染产物缺失/为空，已判定本次执行失败。请用 Remotion 重新生成后再执行。`],
          ),
          resolveLang(task.description ?? task.title),
        ),
        taskId,
      );
    } else {
      appendTaskLog(
        taskId,
        "system",
        `Video artifact gate notice: missing/empty render output. Review stage will require artifact verification. checked=${artifactSync.projectCandidates.join(", ")}`,
      );
      notifyClient(
        pickL(
          l(
            [
              `'${task.title}' 영상 산출물이 아직 확인되지 않았습니다. 검토 단계에서 \`${artifactSync.videoArtifactSpec.relativePath}\` (또는 legacy \`${artifactSync.videoArtifactSpec.legacyRelativePath}\`) 확인 후 승인해야 합니다.`,
            ],
            [
              `Video artifact for '${task.title}' is not verified yet. In review stage, approval requires \`${artifactSync.videoArtifactSpec.relativePath}\` (or legacy \`${artifactSync.videoArtifactSpec.legacyRelativePath}\`).`,
            ],
            [
              `'${task.title}' の動画成果物はまだ未確認です。レビュー段階で \`${artifactSync.videoArtifactSpec.relativePath}\`（または legacy \`${artifactSync.videoArtifactSpec.legacyRelativePath}\`）確認後に承認してください。`,
            ],
            [
              `任务 '${task.title}' 的视频产物尚未验证。请在 Review 阶段确认 \`${artifactSync.videoArtifactSpec.relativePath}\`（或兼容路径 \`${artifactSync.videoArtifactSpec.legacyRelativePath}\`）后再审批。`,
            ],
          ),
          resolveLang(task.description ?? task.title),
        ),
        taskId,
      );
    }
  }
  return { finalExitCode };
}
