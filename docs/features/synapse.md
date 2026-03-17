# Synapse — 기획 문서

> 작성일: 2026-03-16
> 상태: 📋 기획 완료 (미구현)

---

## 1. 한 줄 정의

AgentDesk OS 안에서 **Notion, Obsidian, Google NotebookLM 세 가지 외부 지식 베이스를 연결하고,
에이전트가 문서를 읽고·쓰고·트리거받아** 동작할 수 있는 통합 지식 연결 시스템.

---

## 2. 핵심 원칙

| 원칙 | 내용 |
|------|------|
| **에이전트 first** | 지식 베이스는 에이전트의 컨텍스트 소스가 되거나, 산출물 저장소가 된다 |
| **단방향 → 양방향** | Phase 1은 읽기(컨텍스트 주입), Phase 2는 쓰기(산출물 내보내기), Phase 3은 트리거(문서 변경 → 태스크 생성) |
| **Zero-copy 원칙** | 원본 데이터를 AgentDesk DB에 복제하지 않는다. 필요 시 on-demand fetch 또는 경량 인덱스만 유지 |
| **커넥션 우선** | 복잡한 동기화보다 연결 설정과 검색·첨부를 먼저. 단순하게 시작한다 |
| **로컬 우선 (Obsidian)** | Obsidian은 파일시스템 직접 접근이 기본. 클라우드 없이도 동작 |

---

## 3. 지원 플랫폼

| 플랫폼 | 접근 방식 | 우선순위 | 읽기 | 쓰기 | 트리거 |
|--------|----------|---------|------|------|--------|
| **Notion** | OAuth 2.0 + Notion API | Phase 1 (필수) | ✅ | ✅ | ✅ (webhook) |
| **Obsidian** | 로컬 파일시스템 + REST API Plugin | Phase 1 (필수) | ✅ | ✅ | ✅ (파일 감시) |
| **Google NotebookLM** | 파일 업로드 (공식 API 없음) | Phase 2 | ✅ (단방향) | ❌ | ❌ |

> **NotebookLM 제약**: 공식 API가 없으므로 파일 업로드 → NotebookLM에서 요약 생성 → AgentDesk로 가져오기 방식만 지원.
> 실시간 연동이 아닌 "수동 내보내기 → 첨부" 워크플로우.

---

## 4. UI/UX 상세 명세

### 4-1. 진입점

| 진입 방법 | 경로 |
|----------|------|
| Dock → ⇄ Synapse 아이콘 | 메인 연결 관리 창 (독립 앱 창) |
| 태스크 생성 모달 → "지식 베이스 첨부..." | 태스크에 문서 컨텍스트 붙이기 |
| 에이전트 편집 모달 → "지식 소스" 섹션 | 에이전트 기본 지식 소스 설정 |
| 채팅 → `@notion`, `@obsidian` 멘션 | 채팅 중 문서 검색·첨부 |

---

### 4-2. Synapse 앱 창 전체 구조

Settings 탭 네비게이션은 기존 `SettingsTabNav.tsx`의 스타일 그대로 따른다.
탭 버튼: `borderRadius: "6px 6px 0 0"`, 활성 시 `borderBottom: "2px solid var(--th-accent)"`.

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙ Settings                                     🔴🟡🟢        │  ← macOS traffic lights
│  ─────────────────────────────────────────────────────────   │  ← AppWindow titlebar
│                                                              │
│  ⚙ GENERAL  $CLI  ⇄OAUTH  ⌁API  ⌘CHANNEL  ▦DATA         │  ← SettingsTabNav (Synapse 탭 제거됨)
│  ─────────────────────────────────────────────────────────   │     밑줄 탭, amber 활성
│                                                              │
│  // NOTION  // OBSIDIAN  // NOTEBOOKLM  // RULES            │  ← 서브탭 (동일 스타일)
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  (서브탭 콘텐츠)                                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**서브탭 스타일** — 메인 탭과 동일한 패턴:
```tsx
// 서브탭 버튼 (활성)
borderBottom: "2px solid var(--th-accent)"
color: "var(--th-accent)"
background: "var(--th-bg-surface)"
fontFamily: "var(--th-font-mono)"
fontSize: "10px"
fontWeight: 700
letterSpacing: "0.06em"
borderRadius: "6px 6px 0 0"
padding: "8px 14px"

// 서브탭 버튼 (비활성)
borderBottom: "2px solid transparent"
color: "var(--th-text-muted)"
background: "transparent"
```

---

### 4-3. [Notion] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│  Notion 연결                                                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📘 Notion                             🔴 미연결       │   │
│  │                                                       │   │
│  │  Notion 워크스페이스를 연결하면 에이전트가 페이지와      │   │
│  │  데이터베이스를 컨텍스트로 활용할 수 있습니다.          │   │
│  │                                                       │   │
│  │                    [Notion으로 연결]                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**연결 완료 후:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  // NOTION                       ● CONNECTED          │   │  ← 섹션 헤더: // 패턴, muted
│  │  workspace: AgentDesk Team                            │   │     배지: borderRadius 0, mono
│  │  user: admin@example.com                              │   │
│  │  [연결 해제]  [권한 재설정]                              │   │  ← ghost button, borderRadius: 0
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  // PAGES & DATABASES ──────────────────────────────────    │  ← 섹션 레이블: 10px, uppercase, muted
│                                                              │
│  $ [페이지 검색...]                            [↻ refresh]  │  ← $ 프롬프트 스타일 검색창
│                                                              │
│  ── 파일명                               권한               │  ← 컬럼 헤더: 8px, uppercase
│  📄 Project Alpha                        READ WRITE          │
│  📊 Sprint Board (DB)                    READ WRITE          │
│  📝 Meeting Notes                        READ               │
│  📁 Research Archive                     — (미선택)          │
│                                                              │
│  // EXPORT DEFAULTS ────────────────────────────────────    │
│                                                              │
│  task report  →  [선택 안함              ▾]                  │
│  deliverable  →  [선택 안함              ▾]                  │
│                                                              │
│  // CHANGE DETECTION ───────────────────────────────────    │
│                                                              │
│  ● polling  (30s interval · no extra setup)                 │  ← mono, lowercase
│  ○ webhook  (requires public URL · ngrok/tunnel)            │
│                                                              │
│  webhook URL  http://localhost:8790/api/webhooks/notion      │
│               [copy]   ! local env: tunnel required         │
└──────────────────────────────────────────────────────────────┘
```

---

### 4-4. [Obsidian] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│  Obsidian 연결                                                 │
│                                                              │
│  연결 방식 선택:                                               │
│  ● 로컬 파일시스템 (권장)                                      │
│  ○ Obsidian REST API Plugin (네트워크)                        │
│                                                              │
│  ── 로컬 파일시스템 ──────────────────────────────────────   │
│                                                              │
│  Vault 경로                                                   │
│  [C:\Users\edger\Documents\MyVault        ] [찾아보기]        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📁 MyVault                            🟢 감지됨       │   │
│  │  943개 노트 · 마지막 수정: 2분 전                        │   │
│  │  [연결]                                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ── 연결 완료 후 ───────────────────────────────────────    │
│                                                              │
│  🔍 [노트 검색...]                             [새로고침 ↻]  │
│                                                              │
│  인덱싱된 폴더:                                               │
│  ✅ /Projects  ✅ /Research  ⭕ /Daily Notes  ⭕ /Archive     │
│                                                              │
│  파일 감시 (변경 → 태스크 트리거):  [ON]                       │
│  감시 폴더: [/Projects               ]                        │
│  감시 패턴: [*.md                    ]  (glob)               │
│                                                              │
│  내보내기 기본 폴더: [/AgentDesk-Output  ]                    │
└──────────────────────────────────────────────────────────────┘
```

**REST API Plugin 방식:**

```
┌──────────────────────────────────────────────────────────────┐
│  ── Obsidian REST API Plugin ──────────────────────────────  │
│                                                              │
│  설치 방법:                                                    │
│  Obsidian → 설정 → 커뮤니티 플러그인 → "Local REST API" 검색  │
│                                                              │
│  플러그인 URL:  http://localhost:27123                        │
│  API Key:      [••••••••••••••••] [표시] [재생성]             │
│                                                              │
│  연결 테스트:  ⚫ 미확인  [테스트]                             │
└──────────────────────────────────────────────────────────────┘
```

---

### 4-5. [NotebookLM] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  // NOTICE                                            │   │  ← 경고 카드: --th-warning-bg
│  │  no official api — snapshot import only               │   │     10px, muted, mono
│  │  NotebookLM 분석 결과를 내보내어 에이전트 컨텍스트로  │   │
│  │  사용합니다. 실시간 동기화는 지원하지 않습니다.         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  // IMPORT GUIDE ───────────────────────────────────────    │
│                                                              │
│  $ step 1  NotebookLM → "공유 및 내보내기" → 복사            │  ← $ 프롬프트 스타일 가이드
│  $ step 2  아래에 붙여넣기 또는 파일 업로드                   │
│                                                              │
│  // PASTE TEXT ─────────────────────────────────────────    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  > paste notebooklm export here...                   │   │  ← terminal-style textarea
│  │                                                      │   │     --th-terminal-bg
│  │                                                      │   │     --th-terminal-text
│  └──────────────────────────────────────────────────────┘   │
│  [$ save & index]                                            │  ← 버튼: $ 프리픽스, borderRadius: 0
│                                                              │
│  // UPLOAD FILE ────────────────────────────────────────    │
│  [+ .md .txt .pdf 선택]                                      │  ← borderRadius: 0
│                                                              │
│  // SNAPSHOTS ──────────────────────────────────────────    │
│                                                              │
│  파일명                          날짜          액션           │  ← 컬럼 헤더: 8px, uppercase
│  Research Summary v2             2026-03-15    [attach] [rm] │
│  Market Analysis                 2026-03-10    [attach] [rm] │
└──────────────────────────────────────────────────────────────┘
```

---

### 4-6. [자동화 규칙] 서브탭

```
┌──────────────────────────────────────────────────────────────┐
│  자동화 규칙  (문서 변경 → 에이전트 액션)                       │
│                                                              │
│  [+ 새 규칙 추가]                                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  규칙 1                                    ● 활성     │   │
│  │                                                       │   │
│  │  트리거: Notion DB "Sprint Board"           → 새 행 추가 │  │
│  │  조건:   Status = "To Do"                             │   │
│  │  액션:   태스크 생성 → 에이전트 "Dev-1" 할당           │   │
│  │                                                       │   │
│  │  [편집]  [복제]  [삭제]                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  규칙 2                                    ● 활성     │   │
│  │                                                       │   │
│  │  트리거: Obsidian /Projects/*.md             → 파일 변경 │  │
│  │  조건:   파일명에 "REVIEW" 포함                        │   │
│  │  액션:   채팅 메시지 → "Review-Bot" 에이전트           │   │
│  │                                                       │   │
│  │  [편집]  [복제]  [삭제]                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**규칙 편집 모달:**

```
┌─ 자동화 규칙 편집 ────────────── 🔴🟡🟢 ┐
│                                         │
│  이름  [Sprint Board → Task 생성        ] │
│                                         │
│  트리거 소스  [Notion          ▾]        │
│  이벤트       [새 행 추가       ▾]        │
│  대상         [Sprint Board (DB) ▾]      │
│                                         │
│  조건 (선택)                             │
│  [필드 ▾] [Status       ] [= ▾] [To Do ]│
│  [+ 조건 추가]                           │
│                                         │
│  액션                                    │
│  [태스크 생성              ▾]            │
│  할당 에이전트  [Dev-1     ▾]            │
│  태스크 제목    [{row.Name}              ] │
│  우선순위       [Normal    ▾]            │
│                                         │
│               [취소]  [저장]             │
└─────────────────────────────────────────┘
```

---

### 4-7. 채팅 @멘션 검색

채팅 입력창에서 `@notion` 또는 `@obsidian` 입력 시 인라인 검색 드롭다운:

```
┌──────────────────────────────────────┐
│  @notion  "sprint"                   │
│  ─────────────────────────────────   │
│  📊 Sprint Board (DB)                │
│  📄 Sprint Retrospective 2026-03-10  │
│  📄 Sprint Planning Notes            │
│  ─────────────────────────────────   │
│  더 보기... (12개)                    │
└──────────────────────────────────────┘
```

선택 시 채팅 메시지에 문서 링크 배지로 첨부:

```
[📘 Sprint Board] [📄 Sprint Retro] 이 내용을 바탕으로 분석해줘
```

에이전트는 배지된 문서를 컨텍스트로 전달받아 응답을 생성한다.

---

### 4-8. 태스크 생성 모달 — 지식 베이스 첨부

기존 태스크 생성 모달에 "컨텍스트 소스" 섹션 추가:

```
── 컨텍스트 소스 (선택) ──────────────────────────────────

[📘 Notion 검색...]  [📓 Obsidian 검색...]  [📋 NotebookLM 스냅샷...]

첨부된 소스:
┌──────────────────────────────────────────────────────┐
│ 📘 Sprint Board · "Alpha 기능 정의" 행     [×]        │
│ 📓 /Projects/alpha-spec.md               [×]        │
└──────────────────────────────────────────────────────┘
```

---

### 4-9. 에이전트 편집 모달 — 기본 지식 소스

```
── 지식 소스 (기본 컨텍스트) ──────────────────────────

이 에이전트가 항상 참조하는 문서 목록입니다.

[+ 소스 추가]

📘 Notion: Product Spec DB (읽기 전용)        [편집] [제거]
📓 Obsidian: /Projects/alpha/               [편집] [제거]
```

---

## 5. 디자인 시스템 명세

> AgentDesk의 **dual-layer 원칙**, **JetBrains Mono 전용 폰트**, **Amber 브랜드 컬러**,
> **터미널 언어**를 Synapse 전체에 일관되게 적용한다.
> 참조: `docs/design/DESIGN.md`, `docs/design/UI-SCREENS.md`

---

### 5-1. 색상 — CSS 변수 매핑

모든 색상은 인라인 hex 금지. 아래 변수만 사용.

| 용도 | 변수 |
|------|------|
| 탭 콘텐츠 배경 | `var(--th-bg-primary)` |
| 커넥션 카드 배경 | `var(--th-card-bg)` |
| 커넥션 카드 hover | `var(--th-card-bg-hover)` |
| 활성 연결 보더 | `var(--th-accent-border)` |
| 활성 연결 배경 tint | `var(--th-accent-glow)` |
| 오류/미연결 보더 | `var(--th-danger-border)` |
| 텍스트 입력 | `var(--th-input-bg)` / `var(--th-input-border)` |
| 안내문 경고 배경 | `var(--th-warning-bg)` |
| 규칙 카드 배경 | `var(--th-bg-surface)` |

#### 플랫폼 색상 (브랜드 컬러 적용 예외 허용)

```
Notion    →  #ffffff / #000000 (로고용만, 아이콘 한정)
Obsidian  →  #7c3aed (로고용만, 아이콘 한정)
```

텍스트, 카드 보더, 배경은 예외 없이 `--th-*` 변수 사용.

---

### 5-2. 연결 상태 배지

모든 배지: `borderRadius: 0`, `font-mono`, `10px`, `uppercase`, `font-weight: 700`

```
연결됨   →  background: var(--th-green-glow)
            border: 1px solid #3fb950
            color: #3fb950
            text: "CONNECTED"

미연결   →  background: var(--th-hover-bg)
            border: 1px solid var(--th-border)
            color: var(--th-text-muted)
            text: "DISCONNECTED"

오류     →  background: var(--th-danger-bg)
            border: 1px solid var(--th-danger-border)
            color: var(--th-danger-text)
            text: "ERROR"

동기화 중 → background: rgba(88,166,255,0.08)
             border: 1px solid rgba(88,166,255,0.35)
             color: var(--th-terminal-info)
             text: "SYNCING"
```

---

### 5-3. macOS Hybrid 핵심 패턴

AgentDesk의 "macOS Hybrid" 스타일은 **macOS 윈도우 크롬 + 터미널 언어 컨텐츠**의 조합이다.
Synapse 창 전체에서 아래 세 가지 패턴을 일관되게 사용한다.

#### // 섹션 레이블 패턴

```tsx
// 모든 섹션 헤더는 이 패턴 사용. "SECTION TITLE:" 금지.
<span style={{
  fontFamily: "var(--th-font-mono)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--th-text-muted)",
}}>
  // NOTION
</span>
```

#### $ 프롬프트 스타일 입력창

```tsx
// 검색창, 경로 입력 등에 $ 프리픽스
<div style={{ display: "flex", alignItems: "center", gap: 6,
  border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
  <span style={{ color: "var(--th-accent)", fontFamily: mono }}>$</span>
  <input placeholder="search pages..." style={{ background: "transparent", ... }} />
</div>
```

#### 터미널 스타일 텍스트에어리어 (NotebookLM)

```tsx
// > 프롬프트 스타일 텍스트에어리어
<textarea
  placeholder="> paste notebooklm export here..."
  style={{
    fontFamily: "var(--th-font-mono)",
    fontSize: 11,
    background: "var(--th-terminal-bg)",
    color: "var(--th-terminal-text)",
    border: "1px solid var(--th-border)",
    borderRadius: 0,           // 터미널 영역은 항상 0
    padding: "10px 14px",
    resize: "vertical",
  }}
/>
```

---

### 5-4. 커넥션 카드 디자인

```
┌────────────────────────────────────────────────────┐  ← borderRadius: 10
│                                                    │     border: 1px solid
│  // NOTION                      ● CONNECTED        │     (연결됨: --th-accent-border)
│                                                    │
│  workspace: AgentDesk Team                         │  ← 11px, --th-text-secondary
│  user: admin@example.com                           │
│                                                    │
│  [연결 해제]  [권한 재설정]                          │  ← Button ghost, borderRadius: 0
│                                                    │
└────────────────────────────────────────────────────┘
```

---

### 5-5. 문서 검색 결과 행

```tsx
// 검색 결과 행
border-bottom: 1px solid var(--th-border)
hover: background var(--th-hover-bg)
padding: 8px 12px
cursor: pointer

// 아이콘 + 제목
font-family: var(--th-font-mono)
font-size: 12px
color: var(--th-text-primary)

// 경로 / 플랫폼
font-family: var(--th-font-mono)
font-size: 10px
color: var(--th-text-muted)
```

---

### 5-6. 첨부 문서 배지

채팅 및 태스크 생성 모달에서 첨부된 문서 표시:

```
background: var(--th-accent-glow)
border: 1px solid var(--th-accent-border)
color: var(--th-text-accent)
borderRadius: 0
font-family: var(--th-font-mono)
font-size: 10px
font-weight: 700
padding: 2px 7px
display: inline-flex
gap: 4px
```

---

### 5-7. 자동화 규칙 카드

```
┌────────────────────────────────────────────────────┐  ← borderRadius: 10
│                                                    │     border: 1px solid var(--th-border)
│  // RULE — Sprint Board → Task                     │  ← 10px label
│                                          ● 활성    │     dot #3fb950 / #888888
│                                                    │
│  트리거  📊 Notion · Sprint Board · 새 행          │  ← 11px, --th-text-secondary
│  조건    Status = "To Do"                          │
│  액션    태스크 생성 → Dev-1                        │  ← --th-text-accent for agent
│                                                    │
│  [편집]  [복제]  [삭제]                             │  ← Button ghost
└────────────────────────────────────────────────────┘
```

---

## 6. REST API 명세

### Notion 연결

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/connections/notion/status` | 연결 상태 + 워크스페이스 정보 |
| `GET` | `/api/connections/notion/oauth/start` | OAuth 2.0 플로우 시작 (redirect URL 반환) |
| `GET` | `/api/connections/notion/oauth/callback` | OAuth 콜백 처리 + 토큰 저장 |
| `DELETE` | `/api/connections/notion/disconnect` | 연결 해제 + 토큰 삭제 |
| `GET` | `/api/connections/notion/pages` | 접근 허용된 페이지·DB 목록 |
| `GET` | `/api/connections/notion/search` | 페이지·DB 검색 (`?q=&type=page\|database`) |
| `GET` | `/api/connections/notion/pages/:pageId` | 단일 페이지 컨텐츠 가져오기 (Markdown 변환) |
| `POST` | `/api/connections/notion/pages` | 새 페이지 생성 |
| `PATCH` | `/api/connections/notion/pages/:pageId` | 페이지 컨텐츠 업데이트 |
| `GET` | `/api/connections/notion/databases/:dbId/rows` | DB 레코드 목록 |
| `POST` | `/api/connections/notion/databases/:dbId/rows` | DB 새 레코드 추가 |

**`GET /api/connections/notion/status` 응답:**
```json
{
  "connected": true,
  "workspace": {
    "id": "ws-abc123",
    "name": "AgentDesk Team",
    "icon_url": "https://..."
  },
  "user": {
    "name": "Admin",
    "email": "admin@example.com"
  },
  "connected_at": 1741234567890,
  "page_count": 24
}
```

**`GET /api/connections/notion/search` 응답:**
```json
{
  "results": [
    {
      "id": "page-abc123",
      "type": "page",
      "title": "Sprint Retrospective 2026-03-10",
      "url": "https://notion.so/...",
      "last_edited_time": "2026-03-10T14:30:00Z",
      "parent_title": "Projects"
    },
    {
      "id": "db-xyz789",
      "type": "database",
      "title": "Sprint Board",
      "url": "https://notion.so/...",
      "last_edited_time": "2026-03-15T09:00:00Z",
      "row_count": 42
    }
  ],
  "has_more": true,
  "next_cursor": "cursor-token"
}
```

---

### Obsidian 연결

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/connections/obsidian/status` | Vault 연결 상태 |
| `POST` | `/api/connections/obsidian/connect` | Vault 경로 등록 + 인덱싱 시작 |
| `DELETE` | `/api/connections/obsidian/disconnect` | 연결 해제 |
| `GET` | `/api/connections/obsidian/notes` | 인덱싱된 노트 목록 (`?folder=&limit=`) |
| `GET` | `/api/connections/obsidian/search` | 노트 전문 검색 (`?q=`) |
| `GET` | `/api/connections/obsidian/notes/*path` | 단일 노트 내용 가져오기 |
| `POST` | `/api/connections/obsidian/notes` | 새 노트 생성 |
| `PUT` | `/api/connections/obsidian/notes/*path` | 노트 내용 덮어쓰기 |
| `PATCH` | `/api/connections/obsidian/notes/*path/append` | 노트 하단에 내용 추가 |
| `GET` | `/api/connections/obsidian/watch/status` | 파일 감시 상태 |
| `POST` | `/api/connections/obsidian/watch/start` | 파일 감시 시작 |
| `POST` | `/api/connections/obsidian/watch/stop` | 파일 감시 중지 |

**`POST /api/connections/obsidian/connect` 요청:**
```json
{
  "vault_path": "C:\\Users\\edger\\Documents\\MyVault",
  "indexed_folders": ["/Projects", "/Research"],
  "watch_folders": ["/Projects"],
  "watch_pattern": "*.md"
}
```

**`GET /api/connections/obsidian/search` 응답:**
```json
{
  "results": [
    {
      "path": "/Projects/alpha-spec.md",
      "title": "Alpha Feature Spec",
      "excerpt": "...에이전트가 태스크를 수신하면...",
      "modified_at": 1741234567890,
      "tags": ["project", "spec", "alpha"],
      "word_count": 842
    }
  ],
  "total": 7
}
```

---

### NotebookLM 스냅샷

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/connections/notebooklm/snapshots` | 저장된 스냅샷 목록 |
| `POST` | `/api/connections/notebooklm/snapshots` | 텍스트 붙여넣기로 스냅샷 저장 |
| `POST` | `/api/connections/notebooklm/snapshots/upload` | 파일 업로드로 스냅샷 저장 |
| `GET` | `/api/connections/notebooklm/snapshots/:id` | 단일 스냅샷 내용 |
| `DELETE` | `/api/connections/notebooklm/snapshots/:id` | 스냅샷 삭제 |

---

### 자동화 규칙

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/connections/rules` | 자동화 규칙 목록 |
| `POST` | `/api/connections/rules` | 규칙 생성 |
| `PATCH` | `/api/connections/rules/:id` | 규칙 수정 |
| `DELETE` | `/api/connections/rules/:id` | 규칙 삭제 |
| `POST` | `/api/connections/rules/:id/toggle` | 활성/비활성 토글 |

**`POST /api/connections/rules` 요청:**
```json
{
  "name": "Sprint Board → Task 생성",
  "trigger": {
    "source": "notion",
    "event": "database_row_added",
    "target_id": "db-xyz789"
  },
  "conditions": [
    { "field": "Status", "operator": "eq", "value": "To Do" }
  ],
  "action": {
    "type": "create_task",
    "agent_id": "agent-dev1",
    "title_template": "{row.Name}",
    "priority": "normal"
  }
}
```

---

### 컨텍스트 첨부 (태스크·채팅 공통)

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/connections/context/fetch` | 문서 내용 가져오기 (컨텍스트 주입용) |

**`POST /api/connections/context/fetch` 요청:**
```json
{
  "sources": [
    { "type": "notion_page", "id": "page-abc123" },
    { "type": "obsidian_note", "path": "/Projects/alpha-spec.md" },
    { "type": "notebooklm_snapshot", "id": "snap-001" }
  ],
  "format": "markdown",
  "max_chars_per_source": 8000
}
```

**응답:**
```json
{
  "contexts": [
    {
      "source_type": "notion_page",
      "source_id": "page-abc123",
      "title": "Sprint Retrospective",
      "content": "# Sprint Retrospective\n...",
      "char_count": 3200,
      "truncated": false
    }
  ],
  "total_chars": 9400
}
```

---

### Webhook (Notion → AgentDesk)

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/webhooks/notion` | Notion webhook 수신 엔드포인트 |
| `GET` | `/api/connections/notion/poll` | Polling 방식으로 DB 변경 감지 (webhook 대안) |

> **⚠️ Localhost 제약**: Notion webhook은 공개적으로 접근 가능한 HTTPS URL이 필요합니다.
> 로컬 개발 환경(localhost)에서는 webhook 수신이 불가능하므로 아래 두 가지 대안을 제공합니다.
>
> - **대안 A — Polling**: 30초 주기로 Notion API를 폴링하여 `last_edited_time` 변경 감지 (기본값, 추가 설정 불필요)
> - **대안 B — Tunnel**: ngrok / cloudflare tunnel 등으로 localhost를 공개 URL로 노출 후 webhook URL 수동 등록

**처리 흐름 (Webhook 방식):**
```
Notion → POST /api/webhooks/notion
  ↓
서명 검증 (X-Notion-Signature)
  ↓
이벤트 파싱 (database_row_added / page_updated 등)
  ↓
자동화 규칙 매칭
  ↓
액션 실행 (create_task / send_chat / update_agent_context)
```

**처리 흐름 (Polling 방식 — 기본):**
```
30초 타이머
  ↓
GET /v1/databases/:id/query (filter: last_edited_time > lastPollTime)
  ↓
변경된 행 감지
  ↓
자동화 규칙 매칭
  ↓
액션 실행
```

---

## 7. DB 스키마

### 신규 테이블: `synapse_connections`

```sql
CREATE TABLE synapse_connections (
  id           TEXT PRIMARY KEY,          -- UUID
  platform     TEXT NOT NULL,             -- "notion" | "obsidian" | "notebooklm"
  name         TEXT,                      -- 사용자 지정 이름 (예: "My Team Notion")
  status       TEXT NOT NULL DEFAULT 'disconnected',  -- "connected" | "disconnected" | "error"
  config       TEXT NOT NULL DEFAULT '{}', -- JSON: 플랫폼별 설정 (vault_path, workspace_id 등)
  auth_data    TEXT,                      -- JSON (암호화): access_token, refresh_token 등
  last_sync_at INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
```

### 신규 테이블: `kb_indexed_documents`

경량 인덱스 — 원본 내용은 저장하지 않고 메타데이터만 보관.

```sql
CREATE TABLE kb_indexed_documents (
  id              TEXT PRIMARY KEY,          -- UUID
  connection_id   TEXT NOT NULL REFERENCES synapse_connections(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,             -- Notion page ID / Obsidian path / snapshot ID
  title           TEXT NOT NULL,
  doc_type        TEXT NOT NULL,             -- "page" | "database" | "note" | "snapshot"
  path_or_url     TEXT,
  tags            TEXT DEFAULT '[]',         -- JSON 배열
  word_count      INTEGER,
  last_modified   INTEGER,
  indexed_at      INTEGER NOT NULL,
  UNIQUE(connection_id, external_id)
);

CREATE INDEX idx_kb_docs_connection ON kb_indexed_documents(connection_id, last_modified DESC);
CREATE VIRTUAL TABLE kb_documents_fts USING fts5(
  id UNINDEXED, title, tags, content='kb_indexed_documents', content_rowid='rowid'
);
```

### 신규 테이블: `kb_automation_rules`

```sql
CREATE TABLE kb_automation_rules (
  id           TEXT PRIMARY KEY,          -- UUID
  name         TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,
  trigger_json TEXT NOT NULL,             -- JSON: source, event, target_id
  conditions   TEXT NOT NULL DEFAULT '[]', -- JSON 배열
  action_json  TEXT NOT NULL,             -- JSON: type, agent_id, template 등
  last_fired_at INTEGER,
  fire_count   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
```

### 신규 테이블: `notebooklm_snapshots`

```sql
CREATE TABLE notebooklm_snapshots (
  id           TEXT PRIMARY KEY,          -- UUID
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,             -- Markdown 전문
  source_file  TEXT,                      -- 업로드된 파일명 (선택)
  char_count   INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
```

### 기존 테이블 변경: `tasks`

```sql
-- 마이그레이션으로 추가
ALTER TABLE tasks ADD COLUMN kb_context_sources TEXT DEFAULT '[]';
-- JSON 배열: [{ "type": "notion_page", "id": "..." }, ...]
```

### 기존 테이블 변경: `agents`

```sql
-- 기본 지식 소스 (에이전트 항상 참조)
ALTER TABLE agents ADD COLUMN kb_default_sources TEXT DEFAULT '[]';
-- JSON 배열: [{ "type": "obsidian_note", "path": "/Projects/spec.md" }, ...]
```

---

## 8. 서버 아키텍처

### 파일 구조

```
server/
├── modules/
│   ├── routes/
│   │   └── ops/
│   │       ├── connections.ts          ← /api/connections/* REST 라우트
│   │       └── webhooks.ts             ← /api/webhooks/* 수신 라우트
│   └── connections/
│       ├── connection-manager.ts       ← 연결 상태 관리, auth 토큰 CRUD
│       ├── notion/
│       │   ├── notion-client.ts        ← Notion API 래퍼 (pages, DBs, search)
│       │   ├── notion-oauth.ts         ← OAuth 2.0 플로우 (PKCE)
│       │   └── notion-webhook.ts       ← Webhook 검증 + 이벤트 파싱
│       ├── obsidian/
│       │   ├── obsidian-fs.ts          ← 파일시스템 직접 접근 (read/write/search)
│       │   ├── obsidian-rest.ts        ← REST API Plugin 클라이언트 (대안)
│       │   └── obsidian-watcher.ts     ← chokidar 기반 파일 감시
│       ├── notebooklm/
│       │   └── notebooklm-snapshots.ts ← 스냅샷 저장/조회 (파일 파싱)
│       ├── indexer.ts                  ← 문서 메타데이터 인덱싱 (FTS 업데이트)
│       ├── context-fetcher.ts          ← 여러 소스에서 Markdown 컨텍스트 조합
│       └── rule-engine.ts              ← 자동화 규칙 평가 + 액션 실행
```

---

### `notion-oauth.ts` — OAuth Authorization Code 플로우

```typescript
// Notion OAuth는 PKCE를 지원하지 않음 → 서버사이드 Authorization Code Flow 사용
// Notion OAuth App 등록 필요: https://www.notion.so/my-integrations
// 환경변수: NOTION_CLIENT_ID, NOTION_CLIENT_SECRET

async function startOAuthFlow(): Promise<{ authUrl: string; state: string }> {
  const state = crypto.randomUUID();

  // state를 임시 DB에 저장 (5분 TTL, CSRF 방지)
  await storeOAuthState(state);

  const params = new URLSearchParams({
    client_id: NOTION_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://localhost:8790/api/connections/notion/oauth/callback',
    state,
    owner: 'user',
  });

  return { authUrl: `https://api.notion.com/v1/oauth/authorize?${params}`, state };
}

async function handleOAuthCallback(code: string, state: string): Promise<void> {
  await verifyAndDeleteOAuthState(state);  // state 검증 + 삭제

  // client_secret을 Basic Auth로 전달 (Notion OAuth 표준 방식)
  const tokens = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:8790/api/connections/notion/oauth/callback',
    }),
  }).then(r => r.json());

  await saveConnectionAuth('notion', tokens);  // auth_data 암호화 저장
}
```

---

### `obsidian-fs.ts` — 파일시스템 직접 접근

```typescript
// Vault 경로에서 노트 검색 (gray-matter로 frontmatter 파싱)
async function searchNotes(vaultPath: string, query: string): Promise<NoteSearchResult[]> {
  // FTS 인덱스 먼저 조회 → 없으면 ripgrep 폴백
}

// 노트 읽기 (Markdown 반환)
async function readNote(vaultPath: string, notePath: string): Promise<string> {
  const fullPath = path.join(vaultPath, notePath);
  return fs.readFile(fullPath, 'utf-8');
}

// 에이전트 산출물을 Obsidian 노트로 내보내기
async function writeNote(vaultPath: string, notePath: string, content: string): Promise<void> {
  const fullPath = path.join(vaultPath, notePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
}
```

---

### `obsidian-watcher.ts` — 파일 감시

```typescript
import chokidar from 'chokidar';

// 파일 변경 감지 → WebSocket 브로드캐스트 + 자동화 규칙 트리거
function startWatcher(vaultPath: string, folders: string[], pattern: string): FSWatcher {
  const watchPaths = folders.map(f => path.join(vaultPath, f, pattern));
  const watcher = chokidar.watch(watchPaths, { persistent: true, ignoreInitial: true });

  watcher.on('add',    (filePath) => handleFileEvent('created', filePath));
  watcher.on('change', (filePath) => handleFileEvent('modified', filePath));
  watcher.on('unlink', (filePath) => handleFileEvent('deleted', filePath));

  return watcher;
}

async function handleFileEvent(event: FileEvent, filePath: string) {
  hub.broadcast('kb_obsidian_change', { event, path: filePath, timestamp: Date.now() });
  await ruleEngine.evaluate({ source: 'obsidian', event, filePath });
}
```

---

### `context-fetcher.ts` — 컨텍스트 조합

```typescript
// 여러 소스에서 내용을 가져와 단일 컨텍스트 문자열로 조합
async function fetchContext(
  sources: ContextSource[],
  maxCharsPerSource = 8000
): Promise<ContextResult[]> {
  return Promise.all(sources.map(async (src) => {
    switch (src.type) {
      case 'notion_page':
        return fetchNotionPage(src.id, maxCharsPerSource);
      case 'obsidian_note':
        return fetchObsidianNote(src.path, maxCharsPerSource);
      case 'notebooklm_snapshot':
        return fetchSnapshot(src.id, maxCharsPerSource);
    }
  }));
}

// 에이전트 태스크 실행 시 컨텍스트 주입 방식
// workflow/core.ts에서 태스크 시작 전 호출:
//   const ctx = await fetchContext(task.kb_context_sources);
//   const systemPrompt = buildSystemPrompt(agent, ctx);
```

---

### `rule-engine.ts` — 자동화 규칙 평가

```typescript
// Notion webhook 또는 Obsidian 파일 이벤트 발생 시 실행
async function evaluate(event: KbEvent): Promise<void> {
  const rules = await getEnabledRules();

  for (const rule of rules) {
    if (!matchesTrigger(rule.trigger, event)) continue;
    if (!evaluateConditions(rule.conditions, event.data)) continue;

    await executeAction(rule.action, event.data);
    await updateRuleFireStats(rule.id);
  }
}

async function executeAction(action: RuleAction, data: Record<string, unknown>): Promise<void> {
  switch (action.type) {
    case 'create_task':
      await createTask({
        title: interpolateTemplate(action.title_template, data),
        agent_id: action.agent_id,
        priority: action.priority,
        kb_context_sources: action.attach_source ? [buildSourceRef(data)] : [],
      });
      break;
    case 'send_chat':
      await sendChatMessage(action.agent_id, interpolateTemplate(action.message_template, data));
      break;
    case 'update_agent_context':
      await updateAgentDefaultSources(action.agent_id, action.source);
      break;
  }
}
```

---

## 9. 프론트엔드 컴포넌트 구조

```
src/components/
└── connections/
    ├── ConnectionsSettingsTab.tsx        ← Settings 탭 루트 (4개 서브탭)
    ├── NotionPanel.tsx                   ← [Notion] 서브탭
    │   ├── NotionConnectCard.tsx         ← OAuth 연결 카드
    │   ├── NotionPageList.tsx            ← 접근 허용 페이지 목록
    │   └── NotionWebhookConfig.tsx       ← Webhook 활성화/URL 복사
    ├── ObsidianPanel.tsx                 ← [Obsidian] 서브탭
    │   ├── ObsidianConnectCard.tsx       ← Vault 경로 설정
    │   ├── ObsidianFolderPicker.tsx      ← 인덱싱 폴더 선택
    │   └── ObsidianWatchConfig.tsx       ← 파일 감시 설정
    ├── NotebookLMPanel.tsx               ← [NotebookLM] 서브탭
    │   ├── SnapshotPasteForm.tsx         ← 텍스트 붙여넣기 폼
    │   └── SnapshotList.tsx              ← 저장된 스냅샷 목록
    ├── AutomationRulesPanel.tsx          ← [자동화 규칙] 서브탭
    │   ├── RuleCard.tsx                  ← 개별 규칙 카드
    │   └── RuleEditModal.tsx             ← 규칙 생성/편집 모달
    ├── shared/
    │   ├── KbDocumentSearch.tsx          ← 공통 문서 검색 드롭다운
    │   ├── KbSourceBadge.tsx             ← 첨부 문서 배지
    │   └── ConnectionStatusBadge.tsx     ← 연결 상태 배지
    └── hooks/
        ├── useNotionSearch.ts            ← Notion 문서 검색 훅
        └── useObsidianSearch.ts          ← Obsidian 노트 검색 훅
```

---

## 10. Settings 탭 연결 방법 (기존 파일 수정 목록)

Synapse는 Settings 탭에서 제거되어 Dock 전용 앱 창으로 운영된다. (SynapseWindow.tsx)

---

### 10-1. `src/components/settings/types.ts`

`SettingsTab` 유니언에 `"connections"` 추가:

```typescript
// 변경 전
export type SettingsTab = "general" | "cli" | "oauth" | "api" | "gateway" | "data" | "webhooks";

// 변경 후
export type SettingsTab = "general" | "cli" | "oauth" | "api" | "gateway" | "connections" | "data" | "webhooks";
```

---

### 10-2. `src/components/settings/SettingsTabNav.tsx`

`TAB_ITEMS` 배열에 항목 추가 (`"data"` 앞에 삽입):

```typescript
// 기존 TAB_ITEMS에 추가
{ key: "connections", label: (t) => t({ ko: "연결", en: "CONN", ja: "接続", zh: "连接" }), sigil: "◈" },
```

삽입 위치:
```typescript
const TAB_ITEMS = [
  { key: "general",     ... },
  { key: "cli",         ... },
  { key: "oauth",       ... },
  { key: "api",         ... },
  { key: "gateway",     ... },
  { key: "connections", label: (t) => t({ ko: "연결", en: "CONN", ja: "接続", zh: "连接" }), sigil: "◈" },  // ← 추가
  { key: "data",        ... },
];
```

---

### 10-3. `src/components/SettingsPanel.tsx`

상단 import에 추가:
```typescript
import ConnectionsSettingsTab from "./connections/ConnectionsSettingsTab";
```

탭 렌더링 블록에 추가 (`{tab === "data" ...}` 바로 위):
```tsx
{tab === "connections" && <ConnectionsSettingsTab t={t} />}

{tab === "data" && <DataSettingsTab t={t} />}
```

---

### 10-4. `src/components/connections/ConnectionsSettingsTab.tsx` (신규)

루트 컴포넌트. `TFunction`만 prop으로 받으며, 내부에서 서브탭 상태를 관리한다.

```typescript
import type { TFunction } from "../settings/types";

type ConnectionsSubTab = "notion" | "obsidian" | "notebooklm" | "rules";

interface ConnectionsSettingsTabProps {
  t: TFunction;
}

export default function ConnectionsSettingsTab({ t }: ConnectionsSettingsTabProps) {
  const [subTab, setSubTab] = useState<ConnectionsSubTab>("notion");
  // ...
}
```

**서브탭 nav 렌더링** — `SettingsTabNav`와 동일한 스타일을 인라인으로 구현:
```tsx
const SUB_TABS: Array<{ key: ConnectionsSubTab; label: string; sigil: string }> = [
  { key: "notion",      label: "NOTION",      sigil: "N" },
  { key: "obsidian",    label: "OBSIDIAN",    sigil: "◎" },
  { key: "notebooklm",  label: "NOTEBOOKLM",  sigil: "G" },
  { key: "rules",       label: "RULES",       sigil: "▶" },
];

// 서브탭 버튼 스타일 (SettingsTabNav 동일)
{
  fontFamily: "var(--th-font-mono)",
  fontSize: "10px",
  fontWeight: isActive ? 700 : 400,
  letterSpacing: "0.06em",
  padding: "8px 14px",
  background: isActive ? "var(--th-bg-surface)" : "transparent",
  color: isActive ? "var(--th-accent)" : "var(--th-text-muted)",
  border: "none",
  borderBottom: isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
  borderRadius: "6px 6px 0 0",
  cursor: "pointer",
}
```

---

## 11. WebSocket 이벤트

기존 `hub.ts`에 추가:

| 이벤트 | payload | 설명 |
|--------|---------|------|
| `kb_connection_status` | `{ platform, status, workspace? }` | 연결 상태 변경 |
| `kb_obsidian_change` | `{ event, path, timestamp }` | Obsidian 파일 변경 감지 |
| `kb_rule_fired` | `{ rule_id, rule_name, action_type, triggered_at }` | 자동화 규칙 실행 |
| `kb_index_progress` | `{ platform, indexed, total, status }` | 인덱싱 진행 상황 |
| `kb_notion_webhook` | `{ event_type, page_id, database_id? }` | Notion webhook 수신 |

---

## 12. 보안 고려사항

### OAuth 토큰 저장

```
- auth_data 컬럼: AES-256-GCM으로 암호화 후 저장
- 암호화 키: 환경변수 `AGENTDESK_SECRET_KEY` (없으면 기기 고유값으로 파생)
- 메모리 캐시: 15분 TTL, 서버 재시작 시 초기화
- refresh_token 자동 갱신: 액세스 토큰 만료 5분 전 갱신 시도
```

### Webhook 검증

```typescript
// Notion webhook 서명 검증
function verifyNotionWebhook(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### 파일시스템 접근 범위 제한

```typescript
// Vault 경로를 벗어나는 접근 차단 (path traversal 방지)
function sanitizeNotePath(vaultPath: string, notePath: string): string {
  const resolved = path.resolve(vaultPath, notePath);
  if (!resolved.startsWith(path.resolve(vaultPath))) {
    throw new Error('Path traversal attempt blocked');
  }
  return resolved;
}
```

---

## 13. 구현 단계 (Phase 계획)

### Phase 1 — 핵심 연결 (1주)
**목표: Notion OAuth + Obsidian 파일시스템 연결 + 기본 컨텍스트 첨부**

| 작업 | 파일 | 내용 |
|------|------|------|
| DB 마이그레이션 | `versioned-migrations.ts` | 4개 신규 테이블 + tasks·agents 컬럼 추가 |
| Notion OAuth | `notion-oauth.ts` | PKCE 플로우, 토큰 암호화 저장 |
| Notion 검색 | `notion-client.ts` | 페이지/DB 검색, 내용 Markdown 변환 |
| Obsidian FS | `obsidian-fs.ts` | Vault 경로 설정, 노트 읽기/쓰기 |
| 인덱서 | `indexer.ts` | FTS 인덱싱, 메타데이터 저장 |
| 컨텍스트 조합 | `context-fetcher.ts` | multi-source Markdown 조합 |
| Settings 탭 | `ConnectionsSettingsTab.tsx` | 연결 카드 + 기본 검색 UI |
| 문서 배지 | `KbSourceBadge.tsx` | 채팅·태스크 모달 첨부 배지 |

### Phase 2 — 에이전트 연동 + 내보내기 (1주)
**목표: 에이전트 태스크에 컨텍스트 주입 + 산출물 Notion/Obsidian으로 내보내기**

| 작업 | 파일 | 내용 |
|------|------|------|
| 태스크 실행 시 컨텍스트 주입 | `workflow/core.ts` | `kb_context_sources` → 에이전트 system prompt에 추가 |
| Notion 쓰기 | `notion-client.ts` | 에이전트 보고서 → Notion 페이지 생성·업데이트 |
| Obsidian 쓰기 | `obsidian-fs.ts` | 에이전트 산출물 → Vault 파일로 내보내기 |
| NotebookLM 스냅샷 | `notebooklm-snapshots.ts` | 붙여넣기·파일 업로드 저장 |
| 에이전트 기본 소스 | `AgentFormModal.tsx` | 기본 지식 소스 설정 UI |
| 채팅 @멘션 | `GroupChatPanel.tsx` | `@notion`, `@obsidian` 인라인 검색 |

### Phase 3 — 자동화 + 파일 감시 (1주)
**목표: 자동화 규칙 + Obsidian 파일 감시 + Notion Webhook**

| 작업 | 파일 | 내용 |
|------|------|------|
| 파일 감시 | `obsidian-watcher.ts` | chokidar 기반, WebSocket 이벤트 브로드캐스트 |
| Notion Webhook | `notion-webhook.ts` | HMAC 검증, 이벤트 파싱 |
| 규칙 엔진 | `rule-engine.ts` | 트리거 매칭 + 조건 평가 + 액션 실행 |
| 규칙 UI | `AutomationRulesPanel.tsx` | 규칙 CRUD + 편집 모달 |
| 데스크톱 알림 | `NotificationCenter.tsx` | 규칙 실행 알림 카드 추가 |

---

## 14. 관련 문서 업데이트 필요 항목

구현 완료 후 아래 문서 업데이트 필요:

| 문서 | 업데이트 내용 |
|------|-------------|
| `docs/specs/api.md` | Connections API 섹션 추가 (v1.5.0으로 버전 업) |
| `docs/architecture/schema-erd.md` | 4개 신규 테이블 + tasks·agents 컬럼 변경 추가 |
| `docs/design/UI-SCREENS.md` | ConnectionsSettingsTab, KbDocumentSearch, RuleEditModal 스펙 추가 |
| `CLAUDE.md` | `server/modules/connections/` 경로, `src/components/connections/` 추가 |
| `docs/OVERVIEW.md` | 완성도 바 + 마일스톤 추가 |
| `docs/progress.md` | 구현 완료 기록 |
