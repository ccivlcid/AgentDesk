import type { DatabaseSync } from "node:sqlite";
import logger from "../../../lib/logger.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

interface MemorySeed {
  id: string;
  title: string;
  title_ko: string;
  title_ja: string;
  title_zh: string;
  content: string;
  category: string;
  scope_type: string;
  priority: number;
}

const DEFAULT_MEMORIES: MemorySeed[] = [
  // ── context (3) ───────────────────────────────────────────────────────────
  {
    id: "mem-default-ctx-001",
    title: "Project Tech Stack",
    title_ko: "프로젝트 기술 스택",
    title_ja: "プロジェクト技術スタック",
    title_zh: "项目技术栈",
    content:
      "This project uses React 19 + TypeScript + Vite on the frontend, Express + Node.js on the backend, and SQLite (better-sqlite3) as the database. " +
      "State management is handled by Zustand. All styling uses Tailwind CSS with custom --th-* CSS variables.",
    category: "context",
    scope_type: "global",
    priority: 90,
  },
  {
    id: "mem-default-ctx-002",
    title: "Monorepo Structure",
    title_ko: "모노레포 구조",
    title_ja: "モノレポ構成",
    title_zh: "单体仓库结构",
    content:
      "src/ contains the React frontend. server/ contains the Express backend. " +
      "Frontend runs on port 8800, API on port 8790. Use pnpm as the package manager. " +
      "Run `pnpm dev` to start both servers concurrently.",
    category: "context",
    scope_type: "global",
    priority: 85,
  },
  {
    id: "mem-default-ctx-003",
    title: "Database Migration Pattern",
    title_ko: "DB 마이그레이션 패턴",
    title_ja: "DBマイグレーションパターン",
    title_zh: "数据库迁移模式",
    content:
      "All schema changes go in server/modules/bootstrap/schema/versioned-migrations.ts. " +
      "Append-only: never modify existing entries. ID format: YYYY-MM-DD-NNN-description. " +
      "Wrap each DDL in try/catch for idempotency.",
    category: "context",
    scope_type: "global",
    priority: 80,
  },

  // ── preference (2) ────────────────────────────────────────────────────────
  {
    id: "mem-default-pref-001",
    title: "Concise Response Style",
    title_ko: "간결한 응답 스타일",
    title_ja: "簡潔な応答スタイル",
    title_zh: "简洁回复风格",
    content:
      "Lead with the answer, not the reasoning. Skip filler words and preambles. " +
      "Do not summarize what was just done — the user can see the diff. " +
      "Use short, direct sentences. If it can be said in one sentence, don't use three.",
    category: "preference",
    scope_type: "global",
    priority: 85,
  },
  {
    id: "mem-default-pref-002",
    title: "No Unsolicited Refactors",
    title_ko: "요청하지 않은 리팩토링 금지",
    title_ja: "依頼外リファクタリング禁止",
    title_zh: "禁止未经请求的重构",
    content:
      "Only make changes directly requested or clearly necessary. " +
      "A bug fix doesn't need surrounding code cleaned up. Don't add docstrings, comments, or type annotations to code you didn't change. " +
      "Avoid over-engineering — minimum complexity for the current task.",
    category: "preference",
    scope_type: "global",
    priority: 80,
  },

  // ── convention (2) ────────────────────────────────────────────────────────
  {
    id: "mem-default-conv-001",
    title: "CSS Variable Naming",
    title_ko: "CSS 변수 네이밍",
    title_ja: "CSS変数の命名規則",
    title_zh: "CSS变量命名",
    content:
      "All design tokens use the --th-* prefix (e.g. --th-bg-primary, --th-accent, --th-text-muted). " +
      "Never use hardcoded color values in component styles. " +
      "The FM2024 dark navy palette: --th-bg-primary: #0f1117, --th-accent: #f59e0b.",
    category: "convention",
    scope_type: "global",
    priority: 75,
  },
  {
    id: "mem-default-conv-002",
    title: "i18n Pattern",
    title_ko: "i18n 패턴",
    title_ja: "i18nパターン",
    title_zh: "i18n模式",
    content:
      "Use the `t({ ko, en, ja, zh })` function from useI18n() for all user-visible strings. " +
      "Never hardcode English-only text in UI components. " +
      "Agent display names should use agentDisplayName(agent, localeTag) to pick name_ko/name_ja/name_zh/name based on locale.",
    category: "convention",
    scope_type: "global",
    priority: 78,
  },

  // ── knowledge (2) ─────────────────────────────────────────────────────────
  {
    id: "mem-default-know-001",
    title: "Provider-based DB Storage",
    title_ko: "프로바이더 기반 DB 저장",
    title_ja: "プロバイダベースDB保存",
    title_zh: "基于Provider的DB存储",
    content:
      "skill_learning_history, rule_learning_history, and memory_learning_history tables store one row per (job_id, provider). " +
      "Multiple agents sharing the same provider share one DB row. " +
      "Use agentsByProvider Map<provider, Agent[]> to show all agents for a provider, not just one representative.",
    category: "knowledge",
    scope_type: "global",
    priority: 82,
  },
  {
    id: "mem-default-know-002",
    title: "Window System Architecture",
    title_ko: "윈도우 시스템 아키텍처",
    title_ja: "ウィンドウシステムアーキテクチャ",
    title_zh: "窗口系统架构",
    content:
      "AgentDesk uses a macOS desktop metaphor. Windows are managed via uiStore.openWindows (Set<WindowType>). " +
      "To add a new window: add to WindowType union in src/app/types.ts, add toggle in uiStore.ts, add Dock icon in Dock.tsx, create component in src/components/windows/, render in Desktop.tsx.",
    category: "knowledge",
    scope_type: "global",
    priority: 75,
  },

  // ── instruction (1) ───────────────────────────────────────────────────────
  {
    id: "mem-default-instr-001",
    title: "Git Commit Handling",
    title_ko: "Git 커밋 처리",
    title_ja: "Gitコミット処理",
    title_zh: "Git提交处理",
    content:
      "Never create git commits autonomously. Commits are handled by the user. " +
      "Do not run `git commit`, `git push`, or `git amend` unless explicitly asked. " +
      "Always update docs/progress.md when significant work is completed.",
    category: "instruction",
    scope_type: "global",
    priority: 95,
  },
];

export function seedDefaultMemories(db: DbLike): void {
  const count = (db.prepare("SELECT COUNT(*) as cnt FROM memory_entries").get() as { cnt: number }).cnt;
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO memory_entries
      (id, title, title_ko, title_ja, title_zh, description, content, category, scope_type, scope_id, priority, enabled)
     VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, NULL, ?, 1)`,
  );

  for (const mem of DEFAULT_MEMORIES) {
    insert.run(mem.id, mem.title, mem.title_ko, mem.title_ja, mem.title_zh, mem.content, mem.category, mem.scope_type, mem.priority);
  }

  logger.info(`[AgentDesk] Seeded ${DEFAULT_MEMORIES.length} default memory entries`);
}
