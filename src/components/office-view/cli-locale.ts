import type { UiLanguage } from "../../i18n";

export const LOCALE_TEXT = {
  cliUsageTitle: { ko: "CLI 사용량", en: "CLI Usage", ja: "CLI使用量", zh: "CLI 使用量" },
  cliConnected: { ko: "연결됨", en: "connected", ja: "接続中", zh: "已连接" },
  cliRefreshTitle: { ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" },
  cliNoConnectedEmpty: { ko: "연결된 CLI 없음", en: "No CLI connected", ja: "CLIが接続されていません", zh: "没有已连接的CLI" },
  cliNoUsageDisplay: { ko: "사용량 없음", en: "No usage data", ja: "使用量なし", zh: "无使用数据" },
  cliNotSignedIn: { ko: "로그인 필요", en: "Not signed in", ja: "サインイン必要", zh: "未登录" },
  cliNoApi: { ko: "API 없음", en: "No API key", ja: "APIキーなし", zh: "无API密钥" },
  cliUnavailable: { ko: "사용 불가", en: "Unavailable", ja: "利用不可", zh: "不可用" },
  cliLoading: { ko: "로딩 중…", en: "Loading…", ja: "読込中…", zh: "加载中…" },
  cliResets: { ko: "리셋:", en: "Resets:", ja: "リセット:", zh: "重置:" },
  cliNoData: { ko: "데이터 없음", en: "No data", ja: "データなし", zh: "无数据" },
  cliNoDataHint: { ko: "CLI를 연결하여 사용량을 추적하세요", en: "Connect a CLI to track usage", ja: "CLIを接続して使用量を追跡してください", zh: "连接CLI以跟踪使用量" },
} as const;

export function formatReset(resetsAt: string, _language: UiLanguage): string {
  try {
    const date = new Date(resetsAt);
    if (isNaN(date.getTime())) return resetsAt;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return resetsAt;
  }
}
