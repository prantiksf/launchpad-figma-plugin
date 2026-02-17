# Release Notes - Starter Kit Plugin v1.18.0

**Release Date:** February 17, 2026  
**Version:** 1.18.0

---

## Summary

This release focuses on **bulletproof data loss prevention** and **UI polish**. We've added multiple layers of protection so the "all components disappear" scenario can never happen again, plus improved the restore confirmation modal with consistent capsule-style buttons.

---

## What's New

### 🛡️ Bulletproof Data Loss Prevention

Multi-layer protection against accidental template and saved-item loss:

| Layer | What it does |
|-------|--------------|
| **Backend** | Rejects clear-all and suspicious bulk deletes (max 2 at a time, no >50% reduction) |
| **Client save** | Blocks `setTemplates([])` and `setSavedItems([])` when we had data |
| **Empty API** | When API returns `[]`, keeps cached data and pushes back to restore |
| **400 refetch** | On save 400, refetch; if empty, keeps cached data (templates + saved items) |
| **Migration** | Only migrates when we have valid data; never overwrites with empty |
| **Message guards** | `ALL_TEMPLATES_REFRESHED` with empty payload is ignored |
| **Updater validation** | `setTemplates(prev => next)` enforces same safeguards |

See `DATA_LOSS_PREVENTION.md` for full rules and guidelines for future changes.

### 🎨 Restore Confirmation Modal – Capsule Buttons

- Cancel and OK buttons now use consistent capsule (pill) styling
- Unified look in light and dark mode
- Removed stretching so buttons keep a true pill shape

---

## Bug Fixes

- **Prevented "all components disappear"** – The scenario where deleting a component in Figma caused all components to vanish from the plugin can no longer occur.

---

## Technical Improvements

- Migration hardening: only migrates templates with valid `id` and `name`
- Updater function support for `setTemplates(prev => ...)` with full validation
- 400 error handler for saved items (matches templates)
- Bulk-delete protection for saved items (client-side)

---

## Upgrade Instructions

**For Existing Users:**
- No action required. All protections apply automatically.
- Your data is now better protected against accidental loss.

**For New Users:**
- Same setup as before. Open plugin, select cloud, click "Get Started."

---

## Publication Checklist

- [x] Version 1.18.0 in package.json, App.tsx, code.ts
- [x] Production build successful
- [x] VERSION_HISTORY.md updated
- [x] DATA_LOSS_PREVENTION.md documented
- [ ] Push to git remote
- [ ] Publish via Figma (Plugins → Development → Publish plugin...)

---

## Plugin Details

- **Plugin ID:** 1595457818027167058
- **Support:** prantik.banerjee@salesforce.com
