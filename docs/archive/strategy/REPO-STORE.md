# Repo Store — GitHub Repository Import (App Store)

> **Goal**: Display GitHub Trending like an app store, and automate the entire flow from one-click clone to install to run.
> An experience similar to installing and running a game on Windows.

---

## 1. Core Concept

| Analogy | AgentDesk |
|---------|-----------|
| App store main page | GitHub Trending list (card grid) |
| App search | Direct URL input or `owner/repo` search |
| Install button | "Download" → git clone + npm install |
| App launch | Start dev server → display in iframe or separate window |
| App list | Desktop icons or installed repository list |

**No login required** — The GitHub Trending page is publicly accessible. Data is fetched via scraping.
PAT or OAuth is only needed when cloning private repos.

---

## 2. Screen Layout

### 2-1. Main Screen (Trending Tab)

```
┌─────────────────────────────────────────────────────────┐
│  Repo Store                                    [X]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [ Enter owner/repo or GitHub URL...      ] [Download]  │
│                                                         │
│  ┌─ Filters ─────────────────────────────────────────┐  │
│  │ [Today ▾]  [All Languages ▾]  [Spoken: Any ▾]    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ── Trending ──────────────────────────────────────────  │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │ ★ 19,998  +1,787     │  │ ★ 37,452  +1,051     │     │
│  │ MoneyPrinterV2       │  │ TradingAgents        │     │
│  │ FujiwaraChoki        │  │ TauricResearch       │     │
│  │                      │  │                      │     │
│  │ Automate the process │  │ Multi-Agents LLM     │     │
│  │ of making money...   │  │ Financial Trading... │     │
│  │                      │  │                      │     │
│  │ ● Python             │  │ ● Python             │     │
│  │            [Download] │  │            [Download] │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │ ★ 12,118  +1,069     │  │ ★ 10,367  +2,300     │     │
│  │ pentagi              │  │ project-nomad        │     │
│  │ vxcontrol            │  │ Crosstalk-Solutions  │     │
│  │ ...                  │  │ ...                  │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  [Load more...]                                         │
└─────────────────────────────────────────────────────────┘
```

**Card information:**
- Repo name (bold) + owner (muted)
- Description (1–2 lines, clamped)
- Programming language (color dot + text)
- Total star count + today/this week increase (trend badge)
- "Download" button

### 2-2. Top Search Bar (Direct URL Input)

- Input in `https://github.com/owner/repo` or `owner/repo` format
- Pressing Enter or clicking "Download" immediately starts the clone flow
- Allows installation without going through the Trending list

### 2-3. Filters

| Filter | Options | URL Parameter |
|--------|---------|---------------|
| Period | Today / This Week / This Month | `since=daily\|weekly\|monthly` |
| Programming language | All / Python / TypeScript / Go / Rust / ... | `/trending/{language}` |
| Spoken language | Any / Korean / English / Chinese / Japanese | `spoken_language_code=ko\|en\|zh\|ja` |

### 2-4. Clone Progress Screen

When clicking "Download" on a card, progress is shown inline or in a modal:

```
┌──────────────────────────────────────┐
│  Installing MoneyPrinterV2...        │
│                                      │
│  [1] Cloning...           ████████░ 80% │
│  [2] Installing deps      Waiting       │
│  [3] Registering project  Waiting       │
│                                      │
│                          [Cancel]    │
└──────────────────────────────────────┘
```

Steps:
1. **Clone** — `git clone` (with progress indicator)
2. **Install dependencies** — `npm install` / `pip install` etc. (auto-detected)
3. **Register project** — Register as an AgentDesk project + create desktop icon

### 2-5. Installation Complete

- Desktop icon automatically created
- Notification: "MoneyPrinterV2 installation complete"
- Double-click icon → project folder window opens

---

## 3. Data Flow

### 3-1. Fetching Trending Data

```
[Frontend]
    │
    ▼ GET /api/github-trending?since=daily&language=python&spoken=ko
    │
[Server - github-trending.ts]
    │
    ▼ fetch("https://github.com/trending/python?since=daily&spoken_language_code=ko")
    │
    ▼ HTML parsing (cheerio)
    │
    ▼ Response: { ok: true, repos: TrendingRepo[] }
    │
[Frontend]
    │
    ▼ Render as card grid
```

### 3-2. Repo Clone + Install

```
[Card "Download" click]
    │
    ▼ POST /api/github/clone  (reuse existing API)
    │   body: { owner, repo, branch?, target_path? }
    │
    ▼ Server executes git clone
    │
    ▼ GET /api/github/clone-status/:id (polling)
    │
    ▼ After clone complete → POST /api/projects (register project)
    │
[Complete → Create desktop icon]
```

---

## 4. API Design

### `GET /api/github-trending`

Scrapes the GitHub Trending page and returns the repo list.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `since` | `"daily" \| "weekly" \| "monthly"` | `"daily"` | Period filter |
| `language` | `string` | `""` (all) | Programming language (e.g., `python`, `typescript`) |
| `spoken_language_code` | `string` | `""` (all) | Spoken language code (e.g., `ko`, `en`) |

**Response:**

```typescript
interface TrendingRepo {
  rank: number;              // Rank (1–25)
  owner: string;             // "FujiwaraChoki"
  name: string;              // "MoneyPrinterV2"
  full_name: string;         // "FujiwaraChoki/MoneyPrinterV2"
  url: string;               // "https://github.com/FujiwaraChoki/MoneyPrinterV2"
  description: string | null;
  language: string | null;   // "Python"
  language_color: string | null; // "#3572A5"
  stars: number;             // 19998
  forks: number;             // 2341
  stars_today: number;       // 1787 (or this week/month)
  since_label: string;       // "stars today" | "stars this week" | "stars this month"
}

// GET /api/github-trending
{
  ok: true,
  repos: TrendingRepo[],
  cached_at: number | null   // Cache timestamp (5-minute TTL)
}
```

**Caching:** If the same parameter combination is re-requested within 5 minutes, the cached response is returned (to reduce load on GitHub).

---

## 5. Technical Implementation

### 5-1. Server (Scraping)

| Item | Choice |
|------|--------|
| HTML parser | `cheerio` (use if already in dependencies, otherwise regex parsing) |
| Cache | In-memory Map (key: query params hash, TTL: 5 minutes) |
| Error handling | On GitHub connection failure, return empty array + `cached_at: null` |

File location: `server/modules/routes/ops/github-trending.ts`

### 5-2. Frontend

| Item | Choice |
|------|--------|
| Window type | Reuse existing `git-import` WindowType |
| Component | `GitImportWindow.tsx` renewal — add Trending tab |
| API client | `src/api/github-trending.ts` |
| Cards | 2-column grid, responsive (1 column when window is narrow) |

### 5-3. Clone/Install Flow

Reuse existing APIs:
- `POST /api/providers/github/clone` — start git clone
- `GET /api/providers/github/clone-status/:id` — poll progress
- `POST /api/projects` — register project

Additional considerations:
- Auto-create clone target path: `~/Projects/{repo-name}/`
- After clone, detect `package.json` / `requirements.txt` / `go.mod` → auto-detect language/build tool (Phase 2)

---

## 6. Implementation Order

| Step | Task | File |
|------|------|------|
| 1 | Verify `cheerio` installation or write regex parser | — |
| 2 | `GET /api/github-trending` server route | `server/modules/routes/ops/github-trending.ts` |
| 3 | Frontend API client | `src/api/github-trending.ts` |
| 4 | `GitImportWindow` renewal — Trending card grid | `src/components/windows/GitImportWindow.tsx` |
| 5 | Card "Download" → connect to clone flow | Reuse existing clone API |
| 6 | Filter UI (period, language) | Inside GitImportWindow |

---

## 7. Constraints & Risks

| Risk | Mitigation |
|------|------------|
| GitHub blocks scraping | 5-minute cache + User-Agent header + retry on 429 |
| HTML structure changes | Keep parser isolated for easy maintenance |
| Private repos don't appear in Trending | Cover via direct URL input in top search bar (PAT required) |
| Long clone times for large repos | Apply `--depth 1` (shallow clone) by default |
