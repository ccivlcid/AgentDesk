const COLLAPSED_CARD_IDS_KEY = "agentdesk_taskboard_collapsed_ids";

export function loadCollapsedCardIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSED_CARD_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((id): id is string => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function saveCollapsedCardIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSED_CARD_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore quota / private mode
  }
}
