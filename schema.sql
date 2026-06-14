PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE query_logs (
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
, user_id INTEGER, email TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    tier_id INTEGER DEFAULT 1 REFERENCES user_tiers(id)
);
CREATE TABLE login_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    ip_address TEXT,
    user_agent TEXT
);
CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    integration_type TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, category TEXT DEFAULT 'general',
    UNIQUE(user_id, integration_type, setting_key),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE TABLE user_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    daily_limit INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE daily_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE TABLE system_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    setting_key TEXT UNIQUE NOT NULL,
                    setting_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
CREATE TABLE invite_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                invited_by_user_id INTEGER,
                token TEXT UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                tier_id INTEGER,
                personal_message TEXT,
                used_at DATETIME,
                used_by_user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invited_by_user_id) REFERENCES users(id),
                FOREIGN KEY (used_by_user_id) REFERENCES users(id)
            );
CREATE TABLE user_api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    integration_type TEXT NOT NULL,
                    api_key TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_used DATETIME NULL, name TEXT,
                    UNIQUE(user_id, integration_type),
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );
CREATE TABLE uploaded_images (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    file_size INTEGER,
                    mime_type TEXT DEFAULT 'image/jpeg',
                    r2_key TEXT NOT NULL,
                    title TEXT,
                    caption TEXT,
                    keywords TEXT,
                    rating INTEGER DEFAULT 0,
                    color_label TEXT,
                    camera_model TEXT,
                    lens TEXT,
                    iso TEXT,
                    aperture TEXT,
                    shutter_speed TEXT,
                    focal_length TEXT,
                    date_time TEXT,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    generated_caption TEXT,
                    generated_hashtags TEXT,
                    generated_alt_text TEXT, file_hash TEXT, source TEXT DEFAULT 'lightroom', location TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );
CREATE TABLE user_prompts (
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
CREATE TABLE caption_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    image_id INTEGER,
                    caption TEXT NOT NULL,
                    hashtags TEXT,
                    alt_text TEXT,
                    style TEXT NOT NULL,
                    context_data TEXT,
                    weather_data TEXT,
                    used_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (image_id) REFERENCES uploaded_images(id)
                );
CREATE TABLE scheduled_posts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        image_id TEXT,
                        caption_id INTEGER,
                        caption TEXT NOT NULL,
                        hashtags TEXT,
                        platforms TEXT NOT NULL,
                        scheduled_time DATETIME NOT NULL,
                        status TEXT DEFAULT 'pending',
                        error_message TEXT,
                        attempts INTEGER DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        posted_at DATETIME, timezone TEXT,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        FOREIGN KEY (caption_id) REFERENCES caption_history (id) ON DELETE SET NULL
                    );
CREATE TABLE passkey_credentials (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    credential_id TEXT NOT NULL UNIQUE,
                    public_key TEXT NOT NULL,
                    counter INTEGER NOT NULL DEFAULT 0,
                    transports TEXT,
                    device_name TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_used_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );
CREATE TABLE recovery_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    code TEXT NOT NULL UNIQUE,
                    used_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                );
DELETE FROM sqlite_sequence;
CREATE INDEX idx_passkey_user_id ON passkey_credentials(user_id)
            ;
CREATE INDEX idx_recovery_user_id ON recovery_codes(user_id)
            ;

-- Seed schema version so in-app migrations (v9..v15) are skipped on a
-- fresh install: this schema is exported from the live v15 database.
INSERT INTO schema_version (version) VALUES (15);
