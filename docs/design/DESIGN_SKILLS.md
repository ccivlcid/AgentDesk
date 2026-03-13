# Skill Learning History & UI Design

> **기준:** 현재 프로젝트의 스킬 라이브러리·에이전트 학습 히스토리·CLI 프롬프트 표시 방식
> **갱신일:** 2026-03-12

---

## 1. 개요

- **스킬 학습 히스토리:** 에이전트별로 학습된 스킬을 웹에서 조회·관리.
- **CLI 쪽:** 에이전트 프롬프트 헤더에 활성 스킬을 간단히 노출 (구현 시 텍스트/ANSI 규격).
- **디자인 시스템:** `DESIGN.md`·`DESIGN.md`의 CSS 변수 및 컴포넌트 패턴 준수.

---

## 2. 웹 UI (현재 프로젝트 패턴)

### 2-1. 위치

- **SkillsLibrary** (`src/components/SkillsLibrary.tsx`): 스킬 목록·카테고리·학습.
- **AgentDetail** 등에서 스킬/학습 이력 탭 또는 패널로 진입.

### 2-2. 리스트 행 패턴

프로젝트 공통 리스트 패턴 사용:

- 컨테이너: `border: 1px solid var(--th-border)`, `divide-y divide-[var(--th-border)]`.
- 각 행: `hover:bg-[var(--th-hover-bg)]`, `transition-colors`.
- 텍스트: `--th-text-primary` (제목), `--th-text-muted` (메타). 폰트 `var(--th-font-mono)`.

```tsx
// 예시 구조
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)] overflow-hidden">
  {items.map((item) => (
    <div
      key={item.id}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--th-hover-bg)] transition-colors"
      style={{ fontFamily: "var(--th-font-mono)" }}
    >
      <span className="shrink-0">{/* 아이콘/카테고리 */}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--th-text-primary)" }}>{item.name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>{item.meta}</p>
      </div>
      {/* 상태 배지 */}
    </div>
  ))}
</div>
```

### 2-3. 상태 배지

- `DESIGN.md`·`DESIGN.md`의 배지 규칙 따름.
- `borderRadius: 0`, `fontFamily: var(--th-font-mono)`, `fontSize: 10px`, `fontWeight: 500` 또는 `600`, `textTransform: uppercase`.
- 상태별 배경/테두리/글자색: 성공(초록), 학습중(앰버), 오류(빨강), 비활성(뮤트) 등 `--th-*` 또는 동일한 rgba 패턴.

### 2-4. 에이전트별 그룹

- 에이전트별로 그룹 헤더(아바타·이름) + 위 리스트 패턴으로 스킬 목록 표시.
- 그룹 헤더: `--th-text-muted`, 11px, uppercase 등 섹션 레이블 스타일.

### 2-5. 빈 상태

- 스킬이 없을 때: 안내 문구 + 보조 설명. `--th-text-primary`, `--th-text-muted`. 테두리는 `1px dashed var(--th-border)` 등으로 구분 가능.

---

## 3. CLI 프롬프트 (스펙)

에이전트 프롬프트 상단에 활성 스킬을 텍스트로 노출할 때 권장 형식:

- **형식:** `[Skills: <Skill-1> <Skill-2> ...][+N more]`
- **색:** 라벨/괄호는 muted, 스킬명은 초록(`--th-text-code` / #22c55e), overflow `+N more`는 muted.
- **동작:** 최근 학습/사용 순, 한 줄에 3~4개까지 노출 후 나머지는 `+N more`. 스킬 없으면 괄호 블록 비표시.

---

## 4. 애니메이션

- 새 스킬 학습 완료 시 웹에서 행이 추가되는 경우: 짧은 등장 애니메이션(예: 200ms, translateY + opacity) 적용 가능. 과도한 모션은 지양.

---

## 5. 참조

- **컴포넌트:** `SkillsLibrary.tsx`, `SkillHistoryPanel.tsx`, `AgentAvatar`, `Button`, `Modal`.
- **스타일:** `DESIGN.md` (색·폰트), `DESIGN.md` (버튼·입력·리스트·배지).
