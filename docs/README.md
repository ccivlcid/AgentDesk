# Docs

> **시작점:** [`OVERVIEW.md`](./OVERVIEW.md) — AgentDesk가 무엇이고, 왜 만들어졌는지, 어떻게 동작하는지 한 문서에서 읽을 수 있다.

---

## 루트

| 문서 | 설명 |
|------|------|
| [OVERVIEW.md](OVERVIEW.md) | **마스터 개요** — Project OS 컨셉, 에이전트 모니터링, 실행 파이프라인, 현재 상태, 로드맵 |

---

## design/

| 문서 | 설명 |
|------|------|
| [UI-SCREENS.md](design/UI-SCREENS.md) | **전체 화면·모달 목록** — 13개 메인 화면 + 36개 오버레이 상세 |
| [DESIGN.md](design/DESIGN.md) | UI/UX 가이드 — 컴포넌트 패턴, 색·폰트·규칙 + CSS 변수 전체 목록 (design-system 통합) |
| [DESIGN_SKILLS.md](design/DESIGN_SKILLS.md) | 스킬 학습 히스토리·CLI 프롬프트 UI 스펙 |
| [uiux_prompt.md](design/uiux_prompt.md) | UI/UX 프롬프트 |
| AgentDesk_프로젝트소개.pptx | 프로젝트 소개 발표 자료 |

---

## specs/

| 문서 | 설명 |
|------|------|
| [api.md](specs/api.md) | API 계약 — 엔드포인트, 인증, 메신저, Rules/Memory/Hooks `project_id` 필터 |
| [openapi.json](specs/openapi.json) | OpenAPI 정의 |

---

## strategy/

| 문서 | 설명 |
|------|------|
| [agent-performance-audit.md](strategy/agent-performance-audit.md) | **에이전트 실행 성능 감사** — 병목 10개, 3단계 수정 로드맵 (Phase 1 완료) |
| [bigger-ide-vision.md](strategy/bigger-ide-vision.md) | "더 큰 IDE" 전략 비전 — 시각화·에이전트 프로그래밍·통합 IDE |
| [agent-persona-system.md](strategy/agent-persona-system.md) | 에이전트 페르소나 시스템 — 유명인 페르소나 카탈로그 |
| [agent-flow-graph-design.md](strategy/agent-flow-graph-design.md) | 에이전트 플로우 그래프 설계 (구현 예정) |

---

## architecture/

| 문서 | 설명 |
|------|------|
| [README.md](architecture/README.md) | 시스템 개요, 프로젝트 트리, 의존성 다이어그램 (자동 생성) |
| [SYSTEM-STRUCTURE-MAP.md](architecture/SYSTEM-STRUCTURE-MAP.md) | 시스템 구조 맵 — Frontend·Backend·DB·실행 흐름 |
| [ARCHITECTURE-AUDIT-2026-Q1.md](architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | **종합 감사** — 아키텍처·백엔드·보안·DB·에러 처리·로드맵 (backend-engine-audit 통합) |
| org-chart.mmd, backend-dependencies.mmd, frontend-imports.mmd | 자동 생성 다이어그램 |
| architecture.json | 자동 생성 리포트 (`npm run arch:map`으로 재생성) |

---

## reference/

| 문서 | 설명 |
|------|------|
| [exe-packaging-plan.md](reference/exe-packaging-plan.md) | 실행 파일 패키징 계획 |

---

## reports/

| 항목 | 설명 |
|------|------|
| AgentDesk-Analysis-Report.pptx | 분석 리포트 |
| Sample_Slides/ | 슬라이드 샘플 (HTML → PPTX 빌드 스크립트 포함) |

---

## 규칙

- **링크:** 상대 경로만 사용.
- **정리:** 저장소에 없는 문서는 인덱스에 넣지 않음. 새 문서 추가 시 이 README에 한 줄씩 반영.
