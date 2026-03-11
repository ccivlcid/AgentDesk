# Skill Learning History & Prompt Display Design

## 1. Overview

This document defines the design specification for the **Skill Learning History** feature, covering both the **CLI Prompt** (Text UI) and the **Web Dashboard** (Graphical UI).

**Goal:**
- **CLI:** Provide immediate, unobtrusive visibility of active skills in the agent prompt header.
- **Web:** Provide a comprehensive history of what each agent has learned, reinforcing the "memory" aspect of the platform.

> **Design System:** Follows `design-system.md` (Linear/Paperclip style — flat, sharp edges, sans-serif UI + mono for badges/data)

---

## 2. CLI Prompt Design

The CLI prompt sits at the top of the user's interaction. It must be concise and non-intrusive.

### 2.1 Format

```text
[Skills: <Skill-1> <Skill-2> ... <Skill-M>][+N more]
```

### 2.2 Visual Specification (ANSI Colors)

| Element | Text | Color | ANSI Code |
| :--- | :--- | :--- | :--- |
| **Label** | `[Skills:` | Muted (`#6e7681`) | `\x1b[90m` (Bright Black) |
| **Skill** | `react-native` | Green (`#22c55e`) | `\x1b[32m` |
| **Separator** | ` ` (space) | N/A | N/A |
| **Overflow** | `][+3 more]` | Dim (`#6e7681`) | `\x1b[90m` |
| **Closer** | `]` | Muted (`#6e7681`) | `\x1b[90m` |

### 2.3 Behavior

- **Ordering:** Most recently learned/used first.
- **Limit:** Show max 3–4 skills inline to prevent wrapping on standard terminals (80 cols).
- **Empty State:** If no skills, do not show the bracket at all (prefer hidden to reduce noise).

### 2.4 Mockup

```
> [Skills: web-design-guidelines vercel-react-best-practices][+2 more]
> User: Update the button component.
```

---

## 3. Web Dashboard Design

A view/panel to inspect the "Brain" of each agent.

### 3.1 Location

- **Primary:** A tab in `SkillsLibrary` or `AgentDetail` modal.
- **Secondary:** A "Learning History" widget on the main Dashboard.

### 3.2 UI Components

#### History Item (List Row Pattern)

각 학습된 스킬은 `border + divide-y` 패턴의 리스트 행으로 표시한다.

```tsx
// 스킬 히스토리 리스트
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)] overflow-hidden">
  {skills.map(skill => (
    <div key={skill.id}
         className="flex items-center gap-3 px-4 py-3
                    hover:bg-[var(--th-hover-bg)] transition-colors">
      {/* 카테고리 아이콘 */}
      <span className="text-base shrink-0">{skill.categoryIcon}</span>

      {/* 스킬명 + 메타 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono truncate" style={{ color: "var(--th-text)" }}>
          {skill.name}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>
          {skill.provider} · {timeAgo(skill.learnedAt)}
        </p>
      </div>

      {/* 상태 배지 */}
      <span style={{
        background: STATUS_MAP[skill.status].bg,
        color: STATUS_MAP[skill.status].text,
        border: `1px solid ${STATUS_MAP[skill.status].border}`,
        borderRadius: 0,
        padding: "1px 6px",
        fontFamily: "var(--th-font-mono)",
        fontSize: "10px",
        fontWeight: 500,
        textTransform: "uppercase",
      }}>
        {STATUS_MAP[skill.status].label}
      </span>
    </div>
  ))}
</div>
```

#### 상태 배지 매핑

```ts
const STATUS_MAP = {
  active:   { bg: "rgba(34,197,94,0.1)",  text: "#22c55e", border: "rgba(34,197,94,0.3)",  label: "ACTIVE" },
  learning: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "LEARNING" },
  archived: { bg: "rgba(110,118,129,0.1)",text: "#6e7681", border: "rgba(110,118,129,0.3)",label: "ARCHIVED" },
};
```

#### 에이전트별 그룹 레이아웃

```tsx
{agentGroups.map(group => (
  <div key={group.agentId} className="mb-6">
    {/* 그룹 헤더 */}
    <div className="flex items-center gap-2 mb-2">
      <span className="text-base">{group.avatar}</span>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--th-text-muted)" }}>
        {group.agentName}
      </h3>
      <span className="font-mono text-[10px]" style={{ color: "var(--th-text-muted)" }}>
        {group.skills.length}개
      </span>
    </div>
    {/* 스킬 리스트 */}
    <div style={{ border: "1px solid var(--th-border)" }}
         className="divide-y divide-[var(--th-border)] overflow-hidden">
      {group.skills.map(skill => <SkillRow key={skill.id} skill={skill} />)}
    </div>
  </div>
))}
```

---

## 4. Animation — "Brain Upload"

새 스킬이 학습될 때 Web UI에서 간략한 애니메이션을 표시한다.

```css
@keyframes skill-learn {
  0%   { transform: translateY(4px); opacity: 0; }
  100% { transform: translateY(0);   opacity: 1; }
}

.skill-row-enter {
  animation: skill-learn 200ms ease-out;
}
```

- **트리거:** 스킬 상태가 `learning` → `active`로 변경될 때
- **효과:** 행이 아래에서 위로 슬라이드인
- **지속 시간:** 200ms (너무 긴 애니메이션은 피한다)

---

## 5. Empty State

스킬이 없는 에이전트:

```tsx
<div className="flex flex-col items-center justify-center py-12 px-4 text-center"
     style={{ border: "1px dashed var(--th-border)" }}>
  <p className="text-sm font-medium mb-1" style={{ color: "var(--th-text)" }}>
    아직 학습된 스킬이 없어요.
  </p>
  <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
    에이전트가 태스크를 수행하면 관련 스킬이 자동으로 쌓입니다.
  </p>
</div>
```

---

## 6. Assets

- **Skill Icons:** `SkillsLibrary.tsx`의 카테고리 이모지 매핑 사용
- **Agent Avatars:** `AgentAvatar` 컴포넌트 (avatar_url → avatar_emoji fallback)
- **Status Badges:** `design-system.md §5-4` 표준 배지 패턴 사용
