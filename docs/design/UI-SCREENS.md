# AgentDesk — UI 전체 화면 & 모달 목록

> **최종 업데이트:** 2026-03-13
> 전체 메뉴 화면 13개 + 오버레이/모달/패널 36개 이상 기록
> **디자인 참조:** `DESIGN.md` (CSS 변수), `AI-GUIDE.md` (개발 원칙)

---

## 디자인 철학 — macOS Hybrid

모든 화면은 **이중 레이어 원칙**을 따른다:

| 레이어 | 역할 | 스타일 |
|--------|------|--------|
| **Chrome** (컨테이너) | 패널·모달·카드·사이드바 | `borderRadius: 10`, `blur(12px)`, 트래픽 라이트 |
| **Content** (내부) | 버튼·인풋·토스트·배지 | `borderRadius: 0`, `font-mono`, CLI sigil 언어 |

- **사이드바:** `backdropFilter: blur(12px)` — macOS Finder 느낌의 글래스 네비게이션
- **헤더:** `borderTopLeftRadius: 10`, blur + shadow — macOS 앱 바 스타일
- **모달:** `borderRadius: 10`, 트래픽 라이트 장식 — macOS 창 느낌
- **Brand color:** Amber `--th-accent` — live indicator, active nav, primary CTA
- **전체 폰트:** `var(--th-font-mono)` (JetBrains Mono) — sans-serif 금지

---

## 사이드바 메뉴 구조

```
Overview
  ├── Dashboard              (대시보드)
  └── Project Types          (프로젝트 유형)

Tasks
  ├── Task Board             (태스크 보드)
  ├── Scheduled Tasks        (예약 태스크)
  └── Deliverables           (산출물)

Agents
  ├── Agents & Departments   (에이전트 & 부서)
  └── Heartbeat Monitor      (현황 모니터)

Library  [프로젝트 선택 필요]
  ├── Skills                 (스킬)
  ├── Agent Rules            (에이전트 룰)
  ├── Memory                 (메모리)
  └── Hooks                  (훅)

System
  ├── CLI Usage              (CLI 사용량)
  └── Settings               (설정)
```

---

## 1. 메인 화면 (13개)

### Overview

#### 1-1. Dashboard
**파일:** `src/components/dashboard/Dashboard2.tsx`
**view:** `"dashboard"`

| 구성 요소 | 역할 |
|---|---|
| TeamPanel | 에이전트 팀 상태 카드 목록 |
| AgentActivityPanel | 최근 에이전트 활동 피드 |
| DashboardTaskList | 현재 프로젝트 태스크 요약 |
| ProjectFileTree | 프로젝트 파일 트리 |
| DashboardGuidePanel | 첫 사용자 가이드 |

내장 모달: `CreateTaskModal`, `ProjectManagerModal`, `ProjectSettingsTab`

---

#### 1-2. Project Types (프로젝트 유형 관리)
**파일:** `src/components/settings/CategoriesTab.tsx`
**view:** `"project-types"`

- 프로젝트 카테고리(템플릿) 생성·수정·삭제
- 내장 모달: `CategoryFormModal`

---

### Tasks

#### 1-3. Task Board
**파일:** `src/components/TaskBoard.tsx`
**view:** `"tasks-board"`

| 컬럼 | 상태 |
|---|---|
| Pending | 대기 |
| Working | 실행 중 |
| Review | 리뷰 |
| Done | 완료 |
| Cancelled | 취소 |

추가 뷰: `FilterBar`, `DependencyGraph`, `GanttChart`
내장 모달: `CreateTaskModal`, `BulkHideModal`, `DiffModal`

---

#### 1-4. Scheduled Tasks (예약 태스크)
**파일:** `src/components/scheduled-tasks/ScheduledTasksPanel.tsx`
**view:** `"tasks-scheduled"`

- 반복·예약 실행 태스크 목록
- 다음 실행 시간, 주기, 담당 에이전트 표시

---

#### 1-5. Deliverables (산출물)
**파일:** `src/components/deliverables/Deliverables.tsx`
**view:** `"tasks-deliverables"`

- 태스크에서 생성된 결과물 목록
- 파일 형식별 필터, 다운로드
- 내장 모달: `TextPreviewModal`

---

### Agents

#### 1-6. Agents & Departments (에이전트 & 부서)
**파일:** `src/components/TeamPageView.tsx` → `AgentManager`
**view:** `"agents"`

- 에이전트 카드 그리드 (부서별 그룹)
- 부서 드래그 순서 변경
- 에이전트 상태 뱃지 (idle / running / error)
- 내장 모달: `AgentFormModal`, `DepartmentFormModal`, `EmojiPicker`

---

#### 1-7. Heartbeat Monitor (현황 모니터)
**파일:** `src/components/office-view/HeartbeatPanel.tsx`
**view:** `"heartbeat"`

- 전체 에이전트 실시간 활동 대시보드
- 하트비트 주기, 마지막 응답 시간
- 이상 감지 (timeout / 무응답) 알림

---

### Library (프로젝트 배정 에이전트 범위로 필터링됨)

#### 1-8. Skills (스킬 라이브러리)
**파일:** `src/components/SkillsLibrary.tsx`
**view:** `"skills"`

- 에이전트가 학습한 명령·도구 목록 (provider/repo/agent 스코프)
- 내장 모달: `CustomSkillModal`, `LearningModal`, `ClassroomOverlay`

---

#### 1-9. Agent Rules (에이전트 룰)
**파일:** `src/components/AgentRulesLibrary.tsx`
**view:** `"agent-rules"`

- 에이전트 행동 규칙 (global/dept/agent/project 스코프)
- 프롬프트 우선순위 순으로 주입됨
- 내장 모달: `RuleFormModal`, `RuleLearningModal`, `RuleHistoryPanel`

---

#### 1-10. Memory (메모리)
**파일:** `src/components/MemoryLibrary.tsx`
**view:** `"memory"`

- 에이전트 기억 항목 (맥락·지식·경험)
- 5분 TTL 캐시로 프롬프트 빌드 시 주입
- 내장 모달: `MemoryFormModal`, `MemoryLearningModal`

---

#### 1-11. Hooks (훅)
**파일:** `src/components/HooksLibrary.tsx`
**view:** `"hooks"`

- 태스크 이벤트 트리거 스크립트 (pre/post/on-error)
- 병렬 async 실행 (Phase 1 개선 완료)
- 내장 모달: `HookFormModal`, `HookLearningModal`, `HookHistoryPanel`

---

### System

#### 1-12. CLI Usage (CLI 사용량)
**파일:** `src/components/office-view/CliUsagePanel.tsx`
**view:** `"cli-usage"`

- 에이전트별 토큰 소비량, 비용 추적
- 실행 중인 CLI 프로세스 목록
- 프로세스 강제 종료(Kill) 액션

---

#### 1-13. Settings (설정)
**파일:** `src/components/SettingsPanel.tsx`
**view:** `"settings"`

| 탭 | 내용 |
|---|---|
| General | 언어, 테마, 기본 설정 |
| API | Provider·모델 설정 (Claude/OpenAI 등) |
| OAuth | OAuth 디바이스 플로우 계정 연결 |
| CLI | CLI 상태, 경로 |
| Gateway | Telegram·Discord·Slack 메신저 연동 |
| Data | DB 백업·초기화 |

---

## 2. 오버레이 / 모달 / 패널 (36개)

### 커뮤니케이션

#### 2-1. ChatPanel
**파일:** `src/components/ChatPanel.tsx`
**트리거:** 에이전트 선택 → "Open Chat"

| 모드 | 설명 |
|---|---|
| Direct | 특정 에이전트 1:1 채팅 |
| Announcement | 팀 전체 공지 |
| Directive | 프로젝트 지시 (특정 프로젝트 배정 에이전트 대상) |

서브 패널: `ChatComposer`, `ChatMessageList`, `ChatPanelHeader`, `AnnouncementCliPanel`, `ProjectFlowDialog`

---

#### 2-2. GroupChatPanel
**파일:** `src/components/chat-panel/GroupChatPanel.tsx`
**트리거:** `onOpenGroupChat` / `onOpenGroupChatWithAgents`

- 복수 에이전트 그룹 대화
- 에이전트 태그·멘션 지원

---

#### 2-3. DecisionInboxModal
**파일:** `src/components/DecisionInboxModal.tsx`
**트리거:** 의사결정 알림 배지 클릭

| 요청 유형 | 설명 |
|---|---|
| `project_review_ready` | 프로젝트 리뷰 완료, 승인 요청 |
| `task_timeout_resume` | 태스크 타임아웃 — 계속/중단 선택 |
| `review_round_pick` | 리뷰 라운드 선택 요청 |

기능: 답변 옵션, 그룹 채팅 연결, followup 설정

---

### 에이전트 관리

#### 2-4. AgentDetail
**파일:** `src/components/AgentDetail.tsx`
**트리거:** 에이전트 카드 클릭 (우측 슬라이드 패널)

| 탭 | 내용 |
|---|---|
| Info | 프로필, CLI Provider, 모델, OAuth 계정 선택 |
| Tasks | 배정된 태스크 목록 |
| Alba | 파트타임 작업 현황 |
| Performance | 성과 지표 |
| Chat | 1:1 채팅 |

서브 컴포넌트: `AgentDetailTabContent`, `AgentChatTab`, `AgentPerformancePanel`
기능: Planning Leader 역할 토글, CLI 모델 변경

---

#### 2-5. AgentFormModal
**파일:** `src/components/agent-manager/AgentFormModal.tsx`
**트리거:** 에이전트 생성/수정 버튼

- 에이전트 이름, 역할, 페르소나, 부서 설정

---

#### 2-6. DepartmentFormModal
**파일:** `src/components/agent-manager/DepartmentFormModal.tsx`
**트리거:** 부서 생성/수정 버튼

- 부서명, 이모지 픽커, 설명

---

#### 2-7. AgentStatusPanel
**파일:** `src/components/AgentStatusPanel.tsx`
**트리거:** `onOpenAgentStatus`

- 실행 중인 CLI 프로세스 목록
- Kill 프로세스, 태스크 중단
- Idle CLI·스크립트 점검

---

### 태스크 관리

#### 2-8. CreateTaskModal
**파일:** `src/components/taskboard/CreateTaskModal.tsx`
**트리거:** "+ 태스크 생성" 버튼

3단계 마법사:
1. 프로젝트·경로 선택
2. 태스크 정보 (제목, 설명, 워크플로우 팩)
3. 에이전트 배정

기능: 템플릿 지원, Form 피드백

---

#### 2-9. BulkHideModal
**파일:** `src/components/taskboard/BulkHideModal.tsx`
**트리거:** 보드 일괄 숨기기 버튼

- done / pending / cancelled 상태별 태스크 일괄 숨김

---

#### 2-10. DiffModal
**파일:** `src/components/taskboard/DiffModal.tsx`
**트리거:** 태스크 변경 충돌 감지 시

- 변경 사항 diff 뷰
- Merge 또는 Discard 선택

---

#### 2-11. TerminalPanel
**파일:** `src/components/TerminalPanel.tsx`
**트리거:** 태스크 카드 → 터미널 탭 또는 `onOpenTerminal`

| 탭 | 내용 |
|---|---|
| Terminal | CLI stdout 실시간 스트리밍 |
| Minutes | 회의록 (태스크 수행 중 생성) |

기능:
- Thinking Block 별도 섹션 표시 (Claude 추론 과정)
- 로그 검색·필터
- Intervention 섹션 (태스크 중 개입 가능)
- Progress Hints 표시

---

### 리포트 & 히스토리

#### 2-12. TaskReportPopup
**파일:** `src/components/TaskReportPopup.tsx`
**트리거:** 완료 태스크 → 리포트 보기

- Documents, Artifacts, Team 섹션
- 페이지네이션
- 아티팩트 다운로드

---

#### 2-13. ReportHistory
**파일:** `src/components/ReportHistory.tsx`
**트리거:** `onOpenReportHistory`

- 전체 태스크 리포트 목록 (50개/페이지)
- 검색·필터

---

### 프로젝트 관리

#### 2-14. ProjectCreateModal
**파일:** `src/components/project-create-modal/ProjectCreateModal.tsx`
**트리거:** 프로젝트 생성 버튼

3단계 마법사:
1. CategorySelectStep — 프로젝트 유형 선택
2. 프로젝트 이름, 경로, 핵심 목표 입력
3. 에이전트 팀 선택

서브: `RecommendedSkillsSection`

---

#### 2-15. ProjectManagerModal
**파일:** `src/components/ProjectManagerModal.tsx`
**트리거:** 대시보드 → 프로젝트 관리

4개 서브 패널:

| 패널 | 역할 |
|---|---|
| ProjectSidebar | 프로젝트 목록 |
| ProjectEditorPanel | 목표·리스크·게이트·산출물 편집 |
| ProjectInsightsPanel | 의사결정 이벤트, 태스크 히스토리 |
| GitHubImportPanel | GitHub 저장소 임포트 |

---

### Library 생성·학습 모달

| # | 모달 | 파일 | 설명 |
|---|---|---|---|
| 2-16 | CustomSkillModal | `skills-library/CustomSkillModal.tsx` | 커스텀 스킬 생성 |
| 2-17 | LearningModal (Skills) | `skills-library/LearningModal.tsx` | 실행에서 스킬 학습 |
| 2-18 | ClassroomOverlay | `skills-library/ClassroomOverlay.tsx` | 스킬 교육 세션 |
| 2-19 | RuleFormModal | `agent-rules/RuleFormModal.tsx` | 룰 생성·수정 |
| 2-20 | RuleLearningModal | `agent-rules/RuleLearningModal.tsx` | 에이전트 행동에서 룰 제안 |
| 2-21 | RuleHistoryPanel | `agent-rules/RuleHistoryPanel.tsx` | 룰 변경 히스토리 |
| 2-22 | MemoryFormModal | `memory/MemoryFormModal.tsx` | 메모리 항목 생성·수정 |
| 2-23 | MemoryLearningModal | `memory/MemoryLearningModal.tsx` | 태스크 실행에서 메모리 추출 |
| 2-24 | HookFormModal | `hooks/HookFormModal.tsx` | 훅 생성·수정 |
| 2-25 | HookLearningModal | `hooks/HookLearningModal.tsx` | 이벤트에서 훅 학습 |
| 2-26 | HookHistoryPanel | `hooks/HookHistoryPanel.tsx` | 훅 실행 히스토리 |

---

### 설정·연동

#### 2-27. CategoryFormModal
**파일:** `src/components/category-editor/CategoryFormModal.tsx`
- 프로젝트 유형 생성·수정

#### 2-28. ChatEditorModal
**파일:** `src/components/settings/gateway-settings/ChatEditorModal.tsx`
- 메신저 채널 설정 편집

#### 2-29. ChannelGuideModal
**파일:** `src/components/settings/gateway-settings/ChannelGuideModal.tsx`
- 채널 연동 가이드

#### 2-30. GitHubImportPanel
**파일:** `src/components/GitHubImportPanel.tsx`
- GitHub 저장소 임포트 마법사 (`GitHubImportWizard`, `GitHubDeviceConnect`)

---

### 글로벌 유틸리티

#### 2-31. CommandPalette
**파일:** `src/components/CommandPalette.tsx`
**트리거:** `Ctrl+Shift+K`

- 뷰 이동, 태스크 생성, 프로젝트 선택, 단축키 보기

#### 2-32. KeyboardShortcutsGuide
**파일:** `src/components/KeyboardShortcutsGuide.tsx`
**트리거:** `?` 키

- Portal 렌더링으로 전체 단축키 표시

#### 2-33. ScreenGuidePanel
**파일:** `src/components/ScreenGuidePanel.tsx`
**트리거:** 화면 우측 ? 아이콘

- 현재 화면 맥락 도움말

#### 2-34. NotificationCenter
**파일:** `src/components/NotificationCenter.tsx`
**트리거:** 알림 벨 아이콘

- 실시간 알림 (타입별 필터, 읽음 처리, 태스크 이동)

#### 2-35. ConfirmDialog
**파일:** `src/components/ui/ConfirmDialog.tsx`
- 삭제·경고 범용 확인 대화상자

#### 2-36. TextPreviewModal
**파일:** `src/components/deliverables/TextPreviewModal.tsx`
- 산출물 텍스트 파일 미리보기

---

## 3. 핵심 UI 아키텍처 패턴

### 오버레이 중앙 관리
모든 모달·오버레이는 `src/app/AppOverlays.tsx`에서 중앙 렌더링.
상태는 `App.tsx`에서 관리 → 드릴다운으로 열기/닫기 콜백 전달.

```
App.tsx
  └── AppOverlays.tsx  ← 36개 모달 전부 여기서 렌더링
  └── AppMainLayout.tsx ← 13개 메인 화면 라우팅
```

### Lazy Loading
Library 계열 및 Settings 컴포넌트는 `React.lazy + Suspense` 적용 (초기 번들 분리).

### 프로젝트 컨텍스트 필터링
Library 4개(Skills/Rules/Memory/Hooks)는 선택된 `project_id` 기반으로 서버에서 필터링:
```
GET /api/agent-rules?project_id=<id>
  → 해당 프로젝트 배정 에이전트의 룰만 반환
```

### 실시간 업데이트 (WebSocket)
| 이벤트 | 대상 화면 |
|---|---|
| `task_update` | TaskBoard, Dashboard |
| `cli_output` | TerminalPanel |
| `agent_status` | HeartbeatPanel, AgentStatusPanel |
| `decision_request` | DecisionInboxModal |

### 다국어 지원
한국어·영어·일본어·중국어 4개 언어 지원.

---

## 4. 파일 위치 빠른 참조

```
src/
├── App.tsx                          # 루트 상태 관리
├── app/
│   ├── AppMainLayout.tsx            # 화면 라우팅
│   └── AppOverlays.tsx              # 전체 모달 렌더링
├── components/
│   ├── Sidebar.tsx                  # 사이드바 메뉴
│   ├── dashboard/                   # Dashboard
│   ├── taskboard/                   # Task Board + 모달들
│   ├── scheduled-tasks/             # Scheduled Tasks
│   ├── deliverables/                # Deliverables + TextPreviewModal
│   ├── agent-manager/               # AgentFormModal, DepartmentFormModal
│   ├── office-view/                 # HeartbeatPanel, CliUsagePanel
│   ├── skills-library/              # Skills + 학습 모달
│   ├── agent-rules/                 # Rules + 학습 모달
│   ├── memory/                      # Memory + 학습 모달
│   ├── hooks/                       # Hooks + 학습 모달
│   ├── settings/                    # 설정 탭들
│   ├── category-editor/             # CategoryFormModal
│   ├── chat-panel/                  # GroupChatPanel
│   ├── project-create-modal/        # ProjectCreateModal
│   └── ui/                          # ConfirmDialog 등 공용 UI
```
