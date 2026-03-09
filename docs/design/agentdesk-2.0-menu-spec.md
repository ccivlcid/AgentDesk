# AgentDesk 2.0 ? Menu (Sidebar) Definition and Renewal

**Note:** This doc was restored in English after encoding corruption. You can re-add Korean labels in your editor and save as UTF-8 if needed.

Date: 2026-03-09  
Goal: Define current menu structure and renewal direction for Project OS + category-centric 2.0. (No login.)

---

## 1. Current Menu Structure (As-Is)

Source: `src/components/Sidebar.tsx` ? `NAV_STRUCTURE` + brand / departments / status bar

### 1-1. Top brand area

| Element | Content |
|---------|---------|
| Logo/icon | AgentDesk desk icon (amber) |
| Line 1 | `settings.companyName` (company name) |
| Line 2 | `settings.ceoName` (CEO name) |

? **Role(CEO)-centric** exposure. **(Remove CEO concept in 2.0)**

### 1-2. Navigation order (top to bottom)

| Order | Type | View ID | Label (KO) | Note |
|-------|------|---------|------------|------|
| 1 | Single | `office` | Office | Pixel office canvas |
| 2 | Group | **agents** | Agents | Expand: Agents & Depts / Heartbeat |
| 3 | Group | **library** | Library | Expand: Skills / Agent Rules / Memory / Hooks |
| 4 | Single | `dashboard` | Dashboard | |
| 5 | Single | `cli-usage` | CLI Usage | |
| 6 | Group | **tasks** | Tasks | Expand: Task Board / Deliverables / Scheduler |
| 7 | Single | `game-room` | Lounge | |
| 8 | Single | `settings` | Settings | |

### 1-3. Bottom fixed area

| Area | Content |
|------|---------|
| **Departments** | Collapse/expand. Dept icon, name, progress bar, working count |
| **Status bar** | Connection (Online/Offline) · `workingCount/totalAgents` |
| **Collapse btn** | Sidebar collapse (icons only when collapsed) |

### 1-4. Current structure notes

- **Entry**: App launch ? last view or default. **No project/category selection step.**
- **3 groups**: Agents (agents/heartbeat), Library (skills/agent-rules/memory/hooks), Tasks (tasks-board/deliverables/scheduled).
- **Role exposure**: Brand shows CEO name and company name. **(Remove in 2.0)**
- **Project switch**: Not in sidebar. (May be in modal/header ? TBD.)

---

## 2. 2.0 Renewal Direction (Policy)

- **Project OS**: First impression = "project goals, risk, decisions, deliverables."
- **Category-centric**: **Project / category** before role (CEO/CTO).
- **Remove CEO concept**: No CEO/CTO wording or exposure. Top = "logo + current project" only.
- **No login**: Entry = "app launch ? (optional) project/category context ? dashboard/work."
- **Keep existing views**: Office, agents, library, tasks, settings stay; adjust **group names, order, brand area**.

---

## 3. 2.0 Menu Structure Proposal (To-Be)

### 3-1. Top: Context area (brand ? project/category)

| Element | Current | 2.0 Proposal |
|---------|---------|--------------|
| Logo | AgentDesk + company + CEO | **AgentDesk logo** + **project selector** (name + category badge). Click ? project list / category filter or "No project ? create" |
| CEO/company | Always shown | **Remove**. CEO concept removed. Top = logo + current project only. (Company name only in settings if needed.) |

? **CEO concept removal** is 2.0 policy. First screen shows only "which project you're in."

### 3-2. Navigation order proposal

Goal: **Dashboard (goals/risk/gates/deliverables)** as "work home," then Office ? Tasks ? Team ? Library to reduce cognitive load.

| Order | Type | View ID | Label (KO) proposal | Note |
|-------|------|---------|---------------------|------|
| 1 | Single | `dashboard` | **Dashboard** | 2.0 "home." 4 quadrants (goals/risk/gates/deliverables) |
| 2 | Single | `office` | Office | Keep |
| 3 | Group | **tasks** | **Tasks** | Task board / Deliverables / Scheduler (same as now, unify group name) |
| 4 | Group | **agents** | **Team** | Agents & Depts / Heartbeat |
| 5 | Group | **library** | Library | Skills / Agent Rules / Memory / Hooks (keep) |
| 6 | Single | `cli-usage` | CLI Usage | Keep |
| 7 | Single | `game-room` | Lounge | Keep |
| 8 | Single | `settings` | Settings | Keep. **Category editor** = tab under settings or separate submenu |

Summary:
- **Dashboard** first so "project performance at a glance" is first.
- **Tasks** right under Office (flow: dashboard ? office ? tasks).
- **Team (agents)**: rename from "Agents" to "Team" (Project OS tone).
- Group IDs/Views stay compatible.

### 3-3. Bottom area

| Area | 2.0 Proposal |
|------|--------------|
| **Departments** | Keep. Align with "Team" menu. |
| **Status bar** | Keep (connection, working/total) |
| **Collapse btn** | Keep |

### 3-4. Project/category entry (supplement)

- **No project**: After launch, top "project selector" click ? "New project" or "Pick category then create" (align with differentiation plan Phase 2).
- **Has project**: Enter last-used or default project; switch at top.

---

## 4. Implementation checklist

- [ ] `NAV_STRUCTURE` order: dashboard ? office ? tasks ? agents ? library ? cli-usage ? game-room ? settings
- [ ] Brand area: **Remove CEO/ceoName**. Keep `companyName` for settings only; top = logo + project selector (name + category)
- [ ] Optional label change: "Agents" ? "Team," "Tasks" ? "Tasks" (unify)
- [ ] Add "Category editor" tab/link under settings (Phase 2)
- [ ] First-entry when no project: top click ? project create / category select (separate spec)

---

## 5. Summary

| Item | Current | 2.0 |
|------|---------|-----|
| Top | Company + CEO | AgentDesk + **project selector** (name · category). **CEO concept removed** |
| 1st menu | Office | **Dashboard** |
| Group order | Office ? Agents ? Library ? Dashboard ? CLI ? Tasks ? Lounge ? Settings | Dashboard ? Office ? **Tasks** ? **Team** ? Library ? CLI ? Lounge ? Settings |
| Terms | Agents, Tasks | **Team**, **Tasks** (optional) |
| Role | CEO shown | **CEO concept removed** (no exposure except in settings if needed) |

Use this doc for Phase 1 (menu order + brand area) then Phase 2 (project/category selector + category editor entry).
