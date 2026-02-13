/**
 * Starter Kit Backend API
 * Provides centralized storage for the Figma plugin
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 previews

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
    const templates = req.body.templates || [];
    const userName = req.body.userName || req.headers['x-figma-user-name'] || null;
    
    // SERVER-SIDE PROTECTION: Prevent accidental data wipe
    const currentTemplates = await db.getTemplates();
    const currentCount = currentTemplates.length;
    const newCount = templates.length;
    
    // Block if trying to save significantly fewer templates (potential data wipe)
    // Allow: adding new (newCount > currentCount), small deletions (up to 50% reduction), or empty DB
    if (currentCount > 5 && newCount < currentCount * 0.5) {
      console.error(`🛑 BLOCKED: Attempted to save ${newCount} templates when ${currentCount} exist (>50% reduction)`);
      return res.status(400).json({ 
        error: 'Data protection triggered', 
        message: `Cannot reduce templates from ${currentCount} to ${newCount}. This looks like accidental data loss.`,
        currentCount,
        attemptedCount: newCount
      });
    }
    
    // AUTO-BACKUP: Always backup current state before saving
    if (currentCount > 0) {
      const action = newCount > currentCount ? 'add' : (newCount < currentCount ? 'delete' : 'update');
      await db.createBackup('templates', currentTemplates, action, userName);
      // Cleanup old backups (keep last 50)
      await db.cleanupOldBackups('templates', 50);
    }
    
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
    const items = await db.getSavedItems();
    res.json(items);
  } catch (error) {
    console.error('Error fetching saved items:', error);
    res.status(500).json({ error: 'Failed to fetch saved items' });
  }
});

app.post('/api/saved-items', async (req, res) => {
  try {
    const newItems = req.body.savedItems || [];
    const currentItems = await db.getSavedItems();
    
    // Auto-backup before saving
    if (currentItems.length > 0) {
      await db.createBackup('saved_items', currentItems, 'save', null);
      await db.cleanupOldBackups('saved_items', 30);
    }
    
    await db.saveSavedItems(newItems);
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
    const currentClouds = await db.getCustomClouds();
    
    // Auto-backup before saving
    if (currentClouds.length > 0) {
      await db.createBackup('custom_clouds', currentClouds, 'save', null);
      await db.cleanupOldBackups('custom_clouds', 30);
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
    res.json({ backupTypes: keys });
  } catch (error) {
    console.error('Error fetching backup keys:', error);
    res.status(500).json({ error: 'Failed to fetch backup keys' });
  }
});

// Get backups for a specific data type
app.get('/api/backups/:dataKey', async (req, res) => {
  try {
    const { dataKey } = req.params;
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
    const { backupId } = req.params;
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
    const { backupId } = req.params;
    const backup = await db.restoreFromBackup(parseInt(backupId));
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
    const userId = req.body.userId || null;
    
    // Get current data for this key
    let currentData;
    switch (dataKey) {
      case 'templates':
        currentData = await db.getTemplates();
        break;
      case 'saved_items':
        currentData = await db.getSavedItems();
        break;
      case 'custom_clouds':
        currentData = await db.getCustomClouds();
        break;
      case 'cloud_categories':
        currentData = await db.getCloudCategories();
        break;
      case 'cloud_figma_links':
        currentData = await db.getCloudFigmaLinks();
        break;
      default:
        currentData = await db.getSharedData(dataKey);
    }
    
    if (!currentData || (Array.isArray(currentData) && currentData.length === 0)) {
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
