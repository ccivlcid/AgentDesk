# Office View — Cross-Section Tower Redesign

> **Concept**: Building cross-section view. CEO penthouse at top, department floors in middle, basement break room at bottom.
> **Style**: Pixel art preserved. Layout completely changed from flat grid to vertical tower.

---

## 1. Layout Architecture

### Overall Structure (top → bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  PENTHOUSE  (CEO Office)                           [Floor: TOP]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  FLOOR N    [Department A]   3 agent slots                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │ hallway
│  FLOOR N-1  [Department B]   3 agent slots                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │ hallway
│  ...        [Department ...]                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  BASEMENT   (Break Room)                          [Floor: B1]    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Difference from Current Layout

| Aspect | Current (Flat) | New (Tower) |
|---|---|---|
| Orientation | Horizontal rows | Vertical floors |
| Department | Side-by-side rooms | Stacked floors |
| CEO Zone | Top-left area | Penthouse (roof) |
| Break Room | Bottom-left | Basement (B1) |
| Elevator | None | Central elevator shaft |
| External | None | Building exterior walls, windows |

---

## 2. Pixel Dimensions

### Preserved Constants (from current `model.ts`)

```typescript
SLOT_W = 100          // agent slot width (UNCHANGED)
SLOT_H = 120          // agent slot height (UNCHANGED)
COLS_PER_ROW = 3      // agents per floor (UNCHANGED)
TILE = 20             // base tile unit (UNCHANGED)
DESK_W = 48           // desk width (UNCHANGED)
DESK_H = 26           // desk height (UNCHANGED)
CEO_SIZE = 44         // CEO sprite size (UNCHANGED)
```

### New Tower Constants

```typescript
// Building dimensions
FLOOR_W = COLS_PER_ROW * SLOT_W + ELEVATOR_W + WALL_W * 2
        = 3 * 100 + 40 + 20 * 2
        = 380                          // total canvas width

WALL_W = 20                            // exterior wall thickness (left/right)
ELEVATOR_W = 40                        // elevator shaft (right side)

// Penthouse (CEO)
PENTHOUSE_H = 160                      // taller than normal floors
PENTHOUSE_INTERIOR_H = 140            // drawable area

// Normal floor
FLOOR_ROOM_H = 120                    // = SLOT_H, agent area
FLOOR_HALLWAY_H = 24                  // corridor between floors (slimmer than current 32)
FLOOR_TOTAL_H = FLOOR_ROOM_H + FLOOR_HALLWAY_H  // = 144 per dept floor

// Basement (Break Room)
BASEMENT_H = 130                       // slightly taller (cozy feel)
BASEMENT_INTERIOR_H = 110            // drawable area

// Roof
ROOF_H = 40                           // rooftop cap above penthouse

// Total canvas height formula:
// ROOF_H + PENTHOUSE_H + (N_DEPTS * FLOOR_TOTAL_H) + BASEMENT_H
// Example with 4 depts: 40 + 160 + (4 * 144) + 130 = 906
```

---

## 3. Zone Specifications

### 3-1. Rooftop Cap

```
Y: 0 → ROOF_H (40px)
Width: FLOOR_W (380px)

Visual:
- Dark gradient skyline cap
- Helipad circle (center, r=14): amber outline pixel art
- "AGENTDESK HQ" sign: JetBrains Mono pixel font, amber color
- Antenna rod: right side, 2px wide, 20px tall with blinking LED (red, 3-frame cycle)
- Cloud particle: 2-3 slow-moving pixel clouds (optional, toggle with seasons)
```

### 3-2. Penthouse (CEO Office)

```
Y: ROOF_H → ROOF_H + PENTHOUSE_H  (40 → 200)
Interior: Y+10 → Y+PENTHOUSE_H-10

Floor plan (380px wide):
  [WALL 20px][CEO_DESK_AREA 200px][LOUNGE 100px][ELEVATOR 40px][WALL 20px]

CEO Desk Area (x: 20, w: 200):
  - Grand desk: 80×36px (double DESK_W), centered
  - CEO sprite: CEO_SIZE=44, standing behind desk
  - Crown overlay: TILE=20 above sprite
  - Meeting seats: 3 chairs in arc in front of desk (each 16×12px)
  - Trophy shelf: left wall, 3 trophy icons (16×16 each)
  - Window view: right of desk area — pixel art cityscape strip (h=20px, across top)

CEO Lounge (x: 220, w: 100):
  - Couch: 60×24px, pixel art
  - Coffee table: 24×16px
  - Plant: 16×24px in corner

Floor line:
  - Solid amber (#f59e0b) 2px line at bottom of penthouse
  - Label: "PENTHOUSE · CEO" in JetBrains Mono, x:24, y:bottom-16, size:8px

Wall material: Darker shade vs dept floors (#1a1f2e vs #161b22)
```

### 3-3. Department Floor

```
One floor = FLOOR_TOTAL_H = 144px  (120 room + 24 hallway)

Floor room (H: 120):
  X layout: [WALL 20][AGENT_SLOTS 300][ELEVATOR 40][WALL 20]

  Agent slots: 3 × (100px wide × 120px tall)
    Each slot:
      - Desk: DESK_W=48 × DESK_H=26, centered horizontally at slot center
      - Desk Y: slot_y + 40 (upper half of slot)
      - Agent sprite: 32×32, centered on desk
      - Status glow: 4px aura under sprite (green=running, amber=idle, red=error)
      - Name label: 8px JetBrains Mono below sprite
      - Persona badge: 10×8px pixel badge above sprite right corner [J][M][T]

  Department label (left wall, vertical text):
    - Rotated 90deg, amber color, 8px mono font
    - Floor number: right wall, "F4" style, 6px font

  Floor divider (H: 24 — hallway strip):
    - Background: #0d1117 (darker than room)
    - Center line: dashed 1px, color #30363d
    - Delivery animation zone: agents walk this strip when delivering

Elevator shaft (x: FLOOR_W - ELEVATOR_W - WALL_W = 320, w: 40):
  - Shaft bg: #010409 (near black)
  - Rail lines: 2 vertical 1px lines at x:326 and x:354
  - Elevator car: 28×36px box, moves between floors via animation
  - Door highlight: amber outline when stopping at floor
```

### 3-4. Basement (Break Room)

```
Y: ROOF_H + PENTHOUSE_H + (N_DEPTS * FLOOR_TOTAL_H) → +BASEMENT_H

X layout: [WALL 20][BREAK_CONTENT 300][ELEVATOR 40][WALL 20]

Content (identical to current break room but centered differently):
  - Coffee machine: 28×40px, left area (x:40)
  - Steam particles: rising from machine top (3-frame cycle, 2px wide)
  - Couch: 60×24px
  - Coffee table: 24×16px
  - Bookshelf: right wall, 40×60px
  - Break room bubbles: existing circle animations preserved

  Floor label: "B1 · BREAK ROOM" amber 8px mono, bottom-left

  Basement wall material: brick texture pixel art (alternating #1c2128/#161b22 blocks, 8px each)
  Floor: checkered pixel pattern (2×2 tiles: #0f1117/#1c2128)
```

### 3-5. Elevator

```
Shared across all floors (x: 320, w: 40)

Elevator car (28×36px):
  - Idle position: at current agent's floor
  - Animation: smooth pixel scroll between floors (8px/tick)
  - Interior: 2 pixel-art passengers max visible
  - Door: amber outline, 2px

  Door open sequence (when stopping):
    Frame 1: full door
    Frame 2: door 50% open (right half fades)
    Frame 3: door open
    Frame 4: door closes again
    Total: 4 frames × 120ms = ~480ms

  Button panel: 3px × 12px strip on shaft right wall
    - One lit amber dot per floor + B1 + P (penthouse)
    - Active floor dot: bright amber (#f59e0b)
    - Inactive: dim (#30363d)
```

---

## 4. Exterior & Framing

### Building Exterior Walls

```
Left wall (x: 0, w: 20):
  - Base color: #21262d
  - Window strip per floor: 8×12px windows at x:4, repeating every FLOOR_TOTAL_H
  - Window lit: random on/off per floor, amber glow (#f59e0b at 40% opacity)

Right wall beyond elevator (x: 360, w: 20):
  - Same as left wall
  - Fire escape: pixel art zigzag, 4px wide
```

### Cross-Section "Cut" Effect

```
Left edge: thick amber border (3px) — indicates the "slice" view
Right edge: same
Top: roof cap structure
Bottom: ground line (4px solid #30363d) + optional basement indicator arrow
```

---

## 5. Animation Preserved / Updated

### Preserved from Current

```typescript
// All existing animations kept:
- Agent bounce (running status): phase-based Y offset ±3px
- Particle effects: status glow particles
- Sub-clone burst particles
- Wall clock ticking
- Seasonal particles (snow/cherry blossoms)
- Delivery walk animation (now uses hallway strip)
- Break room steam + bubbles
```

### New Animations

```typescript
// Elevator movement
interface ElevatorState {
  currentFloor: number;    // 0=basement, 1=floor1, ..., N=penthouse
  targetFloor: number;
  carY: number;            // pixel position of car top
  doorState: 'closed' | 'opening' | 'open' | 'closing';
  doorFrame: number;       // 0-3
}

// Building exterior: window flicker
// Random floor windows toggle on/off every 3-8 seconds
// Probability: 30% chance any window changes state per cycle

// Persona badge pulse (new)
// When agent is RUNNING + has persona_id:
// Badge glows with persona accent color, 2-frame pixel pulse
```

---

## 6. Color Palette for Floors

Each department floor gets a subtle floor tint (applied to room background):

```typescript
const DEPT_FLOOR_TINTS = [
  0x161b22,   // Floor 1 — neutral dark
  0x16201a,   // Floor 2 — slight green tint (engineering)
  0x1a1620,   // Floor 3 — slight purple tint (design)
  0x1a1c16,   // Floor 4 — slight olive tint (ops)
  0x1a1616,   // Floor 5 — slight red tint (marketing)
  // ... cycles for more depts
];
```

Penthouse: `0x1a1f2e` (blue-navy, premium feel)
Basement: `0x12100e` (warm dark, cozy)

---

## 7. Implementation Plan

### Phase O-1 — Model Updates

- [ ] Add new constants to `model.ts` (`FLOOR_W`, `WALL_W`, `ELEVATOR_W`, `PENTHOUSE_H`, `FLOOR_HALLWAY_H`, `BASEMENT_H`, `ROOF_H`)
- [ ] Add `ElevatorState` interface
- [ ] Update `RoomRect` — add `floorIndex`, `isElevator`, `isPenthouse`, `isBasement`
- [ ] Update `totalH` / `officeW` calculation formula

### Phase O-2 — Layout Engine

- [ ] Rewrite `buildScene.ts` floor layout loop (top→bottom instead of left→right rows)
- [ ] `drawRoof()` — helipad, antenna, sign
- [ ] `drawPenthouse()` — CEO grand desk, lounge, window cityscape
- [ ] `drawFloor(deptIndex)` — agent slots + hallway strip
- [ ] `drawBasement()` — break room with basement aesthetic
- [ ] `drawElevatorShaft()` — full height shaft, button panel
- [ ] `drawExteriorWalls()` — left/right walls with windows

### Phase O-3 — Animations

- [ ] Elevator car movement tick logic
- [ ] Elevator door open/close 4-frame sequence
- [ ] Exterior window flicker timer
- [ ] Persona badge pulse (when agent has persona_id)

### Phase O-4 — Delivery Walk Update

- [ ] Delivery walk now uses hallway strip (Y = floor bottom - FLOOR_HALLWAY_H/2)
- [ ] Path: origin slot → hallway → elevator → hallway → dest slot

---

## 8. Files to Modify

| File | Change |
|---|---|
| `src/components/office-view/model.ts` | New constants, ElevatorState interface |
| `src/components/office-view/buildScene.ts` | Full layout rewrite |
| `src/components/office-view/drawOffice.ts` | New draw functions |
| `src/components/office-view/officeTicker.ts` | Elevator tick, window flicker |
| `src/components/office-view/drawing-styles/*.ts` | Style adapters for new zones |

New files:
| File | Purpose |
|---|---|
| `src/components/office-view/drawRoof.ts` | Rooftop rendering |
| `src/components/office-view/drawPenthouse.ts` | CEO penthouse rendering |
| `src/components/office-view/drawFloor.ts` | Per-floor rendering |
| `src/components/office-view/drawBasement.ts` | Break room basement rendering |
| `src/components/office-view/drawElevator.ts` | Elevator shaft + car |
| `src/components/office-view/elevatorTick.ts` | Elevator state machine |

---

---

## 9. FM UI Wrapper — Office View Screen Layout

> **신규 목표**: 픽셀아트 캔버스를 FM2024 Match View 구조로 감싼다.
> 캔버스 자체는 변경 없음. 주변 React UI가 FM 스타일 3-컬럼 패널로 재구성.

### 9-1. 화면 구조

```
┌─ FM TOOLBAR ──────────────────────────────────────────────────────────┐
│  ▶ Office View  ·  AgentDesk HQ   [Season ▾]  [Style ▾]  [Zoom: 1x]  │  h:44px
├──────────────────┬───────────────────────────────┬────────────────────┤
│                  │                               │                    │
│  LEFT PANEL      │   PIXI CANVAS (center)        │  RIGHT PANEL       │
│  w:180px fixed   │   flex-1, min-w: 380px        │  w:240px fixed     │
│                  │   bg: #010409                 │                    │
│  Department list │   overflow: auto (scroll)     │  Agent/Dept info   │
│  + CLI usage     │                               │  + quick actions   │
│                  │                               │                    │
├──────────────────┴───────────────────────────────┴────────────────────┤
│  [▶ Run]  [Stats]  [Alerts: 3]  Scroll: ↑↓   CLI: 42.3k / 1M tokens  │  h:32px
└───────────────────────────────────────────────────────────────────────┘
```

### 9-2. Toolbar (상단 44px)

```
배경: var(--th-bg-primary) #0f1117
border-bottom: 1px solid var(--th-border) #30363d
height: 44px
padding: 0 12px
display: flex, align-items: center, gap: 8px

좌측:
  ▶  (amber, JetBrains Mono 0.75rem)
  "Office View"  (Sora 600, 0.875rem, #f0f6fc)
  "·"  (#30363d)
  "AgentDesk HQ"  (JetBrains Mono 0.75rem, #8b949e)

우측 (ml-auto, gap: 4px):
  [Season ▾]  — ghost 버튼, 0.75rem mono
  [Style ▾]   — ghost 버튼, 0.75rem mono
  [1x] / [2x] — zoom ghost 버튼
```

### 9-3. Left Panel — 부서 목록 (180px)

```
배경: var(--th-bg-panel) #161b22
border-right: 1px solid #30363d
overflow-y: auto

섹션 헤더:
  "DEPARTMENTS"  — JetBrains Mono 400, 0.6rem, uppercase, letter-spacing 0.12em
  color: #6e7681, padding: 12px 12px 6px

부서 아이템:
  height: 52px, padding: 6px 12px, cursor: pointer
  display: flex, flex-direction: column, justify-content: center, gap: 2px

  부서명: Sora 500, 0.8rem, #e6edf3
  보조: JetBrains Mono, 0.65rem, #8b949e  →  "4 agents · 3 running"
  활동바: height 2px, bg #30363d, fill amber (활성 에이전트 비율)

  hover: bg var(--th-bg-surface-hover) #21262d
  선택: border-left 3px solid #f59e0b, bg var(--th-bg-surface) #1c2128

섹션 구분자:
  border-top: 1px solid #30363d, margin: 8px 0

CLI 사용량 섹션:
  섹션 헤더: "CLI USAGE"
  토큰 수치: JetBrains Mono 600, #f59e0b (amber)
  사용률 바: height 4px, amber fill
  [REFRESH] ghost 버튼 0.65rem
```

### 9-4. Center — PixiJS Canvas

```
flex: 1, min-width: 380px
background: #010409  ← 터미널 블랙 (건물이 돋보이도록)
overflow: auto
position: relative

캔버스 정렬: centered horizontally (margin: 0 auto)
캔버스 상단 amber 3px border 유지 (기존 cross-section cut 효과)

오버레이 (캔버스 위에 absolute):
  - VirtualPadOverlay (모바일, 기존 유지)
  - 좌상단: "F{n}" 층수 표시 레이블 (선택 부서 강조)
  - 우하단: 현재 계절 배지 [SUMMER] 등
```

### 9-5. Right Panel — 에이전트 / 부서 상세 (240px)

```
배경: var(--th-bg-panel) #161b22
border-left: 1px solid #30363d
overflow-y: auto

[상태 A] 아무것도 선택 안 됨:
  빈 상태 — "$ select an agent or dept" 터미널 스타일
  color: #6e7681, JetBrains Mono 0.75rem, padding: 24px 12px

[상태 B] 에이전트 선택됨:
  에이전트명: Sora 600, 0.9rem, #f0f6fc
  역할: JetBrains Mono 0.7rem, #8b949e
  상태 배지: [RUNNING] / [IDLE] / [ERROR]

  "ATTRIBUTES" 섹션:
    AttributeBar × 3 (Speed, Focus, Reliability)
    FM 선수카드 동일 스타일

  "TASKS" 섹션:
    현재 태스크 간략 리스트 (max 3개)
    각 항목: #id + 짧은 제목 + 상태 배지

  하단 버튼:
    [▶ ASSIGN TASK]  — Primary 버튼, w: 100%
    [VIEW PROFILE]   — Secondary 버튼, w: 100%

[상태 C] 부서 선택됨:
  부서명: Sora 600, 0.9rem, #f0f6fc
  "DEPT STATS" 섹션:
    Agents: N (mono amber)
    Running: N (mono green)
    Tasks done: N (mono)

  에이전트 미니 리스트 (아바타 + 이름 + 상태점)

  하단: [VIEW DEPT] Secondary 버튼
```

### 9-6. Action Bar (하단 32px)

```
배경: var(--th-bg-secondary) #161b22
border-top: 1px solid #30363d
height: 32px, padding: 0 12px
display: flex, align-items: center, gap: 8px

좌측 (gap: 4px):
  [▶ RUN]   — Ghost, amber, JetBrains Mono 0.65rem uppercase
  [STATS]   — Ghost, 0.65rem uppercase
  [3 ALERTS] — Ghost, 0.65rem uppercase, 숫자 amber

구분자: 1px solid #30363d (height: 16px)

중앙 (gap: 6px):
  "Scroll: ↑↓"  (0.6rem, #6e7681)

우측 (ml-auto):
  "CLI: 42.3k / 1M"  (JetBrains Mono 0.65rem, #8b949e)
  초과시: color #f85149 (red)
```

### 9-7. 반응형 동작

```
≥ 1280px: 3-컬럼 full (180 + flex + 240)
1024–1279px: 우 패널 숨김 (클릭 시 overlay drawer로 표시)
< 1024px: 좌 패널도 숨김 (툴바 아이콘으로 토글)
```

### 9-8. FM 매핑

| FM Match View 요소 | Office View 요소 |
|---|---|
| Formation / Bench panel (left) | 부서 목록 패널 |
| Pitch (center) | 픽셀아트 빌딩 캔버스 |
| Tactics / Player detail (right) | 에이전트 프로필 패널 |
| Match toolbar (top) | 오피스 툴바 |
| In-match action bar (bottom) | 액션바 |
| Team stats header | CLI 사용량 섹션 |
| Substitution / shouts | Assign Task / View Profile 버튼 |

### 9-9. 구현 파일

| 파일 | 역할 |
|---|---|
| `src/components/OfficeView.tsx` | 3-컬럼 레이아웃 + 패널 상태 관리 |
| `src/components/office-view/OfficeDeptPanel.tsx` | 좌측 부서 목록 패널 (신규) |
| `src/components/office-view/OfficeAgentPanel.tsx` | 우측 에이전트/부서 상세 패널 (신규) |
| `src/components/office-view/OfficeToolbar.tsx` | 상단 툴바 (신규) |
| `src/components/office-view/OfficeActionBar.tsx` | 하단 액션바 (신규) |
| `src/styles/index.part03.css` | `.office-screen-*` CSS 클래스 추가 |

---

## Reference

- Current model constants: `src/components/office-view/model.ts`
- Current buildScene: `src/components/office-view/buildScene.ts`
- Design system: `docs/design-system.md`
- Progress tracking: `docs/progress.md`
