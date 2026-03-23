# App Runner 자율 실행 (AutoRun) 설계

> **목표**: 우클릭 "앱 실행" 시 유저 개입 없이 **분석 → 설치 → 실행**까지 자동으로 진행.
> 유저는 로그만 지켜보면 된다.

---

## 1. 현재 vs 변경

### 현재 (수동)

```
우클릭 "앱 실행"
  → AppRunnerWindow 열림
  → 유저가 [분석] 클릭 → 대기
  → 유저가 [설치 & 실행] 클릭 → 대기
  → 완료
```

### 변경 (자율)

```
우클릭 "앱 실행"
  → AppRunnerWindow 열림 (autoRun 모드)
  → 자동으로 분석 시작 (LLM)
  → 분석 완료 → 자동으로 설치 & 실행 시작
  → 유저는 로그만 확인
  → 완료 시 "브라우저에서 열기" 버튼 표시
```

---

## 2. 변경 범위

### 2-1. uiStore — autoRun 플래그 추가

```typescript
// 현재
appRunnerProjectId: string | null;
openAppRunner: (projectId: string) => void;

// 변경
appRunnerProjectId: string | null;
appRunnerAutoRun: boolean;                          // ← 추가
openAppRunner: (projectId: string, autoRun?: boolean) => void;  // ← 시그니처 변경
```

```typescript
openAppRunner: (projectId, autoRun) => set((s) => {
  const next = new Set(s.openWindows);
  next.add("app-runner");
  return {
    appRunnerProjectId: projectId,
    appRunnerAutoRun: autoRun ?? false,             // ← 추가
    openWindows: next,
  };
}),
```

### 2-2. AppRunnerWindow — autoRun useEffect 추가

```typescript
const { appRunnerProjectId, appRunnerAutoRun } = useUiStore();

// 기존 상태 로드 useEffect 이후에 추가
useEffect(() => {
  if (!appRunnerAutoRun || !appRunnerProjectId) return;
  // 플래그 소비 (1회만 실행)
  useUiStore.getState().clearAppRunnerAutoRun();

  // 자율 파이프라인 시작
  (async () => {
    try {
      // Step 1: 분석
      setStatus("analyzing");
      setAnalyzing(true);
      const aRes = await analyzeApp(appRunnerProjectId);
      setAnalysis(aRes.analysis);
      setStatus("analyzed");
      if (aRes.analysis.default_port) setPort(aRes.analysis.default_port);
      setAnalyzing(false);

      // Step 2: 설치 & 실행
      setStatus("installing");
      setRunning(true);
      setLogs([]);
      const rRes = await runApp(
        appRunnerProjectId,
        aRes.analysis.default_port ?? undefined,
      );
      setPort(rRes.port);
      setRunUrl(`http://localhost:${rRes.port}`);
      startLogPoll();
    } catch (err) {
      setAnalyzing(false);
      setRunning(false);
      setRunError(err instanceof Error ? err.message : String(err));
      setStatus("downloaded");
    }
  })();
}, [appRunnerAutoRun, appRunnerProjectId]);
```

### 2-3. 호출 측 — autoRun: true 전달

**useDesktopOverlayBlockProps.ts** — 우클릭 "앱 실행":

```typescript
onRunApp: (projectId: string) => {
  openAppRunner(projectId, true);  // ← autoRun: true
},
```

**DesktopIconArea.tsx** — 더블클릭 (앱 타입):

```typescript
onClick: () => {
  if (project.project_type === "app") {
    openAppRunner(project.id);  // ← autoRun 없음 (기본 false)
  } else { ... }
},
```

| 진입 경로 | autoRun |
|----------|---------|
| 우클릭 → "앱 실행" | `true` (자동 분석+실행) |
| 앱 아이콘 더블클릭 | `false` (수동 — 이미 분석된 상태 확인용) |
| Dock "+" → Repo Store → 다운로드 | `false` (AppRunnerWindow 열리지 않음) |

---

## 3. 유저 경험 (UX)

### 3-1. 자율 실행 중 화면

```
┌─ MoneyPrinterV2 ──────────────────────────── [분석 중...] ─┐
│                                                            │
│  [GitHub 아이콘]  MoneyPrinterV2                           │
│                   FujiwaraChoki/MoneyPrinterV2             │
│                                                            │
│  ── 자동 실행 중 ──────────────────────────────────────── │
│  │ [1/2] 프로젝트 분석 중...           ████████░░ 80%   │ │
│  │ [2/2] 설치 & 실행                   대기 중           │ │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│                                              [취소]        │
└────────────────────────────────────────────────────────────┘
```

### 3-2. 분석 완료 → 설치 시작

```
┌─ MoneyPrinterV2 ──────────────────────────── [설치 중...] ─┐
│                                                            │
│  ── 분석 결과 ────────────────────────────────────────── │
│  타입: webapp  │  언어: Python  │  프레임워크: Flask       │
│  포트: 5000                                               │
│                                                            │
│  ── TERMINAL ────────────────────────────────────────────  │
│  │ $ pip install -r requirements.txt                    │ │
│  │ Installing collected packages: flask, selenium...    │ │
│  │ Successfully installed 23 packages                   │ │
│  │ $ PORT=5000 python main.py                           │ │
│  │ * Running on http://127.0.0.1:5000                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3-3. 실행 완료

```
┌─ MoneyPrinterV2 ──────────────────────────── [실행 중] ────┐
│                                                            │
│  ● 실행 중   http://localhost:5000                         │
│                                                            │
│  [브라우저에서 열기]  [중지]  [재시작]                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 4. 에러 처리

| 단계 | 실패 시 | UI 표시 |
|------|---------|---------|
| 분석 | LLM 호출 실패 / 프로젝트 경로 없음 | "분석 실패: {에러}" + [분석] [설치 & 실행] 버튼 활성화 |
| 설치 | npm install 실패 / 타임아웃 (120초) | "설치 실패 (exit code N)" + 로그 표시 + [재시도] 버튼 |
| 실행 | 프로세스 즉시 종료 / 포트 충돌 | "프로세스 종료 (code N)" + 로그 표시 + [재시도] 버튼 |

자율 실행 실패 시 **수동 모드로 폴백** — 버튼이 다시 활성화되어 유저가 직접 제어 가능.

---

## 5. 구현 순서

| 단계 | 파일 | 작업 |
|------|------|------|
| 1 | `src/store/uiStore.ts` | `appRunnerAutoRun` 상태 + `clearAppRunnerAutoRun` 액션 추가 |
| 2 | `src/components/windows/AppRunnerWindow.tsx` | `autoRun` useEffect 추가 — 분석 → 실행 자동 파이프라인 |
| 3 | `src/components/desktop/useDesktopOverlayBlockProps.ts` | `onRunApp`에서 `openAppRunner(projectId, true)` 전달 |
| 4 | TypeScript 컴파일 체크 | `npx tsc -b --noEmit` |

---

## 6. 변경하지 않는 것

- 서버 API (`analyze`, `run`, `stop`) — 변경 없음, 그대로 사용
- AppRunnerWindow의 수동 버튼 — 유지 (autoRun 실패 시 폴백)
- 앱 아이콘 더블클릭 — 기존 동작 유지 (autoRun 없이 열기)
- Repo Store 다운로드 흐름 — 변경 없음
