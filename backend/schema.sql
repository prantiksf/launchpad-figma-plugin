-- Starter Kit Backend Database Schema
-- Run this manually if auto-initialization fails

-- Shared data table (stores JSON blobs for each data type)
CREATE TABLE IF NOT EXISTS shared_data (
  key VARCHAR(100) PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User preferences table (per Figma user)
CREATE TABLE IF NOT EXISTS user_preferences (
  figma_user_id VARCHAR(100) PRIMARY KEY,
  default_cloud VARCHAR(100),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  skip_splash BOOLEAN DEFAULT FALSE,
  hidden_clouds JSONB DEFAULT '[]',
  saved_items JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_data_key ON shared_data(key);

-- Sample data types stored in shared_data:
-- key: 'templates'           -> array of template objects
-- key: 'saved_items'         -> array of saved item objects
-- key: 'figma_links'         -> array of figma link objects
-- key: 'cloud_figma_links'   -> object { cloudId: [links] }
-- key: 'custom_clouds'       -> array of custom cloud objects
-- key: 'editable_clouds'     -> clouds configuration object
-- key: 'cloud_categories'    -> object { cloudId: category }
-- key: 'status_symbols'      -> array of status symbol objects
-- key: 'cloud_pocs'          -> object { cloudId: poc info }
