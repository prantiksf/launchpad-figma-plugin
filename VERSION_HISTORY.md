# Version History

## v1.18.0 (Current)
**Release Date:** 2025-02-04

### Features
- ✅ **Bulletproof Data Loss Prevention**
  - Multi-layer protection against accidental template/saved-item loss
  - Backend + client reject clear-all and suspicious bulk deletes
  - Empty API response: keep cached data, push back to restore
  - 400 refetch: templates and saved items won't overwrite with empty
  - Migration: only migrates valid data; never overwrites with empty
  - Message guards: `ALL_TEMPLATES_REFRESHED` with empty payload ignored
  - Updater validation: `setTemplates(prev => next)` with same safeguards
  - Documentation: `DATA_LOSS_PREVENTION.md`
- ✅ **Restore Confirmation Modal – Capsule Buttons**
  - Cancel and OK buttons use consistent capsule (pill) styling
  - Unified look in light and dark mode

### Bug Fixes
- Prevented "all components disappear" scenario from ever occurring

---

## v1.17.0
**Release Date:** 2025-02-04  
Previous release. See v1.18.0 for current changes.

### Features
- ✅ **Version History & Activity Log Dark Mode**
  - Both modals now respect dark mode theme
  - Dark overlay, backgrounds, and text for consistent experience
- ✅ **Restore Confirmation Modal**
  - Replaced native browser confirm with in-app modal
  - Modal appears on top with proper z-index
  - Cancel and OK buttons with dark mode support
- ✅ **Version History UI Improvements**
  - Summary bar fixed at top (no overlap with table)
  - Added bottom padding so CTA button is never chopped
  - Thin scrollbar (6px) for cleaner look
  - No horizontal scroll
- ✅ **Asset Hover Preview**
  - Magnification popover after 2s hover for all asset types (variants + single components)
  - Popover positioned near top of plugin
- ✅ **Saved Pill**
  - Icon + label both visible in pill section
  - Extra padding to prevent truncation

### Bug Fixes
- Fixed table content scrolling on top of summary (restructured layout)
- Fixed CTA button getting chopped in Version History modal

---

## v1.16.0
**Release Date:** 2025-02-04  
Previous release. See v1.17.0 for current changes.

---

## v1.10.0
**Release Date:** 2024-12-19

### Features
- ✅ Restored and enhanced Save feature in template menu
  - Added "Save all" / "Unsave all" option for component sets
  - Improved Save variant submenu visibility
  - Save option now appears at top of menu for better discoverability
- ✅ Fixed clipboard copy functionality for POC email addresses
  - Implemented fallback method using temporary textarea for Figma plugin compatibility
  - Always shows toast notification when copying email
- ✅ Improved toast notification reliability
  - Toast now always displays regardless of clipboard API success
  - Better error handling and user feedback
- ✅ UI/UX Improvements
  - Removed dashed borders from Add Category, Add POC, and Add Cloud/Team buttons
  - Reduced settings header padding for tighter, cleaner layout (6px sides)
  - Grouped dropdown menu items (Add pattern, Create Pages, Manage Clouds and Sections)
  - Improved icon design for "Manage Clouds and Sections" (stacked layers)
  - Renamed "Manage Clouds and Teams" to "Manage Clouds and Sections"
  - Removed header border-bottom line for cleaner appearance
  - Optimized header padding (20px all around, 8px bottom for tighter spacing)
  - Reduced scaffold section padding (0px top, 12px sides) for better space utilization
  - Minimized gap between header and Back button for improved visual flow
  - Better visual grouping and consistency across UI elements

### Bug Fixes
- Fixed Save feature visibility in template ellipsis menu
- Fixed clipboard copy not working in Figma plugin context
- Fixed toast notification not appearing when clicking POC names

### Technical Improvements
- Enhanced clipboard copy with multiple fallback methods
- Improved error handling for clipboard operations
- Better user feedback for all actions
- Cleaner CSS with consistent button styling

---

## v1.9.0
**Release Date:** 2024-12-18

### Features
- ✅ Cloud and Team Management
  - Ability to hide/show clouds or teams
  - Customizable categories per cloud
  - Reset functionality for all settings to default
  - Nested hierarchy for categories under default cloud
  - Full-width cloud rows with eye icons
  - Ability to add 2 Cloud POCs (designer name and email ID) per cloud
  - Cloud names editable with icon upload capability
- ✅ Page Structure Configuration
  - Ability to create and reorganize topics (sections and pages)
  - Full editing experience for page structures within accordion in Settings
  - Status symbols editable/addable
  - Default page structure with elaborate configuration
- ✅ Template Management
  - Figma links cloud-specific
  - "Reset All" restores default page structures
  - Drag-and-drop reordering with gripper handles
  - Prevent hiding default cloud
  - Scaffold preview scrollable with fixed CTAs
  - Cover template selector with all variants
  - "Move to" feature for templates between categories
  - Confirmation dialog for deleting templates
  - "Save to Collection" feature for templates
  - Saved section appears as icon pill when items are saved
  - Saved icon on template images for quick unsave
- ✅ Header Layout and UI
  - Fixed low-resolution icons
  - Moved "+" button to dropdown above settings labeled "Add pattern"
  - Header section with welcome message and Cloud POCs
  - Improved filter pills with horizontal scrolling and fade effects
  - Consistent 20px padding all around
  - Fixed header/footer with scrollable content
  - Sticky settings header
  - Simplified accordions
  - Plugin branding from selected frame
  - Plugin renamed to "Starter Kit"

### Bug Fixes
- Fixed dropdown visibility issues
- Fixed Figma links not being cloud-specific
- Fixed Reset All not restoring page structure
- Fixed saved variants display in Saved section
- Fixed header name not updating with cloud name
- Fixed POC click behavior (Slack DM with email copy fallback)
- Fixed scrollbar positioning
- Fixed elements passing through from behind header

---

## v1.0.0
**Release Date:** Initial Release

### Features
- Initial plugin setup
- Basic template management
- Cloud selection
- Category filtering
- Template capture and insertion
