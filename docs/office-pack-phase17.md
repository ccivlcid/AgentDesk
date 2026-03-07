# AgentDesk — Office Pack Phase 17 설계 문서

> **작성일**: 2026-03-07
> **상태**: 설계 중 (미구현)
> **선행 완료**: Phase 16 CEO 커스터마이즈 전체 구현 완료

---

## 현재 구현 완료 상태 (Phase 16 기준)

### CEO 커스터마이즈 (`ceo-customization.ts`)

| 필드 | 타입 | 설명 | 상태 |
|---|---|---|---|
| `headwear` | `CeoHeadwear` | crown/tophat/cap/halo/horns/ribbon/none | ✅ |
| `outfitTint` | `number` | 의상 컬러 hex (0xffffff = 기본) | ✅ |
| `title` | `string` | 직함 "CEO" / "CTO" 등 (최대 12자) | ✅ |
| `name` | `string` | 실명 — 명패 + 이름배지 표시 | ✅ |
| `companyName` | `string` | 회사명 — 옥상 사인 교체 | ✅ |
| `avatarEmoji` | `string` | 로봇 얼굴 위 이모지 오버레이 | ✅ |
| `greetings` | `string[]` | 방문자 인사말 커스텀 (최대 5개) | ✅ |
| `personaId` | `string \| null` | 퍼소나 카탈로그 연결 | ✅ |
| `trailEffect` | `CeoTrailEffect` | sparkle/stars/hearts/fire/none | ✅ |

### 오피스 뷰 현재 구조

```
OfficeView.tsx (981줄) — 메인 컨테이너
├── OfficeDeptPanel.tsx (278줄) — 좌측 부서/층 내비게이션
├── OfficeAgentPanel.tsx (498줄) — 우측 에이전트/부서 상세
├── OfficeQuickChat.tsx — 캔버스 에이전트 클릭 즉석 채팅
├── OfficeRoomManager.tsx (1610줄) — 방 설정/CEO 커스텀 모달
└── PixiJS Canvas
    ├── drawRoof.ts — 옥상 (헬리패드/안테나/사인)
    ├── drawPenthouse.ts — CEO 펜트하우스
    ├── drawConferenceFloor.ts — 전용 회의실 층
    ├── drawFloor.ts — 부서 층 (N개)
    ├── drawElevator.ts — 엘리베이터 샤프트
    ├── drawBasement.ts — 지하 휴게실
    └── drawExteriorWalls.ts — 외벽 창문
```

---

## Phase 17 — 오피스팩 확장 및 개선

### 17-A. OfficeRoomManager 탭 리팩터 (HIGH)

**문제**: 현재 1610줄 단일 파일, 스크롤 과다, UX 혼잡

**구현 계획**:

```
OfficeRoomManager
├── Tab 1: [ 방 테마 ]    → RoomThemesTab
├── Tab 2: [ CEO ]        → CeoCustomTab
├── Tab 3: [ 가구/꾸미기 ] → DecorTab
└── Tab 4: [ 시즌/스타일 ] → SeasonStyleTab
```

**변경 파일**:
- `OfficeRoomManager.tsx` — 탭 네비게이션 + 탭별 서브컴포넌트 분리
- `office-room/RoomThemesTab.tsx` (NEW) — 기존 테마 프리셋/부서별 색상
- `office-room/CeoCustomTab.tsx` (NEW) — CEO 커스터마이즈 전체
- `office-room/DecorTab.tsx` (NEW) — 방 장식 + 가구 카탈로그
- `office-room/SeasonStyleTab.tsx` (NEW) — 계절/드로잉 스타일

**UI**:
```
[ 방 테마 ] [ CEO ★ ] [ 가구 ] [ 시즌 ]
─────────────────────────────────────
... 탭 콘텐츠 ...
```
- 탭 아이콘: 페인트통 / 로봇 / 소파 / 눈송이
- 탭 높이 44px, 아래 구분선, amber 활성 표시
- 탭 변경 시 스크롤 위치 초기화

---

### 17-B. CEO 책상 스타일 (LOW → MED)

**현재**: `drawPenthouse.ts`에 고정 desk 렌더링

**추가**:
- `CeoCustomization`에 `deskStyle: "default" | "executive" | "minimal"` 추가
- `drawPenthouse.ts`에 3종 분기

| 스타일 | 설명 | 시각 |
|---|---|---|
| `default` | 현재 다크 터미널 데스크 | 기본 |
| `executive` | 더 넓은 L자 데스크 + 모니터 2개 | 위엄 |
| `minimal` | 얇은 스탠딩 데스크 + 노트북 1개 | 미니멀 |

---

### 17-C. 에이전트 무드/감정 시각화 (MED)

**설명**: 에이전트 상태에 따라 픽셀아트 이모지 반응 오버레이

**구현**:
- `drawFloor.ts` — 에이전트 캐릭터 머리 위 mood 아이콘
- `officeTicker.ts` — mood 아이콘 페이드 인/아웃 애니메이션

| 상태 | 아이콘 | 트리거 |
|---|---|---|
| `working` | 💻 (작업 중 깜빡임) | task in_progress |
| `idle` | 💤 (30초 후 표시) | 30틱 이상 idle |
| 태스크 완료 | ⭐ (2초 팝업) | task done 이벤트 |
| 방문자 수신 | 👋 (방문 중) | visitor inbound |
| 회의 참석 | 📋 (회의 중) | meeting active |

**저장**: 무드 상태는 tick state로만 관리 (persistX 불필요)

**파일**:
- `officeTicker.ts` — mood tick 로직 추가
- `buildScene-department-agent.ts` — mood container 슬롯 추가

---

### 17-D. 부서 성과 실시간 층 HUD (MED)

**설명**: 각 층 우측 외벽에 FM2024 스타일 실시간 스탯 스트립

**현재**: 층마다 부서명 라벨 + 에이전트 슬롯만 있음

**추가**: 층 우측 외벽 (엘리베이터 옆) 에 세로 스탯 스트립

```
┌──────────────────────────────┐ ▌TSK:12
│ DEV  [■■■□] [■■□□] [■■■■]   │ ▌DONE:8
│  A1   A2     A3               │ ▌CLR:67%
└──────────────────────────────┘ ▌ACT:3/4
```

**구현**:
- `drawFloor.ts` — `drawFloorStatStrip()` 신규 함수
- 스탯: 활성 에이전트 수 / 완료 태스크 / 진행률
- `officeTicker.ts` — 스탯 텍스트 실시간 업데이트

---

### 17-E. 회의실 에이전트 참석자 시각화 (HIGH)

**설명**: 현재 회의실은 테이블만 있고 에이전트 스프라이트가 없음

**구현**:
- `drawConferenceFloor.ts` — 테이블 주변 에이전트 슬롯 (최대 8석)
- `buildScene.ts` — activeMeetingTaskId가 있을 때 참석 에이전트 렌더링
- `officeTicker.ts` — 회의 중 고개 끄덕임 애니메이션

**슬롯 배치**:
```
  [A] [A] [A] [A]
  ████████████████  ← 회의 테이블
  [A] [A] [A] [A]
```
- 회의 참석 에이전트는 `meetingPresence` 배열 기반 렌더링
- 비어있는 슬롯은 빈 의자로 표시
- 회의 진행 중: 테이블 amber glow pulse

---

### 17-F. 오피스 글로벌 공지 배너 (MED)

**설명**: CEO가 전체 공지 전송 시 오피스 캔버스에 배너 표시

**트리거**: `message_type === "announcement"` 이벤트 수신

**시각**:
```
┌─────────────────────────────────────────┐
│ ◉ BROADCAST  "회사 전체 공지 내용..."   │
│            CEO — 14:32                  │
└─────────────────────────────────────────┘
```
- 캔버스 상단에 amber 배너 슬라이드다운 (3초 표시 후 페이드아웃)
- PixiJS Text + Graphics (별도 오버레이 Container)
- `officeTicker.ts` — 배너 fade 타이머

**파일**:
- `officeTicker.ts` — announcementBanner 상태 + tick
- `buildScene-types.ts` — `announcementBannerRef` 추가
- `OfficeView.tsx` — SSE 메시지 수신 시 PixiJS 배너 트리거

---

### 17-G. 방문자 이벤트 강화 (MED)

**현재**: 방문자가 이동하고 채팅버블 표시

**추가 이벤트**:

| 이벤트 | 트리거 | 시각 |
|---|---|---|
| 선물 전달 | 방문 완료 (5% 확률) | 🎁 아이콘 팝업 + 반짝임 |
| 긴급 알림 | task failed 에이전트 방문 | 🚨 빨간 배너 + 빠른 걸음 |
| 협업 요청 | cross-dept delivery 도착 | 🤝 악수 이모지 버블 |

**파일**:
- `visitorTick.ts` — 이벤트 확률 계산 + 새 state 추가
- `buildScene-department-agent.ts` — 이벤트 이모지 오버레이

---

### 17-H. 오피스 뷰 미니맵 (LOW)

**설명**: 우측 패널 하단에 빌딩 전체 세로 미니맵

```
P  █   ← 펜트하우스
C  █   ← 회의실
F1 █ ● ← 선택된 층
F2 █
F3 █
B1 █   ← 휴게실
```
- 각 층의 활성도를 색상으로 표시 (green=active, dim=idle)
- 클릭 시 해당 층 스크롤
- `OfficeDeptPanel.tsx` 하단에 SVG 미니맵 추가

---

### 17-I. CEO 일정/KPI 목표치 (LOW)

**설명**: 펜트하우스 터미널 스트립에 사용자 정의 KPI 목표 표시

**추가**:
- `CeoCustomization`에 `kpiTargets: { tasks?: number; agents?: number; clearRate?: number }` 추가
- `drawPenthouse.ts` — 터미널 스트립에 `목표 N / 현재 M` 표시
- OfficeRoomManager CEO 탭에 목표치 입력 폼

```
STAFF 8/10  ACTIVE 3/5  TASKS 45/50  DONE 82%▶90%
```

---

## 구현 우선순위

| ID | 기능 | 난이도 | 임팩트 | Priority |
|---|---|---|---|---|
| 17-A | OfficeRoomManager 탭 리팩터 | 중 | 매우 높음 (UX) | **HIGH** |
| 17-E | 회의실 에이전트 참석자 시각화 | 중 | 높음 (가시성) | **HIGH** |
| 17-C | 에이전트 무드/감정 시각화 | 중 | 높음 (몰입감) | **MED** |
| 17-D | 층 HUD 스탯 스트립 | 중 | 중간 | **MED** |
| 17-F | 오피스 글로벌 공지 배너 | 중 | 중간 | **MED** |
| 17-G | 방문자 이벤트 강화 | 낮 | 중간 | **MED** |
| 17-B | CEO 책상 스타일 | 낮 | 낮음 | **LOW** |
| 17-H | 오피스 미니맵 | 중 | 낮음 | **LOW** |
| 17-I | CEO KPI 목표치 | 낮 | 낮음 | **LOW** |

---

## 파일 변경 요약

### 신규 파일
```
src/components/office-room/RoomThemesTab.tsx
src/components/office-room/CeoCustomTab.tsx
src/components/office-room/DecorTab.tsx
src/components/office-room/SeasonStyleTab.tsx
```

### 수정 파일
```
src/components/OfficeRoomManager.tsx      — 탭 구조로 리팩터
src/components/office-view/drawFloor.ts   — 층 HUD 스탯 스트립
src/components/office-view/drawConferenceFloor.ts — 에이전트 참석자 슬롯
src/components/office-view/drawPenthouse.ts       — CEO 책상 스타일, KPI 목표
src/components/office-view/officeTicker.ts        — 무드, 배너, 방문자 이벤트
src/components/office-view/buildScene-types.ts    — 새 ref 타입
src/components/office-view/buildScene.ts          — 회의실 참석자 렌더링
src/components/office-view/visitorTick.ts         — 이벤트 확률 로직
src/components/office-view/OfficeDeptPanel.tsx    — 미니맵
src/components/office-view/ceo-customization.ts   — deskStyle, kpiTargets 필드
```

---

## 데이터 구조 변경

### CeoCustomization (추가 필드)
```typescript
interface CeoCustomization {
  // ... 기존 필드 (headwear, outfitTint, title, name, companyName, avatarEmoji, greetings, personaId, trailEffect)
  deskStyle: "default" | "executive" | "minimal";  // NEW (17-B)
  kpiTargets: {                                      // NEW (17-I)
    tasks?: number;
    agents?: number;
    clearRate?: number;
  };
}
```

### 오피스 Tick State (추가)
```typescript
interface AnnouncementBanner {
  text: string;
  senderName: string;
  timeLabel: string;
  ttl: number;  // 틱 카운터 (180 = ~3초)
}

interface AgentMoodState {
  agentId: string;
  mood: "working" | "idle" | "done_flash" | "visitor" | "meeting";
  ttl: number;
}
```

---

## 참고: 현재 OfficeRoomManager 섹션 구조

현재 단일 스크롤 패널에 다음 섹션들이 순서대로 있음:

1. 시즌 선택 (6개 버튼)
2. 드로잉 스타일 (4개 버튼)
3. 테마 프리셋 비교/내보내기/가져오기
4. 빌트인 테마 그리드
5. 내 테마 목록 (저장/편집/삭제)
6. 부서별 테마 (N개 DeptCard — 드래그 정렬 포함)
7. 방 장식 (wallDecor/plant/floorDecor/deskAccessory/lighting)
8. 가구 카탈로그 (CATALOG_ITEMS)
9. 레이아웃 에디터 (RoomLayoutEditor)
10. CEO 커스터마이즈 (headwear/color/title/name/company/emoji/greetings/persona/trail)

→ 탭 분리 후 각 탭에 관련 섹션 배치
