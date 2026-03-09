import type { Agent, Department, RoomTheme } from "../../types";
import type { Localized, OfficePackPresentation, UiLanguageLike, WorkflowPackKey } from "./types";
import { PACK_PRESETS } from "./constants";
import {
  buildPackDepartmentDescription,
  buildPackDepartmentPrompt,
  pickText,
} from "./utils";

export function getOfficePackMeta(packKey: WorkflowPackKey): { label: Localized; summary: Localized } {
  const preset = PACK_PRESETS[packKey] ?? PACK_PRESETS.development;
  return { label: preset.label, summary: preset.summary };
}

export function getOfficePackRoomThemes(packKey: WorkflowPackKey): Record<string, RoomTheme> {
  const preset = PACK_PRESETS[packKey] ?? PACK_PRESETS.development;
  return preset.roomThemes;
}

export function getBuiltinPackList(locale: UiLanguageLike): Array<{
  key: string;
  label: string;
  summary: string;
  slug: string;
  accent: number;
}> {
  return (Object.keys(PACK_PRESETS) as WorkflowPackKey[]).map((key) => ({
    key,
    label: pickText(locale, PACK_PRESETS[key].label),
    summary: pickText(locale, PACK_PRESETS[key].summary),
    slug: PACK_PRESETS[key].slug,
    accent: PACK_PRESETS[key].roomThemes.ceoOffice?.accent ?? 0x5a9fd4,
  }));
}

export function listOfficePackOptions(
  locale: UiLanguageLike,
  customPacks?: Array<{ key: string; name: string; name_ko: string; icon: string; color: string; description: string }>,
  hiddenBuiltinKeys?: string[],
): Array<{
  key: string;
  label: string;
  summary: string;
  slug: string;
  accent: number;
  isCustom?: boolean;
}> {
  const hiddenSet = new Set(hiddenBuiltinKeys ?? []);
  const builtins = (Object.keys(PACK_PRESETS) as WorkflowPackKey[])
    .filter((key) => !hiddenSet.has(key))
    .map((key) => ({
      key,
      label: pickText(locale, PACK_PRESETS[key].label),
      summary: pickText(locale, PACK_PRESETS[key].summary),
      slug: PACK_PRESETS[key].slug,
      accent: PACK_PRESETS[key].roomThemes.ceoOffice?.accent ?? 0x5a9fd4,
      isCustom: false as const,
    }));
  if (!customPacks?.length) return builtins;
  const customs = customPacks.map((cp) => ({
    key: cp.key,
    label: locale === "ko" ? (cp.name_ko || cp.name) : cp.name,
    summary: cp.description,
    slug: cp.key,
    accent: 0x6366f1,
    isCustom: true as const,
  }));
  return [...builtins, ...customs];
}

export function buildOfficePackPresentation(params: {
  packKey: WorkflowPackKey;
  locale: UiLanguageLike;
  departments: Department[];
  agents: Agent[];
  customRoomThemes: Record<string, RoomTheme>;
}): OfficePackPresentation {
  const { packKey, locale, departments, agents, customRoomThemes } = params;
  if (packKey === "development") {
    return {
      departments,
      agents,
      roomThemes: customRoomThemes,
    };
  }

  const preset = PACK_PRESETS[packKey] ?? PACK_PRESETS.development;
  const transformedDepartments = departments.map((dept) => {
    const deptPreset = preset.departments[dept.id];
    if (!deptPreset) return dept;
    const localizedName: Localized = {
      ko: deptPreset.name.ko || dept.name_ko || dept.name,
      en: deptPreset.name.en || dept.name,
      ja: deptPreset.name.ja || dept.name_ja || dept.name,
      zh: deptPreset.name.zh || dept.name_zh || dept.name,
    };
    return {
      ...dept,
      icon: deptPreset.icon,
      name: deptPreset.name.en,
      name_ko: deptPreset.name.ko,
      name_ja: deptPreset.name.ja,
      name_zh: deptPreset.name.zh,
      description: buildPackDepartmentDescription({
        locale,
        packSummary: preset.summary,
        departmentName: localizedName,
      }),
      prompt: buildPackDepartmentPrompt({
        locale,
        packSummary: preset.summary,
        departmentName: localizedName,
      }),
    };
  });

  return {
    departments: transformedDepartments,
    agents,
    roomThemes: {
      ...customRoomThemes,
      ...preset.roomThemes,
    },
  };
}
