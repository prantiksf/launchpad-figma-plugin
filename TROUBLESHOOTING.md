# Troubleshooting: Plugin Not Working After ID Update

## Issue
Plugin shows blank screen after updating the plugin ID.

## Solution Steps

### 1. Re-import the Plugin (CRITICAL)
When you change the plugin ID, Figma treats it as a **completely new plugin**. You must:

1. **Close the current plugin** if it's open
2. Go to **Plugins → Development → Import plugin from manifest...**
3. **Select the `manifest.json` file** from your project root:
   ```
   /Users/prantik.banerjee/Documents/Vibe Coding Experiments/starter-kit-poc/manifest.json
   ```
4. The plugin should now load with the new ID

### 2. Verify Manifest.json
Check that `manifest.json` has the correct ID:
```json
{
  "id": "1595457818027167058"
}
```

### 3. Check Browser Console
1. Open the plugin in Figma
2. Right-click in the plugin panel → **Inspect**
3. Check the **Console** tab for any errors
4. Common errors:
   - `Cannot read property 'postMessage' of null` → Plugin not properly initialized
   - `Failed to load resource` → Build files missing or incorrect paths

### 4. Verify Build Files
Make sure these files exist in the `dist/` folder:
- `dist/code.js` ✓
- `dist/ui.html` ✓
- `dist/ui.js` ✓
- `dist/ui.css` ✓

### 5. Clear Figma Cache
If the plugin still doesn't work:
1. Close Figma completely
2. Reopen Figma
3. Re-import the plugin

### 6. Check Plugin Permissions
In the manifest.json, verify permissions are set:
```json
{
  "permissions": ["currentuser"]
}
```

### 7. Test in Development Mode
1. Make sure you're importing from the **Development** section, not Community
2. The plugin should appear in **Plugins → Development → Starter Kit**

## Common Issues

### Blank Screen
- **Cause**: Plugin not properly initialized or JavaScript error
- **Fix**: Check browser console, re-import plugin, rebuild if needed

### "Plugin failed to load"
- **Cause**: Invalid manifest.json or missing build files
- **Fix**: Run `npm run build` and verify all files exist

### Plugin loads but shows nothing
- **Cause**: React app not mounting or initialization error
- **Fix**: Check console for React errors, verify `#root` element exists

## Verification Checklist

- [ ] Plugin ID updated in manifest.json: `1595457818027167058`
- [ ] Build completed successfully: `npm run build`
- [ ] All dist files exist (code.js, ui.html, ui.js, ui.css)
- [ ] Plugin re-imported in Figma with new manifest.json
- [ ] Browser console checked for errors
- [ ] Plugin appears in Plugins → Development menu

## Still Not Working?

1. **Check the console** - Most issues show error messages there
2. **Rebuild**: Run `npm run build` again
3. **Verify paths**: Make sure manifest.json paths point to `dist/` folder
4. **Test in browser**: Use `npm run preview` to test the UI separately

## Quick Fix Command
```bash
cd "/Users/prantik.banerjee/Documents/Vibe Coding Experiments/starter-kit-poc"
npm run build
# Then re-import manifest.json in Figma
```
