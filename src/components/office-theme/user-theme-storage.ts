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

/* ================================================================== */
/*  Export / Import                                                      */
/* ================================================================== */

export function exportUserThemesJson(): string {
  return JSON.stringify(readPresets(), null, 2);
}

export function importUserThemesJson(json: string): { imported: number; skipped: number } {
  let incoming: unknown;
  try {
    incoming = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(incoming)) throw new Error("Expected JSON array");

  const list = readPresets();
  let imported = 0;
  let skipped = 0;

  for (const item of incoming) {
    if (list.length >= MAX_PRESETS) { skipped++; continue; }
    if (!item || typeof item !== "object") { skipped++; continue; }
    const t = item as Record<string, unknown>;
    if (typeof t.name !== "string" || !t.name) { skipped++; continue; }
    if (!t.themes || typeof t.themes !== "object") { skipped++; continue; }
    if (typeof t.id === "string" && list.some((p) => p.id === t.id)) { skipped++; continue; }
    list.push({
      id: typeof t.id === "string" ? t.id : crypto.randomUUID(),
      name: String(t.name).slice(0, 30),
      themes: t.themes as Record<string, RoomTheme>,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
      updatedAt: Date.now(),
    });
    imported++;
  }

  writePresets(list);
  return { imported, skipped };
}
