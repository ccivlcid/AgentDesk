# Repo Store — GitHub 저장소 가져오기 (앱스토어)

> **목표**: GitHub Trending을 앱스토어처럼 보여주고, 원클릭으로 클론 → 설치 → 실행까지 자동화한다.
> 마치 윈도우에서 게임을 설치하고 실행하는 것과 같은 경험.

---

## 1. 핵심 컨셉

| 비유 | AgentDesk |
|------|-----------|
| 앱스토어 메인 | GitHub Trending 목록 (카드 그리드) |
| 앱 검색 | URL 직접 입력 또는 `owner/repo` 검색 |
| 설치 버튼 | "다운로드" → git clone + npm install |
| 앱 실행 | dev 서버 시작 → iframe 또는 별도 창에서 표시 |
| 앱 목록 | 바탕화면 아이콘 또는 설치된 저장소 목록 |

**로그인 불필요** — GitHub Trending 페이지는 공개 접근 가능. 스크래핑으로 데이터를 가져온다.
Private repo 클론 시에만 PAT 또는 OAuth 필요.

---

## 2. 화면 구성

### 2-1. 메인 화면 (Trending 탭)

```
┌─────────────────────────────────────────────────────────┐
│  Repo Store                                    [X]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [ owner/repo 또는 GitHub URL 입력...        ] [다운로드]│
│                                                         │
│  ┌─ 필터 ─────────────────────────────────────────────┐ │
│  │ [Today ▾]  [All Languages ▾]  [Spoken: Any ▾]     │ │
│  └────────────────────────────────────────────────────┘ │
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
│  │            [다운로드] │  │            [다운로드] │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │ ★ 12,118  +1,069     │  │ ★ 10,367  +2,300     │     │
│  │ pentagi              │  │ project-nomad        │     │
│  │ vxcontrol            │  │ Crosstalk-Solutions  │     │
│  │ ...                  │  │ ...                  │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  [더 보기...]                                           │
└─────────────────────────────────────────────────────────┘
```

**카드 정보:**
- 레포 이름 (bold) + owner (muted)
- 설명 (1~2줄, clamp)
- 프로그래밍 언어 (컬러 dot + 텍스트)
- 총 star 수 + 오늘/이번주 증가분 (트렌드 뱃지)
- "다운로드" 버튼

### 2-2. 상단 검색바 (URL 직접 입력)

- `https://github.com/owner/repo` 또는 `owner/repo` 형식 입력
- Enter 또는 "다운로드" 클릭 시 바로 클론 플로우 시작
- Trending 목록을 안 거치고 바로 설치 가능

### 2-3. 필터

| 필터 | 옵션 | URL 파라미터 |
|------|------|-------------|
| 기간 | Today / This Week / This Month | `since=daily\|weekly\|monthly` |
| 프로그래밍 언어 | All / Python / TypeScript / Go / Rust / ... | `/trending/{language}` |
| 음성 언어 | Any / Korean / English / Chinese / Japanese | `spoken_language_code=ko\|en\|zh\|ja` |

### 2-4. 클론 진행 화면

카드의 "다운로드" 클릭 시 인라인 또는 모달로 진행 상태 표시:

```
┌──────────────────────────────────────┐
│  MoneyPrinterV2 설치 중...           │
│                                      │
│  [1] 클론 중...         ████████░ 80% │
│  [2] 의존성 설치        대기 중       │
│  [3] 프로젝트 등록      대기 중       │
│                                      │
│                          [취소]       │
└──────────────────────────────────────┘
```

단계:
1. **클론** — `git clone` (진행률 표시)
2. **의존성 설치** — `npm install` / `pip install` 등 (자동 감지)
3. **프로젝트 등록** — AgentDesk 프로젝트로 등록 + 바탕화면 아이콘 생성

### 2-5. 설치 완료

- 바탕화면에 프로젝트 아이콘 자동 생성
- 알림: "MoneyPrinterV2 설치 완료"
- 아이콘 더블클릭 → 프로젝트 폴더 창 열림

---

## 3. 데이터 흐름

### 3-1. Trending 데이터 가져오기

```
[프론트엔드]
    │
    ▼ GET /api/github-trending?since=daily&language=python&spoken=ko
    │
[서버 - github-trending.ts]
    │
    ▼ fetch("https://github.com/trending/python?since=daily&spoken_language_code=ko")
    │
    ▼ HTML 파싱 (cheerio)
    │
    ▼ 응답: { ok: true, repos: TrendingRepo[] }
    │
[프론트엔드]
    │
    ▼ 카드 그리드로 렌더링
```

### 3-2. 레포 클론 + 설치

```
[카드 "다운로드" 클릭]
    │
    ▼ POST /api/github/clone  (기존 API 재사용)
    │   body: { owner, repo, branch?, target_path? }
    │
    ▼ 서버에서 git clone 실행
    │
    ▼ GET /api/github/clone-status/:id (폴링)
    │
    ▼ 클론 완료 후 → POST /api/projects (프로젝트 등록)
    │
[완료 → 바탕화면 아이콘 생성]
```

---

## 4. API 설계

### `GET /api/github-trending`

GitHub Trending 페이지를 스크래핑하여 레포 목록을 반환한다.

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `since` | `"daily" \| "weekly" \| "monthly"` | `"daily"` | 기간 필터 |
| `language` | `string` | `""` (전체) | 프로그래밍 언어 (예: `python`, `typescript`) |
| `spoken_language_code` | `string` | `""` (전체) | 음성 언어 코드 (예: `ko`, `en`) |

**Response:**

```typescript
interface TrendingRepo {
  rank: number;              // 순위 (1~25)
  owner: string;             // "FujiwaraChoki"
  name: string;              // "MoneyPrinterV2"
  full_name: string;         // "FujiwaraChoki/MoneyPrinterV2"
  url: string;               // "https://github.com/FujiwaraChoki/MoneyPrinterV2"
  description: string | null;
  language: string | null;   // "Python"
  language_color: string | null; // "#3572A5"
  stars: number;             // 19998
  forks: number;             // 2341
  stars_today: number;       // 1787 (또는 이번 주/월)
  since_label: string;       // "stars today" | "stars this week" | "stars this month"
}

// GET /api/github-trending
{
  ok: true,
  repos: TrendingRepo[],
  cached_at: number | null   // 캐시 시점 (5분 TTL)
}
```

**캐싱:** 같은 파라미터 조합으로 5분 이내 재요청 시 캐시 응답 반환 (GitHub 부하 방지).

---

## 5. 기술 구현

### 5-1. 서버 (스크래핑)

| 항목 | 선택 |
|------|------|
| HTML 파서 | `cheerio` (이미 의존성에 있으면 사용, 없으면 regex 파싱) |
| 캐시 | 메모리 Map (key: query params hash, TTL: 5분) |
| 에러 처리 | GitHub 접속 실패 시 빈 배열 + `cached_at: null` |

파일 위치: `server/modules/routes/ops/github-trending.ts`

### 5-2. 프론트엔드

| 항목 | 선택 |
|------|------|
| 창 타입 | 기존 `git-import` WindowType 재사용 |
| 컴포넌트 | `GitImportWindow.tsx` 리뉴얼 — Trending 탭 추가 |
| API 클라이언트 | `src/api/github-trending.ts` |
| 카드 | 2열 그리드, 반응형 (창 폭 좁으면 1열) |

### 5-3. 클론/설치 플로우

기존 API 재사용:
- `POST /api/providers/github/clone` — git clone 시작
- `GET /api/providers/github/clone-status/:id` — 진행률 폴링
- `POST /api/projects` — 프로젝트 등록

추가 고려:
- 클론 대상 경로 자동 생성: `~/Projects/{repo-name}/`
- 클론 완료 후 `package.json` / `requirements.txt` / `go.mod` 감지 → 언어/빌드 도구 자동 판별 (Phase 2)

---

## 6. 구현 순서

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | `cheerio` 설치 확인 또는 regex 파서 작성 | — |
| 2 | `GET /api/github-trending` 서버 라우트 | `server/modules/routes/ops/github-trending.ts` |
| 3 | 프론트 API 클라이언트 | `src/api/github-trending.ts` |
| 4 | `GitImportWindow` 리뉴얼 — Trending 카드 그리드 | `src/components/windows/GitImportWindow.tsx` |
| 5 | 카드 "다운로드" → 클론 플로우 연결 | 기존 clone API 재사용 |
| 6 | 필터 UI (기간, 언어) | GitImportWindow 내부 |

---

## 7. 제약 & 리스크

| 리스크 | 대응 |
|--------|------|
| GitHub가 스크래핑 차단 | 5분 캐시 + User-Agent 헤더 + 429 시 재시도 |
| HTML 구조 변경 | 파서 분리해서 유지보수 쉽게 |
| Private repo는 Trending에 안 나옴 | 상단 검색바에서 URL 직접 입력으로 커버 (PAT 필요) |
| 클론 시간이 긴 대형 레포 | `--depth 1` (shallow clone) 기본 적용 |
