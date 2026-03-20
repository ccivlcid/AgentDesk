import { HISTORY_KEY, MAX_HISTORY } from "./constants";

export function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function saveHistory(action: string): void {
  const prev = loadHistory().filter((a) => a !== action);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([action, ...prev].slice(0, MAX_HISTORY)));
}
