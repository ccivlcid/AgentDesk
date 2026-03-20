import type { I18nContextValue } from "../../../i18n";

export interface FreeModeComparisonRow {
  label: string;
  free: boolean;
}

export function getFreeModeComparisonRows(t: I18nContextValue["t"]): FreeModeComparisonRow[] {
  return [
    { label: t({ ko: "워크트리 격리", en: "Worktree isolation", ja: "ワークツリー分離", zh: "工作树隔离" }), free: false },
    { label: t({ ko: "작업 로그 기록", en: "Task log", ja: "タスクログ", zh: "任务日志" }), free: false },
    { label: t({ ko: "완료 보고서", en: "Completion report", ja: "完了レポート", zh: "完成报告" }), free: false },
    { label: t({ ko: "플래닝 단계", en: "Planning phase", ja: "プランニング", zh: "规划阶段" }), free: false },
    { label: t({ ko: "완료 추적", en: "Completion tracking", ja: "完了追跡", zh: "完成追踪" }), free: false },
    { label: t({ ko: "산출물 체크리스트", en: "Deliverables", ja: "成果物", zh: "交付物" }), free: true },
  ];
}
