# PixiJS → Phaser 3 마이그레이션 계획

> Created: 2026-03-08
> Status: IN PROGRESS
> 연관 문서: `docs/pack-identity-system.md` (Phase 18-D 팩별 씬)

---

## 왜 Phaser로 전환하는가

현재 PixiJS로 직접 구현하느라 코드가 복잡해진 기능들이 Phaser에는 내장되어 있다.

| 현재 PixiJS 상황 | Phaser 3 내장 |
|---|---|
| Overview Mode → CSS scale 우회법 | **Camera.zoomTo()** 한 줄 |
| 미니맵 → 별도 HTML 2D canvas 구현 | **cameras.add()** 두 번째 카메라 |
| 엘리베이터 상태머신 수동 구현 (~200줄) | **Tweens + Timeline** |
| 방문자 이동 경로 수동 보간 | **Tweens.chain()** |
| 계절 파티클 수동 스폰 | **Particles emitter** 내장 |
| 팩별 씬 전환 → ref 교체 | **SceneManager.switch()** |
| 터치/마우스 히트박스 수동 관리 | **setInteractive() + Input** |

---

## 규모 현황

```
총 코드량: 12,938줄 / 30개 파일 (PixiJS 직접 의존)

상위 파일:
  OfficeView.tsx                 1,027줄  (React 래퍼)
  officeTicker.ts                  773줄  (메인 틱 루프)
  drawing-furniture-a.ts           570줄  (가구 드로잉)
  visitorTick.ts                   542줄  (방문자 이동)
  drawFloor.ts                     489줄  (층 렌더링)
  themes-locale.ts                 485줄  (색상 테마)
  useOfficeDeliveryEffects.ts      464줄  (배달 애니메이션)
  buildScene-departments.ts        417줄  (부서 씬)
  buildScene.ts                    397줄  (씬 진입점)
  model.ts                         373줄  (상수/타입)
  drawing-core.ts                  370줄  (기본 도형)
  buildScene-ceo-hallway.ts        343줄  (CEO 층)
  ...
```

**이전 불가 파일 (React 패널, 유지):**
- `OfficeAgentPanel.tsx` (498줄)
- `OfficeDeptPanel.tsx` (278줄)
- `CliUsagePanel.tsx` (477줄)
- `HeartbeatPanel.tsx` (723줄)
- `RoomLayoutEditor.tsx` (285줄)
- `OfficeQuickChat.tsx`
- `VirtualPadOverlay.tsx`

→ **실제 마이그레이션 대상: ~9,000줄 / 23개 파일**

---

## Phaser 3 핵심 개념 매핑

### 초기화

```typescript
// PixiJS (현재)
const app = new Application();
await app.init({ width: OFFICE_W, height: totalH, background: 0x0f1117 });
containerRef.current.appendChild(app.canvas);

// Phaser 3 (이후)
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: OFFICE_W,
  height: totalH,           // 동적 — 씬 create() 에서 resize
  backgroundColor: '#0f1117',
  parent: containerRef.current,
  scene: [OfficeSceneDev],
  scale: { mode: Phaser.Scale.NONE },
  render: { antialias: false, pixelArt: true },  // 픽셀아트 유지
});
```

---

### Graphics API

가장 많이 쓰이는 API — 전체 드로잉 코드에 영향.

```typescript
// PixiJS
const g = new Graphics();
g.beginFill(0xff0000, 0.5);
g.drawRect(x, y, w, h);
g.endFill();
g.lineStyle(1, 0xffffff, 1);
g.drawRect(x, y, w, h);
container.addChild(g);

// Phaser 3
const g = this.add.graphics();
g.fillStyle(0xff0000, 0.5);
g.fillRect(x, y, w, h);
g.lineStyle(1, 0xffffff, 1);
g.strokeRect(x, y, w, h);
container.add(g);           // container.addChild → container.add
```

**전체 치환 패턴:**

| PixiJS | Phaser 3 |
|---|---|
| `new Graphics()` | `this.add.graphics()` |
| `g.beginFill(c, a)` | `g.fillStyle(c, a)` |
| `g.endFill()` | 없음 (불필요) |
| `g.drawRect(x,y,w,h)` | `g.fillRect(x,y,w,h)` |
| `g.drawRoundedRect(x,y,w,h,r)` | `g.fillRoundedRect(x,y,w,h,r)` |
| `g.drawCircle(x,y,r)` | `g.fillCircle(x,y,r)` |
| `g.moveTo(x,y)` | `g.moveTo(x,y)` (동일) |
| `g.lineTo(x,y)` | `g.lineTo(x,y)` (동일) |
| `g.lineStyle(w,c,a)` | `g.lineStyle(w,c,a)` (동일) |
| `g.stroke()` | `g.strokePath()` |
| `g.clear()` | `g.clear()` (동일) |
| `g.destroy()` | `g.destroy()` (동일) |

---

### Text

```typescript
// PixiJS
const t = new Text("HELLO", new TextStyle({ fontSize: 12, fill: 0xfbbf24 }));
t.position.set(x, y);
container.addChild(t);

// Phaser 3
const t = this.add.text(x, y, "HELLO", {
  fontSize: '12px',
  color: '#fbbf24',
  fontFamily: 'monospace',
});
container.add(t);
```

---

### Container

```typescript
// PixiJS
const c = new Container();
c.position.set(x, y);
c.addChild(child1, child2);
parent.addChild(c);

// Phaser 3
const c = this.add.container(x, y);
c.add([child1, child2]);
// 최상위면 this.add.container이 자동으로 씬에 추가됨
// 부모 컨테이너에 넣으려면:
parentContainer.add(c);
```

---

### 위치/변환

```typescript
// PixiJS
obj.position.set(x, y);
obj.x = x; obj.y = y;
obj.alpha = 0.5;
obj.visible = false;
obj.scale.set(0.5);

// Phaser 3
obj.setPosition(x, y);
obj.x = x; obj.y = y;      // 동일
obj.setAlpha(0.5);
obj.setVisible(false);
obj.setScale(0.5);
```

---

### 틱 루프 (officeTicker.ts 핵심)

```typescript
// PixiJS
app.ticker.add((ticker) => {
  const delta = ticker.deltaMS;
  // 매 프레임 로직
});

// Phaser 3 — Scene의 update 메서드
class OfficeScene extends Phaser.Scene {
  update(time: number, delta: number) {
    // officeTicker.ts의 로직이 여기로
    // delta는 ms 단위 (동일)
  }
}
```

---

### 인터랙티브 히트박스

```typescript
// PixiJS
g.eventMode = 'static';
g.cursor = 'pointer';
g.on('pointertap', handler);
g.hitArea = new Rectangle(x, y, w, h);

// Phaser 3
g.setInteractive(new Phaser.Geom.Rectangle(x, y, w, h),
  Phaser.Geom.Rectangle.Contains);
g.on('pointerdown', handler);
this.input.setHitArea([g]);
```

---

## 씬 아키텍처 (Pack Identity와 통합)

Phaser Scene = Pack별 독립 렌더러. 팩 전환 = 씬 전환.

```
Phaser.Game
├── Scene: 'dev'    ← 현재 DEV 팩 (buildScene.ts 이전)
├── Scene: 'report' ← 뉴스룸 수평 레이아웃 (Phase 18-D)
├── Scene: 'novel'  ← 산장 단면도 (Phase 18-D)
├── Scene: 'video'  ← 스튜디오 탑뷰 (Phase 18-D)
├── Scene: 'rpg'    ← 던전 단면도 (Phase 18-D)
└── Scene: 'asset'  ← 트레이딩 플로어 (Phase 18-D)
```

**팩 전환 코드:**
```typescript
// OfficeView.tsx
useEffect(() => {
  if (!gameRef.current) return;
  const game = gameRef.current;
  const current = game.scene.getScenes(true)[0];
  if (current) game.scene.stop(current.sys.key);
  game.scene.start(activePackKey);  // 'dev' | 'report' | ...
}, [activePackKey]);
```

**React → Phaser 데이터 전달:**
```typescript
// 씬이 시작될 때 초기 데이터 전달
game.scene.start('dev', { departments, agents, tasks, settings });

// 런타임 업데이트 (React 상태 변경 시)
const scene = game.scene.getScene('dev') as OfficeSceneDev;
scene.updateData({ departments, agents, tasks });

// Phaser → React 콜백 (에이전트 클릭 등)
game.scene.start('dev', {
  onSelectAgent: (agent) => setSelectedAgent(agent),
  onSelectDept: (dept) => setSelectedDept(dept),
});
```

---

## Overview Mode — Phaser Camera

CSS scale 우회법 불필요. Phaser Camera가 네이티브로 처리.

```typescript
// OfficeScene.ts 내부
handleOverviewToggle(enable: boolean) {
  const cam = this.cameras.main;
  if (enable) {
    const fitZoom = Math.min(
      this.scale.width / OFFICE_W,
      this.scale.height / this.totalH,
    ) * 0.95;
    cam.zoomTo(fitZoom, 400, 'Linear', true);
    cam.pan(OFFICE_W / 2, this.totalH / 2, 400, 'Linear', true);
  } else {
    cam.zoomTo(1, 300, 'Linear', true);
    cam.pan(OFFICE_W / 2, this.lastScrollY, 300);
  }
}
```

---

## 미니맵 — Phaser 두 번째 카메라

별도 HTML canvas 구현 불필요. Phaser의 Camera가 같은 씬을 두 번 렌더링.

```typescript
// OfficeScene.create() 내부
setupMinimap() {
  const minimapW = 72;
  const minimapH = Math.min(200, this.scale.height * 0.4);

  this.minimapCamera = this.cameras.add(
    this.scale.width - minimapW - 8,  // 우하단 X
    this.scale.height - minimapH - 48, // 액션바 위
    minimapW,
    minimapH,
  )
  .setZoom(minimapW / OFFICE_W)
  .setBounds(0, 0, OFFICE_W, this.totalH)
  .setBackgroundColor('#0a0a0a')
  .setName('minimap');

  // 미니맵 테두리 (메인 카메라에서만 보이는 UI)
  this.minimapBorder = this.add.graphics()
    .lineStyle(1, 0xfbbf24, 0.4)
    .strokeRect(
      this.scale.width - minimapW - 8 - 1,
      this.scale.height - minimapH - 48 - 1,
      minimapW + 2, minimapH + 2,
    );
  this.minimapBorder.setScrollFactor(0); // HUD처럼 고정
}
```

**뷰포트 인디케이터 (미니맵 위 amber rect):**
```typescript
// update()에서 매 프레임 갱신
updateMinimapViewport() {
  const cam = this.cameras.main;
  const scale = this.minimapCamera.zoom;
  // amber 반투명 rect를 미니맵 카메라 좌표계에서 그림
  this.viewportIndicator.clear();
  this.viewportIndicator.fillStyle(0xfbbf24, 0.25);
  this.viewportIndicator.fillRect(
    cam.scrollX * scale,
    cam.scrollY * scale,
    (cam.width / cam.zoom) * scale,
    (cam.height / cam.zoom) * scale,
  );
}
```

---

## 엘리베이터 — Phaser Tweens

```typescript
// 현재 (elevatorTick.ts): 수동 상태머신 + 선형 보간
// if (elapsed > duration) { state = 'open'; ... }

// Phaser (이후): Timeline으로 교체
moveElevatorTo(targetFloor: number) {
  const targetY = this.floorPositions[targetFloor];
  this.tweens.chain({
    targets: this.elevatorCar,
    tweens: [
      { y: targetY, duration: 600, ease: 'Quad.easeInOut' },
      { alpha: 1, duration: 100, onStart: () => this.openDoor() },
      { alpha: 1, duration: 1500, onComplete: () => this.closeDoor() },
    ],
  });
}
```

---

## 방문자 이동 — Phaser Tweens.chain

```typescript
// 현재 (visitorTick.ts): 12단계 상태머신 + 수동 보간 (~542줄)

// Phaser (이후): Tween 체인으로 교체
spawnVisitor(fromDept: Department, toDept: Department) {
  const visitor = this.add.container(startX, startY);
  this.tweens.chain({
    targets: visitor,
    tweens: [
      { x: hallwayX, duration: 800 },           // 복도 진입
      { y: targetFloorY, duration: 1200 },       // 엘리베이터 이동
      { x: deskX, y: deskY, duration: 600 },    // 목적지 이동
      { alpha: 1, duration: 2000 },              // 방문 대기
      { x: hallwayX, duration: 600 },            // 복귀
      { y: homeFloorY, duration: 1200 },
      { x: homeX, y: homeY, duration: 600 },
      { alpha: 0, duration: 200,                 // 스폰 해제
        onComplete: () => visitor.destroy() },
    ],
  });
}
```

---

## 계절 파티클 — Phaser Particles

```typescript
// 현재 (seasonal-particles.ts): 수동 스폰/이동 구현

// Phaser (이후)
this.add.particles(0, 0, 'snow', {
  x: { min: 0, max: OFFICE_W },
  y: { min: -10, max: 0 },
  speedY: { min: 30, max: 80 },
  speedX: { min: -20, max: 20 },
  scale: { min: 0.3, max: 0.8 },
  alpha: { min: 0.4, max: 0.9 },
  lifespan: 6000,
  quantity: 1,
  frequency: 200,
});
```

---

## React 통합 패턴

`useOfficePixiRuntime.ts` → `useOfficePhaserRuntime.ts` 로 교체.

```typescript
// src/components/office-view/useOfficePhaserRuntime.ts

export function useOfficePhaserRuntime({
  containerRef,
  departments, agents, tasks,
  activePackKey,
  onSelectAgent, onSelectDept,
}: OfficeRuntimeProps) {
  const gameRef = useRef<Phaser.Game | null>(null);

  // 1. Phaser.Game 초기화
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0f1117',
      scene: [OfficeSceneDev, OfficeSceneRpg, OfficeSceneAsset, ...],
      scale: { mode: Phaser.Scale.NONE },
      render: { antialias: false },
    });

    gameRef.current.scene.start(activePackKey, {
      departments, agents, tasks,
      onSelectAgent, onSelectDept,
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []); // 마운트 시 1회

  // 2. 데이터 변경 → 씬에 전달
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene(activePackKey) as OfficeSceneDev;
    scene?.updateData({ departments, agents, tasks });
  }, [departments, agents, tasks, activePackKey]);

  // 3. 팩 전환 → 씬 전환
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const running = game.scene.getScenes(true)[0];
    if (running) game.scene.stop(running.sys.key);
    game.scene.start(activePackKey, { departments, agents, tasks, onSelectAgent, onSelectDept });
  }, [activePackKey]);

  return { gameRef };
}
```

---

## 마이그레이션 순서

코드 의존성을 고려한 **Bottom-Up** 전략. 하위 드로잉 유틸부터 올라간다.

### Phase M-1 — 패키지 교체 (0.5일)
```bash
pnpm remove pixi.js
pnpm add phaser
```
- `tsconfig.json` Phaser 타입 확인
- 빌드 오류 목록 추출 → 마이그레이션 대상 확정

---

### Phase M-2 — 기반 타입/상수 이전 (0.5일)

**대상**: `model.ts`, `buildScene-types.ts`, `themes-locale.ts`

- `model.ts`: PixiJS Container/Graphics/Text 타입 import → Phaser 타입으로 교체
  ```typescript
  // 이전
  import { Container, Graphics, Text } from 'pixi.js';
  // 이후
  import Phaser from 'phaser';
  type PhaserContainer = Phaser.GameObjects.Container;
  type PhaserGraphics = Phaser.GameObjects.Graphics;
  ```
- `buildScene-types.ts`: `BuildSceneContext`의 `app: Application` → `scene: Phaser.Scene`
- `themes-locale.ts`: 색상 값 그대로 유지 (hex 숫자는 동일)

---

### Phase M-3 — 드로잉 원시 함수 이전 (2일)

**대상**: `drawing-core.ts`, `drawing-furniture-a.ts`, `drawing-furniture-b.ts`

모든 함수의 시그니처 변경:
```typescript
// 이전
function drawDesk(g: Graphics, x: number, y: number) { ... }

// 이후
function drawDesk(g: Phaser.GameObjects.Graphics, x: number, y: number) { ... }
```

내부 호출 변환 (find & replace 가능한 패턴):
- `beginFill(` → `fillStyle(`
- `endFill()` → 삭제
- `drawRect(` → `fillRect(`
- `drawRoundedRect(` → `fillRoundedRect(`
- `drawCircle(x, y, r)` → `fillCircle(x, y, r)`

---

### Phase M-4 — 개별 드로잉 모듈 이전 (2일)

**대상** (의존성 낮은 순):
1. `drawRoof.ts`
2. `drawExteriorWalls.ts`
3. `drawBasement.ts`
4. `drawElevator.ts`
5. `drawConferenceFloor.ts`
6. `drawPenthouse.ts`
7. `drawFloor.ts`

각 파일: Graphics API 교체 + Container.addChild → container.add + Text 스타일 객체 형식 변경

---

### Phase M-5 — 씬 빌더 이전 (2일)

**대상**: `buildScene-*.ts` 6개 파일, `buildScene.ts`

기존 `buildScene(app, ...)` 함수 → `OfficeSceneDev.create()` 메서드로 이전.

```typescript
// 이전 (buildScene.ts)
export function buildScene(app: Application, ctx: BuildSceneContext) {
  const container = new Container();
  app.stage.addChild(container);
  drawRoof(container, ...);
  // ...
}

// 이후 (OfficeSceneDev.ts)
export class OfficeSceneDev extends Phaser.Scene {
  create(data: OfficeSceneData) {
    this.root = this.add.container(0, 0);
    drawRoof(this, this.root, ...);
    // ...
  }
}
```

---

### Phase M-6 — 애니메이션 시스템 이전 (3일)

**대상**: `officeTicker.ts`, `officeTickerRoomAndDelivery.ts`, `elevatorTick.ts`, `visitorTick.ts`, `seasonal-particles.ts`, `useOfficeDeliveryEffects.ts`

전략:
- `officeTicker.ts` 메인 틱 루프 → `OfficeSceneDev.update()` 메서드
- `elevatorTick.ts` 상태머신 → Phaser Tweens.chain (대폭 단순화)
- `visitorTick.ts` 방문자 상태머신 → Phaser Tweens.chain (대폭 단순화)
- `seasonal-particles.ts` → Phaser Particles emitter
- `useOfficeDeliveryEffects.ts` → Phaser Tweens + 씬 이벤트

---

### Phase M-7 — React 래퍼 이전 (1일)

**대상**: `useOfficePixiRuntime.ts` → `useOfficePhaserRuntime.ts`, `OfficeView.tsx`

- `useOfficePhaserRuntime.ts` 신규 작성 (위 패턴 참고)
- `OfficeView.tsx`: import 교체, overview mode → Camera.zoomTo, 미니맵 → 두 번째 Camera
- 기존 React 패널들 (`OfficeDeptPanel`, `OfficeAgentPanel` 등)은 수정 없음

---

### Phase M-8 — Drawing Styles 이전 (1일)

**대상**: `drawing-styles/` 폴더 (pixel-drawer, retro-drawer 등)

- `svg-drawer-base.ts`의 PixiJS 타입 → Phaser 타입으로 교체
- 각 drawer의 Graphics 호출 패턴 변환

---

### Phase M-9 — 검증 및 QA (1일)

- 전체 빌드 통과 (`pnpm build`)
- 오피스 뷰 기능 체크리스트:
  - [ ] 빌딩 렌더링 (층/가구/에이전트)
  - [ ] 엘리베이터 이동
  - [ ] 방문자 시스템
  - [ ] 에이전트 클릭 → 우측 패널 연동
  - [ ] 부서 패널 층 클릭 → 카메라 이동
  - [ ] Overview Mode (Camera.zoomTo)
  - [ ] 미니맵 (두 번째 Camera)
  - [ ] 계절 파티클
  - [ ] 태스크 완료 이펙트
  - [ ] CEO 커스터마이즈 반영

---

## 마이그레이션 체크리스트

| Phase | 대상 | 파일 수 | 예상 기간 | 상태 |
|---|---|---|---|---|
| M-0 | **Phaser 호환 심 (pixi-compat.ts)** | 1 | — | ✅ DONE |
| M-0a | **Tween 기반 파티클 전환** | 8 | — | ✅ DONE |
| M-0b | **Crown bob / Task bounce → tweenNode** | 3 | — | ✅ DONE |
| M-1 | 패키지 교체 | 1 | 0.5일 | SKIP (심 사용) |
| M-2 | 기반 타입/상수 | 3 | 0.5일 | SKIP (심 사용) |
| M-3 | 드로잉 원시 함수 | 3 | 2일 | SKIP (심 사용) |
| M-4 | 개별 드로잉 모듈 | 7 | 2일 | SKIP (심 사용) |
| M-5 | 씬 빌더 | 7 | 2일 | SKIP (심 사용) |
| M-6 | 애니메이션 시스템 | 6 | 3일 | **IN PROGRESS** |
| M-7 | React 래퍼 | 2 | 1일 | TODO |
| M-8 | Drawing Styles | 6 | 1일 | SKIP (심 사용) |
| M-9 | 검증 및 QA | — | 1일 | TODO |

### 완료된 Phaser 네이티브 전환 (Phase 4)

**Phase 4A — 파티클 → spawnParticleTween (✅)**
- CEO 트레일 파티클: 수동 `_life`/위치/알파 업데이트 → 자동 tween
- 에이전트 작업 스파클: `_vy`/`_life` 추적 → 자동 tween
- 땀/수면/어지러움 파티클: 3가지 수동 루프 → 자동 tween
- 서브클론 버스트 파티클: `SubCloneBurstParticle` 타입+배열 전체 제거 (8개 파일)
- 휴게실 스팀: 수동 업데이트 루프 → 자동 tween

**Phase 4B — 연속 애니메이션 → tweenNode (✅)**
- 왕관 흔들림: 매 틱 Math.sin → persistent yoyo tween (buildScene에서 1회 생성)
- 태스크 수신 바운스: 수동 감쇠 스프링 → Bounce.easeOut tween
- crownRef 틱커 컨텍스트에서 제거, CEO_SPEED 미사용 import 제거

**유지 (수동 per-frame 코드가 적합한 항목):**
- 에이전트 호흡/흔들림: tick+phase 의존, 상태별 분기
- 하이라이트/LED 펄스: 매 프레임 Graphics 재그리기
- 서브클론 드리프트: 다중 주파수 사인파
- 엘리베이터 상태머신: 명시적 상태 전환이 더 명확
- 계절 파티클: 바람 효과 사인파 의존

---

## 유지되는 코드 (수정 없음)

| 파일 | 이유 |
|---|---|
| `model.ts` 상수값 | FLOOR_W, SLOT_H 등 숫자값 동일 |
| `themes-locale.ts` 색상값 | hex 숫자 그대로 사용 |
| `ceo-customization.ts` | 데이터 타입만 정의 |
| `furniture-catalog.ts` | 가구 메타데이터만 정의 |
| `room-decoration.ts` | 방 배치 데이터만 정의 |
| `OfficeAgentPanel.tsx` | 순수 React, Phaser 무관 |
| `OfficeDeptPanel.tsx` | 순수 React |
| `CliUsagePanel.tsx` | 순수 React |
| `HeartbeatPanel.tsx` | 순수 React |
| `RoomLayoutEditor.tsx` | 순수 React |
| `OfficeQuickChat.tsx` | 순수 React |

---

## 주의사항

### Phaser 버전
- **Phaser 3.88+** 사용 (최신 안정 버전)
- Phaser 4는 아직 알파 — 사용하지 않음

### 픽셀아트 렌더링 유지
```typescript
new Phaser.Game({
  render: {
    antialias: false,      // 계단 현상 허용 (픽셀아트)
    pixelArt: true,        // 텍스처 nearest-neighbor
    roundPixels: true,     // 서브픽셀 렌더링 방지
  }
});
```

### React StrictMode 이중 마운트
- `useEffect` cleanup에서 `game.destroy(true)` 반드시 호출
- `gameRef.current` null 체크로 이중 초기화 방지

### 씬 데이터 업데이트 빈도
- departments/agents는 빈번히 바뀌지 않음 → `updateData()` 호출 시 씬 rebuild
- tasks/animations은 빈번 → 씬 내부 ref로 관리, React 상태 동기화는 throttle 적용
