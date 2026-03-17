# Figma Integration — Feature Spec

> Status: PLANNED
> Author: AI-generated spec for developer implementation
> Last updated: 2026-03-17

---

## 1. Overview

Figma 연동은 디자인 URL을 태스크에 첨부하고, 에이전트가 실행 시 해당 Figma 노드의 코드/스크린샷/메타데이터를 컨텍스트로 자동 주입받는 기능이다.

**핵심 흐름:**
```
Settings → Figma API Key 등록
    ↓
CreateTaskModal → Figma URL 입력
    ↓
execution-run.ts → Figma MCP 호출 → 컨텍스트 블록 생성
    ↓
에이전트 프롬프트에 디자인 컨텍스트 주입
```

---

## 2. 설정: Figma API Key 등록

### 2-1. Settings 탭 위치

`SettingsWindow` → **API** 탭 (`ApiSettingsTab.tsx`) 에 Figma 섹션 추가.

기존 `api_providers` 테이블을 **그대로 활용**한다. `type: "figma"` 프로바이더를 새로 추가하면 된다.

### 2-2. DB 마이그레이션

`versioned-migrations.ts` 에 APPEND:

```typescript
{
  id: "2026-03-20-001-api-providers-figma",
  up: (db) => {
    // api_providers 테이블의 type 컬럼은 TEXT이므로 별도 DDL 변경 불필요.
    // 초기 Figma 프로바이더 행을 삽입하지 않음 — 사용자가 Settings에서 직접 추가.
    // 이 마이그레이션은 문서 목적으로만 존재 (no-op).
  },
},
```

> **마이그레이션 규칙**: NEVER change/remove 기존 항목. APPEND only. ID 형식 `YYYY-MM-DD-NNN-description`.

### 2-3. API Provider 프리셋 추가

`server/modules/routes/ops/api-providers.ts` 의 `API_PROVIDER_PRESETS` 에 추가:

```typescript
figma: {
  base_url: "https://api.figma.com/v1",
  models_path: "/me",          // 연결 테스트용 엔드포인트
  auth_header: "X-Figma-Token",
},
```

`ApiProviderType` 유니언에도 `"figma"` 추가:

```typescript
type ApiProviderType =
  | "openai" | "anthropic" | "google" | "ollama"
  | "openrouter" | "together" | "groq" | "cerebras"
  | "figma"   // ← 추가
  | "custom";
```

### 2-4. 프론트엔드: API_TYPE_PRESETS

`src/components/settings/constants.ts` 의 `API_TYPE_PRESETS` 배열에 추가:

```typescript
{
  type: "figma",
  label: "Figma",
  icon: "🎨",
  description: "Figma REST API — 디자인 컨텍스트 자동 주입",
  defaultBaseUrl: "https://api.figma.com/v1",
},
```

---

## 3. 태스크 생성: Figma URL 필드

### 3-1. CreateTaskDraft 확장

`src/components/taskboard/constants.ts` 의 `CreateTaskDraft` 타입에 필드 추가:

```typescript
export type CreateTaskDraft = {
  // ...기존 필드...
  figmaUrl: string;              // ← 추가 (빈 문자열 = 미사용)
  figmaNodeId: string;           // ← 추가 (선택적, URL에서 자동 파싱 가능)
};
```

### 3-2. CreateTaskModal UI

`src/components/taskboard/create-modal/CreateTaskModalView.tsx` 에 Figma URL 입력 섹션 추가:

- "디자인 연동" 섹션 (접을 수 있는 optional section)
- 입력: Figma URL (figma.com/design/... 형식 검증)
- 파싱된 fileKey + nodeId 미리보기
- Figma API Key가 설정되지 않았을 때 경고 표시

### 3-3. Submit 시 전달

`CreateTaskModal.tsx` 의 `onCreate` 호출 시 `figma_url` 포함:

```typescript
onCreate({
  title,
  description,
  // ...기존 필드...
  figma_url: figmaUrl || null,   // ← 추가
});
```

### 3-4. DB: tasks 테이블 컬럼 추가

```typescript
{
  id: "2026-03-20-002-tasks-figma-url",
  up: (db) => {
    try {
      db.exec("ALTER TABLE tasks ADD COLUMN figma_url TEXT");
    } catch { /* already exists */ }
  },
},
```

### 3-5. 서버 API: tasks CRUD

`server/modules/routes/core/tasks/crud.ts` 의 태스크 생성/수정 핸들러에서 `figma_url` 컬럼 읽기/쓰기 추가.

---

## 4. 실행 시 컨텍스트 주입

### 4-1. 참고 패턴: Synapse (KB) 컨텍스트 주입

`server/modules/routes/core/tasks/execution-run.ts` 의 현재 패턴:

```typescript
// L21: 임포트
import { buildKbContextBlock } from "../../../synapse/context-fetcher.ts";

// L495: 에이전트 실행 직전
kbContextBlock = await buildKbContextBlock(db as any, id, agentId ?? null);
```

### 4-2. Figma 컨텍스트 fetcher 신규 생성

`server/modules/figma/context-fetcher.ts` 생성:

```typescript
/**
 * 태스크의 figma_url을 읽어 Figma API로 컨텍스트 블록 생성.
 * MCP 서버가 없을 경우 REST API fallback.
 */
export async function buildFigmaContextBlock(
  db: DbLike,
  taskId: string,
): Promise<string | null> {
  const task = db.prepare("SELECT figma_url FROM tasks WHERE id = ?").get(taskId) as { figma_url: string | null } | null;
  if (!task?.figma_url) return null;

  // Figma API Key 조회
  const provider = db.prepare(
    "SELECT api_key_enc FROM api_providers WHERE type = 'figma' AND enabled = 1 LIMIT 1"
  ).get() as { api_key_enc: string } | null;
  if (!provider?.api_key_enc) return null;

  const apiKey = decryptSecret(provider.api_key_enc);
  const { fileKey, nodeId } = parseFigmaUrl(task.figma_url);

  // GET https://api.figma.com/v1/files/:fileKey/nodes?ids=:nodeId
  const res = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`,
    { headers: { "X-Figma-Token": apiKey } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  // 노드 이름, 타입, 크기 등 요약 생성
  return formatFigmaContext(data);
}

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
  // figma.com/design/:fileKey/:name?node-id=:nodeId
  const match = url.match(/figma\.com\/design\/([^/]+)/);
  const fileKey = match?.[1] ?? "";
  const nodeIdMatch = url.match(/node-id=([^&]+)/);
  const nodeId = nodeIdMatch?.[1]?.replace(/-/g, ":") ?? "";
  return { fileKey, nodeId };
}
```

### 4-3. execution-run.ts 주입 위치

`server/modules/routes/core/tasks/execution-run.ts` 에서 kbContextBlock 바로 다음에 추가:

```typescript
// Figma 컨텍스트 (figma_url이 있는 경우)
let figmaContextBlock: string | null = null;
try {
  figmaContextBlock = await buildFigmaContextBlock(db, id);
} catch (err) {
  logger.warn({ err }, "[execution-run] figma context fetch failed, skipping");
}

// 프롬프트 조합 시
const contextSections = [
  kbContextBlock,
  figmaContextBlock,
].filter(Boolean).join("\n\n");
```

---

## 5. UI 디자인 스펙

> **필수**: 프로젝트의 `--th-*` CSS 변수만 사용할 것. 하드코딩 색상 금지 (status 색상 제외).
> **폰트**: 모든 텍스트 `fontFamily: "var(--th-font-mono)"` (JetBrains Mono).
> **Border Radius 규칙**: 컨테이너 `borderRadius: 10`, 버튼/입력 `borderRadius: 0`.

### 5-1. CreateTaskModal — Figma URL 섹션

`KbTaskSourcesSection.tsx`와 **동일한 패턴**으로 구현. 섹션 구조:

```tsx
// 참고: src/components/taskboard/create-modal/KbTaskSourcesSection.tsx 와 동일 패턴

const FigmaUrlSection = ({ figmaUrl, onChange, t }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderTop: "1px solid var(--th-border)", padding: "0 16px" }}>
      {/* 토글 헤더 — KbTaskSourcesSection과 동일 스타일 */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          fontFamily: "var(--th-font-mono)",
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", padding: "8px 0",
          background: "none", border: "none",
          color: "var(--th-text-muted)",
          cursor: "pointer", fontSize: "9px",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}
      >
        <span style={{ color: figmaUrl ? "var(--th-accent)" : undefined }}>
          {open ? "▾" : "▸"}
        </span>
        FIGMA DESIGN
        {figmaUrl && (
          <span style={{
            background: "var(--th-accent)", color: "var(--th-bg-primary)",
            borderRadius: 2, padding: "0 5px", fontSize: "8px", fontWeight: 700,
          }}>
            1
          </span>
        )}
      </button>

      {open && (
        <div style={{ paddingBottom: 10 }}>
          {/* URL 입력 */}
          <input
            type="url"
            placeholder="https://www.figma.com/design/..."
            value={figmaUrl}
            onChange={e => onChange(e.target.value)}
            style={{
              fontFamily: "var(--th-font-mono)",
              width: "100%", fontSize: "10px",
              padding: "5px 8px",
              background: "var(--th-bg-elevated)",
              border: "1px solid var(--th-border)",
              borderRadius: 0,
              color: "var(--th-text-primary)",
              outline: "none",
            }}
          />
          {/* URL 파싱 미리보기 — figmaUrl이 유효한 경우만 표시 */}
          {figmaUrl && isValidFigmaUrl(figmaUrl) && (
            <div style={{
              fontFamily: "var(--th-font-mono)", fontSize: "9px",
              color: "var(--th-text-muted)", marginTop: 4,
            }}>
              ✓ {parseFigmaFileKey(figmaUrl)}
            </div>
          )}
          {/* Figma API Key 미설정 경고 */}
          {!hasFigmaApiKey && (
            <div style={{
              fontFamily: "var(--th-font-mono)", fontSize: "9px",
              color: "#ff9f0a", marginTop: 4,
            }}>
              ⚠ {t({ ko: "Settings → API에서 Figma 키를 등록하세요", en: "Add Figma API key in Settings → API" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

**배치 위치**: `KbTaskSourcesSection` 바로 위에 렌더링 (태스크 생성 폼 하단).

### 5-2. Settings API 탭 — Figma 섹션

기존 `ApiSettingsTab.tsx` 의 API 프로바이더 카드와 **동일한 스타일**을 사용.
`type: "figma"` 프로바이더는 카드에 `🎨` 아이콘과 함께 표시.

API 키 입력 후 연결 테스트: `GET https://api.figma.com/v1/me` (200이면 성공).

---

## 6. MCP 서버 활용 (선택적 고급 모드)

`mcp__claude_ai_Figma__get_design_context` 도구가 사용 가능할 때 REST fallback 대신 MCP 호출:

```typescript
// MCP를 통해 더 풍부한 컨텍스트 (코드 스니펫 포함) 획득
// MCP 사용 불가 시 REST API fallback으로 기본 메타데이터만 제공
```

MCP 도구 목록:
- `get_design_context(fileKey, nodeId)` — 코드 + 스크린샷 + 힌트
- `get_screenshot(fileKey, nodeId)` — PNG 스크린샷
- `get_metadata(fileKey, nodeId)` — 컴포넌트 메타데이터

---

## 7. 파일 변경 체크리스트

```
[ ] server/modules/routes/ops/api-providers.ts
    - ApiProviderType 에 "figma" 추가
    - API_PROVIDER_PRESETS 에 figma 프리셋 추가

[ ] server/modules/bootstrap/schema/versioned-migrations.ts
    - 2026-03-20-001-api-providers-figma (no-op 또는 안내용)
    - 2026-03-20-002-tasks-figma-url     (ALTER TABLE tasks ADD COLUMN figma_url)

[ ] server/modules/figma/context-fetcher.ts  (신규)
    - buildFigmaContextBlock()
    - parseFigmaUrl()

[ ] server/modules/routes/core/tasks/execution-run.ts
    - buildFigmaContextBlock import 추가
    - 에이전트 실행 직전 figmaContextBlock 생성 및 프롬프트 주입

[ ] server/modules/routes/core/tasks/crud.ts
    - 태스크 생성/수정 시 figma_url 컬럼 처리

[ ] src/components/taskboard/constants.ts
    - CreateTaskDraft 에 figmaUrl, figmaNodeId 필드 추가

[ ] src/components/taskboard/create-modal/CreateTaskModalView.tsx
    - Figma URL 입력 섹션 UI 추가

[ ] src/components/taskboard/CreateTaskModal.tsx
    - figma_url onCreate 전달

[ ] src/components/settings/constants.ts
    - API_TYPE_PRESETS 에 figma 추가

[ ] src/api/tasks.ts (또는 해당 API 훅)
    - figma_url 필드 포함
```

---

## 8. UX 플로우 요약

```
1. Settings → API → "+ 추가" → 타입: Figma → Personal Access Token 입력 → 저장
2. TaskBoard → "+ 새 태스크" → 제목/설명 입력
3. (선택) "디자인 연동" 섹션 펼침 → Figma URL 붙여넣기
4. "태스크 생성" → 서버가 figma_url 저장
5. 에이전트 실행 시 execution-run.ts 가 Figma API 호출 → 컨텍스트 블록 생성
6. 에이전트 프롬프트 선두에 디자인 컨텍스트 주입
7. 에이전트가 디자인 스펙 참고하여 코드 작성
```
