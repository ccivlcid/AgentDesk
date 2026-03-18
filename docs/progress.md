# AgentDesk — 개발 진행 현황

> 마지막 업데이트: 2026-03-23 (CLI 하이브리드 실행 전략 문서화)

---

## 📋 CLI 하이브리드 실행 아키텍처 (문서화 완료, 구현 예정)

> 전략 문서: [`docs/strategy/cli-hybrid-execution.md`](strategy/cli-hybrid-execution.md)

### 핵심 개념

```
기획 회의 (내부 엔진) → CLI 실행 (인터랙티브 PTY) → 리뷰/완료 (내부 엔진)
```

### 실행 모드 분기

| cli_provider | 실행 모드 | 변경 |
|-------------|---------|------|
| claude / cursor / codex / gemini | CLI 인터랙티브 (PTY 터미널, 사용자가 봄) | 🆕 신규 |
| opencode | 헤드리스 spawnCliAgent (기존 유지) | — |
| api / ollama | 내부 엔진 launchApiProviderAgent (기존 유지) | — |
| copilot / antigravity | 내부 엔진 launchHttpAgent (기존 유지) | — |

### 구현 단계 (우선순위 순)

| Phase | 내용 | 상태 |
|-------|------|------|
| A | PTY 출력 → 태스크 로그 연결 (터미널 보기 활성화) | 📋 예정 |
| B | `POST /api/tasks/:id/cli-complete` 완료 감지 API 추가 | 📋 예정 |
| C | 태스크 시작 시 CliWindow 자동 오픈 + 완료 버튼 | 📋 예정 |
| D | CLAUDE.md / .cursorrules / GEMINI.md 컨텍스트 파일 자동 생성 | 📋 예정 |
| E | CLI 실행 전 기획 회의 단계 추가 (선택적) | 📋 예정 |

### 완료 감지 전략
1. **API 호출** (주요): 에이전트가 CLAUDE.md 지시에 따라 `POST /api/tasks/:id/cli-complete` 호출
2. **완료 버튼** (fallback): CliWindow 하단 버튼으로 사용자가 수동 완료 처리
3. **PTY 종료** (비대화형 전용): 프로세스 종료 = 완료

### 관련 완료 작업
- CliWindow: providerModelConfig 연동, 자동 실행, 프로젝트 폴더 cwd ✅
- 새 업무 창: CLI 실행 버튼, 프로젝트 에이전트 필터 ✅
- ManualPathPickerDialog: 폴더 생성 기능 ✅

---

## ✅ macOS UX 편의성 고도화 (완료)

| 기능 | 설명 |
|------|------|
| **창 z-index 포커스** | 클릭 시 해당 창이 앞으로 올라옴 (`windowFocusOrder` 배열로 관리) |
| **창 입장 애니메이션** | `winOpen` keyframe — opacity 0→1, scale 0.96→1, 18ms |
| **창 최소화 (노란 버튼)** | opacity/scale 트랜지션, Dock 점 색상으로 상태 표시, 클릭 복원, 타이틀바 더블클릭도 최소화 |
| **커서 수정** | 타이틀바는 `default`, 제목 드래그 영역만 `grab` |
| **Cmd+W / Ctrl+W** | 최상단(포커스된) 창 닫기 |
| **Delete/Backspace** | 선택된 아이콘 삭제 (프로젝트·doc·위젯아이콘) |
| **Enter** | 선택된 프로젝트 창 열기 |
| **F2** | 선택된 프로젝트 이름 변경 트리거 |
| **러버밴드 다중 선택** | 빈 바탕 드래그 → 파란 사각형으로 여러 아이콘 선택 |
| **아이콘 선택 하이라이트** | 선택된 아이콘에 파란 테두리 + 반투명 배경 |

**변경 파일**: `uiStore.ts`, `AppWindow.tsx`, `Desktop.tsx`, `DesktopIcon.tsx`, `Dock.tsx`

---

## ✅ Agent CLI — 실제 PTY 터미널 + 에이전트 셀렉트 (완료)

> 업데이트: 2026-03-23 (실제 PTY 터미널 CliWindow 전면 교체, 에이전트 셀렉트 + CLI 자동 실행)

---

## ✅ Agent CLI — 실제 PTY 터미널 + 에이전트 셀렉트 (완료)

`CliWindow`를 실제 PTY 기반 터미널로 전면 교체하고, 하단 에이전트 셀렉트 바 추가.

| 항목 | 내용 |
|------|------|
| 패키지 | `node-pty ^1.1.0` (win32-x64 prebuild 포함), `@xterm/xterm ^6.0.0`, `addon-fit`, `addon-web-links` |
| 백엔드 | `server/modules/pty/pty-manager.ts` — PTY 세션 생성·입력·리사이즈·소멸 관리 |
| WebSocket | `server/ws/hub.ts` — `pty_create/input/resize/destroy` ↔ `pty_output/ready/exit` 처리 |
| 프론트엔드 | `src/components/terminal/XTerminal.tsx` — xterm.js PTY 래퍼 |
| CliWindow | `src/components/windows/CliWindow.tsx` — XTerminal + 하단 에이전트 셀렉트 바 |
| 프로젝트 컨텍스트 | 현재 프로젝트 `project_path` → PTY `cwd` 자동 전달, 프로젝트 전환 시 새 세션 |
| 에이전트 셀렉트 | 하단 `<select>` 드롭다운 — 에이전트 선택 시 `cd <project_path>` + CLI 명령어 자동 실행 |
| CLI 자동 실행 | `cli_provider` 매핑: `claude`→`claude`, `codex`→`codex`, `gemini`→`gemini`, `opencode`→`opencode`, `cursor`→`cursor .` 등 |
| 재실행 버튼 | ▶ 버튼 — 동일 세션에서 CLI 재기동 |

---

## ✅ Figma 연동 (완료)

태스크 생성 시 Figma URL 첨부 → 에이전트 실행 시 컨텍스트 자동 주입.

| 항목 | 내용 |
|------|------|
| DB | `2026-03-20-001-tasks-figma-url` (`tasks.figma_url`), `2026-03-20-002-projects-figma-url` (`projects.figma_url`) |
| 서버 | `server/modules/figma/context-fetcher.ts` — Figma REST API 호출, `buildFigmaContextBlock()` |
| 실행 주입 | `execution-run.ts` — `figmaContextBlock`을 에이전트 프롬프트에 자동 주입 |
| 프론트엔드 | `FigmaUrlSection.tsx` — 태스크 생성 모달 Figma URL 입력·파싱·미리보기 |
| 인증 | Figma API 토큰을 `synapse_connections` 테이블(platform='figma')에 저장 |
| Settings UI | `SynapseSettingsTab.tsx` → Figma 서브탭 — Personal Access Token 입력, 연결/해제, 가이드 텍스트 |

---

## ✅ Design Workflow Template (완료)

Figma 디자인 파일 기반 4단계 에이전트 워크플로우 템플릿.

| 항목 | 내용 |
|------|------|
| 프리셋 | `src/components/workflow-builder/presets/design-workflow.ts` — 4노드 체인 (Design Analysis → Component Design → Implementation → Code Review) |
| 템플릿 피커 | `TemplatePickerModal.tsx` — 카테고리 필터, `figma_required: true` 시 Figma URL 입력 필드 |
| 실행 | `WbRunModal.tsx` — Figma URL을 첫 번째 에이전트 태스크에 주입, 의존성 체인 자동 생성 |
| DB | `2026-03-20-003-category-design` 마이그레이션으로 design 카테고리 시딩 |

---

## ✅ Phase 18 — Agent CLI (완료)

REPL → CLI 명칭 전환 + Agent Shell 패러다임 도입.
에이전트별 전용 CLI 세션, Claude Code 스타일 지속 컨텍스트, 3곳 진입점.

| Step | 내용 | 상태 |
|------|------|------|
| 1 | REPL → CLI 명칭 전환 (WindowType `"repl"→"cli"`, MissionControl, Dock 아이콘, 바탕화면 아이콘) | ✅ |
| 2 | `uiStore.openCli(agentId?)` + `cliInitialAgentId` + `CliWindow.tsx` | ✅ |
| 3 | `AgentCli.tsx` — CliSession Map + 셸 프롬프트 `[agent @ project] $` + `:switch`/`:status`/`:history`/`:reset` | ✅ |
| 4 | 에이전트 진입점 3곳: AgentDetailPanel `>_` 버튼, AgentsWidget hover `>_` 버튼, Flow Graph 노드 우클릭 "CLI 열기" | ✅ |

### CLI 설치 기능 (Settings → CLI 탭)
- `server/modules/routes/ops/cli-install.ts` — POST/GET 엔드포인트, npm install -g 실행
- `src/api/cli-install.ts` + `SettingsPanel.tsx` 폴링 로직
- `CliSettingsTab.tsx` — 미설치 시 `[npm install]` 버튼 + 실시간 로그 스트림

---

## ✅ Synapse — 지식 베이스 연동 (완료)

Notion·Obsidian 외부 지식 베이스를 AgentDesk에 연결하고, 에이전트 태스크 실행 시 컨텍스트 자동 주입.

| 항목 | 내용 |
|------|------|
| 서버 | `server/modules/synapse/` — `context-fetcher.ts`, `notion-client.ts`, `notion-poller.ts`, `obsidian-client.ts`, `obsidian-watcher.ts`, `rule-engine.ts` |
| API | `server/modules/routes/ops/synapse.ts` — Synapse 연결 설정·문서 검색·컨텍스트 fetch 엔드포인트 |
| 프론트엔드 | `SynapseWindow.tsx`, `SynapseWidget.tsx`, `SynapseSettingsTab.tsx`, `SynapseExportModal.tsx` |
| 채팅 연동 | `KbMentionDropdown.tsx` — `@notion`, `@obsidian` 멘션으로 문서 검색·첨부 |
| 태스크 | `CreateTaskModal` → `KbTaskSourcesSection` — 태스크 생성 시 지식 소스 첨부 |
| API 라우트 | `GET /api/synapse/*` — 연결 상태, 문서 목록, 컨텍스트 fetch |

---

## ✅ Synapse 리네임 + Agent Detail 통합 (완료)

### Harness → Synapse 잔존 참조 수정
- `AgentFormModal.tsx`: "Settings → HARNESS" → "Settings → SYNAPSE"
- `DeliverableCard.tsx`: `setShowHarnessExport` → `setShowSynapseExport` (3곳)
- `SynapseExportModal.tsx`: 주석 "Harness Export Modal" → "Synapse Export Modal"
- `obsidian-client.ts`: 주석 "Harness — Obsidian client" → "Synapse — Obsidian client"
- `UserGuidePanel.tsx`: 가이드 패널 "Harness" 항목 → "Synapse" (아이콘 🧪 → ⇄)

### Agent Detail 시스템 통합 (2.C)
두 개의 병렬 Agent Detail 시스템을 `AgentDetailPanel.tsx` 하나로 통합.

**Before:**
- `AgentDetailPanel.tsx` — compact 440px popup, 섹션 뷰만 (skills/rules/memories/cost)
- `AgentDetail.tsx` — AppOverlays에서 `selectedAgent`로 트리거, 6탭 full view (info/tasks/alba/performance/chat/timeline)

**After:**
- `AgentDetailPanel.tsx` — 640px popup, **4탭 통합 뷰**:
  - **Overview**: AgentDetailHeader + AgentDetailCurrentTask + AgentDetailSections
  - **Tasks**: 에이전트 태스크 목록 (클릭 → TerminalPanel)
  - **Chat**: AgentChatTab (에이전트와 1:1 채팅)
  - **Timeline**: AgentTimeline (이벤트 히스토리)
- `AppOverlays.tsx`: `AgentDetail` 제거, `selectedAgent` 관련 props 전체 제거
- `App.tsx`: `selectedAgent`/`setSelectedAgent` 사용 제거

---

## ✅ Phase 17 — Project Folders (완료)

프로젝트를 폴더 컨테이너로 묶고, 폴더 이동 시 디스크 경로도 함께 변경하는 시스템.

| 항목 | 내용 |
|------|------|
| DB | `project_folders` 테이블 (2026-03-22-001), `projects.folder_id` FK (2026-03-22-002) |
| API | GET/POST/PATCH/DELETE `/api/project-folders` + POST/DELETE `/api/project-folders/:id/projects` |
| 디스크 이동 | `fs.renameSync` (non-fatal — 실패 시 DB만 업데이트, `moved_on_disk: false` 반환) |
| Frontend | `ProjectFolder` 타입, `src/api/project-folders.ts`, `uiStore.openFolders` |
| UI | `FolderDesktopIcon.tsx` (SVG 적층 폴더 아이콘 + 배지 + 컨텍스트 메뉴) |
| UI | `NewFolderModal.tsx` (2단계: 이름 → base_path + 색상 선택) |
| UI | `FolderWindow.tsx` (폴더 내 프로젝트 그리드 + 추가/꺼내기) |
| Desktop | 폴더 아이콘 별도 영역 렌더링, 우클릭 "폴더로 이동" 서브메뉴, 폴더 drop 이벤트 |

---

## ✅ Phase 16 — Cross-Project Handoff (완료)

프로젝트 유형 간 결과물 연결 시스템.
디자인·리서치 완료 결과물을 소프트웨어·콘텐츠 프로젝트에서 가져다 쓰는 핸드오프 흐름.

| Phase | 내용 | 상태 |
|-------|------|------|
| 16-A | 결과물 체크리스트 (DB + API + ProjectInsightsPanel UI) | ✅ 완료 |
| 16-B | 크로스 프로젝트 소스 연결 (DB + API + ProjectEditorPanel UI) | ✅ 완료 |
| 16-C | 태스크 실행 시 소스 결과물 컨텍스트 자동 주입 (execution-run.ts) | ✅ 완료 |

### Phase 16-B·C 구현 내용

**백엔드**
- DB 마이그레이션 `2026-03-21-002-project-sources`: `project_sources` 테이블 (순환참조 방지, max 5개 제한)
- `GET /api/projects/:id/sources`: 소스 목록 + 각 소스 결과물 체크 수 포함
- `POST /api/projects/:id/sources`: 소스 추가 (순환참조·자기참조·max 5개 검증)
- `DELETE /api/projects/:id/sources/:sourceId`: 소스 제거
- `server/modules/projects/source-context-fetcher.ts` (신규): `buildSourceContextBlock()` — 태스크 실행 시 연결된 소스 프로젝트의 완료 결과물을 텍스트 블록으로 변환
- `execution-run.ts`: `sourceContextBlock` 프롬프트 주입 (kbContextBlock 다음, figmaContextBlock 앞)

**프론트엔드**
- `src/types/index.ts`: `ProjectSource`, `ProjectSourcesResponse` 타입 추가
- `src/api/organization-projects.ts`: `getProjectSources`, `addProjectSource`, `removeProjectSource` API 함수 추가
- `ProjectEditorPanel.tsx`: `ProjectSourcesSection` 컴포넌트 (소스 목록 + 추가 드롭다운 + 제거 버튼)
- `ProjectManagerModal.tsx`: sources 상태 관리 + fetch + `handleAddSource`/`handleRemoveSource` 핸들러

### Phase 16-A 구현 내용

**백엔드**
- DB 마이그레이션 `2026-03-21-001-project-deliverable-checks`: `project_deliverable_checks` 테이블 (id, project_id, key, label, checked, checked_at, note, created_at, updated_at)
- `GET /api/projects/:id/deliverables`: 카테고리 `deliverable_schema` + DB 체크 상태 병합 반환
- `PUT /api/projects/:id/deliverables/:key`: 체크 토글 (UPSERT)

**프론트엔드**
- `src/types/index.ts`: `ProjectDeliverableItem`, `ProjectDeliverablesResponse` 타입 추가
- `src/api/organization-projects.ts`: `getProjectDeliverables`, `updateProjectDeliverable` API 함수 추가
- `ProjectInsightsPanel.tsx`: `DeliverableChecklistSection` 컴포넌트 추가 — 진행률 바 + 체크박스 목록

---

## ✅ Phase 15 — Image Studio (완료)

> 구현 문서: [`docs/features/image-studio.md`](features/image-studio.md)

| Phase | 내용 | 상태 |
|-------|------|------|
| 15-A | DB 마이그레이션 + 백엔드 기반 (api_providers 연동) | ✅ 완료 |
| 15-B | 바탕화면 아이콘 + GenerateTab (txt2img) | ✅ 완료 |
| 15-C | Inpaint 모드 + MaskCanvas + 이미지 업로드 | ✅ 완료 |
| 15-D | GalleryTab + 태스크 연동 (TaskCard 첨부 이미지) | ✅ 완료 |

### 구현 내용

**백엔드**
- DB migration `2026-03-19-001-image-generations`: `image_generations` 테이블 (id, provider, model, prompt, width, height, file_path, thumb_path, metadata, task_id, created_at)
- DB migration `2026-03-20-005-image-generations-task-id`: `task_id` 컬럼 + 인덱스
- `server/modules/image-studio/image-service.ts`: 이미지 파일 저장/썸네일 생성 (sharp)
- `server/modules/image-studio/providers/openai.ts`: txt2img (`/v1/images/generations`), inpaint (`/v1/images/edits`) — api_providers `api_key_enc` 복호화 사용
- `server/modules/routes/ops/image-studio.ts`: 5개 엔드포인트 등록

**API 엔드포인트**
- `GET /api/image-studio/providers` — 활성 프로바이더 + 이미지 모델 목록
- `POST /api/image-studio/generate` — 이미지 생성 (mode: txt2img | inpaint, task_id 옵션)
- `GET /api/image-studio/gallery` — 전체 갤러리 (페이지네이션, 프롬프트 검색)
- `GET /api/image-studio/image/:id` — 이미지 파일 스트리밍 (?thumb=1)
- `GET /api/image-studio/task/:taskId/images` — 태스크 연동 이미지 목록
- `DELETE /api/image-studio/gallery/:id` — 이미지 + DB 삭제

**프론트엔드**
- `src/components/windows/ImageStudioWindow.tsx`: Generate / Gallery 탭, ? 가이드 패널
- `src/components/image-studio/GenerateTab.tsx`: Photoshop형 레이아웃 (240px 좌측 패널 + 캔버스 + 상태바), 2모드 (Text/Inpaint), 태스크 연동 선택기
- `src/components/image-studio/MaskCanvas.tsx`: 브러시 마스크 편집 (흰색=변경)
- `src/components/image-studio/GalleryTab.tsx`: auto-fill 그리드, 우측 상세 패널
- 바탕화면 아이콘 `IconImageStudio` + 단축키 `g i`
- 프로젝트 카테고리별 전용 SVG 아이콘 (소프트웨어·마케팅·리서치·제품·콘텐츠·운영·디자인)
- 바탕화면 우클릭 → **"새 폴더"** 인라인 생성 (이름 입력 → Enter/blur 확인, Escape 취소)

**태스크 연동**
- GenerateTab 좌측 "태스크 연동" 섹션: 선택 시 태스크 제목+설명으로 프롬프트 자동 채움
- 생성 시 `task_id` 저장 → TaskCard 하단 "Generated Images" 섹션 (썸네일 3열 그리드)
- 이미지 없을 때 "Open Image Studio" 버튼 표시

**이미지 업로드 UX**
- 파일 클릭 선택 또는 드래그 앤 드롭
- 업로드 시 실제 해상도 감지 → 가장 가까운 지원 사이즈 자동 설정

---

## 완료된 작업

| Phase | 내용 | 완료일 |
|-------|------|--------|
| Phase 18 | Agent CLI — REPL→CLI 전환, CliSession Map, 에이전트 진입점 3곳 (Panel·Widget·FlowGraph) | 2026-03-22 |
| Figma 연동 | 태스크 URL 첨부, Figma REST API 컨텍스트 fetch, 실행 시 자동 주입 | 2026-03-20 |
| Design Workflow | 4단계 에이전트 체인 템플릿, TemplatePickerModal, Figma URL 주입 | 2026-03-20 |
| Phase 17 | Project Folders — 폴더 컨테이너, 디스크 이동, FolderWindow | 2026-03-22 |
| Phase 16 | Cross-Project Handoff — 결과물 체크리스트 + 소스 연결 + 컨텍스트 자동 주입 | 2026-03-21 |
| Phase 15 | Image Studio — 위젯 + 앱 윈도우 (txt2img·inpaint, 갤러리, 태스크 연동) | 2026-03-21 |
| Phase 20 | Local LLM Manager — Ollama·LM Studio·llama.cpp·Jan 백엔드, 추론 로깅, 하드웨어 호환성 | 2026-03-19 |
| Phase 13 | FM2024 Overhaul — 모든 tsx → `--th-*` CSS 변수 전환 | 2026-03-14 |
| Phase 14 | MED Features — lazy loading, 채팅 검색/핀, 태스크 일괄, 성과 히스토리 | 2026-03-14 |
| P0~P3 + Security | 전체 로드맵 완료 (상세: `docs/OVERVIEW.md` 섹션 8) | 2026-03-14 |

---

## 2026-03-16 실행 파이프라인 감사 ✅

소스코드 직접 분석 (에이전트 설정·태스크 실행·회의·통신 전 범위)

**결과:** 핵심 기능 모두 실제 구현 확인. 버그 6건 발견 → `docs/bugs/PIPELINE-AUDIT-2026-03-16.md`

| 코드 | 심각도 | 내용 | 파일 | 상태 |
|------|--------|------|------|------|
| BUG-01 | 🔴 P0 | 프롬프트 빌드 예외처리 없음 (서버 크래시 가능) | `execution-run.ts` | ✅ 수정완료 |
| BUG-02 | 🟡 P1 | 서브태스크 완료 정규식 따옴표 파싱 실패 | `stream-tools.ts` | ✅ 수정완료 |
| BUG-03 | 🔵 P2 | 에이전트 저장 실패 시 UI 피드백 없음 | `AgentManager.tsx` | ✅ 수정완료 |
| BUG-04 | 🔵 P2 | 아바타 업로드 실패 시 UI 피드백 없음 | `AgentManager.tsx` | ✅ 수정완료 |
| BUG-05 | 🔵 P2 | 메신저 수신자 시작 실패 silent | `lifecycle.ts` | ✅ 수정완료 |
| BUG-06 | 🟡 P1 | 스트림 버퍼 2KB 제한 (서브태스크 손실) | `stream-tools.ts` | ✅ 수정완료 |

---

## 2026-03-16 UI 기능 감사 (Workflow Builder · Agent CLI · Flow Graph) ✅

소스코드 직접 분석 결과. 전체 수정 완료.

### Agent CLI (구 REPL)
**✅ 완전 정상 동작 — 버그 없음**
- 명령어 파싱, Task 생성/실행, WebSocket 스트리밍, `:inject` 프롬프트 주입 모두 실제 API 연동 완비

### Workflow Builder
**⚠️ 핵심 동작 + 3건 미완성**

| 코드 | 심각도 | 내용 | 파일 | 상태 |
|------|--------|------|------|------|
| WB-01 | ❌ 미구현 | Condition 노드 런타임 조건 평가 없음 (경로 추적만 사용) | `WbRunModal.tsx` | ✅ 수정완료 |
| WB-02 | 🟡 P1 | 의존성 설정 실패 시 Task 롤백 없음 (고아 Task 생성) | `WbRunModal.tsx` | ✅ 수정 완료 |
| WB-03 | 🔵 P2 | Trigger 노드 타입 정보가 Task에 저장되지 않음 | `WbRunModal.tsx` | ✅ 수정 완료 |

### Agent Flow Graph
**⚠️ 실시간 연동 정상 + 3건 이슈**

| 코드 | 심각도 | 내용 | 파일 | 상태 |
|------|--------|------|------|------|
| FG-01 | ❌ TODO | Delegation 엣지 명시적 TODO (SubTask 데이터 미전달) | `useFlowLayout.ts` | ✅ 수정 완료 |
| FG-02 | 🟡 P1 | 노드 클릭 시 에이전트 상세 패널 미연결 | `FlowGraphWidget.tsx` | ✅ 수정 완료 |
| FG-03 | 🔵 P2 | 50+ 에이전트 시 3열 고정으로 레이아웃 극단 축소 | `useFlowLayout.ts` | ✅ 수정 완료 |

---

## 2026-03-16 작업 완료 목록

### Custom Widget Platform (Phase 1~5) ✅
- **Phase 1**: `custom_features` DB 테이블 + CRUD API
- **Phase 2**: 템플릿 7종 + `WidgetBuilderModal` 4단계 스텝
- **Phase 3**: `CustomFeatureRenderer` / `CustomFeatureWidget` / `CustomFeatureWindow` + WidgetPicker/Dock 통합
- **Phase 4**: AI 생성 파이프라인 — `defaultProvider` 연동, 안전성 검증, `StepAiGenerate` 폴링 UI
- **Phase 5**: esbuild TSX→IIFE 번들 + sandbox iframe 렌더러(`AiBundleRenderer`)

### `workflow_pack_key → context_hint` 리팩토링 ✅
- DB migration `2026-03-16-002`: `tasks` 테이블에 `context_hint` 컬럼 추가 (dual-write 전략)
- 서버 16개 파일 업데이트: INSERT/UPDATE 시 두 컬럼 동시 기록, 읽기는 `context_hint ?? workflow_pack_key` fallback
- 프론트엔드 타입 및 API 함수 업데이트

### 프로젝트 비용 집계 ✅
- **Server**: `GET /api/projects/:id/cost-summary` — 총비용, 이번달, 에이전트별, 워크플로우별 분류
- **Frontend**: `getProjectCostSummary()` API + `ProjectCostSection` 컴포넌트 (`ProjectInsightsPanel` 내)

### 프로젝트 템플릿 ✅
- **DB migration** `2026-03-16-003`: `project_templates` / `project_template_objectives` / `project_template_gates` 테이블
- **빌트인 템플릿 4종**: Web Application, Research Report, Video Production, Data Analysis
- **Server API**: `GET/POST /api/project-templates`, `DELETE /api/project-templates/:id`, `POST /api/projects/:id/apply-template/:templateId`
- **Frontend**: `getProjectTemplates()` / `applyProjectTemplate()` + 프로젝트 생성 폼 템플릿 피커 UI

### versioned-migrations 테스트 수정 ✅
- 누락된 테이블 5개(`hook_entries` 등) `makeDb()`에 추가 → 186개 테스트 전체 통과

### macOS UI 개선 ✅
- **바탕화면 아이콘 이름 편집**: 더블클릭 → 인라인 편집 (Enter/Esc/blur), localStorage 저장
- **NotificationCenter**: TrafficLights 타이틀바 추가, CSS 변수 정리, 둥근 모서리
- **ManualPathPickerDialog**: macOS 스타일 전면 리팩토링 (TrafficLights, 툴바, rounded corners, z-index 1200)
- **ChatPanelHeader**: TrafficLights 추가, 기존 ✕ 버튼 제거, `embedded` prop
- **CommandPalette**: 하드코딩 색상 → `var(--th-*)` 전환
- **SettingsWindow**: 앱 열릴 때 `cliStatus` 자동 fetch

---

---

## 2026-03-17 (3) Local LLM — PC 호환성 표시 ✅

### 갤러리 모델 하드웨어 호환성 배지
- **`server/modules/routes/ops/local-llm.ts`**: 갤러리 모델 20개에 `min_ram_gb`, `min_vram_gb` 요구사항 추가
  - CPU 추론 기준: 모델 크기 × 1.5 + OS 여유 (2~3 GB)
  - GPU 추론 기준: 모델 크기 + 20% VRAM 오버헤드
- **`src/components/local-llm/ModelsPanel.tsx`**:
  - `HardwareInfo` 인터페이스 + `Compat` 타입 (`"gpu" | "cpu" | "none" | "unknown"`) 추가
  - 컴포넌트 마운트 시 `/api/local-llm/metrics` 호출 → RAM 총용량 + GPU VRAM 여유 수집
  - `getCompat(model)` 함수: VRAM 여유 ≥ min_vram_gb → `"gpu"`, RAM 총량 ≥ min_ram_gb → `"cpu"`, 둘 다 미달 → `"none"`
  - `CompatBadge` 컴포넌트: 각 갤러리 카드 우상단에 배지 표시
    - 🟢 `GPU 가능` — VRAM 충분, 빠른 GPU 추론 가능
    - 🟡 `CPU 가능` — RAM은 충분, CPU 추론 (느림)
    - 🔴 `메모리 부족` — RAM·VRAM 모두 부족
    - 배지 hover 시 tooltip: 실제 여유 메모리 / 필요 메모리 표시
  - 하드웨어 정보 없을 시 배지 미표시

---

## 2026-03-17 (2) Local LLM 완성 — Phase 20 ✅

### Phase 20-A: Inference Logging 연결 (Monitor 탭 활성화)
- **`stream-tools.ts`**: `parseSSEStream` 반환타입 `Promise<void>` → `Promise<{ inputTokens, outputTokens }>`
  - OpenAI-compatible SSE 스트림의 `data.usage.prompt_tokens / completion_tokens` 파싱 추가
- **`api-provider-tools.ts`**:
  - `CreateApiProviderToolsDeps`에 `logInference?: (entry: InferenceLogEntry) => void` 추가
  - `executeApiProviderAgent` 파라미터에 `agentId?: string | null` 추가
  - openai/ollama/lmstudio 타입 완료 시 `logInference` 호출 (backend, model_name, agent_id, task_id, tokens, t/s, latency)
  - 시작 시각 기록 → 완료 시 `latency_ms` 계산
- **`providers.ts`**: `createInferenceLogger` import → `logInference: inferenceLogger.log` 주입
- **`execution-run.ts`**: `launchApiProviderAgent` 호출에 `agentId` 인수 추가

### Phase 20-B: LM Studio 백엔드 UI 활성화
- **`BackendCard.tsx`**:
  - `isGuiBackend` (lmstudio) 분기 추가 — start/stop 버튼 대신 상태 안내 표시
  - LM Studio running 시 "✓ LM Studio 실행 중 — N모델 로드됨" 표시
  - Register 버튼은 기존대로 running 시 노출 (이미 구현됨)
- **`local-llm.ts`** 서버:
  - `/backends/lmstudio/start|stop|restart` → `{ ok: true, manual: true, message: "..." }` 응답
  - llamacpp/jan 등 미지원 백엔드 오류 메시지 "Phase 1" 문구 제거

### Phase 20-C: 탭 레이블 UX 개선
- **`LocalLlmSettingsTab.tsx`**: 탭에 부제목 추가 (두 줄 레이블)
  - "백엔드" → "실행 앱 / Ollama · LM Studio"
  - "모델" → "AI 모델 / 다운로드 · 관리"
  - "모니터" → "모니터 / 사용량 · 상태"
  - "설정" → "설정 / 고급 옵션"

---

## 2026-03-17 작업 완료 목록

### Deliverables 탭 개선 ✅
- **`Deliverables.tsx`**:
  - 검색 바 추가 (제목/에이전트명/프로젝트명/context_hint 통합 검색)
  - 정렬 옵션 추가 (날짜/제목/에이전트/프로젝트)
  - 프로젝트 필터 추가: 현재 프로젝트만 / 전체 프로젝트 토글
  - `showAllProjects` 상태로 프로젝트 선택 시 해당 프로젝트 자동 필터링
  - 필터 결과 카운트 표시 (N / total)
- **`DeliverableCard.tsx`**:
  - ↑ Upload 버튼 추가 — ARTIFACT FILES 섹션 헤더에 표시
  - `uploadTaskArtifacts()` API 연동 + 업로드 중 상태 표시
  - 업로드 성공 시 `onArtifactsUploaded` 콜백으로 부모 상태 업데이트
  - 파일 없을 때 업로드 안내 메시지 표시

### Hooks 탭 UX 개선 ✅
- **`HooksLibrary.tsx`**: "프로젝트 선택" 게이트 제거 → 프로젝트 없이도 Global Hooks 관리 가능
  - Global / Project / Other 섹션으로 명확히 구분 표시
  - `filters: undefined` → 모든 hook 로드 후 클라이언트 분류
- **`HooksGrid.tsx`**: scope 배지 추가 (project/agent/department/workflow_pack), `emptyMessage` prop 추가
- **`HookFormModal.tsx`**: `scopeOverride` 강제 제거 → Scope 선택 UI 추가
  - Global / Project / Agent / Department / Workflow 5가지 scope 선택 버튼
  - scope_id 입력 필드 (Global 제외)
  - 프로젝트 선택 시 Project scope + 해당 ID 기본값 설정

### Workflow Builder — 노드 편집 패널 + Run 기능 ✅
- **`WbNodeEditPanel.tsx`** (신규): 노드 선택 시 우측에 나타나는 편집 패널
  - Trigger: triggerType 라디오, schedule→크론 입력, webhook→경로 입력
  - Agent: agentId 드롭다운, skill 입력, instruction 텍스트에어리어
  - Gate: branches 토글 (success/failure/timeout)
  - Condition: expression 텍스트에어리어
  - 노드 삭제 버튼 (연결 엣지 자동 제거)
- **`WbRunModal.tsx`** (신규): ▶ Run 버튼 → 실행 모달
  - Agent 노드만 태스크로 생성 (trigger/gate/condition 제외)
  - Gate/Condition 노드를 통한 간접 에이전트 의존성 자동 해석 (BFS)
  - 실시간 태스크 실행 현황 모니터링
- **`WorkflowBuilder.tsx`** 업데이트:
  - 노드 클릭 → `selectedNodeId` → 우측 편집 패널 표시
  - 캔버스 빈 곳 클릭 → 선택 해제
  - ▶ Run 버튼 추가 (툴바)
  - 힌트 텍스트에 "클릭하여 편집" 추가

---

### Custom Widget 파라미터 UI 세분화 ✅
- **`templates/index.ts`**: `TemplateParam`에 신규 필드 추가 — `placeholder`, `hint`, `min`, `max`, `step`, `multiline`, `"agent"` 타입
- **`WidgetBuilderModal.tsx`**: 파라미터 렌더링 전면 개선
  - `toggle` → 비주얼 슬라이더 스위치 (animate, knob 포함)
  - `text` → `multiline: true` 시 `<textarea>`, 기본은 `<input type="text">`
  - `number` → `min`/`max`/`step` 속성 + 전폭 입력
  - `agent` (신규) → 에이전트 드롭다운 (agentStore 연동)
  - 모든 필드 아래 `hint` 서브텍스트 표시
  - `placeholder` 속성 지원
- **`agent-single-monitor` 템플릿**: `agentId` 파라미터 → `type: "agent"` + hint 추가
- **`task-daily-counter` 템플릿**: `target` 숫자에 `min`/`max`/`step`/`hint` 추가
- **`memo-board` 템플릿**: `content` → `multiline: true` + `placeholder`/`hint` 추가

---

### Template 관리 UI ✅
- **`src/components/templates-library/TemplatesLibrary.tsx`** (신규): Library 창 "Templates" 탭
  - **Project Templates** 탭: 빌트인(🔒) + 커스텀(삭제 가능) 카드 목록
    - 카드 클릭 → 확장(목표/게이트/목표 템플릿 표시)
    - **+ New Template** 인라인 폼: 이름·카테고리·설명·목표 리스트·게이트 리스트 편집
    - 커스텀 템플릿 삭제 (`deleteProjectTemplate` API 연동)
  - **Task Templates** 탭: 저장된 태스크 템플릿 목록 + 삭제
    - 태스크 생성 폼에서 SAVE 시 여기 반영
- **`src/components/windows/LibraryWindow.tsx`**: "Templates" 탭 추가 (lazy load)

---

### Workflow Builder 저장/불러오기 개선 ✅
- **`currentId` localStorage 영속화** — 페이지 새로고침 후에도 현재 워크플로 ID 유지, 중복 생성 버그 수정
- **자동 저장(auto-save)** — nodes/edges/name 변경 시 즉시 localStorage 기록 (useEffect)
- **미저장 변경 표시(● dirty 인디케이터)** — 저장 전 변경사항 있을 때 이름 옆 amber ● 표시
- **"+ New" 확인 다이얼로그** — dirty 상태에서 New 누르면 "Discard & New" 확인 요청
- **템플릿 목록 개선** — 각 워크플로에 노드 수 + 상대 시간(e.g. "5 nodes · 2h ago") 표시
- **handleSave dirty 초기화** — 저장 성공 시 dirty flag 해제

---

### Project Dashboard UI ✅
- **`ProjectInsightsPanel.tsx`**: `ProjectDashboardSection` 컴포넌트 추가 (프로젝트 선택 시 항상 표시)
  - **Objectives** 섹션: 원형 progress 표시(SVG) + 상태 배지(Active/Completed/Cancelled)
    - 인라인 편집: title, status 드롭다운, progress 슬라이더 (0~100, step 5)
    - 추가(+ Add) 인라인 폼 / 삭제(✕) 버튼 (hover 시 표시)
  - **Gates** 섹션: 상태 배지(Pending/In Progress/Passed/Failed)
    - 인라인 편집: title, status 드롭다운, criteria 텍스트
    - 추가/삭제 동일 패턴, due_date 표시
  - `objectivesApi` / `gatesApi` 연동 (GET/POST/PATCH/DELETE)
- **`ProjectManagerModal.tsx`**: `language` prop 추가 전달

### 알림 센터 개선 ✅
- **날짜별 그룹화**: Today / Yesterday / Older 섹션 헤더 (sticky), 섹션별 unread 카운트 표시
- **호버 퀵액션**: 항목에 마우스오버 → "읽음 처리(✓)" + "삭제(🗑)" 버튼 나타남 (우측 절대 배치)
- **삭제 슬라이드아웃**: 삭제 시 `translateX(320px)` + fade 트랜지션 (220ms)
- **읽은 알림 전체 삭제**: 타이틀바 우측 🗑 버튼 + 하단 푸터 "Clear N read" 버튼
- **타입 필터 배지**: 각 필터 칩에 해당 타입 unread 카운트 표시
- **신규 알림 추적**: `newIds` Set으로 2초간 새 알림 식별 (애니메이션 확장 가능)
- **하단 요약 푸터**: "N total · N unread" + "Clear N read" 링크
- **기본값 변경**: `hideRead` 기본값 `false` → All 표시 (이전: 기본 unread만)
- **에이전트 정보 표시**: 항목 하단에 에이전트 이모지 + 이름 표시

### 데이터 내보내기 ✅
- **`server/modules/routes/ops/data-export.ts`** (신규): `GET /api/export`
  - `type`: `tasks` | `deliverables` | `agents` | `costs`
  - `format`: `csv` | `json` (CSV는 UTF-8 BOM 포함 — Excel 호환)
  - 필터: `project_id`, `status`(tasks only), `since`/`until` (timestamp)
  - `Content-Disposition: attachment` 헤더로 브라우저 자동 다운로드
- **`ExportModal.tsx`** (신규): 내보내기 설정 모달
  - 4가지 데이터 타입 카드 선택 (태스크 / 결과물 / 에이전트 / 비용)
  - CSV / JSON 형식 토글
  - 프로젝트 필터, 상태 필터(tasks), 날짜 범위 (date input → ms 변환)
  - "↓ 내보내기" 버튼 → `<a>` 태그로 브라우저 다운로드 트리거
- **`MenuBar.tsx`**: "AgentDesk" 앱 메뉴에 "↓ 데이터 내보내기..." 항목 추가
- **`Desktop.tsx`**: `showExportModal` 상태 + `onOpenExportModal` prop 연결

### 에이전트 성능 대시보드 ✅
- **`server/modules/routes/ops/agent-performance.ts`** (신규): `GET /api/agents/performance` — 에이전트별 집계
  - 총 태스크 수, done/review/in_progress/cancelled/failed_exec 카운트
  - 성공률 (done / (total - cancelled)), 평균 완료시간 (AVG(completed_at - started_at))
  - 일별 태스크 트렌드 (최근 N일, 기본 30일)
  - 쿼리 파라미터: `project_id`, `days`
- **`AgentPerformanceDashboard.tsx`** (신규): Library 창 "Performance" 탭
  - 에이전트 카드 그리드 (auto-fill)
  - 성공률 배지 (green ≥80% / amber ≥50% / red <50%)
  - StatusBar: done/review/in_progress/cancelled 비율 스택 바
  - Sparkline: SVG 폴리라인 + 점 (일별 태스크 추이)
  - 정렬: Total / Done / Success Rate / Speed(평균시간)
  - 프로젝트 필터 + 기간 선택 (7/14/30/60/90일)
  - 상단 요약 바: 총 에이전트 · 총 태스크 · 완료 · 전체 성공률
- **`LibraryWindow.tsx`**: "Performance" 탭 추가 (lazy load)

### 워크플로 스케줄러 ✅
- **DB migration** `2026-03-17-001-workflow-schedules`: `workflow_schedules` 테이블 (id, template_id, cron_expr, enabled, last_run_at, next_run_at)
- **`server/modules/workflow/cron-utils.ts`** (신규): 5-field cron 파서 + `nextCronRunAfter()` / `validateCron()` (외부 의존성 없음)
- **`server/modules/workflow/workflow-scheduler.ts`** (신규): 1분 주기 데몬 — due 스케줄 감지 → agent 노드 태스크 자동 생성 → next_run_at 갱신
- **`server/modules/routes/ops/workflow-schedules.ts`** (신규): CRUD REST API (`GET/POST/PUT/DELETE /api/workflow-schedules`)
- **`lifecycle.ts`**: `startWorkflowScheduler()` 시작 + 종료 시 정리
- **`WbScheduleModal.tsx`** (신규): cron 프리셋 6종 + 직접 입력 + 활성/비활성 토글 + 다음/마지막 실행 시간 표시
- **`WorkflowBuilder.tsx`**: ⏰ 버튼 추가 (저장된 워크플로일 때만 표시)

### 글로벌 검색 (CommandPalette 확장) ✅
- **`CommandPalette.tsx`**: Deliverables / Hooks / Workflows 검색 지원
  - 세션당 1회 lazy fetch: `getDeliverables()`, `getHooks()`, `GET /api/composition-templates`
  - Deliverables 섹션: 제목, 에이전트명, 프로젝트명, 상태 배지 (done/review)
  - Hooks 섹션: 제목, command(모노스페이스), event_type 배지
  - Workflows 섹션: 이름, 노드 수 (nodes_json 파싱), 쿼리 없을 때 최대 3개 표시
  - `executeItem` → 각각 deliverables / hooks / workflow 뷰로 이동

---

## Local LLM Manager — Phase 1 ✅ (2026-03-16)

### DB 마이그레이션 (`2026-03-17-000-local-llm`)
- `local_llm_backends`, `local_llm_models`, `local_llm_inference_log` 테이블 생성
- `agents` ALTER: `local_llm_backend`, `local_llm_model` 컬럼 추가

### 서버 (`server/modules/local-llm/`)
- `ollama-client.ts` — ping, listModels, listRunning, pullModel (AsyncGenerator), deleteModel
- `backend-manager.ts` — detectOllama, getAllBackendsStatus, startOllama, stopOllama

### REST API (`/api/local-llm/*`)
- 백엔드 목록/시작/중지/재시작
- 모델 목록/갤러리/pull/삭제
- Provider 목록 (에이전트 연결용)
- 전체 WebSocket `local_llm_pull_progress` 스트리밍

### 프론트엔드 (`src/components/local-llm/`)
- `LocalLlmSettingsTab.tsx` + `BackendsPanel.tsx` + `BackendCard.tsx` + `ModelsPanel.tsx`
- Settings → LOCAL LLM 탭 추가

---

---

## Local LLM Manager — Phase 2 ✅ (2026-03-16)

### 서버
- `server/modules/local-llm/metrics-collector.ts` — nvidia-smi GPU 파싱, OS RAM, Ollama running model, 5초 WS 브로드캐스트
- `GET /api/local-llm/metrics` — GPU/RAM/inference 스냅샷
- `GET /api/local-llm/metrics/history?limit=` — 추론 이력 (local_llm_inference_log JOIN agents)
- `GET /api/local-llm/settings` / `PATCH /api/local-llm/settings/:name` — host/port/auto_start 설정

### lifecycle.ts
- 서버 시작 5초 후 Ollama auto-start (auto_start=1일 때)
- `startMetricsPoller` — 5초 주기 `local_llm_metrics` WS 브로드캐스트

### 프론트엔드
- `MetricsPanel.tsx` — GPU 게이지, RAM 게이지, TPS 스파크라인 (WS 실시간), 추론 로그 테이블
- `AdvancedSettingsPanel.tsx` — host/port/auto_start 설정 폼 (// label 패턴)
- `LocalLlmSettingsTab.tsx` — BACKENDS / MODELS / MONITOR / SETTINGS 4개 서브탭

---

---

## Local LLM Manager — Phase 3 ✅ (2026-03-16)

### 이모지 제거 + UX 개선 (전체 컴포넌트)
- `BackendCard`: 이모지 제거, variant 버튼 시스템(primary/secondary/ghost/danger), Stop 확인 플로우, 자연어 레이블, 미설치 시 단계별 가이드, "Phase 2 — coming soon" → "Support coming in a future release"
- `BackendsPanel`: 에러 패널 개선, "// DETECTING..." → 자연어, Refresh 버튼 정렬
- `ModelsPanel`: "📦 MY MODELS" → "My Models", "🌐 GALLERY" → "Model Library", 테이블 뷰, Remove 확인 플로우, "↓ PULL" → "Install", 빈 상태 가이드 메시지
- `LocalLlmWidget`: 이모지 제거, 자연어 상태 표시, "Active model"/"Last used" 구분, 깔끔한 Row 컴포넌트

### LM Studio 감지 (Phase 3)
- `lmstudio-client.ts` — `GET /v1/models` 핑으로 실행 감지, 모델 목록 조회
- `backend-manager.ts` — `getAllBackendsStatus`에 LM Studio 병렬 감지 추가
- `/api/local-llm/providers` — Ollama + LM Studio 모델 통합 목록 (group 필드로 구분)

### Inference Logger (Phase 3)
- `inference-logger.ts` — `createInferenceLogger(db)` factory: `log()`, `getHistory()`, `getStatsByModel()`
- `GET /api/local-llm/metrics/history` — inferenceLogger 사용
- `GET /api/local-llm/metrics/stats` — 모델별 집계 (request_count, total_tokens, avg_tps, avg_latency)
- `POST /api/local-llm/log` — 외부에서 추론 이벤트 기록

---

## 2026-03-16 엔드투엔드 통합 수정 ✅

프로젝트→에이전트→태스크 설정 후 모든 기능이 연동되는지 감사하고 5개 끊긴 연결을 수정함.

| 코드 | 내용 | 파일 | 상태 |
|------|------|------|------|
| E2E-01 | CLI createTask에 `project_path` 누락 (git worktree가 서버 cwd 사용) | `AgentCli.tsx` | ✅ 수정 |
| E2E-02 | FlowGraphWidget이 `projectAgentIds` prop을 AgentFlowGraph에 전달 안 함 | `FlowGraphWidget.tsx` | ✅ 수정 |
| E2E-03 | 플로 그래프 - 같은 프로젝트 동시 실행 에이전트 간 협업 엣지 없음 | `useFlowLayout.ts`, `FlowEdge.tsx`, `AgentFlowGraph.tsx` | ✅ 수정 |
| E2E-04 | Meeting Minutes 생성 시 WS 이벤트 없음 (패널 닫히면 알림 불가) | `minutes.ts`, `useRealtimeSync.ts`, `types/index.ts` | ✅ 수정 |
| E2E-05 | **WbRunModal이 태스크만 생성하고 실행 안 함** (워크플로 실행이 실제로 동작 안 됨) | `WbRunModal.tsx`, `WorkflowBuilder.tsx` | ✅ 수정 |
| E2E-06 | **태스크 완료 시 의존 태스크 자동 시작 없음** (워크플로 순차 실행 불가) | `run-complete-handler/core.ts`, `orchestration.ts` | ✅ 수정 |
| E2E-07 | WbRunModal에 `project_path` 누락 | `WbRunModal.tsx` | ✅ 수정 |

### 수정 내용 요약
- **Agent CLI**: `createTask`에 `project_path: currentProject?.project_path` 추가 → git worktree가 올바른 프로젝트 경로 사용
- **Flow Graph**: `projectAgentIds` prop 전달 + 신규 `"collab"` 엣지 타입(같은 프로젝트 동시 실행 에이전트 간 점선 표시)
- **Meeting Minutes**: `beginMeetingMinutes`/`finishMeetingMinutes`에서 `meeting_minutes_update` WS 브로드캐스트 → 클라이언트 즉시 리싱크
- **Workflow Builder 실행**: 루트 태스크(의존성 없는 노드)를 생성 후 자동 `POST /api/tasks/:id/run` 호출, 모달이 실행 상태를 보여주는 동안 유지
- **순차 실행 체인**: `run-complete-handler/core.ts`에서 태스크 완료(exit 0) 시 `task_dependencies` 테이블 조회 → 모든 upstream이 `done`이면 downstream 태스크를 `inbox`로 전환 후 자동 시작

### Tasks 위젯 — 회의록 바로가기 버튼 ✅
- **문제**: `TaskBoard.tsx`가 앱에 렌더링되지 않아 `onOpenMeetingMinutes` 버튼 진입 불가. `TasksWidget`은 클릭 시 항상 터미널 탭만 열림
- **수정**: `TasksWidget.tsx` 각 태스크 행 우측에 `회의록` / `min` 버튼 추가
  - 행 클릭 → 터미널 탭 (기존 동작 유지)
  - `회의록` 버튼 클릭 → MINUTES 탭으로 바로 열림 (`stopPropagation`으로 행 클릭과 분리)

## 2026-03-18 UX 개선 ✅

### Dock & 바탕화면 아이콘 정리
- **중복 아이콘 제거**: 바탕화면에서 Workflow Builder, 새 태스크, 프로젝트 생성 아이콘 제거 (Dock에 이미 존재)
- **Dock "+" 범용 추가 버튼**: 기존 단일 버튼 → 팝업 메뉴로 교체
  - 새 태스크 (orange) / 새 프로젝트 (green) / 새 에이전트 (purple) 3가지 항목
  - 바깥 클릭 시 닫힘, 항목별 accent 색상 hover 효과
- **새 에이전트 → 직원채용창 바로 열기**: `createTrigger` 카운터 패턴
  - `AgentManagerProps.createTrigger?: number` 추가
  - `AgentManager.tsx`: `useEffect`로 값 변경 시 즉시 `openCreate()` 호출
  - `AgentManagerWindow.tsx`: `createTrigger` prop 수신 → `AgentManager`에 전달
  - `Desktop.tsx`: `agentManagerCreateCount` state + Dock `onCreateAgent` 에서 increment + `openWindow`

### 에이전트 하트비트 위젯 — 프로젝트 필터
- **`AgentsWidget.tsx`**: `useProjectStore`로 `currentProjectId` / `projectAgentIds` / `projectAgentsLoaded` 구독
  - 프로젝트 선택 시 해당 프로젝트 소속 에이전트만 표시 (카운트 요약 포함)
  - 프로젝트 미선택 시 전체 에이전트 표시

### 채팅 창 — 프로젝트 필터 + 탭 레이블 개선
- **`ChatWindow.tsx`**: 다이렉트 탭(`ChatPanel`)에 `projectAgents` 전달 (기존 전체 `agents` → 필터링)
  - 그룹 탭은 이미 `projectAgents` 사용 중
- **탭 레이블 변경**: "다이렉트" → "공지" (Broadcast), "그룹" → "단톡방" (Group Chat)
  - SVG 아이콘 추가 (말풍선 + 줄 / 두 사람)
  - `AppWindowTab.label` 타입 `string` → `ReactNode`로 확장
- **`AnnouncementCliPanel.tsx`**: `📢` 이모지 → SVG 스피커 아이콘으로 교체 (헤더, 빈 상태, 메시지 배지)

### 바탕화면 아이콘 정렬 기능 수정
- **`DesktopIcon.tsx`**: `useState` 초기화 문제 수정
  - 외부(정렬/스냅) 에서 `setDesktopIconLayout` 호출 시 로컬 `pos` state가 갱신 안 되던 버그 수정
  - `useEffect`로 `desktopIconLayout[def.id]` 변경 감지 → `dragging` 중이 아닐 때 `pos` 동기화
  - 결과: "이름순 정렬", "기본 순서로 정렬", "격자에 맞추기" 모두 정상 작동

### 마크다운 문서 → 프로젝트 폴더 드래그 앤 드롭
- **전체 흐름**: 에디터에서 작성 → 바탕화면 아이콘으로 저장 → 프로젝트 폴더 아이콘에 드래그 → 실제 파일 저장
- **`uiStore.ts`**: `pendingDocs` 배열 + `addPendingDoc` / `removePendingDoc` 액션 추가
- **`MarkdownEditorModal.tsx`**: "바탕화면에 저장" 버튼 추가
  - 클릭 시 `addPendingDoc` → 바탕화면에 문서 아이콘 생성 후 모달 닫힘
  - 기존 "다운로드 .md" 버튼 유지
- **`DesktopIconDef`**: `docId?: string` (HTML5 drag 소스), `onDropDoc?: (docId: string) => void` (드롭 대상) 필드 추가
- **`DesktopIcon.tsx`**: HTML5 drag/drop 이벤트 처리
  - `docId` 아이콘: `draggable`, `onDragStart` (dataTransfer에 doc ID 기록)
  - `onDropDoc` 아이콘: `onDragOver` / `onDragLeave` / `onDrop` — 드롭 오버 시 amber 하이라이트
  - `docId` 아이콘은 기존 마우스 기반 repositioning 드래그 스킵 (충돌 방지)
- **`DesktopIcons.tsx`**: `IconMarkdownDoc` SVG 아이콘 추가 (파일 + 접힌 모서리 + 텍스트 라인)
- **`Desktop.tsx`**: `pendingDocs` 렌더링 + `handleDropDocToProject` 콜백
  - 프로젝트 폴더 아이콘에 `onDropDoc` 연결
  - 드롭 시 `POST /api/projects/save-file` 호출 → 성공 시 `removePendingDoc`
- **`server/modules/routes/core/projects.ts`**: `POST /api/projects/save-file` 엔드포인트 추가
  - `{ project_path, filename, content }` → `fs.writeFileSync`로 실제 파일 저장
  - 파일명 path separator 제거 (보안), `isPathInsideAllowedRoots` 검증

---

## Local LLM Manager — Phase 4 (UX 완성) ✅ (2026-03-17)

### 탭 간 중복 제거
- **`BackendsPanel.tsx`**: `HardwareBar`, `LoadedModelsSection`, `models`/`hw` state 및 `/metrics`·`/models` API 호출 제거
  - 실행 앱 탭은 백엔드 카드만 담당 → GPU·RAM 현황은 모니터 탭에서만 표시
- **`ModelsPanel.tsx` (GalleryCard)**: 갤러리 카드에서 삭제 버튼 제거
  - 모델 삭제는 "내 모델" 테이블 탭에서만 가능 (중복 UX 제거)

### 설치 로그 & 에러 표시 개선
- **버그 수정**: `status === "error"` 시 pulling state 즉시 삭제하던 버그 → 에러 state 유지, 카드에 표시
- **실시간 로그**: Ollama 상태 텍스트(`pulling manifest`, `pulling layer...`, `verifying sha256 digest` 등) 진행 바 하단에 실시간 표시
- **에러 카드 UI**: 빨간 에러 박스 + 에러 메시지 전문 + 재시도 버튼 + 닫기 버튼

### 추천 모델 기능
- **`ModelsPanel.tsx`**: 모델 라이브러리 탭 상단에 "⭐ 내 PC 추천 모델" 섹션 추가
  - GPU 있을 때: VRAM에 맞는 모델 중 가장 큰 것 최대 4개 추천 (내림차순)
  - CPU only: RAM에 맞는 모델 중 가장 큰 것 최대 4개 추천
  - 이미 설치된 모델 제외, 검색 중 자동 숨김
  - 추천 카드: 황금 테두리·배경 강조, 헤더에 VRAM/RAM 기준 명시
  - `recommended` prop으로 GalleryCard 스타일 분기

### 스크롤 구조 수정
- **`LocalLlmSettingsTab.tsx`**: 루트 div `height: "100%"` + 콘텐츠 div `flex: 1, overflowY: auto` 제거 → 부모 스크롤 위임
- **`SettingsWindow.tsx`**: 내부 래퍼 div에 `display: flex, flexDirection: column` 추가
  - 원인: SettingsPanel root의 `flex-1`이 부모가 flex가 아니어서 무효 → content div의 `flex-1 min-h-0 overflow-y-auto`도 고정 높이 확보 불가 → 모든 설정 탭 스크롤 작동
  - 결과: 모든 설정 탭(general, data, local-llm 등) 스크롤 정상화

---

## 2026-03-19 Local LLM Phase 5 — llama.cpp · Jan 백엔드 감지 ✅

### 신규 클라이언트 모듈
- **`server/modules/local-llm/llamacpp-client.ts`** (신규):
  - `ping()` — `/health` 1차 시도 (llama.cpp 네이티브 엔드포인트), `/v1/models` 폴백
  - `listModels()` — OpenAI compat `/v1/models`
  - `getHealth()` — `{ status, slots_idle, slots_processing }` 반환
- **`server/modules/local-llm/jan-client.ts`** (신규):
  - `ping()` — `/v1/models` HTTP 핑 (포트 1337)
  - `listModels()` — Jan API OpenAI compat 모델 목록

### backend-manager.ts 업데이트
- `detectLlamaCpp()` — `llama-server --version` → 없으면 `llama-cli --version` 폴백
- `detectJan()` — 플랫폼별 설치 경로 확인 (Windows `%LOCALAPPDATA%\Programs\Jan`, macOS `/Applications/Jan.app`)
- `getAllBackendsStatus()`:
  - 4개 백엔드 병렬 HTTP ping + 모델 카운트 fetch
  - llamacpp/jan `installed` 필드: 바이너리 감지 OR HTTP ping 결과

### REST API 업데이트 (`local-llm.ts`)
- `start/stop/restart` — llamacpp/jan 수동 조작 안내 메시지 반환
- `GET /api/local-llm/providers` — llamacpp(port 8080) / Jan(port 1337) 모델 목록 포함

### UI 업데이트 (`BackendCard.tsx`)
- `isGuiBackend` 확장: `lmstudio || jan` (Jan도 GUI 앱으로 동일 처리)
- `isLlamaCpp` 분기 추가:
  - **Running**: 초록 상태 표시 + 모델 카운트
  - **Installed, not running**: 실행 명령어 코드블록 표시
  - **Not installed**: GitHub 릴리스 링크 + 설치 안내
- Jan: `isJan` 분기로 LM Studio와 동일 패턴이지만 Jan 전용 문구 (API Server 설정 안내)
- "향후 릴리스에서 지원 예정" 메시지 제거

---

## 2026-03-19 Synapse Phase 5 — 채팅 @멘션 ✅

### @notion / @obsidian 인라인 검색 드롭다운
- **`src/components/chat-panel/KbMentionDropdown.tsx`** (신규):
  - `@notion` / `@obsidian` + 쿼리 패턴 감지 시 textarea 위에 absolute 드롭다운
  - 200ms debounce 후 Notion 페이지 / Obsidian 파일 검색 (최대 8개)
  - ↑↓ 키보드 내비게이션, Enter 선택, Esc 닫기
  - 미연결 시 "Settings → Synapse에서 연결하세요" 안내
- **`src/components/chat-panel/ChatComposer.tsx`**:
  - `kbSources?: KbSourceRef[]` + `onKbSourcesChange?` props 추가
  - `@notion`/`@obsidian` 패턴 감지 → `KbMentionDropdown` 렌더링
  - 선택 시 trigger 텍스트 제거 + KB 소스 배지 추가 (amber 스타일)
  - 배지 ✕ 클릭으로 제거
- **`src/components/chat-panel/GroupChatPanel.tsx`**:
  - `kbSources` 상태 + `KbMentionDropdown` 연결
  - 전송 시 `fetchSynapseContext()` 호출 → `[첨부 지식 베이스: ...]` prefix 삽입
  - KB 소스 배지 표시 (파일 첨부 배지와 동일 위치)
- **`src/components/ChatPanel.tsx`** (1:1 채팅):
  - `kbSources` 상태 + `ChatComposer`에 props 전달
  - 전송 시 KB 컨텍스트 content에 prepend

---

## 2026-03-19 Synapse Phase 3 & 4 ✅

### Phase 3 — 자동화 규칙 엔진
- **DB migration** `2026-03-18-001-synapse-rules`: `synapse_rules` 테이블 + 인덱스
- **`server/modules/synapse/rule-engine.ts`** (신규): 규칙 매칭, rate-limit(60s), `create_task` 액션, `{{filename}}`/`{{path}}`/`{{title}}` 템플릿
- **`server/modules/synapse/obsidian-watcher.ts`** (신규): `fs.watch()` — `.md` 파일 변경 감지, 5분 주기 볼트 재감지
- **`server/modules/synapse/notion-poller.ts`** (신규): 30초 주기 Notion 변경 감지
- **`server/modules/routes/ops/synapse.ts`**: `GET/POST/PUT/DELETE /api/synapse/rules` CRUD 추가
- **`server/modules/lifecycle.ts`**: `startObsidianWatcher` + `startNotionPoller` 시작·종료 훅 추가
- **`src/api/synapse.ts`**: `SynapseRule` 타입 + CRUD 함수 추가
- **`src/components/synapse/SynapsePanel.tsx`**: RULES 탭 전체 UI — 목록 ON/OFF 토글, 인라인 생성 폼

### Phase 4 — 에이전트 KB 컨텍스트 주입
- **DB migration** `2026-03-18-002-synapse-kb-sources`: `agents.kb_default_sources` + `tasks.kb_context_sources` 컬럼 추가
- **`server/modules/synapse/context-fetcher.ts`** (신규): `fetchKbContextBlock` (Notion/Obsidian/NotebookLM 소스 병합, MAX 20000자), `buildKbContextBlock` (태스크+에이전트 소스 합산)
- **`server/modules/routes/core/tasks/execution-run.ts`**: 태스크 실행 전 `buildKbContextBlock` 호출 → 프롬프트에 `[Knowledge Base Context]` 블록 주입
- **`server/modules/routes/core/tasks/crud.ts`**: 태스크 생성 시 `kb_context_sources` 저장
- **`server/modules/routes/core/agents/crud.ts`**: `allowedFields`에 `kb_default_sources` 추가
- **`server/modules/routes/ops/synapse.ts`**: `POST /api/synapse/context` 엔드포인트 추가
- **`src/api/synapse.ts`**: `KbSourceRef` + `fetchSynapseContext()` 추가
- **`src/components/agent-manager/AgentFormModal.tsx`**: `KbSourcesSection` 컴포넌트 — Notion 페이지 / Obsidian 파일 선택 UI
- **`src/components/AgentManager.tsx`**: 저장 시 `kb_default_sources` JSON 직렬화, 불러올 때 파싱
- **`src/components/taskboard/create-modal/KbTaskSourcesSection.tsx`** (신규): 태스크 생성 모달 KB 소스 첨부 섹션
- **`src/components/taskboard/CreateTaskModal.tsx`**: `kbSources` 상태 + `wrappedOnCreate`에 `kb_context_sources` 포함

---

## 2026-03-19 TaskBoard · Terminal 개선 ✅

### Terminal Panel — 회의록 탭 수정
- **`server/modules/routes/core/tasks/crud.ts`**: `GET /api/tasks/:id/meeting-minutes` 엔드포인트 추가 (미구현으로 인한 404 버그 수정)
- **`server/modules/routes/ops/terminal/routes.ts`**: `pretty=true`일 때 progress hints·thinking blocks 계산이 건너뛰어지던 버그 수정 (pretty 처리와 분리)
- **`useTerminalPanelData.ts`**: `pretty=false`로 변경 → 도구 호출 로그가 원본 JSONL 그대로 전달됨

### Terminal Panel — 도구 실행 표시 (macOS 스타일)
- **`ProgressHintsStrip.tsx`**: 전면 재작성
  - glassmorphism 배경 (`backdrop-filter: blur(20px)`)
  - 펄스 green dot + 도구 뱃지 (아이콘 + 이름, 도구별 색상)
  - 최근 힌트 pill 트레일 (✓ ok / ⚠ error / › active), `isLight` 대응
- **`TerminalTabContent.tsx`**: 도구 호출 카드 렌더러 전면 재작성
  - `parseCliLines()` → 멀티블록 파싱 (tool_use가 text 뒤에 오는 경우 누락 버그 수정)
  - `stream_event` 라인 → `_streamDelta` 집계, 최종 결과 있으면 스트림 제거
  - `ToolCard`: 좌측 accent bar (도구별 색상), chevron 토글, `ToolInputBlock` (bash/파일/검색/JSON 분기)
  - 최종 결과 완료 배너: circle check 아이콘, 비용/소요시간 표시
  - `isLight` threading → 라이트모드 가독성 수정

### TaskBoard — i18n 완성
- **`TaskBoard.tsx`**: `STATUS_CODE` 코드 `t()` 번역 (한/영/일/중)
- **컬럼 헤더**: `sc.code` → `taskStatusLabel()` 로 완전 번역 적용
- **Batch 버튼**: `STOP` / `HIDE` / `DEL` → `t()` 번역
- **AppWindow 제목**: `"New Task"` → `t({ko:"새 업무",...})`
- **`TaskCard.tsx`**: 서브태스크 `"pending"` 텍스트 번역

### TaskBoard — macOS UI 개선
- **`TaskCard.tsx`**:
  - 카드 컨테이너: `borderRadius: 12`, 다층 shadow, hover `transition`
  - Status/Agent 블록: 짙은 `bg-primary` 박스 → 투명 레이아웃 (select + 에이전트 행 분리)
  - 액션 버튼: 주요 액션은 pill형, 보조 버튼은 compact icon group (오른쪽 정렬)
  - 인라인 실행 로그 섹션 제거 (불필요한 UI)
  - 관련 dead state/effect/import 정리 (`showTerminalPreview`, `terminalLogs`, `terminalPollRef`, `fetchTerminalPreview`)

### TaskBoard — 컬럼 스크롤 수정
- **`TaskBoard.tsx`**:
  - `DroppableColumn` 내부 div에 `min-h-0` 추가 → flex chain 높이 전달 수정
  - 컬럼 div: `sm:min-h-0` 추가
  - 카드 목록 body: Tailwind `sm:` 클래스 → inline `style={{ flex:1, minHeight:0, overflowY:"auto" }}` 교체 → 컬럼별 독립 스크롤 정상 동작

---

## 2026-03-19 에이전트 상세 패널 ✅

### Agent Detail Panel (우측 슬라이드 인스펙터)
- **`src/components/agent-detail/AgentDetailPanel.tsx`** (신규): 패널 컨테이너
  - `position: fixed`, `top: 28px`, `right: 0`, `bottom: 48px`, `width: 360px`, `z-index: 300`
  - CSS transition 애니메이션: 열기 200ms ease-out / 닫기 160ms ease-in
  - `selectedAgentId` 변경 시 5개 API 병렬 fetch (skills/rules/memory/tasks/cost-summary)
  - TrafficLights + ESC ✕ 타이틀바
- **`src/components/agent-detail/AgentDetailHeader.tsx`** (신규): 헤더 섹션
  - 아바타 이모지 (32px), 이름(name_ko), 역할 뱃지, 상태 dot, CLI 모델, 부서명
- **`src/components/agent-detail/AgentDetailCurrentTask.tsx`** (신규): 현재 태스크 섹션
  - `agent.current_task_id` → taskStore 조회, 시작 시각 상대시간 표시
  - 태스크 없으면 "No active task" 표시
- **`src/components/agent-detail/AgentDetailSections.tsx`** (신규): 스킬/규칙/메모리/최근태스크/비용 섹션
  - 각 섹션 `// section-name` 레이블 패턴
  - 로딩 중 스켈레톤 표시, 데이터 없으면 섹션 숨김
  - 규칙 scope 배지 색상 구분 (project=amber / agent=blue / global=green)
- **`src/components/desktop/Desktop.tsx`**:
  - `AgentDetailPanel` 조건부 렌더 추가
  - ESC 핸들러에 `selectedAgentId` 닫기 조건 추가
- **`src/components/desktop/widgets/AgentsWidget.tsx`**:
  - 에이전트 행 클릭 → `setSelectedAgentId` 토글 연결
  - 선택된 행 `background: var(--th-accent-glow)` 하이라이트
- **`src/components/desktop/widgets/FlowGraphWidget.tsx`**:
  - `handleSelectAgent`에서 `openWindow("agent-manager")` 제거 → `selectedAgentId` 토글만 남김

---

## 전체 개발 우선순위

> 마지막 업데이트: 2026-03-19

| 순위 | 항목 | 설명 | 상태 |
|------|------|------|------|
| ~~🥇 1~~ | ~~**TaskBoard 뷰 연결**~~ | ~~`TaskBoard.tsx` 코드 존재, 앱에 렌더링만 추가하면 됨~~ | ✅ 완료 (TaskBoardWindow.tsx로 연결됨) |
| ~~🥇 1~~ | ~~**Synapse Phase 1**~~ | ~~Notion + Obsidian 읽기 연결 — 독립 Dock 앱 창, 에이전트 컨텍스트 주입~~ | ✅ 완료 |
| ~~—~~ | ~~**Synapse Phase 2~4**~~ | ~~산출물 내보내기 / 문서 변경 트리거 / KB 컨텍스트 주입~~ | ✅ 완료 |
| ~~🥇 1~~ | ~~**Local LLM Phase 5**~~ | ~~llama.cpp / Jan 백엔드 실행 감지~~ | ✅ 완료 |
| ~~🥇 1~~ | ~~**UI/UX 전반 polish**~~ | ~~각 창 스크롤·반응형·i18n 누락·접근성 개선~~ | ✅ 완료 (2026-03-19) |
| ~~🥇 1~~ | ~~**에이전트 상세 패널**~~ | ~~AgentsWidget/FlowGraph 클릭 → 우측 슬라이드 인스펙터 패널~~ | ✅ 완료 (2026-03-19) |

> Synapse 문서: `docs/features/synapse.md`
> 에이전트 상세 패널 설계: `docs/features/agent-detail-panel.md`

---

## 2026-03-19 소스코드 감사 — 문서 동기화 ✅

소스코드 직접 분석으로 아래 사항 확인 및 문서 갱신:

### 버그 전체 수정 확인
- **BUG-01~06** (pipeline audit): 모두 소스코드에서 수정 확인 → OVERVIEW.md 상태 `⬜ Open` → `✅ Done` 일괄 갱신
- **WB-01~03** (Workflow Builder): 모두 수정 확인
- **FG-01~03** (Flow Graph): 모두 수정 확인

### Synapse 모듈 확인
- `server/modules/synapse/` 가 유일한 지식베이스 모듈 (notion-client, obsidian-client, context-fetcher, rule-engine, obsidian-watcher, notion-poller)
- `server/modules/routes/ops/synapse.ts` + `server/modules/lifecycle.ts` 에서 synapse import
- 프론트엔드: `src/api/synapse.ts`, `src/components/synapse/` 사용 중

### Dead code 정리 완료
- **`src/components/windows/HarnessWindow.tsx`**: 삭제 완료 (SynapseWindow.tsx와 동일한 dead code)

### 현재 활성 아키텍처 확인
| 창 타입 | WindowType | 렌더링 | Dock |
|---------|-----------|--------|------|
| Task Board | `"tasks"` | ✅ Desktop.tsx | ✅ Dock.tsx |
| Synapse (지식베이스) | `"synapse"` | ✅ Desktop.tsx | ✅ Dock.tsx |
| HarnessWindow | — | ✅ 삭제됨 (dead code 제거) | — |

---

## 문서 현황

| 문서 | 상태 |
|------|------|
| `docs/OVERVIEW.md` | ✅ 최신 (2026-03-19 업데이트) |
| `docs/features/agent-cli.md` | 🔜 Phase 18 스펙 (2026-03-22 작성) |
| `docs/features/image-studio.md` | ✅ 최신 (Phase 15 완료 반영) |
| `docs/features/synapse.md` | ✅ 최신 (Synapse Phase 1~5 전체) |
| `docs/features/local-llm-manager.md` | ✅ 최신 |
| `docs/features/figma-integration.md` | ✅ 참조용 (구현 완료) |
| `docs/features/design-workflow-template.md` | 📋 계획 중 |
| `docs/specs/api.md` | ✅ 최신 (v1.6.0 — Phase 16 엔드포인트 추가) |
| `docs/strategy/bigger-ide-vision.md` | ✅ 전략 문서 (참조용 유지) |
| `docs/architecture/` | 참조용 유지 |
| `docs/design/DESIGN.md`, `UI-SCREENS.md` | 참조용 유지 |

### 삭제된 문서
- `docs/strategy/p2-tasks-design.md` — P2 작업 전체 완료, 구현 지침 불필요
- `docs/strategy/agent-persona-system.md` — 2026-03-08 폐기 결정
- `docs/features/custom-widget-platform-tech-spec.md` — 구현 완료, 기획서에 통합
- `docs/features/knowledge-base-integrations.md` — Harness(synapse)로 통합
- `docs/features/agent-detail-panel.md` — 구현 완료, progress.md에 통합 (2026-03-20)
- `docs/features/custom-widget-platform.md` — 구현 완료, progress.md에 통합 (2026-03-20)
- `docs/features/cross-project-handoff.md` — 구현 완료 (Phase 16), progress.md에 통합 (2026-03-21)
- `docs/features/project-folders.md` — 구현 완료 (Phase 17), progress.md에 통합 (2026-03-22)
- `docs/strategy/agent-flow-graph-design.md` — 구현 완료 (P2-1, 2026-03-14), 참조 불필요
- `docs/bugs/PIPELINE-AUDIT-2026-03-16.md` — BUG-01~06 전체 수정 완료, 이력만 progress.md에 유지
- `docs/bugs/UI-AUDIT-2026-03-16.md` — WB-01~03, FG-01~03 전체 수정 완료, 이력만 progress.md에 유지
