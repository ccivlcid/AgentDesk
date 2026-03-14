# "더 큰 IDE" 비전 로드맵

> **"기본적인 관심 단위는 파일이 아니라 에이전트다. 여전히 프로그래밍이긴 하지만."**
> — Andrej Karpathy

AgentDesk가 Karpathy가 말하는 **"더 큰 IDE"** 를 완성하기 위한 전략 문서.

---

## 1. 현재 상태 진단

### 강점 (이미 갖춘 것)

| 영역 | 달성도 | 설명 |
|------|--------|------|
| 에이전트 스폰/관리 | 95% | 9개 CLI 프로바이더, 실제 프로세스 관리 |
| 멀티에이전트 오케스트레이션 | 90% | 미팅, 합의, 태스크 위임, 크로스 부서 조율 |
| 데이터베이스/인프라 | 90% | 48개 테이블, 암호화, 감사 로깅 |
| 스킬 학습/메모리 | 85% | 마크다운 기반 스킬 학습·기억·삭제 |
| 하트비트/모니터링 | 85% | 이상 감지, 실시간 알림 |
| 스케줄링 | 85% | 완전한 cron 엔진 |

### 개선 완료 항목 (2026-03-14 기준)

| 영역 | 달성도 | 완료 내용 |
|------|--------|-----------|
| 시각적 오케스트레이션 | **95%** ✅ | Agent Flow Graph (Custom SVG, P2-1) + Workflow Builder (@xyflow/react, P3-2) 구현 완료 |
| "Higher-level Programming" UX | **85%** ✅ | Visual Workflow Builder (TriggerNode/AgentNode/GateNode/ConditionNode 4종) 구현 완료 |
| IDE 통합감 | **90%** ✅ | Split-Pane Layout(P3-1), Keyboard-First UX(P3-3), CommandPalette 강화 완료 |
| Slack 연동 | **100%** ✅ | conversations.history 폴링 방식 수신기 구현 완료 (P3-6) |

---

## 2. 핵심 전략: 3가지 축

```
┌─────────────────────────────────────────────────┐
│              "더 큰 IDE" = AgentDesk             │
│                                                  │
│   ① 시각화      ② 에이전트        ③ 통합 IDE     │
│      레이어        프로그래밍         경험          │
│                                                  │
│   에이전트를     에이전트를         하나의 화면에서  │
│   눈으로 본다    설계·조합한다      모든 것을 한다   │
└─────────────────────────────────────────────────┘
```

---

## 3. 축 ①: 시각화 레이어 — "에이전트를 눈으로 본다"

### 3-1. Agent Flow Graph ✅ 완료 (P2-1)

**목표**: 에이전트 간 관계와 작업 흐름을 실시간 그래프로 시각화

**구현 완료**:
- **방식**: Custom SVG + React (외부 라이브러리 없음, 의존성 0)
- **파일**: `src/components/flow-graph/` (AgentFlowGraph, useFlowLayout, useViewTransform, AgentNode, MeetingCluster, FlowEdge)
- **엣지 타입**: 서브에이전트(점선), 위임(실선), 크로스부서(amber 점선), 미팅(연결선)
- **레이아웃**: 관계 기반 자동 배치, 미팅 클러스터 원형 배치
- **인터랙션**: 줌·팬, 노드 호버 하이라이트, 클릭 → 에이전트 상세, 더블클릭 fitToView
- **필터**: 전체 / 작업중 / 미팅중
- **메뉴 위치**: 사이드바 에이전트 섹션 (`g f` 단축키)

**상세**: `docs/strategy/agent-flow-graph-design.md`

### 3-2. Live Activity Timeline

**목표**: 모든 에이전트의 활동을 시간축으로 추적

```
시간 ──────────────────────────────────────────────►

Dev-1  ████ coding ████ │ ██ review ██ │
Dev-2           ███ coding ███ │ waiting... │ ██ fix ██
QA-1                          │ ████ testing ████ │
PM     ██ meeting ██ │                    │ █ report █
```

**구현 방안**:
- 간트 차트 스타일의 타임라인 뷰
- 에이전트별 행, 시간별 열
- 태스크 상태별 색상 코딩
- 현재 시점 표시선 + 자동 스크롤

### 3-3. Resource & Cost Dashboard

**목표**: 토큰 사용량, 비용, 성능을 실시간 모니터링

```
┌─────────────────────────────────────────┐
│ 총 비용: $12.34 오늘  │  토큰: 1.2M    │
├──────────┬──────────┬───────────────────┤
│ Dev-1    │ $4.50    │ ████████░░ 45%    │
│ Dev-2    │ $3.20    │ ██████░░░░ 32%    │
│ QA-1     │ $2.80    │ █████░░░░░ 28%    │
│ PM       │ $1.84    │ ███░░░░░░░ 18%    │
└──────────┴──────────┴───────────────────┘
```

- 기존 CLI Usage 데이터 활용, 실시간 집계 뷰 추가

---

## 4. 축 ②: 에이전트 프로그래밍 — "에이전트를 설계·조합한다"

### 4-1. Visual Workflow Builder ✅ 완료 (P3-2)

**목표**: 코드 없이 에이전트 워크플로를 시각적으로 설계

**구현 완료**:
- **라이브러리**: `@xyflow/react` v12.10.1
- **파일**: `src/components/workflow-builder/` (WorkflowBuilder, nodes/ 4종)
- **노드 타입**:
  - `WbTriggerNode` — 시작 트리거 (schedule/webhook/messenger/manual)
  - `WbAgentNode` — 에이전트 실행 스텝 (이모지·스킬·에이전트명 표시)
  - `WbGateNode` — 조건부 분기 (success/failure/timeout 핸들 각각 분리)
  - `WbConditionNode` — true/false 조건 체크
- **저장 형식**: JSON → localStorage (workflow pack 시스템 연동 확장 가능)
- **초기 예제**: "PR Review Pipeline" 프리뷰로 즉시 사용 가능
- **메뉴 위치**: 사이드바 에이전트 섹션 (`g w` 단축키)

**이것이 Karpathy가 말하는 "higher-level programming"의 핵심**:
파일 대신 에이전트를, 코드 대신 플로우를, 함수 대신 워크플로를 조합한다.

### 4-2. Agent Composition (에이전트 조합)

**목표**: 에이전트를 레고처럼 조합하여 새로운 에이전트를 만든다

```yaml
# 시각적 UI에서 생성 → 내부적으로 이 구조로 저장
name: "Full-Stack Review Team"
composition:
  - agent: code-reviewer
    skills: [typescript, react, security]
    rules: "코드 품질 기준 엄격히 적용"
  - agent: test-writer
    skills: [vitest, playwright]
    trigger: after(code-reviewer.pass)
  - agent: doc-updater
    skills: [markdown, api-docs]
    trigger: after(test-writer.complete)
```

**구현 방안**:
- 기존 workflow pack 시스템을 확장
- UI에서 에이전트 + 스킬 + 규칙을 드래그앤드롭으로 조합
- 조합 결과를 pack JSON으로 저장/공유/버전 관리

### 4-3. Agent REPL (에이전트 대화형 실행)

**목표**: 에이전트에게 즉시 명령하고 결과를 확인하는 대화형 인터페이스

```
AgentDesk > @dev-1 "이 함수를 리팩터링해줘"
  dev-1 ► 분석 중... src/utils/parser.ts
  dev-1 ► 3개 파일 수정 완료 (diff 보기)
  dev-1 ► 테스트 통과 ✓

AgentDesk > @qa-1 "방금 변경사항 검증해줘"
  qa-1 ► dev-1의 변경사항 3개 파일 확인 중...
  qa-1 ► 이슈 1건 발견: null check 누락 (상세 보기)
```

- 기존 chat-panel을 확장하여 `@mention` 기반 에이전트 직접 명령
- 에이전트 간 컨텍스트 자동 전달

---

## 5. 축 ③: 통합 IDE 경험 — "하나의 화면에서 모든 것을 한다"

### 5-1. ⌘K Command Palette 강화

**현재**: 기본적인 커맨드 팔레트
**목표**: 모든 작업을 키보드로 수행하는 IDE급 커맨드 시스템

```
⌘K 입력 예시:

> agent spawn claude "백엔드 API 개발"
> workflow run "PR Review Pipeline"
> task assign @dev-1 "로그인 버그 수정"
> meeting start review-team
> show flow-graph
> cost today
```

**구현 방안**:
- 기존 ⌘K 팔레트에 에이전트/워크플로/태스크 명령 추가
- fuzzy search + 자동완성
- 최근 사용 명령 히스토리
- 결과를 인라인으로 미리보기

### 5-2. Split-Pane Layout ✅ 완료 (P3-1)

**목표**: IDE처럼 화면을 분할하여 여러 뷰를 동시에 본다

**구현 완료**:
- **파일**: `src/hooks/useSplitPane.ts`, `src/app/SplitPaneSecondary.tsx`
- CSS flex + drag-resize (외부 라이브러리 없음)
- 분할 비율 25~75% 드래그 조정
- localStorage 자동 저장
- 헤더 `⊟` 토글 버튼 (데스크톱 전용) + `\` 단축키
- 보조 패널 뷰: Flow Graph / Heartbeat / Dashboard / CLI Usage

### 5-3. Keyboard-First UX ✅ 완료 (P3-3)

**목표**: 마우스 없이 모든 조작 가능 (vim 스타일)

**구현 완료**:

| 키 | 동작 |
|----|------|
| `Ctrl+Shift+K` | 커맨드 팔레트 |
| `Ctrl+1~8` | 뷰 직접 전환 |
| `?` | 단축키 가이드 |
| `\` | 분할 뷰 토글 |
| `n` | 커맨드 팔레트 (새 태스크) |
| `g d/t/a/f/w/s/m/r/h` | vim-style 뷰 네비게이션 (1초 타임아웃) |
| `Esc` | 모달 닫기 |

---

## 6. 구현 로드맵 — 전체 완료 현황 (2026-03-14)

### ✅ Phase 1: 시각화 기반 — 완료

> 에이전트를 "볼 수 있게" 만든다

| 작업 | 완료일 | 비고 |
|------|--------|------|
| ~~Agent Flow Graph 구현~~ | 2026-03-14 | Custom SVG, P2-1 |
| ~~Agent Timeline (Heartbeat Monitor)~~ | (기존) | HeartbeatPanel에 통합 |
| ~~Resource & Cost Dashboard~~ | 2026-03-14 | CLI Usage + P2-2 비용 추적 |

**Phase 1 결과**: 에이전트 상태·관계·비용이 실시간으로 시각화됨

### ✅ Phase 2: 에이전트 프로그래밍 — 완료

> 에이전트를 "프로그래밍할 수 있게" 만든다

| 작업 | 완료일 | 비고 |
|------|--------|------|
| ~~Visual Workflow Builder 구현~~ | 2026-03-14 | @xyflow/react v12, P3-2 |
| ~~Persona UI 완성~~ | 2026-03-14 | P2-7 |
| ~~태스크 핸드오프~~ | 2026-03-14 | P2-6 |

**Phase 2 결과**: 드래그앤드롭으로 에이전트 파이프라인 시각적 설계 가능

### ✅ Phase 3: 통합 IDE 경험 — 완료

> 모든 것을 하나로 묶는다

| 작업 | 완료일 | 비고 |
|------|--------|------|
| ~~Split-Pane Layout 구현~~ | 2026-03-14 | CSS flex + drag, P3-1 |
| ~~Keyboard-First UX 전체 적용~~ | 2026-03-14 | g+key vim-style, P3-3 |
| ~~Slack 연동 완성~~ | 2026-03-14 | conversations.history 폴링, P3-6 |

**Phase 3 결과**: 완전한 "더 큰 IDE" 경험 달성

---

## 7. 기술 선택 가이드

| 기능 | 추천 라이브러리 | 이유 |
|------|----------------|------|
| Flow Graph / Workflow Builder | `@xyflow/react` v12 | 노드 그래프 업계 표준, 뷰/편집 모드 전환 |
| Split Pane | `allotment` | 경량, VS Code와 동일한 분할 UX |
| Timeline | `vis-timeline` 또는 커스텀 Canvas | 간트 차트 스타일, 실시간 업데이트 |
| Keyboard Manager | `tinykeys` | 1KB, 조합키 지원 |
| Command Palette | `cmdk` | 기존 ⌘K에 통합 용이 |

---

## 8. 성공 기준

### Karpathy 테스트: 이 질문들에 "Yes"라고 답할 수 있는가?

- [x] **"파일 대신 에이전트를 보고 있는가?"** → Agent Flow Graph ✅
- [x] **"에이전트를 조합해서 새로운 것을 만들 수 있는가?"** → Visual Workflow Builder ✅
- [ ] **"이것은 프로그래밍처럼 느껴지는가?"** → Agent REPL (미구현) + ⌘K (기본 구현)
- [x] **"기존 IDE보다 더 높은 수준에서 작업하는가?"** → 워크플로 설계 > 코드 편집 ✅
- [x] **"이것은 IDE처럼 느껴지는가?"** → Split Pane + Keyboard-First ✅

### KPI

| 지표 | 목표 |
|------|------|
| Flow Graph → 워크플로 생성 전환율 | 30%+ |
| 키보드만으로 주요 작업 완료 가능 비율 | 90%+ |
| 평균 워크플로 설계 시간 | < 5분 |
| 에이전트 상태 인지까지 걸리는 시간 | < 3초 (그래프 확인) |

---

## 9. 결론

AgentDesk의 백엔드 엔진은 이미 "더 큰 IDE"를 지탱할 수 있는 수준이다.
부족한 것은 **그 힘을 사용자에게 전달하는 프론트엔드 경험**이다.

**3가지 킬러 기능**만 완성하면 Karpathy 비전에 도달한다:

1. **Agent Flow Graph** — 에이전트를 본다
2. **Visual Workflow Builder** — 에이전트를 프로그래밍한다
3. **Split-Pane + ⌘K** — IDE처럼 쓴다

> "더 큰 IDE"는 더 많은 기능이 아니라, **더 높은 추상화 수준에서 작업하는 경험**이다.
