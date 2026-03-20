/** Module-level i18n (no React hook). Used by HELP and shared labels. */
export function tl(ko: string, en: string, ja?: string, zh?: string): string {
  try {
    const lang: string =
      localStorage.getItem("agentdesk.language") ??
      document.documentElement.lang ??
      "ko";
    if (lang.startsWith("en")) return en;
    if (lang.startsWith("ja")) return ja ?? en;
    if (lang.startsWith("zh")) return zh ?? en;
  } catch { /* SSR / no DOM */ }
  return ko;
}
