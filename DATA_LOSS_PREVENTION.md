# Data Loss Prevention Rules

**Critical:** Templates and saved items must never be overwritten with empty data. This document describes the safeguards and rules for future changes.

## Never Do

1. **Never bypass the hooks** – All template/saved-item updates must go through `useTemplates().setTemplates` and `useSavedItems().setSavedItems`. Do not call backend APIs directly for writes.

2. **Never clear-all without explicit user action** – The save functions block `setTemplates([])` and `setSavedItems([])` when we had data. If you need a "clear all" feature, add a dedicated flow with confirmation.

3. **Never accept empty API responses blindly** – When the API returns `[]`, we keep cached data and push it back. Do not add code paths that overwrite with empty.

4. **Never remove bulk-delete protection** – Backend and client both enforce: no clear-all, max 2 deletions at a time, no >50% reduction when count ≥ 3.

## Protection Layers

| Layer | Location | What it does |
|-------|----------|--------------|
| Backend bulk-delete | `backend/server.js` | Rejects clear-all and suspicious bulk deletes |
| Client save blocks | `useBackendStorage.ts` | Blocks `[]` and bulk delete in `setTemplates` / `setSavedItems` |
| Updater validation | `useBackendStorage.ts` | When using `setTemplates(prev => next)`, validates `next` before applying |
| Empty API response | `useBackendStorage.ts` | Initial load, refetch, retry: keep cached data, push to backend |
| 400 refetch | `useBackendStorage.ts` | On save 400, refetch; if empty, keep cached data |
| Migration | `App.tsx` | Only migrates when we have valid data (id+name for templates) |
| Message handlers | `App.tsx` | `ALL_TEMPLATES_REFRESHED` with `[]` is ignored; `TEMPLATE_REFRESHED` without templateId is ignored |

## Adding New Code Paths

When adding code that updates templates or saved items:

1. Use the hook setters – do not bypass.
2. For partial updates (e.g. refresh preview), use the functional form: `setTemplates(prev => prev.map(...))`.
3. Ensure your updater never returns empty when we had data.
4. If adding new message handlers, add the same empty-payload checks.

## Testing

Before shipping changes that touch templates or saved items:

- Verify bulk-delete is still blocked (try `setTemplates([])` when you have data).
- Verify empty API response uses cached data (mock API to return `[]`).
- Verify migration only runs with valid data.
