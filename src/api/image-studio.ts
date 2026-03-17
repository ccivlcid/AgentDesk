export interface ImageGenerationItem {
  id: string;
  provider: string;
  model: string;
  prompt: string;
  width: number;
  height: number;
  createdAt: number;
  metadata?: { revisedPrompt?: string } | null;
}

export interface ImageStudioProvider {
  id: string;
  name: string;
  type: string;
  base_url: string;
  models: string[];
}

export type GenerateMode = "txt2img" | "img2img" | "inpaint";

export interface GenerateRequest {
  api_provider_id: string;
  model?: string;
  prompt: string;
  negPrompt?: string;
  width?: number;
  height?: number;
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
  mode?: GenerateMode;
  inputImageB64?: string;  // base64 PNG (with or without data: prefix)
  maskB64?: string;        // base64 PNG mask for inpaint (white = replace area)
  task_id?: string;        // optional task linkage
}

export interface GenerateResult {
  id: string;
  provider: string;
  model: string;
  prompt: string;
  revisedPrompt?: string;
  width: number;
  height: number;
  createdAt: number;
}

export async function getImageProviders(): Promise<ImageStudioProvider[]> {
  const res = await fetch("/api/image-studio/providers");
  const json = await res.json() as { ok: boolean; providers: ImageStudioProvider[] };
  return json.providers ?? [];
}

export async function generateImage(req: GenerateRequest): Promise<GenerateResult> {
  const res = await fetch("/api/image-studio/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const json = await res.json() as GenerateResult & { ok: boolean; error?: string; message?: string };
  if (!res.ok) throw new Error(json.message ?? json.error ?? "Generate failed");
  return json;
}

export async function getGallery(params?: {
  limit?: number;
  offset?: number;
  provider?: string;
  search?: string;
}): Promise<{ items: ImageGenerationItem[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  if (params?.provider) q.set("provider", params.provider);
  if (params?.search) q.set("search", params.search);
  const res = await fetch(`/api/image-studio/gallery?${q}`);
  return res.json() as Promise<{ ok: boolean; items: ImageGenerationItem[]; total: number }>;
}

export async function deleteImage(id: string): Promise<void> {
  await fetch(`/api/image-studio/gallery/${id}`, { method: "DELETE" });
}

export function getImageUrl(id: string, thumb?: boolean): string {
  return `/api/image-studio/image/${id}${thumb ? "?thumb=1" : ""}`;
}

export async function getTaskImages(taskId: string): Promise<ImageGenerationItem[]> {
  const res = await fetch(`/api/image-studio/task/${taskId}/images`);
  const json = await res.json() as { ok: boolean; items: ImageGenerationItem[] };
  return json.items ?? [];
}
