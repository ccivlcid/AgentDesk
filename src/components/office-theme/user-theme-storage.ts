import type { RoomTheme } from "../../types";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

export interface UserThemePreset {
  id: string;
  name: string;
  themes: Record<string, RoomTheme>;
  createdAt: number;
  updatedAt: number;
}

/* ================================================================== */
/*  Storage                                                             */
/* ================================================================== */

const STORAGE_KEY = "agentdesk_user_theme_presets";
const ACTIVE_PRESET_KEY = "agentdesk_active_preset";
const MAX_PRESETS = 20;

function readPresets(): UserThemePreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UserThemePreset[];
  } catch {
    return [];
  }
}

function writePresets(presets: UserThemePreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

/* ================================================================== */
/*  CRUD                                                                */
/* ================================================================== */

export function loadUserThemePresets(): UserThemePreset[] {
  return readPresets();
}

export function saveUserThemePreset(preset: UserThemePreset): boolean {
  const list = readPresets();
  if (list.length >= MAX_PRESETS) return false;
  list.push(preset);
  writePresets(list);
  return true;
}

export function updateUserThemePreset(id: string, patch: Partial<Omit<UserThemePreset, "id">>): void {
  const list = readPresets();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch, updatedAt: Date.now() };
  writePresets(list);
}

export function deleteUserThemePreset(id: string): void {
  const list = readPresets().filter((p) => p.id !== id);
  writePresets(list);
}

/* ================================================================== */
/*  Active preset tracking                                              */
/* ================================================================== */

export function getActivePresetKey(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PRESET_KEY) || null;
  } catch {
    return null;
  }
}

export function setActivePresetKey(key: string | null): void {
  try {
    if (key) {
      localStorage.setItem(ACTIVE_PRESET_KEY, key);
    } else {
      localStorage.removeItem(ACTIVE_PRESET_KEY);
    }
  } catch {
    // ignore
  }
}

export { MAX_PRESETS };
