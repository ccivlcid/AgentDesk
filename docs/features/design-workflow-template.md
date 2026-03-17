# Design Workflow Template — Feature Spec

> Status: PLANNED
> Author: AI-generated spec for developer implementation
> Last updated: 2026-03-17

---

## 1. Overview

"Design Workflow Template"은 디자인 작업에 특화된 워크플로우 프리셋이다.
Figma URL → 분석 → 컴포넌트 설계 → 코드 구현 → 리뷰의 표준 단계를
미리 구성된 노드 체인으로 제공한다.

**목표**: 워크플로우 빌더에서 "Design" 카테고리 템플릿 선택 → 즉시 에이전트 체인 생성.

---

## 2. 워크플로우 노드 구성

### 기본 4단계 체인

```
[DESIGN_ANALYZE] → [COMPONENT_DESIGN] → [IMPLEMENT] → [REVIEW]
```

#### 노드 1: Design Analyze
```json
{
  "id": "design-analyze",
  "type": "agent",
  "label": "디자인 분석",
  "label_en": "Design Analysis",
  "agent_role": "design_analyst",
  "task_type": "design",
  "prompt_template": "다음 Figma 디자인을 분석하세요:\n\n{{figma_context}}\n\n분석 항목:\n1. 컴포넌트 목록\n2. 색상 토큰\n3. 타이포그래피\n4. 레이아웃 패턴\n5. 인터랙션 스펙",
  "output_key": "design_spec",
  "handoff_condition": "on_success"
}
```

#### 노드 2: Component Design
```json
{
  "id": "component-design",
  "type": "agent",
  "label": "컴포넌트 설계",
  "label_en": "Component Design",
  "agent_role": "architect",
  "task_type": "design",
  "prompt_template": "이전 디자인 분석 결과를 바탕으로 React 컴포넌트 구조를 설계하세요:\n\n{{design_spec}}\n\n설계 항목:\n1. 컴포넌트 트리\n2. Props 인터페이스\n3. 상태 관리 방식\n4. CSS 변수 매핑 (--th-* 시스템)",
  "output_key": "component_spec",
  "handoff_condition": "on_success"
}
```

#### 노드 3: Implement
```json
{
  "id": "implement",
  "type": "agent",
  "label": "코드 구현",
  "label_en": "Implementation",
  "agent_role": "developer",
  "task_type": "development",
  "prompt_template": "설계 스펙에 따라 컴포넌트를 구현하세요:\n\n{{component_spec}}\n\n구현 조건:\n- React 19 + TypeScript\n- --th-* CSS 변수 사용 (하드코딩 색상 금지)\n- Tailwind 최소화, 인라인 style 우선\n- framer-motion 애니메이션 (duration ≤ 0.2s, linear easing)",
  "output_key": "implementation",
  "handoff_condition": "on_success"
}
```

#### 노드 4: Review
```json
{
  "id": "review",
  "type": "agent",
  "label": "코드 리뷰",
  "label_en": "Code Review",
  "agent_role": "reviewer",
  "task_type": "analysis",
  "prompt_template": "구현된 코드를 검토하세요:\n\n{{implementation}}\n\n검토 항목:\n1. 디자인 스펙 충족 여부\n2. 타입 안전성\n3. 접근성 (aria-label 등)\n4. 성능 (불필요한 re-render)\n5. CSS 변수 일관성",
  "handoff_condition": "always"
}
```

---

## 3. 템플릿 JSON 스키마

워크플로우 템플릿은 `workflow_templates` 테이블에 저장된다.
(`docs/features/knowledge-base-integrations.md` 삭제됨 → 현재 참조 테이블: `project_templates`)

### composition_templates 스키마 활용

기존 `agent_composition_templates` 테이블을 재사용하거나,
`project_templates` 테이블의 `workflow_json` 컬럼에 직접 저장:

```typescript
// 템플릿 JSON 구조
interface DesignWorkflowTemplate {
  id: string;                  // "design-workflow-v1"
  name: string;                // "Design Workflow"
  name_ko: string;             // "디자인 워크플로우"
  category: "design";
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  figma_required: boolean;     // true → Figma URL 입력 필수
  agent_roles: string[];       // ["design_analyst", "architect", "developer", "reviewer"]
}
```

### 전체 템플릿 JSON 예시

```json
{
  "id": "design-workflow-v1",
  "name": "Design Workflow",
  "name_ko": "디자인 워크플로우",
  "category": "design",
  "description": "Figma → 분석 → 설계 → 구현 → 리뷰 표준 체인",
  "figma_required": true,
  "nodes": [
    {
      "id": "n1",
      "type": "agent",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "디자인 분석",
        "task_type": "design",
        "prompt_key": "design_analyze"
      }
    },
    {
      "id": "n2",
      "type": "agent",
      "position": { "x": 350, "y": 200 },
      "data": {
        "label": "컴포넌트 설계",
        "task_type": "design",
        "prompt_key": "component_design"
      }
    },
    {
      "id": "n3",
      "type": "agent",
      "position": { "x": 600, "y": 200 },
      "data": {
        "label": "코드 구현",
        "task_type": "development",
        "prompt_key": "implement"
      }
    },
    {
      "id": "n4",
      "type": "agent",
      "position": { "x": 850, "y": 200 },
      "data": {
        "label": "코드 리뷰",
        "task_type": "analysis",
        "prompt_key": "review"
      }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "n1", "target": "n2", "type": "handoff", "data": { "condition": "on_success" } },
    { "id": "e2-3", "source": "n2", "target": "n3", "type": "handoff", "data": { "condition": "on_success" } },
    { "id": "e3-4", "source": "n3", "target": "n4", "type": "handoff", "data": { "condition": "always" } }
  ]
}
```

---

## 4. 구현 위치

### 4-1. 프리셋 데이터 파일

`src/components/workflow-builder/presets/design-workflow.ts`:

```typescript
export const DESIGN_WORKFLOW_PRESET = {
  // 위 JSON 구조
};
```

### 4-2. WorkflowBuilder 템플릿 선택 UI

`src/components/workflow-builder/WorkflowBuilder.tsx` 또는 템플릿 선택 모달:

- "템플릿으로 시작" 버튼
- 카테고리 필터: General / Design / Analysis / Development
- 선택 시 preset 노드 + 엣지 로드

### 4-3. 태스크 생성 연동

워크플로우 빌더에서 "실행" 시 각 노드가 `CreateTaskModal`의
`workflow_pack_key` 또는 `workflow_meta_json` 을 통해 태스크 생성.

Figma URL이 있는 경우 첫 번째 노드(디자인 분석)의 태스크에 `figma_url` 자동 첨부:

```typescript
// WorkflowBuilder 실행 로직에서
nodes.forEach((node, i) => {
  createTask({
    title: node.data.label,
    task_type: node.data.task_type,
    figma_url: i === 0 && workflowFigmaUrl ? workflowFigmaUrl : null,
    handoff_to_agent_id: nodes[i + 1]?.data.agent_id ?? null,
    handoff_condition: edges[i]?.data.condition ?? "on_success",
  });
});
```

---

## 5. UI 디자인 스펙

> **필수**: `--th-*` CSS 변수만 사용. 하드코딩 색상 금지.
> **폰트**: `fontFamily: "var(--th-font-mono)"` 전역 적용.
> **Border Radius**: 컨테이너 `borderRadius: 10`, 버튼/입력 `borderRadius: 0`.

### 5-1. 워크플로우 빌더 — 템플릿 선택 버튼

WorkflowBuilder 툴바에 추가:

```tsx
// 기존 "새 노드 추가" 버튼 옆에 배치
<button
  type="button"
  onClick={() => setTemplatePickerOpen(true)}
  style={{
    fontFamily: "var(--th-font-mono)",
    fontSize: "10px", fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 0,
    border: "1px solid var(--th-border)",
    background: "var(--th-bg-elevated)",
    color: "var(--th-text-muted)",
    cursor: "pointer",
    letterSpacing: "0.04em",
  }}
>
  // 템플릿으로 시작
</button>
```

### 5-2. 템플릿 선택 모달

크기: `width: 480px`, `borderRadius: 10`, `background: "var(--th-bg-elevated)"`, `border: "1px solid var(--th-border)"`.

**카테고리 필터 탭** (WorkflowBuilder 스타일과 동일):

```tsx
// 카테고리 탭: General / Design / Analysis / Development
// 활성 탭: background "var(--th-accent)", color "var(--th-bg-primary)"
// 비활성 탭: color "var(--th-text-muted)", borderRadius: 0
```

**템플릿 카드**:

```tsx
<div
  style={{
    padding: "10px 12px",
    border: "1px solid var(--th-border)",
    background: "var(--th-bg-surface)",
    borderRadius: 0,
    cursor: "pointer",
    // 호버 시: border-color → "var(--th-border-accent)", background → "rgba(245,158,11,0.05)"
  }}
>
  {/* 아이콘 + 이름 */}
  <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", fontWeight: 700, color: "var(--th-text-primary)" }}>
    🎨 Design Workflow
  </div>
  {/* 설명 */}
  <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "var(--th-text-muted)", marginTop: 3 }}>
    Figma → 분석 → 설계 → 구현 → 리뷰
  </div>
  {/* 노드 수 배지 */}
  <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
    {["분석", "설계", "구현", "리뷰"].map(label => (
      <span key={label} style={{
        fontFamily: "var(--th-font-mono)", fontSize: "8px",
        padding: "1px 5px", borderRadius: 0,
        border: "1px solid var(--th-border)",
        color: "var(--th-text-muted)",
      }}>{label}</span>
    ))}
  </div>
</div>
```

**선택 버튼** (모달 하단):

```tsx
<button
  style={{
    fontFamily: "var(--th-font-mono)", fontSize: "11px", fontWeight: 700,
    padding: "7px 20px", borderRadius: 0,
    background: "var(--th-accent)", color: "var(--th-bg-primary)",
    border: "none", cursor: "pointer",
  }}
>
  이 템플릿 사용
</button>
```

### 5-3. 워크플로우 실행 모달 — Figma URL 입력

`figma_required: true`인 템플릿 실행 시 모달에 Figma URL 입력 필드 추가:

```tsx
<div style={{ padding: "10px 16px", borderTop: "1px solid var(--th-border)" }}>
  <div style={{
    fontFamily: "var(--th-font-mono)", fontSize: "9px",
    color: "var(--th-accent)", letterSpacing: "0.08em",
    textTransform: "uppercase", marginBottom: 6,
  }}>
    // figma design url
  </div>
  <input
    type="url"
    placeholder="https://www.figma.com/design/..."
    style={{
      fontFamily: "var(--th-font-mono)", width: "100%", fontSize: "10px",
      padding: "5px 8px",
      background: "var(--th-bg-elevated)",
      border: "1px solid var(--th-border)",
      borderRadius: 0,
      color: "var(--th-text-primary)",
    }}
  />
</div>
```

---

## 7. 에이전트 역할 매핑

디자인 워크플로우용 에이전트 역할 권장:

| 노드 | 권장 에이전트 역할 | cli_provider | 설명 |
|------|-------------------|-------------|------|
| 디자인 분석 | Design Analyst | claude / api | Figma 컨텍스트 해석, 디자인 토큰 추출 |
| 컴포넌트 설계 | Architect | claude / api | 컴포넌트 구조 설계, 인터페이스 정의 |
| 코드 구현 | Developer | claude / api | React 컴포넌트 실제 코드 작성 |
| 코드 리뷰 | Reviewer | claude / api | 코드 품질 검토 및 개선 제안 |

---

## 8. 구현 체크리스트

```
[ ] src/components/workflow-builder/presets/design-workflow.ts
    - DESIGN_WORKFLOW_PRESET 정의

[ ] src/components/workflow-builder/WorkflowBuilder.tsx
    - 템플릿 선택 UI (카테고리 필터 + 카드 목록)
    - 선택 시 preset 로드 함수

[ ] src/components/workflow-builder/WbRunModal.tsx (또는 신규)
    - 워크플로우 실행 모달에 Figma URL 입력 필드 추가 (figma_required: true 일 때)

[ ] server/modules/routes/ops/composition-templates.ts
    - Design 카테고리 프리셋을 DB 시드 데이터로 추가 (선택적)

[ ] docs/features/figma-integration.md 연동
    - figma_url → execution-run.ts 주입 흐름과 연결
```

---

## 9. 확장 가능성

- **Design System Sync**: Figma Variables API로 CSS 토큰 자동 동기화
- **Component Library 연동**: Code Connect로 기존 컴포넌트 재사용 우선
- **Storybook Export**: 구현된 컴포넌트를 Storybook 스토리로 자동 생성
- **다국어 변형**: locale별 텍스트 레이어 자동 적용
