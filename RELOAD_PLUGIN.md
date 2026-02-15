# How to See Plugin Changes in Figma

Figma caches plugins aggressively. After running `npm run build`, follow these steps to see your changes:

## Option 1: Full Reload (Most Reliable)

1. **Close the plugin panel** – Click the X or click outside to dismiss
2. **Remove the development plugin** – Plugins → Development → Right-click "Starter Kit" → **Remove**
3. **Re-import** – Plugins → Development → **Import plugin from manifest**
4. **Select** your project folder: `starter-kit-poc` (the folder containing `manifest.json`)
5. **Run** – Plugins → Development → Starter Kit

## Option 2: Quick Reload

1. **Close the plugin panel** completely
2. **Re-run** – Plugins → Development → Starter Kit
3. If still not updated, try **Reload** (if available) or Option 1

## Option 3: Test in Browser (No Figma Needed)

Verify your changes work before testing in Figma:

```bash
npm run preview
```

Then open **http://localhost:3000/preview.html** in your browser. This loads the same UI with your latest build. Open Activity History to confirm the changes.

## Checklist

- [ ] Ran `npm run build` after making changes
- [ ] Closed the plugin panel before reopening
- [ ] Using **Development** plugin (not a published Community plugin)
- [ ] Manifest path points to this project folder
