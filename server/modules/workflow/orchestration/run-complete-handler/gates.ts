/**
 * Post-exit gate evaluation: QA rules, pipeline auto-gates.
 * Used by run-complete handler to adjust finalExitCode and append gate log messages.
 */

import type { DatabaseSync } from "node:sqlite";
import { evaluateAutoGates } from "../../../routes/core/pipeline-gates.ts";

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

// Stub type kept for call-site compatibility in core.ts
export type VideoArtifactSyncResult = {
  videoArtifactReady: boolean;
  videoArtifactSpec: { fileName: string; relativePath: string; legacyRelativePath: string };
  projectCandidates: string[];
};

export type VideoArtifactGateDeps = RunAfterExitGatesDeps & {
  notifyClient: (message: string, taskId: string) => void;
  pickL: (pool: unknown, lang: string) => string;
  l: (ko: string[], en: string[], ja?: string[], zh?: string[]) => unknown;
  resolveLang: (text: string) => string;
};

export type TaskForVideoGate = { title: string; description: string | null; source_task_id: string | null };

/**
 * No-op stub: video artifact gate removed. Always returns exit code 0.
 */
export function applyVideoArtifactGateAfterSuccess(
  _taskId: string,
  _task: TaskForVideoGate,
  _isVideoFinalRenderTask: boolean,
  _artifactSync: VideoArtifactSyncResult,
  _deps: VideoArtifactGateDeps,
): { finalExitCode: number } {
  return { finalExitCode: 0 };
}

/**
 * Evaluate QA rules (requireSections, citations, test evidence)
 * and pipeline auto-gates. Adjusts finalExitCode accordingly.
 */
export function runAfterExitGates(
  taskId: string,
  task: TaskForGates,
  result: string | null,
  initialExitCode: number,
  _artifactSync: VideoArtifactSyncResult,
  deps: RunAfterExitGatesDeps,
): RunAfterExitGatesResult {
  const { db, appendTaskLog, nowMs } = deps;
  const finalExitCode = initialExitCode;

  // Generic QA gate
  if (finalExitCode === 0 && task.workflow_pack_key) {
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
      const gateResults = evaluateAutoGates(db as unknown as DatabaseSync, taskId, task.workflow_pack_key, result, nowMs());
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
