# Local LLM Manager — 기획 문서

> 작성일: 2026-03-16
> 상태: 📋 기획 완료 (미구현)

---

## 1. 한 줄 정의

AgentDesk OS 안에서 **로컬 LLM 백엔드(Ollama 등)를 설치·실행·관리하고,
AgentDesk 에이전트가 로컬 모델을 provider로 즉시 사용**할 수 있는 통합 관리 시스템.

---

## 2. 핵심 원칙

| 원칙 | 내용 |
|------|------|
| **원클릭 시작** | 백엔드 설치부터 모델 실행까지 UI에서 전부 처리 |
| **에이전트 자동 연동** | 로컬 모델이 실행되면 에이전트 Provider 목록에 자동 노출 |
| **비용 제로** | 로컬 추론 = 토큰 과금 없음. 비용 뷰에 "무료 (로컬)" 표시 |
| **투명한 진행** | 설치·다운로드·추론 스트림을 터미널과 동일한 UI로 실시간 표시 |
| **기존 인프라 재사용** | api-provider-tools.ts의 OpenAI 호환 경로로 추론, lifecycle.ts 패턴으로 서비스 관리 |

---

## 3. 지원 백엔드

| 백엔드 | 우선순위 | 특징 | OpenAI 호환 API |
|--------|---------|------|----------------|
| **Ollama** | Phase 1 (필수) | 가장 쉬운 설치, 모델 허브, `/v1` 호환 | `http://localhost:11434/v1` |
| **LM Studio** | Phase 2 | GUI 앱, 초보자 친화적 | `http://localhost:1234/v1` |
| **llama.cpp server** | Phase 3 | 최소 의존성, 고급 사용자 | `http://localhost:8080/v1` |
| **Jan** | Phase 3 | 오픈소스 GUI, 크로스플랫폼 | `http://localhost:1337/v1` |

---

## 4. UI/UX 상세 명세

### 4-1. 진입점

| 진입 방법 | 경로 |
|----------|------|
| Dock → Settings → "Local LLM" 탭 | 메인 관리 화면 |
| 에이전트 생성/편집 → Provider 드롭다운 → "로컬 모델 관리..." | Local LLM 탭으로 점프 |
| AgentDesk 앱 메뉴 → "Local LLM Manager" | 바로가기 |
| `g m` 키보드 단축키 | (선택적 추가) |

---

### 4-2. Settings → Local LLM 탭 전체 구조

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙ Settings                                     [×]          │
│  ─────────────────────────────────────────────────────────   │
│  General  CLI  API  Channel  Local LLM  Data  Security       │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  [백엔드]  [모델]  [실행 모니터]  [설정]                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 4-3. [백엔드] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│  백엔드 관리                                                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🦙 Ollama                          🟢 실행 중        │   │
│  │  v0.3.12  ·  http://localhost:11434                  │   │
│  │  [재시작]  [중지]  [업데이트 확인]  [로그]             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🖥 LM Studio                       ⚫ 미설치          │   │
│  │  공식 사이트에서 설치 후 서비스를 시작해주세요.           │   │
│  │  [설치 안내 열기]  [수동 감지]                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ⚡ llama.cpp                        ⚫ 미설치          │   │
│  │  [설치]  (고급 사용자)                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**백엔드 카드 상태별 표시:**

| 상태 | 색상 | 표시 |
|------|------|------|
| 실행 중 | 🟢 green | "실행 중" + 포트 + 모델 수 |
| 설치됨·중지 | 🟡 amber | "중지됨" + [시작] 버튼 |
| 미설치 | ⚫ gray | "미설치" + [설치] 버튼 |
| 설치 중 | 🔵 blue | 진행 바 + 로그 스트림 |
| 오류 | 🔴 red | 에러 메시지 + [재시도] |

**Ollama 설치 플로우 (미설치 → 설치됨):**

```
[설치 버튼 클릭]
  ↓
OS 감지 (Windows / macOS / Linux)
  ↓
┌─────────────────────────────────────┐
│  🦙 Ollama 설치 중...               │
│  ████████░░░░░░░░░░  40%            │
│                                     │
│  > Downloading ollama-windows...    │
│  > Extracting files...              │
│  > Registering service...           │
└─────────────────────────────────────┘
  ↓
설치 완료 → 서비스 자동 시작 → 상태 카드 업데이트
```

---

### 4-4. [모델] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│  모델 관리                                                     │
│                                                              │
│  [🌐 모델 갤러리]  [📦 내 모델]  🔍 검색...                    │
│                                                              │
│  ── 🌐 모델 갤러리 ──────────────────────────────────────    │
│                                                              │
│  필터: [전체 ▾]  [크기: 전체 ▾]  [용도: 전체 ▾]               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ llama3.2     │  │ mistral      │  │ qwen2.5      │      │
│  │ Meta · 3b    │  │ Mistral · 7b │  │ Alibaba · 7b │      │
│  │ 💾 2.0 GB   │  │ 💾 4.1 GB   │  │ 💾 4.7 GB   │      │
│  │ ⚡ 범용      │  │ ⚡ 범용      │  │ ⚡ 다국어    │      │
│  │ [다운로드]   │  │ [다운로드]   │  │ [다운로드]   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ phi4         │  │ deepseek-r1  │  │ gemma3       │      │
│  │ MS · 14b     │  │ DS · 8b      │  │ Google · 4b  │      │
│  │ 💾 8.4 GB   │  │ 💾 5.2 GB   │  │ 💾 2.5 GB   │      │
│  │ ⚡ 코딩      │  │ ⚡ 추론      │  │ ⚡ 가볍고빠름 │      │
│  │ [다운로드]   │  │ [다운로드]   │  │ [다운로드]   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

**모델 카드 상태별 표시:**

| 상태 | 표시 |
|------|------|
| 미다운로드 | [다운로드] 버튼 |
| 다운로드 중 | `████░░ 67% · 2.8/4.1GB · 12MB/s` + [취소] |
| 다운로드 완료 | [▶ 실행] [삭제] |
| 실행 중 | 🟢 실행 중 · `42 t/s` [중지] |

**[📦 내 모델] 탭:**

```
┌──────────────────────────────────────────────────────────────┐
│  내 모델  (디스크: 18.3 GB 사용)                               │
│                                                              │
│  모델명             크기    상태         액션                  │
│  ─────────────────────────────────────────────────────────   │
│  llama3.2:3b       2.0GB  🟢 실행 중    [중지] [삭제]        │
│  mistral:7b        4.1GB  ⏸ 대기        [▶실행] [삭제]      │
│  phi4:14b          8.4GB  ⏸ 대기        [▶실행] [삭제]      │
│  qwen2.5:14b       8.7GB  ⬇ 67% 중     [취소]              │
│                                                              │
│  총 4개 모델 · 23.2GB                                        │
└──────────────────────────────────────────────────────────────┘
```

---

### 4-5. [실행 모니터] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│  실행 모니터                                                   │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  GPU                 │  │  현재 실행 중인 모델           │ │
│  │  RTX 4070 12GB       │  │                              │ │
│  │  VRAM ████░░ 4.2/12  │  │  llama3.2:3b                │ │
│  │  사용률: 68%          │  │  백엔드: Ollama               │ │
│  │                      │  │  포트: 11434                 │ │
│  │  RAM  ████░░ 18/32   │  │  컨텍스트: 4096 tokens       │ │
│  │  사용률: 56%          │  │  스레드: 8                   │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
│                                                              │
│  ── 실시간 성능 ──────────────────────────────────────────   │
│  토큰/초   ▁▂▄▆▇▅▄▆▇█  평균 42 t/s                         │
│  응답지연  ▁▁▂▁▂▁▂▁▁▁  평균 180ms (첫 토큰)                 │
│  요청/분   ▁▁▁▂▁▁▁▁▁▂  현재 3 req/min                      │
│                                                              │
│  ── 최근 추론 로그 ─────────────────────────────────────    │
│  14:32:01  에이전트 "Dev-1"  → llama3.2:3b  · 142 tokens   │
│  14:31:45  에이전트 "Dev-1"  → llama3.2:3b  · 89 tokens    │
│  14:30:12  에이전트 "QA-Bot" → phi4:14b     · 310 tokens   │
└──────────────────────────────────────────────────────────────┘
```

---

### 4-6. [설정] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│  고급 설정                                                     │
│                                                              │
│  Ollama                                                      │
│  호스트          [localhost          ]                        │
│  포트            [11434              ]                        │
│  OLLAMA_ORIGINS  [*                  ]  (CORS)               │
│  자동 시작       [ON]  (AgentDesk 시작 시 Ollama 자동 실행)   │
│  동시 모델 수    [1 ▾]  (VRAM 여유 시 복수 모델 유지)          │
│                                                              │
│  모델 저장 경로                                               │
│  [C:\Users\edger\.ollama\models    ] [찾아보기]              │
│                                                              │
│  GPU 설정                                                    │
│  GPU 레이어      [자동 감지 ▾]                                │
│  VRAM 여유 확보  [1.5 GB ▾]  (OOM 방지용 버퍼)               │
│                                                              │
│  프록시                                                      │
│  모델 다운로드 프록시  [                    ]                 │
└──────────────────────────────────────────────────────────────┘
```

---

### 4-7. 에이전트 Provider 연동 화면

에이전트 생성/편집 모달에서:

```
CLI Provider 선택

  ── 클라우드 ──────────────────────
  ☁ claude (Anthropic CLI)
  ☁ openai (OpenAI API)
  ☁ gemini (Google API)

  ── 로컬 모델 (Ollama) ────────────
  🤖 llama3.2:3b    · 2.0GB · 42 t/s  🟢
  🤖 mistral:7b     · 4.1GB · 대기     ⏸
  🤖 phi4:14b       · 8.4GB · 대기     ⏸
  + 모델 추가...

  ── 로컬 (LM Studio) ──────────────
  🖥 LM Studio 연결 안됨  [설정]
```

- 실행 중인 모델: 토큰/초 표시
- 대기 중인 모델: 클릭 시 "실행 후 할당할까요?" 확인 다이얼로그
- 비용 표시: 에이전트 비용 뷰에 `$0.00 (로컬)` 배지

---

### 4-8. 대시보드 위젯 — Local LLM

기존 위젯 시스템에 추가되는 새 위젯:

```
┌──────────────────────────┐
│ 🤖 Local LLM       ─ □ × │
│                          │
│ 🦙 Ollama   🟢 실행 중   │
│ ─────────────────────    │
│ llama3.2:3b              │
│ 42 t/s · VRAM 2.0GB      │
│                          │
│ phi4:14b    ⏸ 대기       │
│ ─────────────────────    │
│ 💾 디스크  18.3 GB        │
│ 🖥 VRAM    4.2 / 12 GB   │
└──────────────────────────┘
```

---

## 5. 디자인 시스템 명세

> AgentDesk의 **dual-layer 원칙**, **JetBrains Mono 전용 폰트**, **Amber 브랜드 컬러**,
> **터미널 언어**를 Local LLM Manager 전체에 일관되게 적용한다.
> 참조: `docs/design/DESIGN.md`, `docs/design/UI-SCREENS.md`

---

### 5-1. 디자인 철학 — 이 기능에서 특히 중요한 점

Local LLM Manager는 **"OS 안의 OS"** 느낌을 주어야 한다.
Ollama 서비스 로그, 모델 다운로드 진행, 추론 스트림 — 전부 이미 익숙한 **터미널 언어**로 표현한다.
모델 갤러리는 "App Store"처럼 보이되, 폰트와 색상은 AgentDesk 시스템에서 벗어나지 않는다.

| 원칙 | 적용 |
|------|------|
| **모든 텍스트 = JetBrains Mono** | `font-family: var(--th-font-mono)` 예외 없음 |
| **Amber = 살아있음** | 실행 중 모델, 다운로드 진행, 활성 상태 모두 `--th-accent` |
| **터미널 = 로그·진행** | 설치 로그, 다운로드 스트림 → `--th-terminal-*` 변수 |
| **dual-layer radius** | 카드/패널 `borderRadius: 10` / 버튼·배지·입력 `borderRadius: 0` |
| **Glassmorphism = 위젯** | LocalLlmWidget: `backdropFilter: blur(10px)` |

---

### 5-2. 색상 — CSS 변수 매핑

모든 색상은 인라인 hex 금지. 아래 변수만 사용.

#### 배경

| 용도 | 변수 |
|------|------|
| 탭 콘텐츠 영역 전체 | `var(--th-bg-primary)` |
| 백엔드 카드 / 모델 카드 배경 | `var(--th-card-bg)` = `#181818` |
| 카드 hover | `var(--th-card-bg-hover)` = `#1f1f1f` |
| 패널 섹션 | `var(--th-panel-bg)` = `#111111` |
| 터미널 로그 영역 | `var(--th-terminal-bg)` = `#010409` |
| 모달 오버레이 | `var(--th-modal-overlay)` = `rgba(0,0,0,0.85)` |

#### 텍스트

| 용도 | 변수 |
|------|------|
| 모델명 / 주요 레이블 | `var(--th-text-primary)` |
| 벤더명 / 부가 정보 | `var(--th-text-secondary)` |
| 섹션 헤더 (`// label` 패턴) | `var(--th-text-muted)` |
| Amber 강조 (토큰/초, 버전, 포트) | `var(--th-text-accent)` = `var(--th-accent)` |
| 터미널 로그 텍스트 | `var(--th-terminal-text)` |
| 터미널 성공 라인 | `var(--th-terminal-success)` = `#3fb950` |
| 터미널 에러 라인 | `var(--th-terminal-error)` = `#f85149` |
| 터미널 정보 라인 | `var(--th-terminal-info)` = `#58a6ff` |
| 코드·명령어 (모델명 mono) | `var(--th-text-code)` = `#22c55e` |

#### 보더

| 용도 | 변수 |
|------|------|
| 카드 기본 보더 | `var(--th-border)` = `#2a2a2a` |
| 카드 hover / 강조 보더 | `var(--th-border-strong)` = `#3a3a3a` |
| 실행 중 카드 보더 (amber glow) | `var(--th-accent-border)` = `rgba(245,158,11,0.28)` |
| 에러 상태 카드 보더 | `var(--th-danger-border)` = `#f85149` |

#### 인라인 hex 허용 예외 (상태 색상)

```
실행 중 dot   #3fb950  (= var(--th-terminal-success))
중지됨 dot    #888888
오류 dot      #f85149  (= var(--th-terminal-error))
다운로드 dot  #58a6ff  (= var(--th-terminal-info))
```

---

### 5-3. 타이포그래피

```
// 섹션 레이블 (OLLAMA, MY MODELS 등)
font-family: var(--th-font-mono)
font-size: 10px
font-weight: 700
text-transform: uppercase
letter-spacing: 0.06em
color: var(--th-text-muted)

// 모델명 / 백엔드명 (주요 타이틀)
font-family: var(--th-font-mono)
font-size: 12px
font-weight: 600
color: var(--th-text-primary)

// 부가 정보 (크기, 속도, 포트)
font-family: var(--th-font-mono)
font-size: 11px
color: var(--th-text-secondary)

// Amber 강조값 (42 t/s, v0.3.12, :11434)
font-family: var(--th-font-mono)
font-size: 11px
color: var(--th-text-accent)

// 터미널 로그 라인
font-family: var(--th-font-mono)
font-size: 11px
line-height: 1.6
```

---

### 5-4. 컴포넌트별 디자인 명세

#### BackendCard (백엔드 카드)

```
┌────────────────────────────────────────────────────┐  ← borderRadius: 10
│                                                    │     border: 1px solid var(--th-border)
│  // OLLAMA                    ● 실행 중            │     background: var(--th-card-bg)
│                                                    │
│  v0.3.12 · localhost:11434 · 모델 3개              │  ← font: 11px, --th-text-secondary
│                                                    │     "실행 중" dot: #3fb950
│  [재시작]  [중지]  [업데이트]  [로그 보기]           │  ← Button secondary, borderRadius: 0
│                                                    │
│  ─────── 최근 로그 ──────────────────────────────  │  ← 펼쳐지는 영역 (toggle)
│  > Ollama server started on :11434                 │     background: var(--th-terminal-bg)
│  > Model "llama3.2:3b" loaded (2.0 GB VRAM)       │     color: var(--th-terminal-text)
└────────────────────────────────────────────────────┘
```

**상태별 카드 보더:**

| 상태 | border | 배경 tint |
|------|--------|-----------|
| 실행 중 | `var(--th-accent-border)` | `var(--th-accent-glow)` |
| 중지됨 | `var(--th-border)` | 없음 |
| 오류 | `var(--th-danger-border)` | `var(--th-danger-bg)` |
| 설치 중 | `rgba(88,166,255,0.28)` | `rgba(88,166,255,0.05)` |
| 미설치 | `var(--th-border)` | 없음, opacity: 0.5 |

#### ModelCard (모델 갤러리 카드)

```
┌──────────────────────┐  ← borderRadius: 10
│  // LLAMA 3.2        │     border: 1px solid var(--th-border)
│                      │     background: var(--th-card-bg)
│  3B · Meta           │  ← 12px, --th-text-primary / 11px muted
│                      │     width: 160px (3열 그리드)
│  💾 2.0 GB           │  ← --th-text-secondary
│  ⚡ 범용 · 빠름       │  ← 태그: badge style (아래 참조)
│                      │
│  [다운로드]           │  ← Button primary, borderRadius: 0, 전체 폭
└──────────────────────┘
```

**모델 태그 배지:**
```
background: var(--th-accent-glow)
border: 1px solid var(--th-accent-border)
color: var(--th-text-accent)
borderRadius: 0
font-size: 10px
font-weight: 700
text-transform: uppercase
padding: 1px 5px
```

**다운로드 중 카드:**
```
┌──────────────────────┐
│  // MISTRAL 7B       │  ← borderColor: rgba(88,166,255,0.28)
│                      │
│  ⬇ 67% · 2.8/4.1GB  │  ← color: var(--th-terminal-info)
│  ████████░░  12 MB/s │  ← 진행 바 (아래 참조)
│                      │
│  [취소]               │  ← Button danger
└──────────────────────┘
```

#### DownloadProgressBar (다운로드 진행 바)

```tsx
// 진행 바 CSS
background: var(--th-bg-surface)       // track
height: 3px
borderRadius: 0                         // 모든 inner element는 0

// fill
background: var(--th-terminal-info)    // 다운로드 = blue
// 또는
background: var(--th-accent)           // 설치 = amber
width: `${percent}%`
transition: width 0.3s linear
```

#### GpuGauge (GPU/VRAM 게이지)

```
// VRAM
████████░░░░░  4.2 / 12 GB  (35%)

// 라벨 패턴
font-family: var(--th-font-mono)
font-size: 10px, uppercase, --th-text-muted   ← "// VRAM"

// 게이지 바
track:  var(--th-bg-surface), height: 6px, borderRadius: 0
fill:   var(--th-accent)            (0~70%)
        #f87171                     (70~90%, 경고)
        var(--th-terminal-error)    (90~100%, 위험)

// 수치
font-family: var(--th-font-mono)
font-size: 11px
color: var(--th-text-accent)        (현재값)
color: var(--th-text-muted)         (슬래시 + 최대값)
```

#### InferenceSparkline (토큰/초 스파크라인)

AgentPerformanceDashboard의 `Sparkline` 컴포넌트와 동일한 패턴 재사용:

```tsx
// SVG 스파크라인
viewBox: "0 0 120 32"
polyline stroke: var(--th-accent)
polyline strokeWidth: 1.5
fill: none
circle r: 2.5, fill: var(--th-accent)  // 최신 데이터 포인트만

// 배경
background: var(--th-terminal-bg)
padding: 8px
borderRadius: 0
```

#### InferenceLogTable (추론 로그)

기존 `// label` + list-row 패턴 그대로:

```tsx
// 헤더 라벨
// RECENT INFERENCE
font-size: 10px, uppercase, --th-text-muted

// 로그 행
border-bottom: 1px solid var(--th-border)
hover: background var(--th-hover-bg)
font-family: var(--th-font-mono)

// 컬럼별 색상
timestamp:      --th-text-muted    (11px)
agent name:     --th-text-primary  (11px)
model name:     --th-text-code     (11px, green)  ← 모델명은 code 색상
token count:    --th-text-accent   (11px, amber)
```

#### LocalLlmWidget (데스크톱 위젯)

기존 Widget 컨테이너(`Widget.tsx`) 그대로 사용:

```
// 위젯 chrome (Widget.tsx 공통)
borderRadius: 10
backdropFilter: blur(10px)
border: 1px solid var(--th-border)
background: var(--th-card-bg)

// 위젯 내부
┌─ 🤖 Local LLM ─────── [─][×] ┐
│                               │
│  // OLLAMA          🟢 ON     │  ← 10px label / dot #3fb950
│                               │
│  llama3.2:3b                  │  ← 12px, --th-text-primary
│  42 t/s · 2.0 GB VRAM        │  ← 11px, amber / muted
│  ─────────────────────────    │  ← var(--th-border)
│  // DISK   18.3 GB            │
│  // VRAM   ████░░ 4.2/12      │  ← 인라인 미니 게이지
└───────────────────────────────┘
```

---

### 5-5. 폼 필드 패턴 — [설정] 서브탭

기존 `FormField` + `Input` 컴포넌트 사용:

```tsx
// 레이블: "// host" 패턴
<label style={{
  fontFamily: "var(--th-font-mono)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--th-text-muted)"
}}>
  // HOST
</label>

// 입력
<Input />  // borderRadius: 0, border: var(--th-input-border), bg: var(--th-input-bg)
```

---

### 5-6. 상태 배지 패턴

모든 상태 배지: `borderRadius: 0`, `font-mono`, `10px`, `uppercase`

```
실행 중  →  background: var(--th-green-glow)
            border: 1px solid #3fb950
            color: #3fb950
            text: "RUNNING"

중지됨  →   background: var(--th-hover-bg)
            border: 1px solid var(--th-border)
            color: var(--th-text-muted)
            text: "STOPPED"

다운로드 중 → background: rgba(88,166,255,0.08)
              border: 1px solid rgba(88,166,255,0.35)
              color: var(--th-terminal-info)
              text: "PULLING"

오류     →  background: var(--th-danger-bg)
            border: 1px solid var(--th-danger-border)
            color: var(--th-danger-text)
            text: "ERROR"

무료(로컬) → background: var(--th-accent-glow)
              border: 1px solid var(--th-accent-border)
              color: var(--th-text-accent)
              text: "FREE · LOCAL"
```

---

### 5-7. 설치 진행 모달 — InstallProgressModal

기존 `Modal` 컴포넌트 사용 (macOS traffic lights 포함):

```
┌─ 🦙 Ollama 설치 중... ──── 🔴🟡🟢 ┐   ← Modal, borderRadius: 10
│                                    │      traffic lights: #ff5f57 / #ffbd2e / #27c93f
│  ████████████░░░░░░░░  62%         │   ← 진행 바, background: --th-accent
│                                    │
│  ┌──────────────────────────────┐  │   ← 로그 패널
│  │  > Downloading installer...  │  │      background: var(--th-terminal-bg)
│  │  > Verifying checksum... ✓   │  │      color: var(--th-terminal-text)
│  │  > Extracting files...       │  │      font: 11px mono
│  │  > Registering service... ✓  │  │      성공 라인: --th-terminal-success
│  └──────────────────────────────┘  │      진행 라인: --th-terminal-info
│                                    │
│                          [취소]     │   ← Button ghost
└────────────────────────────────────┘
```

---

### 5-8. Provider 드롭다운 — 에이전트 편집 모달 내

기존 `<select>` 또는 커스텀 드롭다운 스타일 일관성 유지:

```
// 구분선 헤더
─── // LOCAL (OLLAMA) ───────────────
font: 10px, uppercase, --th-text-muted, border-top: var(--th-border)

// 로컬 모델 행
🤖  llama3.2:3b         42 t/s  🟢
    ^                   ^       ^
    --th-text-primary   amber   #3fb950 dot
    12px                11px

// 비용 배지 (에이전트 비용 뷰)
$0.00  [FREE · LOCAL]
       background: --th-accent-glow
       border: --th-accent-border
       color: --th-text-accent
```

---

### 5-9. 반응형 / 레이아웃

Settings 창 내 탭이므로 기존 Settings 탭 레이아웃 그대로 따름:

```
// 서브탭 바
display: flex, gap: 0
borderBottom: 1px solid var(--th-border)

// 서브탭 버튼 (활성)
borderBottom: 2px solid var(--th-accent)
color: var(--th-text-primary)
background: transparent
borderRadius: 0
font: 11px, uppercase, mono

// 서브탭 버튼 (비활성)
color: var(--th-text-muted)
hover: color var(--th-text-secondary)

// 모델 갤러리 그리드
display: grid
grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))
gap: 12px
padding: 16px

// 백엔드 카드 리스트
display: flex, flex-direction: column, gap: 8px
padding: 16px
```

---

## 6. REST API 명세

### 백엔드 관리

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/local-llm/backends` | 지원 백엔드 목록 + 설치/실행 상태 |
| `POST` | `/api/local-llm/backends/:name/install` | 백엔드 설치 시작 (스트리밍) |
| `POST` | `/api/local-llm/backends/:name/start` | 서비스 시작 |
| `POST` | `/api/local-llm/backends/:name/stop` | 서비스 중지 |
| `POST` | `/api/local-llm/backends/:name/restart` | 서비스 재시작 |
| `GET` | `/api/local-llm/backends/:name/logs` | 서비스 로그 (SSE 스트리밍) |
| `GET` | `/api/local-llm/backends/:name/version` | 설치된 버전 + 최신 버전 체크 |

**`GET /api/local-llm/backends` 응답:**
```json
{
  "backends": [
    {
      "name": "ollama",
      "label": "Ollama",
      "installed": true,
      "version": "0.3.12",
      "latest_version": "0.3.14",
      "update_available": true,
      "running": true,
      "port": 11434,
      "base_url": "http://localhost:11434/v1",
      "model_count": 3
    },
    {
      "name": "lmstudio",
      "label": "LM Studio",
      "installed": false,
      "running": false,
      "port": 1234,
      "base_url": "http://localhost:1234/v1",
      "model_count": 0
    }
  ]
}
```

---

### 모델 관리

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/local-llm/models` | 설치된 모델 목록 (`?backend=ollama`) |
| `GET` | `/api/local-llm/models/gallery` | 추천 모델 갤러리 목록 |
| `POST` | `/api/local-llm/models/pull` | 모델 다운로드 시작 |
| `DELETE` | `/api/local-llm/models/:name` | 모델 삭제 |
| `POST` | `/api/local-llm/models/:name/start` | 특정 모델 로드(실행) |
| `POST` | `/api/local-llm/models/:name/stop` | 모델 언로드 |
| `GET` | `/api/local-llm/models/pull/status` | 다운로드 진행상황 (SSE) |

**`GET /api/local-llm/models` 응답:**
```json
{
  "models": [
    {
      "name": "llama3.2:3b",
      "display_name": "Llama 3.2",
      "backend": "ollama",
      "size_bytes": 2019393798,
      "size_label": "2.0 GB",
      "running": true,
      "tokens_per_second": 42.3,
      "vram_usage_bytes": 2147483648,
      "context_length": 4096,
      "modified_at": 1741234567890
    }
  ],
  "disk_used_bytes": 19654729932,
  "disk_used_label": "18.3 GB"
}
```

**`POST /api/local-llm/models/pull` 요청:**
```json
{
  "backend": "ollama",
  "model_name": "mistral:7b"
}
```

**`GET /api/local-llm/models/pull/status` SSE 스트림:**
```
data: {"model":"mistral:7b","status":"downloading","completed":2801795072,"total":4294967296,"percent":65.2,"speed_bytes":12582912}
data: {"model":"mistral:7b","status":"downloading","completed":3010560000,"total":4294967296,"percent":70.1,"speed_bytes":13107200}
data: {"model":"mistral:7b","status":"done","completed":4294967296,"total":4294967296,"percent":100}
```

---

### 메트릭

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/local-llm/metrics` | GPU/RAM/토큰속도 실시간 메트릭 |
| `GET` | `/api/local-llm/metrics/history` | 최근 추론 이력 (`?limit=50`) |

**`GET /api/local-llm/metrics` 응답:**
```json
{
  "gpu": {
    "name": "NVIDIA GeForce RTX 4070",
    "vram_total_bytes": 12884901888,
    "vram_used_bytes": 4509715456,
    "vram_free_bytes": 8375185432,
    "utilization_percent": 68
  },
  "ram": {
    "total_bytes": 34359738368,
    "used_bytes": 19662118912,
    "utilization_percent": 57
  },
  "inference": {
    "active_model": "llama3.2:3b",
    "tokens_per_second": 42.3,
    "first_token_latency_ms": 180,
    "requests_per_minute": 3
  }
}
```

---

### 에이전트 Provider 연동

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/local-llm/providers` | 에이전트 할당 가능한 로컬 모델 목록 |
| `POST` | `/api/local-llm/providers/test` | 특정 모델 연결 테스트 (ping) |

**`GET /api/local-llm/providers` 응답 (에이전트 편집 모달용):**
```json
{
  "providers": [
    {
      "id": "ollama::llama3.2:3b",
      "label": "llama3.2:3b (Ollama)",
      "backend": "ollama",
      "model": "llama3.2:3b",
      "base_url": "http://localhost:11434/v1",
      "running": true,
      "tokens_per_second": 42.3,
      "context_length": 4096,
      "free": true
    }
  ]
}
```

---

## 7. DB 스키마

### 신규 테이블: `local_llm_backends`

```sql
CREATE TABLE local_llm_backends (
  name         TEXT PRIMARY KEY,          -- "ollama", "lmstudio", "llamacpp"
  installed    INTEGER NOT NULL DEFAULT 0,
  version      TEXT,
  host         TEXT NOT NULL DEFAULT 'localhost',
  port         INTEGER NOT NULL,
  auto_start   INTEGER NOT NULL DEFAULT 1, -- AgentDesk 시작 시 자동 실행
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
```

### 신규 테이블: `local_llm_models`

```sql
CREATE TABLE local_llm_models (
  id             TEXT PRIMARY KEY,         -- UUID
  backend        TEXT NOT NULL,            -- "ollama"
  name           TEXT NOT NULL,            -- "llama3.2:3b"
  display_name   TEXT,
  size_bytes     INTEGER,
  context_length INTEGER,
  notes          TEXT,                     -- 사용자 메모
  pinned         INTEGER DEFAULT 0,        -- 즐겨찾기
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  UNIQUE(backend, name)
);
```

### 신규 테이블: `local_llm_inference_log`

```sql
CREATE TABLE local_llm_inference_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  backend          TEXT NOT NULL,
  model_name       TEXT NOT NULL,
  agent_id         TEXT REFERENCES agents(id),
  task_id          TEXT REFERENCES tasks(id),
  prompt_tokens    INTEGER,
  completion_tokens INTEGER,
  tokens_per_second REAL,
  latency_ms       INTEGER,
  created_at       INTEGER NOT NULL
);

CREATE INDEX idx_llm_log_model ON local_llm_inference_log(model_name, created_at DESC);
CREATE INDEX idx_llm_log_agent ON local_llm_inference_log(agent_id, created_at DESC);
```

### 기존 테이블 변경: `agents`

```sql
-- 마이그레이션으로 추가
ALTER TABLE agents ADD COLUMN local_llm_backend TEXT;   -- "ollama"
ALTER TABLE agents ADD COLUMN local_llm_model   TEXT;   -- "llama3.2:3b"
-- cli_provider = "local" 일 때 위 두 컬럼 사용
```

---

## 8. 서버 아키텍처

### 파일 구조

```
server/
├── modules/
│   ├── routes/
│   │   └── ops/
│   │       └── local-llm.ts           ← REST API 라우트
│   └── local-llm/
│       ├── backend-manager.ts         ← 백엔드 설치/시작/중지
│       ├── ollama-client.ts           ← Ollama REST API 클라이언트
│       ├── model-manager.ts           ← 모델 pull/delete/list
│       ├── metrics-collector.ts       ← GPU/RAM/토큰속도 수집
│       ├── inference-logger.ts        ← 추론 이력 기록
│       └── provider-bridge.ts         ← api-provider-tools.ts 연결
```

### `backend-manager.ts` 핵심 로직

```typescript
// Ollama 설치 감지
async function detectOllama(): Promise<{ installed: boolean; version?: string }> {
  try {
    const result = await execAsync('ollama --version');
    const version = result.stdout.match(/ollama version (\S+)/)?.[1];
    return { installed: true, version };
  } catch {
    return { installed: false };
  }
}

// Ollama 서비스 시작 (lifecycle.ts 패턴 재사용)
function startOllamaService(): ChildProcess {
  const proc = spawn('ollama', ['serve'], {
    env: { ...process.env, OLLAMA_ORIGINS: '*' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  // stdout → hub.broadcast('local_llm_log', { line })
  return proc;
}
```

### `ollama-client.ts` — Ollama REST API 래퍼

```typescript
const OLLAMA_BASE = 'http://localhost:11434';

// 설치된 모델 목록
async function listModels(): Promise<OllamaModel[]>

// 모델 다운로드 (스트리밍)
async function* pullModel(name: string): AsyncGenerator<PullProgress>

// 모델 삭제
async function deleteModel(name: string): Promise<void>

// 실행 중인 모델 확인
async function listRunning(): Promise<RunningModel[]>

// 헬스체크
async function ping(): Promise<boolean>
```

### `provider-bridge.ts` — 기존 api-provider-tools.ts 연결

```typescript
// 에이전트의 cli_provider = "local" 일 때 호출
// 기존 OpenAI 호환 경로를 그대로 사용
function buildLocalLlmApiProvider(agentId: string): ApiProvider {
  const { backend, model } = getAgentLocalLlmConfig(agentId);
  return {
    type: 'openai_compatible',
    base_url: getBackendBaseUrl(backend),  // "http://localhost:11434/v1"
    model_name: model,                      // "llama3.2:3b"
    api_key: 'local',                       // Ollama는 API 키 불필요
  };
}
```

---

## 9. 프론트엔드 컴포넌트 구조

```
src/components/
└── local-llm/
    ├── LocalLlmSettingsTab.tsx       ← Settings 탭 루트 (4개 서브탭)
    ├── BackendsPanel.tsx             ← [백엔드] 서브탭
    │   ├── BackendCard.tsx           ← 개별 백엔드 카드
    │   └── InstallProgressModal.tsx  ← 설치 진행 모달
    ├── ModelsPanel.tsx               ← [모델] 서브탭
    │   ├── ModelGallery.tsx          ← 🌐 모델 갤러리 그리드
    │   ├── ModelCard.tsx             ← 개별 모델 카드 (상태별)
    │   ├── MyModelsList.tsx          ← 📦 내 모델 리스트
    │   └── DownloadProgress.tsx      ← 다운로드 진행 바
    ├── MetricsPanel.tsx              ← [실행 모니터] 서브탭
    │   ├── GpuGauge.tsx              ← GPU/VRAM 게이지
    │   ├── InferenceSparkline.tsx    ← 토큰/초 스파크라인
    │   └── InferenceLogTable.tsx     ← 최근 추론 로그
    ├── AdvancedSettingsPanel.tsx     ← [설정] 서브탭
    └── LocalLlmWidget.tsx            ← 데스크톱 위젯
```

---

## 10. WebSocket 이벤트

기존 `hub.ts`에 추가:

| 이벤트 | payload | 설명 |
|--------|---------|------|
| `local_llm_status` | `{ backend, running, model_count }` | 서비스 상태 변경 |
| `local_llm_log` | `{ backend, line, timestamp }` | 서비스 로그 스트림 |
| `local_llm_pull_progress` | `{ model, percent, speed_bytes, status }` | 다운로드 진행 |
| `local_llm_metrics` | `{ gpu, ram, inference }` | 5초 주기 메트릭 |
| `local_llm_model_started` | `{ model, backend }` | 모델 실행 시작 |
| `local_llm_model_stopped` | `{ model, backend }` | 모델 언로드 |

---

## 11. 구현 단계 (Phase 계획)

### Phase 1 — 핵심 (1주)
**목표: Ollama 연동 + 에이전트 연결**

| 작업 | 파일 | 내용 |
|------|------|------|
| Ollama 감지 | `backend-manager.ts` | `ollama --version` 실행, 포트 연결 테스트 |
| 모델 목록 | `ollama-client.ts` | `GET /api/tags` 래핑 |
| 에이전트 연동 | `provider-bridge.ts` | `cli_provider="local"` → OpenAI 호환 경로 |
| Settings 탭 | `LocalLlmSettingsTab.tsx` | 백엔드 상태 카드 + 모델 리스트 최소 UI |
| DB 마이그레이션 | `versioned-migrations.ts` | 3개 테이블 추가 |

### Phase 2 — 모델 관리 (1주)
**목표: 모델 다운로드/삭제 + 모니터링**

| 작업 | 파일 | 내용 |
|------|------|------|
| 모델 갤러리 | `ModelGallery.tsx` | 추천 모델 그리드, 다운로드 버튼 |
| 다운로드 스트림 | `model-manager.ts` | SSE → WebSocket `local_llm_pull_progress` |
| 메트릭 수집 | `metrics-collector.ts` | `nvidia-smi` 파싱, 5초 폴링 |
| 모니터 패널 | `MetricsPanel.tsx` | GPU 게이지, 스파크라인, 로그 테이블 |
| 서비스 시작/중지 | `backend-manager.ts` | `ollama serve` 프로세스 관리 |

### Phase 3 — 고급 기능 (1주)
**목표: 다중 백엔드 + 위젯**

| 작업 | 파일 | 내용 |
|------|------|------|
| LM Studio 연동 | `lmstudio-client.ts` | 포트 1234 연결 감지 |
| 추론 로그 | `inference-logger.ts` | 에이전트별 토큰 사용 기록 |
| 데스크톱 위젯 | `LocalLlmWidget.tsx` | 실행 중 모델 + VRAM 표시 |
| 자동 시작 | `lifecycle.ts` | AgentDesk 시작 시 Ollama 서비스 auto-start |
| 고급 설정 | `AdvancedSettingsPanel.tsx` | 호스트/포트/VRAM 버퍼 설정 |

---

## 12. 추천 모델 갤러리 데이터 (하드코딩)

```typescript
// server/modules/local-llm/gallery-data.ts
export const GALLERY_MODELS = [
  {
    name: "llama3.2:3b",
    display_name: "Llama 3.2 3B",
    vendor: "Meta",
    size_gb: 2.0,
    context_length: 131072,
    tags: ["범용", "빠름", "가벼움"],
    description: "Meta의 최신 소형 모델. 일상 태스크에 적합.",
    recommended_vram_gb: 4,
  },
  {
    name: "mistral:7b",
    display_name: "Mistral 7B",
    vendor: "Mistral AI",
    size_gb: 4.1,
    context_length: 32768,
    tags: ["범용", "균형"],
    description: "성능과 속도의 균형이 좋은 범용 모델.",
    recommended_vram_gb: 6,
  },
  {
    name: "qwen2.5:7b",
    display_name: "Qwen 2.5 7B",
    vendor: "Alibaba",
    size_gb: 4.7,
    context_length: 32768,
    tags: ["다국어", "한국어"],
    description: "한국어 포함 다국어 성능 우수.",
    recommended_vram_gb: 6,
  },
  {
    name: "phi4:14b",
    display_name: "Phi-4 14B",
    vendor: "Microsoft",
    size_gb: 8.4,
    context_length: 16384,
    tags: ["코딩", "추론"],
    description: "MS의 소형 고성능 모델. 코딩·수학 강점.",
    recommended_vram_gb: 10,
  },
  {
    name: "deepseek-r1:8b",
    display_name: "DeepSeek R1 8B",
    vendor: "DeepSeek",
    size_gb: 5.2,
    context_length: 65536,
    tags: ["추론", "코딩", "CoT"],
    description: "Chain-of-Thought 추론 특화 모델.",
    recommended_vram_gb: 8,
  },
  {
    name: "gemma3:4b",
    display_name: "Gemma 3 4B",
    vendor: "Google",
    size_gb: 2.5,
    context_length: 8192,
    tags: ["가볍고빠름", "모바일"],
    description: "Google의 초경량 모델. 저사양 환경에 최적.",
    recommended_vram_gb: 4,
  },
];
```

---

## 13. 관련 문서 업데이트 필요 항목

구현 완료 후 아래 문서 업데이트 필요:

| 문서 | 업데이트 내용 |
|------|-------------|
| `docs/specs/api.md` | Local LLM API 섹션 추가 (v1.4.0으로 버전 업) |
| `docs/architecture/schema-erd.md` | 3개 신규 테이블 + agents 변경 추가 |
| `docs/design/UI-SCREENS.md` | LocalLlmSettingsTab, LocalLlmWidget 스펙 추가 |
| `CLAUDE.md` | `server/modules/local-llm/` 경로, `src/components/local-llm/` 추가 |
| `README.md` (+ 번역) | Local LLM 기능 섹션 추가 |
| `docs/OVERVIEW.md` | 완성도 바 + 마일스톤 추가 |
| `docs/progress.md` | 구현 완료 기록 |
