/**
 * Database connection and queries for Starter Kit Backend
 */

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Initialize database tables
 */
async function initialize() {
  const client = await pool.connect();
  
  try {
    // Shared data table (stores JSON blobs for each data type)
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_data (
        key VARCHAR(100) PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // User preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        figma_user_id VARCHAR(100) PRIMARY KEY,
        default_cloud VARCHAR(100),
        onboarding_completed BOOLEAN DEFAULT FALSE,
        skip_splash BOOLEAN DEFAULT FALSE,
        hidden_clouds JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_data_key ON shared_data(key)
    `);
    
    console.log('✓ Database tables initialized');
  } finally {
    client.release();
  }
}

// ============================================================================
// SHARED DATA FUNCTIONS
// ============================================================================

async function getSharedData(key) {
  const result = await pool.query(
    'SELECT data FROM shared_data WHERE key = $1',
    [key]
  );
  return result.rows[0]?.data || null;
}

async function saveSharedData(key, data) {
  await pool.query(`
    INSERT INTO shared_data (key, data, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key)
    DO UPDATE SET data = $2, updated_at = NOW()
  `, [key, JSON.stringify(data)]);
}

// Templates
async function getTemplates() {
  return await getSharedData('templates') || [];
}

async function saveTemplates(templates) {
  await saveSharedData('templates', templates);
}

// Saved Items
async function getSavedItems() {
  return await getSharedData('saved_items') || [];
}

async function saveSavedItems(items) {
  await saveSharedData('saved_items', items);
}

// Figma Links
async function getFigmaLinks() {
  return await getSharedData('figma_links') || [];
}

async function saveFigmaLinks(links) {
  await saveSharedData('figma_links', links);
}

// Cloud Figma Links
async function getCloudFigmaLinks() {
  return await getSharedData('cloud_figma_links') || {};
}

async function saveCloudFigmaLinks(links) {
  await saveSharedData('cloud_figma_links', links);
}

// Custom Clouds
async function getCustomClouds() {
  return await getSharedData('custom_clouds') || [];
}

async function saveCustomClouds(clouds) {
  await saveSharedData('custom_clouds', clouds);
}

// Editable Clouds
async function getEditableClouds() {
  return await getSharedData('editable_clouds') || null;
}

async function saveEditableClouds(clouds) {
  await saveSharedData('editable_clouds', clouds);
}

// Cloud Categories
async function getCloudCategories() {
  return await getSharedData('cloud_categories') || {};
}

async function saveCloudCategories(categories) {
  await saveSharedData('cloud_categories', categories);
}

// Status Symbols
async function getStatusSymbols() {
  return await getSharedData('status_symbols') || [];
}

async function saveStatusSymbols(symbols) {
  await saveSharedData('status_symbols', symbols);
}

// Cloud POCs
async function getCloudPocs() {
  return await getSharedData('cloud_pocs') || {};
}

async function saveCloudPocs(pocs) {
  await saveSharedData('cloud_pocs', pocs);
}

// ============================================================================
// USER PREFERENCES FUNCTIONS
// ============================================================================

async function getUserPreferences(figmaUserId) {
  const result = await pool.query(
    'SELECT * FROM user_preferences WHERE figma_user_id = $1',
    [figmaUserId]
  );
  
  if (result.rows[0]) {
    return result.rows[0];
  }
  
  // Create default preferences for new user
  await pool.query(`
    INSERT INTO user_preferences (figma_user_id)
    VALUES ($1)
    ON CONFLICT (figma_user_id) DO NOTHING
  `, [figmaUserId]);
  
  return {
    figma_user_id: figmaUserId,
    default_cloud: null,
    onboarding_completed: false,
    skip_splash: false,
    hidden_clouds: []
  };
}

async function saveUserPreferences(figmaUserId, prefs) {
  await pool.query(`
    INSERT INTO user_preferences (
      figma_user_id, 
      default_cloud, 
      onboarding_completed, 
      skip_splash, 
      hidden_clouds,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (figma_user_id)
    DO UPDATE SET 
      default_cloud = COALESCE($2, user_preferences.default_cloud),
      onboarding_completed = COALESCE($3, user_preferences.onboarding_completed),
      skip_splash = COALESCE($4, user_preferences.skip_splash),
      hidden_clouds = COALESCE($5, user_preferences.hidden_clouds),
      updated_at = NOW()
  `, [
    figmaUserId,
    prefs.default_cloud,
    prefs.onboarding_completed,
    prefs.skip_splash,
    JSON.stringify(prefs.hidden_clouds || [])
  ]);
}

async function updateUserPreference(figmaUserId, field, value) {
  // Ensure user exists first
  await getUserPreferences(figmaUserId);
  
  const allowedFields = ['default_cloud', 'onboarding_completed', 'skip_splash', 'hidden_clouds'];
  if (!allowedFields.includes(field)) {
    throw new Error(`Invalid field: ${field}`);
  }
  
  const jsonValue = field === 'hidden_clouds' ? JSON.stringify(value) : value;
  
  await pool.query(`
    UPDATE user_preferences 
    SET ${field} = $1, updated_at = NOW()
    WHERE figma_user_id = $2
  `, [jsonValue, figmaUserId]);
}

module.exports = {
  initialize,
  pool,
  // Shared data
  getTemplates,
  saveTemplates,
  getSavedItems,
  saveSavedItems,
  getFigmaLinks,
  saveFigmaLinks,
  getCloudFigmaLinks,
  saveCloudFigmaLinks,
  getCustomClouds,
  saveCustomClouds,
  getEditableClouds,
  saveEditableClouds,
  getCloudCategories,
  saveCloudCategories,
  getStatusSymbols,
  saveStatusSymbols,
  getCloudPocs,
  saveCloudPocs,
  // User preferences
  getUserPreferences,
  saveUserPreferences,
  updateUserPreference
};
