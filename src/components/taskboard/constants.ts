import type { TaskStatus, TaskType } from "../../types";
import type { UiLanguage } from "../../i18n";

export type Locale = UiLanguage;
export type TFunction = (messages: Record<Locale, string>) => string;

/** 오피스 팩 입력 필드 키 → 다국어 라벨. 매칭 없으면 snake_case → 공백 표시 */
export const PACK_FIELD_LABELS: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  // development
  project: { ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" },
  instruction: { ko: "지시 사항", en: "Instruction", ja: "指示内容", zh: "指示" },
  acceptance_criteria: { ko: "완료 기준", en: "Acceptance Criteria", ja: "完了基準", zh: "验收标准" },
  deadline: { ko: "마감", en: "Deadline", ja: "期限", zh: "截止时间" },
  // novel
  genre: { ko: "장르", en: "Genre", ja: "ジャンル", zh: "体裁" },
  tone: { ko: "톤/어조", en: "Tone", ja: "トーン", zh: "语气" },
  length: { ko: "분량", en: "Length", ja: "分量", zh: "篇幅" },
  characters: { ko: "캐릭터", en: "Characters", ja: "キャラクター", zh: "角色" },
  world_setting: { ko: "세계관/배경", en: "World Setting", ja: "世界観", zh: "世界观" },
  point_of_view: { ko: "시점", en: "Point of View", ja: "視点", zh: "视角" },
  // report
  goal: { ko: "목표", en: "Goal", ja: "目標", zh: "目标" },
  audience: { ko: "대상 독자", en: "Audience", ja: "対象読者", zh: "受众" },
  format: { ko: "형식", en: "Format", ja: "形式", zh: "格式" },
  // video_preprod
  platform: { ko: "플랫폼", en: "Platform", ja: "プラットフォーム", zh: "平台" },
  duration: { ko: "길이", en: "Duration", ja: "尺", zh: "时长" },
  target_audience: { ko: "타깃 시청자", en: "Target Audience", ja: "ターゲット視聴者", zh: "目标观众" },
  style: { ko: "스타일", en: "Style", ja: "スタイル", zh: "风格" },
  cta: { ko: "CTA(행동 유도)", en: "CTA", ja: "CTA", zh: "行动号召" },
  // web_research_report
  topic: { ko: "주제", en: "Topic", ja: "トピック", zh: "主题" },
  time_range: { ko: "기간 범위", en: "Time Range", ja: "期間範囲", zh: "时间范围" },
  source_policy: { ko: "출처 정책", en: "Source Policy", ja: "出典ポリシー", zh: "来源策略" },
  language: { ko: "언어", en: "Language", ja: "言語", zh: "语言" },
  depth: { ko: "조사 깊이", en: "Depth", ja: "調査の深さ", zh: "调研深度" },
  // roleplay
  character: { ko: "캐릭터", en: "Character", ja: "キャラクター", zh: "角色" },
  setting: { ko: "배경/상황", en: "Setting", ja: "設定", zh: "设定" },
  safety_rules: { ko: "안전 규칙", en: "Safety Rules", ja: "安全ルール", zh: "安全规则" },
  // asset_management (공통 constraints 재사용)
  asset_class: { ko: "자산 유형", en: "Asset Class", ja: "資産クラス", zh: "资产类型" },
  investment_goal: { ko: "투자 목표", en: "Investment Goal", ja: "投資目標", zh: "投资目标" },
  risk_level: { ko: "위험 수준", en: "Risk Level", ja: "リスクレベル", zh: "风险等级" },
  time_horizon: { ko: "투자 기간", en: "Time Horizon", ja: "投資期間", zh: "投资期限" },
  benchmark: { ko: "벤치마크", en: "Benchmark", ja: "ベンチマーク", zh: "基准" },
  constraints: { ko: "제약 조건", en: "Constraints", ja: "制約条件", zh: "约束条件" },
  portfolio_size: { ko: "포트폴리오 규모", en: "Portfolio Size", ja: "ポートフォリオ規模", zh: "组合规模" },
};

/** 오피스 팩 키 → 다국어 표시명 (섹션 제목 등) */
export const PACK_DISPLAY_NAMES: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  development: { ko: "개발", en: "Development", ja: "開発", zh: "开发" },
  novel: { ko: "소설", en: "Novel", ja: "小説", zh: "小说" },
  report: { ko: "보고서", en: "Report", ja: "レポート", zh: "报告" },
  video_preprod: { ko: "영상기획", en: "Video Preprod", ja: "映像企画", zh: "视频策划" },
  web_research_report: { ko: "웹서치+리포트", en: "Web Research", ja: "Web調査", zh: "网页调研" },
  roleplay: { ko: "롤플레이", en: "Roleplay", ja: "ロールプレイ", zh: "角色扮演" },
  asset_management: { ko: "자산운용", en: "Asset Management", ja: "資産運用", zh: "资产管理" },
};

const TASK_CREATE_DRAFTS_STORAGE_KEY = "agentdesk.taskCreateDrafts";

export const HIDEABLE_STATUSES = ["done", "pending", "cancelled"] as const;
export type HideableStatus = (typeof HIDEABLE_STATUSES)[number];

export type CreateTaskDraft = {
  id: string;
  title: string;
  description: string;
  departmentId: string;
  taskType: TaskType;
  priority: number;
  assignAgentId: string;
  projectId: string;
  projectQuery: string;
  createNewProjectMode: boolean;
  newProjectPath: string;
  updatedAt: number;
};

export type MissingPathPrompt = {
  normalizedPath: string;
  canCreate: boolean;
  nearestExistingParent: string | null;
};

export type FormFeedback = {
  tone: "error" | "info";
  message: string;
};

export type ManualPathEntry = {
  name: string;
  path: string;
};

export function isHideableStatus(status: TaskStatus): status is HideableStatus {
  return (HIDEABLE_STATUSES as readonly TaskStatus[]).includes(status);
}

export function createDraftId(): string {
  if (typeof globalThis !== "undefined" && typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTaskType(value: unknown): TaskType {
  if (
    value === "general" ||
    value === "development" ||
    value === "design" ||
    value === "analysis" ||
    value === "presentation" ||
    value === "documentation"
  ) {
    return value;
  }
  return "general";
}

export function loadCreateTaskDrafts(): CreateTaskDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASK_CREATE_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => typeof row === "object" && row !== null)
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: typeof r.id === "string" && r.id ? r.id : createDraftId(),
          title: typeof r.title === "string" ? r.title : "",
          description: typeof r.description === "string" ? r.description : "",
          departmentId: typeof r.departmentId === "string" ? r.departmentId : "",
          taskType: normalizeTaskType(r.taskType),
          priority: typeof r.priority === "number" ? Math.min(Math.max(Math.trunc(r.priority), 1), 5) : 3,
          assignAgentId: typeof r.assignAgentId === "string" ? r.assignAgentId : "",
          projectId: typeof r.projectId === "string" ? r.projectId : "",
          projectQuery: typeof r.projectQuery === "string" ? r.projectQuery : "",
          createNewProjectMode: Boolean(r.createNewProjectMode),
          newProjectPath: typeof r.newProjectPath === "string" ? r.newProjectPath : "",
          updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
        } satisfies CreateTaskDraft;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function saveCreateTaskDrafts(drafts: CreateTaskDraft[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TASK_CREATE_DRAFTS_STORAGE_KEY, JSON.stringify(drafts.slice(0, 20)));
}

export const COLUMNS: {
  status: TaskStatus;
  icon: string;
  headerBg: string;
  borderColor: string;
  dotColor: string;
}[] = [
  {
    status: "inbox",
    icon: "📥",
    headerBg: "bg-[#1e293b]",
    borderColor: "border-[#475569]",
    dotColor: "bg-[#94a3b8]",
  },
  {
    status: "planned",
    icon: "📋",
    headerBg: "bg-[#1e3a5f]",
    borderColor: "border-[#1d4ed8]",
    dotColor: "bg-[#60a5fa]",
  },
  {
    status: "collaborating",
    icon: "🤝",
    headerBg: "bg-indigo-900",
    borderColor: "border-indigo-700",
    dotColor: "bg-indigo-400",
  },
  {
    status: "in_progress",
    icon: "⚡",
    headerBg: "bg-amber-900",
    borderColor: "border-amber-700",
    dotColor: "bg-amber-400",
  },
  {
    status: "review",
    icon: "🔍",
    headerBg: "bg-purple-900",
    borderColor: "border-purple-700",
    dotColor: "bg-purple-400",
  },
  {
    status: "done",
    icon: "✅",
    headerBg: "bg-green-900",
    borderColor: "border-green-700",
    dotColor: "bg-green-400",
  },
  {
    status: "pending",
    icon: "⏸️",
    headerBg: "bg-orange-900",
    borderColor: "border-orange-700",
    dotColor: "bg-orange-400",
  },
  {
    status: "cancelled",
    icon: "🚫",
    headerBg: "bg-red-900",
    borderColor: "border-red-700",
    dotColor: "bg-red-400",
  },
];

export const STATUS_OPTIONS: TaskStatus[] = [
  "inbox",
  "planned",
  "collaborating",
  "in_progress",
  "review",
  "done",
  "pending",
  "cancelled",
];

export const TASK_TYPE_OPTIONS: { value: TaskType; color: string }[] = [
  { value: "general", color: "bg-[#334155] text-[#cbd5e1]" },
  { value: "development", color: "bg-cyan-900 text-cyan-300" },
  { value: "design", color: "bg-pink-900 text-pink-300" },
  { value: "analysis", color: "bg-indigo-900 text-indigo-300" },
  { value: "presentation", color: "bg-orange-900 text-orange-300" },
  { value: "documentation", color: "bg-teal-900 text-teal-300" },
];

export function taskStatusLabel(status: TaskStatus, t: TFunction) {
  switch (status) {
    case "inbox":
      return t({ ko: "수신함", en: "Inbox", ja: "受信箱", zh: "收件箱" });
    case "planned":
      return t({ ko: "계획됨", en: "Planned", ja: "計画済み", zh: "已计划" });
    case "collaborating":
      return t({ ko: "협업 중", en: "Collaborating", ja: "協働中", zh: "协作中" });
    case "in_progress":
      return t({ ko: "진행 중", en: "In Progress", ja: "進行中", zh: "进行中" });
    case "review":
      return t({ ko: "검토", en: "Review", ja: "レビュー", zh: "审核" });
    case "done":
      return t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" });
    case "pending":
      return t({ ko: "보류", en: "Pending", ja: "保留", zh: "待处理" });
    case "cancelled":
      return t({ ko: "취소", en: "Cancelled", ja: "キャンセル", zh: "已取消" });
    default:
      return status;
  }
}

export function taskTypeLabel(type: TaskType, t: TFunction) {
  switch (type) {
    case "general":
      return t({ ko: "일반", en: "General", ja: "一般", zh: "通用" });
    case "development":
      return t({ ko: "개발", en: "Development", ja: "開発", zh: "开发" });
    case "design":
      return t({ ko: "디자인", en: "Design", ja: "デザイン", zh: "设计" });
    case "analysis":
      return t({ ko: "분석", en: "Analysis", ja: "分析", zh: "分析" });
    case "presentation":
      return t({ ko: "발표", en: "Presentation", ja: "プレゼン", zh: "演示" });
    case "documentation":
      return t({ ko: "문서화", en: "Documentation", ja: "文書化", zh: "文档" });
    default:
      return type;
  }
}

export function getTaskTypeBadge(type: TaskType, t: TFunction) {
  const option = TASK_TYPE_OPTIONS.find((entry) => entry.value === type) ?? TASK_TYPE_OPTIONS[0];
  return { ...option, label: taskTypeLabel(option.value, t) };
}

export function priorityIcon(priority: number) {
  if (priority >= 4) return "🔴";
  if (priority >= 2) return "🟡";
  return "🟢";
}

export function priorityLabel(priority: number, t: TFunction) {
  if (priority >= 4) return t({ ko: "높음", en: "High", ja: "高", zh: "高" });
  if (priority >= 2) return t({ ko: "중간", en: "Medium", ja: "中", zh: "中" });
  return t({ ko: "낮음", en: "Low", ja: "低", zh: "低" });
}

export function timeAgo(ts: number, localeTag: string): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  const relativeTimeFormat = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto" });
  if (diffSec < 60) return relativeTimeFormat.format(-diffSec, "second");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return relativeTimeFormat.format(-diffMin, "minute");
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return relativeTimeFormat.format(-diffHour, "hour");
  return relativeTimeFormat.format(-Math.floor(diffHour / 24), "day");
}
