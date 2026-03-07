# Pack Identity System — Design Specification

> Created: 2026-03-08
> Status: PLANNING
> Ref: `docs/progress.md` Phase 18

---

## 핵심 철학

지금까지 오피스 팩 전환은 **방 색깔이 바뀌는 것**이었다.

이 시스템의 목표는 다르다:
> **팩을 바꾸면 다른 소프트웨어에 들어온 것처럼 느껴져야 한다.**

색깔이 아니라 **공간의 메타포**, **UI의 언어**, **인터페이스의 형태** 자체가 바뀐다.

---

## 변화의 3축

### 1. 공간 메타포 (Office View Canvas)

현재: 모든 팩이 동일한 **건물 단면도(cross-section tower)** 를 공유한다.

새 시스템: 팩마다 **완전히 다른 공간**을 렌더링한다.
- 건물 단면도가 아닌 다른 형태의 실내 공간
- 같은 PixiJS 렌더러지만 다른 `buildScene` 진입점을 사용

### 2. UI 언어 (Vocabulary Layer)

태스크, 에이전트, 부서, 완료 상태 등 앱 전체에서 사용하는 단어가 그 산업의 언어로 바뀐다.
- 구현: `pack-vocabulary.ts` — 팩별 단어 맵 + `usePackVocab()` 훅

### 3. 인터페이스 형태 (Identity Layer)

태스크 카드 모양, 오피스 뷰 위 HUD 오버레이, 헤더 색조가 바뀐다.
- 태스크 카드는 그 산업에서 실제로 쓰는 서류 형태를 참조
- HUD 오버레이는 그 산업의 "실시간 정보"를 보여줌

---

## 팩별 아이덴티티 스펙

### DEV — 터미널 컨트롤 센터 (현재 유지)

**공간 메타포**: 현재 타워 단면도 유지. 모든 팩의 기준점.

**UI 언어**:
| 개념 | 단어 |
|---|---|
| Task | Issue |
| Agent | Engineer |
| Department | Team |
| Done | Merged |
| Dashboard | Sprint Board |

**태스크 카드**: 현재 FM2024 스타일 유지. `#001 [RUNNING] Fix auth bug` 형태.

**HUD 오버레이**: 없음 (기본값).

---

### REPORT — 편집국 (Editorial Newsroom)

**공간 메타포**: 가로로 긴 오픈플로어 뉴스룸.
- 타워 단면도 대신 **좌→우 수평 레이아웃**
- 각 "부서"는 편집 데스크 섹션 (사회부/정치부/경제부/문화부)
- 가장 왼쪽: 편집장(CEO) 유리 파티션 방
- 가장 오른쪽: 인쇄소/마감 게시판
- 화면 상단에 오늘 날짜 + 신문 masthead 스타일 헤더
- 창문 너머로 도시 야경(밤) 또는 도심(낮)

```
[ 편집장 방 ] [ 사회부 데스크 ] [ 정치부 ] [ 경제부 ] [ 마감 게시판 ]
```

**UI 언어**:
| 개념 | 단어 |
|---|---|
| Task | Story |
| Agent | Reporter |
| Department | Desk |
| Done | Published |
| Dashboard | Front Page |
| Create Task | Assign Story |

**태스크 카드**: 신문 기사 컷아웃 형태.
```
┌─────────────────────────────────┐
│ EXCLUSIVE  ●BREAKING            │
│ ─────────────────────────────── │
│ Fed raises rates by 50bp        │
│ amid inflation surge            │
│                                 │
│ By: Kim Reporter  Due: 18:00    │
│ Economy Desk ·  ████░░ 60%      │
└─────────────────────────────────┘
```
- 카드 폰트: 세리프 제목 + 산세리프 본문
- 상단 rubric 배지: `EXCLUSIVE` / `BREAKING` / `FEATURE`
- 마감 시간 카운트다운 표시
- 진행률 바 = "취재 진행도"

**HUD 오버레이**: 마감 카운트다운 배너 (화면 하단 고정)
```
[ DEADLINE: 6개 스토리 · 18:00까지 · 3개 마감 ██████░░░░ ]
```

---

### NOVEL — 작가들의 산장 (Writer's Retreat)

**공간 메타포**: 산 속 통나무 산장. 독립된 방들이 있는 구조.
- 타워 단면도와 비슷하지만 **벽돌/나무 질감**으로 완전히 다른 분위기
- 각 방은 개별 작가의 집필실 (작은 창, 책상, 촛불)
- 공용 공간: 벽난로가 있는 라운지 (break room 역할)
- CEO 방: 수석 편집자의 연구실 (책장 가득)
- 창문 너머: 눈 덮인 산, 달빛
- 분위기: 어둡고 따뜻한 촛불 조명 톤

**UI 언어**:
| 개념 | 단어 |
|---|---|
| Task | Chapter |
| Agent | Author |
| Department | Studio |
| Done | Written |
| Dashboard | Outline |
| Create Task | New Chapter |
| XP | Words Written |

**태스크 카드**: 양피지 두루마리 / 원고지 형태.
```
┌──── Chapter 7 ─────────────────┐
│  ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋  │  ← 원고지 선
│  The storm arrived at dusk...  │
│                                │
│  📖 J. Kim  ·  3,200 words    │
│  ░░░░░░░░░░░░████████ Draft   │
└────────────────────────────────┘
```
- 배경: 미색(parchment) 카드
- 텍스트: 세리프 폰트
- 진행률 = "집필 완성도"
- 상단 Chapter 번호

**HUD 오버레이**: 총 단어 수 + 오늘의 집필 목표
```
[ 오늘 목표: 5,000 words  ·  현재: 3,240  ·  64% ██████░░░░ ]
```

---

### VIDEO — 촬영 스튜디오 (Production Studio)

**공간 메타포**: 스튜디오 세트장 탑뷰(top-down).
- **타워 단면도 완전 폐기** → 위에서 내려다보는 스튜디오 플로어
- 큰 사운드스테이지 여러 개 (각각이 "부서")
- 각 스테이지 안에 촬영 장비, 조명 리그, 모니터 배치
- 스튜디오 외곽: 복도, 분장실, 편집실
- 헤더: ON AIR 빨간 라이트 (촬영 중인 에이전트가 있을 때 켜짐)

```
┌─ Sound Stage A ─┐  ┌─ Sound Stage B ─┐
│  📷  💡  📷    │  │  📷  💡         │
│  [Agent 1 ●]   │  │  [Agent 2]      │
│  [Agent 3]     │  │  [Agent 4 ●]   │
└────────────────┘  └─────────────────┘
    ┌─ Edit Suite ─┐   ┌─ VFX Booth ─┐
    │  💻  [A5 ●]  │   │  💻  [A6]  │
    └──────────────┘   └────────────┘
```

**UI 언어**:
| 개념 | 단어 |
|---|---|
| Task | Shot |
| Agent | Crew |
| Department | Stage |
| Done | Wrapped |
| Dashboard | Slate |
| Create Task | New Shot |
| Status Running | ON AIR |

**태스크 카드**: 스토리보드 셀 / 클래퍼보드 형태.
```
┌──────────────────────────────────┐
│ █ SCENE 042 · TAKE 3             │
│──────────────────────────────────│
│                                  │
│  [ 스토리보드 썸네일 영역 ]        │
│                                  │
│──────────────────────────────────│
│ Director: Park  Stage: A  EXT    │
│ ● REC  00:03:24                  │
└──────────────────────────────────┘
```
- 배경: 완전 검정
- 텍스트: 흰색, 굵은 고딕
- 상단 클래퍼보드 스트라이프 (흑백)
- 진행 시간 표시

**HUD 오버레이**: ON-AIR 표시 + 현재 촬영 씬 정보
```
[ ● ON AIR  ·  STAGE A  ·  Scene 042 Take 3  ·  00:03:24 ]
```

---

### RPG — 판타지 길드 (Fantasy Guild)

**공간 메타포**: 중세 성/던전 단면도.
- 타워 단면도와 같은 수직 구조이지만 **완전히 다른 시각 언어**
- 석벽, 횃불, 아치형 천장
- 각 층: 길드 홀, 도서관, 훈련장, 마법 연구실, 무기고
- 천장: 성벽 흉벽(battlement)
- 지하: 던전 (break room → 선술집)
- 엘리베이터 → 마법 공중부양 크리스털 (같은 위치)
- 조명: 횃불 flickering 효과

**UI 언어**:
| 개념 | 단어 |
|---|---|
| Task | Quest |
| Agent | Adventurer |
| Department | Guild |
| Done | Cleared |
| Dashboard | Quest Log |
| Create Task | Post Quest |
| XP | Experience |
| Status Running | On Quest |
| Idle | In Town |

**태스크 카드**: 퀘스트 스크롤 형태.
```
┌──────────────────────────────────┐
│  ⚔ QUEST  ·  [EPIC]             │
│══════════════════════════════════│
│  Slay the Database Dragon        │
│                                  │
│  Assigned: Sir. Kim (Lv.34)     │
│  Reward: 500 XP  ·  3 Gold      │
│                                  │
│  ▓▓▓▓▓▓░░░░ 60%  MAIN QUEST    │
└──────────────────────────────────┘
```
- 배경: 양피지색 (parchment)
- 테두리: 금색 장식선
- 난이도 배지: `[EPIC]` / `[RARE]` / `[COMMON]`
- 보상으로 XP 표시

**HUD 오버레이**: 파티 상태 + 활성 퀘스트 수
```
[ ⚔ PARTY: 8명  ·  ACTIVE QUESTS: 5  ·  GUILD RANK: B  ·  TOTAL XP: 24,300 ]
```

---

### ASSET — 트레이딩 플로어 (Trading Floor)

**공간 메타포**: 금융 트레이딩 플로어. 탑뷰.
- 빽빽하게 늘어선 트레이딩 데스크 열
- 각 데스크: 모니터 여러 대, 전광판
- 벽면: 실시간 시세 전광판
- 특별 구역: 리스크 관리실, 리서치룸
- 분위기: 완전 블랙 배경, 녹색/빨간 숫자

**UI 언어**:
| 개념 | 단어 |
|---|---|
| Task | Order |
| Agent | Trader |
| Department | Desk |
| Done | Settled |
| Dashboard | Portfolio |
| Create Task | New Order |
| Status Running | Executing |
| Idle | Watching |
| XP | P&L |

**태스크 카드**: 거래 티켓 형태.
```
┌──────────────────────────────────┐
│ BUY  ·  ORD-0042  ·  EXECUTING  │
│──────────────────────────────────│
│  AAPL Analytics Pipeline         │
│                                  │
│  Desk: Quant  Trader: Lee        │
│  Size: HIGH   Risk: MED          │
│                                  │
│  ▲ +2.4%  ████████░░ 80%        │
└──────────────────────────────────┘
```
- 배경: 거의 검정 (`#020c04`)
- 액센트: 매트릭스 그린 (`#00ff41`)
- 가격 상승: 초록, 하락: 빨강
- 폰트: 완전 모노스페이스

**HUD 오버레이**: 실시간 포트폴리오 P&L + 실행 중인 오더 수
```
[ LIVE  ·  ORDERS: 5 EXEC · 3 WATCH  ·  TODAY P&L: +14.3%  ·  NYSE: 09:42:18 ]
```

---

### WEB — 리서치 랩 (Research Lab)

**공간 메타포**: 타워 단면도 유지하되 **유리/투명 파티션** 스타일.
- 현재 DEV 팩과 구조는 동일
- 차이점: 벽 대신 유리, 색조는 차가운 청색
- 화이트보드 + 모니터 많은 오픈 랩 분위기
- 각 층 이름: "리서치 베이 A/B/C"

*(WEB 팩은 구조 변화보다 색조/가구 변경에 집중)*

**UI 언어**:
| 개념 | 단어 |
|---|---|
| Task | Query |
| Agent | Analyst |
| Department | Lab |
| Done | Published |
| Dashboard | Index |

---

## 구현 아키텍처

### 파일 구조

```
src/
  pack-identity/
    vocabulary.ts          ← 팩별 UI 언어 맵
    canvas-mode.ts         ← 팩별 캔버스 렌더러 지정
    hud-overlay.ts         ← 팩별 HUD 오버레이 컴포넌트 맵
    task-card-style.ts     ← 팩별 태스크 카드 스타일 선언

  components/
    office-view/
      buildScene-report.ts   ← 뉴스룸 수평 레이아웃 렌더러
      buildScene-video.ts    ← 스튜디오 탑뷰 렌더러
      buildScene-rpg.ts      ← 던전/성 단면도 렌더러
      buildScene-asset.ts    ← 트레이딩 플로어 탑뷰 렌더러
      buildScene-novel.ts    ← 산장 단면도 렌더러

    hud/
      ReportHud.tsx          ← 마감 카운트다운 배너
      VideoHud.tsx           ← ON-AIR 라이트 + 씬 정보
      RpgHud.tsx             ← 파티 상태 + 퀘스트 수
      AssetHud.tsx           ← 실시간 P&L + 오더 수

    taskboard/
      TaskCardReport.tsx     ← 신문 기사 카드
      TaskCardNovel.tsx      ← 양피지 두루마리 카드
      TaskCardVideo.tsx      ← 클래퍼보드/스토리보드 카드
      TaskCardRpg.tsx        ← 퀘스트 스크롤 카드
      TaskCardAsset.tsx      ← 거래 티켓 카드
```

### 핵심 훅

```typescript
// src/pack-identity/vocabulary.ts
export function usePackVocab(packKey: string) {
  return PACK_VOCAB[packKey] ?? PACK_VOCAB.development;
}

// 사용 예
const { task, agent, done } = usePackVocab(activePack);
// task = "Quest", agent = "Adventurer", done = "Cleared"  (RPG 팩)
```

### 캔버스 분기

```typescript
// OfficeView.tsx 내부
function getSceneBuilder(packKey: string) {
  switch (packKey) {
    case "report":        return buildSceneReport;
    case "video_preprod": return buildSceneVideo;
    case "rpg":           return buildSceneRpg;
    case "asset_management": return buildSceneAsset;
    case "novel":         return buildSceneNovel;
    default:              return buildScene; // DEV/WEB
  }
}
```

---

## 구현 단계

### Phase 18-A — 어휘 레이어 (Vocabulary Layer)
**범위**: 앱 전체 단어 교체. 가장 즉각적 체감.

- `pack-identity/vocabulary.ts` 작성 (7팩 × ~10개 단어)
- `usePackVocab()` 훅 구현
- TaskBoard, Dashboard, OfficeView 패널에 어휘 적용
- 예상 파일: 5~8개

**우선 적용 팩**: RPG, ASSET (단어 차이가 가장 극명)

---

### Phase 18-B — HUD 오버레이
**범위**: 오피스 뷰 화면 위에 팩 특화 정보 배너 추가.

- `ReportHud.tsx` — 마감 카운트다운 (태스크 due_date 기반)
- `VideoHud.tsx` — ON-AIR 표시 (running 에이전트 있을 때)
- `RpgHud.tsx` — 파티/퀘스트 상태
- `AssetHud.tsx` — 실시간 P&L (완료 태스크 수 기반)

OfficeView.tsx에 `<PackHud packKey={...} />` 단일 진입점 추가.

---

### Phase 18-C — 태스크 카드 형태 변형
**범위**: 팩별 다른 모양의 태스크 카드.

- 기본 `TaskCard.tsx`는 유지 (DEV/WEB 팩)
- 팩별 전용 카드 컴포넌트 추가
- TaskBoard에서 `activePack`에 따라 카드 컴포넌트 분기

**우선 구현**: RPG (퀘스트 스크롤), ASSET (거래 티켓)

---

### Phase 18-D — 캔버스 렌더러 분기
**범위**: 팩별 완전히 다른 오피스 공간 렌더링.

**구현 우선순위**:
1. ASSET — 트레이딩 플로어 탑뷰 (DEV와 가장 다른 느낌, 상대적으로 단순)
2. VIDEO — 스튜디오 탑뷰
3. REPORT — 수평 뉴스룸
4. RPG — 던전 단면도 (가장 공이 많이 드는 것)
5. NOVEL — 산장 단면도

각 렌더러는 독립 파일 (`buildScene-{pack}.ts`)로 작성.
기존 `buildScene.ts`의 타입/상수를 재사용.

---

## 진행 체크리스트

| 항목 | 팩 | Phase | 상태 |
|---|---|---|---|
| Vocabulary 맵 작성 | 전체 | 18-A | TODO |
| usePackVocab 훅 | — | 18-A | TODO |
| TaskBoard 어휘 적용 | 전체 | 18-A | TODO |
| Dashboard 어휘 적용 | 전체 | 18-A | TODO |
| OfficeView 패널 어휘 적용 | 전체 | 18-A | TODO |
| ReportHud | REPORT | 18-B | TODO |
| VideoHud | VIDEO | 18-B | TODO |
| RpgHud | RPG | 18-B | TODO |
| AssetHud | ASSET | 18-B | TODO |
| TaskCardRpg | RPG | 18-C | TODO |
| TaskCardAsset | ASSET | 18-C | TODO |
| TaskCardReport | REPORT | 18-C | TODO |
| TaskCardVideo | VIDEO | 18-C | TODO |
| TaskCardNovel | NOVEL | 18-C | TODO |
| buildScene-asset.ts | ASSET | 18-D | TODO |
| buildScene-video.ts | VIDEO | 18-D | TODO |
| buildScene-report.ts | REPORT | 18-D | TODO |
| buildScene-rpg.ts | RPG | 18-D | TODO |
| buildScene-novel.ts | NOVEL | 18-D | TODO |

---

---

## 오피스 뷰 내비게이션 보조 — 전체 보기 & 미니맵

> 이 기능은 팩 무관하게 **개발 오피스 팩 포함 모든 팩**에 공통 적용된다.
> Phase 18-E로 분류.

### 현황 분석

| 항목 | 현재 값 |
|---|---|
| PixiJS 캔버스 너비 | `FLOOR_W = 410px` (논리 픽셀) |
| PixiJS 캔버스 높이 | `totalH` — 부서 수에 따라 가변 |
| 6개 부서 기준 totalH | `ROOF_H(40) + PENTHOUSE_H(160) + CONFERENCE(140) + 6×FLOOR_TOTAL_H(184) + BASEMENT(140)` = **1,584px** |
| 스크롤 컨테이너 | `.office-canvas-wrap` (`overflow-y: auto`) |
| 캔버스 크기 관리 | `totalHRef`, `officeWRef` (buildScene이 갱신) |
| 현재 내비게이션 | 왼쪽 패널 층 클릭 → `wrap.scrollTo()` |

**문제**: 빌딩 전체가 뷰포트보다 훨씬 길어 층간 이동 시 맥락을 잃기 쉽고, 전체 구조를 한 번에 파악할 수 없다.

---

### 기능 1 — 전체 보기 (Overview Mode)

#### 개념

툴바 버튼 클릭 → 빌딩 전체가 화면에 맞게 축소되어 한눈에 보인다.
다시 클릭하면 원래 스크롤 뷰로 복귀.

```
[일반 뷰]                    [전체 보기]
┌──────────────┐            ┌──────────────┐
│  Penthouse   │            │  P           │
│  (보임)      │            │  C  F1  F2  │  ← 모든 층 축소
│──────────────│  →→→→→→→→  │  F3 F4  F5  │
│              │            │  F6  B1      │
│  (스크롤해야 │            └──────────────┘
│   보이는 부분│
└──────────────┘
```

#### 구현 방식 — CSS Transform Scale

PixiJS 내부를 건드리지 않고 캔버스 요소에 CSS `transform: scale()` 적용.

**왜 CSS scale인가**:
- `app.stage.scale`은 PixiJS 내부 좌표계를 바꿔 hit detection 보정 필요
- CSS transform은 브라우저가 pointer event 좌표를 자동 보정 → 클릭 동작 그대로 유지
- 구현 간단, PixiJS 렌더러 크기 변경 불필요

**계산식**:
```typescript
// wrap 크기 기준으로 fitScale 계산
const wrapW = wrap.clientWidth;
const wrapH = wrap.clientHeight;
const fitScale = Math.min(
  wrapW / officeWRef.current,
  wrapH / totalHRef.current,
) * 0.95; // 여백 5%
```

**상태 전환**:

| 상태 | canvas style | wrap overflow | wrap scroll |
|---|---|---|---|
| 일반 뷰 | `transform: none` | `overflow-y: auto` | 자유 |
| 전체 보기 | `transform: scale(fitScale); transformOrigin: top center` | `overflow: hidden` | 잠금 |

**제약사항**:
- 전체 보기 중 에이전트 클릭 → 우측 패널 열림 (정상 동작, CSS scale이 좌표 보정 처리)
- 전체 보기 중 스크롤은 비활성
- 층 클릭 내비게이션 → 전체 보기 자동 해제 후 해당 층으로 이동

#### UI

위치: 오피스 뷰 **툴바 우측 영역** (기존 Season/Style 버튼 옆)

```
[ RUNNING: 3 | TASKS: 12 | ▦ OVERVIEW ]
                              ↑ 토글 버튼
```

- 아이콘: `▦` (grid overview) 또는 4개의 작은 사각형 SVG
- 활성 시: amber 하이라이트
- 키보드 단축키: `F` (fit/full view)

**신규 파일**: 없음 — `OfficeView.tsx` 내 상태 추가 + CSS 조건부 적용

---

### 기능 2 — 미니맵 (Minimap)

#### 개념

오피스 뷰 우하단에 고정된 작은 축소 지도.
현재 뷰포트 위치를 표시하고, 클릭하면 해당 위치로 이동.

```
오피스 뷰 전체 화면
┌─────────────────────────────┐
│                             │
│      [현재 보이는 영역]      │  ← 실제 캔버스 스크롤 뷰
│                             │
│                  ┌────┐     │
│                  │ P  │  ←  미니맵 (우하단 고정)
│                  │■■  │     ■ = 현재 뷰포트 위치
│                  │    │
│                  │    │
│                  └────┘
└─────────────────────────────┘
```

#### 미니맵 렌더링

**기술 선택**: HTML `<canvas>` 2D API (PixiJS 아님)
- PixiJS 두 번째 인스턴스는 overhead 과다
- 단순 색상 블록 렌더링에 2D canvas로 충분
- 스크롤 이벤트 동기화가 쉬움

**미니맵 크기**:
```
minimapW = 72px (고정)
minimapH = min(200px, wrapH * 0.4)
scaleX = minimapW / officeW      // 72 / 410 ≈ 0.175
scaleY = minimapH / totalH       // 200 / 1584 ≈ 0.126
```

**렌더링 내용** (아래에서 위 순서로 2D drawRect):

| 영역 | 색상 | 높이 비례 |
|---|---|---|
| 지붕(ROOF) | `#1a1a2e` | `ROOF_H × scaleY` |
| 펜트하우스 | `#2a1f0e` + amber 점 | `PENTHOUSE_H × scaleY` |
| 회의실(CONF) | `#1a2a1a` | `CONFERENCE_FLOOR_H × scaleY` |
| 부서 층 × N | `dept.color` (15% opacity) | `FLOOR_TOTAL_H × scaleY` |
| 지하 휴게실 | `#0d1b0d` | `BASEMENT_H × scaleY` |

**뷰포트 인디케이터**: amber 반투명 rect
```
viewportTop = (wrap.scrollTop / totalH) * minimapH
viewportH   = (wrap.clientHeight / (totalH * cssScale)) * minimapH
// amber rect at (0, viewportTop) size (minimapW, viewportH)
```

#### 인터랙션

| 동작 | 결과 |
|---|---|
| 클릭 | 클릭 위치에 해당하는 논리 Y를 계산 → `wrap.scrollTo()` |
| 드래그 | 드래그하는 동안 실시간 스크롤 |
| 스크롤 이벤트 | 뷰포트 인디케이터 즉시 업데이트 |
| 전체 보기 모드 | 미니맵 숨김 (전체 보기일 때 미니맵 불필요) |

**클릭 → 스크롤 계산식**:
```typescript
const clickY = e.offsetY; // 미니맵 내 Y
const targetLogicalY = (clickY / minimapH) * totalH;
const targetScrollTop = targetLogicalY * (canvas.clientHeight / totalH)
                        - wrap.clientHeight / 2;
wrap.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
```

#### 위치 & 스타일

- 위치: `.office-canvas-frame` 내 `position: absolute; bottom: 48px; right: 8px;` (액션바 위)
- 배경: `rgba(0,0,0,0.75)` + amber border `1px solid rgba(251,191,36,0.3)`
- `border-radius: 2px` (FM2024 sharp 규칙)
- 숨김 조건: 전체 보기 활성 중 / 뷰포트가 이미 전체를 보여줄 만큼 클 때

#### 신규 파일

```
src/components/office-view/OfficeMinimap.tsx
```

**Props**:
```typescript
interface OfficeMinimapProps {
  departments: Department[];
  totalH: number;             // totalHRef.current
  officeW: number;            // officeWRef.current
  roomThemes: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
  scrollWrapRef: RefObject<HTMLElement>;  // .office-canvas-wrap
  cssScale: number;           // 1.0 (일반) or fitScale (전체 보기 시 미니맵 숨김)
  visible: boolean;
}
```

---

### Phase 18-E 구현 체크리스트

| 항목 | 파일 | 상태 |
|---|---|---|
| `overviewMode` 상태 + fitScale 계산 | `OfficeView.tsx` | TODO |
| 캔버스 CSS scale 적용 + wrap overflow 전환 | `OfficeView.tsx` | TODO |
| 툴바 OVERVIEW 토글 버튼 | `OfficeView.tsx` | TODO |
| 층 클릭 시 overviewMode 자동 해제 | `OfficeView.tsx` | TODO |
| `OfficeMinimap.tsx` 컴포넌트 신규 | `office-view/OfficeMinimap.tsx` | TODO |
| 2D canvas 층별 색상 블록 렌더링 | `OfficeMinimap.tsx` | TODO |
| 뷰포트 인디케이터 (amber rect) | `OfficeMinimap.tsx` | TODO |
| 클릭/드래그 → 스크롤 연동 | `OfficeMinimap.tsx` | TODO |
| scroll 이벤트 → 인디케이터 실시간 업데이트 | `OfficeMinimap.tsx` | TODO |
| OfficeView에 OfficeMinimap 마운트 | `OfficeView.tsx` | TODO |
| 전체 보기 활성 시 미니맵 숨김 처리 | `OfficeView.tsx` | TODO |

---

## 미결 결정 사항

1. **WEB 팩** — 캔버스 새 렌더러가 필요한가, DEV 팩 기반 색조 변화로 충분한가?
2. **커스텀 팩** — 사용자가 만든 커스텀 팩은 어떤 캔버스/어휘를 사용할 것인가?
   → 선택지: 팩 생성 시 "베이스 아이덴티티" 선택 (`based_on: "dev" | "report" | ...`)
3. **태스크 카드 전환** — 기존 태스크를 보는 중 팩 전환 시 카드 형태가 바뀌면 혼란스럽지 않은가?
   → 검토 필요
