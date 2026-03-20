export function isSessionResetCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return /^\/new(?:@[\w_]+)?$/.test(normalized);
}

function detectLangForResetAck(text: string): "ko" | "en" | "ja" | "zh" {
  const sample = text.trim();
  const ko = sample.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g)?.length ?? 0;
  const ja = sample.match(/[\u3040-\u309F\u30A0-\u30FF]/g)?.length ?? 0;
  const zh = sample.match(/[\u4E00-\u9FFF]/g)?.length ?? 0;
  const total = sample.replace(/\s/g, "").length || 1;
  if (ko / total > 0.15) return "ko";
  if (ja / total > 0.15) return "ja";
  if (zh / total > 0.3) return "zh";
  return "en";
}

export function buildSessionResetAck(text: string): string {
  const lang = detectLangForResetAck(text);
  if (lang === "ko") return "🧹 현재 대화 세션을 초기화했습니다. 새 대화를 시작할게요.";
  if (lang === "ja") return "🧹 現在の会話セッションを初期化しました。新しい会話を開始します。";
  if (lang === "zh") return "🧹 已重置当前会话。现在开始新的对话。";
  return "🧹 Current conversation session was reset. Starting a new chat.";
}
