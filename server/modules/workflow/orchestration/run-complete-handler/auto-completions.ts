/**
 * auto-completions.ts
 *
 * Task done 시 자동으로 실행되는 두 가지 후처리:
 *   1. autoSaveTaskReport          — task_report_archives에 마크다운 요약 자동 저장
 *   2. autoCheckProjectDeliverables — project_deliverable_checks 자동 체크
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

type Db = Pick<DatabaseSync, "prepare">;

type LangCode = "ko" | "en" | "ja" | "zh";

type AutoCompletionDeps = {
  db: Db;
  nowMs: () => number;
  logsDir: string;
  lang: LangCode;
  appendTaskLog: (taskId: string, kind: string, msg: string) => void;
  prettyStreamJson?: (raw: string) => string;
  getWorktreeDiffSummary?: (projectPath: string, taskId: string) => string;
  taskWorktrees?: Map<string, { projectPath?: string; branchName?: string }>;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  project_path: string | null;
  workflow_pack_key: string | null;
  assigned_agent_id: string | null;
  source_task_id: string | null;
  started_at?: number | null;
  completed_at?: number | null;
  result?: string | null;
};

// ─── 다국어 문자열 ────────────────────────────────────────────────────────────

type I18nMap = Record<LangCode, string>;

const T: Record<string, I18nMap> = {
  description:  { ko: "설명",     en: "Description", ja: "説明",     zh: "描述"   },
  result:       { ko: "결과",     en: "Result",      ja: "結果",     zh: "结果"   },
  changes:      { ko: "변경사항", en: "Changes",     ja: "変更内容", zh: "变更内容" },
  duration:     { ko: "소요 시간",en: "Duration",    ja: "所要時間", zh: "耗时"   },
  taskReport:   { ko: "업무 보고서", en: "Task Report", ja: "タスクレポート", zh: "任务报告" },
  min:          { ko: "분",       en: "min",         ja: "分",       zh: "分"     },
  sec:          { ko: "초",       en: "sec",         ja: "秒",       zh: "秒"     },
  autoChecked:  {
    ko: "자동 체크 — 업무",
    en: "Auto-checked — task",
    ja: "自動チェック — タスク",
    zh: "自动勾选 — 任务",
  },
  reportSaved:  {
    ko: "보고서 아카이브 자동 저장됨",
    en: "Auto-generated task report archive saved",
    ja: "レポートアーカイブが自動保存されました",
    zh: "任务报告已自动保存",
  },
  reportSkipped: {
    ko: "보고서 자동 저장 건너뜀",
    en: "Auto-report save skipped",
    ja: "レポート自動保存スキップ",
    zh: "跳过自动保存报告",
  },
  deliverableSkipped: {
    ko: "산출물 자동 체크 건너뜀",
    en: "Auto-deliverable check skipped",
    ja: "成果物の自動チェックをスキップ",
    zh: "跳过自动检查交付物",
  },
};

function t(key: string, lang: LangCode): string {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 보고서 자동 저장
// ─────────────────────────────────────────────────────────────────────────────

export function autoSaveTaskReport(
  taskId: string,
  task: TaskRow,
  deps: AutoCompletionDeps,
): void {
  const { db, nowMs, logsDir, lang, appendTaskLog, prettyStreamJson, getWorktreeDiffSummary, taskWorktrees } = deps;
  try {
    // 이미 아카이브가 존재하면 건너뜀 (planning archive 등이 먼저 생성된 경우)
    const existing = db.prepare("SELECT id FROM task_report_archives WHERE root_task_id = ?").get(taskId);
    if (existing) return;

    // 로그 파일에서 결과 텍스트 추출
    let resultText = task.result ?? "";
    if (!resultText) {
      try {
        const logPath = path.join(logsDir, `${taskId}.log`);
        if (fs.existsSync(logPath)) {
          const raw = fs.readFileSync(logPath, "utf8");
          const pretty = prettyStreamJson ? prettyStreamJson(raw) : raw;
          resultText = pretty.length > 2000 ? "..." + pretty.slice(-2000) : pretty;
        }
      } catch { /* ignore */ }
    }

    // Worktree diff 요약
    let diffSection = "";
    if (getWorktreeDiffSummary && taskWorktrees) {
      const wtInfo = taskWorktrees.get(taskId);
      if (wtInfo?.projectPath) {
        try {
          const diff = getWorktreeDiffSummary(wtInfo.projectPath, taskId);
          if (diff && diff.trim()) {
            diffSection = `\n\n## ${t("changes", lang)}\n\n\`\`\`\n${diff.slice(0, 3000)}\n\`\`\``;
          }
        } catch { /* ignore */ }
      }
    }

    // 소요 시간 계산
    let durationSection = "";
    if (task.started_at && task.completed_at) {
      const totalSec = Math.round((task.completed_at - task.started_at) / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const durationStr = min > 0
        ? `${min}${t("min", lang)} ${sec}${t("sec", lang)}`
        : `${sec}${t("sec", lang)}`;
      durationSection = `\n\n## ${t("duration", lang)}\n\n${durationStr}`;
    }

    // 마크다운 조합
    const titleLine = task.title ? `# ${task.title}\n` : `# ${t("taskReport", lang)}\n`;
    const descSection = task.description
      ? `\n## ${t("description", lang)}\n\n${task.description}\n`
      : "";
    const resultSection = resultText
      ? `\n## ${t("result", lang)}\n\n${resultText}`
      : "";
    const summaryMarkdown = `${titleLine}${descSection}${resultSection}${diffSection}${durationSection}\n`;

    const now = nowMs();
    db.prepare(`
      INSERT INTO task_report_archives
        (id, root_task_id, generated_by_agent_id, summary_markdown, source_snapshot_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      taskId,
      task.assigned_agent_id ?? null,
      summaryMarkdown,
      JSON.stringify({ auto_generated: true, task_id: taskId }),
      now,
      now,
    );

    appendTaskLog(taskId, "system", t("reportSaved", lang));
  } catch (err) {
    appendTaskLog(taskId, "system", `${t("reportSkipped", lang)}: ${String(err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 프로젝트 산출물 체크리스트 자동 체크
// ─────────────────────────────────────────────────────────────────────────────

/**
 * task title / workflow_pack_key를 deliverable_schema 항목과 매칭해서 자동 체크.
 * 매칭 로직:
 *   1. workflow_pack_key === schema item key (exact)
 *   2. normalize(item.label) ⊆ normalize(task.title)  (라벨 키워드가 제목에 포함)
 *   3. normalize(task.title) ⊆ normalize(item.label)  (제목이 라벨 안에 포함)
 */
export function autoCheckProjectDeliverables(
  taskId: string,
  task: TaskRow,
  deps: AutoCompletionDeps,
): void {
  const { db, nowMs, lang, appendTaskLog } = deps;
  if (!task.project_id) return;

  try {
    const project = db
      .prepare("SELECT category_id FROM projects WHERE id = ?")
      .get(task.project_id) as { category_id: string | null } | undefined;
    if (!project?.category_id) return;

    const cat = db
      .prepare("SELECT deliverable_schema FROM categories WHERE id = ?")
      .get(project.category_id) as { deliverable_schema: string | null } | undefined;
    if (!cat?.deliverable_schema) return;

    let schema: Array<{ key: string; label: string }> = [];
    try {
      schema = JSON.parse(cat.deliverable_schema);
    } catch { return; }
    if (!Array.isArray(schema) || schema.length === 0) return;

    const now = nowMs();
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_./\\]/g, "");

    const titleNorm = norm(task.title ?? "");
    const packKey = (task.workflow_pack_key ?? "").toLowerCase();

    let checkedCount = 0;
    for (const item of schema) {
      if (!item.key || !item.label) continue;

      const alreadyChecked = db
        .prepare("SELECT checked FROM project_deliverable_checks WHERE project_id = ? AND key = ?")
        .get(task.project_id, item.key) as { checked: number } | undefined;
      if (alreadyChecked?.checked === 1) continue;

      const labelNorm = norm(item.label);
      const keyNorm = norm(item.key);

      const matches =
        (packKey && (packKey === item.key.toLowerCase() || packKey.includes(keyNorm))) ||
        (labelNorm.length >= 4 && titleNorm.includes(labelNorm)) ||
        (titleNorm.length >= 4 && labelNorm.includes(titleNorm));

      if (!matches) continue;

      db.prepare(`
        INSERT INTO project_deliverable_checks
          (project_id, key, label, checked, checked_at, note, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?, ?)
        ON CONFLICT(project_id, key) DO UPDATE SET
          checked = 1,
          checked_at = excluded.checked_at,
          note = excluded.note,
          updated_at = excluded.updated_at
      `).run(
        task.project_id,
        item.key,
        item.label,
        now,
        `${t("autoChecked", lang)}: ${task.title}`,
        now,
        now,
      );
      checkedCount++;
    }

    if (checkedCount > 0) {
      appendTaskLog(
        taskId,
        "system",
        `${t("autoChecked", lang)}: ${checkedCount}`,
      );
    }
  } catch (err) {
    appendTaskLog(taskId, "system", `${t("deliverableSkipped", lang)}: ${String(err)}`);
  }
}
