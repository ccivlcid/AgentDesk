# Docs

> **Starting point:** [`OVERVIEW.md`](./OVERVIEW.md) — What AgentDesk is, why it was built, and how it works, all in one document.

---

## Root

| Document | Description |
|------|------|
| [OVERVIEW.md](OVERVIEW.md) | **Master overview** — Project OS concept, agent monitoring, execution pipeline, current status, roadmap |
| [progress.md](progress.md) | **Development progress** — Latest work log, completed items, next candidates |

---

## design/

| Document | Description |
|------|------|
| [DESIGN.md](design/DESIGN.md) | **UI implementation reference** — Full CSS variables + component patterns (macOS Hybrid, colors, fonts, rules) |
| [UI-SCREENS.md](design/UI-SCREENS.md) | **Screen & modal list** — 13 main screens + 36 overlay specifications |

---

## specs/

| Document | Description |
|------|------|
| [api.md](specs/api.md) | API contract — endpoints, auth, messenger, Rules/Memory/Hooks `project_id` filter |
| [openapi.json](specs/openapi.json) | OpenAPI definition (auto-generated) |

---

## architecture/

| Document | Description |
|------|------|
| [ARCHITECTURE-AUDIT-2026-Q1.md](architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | **Comprehensive audit** — FE/BE/security/DB, error handling, roadmap (backend audit integrated) |
| [SYSTEM-STRUCTURE-MAP.md](architecture/SYSTEM-STRUCTURE-MAP.md) | System structure map — Frontend, Backend, DB, execution flow |
| [README.md](architecture/README.md) | Project tree + dependency diagram (auto-generated — `npm run arch:map`) |

---

## features/

| Document | Description |
|------|------|
| [custom-widget-platform.md](features/custom-widget-platform.md) | Custom Widget Platform — spec + Phase 1~5 implementation summary (complete) |
| [knowledge-base-integrations.md](features/knowledge-base-integrations.md) | Knowledge Base Integrations — Notion / Obsidian / NotebookLM 연결 기획 (미구현) |

---

## strategy/

| Document | Description |
|------|------|
| [agent-performance-audit.md](strategy/agent-performance-audit.md) | Agent execution performance audit — 10 bottlenecks, Phase 1 complete |
| [bigger-ide-vision.md](strategy/bigger-ide-vision.md) | "Bigger IDE" strategic vision |
| [agent-flow-graph-design.md](strategy/agent-flow-graph-design.md) | Agent Flow Graph SVG implementation design (implementation complete) |

---

## reports/

| Item | Description |
|------|------|
| AgentDesk-Analysis-Report.pptx | Analysis report |
| Sample_Slides/ | Slide samples |

---

## Rules

- **Links:** Use relative paths only.
- **Maintenance:** Do not add documents to the index if they do not exist in the repository. When adding a new document, add one line to this README.
