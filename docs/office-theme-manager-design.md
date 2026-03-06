# Office Theme Manager - Implementation Design

## Table of Contents

1. [Overview](#1-overview)
2. [Current State Analysis](#2-current-state-analysis)
3. [Feature Design](#3-feature-design)
4. [Detailed Implementation Plan](#4-detailed-implementation-plan)
5. [UI/UX Detail](#5-uiux-detail)
6. [Data Flow](#6-data-flow)
7. [Storage Schema](#7-storage-schema)
8. [Edge Cases & Considerations](#8-edge-cases--considerations)
9. [i18n Labels](#9-i18n-labels)
10. [Style Theme (Visual Style) Expansion](#10-style-theme-visual-style-expansion)
11. [Implementation Steps](#11-implementation-steps)
12. [Libraries & Dependencies](#12-libraries--dependencies)

---

## 1. Overview

기존 `OfficeRoomManager`를 확장하여 **오피스 전체 테마 프리셋 시스템**을 구축한다.
사용자는 빌트인 테마를 선택하거나, 현재 색상 조합을 저장하여 나만의 테마를 만들고 수정/삭제할 수 있다.

### 1.1 Goals
- 빌트인 테마 프리셋 8종 이상 제공
- 현재 색상 설정을 "내 테마"로 저장 (이름 지정)
- 저장된 내 테마 수정/이름 변경/삭제
- 기존 부서별 개별 색상 커스터마이즈 기능 유지
- 실시간 미리보기 (기존 `themeHighlightTargetId` 메커니즘 활용)

---

## 2. Current State Analysis

### 2.1 Existing Component: `OfficeRoomManager.tsx` (377 lines)
```
Location: src/components/OfficeRoomManager.tsx
Entry:    App.tsx → AppOverlays.tsx → OfficeRoomManager
Trigger:  Sidebar "사무실 관리" 버튼 → setShowRoomManager(true)
```

**현재 기능:**
- 부서별 DeptCard (accent color picker + tone slider + preset palette)
- `deriveTheme(accent, tone)` → floor1/floor2/wall/accent 자동 파생
- 개별 부서 리셋 / 전체 리셋
- 실시간 미리보기 (`onActiveDeptChange` → `themeHighlightTargetId`)

**현재 데이터 흐름:**
```
OfficeRoomManager
  → onThemeChange(themes: Record<string, DeptTheme>)
    → App.tsx setCustomRoomThemes(themes)
      → localStorage "agentdesk_room_themes"
      → AppMainLayout officePresentation.roomThemes
        → OfficeView customDeptThemes prop
          → buildScene에서 적용
```

### 2.2 Type Note

> **`RoomTheme`** (`types/index.ts`): `{ floor1: number; floor2: number; wall: number; accent: number }` — 공식 타입
> **`DeptTheme`** (`OfficeRoomManager.tsx`): 동일 구조의 로컬 alias. 이 문서에서는 **`RoomTheme`**으로 통일한다.
> Phase 1 구현 시 `OfficeRoomManager.tsx`의 `DeptTheme`을 `RoomTheme` import로 교체 권장.

### 2.3 Existing Constants
```typescript
// OfficeRoomManager.tsx (DeptTheme = RoomTheme 동일 구조)
const DEFAULT_THEMES: Record<string, DeptTheme> = {
  dev:        { floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7, accent: 0x5a9fd4 },
  design:     { floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad, accent: 0x9a6fc4 },
  planning:   { floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871, accent: 0xd4a85a },
  operations: { floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89, accent: 0x5ac48a },
  qa:         { floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979, accent: 0xd46a6a },
  devsecops:  { floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871, accent: 0xd4885a },
  ceoOffice:  { floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243, accent: 0xa77d0c },
  breakRoom:  { floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83, accent: 0xf0c878 },
};

// themes-locale.ts
const DEPT_THEME_LIGHT: Record<string, RoomTheme>  // 6 departments
const DEPT_THEME_DARK: Record<string, RoomTheme>    // dark mode variants
```

---

## 3. Feature Design

### 3.1 UI Structure (OfficeRoomManager 개편)

기존 사이드 패널 구조를 유지하되, 상단에 **테마 프리셋 섹션**을 추가한다.

```
┌─────────────────────────────────┐
│ Header: "사무실 관리"     [X]    │
├─────────────────────────────────┤
│                                 │
│ ┌─ 테마 프리셋 ──────────────┐ │
│ │                             │ │
│ │ [빌트인 테마 그리드]         │ │
│ │  Classic  Modern  Neon      │ │
│ │  Nature   Cafe    Cyber     │ │
│ │  Sakura   Ocean             │ │
│ │                             │ │
│ │ ── 내 테마 ──               │ │
│ │  [My Theme 1] [수정][삭제]  │ │
│ │  [My Theme 2] [수정][삭제]  │ │
│ │                             │ │
│ │ [+ 현재 설정 저장하기]       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─ 부서별 커스터마이즈 ──────┐ │
│ │ ▶ Dev Team          [접기]  │ │
│ │ ▶ Design Team       [접기]  │ │
│ │ ▶ Planning Team     [접기]  │ │
│ │ ▶ ...                       │ │
│ │ ▶ CEO Office                │ │
│ │ ▶ Break Room                │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ [전체 초기화]       [닫기]       │
└─────────────────────────────────┘
```

### 3.2 Builtin Theme Presets (8종)

각 프리셋은 **모든 방(8개)**의 RoomTheme을 포함하는 완전한 테마:

| Key | Name (ko) | Name (en) | Mood |
|-----|-----------|-----------|------|
| `classic_warm` | 클래식 웜 | Classic Warm | 현재 기본값. 따뜻한 우드/골드톤 |
| `modern_minimal` | 모던 미니멀 | Modern Minimal | 쿨그레이/화이트. 깔끔한 모던 오피스 |
| `startup_neon` | 스타트업 네온 | Startup Neon | 다크 배경 + 네온 포인트 (시안/마젠타) |
| `nature_green` | 네이처 그린 | Nature Green | 올리브/세이지/포레스트 그린 자연풍 |
| `cozy_cafe` | 코지 카페 | Cozy Cafe | 테라코타/베이지/커피브라운 카페풍 |
| `cyberpunk` | 사이버펑크 | Cyberpunk | 딥 퍼플/일렉트릭 바이올렛 미래적 |
| `sakura` | 사쿠라 | Sakura | 소프트 핑크/로즈/체리블로섬 봄 |
| `ocean_breeze` | 오션 브리즈 | Ocean Breeze | 샌드/오션블루/코랄 해변풍 |

**프리셋 데이터 구조 (Phase 1):**
```typescript
interface OfficeThemePreset {
  key: string;
  name: { ko: string; en: string; ja: string; zh: string };
  description: { ko: string; en: string; ja: string; zh: string };
  themes: Record<string, RoomTheme>;  // key = deptId | "ceoOffice" | "breakRoom"
  preview: {                           // UI 카드에 표시할 대표 색상 4개
    primary: number;
    secondary: number;
    wall: number;
    accent: number;
  };
  // Phase 2에서 추가: style: string; → Section 10.7 참조
}
```

### 3.3 User Custom Theme (내 테마)

**저장 시:**
1. 사용자가 부서별 색상을 커스터마이즈
2. "현재 설정 저장하기" 클릭
3. 이름 입력 모달 표시
4. 현재 `deptStates` 전체를 하나의 프리셋으로 저장

**데이터 구조:**
```typescript
interface UserThemePreset {
  id: string;           // UUID
  name: string;         // 사용자 지정 이름
  themes: Record<string, RoomTheme>;  // { floor1, floor2, wall, accent }
  createdAt: number;
  updatedAt: number;
}
```

**저장 위치:**
- localStorage: `agentdesk_user_theme_presets` (JSON array)
- 기존 `agentdesk_room_themes`는 "현재 적용 중인 테마"로 유지

**내 테마 조작:**
- **적용**: 클릭 시 저장된 themes를 `customRoomThemes`에 일괄 적용
- **수정**: 현재 적용 상태에서 색상 변경 후 "덮어쓰기 저장" (기존 preset id 유지)
- **이름 변경**: 인라인 편집 또는 모달
- **삭제**: 확인 후 삭제
- **내보내기/가져오기**: (향후) JSON 복사/붙여넣기

---

## 4. Detailed Implementation Plan

### 4.1 File Changes

#### 신규 파일
| File | Purpose |
|------|---------|
| `src/components/office-theme/theme-presets.ts` | 빌트인 테마 프리셋 8종 상수 정의 |
| `src/components/office-theme/user-theme-storage.ts` | 내 테마 localStorage CRUD 유틸 |

#### 수정 파일
| File | Changes |
|------|---------|
| `src/components/OfficeRoomManager.tsx` | 테마 프리셋 섹션 추가, 부서 카드 접기/펼치기, 내 테마 저장/수정/삭제 UI |

### 4.2 `theme-presets.ts` 설계

```typescript
// src/components/office-theme/theme-presets.ts

import type { RoomTheme } from "../../types";

export interface OfficeThemePreset {
  key: string;
  name: { ko: string; en: string; ja: string; zh: string };
  description: { ko: string; en: string; ja: string; zh: string };
  themes: Record<string, RoomTheme>;
  preview: { primary: number; secondary: number; wall: number; accent: number };
}

// 8개 방 모두에 대한 색상을 정의
// key 목록: dev, design, planning, operations, qa, devsecops, ceoOffice, breakRoom
export const BUILTIN_THEME_PRESETS: OfficeThemePreset[] = [
  {
    key: "classic_warm",
    name: { ko: "클래식 웜", en: "Classic Warm", ja: "クラシックウォーム", zh: "经典暖色" },
    description: { ko: "따뜻한 우드/골드톤 기본 사무실", en: "Warm wood/gold tone office", ja: "暖かい木目調", zh: "温暖木质色调" },
    themes: {
      // DEFAULT_THEMES 값 그대로 (OfficeRoomManager.tsx:22-55)
      dev:        { floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7, accent: 0x5a9fd4 },
      design:     { floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad, accent: 0x9a6fc4 },
      planning:   { floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871, accent: 0xd4a85a },
      operations: { floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89, accent: 0x5ac48a },
      qa:         { floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979, accent: 0xd46a6a },
      devsecops:  { floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871, accent: 0xd4885a },
      ceoOffice:  { floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243, accent: 0xa77d0c },
      breakRoom:  { floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83, accent: 0xf0c878 },
    },
    preview: { primary: 0xf0e1c5, secondary: 0xd8e8f5, wall: 0x998243, accent: 0xa77d0c },
  },
  {
    key: "modern_minimal",
    name: { ko: "모던 미니멀", en: "Modern Minimal", ja: "モダンミニマル", zh: "现代简约" },
    description: { ko: "쿨그레이/화이트 깔끔한 오피스", en: "Cool gray/white clean office", ja: "クールグレー", zh: "冷灰简洁" },
    themes: {
      dev:        { floor1: 0xf0f2f5, floor2: 0xe8eaed, wall: 0x8898a8, accent: 0x4a9bc7 },
      design:     { floor1: 0xf2f0f5, floor2: 0xeae8ed, wall: 0x9888a8, accent: 0x8a6ab7 },
      planning:   { floor1: 0xf2f0ec, floor2: 0xeae8e4, wall: 0xa89888, accent: 0xb79a6a },
      operations: { floor1: 0xecf2ef, floor2: 0xe4eae7, wall: 0x88a898, accent: 0x6ab79a },
      qa:         { floor1: 0xf2ecec, floor2: 0xeae4e4, wall: 0xa88888, accent: 0xb76a6a },
      devsecops:  { floor1: 0xf2efec, floor2: 0xeae7e4, wall: 0xa89488, accent: 0xb7886a },
      ceoOffice:  { floor1: 0xf0f0f0, floor2: 0xe8e8e8, wall: 0x909090, accent: 0x607080 },
      breakRoom:  { floor1: 0xf5f3f0, floor2: 0xedebe8, wall: 0x989088, accent: 0xb0a898 },
    },
    preview: { primary: 0xf0f2f5, secondary: 0xe8eaed, wall: 0x8898a8, accent: 0x4a9bc7 },
  },
  // 나머지 6개 프리셋은 구현 시 동일 구조로 정의
  // startup_neon, nature_green, cozy_cafe, cyberpunk, sakura, ocean_breeze
  // 각각 8개 방(dev~breakRoom)의 RoomTheme + preview 4색 필요
];
```

### 4.3 `user-theme-storage.ts` 설계

```typescript
// src/components/office-theme/user-theme-storage.ts

const STORAGE_KEY = "agentdesk_user_theme_presets";

export interface UserThemePreset {
  id: string;
  name: string;
  themes: Record<string, RoomTheme>;  // RoomTheme = { floor1, floor2, wall, accent }
  createdAt: number;
  updatedAt: number;
}

export function loadUserThemePresets(): UserThemePreset[] { ... }
export function saveUserThemePreset(preset: UserThemePreset): void { ... }
export function updateUserThemePreset(id: string, patch: Partial<UserThemePreset>): void { ... }
export function deleteUserThemePreset(id: string): void { ... }
```

### 4.4 `OfficeRoomManager.tsx` 변경 상세

#### 추가되는 State
```typescript
const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
const [userPresets, setUserPresets] = useState<UserThemePreset[]>(() => loadUserThemePresets());
const [showSaveModal, setShowSaveModal] = useState(false);
const [saveName, setSaveName] = useState("");
const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
```

#### 새 섹션: 테마 프리셋 그리드
```
빌트인 테마:
  - 2x4 그리드, 각 카드에 preview 4색 스와치 + 이름
  - 클릭 시 applyPreset(preset) → 전 부서 테마 일괄 적용
  - 현재 적용 중인 프리셋에 체크 표시

내 테마:
  - 리스트, 각 항목에 이름 + 4색 미니스와치 + [적용][수정][삭제]
  - "수정" = 적용 후 부서별 편집, 다시 "저장" 하면 덮어쓰기
  - "삭제" = 인라인 확인 후 삭제

하단: [+ 현재 설정을 테마로 저장] 버튼
```

#### 부서별 커스터마이즈 변경
- 기존 DeptCard를 **접기/펼치기** 가능하도록 수정
  - 기본 접힌 상태: 부서 이름 + 현재 4색 미니스와치만 표시
  - 펼치면: 기존 accent picker + tone slider + presets
- CEO Office와 Break Room도 DeptCard로 추가 (현재는 누락)

#### 프리셋 적용 로직
```typescript
function applyPreset(preset: OfficeThemePreset | UserThemePreset) {
  const next: Record<string, DeptState> = {};
  for (const [deptId, theme] of Object.entries(preset.themes)) {
    // inferTone: 기존 OfficeRoomManager.tsx:90에 이미 구현됨
    // floor1과 accent의 RGB 차이에서 tone(0~100)을 역추론
    next[deptId] = { accent: theme.accent, tone: inferTone(theme) };
  }
  setDeptStates(next);
  buildAndEmit(next);
  setActivePresetKey("key" in preset ? preset.key : preset.id);
}
```

#### 내 테마 저장 로직
```typescript
function handleSaveCurrentAsPreset() {
  const themes: Record<string, RoomTheme> = {};
  for (const [id, s] of Object.entries(deptStates)) {
    themes[id] = deriveTheme(s.accent, s.tone);
  }
  const preset: UserThemePreset = {
    id: crypto.randomUUID(),
    name: saveName.trim(),
    themes,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveUserThemePreset(preset);
  setUserPresets(loadUserThemePresets());
  setShowSaveModal(false);
  setSaveName("");
}
```

---

## 5. UI/UX Detail

### 5.1 테마 프리셋 카드

```
┌──────────────────┐
│ ┌──┬──┬──┬──┐    │   4색 프리뷰 바 (primary, secondary, wall, accent)
│ └──┴──┴──┴──┘    │
│ 모던 미니멀    ✓  │   이름 + 적용 중 체크
│ 깔끔한 모던 오피스 │   한 줄 설명
└──────────────────┘
```

- 카드 크기: ~140px x 80px
- 2열 그리드 (모바일 1열)
- 호버 시 border highlight
- 선택 중인 프리셋에 체크 아이콘 + 하이라이트 border

### 5.2 내 테마 행

```
┌──────────────────────────────────────┐
│ [▓▓▓▓] My Office Theme    [적용] [⋯]│   4색 미니스와치 + 이름 + 적용 버튼 + 더보기
└──────────────────────────────────────┘
                                    ┌──────┐
                                    │ 수정  │  더보기 드롭다운
                                    │ 이름변경│
                                    │ 삭제  │
                                    └──────┘
```

### 5.3 저장 모달

```
┌─────────────────────────┐
│ 현재 테마 저장            │
│                         │
│ 테마 이름:               │
│ ┌─────────────────────┐ │
│ │ My Custom Theme     │ │
│ └─────────────────────┘ │
│                         │
│ 미리보기:                │
│ ┌──┬──┬──┬──┬──┬──┬──┬──┐│  8개 방의 accent 색상 미리보기
│ └──┴──┴──┴──┴──┴──┴──┴──┘│
│                         │
│      [취소]  [저장]      │
└─────────────────────────┘
```

### 5.4 부서 카드 접기/펼치기

**접힌 상태 (기본):**
```
┌──────────────────────────────────┐
│ ▶ Dev Team    [▓▓▓▓] #5a9fd4    │  화살표 + 이름 + 4색 미니 + accent hex
└──────────────────────────────────┘
```

**펼친 상태 (클릭 시):**
```
┌──────────────────────────────────┐
│ ▼ Dev Team              [초기화] │
│                                  │
│ [Preview swatch: floor1|floor2|wall|accent] │
│                                  │
│ Presets: ● ● ● ● ● ● ● ●       │
│                                  │
│ Main Color: [picker] #5a9fd4     │
│                                  │
│ Tone: Light ──●───── Dark   50   │
└──────────────────────────────────┘
```

---

## 6. Data Flow

```
사용자 액션                          변경 흐름
─────────                          ─────────
빌트인 테마 클릭    →  applyPreset(builtin)
                       → setDeptStates(전체 갱신)
                       → buildAndEmit(themes)
                       → onThemeChange(themes)
                         → App.tsx setCustomRoomThemes
                           → localStorage 저장
                           → OfficeView 리렌더

부서 색상 수정      →  updateDept(deptId, {accent/tone})
                       → buildAndEmit(themes)
                       → (동일 흐름)

"테마로 저장" 클릭  →  현재 deptStates → UserThemePreset
                       → localStorage "agentdesk_user_theme_presets" 저장

내 테마 적용 클릭   →  applyPreset(userPreset)
                       → (빌트인과 동일 흐름)

내 테마 수정        →  applyPreset → 부서별 수정 → "덮어쓰기 저장"
                       → updateUserThemePreset(id, {themes, updatedAt})
```

---

## 7. Storage Schema

### 7.1 localStorage Keys
| Key | Content | Format |
|-----|---------|--------|
| `agentdesk_room_themes` | 현재 적용 중인 테마 (기존) | `Record<string, RoomTheme>` |
| `agentdesk_user_theme_presets` | 사용자 저장 테마 목록 (신규) | `UserThemePreset[]` |
| `agentdesk_active_preset` | 현재 활성 프리셋 key/id (신규) | `string | null` |

### 7.2 Settings DB 연동
- 기존 settings의 `roomThemes` 필드에 현재 적용 테마 동기화 (기존 로직 유지)
- 향후 사용자 프리셋도 서버 동기화 가능 (우선은 localStorage only)

---

## 8. Edge Cases & Considerations

| Case | Handling |
|------|----------|
| 부서가 추가/삭제된 경우 | 프리셋에 없는 부서는 DEFAULT_THEMES fallback |
| 빌트인 프리셋 적용 후 부서 개별 수정 | activePresetKey를 null로 변경 (= "커스텀" 상태) |
| 내 테마 이름 중복 | 허용 (id로 구분) |
| 내 테마 최대 개수 | 20개 제한 (localStorage 용량 고려) |
| localStorage 없는 환경 | graceful fallback, 프리셋 저장 비활성화 |
| 다크 모드 전환 | 프리셋은 라이트 모드 기준, 다크 모드는 별도 `applyOfficeThemeMode` 적용 |

---

## 9. i18n Labels (추가 필요)

```typescript
const themeLabels = {
  presetSection: { ko: "테마 프리셋", en: "Theme Presets", ja: "テーマプリセット", zh: "主题预设" },
  builtinThemes: { ko: "기본 테마", en: "Built-in Themes", ja: "デフォルトテーマ", zh: "内置主题" },
  myThemes:      { ko: "내 테마", en: "My Themes", ja: "マイテーマ", zh: "我的主题" },
  saveAsCurrent: { ko: "현재 설정 저장", en: "Save Current", ja: "現在を保存", zh: "保存当前设置" },
  themeName:     { ko: "테마 이름", en: "Theme Name", ja: "テーマ名", zh: "主题名称" },
  apply:         { ko: "적용", en: "Apply", ja: "適用", zh: "应用" },
  overwrite:     { ko: "덮어쓰기", en: "Overwrite", ja: "上書き", zh: "覆盖" },
  rename:        { ko: "이름 변경", en: "Rename", ja: "名前変更", zh: "重命名" },
  delete:        { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" },
  customized:    { ko: "커스텀", en: "Customized", ja: "カスタム", zh: "自定义" },
  deptCustomize: { ko: "부서별 커스터마이즈", en: "Per-Department Colors", ja: "部署別カスタマイズ", zh: "部门自定义" },
  maxReached:    { ko: "최대 20개까지 저장 가능", en: "Max 20 presets", ja: "最大20件", zh: "最多保存20个" },
};
```

---

## 10. Style Theme (Visual Style) Expansion

### 10.1 Concept

"테마"를 **색상(Color Theme)** + **스타일(Style Theme)** 두 축으로 분리한다.

```
                   색상 (Color)
              Classic  Modern  Neon  Sakura ...
           ┌─────────────────────────────────┐
  픽셀     │  Pixel + Classic               │  가구/인물이 도트풍
 스타일    │  Pixel + Neon                  │
           ├─────────────────────────────────┤
  업무용   │  Business + Classic             │  깔끔하고 단순한 가구
 스타일    │  Business + Modern              │
           ├─────────────────────────────────┤
  아기자기  │  Cute + Sakura                  │  둥글고 귀여운 가구
 스타일    │  Cute + Nature                  │
           └─────────────────────────────────┘
```

- **Color Theme**: 기존 RoomTheme 기반 — floor/wall/accent 색상 팔레트
- **Style Theme**: 가구/소품/캐릭터의 **시각적 스타일(visual style)** 변경

### 10.1.1 핵심 구분: 캐릭터 vs 가구/환경의 렌더링 분리

**캐릭터(CEO, Agent)는 모든 스타일에서 현재 Graphics(픽셀) 방식 유지.**
스타일 변경은 **가구/소품/환경** 에만 적용된다.

```
┌────────────────────────────────────────────────────────────────┐
│                    스타일 적용 범위                               │
├──────────────┬───────────────┬─────────────────────────────────┤
│ 요소          │ 스타일 변경?   │ 이유                             │
├──────────────┼───────────────┼─────────────────────────────────┤
│ CEO 캐릭터    │ ❌ 항상 픽셀   │ 캐릭터 정체성 유지, 모든 환경에서 │
│ Agent 캐릭터  │ ❌ 항상 픽셀   │ 일관된 도트풍 인물 표현          │
│ 왕관/헤드기어  │ ❌ 항상 픽셀   │ 캐릭터 일부                     │
├──────────────┼───────────────┼─────────────────────────────────┤
│ 가구 (책상 등) │ ✅ 스타일별    │ 환경 분위기 결정 요소            │
│ 소품 (식물 등) │ ✅ 스타일별    │ 장식 요소                       │
│ 창문/조명     │ ✅ 스타일별    │ 건축 요소                       │
├──────────────┼───────────────┼─────────────────────────────────┤
│ 바닥/벽       │ ✅ 색상만 변경  │ Color Theme으로 제어 (Graphics)  │
└──────────────┴───────────────┴─────────────────────────────────┘
```

이렇게 하면 **픽셀 캐릭터가 어떤 환경에서든 자연스럽게 존재**하는 효과:
- 픽셀 캐릭터 + 업무용 가구 = 미니멀 오피스 속 도트 캐릭터
- 픽셀 캐릭터 + 사이버 가구 = SF 세계관 속 도트 캐릭터
- 마치 2D 게임에서 캐릭터 스프라이트는 동일하고 맵/환경만 바뀌는 느낌

### 10.1.2 렌더링 방식: 가구/소품만 스타일별 분기

```
┌────────────────────────────────────────────────────────────┐
│                    렌더링 방식 구분                          │
├───────────┬──────────────────┬─────────────────────────────┤
│ 방식       │ 적합한 스타일     │ 특징                        │
├───────────┼──────────────────┼─────────────────────────────┤
│ Graphics  │ pixel (현재)     │ rect/roundRect 프리미티브     │
│ 프리미티브 │ default (현재)   │ 코드로 직접 그림, 에셋 불필요  │
├───────────┼──────────────────┼─────────────────────────────┤
│ SVG →     │ business         │ 벡터 SVG 파일 → Texture 로드  │
│ Sprite    │ cute             │ 깔끔한 곡선, 그라데이션 가능   │
│           │ retro            │ 에셋 파일 필요 (assets/themes/)│
├───────────┼──────────────────┼─────────────────────────────┤
│ SVG +     │ cyber/futuristic │ SVG 에셋 + PixiJS Filter     │
│ Filter    │                  │ 글로우, 네온, 홀로그램 이펙트   │
└───────────┴──────────────────┴─────────────────────────────┘
```

**요약:**
- **캐릭터 (CEO/Agent)** → 모든 스타일에서 **현재 Graphics(픽셀) 코드 유지** (변경 없음)
- **pixel / default 가구** → 현재처럼 `Graphics` 코드로 그림 (에셋 불필요)
- **business / cute / retro 가구** → SVG 에셋 파일을 PixiJS `Sprite`로 로드 (벡터, 고품질)
- **cyber / futuristic 가구** → SVG 에셋 + `@pixi/filter-glow` 등 PixiJS 필터로 네온/글로우 이펙트

### 10.2 Style Theme Examples

> 아래는 **가구/소품/환경**의 스타일. 캐릭터(CEO/Agent)는 모든 스타일에서 현재 픽셀 유지.

| Style Key | Name (ko) | 가구 Rendering | 가구/환경 Visual | 캐릭터 |
|-----------|-----------|---------------|-----------------|--------|
| `default` | 기본 | **Graphics** (현재 코드) | 따뜻한 우드톤, 나무결, 그림자 다층 | 픽셀 |
| `pixel` | 픽셀 | **Graphics** (rect only) | rect만, 그림자 최소, 2px 단위, 8bit | 픽셀 |
| `business` | 업무용 | **SVG → Sprite** | 모던/미니멀, 매끈한 곡선, 장식 최소 | 픽셀 |
| `cute` | 아기자기 | **SVG → Sprite** | 둥근 파스텔 가구, 하트/별 장식 | 픽셀 |
| `retro` | 레트로 | **SVG → Sprite** | 브라운/오렌지 70년대풍, 카펫 | 픽셀 |
| `cyber` | 사이버 | **SVG + Glow Filter** | 메탈릭, 네온 글로우, 홀로그램 | 픽셀 |

### 10.3 Architecture: Drawing Style Abstraction

**현재 (하드코딩):**
```typescript
// drawing-furniture-a.ts
function drawDesk(parent, dx, dy, working) {
  // 우드톤 책상이 하드코딩
  g.roundRect(dx, dy, DESK_W, DESK_H, 3).fill(0xbe9860);
  g.roundRect(dx+1, dy+1, DESK_W-2, DESK_H-2, 2).fill(0xd4b478);
  // ... 나무결, 그림자, 키보드, 종이 등 상세 디테일
}
```

**확장 후 (스타일별 분기):**
```typescript
// drawing-styles/index.ts
interface FurnitureDrawer {
  /** 에셋 기반 스타일은 init에서 SVG/PNG 프리로드 */
  init?(): Promise<void>;

  // 반환 타입: DisplayObject (Graphics 또는 Sprite 모두 가능)
  // ── 가구 ──
  drawDesk(parent: Container, x: number, y: number, working: boolean): DisplayObject;
  drawChair(parent: Container, x: number, y: number, color: number): DisplayObject;
  drawMonitor(parent: Container, x: number, y: number, dual: boolean): DisplayObject;
  drawBookshelf(parent: Container, x: number, y: number): void;
  drawWhiteboard(parent: Container, x: number, y: number): void;
  // ── 소품/장식 ──
  drawPlant(parent: Container, x: number, y: number, variant: number): void;
  drawSofa(parent: Container, x: number, y: number, color: number): void;
  drawCoffeeMachine(parent: Container, x: number, y: number): void;
  drawVendingMachine(parent: Container, x: number, y: number): void;
  drawHighTable(parent: Container, x: number, y: number): void;
  // ── 건축/환경 ──
  drawWindow(parent: Container, x: number, y: number, w?: number, h?: number): DisplayObject;
  drawWallClock(parent: Container, x: number, y: number): WallClockVisual;
  drawPictureFrame(parent: Container, x: number, y: number): void;
  drawCeilingLight(parent: Container, x: number, y: number): void;
  drawRug(parent: Container, x: number, y: number, w: number, h: number, color: number): void;

  // ⚠️ CEO/Agent 캐릭터는 FurnitureDrawer에 포함하지 않음
  // 캐릭터는 모든 스타일에서 현재 Graphics(픽셀) 방식 유지
  // → buildScene-ceo-hallway.ts, buildScene-department-agent.ts에서 직접 그림
}

const STYLE_REGISTRY: Record<string, FurnitureDrawer> = {
  default:  defaultDrawer,    // Graphics 프리미티브 (현재 코드)
  pixel:    pixelDrawer,      // Graphics rect only (도트풍)
  business: businessDrawer,   // SVG → Sprite (모던/미니멀)
  cute:     cuteDrawer,       // SVG → Sprite (파스텔/둥근)
  cyber:    cyberDrawer,      // SVG + Glow Filter (네온)
};

// buildScene에서 사용
const drawer = STYLE_REGISTRY[activeStyle] ?? STYLE_REGISTRY.default;
if (drawer.init) await drawer.init(); // SVG 에셋 프리로드
drawer.drawDesk(room, ax, deskY, isWorking);
```

### 10.4 Pixel Style Example — drawDesk (Graphics 방식)

픽셀 스타일은 현재와 같은 `Graphics` 프리미티브 사용. `rect()`만으로 도트풍 표현.

```typescript
// drawing-styles/pixel.ts — Graphics 기반 (에셋 불필요)
function drawDesk(parent: Container, dx: number, dy: number, working: boolean): Graphics {
  const g = new Graphics();
  const PX = 2; // pixel size

  // 도트 그림자 (1줄)
  g.rect(dx + PX, dy + DESK_H, DESK_W, PX).fill({ color: 0x000000, alpha: 0.15 });

  // 책상 다리 (2px 단위)
  g.rect(dx + PX*2, dy + DESK_H - PX, PX*2, PX*3).fill(0x8b6914);
  g.rect(dx + DESK_W - PX*4, dy + DESK_H - PX, PX*2, PX*3).fill(0x8b6914);

  // 책상 본체 (단색, 그림자 1줄)
  g.rect(dx, dy, DESK_W, DESK_H).fill(0xc8a050);
  g.rect(dx, dy, DESK_W, PX).fill(0xdcb868);         // 하이라이트
  g.rect(dx, dy + DESK_H - PX, DESK_W, PX).fill(0xa08040); // 하단 그림자

  // 키보드 (4x2 도트 블록)
  g.rect(dx + DESK_W/2 - PX*4, dy + PX, PX*8, PX*2).fill(0x666677);

  // 모니터 (단순 사각형)
  if (working) {
    g.rect(dx + DESK_W/2 - PX*5, dy - PX*6, PX*10, PX*6).fill(0x334455);
    g.rect(dx + DESK_W/2 - PX*4, dy - PX*5, PX*8, PX*4).fill(0x88ccff); // 화면
  }

  parent.addChild(g);
  return g;
}
```

### 10.5 Business Style Example — drawDesk (SVG Sprite 방식)

업무용 스타일은 **SVG 에셋**을 `Assets.load()`로 프리로드한 뒤 `Sprite`로 배치.
Graphics 프리미티브로는 표현하기 어려운 매끈한 곡선, 그라데이션, 고품질 디테일 구현.

```typescript
// drawing-styles/business.ts — SVG 에셋 기반
import { Assets, Sprite, Container, type DisplayObject, type Texture } from "pixi.js";

class BusinessDrawer implements FurnitureDrawer {
  private textures: Record<string, Texture> = {};

  /** 스타일 전환 시 1회 호출 — SVG 에셋 프리로드 */
  async init() {
    const manifest = {
      desk:     "assets/themes/business/desk.svg",
      chair:    "assets/themes/business/chair.svg",
      monitor:  "assets/themes/business/monitor.svg",
      plant:    "assets/themes/business/plant.svg",
      bookshelf:"assets/themes/business/bookshelf.svg",
      sofa:     "assets/themes/business/sofa.svg",
      coffee:   "assets/themes/business/coffee-machine.svg",
      window:   "assets/themes/business/window.svg",
    };
    for (const [key, path] of Object.entries(manifest)) {
      this.textures[key] = await Assets.load(path);
    }
  }

  drawDesk(parent: Container, dx: number, dy: number, working: boolean): DisplayObject {
    const sprite = new Sprite(this.textures.desk);
    sprite.position.set(dx, dy);
    sprite.width = DESK_W;
    sprite.height = DESK_H;
    parent.addChild(sprite);

    // 모니터는 working 상태에 따라 별도 sprite
    if (working) {
      const mon = new Sprite(this.textures.monitor);
      mon.position.set(dx + DESK_W/2 - 10, dy - 14);
      mon.width = 20;
      mon.height = 14;
      parent.addChild(mon);
    }
    return sprite;
  }

  // ... 나머지 가구도 동일 패턴
}
```

### 10.5.1 Cyber Style Example — SVG + Glow Filter

사이버 스타일은 SVG 에셋 + PixiJS 필터(`GlowFilter`)로 네온/글로우 이펙트 추가.

```typescript
// drawing-styles/cyber.ts — SVG + Filter 기반
import { GlowFilter } from "@pixi/filter-glow";

class CyberDrawer implements FurnitureDrawer {
  private textures: Record<string, Texture> = {};

  async init() {
    // 사이버 전용 SVG 에셋 (메탈릭/네온 라인)
    this.textures.desk = await Assets.load("assets/themes/cyber/desk.svg");
    // ...
  }

  drawDesk(parent: Container, dx: number, dy: number, working: boolean): DisplayObject {
    const sprite = new Sprite(this.textures.desk);
    sprite.position.set(dx, dy);
    sprite.width = DESK_W;
    sprite.height = DESK_H;

    // 네온 글로우 이펙트
    if (working) {
      sprite.filters = [new GlowFilter({
        distance: 8,
        outerStrength: 2,
        color: 0x00ffff,  // 시안 네온
      })];
    }

    parent.addChild(sprite);
    return sprite;
  }
}
```

### 10.5.2 SVG 스타일에서 Color Theme 적용 방식 (Tinting)

SVG Sprite는 고정된 색상으로 그려져 있으므로, 사용자가 Color Theme을 변경하면
SVG 자체의 색상도 바뀌어야 한다. 이를 위한 전략:

```
┌─────────────────────────────────────────────────────────────┐
│              SVG × Color Theme 적용 방법                      │
├──────────────┬──────────────────────────────────────────────┤
│ 요소          │ 색상 적용 방식                                │
├──────────────┼──────────────────────────────────────────────┤
│ 바닥 (floor)  │ Graphics로 직접 그림 (모든 스타일 공통)        │
│              │ → Color Theme의 floor1/floor2 직접 사용       │
├──────────────┼──────────────────────────────────────────────┤
│ 벽 (wall)     │ Graphics로 직접 그림 (모든 스타일 공통)        │
│              │ → Color Theme의 wall 직접 사용                │
├──────────────┼──────────────────────────────────────────────┤
│ 가구 (desk,   │ SVG Sprite + PixiJS tint 속성               │
│  chair 등)    │ sprite.tint = accent; // Color Theme 적용   │
│              │ SVG는 그레이스케일로 제작, tint로 색상 입힘     │
├──────────────┼──────────────────────────────────────────────┤
│ 장식 (plant,  │ SVG Sprite 그대로 사용 (tint 미적용)          │
│  clock 등)    │ 스타일 고유 색상 유지 (식물=초록, 시계=메탈릭)  │
├──────────────┼──────────────────────────────────────────────┤
│ 캐릭터 (CEO,  │ FurnitureDrawer 대상 아님 — 항상 Graphics    │
│  Agent)       │ 현재 픽셀 코드 그대로 유지, 스타일 변경 없음   │
└──────────────┴──────────────────────────────────────────────┘
```

**핵심: SVG 에셋은 그레이스케일(무채색)로 제작**

```typescript
// SVG는 그레이톤으로 디자인 → tint로 Color Theme 색상 적용
drawDesk(parent: Container, dx: number, dy: number, working: boolean): DisplayObject {
  const sprite = new Sprite(this.textures.desk);
  sprite.position.set(dx, dy);
  sprite.width = DESK_W;
  sprite.height = DESK_H;

  // Color Theme의 accent 색상을 tint로 적용
  // 그레이스케일 SVG × tint = 해당 색조의 가구
  sprite.tint = this.colorTheme.accent;

  parent.addChild(sprite);
  return sprite;
}
```

> **바닥/벽은 항상 Graphics** — 스타일에 관계없이 `drawTiledFloor()`, `drawRoomAtmosphere()` 등
> 기존 함수가 Color Theme 색상을 직접 사용하므로 SVG 불필요.
> **가구만 SVG** — 스타일 차별화가 필요한 부분.

### 10.5.3 SVG 스타일의 애니메이션 처리

현재 `officeTicker.ts`의 애니메이션(breathing, working, idle)은 `Graphics`의
`scaleY`, `position`, `alpha`를 직접 조작한다.
SVG `Sprite`도 동일한 PixiJS `DisplayObject` 속성을 가지므로 **동일 방식으로 작동**한다.

```typescript
// officeTicker.ts — Graphics든 Sprite든 동일하게 작동
agentContainer.scale.y = 1 + Math.sin(tick * 0.05) * 0.01;  // breathing
monitorGlow.alpha = working ? 0.8 : 0.3;                      // working state
```

**제약사항:**
- Graphics 내부 파츠 개별 조작 (나무결 애니메이션 등)은 SVG에서 불가
- SVG 스타일의 애니메이션은 **컨테이너 단위** (position, scale, alpha, rotation)로 제한
- 세밀한 애니메이션이 필요하면 SVG를 파츠별 분리 (desk-top.svg, desk-legs.svg) 고려

### 10.6 Implementation Effort & Strategy

**Phase 1 (현재 계획): Color Theme Only**
- 색상 프리셋 8종 + 사용자 커스텀 저장
- 가구 스타일은 현재 `default` 고정
- 기존 drawing 함수 변경 없음

**Phase 2: Style Theme 추가**
- `FurnitureDrawer` 인터페이스 정의
- 현재 drawing-furniture-*.ts를 `default` drawer로 래핑
- buildScene 호출부에서 `drawer.drawXxx()` 패턴으로 전환
- `pixel` drawer (Graphics 기반) 첫 번째 추가
- `business` drawer (SVG 기반) 두 번째 추가

**필요 작업량 — 렌더링 방식별 (가구/소품만, 캐릭터 제외):**

| Style Type | Rendering | Code | Assets | Total Effort |
|------------|-----------|------|--------|-------------|
| **pixel** | Graphics rect() | ~470줄 코드 | 없음 | 코드만 |
| **business** | SVG → Sprite | ~180줄 코드 | SVG 15개 파일 | 코드 + SVG 제작 |
| **cute** | SVG → Sprite | ~180줄 코드 | SVG 15개 파일 | 코드 + SVG 제작 |
| **cyber** | SVG + Filter | ~220줄 코드 | SVG 15개 + Filter 설정 | 코드 + SVG + Filter |

**Graphics 스타일 (pixel) — 코드 작업량:**

| Component | Functions | Est. Lines |
|-----------|-----------|------------|
| Desk + Monitor + Chair | 3 | ~120 |
| Plant + Bookshelf + Whiteboard | 3 | ~80 |
| Sofa + Coffee Machine + Vending + High Table | 4 | ~150 |
| Window + Clock + Picture Frame + Rug + Light | 5 | ~120 |
| **Total** | **15** | **~470** |

> 캐릭터(CEO/Agent)는 제외 — 모든 스타일에서 현재 픽셀 Graphics 유지

**SVG 스타일 (business/cute/cyber) — 에셋 작업량:**

| Asset Category | Files | Description |
|---------------|-------|-------------|
| 가구 SVG | 8개 | desk, chair, monitor, bookshelf, whiteboard, sofa, coffee machine, vending machine |
| 소품 SVG | 5개 | plant, high table, picture frame, rug pattern, ceiling light |
| 건축 SVG | 2개 | window, wall clock |
| **Total per style** | **15개 SVG** | 각 ~50x50~100x120 px 크기 |

> **캐릭터 SVG 없음** — CEO/Agent는 모든 스타일에서 현재 픽셀 Graphics 유지
> **SVG 에셋 제작**: 디자이너 또는 SVG 에디터(Figma, Inkscape)로 제작.
> 파일 위치: `public/assets/themes/{style_key}/` 디렉토리

**Refactoring Impact (1회성):**
- `FurnitureDrawer` 인터페이스 정의 — 35줄 (init + 15개 가구/소품 함수)
- 반환 타입 `Graphics` → `DisplayObject`로 변경 (Sprite 호환)
- 기존 가구/소품 함수를 default drawer로 래핑 — drawing-furniture-*.ts, drawing-core.ts
- buildScene-*.ts에서 가구/소품 direct call → `drawer.drawXxx()` — 약 25개소 수정
- **캐릭터 렌더링 코드는 변경하지 않음** — buildScene-ceo-hallway.ts, buildScene-department-agent.ts 유지
- `BuildOfficeSceneContext`에 `drawer: FurnitureDrawer` 필드 추가
- 스타일 전환 시 `drawer.init()` 비동기 호출 + 로딩 표시

### 10.7 Theme Preset with Style (Phase 2 타입 확장)

Phase 1의 `OfficeThemePreset` (Section 3.2)에 `style` 필드를 추가:

```typescript
// Phase 2에서 기존 OfficeThemePreset 확장 — Section 3.2 타입에 style 추가
interface OfficeThemePreset {
  key: string;
  name: { ko: string; en: string; ja: string; zh: string };
  description: { ko: string; en: string; ja: string; zh: string };
  style: string;                       // NEW: "default" | "pixel" | "business" | "cute" | ...
  themes: Record<string, RoomTheme>;   // color palette (Phase 1과 동일)
  preview: { primary: number; secondary: number; wall: number; accent: number };
}
```

UI에서는 **스타일 필터 탭** + **색상 프리셋 그리드**로 표시:

```
┌─ 스타일 ─────────────────────────┐
│ [기본] [픽셀] [업무용] [아기자기]  │   탭/필터
├──────────────────────────────────┤
│                                  │
│  Classic   Modern   Nature       │   선택된 스타일 내 색상 프리셋
│  Cafe      Cyber    Sakura       │
│                                  │
└──────────────────────────────────┘
```

---

## 11. Implementation Steps

### Phase 1: Color Theme System (현재 구현 대상)

1. **`theme-presets.ts`** 생성 — 8종 빌트인 색상 프리셋 상수 + 타입
2. **`user-theme-storage.ts`** 생성 — 내 테마 localStorage CRUD 유틸
3. **`OfficeRoomManager.tsx`** 수정:
   - a. 프리셋 섹션 UI (빌트인 그리드 + 내 테마 리스트)
   - b. DeptCard 접기/펼치기 추가
   - c. CEO Office / Break Room 카드 추가
   - d. "현재 설정 저장" 모달
   - e. 내 테마 수정/이름변경/삭제
   - f. 프리셋 적용 로직 (`applyPreset`)
4. **테스트** — 프리셋 적용 → 부서 수정 → 저장 → 로드 → 삭제 시나리오
5. **빌드 확인** — Vite build 통과

### Phase 2: Style Theme System (향후 확장)

1. **`FurnitureDrawer` 인터페이스** 정의 — 17개 함수 시그니처, 반환 `DisplayObject`, `init?()` 포함
2. **기존 코드를 `default` drawer로 래핑** — drawing-furniture-*.ts 변경 없이 re-export
3. **buildScene 리팩토링** — direct call → `drawer.drawXxx()` 패턴 전환 (~30개소)
4. **`pixel` drawer 구현** (Graphics 기반) — 에셋 불필요, ~530줄 코드
5. **SVG 에셋 디렉토리 구성** — `public/assets/themes/{style}/` 구조
6. **`business` drawer 구현** (SVG 기반) — SVG 17개 제작 + ~200줄 로더 코드
7. **`cyber` drawer 구현** (SVG + Filter) — `@pixi/filter-glow` 설치, SVG + 글로우 이펙트
8. **프리셋에 `style` 필드 추가** — 스타일 필터 탭 UI
9. **스타일 전환 시 로딩 UX** — SVG 프리로드 + 프로그레스 표시
10. 이후 `cute`, `retro` 등 점진적 추가

---

## 12. Libraries & Dependencies

### 12.1 필요 라이브러리 분석

#### 이미 사용 중 (추가 설치 불필요)
| Library | Version | Usage |
|---------|---------|-------|
| **PixiJS** (pixi.js) | v8+ | 오피스 렌더링 전체. `Graphics`, `Container`, `Color` 클래스 등 이미 활용 중 |
| **React** | 18+ | UI 컴포넌트 |

#### 신규 추가 권장
| Library | Size | Purpose | Notes |
|---------|------|---------|-------|
| **react-colorful** | 2.8KB gzip | Color Picker UI | 현재 `<input type="color">`를 대체. 의존성 zero, 접근성 우수, 13개+ picker 변형 제공 (`HexColorPicker`, `HslColorPicker` 등). npm 주간 다운로드 100만+, React 18 호환. |

#### 신규 추가 선택 (권장)
| Library | Size | Purpose | Notes |
|---------|------|---------|-------|
| **colord** | 1.7KB gzip | 색상 조작 유틸 | HSL/RGB/HEX 변환, lighten/darken/saturate/desaturate 등. 의존성 zero, 플러그인 확장 가능. `deriveTheme()` 등 accent→floor/wall 파생 로직을 직관적으로 작성 가능. 없어도 기존 `blendColor()` + 비트 연산으로 대체 가능하나, 코드 가독성·유지보수성 향상. |

#### Phase 2에서 추가 필요 (Style Theme 구현 시)
| Library | Size | Purpose | Notes |
|---------|------|---------|-------|
| **@pixi/filter-glow** | ~3KB | 네온 글로우 이펙트 | cyber/futuristic 스타일의 네온 라인, 발광 효과. PixiJS v8 필터 플러그인. |

> **SVG 에셋**: 라이브러리가 아닌 디자인 파일. 스타일당 17개 SVG (`desk.svg`, `chair.svg` 등).
> PixiJS `Assets.load()` (내장)으로 로드 → `Sprite`로 렌더링. 별도 SVG 라이브러리 불필요.

#### 대안 (채택하지 않은 이유)
| Library | Size | Why Not |
|---------|------|---------|
| react-color | 14KB+ | 번들 크기 크고, 오래된 class component 기반 |
| react-color-palette | ~5KB | react-colorful 대비 커뮤니티 작고 기능 유사 |
| @rc-component/color-picker | ~8KB | Ant Design 생태계 종속 |

### 12.2 PixiJS 내장 기능 활용

추가 라이브러리 없이 PixiJS v8 내장 기능으로 처리 가능한 항목:

#### Color Manipulation
```typescript
import { Color } from "pixi.js";

// 색상 보간 (테마 전환 애니메이션)
const c = new Color(0xff0000);
c.premultiply(0.5); // alpha premultiply
Color.shared.setValue(0x5a9fd4).toHex(); // → "#5a9fd4"

// 기존 blendColor() 유틸도 활용 가능 (drawing-core.ts)
```

#### Pixel Art / 도트 스타일 렌더링
```typescript
// 방법 1: Graphics의 rect만 사용 (roundRect 회피)
g.rect(x, y, PX, PX).fill(color); // PX = 2~4px 단위

// 방법 2: Texture scaleMode (스프라이트 사용 시)
texture.source.scaleMode = "nearest"; // 픽셀 보간 없이 확대

// 방법 3: Graphics Pixel Line (PixiJS v8 내장)
// antialias 없는 1px 라인으로 도트풍 표현
g.setStrokeStyle({ width: 1, color: 0x000000, pixelLine: true });
```

- **Pixel 스타일 구현**: PixiJS `Graphics.rect()` + `pixelLine` 옵션으로 충분. 별도 라이브러리 불필요.
- **Color 변환**: PixiJS `Color` 클래스 + 기존 `blendColor()` 유틸로 충분.

### 12.3 추가 설치 불필요 확인

| 기능 | 해결 방법 |
|------|-----------|
| 테마 프리셋 정의 | 순수 TypeScript 상수 (외부 의존성 없음) |
| localStorage CRUD | 브라우저 내장 API |
| UUID 생성 | `crypto.randomUUID()` (브라우저 내장) |
| 색상 변환 (hex↔hsl) | PixiJS `Color` 클래스 또는 직접 계산 (~20줄) |
| 색상 보간/블렌딩 | 기존 `blendColor()` 유틸 (drawing-core.ts) |
| 가구 도트 렌더링 | PixiJS `Graphics.rect()` + `pixelLine` |
| 접기/펼치기 UI | CSS `max-height` transition 또는 React state |
| 드래그 앤 드롭 (Phase 3) | 향후 필요 시 `@dnd-kit/core` 검토 |

### 12.4 설치 명령어

```bash
# Phase 1: Color Theme (색상 프리셋 + 커스텀 저장)
npm install react-colorful colord

# Phase 2: Style Theme (SVG 에셋 기반 스타일 + 글로우 필터)
npm install @pixi/filter-glow

# 또는 pnpm
pnpm add react-colorful colord
pnpm add @pixi/filter-glow  # Phase 2
```

### 12.5 react-colorful 사용 예시

```tsx
import { HexColorPicker } from "react-colorful";

function AccentPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <HexColorPicker
      color={color}        // "#5a9fd4"
      onChange={onChange}   // (newColor: string) => void
      style={{ width: 160, height: 120 }}
    />
  );
}

// hex ↔ number 변환 유틸
const hexToNum = (hex: string) => parseInt(hex.replace("#", ""), 16);
const numToHex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
```

### 12.6 colord 사용 예시

```typescript
import { colord } from "colord";

// deriveTheme: accent 색상에서 floor/wall 자동 파생
function deriveTheme(accent: number, tone: number) {
  const base = colord(numToHex(accent));
  return {
    accent,
    floor1: hexToNum(base.lighten(0.25 - tone * 0.002).desaturate(0.15).toHex()),
    floor2: hexToNum(base.lighten(0.20 - tone * 0.002).desaturate(0.12).toHex()),
    wall:   hexToNum(base.darken(0.10 + tone * 0.002).desaturate(0.08).toHex()),
  };
}

// 색상 조화 팔레트 생성
const complementary = colord("#5a9fd4").rotate(180).toHex();   // 보색
const analogous     = colord("#5a9fd4").rotate(30).toHex();    // 유사색
const lighter       = colord("#5a9fd4").lighten(0.2).toHex();  // 밝게
const darker        = colord("#5a9fd4").darken(0.15).toHex();  // 어둡게
