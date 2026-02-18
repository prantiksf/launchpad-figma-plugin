/**
 * Database connection and queries for Starter Kit Backend
 */

const { Pool } = require('pg');

// Create connection pool
// Heroku Postgres uses valid certs; rejectUnauthorized: true for production security.
// If connection fails, set PGSSLREJECTUNAUTHORIZED=0 as fallback (not recommended).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: process.env.PGSSLREJECTUNAUTHORIZED !== '0' } : false
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

    // Per-user saved assets (bookmark list)
    // Safe to run on every startup; no-op if column already exists.
    await client.query(`
      ALTER TABLE user_preferences
      ADD COLUMN IF NOT EXISTS saved_items JSONB DEFAULT '[]'
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
    
    // Activity log table - tracks individual actions for granular recovery
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        action VARCHAR(20) NOT NULL,
        asset_id VARCHAR(100) NOT NULL,
        asset_name VARCHAR(255),
        asset_data JSONB,
        cloud_id VARCHAR(100),
        cloud_name VARCHAR(100),
        category VARCHAR(100),
        user_name VARCHAR(255),
        is_restored BOOLEAN DEFAULT FALSE,
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
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action, is_restored)
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
  
  const allowedFields = ['default_cloud', 'onboarding_completed', 'skip_splash', 'hidden_clouds', 'saved_items'];
  if (!allowedFields.includes(field)) {
    throw new Error(`Invalid field: ${field}`);
  }
  
  // Ensure saved_items column exists (for existing databases)
  if (field === 'saved_items') {
    try {
      // First check if column exists
      const colCheck = await pool.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = 'saved_items'
      `);
      
      if (colCheck.rows.length === 0) {
        // Column doesn't exist - add it
        console.log(`⚠️ Column saved_items does NOT exist - adding it now`);
        await pool.query(`
          ALTER TABLE user_preferences
          ADD COLUMN saved_items JSONB DEFAULT '[]'::jsonb
        `);
        console.log(`✓ Column saved_items added successfully`);
      } else {
        console.log(`✓ Column saved_items exists as ${colCheck.rows[0].data_type} with default ${colCheck.rows[0].column_default}`);
      }
    } catch (err) {
      console.error(`✗ Column check/creation error for saved_items:`, err.message, err.stack);
      // Don't throw - continue with UPDATE attempt
    }
  }
  
  // For JSONB fields, ensure we're passing the correct type
  // For saved_items, it MUST be an array
  let paramValue;
  if (field === 'saved_items') {
    // Ensure it's an array
    if (!Array.isArray(value)) {
      console.error(`✗ ERROR: saved_items must be an array, got ${typeof value}`);
      throw new Error(`saved_items must be an array, got ${typeof value}`);
    }
    // CRITICAL: Convert to JSON string first, then PostgreSQL will parse it as JSONB array
    // This ensures it's stored as an array, not an object
    paramValue = JSON.stringify(value);
    console.log(`🔄 Converting array to JSON string for saved_items: ${paramValue.substring(0, 200)}`);
  } else if (field === 'hidden_clouds') {
    // hidden_clouds should also be an array
    paramValue = Array.isArray(value) ? JSON.stringify(value) : '[]';
  } else {
    paramValue = value;
  }
  
  console.log(`🔄 updateUserPreference: Updating ${field} for user ${figmaUserId}`);
  console.log(`🔄 Value type: ${typeof paramValue}, Is string: ${typeof paramValue === 'string'}, Length: ${typeof paramValue === 'string' ? paramValue.length : 'N/A'}`);
  console.log(`🔄 Value preview:`, paramValue.toString().substring(0, 500));
  
  // Use parameterized query with explicit column name mapping to avoid SQL injection
  const columnMap = {
    'default_cloud': 'default_cloud',
    'onboarding_completed': 'onboarding_completed',
    'skip_splash': 'skip_splash',
    'hidden_clouds': 'hidden_clouds',
    'saved_items': 'saved_items'
  };
  
  const columnName = columnMap[field];
  if (!columnName) {
    throw new Error(`Invalid field: ${field}`);
  }
  
  // For JSONB fields, pass as JSON string and cast to jsonb
  // This ensures PostgreSQL stores it correctly as JSONB array
  let updateQuery;
  let queryParams;
  
  if (field === 'saved_items' || field === 'hidden_clouds') {
    // Pass JSON string and cast to jsonb - PostgreSQL will parse it correctly
    updateQuery = `UPDATE user_preferences SET ${columnName} = $1::jsonb, updated_at = NOW() WHERE figma_user_id = $2 RETURNING ${columnName}, figma_user_id`;
    queryParams = [paramValue, figmaUserId];
  } else {
    updateQuery = `UPDATE user_preferences SET ${columnName} = $1, updated_at = NOW() WHERE figma_user_id = $2 RETURNING ${columnName}, figma_user_id`;
    queryParams = [paramValue, figmaUserId];
  }
  
  console.log(`🔄 Executing UPDATE query for ${field}`);
  console.log(`🔄 Query: UPDATE user_preferences SET ${columnName} = $1::jsonb WHERE figma_user_id = $2`);
  console.log(`🔄 Param 1 (value): ${typeof queryParams[0] === 'string' ? queryParams[0].substring(0, 200) : queryParams[0]}`);
  console.log(`🔄 Param 2 (user_id): ${queryParams[1]}`);
  
  const result = await pool.query(updateQuery, queryParams);
  
  // Verify what was actually written
  if (result.rows.length > 0) {
    const row = result.rows[0];
    const writtenValue = row[columnName];
    console.log(`✓ UPDATE affected ${result.rowCount} row(s) for user ${row.figma_user_id || figmaUserId}`);
    if (writtenValue !== undefined && writtenValue !== null) {
      console.log(`✓ UPDATE wrote value: type=${typeof writtenValue}, isArray=${Array.isArray(writtenValue)}, length=${Array.isArray(writtenValue) ? writtenValue.length : 'N/A'}`);
      console.log(`✓ UPDATE wrote value preview:`, JSON.stringify(writtenValue).substring(0, 300));
    } else {
      console.error(`✗ UPDATE wrote NULL/undefined value!`);
    }
  } else {
    console.error(`⚠️ UPDATE returned NO ROWS - user might not exist or query failed`);
  }
  
  console.log(`✓ updateUserPreference: Updated ${result.rowCount} row(s) for user ${figmaUserId}, field ${field}`);
  
  if (result.rowCount === 0) {
    console.error(`⚠️ WARNING: UPDATE affected 0 rows for user ${figmaUserId}, field ${field}`);
    // Try to check if user exists
    const checkResult = await pool.query(
      'SELECT figma_user_id, saved_items FROM user_preferences WHERE figma_user_id = $1',
      [figmaUserId]
    );
    if (checkResult.rows.length > 0) {
      console.log(`✓ User exists, current saved_items:`, checkResult.rows[0].saved_items);
    } else {
      console.error(`✗ User NOT FOUND: ${figmaUserId}`);
    }
  }
}

// ============================================================================
// PER-USER SAVED ITEMS (bookmarks)
// ============================================================================

async function getUserSavedItems(figmaUserId) {
  if (!figmaUserId) return [];
  
  // Ensure user exists
  await getUserPreferences(figmaUserId);
  
  // SIMPLE DIRECT SELECT
  const result = await pool.query(
    'SELECT saved_items FROM user_preferences WHERE figma_user_id = $1',
    [figmaUserId]
  );
  
  if (result.rows.length === 0) {
    return [];
  }
  
  const savedItems = result.rows[0].saved_items;
  
  // Handle null/undefined
  if (savedItems === null || savedItems === undefined) {
    return [];
  }
  
  // Ensure it's an array
  if (!Array.isArray(savedItems)) {
    console.error(`⚠️ saved_items is not an array, got: ${typeof savedItems}`);
    return [];
  }
  
  console.log(`📖 getUserSavedItems: Found ${savedItems.length} items for user ${figmaUserId}`);
  return savedItems;
}

async function saveUserSavedItems(figmaUserId, items) {
  if (!figmaUserId) throw new Error('Missing figmaUserId');
  const itemsToSave = Array.isArray(items) ? items : [];
  
  console.log(`💾 saveUserSavedItems: Saving ${itemsToSave.length} items for user ${figmaUserId}`);
  console.log(`💾 Items:`, JSON.stringify(itemsToSave));
  
  // Ensure user exists
  await getUserPreferences(figmaUserId);
  
  // Ensure column exists
  try {
    await pool.query(`
      ALTER TABLE user_preferences
      ADD COLUMN IF NOT EXISTS saved_items JSONB DEFAULT '[]'::jsonb
    `);
  } catch (err) {
    // Column might already exist, ignore
  }
  
  // CRITICAL: Use PostgreSQL's to_jsonb function to properly convert
  // This ensures the JSON is properly parsed as JSONB
  const jsonString = JSON.stringify(itemsToSave);
  
  console.log(`🔄 Updating saved_items with ${itemsToSave.length} items`);
  console.log(`🔄 JSON string:`, jsonString);
  
  // Try using to_jsonb() function instead of ::jsonb cast
  // This should properly parse the JSON string
  const result = await pool.query(
    `UPDATE user_preferences 
     SET saved_items = to_jsonb($1::text), updated_at = NOW() 
     WHERE figma_user_id = $2
     RETURNING saved_items`,
    [jsonString, figmaUserId]
  );
  
  if (result.rowCount === 0) {
    throw new Error(`Failed to update saved_items for user ${figmaUserId}`);
  }
  
  const saved = result.rows[0].saved_items;
  console.log(`✓ UPDATE returned:`, JSON.stringify(saved));
  console.log(`✓ Type:`, typeof saved, 'isArray:', Array.isArray(saved));
  
  // Ensure it's an array
  if (!Array.isArray(saved)) {
    console.error(`✗ ERROR: saved_items is not an array:`, typeof saved, saved);
    // Try reading back to see what's actually stored
    const readback = await pool.query(
      'SELECT saved_items FROM user_preferences WHERE figma_user_id = $1',
      [figmaUserId]
    );
    console.error(`✗ Readback shows:`, readback.rows[0]?.saved_items);
    throw new Error(`saved_items is not an array after update`);
  }
  
  console.log(`✓ Saved ${saved.length} items successfully`);
  console.log(`✓ Returning:`, JSON.stringify(saved));
  
  // Return what was actually saved
  return saved;
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
 * @param {boolean} merge - If true, merge backup with current data (never erase). If false, full replace.
 */
async function restoreFromBackup(backupId, merge = false) {
  const backup = await getBackupById(backupId);
  if (!backup) {
    throw new Error('Backup not found');
  }
  if (backup.data === undefined || backup.data === null) {
    throw new Error('Backup has no data');
  }

  const userSavedItemsMatch = typeof backup.data_key === 'string' ? backup.data_key.match(/^saved_items:(.+)$/) : null;
  const userIdForSavedItems = userSavedItemsMatch ? userSavedItemsMatch[1] : null;

  // Create a backup of current state before restoring (so user can undo)
  const currentData = userIdForSavedItems
    ? await getUserSavedItems(userIdForSavedItems)
    : await getSharedData(backup.data_key);
  if (currentData) {
    await createBackup(backup.data_key, currentData, 'pre-restore', null);
  }

  let dataToSave = backup.data;
  if (merge && currentData) {
    dataToSave = mergeBackupData(backup.data_key, currentData, backup.data);
  }

  // Never overwrite with empty for critical types
  const criticalKeys = ['templates', 'custom_clouds'];
  if (criticalKeys.includes(backup.data_key)) {
    const isEmpty = Array.isArray(dataToSave) ? dataToSave.length === 0 : (typeof dataToSave === 'object' && Object.keys(dataToSave || {}).length === 0);
    if (isEmpty && currentData && ((Array.isArray(currentData) && currentData.length > 0) || (typeof currentData === 'object' && Object.keys(currentData).length > 0))) {
      console.warn(`Skipping restore of ${backup.data_key}: backup would overwrite with empty`);
      return backup;
    }
  }

  if (userIdForSavedItems) {
    await saveUserSavedItems(userIdForSavedItems, Array.isArray(dataToSave) ? dataToSave : []);
  } else {
    await saveSharedData(backup.data_key, dataToSave);
  }
  console.log(`✓ Restored ${backup.data_key} from backup #${backupId} (merge: ${merge})`);
  
  return backup;
}

/**
 * Merge backup data with current data - never erase, only add from backup
 */
function mergeBackupData(dataKey, currentData, backupData) {
  if (Array.isArray(currentData) && Array.isArray(backupData)) {
    const getKey = (item) => {
      if (item.id) return `id:${item.id}`;
      if (item.templateId) return `t:${item.templateId}:${item.variantKey || ''}`;
      return null;
    };
    const currentKeys = new Set(currentData.map(getKey).filter(Boolean));
    const merged = [...currentData];
    for (const item of backupData) {
      const key = getKey(item);
      if (key && !currentKeys.has(key)) {
        merged.push(item);
        currentKeys.add(key);
      }
    }
    return merged;
  }
  // Object-valued data: editable_clouds, cloud_categories, cloud_pocs, cloud_figma_links
  if (typeof currentData === 'object' && currentData !== null && typeof backupData === 'object' && backupData !== null) {
    const objectMergeKeys = ['editable_clouds', 'cloud_categories', 'cloud_pocs', 'cloud_figma_links'];
    if (objectMergeKeys.includes(dataKey)) {
      const result = { ...currentData };
      for (const cloudId of Object.keys(backupData)) {
        const backupVal = backupData[cloudId];
        const currentVal = result[cloudId];
        if (Array.isArray(backupVal)) {
          // cloud_categories, cloud_pocs, cloud_figma_links: merge arrays by id
          const currArr = Array.isArray(currentVal) ? currentVal : [];
          const getItemKey = (item) => item.id ? `id:${item.id}` : (item.name ? `name:${item.name}` : null);
          const currKeys = new Set(currArr.map(getItemKey).filter(Boolean));
          const mergedArr = [...currArr];
          for (const item of backupVal) {
            const k = getItemKey(item);
            if (k && !currKeys.has(k)) {
              mergedArr.push(item);
              currKeys.add(k);
            }
          }
          result[cloudId] = mergedArr;
        } else if (typeof backupVal === 'object' && backupVal !== null) {
          // editable_clouds: deep merge cloud config (sections, pages)
          result[cloudId] = deepMergeObjects(currentVal || {}, backupVal);
        }
      }
      return result;
    }
    return { ...currentData, ...backupData };
  }
  return backupData;
}

function deepMergeObjects(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = result[key];
    if (Array.isArray(srcVal)) {
      result[key] = Array.isArray(tgtVal) ? [...tgtVal, ...srcVal.filter(s => !tgtVal.some(t => JSON.stringify(t) === JSON.stringify(s)))] : [...srcVal];
    } else if (typeof srcVal === 'object' && srcVal !== null && typeof tgtVal === 'object' && tgtVal !== null) {
      result[key] = deepMergeObjects(tgtVal, srcVal);
    } else {
      result[key] = srcVal;
    }
  }
  return result;
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

// ============================================================================
// ACTIVITY LOG FUNCTIONS
// ============================================================================

/**
 * Log an activity (add, update, delete, restore)
 * @param {string} action - 'add', 'update', 'delete', 'delete_forever', 'restore'
 * @param {object} asset - The asset being acted upon
 * @param {string} userName - Who performed the action
 */
async function logActivity(action, asset, userName = null) {
  try {
    await pool.query(`
      INSERT INTO activity_log (action, asset_id, asset_name, asset_data, cloud_id, cloud_name, category, user_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      action,
      asset.id,
      asset.name,
      JSON.stringify(asset),
      asset.cloudId || null,
      asset.cloudName || null,
      asset.category || null,
      userName
    ]);
    console.log(`📝 Activity logged: ${action} - ${asset.name} by ${userName || 'unknown'}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't block the main operation
  }
}

/**
 * Log activity from frontend (page structure, sections, POCs)
 * @param {object} params - { action, assetId, assetName, cloudId, cloudName, userName, assetData }
 */
async function logActivityFromClient(params) {
  try {
    const { action, assetId, assetName, cloudId, cloudName, userName, assetData } = params;
    await pool.query(`
      INSERT INTO activity_log (action, asset_id, asset_name, asset_data, cloud_id, cloud_name, category, user_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      action,
      assetId || 'unknown',
      assetName || 'Untitled',
      assetData ? JSON.stringify(assetData) : null,
      cloudId || null,
      cloudName || null,
      null,
      userName || null
    ]);
    console.log(`📝 Activity logged: ${action} - ${assetName} (cloud: ${cloudName || 'n/a'}) by ${userName || 'unknown'}`);
  } catch (error) {
    console.error('Failed to log activity from client:', error);
  }
}

/**
 * Get activity log entries
 * @param {number} limit - Maximum number of entries to return
 * @param {string} cloudId - Optional cloud ID to filter by
 */
async function getActivityLog(limit = 100, cloudId = null) {
  let query = `SELECT * FROM activity_log `;
  const params = [];
  if (cloudId) {
    params.push(cloudId);
    query += `WHERE cloud_id = $1 `;
  }
  params.push(limit);
  query += `ORDER BY created_at DESC LIMIT $${params.length}`;
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Mark activity entries as restored
 * @param {number[]} activityIds - Array of activity IDs to mark as restored
 */
async function markActivitiesRestored(activityIds) {
  if (!activityIds || activityIds.length === 0) return;
  
  const placeholders = activityIds.map((_, i) => `$${i + 1}`).join(', ');
  await pool.query(`
    UPDATE activity_log 
    SET is_restored = TRUE 
    WHERE id IN (${placeholders})
  `, activityIds);
}

/**
 * Get restorable activities (deleted items that haven't been restored)
 */
async function getRestorableActivities() {
  const result = await pool.query(`
    SELECT * FROM activity_log 
    WHERE (action = 'delete' OR action = 'delete_forever')
    AND is_restored = FALSE
    ORDER BY created_at DESC
  `);
  return result.rows;
}

/**
 * Get celebration stats: components added, reused, designers engaged
 * @param {string|null} cloudId - Optional cloud ID to filter stats
 */
async function getActivityStats(cloudId = null) {
  const addActions = ['add', 'component_insert', 'poc_add', 'section_create'];
  const placeholders = addActions.map((_, i) => `$${i + 1}`).join(', ');
  const params = [...addActions];
  const cloudFilter = cloudId ? ` AND cloud_id = $${params.length + 1}` : '';
  if (cloudId) params.push(cloudId);

  const added = await pool.query(`
    SELECT COUNT(*) as count FROM activity_log 
    WHERE action IN (${placeholders})${cloudFilter}
  `, params);

  const reused = await pool.query(`
    SELECT COUNT(*) as count FROM activity_log 
    WHERE action = 'component_insert'${cloudId ? ' AND cloud_id = $1' : ''}
  `, cloudId ? [cloudId] : []);

  const designersParams = cloudId ? [cloudId] : [];
  const designersFilter = cloudId ? ' AND cloud_id = $1' : '';
  const designers = await pool.query(`
    SELECT COUNT(DISTINCT user_name) as count FROM activity_log 
    WHERE user_name IS NOT NULL AND user_name != ''${designersFilter}
  `, designersParams);

  return {
    componentsAdded: parseInt(added.rows[0]?.count || '0', 10),
    componentsReused: parseInt(reused.rows[0]?.count || '0', 10),
    designersEngaged: parseInt(designers.rows[0]?.count || '0', 10)
  };
}

/**
 * Get "added by" metadata for templates - most recent add per asset
 * Falls back to backup history for templates without activity_log entries (previously added assets)
 * Returns { [assetId]: { userName, createdAt } }
 */
async function getTemplateAddMetadata(cloudId = null) {
  const metadata = {};

  // 1. Primary: activity_log (templates added through the plugin)
  let query = `
    SELECT DISTINCT ON (asset_id) asset_id, user_name, created_at
    FROM activity_log
    WHERE action = 'add'
  `;
  const params = [];
  if (cloudId) {
    params.push(cloudId);
    query += ` AND cloud_id = $1`;
  }
  query += ` ORDER BY asset_id, created_at DESC`;
  const result = await pool.query(query, params);
  for (const row of result.rows) {
    metadata[row.asset_id] = {
      userName: row.user_name,
      createdAt: row.created_at
    };
  }

  // 2. Fallback: backfill from data_backups for templates without metadata
  const templates = await getTemplates();
  const missingIds = templates.filter(t => t.id && !metadata[t.id]).map(t => t.id);
  if (missingIds.length > 0) {
    const backupRows = await pool.query(`
      SELECT id, data, created_by, created_at
      FROM data_backups
      WHERE data_key = 'templates'
      ORDER BY created_at ASC
      LIMIT 200
    `);
    for (const row of backupRows.rows) {
      if (missingIds.length === 0) break;
      let data;
      try {
        data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      } catch {
        continue;
      }
      const items = Array.isArray(data) ? data : [];
      for (const item of items) {
        const id = item?.id;
        if (id && missingIds.includes(id) && !metadata[id]) {
          metadata[id] = {
            userName: row.created_by || null,
            createdAt: row.created_at
          };
          missingIds.splice(missingIds.indexOf(id), 1);
        }
      }
    }
  }

  return metadata;
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
  // Saved items (per-user)
  getUserSavedItems,
  saveUserSavedItems,
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
  getBackupKeys,
  // Activity log
  logActivity,
  logActivityFromClient,
  getActivityLog,
  markActivitiesRestored,
  getRestorableActivities,
  getActivityStats,
  getTemplateAddMetadata
};
