# Project Directive System Spec

> **Status**: Phase 19-B — Design finalized, implementation started
> **Purpose**: A "directive" system that controls the entire agent behavior when a project type is selected

---

## 1. Core Concept

**Directive** = Markdown text assigned to a project.
When an agent executes a task, the directive is injected into the system prompt to define "how to work in this project."

```
Project type selection → Auto-fill default template → User freely edits → Save
                                                                          ↓
Task execution: system prompt = base role + [Project Directive] + task instructions
```

**Principles**:
- We only provide **directional guides (templates)**
- Users can freely modify, delete, or add content — 100% editable
- Markdown free text — not structured JSON
- A per-project version of CLAUDE.md

---

## 2. Project Type List

| slug | Icon | Korean | English | Auto-assigned Departments |
|------|------|--------|---------|--------------------------|
| `mvp` | 🚀 | MVP / 빠른 검증 | MVP / Rapid Validation | dev, planning |
| `fullstack` | 🏗️ | 풀스택 프로덕트 | Full-Stack Product | dev, qa, design, operations, devsecops, planning |
| `mobile` | 📱 | 모바일 앱 | Mobile App | dev, design, qa |
| `api-backend` | 🔌 | API / 백엔드 | API / Backend | dev, qa, devsecops |
| `frontend` | 🎨 | 프론트엔드 | Frontend | dev, design, qa |
| `ai-ml` | 🤖 | AI / ML 파이프라인 | AI / ML Pipeline | dev, planning, qa |
| `open-source` | 📦 | 오픈소스 라이브러리 | Open-Source Library | dev, qa, planning |
| `devops` | ⚙️ | 자동화 / DevOps | Automation / DevOps | dev, operations, devsecops |
| `enterprise` | 🏢 | 엔터프라이즈 / 레거시 | Enterprise / Legacy | dev, qa, planning, operations, devsecops |
| `research` | 🔬 | 리서치 / PoC | Research / PoC | planning, dev |

---

## 3. Directive Templates by Type

Each template consists of 5 sections. Users can freely modify, delete, or add sections.

### 3-1. 🚀 MVP / Rapid Validation

```markdown
## Work Principles
- Build the minimum viable version
- Ignore edge cases. Hardcoding is allowed
- Actively use external libraries to save time
- It's okay to leave TODO comments and move on
- Refactoring comes later

## Task Decomposition
- Split by user scenario, not by feature unit
- "Sign up → Use core feature → View result" — one flow = one task
- Prioritize each task working end-to-end

## Quality Standards
- If it runs, it passes
- Only 1 test for the happy path
- Code style and lint warnings can be ignored

## Review
- 1 review round (or skippable)
- Review only from the perspective of "Does this validate the core hypothesis?"

## Priority
- Speed ≫ Quality ≫ Scalability
- Technical debt is acceptable
```

### 3-2. 🏗️ Full-Stack Product

```markdown
## Work Principles
- Write production-level code
- Tests, error handling, and logging are mandatory
- Document architecture decisions with comments or documentation
- Follow the DRY principle, but avoid over-abstraction

## Task Decomposition
- Separate by layer: DB schema → API → business logic → UI → integration tests
- Run parallelizable tasks concurrently
- Finalize the API contract before starting frontend work

## Quality Standards
- Unit tests are mandatory for business logic
- Input validation and error handling are mandatory for APIs
- DB migrations must go through review

## Review
- 3 rounds: dev → qa → devsecops
- Each reviews from their own perspective (functional correctness / stability / security)
- All tests must pass before merge

## Priority
- Quality ≈ Scalability > Speed
- Minimize technical debt
```

### 3-3. 📱 Mobile App

```markdown
## Work Principles
- Prioritize touch UX above all else
- Prepare for unstable network conditions (offline mode)
- Target maintaining 60fps
- Follow platform guidelines (HIG/Material)

## Task Decomposition
- Split by screen unit
- Establish navigation structure first, then implement per-screen and integrate
- Build common components first (buttons, inputs, cards)

## Quality Standards
- All touch targets minimum 44pt
- Lists use virtualization (FlatList/FlashList) by default
- State management: local cache + server sync pattern
- App startup time under 3 seconds

## Review
- Design agent participates in all UI tasks
- Review from the perspective of "Is it visually correct + are touch areas sufficient?"
- Performance profiling review (scrolling, app startup)

## Priority
- UX > Performance > Feature count
- Fewer features, but smooth
```

### 3-4. 🔌 API / Backend

```markdown
## Work Principles
- Schema first: define the OpenAPI or GraphQL schema before implementing
- Use a consistent error format for all responses
- Apply authentication and authorization to all routes
- Consider rate limiting

## Task Decomposition
- API schema definition → middleware/auth → endpoint implementation → integration tests → load tests
- No implementation before schema is finalized

## Quality Standards
- Input validation on all endpoints
- Error responses follow a consistent structure (status, code, message)
- API contract tests must pass
- OWASP Top 10 checks (SQL injection, XSS, etc.)

## Review
- devsecops reviews all routes
- Review from the perspective of "Is there missing auth? Injection possibilities?"
- Verify backward compatibility on schema changes

## Priority
- Security ≫ Stability > Performance > Speed
```

### 3-5. 🎨 Frontend

```markdown
## Work Principles
- Design with a component-based approach
- Consider accessibility (a11y) as a baseline
- Support responsive layouts
- If a design system/tokens exist, follow them strictly

## Task Decomposition
- Design tokens/common components → page layouts → individual features → interactions/animations
- Establish state management structure first

## Quality Standards
- Use semantic HTML
- Support keyboard navigation
- Lighthouse accessibility score 90+
- Compatible with major browsers (Chrome, Firefox, Safari)

## Review
- Design agent reviews for visual consistency
- Review from the perspective of "Does it follow the design system? Is it accessible?"
- Cross-browser responsive layout verification

## Priority
- UX ≈ Accessibility > Performance > Feature count
```

### 3-6. 🤖 AI / ML Pipeline

```markdown
## Work Principles
- Reproducibility is the top priority
- Record parameters and results for all experiments
- Fix random seeds
- Prefer scripts over notebooks
- Data preprocessing must be idempotent

## Task Decomposition
- Data collection/preprocessing → baseline model → experiment loop → evaluation → serving/deployment
- Configure each pipeline stage to be independently executable

## Quality Standards
- Validate data quality before starting model training
- Only proceed with deployment when evaluation metrics exceed the baseline
- Experiment logs must include: hyperparameters, data version, result metrics

## Review
- Experiment design review is more important than code review
- Review from the perspective of "Does this experiment design validate the hypothesis?"
- Check for data leakage

## Priority
- Reproducibility > Accuracy > Speed
- No black boxes — must be explainable
```

### 3-7. 📦 Open-Source Library

```markdown
## Work Principles
- Minimize the public API surface area
- Write JSDoc/docstring for all public functions
- README, CHANGELOG, and usage examples are mandatory
- Follow semantic versioning

## Task Decomposition
- API design → core implementation → tests (90%+ coverage) → documentation → deployment setup
- A feature without documentation is not considered complete

## Quality Standards
- Test coverage 90% or higher
- All exported functions include example code
- Type definition accuracy (TypeScript d.ts or py.typed)
- Migration guide is mandatory for breaking changes

## Review
- Review from the perspective of "Can an external developer seeing this for the first time understand it?"
- All team members must review public API changes
- Breaking changes require separate approval

## Priority
- DX (Developer Experience) > Feature count > Performance
```

### 3-8. ⚙️ Automation / DevOps

```markdown
## Work Principles
- Idempotency is mandatory
- Must be rollback-capable on failure
- Include logging and alerts at every step
- Provide dry-run mode by default

## Task Decomposition
- Each script/pipeline step must be independently executable and fail-safe
- Separate infrastructure changes from application changes

## Quality Standards
- Dry-run test must pass
- Staging verification before production deployment
- Verify failure alerts (Slack, email, etc.) are working
- Secrets managed only via environment variables or secret managers

## Review
- Review from the perspective of "What happens if this fails at 3 AM?"
- Focus review on error handling and alerts
- Verify rollback scenarios

## Priority
- Reliability ≫ Performance > Convenience
```

### 3-9. 🏢 Enterprise / Legacy

```markdown
## Work Principles
- Compatibility with existing systems is the top priority
- Minimize the scope of changes
- Follow an incremental migration strategy
- Do not break existing code

## Task Decomposition
- Impact analysis → change plan → implementation → regression testing → rollback plan
- Follow this cycle for every task
- Prefer many small changes over one large change

## Quality Standards
- No implementation without an impact analysis document
- Full regression test suite must pass
- Backward compatibility must be guaranteed
- Detailed change log recording

## Review
- The strictest review. All departments participate
- Review from the perspective of "Could this change break another team's code?"
- Verify the existence of a rollback plan

## Priority
- Stability ≫ Security > Features > Speed
- Protecting existing features over adding new ones
```

### 3-10. 🔬 Research / PoC

```markdown
## Work Principles
- Document the process, not just the conclusion
- Document failed approaches as well
- The quality of findings matters more than code quality
- Try quickly, and record what was learned

## Task Decomposition
- Define hypothesis → experiment → record results → next hypothesis
- An iterative loop, not linear progression
- Each experiment must be independently executable

## Quality Standards
- Cannot proceed to next step if unable to answer "What did we learn from this experiment?"
- Result documents must record what was tried, the results, and what was learned
- Code quality only needs to be readable

## Review
- Results review instead of code review
- Review from the perspective of "Is this finding meaningful? What's the next hypothesis?"
- Planning agent determines direction

## Priority
- Learning > Speed > Quality
- Validate quickly, but always record what was learned
```

---

## 4. DB Schema Changes

### Migration

```sql
ALTER TABLE projects ADD COLUMN directive TEXT;
ALTER TABLE projects ADD COLUMN directive_type_slug TEXT;
```

- `directive` — Markdown text (nullable). Injected as-is into the agent prompt.
- `directive_type_slug` — Records which template was used as the starting point (`mvp`, `fullstack`, ...). Used later for "Load a different type template."

---

## 5. UX Flow

### 5-1. Project Creation Modal

```
Step 1: Type Selection       ← Replaces existing CategorySelectStep
  └ 10 type cards (icon + name + one-line description)
  └ On selection, loads the corresponding directive template into state

Step 2: Directive Editing    ← New step
  └ Large text area (monospace, markdown)
  └ Top-right: "Load different type template" dropdown
  └ Free editing — add/delete/modify sections
  └ If left empty, proceeds without a directive (same as existing behavior)

Step 3: Project Information  ← Existing info step
  └ Name, path, goal, Figma URL

Step 4: Agent Assignment     ← Existing agent step
  └ Review/modify auto-selected agents based on type
```

### 5-2. Editing After Project Creation

- Right-click project folder context menu → "Edit Directive"
- "Directive" section within project settings
- "Load different type template" → Overwrites current content (with confirmation popup)

---

## 6. Agent Execution Integration

### Prompt assembly in execution-run.ts

```
Before:
  Base role prompt
  + projectStructureBlock
  + taskInfo
  + workflowPackGuidance
  + departmentPrompt
  + kbContextBlock / figmaContextBlock
  + rulesBlock / memoryBlock
  + ...

After:
  Base role prompt
  + [Project Directive]          ← Newly added
  + projectStructureBlock
  + taskInfo
  + workflowPackGuidance
  + departmentPrompt
  + ...
```

The directive is placed **before** the task-specific instructions.
This provides context to the agent in the order: "Project-wide rules → This task's instructions."

### Injection Format

```
[Project Directive]
{directive markdown text as-is}
[/Project Directive]
```

---

## 7. API Changes

### POST /api/projects (Create)

Added to request body:
```json
{
  "directive": "## Work Principles\n- ...",
  "directive_type_slug": "mvp"
}
```

### PATCH /api/projects/:id (Update)

```json
{
  "directive": "Modified directive text"
}
```

### GET /api/projects/:id

Response includes `directive` and `directive_type_slug`.

### GET /api/directive-templates

Returns the list of directive templates (for "Load different type" on the frontend).

```json
{
  "templates": [
    {
      "slug": "mvp",
      "name": "MVP / Rapid Validation",
      "name_ko": "MVP / 빠른 검증",
      "icon": "🚀",
      "description": "Minimum features, fast deployment, pivot-ready",
      "template": "## Work Principles\n- ..."
    },
    ...
  ]
}
```

---

## 8. Future Expansion Possibilities

- **Directive Version History**: Track change history (record project transition points)
- **Team-Shared Directives**: A directive library reusable across multiple projects
- **Directive Effect Analysis**: Compare task completion rates and quality before/after directive changes
- **AI Directive Suggestions**: Analyze project progress patterns to suggest directive improvements
