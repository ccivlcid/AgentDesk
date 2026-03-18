import type { DatabaseSync } from "node:sqlite";
import logger from "../../../lib/logger.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

interface HookSeed {
  id: string;
  title: string;
  title_ko: string;
  title_ja: string;
  title_zh: string;
  description: string;
  command: string;
  event_type: string;
  timeout_ms: number;
  priority: number;
}

const DEFAULT_HOOKS: HookSeed[] = [
  {
    id: "hook-default-001-pre-task-context",
    title: "Log task start",
    title_ko: "태스크 시작 로그",
    title_ja: "タスク開始ログ",
    title_zh: "记录任务开始",
    description: "Prints a timestamped banner to stdout whenever an agent begins a new task.",
    command: `echo "[$(date '+%Y-%m-%d %H:%M:%S')] TASK START: $TASK_TITLE"`,
    event_type: "pre-task",
    timeout_ms: 5000,
    priority: 70,
  },
  {
    id: "hook-default-002-post-task-log",
    title: "Log task completion",
    title_ko: "태스크 완료 로그",
    title_ja: "タスク完了ログ",
    title_zh: "记录任务完成",
    description: "Appends a completion record with timestamp to a local log file after each task finishes.",
    command: `echo "[$(date '+%Y-%m-%d %H:%M:%S')] TASK DONE: $TASK_TITLE" >> ./logs/task-history.log`,
    event_type: "post-task",
    timeout_ms: 5000,
    priority: 60,
  },
  {
    id: "hook-default-003-on-error-notify",
    title: "Error alert",
    title_ko: "에러 알림",
    title_ja: "エラー通知",
    title_zh: "错误警报",
    description: "Writes an error record to stderr so it is visible in CI logs and monitoring dashboards.",
    command: `echo "[ERROR] Task failed: $TASK_TITLE (agent: $AGENT_NAME)" >&2`,
    event_type: "on-error",
    timeout_ms: 5000,
    priority: 80,
  },
  {
    id: "hook-default-004-on-complete-summary",
    title: "Completion summary",
    title_ko: "완료 요약",
    title_ja: "完了サマリー",
    title_zh: "完成摘要",
    description: "Prints a compact one-line summary when the full workflow completes successfully.",
    command: `echo "[DONE] Workflow complete. Agent: $AGENT_NAME | $(date '+%H:%M:%S')"`,
    event_type: "on-complete",
    timeout_ms: 5000,
    priority: 65,
  },
  {
    id: "hook-default-005-pre-task-env-check",
    title: "Environment health check",
    title_ko: "환경 상태 점검",
    title_ja: "環境ヘルスチェック",
    title_zh: "环境健康检查",
    description: "Verifies that required environment variables are set before a task is allowed to start.",
    command: `[ -n "$ANTHROPIC_API_KEY" ] && echo "[OK] API key present" || (echo "[WARN] ANTHROPIC_API_KEY missing" >&2; exit 0)`,
    event_type: "pre-task",
    timeout_ms: 8000,
    priority: 75,
  },
];

export function seedDefaultHooks(db: DbLike): void {
  const hooksCount = (db.prepare("SELECT COUNT(*) as cnt FROM hook_entries").get() as { cnt: number }).cnt;
  if (hooksCount > 0) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO hook_entries
      (id, title, title_ko, title_ja, title_zh, description, command, event_type, scope_type, scope_id, timeout_ms, priority, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'global', NULL, ?, ?, 1)`,
  );

  for (const hook of DEFAULT_HOOKS) {
    insert.run(
      hook.id,
      hook.title,
      hook.title_ko,
      hook.title_ja,
      hook.title_zh,
      hook.description,
      hook.command,
      hook.event_type,
      hook.timeout_ms,
      hook.priority,
    );
  }

  logger.info(`[AgentDesk] Seeded ${DEFAULT_HOOKS.length} default hooks`);
}
