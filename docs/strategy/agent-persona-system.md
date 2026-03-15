# Agent Persona System — Celebrity Persona Agents

> **Concept**: Assign a real-world celebrity persona to an AI agent at creation time.
> The agent performs tasks using that person's thinking style, communication style, and expertise.

---

## 1. Overview

### Core Idea

```
Generic agent:  "Create a marketing strategy"  →  Generic AI response

Persona agent (Jobs):
  →  "Don't ask what people want. Show them what they want."
     + Simplicity/user-experience-first strategy
```

### Differentiators

- The same task yields a **completely different perspective** depending on **who handles it**
- Delivers the "this agent thinks like X" feeling that clients want
- A unique AgentDesk feature — not available in competing tools

---

## 2. Persona Catalog

### 2-1. Category Classification

| Category | Slug | Description |
|---|---|---|
| **Tech Visionary** | `tech` | Technology/product innovators |
| **Business Leader** | `biz` | Management/strategy experts |
| **Creative** | `creative` | Creatives/designers |
| **Investor** | `investor` | Investment/analysis |
| **Scientist** | `scientist` | Research/logic/analysis |
| **Operator** | `operator` | Execution/operations/efficiency |

### 2-2. Initial Persona List (MVP — 10 personas)

#### Tech Visionary
| Person | ID | Core Traits | Primary Use |
|---|---|---|---|
| Steve Jobs | `jobs` | Simplicity, user experience, "1 out of 1000" | Product planning, UX review |
| Elon Musk | `musk` | 1st Principles, speed, challenging the impossible | Technical specs, innovation strategy |
| Linus Torvalds | `torvalds` | Blunt, code quality, open-source philosophy | Code review, architecture |
| Jeff Bezos | `bezos` | Customer obsession, long-term thinking, Day 1 | Business strategy, documentation |

#### Business Leader
| Person | ID | Core Traits | Primary Use |
|---|---|---|---|
| Warren Buffett | `buffett` | Long-term value, simple truths, risk management | Investment decisions, financial analysis |
| Peter Drucker | `drucker` | Management theory, MBO, effectiveness | Org design, KPIs |

#### Creative
| Person | ID | Core Traits | Primary Use |
|---|---|---|---|
| Jony Ive | `ive` | Materials, form, aesthetic completeness | Design review, branding |
| David Ogilvy | `ogilvy` | Copywriting, consumer psychology, advertising philosophy | Marketing, copywriting |

#### Scientist / Thinker
| Person | ID | Core Traits | Primary Use |
|---|---|---|---|
| Richard Feynman | `feynman` | Simple explanations, first principles, curiosity | Technical docs, educational content |
| Charlie Munger | `munger` | Mental models, inversion, compounding thinking | Decision-making, analysis |

> **Phase 2 expansion**: 20+ additional personas planned. Can be added by community request.

---

## 3. System Architecture

### 3-1. Persona Data Structure

```typescript
type PersonaCategory = "tech" | "biz" | "creative" | "investor" | "scientist" | "operator";

interface AgentPersona {
  id: string;                 // "jobs", "musk", ...
  name: string;               // "Steve Jobs"
  category: PersonaCategory;
  emoji: string;              // Temporary avatar emoji
  tagline: string;            // "Think Different"
  traits: string[];           // ["Simplicity", "User obsession", "Perfectionism"]
  best_for: string[];         // Suitable task types
  system_prompt_core: string; // Core persona prompt (server-side)
  accent_color: string;       // Card/avatar accent color hex
}
```

### 3-2. Agent Type Changes

```typescript
// Added to existing Agent type
interface Agent {
  // ... existing fields
  persona_id?: string;        // null means generic agent
}
```

### 3-3. Persona Prompt Injection

When an agent executes a CLI task, the persona prompt is injected before the system prompt.

```
[Generic agent]
You are a helpful AI assistant working as {role} at {company}.
...

[Persona agent — Jobs]
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

**Principle**: No direct quotation of actual statements. Only abstracted publicly known philosophies and principles are used.

### 3-4. File Structure

```
server/data/personas/
  index.ts              ← Full persona list + metadata
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
    PersonaCatalog.tsx      ← Persona selection catalog (modal/step)
    PersonaCard.tsx         ← Individual persona card
    PersonaBadge.tsx        ← [JOBS], [MUSK] inline badges
    PersonaDetailPanel.tsx  ← Persona section in agent detail
```

---

## 4. UI/UX Design ("Style-First" Principle)

> **"Style-First" principle**: So that users unfamiliar with the celebrity names can easily choose,
> cards show **how they think** as the primary display, with the person's name as secondary text.
> Detailed UX spec: [UI-SCREENS.md — AgentFormModal](../design/UI-SCREENS.md)

### 4-1. Agent Creation Flow Changes

```
Before:  Name → Department → Role → Create

After:   Name → Department → Role
                                ↓
                    [Choose Thinking Style] (optional)
                      ├─ None (generic agent)
                      └─ Select from style catalog
                                ↓
                              Create
```

- Persona step label: "How should this agent **think**?" (optional)
- Can proceed without selecting → creates a generic agent

### 4-2. Style Selection UI — PersonaCatalog ("Style-First" Cards)

Cards show **style keywords as the header**, with the person's name as secondary text:

```
┌─ Choose Thinking Style  ·  Optional ──────────────────────────┐
│                                                                │
│  [All]  [Simplicity]  [1st Principles]  [Value Investing]  [Direct] │
│                                                                │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ Obsessed with        │  │ First principles to   │           │
│  │ simplicity           │  │ make the impossible   │           │
│  │ User experience first│  │ possible              │           │
│  │                      │  │                       │           │
│  │ Steve Jobs style     │  │ Elon Musk style       │           │
│  │ [Product · UX]       │  │ [Tech · Innovation]   │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                │
│  > Selected: Steve Jobs style                                  │
│    Best for product planning, UX review, branding             │
└────────────────────────────────────────────────────────────────┘
```

Card structure (top to bottom):
1. **Style keywords** (large text): 1–2 lines summarizing the core thinking principle
2. **Person style** (secondary text): "Steve Jobs style"
3. **Best for** (tags): `[Product Planning]` `[UX]`

Filter tabs — classified by style trait:
- `[All]`
- `[Simplicity]` — Jobs, Ive
- `[1st Principles]` — Musk, Feynman
- `[Value Investing]` — Buffett, Munger
- `[Direct]` — Torvalds
- `[Management · Goals]` — Bezos, Drucker
- `[Marketing · Copy]` — Ogilvy

**Retro Terminal style:**
- Card: `terminal-card` + per-persona `accent-bar-*`
- Selected: amber border + `>` prompt symbol
- Tags: `[Product Planning]`, `[UX]` — `status-badge` pattern (JetBrains Mono)
- Style keywords: Sora Bold / Person name: JetBrains Mono secondary color
- Filter tabs: `terminal-section-header` style

### 4-3. AgentCard — Style Badge

```
┌─────────────────────────────────────────┐
│  🤖  Claude-Dev                         │
│      Senior Developer                   │
│      [RUNNING]  [Simplicity]            │  ← Style name badge (not person name)
│                                         │
│  "Applying simplicity-obsessed style"   │  ← Style description subtext
└─────────────────────────────────────────┘
```

- Badge text: style name keyword (e.g., `[Simplicity]`, `[1st Principles]`)
- Mouse-over tooltip: "Steve Jobs style — Simplicity, user experience focus"

### 4-4. Agent Detail — PersonaDetailPanel

```
┌─ Thinking Style ──────────────────────────────────────────────┐
│  Obsessed with simplicity                                      │
│  Steve Jobs style  [Product Planning · UX · Branding]         │
│                                                                │
│  PRINCIPLES:                                                   │
│  > Obsess over simplicity                                      │
│  > Prioritize user experience over technology                  │
│  > Execute with perfectionism                                  │
│                                                                │
│  BEST FOR:                                                     │
│  Product Planning  /  UX Review  /  Branding  /  Presentations│
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Dashboard Integration

### 5-1. "Active Personas" Widget

Display persona agent status on the dashboard home:

```
┌─ ACTIVE PERSONAS ──────────────────────────────────────────┐
│  [JOBS]  Claude-Dev      [RUNNING]  3 tasks               │
│  [MUSK]  Gemini-Speed    [IDLE]     0 tasks               │
│  [----]  GPT-Analyst     [RUNNING]  1 task                │
└────────────────────────────────────────────────────────────┘
```

### 5-2. Task Card Persona Display

```
#042  feat: redesign landing page
      Claude-Dev  [JOBS]  ·  [RUNNING]
```

---

## 6. Persona Prompt Design Principles

### Do
- Base on the person's **publicly known philosophy and principles**
- Use only thinking styles verified from books, interviews, and public talks
- Express as abstracted principles (in the form of "think like this")

### Don't
- Copy-paste actual quotes verbatim (copyright issues)
- Include private or personal information
- Depict negative or controversial behavior
- Direct personification like "I am Steve Jobs"

### Prompt Structure Template

```
[PERSONA: {Name} — Thinking Style]
Apply these principles to every task you handle:
1. {Core principle 1}
2. {Core principle 2}
3. {Core principle 3}

When reviewing work: {Review criteria}
When creating content: {Creation criteria}
Communication style: {Tone/style}
```

---

## 7. Implementation Plan

### Phase 1 — Data & Backend (1 week)
- [ ] `server/data/personas/index.ts` — catalog metadata
- [ ] Write MVP 10 persona prompts
- [ ] DB: add `persona_id` column to `agents` table (migration)
- [ ] Reflect `persona_id` in agent create/update API
- [ ] Persona prompt injection logic when generating CLI system prompt
- [ ] `GET /api/personas` endpoint (catalog query)

### Phase 2 — UI Components (1 week)
- [ ] `PersonaBadge.tsx` — `[JOBS]` style inline badge
- [ ] `PersonaCard.tsx` — catalog card (Retro Terminal style)
- [ ] `PersonaCatalog.tsx` — category filter + grid
- [ ] `AgentFormModal.tsx` — add persona selection step
- [ ] `AgentCard.tsx` — connect PersonaBadge
- [ ] `PersonaDetailPanel.tsx` — agent detail section

### Phase 3 — Dashboard (1 week)
- [ ] Dashboard Active Personas widget
- [ ] Task card PersonaBadge display

### Phase 4 — Expansion (later)
- [ ] Add 20+ more personas
- [ ] Custom personas (user-defined prompts)
- [ ] Per-persona task performance statistics

---

## 8. Cautions & Risk Management

| Risk | Mitigation |
|---|---|
| Copyright / likeness rights | Abstracted public philosophy, no direct quotes |
| Damage to person's image | No negative depictions, only based on official statements |
| Excessive personification | Clearly framed as "think in this style", no direct personification |
| Legal issues | Apply the same standards regardless of whether the person is living or deceased |

---

## Related Documents

- Agent management: `src/components/agent-manager/`
- Design system: `docs/design/DESIGN.md` (includes CSS variables)
- Differentiation strategy: `docs/strategy/ui-differentiation-strategy.md`
