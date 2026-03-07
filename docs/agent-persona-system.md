# Agent Persona System — 유명인 페르소나 에이전트

> **컨셉**: AI 에이전트를 생성할 때 실존 유명인의 페르소나를 부여.
> 에이전트가 해당 인물의 사고방식, 말투, 전문성으로 태스크를 수행한다.

---

## 1. 개요

### 핵심 아이디어

```
일반 에이전트:  "마케팅 전략을 짜줘"  →  일반적인 AI 답변

페르소나 에이전트 (Jobs):
  →  "사람들이 원하는 걸 묻지 마라. 그들이 원하는 걸 보여줘라."
     + 단순함/사용자 경험 중심 전략
```

### 차별화 포인트

- 같은 태스크라도 **누가 처리하느냐**에 따라 완전히 다른 관점 제공
- CEO가 원하는 "이 에이전트는 xx처럼 생각한다"는 느낌을 실현
- AgentDesk만의 독창적 기능 — 경쟁 도구에 없음

---

## 2. 페르소나 카탈로그

### 2-1. 카테고리 분류

| 카테고리 | 슬러그 | 설명 |
|---|---|---|
| **Tech Visionary** | `tech` | 기술/제품 혁신가 |
| **Business Leader** | `biz` | 경영/전략 전문가 |
| **Creative** | `creative` | 크리에이티브/디자인 |
| **Investor** | `investor` | 투자/분석 |
| **Scientist** | `scientist` | 연구/논리/분석 |
| **Operator** | `operator` | 실행/운영/효율 |

### 2-2. 1차 페르소나 목록 (MVP — 10인)

#### Tech Visionary
| 인물 | ID | 핵심 특성 | 주 용도 |
|---|---|---|---|
| Steve Jobs | `jobs` | 단순함, 사용자 경험, "1000개 중 1개" | 제품 기획, UX 리뷰 |
| Elon Musk | `musk` | 1st Principles, 속도, 불가능 도전 | 기술 스펙, 혁신 전략 |
| Linus Torvalds | `torvalds` | 직설적, 코드 품질, 오픈소스 철학 | 코드 리뷰, 아키텍처 |
| Jeff Bezos | `bezos` | 고객 집착, 장기 사고, Day 1 | 비즈니스 전략, 문서 |

#### Business Leader
| 인물 | ID | 핵심 특성 | 주 용도 |
|---|---|---|---|
| Warren Buffett | `buffett` | 장기 가치, 단순한 진실, 리스크 관리 | 투자 판단, 재무 분석 |
| Peter Drucker | `drucker` | 경영 이론, 목표 관리, 효과성 | 조직 설계, KPI |

#### Creative
| 인물 | ID | 핵심 특성 | 주 용도 |
|---|---|---|---|
| Jony Ive | `ive` | 소재, 형태, 미적 완성도 | 디자인 리뷰, 브랜딩 |
| David Ogilvy | `ogilvy` | 카피, 소비자 심리, 광고 철학 | 마케팅, 카피라이팅 |

#### Scientist / Thinker
| 인물 | ID | 핵심 특성 | 주 용도 |
|---|---|---|---|
| Richard Feynman | `feynman` | 단순 설명, 제1원리, 호기심 | 기술 문서, 교육 콘텐츠 |
| Charlie Munger | `munger` | 멘탈 모델, 역발상, 복리 사고 | 의사결정, 분석 |

> **2차 확장**: 20+ 인물 추가 예정. 커뮤니티 요청으로 추가 가능.

---

## 3. 시스템 아키텍처

### 3-1. 페르소나 데이터 구조

```typescript
type PersonaCategory = "tech" | "biz" | "creative" | "investor" | "scientist" | "operator";

interface AgentPersona {
  id: string;                 // "jobs", "musk", ...
  name: string;               // "Steve Jobs"
  category: PersonaCategory;
  emoji: string;              // 임시 아바타 이모지
  sprite_variant: string;     // 전용 픽셀아트 스프라이트 ID
  tagline: string;            // "Think Different"
  traits: string[];           // ["단순함", "사용자 집착", "완벽주의"]
  best_for: string[];         // 적합한 태스크 타입
  system_prompt_core: string; // 핵심 페르소나 프롬프트 (서버 사이드)
  accent_color: string;       // 카드/아바타 포인트 컬러 hex
}
```

### 3-2. Agent 타입 변경

```typescript
// 기존 Agent 타입에 추가
interface Agent {
  // ... 기존 필드
  persona_id?: string;        // null이면 일반 에이전트
}
```

### 3-3. 페르소나 프롬프트 주입 방식

에이전트가 CLI 태스크를 실행할 때 system prompt 앞에 페르소나 프롬프트를 주입한다.

```
[일반 에이전트]
You are a helpful AI assistant working as {role} at {company}.
...

[페르소나 에이전트 — Jobs]
[PERSONA: Steve Jobs — Thinking Style]
Apply these principles to every task:
- Obsess over simplicity. Complexity is failure.
- Think from the user's emotional experience first.
- Say no to 1000 things to focus on one great thing.
- Ask: "Is this insanely great?" before submitting.
- Communicate with clarity and conviction.

You are working as {role} at {company}.
---
...
```

**원칙**: 실제 발언 직접 인용 없음. 공개된 철학/원칙의 추상화만 사용.

### 3-4. 파일 구조

```
server/data/personas/
  index.ts              ← 전체 페르소나 목록 + 메타데이터
  prompts/
    jobs.ts
    musk.ts
    torvalds.ts
    bezos.ts
    buffett.ts
    drucker.ts
    ive.ts
    ogilvy.ts
    feynman.ts
    munger.ts

src/components/
  agent-persona/
    PersonaCatalog.tsx      ← 페르소나 선택 카탈로그 (모달/스텝)
    PersonaCard.tsx         ← 개별 페르소나 카드
    PersonaBadge.tsx        ← [JOBS], [MUSK] 인라인 배지
    PersonaDetailPanel.tsx  ← 에이전트 상세의 페르소나 섹션
```

---

## 4. UI/UX 설계

### 4-1. 에이전트 생성 플로우 변경

```
기존:  이름 → 부서 → 역할 → 생성

변경:  이름 → 부서 → 역할
                        ↓
              [페르소나 선택] (선택 사항)
                ├─ 없음 (일반 에이전트)
                └─ 카탈로그에서 선택
                        ↓
                      생성
```

### 4-2. 페르소나 선택 UI — PersonaCatalog

```
┌─ PERSONA  ·  선택 사항 ────────────────────────────────────┐
│                                                            │
│  [ALL]  [TECH]  [BUSINESS]  [CREATIVE]  [SCIENCE]         │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │          │  │          │  │          │                │
│  │  Steve   │  │  Elon    │  │  Warren  │                │
│  │  Jobs    │  │  Musk    │  │  Buffett │                │
│  │ [TECH]   │  │ [TECH]   │  │ [INVEST] │                │
│  │          │  │          │  │          │                │
│  │"Think    │  │"First    │  │"Long     │                │
│  │Different"│  │Principles│  │ Term"    │                │
│  └──────────┘  └──────────┘  └──────────┘                │
│                                                            │
│  > 선택됨: Steve Jobs                                      │
│    제품 기획, UX 리뷰, 브랜딩에 최적                        │
└────────────────────────────────────────────────────────────┘
```

**Retro Terminal 스타일:**
- 카드: `terminal-card` + 인물별 `accent-bar-*`
- 선택 시: amber border + `>` 프롬프트 기호
- 배지: `[TECH]`, `[INVEST]` — `status-badge` 패턴 (JetBrains Mono)
- 이름: Sora Bold / tagline: JetBrains Mono italic
- 카테고리 탭: `terminal-section-header` 스타일

### 4-3. AgentCard — 페르소나 배지

```
┌─────────────────────────────────────────┐
│  🤖  Claude-Dev                         │
│      Senior Developer                   │
│      [RUNNING]  [JOBS]                  │  ← PersonaBadge
│                                         │
│  "Think Different 스타일 적용 중"        │  ← tagline 서브텍스트
└─────────────────────────────────────────┘
```

### 4-4. 오피스 뷰 — 페르소나 오버레이

에이전트 스프라이트 우상단에 페르소나 이니셜 픽셀 아이콘 표시:
- 작은 원형 배지에 이니셜 (예: "J" = Jobs, "M" = Musk)
- 마우스 오버 시 풀네임 툴팁

### 4-5. 에이전트 상세 — PersonaDetailPanel

```
┌─ PERSONA ──────────────────────────────────────────────────┐
│  Steve Jobs  [TECH VISIONARY]                              │
│  "Think Different"                                         │
│                                                            │
│  TRAITS:                                                   │
│  > 단순함에 집착한다                                        │
│  > 사용자 경험을 기술보다 우선시한다                         │
│  > 완벽주의적으로 실행한다                                   │
│                                                            │
│  BEST FOR:                                                 │
│  제품 기획  /  UX 리뷰  /  브랜딩  /  프레젠테이션          │
└────────────────────────────────────────────────────────────┘
```

---

## 5. 대시보드 통합

### 5-1. "Active Personas" 위젯

대시보드 홈에 페르소나 에이전트 현황 표시:

```
┌─ ACTIVE PERSONAS ──────────────────────────────────────────┐
│  [JOBS]  Claude-Dev      [RUNNING]  3 tasks               │
│  [MUSK]  Gemini-Speed    [IDLE]     0 tasks               │
│  [----]  GPT-Analyst     [RUNNING]  1 task                │
└────────────────────────────────────────────────────────────┘
```

### 5-2. 태스크 카드 페르소나 표시

```
#042  feat: redesign landing page
      Claude-Dev  [JOBS]  ·  [RUNNING]
```

---

## 6. 페르소나 프롬프트 설계 원칙

### 해야 할 것
- 인물의 **공개적으로 알려진 철학과 원칙** 기반
- 저서, 인터뷰, 공개 강연에서 확인된 사고방식만 사용
- 추상화된 원칙으로 표현 ("이렇게 생각하라" 형태)

### 하지 말아야 할 것
- 실제 발언 그대로 복붙 (저작권 이슈)
- 사생활, 개인 신상 관련 내용
- 부정적/논란 있는 행동 묘사
- "나는 스티브 잡스입니다" 식의 직접 의인화

### 프롬프트 구조 템플릿

```
[PERSONA: {Name} — Thinking Style]
Apply these principles to every task you handle:
1. {핵심 원칙 1}
2. {핵심 원칙 2}
3. {핵심 원칙 3}

When reviewing work: {검토 기준}
When creating content: {창작 기준}
Communication style: {말투/어조}
```

---

## 7. 구현 계획

### Phase 1 — 데이터 & 백엔드 (1주)
- [ ] `server/data/personas/index.ts` — 카탈로그 메타데이터
- [ ] MVP 10개 페르소나 프롬프트 작성
- [ ] DB: `agents` 테이블에 `persona_id` 컬럼 추가 (마이그레이션)
- [ ] 에이전트 생성/수정 API에 `persona_id` 반영
- [ ] CLI system prompt 생성 시 페르소나 프롬프트 주입 로직
- [ ] `GET /api/personas` 엔드포인트 (카탈로그 조회)

### Phase 2 — UI 컴포넌트 (1주)
- [ ] `PersonaBadge.tsx` — `[JOBS]` 스타일 인라인 배지
- [ ] `PersonaCard.tsx` — 카탈로그용 카드 (Retro Terminal 스타일)
- [ ] `PersonaCatalog.tsx` — 카테고리 필터 + 그리드
- [ ] `AgentFormModal.tsx` — 페르소나 선택 스텝 추가
- [ ] `AgentCard.tsx` — PersonaBadge 연결
- [ ] `PersonaDetailPanel.tsx` — 에이전트 상세 섹션

### Phase 3 — 오피스 & 대시보드 (1주)
- [ ] 오피스 뷰 에이전트 스프라이트 페르소나 이니셜 오버레이
- [ ] 대시보드 Active Personas 위젯
- [ ] 태스크 카드 PersonaBadge 표시

### Phase 4 — 확장 (추후)
- [ ] 페르소나 20+ 추가
- [ ] 커스텀 페르소나 (사용자 정의 프롬프트)
- [ ] 페르소나별 태스크 성과 통계

---

## 8. 주의사항 & 리스크 관리

| 리스크 | 대응 방안 |
|---|---|
| 저작권/초상권 | 공개 철학 추상화, 직접 인용 없음 |
| 인물 이미지 훼손 | 부정적 묘사 배제, 공식 발언 기반만 |
| 과도한 의인화 | "이 스타일로 생각한다" 명확히, 직접 의인화 없음 |
| 픽셀아트 초상 | 실제 외모 모방 없음, 직업/특성 기반 추상 캐릭터 |
| 법적 이슈 | 고인/생존인 구분 없이 동일 기준 적용 |

---

## 참고 문서

- 에이전트 관리: `src/components/agent-manager/`
- 디자인 시스템: `docs/design-retro-terminal-overhaul.md`
- 차별화 전략: `docs/ui-differentiation-strategy.md`
