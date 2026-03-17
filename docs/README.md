# Docs

> **Starting point:** [`OVERVIEW.md`](./OVERVIEW.md) — What AgentDesk is, why it was built, and how it works.

---

## Root

| Document | Description |
|----------|-------------|
| [OVERVIEW.md](OVERVIEW.md) | **Master overview** — Project OS concept, agent monitoring, execution pipeline, current status |
| [progress.md](progress.md) | **Development progress** — Latest work log, completed items, next candidates |

---

## design/

| Document | Description |
|----------|-------------|
| [DESIGN.md](design/DESIGN.md) | **UI implementation reference** — Full CSS variables + component patterns |
| [UI-SCREENS.md](design/UI-SCREENS.md) | **Screen & modal list** — 13 main screens + 36 overlay specifications |

---

## specs/

| Document | Description |
|----------|-------------|
| [api.md](specs/api.md) | **API contract v1.5.0** — All endpoints, auth, Image Studio, Local LLM, Synapse |

---

## architecture/

| Document | Description |
|----------|-------------|
| [ARCHITECTURE-AUDIT-2026-Q1.md](architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | Comprehensive FE/BE/security/DB audit |
| [SYSTEM-STRUCTURE-MAP.md](architecture/SYSTEM-STRUCTURE-MAP.md) | System structure map |
| [README.md](architecture/README.md) | Project tree + dependency diagram (auto-generated) |

---

## features/

완료된 기능의 구현 상세. 진행 현황 전체는 `progress.md` 참조.

| Document | Status | Description |
|----------|--------|-------------|
| [image-studio.md](features/image-studio.md) | ✅ 완료 | Image Studio — AI 이미지 생성, 갤러리, 태스크 연동 |
| [synapse.md](features/synapse.md) | ✅ 완료 | Synapse — Notion / Obsidian / NotebookLM 연결 |
| [local-llm-manager.md](features/local-llm-manager.md) | ✅ 완료 | Local LLM — Ollama, LM Studio, llama.cpp, Jan |
| [figma-integration.md](features/figma-integration.md) | ✅ 완료 | Figma 연동 — 태스크 URL 첨부, 에이전트 컨텍스트 주입 |
| [design-workflow-template.md](features/design-workflow-template.md) | ✅ 완료 | Design 워크플로우 템플릿 |
| [cross-project-handoff.md](features/cross-project-handoff.md) | 📋 계획 | Cross-Project Handoff (Phase 16) |

---

## strategy/

| Document | Description |
|----------|-------------|
| [bigger-ide-vision.md](strategy/bigger-ide-vision.md) | "Bigger IDE" strategic vision |
| [agent-performance-audit.md](strategy/agent-performance-audit.md) | Agent execution performance audit |
| [agent-flow-graph-design.md](strategy/agent-flow-graph-design.md) | Agent Flow Graph design (implemented) |

---

## Rules

- **Links:** Use relative paths only.
- **features/**: 구현 완료 문서만 유지. 구현 상세가 progress.md에 충분하면 별도 문서 불필요.
- **삭제 기준:** 구현 완료 + progress.md에 통합된 스펙 문서는 제거.
