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
| [api.md](specs/api.md) | **API contract v1.6.0** — All endpoints, auth, Image Studio, Local LLM, Synapse, Project Folders |

---

## architecture/

| Document | Description |
|----------|-------------|
| [ARCHITECTURE-AUDIT-2026-Q1.md](architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | Comprehensive FE/BE/security/DB audit |
| [SYSTEM-STRUCTURE-MAP.md](architecture/SYSTEM-STRUCTURE-MAP.md) | System structure map |

---

---

## strategy/

| Document | Description |
|----------|-------------|
| [bigger-ide-vision.md](strategy/bigger-ide-vision.md) | "Bigger IDE" strategic vision |
| [agent-performance-audit.md](strategy/agent-performance-audit.md) | Agent execution performance audit |

---

## Rules

- **Links:** Use relative paths only.
- **features/**: 구현 완료 문서만 유지. 구현 상세가 progress.md에 충분하면 별도 문서 불필요.
- **삭제 기준:** 구현 완료 + progress.md에 통합된 스펙 문서는 제거.
