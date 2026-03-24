import enMessages, { type MessageKey } from "./messages/en.ts";
import jaMessages from "./messages/ja.ts";
import koMessages from "./messages/ko.ts";
import zhMessages from "./messages/zh.ts";

export type SharedLanguage = "ko" | "en" | "ja" | "zh";
export type TranslationVars = Record<string, string | number | null | undefined>;

const catalogs: Record<SharedLanguage, Record<MessageKey, string>> = {
  ko: koMessages,
  en: enMessages,
  ja: jaMessages,
  zh: zhMessages,
};

export function formatTranslation(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(vars[key] ?? ""));
}

export function translateMessage(language: SharedLanguage, key: MessageKey, vars?: TranslationVars): string {
  const template = catalogs[language][key] ?? catalogs.en[key] ?? key;
  return formatTranslation(template, vars);
}

export type { MessageKey };
