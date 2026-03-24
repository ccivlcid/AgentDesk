# Library UI/UX Improvement Plan

> Status: **Design Complete — Awaiting Implementation**
> Date: 2026-03-23

---

## Current Problems

1. Rules/Memory/Hooks have nearly identical structure but each has a separate tab (code duplication ~7,500 lines)
2. Empty screen when no project selected — data is global but project is required
3. Only Skills depends on external catalog — pattern differs from the other 3
4. Learning system exists separately for all 4 — UX confusion

## Recommended Approach: Consolidation (Direction A)

```
Library
├── Skills (external catalog — keep as-is)
└── Agent Knowledge (consolidated Rules+Memory+Hooks)
    ├── Type filter: [All] [Rules] [Memory] [Hooks]
    ├── Scope filter: [Global] [Specialty Area] [Agent] [Project]
    ├── Category filter: dynamic (per type)
    └── Card list (unified view)
```

### Benefits
- Code volume ~7,500 lines → ~3,000 lines (60% reduction)
- Users manage all agent knowledge in a single interface
- Rules/Memory/Hooks distinguished by "Type" selection during creation

### Implementation Order
1. Create unified state hook `useAgentKnowledgeState()`
2. Unified Grid/Card component
3. Unified FormModal (including type selection)
4. Replace existing 3 tabs → 1 "Agent Knowledge" tab
5. Remove empty screen when no project selected (show global data immediately)

### Can Be Applied Immediately (Before Consolidation)
- [ ] Remove empty screen when no project selected
- [ ] Add scope bar to Hooks
- [ ] Remove project requirement from Skills
