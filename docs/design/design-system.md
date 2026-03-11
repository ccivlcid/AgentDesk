# AgentDesk Design System
# Professional Tool × Terminal Precision

> **컨셉**: Linear/Paperclip 스타일의 깔끔한 Management UI + 레트로 터미널 Execution 영역
> **갱신일:** 2026-03-11

---

## 1. Design Philosophy

### 레이어 구조

```
Layer 1: Management UI  — 대시보드, 태스크 보드, 설정, 모달 (Linear/Paperclip 스타일)
Layer 2: Execution UI   — 태스크 실행 뷰어, CLI 터미널 (레트로 터미널 스타일)
```

| 영역 | 폰트 | border-radius | 색상 |
|------|------|---------------|------|
| Management | sans-serif | 0 (완전 직각) | 모노크롬 + 앰버 포인트 |
| Execution | mono (JetBrains) | 0 | 터미널 다크 + 앰버 프롬프트 |

---

## 2. CSS Variable System

### 다크 테마 (기본)

```css
:root, [data-theme="dark"] {
  /* === Backgrounds === */
  --th-bg-base:       #0f1117;   /* 최하위 배경 */
  --th-bg-panel:      #161b22;   /* 패널/사이드바 */
  --th-bg-surface:    #1c2128;   /* 카드/섹션 */
  --th-bg-elevated:   #21262d;   /* 드롭다운/툴팁 */

  /* Interaction states */
  --th-hover-bg:  rgba(255,255,255,0.04);  /* 모든 hover — 절제 */
  --th-active-bg: rgba(255,255,255,0.07);  /* 선택/active */

  /* === Borders === */
  --th-border:        #30363d;   /* 기본 (단일 사용 원칙) */
  --th-border-strong: #444c56;   /* 강조 구분선 */

  /* === Text === */
  --th-text:          #e6edf3;   /* 주 텍스트 */
  --th-text-secondary:#8b949e;   /* 보조/레이블 */
  --th-text-muted:    #6e7681;   /* 힌트/비활성 */
  --th-text-heading:  #f0f6fc;   /* 헤딩 */

  /* === Brand Accent — Amber (절제 사용) === */
  --th-accent:        #f59e0b;
  --th-accent-dim:    #d97706;
  --th-accent-glow:   rgba(245,158,11,0.12);
  --th-accent-border: rgba(245,158,11,0.3);

  /* === Status Colors === */
  --th-green:   #22c55e;   /* 실행/성공 */
  --th-blue:    #3b82f6;   /* 라이브/대기 */
  --th-red:     #f85149;   /* 오류/취소 */
  --th-done:    #3fb950;   /* 완료 */
  --th-purple:  #8b5cf6;   /* 검토 */
  --th-cyan:    #22d3ee;   /* 툴/시스템 */

  /* === Attribute Colors (상태 수치) === */
  --th-attr-elite: #22c55e;   /* 80–100 */
  --th-attr-good:  #86efac;   /* 60–79 */
  --th-attr-avg:   #fbbf24;   /* 40–59 */
  --th-attr-poor:  #f87171;   /* 0–39 */

  /* === Input === */
  --th-input-bg:     #0d1117;
  --th-input-border: #30363d;

  /* === Terminal === */
  --th-terminal-bg:  #010409;

  /* === Modal overlay === */
  --th-overlay: rgba(1,4,9,0.7);

  /* === Fonts === */
  --th-font-ui:   -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --th-font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

### 라이트 테마

```css
[data-theme="light"] {
  --th-bg-base:       #ffffff;
  --th-bg-panel:      #f6f8fa;
  --th-bg-surface:    #f6f8fa;
  --th-bg-elevated:   #ffffff;
  --th-hover-bg:      rgba(0,0,0,0.04);
  --th-active-bg:     rgba(0,0,0,0.06);
  --th-border:        #d0d7de;
  --th-border-strong: #b1bac4;
  --th-text:          #1f2328;
  --th-text-secondary:#636c76;
  --th-text-muted:    #9198a1;
  --th-text-heading:  #0d1117;
  --th-accent:        #b45309;
  --th-accent-dim:    #92400e;
  --th-accent-glow:   rgba(180,83,9,0.08);
  --th-accent-border: rgba(180,83,9,0.3);
  --th-input-bg:      #ffffff;
  --th-input-border:  #d0d7de;
  --th-terminal-bg:   #0d1117;
  --th-overlay:       rgba(0,0,0,0.4);
  --th-attr-elite:    #1a7f37;
  --th-attr-good:     #2da44e;
  --th-attr-avg:      #9a6700;
  --th-attr-poor:     #cf222e;
}
```

---

## 3. Typography

### 폰트 스택

```css
/* UI 기본 — 추가 선언 불필요 (body에 설정) */
font-family: var(--th-font-ui);

/* 모노스페이스 — 명시적으로 필요한 곳에만 */
font-family: var(--th-font-mono);
```

### 스케일

| 역할 | 폰트 | 크기 | 굵기 | 추가 |
|------|------|------|------|------|
| 페이지 제목 | ui | 15px | 600 | — |
| 섹션 헤더 | ui | 11px | 600 | uppercase tracking-wider |
| 네비 항목 | ui | 13px | 500 | — |
| 본문 | ui | 13px | 400 | — |
| 보조 | ui | 12px | 400 | muted |
| 태스크 식별자 | mono | 11px | 500 | muted |
| 상태 배지 | mono | 10px | 500 | uppercase |
| 타임스탬프 | mono | 11px | 400 | muted |
| 터미널 출력 | mono | 13px | 400 | line-height 1.7 |
| 대형 수치 | ui | 24-32px | 600 | tracking-tight |

### 클래스 패턴

```tsx
// 섹션 헤더
<h3 className="text-[11px] font-semibold uppercase tracking-wider"
    style={{ color: "var(--th-text-muted)" }}>섹션</h3>

// 네비 항목
<span className="text-[13px] font-medium">대시보드</span>

// 태스크 식별자
<span className="font-mono text-[11px]" style={{ color: "var(--th-text-muted)" }}>#042</span>

// 배지 텍스트
<span className="font-mono text-[10px] uppercase tracking-wide">실행중</span>
```

---

## 4. Border Radius — 완전 직각

```
기본값: 0 (모든 UI 요소)
예외 1: 아바타, 상태 dot → 50%
예외 2: 진행 바 fill → 2px (UX상 허용)
```

**금지 클래스:** `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`
**금지 스타일:** `borderRadius: "4px"`, `borderRadius: "6px"` 등 (예외 제외)

---

## 5. Component Patterns

### 5-1. 리스트 (핵심 패턴)

```tsx
// 기본 리스트
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)] overflow-hidden">
  {items.map(item => (
    <div key={item.id}
         className="px-4 py-2.5 flex items-center gap-3
                    hover:bg-[var(--th-hover-bg)] transition-colors cursor-pointer">
      {/* content */}
    </div>
  ))}
</div>

// 그룹 헤더가 있는 리스트
<div className="mb-4">
  <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2"
      style={{ color: "var(--th-text-muted)" }}>
    그룹명
  </h3>
  <div style={{ border: "1px solid var(--th-border)" }}
       className="divide-y divide-[var(--th-border)] overflow-hidden">
    {/* 항목들 */}
  </div>
</div>
```

### 5-2. 카드 (독립 항목)

```tsx
// 단독 카드 (리스트 외)
<div style={{
  border: "1px solid var(--th-border)",
  background: "var(--th-bg-surface)"
}} className="p-4">
  {/* content */}
</div>

// 클릭 가능한 카드
<div style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
     className="p-4 hover:bg-[var(--th-hover-bg)] transition-colors cursor-pointer">
  {/* content */}
</div>
```

### 5-3. 버튼

```tsx
// Primary
<button style={{ background: "var(--th-accent)", color: "#000", border: "none", borderRadius: 0 }}
        className="px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
  확인
</button>

// Secondary
<button style={{
  background: "transparent",
  border: "1px solid var(--th-border)",
  color: "var(--th-text-secondary)",
  borderRadius: 0
}} className="px-3 py-1.5 text-sm hover:bg-[var(--th-hover-bg)] transition-colors">
  취소
</button>

// Ghost
<button style={{ background: "transparent", color: "var(--th-text-muted)", borderRadius: 0 }}
        className="px-2 py-1 text-sm hover:bg-[var(--th-hover-bg)] hover:text-[var(--th-text)] transition-colors">
  아이콘버튼
</button>

// Danger
<button style={{
  background: "transparent",
  border: "1px solid rgba(248,81,73,0.3)",
  color: "#f85149",
  borderRadius: 0
}} className="px-3 py-1.5 text-sm hover:bg-[rgba(248,81,73,0.08)] transition-colors">
  삭제
</button>
```

### 5-4. 상태 배지

```tsx
const STATUS_BADGE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  running:    { bg: "rgba(34,197,94,0.1)",   text: "#22c55e", border: "rgba(34,197,94,0.3)",   label: "실행중" },
  pending:    { bg: "rgba(59,130,246,0.1)",  text: "#3b82f6", border: "rgba(59,130,246,0.3)",  label: "대기" },
  completed:  { bg: "rgba(63,185,80,0.1)",   text: "#3fb950", border: "rgba(63,185,80,0.3)",   label: "완료" },
  error:      { bg: "rgba(248,81,73,0.1)",   text: "#f85149", border: "rgba(248,81,73,0.3)",   label: "오류" },
  paused:     { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b", border: "rgba(245,158,11,0.3)",  label: "일시정지" },
  review:     { bg: "rgba(139,92,246,0.1)",  text: "#8b5cf6", border: "rgba(139,92,246,0.3)",  label: "검토" },
};

<span style={{
  background: cfg.bg,
  color: cfg.text,
  border: `1px solid ${cfg.border}`,
  borderRadius: 0,
  padding: "1px 6px",
  fontFamily: "var(--th-font-mono)",
  fontSize: "10px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}}>
  {cfg.label}
</span>
```

### 5-5. 입력 필드

```tsx
<input style={{
  background: "var(--th-input-bg)",
  border: "1px solid var(--th-border)",
  color: "var(--th-text)",
  borderRadius: 0,
  padding: "6px 10px",
  fontSize: "13px",
  outline: "none",
  width: "100%",
}} className="focus:border-[var(--th-accent)]" />
```

### 5-6. 사이드바 네비 항목

```tsx
<button style={{
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 500,
  width: "100%",
  background: isActive ? "var(--th-active-bg)" : "transparent",
  color: isActive ? "var(--th-text)" : "var(--th-text-secondary)",
  borderLeft: isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
  borderRadius: 0,
  cursor: "pointer",
}} className={!isActive ? "hover:bg-[var(--th-hover-bg)]" : ""}>
  <Icon size={16} />
  <span className="flex-1 truncate">{label}</span>
  {badge && <span className="font-mono text-[10px]">{badge}</span>}
</button>
```

### 5-7. MetricCard

```tsx
<div style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
     className="px-4 py-4 hover:bg-[var(--th-hover-bg)] transition-colors cursor-pointer">
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-2xl font-semibold tracking-tight"
         style={{ color: "var(--th-text-heading)" }}>
        {value}
      </p>
      <p className="text-xs font-medium mt-1" style={{ color: "var(--th-text-muted)" }}>
        {label}
      </p>
      {description && (
        <p className="text-[11px] mt-1.5" style={{ color: "var(--th-text-muted)", opacity: 0.7 }}>
          {description}
        </p>
      )}
    </div>
    <Icon size={16} style={{ color: "var(--th-text-muted)", opacity: 0.5, marginTop: 4 }} />
  </div>
</div>
```

### 5-8. 모달

```tsx
<div style={{ background: "var(--th-overlay)" }}
     className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div style={{
    background: "var(--th-bg-surface)",
    border: "1px solid var(--th-border)",
    borderRadius: 0,
    width: "100%",
    maxWidth: 512,
  }}>
    {/* 헤더 */}
    <div className="flex items-center justify-between px-5 py-4"
         style={{ borderBottom: "1px solid var(--th-border)" }}>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      <button onClick={onClose} className="..." />
    </div>
    {/* 콘텐츠 */}
    <div className="px-5 py-4">{children}</div>
    {/* 푸터 */}
    <div className="flex items-center justify-end gap-3 px-5 py-4"
         style={{ borderTop: "1px solid var(--th-border)" }}>
      {/* 버튼들 */}
    </div>
  </div>
</div>
```

### 5-9. 라이브 인디케이터

```tsx
// 실행 중 pulse dot
const LiveDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
  </span>
);

// 앰버 pulse (AgentDesk 실행 중 — 앰버 브랜드)
const RunningDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ background: "var(--th-accent)" }} />
    <span className="relative inline-flex rounded-full h-2 w-2"
          style={{ background: "var(--th-accent)" }} />
  </span>
);
```

---

## 6. Terminal Execution Layer

실행 뷰어, CLI 터미널에만 적용.

```css
.terminal-zone {
  background: var(--th-terminal-bg);  /* #010409 */
  border: 1px solid var(--th-border);
  border-radius: 0;
  font-family: var(--th-font-mono);
  font-size: 13px;
  line-height: 1.7;
}
```

| 출력 유형 | 색상 |
|-----------|------|
| 프롬프트 (>) | `#f59e0b` (앰버) |
| 성공/OK | `#3fb950` |
| 오류/ERROR | `#f85149` |
| 정보/INFO | `#3b82f6` |
| 도구/툴 | `#22d3ee` (시안) |
| AI 응답 | `#22c55e` (초록) |
| 일반 | `#e6edf3` |
| muted | `#6e7681` |

---

## 7. 레이아웃

### Global Shell

```
┌──────┬─────────────────────────────────┐
│      │  BreadcrumbBar (48px)           │
│Side  ├─────────────────────────────────┤
│bar   │                                 │
│220px │  Main Content (p-4 md:p-6)      │
│      │                                 │
└──────┴─────────────────────────────────┘
```

```css
/* 사이드바 */
width: 220px;
background: var(--th-bg-panel);
border-right: 1px solid var(--th-border);

/* 메인 */
padding: 16px;  /* md: 24px */
overflow: auto;
```

---

## 8. 이전 버전과의 차이

| 항목 | 구버전 (FM2024) | 현버전 (Paperclip) |
|------|----------------|-------------------|
| 철학 | 게임 관리 시뮬 | 프로 툴 |
| border-radius | 2px~6px 혼재 | 0 완전 직각 |
| 폰트 | 모노스페이스 전체 | sans-serif UI + mono 한정 |
| 색상 | 앰버 남발 | 앰버 절제 (3곳만) |
| 리스트 | 개별 카드 | border+divide-y |
| hover | 컴포넌트별 다름 | `--th-hover-bg` 통일 |
| FM 메타포 | 어트리뷰트 바, 레이팅 | 제거 |
| 패널 색상 테두리 | 색상별 왼쪽 3px | 단일 border |

> **터미널 영역, 앰버 브랜드, 다크 테마, i18n은 유지한다.**
