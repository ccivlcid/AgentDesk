# AgentDesk Ultra-Modern Design Strategy (v2.0)

This document is an ultra-modern design guideline for evolving AgentDesk beyond a simple tool into the world's most sophisticated **"High-End AI Agent OS"**.

---

## 1. Core Design Philosophy: "The Intelligent Canvas"
- **Bento-Grid Orchestration**: Moving away from a fixed Kanban column structure toward a modular grid layout that fluidly adapts based on task importance and agent activity levels.
- **Physics-Based Fluidity**: All interactions use spring physics-based animations (Spring Physics) to deliver a satisfyingly responsive feel.
- **Adaptive Luminance**: Going beyond simple dark/light mode — the UI's glow and borders react in real time based on agent state and task urgency.

---

## 2. Visual Language

### Color & Texture
- **Deep Sea Dark Theme**: Instead of pure black, use a deep navy-gray (`#0A0C10`) as the base, with neon accent colors (Neon Amber, Electric Blue) to maximize visibility.
- **Dynamic Gradient Borders**: Apply subtle flowing gradient animations to borders when an agent is actively working.
- **Ultra-Glassmorphism**: Increase blur values to 40px or higher and set `saturate` to 180%+ to achieve a transparent yet weighty glass texture.

### Typography
- **Sans-Serif First**: For overall UI readability, use **Geist** or **Inter** as the default font (with bold weight usage).
- **Surgical Mono**: Apply **JetBrains Mono** only to areas containing **'expert knowledge'** — actual data, code, agent thought processes — to establish clear visual hierarchy.

---

## 3. Modern Component Roadmap

### Phase 1: Bento-Board & Live Stream (Task Management)
- [ ] **Bento-Grid Task View**: Replace the Kanban 'column' structure with a grid layout that arranges task cards at intuitive sizes based on status.
- [ ] **Live Activity Feed**: Introduce a real-time feed (Live Stream) that displays agent activities in a timeline format.
- [ ] **Interactive DAG Graph**: Enhance the interactive graph that connects task dependencies with lines and allows drag-and-drop relationship editing.

### Phase 2: High-End Pro Interface (Interaction)
- [ ] **Spring Physics Navigation**: Apply satisfying spring animations with `stiffness: 300, damping: 30` level parameters for window minimize/maximize.
- [ ] **Cursor-Aware Lighting**: Implement responsive lighting effects where buttons and cards subtly illuminate following the mouse cursor position.
- [ ] **Floating Dock & MenuBar**: Instead of anchoring to screen edges, adopt a floating design with wider padding for a levitating appearance.

### Phase 3: AI Presence Visualization (Monitoring)
- [ ] **Agent Aura System**: Apply subtle colored glow effects around the entire screen or specific windows based on agent state (Success, Failure, Critical).
- [ ] **Streaming CLI Visualizer**: Beyond simple text streaming, visually represent token generation speed and thought flow as visual waves.

---

## 4. Ultra-Modern Validation Criteria
1. **The "Apple Test"**: Is the interface smooth enough (60fps+) with sufficient whitespace so it doesn't feel cramped?
2. **The "Linear Test"**: Can all operations be performed without a mouse, and are font and color contrasts perfectly calculated?
3. **The "OS Test"**: When a user opens this app, do they feel the immersion of operating **intelligent hardware** rather than visiting a website?

---

## Key Files to Modify
- **Task board redesign**: `src/components/task-board/` → Proposed new file `BentoBoard.tsx`.
- **Overall font hierarchy**: `src/styles/index.part01.css` (introduce Geist/Inter).
- **Animation settings**: `src/app/constants.ts` (define Spring config).
