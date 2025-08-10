-- AI Caption Studio D1 Database Schema
-- Converted from PostgreSQL to SQLite for Cloudflare D1

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Query logs for analytics and debugging
CREATE TABLE IF NOT EXISTS query_logs (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT NOT NULL,
    image_size INTEGER,
    image_type TEXT,
    thumbnail_path TEXT,
    preview_path TEXT,
    exif_data TEXT, -- JSON stored as TEXT in SQLite
    camera_make TEXT,
    camera_model TEXT,
    gps_latitude REAL,
    gps_longitude REAL,
    location_name TEXT,
    prompt_length INTEGER,
    response_length INTEGER,
    processing_time_ms INTEGER,
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd REAL,
    include_weather BOOLEAN DEFAULT FALSE,
    weather_data TEXT
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    tier_id INTEGER DEFAULT 1 REFERENCES user_tiers(id)
);

-- Login tokens for magic link authentication
CREATE TABLE IF NOT EXISTS login_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    ip_address TEXT,
    user_agent TEXT
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Invite tokens
CREATE TABLE IF NOT EXISTS invite_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    invited_by_user_id INTEGER NOT NULL,
    tier_id INTEGER,
    personal_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    used_by_user_id INTEGER,
    FOREIGN KEY (invited_by_user_id) REFERENCES users (id),
    FOREIGN KEY (used_by_user_id) REFERENCES users (id)
);

-- User settings for integrations
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    integration_type TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, integration_type, setting_key),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- User tiers for usage limits
CREATE TABLE IF NOT EXISTS user_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    daily_limit INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Insert default tiers
INSERT OR IGNORE INTO user_tiers (id, name, daily_limit, description) VALUES 
(1, 'Free', 10, 'Free tier with 10 captions per day'),
(2, 'Pro', 100, 'Pro tier with 100 captions per day'),
(3, 'Unlimited', -1, 'Unlimited captions per day');

-- Custom prompts for user-defined caption styles
CREATE TABLE IF NOT EXISTS user_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    prompt_text TEXT NOT NULL,
    icon TEXT DEFAULT '✨',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Caption history for image library
CREATE TABLE IF NOT EXISTS caption_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_id TEXT NOT NULL,
    filename TEXT,
    caption TEXT NOT NULL,
    hashtags TEXT,
    alt_text TEXT,
    style TEXT NOT NULL,
    context_data TEXT, -- JSON stored as TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Uploaded images storage
CREATE TABLE IF NOT EXISTS uploaded_images (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    source TEXT NOT NULL, -- 'web', 'lightroom', etc.
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Scheduled posts for social media automation
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_id TEXT,
    caption_id INTEGER,
    caption TEXT NOT NULL,
    hashtags TEXT,
    platforms TEXT NOT NULL, -- Comma-separated platform names
    scheduled_time DATETIME NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    posted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (caption_id) REFERENCES caption_history (id) ON DELETE SET NULL
);

-- Update user_settings structure for the new format
UPDATE user_settings SET 
    setting_category = CASE 
        WHEN integration_type = 'mastodon' OR integration_type = 'pixelfed' OR integration_type = 'instagram' OR integration_type = 'linkedin' THEN 'social'
        ELSE integration_type 
    END,
    setting_name = CASE 
        WHEN integration_type = 'mastodon' THEN integration_type || '_' || setting_key
        WHEN integration_type = 'pixelfed' THEN integration_type || '_' || setting_key
        WHEN integration_type = 'instagram' THEN integration_type || '_' || setting_key
        WHEN integration_type = 'linkedin' THEN integration_type || '_' || setting_key
        ELSE setting_key
    END,
    is_encrypted = encrypted
WHERE setting_category IS NULL;

-- Add new columns if they don't exist
ALTER TABLE user_settings ADD COLUMN setting_category TEXT;
ALTER TABLE user_settings ADD COLUMN setting_name TEXT;
ALTER TABLE user_settings ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;

-- Create API keys table for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_type TEXT NOT NULL, -- 'lightroom', 'general', etc.
    api_key TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- For secure storage
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Set schema version to 10 for comprehensive scheduled posts system
INSERT OR IGNORE INTO schema_version (version) VALUES (10);