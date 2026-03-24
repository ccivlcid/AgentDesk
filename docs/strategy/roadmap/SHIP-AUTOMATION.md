# Ship Automation — Version Management + Changelog + PR Creation

> Status: **Implementation Complete (Phase 41)**
> Date: 2026-03-28
> Remaining: Auto PR creation (Step 4) — `gh pr create` integration not yet implemented

---

## Current State (As-Is)

When the PM orchestrator approves a task:
1. `finishReview()` → task status = 'done'
2. If worktree exists, attempt merge to main branch
3. Merge success/failure log
4. **End** — no version management, no changelog, no PR creation

### Shortcomings
- No tracking of the project's current version
- No history of which task produced which changes (only exists in git log)
- No automatic PR creation for external collaboration
- No CHANGELOG, requiring manual release note writing

---

## Target State (To-Be)

When PM approves a task:
1. `finishReview()` → merge
2. **Auto VERSION bump** (semver patch)
3. **CHANGELOG entry creation** (based on commit messages + task description)
4. **PR creation** (optional, based on project settings)
5. "v1.2.3 released" log in PM Activity

---

## Design

### 1. VERSION Management

**Storage location:** Add `current_version TEXT DEFAULT '0.1.0'` column to `projects` table

**Bump logic:**
- Auto increment patch on task completion (done): `0.1.0 → 0.1.1 → 0.1.2`
- Increment minor on kickoff (new round): `0.1.2 → 0.2.0`
- User can manually bump major (project settings)

**Project root file sync:**
- If `projects.project_path` exists, also write to `VERSION` file
- Also update `package.json`'s `version` field (if it exists)

### 2. Auto CHANGELOG Generation

**Storage:** `project_changelog_entries` table

```sql
CREATE TABLE project_changelog_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  version TEXT NOT NULL,        -- "0.1.3"
  task_id TEXT,                 -- related task
  entry_type TEXT NOT NULL,     -- "feature" | "fix" | "refactor" | "docs"
  summary TEXT NOT NULL,        -- one-line summary
  detail TEXT,                  -- detail (optional)
  created_at INTEGER NOT NULL
);
```

**Creation timing:** Immediately after `finishReview()` completes
**Content:** PM review result + task title/description + git diff stat summary
**Classification:** Based on task type (general → feature, bug → fix, refactor, docs)

**File sync:** Auto-update `CHANGELOG.md` in project root

```markdown
## [0.1.3] - 2026-03-28
### Features
- Add chat search and pin functionality (#task-id)
### Fixes
- Increase kickoff timeout from 30s to 120s (#task-id)
```

### 3. Auto PR Creation

**Condition:** Project has `auto_create_pr` setting enabled and GitHub remote exists

**Flow:**
1. After merge completes
2. `gh pr create --title "v0.1.3: {task title}" --body "{CHANGELOG entry}"`
3. Record PR URL in PM Activity + notifications

**Setting:** `auto_create_pr INTEGER DEFAULT 0` in `projects` table

### 4. UI

**Project folder window:**
- Display current version (header)
- Add CHANGELOG tab

**PM Activity:**
- "v0.1.3 released — {task title}" log
- PR link (if available)

**Menu bar progress:**
- Version display: `v0.1.3 · 3/8 done`

---

## Implementation Order

### Step 1: DB Schema (Migration)
- `projects.current_version` column
- `projects.auto_create_pr` column
- `project_changelog_entries` table

### Step 2: Extend finishReview
- VERSION bump logic
- CHANGELOG entry creation
- PM Activity log

### Step 3: File Sync
- Write `VERSION` file
- Update `package.json` version
- Create/update `CHANGELOG.md`

### Step 4: PR Creation
- `gh` CLI integration
- Project settings UI

### Step 5: UI
- Project folder window version + CHANGELOG tab
- Menu bar version display

---

## Dependencies

- Requires understanding of `finishReview()` flow (`review-finalize-tools/`)
- `gh` CLI must be installed on the system for PR creation
- Project must have git remote configured

## Risks

- VERSION/CHANGELOG conflicts possible during merge conflicts → conflict resolver needed
- PR creation failure (auth, network) → fail silently and log only
- VERSION conflict when multiple agents complete tasks simultaneously → protect with DB transaction
