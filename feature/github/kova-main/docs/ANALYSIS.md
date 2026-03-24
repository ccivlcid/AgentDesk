# Kova 프로젝트 분석 문서

> 분석일: 2026-03-24
> 소스: `feature/github/kova-main/`

---

## 1. 프로젝트 개요

**Kova**는 AI 코딩 에이전트(Claude Code, Codex CLI, Gemini CLI) 사용자를 위한 **macOS 네이티브 터미널 워크스페이스**다.

핵심 가치:
- **AI 에이전트 인식 Git 그래프** — `Co-Authored-By` 트레일러 기반으로 AI 작성 커밋을 감지해 배지로 시각화 (현재 구현은 Claude 중심 판별)
- **tmux 기반 터미널** — 스크롤백 버퍼를 WebView가 아닌 tmux 서버에 보관 → 메모리 효율적
- **Worktree 관리** — 에이전트 워크트리 생성/삭제/머지를 GUI로 처리
- **Hook 자동 주입** — 에이전트 활동을 로컬 HTTP 서버로 수신해 알림 제공

---

## 2. 기술 스택

| 레이어 | 기술 | 용도 |
|--------|------|------|
| 프레임워크 | **Tauri v2** | Rust + WebView 네이티브 앱 |
| 프론트엔드 | React 19 + TypeScript + Zustand | UI, 상태관리 |
| 스타일 | Tailwind CSS v4 + CVA | 컴포넌트 스타일링 |
| 터미널 | xterm.js 6.0 + tauri-plugin-pty | PTY 에뮬레이션 |
| Git 그래프 | d3-shape + Motion (`motion/react`) | 시각화 + 애니메이션 |
| 코드 에디터 | CodeMirror 6 | 인라인 파일 편집 (60+ 언어) |
| 백엔드 | Rust 2021 | Git 연산, tmux IPC, 이벤트 서버 |
| DB | SQLite (rusqlite, bundled) | 프로젝트 메타, 알림, 설정 |
| 패키지 매니저 | Bun | 프론트엔드 의존성 |
| 알림 | osascript + alerter | macOS 네이티브 알림 |
| HTTP 서버 | tiny_http | Hook 이벤트 수신 (127.0.0.1) |

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────────┐
│           React 19 UI (TypeScript)              │
│  Terminal │ Git Graph │ Files │ SSH │ Notify    │
├─────────────────────────────────────────────────┤
│          Tauri v2 IPC Bridge (async)            │
├─────────────────────────────────────────────────┤
│              Rust Services                      │
│  ┌───────────────────────────────────────────┐  │
│  │ • Project CRUD                            │  │
│  │ • Git ops (graph, commits, staging)       │  │
│  │ • tmux (sessions, panes, windows)         │  │
│  │ • Agent hook injection/removal            │  │
│  │ • Event server (127.0.0.1 HTTP)           │  │
│  │ • SSH + remote tmux                       │  │
│  │ • File operations                         │  │
│  │ • Notifications (DB + native)             │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│   SQLite (.kova/kova.db) │ tmux CLI │ Events   │
└─────────────────────────────────────────────────┘
```

### Hook 동작 흐름

```
AI Agent 작업 완료
  → HTTP POST 127.0.0.1:{PORT}/hook?project={path}&type={event}
    → Event Server 수신
      → Tauri event emit
        → Notification Store
          → macOS 네이티브 알림
```

---

## 4. 핵심 기능

### 4-1. 터미널 (xterm.js + tmux)
- xterm.js 6.0 DOM 렌더러 (canvas 비호환)
- **스크롤백 버퍼 없음** — tmux 서버에 히스토리 보관, WebView 메모리 최소화
- 분할 패인, 다중 윈도우, 세션 유지
- 한국어 IME 지원 + sleep/wake 복구 (22개 이상 안정성 패치)
- 12가지 다크 테마 (Dracula, Nord, Catppuccin, Gruvbox 등)
- 9가지 폰트 프리셋 (JetBrains Mono, Cascadia Code, Iosevka 등)

### 4-2. AI-Aware Git 그래프
- `Co-Authored-By: Claude` 기반 AI 커밋 감지 → `[AI]` 배지 표시
- Worktree ↔ 브랜치 양방향 하이라이팅
- 무한 스크롤 + 가상 렌더링 (대형 레포 대응)
- 브랜치 hover → 다른 레인 dimming + glow 효과

### 4-3. 커밋 상세 패널
- 라인별 구문 하이라이팅 diff 뷰어
- AI 커밋 감지 (현재 `Co-Authored-By: Claude` 중심)
- 파일별 접기/펼치기
- 더블클릭으로 패널 리사이즈 (40vh ↔ 80vh)

### 4-4. 인라인 Git 연산
- **Stage/Unstage/Discard** — 터미널 없이 파일 스테이징
- **CommitBox** — subject (72자) + body, `Cmd+Enter` 커밋
- **인라인 터미널** — 250px 고정 높이 xterm.js
- 커밋 후 Git 그래프 자동 새로고침

### 4-5. 에이전트 워크트리 관리
- "New Agent Task" 대화상자 → 워크트리 + tmux 윈도우 원클릭 생성
- `claude --worktree <name>` 자동 실행
- 워크트리 액션: Open Terminal, Push Branch, Merge to main, Delete

### 4-6. 멀티 에이전트 지원

| 에이전트 | Hook 위치 | 방식 |
|----------|----------|------|
| Claude Code | `.claude/settings.local.json` (프로젝트 로컬) | Hook 주입 |
| Codex CLI | `~/.codex/config.toml` (글로벌) | `notify` 주입 + pane monitor 보완 |
| Gemini CLI | `~/.gemini/settings.json` (글로벌) | Hook 주입 |

### 4-7. SSH 리모트
- SSH로 원격 머신의 터미널 + Git 그래프 동일 UX 제공
- UI에서 SSH 연결 생성/테스트

### 4-8. 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Cmd+K` | Command Palette (Spotlight 검색) |
| `Cmd+P` | 파일 검색 (fuzzy match) |
| `Cmd+N` | 새 프로젝트 |
| `Cmd+/` | 단축키 도움말 |
| `Cmd+1-9` | 프로젝트 전환 |

### 4-9. 파일 탐색기 + 에디터
- 가상화 파일 트리 (10K+ 파일 대응)
- CodeMirror 6 인라인 에디터
- `Cmd+Click` import 경로 탐색
- regex + 콘텐츠 검색

### 4-10. 알림 센터
- DB 기반 알림 히스토리 (기본 7일 보관)
- macOS 네이티브 알림 (banner/alert)
- Rate limiting으로 스팸 방지

---

## 5. 개발 현황

**버전:** 0.1.0 (beta)
**배포:** Homebrew tap + DMG
**플랫폼:** macOS 13+ (Ventura), Intel + Apple Silicon

### 완료된 단계
- Phase 1: 워크트리 ↔ 터미널 탐색 + 브랜치 하이라이팅
- Phase 2: 커밋 상세 패널 + 에이전트 어트리뷰션 + 변경 사항 뷰어
- Phase 2.5: Working tree 변경 UI
- Phase 2.6: 인라인 커밋 연산 (stage, unstage, discard, commit)
- Phase 3.1: "New Agent Task" 버튼
- Phase 3.3: 워크트리 관리 (3/4 완료)

### 미완료
- Phase 3.2: 커밋 컨텍스트 메뉴 (revert, cherry-pick)
- Phase 3.3: "Merge to main" 워크플로우 완성
- Phase 4: GitHub/GitLab 연동 (PR 배지, PR 생성)
- Phase 4.2: 에이전트별 커밋 검색/필터

---

## 6. AgentDesk와의 비교

| 항목 | Kova | AgentDesk |
|------|------|-----------|
| **목적** | 개발자 로컬 터미널 + AI Git 추적 | AI 에이전트 오케스트레이션 OS |
| **대상 사용자** | Claude Code 쓰는 개인 개발자 | 멀티 에이전트 프로젝트 관리자 |
| **프레임워크** | Tauri v2 (Rust + WebView) | Electron + Express + SQLite |
| **UI 패러다임** | macOS 네이티브 앱 | macOS 데스크톱 OS 메타포 |
| **Git 초점** | 비주얼 Git 그래프, 에이전트 커밋 추적 | 태스크 관리, 코드 리뷰 |
| **에이전트 타입** | Claude Code, Codex, Gemini (3종) | PM, Senior, Junior (역할 기반) |
| **모니터링** | Hook 기반 실시간 알림 | LLM 기반 리뷰, 성과 지표 |
| **터미널** | 내장 xterm.js + tmux (핵심 기능) | 선택적 터미널 패널 |
| **스코프** | 개발자 중심 (로컬 작업) | PM 중심 (팀 워크플로우) |

### 관계 요약

**상호 보완적** — Kova는 개발자가 AI 에이전트와 **로컬에서 코딩**하는 도구, AgentDesk는 **팀 레벨에서 다수 에이전트를 오케스트레이션**하는 도구. 경쟁이 아니라 레이어가 다르다.

---

## 7. 코드 품질 특징

- **Rust**: `unwrap()` 금지, parameterized SQL, 타입 안전 IPC
- **TypeScript**: 전반적으로 엄격한 타입 지향 (`any`/`as` 최소화 목표, 일부 실사용 캐스팅 존재)
- **보안**: Event server 127.0.0.1 전용, atomic 파일 쓰기, path traversal 검증
- **안정성**: 한국어 IME 22건 이상 수정, sleep/wake 복구
- **빌드**: `bun tauri dev` (Vite HMR + Tauri 동시 실행)

---

## 8. 빌드 & 실행

```bash
# 요구사항: rustc 1.75+, Bun 1.0+, tmux 3.0+, macOS 13+

bun install
bun tauri dev          # 개발 서버
cargo clippy -- -D warnings  # 린트
bun run test           # 테스트
```

---

## 9. 라이선스

MIT License
