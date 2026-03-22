import type { CustomFeatureConfig, CustomFeatureType } from "../../../types";

export interface TemplateParam {
  key: string;
  label_ko: string;
  label_en: string;
  type: "text" | "select" | "toggle" | "number" | "agent";
  defaultValue?: unknown;
  options?: Array<{ value: unknown; label_ko: string; label_en: string }>;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** text type: false (default) → single-line input, true → textarea */
  multiline?: boolean;
  /** number type constraints */
  min?: number;
  max?: number;
  step?: number;
}

export interface FeatureTemplate {
  id: string;
  category: "agent" | "task" | "notification" | "metric" | "memo";
  emoji: string;
  name_ko: string;
  name_en: string;
  desc_ko: string;
  desc_en: string;
  defaultType: CustomFeatureType;
  defaultConfig: CustomFeatureConfig;
  params: TemplateParam[];
}

export const FEATURE_TEMPLATES: FeatureTemplate[] = [
  {
    id: "agent-dept-status",
    category: "agent",
    emoji: "🏢",
    name_ko: "전문 분야별 상태 요약",
    name_en: "Specialty Status Summary",
    desc_ko: "전문 분야별 에이전트 상태(작업 중/대기/오프라인)를 집계해서 표시",
    desc_en: "Aggregate agent status per specialty (working/idle/offline)",
    defaultType: "app",
    defaultConfig: { refresh: "30s", theme: "default", sizePreset: "md" },
    params: [
      {
        key: "showOffline",
        label_ko: "오프라인 에이전트 표시",
        label_en: "Show offline agents",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },
  {
    id: "agent-single-monitor",
    category: "agent",
    emoji: "🔍",
    name_ko: "에이전트 전용 모니터",
    name_en: "Single Agent Monitor",
    desc_ko: "특정 에이전트의 상태, 현재 태스크, 최근 활동을 실시간으로 표시",
    desc_en: "Real-time status, current task, and recent activity for one agent",
    defaultType: "app",
    defaultConfig: { refresh: "5s", theme: "default", sizePreset: "sm" },
    params: [
      {
        key: "agentId",
        label_ko: "모니터링할 에이전트",
        label_en: "Agent to monitor",
        type: "agent",
        required: true,
        hint: "선택한 에이전트의 실시간 상태가 위젯에 표시됩니다 / Real-time status of the selected agent",
      },
    ],
  },
  {
    id: "task-daily-counter",
    category: "task",
    emoji: "✅",
    name_ko: "오늘의 완료 카운터",
    name_en: "Today's Completion Counter",
    desc_ko: "오늘 완료된 태스크 수를 큰 숫자로 표시",
    desc_en: "Display today's completed task count as a big number",
    defaultType: "app",
    defaultConfig: { refresh: "30s", theme: "success", sizePreset: "sm" },
    params: [
      {
        key: "showTarget",
        label_ko: "목표 수치 표시",
        label_en: "Show daily target",
        type: "toggle",
        defaultValue: false,
      },
      {
        key: "target",
        label_ko: "목표 태스크 수",
        label_en: "Target count",
        type: "number",
        defaultValue: 10,
        min: 1,
        max: 999,
        step: 1,
        hint: "하루 목표 완료 태스크 수 / Daily target completion count",
      },
    ],
  },
  {
    id: "task-assignee-progress",
    category: "task",
    emoji: "📊",
    name_ko: "담당자별 진행 현황",
    name_en: "Assignee Progress Board",
    desc_ko: "에이전트별 진행 중 / 완료 태스크 수를 바 형태로 표시",
    desc_en: "Bar-style view of in-progress and completed tasks per agent",
    defaultType: "app",
    defaultConfig: { refresh: "30s", theme: "default", sizePreset: "md" },
    params: [],
  },
  {
    id: "notification-filter-feed",
    category: "notification",
    emoji: "🔔",
    name_ko: "알림 타입 필터 피드",
    name_en: "Filtered Notification Feed",
    desc_ko: "특정 타입의 알림만 선택해서 표시하는 피드",
    desc_en: "Feed that shows only selected notification types",
    defaultType: "app",
    defaultConfig: { refresh: "5s", theme: "warning", sizePreset: "md" },
    params: [
      {
        key: "types",
        label_ko: "표시할 알림 타입",
        label_en: "Notification types to show",
        type: "select",
        defaultValue: "task_error",
        options: [
          { value: "task_error", label_ko: "태스크 오류", label_en: "Task errors" },
          { value: "agent_error", label_ko: "에이전트 오류", label_en: "Agent errors" },
          { value: "decision_created", label_ko: "결정 요청", label_en: "Decision requests" },
          { value: "cost_alert", label_ko: "비용 경고", label_en: "Cost alerts" },
        ],
      },
    ],
  },
  {
    id: "cli-cost-summary",
    category: "metric",
    emoji: "💰",
    name_ko: "CLI 비용 요약",
    name_en: "CLI Cost Summary",
    desc_ko: "오늘 또는 이번 주 CLI 사용 비용을 요약해서 표시",
    desc_en: "Summarize today's or this week's CLI usage cost",
    defaultType: "app",
    defaultConfig: { refresh: "1m", theme: "accent", sizePreset: "sm" },
    params: [
      {
        key: "period",
        label_ko: "집계 기간",
        label_en: "Period",
        type: "select",
        defaultValue: "today",
        options: [
          { value: "today", label_ko: "오늘", label_en: "Today" },
          { value: "week", label_ko: "이번 주", label_en: "This week" },
        ],
      },
    ],
  },
  {
    id: "memo-board",
    category: "memo",
    emoji: "📝",
    name_ko: "팀 메모 보드",
    name_en: "Team Memo Board",
    desc_ko: "마크다운 형식의 공지 또는 메모를 위젯으로 고정",
    desc_en: "Pin a Markdown note or announcement as a widget",
    defaultType: "app",
    defaultConfig: { refresh: "manual", theme: "default", sizePreset: "md" },
    params: [
      {
        key: "content",
        label_ko: "메모 내용 (Markdown)",
        label_en: "Memo content (Markdown)",
        type: "text",
        defaultValue: "## 공지\n내용을 입력하세요.",
        required: true,
        multiline: true,
        placeholder: "## 제목\n내용을 입력하세요...",
        hint: "Markdown 형식 지원 (# 제목, **굵게**, - 목록) / Markdown supported",
      },
    ],
  },
];

export const TEMPLATE_CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  agent:        { ko: "에이전트", en: "Agent" },
  task:         { ko: "태스크", en: "Task" },
  notification: { ko: "알림", en: "Notification" },
  metric:       { ko: "메트릭", en: "Metric" },
  memo:         { ko: "메모", en: "Memo" },
};
