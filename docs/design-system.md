# AgentDesk Design System
# FM2024 Management Sim × Retro Terminal Hybrid

> **컨셉**: Football Manager 2024의 관리 시뮬레이션 레이아웃 +
> Retro Terminal의 실행/작업 영역 = "AI 에이전트 군단을 운영하는 감독"

---

## 1. 디자인 철학

### 3-Layer 구조

```
Layer 1: FM2024 Management UI    — 전략/관리 레이어
Layer 2: Retro Terminal          — 실행/작업 레이어
Layer 3: Pixel Art Office        — 공간/시각 레이어 (기존 유지)
```

### 레이어별 담당 영역

| 영역 | 레이어 | 이유 |
|---|---|---|
| 사이드바 / 네비게이션 | FM2024 | 섹션 탐색, 밀도 높은 구조 |
| 에이전트 프로필 | FM2024 선수카드 | 능력치 바, 스탯 그리드 |
| 대시보드 | FM2024 감독 오버뷰 | 팀 현황, KPI, 활동 피드 |
| 태스크 보드 | FM2024 경기 일정표 | 상태 컬럼, 우선순위 |
| 태스크 실행 뷰어 | Retro Terminal | CLI 출력, 로그, 진행 |
| 채팅 / 커맨드 입력 | Retro Terminal | 명령 인터페이스 |
| 라이브러리 (Rules/Memory/Hooks) | FM2024 훈련 화면 | 데이터 그리드, 필터 |
| 설정 | FM2024 클럽 관리 | 탭 기반, 정보 밀도 |
| 오피스 뷰 화면 | **FM2024 Match View + Pixel Art Canvas** | FM 3-컬럼 레이아웃으로 캔버스를 감싸는 구조 |
| 오피스 뷰 캔버스 | Pixel Art (PixiJS) | 건물 크로스섹션 — 핵심 비주얼 아이덴티티 유지 |

---

## 2. FM2024 UI 분석 — 핵심 패턴

### 2-1. 전체 레이아웃

FM2024의 레이아웃 구조:

```
┌──────┬────────────────────────────────────────┐
│      │  [Breadcrumb / Title Bar]              │
│      ├──────────────┬─────────────────────────┤
│Side  │              │                         │
│bar   │  Main Panel  │  Detail Panel           │
│      │  (탭 기반)    │  (우측 사이드 패널)      │
│      │              │                         │
│      ├──────────────┴─────────────────────────┤
│      │  [Status Bar / Toolbar]                │
└──────┴────────────────────────────────────────┘
```

- **사이드바**: 좌측 고정, 섹션 아이콘 + 라벨, 220px
- **메인 패널**: 탭으로 뷰 전환, 내용에 따라 테이블/카드/차트
- **디테일 패널**: 우측 컨텍스트 패널 (선택한 항목 상세)
- **정보 밀도**: 화면당 최대한 많은 정보, 여백 최소

### 2-2. FM2024 컬러 팔레트

공식 FM2024 다크 스킨 + 커뮤니티 검증 색상 기준:

```
배경 레이어:
  --fm-bg-base:      #0f1117   ← 메인 배경 (매우 어두운 네이비 블랙)
  --fm-bg-panel:     #161b22   ← 패널 배경
  --fm-bg-surface:   #1c2128   ← 카드/섹션 배경
  --fm-bg-elevated:  #21262d   ← 드롭다운, 모달
  --fm-bg-overlay:   #2d333b   ← hover, 선택 상태

테두리:
  --fm-border:       #30363d   ← 기본 테두리 (섬세한 회청색)
  --fm-border-strong: #444c56  ← 강한 구분선

텍스트:
  --fm-text-primary:  #e6edf3  ← 메인 텍스트 (밝은 회백)
  --fm-text-secondary: #8b949e ← 보조 텍스트
  --fm-text-muted:    #6e7681  ← 힌트, 비활성
  --fm-text-heading:  #f0f6fc  ← 헤딩, 강조

속성값 색상 (FM 어트리뷰트 시스템):
  --fm-attr-elite:    #22c55e  ← 17-20 (그린, 최상급)
  --fm-attr-good:     #86efac  ← 13-16 (라이트 그린, 우수)
  --fm-attr-avg:      #fbbf24  ← 9-12  (앰버, 평균)
  --fm-attr-poor:     #f87171  ← 5-8   (레드, 낮음)
  --fm-attr-vlow:     #6e7681  ← 1-4   (회색, 매우 낮음)
```

### 2-3. AgentDesk 전용 포인트 컬러

FM2024는 클럽 색상(초록계열)을 포인트로 씀.
AgentDesk는 **Amber(호박색)** 를 포인트로.

```
포인트 컬러:
  --ad-accent:        #f59e0b  ← 메인 강조 (Amber)
  --ad-accent-dim:    #d97706  ← hover/active
  --ad-accent-glow:   rgba(245, 158, 11, 0.15)
  --ad-accent-border: rgba(245, 158, 11, 0.3)

상태 컬러:
  --ad-online:        #22c55e  ← 연결됨, 실행 중
  --ad-warning:       #f59e0b  ← 경고, 일시정지
  --ad-danger:        #f85149  ← 오류, 중단
  --ad-info:          #58a6ff  ← 정보, 대기 중
  --ad-done:          #3fb950  ← 완료
```

---

## 3. 업데이트된 CSS 변수 시스템

기존 `--th-*` 변수를 FM2024 팔레트로 전면 재정의:

```css
/* Dark Theme — FM2024 Management Sim */
:root, [data-theme="dark"] {
  /* 배경 */
  --th-bg-primary:      #0f1117;
  --th-bg-secondary:    #161b22;
  --th-bg-surface:      #1c2128;
  --th-bg-surface-hover: #21262d;
  --th-bg-header:       #0f1117;
  --th-bg-sidebar:      #0d1117;
  --th-bg-elevated:     #21262d;

  /* 테두리 */
  --th-border:          #30363d;
  --th-border-strong:   #444c56;
  --th-border-accent:   rgba(245, 158, 11, 0.4);

  /* 텍스트 */
  --th-text-primary:    #e6edf3;
  --th-text-secondary:  #8b949e;
  --th-text-muted:      #6e7681;
  --th-text-heading:    #f0f6fc;
  --th-text-accent:     #f59e0b;
  --th-text-code:       #79c0ff;  ← 터미널 영역용 코드 색상

  /* 포인트 */
  --th-accent:          #f59e0b;
  --th-accent-dim:      #d97706;
  --th-accent-glow:     rgba(245, 158, 11, 0.12);

  /* 카드/패널 */
  --th-card-bg:         #1c2128;
  --th-card-border:     #30363d;
  --th-card-bg-hover:   #21262d;
  --th-panel-bg:        #161b22;
  --th-panel-border:    #30363d;

  /* 인풋 */
  --th-input-bg:        #0d1117;
  --th-input-border:    #30363d;

  /* 포커스 */
  --th-focus-ring:      #f59e0b;
  --th-focus-ring-shadow: rgba(245, 158, 11, 0.3);

  /* 모달 */
  --th-modal-overlay:   rgba(1, 4, 9, 0.8);

  /* 스크롤바 */
  --th-scrollbar-thumb: #30363d;
  --th-scrollbar-thumb-hover: #444c56;

  /* 위험 */
  --th-danger-bg:       rgba(248, 81, 73, 0.1);
  --th-danger-border:   #f85149;
  --th-danger-text:     #f85149;

  /* 속성값 (FM 스타일) */
  --th-attr-elite:      #22c55e;
  --th-attr-good:       #86efac;
  --th-attr-avg:        #fbbf24;
  --th-attr-poor:       #f87171;
  --th-attr-vlow:       #6e7681;
}

/* Light Theme — 크림 페이퍼 (FM 라이트 모드 느낌) */
[data-theme="light"] {
  --th-bg-primary:      #ffffff;
  --th-bg-secondary:    #f6f8fa;
  --th-bg-surface:      #f6f8fa;
  --th-bg-surface-hover: #eaeef2;
  --th-bg-header:       #ffffff;
  --th-bg-sidebar:      #f6f8fa;
  --th-bg-elevated:     #ffffff;
  --th-border:          #d0d7de;
  --th-border-strong:   #b1bac4;
  --th-border-accent:   rgba(180, 83, 9, 0.4);
  --th-text-primary:    #1f2328;
  --th-text-secondary:  #636c76;
  --th-text-muted:      #9198a1;
  --th-text-heading:    #0d1117;
  --th-text-accent:     #b45309;
  --th-text-code:       #0550ae;
  --th-accent:          #b45309;
  --th-accent-dim:      #92400e;
  --th-accent-glow:     rgba(180, 83, 9, 0.08);
  --th-card-bg:         #ffffff;
  --th-card-border:     #d0d7de;
  --th-card-bg-hover:   #f6f8fa;
  --th-panel-bg:        #f6f8fa;
  --th-panel-border:    #d0d7de;
  --th-input-bg:        #ffffff;
  --th-input-border:    #d0d7de;
  --th-focus-ring:      #b45309;
  --th-focus-ring-shadow: rgba(180, 83, 9, 0.25);
  --th-modal-overlay:   rgba(1, 4, 9, 0.4);
  --th-scrollbar-thumb: #d0d7de;
  --th-scrollbar-thumb-hover: #b1bac4;
  --th-danger-bg:       #fff0ee;
  --th-danger-border:   #cf222e;
  --th-danger-text:     #cf222e;
  --th-attr-elite:      #1a7f37;
  --th-attr-good:       #2da44e;
  --th-attr-avg:        #9a6700;
  --th-attr-poor:       #cf222e;
  --th-attr-vlow:       #9198a1;
}
```

---

## 4. 타이포그래피

FM2024는 **헤딩은 굵게 크게, 데이터는 작고 촘촘하게** 하는 이중 구조.
AgentDesk도 동일하게 적용.

```
헤딩 (Sora):
  페이지 제목    Sora 700  1.5rem   letter-spacing -0.02em
  섹션 제목      Sora 600  1.125rem
  카드 제목      Sora 600  0.9375rem

본문 (IBM Plex Sans KR):
  일반 텍스트    400  0.875rem   line-height 1.6
  설명 텍스트    400  0.8125rem  line-height 1.5
  라벨           500  0.75rem    letter-spacing 0.01em

데이터/수치 (JetBrains Mono) — FM 어트리뷰트 스타일:
  속성값/스탯    600  0.875rem   (숫자 강조)
  상태 배지      500  0.6875rem  letter-spacing 0.05em uppercase
  타임스탬프     400  0.75rem
  터미널 출력    400  0.8125rem  line-height 1.7
```

---

## 5. 컴포넌트 시스템

### 5-1. 패널 (FM2024 핵심 패턴)

FM2024에서 모든 정보는 **패널** 단위로 구성.
탭 전환, 섹션 헤더, 데이터 그리드 3가지가 핵심.

```
패널 구조:
┌─────────────────────────────────────────────────┐
│  섹션 헤더  (좌측 amber 3px 바 + 제목)           │
├─────────────────────────────────────────────────┤
│  탭: [Overview] [Stats] [History] [Notes]       │
├─────────────────────────────────────────────────┤
│                                                 │
│  콘텐츠 (테이블 / 카드 그리드 / 차트)            │
│                                                 │
└─────────────────────────────────────────────────┘

CSS:
  background: var(--th-panel-bg)
  border: 1px solid var(--th-panel-border)
  border-radius: 6px
  section-header: border-left: 3px solid #f59e0b
```

### 5-2. 에이전트 프로필 카드 (FM 선수카드 스타일)

```
┌──────────────────────────────────────────────────────┐
│  [스프라이트]  Claude-Dev              [JOBS] [RUN]  │
│  🤖            Senior Developer                      │
│                Dev Team · 3 tasks active             │
├──────────────────────────────────────────────────────┤
│  ATTRIBUTES                                          │
│  Code Quality   ████████████████░░░░  82             │
│  Speed          █████████████░░░░░░░  68             │
│  Creativity     ██████████████████░░  91             │
│  Reliability    ███████████░░░░░░░░░  57             │
├──────────────────────────────────────────────────────┤
│  Tasks Done: 142   XP: 4,820   This Week: 8         │
└──────────────────────────────────────────────────────┘

속성 바: FM의 1-20 → AgentDesk는 0-100
색상: 80+ 초록, 60-79 앰버, 40-59 노랑, 39- 빨강
```

### 5-3. 태스크 보드 (FM 경기 일정 스타일)

```
FM의 경기 일정표처럼 태스크를 리스트로 표시.
각 태스크는 한 줄 row, 상태/우선순위/담당자 한눈에.

┌──────────────────────────────────────────────────────────┐
│  #  Title                    Agent        Status   Pri  │
├──────────────────────────────────────────────────────────┤
│  042  feat: login redesign   Claude-Dev   [RUN]    ▲▲▲  │
│  043  fix: auth token bug    Gemini-QA    [QUEUE]  ▲▲░  │
│  044  docs: API reference    GPT-Writer   [DONE]   ▲░░  │
└──────────────────────────────────────────────────────────┘

Row hover: background: var(--th-bg-surface-hover)
Active row: border-left: 2px solid #f59e0b
```

### 5-4. 상태 배지 (FM 폼 가이드 스타일)

FM의 W/D/L 폼 가이드처럼 상태를 색상 박스로.

```
[RUN]   bg: rgba(34,197,94,0.15)   text: #22c55e   border: #22c55e/30
[QUEUE] bg: rgba(88,166,255,0.12)  text: #58a6ff   border: #58a6ff/30
[PAUSE] bg: rgba(245,158,11,0.12)  text: #f59e0b   border: #f59e0b/30
[ERROR] bg: rgba(248,81,73,0.12)   text: #f85149   border: #f85149/30
[DONE]  bg: rgba(63,185,80,0.12)   text: #3fb950   border: #3fb950/30

font: JetBrains Mono 500, 0.65rem, uppercase, letter-spacing 0.06em
border-radius: 3px, padding: 2px 6px
```

### 5-5. 사이드바 (FM 네비게이션 스타일)

```
배경: #0d1117  (FM보다 살짝 더 어둡게)
width: 220px
border-right: 1px solid #30363d

로고 영역:
  "AgentDesk" — Sora 800, color: #f59e0b
  회사명 — IBM Plex Sans KR, color: #8b949e, 0.75rem

섹션 그룹 헤더 (FM OVERVIEW / SQUAD 스타일):
  font: JetBrains Mono 400, 0.6rem, uppercase, letter-spacing 0.12em
  color: #6e7681
  padding: 12px 16px 4px
  (FM의 섹션 구분자처럼)

메뉴 아이템:
  비활성:  text #8b949e, bg transparent, border-left 3px transparent
  hover:   text #e6edf3, bg #21262d
  활성:    text #f59e0b, bg #21262d, border-left 3px solid #f59e0b

배지 (미읽음/카운트):
  bg: #f59e0b, text: #000, border-radius: 3px
  font: JetBrains Mono 700, 0.6rem
```

### 5-6. 헤더 (FM 타이틀바 스타일)

```
height: 48px
background: #0f1117
border-bottom: 1px solid #30363d

구성 (FM의 breadcrumb + 액션바):
  좌: [AgentDesk 로고] / [현재 뷰 breadcrumb]
  우: [연결 상태] [알림] [테마 토글]

연결 상태 표시:
  dot + "LIVE" / "OFFLINE"  — JetBrains Mono, 0.7rem
  Live: dot #22c55e
  Offline: dot #f85149
```

### 5-7. 버튼

```
Primary (실행, 확인):
  bg: #f59e0b   text: #000000   border: none   border-radius: 5px
  font: 500  hover: bg #d97706   transition: 100ms linear

Secondary (취소, 보조):
  bg: transparent   text: #8b949e   border: 1px solid #30363d
  hover: bg #21262d, text #e6edf3, border-color #444c56

Ghost (아이콘 버튼):
  bg: transparent   text: #6e7681
  hover: text #e6edf3, bg #21262d

Danger:
  bg: transparent   text: #f85149   border: 1px solid rgba(248,81,73,0.3)
  hover: bg rgba(248,81,73,0.1)
```

### 5-8. 데이터 테이블 (FM 선수 목록 스타일)

```
헤더 행:
  bg: #161b22
  font: JetBrains Mono 500, 0.7rem, uppercase, letter-spacing 0.08em
  color: #6e7681
  border-bottom: 1px solid #30363d

데이터 행:
  bg: transparent
  border-bottom: 1px solid #21262d (매우 옅은 구분선)
  hover: bg #1c2128

선택된 행:
  bg: #21262d
  border-left: 2px solid #f59e0b
```

---

## 6. 터미널 영역 — Retro Terminal 스타일

태스크 실행 뷰어, CLI 로그, 채팅 입력창은 별도 터미널 스타일 적용.

```css
/* 터미널 컨테이너 */
.terminal-zone {
  background: #010409;          /* FM 배경보다 훨씬 어둡게 */
  border: 1px solid #30363d;
  border-radius: 6px;
  font-family: var(--th-font-mono);
}

/* 터미널 헤더 바 */
.terminal-titlebar {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 8px 12px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.terminal-dot { width: 10px; height: 10px; border-radius: 50%; }
.terminal-dot-red    { background: #f85149; }
.terminal-dot-amber  { background: #f59e0b; }
.terminal-dot-green  { background: #3fb950; }

/* 터미널 출력 텍스트 */
.terminal-output {
  color: #e6edf3;
  font-size: 0.8125rem;
  line-height: 1.7;
  padding: 12px 16px;
}
.terminal-prompt    { color: #f59e0b; }     /* > 프롬프트 */
.terminal-success   { color: #3fb950; }     /* [OK], 성공 */
.terminal-error     { color: #f85149; }     /* [ERROR] */
.terminal-info      { color: #58a6ff; }     /* [INFO] */
.terminal-muted     { color: #6e7681; }     /* 타임스탬프, 경로 */

/* 커서 */
@keyframes terminal-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.terminal-cursor::after {
  content: "▋";
  color: #f59e0b;
  animation: terminal-blink 1s step-end infinite;
}

/* 인풋 */
.terminal-input-line {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #30363d;
  padding: 10px 16px;
}
.terminal-input-prefix {
  color: #f59e0b;
  font-size: 0.875rem;
  flex-shrink: 0;
}
.terminal-input {
  background: transparent;
  border: none;
  color: #e6edf3;
  font-family: var(--th-font-mono);
  font-size: 0.8125rem;
  flex: 1;
  outline: none;
}
```

---

## 7. 부팅 시퀀스 (AppLoadingScreen)

FM2024의 초기 로딩 화면 → 터미널 부팅 시퀀스 유지.
배경은 FM 다크 (#0f1117) 기반.

```
AgentDesk
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Initializing agent runtime...    [OK]
> Loading departments...           [OK]
> Connecting to CLI...             [OK]
> Starting office view...          [OK]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready.

배경: #0f1117
폰트: JetBrains Mono
색상: 텍스트 #e6edf3 / [OK] #3fb950 / > #f59e0b / Ready. #f59e0b
Framer Motion staggerChildren: 0.12s
```

---

## 8. 레이아웃 — 뷰별 적용

### 대시보드 — "감독 오버뷰"

```
FM2024 감독 홈화면처럼 클럽 현황 한눈에.

┌─ 회사명 + CEO ─────────────────────────────────────────┐
│  Acme Corp  /  CEO: 나                               │
│  Agents: 8 active  ·  Tasks: 23  ·  Tokens: 42.3k   │
└────────────────────────────────────────────────────────┘

┌─ AGENT ROSTER ──────┐  ┌─ ACTIVE TASKS ──────────────┐
│ (FM 선수단 목록처럼) │  │ (FM 경기 일정처럼)           │
│ 이름 / 상태 / 스탯  │  │ #id / 제목 / 담당 / 상태    │
└─────────────────────┘  └─────────────────────────────┘

┌─ RECENT ACTIVITY ──────────────────────────────────────┐
│ (FM 인박스/피드처럼)                                   │
│ ● Claude-Dev completed feat: login   2m ago           │
│ ● Gemini-QA found 3 bugs in PR#42    5m ago           │
└────────────────────────────────────────────────────────┘
```

### 에이전트 관리 — "선수단 관리"

```
FM의 Squad 화면처럼.
좌: 에이전트 목록 (테이블)
우: 선택한 에이전트 상세 (FM 선수 프로필)

상세 탭:
  [Overview]  [Attributes]  [Tasks]  [Skills]  [History]
```

### 태스크 보드 — "경기 일정"

```
FM의 Fixtures 화면처럼.
필터: 상태 / 부서 / 우선순위 / 에이전트

리스트 뷰 (기본):
  # / 제목 / 담당 에이전트 / 부서 / 상태 / 우선순위

선택 시 우측에 태스크 상세 패널 (FM 경기 상세처럼)
실행/로그 보기 → 터미널 뷰어 오픈
```

### 라이브러리 — "훈련 & 전술"

```
FM의 Training / Tactics 화면처럼.
Rules / Memory / Hooks / Skills 탭으로 분리.
각 탭은 데이터 그리드 + 우측 상세 패널.
```

### 오피스 뷰 — "HQ 클럽 하우스 + 매치 뷰"

FM의 Match View / Club Facilities 화면 구조를 오피스 뷰에 적용.
픽셀아트 캔버스는 FM의 pitch처럼 중앙에 위치.
좌우 정보 패널이 에이전트·부서 데이터를 FM 스타일로 표시.

```
┌─ TOOLBAR ─────────────────────────────────────────────────────────────┐
│  ▶ Office View  ·  AgentDesk HQ   [Season ▾]  [Style ▾]  [Zoom: 1x]  │  44px
├──────────────────┬──────────────────────────────┬─────────────────────┤
│                  │                              │                     │
│  DEPARTMENTS     │   BUILDING CANVAS (PixiJS)   │  AGENT / DEPT INFO  │
│  180px · fixed   │   flex-1 · min 380px         │  240px · fixed      │
│                  │                              │                     │
│  [▶] Marketing   │  [pixel art cross-section    │  (에이전트 선택 시) │
│      3 agents    │   tower building]            │                     │
│      2 running   │                              │  Claude-Dev         │
│                  │                              │  Senior Developer   │
│  [▶] Engineering │                              │                     │
│      4 agents    │                              │  ATTRIBUTES         │
│      4 running   │                              │  Speed  ████  82    │
│                  │                              │  Focus  ████  91    │
│  [▶] Design      │                              │  Rely   ████  68    │
│      2 agents    │                              │                     │
│      1 running   │                              │  Tasks: 3 active    │
│                  │                              │  [▶ ASSIGN TASK]    │
│  ─────────────   │                              │                     │
│  CLI USAGE       │                              │  (부서 선택 시)     │
│  ████ 42.3k tok  │                              │  Engineering        │
│  [REFRESH]       │                              │  Agents: 4          │
│                  │                              │  Running: 4         │
│                  │                              │  Tasks done: 142    │
├──────────────────┴──────────────────────────────┴─────────────────────┤
│  [▶ Run]  [Stats]  [3 alerts]  Scroll: ↑↓   Token: 42.3k / 1M        │  32px action bar
└───────────────────────────────────────────────────────────────────────┘
```

레이아웃 스펙:
- 전체 배경: var(--th-bg-primary) #0f1117
- 툴바: height 44px, border-bottom 1px solid var(--th-border)
- 좌 패널: 180px, bg var(--th-bg-panel), border-right 1px solid var(--th-border)
- 중앙: flex-1, bg #010409 (캔버스 영역 — 터미널 블랙으로 건물 돋보이게)
- 우 패널: 240px, bg var(--th-bg-panel), border-left 1px solid var(--th-border)
- 액션바: height 32px, bg var(--th-bg-secondary), border-top 1px solid var(--th-border)

부서 리스트 아이템 (좌 패널):
```
[▶] Marketing                           ← 부서명, Sora 500 0.8rem
    3 agents · 2 running                ← 보조, JetBrains Mono 0.7rem, #8b949e
    ████░ (amber 진행바, 부서 활동도)   ← 3px height
```
활성 부서: border-left 3px solid #f59e0b, bg var(--th-bg-surface)

에이전트 스탯 (우 패널):
```
에이전트명: Sora 600 0.9rem, #f0f6fc
역할명: 0.75rem, #8b949e
속성 바: FM 선수카드 동일 스타일 (AttributeBar 컴포넌트)
```

액션바 버튼:
- Ghost 버튼 스타일 (5-7 참조)
- JetBrains Mono 0.7rem, uppercase
- 구분자: 1px solid #30363d vertical

---

## 9. FM2024 vs AgentDesk 매핑 레퍼런스

| FM2024 | AgentDesk | UI 패턴 |
|---|---|---|
| 선수단 (Squad) | 에이전트 목록 | 테이블 리스트 |
| 선수 프로필 | 에이전트 프로필 | 카드 + 속성 바 |
| 경기 일정 | 태스크 보드 | 리스트 + 상태 |
| 능력치 (1-20) | 스킬/XP | 0-100 진행 바 |
| 감독 = 나 | CEO = 나 | 동일 |
| 스타 선수 | 페르소나 에이전트 | [JOBS] 배지 |
| 훈련 | Rules/Memory 라이브러리 | 데이터 그리드 |
| 경기 결과 | 태스크 완료 리포트 | 결과 패널 |
| 전술 | 워크플로우 팩 | 프리셋 선택 |
| 이적 | 에이전트 추가 | 생성 모달 |
| 인박스 | 알림 센터 | 피드 |
| Match Engine | 태스크 실행 뷰어 | **터미널 스타일** |

---

## 10. 구현 계획 (업데이트)

### Phase 0 — 완료
- [x] Framer Motion 설치 (`framer-motion 12.35.0`)

### Phase 1 — CSS 변수 전면 교체 (진행 중)
- [x] `index.part01.css` — 기본 변수 (터미널 블랙으로 임시 변경됨)
- [ ] `index.part01.css` — **FM2024 팔레트로 재정의** (본 문서 기준)
- [ ] body 배경, app-shell 단색 적용
- [ ] 라이트 테마 GitHub Light 스타일로 조정

### Phase 2 — 글로벌 컴포넌트 (2주)
- [ ] 패널 컴포넌트 스타일 (border-radius 6px, FM 패턴)
- [ ] 상태 배지 `[STATUS]` 전면 적용
- [ ] 버튼 시스템 재정의
- [ ] 데이터 테이블 행 스타일
- [ ] 속성 바 컴포넌트 (`AttributeBar.tsx` 신규)
- [ ] 사이드바 FM 스타일 업데이트

### Phase 3 — 주요 뷰 (2주)
- [ ] AppLoadingScreen — 부팅 시퀀스 (완료)
- [ ] AppHeaderBar — 48px FM 스타일
- [ ] Dashboard — 감독 오버뷰 레이아웃
- [ ] AgentCard — FM 선수카드 스타일
- [ ] TaskBoard — 경기 일정 리스트 뷰
- [ ] ChatPanel — 터미널 영역 스타일

### Phase 4 — 페르소나 시스템 (1-2주)
- [ ] `agent-persona-system.md` 기준 구현
- [ ] PersonaBadge, PersonaCatalog, PersonaCard

### Phase 5 — 디테일 마감 (1주)
- [ ] 빈 상태 FM 스타일
- [ ] 애니메이션 Framer Motion 적용
- [ ] 모바일 반응형 최소화

---

## 11. 컴포넌트 변환 규칙 (FM2024 Inline Style 패턴)

> Phase 13에서 확립된 공식 변환 규칙. Tailwind rounded-* / bg-slate-* / text-slate-* / border-slate-* 클래스를 모두 inline style + CSS 변수로 교체한다.

### 11-1. border-radius 규칙

| 요소 유형 | 값 | 비고 |
|---|---|---|
| 버튼, 입력창, 배지, 작은 카드 | `borderRadius: "2px"` | 기본 |
| 모달/다이얼로그 패널 | `borderRadius: "4px"` | 바깥 컨테이너 |
| 원형 아바타, 불릿 닷 | `borderRadius: "50%"` | 원형만 |
| 진행바(fill) | `borderRadius: "2px"` | 동일 |

**절대 사용 금지**: Tailwind `rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`

### 11-2. 색상 패턴 (inline style)

| 상태 | border | background | color |
|---|---|---|---|
| **Amber (활성/주요)** | `1px solid rgba(251,191,36,0.5)` | `rgba(251,191,36,0.15)` | `var(--th-accent)` |
| **Amber (연한/힌트)** | `1px solid rgba(251,191,36,0.3)` | `rgba(251,191,36,0.05)` | `var(--th-text-secondary)` |
| **Emerald (성공/신규)** | `1px solid rgba(52,211,153,0.5)` | `rgba(52,211,153,0.15)` | `rgb(167,243,208)` |
| **Rose (에러/위험)** | `1px solid rgba(244,63,94,0.35)` | `rgba(244,63,94,0.08)` | `rgb(253,164,175)` |
| **Purple (정보/특수)** | `1px solid rgba(167,139,250,0.4)` | `rgba(167,139,250,0.1)` | `rgb(196,181,253)` |
| **기본 카드** | `1px solid var(--th-border)` | `var(--th-bg-elevated)` | `var(--th-text-primary)` |
| **서피스 패널** | `1px solid var(--th-border)` | `var(--th-bg-surface)` | — |

### 11-3. --th-* 변수 사용 가이드

```tsx
// 버튼 기본
style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}

// 입력창
style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}

// 모달 패널
style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}

// 카드 (일반)
style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}

// 터미널 코드
style={{ borderRadius: "2px", background: "var(--th-terminal-bg)", color: "var(--th-accent)" }}
```

### 11-4. font-mono 규칙

모든 레이블, 본문 텍스트, 버튼 텍스트에 `font-mono` 클래스 추가. UI 전체가 모노스페이스 터미널 감성을 유지해야 한다.

```tsx
// 섹션 헤딩
<p className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>

// 일반 라벨
<span className="text-xs font-mono" style={{ color: "var(--th-text-secondary)" }}>

// 버튼 텍스트
<button className="px-3 py-2 text-xs font-mono transition" ...>
```

### 11-5. 변환 완료 파일 현황 (Phase 13)

| 파일 | 변환 건수 |
|---|---|
| `AppHeaderBar.tsx` | 22 |
| `AppLoadingScreen.tsx` | 8 |
| `AppMainLayout.tsx` | 5 |
| `Sidebar.tsx` | 35 |
| `AgentCard.tsx` (agent-manager) | 18 |
| `AgentFormModal.tsx` | 42 |
| `AgentsTab.tsx` | 12 |
| `AgentDetail.tsx` | 28 |
| `AgentAvatar.tsx` | 6 |
| `Dashboard.tsx` | 30 |
| `TaskBoard.tsx` | 45 |
| `TaskCard.tsx` | 18 |
| `FilterBar.tsx` | 15 |
| `CreateTaskModal.tsx` / `CreateTaskModalView.tsx` | 25 |
| `OfficeView.tsx` | 20 |
| `DecisionInboxModal.tsx` | 22 |
| `ProjectManagerModal.tsx` | 18 |
| `ProjectEditorPanel.tsx` | 14 |
| `CollapsibleSection.tsx` / `HeroSections.tsx` / `OpsSections.tsx` | 20 |
| `OfficeRoomManager.tsx` | 120+ |
| `GitHubImportWizard.tsx` | 50 |
| `GitHubDeviceConnect.tsx` | 12 |
| `ProjectFlowDialog.tsx` | 28 |

### 11-6. 변환 대기 파일 (우선순위 순)

**HIGH — Settings 그룹**
- `OAuthConnectCards.tsx` (13), `ChannelGuideModal.tsx` (16), `GitHubOAuthAppConfig.tsx` (8), `ChatEditorModal.tsx` (6), `OAuthSettingsTab.tsx` (3), `ApiAssignModal.tsx` (4)

**MED — Library/Modal 그룹**
- `AgentRulesHeader.tsx`, `MemoryHeader.tsx`, `HooksHeader.tsx`, `SkillsHeader.tsx`
- agent-rules, memory, hooks, skills 하위 30+ 파일

**LOW — Game Room**
- `TicTacToe`, `GameResult`, `Tetris`, `RockPaperScissors`, `MemoryMatch`

---

## 12. 이전 문서와의 관계

| 문서 | 상태 | 비고 |
|---|---|---|
| `design-retro-terminal-overhaul.md` | **부분 유효** | 터미널 영역 스타일은 그대로 유효. 전체 레이아웃은 본 문서로 대체 |
| `agent-persona-system.md` | **유효** | UI 패턴만 FM2024 스타일로 적용 |
| `ui-differentiation-strategy.md` | **유효** | 전략 방향 변경 없음 |

> **본 문서가 최우선 디자인 레퍼런스**

---

## 참고

- FM2024 공식 UI 매뉴얼: Sports Interactive Community
- FM2024 FLUT Dark Skin: sortitoutsi.net (커뮤니티 검증 색상 참고)
- FM26 UI 리디자인 원칙: footballmanager.com/fm26 (Tile & Card 시스템)
- GitHub Dark 팔레트: `#0f1117`, `#161b22`, `#1c2128` (FM 색상과 매우 유사)
