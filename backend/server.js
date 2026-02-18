/**
 * Starter Kit Backend API
 * Provides centralized storage for the Figma plugin
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// ============================================================================
// BULK-DELETE PROTECTION HELPERS
// ============================================================================

/**
 * Validate array-based data for bulk-delete protection.
 * Returns { error, status } if blocked, null if allowed.
 */
function validateArrayBulkDelete(currentCount, newCount, dataType) {
  // Allow 1->0 and 2->0 (intentional "unsave last" / small cleanup),
  // but block large clear-all operations.
  if (currentCount >= 3 && newCount === 0) {
    return { status: 400, error: 'Data protection triggered', message: `Cannot delete all ${dataType} at once. Delete them one at a time.`, currentCount };
  }
  if (currentCount >= 3 && newCount < currentCount - 2) {
    return { status: 400, error: 'Data protection triggered', message: `Cannot reduce ${dataType} from ${currentCount} to ${newCount}. Max 2 deletions at a time.`, currentCount, attemptedCount: newCount };
  }
  if (currentCount > 5 && newCount < currentCount * 0.5) {
    return { status: 400, error: 'Data protection triggered', message: `Cannot reduce ${dataType} from ${currentCount} to ${newCount}. This looks like accidental data loss.`, currentCount, attemptedCount: newCount };
  }
  return null;
}

/**
 * Validate object-based data (keyed by cloudId) for bulk-delete protection.
 */
function validateObjectBulkDelete(currentCount, newCount, dataType) {
  if (currentCount >= 3 && newCount === 0) {
    return { status: 400, error: 'Data protection triggered', message: `Cannot delete all ${dataType} at once. Delete them one at a time.`, currentCount };
  }
  if (currentCount >= 3 && newCount < currentCount - 2) {
    return { status: 400, error: 'Data protection triggered', message: `Cannot reduce ${dataType} from ${currentCount} to ${newCount}. Max 2 deletions at a time.`, currentCount, attemptedCount: newCount };
  }
  if (currentCount > 5 && newCount < currentCount * 0.5) {
    return { status: 400, error: 'Data protection triggered', message: `Cannot reduce ${dataType} from ${currentCount} to ${newCount}. This looks like accidental data loss.`, currentCount, attemptedCount: newCount };
  }
  return null;
}

// Whitelist of allowed backup data keys
const ALLOWED_BACKUP_KEYS = ['templates', 'saved_items', 'figma_links', 'cloud_figma_links', 'custom_clouds', 'editable_clouds', 'cloud_categories', 'status_symbols', 'cloud_pocs', 'housekeeping_rules'];

function isAllowedBackupKey(dataKey) {
  if (typeof dataKey !== 'string') return false;
  if (ALLOWED_BACKUP_KEYS.includes(dataKey)) return true;
  // Allow per-user saved items backups: saved_items:<figmaUserId>
  if (/^saved_items:[^/]+$/.test(dataKey)) return true;
  return false;
}

function getUserIdFromSavedItemsKey(dataKey) {
  if (typeof dataKey !== 'string') return null;
  const m = dataKey.match(/^saved_items:(.+)$/);
  return m ? m[1] : null;
}

function requireMatchingUserForUserKey(req, res, dataKey) {
  const userIdInKey = getUserIdFromSavedItemsKey(dataKey);
  if (!userIdInKey) return true;
  const raw = req.headers['x-figma-user-id'] || null;
  const headerUserId = Array.isArray(raw) ? raw[0] : raw;
  if (!headerUserId || String(headerUserId) !== String(userIdInKey)) {
    res.status(403).json({ error: 'Forbidden', message: 'User-scoped backup key requires matching X-Figma-User-Id' });
    return false;
  }
  return true;
}

const PORT = process.env.PORT || 3000;

// CORS - restrict to known origins (Figma plugin UIs may use different origins; add more if needed)
const allowedOrigins = [
  'https://www.figma.com',
  'https://figma.com',
  // Some embedded/Electron contexts send Origin: "null"
  'null',
  /^https:\/\/.*\.herokuapp\.com$/
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === 'null' || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}));
app.use(express.json({ limit: '50mb' })); // Large limit for base64 previews

// API key middleware - if API_KEY env is set, require it on /api/* and /admin/*
const apiKeyAuth = (req, res, next) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next();
  const key = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (key === apiKey) return next();
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
};
app.use('/api', apiKeyAuth);
app.use('/admin', apiKeyAuth);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'starter-kit-backend' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// ADMIN ENDPOINTS (for debugging/checking data)
// ============================================================================

// View all shared data
app.get('/admin/shared-data', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT key, data, updated_at FROM shared_data ORDER BY updated_at DESC');
    res.json({
      count: result.rows.length,
      data: result.rows.map(row => ({
        key: row.key,
        dataSize: JSON.stringify(row.data).length,
        updatedAt: row.updated_at,
        preview: JSON.stringify(row.data).substring(0, 200) + '...'
      }))
    });
  } catch (error) {
    console.error('Error fetching shared data:', error);
    res.status(500).json({ error: 'Failed to fetch shared data' });
  }
});

// View specific shared data key
app.get('/admin/shared-data/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const data = await db.getSharedData(key);
    res.json({ key, data, exists: data !== null });
  } catch (error) {
    console.error('Error fetching shared data:', error);
    res.status(500).json({ error: 'Failed to fetch shared data' });
  }
});

// View all user preferences
app.get('/admin/user-preferences', async (req, res) => {
  try {
    const result = await db.pool.query(
      'SELECT figma_user_id, default_cloud, onboarding_completed, skip_splash, hidden_clouds, created_at, updated_at FROM user_preferences ORDER BY updated_at DESC'
    );
    res.json({
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

// View specific user preferences
app.get('/admin/user-preferences/:figmaUserId', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    const prefs = await db.getUserPreferences(figmaUserId);
    res.json(prefs);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

// ============================================================================
// SHARED DATA ENDPOINTS (Team-wide)
// ============================================================================

// ---------- Templates ----------
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await db.getTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const templates = req.body.templates;
    const userName = req.body.userName || req.headers['x-figma-user-name'] || null;
    
    // ========== STRICT VALIDATION ==========
    
    // 1. Must be an array
    if (!Array.isArray(templates)) {
      console.error('🛑 BLOCKED: templates is not an array:', typeof templates);
      return res.status(400).json({ 
        error: 'Invalid data format', 
        message: 'Templates must be an array'
      });
    }
    
    // 2. Validate each template has required fields
    const validTemplates = templates.filter(t => 
      t && typeof t === 'object' && t.id && t.name
    );
    if (validTemplates.length !== templates.length) {
      console.error(`🛑 BLOCKED: ${templates.length - validTemplates.length} templates missing id/name`);
      return res.status(400).json({ 
        error: 'Invalid template data', 
        message: 'All templates must have id and name fields'
      });
    }
    
    // ========== DATA PROTECTION ==========
    
    const currentTemplates = await db.getTemplates();
    const currentCount = currentTemplates.length;
    const newCount = templates.length;
    
    // 3. NEVER allow saving empty array when data exists
    if (currentCount > 0 && newCount === 0) {
      console.error(`🛑 BLOCKED: Attempted to clear all ${currentCount} templates`);
      return res.status(400).json({ 
        error: 'Data protection triggered', 
        message: 'Cannot delete all templates at once. Delete them one at a time.',
        currentCount
      });
    }
    
    // 4. Block large reductions (more than 2 templates deleted at once)
    // Soft deletes don't reduce count, only permanent deletes do
    if (currentCount >= 3 && newCount < currentCount - 2) {
      console.error(`🛑 BLOCKED: Attempted bulk deletion (${currentCount} -> ${newCount})`);
      return res.status(400).json({ 
        error: 'Data protection triggered', 
        message: `Cannot reduce templates from ${currentCount} to ${newCount}. Max 2 deletions at a time.`,
        currentCount,
        attemptedCount: newCount
      });
    }
    
    // 5. Block any reduction greater than 50% (catches edge cases)
    if (currentCount > 5 && newCount < currentCount * 0.5) {
      console.error(`🛑 BLOCKED: Attempted >50% reduction (${currentCount} -> ${newCount})`);
      return res.status(400).json({ 
        error: 'Data protection triggered', 
        message: `Cannot reduce templates from ${currentCount} to ${newCount}. This looks like accidental data loss.`,
        currentCount,
        attemptedCount: newCount
      });
    }
    
    // ========== AUTO-BACKUP ==========
    
    if (currentCount > 0) {
      const action = newCount > currentCount ? 'add' : (newCount < currentCount ? 'delete' : 'update');
      await db.createBackup('templates', currentTemplates, action, userName);
      await db.cleanupOldBackups('templates', 100);
    }
    
    // ========== ACTIVITY LOGGING ==========
    
    // Detect what changed for activity logging
    const currentIds = new Set(currentTemplates.map(t => t.id));
    const newIds = new Set(templates.map(t => t.id));
    
    // Find added templates
    const addedTemplates = templates.filter(t => !currentIds.has(t.id));
    for (const t of addedTemplates) {
      await db.logActivity('add', t, userName);
    }
    
    // Find deleted templates (completely removed)
    const permanentlyDeleted = currentTemplates.filter(t => !newIds.has(t.id));
    for (const t of permanentlyDeleted) {
      await db.logActivity('delete_forever', t, userName);
    }
    
    // Find soft-deleted templates (marked as deleted but still in array)
    for (const newT of templates) {
      const oldT = currentTemplates.find(t => t.id === newT.id);
      if (oldT && !oldT.deleted && newT.deleted) {
        // Template was soft-deleted
        await db.logActivity('delete', newT, userName);
      } else if (oldT && oldT.deleted && !newT.deleted) {
        // Template was restored
        await db.logActivity('restore', newT, userName);
      } else if (oldT && JSON.stringify(oldT) !== JSON.stringify(newT) && !addedTemplates.includes(newT)) {
        // Template was updated (not added, not delete state change)
        if (!newT.deleted) {
          await db.logActivity('update', newT, userName);
        }
      }
    }
    
    // ========== SAVE ==========
    
    console.log(`💾 Saving ${templates.length} templates to database... (was ${currentCount})`);
    await db.saveTemplates(templates);
    console.log(`✓ Successfully saved ${templates.length} templates`);
    res.json({ success: true, count: templates.length });
  } catch (error) {
    console.error('✗ Error saving templates:', error);
    res.status(500).json({ error: 'Failed to save templates', details: error.message });
  }
});

// ---------- Templates Last Refreshed ----------
app.get('/api/templates-last-refreshed', async (req, res) => {
  try {
    const data = await db.getSharedData('templates_last_refreshed');
    res.json({ lastRefreshed: data || null });
  } catch (error) {
    console.error('Error fetching last refreshed:', error);
    res.status(500).json({ error: 'Failed to fetch last refreshed' });
  }
});

app.post('/api/templates-last-refreshed', async (req, res) => {
  try {
    const { lastRefreshed } = req.body;
    await db.saveSharedData('templates_last_refreshed', lastRefreshed);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving last refreshed:', error);
    res.status(500).json({ error: 'Failed to save last refreshed' });
  }
});

// ---------- Saved Items ----------
app.get('/api/saved-items', async (req, res) => {
  try {
    const figmaUserIdRaw = req.headers['x-figma-user-id'] || null;
    const figmaUserId = Array.isArray(figmaUserIdRaw) ? figmaUserIdRaw[0] : figmaUserIdRaw;
    const items = figmaUserId ? await db.getUserSavedItems(String(figmaUserId)) : await db.getSavedItems();
    res.json(Array.isArray(items) ? items : []);
  } catch (error) {
    console.error('Error fetching saved items:', error);
    res.status(500).json({ error: 'Failed to fetch saved items' });
  }
});

app.post('/api/saved-items', async (req, res) => {
  try {
    const figmaUserIdRaw = req.headers['x-figma-user-id'] || null;
    const figmaUserId = Array.isArray(figmaUserIdRaw) ? figmaUserIdRaw[0] : figmaUserIdRaw;
    const newItems = req.body.savedItems || [];
    if (!Array.isArray(newItems)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Saved items must be an array' });
    }
    const validItems = newItems.filter(item => item && typeof item === 'object' && item.templateId);
    if (validItems.length !== newItems.length) {
      return res.status(400).json({ error: 'Invalid data', message: 'All saved items must have templateId' });
    }
    const currentItems = figmaUserId ? await db.getUserSavedItems(String(figmaUserId)) : await db.getSavedItems();
    const currentCount = Array.isArray(currentItems) ? currentItems.length : 0;
    const newCount = newItems.length;
    // CRITICAL: Allow clearing all saved items - it's user preference, not critical data
    // Users should be able to unsave all items if they want (unlike templates which are critical)
    // Only validate if it's a suspicious bulk delete (not clearing all)
    if (newCount > 0 && currentCount >= 3 && newCount < currentCount - 2) {
      // Block suspicious partial deletions (but allow clearing all)
      const block = { status: 400, error: 'Data protection triggered', message: `Cannot reduce saved items from ${currentCount} to ${newCount}. Max 2 deletions at a time.`, currentCount, attemptedCount: newCount };
      console.error('🛑 BLOCKED: saved-items', block);
      return res.status(block.status).json(block);
    }
    // Allow: 0->0, 1->0, 2->0, 3->0, etc. (clearing all is fine)
    // Allow: any->any (adding/removing items is fine)
    // Auto-backup before saving
    if (Array.isArray(currentItems) && currentItems.length > 0) {
      const backupKey = figmaUserId ? `saved_items:${String(figmaUserId)}` : 'saved_items';
      await db.createBackup(backupKey, currentItems, 'save', null);
      await db.cleanupOldBackups(backupKey, 50);
    }
    if (figmaUserId) {
      console.log(`💾 Backend POST /api/saved-items: Saving ${newItems.length} items for user ${figmaUserId}`);
      console.log(`💾 Items to save:`, JSON.stringify(newItems).substring(0, 500));
      
      try {
        await db.saveUserSavedItems(String(figmaUserId), newItems);
        
        // Wait a tiny bit to ensure transaction is committed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Immediately verify after save
        const verifyItems = await db.getUserSavedItems(String(figmaUserId));
        console.log(`✓ Backend POST: Verified ${verifyItems.length} items after save for user ${figmaUserId}`);
        console.log(`✓ Backend POST: Verified items:`, JSON.stringify(verifyItems).substring(0, 500));
        
        if (verifyItems.length !== newItems.length) {
          console.error(`⚠️ Backend MISMATCH: Saved ${newItems.length} but database has ${verifyItems.length}`);
          // Try reading again after a longer delay
          await new Promise(resolve => setTimeout(resolve, 500));
          const verifyItems2 = await db.getUserSavedItems(String(figmaUserId));
          console.log(`✓ Backend POST: Second read after 500ms: ${verifyItems2.length} items`);
        }
      } catch (saveError) {
        console.error(`✗ Backend POST: Error saving items:`, saveError);
        throw saveError;
      }
    } else {
      await db.saveSavedItems(newItems);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving items:', error);
    res.status(500).json({ error: 'Failed to save items' });
  }
});

// ---------- Figma Links ----------
app.get('/api/figma-links', async (req, res) => {
  try {
    const links = await db.getFigmaLinks();
    res.json(links);
  } catch (error) {
    console.error('Error fetching figma links:', error);
    res.status(500).json({ error: 'Failed to fetch figma links' });
  }
});

app.post('/api/figma-links', async (req, res) => {
  try {
    const newLinks = req.body.links || [];
    if (!Array.isArray(newLinks)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Figma links must be an array' });
    }
    const currentLinks = await db.getFigmaLinks();
    const currentCount = Array.isArray(currentLinks) ? currentLinks.length : 0;
    const newCount = newLinks.length;
    const block = validateArrayBulkDelete(currentCount, newCount, 'figma links');
    if (block) {
      console.error('🛑 BLOCKED: figma-links', block);
      return res.status(block.status).json(block);
    }
    if (currentLinks && currentLinks.length > 0) {
      await db.createBackup('figma_links', currentLinks, 'save', null);
      await db.cleanupOldBackups('figma_links', 50);
    }
    await db.saveFigmaLinks(req.body.links);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving figma links:', error);
    res.status(500).json({ error: 'Failed to save figma links' });
  }
});

// ---------- Cloud Figma Links ----------
app.get('/api/cloud-figma-links', async (req, res) => {
  try {
    const links = await db.getCloudFigmaLinks();
    res.json(links);
  } catch (error) {
    console.error('Error fetching cloud figma links:', error);
    res.status(500).json({ error: 'Failed to fetch cloud figma links' });
  }
});

app.post('/api/cloud-figma-links', async (req, res) => {
  try {
    const newLinks = req.body.links || {};
    if (typeof newLinks !== 'object' || newLinks === null || Array.isArray(newLinks)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Cloud figma links must be an object' });
    }
    const currentLinks = await db.getCloudFigmaLinks();
    const currentCount = currentLinks && typeof currentLinks === 'object' ? Object.keys(currentLinks).length : 0;
    const newCount = Object.keys(newLinks).length;
    const block = validateObjectBulkDelete(currentCount, newCount, 'cloud figma links');
    if (block) {
      console.error('🛑 BLOCKED: cloud-figma-links', block);
      return res.status(block.status).json(block);
    }
    if (currentLinks && Object.keys(currentLinks).length > 0) {
      await db.createBackup('cloud_figma_links', currentLinks, 'save', null);
      await db.cleanupOldBackups('cloud_figma_links', 50);
    }
    await db.saveCloudFigmaLinks(req.body.links);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving cloud figma links:', error);
    res.status(500).json({ error: 'Failed to save cloud figma links' });
  }
});

// ---------- Custom Clouds ----------
app.get('/api/custom-clouds', async (req, res) => {
  try {
    const clouds = await db.getCustomClouds();
    res.json(clouds);
  } catch (error) {
    console.error('Error fetching custom clouds:', error);
    res.status(500).json({ error: 'Failed to fetch custom clouds' });
  }
});

app.post('/api/custom-clouds', async (req, res) => {
  try {
    const newClouds = req.body.clouds || [];
    if (!Array.isArray(newClouds)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Custom clouds must be an array' });
    }
    const validClouds = newClouds.filter(c => c && typeof c === 'object' && c.id && c.name);
    if (validClouds.length !== newClouds.length) {
      return res.status(400).json({ error: 'Invalid data', message: 'All custom clouds must have id and name' });
    }
    const currentClouds = await db.getCustomClouds();
    const currentCount = currentClouds.length;
    const newCount = newClouds.length;
    const block = validateArrayBulkDelete(currentCount, newCount, 'custom clouds');
    if (block) {
      console.error('🛑 BLOCKED: custom-clouds', block);
      return res.status(block.status).json(block);
    }
    if (currentClouds.length > 0) {
      await db.createBackup('custom_clouds', currentClouds, 'save', null);
      await db.cleanupOldBackups('custom_clouds', 50);
    }
    await db.saveCustomClouds(newClouds);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving custom clouds:', error);
    res.status(500).json({ error: 'Failed to save custom clouds' });
  }
});

// ---------- Editable Clouds ----------
app.get('/api/editable-clouds', async (req, res) => {
  try {
    const clouds = await db.getEditableClouds();
    res.json(clouds);
  } catch (error) {
    console.error('Error fetching editable clouds:', error);
    res.status(500).json({ error: 'Failed to fetch editable clouds' });
  }
});

app.post('/api/editable-clouds', async (req, res) => {
  try {
    const newClouds = req.body.clouds;
    // Accept null, array, or object (array is the primary format used by frontend)
    if (newClouds !== null && (typeof newClouds !== 'object')) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Editable clouds must be null, an array, or an object' });
    }
    const currentClouds = await db.getEditableClouds();
    // Handle both array and object formats for counting
    const currentCount = currentClouds 
      ? (Array.isArray(currentClouds) ? currentClouds.length : (typeof currentClouds === 'object' ? Object.keys(currentClouds).length : 0))
      : 0;
    const newCount = newClouds 
      ? (Array.isArray(newClouds) ? newClouds.length : (typeof newClouds === 'object' ? Object.keys(newClouds).length : 0))
      : 0;
    const block = validateObjectBulkDelete(currentCount, newCount, 'editable clouds');
    if (block) {
      console.error('🛑 BLOCKED: editable-clouds', block);
      return res.status(block.status).json(block);
    }
    if (currentClouds) {
      await db.createBackup('editable_clouds', currentClouds, 'save', null);
      await db.cleanupOldBackups('editable_clouds', 50);
    }
    await db.saveEditableClouds(req.body.clouds);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving editable clouds:', error);
    res.status(500).json({ error: 'Failed to save editable clouds' });
  }
});

// ---------- Cloud Categories ----------
app.get('/api/cloud-categories', async (req, res) => {
  try {
    const categories = await db.getCloudCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching cloud categories:', error);
    res.status(500).json({ error: 'Failed to fetch cloud categories' });
  }
});

app.post('/api/cloud-categories', async (req, res) => {
  try {
    const newCategories = req.body.categories || {};
    if (typeof newCategories !== 'object' || newCategories === null || Array.isArray(newCategories)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Cloud categories must be an object' });
    }
    const currentCategories = await db.getCloudCategories();
    const currentCount = currentCategories && typeof currentCategories === 'object' ? Object.keys(currentCategories).length : 0;
    const newCount = Object.keys(newCategories).length;
    const block = validateObjectBulkDelete(currentCount, newCount, 'cloud categories');
    if (block) {
      console.error('🛑 BLOCKED: cloud-categories', block);
      return res.status(block.status).json(block);
    }
    if (currentCategories && Object.keys(currentCategories).length > 0) {
      await db.createBackup('cloud_categories', currentCategories, 'save', null);
      await db.cleanupOldBackups('cloud_categories', 50);
    }
    await db.saveCloudCategories(req.body.categories);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving cloud categories:', error);
    res.status(500).json({ error: 'Failed to save cloud categories' });
  }
});

// ---------- Status Symbols ----------
app.get('/api/status-symbols', async (req, res) => {
  try {
    const symbols = await db.getStatusSymbols();
    res.json(symbols);
  } catch (error) {
    console.error('Error fetching status symbols:', error);
    res.status(500).json({ error: 'Failed to fetch status symbols' });
  }
});

app.post('/api/status-symbols', async (req, res) => {
  try {
    const newSymbols = req.body.symbols || [];
    if (!Array.isArray(newSymbols)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Status symbols must be an array' });
    }
    const currentSymbols = await db.getStatusSymbols();
    const currentCount = currentSymbols.length;
    const newCount = newSymbols.length;
    const block = validateArrayBulkDelete(currentCount, newCount, 'status symbols');
    if (block) {
      console.error('🛑 BLOCKED: status-symbols', block);
      return res.status(block.status).json(block);
    }
    if (currentSymbols.length > 0) {
      await db.createBackup('status_symbols', currentSymbols, 'save', null);
      await db.cleanupOldBackups('status_symbols', 50);
    }
    await db.saveStatusSymbols(req.body.symbols);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving status symbols:', error);
    res.status(500).json({ error: 'Failed to save status symbols' });
  }
});

// ---------- Cloud POCs ----------
app.get('/api/cloud-pocs', async (req, res) => {
  try {
    const pocs = await db.getCloudPocs();
    res.json(pocs);
  } catch (error) {
    console.error('Error fetching cloud pocs:', error);
    res.status(500).json({ error: 'Failed to fetch cloud pocs' });
  }
});

app.post('/api/cloud-pocs', async (req, res) => {
  try {
    const newPocs = req.body.pocs || {};
    if (typeof newPocs !== 'object' || newPocs === null || Array.isArray(newPocs)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Cloud POCs must be an object' });
    }
    const currentPocs = await db.getCloudPocs();
    const currentCount = currentPocs && typeof currentPocs === 'object' ? Object.keys(currentPocs).length : 0;
    const newCount = Object.keys(newPocs).length;
    const block = validateObjectBulkDelete(currentCount, newCount, 'cloud POCs');
    if (block) {
      console.error('🛑 BLOCKED: cloud-pocs', block);
      return res.status(block.status).json(block);
    }
    if (currentPocs && Object.keys(currentPocs).length > 0) {
      await db.createBackup('cloud_pocs', currentPocs, 'save', null);
      await db.cleanupOldBackups('cloud_pocs', 50);
    }
    await db.saveCloudPocs(req.body.pocs);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving cloud pocs:', error);
    res.status(500).json({ error: 'Failed to save cloud pocs' });
  }
});

// ---------- Housekeeping Rules ----------
app.get('/api/housekeeping-rules', async (req, res) => {
  try {
    const rules = await db.getSharedData('housekeeping-rules') || [];
    res.json(rules);
  } catch (error) {
    console.error('Error fetching housekeeping rules:', error);
    res.status(500).json({ error: 'Failed to fetch housekeeping rules' });
  }
});

app.post('/api/housekeeping-rules', async (req, res) => {
  try {
    const newRules = req.body.rules || [];
    if (!Array.isArray(newRules)) {
      return res.status(400).json({ error: 'Invalid data format', message: 'Housekeeping rules must be an array' });
    }
    const currentRules = await db.getSharedData('housekeeping-rules') || [];
    const currentCount = Array.isArray(currentRules) ? currentRules.length : 0;
    const newCount = newRules.length;
    const block = validateArrayBulkDelete(currentCount, newCount, 'housekeeping rules');
    if (block) {
      console.error('🛑 BLOCKED: housekeeping-rules', block);
      return res.status(block.status).json(block);
    }
    if (Array.isArray(currentRules) && currentRules.length > 0) {
      await db.createBackup('housekeeping_rules', currentRules, 'save', null);
      await db.cleanupOldBackups('housekeeping_rules', 50);
    }
    await db.saveSharedData('housekeeping-rules', req.body.rules);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving housekeeping rules:', error);
    res.status(500).json({ error: 'Failed to save housekeeping rules' });
  }
});

// ============================================================================
// USER-SPECIFIC DATA ENDPOINTS (Per Figma User)
// ============================================================================

// ---------- User Preferences (default cloud, onboarding, hidden clouds) ----------
app.get('/api/user/:figmaUserId/preferences', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    const prefs = await db.getUserPreferences(figmaUserId);
    res.json(prefs);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

app.post('/api/user/:figmaUserId/preferences', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    await db.saveUserPreferences(figmaUserId, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving user preferences:', error);
    res.status(500).json({ error: 'Failed to save user preferences' });
  }
});

// ---------- Default Cloud ----------
app.get('/api/user/:figmaUserId/default-cloud', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    const prefs = await db.getUserPreferences(figmaUserId);
    res.json({ cloudId: prefs.default_cloud || null });
  } catch (error) {
    console.error('Error fetching default cloud:', error);
    res.status(500).json({ error: 'Failed to fetch default cloud' });
  }
});

app.post('/api/user/:figmaUserId/default-cloud', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    await db.updateUserPreference(figmaUserId, 'default_cloud', req.body.cloudId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving default cloud:', error);
    res.status(500).json({ error: 'Failed to save default cloud' });
  }
});

// ---------- Onboarding State ----------
app.get('/api/user/:figmaUserId/onboarding', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    const prefs = await db.getUserPreferences(figmaUserId);
    res.json({
      hasCompleted: prefs.onboarding_completed || false,
      skipSplash: prefs.skip_splash || false
    });
  } catch (error) {
    console.error('Error fetching onboarding state:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding state' });
  }
});

app.post('/api/user/:figmaUserId/onboarding', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    const { hasCompleted, skipSplash } = req.body;
    
    if (typeof hasCompleted !== 'undefined') {
      await db.updateUserPreference(figmaUserId, 'onboarding_completed', hasCompleted);
    }
    if (typeof skipSplash !== 'undefined') {
      await db.updateUserPreference(figmaUserId, 'skip_splash', skipSplash);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    res.status(500).json({ error: 'Failed to save onboarding state' });
  }
});

// ---------- Hidden Clouds ----------
app.get('/api/user/:figmaUserId/hidden-clouds', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    const prefs = await db.getUserPreferences(figmaUserId);
    res.json({ hiddenClouds: prefs.hidden_clouds || [] });
  } catch (error) {
    console.error('Error fetching hidden clouds:', error);
    res.status(500).json({ error: 'Failed to fetch hidden clouds' });
  }
});

app.post('/api/user/:figmaUserId/hidden-clouds', async (req, res) => {
  try {
    const { figmaUserId } = req.params;
    await db.updateUserPreference(figmaUserId, 'hidden_clouds', req.body.hiddenClouds);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving hidden clouds:', error);
    res.status(500).json({ error: 'Failed to save hidden clouds' });
  }
});

// ============================================================================
// BACKUP & RESTORE ENDPOINTS
// ============================================================================

// Get all backup categories (data types that have backups)
app.get('/api/backups', async (req, res) => {
  try {
    const keys = await db.getBackupKeys();
    const raw = req.headers['x-figma-user-id'] || null;
    const headerUserId = Array.isArray(raw) ? raw[0] : raw;
    const filtered = (Array.isArray(keys) ? keys : []).filter((k) => {
      const key = k?.data_key;
      if (typeof key !== 'string') return false;
      const userIdInKey = getUserIdFromSavedItemsKey(key);
      // Only return per-user keys to the matching user.
      if (userIdInKey) return headerUserId && String(headerUserId) === String(userIdInKey);
      return true;
    });
    res.json({ backupTypes: filtered });
  } catch (error) {
    console.error('Error fetching backup keys:', error);
    res.status(500).json({ error: 'Failed to fetch backup keys' });
  }
});

// Get backups for a specific data type
app.get('/api/backups/:dataKey', async (req, res) => {
  try {
    const { dataKey } = req.params;
    if (!isAllowedBackupKey(dataKey)) {
      return res.status(400).json({ error: 'Invalid dataKey', message: `dataKey must be one of: ${ALLOWED_BACKUP_KEYS.join(', ')}` });
    }
    if (!requireMatchingUserForUserKey(req, res, dataKey)) return;
    const limit = parseInt(req.query.limit) || 20;
    const backups = await db.getBackups(dataKey, limit);
    res.json({ 
      dataKey, 
      backups: backups.map(b => ({
        id: b.id,
        itemCount: b.item_count,
        action: b.trigger_action,
        createdBy: b.created_by,
        createdAt: b.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

// Get a specific backup's data (for preview before restore)
app.get('/api/backups/:dataKey/:backupId', async (req, res) => {
  try {
    const { dataKey, backupId } = req.params;
    if (!isAllowedBackupKey(dataKey)) {
      return res.status(400).json({ error: 'Invalid dataKey', message: `dataKey must be one of: ${ALLOWED_BACKUP_KEYS.join(', ')}` });
    }
    if (!requireMatchingUserForUserKey(req, res, dataKey)) return;
    const backup = await db.getBackupById(parseInt(backupId));
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    res.json({
      id: backup.id,
      dataKey: backup.data_key,
      itemCount: backup.item_count,
      action: backup.trigger_action,
      createdAt: backup.created_at,
      data: backup.data // Include actual data for preview
    });
  } catch (error) {
    console.error('Error fetching backup:', error);
    res.status(500).json({ error: 'Failed to fetch backup' });
  }
});

// Restore from a specific backup
app.post('/api/backups/:dataKey/:backupId/restore', async (req, res) => {
  try {
    const { dataKey, backupId } = req.params;
    if (!isAllowedBackupKey(dataKey)) {
      return res.status(400).json({ error: 'Invalid dataKey', message: `dataKey must be one of: ${ALLOWED_BACKUP_KEYS.join(', ')}` });
    }
    if (!requireMatchingUserForUserKey(req, res, dataKey)) return;
    const merge = req.query.merge === 'true' || req.body?.merge === true;
    const backup = await db.restoreFromBackup(parseInt(backupId), merge);
    res.json({ 
      success: true, 
      message: `Restored ${backup.data_key} from backup #${backupId}`,
      itemCount: backup.item_count,
      restoredFrom: backup.created_at
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup', details: error.message });
  }
});

// Create a manual backup (user-initiated)
app.post('/api/backups/:dataKey/create', async (req, res) => {
  try {
    const { dataKey } = req.params;
    if (!isAllowedBackupKey(dataKey)) {
      return res.status(400).json({ error: 'Invalid dataKey', message: `dataKey must be one of: ${ALLOWED_BACKUP_KEYS.join(', ')}` });
    }
    if (!requireMatchingUserForUserKey(req, res, dataKey)) return;
    const userId = req.body.userId || null;
    
    // Get current data for this key
    let currentData;
    const userIdFromKey = getUserIdFromSavedItemsKey(dataKey);
    if (userIdFromKey) {
      currentData = await db.getUserSavedItems(String(userIdFromKey));
    } else switch (dataKey) {
      case 'templates':
        currentData = await db.getTemplates();
        break;
      case 'saved_items':
        currentData = await db.getSavedItems();
        break;
      case 'custom_clouds':
        currentData = await db.getCustomClouds();
        break;
      case 'editable_clouds':
        currentData = await db.getEditableClouds();
        break;
      case 'cloud_categories':
        currentData = await db.getCloudCategories();
        break;
      case 'cloud_pocs':
        currentData = await db.getCloudPocs();
        break;
      case 'status_symbols':
        currentData = await db.getStatusSymbols();
        break;
      case 'figma_links':
        currentData = await db.getFigmaLinks();
        break;
      case 'cloud_figma_links':
        currentData = await db.getCloudFigmaLinks();
        break;
      case 'housekeeping_rules':
        currentData = await db.getSharedData('housekeeping-rules') || [];
        break;
      default:
        currentData = await db.getSharedData(dataKey);
    }
    
    const isEmpty = !currentData ||
      (Array.isArray(currentData) && currentData.length === 0) ||
      (typeof currentData === 'object' && !Array.isArray(currentData) && Object.keys(currentData).length === 0);
    if (isEmpty) {
      return res.status(400).json({ error: 'No data to backup' });
    }
    
    await db.createBackup(dataKey, currentData, 'manual', userId);
    const itemCount = Array.isArray(currentData) ? currentData.length : Object.keys(currentData).length;
    
    res.json({ 
      success: true, 
      message: `Manual backup created for ${dataKey}`,
      itemCount
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// ============================================================================
// ACTIVITY LOG ENDPOINTS
// ============================================================================

// Log activity from frontend (page structure, sections, POCs)
app.post('/api/activity-log', async (req, res) => {
  try {
    const { action, assetId, assetName, cloudId, cloudName, userName, assetData } = req.body;
    if (!action || !assetId || !assetName) {
      return res.status(400).json({ error: 'action, assetId, and assetName are required' });
    }
    await db.logActivityFromClient({ action, assetId, assetName, cloudId, cloudName, userName, assetData });
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Get activity stats (celebration metrics)
app.get('/api/activity-log/stats', async (req, res) => {
  try {
    const cloudId = req.query.cloudId || null;
    const stats = await db.getActivityStats(cloudId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
});

// Get template add metadata (who added, when - for main library display)
app.get('/api/activity-log/template-metadata', async (req, res) => {
  try {
    const cloudId = req.query.cloudId || null;
    const metadata = await db.getTemplateAddMetadata(cloudId);
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching template metadata:', error);
    res.status(500).json({ error: 'Failed to fetch template metadata' });
  }
});

// Get activity log
app.get('/api/activity-log', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const cloudId = req.query.cloudId || null;
    const activities = await db.getActivityLog(limit, cloudId);
    res.json({
      activities: activities.map(a => ({
        id: a.id,
        action: a.action,
        assetId: a.asset_id,
        assetName: a.asset_name,
        assetData: a.asset_data,
        cloudId: a.cloud_id,
        cloudName: a.cloud_name,
        category: a.category,
        userName: a.user_name,
        isRestored: a.is_restored,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// Restore selected items from activity log
app.post('/api/activity-log/restore', async (req, res) => {
  try {
    const { activityIds, userName } = req.body;
    
    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({ error: 'No activities selected for restore' });
    }
    
    // Get current templates
    const currentTemplates = await db.getTemplates();
    
    // Get the activities to restore
    const activitiesToRestore = [];
    for (const activityId of activityIds) {
      const activities = await db.getActivityLog(1000);
      const activity = activities.find(a => a.id === activityId);
      if (activity && (activity.action === 'delete' || activity.action === 'delete_forever') && !activity.is_restored) {
        activitiesToRestore.push(activity);
      }
    }
    
    if (activitiesToRestore.length === 0) {
      return res.status(400).json({ error: 'No restorable activities found' });
    }
    
    // Restore the items - add them back to templates
    let restoredCount = 0;
    const restoredItems = [];
    
    for (const activity of activitiesToRestore) {
      const assetData = activity.asset_data;
      if (!assetData || !assetData.id) continue;
      
      // Check if item already exists
      const exists = currentTemplates.find(t => t.id === assetData.id);
      if (!exists) {
        // Re-add the item (mark as not deleted)
        const restoredItem = { ...assetData, deleted: false, deletedAt: undefined };
        currentTemplates.push(restoredItem);
        restoredItems.push(restoredItem);
        restoredCount++;
        
        // Log the restore action
        await db.logActivity('restore', { ...assetData, cloudName: activity.cloud_name }, userName);
      } else if (exists.deleted) {
        // Item exists but is soft-deleted, un-delete it
        exists.deleted = false;
        exists.deletedAt = undefined;
        restoredCount++;
        
        await db.logActivity('restore', { ...exists, cloudName: activity.cloud_name }, userName);
      }
    }
    
    // Save updated templates
    if (restoredCount > 0) {
      await db.saveTemplates(currentTemplates);
      // Mark activities as restored
      await db.markActivitiesRestored(activityIds);
    }
    
    res.json({
      success: true,
      restoredCount,
      message: `Restored ${restoredCount} item${restoredCount !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error('Error restoring from activity log:', error);
    res.status(500).json({ error: 'Failed to restore items', details: error.message });
  }
});

// ============================================================================
// Initialize database and start server
// ============================================================================

db.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Starter Kit Backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
