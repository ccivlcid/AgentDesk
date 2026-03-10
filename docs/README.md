# Docs Index

최종 정리일: 2026-03-09  
기준: Project OS + 사용자 정의 카테고리

문서는 역할별로 `strategy/`, `design/`, `specs/`, `architecture/`, `plans/`, `reference/`, `reports/` 에 나뉘어 있습니다.

---

## 핵심 문서 (우선 읽기)

- [product-design.md](product-design.md) — **제품설계서** (비전, 포지셔닝, 구조, 기능, UX, 용어 정의)
- [strategy/claw-empire-differentiation-plan.md](strategy/claw-empire-differentiation-plan.md) — Project OS 전략, 카테고리 시스템, 60일 로드맵
- [strategy/claw-empire-comparison.md](strategy/claw-empire-comparison.md) — Claw-Empire 대비 유사점/차이점
- [design/DESIGN.md](design/DESIGN.md) — UI/UX 핵심 가이드
- [specs/api.md](specs/api.md) — API 계약 베이스라인

---

## strategy/ — 제품·포지셔닝·차별화

- `claw-empire-differentiation-plan.md` — Project OS 리뉴얼 전략
- `claw-empire-comparison.md` — Claw-Empire 비교
- `agentdesk-vs-openai-symphony.md` — OpenAI Symphony 대비
- `ui-differentiation-strategy.md` — UI 차별화
- `pack-identity-system.md` — 팩 정체성
- `agent-persona-system.md` — 에이전트 페르소나
- `필요-기능-분석.md` — 필요 기능 분석

---

## design/ — 디자인·경험

- `ux-renewal-2.0.md` — **2.0 리뉴얼 UX 스펙** (사이드바/대시보드/카테고리/온보딩 플로우)
- `design-system.md` — 디자인 시스템
- `design-retro-terminal-overhaul.md` — 레트로 터미널 개편
- `office-customization-design.md` — 오피스 커스터마이징
- `office-theme-manager-design.md` — 오피스 테마 매니저
- `office-view-tower-redesign.md` — 오피스 뷰 타워 리디자인
- `dashboard-office-pack-steps.md` — 대시보드·오피스 팩 단계
- `DESIGN.md` — UI/UX 가이드
- `DESIGN_SKILLS.md` — 디자인 스킬

---

## specs/ — 스펙·계약

- `deliverables-spec.md` — 산출물 스펙
- `api.md` — API 문서
- `openapi.json` — OpenAPI 정의

---

## architecture/ — 아키텍처

- [architecture/README.md](architecture/README.md)
- `SYSTEM-STRUCTURE-MAP.md`, `org-chart.mmd`, `backend-dependencies.mmd`, `frontend-imports.mmd`
- `architecture.json`, `source-tree.txt`

---

## plans/ — 개발·운영 계획

- `tech-implementation-2.0.md` — **2.0 기술 구현 계획서** (DB 스키마·백엔드 라우트·프론트엔드 컴포넌트·Phase별 코딩 순서)
- `2026-02-25-server-types-nocheck-removal.md`
- `2026-02-27-workflow-pack-mvp.md`
- `heartbeat-logs-guide.md`

---

## reference/ — 이력·참고

- `progress.md` — 진행 이력
- `office-pack-phase17.md` — 오피스 팩 Phase 17
- `exe-packaging-plan.md` — 실행 파일 패키징
- `phaser-migration.md` — Phaser 마이그레이션

---

## reports/ — 리포트·산출물

- `AgentDesk-Analysis-Report.pptx`
- `Sample_Slides/` — 슬라이드 샘플 및 빌드 스크립트

---

## 정리 원칙

- 일회성 운영 로그/보안 점검/팩트체크 증적은 `docs`에서 제거
- 제품 전략·설계·아키텍처·개발 계획만 유지
- 링크는 상대경로만 사용 (절대경로 금지)
- 문서 이동 후 다른 문서 내 링크가 깨졌다면 해당 경로만 수정
