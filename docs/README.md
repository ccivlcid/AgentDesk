# Docs

> **Starting point:** [`OVERVIEW.md`](./OVERVIEW.md) — What AgentDesk is, why it was built, and how it works.

---

## Root

| Document | Description |
|----------|-------------|
| [OVERVIEW.md](OVERVIEW.md) | **Master overview** — Project OS concept, agent monitoring, execution pipeline, completion history |
| [progress.md](progress.md) | **Development progress** — Latest work log, completed items, per-phase implementation details |

---

## design/

| Document | Description |
|----------|-------------|
| [DESIGN.md](design/DESIGN.md) | **UI implementation reference** — Full CSS variables + component patterns |
| [UI-SCREENS.md](design/UI-SCREENS.md) | **Screen & modal list** — Main screens + overlay specifications |

---

## specs/

| Document | Description |
|----------|-------------|
| [api.md](specs/api.md) | **API contract v1.6.0** — All endpoints, auth, Image Studio, Local LLM, Synapse, Project Folders |

---

## architecture/

| Document | Description |
|----------|-------------|
| [ARCHITECTURE-AUDIT-2026-Q1.md](architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | Comprehensive FE/BE/security/DB audit (2026-Q1, all issues resolved) |
| [schema-erd.md](architecture/schema-erd.md) | DB schema ER diagram + state machines |

---

## Rules

- **Links:** Use relative paths only.
- **Deletion criteria:** Completed strategy/spec docs are removed once content is consolidated into `progress.md` or `OVERVIEW.md`.
- **Removed:** `strategy/bigger-ide-vision.md`, `strategy/agent-performance-audit.md`, `strategy/cli-hybrid-execution.md`, `architecture/SYSTEM-STRUCTURE-MAP.md` — all implementation complete, content merged.
