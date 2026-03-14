# AgentDesk — UI 화면 & 인터랙션 명세

> **최종 업데이트:** 2026-03-14 (대시보드 중심 구조로 전면 개편)
> 메인 화면 1개 + 앱 창 3개 + 오버레이/모달/패널 36개 이상
> **디자인 참조:** `DESIGN.md` (CSS 변수), `AI-GUIDE.md` (개발 원칙)

---

## 디자인 철학 — macOS Hybrid

모든 화면은 **이중 레이어 원칙**을 따른다:

| 레이어 | 역할 | 스타일 |
|--------|------|--------|
| **Chrome** (컨테이너) | 패널·모달·카드·헤더 | `borderRadius: 10`, `blur(12px)`, 트래픽 라이트 |
| **Content** (내부) | 버튼·인풋·토스트·배지 | `borderRadius: 0`, `font-mono`, CLI sigil 언어 |

- **헤더:** `borderTopLeftRadius: 10`, blur + shadow — macOS 앱 바 스타일
- **앱 창(오버레이):** `borderRadius: 10`, 트래픽 라이트 장식 — macOS 창 느낌
- **Brand color:** Amber `--th-accent` — live indicator, active nav, primary CTA
- **전체 폰트:** `var(--th-font-mono)` (JetBrains Mono) — sans-serif 금지

---

## 앱 내비게이션 구조 — "대시보드 컨트롤 타워"

### 핵심 철학

> **사이드바 없음.** Dashboard가 항상 열려 있는 메인 화면이다.
> 다른 도구는 헤더 아이콘에서 "앱 창"처럼 열린다. macOS Dock 개념을 빌린 것이다.

```
┌─────────────────────────────────────────────────────┐
│  AgentDesk   [프로젝트 선택]   ──────  [⚡][📚][⚙][🔔] │  ← 헤더
├─────────────────────────────────────────────────────┤
│                                                     │
│               Dashboard                             │
│           (항상 열려 있는 메인 화면)                  │
│                                                     │
│  [에이전트 현황 카드]    [요주의 알림 배너]            │
│  [실행 중인 태스크]      [프로젝트 파일 트리]          │
│  [CLI 비용 위젯]         [Flow Graph 토글]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 헤더 아이콘 3개 (+ 알림)

| 아이콘 | 레이블 | 역할 | 여는 방식 |
|--------|--------|------|-----------|
| `⚡` | Workflow | 파이프라인 설계 도구 | 전체화면 오버레이 창 |
| `📚` | Library | 에이전트 지식 관리 | 전체화면 오버레이 창 |
| `⚙` | Settings | 초기 세팅·구성 | 전체화면 오버레이 창 |
| `🔔` | Notifications | 실시간 알림 센터 | 드롭다운 패널 |

> **Dock 원칙:** 이 3개 아이콘만 헤더에 둔다. Dashboard에서 직접 접근 가능한 기능은 아이콘으로 노출하지 않는다.

### Dashboard 드릴다운 패턴 (창 열지 않음)

Dashboard에서 클릭하면 화면 이동 없이 패널·드로어가 열린다:

| 트리거 | 열리는 요소 | 방향 |
|--------|------------|------|
| 에이전트 카드 클릭 | AgentDetail 패널 | 우측 슬라이드 |
| 태스크 행 클릭 | TerminalPanel 드로어 | 하단 |
| 완료 태스크 클릭 | TaskReportPopup | 중앙 모달 |
| `+` 버튼 | CreateTaskModal | 중앙 모달 |
| 알림 배너 클릭 | DecisionInboxModal | 중앙 모달 |
| Flow Graph 토글 | Dashboard 내 뷰 전환 | 인라인 |

---

## 1. Dashboard (메인 화면)

**파일:** `src/components/dashboard/Dashboard2.tsx`
**view:** `"dashboard"` (유일한 View enum 값)

항상 열려 있다. 운영 작업의 90%가 여기서 이루어진다.

### 1-1. 구성 패널

| 패널 | 컴포넌트 | 역할 |
|------|----------|------|
| 에이전트 현황 | `TeamPanel` | 에이전트 팀 상태 카드 (실시간) |
| 활동 피드 | `AgentActivityPanel` | 최근 에이전트 활동 스트림 |
| 태스크 요약 | `DashboardTaskList` | 현재 프로젝트 실행 중 태스크 |
| 파일 트리 | `ProjectFileTree` | 프로젝트 파일 구조 |
| CLI 위젯 | `CliUsageSummary` | 토큰 소비·비용 요약 (축소판) |
| 요주의 배너 | `AlertBanner` | 오류·승인대기·타임아웃 항목 |
| 첫 사용 가이드 | `DashboardGuidePanel` | 프로젝트·에이전트 미설정 시 표시 |

> **흡수된 기능:** 기존 Heartbeat Monitor → `TeamPanel` 실시간 뱃지로 통합

### 1-2. Flow Graph 토글 뷰

Dashboard 우측 상단 토글로 전환. 별도 화면 이동 없음.

| 모드 | 설명 |
|------|------|
| 카드 뷰 (기본) | TeamPanel + DashboardTaskList 패널 레이아웃 |
| 그래프 뷰 | `AgentFlowGraph` — 에이전트 관계 SVG 시각화 |

**파일:** `src/components/flow-graph/AgentFlowGraph.tsx`

그래프 기능:
- 노드: 에이전트 상태 색상, 태스크 표시
- 엣지: 베지어 곡선 (위임·서브에이전트·크로스부서·미팅)
- 필터: 전체 / 작업중 / 미팅중
- 줌·팬, 더블클릭 fitToView
- 노드 클릭 → `onSelectAgent` → AgentDetail 슬라이드 패널

### 1-3. 실시간 WebSocket 연결

| 이벤트 | 대상 패널 |
|--------|-----------|
| `agent_status` | TeamPanel, AgentActivityPanel |
| `task_update` | DashboardTaskList, AlertBanner |
| `cli_output` | TerminalPanel (드로어) |
| `decision_request` | AlertBanner → DecisionInboxModal |

---

## 2. Workflow 창 (⚡ 아이콘)

**트리거:** 헤더 `⚡ Workflow` 클릭
**열림 방식:** 전체화면 오버레이 (트래픽 라이트 + 닫기 버튼)
**탭 구조:**

```
[  Workflow Builder  |  Scheduled Tasks  ]
```

### 2-1. Workflow Builder 탭

**파일:** `src/components/workflow-builder/WorkflowBuilder.tsx`
**의존성:** `@xyflow/react` v12

노드 기반 에이전트 파이프라인 시각적 설계 도구.

| 노드 타입 | 파일 | 설명 |
|-----------|------|------|
| `trigger` | `nodes/WbTriggerNode.tsx` | 시작 트리거 (schedule/webhook/messenger/manual) |
| `agent` | `nodes/WbAgentNode.tsx` | 에이전트 실행 스텝 |
| `gate` | `nodes/WbGateNode.tsx` | 조건부 분기 (success/failure/timeout 핸들) |
| `condition` | `nodes/WbConditionNode.tsx` | true/false 조건 체크 |

기능:
- 좌측 노드 팔레트 클릭 → 캔버스 추가
- 노드 핸들 드래그 → 엣지 연결
- ReactFlow Background(dots) + Controls + MiniMap
- 워크플로 이름 인라인 편집
- localStorage 자동 저장/불러오기

### 2-2. Scheduled Tasks 탭

**파일:** `src/components/scheduled-tasks/ScheduledTasksPanel.tsx`

- 반복·예약 실행 태스크 목록
- 다음 실행 시간, 주기, 담당 에이전트 표시

---

## 3. Library 창 (📚 아이콘)

**트리거:** 헤더 `📚 Library` 클릭
**열림 방식:** 전체화면 오버레이 (트래픽 라이트 + 닫기 버튼)
**프로젝트 컨텍스트:** 선택된 `project_id` 기반으로 필터링됨
**탭 구조:**

```
[  Skills  |  Agent Rules  |  Memory  |  Hooks  |  Deliverables  ]
```

### 3-1. Skills 탭

**파일:** `src/components/SkillsLibrary.tsx`

- 에이전트가 학습한 명령·도구 목록 (provider/repo/agent 스코프)
- 내장 모달: `CustomSkillModal`, `LearningModal`, `ClassroomOverlay`

### 3-2. Agent Rules 탭

**파일:** `src/components/AgentRulesLibrary.tsx`

- 에이전트 행동 규칙 (global/dept/agent/project 스코프)
- 프롬프트 우선순위 순으로 주입됨
- 내장 모달: `RuleFormModal`, `RuleLearningModal`, `RuleHistoryPanel`

### 3-3. Memory 탭

**파일:** `src/components/MemoryLibrary.tsx`

- 에이전트 기억 항목 (맥락·지식·경험)
- 5분 TTL 캐시로 프롬프트 빌드 시 주입
- 내장 모달: `MemoryFormModal`, `MemoryLearningModal`

### 3-4. Hooks 탭

**파일:** `src/components/HooksLibrary.tsx`

- 태스크 이벤트 트리거 스크립트 (pre/post/on-error)
- 병렬 async 실행
- 내장 모달: `HookFormModal`, `HookLearningModal`, `HookHistoryPanel`

### 3-5. Deliverables 탭

**파일:** `src/components/deliverables/Deliverables.tsx`

- 태스크에서 생성된 결과물 목록
- 파일 형식별 필터, 다운로드
- 내장 모달: `TextPreviewModal`

---

## 4. Settings 창 (⚙ 아이콘)

**트리거:** 헤더 `⚙ Settings` 클릭
**열림 방식:** 전체화면 오버레이 (트래픽 라이트 + 닫기 버튼)
**탭 구조:**

```
[  General  |  API  |  OAuth  |  CLI  |  Gateway  |  Data  |  Project Types  |  Agents  ]
```

| 탭 | 파일 | 내용 |
|----|------|------|
| General | `settings/GeneralTab.tsx` | 언어, 테마, 기본 설정 |
| API | `settings/ApiTab.tsx` | Provider·모델 설정 (Claude/OpenAI 등) |
| OAuth | `settings/OAuthTab.tsx` | OAuth 디바이스 플로우 계정 연결 |
| CLI | `settings/CliTab.tsx` | CLI 상태, 경로, 사용량 상세 |
| Gateway | `settings/gateway-settings/` | Telegram·Discord·Slack 메신저 연동 |
| Data | `settings/DataTab.tsx` | DB 백업·초기화 |
| Project Types | `settings/CategoriesTab.tsx` | 프로젝트 카테고리(템플릿) 관리 |
| Agents | `TeamPageView.tsx` → `AgentManager` | 에이전트·부서 관리 |

> **흡수된 기능:**
> - 기존 `project-types` 화면 → Settings > Project Types 탭
> - 기존 `agents` 화면 → Settings > Agents 탭
> - 기존 `cli-usage` 화면 → Dashboard 위젯(요약) + Settings > CLI 탭(상세)

---

## 5. 오버레이 / 모달 / 패널 (36개)

모든 모달·오버레이는 `src/app/AppOverlays.tsx`에서 중앙 렌더링.
대부분 **Dashboard에서** 트리거된다.

### 커뮤니케이션

#### 5-1. ChatPanel
**파일:** `src/components/ChatPanel.tsx`
**트리거:** AgentDetail 패널 → "Chat" 탭 / 에이전트 카드 → "Open Chat"

| 모드 | 설명 |
|------|------|
| Direct | 특정 에이전트 1:1 채팅 |
| Announcement | 팀 전체 공지 |
| Directive | 프로젝트 지시 (배정 에이전트 대상) |

서브 패널: `ChatComposer`, `ChatMessageList`, `ChatPanelHeader`, `AnnouncementCliPanel`, `ProjectFlowDialog`

---

#### 5-2. GroupChatPanel
**파일:** `src/components/chat-panel/GroupChatPanel.tsx`
**트리거:** `onOpenGroupChat` / `onOpenGroupChatWithAgents`

- 복수 에이전트 그룹 대화
- 에이전트 태그·멘션 지원

---

#### 5-3. DecisionInboxModal
**파일:** `src/components/DecisionInboxModal.tsx`
**트리거:** Dashboard 알림 배너 클릭 / 알림 센터

| 요청 유형 | 설명 |
|-----------|------|
| `project_review_ready` | 프로젝트 리뷰 완료, 승인 요청 |
| `task_timeout_resume` | 태스크 타임아웃 — 계속/중단 선택 |
| `review_round_pick` | 리뷰 라운드 선택 요청 |

기능: 답변 옵션, 그룹 채팅 연결, followup 설정

---

### 에이전트 관리

#### 5-4. AgentDetail
**파일:** `src/components/AgentDetail.tsx`
**트리거:** Dashboard 에이전트 카드 클릭 → **우측 슬라이드 패널**

| 탭 | 내용 |
|----|------|
| Info | 프로필, CLI Provider, 모델, OAuth 계정 선택 |
| Tasks | 배정된 태스크 목록 |
| Alba | 파트타임 작업 현황 |
| Performance | 성과 지표 |
| Chat | 1:1 채팅 |

서브 컴포넌트: `AgentDetailTabContent`, `AgentChatTab`, `AgentPerformancePanel`
기능: Planning Leader 역할 토글, CLI 모델 변경

---

#### 5-5. AgentFormModal
**파일:** `src/components/agent-manager/AgentFormModal.tsx`
**트리거:** Settings > Agents 탭 → 에이전트 생성/수정

- 에이전트 이름, 역할, 페르소나, 부서 설정

---

#### 5-6. DepartmentFormModal
**파일:** `src/components/agent-manager/DepartmentFormModal.tsx`
**트리거:** Settings > Agents 탭 → 부서 생성/수정

- 부서명, 이모지 픽커, 설명

---

#### 5-7. AgentStatusPanel
**파일:** `src/components/AgentStatusPanel.tsx`
**트리거:** Dashboard → `onOpenAgentStatus`

- 실행 중인 CLI 프로세스 목록
- Kill 프로세스, 태스크 중단
- Idle CLI·스크립트 점검

---

### 태스크 관리

#### 5-8. CreateTaskModal
**파일:** `src/components/taskboard/CreateTaskModal.tsx`
**트리거:** Dashboard `+` 버튼

3단계 마법사:
1. 프로젝트·경로 선택
2. 태스크 정보 (제목, 설명, 워크플로우 팩)
3. 에이전트 배정

기능: 템플릿 지원, Form 피드백

---

#### 5-9. BulkHideModal
**파일:** `src/components/taskboard/BulkHideModal.tsx`
**트리거:** Dashboard 태스크 목록 → 일괄 숨기기

- done / pending / cancelled 상태별 태스크 일괄 숨김

---

#### 5-10. DiffModal
**파일:** `src/components/taskboard/DiffModal.tsx`
**트리거:** 태스크 변경 충돌 감지 시

- 변경 사항 diff 뷰
- Merge 또는 Discard 선택

---

#### 5-11. TerminalPanel
**파일:** `src/components/TerminalPanel.tsx`
**트리거:** Dashboard 태스크 행 클릭 → **하단 드로어**

| 탭 | 내용 |
|----|------|
| Terminal | CLI stdout 실시간 스트리밍 |
| Minutes | 회의록 (태스크 수행 중 생성) |

기능:
- Thinking Block 별도 섹션 표시 (Claude 추론 과정)
- 로그 검색·필터
- Intervention 섹션 (태스크 중 개입 가능)
- Progress Hints 표시

---

### 리포트 & 히스토리

#### 5-12. TaskReportPopup
**파일:** `src/components/TaskReportPopup.tsx`
**트리거:** Dashboard 완료 태스크 클릭

- Documents, Artifacts, Team 섹션
- 페이지네이션, 아티팩트 다운로드

---

#### 5-13. ReportHistory
**파일:** `src/components/ReportHistory.tsx`
**트리거:** `onOpenReportHistory`

- 전체 태스크 리포트 목록 (50개/페이지)
- 검색·필터

---

### 프로젝트 관리

#### 5-14. ProjectCreateModal
**파일:** `src/components/project-create-modal/ProjectCreateModal.tsx`
**트리거:** 헤더 프로젝트 선택 드롭다운 → "+ 새 프로젝트"

3단계 마법사:
1. CategorySelectStep — 프로젝트 유형 선택 (Settings > Project Types에서 관리)
2. 프로젝트 이름, 경로, 핵심 목표 입력
3. 에이전트 팀 선택

서브: `RecommendedSkillsSection`

---

#### 5-15. ProjectManagerModal
**파일:** `src/components/ProjectManagerModal.tsx`
**트리거:** Dashboard → 프로젝트 관리

4개 서브 패널:

| 패널 | 역할 |
|------|------|
| ProjectSidebar | 프로젝트 목록 |
| ProjectEditorPanel | 목표·리스크·게이트·산출물 편집 |
| ProjectInsightsPanel | 의사결정 이벤트, 태스크 히스토리 |
| GitHubImportPanel | GitHub 저장소 임포트 |

---

### Library 생성·학습 모달

| # | 모달 | 파일 | 접근 경로 |
|---|------|------|-----------|
| 5-16 | CustomSkillModal | `skills-library/CustomSkillModal.tsx` | Library > Skills |
| 5-17 | LearningModal (Skills) | `skills-library/LearningModal.tsx` | Library > Skills |
| 5-18 | ClassroomOverlay | `skills-library/ClassroomOverlay.tsx` | Library > Skills |
| 5-19 | RuleFormModal | `agent-rules/RuleFormModal.tsx` | Library > Agent Rules |
| 5-20 | RuleLearningModal | `agent-rules/RuleLearningModal.tsx` | Library > Agent Rules |
| 5-21 | RuleHistoryPanel | `agent-rules/RuleHistoryPanel.tsx` | Library > Agent Rules |
| 5-22 | MemoryFormModal | `memory/MemoryFormModal.tsx` | Library > Memory |
| 5-23 | MemoryLearningModal | `memory/MemoryLearningModal.tsx` | Library > Memory |
| 5-24 | HookFormModal | `hooks/HookFormModal.tsx` | Library > Hooks |
| 5-25 | HookLearningModal | `hooks/HookLearningModal.tsx` | Library > Hooks |
| 5-26 | HookHistoryPanel | `hooks/HookHistoryPanel.tsx` | Library > Hooks |

---

### 설정·연동

#### 5-27. CategoryFormModal
**파일:** `src/components/category-editor/CategoryFormModal.tsx`
**접근:** Settings > Project Types
- 프로젝트 유형 생성·수정

#### 5-28. ChatEditorModal
**파일:** `src/components/settings/gateway-settings/ChatEditorModal.tsx`
**접근:** Settings > Gateway
- 메신저 채널 설정 편집

#### 5-29. ChannelGuideModal
**파일:** `src/components/settings/gateway-settings/ChannelGuideModal.tsx`
**접근:** Settings > Gateway
- 채널 연동 가이드

#### 5-30. GitHubImportPanel
**파일:** `src/components/GitHubImportPanel.tsx`
- GitHub 저장소 임포트 마법사 (`GitHubImportWizard`, `GitHubDeviceConnect`)

---

### 글로벌 유틸리티

#### 5-31. CommandPalette
**파일:** `src/components/CommandPalette.tsx`
**트리거:** `Ctrl+Shift+K`

- 앱 창 열기 (Workflow / Library / Settings)
- 태스크 생성, 프로젝트 선택, 단축키 보기

#### 5-32. KeyboardShortcutsGuide
**파일:** `src/components/KeyboardShortcutsGuide.tsx`
**트리거:** `?` 키

- Portal 렌더링으로 전체 단축키 표시

#### 5-33. ScreenGuidePanel
**파일:** `src/components/ScreenGuidePanel.tsx`
**트리거:** 화면 우측 ? 아이콘

- 현재 화면 맥락 도움말

#### 5-34. NotificationCenter
**파일:** `src/components/NotificationCenter.tsx`
**트리거:** 헤더 `🔔` 아이콘

- 실시간 알림 (타입별 필터, 읽음 처리, 태스크 이동)

#### 5-35. ConfirmDialog
**파일:** `src/components/ui/ConfirmDialog.tsx`
- 삭제·경고 범용 확인 대화상자

#### 5-36. TextPreviewModal
**파일:** `src/components/deliverables/TextPreviewModal.tsx`
**접근:** Library > Deliverables
- 산출물 텍스트 파일 미리보기

---

## 6. 핵심 UI 아키텍처 패턴

### 앱 구조 (새 구조)

```
App.tsx
  └── AppOverlays.tsx    ← 36개 모달·패널 전부 여기서 렌더링
  └── AppMainLayout.tsx  ← Dashboard 단일 화면 렌더링
        ├── Dashboard2.tsx          (메인, 항상)
        ├── WorkflowOverlay.tsx     (⚡ 클릭 시 오버레이)
        ├── LibraryOverlay.tsx      (📚 클릭 시 오버레이)
        └── SettingsOverlay.tsx     (⚙ 클릭 시 오버레이)
```

### 창 관리 패턴

앱 창(Workflow/Library/Settings)은 독립 View 라우팅이 아니라 **오버레이 레이어**로 구현한다:
- `uiStore`의 `openWindow: "workflow" | "library" | "settings" | null` 상태로 관리
- 창이 열려 있어도 Dashboard는 아래에서 살아있음 (실시간 업데이트 계속)
- 창 닫기: `X` 버튼, `Escape` 키, 창 바깥 클릭 (Settings 제외)

### 슬라이드 패널 패턴

우측 AgentDetail, 하단 TerminalPanel은 **Dashboard 위에 레이어**로 열린다:
- 독립 라우트 없음 — `uiStore.selectedAgentId`, `uiStore.openTaskId` 상태로 제어
- 두 패널은 동시에 열릴 수 있음 (에이전트 상세 + 해당 에이전트 터미널)

### 오버레이 중앙 관리

모든 모달·오버레이는 `src/app/AppOverlays.tsx`에서 중앙 렌더링.
상태는 `uiStore`(Zustand)에서 관리 → 어느 컴포넌트에서든 `uiStore.open*` 호출로 트리거.

### Lazy Loading

Library 탭 컴포넌트(Skills/Rules/Memory/Hooks)와 Workflow Builder는
`React.lazy + Suspense` 적용 (초기 번들 분리, 창 열 때 로드).

### 프로젝트 컨텍스트 필터링

Library 4개 탭(Skills/Rules/Memory/Hooks)은 선택된 `project_id` 기반으로 서버에서 필터링:
```
GET /api/agent-rules?project_id=<id>
  → 해당 프로젝트 배정 에이전트의 룰만 반환
```

### 다국어 지원

한국어·영어·일본어·중국어 4개 언어 지원.

---

## 7. 파일 위치 빠른 참조

```
src/
├── App.tsx                          # 루트 상태 관리 + WebSocket
├── app/
│   ├── types.ts                     # View enum: "dashboard" (단일)
│   │                                # WindowType: "workflow"|"library"|"settings"|null
│   ├── AppMainLayout.tsx            # Dashboard + 3개 오버레이 창 렌더링
│   └── AppOverlays.tsx              # 전체 모달 렌더링
├── components/
│   ├── Header.tsx                   # 앱 헤더 (프로젝트 선택 + 아이콘 3개 + 알림)
│   ├── dashboard/                   # Dashboard2.tsx + 패널들
│   ├── flow-graph/                  # AgentFlowGraph (대시보드 토글 뷰)
│   ├── workflow-builder/            # WorkflowBuilder (@xyflow/react) + nodes/
│   ├── scheduled-tasks/             # Scheduled Tasks (Workflow 창 탭)
│   ├── taskboard/                   # CreateTaskModal, BulkHideModal, DiffModal
│   ├── deliverables/                # Deliverables + TextPreviewModal (Library 창 탭)
│   ├── agent-manager/               # AgentFormModal, DepartmentFormModal
│   ├── office-view/                 # CliUsageSummary (Dashboard 위젯)
│   ├── skills-library/              # Skills + 학습 모달
│   ├── agent-rules/                 # Rules + 학습 모달
│   ├── memory/                      # Memory + 학습 모달
│   ├── hooks/                       # Hooks + 학습 모달
│   ├── settings/                    # Settings 창 탭들
│   ├── category-editor/             # CategoryFormModal
│   ├── chat-panel/                  # GroupChatPanel
│   ├── project-create-modal/        # ProjectCreateModal
│   └── ui/                          # ConfirmDialog 등 공용 UI
└── store/
    ├── uiStore.ts                   # openWindow, selectedAgentId, openTaskId 등
    ├── agentStore.ts                # agents, departments
    ├── taskStore.ts                 # tasks, subtasks
    └── projectStore.ts              # projects, categories
```
