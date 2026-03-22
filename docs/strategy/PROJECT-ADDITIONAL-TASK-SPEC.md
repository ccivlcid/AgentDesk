# PROJECT-ADDITIONAL-TASK-SPEC.md
# 프로젝트 폴더 창 — 추가 업무 지시 기능 설계

> 상태: Implemented
> 관련 파일: `src/components/desktop/project-folder-window/`

---

## 1. 배경 및 목적

현재 AgentDesk에서 프로젝트를 처음 생성하면 킥오프(kickoff)가 실행되고 에이전트들이 태스크를 수행한다. 이후 모든 태스크가 완료된 상태에서 **같은 프로젝트에 추가 업무를 지시**하려면:

- 채팅 패널에서 `$` 접두사를 사용 (사용자에게 숨겨진 흐름)
- TaskBoard에서 수동으로 태스크를 하나씩 생성 (AI 계획 없음)

두 방법 모두 UX가 불명확하거나 번거롭다. 가장 자연스러운 진입점은 **프로젝트 폴더 창** 이다 — 사용자가 이미 해당 프로젝트를 보고 있는 곳에서 바로 추가 업무를 지시할 수 있어야 한다.

---

## 2. 기능 개요

프로젝트 폴더 창 (`project-folder-window/index.tsx`) 하단에 **추가 업무 지시 패널(NewRoundPanel)** 을 추가한다.

### 핵심 동작

1. 사용자가 폴더 창에서 업무 내용을 입력하고 **"업무 지시"** 버튼을 누름
2. `/api/projects/:id/kickoff` 를 호출 (기존 킥오프 엔드포인트 재사용)
3. 서버가 LLM으로 태스크를 계획 → DB에 저장 → 에이전트 자동 실행
4. 창 내 Tasks 탭이 새 태스크를 실시간으로 반영

### 지원하는 시나리오

| 시나리오 | 상태 조건 | 버튼 표시 |
|---------|----------|---------|
| 태스크 없음 (프로젝트 생성 직후) | tasks 없음 | "첫 번째 업무 시작" |
| 모든 태스크 완료 | `done` 만 있음 | "추가 업무 지시" |
| 태스크 실행 중 | `in_progress` 존재 | 비활성화 (실행 중 표시) |
| Clarification 대기 중 | 서버 응답 | 질문 표시 + 답변 입력창 |

---

## 3. UI 설계

### 3-1. 배치 위치

프로젝트 폴더 창 **최하단 고정 패널** — 탭 콘텐츠 아래, 창 전체 너비.

```
┌────────────────────────────────────────────────────┐
│  Traffic Lights  |  프로젝트명  |  [활성화]          │ ← 타이틀바 (44px)
├────────────────────────────────────────────────────┤
│  ▦ 실행중 2  ✓ 완료 5  👤 에이전트 3               │ ← 통계바 (30px)
├────────────────────────────────────────────────────┤
│  Files  Tasks  Agents  Terminal  Details  Git       │ ← 탭 네비
├────────────────────────────────────────────────────┤
│                                                    │
│           (탭 콘텐츠 영역, flex-1)                  │
│                                                    │
├────────────────────────────────────────────────────┤
│  NewRoundPanel (새 업무 지시 패널)                   │ ← 신규 추가 (신축)
└────────────────────────────────────────────────────┘
```

### 3-2. NewRoundPanel 상태별 UI

#### 상태 A — 접힘(기본)

```
┌────────────────────────────────────────────────────┐
│  [+] 추가 업무 지시          [↑ 펼치기]             │  (36px)
└────────────────────────────────────────────────────┘
```

- 클릭 시 펼침 상태로 전환

#### 상태 B — 펼침 / 입력 대기

```
┌────────────────────────────────────────────────────┐
│  추가 업무 지시                      [↓ 접기]       │  (36px)
├────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ 어떤 업무를 추가할까요?                        │  │
│  │ (예: 로그인 기능 구현, 단위 테스트 작성)        │  │  (80px textarea)
│  └──────────────────────────────────────────────┘  │
│                            [업무 지시]              │  (32px)
└────────────────────────────────────────────────────┘
```

#### 상태 C — 로딩 (킥오프 진행 중)

```
┌────────────────────────────────────────────────────┐
│  [스피너] 에이전트가 업무를 계획하는 중...             │  (36px)
└────────────────────────────────────────────────────┘
```

#### 상태 D — Clarification 필요

```
┌────────────────────────────────────────────────────┐
│  에이전트가 질문합니다                               │  (36px)
├────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ (서버에서 온 질문 텍스트)                      │  │  (질문 표시)
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 답변을 입력하세요...                           │  │  (60px textarea)
│  └──────────────────────────────────────────────┘  │
│                            [답변 전송]              │
└────────────────────────────────────────────────────┘
```

#### 상태 E — 실행 중 비활성화

```
┌────────────────────────────────────────────────────┐
│  [●] 에이전트가 작업 중입니다 — 완료 후 추가 지시 가능  │  (36px, 비활성)
└────────────────────────────────────────────────────┘
```

---

## 4. 컴포넌트 설계

### 4-1. 신규 파일

```
src/components/desktop/project-folder-window/
└── NewRoundPanel.tsx          (추가 업무 지시 패널 컴포넌트)
```

### 4-2. NewRoundPanel Props

```typescript
interface NewRoundPanelProps {
  projectId: string;
  hasRunningTask: boolean;   // in_progress | collaborating 태스크 존재 여부
  onKickoffDone: () => void; // 킥오프 완료 후 Tasks 탭 새로고침 트리거
  t: (keys: { ko: string; en: string; ja?: string; zh?: string }) => string;
}
```

### 4-3. NewRoundPanel 내부 상태

```typescript
type PanelMode =
  | "collapsed"       // 기본 접힘
  | "idle"            // 펼침 + 입력 대기
  | "loading"         // 킥오프 진행 중
  | "clarification"   // 서버가 추가 정보 요청
  | "disabled";       // 태스크 실행 중이라 비활성화

const [mode, setMode] = useState<PanelMode>(
  hasRunningTask ? "disabled" : "collapsed"
);
const [input, setInput] = useState("");
const [clarificationId, setClarificationId] = useState<string | null>(null);
const [clarificationQuestion, setClarificationQuestion] = useState("");
const [clarificationAnswer, setClarificationAnswer] = useState("");
```

### 4-4. index.tsx 수정 범위

- `NewRoundPanel` 임포트 추가
- 창 최하단에 `<NewRoundPanel>` 렌더링
- `hasRunningTask` prop: `activeTasks.length > 0` (이미 `useProjectFolderWindowState`에서 계산)
- `onKickoffDone`: Tasks 탭 데이터 새로고침 (기존 `refetchTasks()` 트리거)

---

## 5. API 흐름

### 5-1. 정상 킥오프

```
사용자 입력 → "업무 지시" 클릭
    ↓
POST /api/projects/:id/kickoff
Body: { clarification_answer: undefined }
    ↓
응답: { status: "ok", tasks: [...] }
    ↓
onKickoffDone() 호출 → Tasks 탭 새로고침
패널 → "collapsed" 상태로 리셋
```

> 서버는 input 텍스트를 어디에 전달하는가?
> → 킥오프는 프로젝트의 `core_goal` + `directive` 를 기반으로 동작한다.
> 이번 스펙에서는 입력된 텍스트를 **임시 directive**로 전달한다.

### 5-2. 서버 API 변경: `additional_directive` 파라미터 추가

```typescript
// POST /api/projects/:id/kickoff
// 기존:
{ clarification_answer?: string }

// 추가:
{
  clarification_answer?: string;
  additional_directive?: string;   // 신규: 이번 라운드만 적용되는 업무 지시
}
```

서버 로직:
- `additional_directive` 가 있으면 LLM 프롬프트에 "This round's specific task:" 섹션으로 추가
- 프로젝트 DB의 `directive` 는 변경하지 않음 (라운드 한정)

### 5-3. Clarification 흐름

```
POST /api/projects/:id/kickoff
    ↓
응답: { status: "clarification_needed", clarificationId, question }
    ↓
패널 → "clarification" 상태, question 표시
    ↓
사용자 답변 입력 → "답변 전송" 클릭
    ↓
POST /api/projects/:id/clarification-reply
Body: { clarification_id, answer }
    ↓
(서버가 자동으로 킥오프 재실행)
    ↓
패널 → "loading" → "collapsed"
onKickoffDone() 호출
```

---

## 6. 서버 변경 사항

### 6-1. kickoff.ts — `additional_directive` 처리

```typescript
// 기존 프롬프트:
const prompt = `
Project Name: ${project.name}
Goal: ${project.core_goal}
${project.directive ? `Directive: ${project.directive}` : ""}
Available agents: ...
`;

// 변경 후:
const additionalDirective = (body.additional_directive ?? "").trim();
const prompt = `
Project Name: ${project.name}
Goal: ${project.core_goal}
${project.directive ? `Project Directive: ${project.directive}` : ""}
${additionalDirective ? `This Round's Task: ${additionalDirective}` : ""}
Available agents: ...
`;
```

### 6-2. 영향 범위

- `server/modules/routes/core/projects/kickoff.ts` — prompt 구성 부분만 수정
- 기존 엔드포인트 URL, 응답 스펙 변경 없음
- 기존 킥오프 호출부 (App.tsx의 `kickoffProject()`) 는 변경 불필요

---

## 7. 데이터 흐름 다이어그램

```
ProjectFolderWindow (index.tsx)
│
├── useProjectFolderWindowState
│     activeTasks: Task[]   ──────────────┐
│     refetchTasks: () => void ────────────┤
│                                          ↓
└── NewRoundPanel
      ├── mode: PanelMode
      ├── input: string
      ├── clarificationId: string | null
      │
      ├── handleSubmit()
      │     POST /api/projects/:id/kickoff
      │     { additional_directive: input }
      │     → ok        → onKickoffDone() → refetchTasks()
      │     → clarification → mode = "clarification"
      │
      └── handleClarificationReply()
            POST /api/projects/:id/clarification-reply
            { clarification_id, answer }
            → onKickoffDone() → refetchTasks()
```

---

## 8. 엣지 케이스 처리

| 케이스 | 처리 방법 |
|-------|---------|
| 입력 없이 "업무 지시" 클릭 | 프로젝트의 기존 goal/directive 기반으로 킥오프 (기존 동작 유지) |
| 태스크 실행 중 킥오프 시도 | 서버가 `task_already_running` 반환 → 에러 토스트 표시 |
| 킥오프 실패 (LLM 오류) | 에러 메시지 패널 내 표시, 재시도 버튼 제공 |
| 네트워크 끊김 | loading 상태 유지 + 타임아웃(30s) 후 에러로 전환 |
| Clarification 답변 후 재실패 | 에러 표시 + "다시 시도" 버튼 |

---

## 9. 구현 체크리스트

### 프론트엔드

- [ ] `NewRoundPanel.tsx` 신규 생성
  - [ ] 5가지 mode 상태 구현 (collapsed/idle/loading/clarification/disabled)
  - [ ] `kickoffProject()` API 호출 (`additional_directive` 파라미터 추가)
  - [ ] `replyClarification()` API 호출 연결
  - [ ] SVG 아이콘만 사용 (이모지 금지)
  - [ ] `--th-*` CSS 변수 사용
- [ ] `project-folder-window/index.tsx` 수정
  - [ ] `NewRoundPanel` 렌더링 추가
  - [ ] `hasRunningTask` prop 연결 (`activeTasks.length > 0`)
  - [ ] `onKickoffDone` → Tasks 탭 새로고침 트리거 연결
- [ ] `src/api/project-kickoff.ts` 수정
  - [ ] `kickoffProject(projectId, clarificationAnswer?, additionalDirective?)` 시그니처 확장

### 서버

- [ ] `server/modules/routes/core/projects/kickoff.ts` 수정
  - [ ] `body.additional_directive` 읽기
  - [ ] LLM 프롬프트에 "This Round's Task" 섹션 추가

### 문서

- [ ] `docs/specs/api.md` — kickoff 엔드포인트 body 스펙 업데이트 (버전 bump)

---

## 10. 범위 외 (Out of Scope)

- `additional_directive` 를 DB에 히스토리로 저장하는 기능 (추후 고려)
- "라운드 히스토리" 뷰 (몇 번째 라운드인지 추적)
- 에이전트 역할 재배정 (이번 라운드에서는 기존 배정 그대로)
- 중간에 업무를 취소하는 기능

---

## 11. 관련 파일 경로

| 파일 | 역할 |
|-----|------|
| `src/components/desktop/project-folder-window/index.tsx` | 프로젝트 폴더 창 메인 |
| `src/components/desktop/project-folder-window/NewRoundPanel.tsx` | 신규 패널 컴포넌트 |
| `src/components/desktop/project-folder-window/useProjectFolderWindowState.ts` | 창 상태 (activeTasks 등) |
| `src/api/project-kickoff.ts` | 킥오프/resume/clarification API 함수 |
| `server/modules/routes/core/projects/kickoff.ts` | 서버 킥오프 엔드포인트 |
| `docs/specs/api.md` | API 명세 문서 |
