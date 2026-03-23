# Repo Store — 앱 실행 엔진 설계

> Repo Store에서 다운로드한 저장소를 "앱"처럼 분석 → 설치 → 실행하는 흐름.
> 일반 프로젝트(킥오프 → 태스크 분해)와 완전히 다른 라이프사이클.

---

## 1. 핵심 구분: 프로젝트 vs 앱

| | 일반 프로젝트 | Repo Store 앱 |
|---|---|---|
| **생성** | 프로젝트 생성 모달 | Repo Store 다운로드 |
| **플로우** | 킥오프 → 태스크 분해 → 에이전트 실행 | 분석 → 설치 → 실행 |
| **업무보드** | 표시됨 | **표시 안 됨** |
| **바탕화면** | 폴더 아이콘 | 앱 아이콘 (초록 다운로드) |
| **더블클릭** | 프로젝트 폴더 창 | **앱 러너 창** |
| **DB 구분** | `project_type = 'project'` (기본값) | `project_type = 'app'` |

### DB 변경

```sql
ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'project';
-- 'project' = 일반 프로젝트 (킥오프/태스크)
-- 'app'     = Repo Store 앱 (분석/설치/실행)
```

### 업무보드 필터

업무보드에서 `project_type = 'app'`인 프로젝트는 **목록에서 제외**.

---

## 2. 앱 상태 머신

```
다운로드 완료
    │
    ▼
[downloaded]  ←── 바탕화면 아이콘 생성
    │
    ├── "분석" 클릭 ───────────► [analyzing] → [analyzed]
    │                                              │
    └── "설치 & 실행" 클릭 ──► [installing] ──► [installed]
                                                   │
                                               [running] ←→ [stopped]
```

| 상태 | 설명 | UI |
|------|------|-----|
| `downloaded` | 클론만 완료, 아무것도 안 한 상태 | "분석" + "설치 & 실행" 버튼 |
| `analyzing` | 에이전트가 코드 구조 분석 중 | 스피너 + 실시간 로그 |
| `analyzed` | 분석 완료, 결과 표시 | 분석 보고서 + "설치 & 실행" 버튼 |
| `installing` | 의존성 설치 중 | 프로그레스 + 터미널 출력 |
| `installed` | 설치 완료, 실행 대기 | "실행" 버튼 |
| `running` | 실행 중 | 포트 표시 + "중지" + "브라우저에서 열기" |
| `stopped` | 실행 중지 | "재시작" 버튼 |

### DB 저장

```sql
ALTER TABLE projects ADD COLUMN app_status TEXT DEFAULT NULL;
-- NULL (일반 프로젝트) | 'downloaded' | 'analyzed' | 'installed' | 'running' | 'stopped'

ALTER TABLE projects ADD COLUMN app_analysis TEXT DEFAULT NULL;
-- JSON: { type, framework, language, run_command, install_command, port, warnings }

ALTER TABLE projects ADD COLUMN app_port INTEGER DEFAULT NULL;
-- 사용자가 지정한 포트 (NULL이면 자동 감지)

ALTER TABLE projects ADD COLUMN app_pid INTEGER DEFAULT NULL;
-- 실행 중인 프로세스 PID (중지/재시작용)
```

---

## 3. 앱 러너 창 (AppRunnerWindow)

바탕화면 앱 아이콘 더블클릭 시 열리는 창.

### 3-1. 첫 실행 (downloaded 상태)

```
┌─ MoneyPrinterV2 ──────────────────────────────────────────┐
│                                                            │
│  ● GitHub: FujiwaraChoki/MoneyPrinterV2                    │
│  ★ 20k   Python   ~/Projects/MoneyPrinterV2               │
│                                                            │
│  ┌─ README.md ────────────────────────────────────────┐    │
│  │ # MoneyPrinterV2                                   │    │
│  │ Automate the process of making money online.       │    │
│  │                                                    │    │
│  │ ## Installation                                    │    │
│  │ ```                                                │    │
│  │ pip install -r requirements.txt                    │    │
│  │ cp .env.example .env                               │    │
│  │ ```                                                │    │
│  │ ## Usage                                           │    │
│  │ ```                                                │    │
│  │ python main.py                                     │    │
│  │ ```                                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────┐  ┌─────────────────────────────────┐     │
│  │              │  │                                 │     │
│  │   분석       │  │   설치 & 실행                    │     │
│  │              │  │                                 │     │
│  │  에이전트가   │  │  에이전트가 README를 읽고        │     │
│  │  코드 구조    │  │  의존성 설치 → 실행까지          │     │
│  │  파악 후      │  │  자동으로 진행합니다             │     │
│  │  보고서 작성  │  │                                 │     │
│  │              │  │                                 │     │
│  └──────────────┘  └─────────────────────────────────┘     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3-2. 분석 결과 (analyzed 상태)

```
┌─ MoneyPrinterV2 — 분석 완료 ──────────────────────────────┐
│                                                            │
│  ┌─ 분석 결과 ────────────────────────────────────────┐    │
│  │                                                    │    │
│  │  타입       Python CLI 앱                          │    │
│  │  프레임워크  Flask + Selenium                       │    │
│  │  의존성     requirements.txt (23개 패키지)          │    │
│  │  실행 명령   python main.py                        │    │
│  │  기본 포트   5000                                  │    │
│  │                                                    │    │
│  │  주의 사항:                                        │    │
│  │  - .env 파일에 OPENAI_API_KEY 설정 필요            │    │
│  │  - Chrome 브라우저 설치 필요 (Selenium)             │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  포트  [ 5000  ]                                           │
│                                                            │
│  [설치 & 실행]                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3-3. 설치 & 실행 중 (installing → running)

```
┌─ MoneyPrinterV2 — 실행 중 ────────────────────────────────┐
│                                                            │
│  ● 실행 중   http://localhost:5000   PID: 12345            │
│                                                            │
│  ┌─ 터미널 ──────────────────────────────────────────┐     │
│  │ [1/3] 의존성 설치 중...                            │     │
│  │ $ pip install -r requirements.txt                  │     │
│  │ Installing collected packages: flask, selenium...  │     │
│  │ Successfully installed 23 packages                 │     │
│  │                                                    │     │
│  │ [2/3] 환경 설정...                                 │     │
│  │ $ cp .env.example .env                             │     │
│  │                                                    │     │
│  │ [3/3] 실행...                                      │     │
│  │ $ PORT=5000 python main.py                         │     │
│  │ * Running on http://127.0.0.1:5000                 │     │
│  │ * Press CTRL+C to quit                             │     │
│  │                                                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                            │
│  [브라우저에서 열기]  [중지]  [재시작]  [터미널 확장]        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3-4. 재방문 (installed/stopped 상태)

```
┌─ MoneyPrinterV2 ──────────────────────────────────────────┐
│                                                            │
│  ● 설치 완료   Python   포트: 5000                         │
│                                                            │
│  포트  [ 5000  ]  (사용 가능)                              │
│                                                            │
│  [실행]  [분석 다시 보기]  [터미널]  [삭제]                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 4. 포트 관리

### 4-1. 자동 감지

에이전트가 분석 시 포트를 감지하는 우선순위:

1. README에서 `localhost:XXXX` 패턴 추출
2. 소스코드에서 `.listen(PORT)`, `--port`, `EXPOSE` 등 패턴 스캔
3. `package.json`의 `scripts.dev`에서 `--port` 옵션 확인
4. 감지 실패 시 기본값 3000 할당

### 4-2. 충돌 방지

```
실행 전:
  1. 지정된 포트가 사용 중인지 확인 (net.createServer 또는 netstat)
  2. 사용 중이면 → +1 씩 올려서 빈 포트 찾기 (최대 10회)
  3. 빈 포트를 찾으면 → UI에 "5000 사용 중 → 5001로 변경됨" 알림
  4. 사용자가 원하면 직접 포트 입력 가능
```

### 4-3. 포트 주입 방식

에이전트가 프로젝트 타입에 따라 적절한 방식으로 포트를 주입:

| 타입 | 주입 방식 |
|------|----------|
| Node.js | `PORT=5001 npm run dev` 또는 `--port 5001` |
| Python (Flask) | `FLASK_RUN_PORT=5001 flask run` |
| Python (기타) | `PORT=5001 python main.py` |
| Docker | `-p 5001:내부포트` 매핑 |
| Go | 환경변수 또는 `-port` 플래그 |
| 기타 | 환경변수 `PORT=5001` (범용) |

---

## 5. 에이전트 분석 프롬프트

### 분석 태스크

```
이 GitHub 저장소를 분석하세요.

프로젝트 경로: {project_path}

다음 항목을 JSON으로 응답하세요:
{
  "type": "webapp|cli|library|api|ml|other",
  "language": "python|javascript|typescript|go|rust|java|...",
  "framework": "flask|django|express|nextjs|fastapi|...|null",
  "install_command": "pip install -r requirements.txt",
  "run_command": "python main.py",
  "default_port": 5000,
  "env_vars": ["OPENAI_API_KEY", "DATABASE_URL"],
  "warnings": ["Chrome 설치 필요 (Selenium)", ".env 파일 설정 필요"],
  "summary": "AI를 활용한 자동 수익화 도구. Flask 웹 서버 + Selenium 자동화."
}

README.md, package.json, requirements.txt, Dockerfile, Makefile 등을 참고하세요.
포트를 찾을 수 없으면 default_port: null로 설정하세요.
```

### 설치 & 실행 태스크

```
이 프로젝트를 설치하고 실행하세요.

프로젝트 경로: {project_path}
분석 결과: {app_analysis JSON}
지정 포트: {app_port}

단계:
1. 의존성 설치: {install_command} 실행
2. 환경 설정: .env.example 있으면 .env로 복사, 필요한 환경변수 확인
3. 실행: PORT={app_port} {run_command}
4. 서버가 정상 기동되면 URL을 보고하세요

실행 중 에러가 발생하면 에러 메시지를 분석하고 해결을 시도하세요.
최대 3번까지 재시도할 수 있습니다.
```

---

## 6. 프로세스 관리

### 6-1. 서버 측 (ProcessManager)

```typescript
// server/modules/app-runner/process-manager.ts

interface RunningApp {
  projectId: string;
  pid: number;
  port: number;
  command: string;
  startedAt: number;
}

class AppProcessManager {
  private apps = new Map<string, RunningApp>();

  start(projectId: string, command: string, port: number, cwd: string): RunningApp;
  stop(projectId: string): void;
  restart(projectId: string): RunningApp;
  getStatus(projectId: string): RunningApp | null;
  listAll(): RunningApp[];
  stopAll(): void;  // 서버 종료 시 호출
}
```

### 6-2. 프로세스 종료

Windows에서는 `taskkill /F /T /PID <pid>` 사용 (프로세스 트리 전체 종료).
Unix에서는 `kill -TERM <pid>` → 5초 대기 → `kill -9 <pid>`.

### 6-3. 서버 재시작 시

AgentDesk 서버 재시작 시 모든 앱 프로세스는 종료됨.
DB에 `app_status = 'running'`인 프로젝트는 서버 시작 시 `'stopped'`으로 리셋.

---

## 7. API 설계

### `POST /api/apps/:projectId/analyze`

에이전트 태스크를 생성하여 프로젝트를 분석한다.

```typescript
// Response
{
  ok: true,
  task_id: string  // 에이전트 태스크 ID (진행 상황 추적용)
}
```

### `POST /api/apps/:projectId/run`

에이전트 태스크를 생성하여 설치 + 실행한다.

```typescript
// Request
{ port?: number }

// Response
{
  ok: true,
  task_id: string
}
```

### `POST /api/apps/:projectId/stop`

실행 중인 앱을 중지한다.

```typescript
// Response
{ ok: true }
```

### `POST /api/apps/:projectId/restart`

앱을 재시작한다.

```typescript
// Request
{ port?: number }

// Response
{ ok: true, pid: number, port: number }
```

### `GET /api/apps/:projectId/status`

앱 실행 상태를 조회한다.

```typescript
// Response
{
  ok: true,
  status: "downloaded" | "analyzing" | "analyzed" | "installing" | "running" | "stopped",
  analysis: AppAnalysis | null,
  port: number | null,
  pid: number | null,
  url: string | null  // "http://localhost:5000"
}
```

### `GET /api/apps/running`

현재 실행 중인 모든 앱 목록.

```typescript
// Response
{
  ok: true,
  apps: Array<{ project_id, name, port, pid, url, started_at }>
}
```

---

## 8. 파일 구조

```
server/
  modules/
    app-runner/
      process-manager.ts    ← 앱 프로세스 시작/중지/재시작
      port-utils.ts         ← 포트 충돌 감지, 빈 포트 찾기
      register-routes.ts    ← /api/apps/* 라우트 등록

src/
  components/
    app-runner/
      AppRunnerWindow.tsx   ← 앱 러너 메인 창
      AppAnalysisPanel.tsx  ← 분석 결과 표시 패널
      AppTerminalPanel.tsx  ← 터미널 출력 패널
      AppControlBar.tsx     ← 실행/중지/재시작/포트 설정 바
```

---

## 9. 구현 순서

| 단계 | 작업 | 우선순위 |
|------|------|---------|
| 1 | DB 마이그레이션: `project_type`, `app_status`, `app_analysis`, `app_port`, `app_pid` | 필수 |
| 2 | Repo Store에서 `createProject` 시 `project_type = 'app'` 설정 | 필수 |
| 3 | 업무보드에서 `project_type = 'app'` 필터링 (목록에서 제외) | 필수 |
| 4 | `AppRunnerWindow` 기본 틀 (README 표시 + 분석/실행 버튼) | 필수 |
| 5 | 바탕화면 앱 아이콘 더블클릭 → `AppRunnerWindow` 열기 | 필수 |
| 6 | `POST /api/apps/:id/analyze` — 에이전트 분석 태스크 | 필수 |
| 7 | `POST /api/apps/:id/run` — 에이전트 설치+실행 태스크 | 필수 |
| 8 | `process-manager.ts` — 프로세스 시작/중지 | 필수 |
| 9 | `port-utils.ts` — 포트 충돌 감지 + 자동 변경 | 필수 |
| 10 | `AppTerminalPanel` — 실시간 터미널 출력 | 중요 |
| 11 | 상태 기억 (재방문 시 바로 실행 버튼) | 중요 |
| 12 | "브라우저에서 열기" 버튼 | 편의 |

---

## 10. 제약 & 리스크

| 리스크 | 대응 |
|--------|------|
| 에이전트가 실행 방법을 잘못 판단 | 분석 결과를 사용자에게 보여주고 수정 가능하게 |
| 프로세스가 좀비로 남음 | PID 추적 + 서버 종료 시 `stopAll()` |
| 포트 충돌 | 자동 감지 + 빈 포트 제안 + 수동 변경 가능 |
| .env 등 시크릿 필요 | 분석에서 경고 → 사용자가 직접 설정 |
| Docker 필요한 레포 | Docker 설치 여부 확인 → 없으면 안내 |
| Windows/Mac/Linux 차이 | 프로세스 종료 방식 분기 (taskkill vs kill) |
