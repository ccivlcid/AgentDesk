# AgentDesk Design System

> **기준:** `src/styles/index.part01.css` 및 프로젝트에서 실제 사용 중인 CSS 변수
> **갱신일:** 2026-03-12

---

## 1. 개요

- **테마:** `:root` / `[data-theme="dark"]` (기본), `[data-theme="light"]` (라이트).
- **폰트:** Google Fonts — Sora, IBM Plex Sans KR, JetBrains Mono. 전역 body는 `var(--th-font-mono)`.
- **원칙:** 모든 UI 색·배경·테두리는 `--th-*` 변수 사용. border-radius 기본 0.

---

## 2. CSS 변수 (다크 테마)

정의 위치: `src/styles/index.part01.css`.

### 2-1. 폰트

| 변수 | 값 |
|------|-----|
| `--th-font-display` | "Sora", "IBM Plex Sans KR", "Segoe UI", sans-serif |
| `--th-font-body` | "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif |
| `--th-font-mono` | "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace |

### 2-2. 배경

| 변수 | 값 | 용도 |
|------|-----|------|
| `--th-bg-primary` | #0c0c0c | 최하위 배경 |
| `--th-bg-secondary` | #111111 | 보조 배경 |
| `--th-bg-surface` | #181818 | 카드/섹션 |
| `--th-bg-surface-hover` | #1f1f1f | 호버 시 서페이스 |
| `--th-bg-header` | #0c0c0c | 헤더 |
| `--th-bg-sidebar` | #101010 | 사이드바 |
| `--th-bg-elevated` | #1c1c1c | 드롭다운/토스트 등 |

### 2-3. 테두리

| 변수 | 값 |
|------|-----|
| `--th-border` | #2a2a2a |
| `--th-border-strong` | #3a3a3a |
| `--th-border-accent` | rgba(245, 158, 11, 0.35) |

### 2-4. 텍스트

| 변수 | 값 |
|------|-----|
| `--th-text-primary` | #e8e8e8 |
| `--th-text-secondary` | #888888 |
| `--th-text-muted` | #737373 |
| `--th-text-heading` | #f0f0f0 |
| `--th-text-accent` | #f59e0b |
| `--th-text-code` | #22c55e |

### 2-5. 액센트 (Amber)

| 변수 | 값 |
|------|-----|
| `--th-accent` | #f59e0b |
| `--th-accent-dim` | #d97706 |
| `--th-accent-glow` | rgba(245, 158, 11, 0.12) |
| `--th-amber-glow` | rgba(245, 158, 11, 0.15) |

같은 파일 하단에서 추가 정의:

| 변수 | 값 |
|------|-----|
| `--th-hover-bg` | rgba(255, 255, 255, 0.04) |
| `--th-active-bg` | rgba(255, 255, 255, 0.07) |
| `--th-accent-border` | rgba(245, 158, 11, 0.28) |

### 2-6. 스크롤바

| 변수 | 값 |
|------|-----|
| `--th-scrollbar-thumb` | #2a2a2a |
| `--th-scrollbar-thumb-hover` | #3a3a3a |

### 2-7. 카드/패널

| 변수 | 값 |
|------|-----|
| `--th-card-bg` | #181818 |
| `--th-card-border` | #2a2a2a |
| `--th-card-bg-hover` | #1f1f1f |
| `--th-panel-bg` | #111111 |
| `--th-panel-border` | #2a2a2a |
| `--th-label-color` | #737373 |

### 2-8. 모달/오버레이

| 변수 | 값 |
|------|-----|
| `--th-modal-overlay` | rgba(0, 0, 0, 0.85) |

### 2-9. 인풋

| 변수 | 값 |
|------|-----|
| `--th-input-bg` | #0c0c0c |
| `--th-input-border` | #2a2a2a |

### 2-10. 포커스

| 변수 | 값 |
|------|-----|
| `--th-focus-ring` | #f59e0b |
| `--th-focus-ring-shadow` | rgba(245, 158, 11, 0.3) |

### 2-11. 위험 상태

| 변수 | 값 |
|------|-----|
| `--th-danger-bg` | rgba(248, 81, 73, 0.1) |
| `--th-danger-border` | #f85149 |
| `--th-danger-text` | #f85149 |

### 2-12. 터미널 영역

| 변수 | 값 |
|------|-----|
| `--th-terminal-bg` | #010409 |
| `--th-terminal-text` | #e6edf3 |
| `--th-terminal-prompt` | #f59e0b |
| `--th-terminal-success` | #3fb950 |
| `--th-terminal-error` | #f85149 |
| `--th-terminal-info` | #58a6ff |

### 2-13. 기타 (Glass, 속성 등)

| 변수 | 값 |
|------|-----|
| `--th-glass-bg` | rgba(255, 255, 255, 0.02) |
| `--th-glass-border` | #2a2a2a |
| `--th-glass-shadow` | rgba(0, 0, 0, 0.9) |
| `--th-glass-highlight` | rgba(255, 255, 255, 0.02) |
| `--th-green-glow` | rgba(63, 185, 80, 0.12) |
| `--th-red-glow` | rgba(248, 81, 73, 0.12) |
| `--th-attr-elite` | #22c55e |
| `--th-attr-good` | #86efac |
| `--th-attr-avg` | #fbbf24 |
| `--th-attr-poor` | #f87171 |
| `--th-attr-vlow` | #6e7681 |

### 2-14. 별칭 (design-system 호환)

part01.css 하단에서:

| 변수 | 대응 |
|------|------|
| `--th-bg-base` | var(--th-bg-primary) |
| `--th-bg-panel` | var(--th-bg-sidebar) |
| `--th-text` | var(--th-text-primary) |
| `--th-green` | var(--th-terminal-success) |
| `--th-blue` | var(--th-terminal-info) |
| `--th-red` | var(--th-terminal-error) |

---

## 3. 라이트 테마 (`[data-theme="light"]`)

| 변수 | 값 (요약) |
|------|-----------|
| `--th-bg-primary` | #f5f0e8 |
| `--th-bg-secondary` | #ede8de |
| `--th-bg-surface` | #faf7f2 |
| `--th-bg-sidebar` | #f0ebe2 |
| `--th-border` | #d4cfc6 |
| `--th-border-strong` | #b8b2a8 |
| `--th-text-primary` | #1a1a1a |
| `--th-text-secondary` | #555555 |
| `--th-text-muted` | #706b62 |
| `--th-accent` | #b45309 |
| `--th-accent-dim` | #92400e |
| `--th-input-bg` | #faf7f2 |
| `--th-input-border` | #d4cfc6 |
| `--th-terminal-bg` | #0d1117 |
| `--th-danger-*` | #cf222e 계열 |

나머지 변수는 동일 파일의 라이트 블록 참조.

---

## 4. Tailwind 매핑 (`index.part05.css`)

slate/gray 유틸리티가 `--th-*`로 재정의됨. 예:

- `bg-slate-950` → `var(--th-bg-primary)`
- `bg-slate-800` → `var(--th-bg-surface)`
- `border-slate-700` → `var(--th-border)`
- `text-slate-100` → `var(--th-text-primary)`
- `bg-blue-600` → `var(--th-accent)` + color #000
- `focus:border-blue-500` → `var(--th-accent)`
- input 관련 → `--th-input-bg`, `--th-border`, `--th-text-primary`

---

## 5. 사용 규칙

- 새 스타일은 가능한 한 `var(--th-*)`만 사용.
- hex/색상값 직접 사용은 상태 배지(성공/오류 등) 등 예외만.
- border-radius: 0 유지. 아바타·상태 dot만 50%.
- 테마 전환은 `data-theme="dark"` | `"light"` 로 제어 (ThemeContext 등).
