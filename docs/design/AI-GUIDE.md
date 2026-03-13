# AgentDesk — AI 개발자 디자인 가이드

> **목적:** AI 에이전트가 AgentDesk UI를 개발·개선할 때 반드시 따라야 할 디자인 원칙
> **참조:** `DESIGN.md` (CSS 변수 전체), `UI-SCREENS.md` (화면·모달 목록)
> **갱신일:** 2026-03-13

---

## 1. 핵심 디자인 컨셉 — macOS Hybrid

AgentDesk는 **"macOS 네이티브 앱 외관 + 터미널 CLI 내부"** 의 이중 레이어 구조다.

```
┌─ Chrome Layer (macOS 네이티브) ──────────────────────────┐
│  borderRadius: 10, backdropFilter: blur(12px)             │
│  macOS 트래픽 라이트 장식 (#ff5f57, #ffbd2e, #27c93f)    │
│                                                            │
│  ┌─ Content Layer (터미널 CLI) ──────────────────────┐   │
│  │  fontFamily: var(--th-font-mono) — 항상 모노      │   │
│  │  borderRadius: 0 — 버튼·인풋·토스트 전부           │   │
│  │  Sigil 언어: › · // $ [action] [STATUS]           │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 레이어별 규칙

| 요소 | Chrome (컨테이너) | Content (내부) |
|------|-----------------|----------------|
| border-radius | **10px** | **0** |
| font | var(--th-font-mono) | var(--th-font-mono) |
| 대상 | 패널, 모달, 카드, 사이드바 | 버튼, 인풋, 토스트, 배지 |
| 예외 | – | 아바타·상태 dot: **50%** |

---

## 2. 색상 — 절대 규칙

```
✅ 사용: var(--th-*) CSS 변수만
✅ 예외 허용: 트래픽 라이트 (#ff5f57, #ffbd2e, #27c93f)
✅ 예외 허용: 위험/성공 상태 hex (#f85149, #3fb950)
❌ 금지: 임의 hex, rgba 직접 사용 (--th-* 변수로 대체)
```

- **Brand color**: Amber `#f59e0b` (`--th-accent`) — active nav, primary CTA, live indicator에만
- **전체 CSS 변수 목록**: `DESIGN.md` 섹션 2 참조

---

## 3. 타이포그래피

```
전역 body: var(--th-font-mono)  (JetBrains Mono)
sans-serif: 금지

크기 체계:
  섹션/라벨:  10px, weight 700, UPPERCASE, letter-spacing
  네비/본문:  12px
  버튼:       11px, weight 600, UPPERCASE
  힌트/메타:  11px, muted
```

---

## 4. Sigil 네비게이션 언어

| 시질 | 의미 | 사용처 |
|------|------|--------|
| `›` | 활성 항목 | 사이드바 active nav item |
| `·` | 비활성 항목 | 사이드바 inactive nav item |
| `//` | 섹션 구분자 | FormField 라벨, 섹션 헤더 |
| `$` | 프롬프트 | 터미널 출력, CLI 입력 |
| `[action]` | 버튼 | 모든 버튼 텍스트 (UPPERCASE) |
| `[STATUS]` | 상태 배지 | 태스크 상태, 에이전트 상태 |
| `[×]` | 닫기 | 모달 close 버튼 |

---

## 5. 컴포넌트 패턴 요약

### 5-1. 리스트 (공통 패턴)
```tsx
// 개별 카드 ❌ → border + divide-y ✅
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)]">
  {items.map(item => (
    <div className="px-4 py-3 hover:bg-[var(--th-hover-bg)] transition-colors"
         style={{ fontFamily: "var(--th-font-mono)" }}>
    </div>
  ))}
</div>
```

### 5-2. Active 상태
```tsx
// 활성 항목: 좌측 amber 테두리
style={{ borderLeft: "2px solid var(--th-accent)", color: "var(--th-accent)" }}
className="bg-[var(--th-active-bg)]"
```

### 5-3. 모달 Chrome
```tsx
// 모달 컨테이너: macOS 앱 느낌
style={{ borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.9)" }}
// 트래픽 라이트 (헤더 좌측 장식)
<div className="flex gap-1.5">
  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
</div>
```

### 5-4. 글래스모피즘 (사이드바·헤더)
```tsx
style={{ backdropFilter: "blur(12px)", background: "var(--th-bg-sidebar)" }}
```

---

## 6. i18n — 필수 규칙

```tsx
// ❌ 하드코딩 금지
<span>프로젝트를 선택하세요</span>

// ✅ t() 패턴 필수
const label = t({ ko: "프로젝트를 선택하세요", en: "Select a project", ja: "プロジェクトを選択", zh: "请选择项目" });
```

지원 언어: `ko` · `en` · `ja` · `zh`

---

## 7. UX 7원칙 (UI 개선 시 체크리스트)

| # | 원칙 | 적용 예 |
|---|------|---------|
| 1 | **Plain language first** | 버튼명은 동사+목적어: "Create Agent" |
| 2 | **One thing at a time** | 모달 하나에 액션 하나 |
| 3 | **Explain the why** | 에러 메시지에 원인 + 해결 방법 |
| 4 | **Empty screens = signposts** | 빈 상태에 안내 문구 + 액션 버튼 |
| 5 | **Progressive disclosure** | 기본 옵션 노출 → "고급 설정" 토글 |
| 6 | **Prevent mistakes** | 삭제 전 ConfirmDialog 필수 |
| 7 | **Always show status** | 에이전트 실행 중 = amber pulsing dot |

---

## 8. 키보드 중심 인터랙션

| 단축키 | 동작 |
|--------|------|
| `⌘+Shift+K` | CommandPalette 열기 (z-index: 10100) |
| `n` | 새 태스크 생성 (태스크 보드) |
| `g d` | 대시보드로 이동 |
| `Esc` | 모달 닫기 |
| `Enter` / `⌘+Enter` | 폼 제출 |

---

## 9. 실시간 상태 표시 패턴

```tsx
// Live 에이전트: amber pulsing dot
<div style={{
  width: 8, height: 8, borderRadius: "50%",
  background: "var(--th-accent)",
  animation: "pulse 1.5s infinite"
}} />

// 상태별 색상
idle:    "--th-border"          // 회색
working: "--th-accent"          // amber (pulse)
break:   "--th-text-muted"      // 뮤트
offline: "--th-danger-border"   // 빨강
done:    "--th-terminal-success" // 초록
```

---

## 10. 테크 스택 & 참조

```
React + TypeScript + Tailwind CSS
상태 관리: useState (App.tsx) → Zustand 마이그레이션 예정
애니메이션: Framer Motion (과도한 모션 지양)
아이콘: SVG inline (외부 아이콘 라이브러리 최소화)
```

| 문서 | 역할 |
|------|------|
| `DESIGN.md` | CSS 변수 전체 + 컴포넌트 구현 레퍼런스 |
| `UI-SCREENS.md` | 13개 화면 + 36개 모달 전체 목록 및 명세 |
| `agent-flow-graph-design.md` | Agent Flow Graph SVG 구현 설계 |
