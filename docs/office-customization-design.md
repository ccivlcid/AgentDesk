# Office Customization & Decoration Feature Design

## 1. Current Architecture Summary

### 1.1 Rendering Stack
- **PixiJS** (pixi.js) for all office rendering - pure 2D Canvas/WebGL
- **~4,800 lines** across 17 files in `src/components/office-view/`
- All graphics drawn procedurally via `Graphics` primitives (no sprite sheets/image assets)

### 1.2 File Structure
```
src/components/
  OfficeView.tsx              # Main component, event handling, CEO movement
  office-view/
    model.ts                  # Constants, types (TILE=20, SLOT=100x120, etc.)
    themes-locale.ts          # Color palettes (light/dark), locale texts, dept themes
    drawing-core.ts           # Low-level: floor tiles, windows, clocks, rugs, lights, etc.
    drawing-furniture-a.ts    # Desk, monitor, chair, plant, whiteboard
    drawing-furniture-b.ts    # Bookshelf, coffee machine, sofa, vending machine, high table
    buildScene.ts             # Scene orchestrator - calls sub-builders
    buildScene-ceo-hallway.ts # CEO office zone + hallway
    buildScene-departments.ts # Department rooms layout
    buildScene-department-agent.ts # Agent slots inside departments
    buildScene-break-room.ts  # Break room with sofas, coffee, chat bubbles
    buildScene-final-layers.ts # Overlay layers (stats bar, hints)
    buildScene-types.ts       # Shared types for build context
    officeTicker.ts           # Per-frame animation (breathing, working, idle gestures)
    officeTickerRoomAndDelivery.ts # Room-level animation + delivery animations
    useOfficePixiRuntime.ts   # React hook for PixiJS lifecycle
    useOfficeDeliveryEffects.ts # Meeting presence, cross-dept delivery, CEO office calls
    useCliUsage.ts            # CLI usage data hook
```

### 1.3 Existing Customization Mechanisms
- **`customDeptThemes`**: `Record<deptId, { floor1, floor2, wall, accent }>` - per-department color themes
  - Stored in localStorage via `RoomThemeMap`
  - Applied through `officePresentation.roomThemes` in AppMainLayout
  - `themeHighlightTargetId` for preview highlighting
- **Light/Dark mode**: `applyOfficeThemeMode(isDark)` switches entire palette
- **Workflow Pack themes**: `getOfficePackRoomThemes(packKey)` applies pack-specific colors

### 1.4 Current Room Layout
```
┌─────────────────────────────────┐
│         CEO Office (110px)       │  Gold theme, desk, trophy, plant
├─────────────────────────────────┤
│         Hallway (32px)           │  Tile corridor
├────────┬────────┬────────┤
│  Dept  │  Dept  │  Dept  │       3 columns x N rows
│ Room 1 │ Room 2 │ Room 3 │       Each: SLOT_W(100) x SLOT_H(120) per agent
├────────┴────────┴────────┤
│       Break Room (110px)         │  Sofas, coffee, vending, chat bubbles
└─────────────────────────────────┘
```

### 1.5 Existing Furniture/Decorations
| Category     | Items |
|-------------|-------|
| Desks       | Wooden desk with keyboard, monitor (dual/single), paper stack |
| Seating     | Office chair, sofa (break room) |
| Storage     | Bookshelf, filing cabinet |
| Appliances  | Coffee machine, vending machine, water cooler |
| Decor       | Plants (potted), picture frames, rugs, ceiling lights, wall clocks |
| Structure   | Windows with curtains/sunlight, bunting flags, tiled floors |

---

## 2. Feature Proposals

### 2.1 Office Theme Presets (Easy - 추천 1순위)
사전 정의된 오피스 전체 테마를 선택하여 분위기를 한 번에 변경.

**Theme Ideas:**
| Theme | Description | Floor | Wall | Accent |
|-------|------------|-------|------|--------|
| Classic Warm | 현재 기본 (따뜻한 우드톤) | Cream/Sand | Warm brown | Gold |
| Modern Minimal | 깔끔한 그레이/화이트 모던 사무실 | Light gray | Cool gray | Teal |
| Startup Neon | 네온 포인트의 트렌디한 스타트업 | Dark charcoal | Dark navy | Neon cyan/pink |
| Nature Green | 숲속 오피스 느낌 (식물 많음) | Sage green | Forest | Leaf green |
| Cozy Cafe | 카페형 따뜻한 인테리어 | Warm beige | Terracotta | Coffee brown |
| Cyberpunk | 사이버펑크/미래적 | Deep purple | Dark blue | Electric violet |
| Sakura | 벚꽃/봄 테마 | Soft pink | Rose | Cherry blossom |
| Ocean | 바다/해안 테마 | Sand beige | Ocean blue | Coral |

**구현 방향:**
- `officeThemePresets` 상수 정의 (전체 팔레트: CEO, 부서별, 휴게실, 복도)
- Settings에서 프리셋 선택 → `customRoomThemes` + 전역 팔레트 일괄 적용
- 현재 `RoomThemeMap` 구조 그대로 활용 가능

### 2.2 Department Room Decoration (Medium - 추천 2순위)
부서별 방을 개별 커스터마이즈. 가구 배치, 벽 장식, 바닥 스타일 변경.

**Customizable Elements:**
- **Wall decorations**: 그림액자 종류 변경 (풍경/추상/사진/없음)
- **Floor style**: 타일 패턴 변경 (기본 체커/우드/카펫/콘크리트)
- **Plants**: 식물 종류/위치/개수 (선인장, 몬스테라, 작은 화분 등)
- **Desk accessories**: 데스크 위 소품 (피규어, 커피잔, 사진, 스탠드 조명)
- **Lighting**: 조명 색상/밝기 (따뜻한/차가운/네온)
- **Window style**: 창문 유형 (큰 창/작은 창/블라인드/없음)

**Data Structure:**
```typescript
interface RoomDecoration {
  wallDecor: "frame_landscape" | "frame_abstract" | "frame_photo" | "poster" | "whiteboard" | "none";
  floorStyle: "checker" | "wood" | "carpet" | "concrete" | "marble";
  plantType: "potted" | "cactus" | "monstera" | "hanging" | "none";
  plantCount: number; // 0-3
  deskAccessory: "figure" | "coffee_cup" | "photo_frame" | "lamp" | "none";
  lightingTone: "warm" | "cool" | "neon" | "natural";
  windowStyle: "standard" | "large" | "blinds" | "none";
  rugEnabled: boolean;
  rugColor: number;
}
```

### 2.3 Furniture Shop / Catalog (Medium-Hard)
인게임 가구 상점 UI에서 아이템을 구매/배치하는 시스템.

**Categories:**
- **Desks**: 기본 우드, 모던 화이트, 스탠딩 데스크, L자형 데스크
- **Chairs**: 기본 의자, 게이밍 체어, 빈백, 스툴
- **Decor**: 화분 종류, 벽시계 스타일, 액자, 포스터, LED 사인
- **Appliances**: 커피머신 업그레이드, 냉장고, 에어컨, 공기청정기
- **Special**: 수족관, 아케이드 게임기, 빈프로젝터

**구현 방향:**
- `FurnitureItem` 타입: id, category, name, drawFn, cost(optional), unlockCondition(optional)
- `FurnitureCatalog` 컴포넌트: 그리드형 아이템 카탈로그
- 각 가구는 `drawing-furniture-*.ts` 내 새 함수로 구현
- 배치 데이터는 settings DB에 JSON으로 저장

### 2.4 CEO Avatar Customization (Easy-Medium)
CEO 캐릭터 외형 커스터마이즈.

- **Hat/Headwear**: 왕관(현재), 모자, 헬멧, 선글라스, 없음
- **Outfit color**: 옷 색상 변경
- **Accessory**: 넥타이, 뱃지, 케이프
- **Movement trail**: 이동 시 이펙트 (반짝임, 별, 하트, 없음)
- **Size**: 캐릭터 크기 미세 조정

### 2.5 Seasonal/Event Decorations (Easy)
시즌별 자동 장식 또는 수동 선택.

**Seasons:**
- **Spring**: 벚꽃 파티클, 밝은 색조, 꽃 화분
- **Summer**: 선풍기, 아이스 커피, 밝은 햇빛
- **Autumn**: 단풍 파티클, 따뜻한 톤, 호박
- **Winter**: 눈 파티클, 크리스마스 트리, 따뜻한 조명
- **Special**: 생일, 회사 기념일, 할로윈 등

**구현 방향:**
- `SeasonalOverlay` 레이어: 기존 씬 위에 파티클/데코 오버레이
- `officeTicker`에서 시즌별 파티클 애니메이션 추가
- Date 기반 자동 적용 또는 Settings에서 수동 선택

### 2.6 Room Layout Editor (Hard - 장기 목표)
드래그 앤 드롭으로 가구를 자유롭게 배치하는 에디터.

- **Grid-based placement**: TILE(20px) 단위 그리드 스냅
- **Drag & Drop**: 가구 선택 → 드래그하여 배치
- **Rotation**: 가구 회전 (0/90/180/270)
- **Undo/Redo**: 배치 히스토리
- **Save/Load**: 레이아웃 프리셋 저장

**주의사항:**
- 현재 가구 위치가 buildScene 내 하드코딩되어 있어 대규모 리팩토링 필요
- 에이전트 좌석 배정 로직과 충돌하지 않도록 설계 필요

---

## 3. Recommended Implementation Phases

### Phase 1: Quick Wins (1-2 days each)
1. **Office Theme Presets** (2.1)
   - 8개 테마 프리셋 정의
   - Settings UI에서 프리셋 선택기 추가
   - 기존 `customRoomThemes` 메커니즘 활용

2. **Seasonal Decorations** (2.5)
   - 4계절 + 특별 이벤트 데코 오버레이
   - 파티클 시스템(눈, 벚꽃, 단풍) 추가
   - `officeTicker`에 시즌 파티클 로직 추가

### Phase 2: Medium Effort (3-5 days each)
3. **Department Room Decoration** (2.2)
   - RoomDecoration 설정 UI
   - 각 decoration 옵션별 drawing 함수 추가
   - buildScene에서 decoration config 반영

4. **CEO Avatar Customization** (2.4)
   - CEO 외형 옵션 UI
   - buildScene-ceo-hallway에서 커스텀 외형 적용

### Phase 3: Advanced (1-2 weeks)
5. **Furniture Catalog** (2.3)
   - 카탈로그 UI 컴포넌트
   - 새 가구 drawing 함수 다수 추가
   - 배치 데이터 저장/로드

6. **Room Layout Editor** (2.6)
   - 그리드 에디터 UI
   - 드래그 앤 드롭 배치 시스템
   - 기존 하드코딩 좌표 → 데이터 기반 배치로 리팩토링

---

## 4. Technical Considerations

### 4.1 Data Storage
- **Settings DB**: `office_customization` 테이블 또는 기존 settings key-value 활용
- **localStorage**: 빠른 로드를 위한 캐시 (현재 roomThemes도 localStorage 사용)
- **Structure**:
```typescript
interface OfficeCustomization {
  themePreset: string;          // "classic_warm" | "modern_minimal" | ...
  seasonalDecor: string;        // "auto" | "spring" | "summer" | ... | "none"
  ceoAvatar: CeoAvatarConfig;
  roomDecorations: Record<string, RoomDecoration>;  // key = deptId
  furniturePlacements?: FurniturePlacement[];        // Phase 3
}
```

### 4.2 Performance
- PixiJS Graphics objects는 가볍지만, 과도한 노드 수는 피해야 함
- 파티클은 최대 개수 제한 필요 (MAX_PARTICLES = 50~100)
- 테마 변경 시 `buildOfficeScene` 재호출로 전체 리빌드 (현재 방식 유지)
- 가구 추가는 각 방당 2-3개 추가 Graphics 노드 정도

### 4.3 Integration Points
- **`buildScene-*.ts`**: decoration config를 BuildOfficeSceneContext에 추가
- **`themes-locale.ts`**: 테마 프리셋 정의 추가
- **`drawing-furniture-*.ts`**: 새 가구/소품 drawing 함수 추가
- **`officeTicker.ts`**: 시즌 파티클, 이동 이펙트 등 애니메이션 추가
- **`AppMainLayout.tsx`**: customization state 관리 및 OfficeView에 전달
- **Settings UI**: 커스터마이즈 패널 (새 컴포넌트 또는 기존 설정에 탭 추가)

### 4.4 Existing Assets to Reuse
- `blendColor()`: 색상 보간 유틸 → 테마 전환 애니메이션에 활용 가능
- `drawBunting()`: 깃발 장식 → 시즌 데코에 확장 가능
- `emitSubCloneSmokeBurst()`: 파티클 시스템 패턴 → 눈/벚꽃 파티클에 참고
- `drawRoomAtmosphere()`: 방 분위기 레이어 → 조명 톤 변경에 활용

---

## 5. UI/UX Design Direction

### 5.1 Customization Entry Point
- **오피스 뷰 우상단**에 "꾸미기" 버튼 (페인트 팔레트 아이콘)
- 클릭 시 사이드 패널 또는 모달로 커스터마이즈 옵션 표시
- 또는 CEO가 특정 위치(인테리어샵)에 가면 커스터마이즈 UI 활성화

### 5.2 Preview System
- 테마/가구 선택 시 실시간 프리뷰 (기존 `themeHighlightTargetId` 패턴 확장)
- "적용" 버튼 누르기 전까지 임시 적용
- 변경 전/후 비교 가능

### 5.3 Mobile Considerations
- 모바일에서는 간소화된 커스터마이즈 UI
- 테마 프리셋 선택 위주
- 상세 가구 배치는 데스크톱 전용

---

## 6. Implementation Priority (Recommended)

| Priority | Feature | Effort | Impact | Status | Notes |
|----------|---------|--------|--------|--------|-------|
| 1 | Office Theme Presets | Low | High | **DONE** | Phase 1 완료 (2026-03-06) |
| 2 | Seasonal Decorations | Low-Med | High | **DONE** | 파티클 시스템 완료 (2026-03-06) |
| 3 | CEO Avatar Customization | Low-Med | Medium | **DONE** | CEO 커스터마이즈 완료 (2026-03-06) |
| 4 | Dept Room Decoration | Medium | High | **DONE** | 부서별 방 꾸미기 완료 (2026-03-06) |
| 5 | Style Theme System | Med-High | High | **DONE** | FurnitureDrawer 인터페이스 + default/pixel 스타일 (2026-03-06) |
| 6 | Furniture Catalog | Med-High | Medium | **DONE** | 카탈로그 10종 + UI (2026-03-06) |
| 7 | Room Layout Editor | High | Medium | **DONE** | 드래그&드롭 에디터 + Undo/Redo (2026-03-06) |

---

## 7. Progress Tracker

### 7.1 Completed

#### Office Theme Presets (Priority 1) - 2026-03-06
- [x] 빌트인 테마 프리셋 8종 정의 (`theme-presets.ts`)
  - classic_warm, modern_minimal, startup_neon, nature_green, cozy_cafe, cyberpunk, sakura, ocean_breeze
- [x] 내 테마 localStorage CRUD (`user-theme-storage.ts`)
  - save/load/update/delete + active preset 추적 + max 20개 제한
- [x] `OfficeRoomManager.tsx` 전면 개편
  - 테마 프리셋 섹션 (빌트인 2열 그리드 + 내 테마 리스트)
  - DeptCard 접기/펼치기 (기본 접힌 상태)
  - 내 테마 저장 모달 / 덮어쓰기 / 이름변경 / 삭제
  - `react-colorful` HexColorPicker 적용 (기존 `<input type="color">` 대체)
  - CEO Office / Break Room 포함 (기존 prop에서 전달)
- [x] `DeptTheme` → `RoomTheme` (공식 타입) 통일
- [x] 라이브러리 설치: `react-colorful` 5.6.1, `colord` 2.9.3
- [x] Vite build + TypeScript 타입체크 통과

**관련 파일:**
```
src/components/office-theme/theme-presets.ts      (NEW ~130줄)
src/components/office-theme/user-theme-storage.ts  (NEW ~90줄)
src/components/OfficeRoomManager.tsx               (REWRITE 377→~490줄)
```

**상세 설계 문서:** `docs/office-theme-manager-design.md`

#### Seasonal Decorations (Priority 2) - 2026-03-06
- [x] `seasonal-particles.ts` 파티클 시스템 구현 (~230줄)
  - 4계절: spring (벚꽃/leaf), summer (반짝/diamond), autumn (낙엽/leaf), winter (눈/flake)
  - MAX_PARTICLES=60, SPAWN_RATE=0.3/tick
  - `createSeasonalParticleState`, `updateSeasonalParticles`, `destroySeasonalParticles`
- [x] `buildScene.ts`에 파티클 레이어 생성 (buildBreakRoom ↔ buildFinalLayers 사이)
- [x] `officeTicker.ts`에 `updateSeasonalParticles()` 호출 추가
- [x] `OfficeView.tsx`에 `seasonalParticleRef`, `seasonKeyRef` ref 추가 + 이벤트 리스너
- [x] `OfficeRoomManager.tsx`에 계절 장식 선택 UI (auto/봄/여름/가을/겨울/없음)
- [x] localStorage 저장 + `CustomEvent` 기반 OfficeView 실시간 반영
- [x] `detectSeason()` (Date 기반 자동), `loadSeasonPreference()`, `saveSeasonPreference()`
- [x] Vite build + TypeScript 타입체크 통과

**관련 파일:**
```
src/components/office-view/seasonal-particles.ts   (NEW ~230줄)
src/components/office-view/buildScene.ts            (MODIFIED)
src/components/office-view/buildScene-types.ts      (MODIFIED)
src/components/office-view/officeTicker.ts           (MODIFIED)
src/components/OfficeView.tsx                        (MODIFIED)
src/components/OfficeRoomManager.tsx                 (MODIFIED - 계절 UI 추가)
```

#### CEO Avatar Customization (Priority 3) - 2026-03-06
- [x] `ceo-customization.ts` CEO 커스터마이즈 시스템 구현 (~95줄)
  - Headwear: crown/tophat/cap/halo/horns/ribbon/none (7종)
  - Outfit tint: 스프라이트 tint 적용 (0xffffff = 기본)
  - Title: 이름표 텍스트 커스터마이즈 (최대 12자)
  - Trail effect: sparkle/stars/hearts/fire/none (5종)
- [x] `buildScene-final-layers.ts` CEO 스프라이트에 커스터마이즈 적용
  - headwear emoji 동적 변경, outfit tint, 동적 이름표 크기
- [x] `officeTicker.ts` CEO 이동 시 trail 파티클 생성 + 업데이트
- [x] `OfficeRoomManager.tsx` CEO 커스터마이즈 UI 섹션 추가
  - 모자/장식 선택, 의상 색상 피커, 칭호 입력, 이동 이펙트 선택
- [x] CustomEvent 기반 실시간 반영 (`agentdesk_ceo_change`)
- [x] localStorage 저장 (`agentdesk_ceo_customization`)
- [x] Vite build + TypeScript 타입체크 통과

**관련 파일:**
```
src/components/office-view/ceo-customization.ts     (NEW ~95줄)
src/components/office-view/buildScene-final-layers.ts (MODIFIED)
src/components/office-view/buildScene-types.ts       (MODIFIED)
src/components/office-view/buildScene.ts             (MODIFIED)
src/components/office-view/officeTicker.ts            (MODIFIED)
src/components/OfficeView.tsx                         (MODIFIED)
src/components/OfficeRoomManager.tsx                  (MODIFIED - CEO UI 추가)
```

#### Department Room Decoration (Priority 4) - 2026-03-06
- [x] `room-decoration.ts` 방 꾸미기 시스템 구현 (~130줄)
  - `RoomDecoration` 인터페이스: wallDecor, plantType, floorDecor, deskAccessory, lighting
  - 옵션: 벽장식 4종, 화분 5종, 바닥 3종, 책상소품 5종, 조명 4종
  - localStorage 저장 + CustomEvent 실시간 반영
- [x] `drawing-furniture-a.ts`에 새 drawing 함수 5개 추가
  - `drawPoster`, `drawCarpet`, `drawDeskLamp`, `drawDeskMug`, `drawDeskFigurine`
- [x] `buildScene-departments.ts` `drawCeilingAndDecor` 리팩토링
  - `RoomDecoration` 기반 조건부 렌더링 (벽장식/화분/바닥/조명)
  - 에이전트 슬롯별 책상 소품 배치
- [x] `OfficeRoomManager.tsx` 방 꾸미기 UI 섹션 추가
  - 부서별 접기/펼치기, 5개 카테고리 선택 버튼, 초기화
- [x] Vite build + TypeScript 타입체크 통과

**관련 파일:**
```
src/components/office-view/room-decoration.ts        (NEW ~130줄)
src/components/office-view/drawing-furniture-a.ts     (MODIFIED - 5함수 추가)
src/components/office-view/buildScene-departments.ts  (MODIFIED)
src/components/office-view/buildScene-types.ts        (MODIFIED)
src/components/office-view/buildScene.ts              (MODIFIED)
src/components/OfficeView.tsx                          (MODIFIED)
src/components/OfficeRoomManager.tsx                   (MODIFIED - 방꾸미기 UI)
```

### 7.2 Completed (continued)

#### Style Theme System (Priority 5) — **DONE** (2026-03-06)
비주얼 스타일 (기본/픽셀/비즈니스/레트로/사이버)

- [x] `FurnitureDrawer` 인터페이스 정의 (17개 함수, `drawDesk` 반환 `Container`)
- [x] 기존 코드를 `default` drawer로 래핑 (`drawing-styles/default-drawer.ts`)
- [x] buildScene 리팩토링 — `drawer.drawXxx()` 패턴 (departments, ceo-hallway, break-room, department-agent)
- [x] `pixel` drawer 구현 (`drawing-styles/pixel-drawer.ts`, 270줄) — Graphics 기반
- [x] 스타일 선택 UI (OfficeRoomManager에 Drawing Style 섹션, 5종 버튼)
- [x] CustomEvent 기반 반응형 스타일 전환
- [x] SVG 에셋 디렉토리 구성 (`public/assets/themes/business|retro|cyber/`, 스타일당 18개 SVG)
- [x] `svg-drawer-base.ts` — SVG drawer 공통 팩토리 (Assets.load + Sprite 배치 + 하이브리드 시계)
- [x] `business` drawer 구현 (SVG 기반) — 모던 미니멀, 화이트/스틸/크롬
- [x] `retro` drawer 구현 (SVG 기반) — 70s 빈티지, 브라운/오렌지/머스타드, CRT 모니터
- [x] `cyber` drawer 구현 (SVG + glow filter) — 네온 글로우, 다크메탈/시안/마젠타
- [x] `OfficeThemePreset`에 `style?` 필드 추가 (스타일-색상 연동)
- [x] 스타일 전환 시 SVG 프리로드 후 씬 리빌드 (`drawer.init().then(buildScene)`)
- [x] `deskG` 타입 `Graphics` → `Container` (SVG Sprite 호환)
- [x] Vite build + TypeScript 타입체크 통과

**아키텍처:**
```
스타일 선택 → getDrawer(key)
├── default / pixel → Graphics 프리미티브 (동기)
└── business / retro / cyber → SVG Sprite (비동기 init)
    ├── init() → Assets.load() 18개 SVG 프리로드
    ├── drawDesk() → Container(Sprite desk + Sprite monitor)
    ├── drawWallClock() → Sprite(face) + Graphics(hands) 하이브리드
    └── drawRug() → Graphics (가변 크기/색상)
캐릭터(CEO/Agent) → 모든 스타일에서 현재 픽셀 Graphics 유지
```

**관련 파일:**
```
src/components/office-view/drawing-styles/index.ts          (MODIFIED - 5종 스타일)
src/components/office-view/drawing-styles/default-drawer.ts (기존 유지)
src/components/office-view/drawing-styles/pixel-drawer.ts   (기존 유지)
src/components/office-view/drawing-styles/svg-drawer-base.ts (NEW ~260줄)
src/components/office-view/drawing-styles/business-drawer.ts (NEW - SVG 기반)
src/components/office-view/drawing-styles/retro-drawer.ts    (NEW - SVG 기반)
src/components/office-view/drawing-styles/cyber-drawer.ts    (NEW - SVG 기반)
src/components/office-view/buildScene-types.ts               (MODIFIED - deskG: Container)
src/components/office-view/officeTicker.ts                    (MODIFIED - deskG: Container)
src/components/office-theme/theme-presets.ts                  (MODIFIED - style? 필드)
src/components/OfficeView.tsx                                 (MODIFIED - init + rebuild)
public/assets/themes/business/ (18 SVGs)
public/assets/themes/retro/    (18 SVGs)
public/assets/themes/cyber/    (18 SVGs - glow filter 포함)
```

#### Furniture Catalog (Priority 6) — **DONE** (2026-03-06)
- [x] `FurnitureItem` 타입 + 카탈로그 데이터 정의 (`furniture-catalog.ts`)
- [x] 카탈로그 UI 컴포넌트 (카테고리 필터 + 2열 그리드, OfficeRoomManager 내)
- [x] 새 가구 drawing 함수 10개 추가 (aquarium, globe, led_sign, trophy, fan, air_purifier, arcade, bean_bag, standing_desk, projector)
- [x] 배치 데이터 localStorage 저장/로드 + CustomEvent 실시간 반영
- [x] 부서별 방 + 휴게실 배치 지원
- [x] 아이템별 maxPerRoom 제한

**관련 파일:**
```
src/components/office-view/furniture-catalog.ts    (NEW ~170줄)
src/components/office-view/drawing-furniture-a.ts   (MODIFIED - 10함수 추가)
src/components/office-view/buildScene-departments.ts (MODIFIED - 카탈로그 렌더링)
src/components/office-view/buildScene-break-room.ts  (MODIFIED - 휴게실 카탈로그)
src/components/office-view/buildScene-types.ts       (MODIFIED - furnitureLayoutsRef)
src/components/office-view/buildScene.ts             (MODIFIED - layouts 전달)
src/components/OfficeView.tsx                         (MODIFIED - ref + 이벤트 리스너)
src/components/OfficeRoomManager.tsx                  (MODIFIED - 카탈로그 UI)
```

#### Room Layout Editor (Priority 7) — **DONE** (2026-03-06)
- [x] `FurniturePlacement`에 x, y 좌표 필드 추가 (기존 slot 호환 유지)
- [x] `RoomLayoutEditor.tsx` 드래그 앤 드롭 에디터 컴포넌트
  - 미니맵 기반 배치 에디터 (그리드 스냅 10px)
  - 마우스 드래그로 가구 이동, 클릭 선택
  - Undo/Redo (Ctrl+Z / Ctrl+Shift+Z, 최대 30 히스토리)
  - Delete/Backspace 키로 선택 아이템 삭제
  - Agent Area 안내 표시
- [x] `buildScene-departments.ts` / `buildScene-break-room.ts`에서 x,y 좌표 기반 렌더링
- [x] `furniture-catalog.ts`에 `updateFurniturePlacement()`, `snapToGrid()`, `gridW/gridH` 추가
- [x] OfficeRoomManager에 에디터 통합 (가구 배치 시 자동 표시)

**관련 파일:**
```
src/components/office-view/RoomLayoutEditor.tsx     (NEW ~220줄)
src/components/office-view/furniture-catalog.ts      (MODIFIED - x,y, gridW/gridH, updatePlacement)
src/components/office-view/buildScene-departments.ts (MODIFIED - 좌표 기반 렌더링)
src/components/office-view/buildScene-break-room.ts  (MODIFIED - 좌표 기반 렌더링)
src/components/OfficeRoomManager.tsx                  (MODIFIED - 에디터 통합)
```

### 7.3 All Features Complete
모든 7개 기능(Office Theme Presets ~ Room Layout Editor) + Style Theme SVG 확장 완료.

### 7.4 Post-Priority Additions (2026-03-06)

#### 내 테마 Export/Import
- [x] `user-theme-storage.ts`에 `exportUserThemesJson()` / `importUserThemesJson()` 추가
  - export: JSON 다운로드 (agentdesk-my-themes.json)
  - import: JSON 붙여넣기 → 중복/용량 체크 후 병합, 결과 메시지
- [x] `OfficeRoomManager.tsx` 내 테마 섹션에 내보내기/가져오기 버튼 추가
- [x] 가져오기 모달 (textarea + 성공/에러 피드백)

**관련 파일:**
```
src/components/office-theme/user-theme-storage.ts  (MODIFIED - export/import 함수)
src/components/OfficeRoomManager.tsx               (MODIFIED - Export/Import UI)
```

#### 변경 전/후 비교 (Compare)
- [x] 패널 열릴 때 현재 테마 스냅샷 저장 (`initialSnapshotRef`)
- [x] "변경 비교" 토글 버튼 (테마 프리셋 섹션 헤더)
- [x] 비교 패널: 방별 이전 accent → 현재 accent 색상 바 표시
  - 변경된 방: amber 하이라이트 + 점 마커
  - 변경 없으면 "변경사항 없음" 메시지

**관련 파일:**
```
src/components/OfficeRoomManager.tsx               (MODIFIED - Compare UI)
```
