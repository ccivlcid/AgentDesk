# CLI Detection & Settings Tab — Architecture Reference

> Last updated: 2026-03-29
> Purpose: Settings → CLI 탭에서 각 CLI 도구의 설치/인증 상태를 감지하는 전체 흐름 문서화.

---

## 1. 전체 흐름

```
[Settings → CLI 탭 열기 / 새로고침 버튼]
        │
        ▼
src/components/windows/SettingsWindow.tsx
  → onRefreshCli()
        │
        ▼
src/app/useAppActions.ts · handleRefreshCli()
  → api.getCliStatus(refresh=true)
        │  GET /api/cli-status?refresh=1
        ▼
server/modules/routes/ops.ts  ·  GET /api/cli-status
  → detectAllCli()                         ← refresh=0이면 30s TTL 캐시 반환
        │
        ▼
server/modules/workflow/agents/providers/usage-cli-tools.ts
  → detectCliTool() × 5개 병렬 실행
        │
        ├── claude
        ├── codex
        ├── gemini
        ├── opencode
        └── agent  (binary명)  →  provider키: "cursor"
        │
        ▼
{ providers: { claude: CliToolStatus, codex: ..., ... } }
        │
        ▼
taskStore.setCliStatus()  →  CliSettingsTab 렌더링
```

---

## 2. 핵심 파일

| 역할 | 파일 |
|------|------|
| UI 탭 렌더링 | `src/components/settings/CliSettingsTab.tsx` |
| 새로고침 액션 | `src/app/useAppActions.ts` · `handleRefreshCli` |
| API 클라이언트 | `src/api/messaging-runtime-oauth.ts` · `getCliStatus()` |
| 라우트 핸들러 | `server/modules/routes/ops.ts` · `GET /api/cli-status` |
| 감지 엔진 (핵심) | `server/modules/workflow/agents/providers/usage-cli-tools.ts` |
| 모델 목록 | `GET /api/cli-models` (별도 엔드포인트) |

---

## 3. 도구별 감지 방법

### 3-1. 설치 확인 공통 로직

```typescript
// 1. PATH 탐색
execWithTimeout("where"|"which", [tool.name], 1500~3000ms)

// 2. (Windows 전용) PATH 실패 시 known 경로 직접 체크
winFallbackExists(binaryName):
  %APPDATA%\npm\{tool}.cmd
  %USERPROFILE%\AppData\Roaming\npm\{tool}.cmd
  ~/AppData/Roaming/npm/{tool}.cmd
  NVM 디렉토리 내 버전별 경로
```

### 3-2. 도구별 상세

| 도구 | binary | provider 키 | 버전 확인 | 인증 확인 |
|------|--------|-------------|-----------|-----------|
| **Claude Code** | `claude` | `claude` | `claude --version` | `~/.claude.json` → `oauthAccount` or `session` 키<br>or `~/.claude/auth.json` 존재 |
| **Codex (OpenAI)** | `codex` | `codex` | `codex --version` | `~/.codex/auth.json` → `tokens` or `OPENAI_API_KEY` 키<br>or `OPENAI_API_KEY` env |
| **Gemini CLI** | `gemini` | `gemini` | `package.json` 탐색 (`@google/gemini-cli`) | keychain<br>or `~/.gemini/oauth_creds.json` → `access_token`<br>or GCP ADC (`%APPDATA%\gcloud\application_default_credentials.json`) |
| **OpenCode** | `opencode` | `opencode` | `opencode --version` | `~/.local/share/opencode/auth.json`<br>or `$XDG_DATA_HOME/opencode/auth.json`<br>or macOS: `~/Library/Application Support/opencode/auth.json` |
| **Cursor** | `agent` | `cursor` | `agent --version` | `CURSOR_API_KEY` env<br>or `agent status` 실행 → stdout 파싱 (authenticated/account/logged in 등)<br>or `~/.cursor/cli-config.json` → `auth` 키 |

> **binary↔provider 매핑**: `agent` binary는 provider 키 `cursor`로 등록됨.
> `CLI_NAME_TO_PROVIDER = { agent: "cursor" }` — 나머지는 binary명 = provider 키.

> **UI에서 제외**: `copilot`, `antigravity` 는 UI 필터링됨 (`CliSettingsTab.tsx:79`). 모델 설정은 OAuth 탭 사용.

---

## 4. 캐싱

```typescript
// ops.ts
const CLI_STATUS_TTL = 30_000; // 30초

// 캐시 히트 조건: refresh 파라미터 없고 && 30s 이내
if (!refresh && cachedCliStatus && now - cachedCliStatus.loadedAt < CLI_STATUS_TTL) {
  return res.json({ providers: cachedCliStatus.data });
}
```

- 새로고침 버튼: `?refresh=1` → 캐시 무시, 즉시 재감지
- 탭 최초 열기: 캐시 없으면 자동 감지 (`SettingsWindow.tsx:45`)

---

## 5. CLI 사용량 (Usage) 조회

설치·인증 감지와 별개로, 각 CLI의 **Rate Limit 사용량**을 조회하는 기능도 있음.

| CLI | API 엔드포인트 | 인증 방식 |
|-----|----------------|-----------|
| Claude | `https://api.anthropic.com/api/oauth/usage` | OAuth Bearer 토큰 (`readClaudeToken()`) |
| Codex | `https://chatgpt.com/backend-api/wham/usage` | `~/.codex/auth.json` tokens |
| Gemini | Vertex AI quota API | `freshGeminiToken()` → GCP OAuth |

- 조회 결과: `CliUsageWindow[]` — `{ label, utilization (0~1), resetsAt }` 배열
- `GET /api/cli-usage` → `refreshCliUsage()` → `CliCostWindow.tsx` 에서 표시

---

## 6. 모델 선택 저장 경로

사용자가 CLI 탭에서 모델을 선택하면:

```
select onChange
  → form.providerModelConfig[provider].model = newSlug
  → persistSettings(form)
  → POST /api/settings  (CompanySettings.providerModelConfig)
  → DB settings 테이블 저장
  → 에이전트 실행 시 callViaCliProviderInternal()에서 --model 플래그로 주입
```

---

## 7. Cursor (`agent`) 인증 감지 특이사항

Cursor는 다른 도구와 달리 파일 기반 인증 확인이 불충분해 **실제 `agent status` 명령을 실행**해 stdout/stderr를 파싱함.

```typescript
// checkAuthAsync (비동기, 실제 프로세스 실행)
const { stdout, stderr } = await execWithCapture("agent", ["status"], 4500~6000ms);
const out = `${stdout}\n${stderr}`.toLowerCase();

// 인증 성공 판정 키워드:
//   authenticated, account, logged in, cursor.com, logged in as, user:, email:
// 인증 실패 판정 키워드:
//   not authenticated, not logged in
```

Windows에서는 타임아웃을 6000ms로 늘림 (CLI 실행 지연 고려).

---

## 8. Windows 환경 주의사항

- `where` 명령 타임아웃: **3000ms** (Linux/Mac: 1500ms) — Windows PATH 탐색 느림
- npm global binary가 PATH에 없어도 `winFallbackExists()`로 `%APPDATA%\npm\` 직접 확인
- NVM-Windows 사용 시 `%NVM_HOME%\v*\{binary}.cmd` 경로도 탐색
- `execFile` 옵션에 `shell: true` 추가 (Windows에서 `.cmd` 파일 실행)
