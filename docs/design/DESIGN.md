# AgentDesk UI/UX Design Guide

> **기준:** 현재 프로젝트 구현 (src/styles, src/components/ui, Sidebar, AppHeaderBar 등)
> **갱신일:** 2026-03-12

---

## 1. Design Philosophy

- **테마:** 다크 기본, 라이트 선택. 터미널 느낌의 다크 배경 + 앰버 포인트.
- **폰트:** 전역 `body`는 `var(--th-font-mono)` (JetBrains Mono). 제목/헤더도 동일 모노 사용.
- **모서리:** `borderRadius: 0` (직각). 아바타·상태 dot만 `50%` 예외.
- **색상:** CSS 변수(`--th-*`)만 사용. 인라인 hex는 위험/성공 등 상태 색상만 허용.

---

## 2. Color (CSS 변수 요약)

| 용도 | 변수 | 다크 예시 |
|------|------|-----------|
| 배경 | `--th-bg-primary`, `--th-bg-secondary`, `--th-bg-surface`, `--th-bg-sidebar`, `--th-bg-elevated` | #0c0c0c, #111111, #181818 |
| 테두리 | `--th-border`, `--th-border-strong`, `--th-border-accent` | #2a2a2a, #3a3a3a |
| 텍스트 | `--th-text-primary`, `--th-text-secondary`, `--th-text-muted`, `--th-text-heading` | #e8e8e8, #888888, #737373 |
| 액센트 | `--th-accent`, `--th-accent-dim`, `--th-accent-glow`, `--th-accent-border` | #f59e0b |
| 상호작용 | `--th-hover-bg`, `--th-active-bg` | rgba(255,255,255,0.04/0.07) |
| 위험 | `--th-danger-bg`, `--th-danger-border`, `--th-danger-text` | #f85149 계열 |
| 터미널 | `--th-terminal-bg`, `--th-terminal-prompt`, `--th-terminal-success`, `--th-terminal-error` | 터미널 패널 전용 |

상세 값·라이트 테마는 `design-system.md` 참조.

---

## 3. Typography

- **폰트 변수:** `--th-font-display` (Sora), `--th-font-body` (IBM Plex Sans KR), `--th-font-mono` (JetBrains Mono).  
  현재 앱 전역은 `body { font-family: var(--th-font-mono) }` 로 모노 사용.
- **크기:**  
  - 섹션/라벨: 10px, 700, uppercase, letter-spacing.  
  - 네비/본문: 12px.  
  - 버튼: 11px, 600, uppercase.  
  - 힌트: 11px, muted.

---

## 4. Components (현재 구현 기준)

### 4-1. Button (`src/components/ui/Button.tsx`)

- **Variant:** `primary` | `secondary` | `ghost` | `danger`
- **Primary:** `--th-accent-glow` 배경, `--th-accent-border` 테두리, `--th-accent` 텍스트. hover 시 `--th-accent` 배경, 검정 텍스트.
- **Secondary:** 투명 배경, `--th-border-strong` 테두리, `--th-text-secondary`. hover: `--th-hover-bg`, `--th-text`.
- **Ghost:** 투명, `--th-text-muted`. hover: `--th-hover-bg`, `--th-text-secondary`.
- **Danger:** 투명, `rgba(248,81,73,0.35)` 테두리, `#f85149` 텍스트. hover: `rgba(248,81,73,0.08)` 배경.
- **공통:** `borderRadius: 0`, `fontFamily: var(--th-font-mono)`, `fontSize: 11px`, `textTransform: uppercase`, `letterSpacing: 0.04em`.

### 4-2. Input (`src/components/ui/Input.tsx`)

- `background: var(--th-input-bg)`, `border: 1px solid var(--th-input-border)`, `borderRadius: 0`, `color: var(--th-text-primary)`, `fontFamily: var(--th-font-mono)`, `fontSize: 12px`, `padding: 6px 10px`.
- Focus: `borderColor: var(--th-accent)`. Error: `borderColor: var(--th-danger-border)`.

### 4-3. FormField (`src/components/ui/FormField.tsx`)

- 라벨: `// field-name` 패턴. `fontFamily: mono`, `fontSize: 10px`, `fontWeight: 700`, `letterSpacing: 0.06em`, `textTransform: uppercase`, `color: var(--th-text-muted)`. 필수 시 `*` 액센트 색.

### 4-4. Modal (`src/components/ui/Modal.tsx`)

- 오버레이 + 내부 패널. `width`: sm/md/lg/xl/full. 내부는 `--th-font-mono` 사용. Escape·포커스 트랩 지원.

### 4-5. Toast (`src/components/ui/Toast.tsx`)

- Variant: `success` | `error` | `warning` | `info`. 시질(✓✗⚠ℹ) + 좌측 액센트 바 + `--th-bg-elevated` 배경. `borderRadius: 0`.

### 4-6. ConfirmDialog (`src/components/ui/ConfirmDialog.tsx`)

- Primary 버튼: `--th-accent-glow`, `--th-accent-border`, `--th-accent` (Button primary와 동일 톤).

### 4-7. Sidebar (`src/components/Sidebar.tsx`)

- **구조:** 섹션(개요, 업무, 에이전트, 라이브러리, 시스템) + 항목. `NAV_STRUCTURE` 기반.
- **항목:** 비활성 `color: var(--th-text-secondary)`, hover `background: var(--th-hover-bg)`, `color: var(--th-text)`.  
  활성 `background: var(--th-active-bg)`, `borderLeft: 2px solid var(--th-accent)`, `color: var(--th-accent)`.
- **폰트:** `var(--th-font-mono)`, 12px.

### 4-8. 리스트 패턴

- `border: 1px solid var(--th-border)` + `divide-y divide-[var(--th-border)]` 로 행 구분. 행 hover: `hover:bg-[var(--th-hover-bg)]`.

---

## 5. Layout

- **사이드바:** `--th-bg-sidebar`, `border-right: 1px solid var(--th-border)`.
- **헤더:** `--th-bg-header`, 프로젝트 셀렉터·⌘K 등. `AppHeaderBar.tsx`.
- **메인:** `--th-bg-primary` 배경, 패딩으로 콘텐츠 영역.

---

## 6. 터미널 영역

- 실행 뷰어/CLI 출력: `--th-terminal-bg`, `--th-terminal-text`, `--th-terminal-prompt`, `--th-terminal-success`, `--th-terminal-error`, `--th-terminal-info`. `font-family: var(--th-font-mono)`.

---

## 7. 규칙 요약

| 항목 | 규칙 |
|------|------|
| border-radius | 0 (아바타·dot만 50%) |
| 색상 | `var(--th-*)` 사용. 상태(성공/오류)만 hex 허용 |
| 폰트 | UI 전반 `var(--th-font-mono)` |
| 버튼 | `Button` 컴포넌트 사용, variant·size 일관 |
| 폼 라벨 | `FormField` 또는 `// label` 패턴 |
| 모달/토스트 | `Modal`, `Toast`, `ConfirmDialog` 사용 |

---

## 8. 관련 문서

- **design-system.md** — CSS 변수 전체 목록·다크/라이트 테마 값.
- **ux-renewal-2.0.md** — UX 원칙·화면별 스펙.
