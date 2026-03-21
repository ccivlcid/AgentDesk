# AgentDesk — Open Source Product Strategy & README Draft

> **The operating system for AI agents.**  
> Build, run, monitor, and debug AI agents in one unified environment.

---

## 1. 문서 목적

이 문서는 AgentDesk 프로젝트의 현재 분석 결과를 바탕으로, 오픈소스 공개 전략과 제품 방향성을 정리한 통합 초안이다.  
바로 프로젝트에 반영할 수 있도록 README 성격과 제품 전략 문서 성격을 함께 담았다.

이 문서를 기준으로 다음 작업을 진행할 수 있다.

- GitHub README 리브랜딩
- 오픈소스 공개 범위 정의
- 향후 SaaS/유료화 경계 설정
- Codex 및 AI 코딩 에이전트용 기준 문서 활용
- 제품 소개 문서 및 발표 자료의 베이스 문서화

---

## 2. 제품 한줄 정의

**AgentDesk는 AI 에이전트를 생성하고, 실행하고, 관찰하고, 디버깅하는 통합 Agent Operating System이다.**

---

## 3. 제품 비전

기존 AI 도구들은 대부분 다음 중 하나에 집중한다.

- 코드 생성
- 워크플로우 자동화
- LLM 앱 구성
- 에이전트 로직 정의

하지만 실제 운영 관점에서는 다음 문제가 남는다.

- 에이전트가 지금 무엇을 하고 있는지 실시간으로 보기 어렵다.
- 워크플로우와 실행 상태가 분리되어 있다.
- 디버깅이 로그 중심이라 직관적이지 않다.
- 멀티 에이전트 운영 환경이 통합되어 있지 않다.

AgentDesk는 이 문제를 해결하기 위해 다음 방향을 지향한다.

**Create → Run → Observe → Debug → Optimize 전체 사이클을 하나의 환경에서 제공하는 것**

즉, AgentDesk는 단순한 AI 툴이 아니라 **에이전트 운영을 위한 OS**를 목표로 한다.

---

## 4. 추천 제품 포지셔닝

현재 AgentDesk에는 다음 성격이 함께 섞여 있다.

- AI 에이전트 플랫폼
- 워크플로우 자동화 시스템
- 데스크톱 스타일 운영 UI

이 상태로는 메시지가 분산될 수 있으므로, 제품 포지션은 다음처럼 단일 문장으로 정리하는 것이 좋다.

### 추천 포지션

**Agent Operating System for Developers**

설명 문구는 다음처럼 사용할 수 있다.

> AgentDesk is a local-first agent operating system that lets developers create, run, monitor, and debug AI agents in one unified environment.

이 포지션은 다음 장점이 있다.

- 개발자 도구라는 정체성이 분명해진다.
- 일반 사용자용 SaaS와 구분된다.
- 현재 구조와 실제 구현 범위에 잘 맞는다.
- 향후 클라우드/팀 기능 확장 시도 자연스럽게 연결된다.

---

## 5. 핵심 타겟 사용자

### 5.1 1차 타겟

- AI Engineer
- Automation Engineer
- LLM Application Developer
- DevOps / Platform Engineer
- AI Agent 실험을 하는 개발자

### 5.2 현재 비추천 타겟

- 일반 소비자
- 비개발자 중심 노코드 사용자
- 기업 전체용 SaaS 사용자

현재 AgentDesk는 구조상 **개발자 중심 로컬 도구**에 가장 잘 맞는다.  
따라서 초기 공개 전략도 개발자 커뮤니티 확산에 맞추는 것이 적절하다.

---

## 6. 현재 프로젝트 분석 요약

### 6.1 강점

1. **제품 컨셉이 선명하다**  
   AgentDesk는 단순 대시보드가 아니라 에이전트 운영체제라는 강한 컨셉을 가지고 있다.

2. **UI/UX 아이덴티티가 강하다**  
   Desktop, Dock, Window, Mission Control, Command Palette 등 차별화 포인트가 명확하다.

3. **기능 범위가 넓다**  
   Agent 관리, Workflow Builder, Memory, Rules, Hooks, Skills, Chat, Dashboard 등 운영에 필요한 큰 축이 이미 보인다.

4. **개발자 관점의 확장성이 있다**  
   플러그인형 구조, 실행 엔진 확장, 멀티 에이전트 orchestration으로 발전 가능성이 높다.

5. **문서화 자산이 좋다**  
   README, OVERVIEW, 아키텍처 관련 문서 등이 존재해 오픈소스 프로젝트로 정리하기 유리하다.

### 6.2 현재 한계

1. **SQLite 기반 한계**  
   로컬/단일 사용자 환경에는 적합하지만 멀티유저, 협업, 확장성 측면에서는 제약이 크다.

2. **실행 엔진이 local process 중심**  
   child_process 기반 실행은 빠르게 시작하기에는 좋지만, retry, timeout, recovery, concurrency 관리 측면에서 한계가 있다.

3. **API 계약 일관성 부족 가능성**  
   프로젝트가 커질수록 응답 포맷과 계약 표준화가 중요해진다.

4. **보안 범위가 아직 제품형 수준으로 정리되지 않았을 가능성**  
   로컬 도구 단계에서는 괜찮지만, 향후 팀/클라우드 전환 시 인증·권한·CSRF·소켓 보안이 필수다.

5. **개념 모델 정리가 더 필요하다**  
   Agent, Project, Workflow, Memory, Rules, Hooks, Skills 등의 관계를 더 명확하게 정의하면 온보딩이 쉬워진다.

---

## 7. 현재 단계에서의 현실적 제품 정의

현재 AgentDesk는 다음처럼 정의하는 것이 가장 적절하다.

### 현재 단계 정의

**Local-first Developer Tool for Agent Runtime Control**

즉,

- 로컬에서 빠르게 실행 가능해야 하고
- 에이전트 실행 및 관찰이 핵심이며
- 개발자 생산성과 디버깅 경험을 우선해야 한다.

이 단계에서 무리하게 기업용 SaaS처럼 포장하기보다는,  
강력한 개발자 도구로 자리 잡는 것이 훨씬 유리하다.

---

## 8. 추천 오픈소스 전략

### 8.1 결론

**Open Core + Local-first 전략**을 추천한다.

즉,

- 코어 기능은 오픈소스로 공개
- 상위 협업 기능은 향후 유료/클라우드로 분리
- 개발자 확산을 먼저 만들고 수익화는 그 다음 단계로 가져간다

### 8.2 오픈소스로 공개할 영역

다음 영역은 커뮤니티 확산용 핵심이므로 오픈소스로 두는 것이 좋다.

- Agent Runtime 기본 구조
- Local execution engine
- Dashboard / Desktop UI
- Workflow Builder
- Agent 관리 기능
- Memory / Rules / Hooks / Skills 기본 구조
- 프로젝트별 컨텍스트 관리 시스템

### 8.3 향후 상용화 후보 영역

다음 영역은 장기적으로 유료 또는 클라우드 서비스로 분리하기 좋다.

- Team Workspace
- Cloud Agent Execution
- 중앙 동기화 서버
- Usage billing / 비용 분석
- Enterprise SSO / RBAC
- Organization policy / audit log
- Hosted marketplace / shared templates

이 구조를 취하면 오픈소스 확산과 수익화 포인트를 동시에 가져갈 수 있다.

---

## 9. 라이선스 방향

### 추천안 A — Apache 2.0

초기 확산을 우선한다면 Apache 2.0이 유리하다.

장점:

- 기업 도입 장벽이 낮다
- 개발자 채택이 쉽다
- 생태계 확장성이 좋다

단점:

- 경쟁사가 가져다가 SaaS화할 수 있다

### 추천안 B — AGPL

SaaS 무단 재포장을 강하게 막고 싶다면 AGPL이 유리하다.

장점:

- SaaS 형태 재배포 시 공개 압박이 있다
- 오픈소스 방어력이 높다

단점:

- 기업 도입 장벽이 높다
- 초기 확산이 느릴 수 있다

### 최종 추천

초기에는 **Apache 2.0**으로 시작하고,  
향후 클라우드/유료 기능은 별도 레이어로 설계하는 전략을 추천한다.

---

## 10. 핵심 차별화 포인트

AgentDesk가 시장에서 이겨야 하는 포인트는 기능 수가 아니라 **핵심 경험 1개**다.

### 추천 핵심 USP

**Visual + Runtime 통합 Agent Control**

즉,

- 에이전트를 실행할 수 있고
- 실시간 상태를 볼 수 있고
- 워크플로우와 런타임을 같이 보고
- 실패 원인을 UI에서 디버깅할 수 있는 것

다른 도구들과 비교하면 다음과 같이 정리할 수 있다.

- Cursor: 코드 생성 중심
- Dify: LLM 앱/플로우 중심
- n8n: 자동화 중심
- LangGraph: 에이전트 로직/오케스트레이션 중심
- AgentDesk: **실행 운영과 관찰 중심**

따라서 AgentDesk는 “또 하나의 에이전트 프레임워크”가 아니라,  
**에이전트 운영의 컨트롤 타워**로 브랜딩해야 한다.

---

## 11. 단계별 제품 로드맵

### 11.1 Phase 1 — Local Agent OS

현재 집중해야 하는 단계다.

핵심 목표:

- 로컬 실행 1분 컷
- 에이전트 생성 / 실행 / 중지
- 실시간 상태 추적
- 로그 및 결과 관찰
- workflow와 runtime의 연결

핵심 성공 기준:

- GitHub star
- 커뮤니티 관심
- 데모 영상 반응
- 개발자 실제 설치 및 실행 후기

### 11.2 Phase 2 — Agent Platform

로컬 도구에서 플랫폼으로 넘어가는 단계다.

추가 방향:

- PostgreSQL 지원
- Redis / Queue / Worker 구조
- retry / timeout / scheduling 고도화
- 멀티 에이전트 orchestration 안정화
- execution state recovery

### 11.3 Phase 3 — Team & Cloud

수익화와 조직형 사용을 위한 단계다.

추가 방향:

- Team workspace
- Cloud execution
- Shared agents / templates
- billing / usage analytics
- enterprise auth / RBAC

---

## 12. 지금 절대 하면 안 되는 것

현재 단계에서 피해야 할 방향은 다음과 같다.

### 12.1 기능만 계속 늘리기

핵심 경험이 약한 상태에서 기능이 많아지면 메시지가 흐려진다.

### 12.2 기업용 SaaS처럼 먼저 포장하기

현재 구조는 아직 팀/조직형 제품보다는 개발자용 로컬 도구에 가깝다.

### 12.3 일반 사용자 대상으로 확장하기

현재 프로젝트의 강점은 개발자 생산성과 에이전트 운영에 있다.

---

## 13. 지금 가장 먼저 해야 하는 것

### 13.1 “와 이거 된다” 데모 1개 만들기

예시:

1. 사용자가 AgentDesk에서 에이전트를 생성한다.
2. 에이전트에게 프로젝트 파일 수정 작업을 요청한다.
3. 에이전트가 작업을 실행한다.
4. 실행 상태와 로그가 UI에 실시간 반영된다.
5. 결과 파일 diff 또는 변경 사항을 바로 확인한다.

이 경험 하나가 README보다 더 중요하다.

### 13.2 1분 설치 경험 만들기

필수 조건:

- `git clone`
- `pnpm install`
- `pnpm dev`
- 바로 화면이 떠야 함

설치 경험이 복잡하면 오픈소스 확산 속도가 크게 떨어진다.

### 13.3 확장 가능한 구조 메시지 만들기

README와 문서에서 다음 메시지가 보여야 한다.

- 플러그인 가능
- 커스텀 에이전트 가능
- 실행 엔진 교체 가능
- 향후 팀 기능 확장 가능

---

## 14. README 리브랜딩 초안

아래 내용은 GitHub 메인 README에 바로 반영 가능한 초안이다.

---

# AgentDesk

> **The operating system for AI agents.**  
> Build, run, monitor, and debug AI agents in one unified environment.

## Overview

AgentDesk는 AI 에이전트를 운영하기 위한 local-first control tower이다.  
개발자는 AgentDesk를 통해 에이전트를 생성하고, 실행하고, 상태를 관찰하고, 문제를 디버깅할 수 있다.

기존 도구들이 코드, 자동화, 앱 빌드, 에이전트 로직에 각각 분리되어 있다면, AgentDesk는 이 모든 실행 운영 흐름을 하나의 환경으로 통합한다.

## Why AgentDesk

기존 AI 에이전트 개발에는 다음과 같은 문제가 있다.

- 실행 상태를 실시간으로 파악하기 어렵다
- 로그 중심 디버깅은 직관적이지 않다
- 워크플로우와 런타임이 분리되어 있다
- 멀티 에이전트 운영이 복잡하다

AgentDesk는 이를 해결하기 위해 다음을 제공한다.

- Visual agent management
- Real-time runtime observability
- Workflow + runtime integration
- Project-based context and execution control

## Core Features

### Agent Management
- 에이전트 생성 / 실행 / 중지
- 상태 추적
- 멀티 에이전트 관리

### Workflow Builder
- 시각적 플로우 구성
- 작업 연결
- 실행 흐름 관리

### Observability
- 실시간 로그
- 실행 상태 추적
- task lifecycle 관찰

### Context System
- Memory
- Rules
- Hooks
- Skills

### Developer Experience
- Desktop-style UI
- Command Palette
- Window/Dock 기반 운영 경험

## Quick Start

```bash
git clone https://github.com/ccivlcid/AgentDesk.git
cd AgentDesk
pnpm install
pnpm dev
```

## Current Positioning

AgentDesk is currently best described as a **local-first developer tool for agent runtime control**.

## Roadmap

### Phase 1 — Local Agent OS
- 로컬 실행 최적화
- 실시간 상태 관찰
- 디버깅 UX 고도화

### Phase 2 — Agent Platform
- PostgreSQL
- Queue/Worker execution
- scheduling/retry/recovery

### Phase 3 — Team & Cloud
- 협업 기능
- 클라우드 실행
- SaaS 기능 확장

## Open Source Strategy

Open source includes:

- Core runtime
- Local execution
- Dashboard UI
- Workflow Builder
- Context system basics

Future commercial layers may include:

- Team workspace
- Cloud execution
- Billing
- Enterprise security

## Philosophy

> Agents are not scripts. They are systems.

AgentDesk is designed to operate AI agents, not just launch them.

---

## 15. Codex 및 AI 코딩 에이전트용 프로젝트 방향 가이드

아래 항목은 Codex, Cursor, Claude Code, 기타 AI 에이전트에게 프로젝트 방향성을 주기 위한 기준으로 활용할 수 있다.

### 15.1 제품 방향성 규칙

1. AgentDesk는 일반 생산성 앱이 아니라 **Agent Operating System**이다.
2. 모든 기능은 에이전트의 생성, 실행, 관찰, 디버깅 흐름 강화에 기여해야 한다.
3. 기능 추가보다 **runtime observability**와 **execution reliability**를 우선한다.
4. 현재 단계의 최우선 타겟은 개발자다.
5. 설계는 local-first를 유지하되 향후 team/cloud 확장을 고려한다.

### 15.2 아키텍처 우선순위

1. 실행 엔진 안정화
2. 상태 추적 일관성 강화
3. API 계약 표준화
4. DB 추상화 계층 정리
5. 플러그인/확장 포인트 정리

### 15.3 UI/UX 우선순위

1. 실시간 실행 상태 가시성
2. 빠른 디버깅 흐름
3. 에이전트 제어 동선 단순화
4. desktop metaphor 유지
5. 정보 밀도와 직관성 균형 유지

### 15.4 개발 시 금지 방향

1. 목적 없는 기능 추가
2. 일반 사용자용 소비자 앱 방향 전환
3. SaaS 기능을 코어 아키텍처보다 먼저 우선하는 것
4. 런타임 안정성보다 시각 효과를 우선하는 것

---

## 16. 최종 전략 요약

### 제품 정의

AgentDesk는 **AI 에이전트를 위한 운영체제**다.

### 현재 전략

AgentDesk는 **local-first 오픈소스 개발자 도구**로 포지셔닝해야 한다.

### 오픈소스 전략

코어는 공개하고, 협업/클라우드/엔터프라이즈는 장기적으로 분리한다.

### 핵심 차별화

**Visual + Runtime 통합 기반 Agent Control Tower**

### 지금 가장 중요한 일

기능 추가가 아니라 **“실행되고, 보이고, 디버깅되는 경험”**을 완성하는 것이다.

---

## 17. 바로 다음 추천 작업

1. GitHub README 최종본 반영
2. 데모 시나리오 1개 확정
3. 실행 엔진 구조 정리 문서 작성
4. PostgreSQL/Queue 전환 로드맵 작성
5. Contribution Guide 및 Issue Template 정리

---

## 18. 마무리 문장

AgentDesk가 잘 되려면 단순히 기능이 많은 프로젝트가 되어서는 안 된다.  
반드시 **에이전트를 운영하는 경험이 가장 뛰어난 오픈소스 도구**가 되어야 한다.

그 방향이 명확할수록 README, 데모, 코드 구조, 커뮤니티 확산이 모두 쉬워진다.
