# Figma Plugin Publication Form - Fill Out Guide

## Step 1: Describe Your Resource

### Name*
**Value:** `Starter Kit`
- Already filled ✓

### Tagline* (100 characters max)
**Suggested:** 
```
Get set, go with team-ready kits—fast and consistent.
```
*Alternative options:*
- `Design fast. Stay consistent. Use your team's kits—no resource hunting.`
- `Team-ready design starter kits for faster, consistent workflows`

### Description* (Required)
**Suggested:**
```
Starter Kit helps design teams work faster and stay consistent by providing easy access to cloud-specific design resources, templates, and starter pages.

Key Features:
• Cloud-specific starter kits (Sales, Service, Marketing, Commerce, Revenue, Field Service)
• Template library with covers, components, slides, and resources
• Customizable page structures and scaffold configurations
• Save favorite templates for quick access
• Cloud POC contacts for team support
• Drag-and-drop template organization
• Status symbol management for design workflows

Perfect for designers who want to:
- Quickly access team-approved design resources
- Maintain consistency across cloud-specific projects
- Organize and manage design templates efficiently
- Collaborate with team members through cloud POCs

Built for Salesforce design teams to streamline their design workflow and ensure consistency across all cloud products.
```

### Category*
**Select:** `Design Systems` or `Productivity`
- Recommended: **Design Systems** (most appropriate)

---

## Step 2: Choose Some Images

### Plugin Icon
- Upload a square icon (recommended: 512x512px)
- Use the Starter Kit icon from `src/assets/Starter Kit _icon.png`

### Screenshots
- Add 2-3 screenshots showing:
  1. Main template library view
  2. Settings/configuration view
  3. Template insertion workflow

---

## Step 3: Data Security

### Question 1: Do you host a backend service for your plugin/widget?
**Answer:** 
```
Yes, but my plugin/widget does not send any data read/derived from Figma's plugin API to this backend.
```
*Note: The plugin uses Heroku for template storage, but doesn't send Figma API data to it.*

### Question 2: Does your plugin/widget make any network requests with services you do not host?
**Select:**
- ✅ `My plugin/widget makes network requests for static assets eg. fonts, images. None of these requests include data read/derived from Figma's plugin API.`
- ✅ `My plugin/widget makes network requests not captured by the above:`
  - *Specify:* "Requests to Heroku backend for template management (no Figma API data sent)"

### Question 3: Does your plugin/widget use any user authentication?
**Answer:**
```
No, my plugin/widget does not require or use any user authentication.
```

### Question 4: Do you store any data read/derived from Figma's plugin API?
**Select:**
- ✅ `Yes, my plugin/widget stores data read/derived from Figma's plugin API locally (eg. localStorage, figma.clientStorage, or node.setPluginData).`
  - *Details:* Stores user preferences, saved templates, cloud settings, and page structures locally using `figma.clientStorage`

### Question 5: How do you manage updates to your plugin/widget?
**Answer:**
```
I am a solo developer. I manage and update my plugin/widget myself.
```
*Or if you have code reviews:*
```
I work on a team and code changes are reviewed by a separate person before publishing.
```

### Checkbox
- ✅ `I agree to share this information.`

---

## Step 4: Add the Final Details

### Publish to
**Select:** 
- `Salesforce` (Private) - *if publishing internally*
- `Community` (Public) - *if publishing publicly*

### Author (Share as)
**Select:** `Prantik Banerjee` (Individual creator)
- Already selected ✓

### Comments
- ✅ `Allow comments from Community members` (if publishing to Community)

### Support contact*
**Value:** `prantik.banerjee@salesforce.com`
- Already filled ✓

### Plugin ID ⚠️ **IMPORTANT - FIX THIS FIRST**
**Current:** `000000000000000000` (Invalid placeholder)

**Action Required:**
1. Click **"Generate ID"** button in the error message
2. This will generate a valid plugin ID
3. Update `manifest.json` with the new ID:
   ```json
   {
     "id": "GENERATED_ID_HERE"
   }
   ```
4. Rebuild: `npm run build`
5. Return to this step and verify the ID is valid

---

## Step 5: Compatibility & Network

### Compatibility
**Select both:**
- ✅ `For Figma`
- ✅ `For FigJam`

### Network
**Select:**
- ✅ `Restricted network access`
  - *This matches your manifest.json configuration*
  - Domains allowed: `https://*.herokuapp.com`, `https://api.figma.com`

---

## ⚠️ Critical: Fix Plugin ID Before Publishing

The error "Invalid ID in manifest icon" means you need to:

1. **Click "Generate ID"** in the error message
2. **Copy the generated ID**
3. **Update manifest.json:**
   ```bash
   # Edit manifest.json and replace:
   "id": "000000000000000000"
   # with:
   "id": "YOUR_GENERATED_ID_HERE"
   ```
4. **Rebuild the plugin:**
   ```bash
   npm run build
   ```
5. **Re-import the plugin** in Figma to test
6. **Return to publication form** - the error should be gone

---

## Quick Reference Checklist

- [ ] Step 1: Name ✓, Tagline ✓, Description ✓, Category ✓
- [ ] Step 2: Icon uploaded, Screenshots added
- [ ] Step 3: All data security questions answered
- [ ] Step 4: Plugin ID generated and manifest.json updated
- [ ] Step 4: Support contact ✓, Publish to selected
- [ ] Step 5: Compatibility (Figma + FigJam) ✓, Network (Restricted) ✓
- [ ] Final: Click "Publish" button

---

## After Publishing

1. Monitor plugin usage
2. Check for user feedback
3. Address any reported issues
4. Plan next version features
