# Release Summary - Starter Kit Plugin v1.17.0

## 🎨 UI/UX Improvements & Dark Mode

**Release Date:** February 4, 2025  
**Version:** 1.17.0

---

## What's New

### 🌙 Dark Mode for Modals
- **Activity Log** and **Version History** modals now fully support dark mode
- Dark overlay, backgrounds, and text for a consistent experience when using dark theme
- All modal elements (headers, tables, buttons) styled for dark mode

### ✅ Restore Confirmation Modal
- Replaced native browser confirm dialog with an in-app modal
- Modal appears on top with proper z-index
- Cancel and OK buttons with dark mode support
- Better UX and consistent styling

### 📋 Version History Improvements
- Summary bar fixed at top (no overlap with scrolling table)
- Added bottom padding so "Backup and Restore" button is never chopped
- Thin scrollbar (6px) for a cleaner look
- No horizontal scroll

### 🔍 Asset Hover Preview
- Magnification popover appears after 2-second hover for **all asset types**
- Works for both variant grids and single components
- Popover positioned near top of plugin for better visibility

### 📌 Saved Pill
- Icon + label both visible in the pill section
- Extra padding to prevent truncation

---

## Bug Fixes

- Fixed table content scrolling on top of summary (restructured layout)
- Fixed CTA button getting chopped in Version History modal

---

## Summary (for Figma Community publish)

**v1.17.0** — Dark mode for Activity Log & Version History modals, in-app restore confirmation, improved Version History layout (fixed summary, no overlap), 2s hover preview for all assets, Saved pill shows icon + label.
