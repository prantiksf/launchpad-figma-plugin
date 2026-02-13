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
    
    // Data backups table - stores automatic backups on every change
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_backups (
        id SERIAL PRIMARY KEY,
        data_key VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        item_count INTEGER DEFAULT 0,
        trigger_action VARCHAR(100),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_data_key ON shared_data(key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backups_key_created ON data_backups(data_key, created_at DESC)
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

// ============================================================================
// BACKUP FUNCTIONS
// ============================================================================

/**
 * Create a backup of data before any write operation
 * @param {string} dataKey - The key of the data being backed up (e.g., 'templates')
 * @param {any} data - The data to backup
 * @param {string} triggerAction - What action triggered this backup (e.g., 'save', 'delete')
 * @param {string} createdBy - Optional identifier of who triggered the backup
 */
async function createBackup(dataKey, data, triggerAction = 'save', createdBy = null) {
  try {
    const itemCount = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1);
    await pool.query(`
      INSERT INTO data_backups (data_key, data, item_count, trigger_action, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [dataKey, JSON.stringify(data), itemCount, triggerAction, createdBy]);
    console.log(`📦 Backup created: ${dataKey} (${itemCount} items) - ${triggerAction}`);
  } catch (error) {
    console.error('Failed to create backup:', error);
    // Don't throw - backup failure shouldn't block the main operation
  }
}

/**
 * Get list of backups for a data key
 * @param {string} dataKey - The key to get backups for
 * @param {number} limit - Maximum number of backups to return
 */
async function getBackups(dataKey, limit = 20) {
  const result = await pool.query(`
    SELECT id, data_key, item_count, trigger_action, created_by, created_at
    FROM data_backups 
    WHERE data_key = $1 
    ORDER BY created_at DESC 
    LIMIT $2
  `, [dataKey, limit]);
  return result.rows;
}

/**
 * Get a specific backup by ID
 * @param {number} backupId - The backup ID
 */
async function getBackupById(backupId) {
  const result = await pool.query(
    'SELECT * FROM data_backups WHERE id = $1',
    [backupId]
  );
  return result.rows[0] || null;
}

/**
 * Restore data from a backup
 * @param {number} backupId - The backup ID to restore from
 */
async function restoreFromBackup(backupId) {
  const backup = await getBackupById(backupId);
  if (!backup) {
    throw new Error('Backup not found');
  }
  
  // Create a backup of current state before restoring (so user can undo)
  const currentData = await getSharedData(backup.data_key);
  if (currentData) {
    await createBackup(backup.data_key, currentData, 'pre-restore', null);
  }
  
  // Restore the data
  await saveSharedData(backup.data_key, backup.data);
  console.log(`✓ Restored ${backup.data_key} from backup #${backupId}`);
  
  return backup;
}

/**
 * Clean up old backups (keep only recent ones)
 * @param {string} dataKey - The key to clean up
 * @param {number} keepCount - Number of backups to keep
 */
async function cleanupOldBackups(dataKey, keepCount = 50) {
  try {
    await pool.query(`
      DELETE FROM data_backups 
      WHERE data_key = $1 
      AND id NOT IN (
        SELECT id FROM data_backups 
        WHERE data_key = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      )
    `, [dataKey, keepCount]);
  } catch (error) {
    console.error('Failed to cleanup backups:', error);
  }
}

/**
 * Get all backup keys (data types that have backups)
 */
async function getBackupKeys() {
  const result = await pool.query(`
    SELECT DISTINCT data_key, 
           COUNT(*) as backup_count,
           MAX(created_at) as latest_backup
    FROM data_backups 
    GROUP BY data_key 
    ORDER BY latest_backup DESC
  `);
  return result.rows;
}

module.exports = {
  initialize,
  pool,
  // Shared data
  getSharedData,
  saveSharedData,
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
  updateUserPreference,
  // Backups
  createBackup,
  getBackups,
  getBackupById,
  restoreFromBackup,
  cleanupOldBackups,
  getBackupKeys
};
