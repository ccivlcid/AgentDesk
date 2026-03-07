# AgentDesk UI/UX Design Guide

> **Theme:** FM2024 Management Sim × Retro Terminal × Pixel Art Office
> **Concept:** You are a CEO managing an AI agent empire — like a Football Manager for autonomous agents.

---

## 1. Design Philosophy

AgentDesk uses a **3-layer design system**:

| Layer | Style | Covers |
|---|---|---|
| Layer 1 | FM2024 Management UI | Sidebar, dashboard, agent cards, task board |
| Layer 2 | Retro Terminal | Task execution viewer, chat, CLI logs |
| Layer 3 | Pixel Art Office | Building cross-section canvas (PixiJS) |

The **Office View screen** wraps the pixel art canvas in an FM2024 Match View layout — left department panel, center canvas, right agent panel.

---

## 2. Color System

### FM2024 Dark Palette (Primary)

| Variable | Hex | Usage |
|---|---|---|
| `--th-bg-primary` | `#0f1117` | Main background (FM dark navy-black) |
| `--th-bg-secondary` | `#161b22` | Panel backgrounds |
| `--th-bg-surface` | `#1c2128` | Card / section backgrounds |
| `--th-bg-surface-hover` | `#21262d` | Hover states |
| `--th-bg-elevated` | `#21262d` | Dropdowns, modals |
| `--th-border` | `#30363d` | Default borders |
| `--th-border-strong` | `#444c56` | Strong dividers |

### Text

| Variable | Hex | Usage |
|---|---|---|
| `--th-text-primary` | `#e6edf3` | Main text |
| `--th-text-secondary` | `#8b949e` | Secondary / labels |
| `--th-text-muted` | `#6e7681` | Hints, disabled |
| `--th-text-heading` | `#f0f6fc` | Headings |
| `--th-text-accent` | `#f59e0b` | Amber emphasis |
| `--th-text-code` | `#79c0ff` | Terminal / code text |

### Accent — Amber (AgentDesk Brand)

FM2024 uses green (club color). AgentDesk uses **Amber** as the primary accent.

| Variable | Hex | Usage |
|---|---|---|
| `--th-accent` | `#f59e0b` | Primary accent (Amber) |
| `--th-accent-dim` | `#d97706` | Hover / active |
| `--th-accent-glow` | `rgba(245,158,11,0.12)` | Glow backgrounds |

### Status Colors (FM Attribute System)

| Variable | Hex | Range | Meaning |
|---|---|---|---|
| `--th-attr-elite` | `#22c55e` | 80–100 | Elite / running |
| `--th-attr-good` | `#86efac` | 60–79 | Good / idle |
| `--th-attr-avg` | `#fbbf24` | 40–59 | Average / paused |
| `--th-attr-poor` | `#f87171` | 0–39 | Poor / error |

### Task Status Colors (Semantic)

| Status | Color | Hex |
|---|---|---|
| Inbox | Blue (info) | `#58a6ff` |
| Planned | Blue | `#58a6ff` |
| In Progress / Running | Green | `#22c55e` |
| Review | Amber | `#f59e0b` |
| Done | Green (dim) | `#3fb950` |
| Pending / Paused | Amber | `#f59e0b` |
| Error / Cancelled | Red | `#f85149` |

---

## 3. Typography

Three fonts are used, each for a distinct purpose:

| Font | Variable | Usage |
|---|---|---|
| Sora | `--th-font-display` | Headings, agent names, section titles |
| IBM Plex Sans KR | `--th-font-body` | Body text, descriptions |
| JetBrains Mono | `--th-font-mono` | Stats, badges, terminal output, labels |

### Scale

| Role | Font | Weight | Size |
|---|---|---|---|
| Page title | Sora | 700 | 1.5rem |
| Section heading | Sora | 600 | 1.125rem |
| Card title | Sora | 600 | 0.9375rem |
| Body text | IBM Plex Sans KR | 400 | 0.875rem |
| Description | IBM Plex Sans KR | 400 | 0.8125rem |
| Stat label | JetBrains Mono | 500 | 0.75rem |
| Status badge | JetBrains Mono | 500 | 0.6875rem (uppercase) |
| Terminal output | JetBrains Mono | 400 | 0.8125rem |

---

## 4. Components

### 4-1. FM Panel (`.fm-panel`)

All content is organized in panels. The core unit of the FM2024 UI.

```
┌─ Amber left-bar ──────────────────────────────┐
│  SECTION HEADING                               │
├───────────────────────────────────────────────┤
│  [Tab A]  [Tab B]  [Tab C]                    │
├───────────────────────────────────────────────┤
│  Content (table / card grid / chart)          │
└───────────────────────────────────────────────┘

border-left: 3px solid #f59e0b  (section header)
background: var(--th-panel-bg)
border: 1px solid var(--th-panel-border)
border-radius: 4px
```

### 4-2. Agent Card (FM Player Card Style)

```
┌──────────────────────────────────────────────┐
│  [avatar]  Agent Name        [JOBS] [RUN]    │
│  Role · Department · N tasks active          │
├──────────────────────────────────────────────┤
│  ATTRIBUTES                                  │
│  Speed    ████████████░░░░  82               │
│  Focus    ██████████████░░  91               │
│  Reliability ████████░░░░░  57              │
├──────────────────────────────────────────────┤
│  Tasks: 142  XP: 4,820  This week: 8        │
└──────────────────────────────────────────────┘
```

Attribute bar colors: 80+ green (`#22c55e`), 60–79 amber (`#f59e0b`), 40–59 yellow, 0–39 red (`#f87171`).

### 4-3. Status Badges (`.status-badge`)

FM W/D/L form guide style — color-coded boxes.

```
[RUN]   bg: rgba(34,197,94,0.1)  text: #22c55e  (animated pulse)
[QUEUE] bg: rgba(88,166,255,0.12) text: #58a6ff
[PAUSE] bg: rgba(245,158,11,0.12) text: #f59e0b
[ERROR] bg: rgba(248,81,73,0.12)  text: #f85149
[DONE]  bg: rgba(63,185,80,0.12)  text: #3fb950

font: JetBrains Mono 500, 0.65rem, uppercase, letter-spacing: 0.06em
border-radius: 2px, padding: 1px 6px
```

### 4-4. Data Table (FM Squad List Style)

```
Header row:
  bg: var(--th-bg-secondary)
  font: JetBrains Mono 500, 0.7rem, uppercase, letter-spacing: 0.08em
  color: #6e7681

Data row:
  bg: transparent, border-bottom: 1px solid #21262d
  hover: bg #1c2128

Selected row:
  bg: #21262d, border-left: 2px solid #f59e0b
```

### 4-5. Buttons

```
Primary:   bg #f59e0b  text #000  border-radius 4px  hover bg #d97706
Secondary: bg transparent  text #8b949e  border 1px solid #30363d
           hover: bg #21262d  text #e6edf3
Ghost:     bg transparent  text #6e7681  hover: text #e6edf3  bg #21262d
Danger:    text #f85149  border rgba(248,81,73,0.3)  hover bg rgba(248,81,73,0.1)
```

### 4-6. Terminal Zone (`.terminal-zone`)

Task execution viewer, CLI logs, chat input use a distinct terminal style:

```css
background: #010409;         /* near-black */
border: 1px solid #30363d;
border-radius: 4px;
font-family: var(--th-font-mono);

prompt color:  #f59e0b  (amber >)
success color: #3fb950  ([OK])
error color:   #f85149  ([ERROR])
info color:    #58a6ff  ([INFO])
muted:         #6e7681  (timestamps, paths)
```

---

## 5. Office View Screen — FM Match View Layout

The Office View page wraps the PixiJS canvas in a **3-column FM Match View** structure.

```
┌─ TOOLBAR (44px) ──────────────────────────────────────────────────────┐
│  ▶ Office View  ·  AgentDesk HQ   [Season ▾]  [Style ▾]  [Zoom: 1x]  │
├──────────────────┬───────────────────────────────┬────────────────────┤
│                  │                               │                    │
│  LEFT PANEL      │   PIXI CANVAS                 │  RIGHT PANEL       │
│  w: 180px fixed  │   flex-1, min-w: 380px        │  w: 240px fixed    │
│                  │   bg: #010409                 │                    │
│  Dept list       │   Pixel art building          │  Agent / Dept info │
│  CLI usage       │   (cross-section tower)       │  Attribute bars    │
│                  │                               │  Quick actions     │
├──────────────────┴───────────────────────────────┴────────────────────┤
│  ACTION BAR (32px): [▶ RUN]  [STATS]  [ALERTS]   CLI: 42.3k / 1M     │
└───────────────────────────────────────────────────────────────────────┘
```

### Left Panel — Department List

- Each department item: name (Sora 500, 0.8rem) + "N agents · N running" (mono 0.65rem) + 2px activity bar
- Active dept: `border-left: 3px solid #f59e0b`, `background: var(--th-bg-surface)`
- CLI usage section at bottom: token count in amber mono + usage bar + REFRESH button

### Right Panel — Agent / Dept Detail

**Empty state**: `$ select an agent or dept` terminal-style message

**Agent selected**: name + role + status badge + 3× AttributeBar (Speed / Focus / Reliability) + active task mini-list + [VIEW PROFILE] / [ASSIGN TASK] buttons

**Dept selected**: dept name + stats (agents, running, tasks done) + agent mini-list + [VIEW DEPT] button

### FM Mapping

| FM Element | Office View |
|---|---|
| Bench / Formation panel (left) | Department list panel |
| Match pitch (center) | Pixel art building canvas |
| Tactics / Player detail (right) | Agent profile panel |
| Match toolbar | Office toolbar |
| In-match action bar | Bottom action bar |

---

## 6. Layout — Global Shell

```
┌──────┬──────────────────────────────────────────┐
│      │  [Header Bar — 44px]                     │
│      ├──────────────────────────────────────────┤
│Side  │                                          │
│bar   │  Main Content Area                       │
│220px │  (view-specific layout)                  │
│      │                                          │
└──────┴──────────────────────────────────────────┘
```

- **Sidebar**: 220px, `bg: #0d1117`, amber active state with left-border
- **Header**: 44px, `bg: #0f1117`, `border-bottom: 1px solid #30363d`

---

## 7. Pixel Art Office — Canvas

- Renderer: **PixiJS** (procedural graphics, no sprites for furniture/rooms)
- Style: pixel art cross-section building tower
- Canvas bg: `#010409` (terminal black, makes the building pop)
- Amber `3px` border on left / right / top = "cross-section cut" visual
- Floors: CEO penthouse → department floors → B1 break room
- Elevator: right-side shaft, animated car

Agent sprites:
- Source: `/public/sprites/{id}-D-1.png`
- Rendering: `image-rendering: pixelated`
- Status glow: 4px aura (green = running, amber = idle, red = error)
- Persona badge: `[JOBS]` etc. — pixel art badge, top-right of sprite

---

## 8. Animation & Motion

| Name | Context | Description |
|---|---|---|
| `agent-bounce` | Office canvas | ±3px Y offset when running |
| Status badge pulse | `[RUN]` badge | Green glow pulse, 2s loop |
| Terminal cursor blink | Terminal zones | `▋` amber, 1s step-end |
| Boot sequence | AppLoadingScreen | Framer Motion stagger 0.12s each line |
| Elevator | Office canvas | 8px/tick scroll between floors |
| Window flicker | Exterior walls | Random on/off every 3–8s |
| Antenna LED | Roof | 3-frame blink, 50-tick cycle |
| Seasonal particles | Canvas overlay | Snow / cherry blossoms (season-based) |

---

## 9. Boot Sequence

```
AgentDesk
━━━━━━━━━━━━━━━━━━━━━━━━━━
> Initializing agent runtime...    [OK]
> Loading departments...           [OK]
> Connecting to CLI...             [OK]
> Starting office view...          [OK]
━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready.

bg: #0f1117  font: JetBrains Mono
text: #e6edf3 / [OK]: #3fb950 / >: #f59e0b / Ready.: #f59e0b
Framer Motion staggerChildren: 0.12s, duration: 0.3s, easing: linear
```

---

## 10. FM2024 → AgentDesk Mapping Reference

| FM2024 | AgentDesk | UI Pattern |
|---|---|---|
| Squad (player list) | Agent roster | Table list |
| Player profile | Agent profile | Card + attribute bars |
| Fixtures (match schedule) | Task board | List + status badges |
| Attributes (1–20) | Skills / XP | 0–100 progress bars |
| Manager = you | CEO = you | Same |
| Star player | Persona agent | `[JOBS]` badge |
| Training | Rules/Memory library | Data grid |
| Match result | Task completion report | Result panel |
| Tactics | Workflow pack | Preset selection |
| Transfer | Add agent | Creation modal |
| Inbox | Notification center | Feed |
| Match Engine | Task execution viewer | **Terminal style** |
| Match View layout | Office View screen | **3-column FM wrapper** |
