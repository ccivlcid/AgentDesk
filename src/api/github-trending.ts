import { request } from "./core";

export interface TrendingRepo {
  rank: number;
  owner: string;
  name: string;
  full_name: string;
  url: string;
  description: string | null;
  language: string | null;
  language_color: string | null;
  stars: number;
  forks: number;
  stars_today: number;
  since_label: string;
}

interface TrendingResponse {
  ok: boolean;
  repos: TrendingRepo[];
  cached_at: number | null;
}

export async function getGithubTrending(params?: {
  since?: "daily" | "weekly" | "monthly";
  language?: string;
  spoken_language_code?: string;
}): Promise<TrendingResponse> {
  const qs = new URLSearchParams();
  if (params?.since) qs.set("since", params.since);
  if (params?.language) qs.set("language", params.language);
  if (params?.spoken_language_code) qs.set("spoken_language_code", params.spoken_language_code);
  const q = qs.toString();
  return request<TrendingResponse>(`/api/github-trending${q ? "?" + q : ""}`);
}
