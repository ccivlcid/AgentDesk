# macOS UX Improvements — Feature Spec

> 작성: 2026-03-20
> 상태: 📋 문서화 완료, 구현 대기
> 우선순위: P1 → P2 → P3 순으로 구현

---

## 개요

현재 AgentDesk는 macOS 외형은 갖추고 있으나 핵심 UX 편의성이 부족하다.
아래 7개 기능을 구현하면 실제 macOS에 가까운 사용 경험을 제공할 수 있다.

| 코드 | 기능 | 우선순위 | 예상 공수 |
|------|------|----------|----------|
| MX-01 | 창 엣지 리사이즈 | 🔴 P1 | 2~3일 |
| MX-02 | 알림 배너 (Toast) | 🔴 P1 | 1일 |
| MX-03 | Cmd+Tab 앱 전환기 | 🟡 P2 | 1~2일 |
| MX-04 | 창 스냅 / 반반 타일링 | 🟡 P2 | 1~2일 |
| MX-05 | Dock 배지 | 🟡 P2 | 0.5일 |
| MX-06 | 초록 버튼 전체화면 | 🔵 P3 | 1일 |
| MX-07 | 컨텍스트 메뉴 polish | 🔵 P3 | 1~2일 |

---

## MX-01 — 창 엣지 리사이즈

### 동작 명세

| 조작 | 동작 |
|------|------|
| 창 우측 엣지 (6px zone) 드래그 | 창 width 조절 |
| 창 하단 엣지 (6px zone) 드래그 | 창 height 조절 |
| 창 우하단 코너 (12×12px) 드래그 | width + height 동시 조절 |
| 창 좌측 엣지 드래그 | width + x 동시 조절 (좌측 확장) |
| 창 상단 엣지 드래그 | height + y 동시 조절 (상단 확장, 타이틀바 제외) |

**제약:**
- 최소 크기: `minWidth: 320px`, `minHeight: 200px` (창마다 다를 수 있음)
- 최대 크기: 뷰포트 - 메뉴바(28px) - Dock(48px)
- 리사이즈 중 커서: right=`ew-resize`, bottom=`ns-resize`, corner=`nwse-resize`, left=`ew-resize`, top=`ns-resize`
- 리사이즈 존 hover 시 커서만 변경 (시각적 핸들 없음 — macOS 스타일)

**저장:**
- `uiStore.windowSizes: Record<string, { width: number; height: number }>` — windowId 기준 저장
- 창 닫기 후 재열기 시 마지막 크기 복원
- localStorage: `agentdesk_window_sizes`

### 구현 방법

```
AppWindow.tsx
  ├── 엣지 zone div (absolute, 6px) — right / bottom / corner / left / top
  │     onMouseDown → setResizing({ edge, startX, startY, startW, startH })
  ├── document.onMouseMove → calculateNewSize(edge, dx, dy)
  ├── document.onMouseUp → stopResizing()
  └── cursor 클래스는 엣지 div에 적용
```

**상태:**
```typescript
type ResizeEdge = "right" | "bottom" | "corner" | "left" | "top" | "top-left" | "top-right" | "bottom-left"

interface ResizeState {
  edge: ResizeEdge
  startX: number; startY: number
  startW: number; startH: number
  startLeft: number; startTop: number
}
```

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/windows/AppWindow.tsx` | 엣지 zone div 추가, resize 이벤트 핸들러, cursor 적용 |
| `src/store/uiStore.ts` | `windowSizes` 상태 + `setWindowSize(id, w, h)` 액션 |

---

## MX-02 — 알림 배너 (Toast)

### 동작 명세

macOS 스타일 우상단 슬라이드인 배너. 기존 `NotificationCenter`와 별개로 동작.

| 속성 | 값 |
|------|-----|
| 위치 | 우상단, 메뉴바 아래 (`top: 36px, right: 16px`) |
| 크기 | `width: 320px`, 가변 height |
| 진입 | `translateX(+336px) → 0` (오른쪽에서 슬라이드인), `duration: 300ms ease-out` |
| 퇴장 | `translateX(+336px)`, `duration: 200ms ease-in` (또는 위로 슬라이드아웃) |
| 자동 소멸 | 기본 4000ms (에러: 6000ms, 무기한: `duration: 0`) |
| 최대 동시 표시 | 3개 (이후 큐잉) |
| 스택 방향 | 최신이 위 (새 배너가 이전 배너를 아래로 밀어냄) |

**배너 타입:**

| 타입 | 아이콘 | accent bar 색 | 용도 |
|------|--------|--------------|------|
| `success` | ✓ (circle) | `--th-accent` (amber) | 태스크 완료, 저장 성공 |
| `error` | ! (triangle) | `#ef4444` (red) | 에러, 실패 |
| `info` | ℹ | `#3b82f6` (blue) | 일반 안내 |
| `progress` | spinner | `#8b5cf6` (purple) | 진행 중 (무기한, 수동 dismiss) |

**배너 구조:**
```
┌─────────────────────────────────────────┐
│ [accent-bar 3px] [icon]  제목           [✕] │
│               서브 텍스트 (선택)            │
└─────────────────────────────────────────┘
```

**인터랙션:**
- hover → 자동 소멸 타이머 일시정지
- 클릭 → 관련 창 포커스 (옵션)
- ✕ 클릭 → 즉시 dismiss
- 배너 클릭 시 `NotificationCenter` 패널 열기 (선택)

**트리거 포인트:**

| 이벤트 | 배너 |
|--------|------|
| task `done` WS 이벤트 | `success` "태스크 완료: {title}" |
| task `failed` WS 이벤트 | `error` "태스크 실패: {title}" |
| dev 서버 `ready` | `success` "앱 실행 중 — 포트 {port}" |
| 파일 저장 성공 | `success` "저장됨" (2000ms) |
| API 에러 | `error` "{message}" |

### 구현 방법

```typescript
// src/store/uiStore.ts에 추가
interface Toast {
  id: string
  type: "success" | "error" | "info" | "progress"
  title: string
  body?: string
  duration?: number  // 0 = persistent
  onClick?: () => void
}

// Actions
addToast(toast: Omit<Toast, "id">): string  // returns id
dismissToast(id: string): void
```

```
// src/components/desktop/ToastContainer.tsx (신규)
// Desktop.tsx에 포함, portal 불필요 (fixed position)
// Framer Motion AnimatePresence로 진입/퇴장 애니메이션
```

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/store/uiStore.ts` | `toasts` 배열 + `addToast / dismissToast` |
| `src/components/desktop/ToastContainer.tsx` | 신규 — 배너 렌더러 |
| `src/components/desktop/Desktop.tsx` | `<ToastContainer />` 추가 |
| `src/App.tsx` | task done/failed WS 이벤트 → `addToast` 연결 |

---

## MX-03 — Cmd+Tab 앱 전환기

### 동작 명세

| 조작 | 동작 |
|------|------|
| `Cmd+Tab` (또는 `Ctrl+Tab` on Windows) | 전환기 오버레이 표시 + 다음 창으로 포커스 이동 |
| Tab 유지 + `Cmd` 계속 누름 | 오른쪽으로 창 순환 |
| `Shift` 추가 | 왼쪽으로 역순환 |
| `Cmd` 해제 | 선택된 창으로 전환, 오버레이 닫힘 |
| `Esc` | 취소, 원래 창 유지 |

**UI:**
```
┌──────────────────────────────────────────┐
│                                          │
│   [아이콘] [아이콘] [아이콘] [아이콘]      │
│   Workflow  Library  Settings  Chat      │
│                ↑ 선택됨 (amber border)   │
│                                          │
└──────────────────────────────────────────┘
```
- 화면 중앙 고정
- `backdrop-filter: blur(20px)` + 반투명 배경
- 창 아이콘: 각 WindowType별 SVG (Dock 아이콘 재사용)
- 창 이름 하단 레이블
- 선택 항목: amber 2px 테두리 + 살짝 scale-up
- 최소화된 창도 목록에 포함 (opacity 0.5)

**대상:** `openWindows` Set 기준 — 열려있는 창만 포함 (순서: 마지막 포커스 역순)

### 구현 방법

```
Desktop.tsx
  └── keydown "Tab" + (metaKey || ctrlKey)
        → preventDefault
        → setAppSwitcherOpen(true)
        → nextWindowIndex()

keyup "Meta" || "Control"
  → 선택된 창 포커스 (bringWindowToFront)
  → setAppSwitcherOpen(false)

// src/components/desktop/AppSwitcher.tsx (신규)
```

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/desktop/AppSwitcher.tsx` | 신규 — 전환기 오버레이 |
| `src/components/desktop/Desktop.tsx` | keydown/keyup 핸들러, `<AppSwitcher />` 조건부 렌더 |
| `src/store/uiStore.ts` | `appSwitcherOpen`, `appSwitcherIndex` 상태 |

---

## MX-04 — 창 스냅 / 반반 타일링

### 동작 명세

**트리거 방법:**

| 방법 | 동작 |
|------|------|
| 창을 화면 왼쪽 엣지로 드래그 (`x < 20px`) | 왼쪽 절반 스냅 미리보기 → 마우스 놓으면 확정 |
| 창을 화면 오른쪽 엣지로 드래그 (`x > vw-20px`) | 오른쪽 절반 스냅 |
| 창을 화면 상단으로 드래그 (`y < 40px`) | 전체화면 스냅 미리보기 |
| 타이틀바 더블클릭 | 전체화면 토글 |
| 우클릭 컨텍스트 메뉴 → "왼쪽에 스냅" / "오른쪽에 스냅" | 키보드로도 접근 가능 |
| `Ctrl+Left/Right` (창 포커스 중) | 좌/우 절반 스냅 |

**스냅 존:**

| 존 | 위치 | 결과 크기 |
|----|------|----------|
| Left Half | `x: 0, y: 28px` | `w: 50vw, h: calc(100vh - 76px)` |
| Right Half | `x: 50vw, y: 28px` | `w: 50vw, h: calc(100vh - 76px)` |
| Full | `x: 0, y: 28px` | `w: 100vw, h: calc(100vh - 76px)` |
| Top Half | `x: 0, y: 28px` | `w: 100vw, h: 50vh` |

**스냅 미리보기:**
- 드래그 중 해당 존 도달 시 반투명 amber 오버레이 (`rgba(245,158,11,0.15)`) + 1px amber 테두리
- 창 자체는 ghost로 표시 (opacity 0.5), 미리보기 overlay가 실제 스냅 위치를 보여줌

**스냅 해제:**
- 스냅된 창을 드래그 → 스냅 해제, 이전 크기 복원

### 구현 방법

```
AppWindow.tsx 드래그 로직에 추가:
  onMouseMove → detectSnapZone(x, y) → setSnapPreview(zone)
  onMouseUp → if snapZone → applySnap(zone) else normalDrop()

// src/components/desktop/SnapPreviewOverlay.tsx (신규)
// Desktop.tsx에 포함, 드래그 중에만 렌더
```

**상태:**
```typescript
// uiStore에 추가
snapPreview: "left" | "right" | "full" | "top" | null
snapStates: Record<string, { snapped: boolean; snapZone: string; prevPos: Position; prevSize: Size }>
```

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/windows/AppWindow.tsx` | 드래그 중 snapZone 감지, applySnap 로직 |
| `src/components/desktop/SnapPreviewOverlay.tsx` | 신규 — 스냅 미리보기 overlay |
| `src/components/desktop/Desktop.tsx` | `<SnapPreviewOverlay />` 포함 |
| `src/store/uiStore.ts` | `snapPreview`, `snapStates` 상태 |

---

## MX-05 — Dock 배지

### 동작 명세

Dock 아이콘 우상단에 숫자/점 배지 표시.

| 앱 | 배지 조건 | 배지 내용 |
|----|----------|----------|
| Tasks | 실행 중 태스크 수 > 0 | 숫자 (amber 배경) |
| Tasks | 실패한 태스크 수 > 0 | 숫자 (red 배경) |
| Notifications (벨) | 안 읽은 알림 수 > 0 | 숫자 (red 배경) |
| Custom Feature 앱 | `pending_install` 상태 | `↓` 아이콘 (이미 구현됨) |
| Chat | 새 메시지 수 > 0 | 숫자 (blue 배경) |

**배지 스타일:**
```
위치: absolute, top: -4px, right: -4px
크기: min 18×18px (숫자 2자리 이상: 24px width)
배경: 타입별 색
텍스트: 흰색, 11px bold, font-mono
border-radius: 9px (pill)
```

**1자리 숫자 vs 여러 자리:**
- 1~9: 숫자 그대로
- 10~99: "10", "99"
- 100+: "99+"

### 구현 방법

```typescript
// src/components/desktop/Dock.tsx
// 각 Dock 아이콘 wrapper에 DockBadge 컴포넌트 추가

interface DockBadgeProps {
  count?: number
  type?: "amber" | "red" | "blue"
  show: boolean
}
```

**데이터 소스:**
- Tasks 배지: `taskStore` — `tasks.filter(t => t.status === "running").length`
- 알림 배지: `notifications.filter(n => !n.read).length`

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/desktop/Dock.tsx` | 각 아이콘에 DockBadge 조건부 렌더 |
| `src/components/desktop/DockBadge.tsx` | 신규 — 배지 컴포넌트 |

---

## MX-06 — 초록 버튼 전체화면

### 동작 명세

현재: 🔴 닫기, 🟡 최소화, 🟢 (동작 없음)
목표: 🟢 클릭 → 창 전체화면 토글

| 조작 | 동작 |
|------|------|
| 🟢 버튼 클릭 | 전체화면 진입 (메뉴바·Dock 영역 제외, `top:28px, bottom:48px`) |
| 🟢 버튼 다시 클릭 (전체화면 중) | 이전 크기/위치로 복원 |
| `Esc` (전체화면 중) | 전체화면 해제 |
| 타이틀바 더블클릭 | 전체화면 토글 (MX-04 스냅과 동일 트리거) |

**전체화면 크기:**
```
x: 0, y: 28px (메뉴바 아래)
w: 100vw
h: calc(100vh - 28px - 48px)  /* 메뉴바 + Dock */
```

**애니메이션:**
- `transition: all 250ms cubic-bezier(0.2, 0, 0, 1)`
- 진입/복원 모두 동일 easing

**전체화면 중 UI 변경:**
- 🟢 버튼 색상 유지 (전체화면 상태 구분 불필요 — 동작으로 명확)
- 타이틀바는 유지 (TrafficLights 접근 가능)
- 창 z-index: 다른 창보다 앞 (`zIndex: 999`)

### 구현 방법

```typescript
// uiStore에 추가
fullscreenWindowId: string | null
setFullscreen(id: string | null): void

// AppWindow.tsx
// 🟢 버튼 onClick → toggleFullscreen(windowId)
// fullscreenWindowId === windowId 이면 전체화면 크기 적용
```

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/store/uiStore.ts` | `fullscreenWindowId` + `setFullscreen` |
| `src/components/windows/AppWindow.tsx` | 🟢 버튼 onClick, 전체화면 크기 조건부 적용 |

---

## MX-07 — 컨텍스트 메뉴 Polish

### 현재 문제

- 구분선(separator) 이 단순 `<hr>` 또는 없음
- 키보드 내비게이션 없음 (↑↓ Enter Esc)
- 서브메뉴(chevron ▶)가 일부 있으나 hover 타이밍이 불안정
- 메뉴 위치 뷰포트 경계 보정 없음 (화면 밖으로 잘림)

### 목표 동작

**키보드 내비게이션:**

| 키 | 동작 |
|----|------|
| `↑` / `↓` | 항목 이동 (separator 건너뜀) |
| `Enter` | 선택 실행 |
| `Esc` | 메뉴 닫기 |
| `→` | 서브메뉴 열기 |
| `←` | 서브메뉴 닫기, 상위 메뉴로 |

**위치 보정:**
```
메뉴 우측이 뷰포트 넘어가면 → 왼쪽으로 flip
메뉴 하단이 뷰포트 넘어가면 → 위쪽으로 flip
```

**스타일 표준화:**
```
배경: var(--th-bg-secondary), blur(16px)
border: 1px solid var(--th-border)
border-radius: 8px
box-shadow: 0 8px 32px rgba(0,0,0,0.4)
아이템 height: 28px
아이템 padding: 0 12px
구분선: 1px var(--th-border), margin: 4px 0
danger 항목: color var(--th-error)
disabled 항목: opacity 0.4, pointer-events none
```

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/ui/ContextMenu.tsx` | 신규 공통 컴포넌트 (키보드 내비, 위치 보정, 스타일) |
| 기존 컨텍스트 메뉴 사용처 | `ContextMenu.tsx` 로 교체 |

---

## 구현 순서 (권장)

```
Sprint 1 (P1):
  MX-01 창 엣지 리사이즈    ← 가장 기본, 다른 기능과 독립적
  MX-02 알림 배너            ← uiStore만 건드림, 빠르게 완성 가능

Sprint 2 (P2):
  MX-05 Dock 배지            ← 0.5일, 가성비 높음
  MX-03 Cmd+Tab 전환기       ← AppSwitcher 신규 컴포넌트
  MX-04 창 스냅              ← AppWindow 드래그 로직 연계

Sprint 3 (P3):
  MX-06 초록 버튼 전체화면   ← MX-04 스냅과 함께 구현
  MX-07 컨텍스트 메뉴        ← 리팩토링 범위 큼
```

---

## 관련 파일 요약

| 파일 | 관련 기능 |
|------|----------|
| `src/components/windows/AppWindow.tsx` | MX-01 리사이즈, MX-04 스냅, MX-06 전체화면 |
| `src/store/uiStore.ts` | MX-01 windowSizes, MX-02 toasts, MX-03 switcher, MX-04 snap, MX-06 fullscreen |
| `src/components/desktop/Desktop.tsx` | MX-02 ToastContainer, MX-03 AppSwitcher, MX-04 SnapPreview |
| `src/components/desktop/Dock.tsx` | MX-05 DockBadge |
| `src/components/ui/ContextMenu.tsx` | MX-07 공통 메뉴 |

---

> 진행상황: `docs/progress.md` 에 구현 완료 시 기록
> 설계 변경 사항은 이 문서 업데이트
