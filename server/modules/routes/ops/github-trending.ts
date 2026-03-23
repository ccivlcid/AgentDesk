/**
 * GET /api/github-trending
 *
 * GitHub Trending 페이지를 스크래핑하여 레포 목록을 반환한다.
 * 5분 TTL 인메모리 캐시 적용.
 */

import type { Express } from "express";
import * as cheerio from "cheerio";
import logger from "../../../lib/logger.ts";

/* ── Types ─────────────────────────────────────────────────────────── */

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

/* ── Cache ──────────────────────────────────────────────────────────── */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { repos: TrendingRepo[]; ts: number }>();

/* ── Parser ─────────────────────────────────────────────────────────── */

function parseNumber(text: string): number {
  return parseInt(text.replace(/,/g, "").trim(), 10) || 0;
}

function parseTrendingHtml(html: string, since: string): TrendingRepo[] {
  const $ = cheerio.load(html);
  const repos: TrendingRepo[] = [];
  const sinceLabel =
    since === "weekly" ? "stars this week" : since === "monthly" ? "stars this month" : "stars today";

  $("article.Box-row").each((i, el) => {
    const $el = $(el);

    // owner / name
    const repoLink = $el.find("h2 a").attr("href")?.trim() ?? "";
    const parts = repoLink.replace(/^\//, "").split("/");
    if (parts.length < 2) return;
    const owner = parts[0];
    const name = parts[1];

    // description
    const desc = $el.find("p").first().text().trim() || null;

    // language
    const langSpan = $el.find("[itemprop='programmingLanguage']");
    const language = langSpan.text().trim() || null;
    const langColorStyle = $el.find(".repo-language-color").attr("style") ?? "";
    const langColorMatch = langColorStyle.match(/background-color:\s*([^;]+)/);
    const langColor = langColorMatch ? langColorMatch[1].trim() : null;

    // stars, forks
    const links = $el.find("a.Link--muted");
    let stars = 0;
    let forks = 0;
    links.each((_j, a) => {
      const href = $(a).attr("href") ?? "";
      const num = parseNumber($(a).text());
      if (href.endsWith("/stargazers")) stars = num;
      else if (href.endsWith("/forks")) forks = num;
    });

    // stars today/week/month
    let starsToday = 0;
    const trendSpan = $el.find("span.d-inline-block.float-sm-right");
    if (trendSpan.length) {
      starsToday = parseNumber(trendSpan.text());
    }

    repos.push({
      rank: i + 1,
      owner,
      name,
      full_name: `${owner}/${name}`,
      url: `https://github.com/${owner}/${name}`,
      description: desc,
      language,
      language_color: langColor,
      stars,
      forks,
      stars_today: starsToday,
      since_label: sinceLabel,
    });
  });

  return repos;
}

/* ── Route ──────────────────────────────────────────────────────────── */

export function registerGithubTrendingRoutes({ app }: { app: Express }) {
  app.get("/api/github-trending", async (req, res) => {
    const since = (req.query.since as string) || "daily";
    const language = (req.query.language as string) || "";
    const spoken = (req.query.spoken_language_code as string) || "";

    const cacheKey = `${since}|${language}|${spoken}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json({ ok: true, repos: cached.repos, cached_at: cached.ts });
    }

    try {
      const langPath = language ? `/${encodeURIComponent(language)}` : "";
      const params = new URLSearchParams();
      params.set("since", since);
      if (spoken) params.set("spoken_language_code", spoken);
      const url = `https://github.com/trending${langPath}?${params.toString()}`;

      const response = await fetch(url, {
        headers: { "User-Agent": "AgentDesk/2.0", Accept: "text/html" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, "github trending fetch failed");
        if (cached) return res.json({ ok: true, repos: cached.repos, cached_at: cached.ts });
        return res.json({ ok: true, repos: [], cached_at: null });
      }

      const html = await response.text();
      const repos = parseTrendingHtml(html, since);
      const now = Date.now();
      cache.set(cacheKey, { repos, ts: now });

      res.json({ ok: true, repos, cached_at: now });
    } catch (err) {
      logger.warn({ err }, "github trending scrape error");
      if (cached) return res.json({ ok: true, repos: cached.repos, cached_at: cached.ts });
      res.json({ ok: true, repos: [], cached_at: null });
    }
  });
}
