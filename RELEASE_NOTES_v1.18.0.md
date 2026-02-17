# Release Notes - Starter Kit Plugin v1.18.0

**Release Date:** February 4, 2025  
**Version:** 1.18.0  
**Plugin ID:** 1595457818027167058

---

## 🛡️ Bulletproof Data Loss Prevention

This release adds **multi-layer protection** against accidental template and saved-item loss. The "all components disappear" scenario is now prevented at every level.

---

## ✨ What's New

### 🔒 Data Loss Prevention
- **Backend + Client Protection**: Rejects clear-all and suspicious bulk deletes (max 2 deletions at a time, no >50% reduction)
- **Empty API Handling**: When the server returns empty, we keep your cached data and push it back to restore
- **400 Refetch Safety**: On save failure, refetch won't overwrite with empty (templates and saved items)
- **Migration Hardening**: Only migrates when valid data exists; never overwrites with empty
- **Message Guards**: `ALL_TEMPLATES_REFRESHED` with empty payload is ignored
- **Updater Validation**: `setTemplates(prev => next)` supports functional updates with same safeguards
- **Documentation**: `DATA_LOSS_PREVENTION.md` for developers

### 🎨 UI Improvements
- **Restore Modal Capsule Buttons**: Cancel and OK buttons now use consistent capsule (pill) styling
- **Dark Mode**: Capsule buttons look unified in both light and dark themes

---

## 🐛 Bug Fixes

- ✅ **Prevented "all components disappear"** – Multiple safeguards ensure this scenario never occurs
- ✅ Fixed restore confirmation buttons looking inconsistent

---

## 📋 Upgrade Instructions

**For Existing Users:**
- No action needed. Open the plugin as usual.
- Your data is automatically protected.

**For New Users:**
- No changes to onboarding flow.

---

## 🔧 Technical Details

- Backend: Bulk-delete validation for all critical data types
- Client: `useTemplates` and `useSavedItems` hooks hardened with empty-response and 400 handling
- Migration: Validates templates (id+name) before migrating
- See `DATA_LOSS_PREVENTION.md` for full rules

---

**Status:** ✅ Ready for Publication
