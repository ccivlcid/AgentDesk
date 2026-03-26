# AgentDesk i18n Separation Plan

> Last updated: 2026-03-24
> Status: Phase 1 applied

---

## Problem

AgentDesk currently supports 4 languages (ko/en/ja/zh), but strings are hardcoded throughout components and server logic.

Common patterns:

- `t({ ko, en, ja, zh })`
- `pickLang(lang, { ko, en, ja, zh })`
- `if (lang === "ko") return "..."`

The problems with this approach are clear:

- Translation changes require code changes.
- The same strings are duplicated across multiple files.
- Frontend and server use different string sources.
- It is difficult to statically verify missing languages.

---

## Goal

Separate strings from code and have frontend and server share a common translation catalog.

Core principles:

- UI copy is looked up via key-based translation.
- Frontend and server use the same resources.
- Existing `t({ ko, en, ja, zh })` calls are not removed immediately but migrated gradually.
- English is maintained as the fallback language.

---

## Applied Structure

### Common Resource Location

- `shared/i18n/messages/en.ts`
- `shared/i18n/messages/ko.ts`
- `shared/i18n/messages/ja.ts`
- `shared/i18n/messages/zh.ts`
- `shared/i18n/index.ts`

### Translation API

- Frontend: `useI18n().tk("key", vars)`
- Server: `translateMessage(lang, "key", vars)`

### Variable Substitution

Variables within strings use the `{name}` format uniformly.

Example:

```ts
tk("toast.task.complete", { title: task.title ?? "" });
translateMessage(lang, "gateway.decisionInbox.waiting", { count });
```

---

## Areas Migrated in This Phase

### Frontend

- App default labels: [src/app/useAppLabels.ts](/mnt/c/PythonProjects/AgentDesk/src/app/useAppLabels.ts)
- Decision Inbox option labels: [src/app/decision-inbox.ts](/mnt/c/PythonProjects/AgentDesk/src/app/decision-inbox.ts)
- Some toast/onboarding strings: [src/App.tsx](/mnt/c/PythonProjects/AgentDesk/src/App.tsx)
- i18n context extension: [src/i18n.ts](/mnt/c/PythonProjects/AgentDesk/src/i18n.ts)

### Server

- Gateway status/notification strings: [server/gateway/client/task-notifications.ts](/mnt/c/PythonProjects/AgentDesk/server/gateway/client/task-notifications.ts)

---

## Future Migration Criteria

### Migrate First

- Button labels
- Toast messages
- Status text
- Window titles
- Notification messages

These areas have high reusability and are easy to separate from data translations.

### Migrate Later

- `name`, `name_ko`, `name_ja`, `name_zh` stored in the DB
- User-input-based content
- Long, context-dependent text like prompts/reports

In other words, **UI translations** and **content translations** must be handled separately.

---

## Migration Rules

1. Do not add new UI strings as inline `{ ko, en, ja, zh }` objects.
2. Add new strings by first adding the key to `shared/i18n/messages/en.ts`.
3. Add the same key to the remaining language files.
4. Frontend uses `tk()`, server uses `translateMessage()`.
5. Do not duplicate common strings.

---

## Recommended Namespaces

- `app.*` : App shell, global UI, update banners
- `task.*` : Task status, task board common text
- `decision.*` : Decision-making, review, PM flow
- `gateway.*` : Messenger/external notifications
- `settings.*` : Settings screen
- `errors.*` : Error/failure messages

---

## Remaining Work

- Reduce `if (lang === "ko")` branching logic in the server to key-based calls
- Add a lint rule or search script to detect inline multilingual object usage
- Add a translation key missing detection script

---

## Conclusion

This phase has established the foundation for AgentDesk to transition from a hardcoded multilingual structure to a common resource-based structure.

The full migration is not yet complete, but the direction is clear:

- Old approach: Translation data embedded in code
- New approach: Key lookup from an external common catalog

Going forward, new UI strings should use this structure by default, and existing hardcoded strings should be gradually migrated on a per-screen/per-domain basis.
