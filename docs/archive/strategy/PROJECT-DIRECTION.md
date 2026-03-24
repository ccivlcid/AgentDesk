# AgentDesk Project Direction

> Last updated: 2026-03-24
> Basis: `README.md`, `docs/OVERVIEW.md`, `docs/strategy/AgentDesk_OpenSource_Product_Strategy.md`, `docs/VISION-VS-REALITY.md`, `docs/SYSTEM-ISSUES.md`, `docs/strategy/roadmap/README.md`, `docs/strategy/PM-WORKFLOW-SPEC.md`

---

## 1. One-Line Direction

**AgentDesk is a local-first Agent Operating System for creating, running, observing, debugging, and progressively optimizing AI agents.**

Based on this statement, AgentDesk's direction can be organized into two layers.

- **Brand layer:** Agent Operating System
- **Execution layer:** local-first developer tool for agent runtime control

In other words, the external message should be bold and clear, but the actual product operating principles must be more grounded in reality.

---

## 2. Common Themes Across Current Documents

Five core messages are consistently repeated across the project documentation.

### 2.1 The Essence of AgentDesk Is "Agent Execution Operations"

AgentDesk is not a simple chat app or code generator — it aims to be an operational environment for running multiple agents from a single screen.
The core value lies not in "what can be built" but in "can you see what is currently running and why it failed."

### 2.2 The Differentiator Is Visual + Runtime Integration

The most consistent USP across the README and strategy documents is:

- Running multiple agents
- Real-time streaming observation
- Simultaneous visibility of workflow and runtime state
- Tracking failure causes and decision flows

Therefore, AgentDesk is closer to an **operations console competition** than a framework competition.

### 2.3 The Core User Is Developers

The current architecture suits the following user groups better than a general-user SaaS:

- AI Engineer
- Automation Engineer
- LLM application developers
- DevOps / Platform Engineer
- Developers who repeatedly experiment with multi-agent systems

This means the product direction should prioritize "developer tooling completeness" over "mass adoption" for the time being.

### 2.4 PM Orchestration Is the Product's Central Axis

Based on recent documents, the actual workflow center of AgentDesk is PM-based orchestration.

- Kickoff meeting
- Task creation and assignment
- Auto-execution
- PM review
- Approval/revision/re-execution
- Accumulation of progress/changelog/retrospective

This flow is what makes AgentDesk more than just a UI for launching multiple CLIs — it makes it a "task operations system."

### 2.5 The Remaining Core Challenges Are Stability and Resource Management

The common issues identified by both the vision document and the system issues document are not about lacking flashy features.

- Concurrency control
- Resource management
- Token/cost control
- Worktree and process stability
- Structuring of debugging information

This means the current direction should prioritize "establishing reliability as an operations OS" over "feature expansion."

---

## 3. Recommended Positioning

### External Positioning

**Agent Operating System for Developers**

Tagline:

> AgentDesk is a local-first agent operating system that lets developers create, run, monitor, and debug AI agents in one unified environment.

### Internal Product Definition

**Local-first developer tool for agent runtime control**

The reason for using both statements together is clear.

- The brand message is kept ambitious.
- The actual product boundary is not exaggerated.
- It satisfies both the current implementation level and the consensus across documents.

---

## 4. Future Product Principles

### 4.1 Prioritize Operational Visibility

When adding new features, always pass these questions first.

- Is the execution state visible in real-time?
- Can you verify which rules and context were applied?
- Can failure reasons be traced in the UI?
- Are human intervention points clearly defined?

### 4.2 Prioritize "Operations" Over Agent "Creation"

Rather than expanding agent personas or automation scope, making existing agents work more reliably takes priority.

### 4.3 Maintain the Local-First Principle

The current structural strengths are single-process, SQLite, direct API key connection, and instant execution experience.
Team/cloud features are kept as a long-term expansion axis, but the core experience must be fast and transparent locally.

### 4.4 Push PM-Centered Workflow as the Product Identity

Kickoff, PM review, reassignment, retrospective, and auto-learning create a unique operational narrative for AgentDesk.
Future documentation and UI descriptions should be organized around this flow as well.

### 4.5 UI Should Serve Operational Efficiency Over Aesthetics

The desktop-style interface is certainly a strength, but the essence of the direction is not "beautiful screens" but "operations control panel."
Design improvements should strengthen information density, state awareness, and flow control rather than aesthetics.

---

## 5. Short-term Priorities

### Priority 1. Operational Stability

- Remove or strongly warn on worktree failure silent fallback
- Prevent concurrent execution conflicts
- Strengthen process termination/recovery reliability
- Ensure PM oversight does not drop even for long-running projects

### Priority 2. Enhanced Debug Experience

- Further structure failure cause summaries
- Strengthen the connectivity between prompts, execution events, and deliverables
- Provide shorter and clearer re-execution/reassignment/escalation flows

### Priority 3. Resource Management

- Token budget
- Cost visualization and savings suggestions
- Long-term introduction of a resource management layer: file locks, rate limits, cache cleanup

### Priority 4. Complete the Learning Loop

- Enhance automatic Rules/Memory extraction
- Expand utilization of agent fitness data
- Introduce prompt version management and success rate comparison system

---

## 6. Mid-term Direction

### 6.1 Maintain the Open Core Strategy

The most consistent strategy based on the documents is Open Core + Local-first.

- Open-source core: execution engine, operations UI, basic orchestration, library structure
- Long-term monetization candidates: team collaboration, cloud execution, central sync, SSO/RBAC, organizational policies

### 6.2 Make the "Operations Console" Message More Clear

Competitive comparison should be organized by the following criteria rather than feature lists.

- Cursor: Code generation focused
- n8n: Automation focused
- Dify: App/flow focused
- LangGraph family: Orchestration logic focused
- AgentDesk: Execution operations, observation, debugging focused

### 6.3 Unify Project Documents into a Single Product Narrative

Currently, strategy documents are rich but messages are scattered across multiple files.
Going forward, README, OVERVIEW, strategy, roadmap, and PM workflow documents should be aligned to repeat the same message.

---

## 7. Directions to Avoid

- Packaging as a multi-user SaaS before stability is achieved
- Adding feature count without resolving operational reliability issues
- Promoting multiple product identities simultaneously
- Letting UI style experiments take precedence over core operational experience

---

## 8. Conclusion

The right direction for AgentDesk is clear.

**Maintain the identity of "a local-first OS for AI agent operations," focus on stability, debugging, and resource management in the short term, and refine positioning as a developer-facing operations console in the mid-term.**

Based on current documentation, AgentDesk is already strongest at "how to operate and control" rather than "what to build."
Therefore, the best direction for the next phase is convergence toward a **trustworthy Agent Operations Console**, not a feature-expansion competition.
