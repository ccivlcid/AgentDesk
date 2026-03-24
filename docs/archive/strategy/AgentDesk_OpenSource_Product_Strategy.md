# AgentDesk — Open Source Product Strategy & README Draft

> **The operating system for AI agents.**
> Build, run, monitor, and debug AI agents in one unified environment.

---

## 1. Document Purpose

This document is a unified draft that organizes the open source release strategy and product direction based on the current analysis of the AgentDesk project.
It combines the characteristics of both a README and a product strategy document so it can be directly applied to the project.

Based on this document, the following work can proceed:

- GitHub README rebranding
- Defining open source release scope
- Setting future SaaS/monetization boundaries
- Using as a reference document for Codex and AI coding agents
- Serving as a base document for product introductions and presentations

---

## 2. One-Line Product Definition

**AgentDesk is a unified Agent Operating System for creating, running, observing, and debugging AI agents.**

---

## 3. Product Vision

Most existing AI tools focus on one of the following:

- Code generation
- Workflow automation
- LLM app composition
- Agent logic definition

However, from an operational perspective, the following problems remain:

- It's difficult to see what an agent is doing in real time.
- Workflow and execution state are separated.
- Debugging is log-centric and not intuitive.
- Multi-agent operational environments are not integrated.

AgentDesk aims to solve these problems with the following direction:

**Providing the entire Create → Run → Observe → Debug → Optimize cycle in a single environment.**

In other words, AgentDesk is not just an AI tool — it aims to be an **OS for agent operations**.

---

## 4. Recommended Product Positioning

Currently, AgentDesk has the following characteristics mixed together:

- AI agent platform
- Workflow automation system
- Desktop-style operational UI

In this state, messaging can become diluted, so the product position should be distilled into a single statement.

### Recommended Position

**Agent Operating System for Developers**

The description can be used as follows:

> AgentDesk is a local-first agent operating system that lets developers create, run, monitor, and debug AI agents in one unified environment.

This position has the following advantages:

- The identity as a developer tool becomes clear.
- It differentiates from consumer-facing SaaS products.
- It aligns well with the current structure and actual implementation scope.
- It naturally connects to future cloud/team feature expansion.

---

## 5. Core Target Users

### 5.1 Primary Target

- AI Engineer
- Automation Engineer
- LLM Application Developer
- DevOps / Platform Engineer
- Developers experimenting with AI agents

### 5.2 Currently Not Recommended Targets

- General consumers
- Non-developer no-code users
- Enterprise-wide SaaS users

Structurally, AgentDesk currently fits best as a **developer-centric local tool**.
Therefore, the initial release strategy should also target developer community adoption.

---

## 6. Current Project Analysis Summary

### 6.1 Strengths

1. **Clear product concept**
   AgentDesk has a strong concept as an agent operating system, not just a simple dashboard.

2. **Strong UI/UX identity**
   Desktop, Dock, Window, Mission Control, Command Palette — clear differentiation points.

3. **Broad feature coverage**
   Agent management, Workflow Builder, Memory, Rules, Hooks, Skills, Chat, Dashboard — the major pillars needed for operations are already visible.

4. **Developer-oriented extensibility**
   High potential for evolution into plugin-based architecture, execution engine extension, and multi-agent orchestration.

5. **Good documentation assets**
   README, OVERVIEW, architecture-related documents exist, making it favorable for organizing as an open source project.

### 6.2 Current Limitations

1. **SQLite-based limitations**
   Suitable for local/single-user environments, but has significant constraints in terms of multi-user, collaboration, and scalability.

2. **Execution engine is local process-centric**
   child_process-based execution is good for quick starts, but has limitations in retry, timeout, recovery, and concurrency management.

3. **Potential lack of API contract consistency**
   As the project grows, standardization of response formats and contracts becomes important.

4. **Security scope may not yet be at product-level**
   Fine for the local tool stage, but authentication, authorization, CSRF, and socket security are essential for future team/cloud transitions.

5. **Concept model needs further refinement**
   Onboarding becomes easier if the relationships between Agent, Project, Workflow, Memory, Rules, Hooks, and Skills are more clearly defined.

---

## 7. Realistic Product Definition for the Current Stage

At this point, AgentDesk is most accurately defined as follows:

### Current Stage Definition

**Local-first Developer Tool for Agent Runtime Control**

That is:

- It must be quickly runnable locally
- Agent execution and observation are the core
- Developer productivity and debugging experience must be prioritized

At this stage, rather than prematurely packaging it as an enterprise SaaS product,
establishing it as a powerful developer tool is far more advantageous.

---

## 8. Recommended Open Source Strategy

### 8.1 Conclusion

We recommend an **Open Core + Local-first strategy**.

That is:

- Core features are released as open source
- Advanced collaboration features are separated as future paid/cloud tiers
- Build developer adoption first, then pursue monetization as the next step

### 8.2 Areas to Release as Open Source

The following areas are essential for community adoption and should remain open source:

- Agent Runtime basic structure
- Local execution engine
- Dashboard / Desktop UI
- Workflow Builder
- Agent management features
- Memory / Rules / Hooks / Skills basic structure
- Per-project context management system

### 8.3 Future Commercialization Candidates

The following areas are good candidates for long-term paid or cloud service separation:

- Team Workspace
- Cloud Agent Execution
- Central sync server
- Usage billing / cost analysis
- Enterprise SSO / RBAC
- Organization policy / audit log
- Hosted marketplace / shared templates

This structure allows simultaneous open source adoption and monetization opportunities.

---

## 9. License Direction

### Recommendation A — Apache 2.0

If prioritizing initial adoption, Apache 2.0 is advantageous.

Pros:

- Low barrier for enterprise adoption
- Easy developer adoption
- Good ecosystem extensibility

Cons:

- Competitors can take it and turn it into a SaaS

### Recommendation B — AGPL

If strongly wanting to prevent unauthorized SaaS repackaging, AGPL is advantageous.

Pros:

- Pressure to disclose when redistributed as SaaS
- High open source defensibility

Cons:

- High barrier for enterprise adoption
- Initial adoption may be slow

### Final Recommendation

Start with **Apache 2.0** initially,
and design future cloud/paid features as a separate layer.

---

## 10. Key Differentiation Points

The point where AgentDesk must win in the market is not feature count — it's **one core experience**.

### Recommended Core USP

**Visual + Runtime Integrated Agent Control**

That is:

- Agents can be executed
- Real-time status can be observed
- Workflow and runtime can be viewed together
- Failure causes can be debugged in the UI

Compared to other tools, this can be summarized as follows:

- Cursor: Code generation-centric
- Dify: LLM app/flow-centric
- n8n: Automation-centric
- LangGraph: Agent logic/orchestration-centric
- AgentDesk: **Execution operations and observation-centric**

Therefore, AgentDesk should be branded not as "yet another agent framework,"
but as **the control tower for agent operations**.

---

## 11. Phased Product Roadmap

### 11.1 Phase 1 — Local Agent OS

This is the stage to focus on right now.

Key goals:

- Local execution in under 1 minute
- Agent creation / execution / stopping
- Real-time status tracking
- Log and result observation
- Connection between workflow and runtime

Key success criteria:

- GitHub stars
- Community interest
- Demo video response
- Developer actual installation and usage feedback

### 11.2 Phase 2 — Agent Platform

The stage of transitioning from a local tool to a platform.

Additional directions:

- PostgreSQL support
- Redis / Queue / Worker architecture
- retry / timeout / scheduling improvements
- Multi-agent orchestration stabilization
- Execution state recovery

### 11.3 Phase 3 — Team & Cloud

The stage for monetization and organizational use.

Additional directions:

- Team workspace
- Cloud execution
- Shared agents / templates
- Billing / usage analytics
- Enterprise auth / RBAC

---

## 12. What Must Absolutely NOT Be Done Now

The following directions should be avoided at the current stage:

### 12.1 Continuously Adding Features Only

If features pile up while the core experience is weak, the message becomes blurred.

### 12.2 Packaging as Enterprise SaaS First

The current structure is still closer to a developer local tool than a team/organizational product.

### 12.3 Expanding to General Consumer Targets

The current project's strengths lie in developer productivity and agent operations.

---

## 13. What Must Be Done First Right Now

### 13.1 Create One "Wow, This Actually Works" Demo

Example:

1. User creates an agent in AgentDesk.
2. Requests the agent to modify project files.
3. The agent executes the task.
4. Execution status and logs are reflected in the UI in real time.
5. Result file diffs or changes can be verified immediately.

This single experience is more important than the README.

### 13.2 Create a 1-Minute Installation Experience

Requirements:

- `git clone`
- `pnpm install`
- `pnpm dev`
- The screen must appear immediately

If the installation experience is complicated, open source adoption speed drops significantly.

### 13.3 Create an Extensibility Message

The following messages should be visible in the README and documentation:

- Plugin-capable
- Custom agents possible
- Execution engine swappable
- Future team feature expansion possible

---

## 14. README Rebranding Draft

The content below is a draft that can be directly applied to the GitHub main README.

---

# AgentDesk

> **The operating system for AI agents.**
> Build, run, monitor, and debug AI agents in one unified environment.

## Overview

AgentDesk is a local-first control tower for operating AI agents.
Developers can use AgentDesk to create agents, execute them, observe their status, and debug issues.

While existing tools are each separated into code, automation, app building, and agent logic, AgentDesk integrates all of these execution operation flows into a single environment.

## Why AgentDesk

Current AI agent development has the following problems:

- Difficult to grasp execution status in real time
- Log-centric debugging is not intuitive
- Workflow and runtime are separated
- Multi-agent operations are complex

AgentDesk provides the following to solve these issues:

- Visual agent management
- Real-time runtime observability
- Workflow + runtime integration
- Project-based context and execution control

## Core Features

### Agent Management
- Agent creation / execution / stopping
- Status tracking
- Multi-agent management

### Workflow Builder
- Visual flow composition
- Task linking
- Execution flow management

### Observability
- Real-time logs
- Execution status tracking
- Task lifecycle observation

### Context System
- Memory
- Rules
- Hooks
- Skills

### Developer Experience
- Desktop-style UI
- Command Palette
- Window/Dock-based operational experience

## Quick Start

```bash
git clone https://github.com/ccivlcid/AgentDesk.git
cd AgentDesk
pnpm install
pnpm dev
```

## Current Positioning

AgentDesk is currently best described as a **local-first developer tool for agent runtime control**.

## Roadmap

### Phase 1 — Local Agent OS
- Local execution optimization
- Real-time status observation
- Debugging UX improvements

### Phase 2 — Agent Platform
- PostgreSQL
- Queue/Worker execution
- scheduling/retry/recovery

### Phase 3 — Team & Cloud
- Collaboration features
- Cloud execution
- SaaS feature expansion

## Open Source Strategy

Open source includes:

- Core runtime
- Local execution
- Dashboard UI
- Workflow Builder
- Context system basics

Future commercial layers may include:

- Team workspace
- Cloud execution
- Billing
- Enterprise security

## Philosophy

> Agents are not scripts. They are systems.

AgentDesk is designed to operate AI agents, not just launch them.

---

## 15. Project Direction Guide for Codex and AI Coding Agents

The items below can be used as criteria for providing project direction to Codex, Cursor, Claude Code, and other AI agents.

### 15.1 Product Direction Rules

1. AgentDesk is not a general productivity app — it is an **Agent Operating System**.
2. All features must contribute to strengthening the agent creation, execution, observation, and debugging flow.
3. Prioritize **runtime observability** and **execution reliability** over feature additions.
4. The top-priority target at the current stage is developers.
5. Maintain local-first design while considering future team/cloud expansion.

### 15.2 Architecture Priorities

1. Execution engine stabilization
2. State tracking consistency improvements
3. API contract standardization
4. DB abstraction layer refinement
5. Plugin/extension point refinement

### 15.3 UI/UX Priorities

1. Real-time execution status visibility
2. Fast debugging flow
3. Simplified agent control flow
4. Maintain desktop metaphor
5. Balance between information density and intuitiveness

### 15.4 Prohibited Directions During Development

1. Purposeless feature additions
2. Pivoting toward a general consumer app
3. Prioritizing SaaS features over core architecture
4. Prioritizing visual effects over runtime stability

---

## 16. Final Strategy Summary

### Product Definition

AgentDesk is an **operating system for AI agents**.

### Current Strategy

AgentDesk should be positioned as a **local-first open source developer tool**.

### Open Source Strategy

Release the core as open source, and separate collaboration/cloud/enterprise features long-term.

### Key Differentiation

**Visual + Runtime Integrated Agent Control Tower**

### Most Important Thing Right Now

Not adding features, but completing the **"it runs, it's visible, and it can be debugged" experience**.

---

## 17. Immediate Next Recommended Actions

1. Finalize and apply the GitHub README
2. Confirm one demo scenario
3. Write the execution engine architecture document
4. Write the PostgreSQL/Queue transition roadmap
5. Organize the Contribution Guide and Issue Templates

---

## 18. Closing Statement

For AgentDesk to succeed, it must not simply become a project with many features.
It must become **the open source tool with the best agent operation experience**.

The clearer that direction is, the easier the README, demo, code structure, and community adoption all become.
