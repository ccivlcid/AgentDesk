# AgentDesk — Retro Terminal OS Design Overhaul

> **목표**: claw-empire fork에서 완전히 벗어난 AgentDesk만의 시각 정체성 확립.
> "AI 에이전트 군단을 운영하는, 개발자를 위한 터미널 같은 툴"

---

## 1. 디자인 철학

### 핵심 컨셉: "Terminal that became a UI"

```
터미널에서 살던 개발자가 처음 AgentDesk를 열었을 때:
"이건 내가 쓰던 것과 같은 언어로 만들어졌다"
```

3가지 원칙:

1. **Monochrome First** — 색상은 정보를 전달할 때만. 장식을 위한 색상은 없음.
2. **Data Density** — 같은 공간에 더 많은 정보. 여백은 의도적으로만.
3. **Pixel Sharp** — 흐릿한 glassmorphism 대신 선명한 1px 선. 픽셀아트 오피스와 언어 통일.

### 레퍼런스 앱

| 앱 | 참고 요소 |
|---|---|
| **Raycast** | Cmd+K 팔레트, 키보드 중심 UX, 모노 폰트 라벨 |
| **Warp Terminal** | 터미널 블록 UI, 명령 단위 카드 |
| **Linear** | 정보 밀도, 날카로운 테두리, 미니멀 아이콘 |
| **Vercel Dashboard** | 상태 표시 패턴, 배포 로그 느낌 |
| **htop / btop** | 실시간 데이터 표시, 컬러 상태 인디케이터 |

---

## 2. 컬러 팔레트

### 2-1. 기본 배경 — "터미널 블랙"

현재 다크 테마가 `#0a0a18` (파란 기운 있는 네이비)인데,
**순수한 터미널 블랙** 으로 전환한다.

```css
/* 현재 */
--th-bg-primary: #0a0a18;   /* 파란 기운 네이비 */
--th-bg-secondary: #10102a;

/* 변경 후 */
--th-bg-primary: #0c0c0c;   /* 진짜 터미널 블랙 */
--th-bg-secondary: #111111;
--th-bg-surface: #181818;
--th-bg-surface-hover: #1f1f1f;
--th-bg-header: #0c0c0c;
--th-bg-sidebar: #101010;
--th-bg-elevated: #1c1c1c;  /* 모달, 드롭다운 */
```

### 2-2. 포인트 컬러 — "Amber Terminal"

파란/보라 계열 포인트에서 **앰버(호박색)** 으로 전환.
클래식 터미널의 녹색 대신, 더 따뜻하고 고급스러운 앰버 선택.

```css
/* Primary Accent: Amber */
--ad-amber: #f59e0b;          /* 메인 강조 (현재 empire-gold 재활용) */
--ad-amber-dim: #d97706;      /* hover, active */
--ad-amber-glow: rgba(245, 158, 11, 0.15);  /* glow 효과 */
--ad-amber-border: rgba(245, 158, 11, 0.3); /* 강조 테두리 */

/* Secondary Accent: Terminal Green */
--ad-green: #22c55e;          /* 성공, 온라인, 완료 */
--ad-green-dim: #16a34a;
--ad-green-glow: rgba(34, 197, 94, 0.12);

/* Danger */
--ad-red: #ef4444;
--ad-red-glow: rgba(239, 68, 68, 0.12);

/* Info */
--ad-cyan: #06b6d4;           /* 링크, 정보성 */
```

### 2-3. 텍스트 — "터미널 화이트"

```css
--th-text-primary: #e8e8e8;    /* 메인 텍스트 — 순수 흰색보다 살짝 낮춤 */
--th-text-secondary: #888888;  /* 보조 — 진짜 회색 */
--th-text-muted: #555555;      /* 힌트, 비활성 */
--th-text-heading: #f0f0f0;    /* 헤딩 */
--th-text-accent: #f59e0b;     /* 강조 텍스트 (앰버) */
--th-text-code: #22c55e;       /* 코드, 명령어, 상태값 */
```

### 2-4. 테두리 — "선명한 픽셀 선"

glassmorphism의 흐릿한 반투명 테두리 → **선명한 1px 솔리드** 로

```css
--th-border: #2a2a2a;          /* 기본 테두리 */
--th-border-strong: #3a3a3a;   /* 강한 테두리 */
--th-border-accent: rgba(245, 158, 11, 0.35);  /* 포커스/선택 테두리 */
```

### 2-5. 라이트 테마 처리

라이트 테마는 **크림/페이퍼 터미널** — 1980년대 프린터 출력물 느낌.

```css
[data-theme="light"] {
  --th-bg-primary: #f5f0e8;    /* 크림 페이퍼 */
  --th-bg-secondary: #ede8de;
  --th-bg-surface: #faf7f2;
  --th-text-primary: #1a1a1a;
  --th-text-secondary: #555555;
  --th-text-accent: #b45309;   /* 다크 앰버 */
  --th-border: #d4cfc6;
}
```

---

## 3. 타이포그래피

### 핵심 변경: JetBrains Mono 전면 확대

현재는 Sora(헤딩) + IBM Plex Sans KR(본문) + JetBrains Mono(코드).
**Retro Terminal** 방향에서는 JetBrains Mono의 역할을 크게 넓힌다.

```
JetBrains Mono 사용 범위 (확대):
  - 모든 숫자/통계 (KPI, 태스크 카운트, 토큰 사용량)
  - 상태 라벨 ([RUNNING], [IDLE], [ERROR])
  - 사이드바 배지/카운터
  - 헤더 타임스탬프
  - 에이전트 ID/코드값
  - 태스크 ID

Sora 사용 범위 (유지):
  - 페이지 헤딩 (h1, h2)
  - 앱 로고/브랜드명

IBM Plex Sans KR 사용 범위 (유지):
  - 일반 본문 텍스트
  - 설명, 설정 레이블
  - 한글 콘텐츠 전반
```

### 타이포 스케일

```css
/* 헤딩 — Sora, 굵고 크게 */
.ad-heading-xl  { font: 700 2rem/1.2 var(--th-font-display); letter-spacing: -0.02em; }
.ad-heading-lg  { font: 700 1.5rem/1.3 var(--th-font-display); letter-spacing: -0.01em; }
.ad-heading-md  { font: 600 1.125rem/1.4 var(--th-font-display); }

/* 본문 — IBM Plex Sans KR */
.ad-body-md  { font: 400 0.875rem/1.6 var(--th-font-body); }
.ad-body-sm  { font: 400 0.8125rem/1.5 var(--th-font-body); }

/* 모노 — JetBrains Mono */
.ad-mono-lg  { font: 500 1rem/1.4 var(--th-font-mono); }
.ad-mono-md  { font: 500 0.8125rem/1.4 var(--th-font-mono); }
.ad-mono-sm  { font: 400 0.75rem/1.4 var(--th-font-mono); }
.ad-mono-xs  { font: 400 0.6875rem/1.3 var(--th-font-mono); letter-spacing: 0.02em; }
```

---

## 4. 컴포넌트 시스템

### 4-1. 카드 — "Terminal Block"

glassmorphism 제거. 터미널 창처럼 **플랫하고 선명한 테두리**.

```
현재:
  background: rgba(16, 16, 42, 0.65)   ← 반투명 블러
  border: rgba(50, 50, 95, 0.35)       ← 흐린 보라 테두리
  border-radius: 12px                   ← 둥근 모서리

변경 후:
  background: #181818                   ← 불투명 플랫
  border: 1px solid #2a2a2a            ← 선명한 선
  border-radius: 4px                    ← 거의 직각 (픽셀아트와 통일)
```

카드 패턴:
```
┌─────────────────────────────────────┐  ← 1px #2a2a2a border
│ [LABEL]  제목 텍스트          값   │  ← 상단 헤더 라인
├─────────────────────────────────────┤  ← 구분선
│  콘텐츠 영역                        │
└─────────────────────────────────────┘
```

강조 카드 (선택됨, 중요):
```
┌─────────────────────────────────────┐  ← 1px amber border
│ > 제목                              │  ← > 프롬프트 기호 사용
└─────────────────────────────────────┘
  + left: 2px solid amber accent bar
```

### 4-2. 버튼 — "Terminal Commands"

```
Primary (실행, 확인):
  bg: #f59e0b  text: #000000  border: none
  hover: #d97706  font: JetBrains Mono 500

Secondary (취소, 보조):
  bg: transparent  text: #888888  border: 1px solid #2a2a2a
  hover: border-color: #3a3a3a, text: #e8e8e8

Danger (삭제, 중지):
  bg: transparent  text: #ef4444  border: 1px solid #ef4444/30
  hover: bg: #ef4444/10

Ghost (아이콘 버튼):
  bg: transparent  text: #555555
  hover: text: #e8e8e8  bg: #1f1f1f
```

### 4-3. 상태 배지 — "[STATUS]" 패턴

터미널 로그의 `[INFO]`, `[ERROR]`, `[OK]` 패턴 도입.

```
[RUNNING]  → bg: #22c55e/15  text: #22c55e  border: #22c55e/30
[IDLE]     → bg: #555/15     text: #888     border: #555/30
[ERROR]    → bg: #ef4444/15  text: #ef4444  border: #ef4444/30
[PAUSED]   → bg: #f59e0b/15  text: #f59e0b  border: #f59e0b/30
[DONE]     → bg: #06b6d4/15  text: #06b6d4  border: #06b6d4/30

font: JetBrains Mono 500, font-size: 0.6875rem
border-radius: 2px (거의 직각)
```

### 4-4. 인풋 — "Terminal Input"

```
background: #0c0c0c
border: 1px solid #2a2a2a
border-radius: 2px
font: JetBrains Mono (숫자), IBM Plex Sans KR (텍스트)
color: #e8e8e8
placeholder: #444444

focus:
  border-color: #f59e0b
  box-shadow: 0 0 0 1px rgba(245,158,11,0.2)   ← 미묘한 앰버 글로우

prefix (선택):
  "$ " 또는 "> " 텍스트 프리픽스 (앰버색)
```

### 4-5. 사이드바 — "Nav Panel"

```
현재 구조: 아이콘 + 텍스트 세로 메뉴
유지하되 스타일만 변경:

배경: #101010 (단색, 반투명 없음)
width: 220px (현재 유지)
border-right: 1px solid #2a2a2a

로고 영역:
  "AgentDesk" — Sora Bold, #f59e0b
  서브라인: "v0.x.x" — JetBrains Mono, #555

메뉴 아이템:
  비활성: text #555, bg transparent
  hover: text #e8e8e8, bg #181818
  활성:  text #f59e0b, bg #181818, left: 2px solid #f59e0b

섹션 헤더 (LIBRARY, TASKS 등):
  font: JetBrains Mono, font-size: 0.65rem, letter-spacing: 0.1em
  color: #444, text-transform: uppercase

배지:
  bg: #f59e0b  text: #000  border-radius: 2px
  font: JetBrains Mono Bold, font-size: 0.6rem
```

### 4-6. 헤더 — "Status Bar"

```
현재: 중앙 탭 그룹 + 좌우 분할
변경: 터미널 상태바처럼 재구성

[AgentDesk]  Dashboard  /  에이전트 현황    ···   [🟢 Live] [🔔 3] [☀]

좌측: 로고 + 현재 뷰 breadcrumb
중앙: (제거 또는 최소화) — 탭을 사이드바로 이동
우측: 연결 상태, 알림, 테마 토글

height: 44px (현재 56px에서 줄임)
background: #0c0c0c (불투명 단색)
border-bottom: 1px solid #2a2a2a
backdrop-blur: 제거 (픽셀 선명도 우선)
```

### 4-7. 모달 — "Terminal Window"

```
overlay: rgba(0,0,0,0.85) (더 짙게)
modal:
  background: #111111
  border: 1px solid #3a3a3a
  border-radius: 4px
  box-shadow: 0 0 0 1px #2a2a2a, 0 20px 60px rgba(0,0,0,0.8)

헤더:
  border-bottom: 1px solid #2a2a2a
  "── 제목 ──" 스타일 또는 터미널 윈도우 타이틀바 패턴
  ● ● ● 닫기/최소화 (선택적)
```

---

## 5. 레이아웃 변경

### 5-1. 앱 셸

```
현재:
  배경에 radial-gradient 3개 (파란/보라 glow)

변경:
  배경: #0c0c0c 단색
  선택적: 매우 subtle scanline 효과
    background-image: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
```

### 5-2. 대시보드 — "System Monitor"

```
현재: Hero 카드 + Ops 섹션 (일반 SaaS 스타일)

변경: htop/btop 느낌의 시스템 모니터 레이아웃

┌─ SYSTEM STATUS ──────────────────────────────────────────────┐
│  AGENTS: 8 active  TASKS: 23 running  TOKENS: 42.3k today   │
└───────────────────────────────────────────────────────────────┘

┌─ AGENT ROSTER ────────┐  ┌─ TASK QUEUE ───────────────────┐
│  🤖 Claude-Dev  [RUN] │  │  #001 feat: login    [RUNNING]  │
│  🤖 Gemini-QA   [IDL] │  │  #002 fix: auth bug  [PAUSED]   │
│  🤖 GPT-Analyst [RUN] │  │  #003 docs: API      [QUEUE]    │
└───────────────────────┘  └────────────────────────────────────┘

KPI는 숫자만 크게, JetBrains Mono로
```

### 5-3. 태스크 보드 — "Mission Queue"

```
칸반 컬럼:
  border-radius: 4px
  border: 1px solid #2a2a2a
  header: [BACKLOG] / [IN PROGRESS] / [DONE]  (모노 폰트 대문자)

태스크 카드:
  bg: #181818
  border-left: 3px solid (우선순위별 컬러)
  priority high: amber
  priority mid: cyan
  priority low: #333
```

---

## 6. 애니메이션 & 인터랙션

### 6-0. 애니메이션 라이브러리 — Framer Motion

**설치:**
```bash
pnpm add framer-motion
```

**선택 이유:**

| 이유 | 설명 |
|---|---|
| `AnimatePresence` | 모달/패널 unmount 시 exit 애니메이션 지원. 없으면 구현이 매우 복잡해짐 |
| `variants + stagger` | 터미널 스타일 순차 텍스트/카드 등장에 최적 |
| `layout` 애니메이션 | 리스트 재정렬, 패널 크기 변화 자동 처리 |
| React 19 완전 지원 | 현재 프로젝트 React 19.2 와 호환 |
| Tree-shakeable | 사용하는 기능만 번들에 포함, 불필요한 코드 없음 |
| Electron 환경 | 웹 성능 제약 없음. 이미 PixiJS + Remotion이 들어가 있어 번들 크기 문제 없음 |

**담당 범위 — Framer Motion vs 순수 CSS 역할 분리:**

```
Framer Motion 담당 (복잡한 오케스트레이션):
  ✅ 모달 열기/닫기 (AnimatePresence + exit 애니메이션)
  ✅ 부팅 시퀀스 (줄별 stagger 순차 등장)
  ✅ 뷰 전환 (페이지 간 fade/slide)
  ✅ 카드 목록 stagger (에이전트/태스크 카드 순차 등장)
  ✅ 레이아웃 변경 (사이드 패널 크기 변화)
  ✅ 숫자 카운터 (KPI 값 애니메이션)

순수 CSS 담당 (단순 반복/상태):
  ✅ 커서 깜빡임 (▋ blink)
  ✅ [RUNNING] 배지 펄스
  ✅ 버튼 hover 색상 전환
  ✅ scanline 효과 (선택적)
  ✅ 포커스 링 전환
```

**Retro Terminal 스타일로 쓰는 패턴:**

```tsx
import { motion, AnimatePresence } from "framer-motion";

// 1. 부팅 시퀀스 — 줄별 순차 등장
const bootContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const bootLine = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.08, ease: "linear" } },
};

// 2. 카드 stagger
const cardContainer = {
  show: { transition: { staggerChildren: 0.04 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.1, ease: "linear" } },
};

// 3. 모달 (AnimatePresence로 exit 처리)
const modalVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  show:   { opacity: 1, scale: 1,   transition: { duration: 0.1, ease: "linear" } },
  exit:   { opacity: 0, scale: 0.97, transition: { duration: 0.08 } },
};

// 4. 뷰 전환
const pageVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.12, ease: "linear" } },
  exit:   { opacity: 0, transition: { duration: 0.08 } },
};
```

> **핵심 원칙**: Retro Terminal 특성상 모든 duration을 **짧고 linear** 하게.
> `ease-in-out` 같은 부드러운 곡선은 쓰지 않는다. 즉각적인 반응이 터미널 감성.

---

### 6-1. 전환 — "Terminal Response"

```
기존: ease-in-out 0.3s (부드러운 SaaS 느낌)
변경: linear 0.1s 이하 (즉각 반응)

버튼 hover:    CSS transition 50ms linear
패널 슬라이드: Framer Motion 120ms linear
모달 fade:     Framer Motion 100ms linear (AnimatePresence)
뷰 전환:       Framer Motion 120ms linear
```

### 6-2. 타이핑 커서 효과 (순수 CSS)

```css
/* 로딩 중, 에이전트 작업 중 상태에 사용 */
@keyframes terminal-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

.terminal-cursor::after {
  content: "▋";
  color: #f59e0b;
  animation: terminal-blink 1s step-end infinite;
}
```

### 6-3. 에이전트 상태 표시 (순수 CSS)

```css
/* [RUNNING] 앰버 펄스 */
@keyframes pulse-amber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
  50%       { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0); }
}

/* [ERROR] 고정 — 펄스 없음, 이미 빨간색으로 주의 끔 */
/* 작업 완료: green flash 1회 → [DONE] 뱃지로 전환 (Framer Motion) */
```

### 6-4. 로딩 화면 — "Boot Sequence" (Framer Motion)

```
현재: 기본 스피너

변경: 터미널 부팅 시퀀스 — stagger로 줄별 순차 등장

AgentDesk v1.0.0
━━━━━━━━━━━━━━━━━━━━
> Initializing agent runtime...    [OK]   ← 120ms 후 등장
> Loading departments...           [OK]   ← 240ms 후 등장
> Connecting to CLI...             [OK]   ← 360ms 후 등장
> Starting office view...          [OK]   ← 480ms 후 등장
━━━━━━━━━━━━━━━━━━━━
Ready.                                    ← 600ms 후 등장, 앰버 색

폰트: JetBrains Mono
색상: 텍스트 #e8e8e8, [OK] #22c55e, > 프롬프트 #f59e0b
구현: motion.div + staggerChildren: 0.12
```

---

## 7. 브랜드 아이덴티티

### 7-1. 로고

```
텍스트 로고: "AgentDesk"
  font: Sora 800
  color: #f59e0b (앰버)
  선택적: 앞에 터미널 프롬프트 기호 ">" 또는 "$"

픽셀아트 아이콘 (별도 제작):
  모니터 + 에이전트 캐릭터 조합
  픽셀아트 스타일 유지
  앰버/그린 팔레트
```

### 7-2. 빈 상태 화면

```
현재: 빈 화면 (아무것도 없음)

변경: 각 뷰별 터미널 스타일 빈 상태

예시 (태스크 보드 빈 상태):
  $ ls tasks/
  (empty)

  No tasks found.
  Run 'new task' to get started.

  [+ New Task]

폰트: JetBrains Mono
색상: 텍스트 #444, 버튼 amber
```

### 7-3. 에러/경고 상태

```
터미널 스타일:
  ERROR: Connection failed (code: 503)
  > Check your API key in Settings

색상: 빨간 텍스트, 들여쓰기 "> " 힌트
```

---

## 8. 픽셀아트 오피스 뷰와의 통합

픽셀아트 렌더링 자체는 변경하지 않음.
**주변 UI 스타일을 픽셀 감성에 맞춤**.

```
오피스 뷰 래퍼:
  border: 1px solid #2a2a2a
  border-radius: 4px (최소)
  bg: #0c0c0c (오피스 외부 여백)

DrawingStyle 기본값:
  현재 DrawerStyle 5종 유지
  단, 기본(default)을 'retro' 스타일로 변경

에이전트 말풍선 (향후):
  픽셀아트 말풍선 형태 + JetBrains Mono 텍스트
  앰버 테두리
```

---

## 9. 구현 계획

### Phase 0 — 의존성 설치 (즉시)

```bash
pnpm add framer-motion
```

설치 후 확인:
- [ ] `framer-motion` import 동작 확인
- [ ] `motion.div`, `AnimatePresence` 기본 테스트

### Phase 1 — CSS 변수 & 토큰 교체 (1주)

변경 파일: `src/styles/index.part01.css`

- [ ] `--th-bg-*` 변수 전부 터미널 블랙으로 교체
- [ ] `--th-border` → 선명한 솔리드 컬러로 변경
- [ ] `--th-text-*` 재조정
- [ ] `--ad-amber`, `--ad-green` 등 신규 변수 추가
- [ ] 라이트 테마 → 크림 페이퍼로 조정
- [ ] body 배경 radial-gradient 제거 → 단색

**예상 임팩트**: 전체 앱 색감이 즉시 바뀜. 가장 빠른 변화.

### Phase 2 — 글로벌 컴포넌트 스타일 (2주)

변경 파일: `src/styles/index.part02~05.css` + 주요 CSS 클래스

- [ ] 카드: glassmorphism → 플랫 + 1px 테두리
- [ ] border-radius 전역 축소 (12px→4px, 8px→2px)
- [ ] 버튼 스타일 재정의
- [ ] 상태 배지 `[STATUS]` 패턴 도입
- [ ] 인풋 스타일 재정의
- [ ] backdrop-blur 제거 (헤더, 사이드바)

### Phase 3 — 주요 컴포넌트 (2주)

변경 파일별:

| 파일 | 변경 내용 |
|---|---|
| `src/app/AppLoadingScreen.tsx` | 부팅 시퀀스 애니메이션 |
| `src/app/AppHeaderBar.tsx` | 44px 높이, 상태바 스타일 |
| `src/components/Sidebar.tsx` | 로고 교체, 앰버 액티브 상태 |
| `src/components/Dashboard.tsx` | System Monitor 레이아웃 |
| `src/components/dashboard/HeroSections.tsx` | KPI 모노 폰트 전환 |
| `src/components/TaskBoard.tsx` | Mission Queue 스타일 |
| `src/components/agent-manager/AgentCard.tsx` | 터미널 블록 카드 |

### Phase 4 — 디테일 & 인터랙션 (1주)

- [ ] 빈 상태 화면 전체 (각 뷰별)
- [ ] 타이핑 커서 애니메이션
- [ ] 전환 속도 조정 (느린 ease → 빠른 linear)
- [ ] JetBrains Mono 숫자/상태값 전면 확대
- [ ] 에러/경고 터미널 스타일

### Phase 5 — 브랜드 완성 (별도)

- [ ] AgentDesk 픽셀아트 로고 제작
- [ ] favicon 교체
- [ ] README 스크린샷 전면 교체
- [ ] OG 이미지 제작

---

## 10. 피해야 할 것

```
❌ scanline 과도하게 — 레트로 느낌 과잉, 가독성 해침
❌ 애니메이션 제거 — 터미널이라도 반응성은 있어야 함
❌ 색상 완전 제거 — 모노크롬만이면 상태 구분 불가
❌ 영어 전용 UI — 한국어 사용자 경험 동등하게 유지
❌ 모바일 무시 — 최소한 대시보드/태스크는 모바일 동작
❌ 픽셀아트 오피스 손댐 — 핵심 아이덴티티, 건드리지 않음
```

---

## 11. Before / After 기대치

| 요소 | Before (현재) | After (목표) |
|---|---|---|
| 배경 | `#0a0a18` 보라 네이비 | `#0c0c0c` 터미널 블랙 |
| 포인트 컬러 | 파랑/보라 혼재 | 앰버 일원화 |
| 카드 | glassmorphism, 12px 라운드 | 플랫, 1px 선, 4px 라운드 |
| 테두리 | 반투명 보라색 | 솔리드 #2a2a2a |
| 상태 표시 | 점 인디케이터 | `[STATUS]` 배지 |
| 숫자 폰트 | 시스템 폰트 | JetBrains Mono 전면 |
| 로딩 | 스피너 | 부팅 시퀀스 |
| 빈 화면 | 기본 텍스트 | 터미널 명령 스타일 |
| 인상 | "claw-empire 비슷한 앱" | "개발자를 위한 에이전트 터미널" |

---

## 참고 문서

- 현재 CSS 변수: `src/styles/index.part01.css`
- 현재 레이아웃: `src/app/AppMainLayout.tsx`
- 오피스 뷰: `docs/office-customization-design.md`
- 차별화 전략: `docs/ui-differentiation-strategy.md`
