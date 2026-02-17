# Release Summary - Starter Kit Plugin v1.16.0

## Version History & Activity Log Improvements

**Release Date:** February 4, 2025  
**Version:** 1.16.0

---

## Summary

This release focuses on improving the Version History and Activity Log modals with dark mode support, better UX, and polish across the plugin.

---

## What's New

### 🌙 Dark Mode for Modals
- **Activity Log** and **Version History** modals now fully support dark mode
- Consistent dark theme when the app is in dark mode
- Dark overlay, backgrounds, text, and table styling

### ✅ Restore Confirmation
- Replaced native browser confirm dialog with in-app modal
- Modal appears correctly on top with proper z-index
- Cancel and OK buttons with dark mode support

### 📋 Version History UI
- Summary bar fixed at top—no overlap with scrolling table
- Bottom padding added so "Backup and Restore" button is never cut off
- Thin 6px scrollbar for a cleaner look
- Horizontal scroll removed

### 🔍 Asset Hover Preview
- Magnification popover after 2-second hover for **all asset types**
- Works for both variant grids and single components
- Popover positioned near the top of the plugin

### 📌 Saved Pill
- Icon and label both visible in the Saved pill
- Extra padding to prevent truncation

---

## Key Fixes

- Fixed table content scrolling on top of summary bar
- Fixed CTA button getting chopped in Version History modal

---

## For Publication

**Short description (for Figma Community):**
> Version 1.16.0: Dark mode for Activity Log & Version History, improved restore flow, hover preview for all assets, and UI polish.

**Full changelog:** See `VERSION_HISTORY.md`
