# AgentDesk System Problems — Product / Architecture / Operations / UX

> Last updated: 2026-03-25
> Purpose: Document the current system-level problems observed from the repository's docs and operating rules, then provide a shared framing for future prioritization.

---

## Executive Summary

AgentDesk's main problem is not lack of features. The larger issue is that the system has expanded across product surface, execution modes, orchestration rules, and UI metaphors faster than its core operating model has been simplified.

In practice, this creates four kinds of pressure:

- **Product:** the primary user and primary loop are still too broad
- **Architecture:** execution paths are too branched and context-dependent
- **Operations:** rules and system truth are distributed across too many documents and control points
- **UX:** internal complexity leaks into the user-facing workflow

The result is a platform that is powerful, but increasingly expensive to keep predictable.

---

## 1. Product Problems

### 1.1 Primary user is not sharply fixed

Across the current docs, AgentDesk can be read as several products at once:

- a local-first developer tool
- a desktop-style AI agent operating system
- a PM-led multi-agent orchestration platform
- a messenger-driven work instruction system

Each of these can be valid, but they do not imply the same priorities.

### 1.2 Primary loop is too broad

The repository currently promotes multiple top-level loops:

- create a project and kickoff a PM-led execution flow
- message an agent directly
- route directives through messenger prefixes
- run CLI/API/runtime-driven execution
- manage a desktop environment with windows, widgets, and monitoring

When multiple loops feel equally primary, the product becomes harder to explain and harder to optimize.

### 1.3 Feature hierarchy is weak

Several large capabilities appear to carry equal importance:

- desktop metaphor
- PM orchestration
- workflow automation
- messenger integration
- project/task execution
- knowledge library
- app runner / repo workflows

This makes prioritization difficult. Without a stricter hierarchy, new work tends to expand breadth rather than strengthen the main path.

### 1.4 Product risk

The product risks becoming "impressive but diffuse":

- powerful in demos
- harder to adopt in real workflows
- harder to message in one sentence
- harder to optimize for time-to-value

---

## 2. Architecture Problems

### 2.1 Too many execution paths

The documented execution model already includes several branches:

- task execution
- direct chat execution
- built-in runtime execution loop
- CLI provider execution
- HTTP API provider execution
- OAuth-backed execution paths

This is flexible, but it creates structural complexity quickly.

### 2.2 Same agent, different behavior by entry point

An agent can behave differently depending on whether it is invoked from:

- task run
- direct chat
- kickoff/add-tasks flow
- built-in runtime

That makes the system harder to reason about, test, and explain. The user's mental model becomes unstable because the same configured agent does not always imply the same execution behavior.

### 2.3 Configuration and runtime selection are not simple enough

The current model mixes concepts such as:

- `cli_provider`
- `api_provider_id`
- OAuth account linkage
- runtime-specific execution behavior
- task/chat-specific branching

This increases coupling between storage, routing, and user expectations. It is powerful, but it is not minimal.

### 2.4 Orchestration layer is deep and tightly connected

Kickoff, review, project-level review, add-tasks, fitness scoring, auto-learning, and retrospective generation create a sophisticated loop. The problem is not that any single feature is unreasonable. The problem is that too many system-critical decisions flow through the same orchestration spine.

That raises:

- debugging cost
- regression risk
- onboarding cost for contributors
- coordination cost when making changes

### 2.5 Architecture risk

The architecture risks becoming "high-capability but low-predictability":

- more branches to test
- more implicit coupling
- more behavior differences across entry points
- slower debugging and stabilization

---

## 3. Operations Problems

### 3.1 No strong enough single source of truth

Important rules currently live across multiple documents such as:

- `AGENTS.md`
- `README.md`
- `docs/specs/api.md`
- `docs/GLOSSARY.md`
- `CLAUDE.md`

Each document has a legitimate purpose, but operationally this creates drift risk.

### 3.2 Documentation drift is already visible

Recent review found concrete inconsistencies in:

- task prefix definitions
- migration latest-state references
- API endpoint coverage
- health endpoint wording

These were fixable, but the underlying issue is systemic: rule updates can land in one surface and miss the others.

### 3.3 High autonomy increases blast radius of small inconsistencies

AgentDesk relies heavily on:

- prompt rules
- orchestration flows
- automation
- generated decisions
- project/task routing

In a system like this, a small documentation or rule mismatch is not just a communication issue. It can turn into real execution mismatch.

### 3.4 Maintenance debt is visible in the docs themselves

The repository already documents remaining cleanup areas such as:

- incomplete i18n migration
- remaining `any` usage
- broad rule surface
- large archive/history footprint

This does not mean the system is unhealthy, but it does mean maintenance costs are now a first-class concern, not a secondary one.

### 3.5 Operations risk

The operations model risks becoming "feature-rich but expensive to keep aligned":

- more sync work per change
- more review burden on every rule update
- higher chance of stale docs and stale assumptions
- harder internal trust in what is canonical

---

## 4. UX Problems

### 4.1 Internal concepts leak into the surface

Users may need to understand concepts that should ideally stay internal:

- directive vs task vs chat
- `$` vs `!` vs `#`
- PM review vs direct execution
- CLI vs runtime vs API-backed behavior
- why project path is mandatory in some flows
- why some actions trigger meetings and others skip them

This increases cognitive load.

### 4.2 Power-user flexibility competes with clarity

Many advanced controls exist because the product is highly capable. But capability is not the same as usability. If users need to learn orchestration logic before they can complete ordinary work, the interface is carrying too much system detail.

### 4.3 Desktop metaphor has both value and risk

The desktop-style UI is a clear differentiator. It creates atmosphere and brand identity. But it must continuously justify itself against simpler workflows.

If the desktop metaphor:

- slows frequent actions
- adds window-management overhead
- obscures the main execution path

then visual identity starts to compete with task completion.

### 4.4 UX risk

The UX risks becoming "memorable but cognitively heavy":

- strong first impression
- weaker immediate comprehensibility
- more training needed for routine use
- more surface area for user mistakes

---

## 5. Root Cause Pattern

Across all four axes, the same pattern repeats:

AgentDesk has already been designed as a strong platform, but the platform has expanded faster than the core experience has been simplified.

That creates a system with:

- high capability
- high ambition
- high configurability
- rising coordination cost

The strategic issue is therefore not "add more features" first. It is "reduce ambiguity and make the existing system more legible and predictable."

---

## 6. Priority Implications

### 6.1 Product

Priority should shift toward clarifying:

- who the primary user is
- what the primary loop is
- which features are tier-1 vs tier-2

### 6.2 Architecture

Priority should shift toward:

- reducing execution-path divergence
- enforcing a more consistent agent execution model
- minimizing entry-point-specific behavior differences

### 6.3 Operations

Priority should shift toward:

- defining a canonical operational source of truth
- tightening doc synchronization discipline
- adding lightweight verification for rule/API/doc drift

### 6.4 UX

Priority should shift toward:

- hiding internal orchestration complexity where possible
- simplifying user-visible command models
- preserving the desktop identity without letting it dominate routine workflows

---

## 7. Recommended Near-Term Direction

If the goal is to strengthen the current system rather than widen it, the next phase should emphasize:

1. **Core-loop clarification**
   One primary entry path should be treated as the default experience.

2. **Execution model normalization**
   The system should reduce "same agent, different behavior" cases.

3. **Operational canon**
   A tighter documentation hierarchy should define which document wins when conflicts exist.

4. **UX simplification**
   Internal distinctions should be absorbed by the system whenever possible, rather than pushed to the user.

---

## 8. Non-Goals of This Document

This document does not:

- propose an immediate rewrite
- claim the current architecture is wrong
- recommend removing the desktop metaphor outright
- suggest reducing the system to a much smaller tool without further validation

The goal is narrower: capture the current problems clearly enough that future roadmap decisions can be made with less ambiguity.
