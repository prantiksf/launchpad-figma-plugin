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
    console.log(`💾 Saving ${templates.length} templates to database...`);
    await db.saveTemplates(templates);
    console.log(`✓ Successfully saved ${templates.length} templates`);
    res.json({ success: true, count: templates.length });
  } catch (error) {
    console.error('✗ Error saving templates:', error);
    res.status(500).json({ error: 'Failed to save templates', details: error.message });
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
    await db.saveSavedItems(req.body.savedItems);
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
    await db.saveCustomClouds(req.body.clouds);
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
