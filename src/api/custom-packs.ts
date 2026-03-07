import type { CustomOfficePack, Department, Agent } from "../types";
import { request, post, put, del } from "./core";
import { getSettings, saveSettingsPatch } from "./messaging-runtime-oauth";

export interface CustomPackAiResult {
  departments: Department[];
  agents: Agent[];
}

export async function getCustomPacks(): Promise<CustomOfficePack[]> {
  const res = await request<{ ok: boolean; packs: CustomOfficePack[] }>("/api/custom-packs");
  return res.packs ?? [];
}

export async function createCustomPack(
  input: Omit<CustomOfficePack, "key" | "created_at"> & { key?: string },
): Promise<CustomOfficePack> {
  const res = await post<{ ok: boolean; pack: CustomOfficePack }>("/api/custom-packs", input as Record<string, unknown>);
  return res.pack;
}

export async function updateCustomPack(
  key: string,
  input: Partial<Omit<CustomOfficePack, "key" | "created_at">>,
): Promise<CustomOfficePack> {
  const res = await put<{ ok: boolean; pack: CustomOfficePack }>(`/api/custom-packs/${key}`, input as Record<string, unknown>);
  return res.pack;
}

export async function deleteCustomPack(key: string): Promise<void> {
  await del(`/api/custom-packs/${key}`);
}

export async function toggleBuiltinPackVisibility(key: string, hide: boolean): Promise<void> {
  const current = await getSettings();
  const hidden = new Set(current.hiddenBuiltinPackKeys ?? []);
  if (hide) hidden.add(key);
  else hidden.delete(key);
  await saveSettingsPatch({ hiddenBuiltinPackKeys: [...hidden] });
}

export async function aiGeneratePackProfile(input: {
  name: string;
  name_ko: string;
  description: string;
}): Promise<CustomPackAiResult> {
  const res = await post<{ ok: boolean; departments: Department[]; agents: Agent[] }>(
    "/api/custom-packs/ai-generate",
    input as Record<string, unknown>,
  );
  return { departments: res.departments ?? [], agents: res.agents ?? [] };
}
