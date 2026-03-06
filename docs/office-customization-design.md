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

| Priority | Feature | Effort | Impact | Notes |
|----------|---------|--------|--------|-------|
| 1 | Office Theme Presets | Low | High | 기존 인프라 활용, 즉시 효과 |
| 2 | Seasonal Decorations | Low-Med | High | 파티클로 생동감 대폭 증가 |
| 3 | CEO Avatar Customization | Low-Med | Medium | 개인화 재미 요소 |
| 4 | Dept Room Decoration | Medium | High | 부서별 개성 표현 |
| 5 | Furniture Catalog | Med-High | Medium | 콘텐츠 확장 |
| 6 | Room Layout Editor | High | Medium | 장기 목표 |
