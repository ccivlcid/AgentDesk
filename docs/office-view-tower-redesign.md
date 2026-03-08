# Office View — Cross-Section Tower Design

> **Last updated**: 2026-03-08
> **Status**: Phase O-1~O-4 완료, Phase O-5 (네비게이션 UX) 개발중
>
> **Concept**: Building cross-section view. CEO penthouse at top, department floors in middle, basement break room at bottom.
> **Style**: Pixel art preserved. Vertical tower layout rendered in PixiJS.

---

## 1. Layout Architecture

### Overall Structure (top → bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  ROOF CAP       (helipad, antenna, HQ sign)       [40px]        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PENTHOUSE      (CEO Office + Lounge)              [160px]       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  CONFERENCE     (Meeting Room)                     [140px]       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  FLOOR N        [Department A]   3 agent slots     [184px]       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   hallway 28px  │
│  FLOOR N-1      [Department B]   3 agent slots     [184px]       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   hallway      │
│  ...                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  BASEMENT       (Break Room)                       [140px]       │
└─────────────────────────────────────────────────────────────────┘
          ↕ ELEVATOR SHAFT (right side, 40px wide)
```

---

## 2. Pixel Dimensions (현재 구현값)

### 기본 상수 (`model.ts`)

```typescript
SLOT_W = 100          // agent slot width
COLS_PER_ROW = 3      // agents per floor
TILE = 20             // base tile unit
DESK_W = 48           // desk width
DESK_H = 26           // desk height
CEO_SIZE = 44         // CEO sprite size

// Building dimensions
FLOOR_W = 410         // = COLS_PER_ROW * SLOT_W + ELEVATOR_W + WALL_W * 2
WALL_W = 20           // exterior wall thickness (left/right)
ELEVATOR_W = 40       // elevator shaft (right side)

// Zone heights
ROOF_H = 40
PENTHOUSE_H = 160
CONFERENCE_FLOOR_H = 140
FLOOR_ROOM_H = 156    // agent area per floor
FLOOR_HALLWAY_H = 28  // corridor between floors
FLOOR_TOTAL_H = 184   // = FLOOR_ROOM_H + FLOOR_HALLWAY_H
BASEMENT_H = 140

// Total canvas height:
// ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + (N_DEPTS * FLOOR_TOTAL_H) + BASEMENT_H
// Example with 4 depts: 40 + 160 + 140 + (4 * 184) + 140 = 1216
```

---

## 3. Zone Specifications

### 3-1. Rooftop Cap (구현 완료: `drawRoof.ts`)

```
Y: 0 → ROOF_H (40px)
- Dark gradient skyline cap
- Helipad circle (center, r=14): amber outline pixel art
- "AGENTDESK HQ" sign: JetBrains Mono pixel font, amber color
- Antenna rod: right side, 2px wide, blinking LED (red, 3-frame cycle)
```

### 3-2. Penthouse — CEO Office (구현 완료: `drawPenthouse.ts`)

```
Y: ROOF_H → ROOF_H + PENTHOUSE_H  (40 → 200)
[WALL 20px][CEO_DESK_AREA][LOUNGE][ELEVATOR 40px][WALL 20px]
- Grand desk, CEO sprite, crown overlay
- Meeting seats (3 chairs)
- Trophy shelf, window cityscape
- CEO Lounge: couch, coffee table, plant
```

### 3-3. Conference Floor (구현 완료: `drawConferenceFloor.ts`)

```
Y: ROOF_H + PENTHOUSE_H → + CONFERENCE_FLOOR_H (200 → 340)
- 회의실: 타원형 테이블, 의자 배치
- CEO 소환 미팅 시 에이전트가 이 층으로 이동
```

### 3-4. Department Floor (구현 완료: `drawFloor.ts`)

```
One floor = FLOOR_TOTAL_H = 184px (156 room + 28 hallway)
X layout: [WALL 20][AGENT_SLOTS 300+][ELEVATOR 40][WALL 20]
- Agent slots: 3 per floor (desk + sprite + status glow + name label)
- Department sign: clickable, triggers onSelectDepartment
- Hallway strip: delivery animation zone
```

### 3-5. Basement — Break Room (구현 완료: `drawBasement.ts`)

```
- Coffee machine + steam particles
- Couch, coffee table, bookshelf
- Break room bubbles animation
- Brick texture walls, checkered floor
```

### 3-6. Elevator (구현 완료: `drawElevator.ts`, `elevatorTick.ts`)

```
Full height shaft (x: right side, w: 40px)
- Elevator car: smooth pixel scroll between floors (SPEED=1.4px/tick)
- Door sequence: closed → opening → open → closing (22+55+22 ticks)
- Button panel: LED dots per floor (P, F1..FN, B1)
- Floor display text: current floor or transit indicator
```

---

## 4. Exterior & Framing (구현 완료: `drawExteriorWalls.ts`)

```
Left/Right walls: #21262d base, window strips per floor
Window lit: random on/off, amber glow
Fire escape: pixel art zigzag (right wall)
Cross-section "cut" border: 3px amber (CSS .office-canvas-frame)
```

---

## 5. Animations (구현 완료)

### 기존 유지
- Agent bounce (running status): phase-based Y offset ±3px
- Particle effects: status glow particles
- Sub-clone burst particles
- Wall clock ticking
- Seasonal particles (snow/cherry blossoms/etc)
- Delivery walk animation (hallway strip 사용)
- Break room steam + bubbles
- Cross-department delivery animations
- CEO office call animations

### 타워 신규 애니메이션
- Elevator car movement + door open/close sequence
- Exterior window flicker (random toggle)
- Antenna LED blink (3-frame cycle)
- Visitor tick system (에이전트 간 방문 애니메이션)

---

## 6. Color Palette for Floors

```typescript
const DEPT_FLOOR_TINTS = [
  0x161b22,   // Floor 1 — neutral dark
  0x16201a,   // Floor 2 — slight green tint
  0x1a1620,   // Floor 3 — slight purple tint
  0x1a1c16,   // Floor 4 — slight olive tint
  0x1a1616,   // Floor 5 — slight red tint
];
```

Penthouse: `0x1a1f2e` (blue-navy, premium)
Conference: purple tint
Basement: `0x12100e` (warm dark, cozy)

---

## 7. 네비게이션 UX — 풀스크린 타워 + 배경 씬 ★ REDESIGN

> **핵심 문제**: 타워 비율 410:1216 (1:3) vs 뷰포트 ~800:700 (1.14:1).
> 단순 축소하면 너비가 30%로 줄어듦. **타워 주변에 배경 씬을 추가**하여 해결.
>
> **레퍼런스**: SimTower, Tiny Tower (건물+도시 배경), Two Point Hospital (시맨틱 줌)
> **디자인 원칙**: Jobs — "설명이 필요 없는 UI", Tufte — "data-ink ratio 최대화"

---

### 7-1. 방안 A: 배경 씬 (Cityscape) — 메인 구현 ★

> 타워가 도시 속 건물처럼 보이도록 주변 환경을 PixiJS로 렌더링

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ★        ☁        ☆          ☁    ★         ☁        ★    │  하늘
│       ☁        ☁         ☁              ☁                   │  (그라데이션)
│                                                              │
│                    ┌──────────┐                               │
│    🌙              │ ☁ HQ ☁  │               ✦               │
│                    ┣━━━━━━━━━━┫                               │
│                    ┃ 👑 CEO   ┃                               │
│                    ┃  desk 🪑 ┃                               │
│  ★                 ┣━━━━━━━━━━┫                               │
│                    ┃ 🤝 Conf  ┃              🏢               │
│     🏢             ┣━━━━━━━━━━┫           🏢                  │
│   🏢               ┃ 🔧  ●●● ┃        🏢                     │
│                    ┣╌╌╌╌╌╌╌╌╌╌┫                               │
│   🏢 🏢            ┃ 📊  ●●○ ┃      🏢                       │
│                    ┣╌╌╌╌╌╌╌╌╌╌┫    🏢                         │
│  🏢                ┃ 🎨  ●●●●┃                                │
│                    ┣╌╌╌╌╌╌╌╌╌╌┫   🏢                          │
│                    ┃ 📢  ●○○  ┃                               │
│                    ┣━━━━━━━━━━┫                               │
│                    ┃ ☕ Break  ┃                               │
│  🌳  🌳  🌳       ┗━━━━━━━━━━┛        🌳  🌳  🌳            │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  지면
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  지하
└──────────────────────────────────────────────────────────────┘
```

#### 7-1-1. 캔버스 확장 구조

```typescript
// 기존: 캔버스 = 타워만 (FLOOR_W × totalH)
// 변경: 캔버스 = 뷰포트 전체 (visW × visH), 타워를 중앙에 배치

const SCENE_W = visW;                    // 뷰포트 너비 전체
const SCENE_H = visH;                    // 뷰포트 높이 전체
const towerX = (SCENE_W - FLOOR_W) / 2; // 타워 중앙 정렬
const SKY_H = 60;                        // 하늘 여백 (타워 위)
const GROUND_H = 40;                     // 지면 (타워 아래)

// 타워 Y 배치: fitScale로 전체 타워가 SKY_H ~ (SCENE_H - GROUND_H)에 맞도록
const availableH = SCENE_H - SKY_H - GROUND_H;
const fitScale = Math.min(availableH / totalH, (SCENE_W * 0.45) / FLOOR_W);
const towerRenderH = totalH * fitScale;
const towerRenderW = FLOOR_W * fitScale;
const towerX = (SCENE_W - towerRenderW) / 2;
const towerY = SKY_H;
```

#### 7-1-2. 배경 레이어 (뒤 → 앞 순서)

| 레이어 | Y 범위 | 내용 | 스타일 |
|--------|--------|------|--------|
| **하늘** | 0 → SKY_H + towerRenderH * 0.3 | 그라데이션 (#0a0e1a → #131830), 별/달 파티클 | 픽셀아트 별: 1~2px 흰색 점, 느린 반짝임 |
| **원경 빌딩** | towerRenderH * 0.2 → 지면 | 3~5개 실루엣 건물, 타워 양쪽 | #0d1117 계열, 창문 = 1px amber 점 |
| **근경 빌딩** | towerRenderH * 0.5 → 지면 | 2~3개, 원경보다 크고 밝음 | #161b22 계열, 창문 랜덤 on/off |
| **나무** | 지면 라인 위 20px | 양쪽에 3~4그루 | 픽셀아트 삼각형 나무 (16×24px) |
| **지면** | 지면 라인 → 하단 | 도로/잔디 | #1c2128 + 중앙선 dashed amber |
| **지하** | 지면 아래 | 어두운 토양 | #0a0c10 + 돌 텍스처 |

#### 7-1-3. 타워 렌더링 (기존 유지)

```
기존 drawRoof, drawPenthouse, drawFloor 등은 변경 없음.
Container에 그린 후 scale + position으로 중앙 배치.

const towerContainer = new Container();
towerContainer.scale.set(fitScale);
towerContainer.position.set(towerX, towerY);
stage.addChild(backgroundLayer);   // 배경 (하늘, 빌딩, 지면)
stage.addChild(towerContainer);    // 타워 (기존 코드 그대로)
stage.addChild(foregroundLayer);   // 전경 (나무, 파티클)
```

#### 7-1-4. 인터랙션 (전체 타워 뷰)

```
• 부서 클릭 (좌측 패널 또는 캔버스):
  → 타워가 줌인 애니메이션 (towerContainer.scale 확대 + position 이동)
  → 해당 층이 뷰포트 중앙에 오도록
  → 배경은 blur 처리 또는 dim

• [Overview] 버튼 또는 배경 클릭:
  → 줌아웃 → 전체 타워 + 배경 복귀

• 줌 전환: Framer Motion spring 또는 PixiJS ticker 기반
  duration: 400ms, easing: cubic-bezier(0.25, 0.1, 0.25, 1.0)
```

#### 7-1-5. 시간대별 배경 변화 (선택적)

```
06~18시: 낮 하늘 (#1a2744 → #2d3a5c), 구름, 태양
18~06시: 밤 하늘 (#0a0e1a → #131830), 별, 달

계절 연동 (기존 seasonal-particles와 통합):
  spring: 벚꽃 + 밝은 하늘
  summer: 노을 그라데이션 + 밝은 건물
  autumn: 오렌지 하늘 + 낙엽
  winter: 눈 + 어두운 하늘 + 건물 창문 따뜻한 빛
```

---

### 7-2. 방안 B: 타워 넓이 확장 (6열) — 대안

> COLS_PER_ROW를 3→6으로, 비율을 1:1에 근접하게

```
현재: FLOOR_W = 410, 3열, 비율 1:3
변경: FLOOR_W = 720, 6열, 비율 ~1:1

// 변경 상수
COLS_PER_ROW = 6         // 3 → 6
SLOT_W = 100             // 유지
FLOOR_W = 6*100 + 40 + 40 = 720
FLOOR_ROOM_H = 120      // 1줄이면 층 높이 감소 가능

4개 부서 기준: totalH = 40+160+140+4*148+140 = 1072
비율 720:1072 = 1:1.49 → 뷰포트에 훨씬 잘 맞음
```

**구현 난이도**: 대 (drawFloor, buildScene 로직 전면 수정 필요)
**향후**: 부서당 에이전트 수가 많아지면 자연스럽게 채워짐

---

### 7-3. 방안 C: 아코디언 타워 — 대안 (구현 가장 빠름)

> 각 층을 축소 바(52px)로 표시, 클릭 시 해당 층만 PixiJS 디테일 확장

```
┌──────────────────────────────────────────┐
│ 👑 CEO Room          directive preview   │  52px bar
├──────────────────────────────────────────┤
│ 🤝 Conference        1 active meeting    │  40px bar
├══════════════════════════════════════════┤
│ 🔧 Engineering  ●●●  3/3  █████████░   │  52px bar  ← 클릭!
├──────────────────────────────────────────┤
│┌────────────────────────────────────────┐│
││  🧑‍💻 Alice      🧑‍💻 Bob       🧑‍💻 Carol  ││  300px
││  ┌────┐       ┌────┐       ┌────┐    ││  (PixiJS 확장)
││  │desk│       │desk│       │desk│    ││
││  └────┘       └────┘       └────┘    ││
│└────────────────────────────────────────┘│
├──────────────────────────────────────────┤
│ 📊 Analytics    ●●○  2/3  █████░░░░░   │  52px bar
├──────────────────────────────────────────┤
│ 🎨 Design       ●●●● 4/5  █████████░   │  52px bar
├──────────────────────────────────────────┤
│ 📢 Marketing    ●○○  1/4  ██░░░░░░░░   │  52px bar
├══════════════════════════════════════════┤
│ ☕ Break Room         2 agents resting   │  52px bar
└──────────────────────────────────────────┘

총 높이: 52*4 + 40 + 300 + 52*2 + 52 = ~700px → 뷰포트에 맞음!
```

**축소 바 디테일:**
```
┌─────────────────────────────────────────────────┐
│  🔧  Engineering     ●●●    3/3    █████████░   │
│                                                  │
│  아이콘  부서명      dot   수치    활동률 바       │
│                                                  │
│  배경: var(--th-bg-surface), hover: lighten       │
│  border-left: 3px solid 부서 accent color         │
│  Framer Motion: layoutId 기반 확장/축소 애니메이션  │
└─────────────────────────────────────────────────┘
```

**구현**: React 컴포넌트, 한 번에 1개 층만 PixiJS 확장.
축소 바는 순수 React+CSS, 확장 영역만 기존 PixiJS 재사용.

---

### 7-4. 방안 D: 2단 분할 타워 — 대안

> CEO/회의실/휴게실은 전체 너비, 부서만 좌우 2열 그리드

```
┌──────────────────────────────────────────────┐
│              👑 CEO ROOM (전체 너비)           │
├──────────────────────────────────────────────┤
│              🤝 CONFERENCE (전체 너비)         │
├──────────────────────┬───────────────────────┤
│  🔧 Engineering      │  📊 Analytics          │
│  🧑‍💻 🧑‍💻 🧑‍💻            │  🧑‍💻 🧑‍💻 💤              │
│  ● ● ●              │  ● ● ○                │
├──────────────────────┼───────────────────────┤
│  🎨 Design           │  📢 Marketing          │
│  🧑‍💻 🧑‍💻 🧑‍💻 🧑‍💻          │  🧑‍💻 🧑‍💻                  │
│  ● ● ● ●            │  ● ○                  │
├──────────────────────┴───────────────────────┤
│              ☕ BREAK ROOM (전체 너비)         │
└──────────────────────────────────────────────┘

비율: ~820 × 700 → 뷰포트에 맞음
엘리베이터: 중앙 칸막이를 엘리베이터 샤프트로 활용
홀수 부서: 마지막 셀은 빈 "임대 가능" 공간으로 표시
```

---

### 7-5. 방안 E: 아이소메트릭 2.5D — 대안

> 타워를 30° 각도 아이소메트릭 뷰로 전환. 층마다 기울어진 바닥면이 보여 깊이감 있는 구조.

```
              ╱─────────────────╲
             ╱  👑 CEO Penthouse  ╲
            ╱─────────────────────╲
           ╱  🤝 Conference Room    ╲
          ╱─────────────────────────╲
         ╱  🔧 Engineering  ●●●      ╲
        ╱─────────────────────────────╲
       ╱  📊 Analytics      ●●○        ╲
      ╱─────────────────────────────────╲
     ╱  🎨 Design           ●●●●         ╲
    ╱─────────────────────────────────────╲
   ╱  📢 Marketing          ●○○            ╲
  ╱─────────────────────────────────────────╲
 ╱  ☕ Break Room                             ╲
╱───────────────────────────────────────────────╲

• 각 층: 기울어진 평행사변형으로 렌더링 (skewX + perspective)
• 클릭 시: 해당 층이 정면으로 회전(zoom+unskew) → 기존 PixiJS 디테일 표시
• 폭이 넓어져 비율 문제 자연 해결 (가로 700px+)
```

**장점:** 시각적 임팩트 최대, 건물 느낌 극대화, 비율 자연 해결
**단점:** 구현 난이도 최고, 기존 PixiJS 렌더링 전면 교체 필요, 클릭 히트맵 복잡

---

### 7-6. 방안 F: 대시보드 + 미니 타워 — 대안

> 좌측에 미니 타워(현재 것 축소), 우측에 대시보드 카드 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌────────────────────────────────────────┐│
│  │  ☁  ☁    │  │ 📊 Engineering          3/3 working   ││
│  │ ┌──────┐ │  │ ┌─────┐ ┌─────┐ ┌─────┐              ││
│  │ │ CEO  │ │  │ │Alice│ │ Bob │ │Carol│  Tasks: 5     ││
│  │ ├──────┤ │  │ └─────┘ └─────┘ └─────┘              ││
│  │ │ CONF │ │  ├────────────────────────────────────────┤│
│  │ ├──────┤ │  │ 🎨 Design              4/5 working    ││
│  │ │ Eng  │◄├──│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      ││
│  │ ├──────┤ │  │ │ Dan │ │ Eve │ │Frank│ │Grace│      ││
│  │ │ Ana  │ │  │ └─────┘ └─────┘ └─────┘ └─────┘      ││
│  │ ├──────┤ │  ├────────────────────────────────────────┤│
│  │ │ Des  │ │  │ 📢 Marketing            1/4 working   ││
│  │ ├──────┤ │  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      ││
│  │ │ Mkt  │ │  │ │ Hal │ │ Ivy │ │ Joe │ │Kate│      ││
│  │ ├──────┤ │  │ └─────┘ └─────┘ └─────┘ └─────┘      ││
│  │ │Break │ │  └────────────────────────────────────────┘│
│  │ └──────┘ │                                            │
│  └──────────┘                                            │
└──────────────────────────────────────────────────────────┘

미니 타워: w~120px, 클릭하면 해당 부서 카드 하이라이트
부서 카드: React 컴포넌트, 에이전트 아바타 + 상태 + 태스크 요약
타워에서 부서 hover → 카드 glow 연동
```

**장점:** 정보 밀도 최고, 대시보드 + 빌딩 양면 활용, 반응형 용이
**단점:** 타워가 장식적 요소로 축소, 몰입감 감소, 2개 뷰 동기화 필요

---

### 7-7. 방안 G: 카드 그리드 (탈타워) — 대안

> 타워 은유를 버리고 FM 스타일 카드 그리드로 전환 (Squad View에 근접)

```
┌──────────────────────────────────────────────────────────┐
│  [👑 CEO]  [🤝 Conf]  [☕ Break]          [Overview ▼]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ 🔧 ENGINEERING│ │ 📊 ANALYTICS │ │ 🎨 DESIGN    │      │
│  │              │  │              │  │              │      │
│  │  🧑‍💻 Alice    │  │  🧑‍💻 Dan     │  │  🧑‍💻 Hal     │      │
│  │  🧑‍💻 Bob      │  │  🧑‍💻 Eve     │  │  🧑‍💻 Ivy     │      │
│  │  🧑‍💻 Carol    │  │  💤 Frank    │  │  🧑‍💻 Joe     │      │
│  │              │  │              │  │  🧑‍💻 Kate    │      │
│  │ 3/3 ████████ │  │ 2/3 █████░░ │  │ 4/4 ████████│      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                          │
│  ┌─────────────┐                                         │
│  │ 📢 MARKETING │                                         │
│  │              │                                         │
│  │  🧑‍💻 Leo     │                                         │
│  │  💤 Mia     │                                         │
│  │              │                                         │
│  │ 1/2 ███░░░░ │                                         │
│  └─────────────┘                                         │
│                                                          │
└──────────────────────────────────────────────────────────┘

• CSS Grid: auto-fill, minmax(280px, 1fr)
• 각 카드 = 부서 + 소속 에이전트 리스트 + 활동률 바
• 스크롤 없이 한 화면에 모든 부서 표시 (카드 높이 가변)
• CEO/Conference/Break는 상단 탭바 또는 별도 카드
```

**장점:** 비율 문제 완전 해결, 반응형 최적, 구현 가장 단순, 정보 밀도 높음
**단점:** 타워/빌딩 은유 완전 소실, 기존 PixiJS 코드 전량 폐기, 엘리베이터/방문자 등 애니메이션 불가

---

### 7-8. 방안 H: 시맨틱 줌 — 전체 타워 LOD (Level of Detail)

> **핵심**: 전체 타워를 줌아웃해서 보여줄 때, 디테일을 줄이고 핵심 정보만 표시.
> 줌인하면 점진적으로 디테일이 드러남. Two Point Hospital, Cities: Skylines 방식.

```
[줌 레벨 1: Overview — 전체 타워 fit]

┌──────────────────────────────────────────────┐
│ ☁  ★  ☁  ☆  ☁     ★  ☁    ☁  ★  ☁        │  하늘
│                                              │
│              ┌────────────────┐               │
│              │   AGENTDESK HQ │               │
│              ├────────────────┤               │
│              │ 👑 CEO    📋 3 │               │  이름 + 활성 태스크 수만
│              ├────────────────┤               │
│              │ 🤝 CONF   ● 2 │               │  미팅 참석자 수만
│              ├────────────────┤               │
│   🏢         │ 🔧 ENG ●●● 3/3│        🏢    │  부서명 + 에이전트 dot + 수치
│              ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤               │
│              │ 📊 ANA ●●○ 2/3│               │  ● = working, ○ = idle
│              ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤               │
│   🏢 🏢      │ 🎨 DES ●●●●4/5│    🏢         │
│              ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤               │
│              │ 📢 MKT ●○○ 1/4│               │
│              ├────────────────┤               │
│              │ ☕ BRK     💤 2│               │  휴식 인원 수만
│   🌳  🌳    └────────────────┘    🌳  🌳    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  지면
└──────────────────────────────────────────────┘

각 층 높이: ~40px (원본 184px → 축소)
정보 표시: 부서 아이콘 + 이름 + 에이전트 dot + working/total 수치
색깔: 활동률에 따라 행 배경 밝기 변화 (활발 = 밝은 초록 tint)
```

```
[줌 레벨 2: Mid — 클릭한 층 주변 확대]

┌──────────────────────────────────────────────┐
│ 🔧 ENG ●●● 3/3                   (축소 바) │
├══════════════════════════════════════════════┤
│                                              │
│   🧑‍💻 Alice          🧑‍💻 Bob           🧑‍💻 Carol │
│   ┌─ desk ──┐     ┌─ desk ──┐     ┌─ desk──┐│
│   │ working │     │ working │     │ working││
│   │ #task-42│     │ #task-17│     │ #task-9 ││
│   └─────────┘     └─────────┘     └─────────┘│  기존 PixiJS 디테일
│                                              │
│   📊 Analytics  ●●○  2/3  [expand ▼]        │
│   📢 Marketing  ●○○  1/4  [expand ▼]        │
│   ☕ Break Room  💤 2                         │
├══════════════════════════════════════════════┤
│ 🎨 DES ●●●● 4/5                  (축소 바) │
└──────────────────────────────────────────────┘

선택 층: 기존 PixiJS 디테일 (에이전트 스프라이트, 책상, 상태)
인접 층: 축소 바 (52px), 핵심 수치만 표시
```

```
[줌 레벨 3: Full — 단일 층 전체 화면]

기존 PixiJS 렌더링 그대로 (현재 Floor Focus 모드)
에이전트 이름, 상태 파티클, 서브클론, 배달 애니메이션 전부 표시
```

#### 7-8-1. 시맨틱 줌 구현 구조

```typescript
// 줌 레벨별 표시 요소
const ZOOM_LEVELS = {
  overview: {   // zoom < 0.5
    showAgentSprites: false,
    showAgentNames: false,
    showDesks: false,
    showParticles: false,
    showFloorSummary: true,    // "🔧 ENG ●●● 3/3" 한줄 요약
    showElevator: false,       // 엘리베이터 숨김
    showExteriorWindows: false,
    floorHeight: 40,           // 축소된 층 높이
  },
  mid: {        // 0.5 ≤ zoom < 0.85
    showAgentSprites: true,
    showAgentNames: true,
    showDesks: true,
    showParticles: false,
    showFloorSummary: false,
    showElevator: true,
    showExteriorWindows: true,
    floorHeight: 120,          // 중간 층 높이
  },
  full: {       // zoom ≥ 0.85
    // 현재와 동일 (모든 디테일 표시)
    floorHeight: 184,          // 원본 FLOOR_TOTAL_H
  },
};

// 줌 레벨 전환 시: 타워 자체를 다시 빌드 (다른 높이/디테일)
function rebuildForZoomLevel(level: 'overview' | 'mid' | 'full') {
  const config = ZOOM_LEVELS[level];
  // totalH 재계산 → 캔버스 resize → 각 층 config에 맞게 렌더링
}
```

#### 7-8-2. Overview 축소 바 렌더링 (PixiJS)

```typescript
// drawFloorSummaryBar(stage, dept, y, w=350, h=40)
// 줌 레벨 1에서 각 부서 층을 이 바로 대체

function drawFloorSummaryBar(
  stage: Container, dept: Department, agents: Agent[],
  y: number, w: number, h: number, isDark: boolean
) {
  const bar = new Graphics();
  const working = agents.filter(a => a.status === 'working').length;
  const total = agents.length;
  const activity = total > 0 ? working / total : 0;

  // 배경: 활동률에 따른 밝기
  bar.rect(0, y, w, h).fill({
    color: isDark ? 0x161b22 : 0xf0f0f0,
    alpha: 0.8 + activity * 0.2
  });

  // 좌측: 부서 아이콘 + 이름
  const label = new Text({
    text: `${dept.icon || '📁'} ${dept.name}`,
    style: { fontSize: 10, fill: 0xc9d1d9, fontFamily: 'monospace' }
  });
  label.position.set(8, y + h/2 - 5);
  stage.addChild(label);

  // 중앙: 에이전트 dots (●=working, ○=idle/break)
  agents.forEach((agent, i) => {
    const dot = new Graphics();
    const color = agent.status === 'working' ? 0x22c55e : 0x6b7280;
    dot.circle(w/2 + i * 12, y + h/2, 3).fill(color);
    stage.addChild(dot);
  });

  // 우측: working/total 수치
  const count = new Text({
    text: `${working}/${total}`,
    style: { fontSize: 9, fill: 0x8b949e, fontFamily: 'monospace' }
  });
  count.anchor.set(1, 0.5);
  count.position.set(w - 12, y + h/2);
  stage.addChild(count);

  // 활동률 바 (하단 2px)
  bar.rect(0, y + h - 2, w * activity, 2).fill(0x22c55e);
  stage.addChild(bar);
}
```

#### 7-8-3. 비례 압축 (Non-linear Scaling)

```
Overview 시 모든 층을 균일 축소가 아닌, 중요도별 차등 축소:

┌────────────────────────────────────────────┐
│  ROOF           [20px ← 40]    50% 축소   │
│  CEO PENTHOUSE  [80px ← 160]   50% 축소   │  주요 구역은 50%
│  CONFERENCE     [60px ← 140]   43% 축소   │
│  ─────────────────────────────────────────│
│  🔧 Engineering [40px ← 184]   22% 축소   │
│  📊 Analytics   [40px ← 184]   22% 축소   │  부서는 축소 바로 대체
│  🎨 Design      [40px ← 184]   22% 축소   │  (반복 구조이므로 과감히 축소)
│  📢 Marketing   [40px ← 184]   22% 축소   │
│  ─────────────────────────────────────────│
│  BREAK ROOM     [60px ← 140]   43% 축소   │  주요 구역은 50%
│  BASEMENT       [40px ← 140]               │
└────────────────────────────────────────────┘

4개 부서 기준 Overview totalH:
  20 + 80 + 60 + 4×40 + 60 + 40 = 420px
  비율: 410:420 ≈ 1:1 → 뷰포트에 완벽 fit!

핵심: CEO/회의실/휴게실은 디테일 유지 (크기 50%),
      부서는 요약 바로 대체 (크기 22%)
```

**장점:** 타워 구조 100% 유지, 기존 코드 최대 재활용, 자연스러운 줌 전환, 비율 문제 해결
**단점:** 줌 레벨별 2~3가지 렌더링 모드 구현 필요, Overview↔Detail 전환 시 타워 높이가 변하므로 애니메이션 필요

---

### 7-9. 방안 I: Phaser 3 카메라 시스템 — 중기 대안 (근본 해결)

> PixiJS → Phaser 3 마이그레이션 후, Phaser의 네이티브 카메라/줌/미니맵으로 해결.
> CSS hack 일절 불필요. 게임 엔진이 카메라를 관리.

```
┌─── Phaser Game Container (뷰포트 100%) ───────────────────────┐
│                                                                │
│  Main Camera (zoom = 0.55, scrollY = 0)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │    ☁        ☆          ☁    ★         ☁                 │  │
│  │                    ┌──────────┐                           │  │
│  │                    │ 👑 CEO   │                           │  │
│  │                    ├──────────┤                           │  │
│  │     🏢             │ 🤝 Conf  │              🏢           │  │
│  │                    ├──────────┤                           │  │
│  │                    │ 🔧  ●●● │                           │  │
│  │                    ├╌╌╌╌╌╌╌╌╌╌┤                           │  │
│  │                    │ 📊  ●●○ │                           │  │
│  │                    ├╌╌╌╌╌╌╌╌╌╌┤                           │  │
│  │                    │ ☕ Break  │                           │  │
│  │   🌳  🌳          └──────────┘       🌳  🌳              │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Minimap Camera (별도 카메라, ignore UI) ─┐                  │
│  │  ┌──┐                                     │   72×200px      │
│  │  │HQ│  ← amber viewport indicator         │   우측 하단     │
│  │  │  │                                     │                 │
│  │  └──┘                                     │                 │
│  └───────────────────────────────────────────┘                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘

부서 클릭 시:
  camera.zoomTo(1.0, 400)          ← 네이티브 줌 애니메이션
  camera.pan(towerX, floorY, 400)  ← 해당 층 중앙으로 이동

Overview 복귀:
  camera.zoomTo(fitZoom, 400)      ← 전체 타워 fit
  camera.pan(centerX, centerY, 400)
```

#### 7-8-1. Phaser 카메라 핵심 기능

```typescript
// Scene.create()
const cam = this.cameras.main;

// 1. 전체 타워 fit (Overview)
const fitZoom = Math.min(
  cam.width / WORLD_W,
  cam.height / WORLD_H
) * 0.95;
cam.setZoom(fitZoom);
cam.centerOn(WORLD_W / 2, WORLD_H / 2);

// 2. 부서 줌인 (Floor Focus)
cam.zoomTo(1.0, 400, 'Cubic.easeInOut');
cam.pan(floorCenterX, floorCenterY, 400, 'Cubic.easeInOut');

// 3. 미니맵 (두 번째 카메라)
const miniCam = this.cameras.add(
  viewportW - 82, viewportH - 210, 72, 200
);
miniCam.setZoom(72 / WORLD_W);
miniCam.centerOn(WORLD_W / 2, WORLD_H / 2);
miniCam.setBackgroundColor(0x0a0e1a);
// UI 레이어는 miniCam에서 제외
miniCam.ignore(uiLayer);

// 4. 마우스 휠 줌
this.input.on('wheel', (pointer, dx, dy) => {
  const newZoom = Phaser.Math.Clamp(
    cam.zoom + (dy > 0 ? -0.1 : 0.1),
    fitZoom, 2.0
  );
  cam.zoomTo(newZoom, 150);
});

// 5. 시맨틱 줌 (줌 레벨별 디테일)
cam.on('followupdate', () => {
  const z = cam.zoom;
  agentNames.setVisible(z > 0.7);        // 줌 70% 이상: 이름 표시
  statusParticles.setVisible(z > 0.5);    // 줌 50% 이상: 파티클
  deptLabelsLarge.setVisible(z < 0.6);    // 줌 60% 이하: 큰 라벨
});
```

#### 7-8-2. 배경 씬 연동 (방안 A + H 통합)

```
방안 A의 Cityscape 배경을 Phaser Scene으로 구현하면 최강 조합:

Scene 1: BackgroundScene (parallax)
  - 하늘 + 별 + 구름 (TileSprite, parallax factor 0.2)
  - 원경 빌딩 (parallax factor 0.4)
  - 근경 빌딩 (parallax factor 0.7)
  - 나무 + 지면 (parallax factor 1.0)

Scene 2: TowerScene (main)
  - 기존 타워 렌더링 (Roof/Penthouse/Floor/Basement/Elevator)
  - Main Camera + Minimap Camera

Scene 3: UIScene (overlay)
  - 좌측 패널, 우측 패널, 툴바 (DOM or Phaser UI)
  - 모든 카메라에서 고정 위치

this.scene.launch('BackgroundScene');
this.scene.launch('TowerScene');
this.scene.launch('UIScene');
```

#### 7-8-3. PixiJS 대비 Phaser 이점

| 기능 | PixiJS (현재) | Phaser 3 |
|------|-------------|----------|
| **줌/팬** | CSS transform hack | `camera.zoomTo()` + `camera.pan()` 네이티브 |
| **미니맵** | 별도 HTML canvas 수동 구현 | `cameras.add()` 두 번째 카메라 |
| **시맨틱 줌** | zoom 이벤트 리스너 수동 구현 | `camera.zoom` 체크 → `setVisible()` |
| **좌표 변환** | `getBoundingClientRect()` 계산 | `camera.getWorldPoint()` 네이티브 |
| **줌 애니메이션** | `requestAnimationFrame` 수동 보간 | `camera.zoomTo(z, duration, ease)` |
| **Parallax 배경** | Container offset 수동 계산 | `TileSprite` + `scrollFactor` |
| **씬 전환** | ref 교체 + 수동 cleanup | `SceneManager.switch()` |
| **입력 처리** | DOM event + 수동 좌표 변환 | `input.on()` + 자동 카메라 좌표 변환 |

#### 7-8-4. 마이그레이션 경로

```
Phase 19 (progress.md 참조) 순서와 통합:

M-1: pnpm remove pixi.js && pnpm add phaser
M-2: model.ts 상수 유지, Phaser 타입 교체
M-3~M-4: draw* 함수 → Phaser Graphics/GameObjects로 변환
M-5: buildScene → Scene.create() 메서드로 이동
M-6: officeTicker → Scene.update() + Tweens
M-7: useOfficePixiRuntime → useOfficePhaserRuntime
     - camera.zoomTo / camera.pan으로 네비게이션 UX 자동 해결
     - CSS hack 코드 전량 삭제 (applyFitAll, applyFloorFocus 불필요)

총 변환 대상: ~30개 파일, ~9,000줄
예상 순수 개발량: drawFloor 등 드로잉 함수는 Graphics API 1:1 매핑 가능
```

**장점:** 네비게이션 UX 문제 근본 해결, CSS hack 완전 제거, 미니맵/시맨틱줌/parallax 네이티브, 팩 씬 전환도 자연스럽게 해결
**단점:** 마이그레이션 비용 최대 (~30파일 9,000줄), 완료까지 시간 소요, pixi.js 코드 전량 교체

---

### 7-10. 전체 방안 비교 및 구현 우선순위

| 방안 | 타워 느낌 | 구현 난이도 | 비율 해결 | 기존 코드 재활용 | 정보 밀도 | 네비게이션 UX |
|------|----------|-----------|----------|----------------|----------|-------------|
| **A. 배경 씬** ★ | ★★★★★ | 중 | ◎ | ◎ (타워 코드 그대로) | ★★★ | CSS hack |
| **B. 6열 확장** | ★★★★ | 대 | ◎ | △ (drawFloor 전면 수정) | ★★★★ | CSS hack |
| **C. 아코디언** | ★★★ | 소 | ◎ | ○ (부분 재사용) | ★★★★ | React 상태 |
| **D. 2단 분할** | ★★★ | 중 | ◎ | △ (레이아웃 수정) | ★★★★ | CSS scroll |
| **E. 아이소메트릭** | ★★★★★ | 최대 | ◎ | ✕ (전면 교체) | ★★ | 수동 구현 |
| **F. 대시보드+미니타워** | ★★ | 중 | ◎ | ○ (타워 축소 재사용) | ★★★★★ | React 상태 |
| **G. 카드 그리드** | ✕ | 소 | ◎ | ✕ (PixiJS 폐기) | ★★★★★ | CSS Grid |
| **H. 시맨틱 줌 (LOD)** ★★ | ★★★★★ | 중 | ◎ | ◎ (줌별 분기) | ★★★★ | PixiJS 내 분기 |
| **I. Phaser 3** | ★★★★★ | 대 (마이그레이션) | ◎ | △→◎ (1:1 변환) | ★★★ | **네이티브** |

**추천 구현 전략**:

```
단기 (즉시 적용):  A+H (배경 씬 + 시맨틱 줌) — Overview 시 축소 바, 배경 씬 추가
중기 (마이그레이션): I (Phaser 3) — 근본 해결, A+H를 Phaser Scene으로 흡수
장기 (팩 확장):    I + 팩별 Scene (Phase 18-D) — SceneManager로 팩 전환
```

- **A+H 조합이 최적 단기 해법**: 배경 씬(빈 공간 채움) + 시맨틱 줌(부서 축소 바) → 전체 타워가 자연스럽게 화면에 맞음
- **I(Phaser 3)는 중기 근본 해결**: camera.zoomTo()로 모든 CSS hack 제거
- 독립 대안: C(아코디언)은 가장 빠르게 적용 가능
- G(카드 그리드)는 타워 은유를 포기하는 극단적 대안

---

### 7-11. 인터랙션 — 부서 클릭 시 줌인 전환

> 모든 방안 공통. 전체 뷰 → 특정 층 포커스 전환.

```
[전체 뷰]                          [층 포커스]

타워 + 배경, 전체 보임              선택 층 확대, 배경 dim
         │                                │
         │  부서 클릭                       │
         │──────────────────────→          │
         │  (400ms spring 애니메이션)       │
         │                                │
         │  배경/Overview 클릭              │
         │←──────────────────────          │
         │  (400ms spring 애니메이션)       │
```

**줌인 동작 상세:**
```typescript
// 1. towerContainer.scale 확대 (fitScale → 1.0 또는 더 큰 값)
// 2. towerContainer.position 이동 (선택 층이 뷰포트 중앙으로)
// 3. 배경 레이어 opacity → 0.15 (dim)
// 4. 좌/우 패널에 해당 부서/에이전트 정보 표시

// 줌인 시 canvas overflow: auto 전환 → 스크롤 가능
// 줌아웃 시 canvas overflow: hidden → 전체 고정
```

---

### 7-12. 층간 이동 인터랙션

| 입력 | 전체 뷰 | 층 포커스 |
|------|---------|----------|
| **좌측 패널 부서 클릭** | 줌인 + 해당 층 포커스 | 해당 층으로 smooth scroll |
| **좌측 패널 CEO/CONF/Break** | 줌인 + 해당 구역 포커스 | 해당 구역으로 scroll |
| **캔버스 부서 영역 클릭** | 줌인 + 해당 층 포커스 | 해당 부서 선택 |
| **캔버스 배경 클릭** | — | 줌아웃 → 전체 뷰 복귀 |
| **[Overview] 버튼** | — | 줌아웃 → 전체 뷰 복귀 |
| **마우스 휠 (캔버스)** | — | 수직 스크롤 |
| **키보드 ↑↓** | — | CEO 캐릭터 이동 |
| **ESC** | — | 줌아웃 → 전체 뷰 복귀 |

### 7-13. 모바일 대응

```
< 1024px:
  • 전체 뷰가 기본 (배경 씬 + 타워)
  • 부서 탭 시 줌인 (해당 층 확대)
  • 위/아래 스와이프 = 층 간 스냅 이동
  • VirtualPadOverlay 유지

1024~1279px:
  • 전체 뷰 기본, 우측 패널은 오버레이

≥ 1280px:
  • 3-컬럼 + 전체 타워 뷰 (배경 씬)
```

### 7-14. 기술 구현 요약

```
변경 파일:
  buildScene.ts      — 캔버스를 뷰포트 크기로 확장, 배경 + 타워 Container 분리
  model.ts           — SCENE_W, SCENE_H, SKY_H, GROUND_H 상수 추가
  OfficeView.tsx     — applyFitAll/applyFloorFocus를 줌인/줌아웃 애니메이션으로 교체

신규 파일:
  drawCityscape.ts   — 배경 씬 렌더링 (하늘, 빌딩, 나무, 지면)

기존 파일 변경 없음:
  drawRoof.ts, drawPenthouse.ts, drawFloor.ts, drawBasement.ts,
  drawElevator.ts, drawExteriorWalls.ts, elevatorTick.ts, officeTicker.ts
  → 모두 towerContainer 안에서 기존 좌표 그대로 동작
```

---

## 8. FM UI Wrapper — Office View Screen Layout (구현 완료)

### 8-1. 화면 구조

```
┌─ FM TOOLBAR ──────────────────────────────────────────────────────────┐
│  ▶ AgentDesk HQ · NF Tower  [RUNNING] [TASKS]  HH:MM [Overview] [▾]  │  h:44px
├──────────────────┬───────────────────────────────┬────────────────────┤
│                  │                               │                    │
│  LEFT PANEL      │   PIXI CANVAS (center)        │  RIGHT PANEL       │
│  w:180px         │   flex-1, min-w: 410px        │  w:240px           │
│                  │   bg: #010409                 │                    │
│  Building nav    │   .office-canvas-wrap          │  Agent/Dept info   │
│  + Dept list     │   overflow: auto (scroll)     │  + quick actions   │
│  + CLI usage     │                        [mini] │                    │
│                  │                        [map ] │                    │
├──────────────────┴───────────────────────────────┴────────────────────┤
│  ◉ LIVE  [FM ticker events scrolling...]                              │  h:24px
├───────────────────────────────────────────────────────────────────────┤
│  AGT 3/5  │  TSK 2/8  │  DEPT 4  │  BREAK 1  │  VISIT 2    RUNNING  │  h:32px
└───────────────────────────────────────────────────────────────────────┘
```

### 8-2. 좌측 패널 — OfficeDeptPanel (구현 완료)

```
Building header → CEO Penthouse (P) → Meeting Room (CONF) →
부서 목록 (F1, F2, ...) → Break Room (B1) → CLI Usage

각 부서 아이템:
  - 층수 뱃지 (F1, F2...)
  - 활동 인디케이터 (green/amber/red dot)
  - 에이전트 수 (W=working, I=idle, B=break)
  - 태스크 요약 (▶N ACTIVE / ✓N DONE)
  - LIFT 버튼 (엘리베이터 호출)
  - 방문자 뱃지 (visitor count)
```

### 8-3. 우측 패널 — OfficeAgentPanel (구현 완료)

```
[상태 A] 미선택: "$ select an agent or dept"
[상태 B] 에이전트 선택: 이름, 역할, 상태, 속성바, 태스크 목록
[상태 C] 부서 선택: 부서명, 통계, 에이전트 리스트
```

### 8-4. 하단 바 (구현 완료)

- FM 라이브 이벤트 티커: HQ CAPACITY, agent activity, dept highlights
- 액션바: AGT, TSK, DEPT, BREAK, VISIT 통계 + RUNNING/IDLE 상태

---

## 9. Implementation Status

### Phase O-1 — Model Updates ✅ DONE

- [x] Tower constants in `model.ts`
- [x] `ElevatorTickState` interface
- [x] `RoomRect`, `WallClockVisual` types
- [x] `totalH` / `officeW` calculation

### Phase O-2 — Layout Engine ✅ DONE

- [x] `buildScene.ts` — full tower layout orchestrator
- [x] `drawRoof.ts` — helipad, antenna, HQ sign
- [x] `drawPenthouse.ts` — CEO office + lounge
- [x] `drawConferenceFloor.ts` — meeting room
- [x] `drawFloor.ts` — department floor (agent slots + hallway)
- [x] `drawBasement.ts` — break room
- [x] `drawElevator.ts` — elevator shaft, car, button panel, LEDs
- [x] `drawExteriorWalls.ts` — left/right walls with windows, fire escape

### Phase O-3 — Animations ✅ DONE

- [x] Elevator car movement tick logic (`elevatorTick.ts`)
- [x] Elevator door open/close sequence
- [x] Exterior window flicker timer
- [x] Antenna LED blink
- [x] Seasonal particles (4 seasons)
- [x] Visitor tick system (`visitorTick.ts`)

### Phase O-4 — Delivery & Interaction ✅ DONE

- [x] Delivery walk via hallway strip
- [x] Cross-department delivery animations
- [x] CEO office call animations
- [x] Meeting presence sync
- [x] Department sign click → onSelectDepartment
- [x] Agent sprite click → onSelectAgent

### Phase O-5 — 네비게이션 UX 🔧 IN PROGRESS

- [x] 기본 뷰 = 스크롤 모드 (Level 2), 상단부터 표시
- [x] 부서 클릭 → smooth scroll (좌표 변환 적용)
- [x] CEO/CONF/Break 클릭 → smooth scroll
- [x] Overview 토글 버튼 (transform:scale 기반)
- [ ] **배경 씬 (Cityscape) 구현** — Section 7-1 (방안 A ★)
- [ ] **세로 미니맵**
- [ ] **줌 컨트롤 UI**
- [ ] **마우스 휠 줌** (Ctrl+wheel)
- [ ] **키보드 단축키** (Home/End, Ctrl+0/1/2)
- [ ] **모바일 층 인디케이터** — Section 7-8

---

## 10. Files Reference (현재 구현)

| 파일 | 역할 |
|------|------|
| `src/components/OfficeView.tsx` | 3-컬럼 레이아웃, 줌/스크롤 관리, 패널 상태 |
| `src/components/office-view/model.ts` | 상수, 타입, 유틸리티 |
| `src/components/office-view/buildScene.ts` | 타워 씬 빌드 오케스트레이터 |
| `src/components/office-view/drawRoof.ts` | 루프탑 렌더링 |
| `src/components/office-view/drawPenthouse.ts` | CEO 펜트하우스 렌더링 |
| `src/components/office-view/drawConferenceFloor.ts` | 회의실 렌더링 |
| `src/components/office-view/drawFloor.ts` | 부서 층 렌더링 |
| `src/components/office-view/drawBasement.ts` | 지하 휴게실 렌더링 |
| `src/components/office-view/drawElevator.ts` | 엘리베이터 샤프트/카 |
| `src/components/office-view/drawExteriorWalls.ts` | 외벽/창문 |
| `src/components/office-view/elevatorTick.ts` | 엘리베이터 상태 머신 |
| `src/components/office-view/officeTicker.ts` | 메인 애니메이션 루프 |
| `src/components/office-view/visitorTick.ts` | 방문자 애니메이션 |
| `src/components/office-view/useOfficePixiRuntime.ts` | PixiJS 초기화/정리 |
| `src/components/office-view/OfficeDeptPanel.tsx` | 좌측 부서 목록 패널 |
| `src/components/office-view/OfficeAgentPanel.tsx` | 우측 에이전트/부서 패널 |
| `src/components/office-view/VirtualPadOverlay.tsx` | 모바일 가상 패드 |
| `src/components/office-view/seasonal-particles.ts` | 계절 파티클 |
| `src/components/office-view/drawing-styles/*.ts` | 스타일 어댑터 (pixel/svg) |
| `src/styles/index.part03.css` | `.office-*` CSS 클래스 |

---

## Reference

- UX 레퍼런스: SimTower (미니맵+스크롤), Two Point Hospital (시맨틱 줌), Figma (Zoom-to-Fit)
- 기술: pixi-viewport, Steve Ruiz zoom-ui 패턴, CSS transform:scale
- Progress tracking: `docs/progress.md`
