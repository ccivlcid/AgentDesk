<div align="center">

# AgentDesk

**AI 에이전트 팀을 위한 프로젝트 OS**

여러 AI 에이전트를 동시에 실행·모니터링·제어 — macOS 스타일 데스크톱 하나로.

[English](README.md) · [개요](#overview) · [기능](#key-features) · [스크린샷](#스크린샷) · [시작하기](#getting-started)

</div>

<p align="center">
  <img src="docs/screen/desktop-01.png" alt="AgentDesk — macOS 스타일 데스크톱" width="920" />
</p>
<p align="center"><sub><strong>한 화면에서</strong> 에이전트 실행·출력 스트리밍·작업 제어까지.</sub></p>

---

## Overview

AgentDesk는 AI 에이전트 팀을 위한 오픈소스 자체 호스팅 운영체제입니다. 에이전트는 런타임 프로세스이고, 프로젝트는 에이전트가 동작하는 OS이며, UI는 그 OS의 제어판입니다.

## Core Philosophy

AgentDesk는 "AI 에이전트가 실제로 일하는 장면을 개발자가 실시간으로 볼 수 있어야 한다"는 원칙을 따릅니다. 어떤 태스크가 실행 중인지, 어떤 규칙이 적용됐는지, 어디서 실패했는지 — 모든 것이 단일 화면에서 투명하게 드러납니다. 외부 CLI에 위임하는 블랙박스 구조 대신 LLM 호출부터 툴 사용, 결과 저장, 스트리밍 출력까지 전 과정을 직접 실행하고 기록합니다.

---

## Key Features

<table>
<tr>
<td valign="top" width="50%">

### 🚀 에이전트 주도 킥오프
- LLM이 목표·디렉티브를 읽고 3~7개 태스크 자동 계획
- 역할명 자유 지정 — PM, QA, 백엔드, 디자이너 등 무엇이든
- 자동 배정 버튼으로 에이전트를 한 번에 채우기
- 정보 부족 시 질문 한 번으로 확인 후 진행
- 계획 완료 직후 첫 번째 태스크 자동 실행

</td>
<td valign="top" width="50%">

### 📄 프로젝트 디렉티브
- 모든 에이전트 프롬프트에 주입되는 Markdown 행동 지침
- 10가지 내장 템플릿: MVP · 풀스택 · 모바일 · API/백엔드 · 프론트엔드 · AI/ML · 오픈소스 · DevOps · 엔터프라이즈 · 리서치
- 직접 편집하거나 `.md` 파일을 임포트해 즉시 활용

</td>
</tr>
<tr>
<td valign="top" width="50%">

### ⚡ 에이전트 런타임 엔진
- Anthropic Claude API 기반 내장 LLM 실행 엔진
- 파일 읽기·쓰기·검색을 포함한 툴 사용 루프
- WebSocket으로 CLI 윈도우에 실시간 토큰 스트리밍
- 런별 실행 이력 · 토큰 수 · 비용 추적
- `My keys, my models` — 데이터 프록싱 없음

</td>
<td valign="top" width="50%">

### 🖥️ 실시간 모니터링
- 태스크 보드: Kanban · Gantt · DAG 뷰
- 플로우 그래프: 에이전트↔태스크 라이브 다이어그램
- 에이전트 상세: 상태 · 실행 태스크 · 규칙 · 메모리 · 훅
- 알림 센터: 유형·날짜별 그룹화 + 빠른 처리

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 📚 지식 라이브러리
- Skills · Rules · Memory · Hooks
- 글로벌 · 부서 · 에이전트 · 프로젝트 단위 범위 지정
- 우선순위: 프로젝트 > 에이전트 > 부서 > 글로벌
- `/learn` 엔드포인트로 완료 태스크에서 자동 추출

</td>
<td valign="top" width="50%">

### ⚙️ 워크플로우 자동화
- 시각적 드래그앤드롭 파이프라인 빌더
- Cron 기반 스케줄러로 반복 실행
- 7가지 내장 팩: 개발 · 리서치 · 소설 · 리포트 · 영상 · 롤플레이 · 자산 관리

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 💬 멀티 에이전트 채팅
- 개별 DM + 전체 브로드캐스트 채널
- Telegram · Discord · Slack 게이트웨이 연동
- `$` 접두사 → 디렉티브 · `!` 접두사 → 태스크 생성
- Decision Inbox: 태스크 중 의사결정 요청 전달

</td>
<td valign="top" width="50%">

### 🧩 커스텀 위젯 & 분석
- 자연어 설명 → AI가 TypeScript 위젯 자동 생성 (esbuild + iframe)
- 7가지 내장 위젯 템플릿
- 성과 대시보드: 성공률 · 완료 시간 · 일별 스파크라인
- CSV / JSON 내보내기

</td>
</tr>
</table>

---

## 스크린샷

<p align="center"><sub>이미지를 클릭하면 저장소에서 원본 파일을 열 수 있습니다.</sub></p>

<table>
<tr>
<td width="50%" valign="top" align="center"><strong>데스크톱 &amp; 작업 공간</strong><br/><a href="docs/screen/desktop-02.png"><img src="docs/screen/desktop-02.png" width="100%" alt="데스크톱"/></a></td>
<td width="50%" valign="top" align="center"><strong>멀티 윈도우</strong><br/><a href="docs/screen/desktop-03.png"><img src="docs/screen/desktop-03.png" width="100%" alt="여러 창"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>프로젝트 킥오프</strong><br/><a href="docs/screen/project-create-01.png"><img src="docs/screen/project-create-01.png" width="100%" alt="프로젝트 생성"/></a></td>
<td width="50%" valign="top" align="center"><strong>디렉티브 &amp; 계획</strong><br/><a href="docs/screen/project-create-02.png"><img src="docs/screen/project-create-02.png" width="100%" alt="디렉티브"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>CLI 실시간</strong><br/><a href="docs/screen/cli-window-01.png"><img src="docs/screen/cli-window-01.png" width="100%" alt="CLI"/></a></td>
<td width="50%" valign="top" align="center"><strong>CLI 세션</strong><br/><a href="docs/screen/cli-window-02.png"><img src="docs/screen/cli-window-02.png" width="100%" alt="CLI 실행"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>라이브러리</strong><br/><a href="docs/screen/library-01.png"><img src="docs/screen/library-01.png" width="100%" alt="스킬·규칙·메모리·훅"/></a></td>
<td width="50%" valign="top" align="center"><strong>지식 범위</strong><br/><a href="docs/screen/knowledge-01.png"><img src="docs/screen/knowledge-01.png" width="100%" alt="지식"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>위젯</strong><br/><a href="docs/screen/widget-01.png"><img src="docs/screen/widget-01.png" width="100%" alt="위젯"/></a></td>
<td width="50%" valign="top" align="center"><strong>커맨드 팔레트</strong><br/><a href="docs/screen/command-palette.png"><img src="docs/screen/command-palette.png" width="100%" alt="검색"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>워크플로 빌더</strong><br/><a href="docs/screen/workflow-builder.png"><img src="docs/screen/workflow-builder.png" width="100%" alt="워크플로"/></a></td>
<td width="50%" valign="top" align="center"><strong>로컬 LLM</strong><br/><a href="docs/screen/local-llm.png"><img src="docs/screen/local-llm.png" width="100%" alt="로컬 LLM"/></a></td>
</tr>
</table>

<details>
<summary><strong>추가</strong> — 데스크톱·프로젝트 단계·이미지 스튜디오·참고 JPG</summary>

<br/>

| | |
|:---:|:---:|
| <a href="docs/screen/widget-02.png"><img src="docs/screen/widget-02.png" width="380" alt="위젯 2"/></a> | <a href="docs/screen/widget-03.png"><img src="docs/screen/widget-03.png" width="380" alt="위젯 3"/></a> |
| <a href="docs/screen/desktop-04.png"><img src="docs/screen/desktop-04.png" width="380" alt="데스크톱 4"/></a> | <a href="docs/screen/desktop-05.png"><img src="docs/screen/desktop-05.png" width="380" alt="데스크톱 5"/></a> |
| <a href="docs/screen/desktop-06.png"><img src="docs/screen/desktop-06.png" width="380" alt="데스크톱 6"/></a> | <a href="docs/screen/project-create-03.png"><img src="docs/screen/project-create-03.png" width="380" alt="프로젝트 3단계"/></a> |

<p align="center"><a href="docs/screen/image-studio.png"><img src="docs/screen/image-studio.png" width="560" alt="이미지 스튜디오"/></a><br/><sub><strong>이미지 스튜디오</strong></sub></p>

| | |
|:---:|:---:|
| <a href="docs/screen/cli-setup.jpg"><img src="docs/screen/cli-setup.jpg" width="380" alt="CLI 설치"/></a> | <a href="docs/screen/cli-session-01.jpg"><img src="docs/screen/cli-session-01.jpg" width="380" alt="CLI 세션 1"/></a> |
| <a href="docs/screen/cli-session-02.jpg"><img src="docs/screen/cli-session-02.jpg" width="380" alt="CLI 세션 2"/></a> | <a href="docs/screen/agent-persona.jpg"><img src="docs/screen/agent-persona.jpg" width="380" alt="페르소나"/></a> |
| <a href="docs/screen/wallpaper-change.jpg"><img src="docs/screen/wallpaper-change.jpg" width="380" alt="배경"/></a> | <a href="docs/screen/flow-routing.jpg"><img src="docs/screen/flow-routing.jpg" width="380" alt="플로우"/></a> |

<p align="center"><a href="docs/screen/desktop-snapshot-2026-03-19.jpg"><img src="docs/screen/desktop-snapshot-2026-03-19.jpg" width="560" alt="스냅샷"/></a><br/><sub><strong>데스크톱 스냅샷</strong> (2026-03-19)</sub></p>

</details>

---

## Technical Philosophy

| | |
|---|---|
| **투명성** | 토큰 단위 실시간 확인 — 외부 블랙박스 없음 |
| **자체 호스팅** | SQLite 기반, 외부 클라우드 서비스 불필요 |
| **내 키, 내 모델** | API 키 직접 연결 — 데이터가 프록시를 거치지 않음 |
| **로컬 우선** | Electron 빌드로 네이티브 데스크톱 앱 패키징 지원 |
| **열린 구조** | Apache 2.0, 단일 로컬 프로세스, 벤더 종속 없음 |

---

## Getting Started

```bash
git clone <repo-url> && cd AgentDesk
pnpm install
cp .env.example .env   # SESSION_SECRET 설정
pnpm setup
pnpm dev
```

**http://localhost:8800** 에서 실행됩니다. Node.js 22+, pnpm 10+ 필요.

```
1. Settings → API        API 프로바이더 추가 (Claude / OpenAI / Gemini)
2. Agent Manager         부서 생성 → 에이전트 채용
3. New Project           유형 선택 → 디렉티브 편집 → 에이전트 배정
4. Kickoff               태스크 자동 계획 → 첫 번째 태스크 즉시 시작
5. Monitor               태스크 보드 · CLI 윈도우 · 플로우 그래프
```

---

## Tech Stack

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | React 19 · TypeScript · Vite · Tailwind CSS · Zustand |
| 백엔드 | Node.js · Express · tsx |
| 데이터베이스 | SQLite (`better-sqlite3`) · 버전 관리 마이그레이션 |
| 실시간 | WebSocket |
| 플로우 다이어그램 | `@xyflow/react` |
| 테스팅 | Vitest · Playwright |
| 데스크톱 | Electron (선택) |

---

## Use Cases

여러 AI 에이전트를 병렬 실행하며 전체 진행 상황을 한 화면에서 추적하려는 개발자, 에이전트의 사고 과정과 툴 사용을 실시간으로 관찰하고 싶은 팀, 공유 규칙·메모리·훅으로 에이전트 행동을 일관되게 제어하려는 조직, 그리고 AI 에이전트 인프라를 완전히 자체 호스팅으로 운영하려는 사용자에게 적합합니다.

---

<div align="center">

Apache 2.0 · 자체 호스팅 · [English](README.md)

</div>
