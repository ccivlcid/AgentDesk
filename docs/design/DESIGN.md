# AgentDesk UI/UX Design Guide

> **Theme:** Professional Tool × Terminal Precision
> **Concept:** Linear/Paperclip의 깔끔함과 AgentDesk의 앰버 터미널 미학을 결합한 "AI Agent OS"
> **갱신일:** 2026-03-11 (FM2024 게임 메타포 → 프로 툴 스타일로 방향 전환)

---

## 1. Design Philosophy

### 핵심 원칙: "Professional First, Terminal When Needed"

AgentDesk는 **두 영역이 공존**하는 디자인을 사용한다:

| 영역 | 스타일 | 적용 범위 |
|------|--------|-----------|
| **Management Layer** | Linear/Paperclip 스타일 — 깔끔, 플랫, 직각, 산세리프 | 사이드바, 대시보드, 태스크 보드, 설정, 모달 |
| **Execution Layer** | 레트로 터미널 — 모노스페이스, 앰버 프롬프트, 다크 배경 | 태스크 실행 뷰어, CLI 출력, 터미널 패널 |

Management Layer가 90%, Execution Layer가 10%.
과거의 FM2024 게임 메타포(어트리뷰트 바, 레이팅 수치 등)는 제거한다.

### 무엇을 유지하는가

- **앰버(#f59e0b) 브랜드 컬러** — AgentDesk 아이덴티티
- **다크 테마 기본값** — 개발자 타겟 제품
- **터미널 실행 뷰어 스타일** — AI 실행의 핵심 UX
- **부팅 시퀀스 애니메이션** — 제품 개성

### 무엇을 바꾸는가

- 모노스페이스 폰트 UI 전체 적용 → 산세리프 기본, 모노는 터미널/배지/식별자만
- 색상 있는 왼쪽 테두리를 모든 카드에 남발 → 단일 border 통일
- 앰버 색상 과다 사용 → CTA·선택된 nav·라이브 인디케이터에만
- border-radius 혼재(2px~6px) → 0 완전 직각 통일

---

## 2. Color System

### 다크 테마 (기본)

| 변수 | 값 | 용도 |
|------|-----|------|
| `--th-bg-base` | `#0f1117` | 최하위 배경 |
| `--th-bg-panel` | `#161b22` | 패널/사이드바 배경 |
| `--th-bg-surface` | `#1c2128` | 카드/섹션 배경 |
| `--th-bg-elevated` | `#21262d` | 드롭다운/툴팁 |
| `--th-hover-bg` | `rgba(255,255,255,0.04)` | 모든 hover 상태 |
| `--th-active-bg` | `rgba(255,255,255,0.07)` | 선택/active 상태 |
| `--th-border` | `#30363d` | 기본 border |
| `--th-border-strong` | `#444c56` | 강조 구분선 |

### 텍스트

| 변수 | 값 | 용도 |
|------|-----|------|
| `--th-text` | `#e6edf3` | 주 텍스트 |
| `--th-text-secondary` | `#8b949e` | 보조/레이블 |
| `--th-text-muted` | `#6e7681` | 힌트/비활성 |
| `--th-text-heading` | `#f0f6fc` | 헤딩 |

### 앰버 (Brand — 절제해서 사용)

| 변수 | 값 | 허용 사용처 |
|------|-----|------------|
| `--th-accent` | `#f59e0b` | 선택된 nav 테두리, Primary CTA, 라이브 인디케이터 |
| `--th-accent-dim` | `#d97706` | hover 상태 |
| `--th-accent-glow` | `rgba(245,158,11,0.12)` | 강조 배경 |

**앰버 사용 금지:**
- 패널/카드의 왼쪽 색상 테두리
- 섹션 제목 텍스트 색상
- 일반 정보 배지

### 상태 색상

| 상태 | 색상 | Hex |
|------|------|-----|
| 실행 중/성공 | 초록 | `#22c55e` |
| 라이브 인디케이터 | 파랑 | `#3b82f6` |
| 대기/주의 | 앰버 | `#f59e0b` |
| 오류/취소 | 빨강 | `#f85149` |
| 완료 | 초록(dim) | `#3fb950` |
| 검토 | 보라 | `#8b5cf6` |

---

## 3. Typography

### 원칙: UI는 산세리프, 데이터/터미널은 모노

```
UI 폰트: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
모노 폰트: "JetBrains Mono", ui-monospace, monospace
```

### 적용 규칙

| 용도 | 폰트 | 크기 | 굵기 | 기타 |
|------|------|------|------|------|
| 페이지 제목 | sans-serif | 15px | 600 | — |
| 섹션 헤더 | sans-serif | 11px | 600 | uppercase + tracking-wider + muted |
| 네비 항목 | sans-serif | 13px | 500 | — |
| 본문 | sans-serif | 13px | 400 | — |
| 보조 텍스트 | sans-serif | 12px | 400 | muted |
| 태스크 식별자 (#042) | mono | 11px | 500 | muted |
| 상태 배지 | mono | 10px | 500 | uppercase |
| 타임스탬프 | mono | 11px | 400 | muted |
| 터미널 출력 | mono | 13px | 400 | line-height 1.7 |
| 수치 (MetricCard) | sans-serif | 24–32px | 600 | tracking-tight |

---

## 4. Border Radius — 완전 직각

```css
/* 기본: 모든 요소 직각 */
--radius-none: 0;     /* 버튼, 배지, 카드, 인풋, 리스트 */
--radius-sm:   2px;   /* 소형 입력 컨트롤 (선택적) */
--radius-full: 50%;   /* 아바타, 상태 dot만 */
```

**절대 사용 금지:** `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`

---

## 5. Components

### 5-1. 리스트 패턴 (핵심 — Paperclip 방식)

모든 리스트형 UI는 개별 카드 대신 **border + divide-y** 패턴을 사용한다.

```tsx
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)] overflow-hidden">
  {items.map(item => (
    <div className="px-4 py-2.5 hover:bg-[var(--th-hover-bg)] transition-colors cursor-pointer">
      {/* 내용 */}
    </div>
  ))}
</div>
```

**적용 대상:** 태스크 리스트, 최근 활동 피드, 에이전트 목록, 설정 항목

---

### 5-2. 섹션 헤더

```tsx
<h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3"
    style={{ color: "var(--th-text-muted)" }}>
  섹션 제목
</h3>
```

---

### 5-3. 상태 배지

```
[실행중] bg: rgba(34,197,94,0.1)  text: #22c55e  border: rgba(34,197,94,0.3)
[대기]   bg: rgba(88,166,255,0.1) text: #3b82f6  border: rgba(88,166,255,0.3)
[완료]   bg: rgba(63,185,80,0.1)  text: #3fb950  border: rgba(63,185,80,0.3)
[오류]   bg: rgba(248,81,73,0.1)  text: #f85149  border: rgba(248,81,73,0.3)
[검토]   bg: rgba(139,92,246,0.1) text: #8b5cf6  border: rgba(139,92,246,0.3)

font: mono 10px 500 uppercase
border-radius: 0
padding: 1px 6px
```

---

### 5-4. 버튼

```
Primary:   bg var(--th-accent), text #000, borderRadius 0
           hover: bg var(--th-accent-dim)

Secondary: bg transparent, border "1px solid var(--th-border)", text var(--th-text-secondary)
           hover: bg var(--th-hover-bg), text var(--th-text)

Ghost:     bg transparent, text var(--th-text-muted)
           hover: bg var(--th-hover-bg), text var(--th-text)

Danger:    bg transparent, border "1px solid rgba(248,81,73,0.3)", text #f85149
           hover: bg rgba(248,81,73,0.08)
```

---

### 5-5. 입력 필드

```css
background: var(--th-bg-base);
border: 1px solid var(--th-border);
border-radius: 0;
color: var(--th-text);
font-family: var(--th-font-ui);
font-size: 13px;
padding: 6px 10px;

:focus { border-color: var(--th-accent); outline: none; }
```

---

### 5-6. 모달/다이얼로그

```css
background: var(--th-bg-surface);
border: 1px solid var(--th-border);
border-radius: 0;  /* 완전 직각 */
box-shadow: 0 8px 32px rgba(0,0,0,0.5);
```

헤더:
```tsx
<div className="flex items-center justify-between px-5 py-4"
     style={{ borderBottom: "1px solid var(--th-border)" }}>
  <div>
    <h2 className="text-sm font-semibold">{title}</h2>
    <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>{subtitle}</p>
  </div>
</div>
```

---

### 5-7. 사이드바 네비 항목

```tsx
// 비활성
className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors"
style={{ color: "var(--th-text-secondary)" }}

// hover
onHover → background: var(--th-hover-bg)

// 활성
style={{
  background: "var(--th-active-bg)",
  color: "var(--th-text)",
  borderLeft: "2px solid var(--th-accent)"
}}
```

섹션 그룹 레이블:
```tsx
<p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-3 pb-1"
   style={{ color: "var(--th-text-muted)" }}>
  WORK
</p>
```

---

### 5-8. MetricCard (대시보드)

```tsx
<div style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
     className="px-4 py-4 hover:bg-[var(--th-hover-bg)] transition-colors cursor-pointer">
  <div className="flex items-start justify-between gap-3">
    <div>
      <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--th-text-heading)" }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--th-text-muted)" }}>{label}</p>
      <p className="text-[11px] mt-1.5" style={{ color: "var(--th-text-muted)" }}>{description}</p>
    </div>
    <Icon className="h-4 w-4 mt-1" style={{ color: "var(--th-text-muted)", opacity: 0.5 }} />
  </div>
</div>
```

---

### 5-9. 라이브 실행 인디케이터

실행 중인 에이전트/태스크에 사용:

```tsx
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
</span>
```

---

## 6. Terminal Execution Layer

**태스크 실행 뷰어만** 터미널 스타일을 사용한다.

```css
background: #010409;
border: 1px solid var(--th-border);
border-radius: 0;
font-family: var(--th-font-mono);
font-size: 13px;
line-height: 1.7;
```

터미널 출력 색상:
```
prompt (>)  : #f59e0b (앰버)
success     : #3fb950
error       : #f85149
info        : #3b82f6
tool/system : #22d3ee (시안)
muted       : #6e7681
```

---

## 7. Layout — Global Shell

```
┌──────┬──────────────────────────────────────────┐
│      │  BreadcrumbBar (48px)                    │
│Side  ├──────────────────────────────────────────┤
│bar   │                                          │
│220px │  Main Content (p-4 md:p-6)               │
│      │                                          │
└──────┴──────────────────────────────────────────┘
```

- **Sidebar**: 220px, `bg: var(--th-bg-panel)`, `border-right: 1px solid var(--th-border)`
- **BreadcrumbBar**: 48px, `bg: var(--th-bg-panel)`, `border-bottom: 1px solid var(--th-border)`
- **Main**: `overflow-auto`, `padding: 16px` (md: 24px)

---

## 8. Animation & Motion

| 이름 | 컨텍스트 | 설명 |
|------|----------|------|
| 상태 배지 pulse | `[실행중]` 배지 | 초록 glow, 2s loop |
| 라이브 dot | 실행 중 에이전트/태스크 | 파란 ping 애니메이션 |
| 부팅 시퀀스 | AppLoadingScreen | Framer Motion stagger 0.12s |
| hover transition | 모든 클릭 가능 요소 | transition-colors 150ms |

---

## 9. Boot Sequence

```
AgentDesk
━━━━━━━━━━━━━━━━━━━━━━━━━━
> Initializing agent runtime...    [OK]
> Loading departments...           [OK]
> Connecting to CLI...             [OK]
> Starting workspace...            [OK]
━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready.

bg: #0f1117  font: JetBrains Mono
text: #e6edf3 / [OK]: #3fb950 / >: #f59e0b / Ready.: #f59e0b
Framer Motion staggerChildren: 0.12s, duration: 0.3s
```

---

## 10. Implementation Rules

### border-radius 규칙

| 요소 | 값 |
|------|----|
| 버튼, 입력, 배지, 카드, 모달 | `0` |
| 아바타, 상태 dot | `50%` |

### 색상 패턴 (인라인 스타일)

```tsx
// 기본 카드/패널
style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}

// 입력 필드
style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-base)", color: "var(--th-text)" }}

// Primary 버튼
style={{ background: "var(--th-accent)", color: "#000", border: "none" }}

// Danger 버튼
style={{ border: "1px solid rgba(248,81,73,0.3)", color: "#f85149", background: "transparent" }}

// hover 영역 (Tailwind)
className="hover:bg-[var(--th-hover-bg)] transition-colors"
```

### 폰트 규칙

```tsx
// UI 텍스트 — 추가 클래스 불필요 (기본 sans-serif)
<p className="text-sm">일반 텍스트</p>

// 모노스페이스가 필요한 경우만 명시
<span className="font-mono text-xs">{"#042"}</span>  // 식별자
<span className="font-mono text-[10px] uppercase">{"실행중"}</span>  // 배지
```

---

## 11. 이전 문서와의 관계

| 문서 | 상태 | 비고 |
|------|------|------|
| `design-system.md` | **유효** (업데이트됨) | CSS 변수 시스템 상세 |
| `paperclip-design-adoption.md` | **유효** | 전환 계획 및 Paperclip 분석 |
| `ux-renewal-2.0.md` | **유효** | 7가지 UX 원칙 |
| `ux-audit-2026-q1.md` | **유효** | 현재 UX 문제점 진단 |
| `DESIGN_SKILLS.md` | **유효** | 스킬 학습 히스토리 UI |

> **이 문서가 최우선 디자인 레퍼런스다.**
