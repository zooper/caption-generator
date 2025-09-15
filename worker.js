// Cloudflare Worker for AI Caption Studio using Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import exifr from 'exifr';

// Template rendering utility
async function renderTemplate(templateName, data = {}) {
    try {
        const response = await fetch(`/templates/${templateName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${templateName}`);
        }
        let template = await response.text();
        
        // Replace all template variables
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            template = template.replaceAll(placeholder, value || '');
        }
        
        return template;
    } catch (error) {
        console.error(`Error rendering template ${templateName}:`, error);
        // Fallback to inline templates if external templates fail
        return getFallbackTemplate(templateName, data);
    }
}

// Fallback templates for when external templates are unavailable
function getFallbackTemplate(templateName, data) {
    const templates = {
        'login-email': `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>🔐 Login to AI Caption Studio</h2>
                <p>Click the link below to securely login to your account:</p>
                <div style="margin: 30px 0;">
                    <a href="${data.LOGIN_URL}" style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                        🚀 Login to AI Caption Studio
                    </a>
                </div>
                <p><strong>This link expires in 15 minutes</strong> for security.</p>
                <p>If you didn't request this login, you can safely ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    Time: ${data.TIMESTAMP}
                </p>
            </div>
        `,
        'login-error': `<h1>❌ ${data.ERROR_TITLE}</h1><p>${data.ERROR_MESSAGE}</p><a href="/">← Back</a>`,
        'login-success': `
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>✅ Login Successful!</h2>
                <p>Welcome, ${data.USER_EMAIL}!</p>
                <p>Redirecting to Caption Generator...</p>
                <script>
                    localStorage.setItem('auth_token', '${data.JWT_TOKEN}');
                    localStorage.setItem('user_email', '${data.USER_EMAIL}');
                    setTimeout(() => window.location.href = '/', 2000);
                </script>
            </div>
        `,
        'invitation-error': `
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>❌ ${data.ERROR_TITLE}</h2>
                <p>${data.ERROR_MESSAGE}</p>
                <a href="/" style="color: #405de6;">← Back to Caption Studio</a>
            </div>
        `
    };
    
    return templates[templateName] || `<p>Template ${templateName} not found</p>`;
}

// Import D1 Database class
class D1Database {
    constructor(db) {
        this.db = db;
        this.CURRENT_SCHEMA_VERSION = 14;
        this._initialized = false;
        // Don't run async operations in constructor
    }

    async ensureInitialized() {
        if (!this._initialized) {
            try {
                await this.ensureSchemaVersion();
                this._initialized = true;
            } catch (error) {
                console.error('Database initialization failed:', error);
            }
        }
    }

    async ensureSchemaVersion() {
        try {
            // Create schema_version table if it doesn't exist
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // Get current schema version
            const versionResult = await this.db.prepare(`
                SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
            `).first();
            
            const currentVersion = versionResult ? versionResult.version : 0;

            // Run migrations if needed
            if (currentVersion < this.CURRENT_SCHEMA_VERSION) {
                await this.runMigrations(currentVersion);
            }
        } catch (error) {
            console.error('Schema version check failed:', error);
        }
    }

    async runMigrations(fromVersion) {
        try {
            // Migration to version 9: Add API keys
            if (fromVersion < 9) {
                console.log('Running migration: Add API keys table (v9)');
                await this.migration_v9();
                await this.setSchemaVersion(9);
            }
            
            // Migration to version 10: Add uploaded images table
            if (fromVersion < 10) {
                console.log('Running migration: Add uploaded images table (v10)');
                await this.migration_v10();
                await this.setSchemaVersion(10);
            }
            
            // Migration to version 11: Update uploaded images table for R2 storage
            if (fromVersion < 11) {
                console.log('Running migration: Update uploaded images table for R2 (v11)');
                await this.migration_v11();
                await this.setSchemaVersion(11);
            }
            
            // Migration to version 12: Add custom prompts table
            if (fromVersion < 12) {
                console.log('Running migration: Add custom prompts table (v12)');
                await this.migration_v12();
                await this.setSchemaVersion(12);
            }
            
            // Migration to version 13: Add file_hash and source columns to uploaded_images
            if (fromVersion < 13) {
                console.log('Running migration: Add file_hash and source columns (v13)');
                await this.migration_v13();
                await this.setSchemaVersion(13);
            }
            
            // Migration to version 14: Add name field to API keys and update existing keys
            if (fromVersion < 14) {
                console.log('Running migration: Add name field to API keys (v14)');
                try {
                    await this.migration_v14();
                    await this.setSchemaVersion(14);
                    console.log('Migration v14 completed successfully');
                } catch (migrationError) {
                    console.error('Migration v14 failed:', migrationError);
                }
            }
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    async setSchemaVersion(version) {
        try {
            await this.db.prepare(`
                INSERT INTO schema_version (version) VALUES (?)
            `).bind(version).run();
            console.log(`Schema updated to version ${version}`);
        } catch (error) {
            console.error('Failed to set schema version:', error);
        }
    }

    async createUser(email, env = null) {
        try {
            await this.ensureInitialized();
            // Check if this email should be admin based on ADMIN_EMAIL env var
            const isAdmin = env && env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() ? 1 : 0;
            
            const stmt = this.db.prepare(`
                INSERT INTO users (email, is_active, is_admin) VALUES (?, 1, ?)
                RETURNING id, email, is_admin
            `);
            const result = await stmt.bind(email, isAdmin).first();
            
            if (isAdmin) {
                // Admin user created
            }
            
            return result;
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('USER_EXISTS');
            }
            throw error;
        }
    }

    async getUserByEmail(email) {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE email = ? AND is_active = 1
        `);
        return await stmt.bind(email).first();
    }

    async getUserById(userId) {
        const stmt = this.db.prepare(`
            SELECT * FROM users 
            WHERE id = ? AND is_active = 1
        `);
        return await stmt.bind(userId).first();
    }

    async createLoginToken(email, token, expiresAt, ipAddress, userAgent) {
        const stmt = this.db.prepare(`
            INSERT INTO login_tokens (email, token, expires_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `);
        await stmt.bind(email, token, expiresAt, ipAddress, userAgent).run();
    }

    async getLoginToken(token) {
        const stmt = this.db.prepare(`
            SELECT * FROM login_tokens 
            WHERE token = ? AND expires_at > datetime('now') AND used_at IS NULL
        `);
        return await stmt.bind(token).first();
    }

    async useLoginToken(token) {
        const stmt = this.db.prepare(`
            UPDATE login_tokens 
            SET used_at = datetime('now') 
            WHERE token = ?
        `);
        await stmt.bind(token).run();
    }

    async createSession(sessionId, userId, expiresAt, ipAddress, userAgent) {
        const stmt = this.db.prepare(`
            INSERT INTO user_sessions (session_id, user_id, expires_at, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `);
        await stmt.bind(sessionId, userId, expiresAt, ipAddress, userAgent).run();
    }

    async getSession(sessionId) {
        const stmt = this.db.prepare(`
            SELECT s.*, u.email, u.is_admin 
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_id = ? AND s.expires_at > datetime('now')
        `);
        return await stmt.bind(sessionId).first();
    }

    async logQuery(logData) {
        try {
            
            // Create the query_logs table if it doesn't exist
            await this.ensureQueryLogsTable();
            
            const {
                id, source, userId, email, processingTimeMs, responseLength
            } = logData;

            // Check what columns exist in the table to build the correct INSERT
            const tableInfo = await this.db.prepare(`PRAGMA table_info(query_logs)`).all();
            const columns = (tableInfo.results || []).map(col => col.name);
            
            // Build INSERT statement based on available columns
            let insertColumns = ['id'];
            let insertValues = [id];
            let placeholders = ['?'];
            
            if (columns.includes('source')) {
                insertColumns.push('source');
                insertValues.push(source || 'web');
                placeholders.push('?');
            }
            
            if (columns.includes('user_id')) {
                insertColumns.push('user_id');
                insertValues.push(userId);
                placeholders.push('?');
            }
            
            if (columns.includes('email')) {
                insertColumns.push('email');
                insertValues.push(email);
                placeholders.push('?');
            }
            
            if (columns.includes('processing_time_ms')) {
                insertColumns.push('processing_time_ms');
                insertValues.push(processingTimeMs || 0);
                placeholders.push('?');
            }
            
            if (columns.includes('response_length')) {
                insertColumns.push('response_length');
                insertValues.push(responseLength || 0);
                placeholders.push('?');
            }
            
            if (columns.includes('timestamp')) {
                insertColumns.push('timestamp');
                placeholders.push("datetime('now')");
            }
            
            if (columns.includes('created_at')) {
                insertColumns.push('created_at');
                placeholders.push("datetime('now')");
            }
            
            const insertSQL = `
                INSERT INTO query_logs (${insertColumns.join(', ')}) 
                VALUES (${placeholders.join(', ')})
            `;
            
            
            const stmt = this.db.prepare(insertSQL);
            const result = await stmt.bind(...insertValues).run();

            
            // Verify the query was actually inserted
            const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM query_logs');
            const countResult = await countStmt.first();
            
            return id;
        } catch (error) {
            // Don't throw error to avoid breaking the main flow
        }
    }

    async ensureQueryLogsTable() {
        try {
            
            // First check if the table exists and what columns it has
            const tableInfo = await this.db.prepare(`
                PRAGMA table_info(query_logs)
            `).all();
            
            
            if (!tableInfo.results || tableInfo.results.length === 0) {
                // Table doesn't exist, create it with our schema
                const stmt = this.db.prepare(`
                    CREATE TABLE query_logs (
                        id TEXT PRIMARY KEY,
                        source TEXT DEFAULT 'web',
                        user_id INTEGER,
                        email TEXT,
                        processing_time_ms INTEGER DEFAULT 0,
                        response_length INTEGER DEFAULT 0,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                await stmt.run();
            } else {
                // Table exists, check what columns we need to add
                const columns = tableInfo.results.map(col => col.name);
                
                // Add missing columns one by one
                const requiredColumns = [
                    { name: 'user_id', definition: 'INTEGER' },
                    { name: 'email', definition: 'TEXT' },
                    { name: 'processing_time_ms', definition: 'INTEGER DEFAULT 0' },
                    { name: 'response_length', definition: 'INTEGER DEFAULT 0' },
                    { name: 'timestamp', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
                    { name: 'created_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
                ];
                
                for (const col of requiredColumns) {
                    if (!columns.includes(col.name)) {
                        try {
                            await this.db.prepare(`ALTER TABLE query_logs ADD COLUMN ${col.name} ${col.definition}`).run();
                        } catch (alterError) {
                        }
                    }
                }
            }
            
            // Verify final table structure
            const finalTableInfo = await this.db.prepare(`PRAGMA table_info(query_logs)`).all();
            
        } catch (error) {
        }
    }

    async checkUsageLimit(userId) {
        // Simplified usage check - return unlimited for now
        return { allowed: true, used: 0, limit: -1, remaining: -1 };
    }

    async incrementDailyUsage(userId) {
        try {
            // Create daily_usage table if it doesn't exist
            await this.ensureDailyUsageTable();
            
            const stmt = this.db.prepare(`
                INSERT INTO daily_usage (user_id, date, usage_count) 
                VALUES (?, date('now'), 1)
                ON CONFLICT(user_id, date) 
                DO UPDATE SET usage_count = usage_count + 1
            `);
            
            const result = await stmt.bind(userId).run();
            return true;
        } catch (error) {
            return false;
        }
    }

    async ensureDailyUsageTable() {
        try {
            const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS daily_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    usage_count INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);
            await stmt.run();
        } catch (error) {
        }
    }

    // System settings methods
    async getSystemSetting(key, defaultValue = null) {
        try {
            const stmt = this.db.prepare(`
                SELECT setting_value FROM system_settings WHERE setting_key = ?
            `);
            const result = await stmt.bind(key).first();
            return result ? result.setting_value : defaultValue;
        } catch (error) {
            // If table doesn't exist yet, return default
            return defaultValue;
        }
    }

    async setSystemSetting(key, value) {
        try {
            // Try to create the table first if it doesn't exist
            await this.ensureSystemSettingsTable();
            
            const stmt = this.db.prepare(`
                INSERT INTO system_settings (setting_key, setting_value, updated_at) 
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(setting_key) 
                DO UPDATE SET 
                    setting_value = excluded.setting_value,
                    updated_at = datetime('now')
            `);
            const result = await stmt.bind(key, value).run();
            return true;
        } catch (error) {
            return false;
        }
    }

    async ensureSystemSettingsTable() {
        try {
            const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    setting_key TEXT UNIQUE NOT NULL,
                    setting_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await stmt.run();
        } catch (error) {
        }
    }

    // Caption history table
    async ensureCaptionHistoryTable() {
        try {
            const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS caption_history (
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
                )
            `);
            await stmt.run();
        } catch (error) {
            console.error('Error creating caption_history table:', error);
        }
    }

    // Scheduled posts table
    async ensureScheduledPostsTable() {
        try {
            // Check if table exists and has correct schema
            const tableExists = await this.db.prepare(`
                SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_posts'
            `).first();
            
            if (tableExists) {
                // Check if table has the correct column structure
                const columns = await this.db.prepare(`
                    PRAGMA table_info(scheduled_posts)
                `).all();
                
                const hasCorrectSchema = columns.results?.some(col => col.name === 'caption');
                
                if (!hasCorrectSchema) {
                    // Drop and recreate with correct schema for development
                    console.log('Updating scheduled_posts table schema...');
                    await this.db.prepare('DROP TABLE IF EXISTS scheduled_posts').run();
                }
            }
            
            // Create table if it doesn't exist or was just dropped
            const tableExistsNow = await this.db.prepare(`
                SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_posts'
            `).first();
            
            if (!tableExistsNow) {
                // Create table matching schema.sql
                const stmt = this.db.prepare(`
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
                        posted_at DATETIME,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        FOREIGN KEY (caption_id) REFERENCES caption_history (id) ON DELETE SET NULL
                    )
                `);
                await stmt.run();
                console.log('Created scheduled_posts table with correct schema');
            }
        } catch (error) {
            console.error('Error ensuring scheduled_posts table:', error);
        }
    }

    async getAllSystemSettings() {
        try {
            // Ensure table exists first
            await this.ensureSystemSettingsTable();
            
            const stmt = this.db.prepare(`
                SELECT * FROM system_settings ORDER BY setting_key
            `);
            const result = await stmt.all();
            return result.results || [];
        } catch (error) {
            return [];
        }
    }

    // Caption history methods
    async saveCaptionHistory(userId, imageId, caption, hashtags, altText, style, contextData = null, weatherData = null) {
        try {
            await this.ensureCaptionHistoryTable();
            
            const stmt = this.db.prepare(`
                INSERT INTO caption_history (
                    user_id, image_id, caption, hashtags, alt_text, style, 
                    context_data, weather_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = await stmt.bind(
                userId, imageId, caption, hashtags, altText, style,
                contextData ? JSON.stringify(contextData) : null,
                weatherData ? JSON.stringify(weatherData) : null
            ).run();
            
            return result.meta.last_row_id;
        } catch (error) {
            console.error('Error saving caption history:', error);
            return null;
        }
    }

    async getCaptionHistoryForImage(userId, imageId) {
        try {
            await this.ensureCaptionHistoryTable();
            
            const stmt = this.db.prepare(`
                SELECT * FROM caption_history 
                WHERE user_id = ? AND image_id = ?
                ORDER BY created_at DESC
            `);
            
            const result = await stmt.bind(userId, imageId).all();
            return result.results || [];
        } catch (error) {
            console.error('Error getting caption history:', error);
            return [];
        }
    }

    async incrementCaptionUsage(captionId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE caption_history 
                SET used_count = used_count + 1 
                WHERE id = ?
            `);
            
            await stmt.bind(captionId).run();
            return true;
        } catch (error) {
            console.error('Error incrementing caption usage:', error);
            return false;
        }
    }

    // Scheduled posts methods
    async createScheduledPost(userId, imageId, captionId, customCaption, customHashtags, platforms, scheduledTime, timezone = null) {
        try {
            await this.ensureScheduledPostsTable();
            
            // Ensure we have a caption - use custom caption, or get from caption history, or provide default
            let finalCaption = customCaption;
            let finalHashtags = customHashtags;
            
            if (!finalCaption && captionId) {
                // Get caption from caption history
                const captionHistory = await this.db.prepare(`
                    SELECT caption, hashtags FROM caption_history WHERE id = ?
                `).bind(captionId).first();
                
                if (captionHistory) {
                    finalCaption = captionHistory.caption;
                    if (!finalHashtags) {
                        finalHashtags = captionHistory.hashtags;
                    }
                }
            }
            
            // If still no caption, provide a default
            if (!finalCaption) {
                finalCaption = 'Scheduled post';
            }
            
            const stmt = this.db.prepare(`
                INSERT INTO scheduled_posts (
                    user_id, image_id, caption_id, caption, hashtags, platforms, scheduled_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = await stmt.bind(
                userId, imageId, captionId, finalCaption, finalHashtags,
                JSON.stringify(platforms), scheduledTime
            ).run();
            
            return result.meta.last_row_id;
        } catch (error) {
            console.error('Error creating scheduled post:', error);
            return null;
        }
    }

    async getScheduledPosts(userId, status = null) {
        try {
            await this.ensureScheduledPostsTable();
            
            let query = `
                SELECT 
                    sp.id, sp.user_id, sp.image_id, sp.caption_id, 
                    sp.caption, sp.hashtags, sp.platforms, sp.scheduled_time, 
                    sp.status, sp.error_message, sp.attempts, sp.created_at, sp.updated_at, sp.posted_at,
                    ui.filename, ui.mime_type, ui.r2_key,
                    ch.caption as original_caption, ch.hashtags as original_hashtags, ch.style
                FROM scheduled_posts sp
                LEFT JOIN uploaded_images ui ON sp.image_id = ui.id
                LEFT JOIN caption_history ch ON sp.caption_id = ch.id
                WHERE sp.user_id = ?
            `;
            
            const params = [userId];
            
            if (status) {
                query += ` AND sp.status = ?`;
                params.push(status);
            }
            
            query += ` ORDER BY sp.scheduled_time ASC`;
            
            const stmt = this.db.prepare(query);
            const result = await stmt.bind(...params).all();
            return result.results || [];
        } catch (error) {
            console.error('Error getting scheduled posts:', error);
            return [];
        }
    }

    async getPendingScheduledPosts() {
        try {
            await this.ensureScheduledPostsTable();
            
            const stmt = this.db.prepare(`
                SELECT sp.*, ui.filename, ui.mime_type, ui.r2_key, ch.caption, ch.hashtags
                FROM scheduled_posts sp
                LEFT JOIN uploaded_images ui ON sp.image_id = ui.id
                LEFT JOIN caption_history ch ON sp.caption_id = ch.id
                WHERE sp.status = 'pending' 
                AND datetime(sp.scheduled_time) <= datetime('now')
                ORDER BY sp.scheduled_time ASC
            `);
            
            const result = await stmt.all();
            return result.results || [];
        } catch (error) {
            console.error('Error getting pending scheduled posts:', error);
            return [];
        }
    }

    async updateScheduledPostStatus(postId, status, errorMessage = null) {
        try {
            let stmt;
            if (status === 'completed') {
                stmt = this.db.prepare(`
                    UPDATE scheduled_posts 
                    SET status = ?, posted_at = datetime('now'), updated_at = datetime('now')
                    WHERE id = ?
                `);
                await stmt.bind(status, postId).run();
            } else {
                stmt = this.db.prepare(`
                    UPDATE scheduled_posts 
                    SET status = ?, error_message = ?, attempts = attempts + 1, updated_at = datetime('now')
                    WHERE id = ?
                `);
                await stmt.bind(status, errorMessage, postId).run();
            }
            
            return true;
        } catch (error) {
            console.error('Error updating scheduled post status:', error);
            return false;
        }
    }

    async deleteScheduledPost(userId, postId) {
        try {
            const stmt = this.db.prepare(`
                DELETE FROM scheduled_posts 
                WHERE id = ? AND user_id = ?
            `);
            
            await stmt.bind(postId, userId).run();
            return true;
        } catch (error) {
            console.error('Error deleting scheduled post:', error);
            return false;
        }
    }

    async getUserSocialSettings(userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT setting_key, setting_value, encrypted 
                FROM user_settings 
                WHERE user_id = ? AND integration_type = 'social'
            `);
            const results = await stmt.bind(userId).all();
            const settings = {};
            
            if (results.results) {
                for (const row of results.results) {
                    const value = row.encrypted ? this.decryptValue(row.setting_value) : row.setting_value;
                    
                    // Group settings by platform
                    if (row.setting_key.startsWith('mastodon_')) {
                        if (!settings.mastodon) settings.mastodon = {};
                        const key = row.setting_key.replace('mastodon_', '');
                        settings.mastodon[key] = value;
                    } else if (row.setting_key.startsWith('pixelfed_')) {
                        if (!settings.pixelfed) settings.pixelfed = {};
                        const key = row.setting_key.replace('pixelfed_', '');
                        settings.pixelfed[key] = value;
                    } else if (row.setting_key.startsWith('instagram_')) {
                        if (!settings.instagram) settings.instagram = {};
                        const key = row.setting_key.replace('instagram_', '');
                        settings.instagram[key] = value;
                    } else if (row.setting_key.startsWith('linkedin_')) {
                        if (!settings.linkedin) settings.linkedin = {};
                        const key = row.setting_key.replace('linkedin_', '');
                        settings.linkedin[key] = value;
                    }
                }
            }
            
            return settings;
        } catch (error) {
            console.error('Error getting user social settings:', error);
            return {};
        }
    }

    async getScheduledPostById(userId, postId) {
        try {
            await this.ensureScheduledPostsTable();
            
            const stmt = this.db.prepare(`
                SELECT sp.*, ui.filename, ui.mime_type, ui.r2_key, ch.caption as original_caption, ch.hashtags as original_hashtags, ch.style
                FROM scheduled_posts sp
                LEFT JOIN uploaded_images ui ON sp.image_id = ui.id
                LEFT JOIN caption_history ch ON sp.caption_id = ch.id
                WHERE sp.id = ? AND sp.user_id = ?
            `);
            
            const result = await stmt.bind(postId, userId).first();
            return result || null;
        } catch (error) {
            console.error('Error getting scheduled post by ID:', error);
            return null;
        }
    }

    async updateScheduledPost(userId, postId, scheduledTime, caption, hashtags) {
        try {
            await this.ensureScheduledPostsTable();
            
            const stmt = this.db.prepare(`
                UPDATE scheduled_posts 
                SET scheduled_time = ?, caption = ?, hashtags = ?, status = 'pending', updated_at = datetime('now')
                WHERE id = ? AND user_id = ? AND status IN ('pending', 'failed')
            `);
            
            const result = await stmt.bind(scheduledTime, caption, hashtags, parseInt(postId), userId).run();
            
            // In D1, changes count is in result.meta.changes
            return result.meta?.changes > 0 || false;
        } catch (error) {
            console.error('Error updating scheduled post:', error);
            return false;
        }
    }

    // User settings methods
    async ensureUserSettingsTable() {
        try {
            
            // First check if the table exists and what columns it has
            const tableInfo = await this.db.prepare(`
                PRAGMA table_info(user_settings)
            `).all();
            
            
            if (!tableInfo.results || tableInfo.results.length === 0) {
                // Table doesn't exist, create it with our schema
                const stmt = this.db.prepare(`
                    CREATE TABLE user_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        integration_type TEXT NOT NULL,
                        setting_key TEXT NOT NULL,
                        setting_value TEXT NOT NULL,
                        encrypted BOOLEAN DEFAULT 0,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, integration_type, setting_key),
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                `);
                const createResult = await stmt.run();
            } else {
                // Table exists, check what columns we need to add
                const columns = tableInfo.results.map(col => col.name);
                
                // Add missing columns one by one
                const requiredColumns = [
                    { name: 'category', definition: 'TEXT DEFAULT \'general\'' },
                    { name: 'encrypted', definition: 'BOOLEAN DEFAULT 0' },
                    { name: 'updated_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
                    { name: 'created_at', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
                ];
                
                for (const col of requiredColumns) {
                    if (!columns.includes(col.name)) {
                        try {
                            const alterResult = await this.db.prepare(`ALTER TABLE user_settings ADD COLUMN ${col.name} ${col.definition}`).run();
                        } catch (alterError) {
                        }
                    } else {
                    }
                }
            }
            
            // Verify final table structure
            const finalTableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
            
        } catch (error) {
            // Error handling
        }
    }

    async getUserSettings(userId, integrationType) {
        try {
            await this.ensureUserSettingsTable();
            
            const stmt = this.db.prepare(`
                SELECT * FROM user_settings 
                WHERE user_id = ? AND integration_type = ?
                ORDER BY setting_key
            `);
            const result = await stmt.bind(userId, integrationType).all();
            return result.results || [];
        } catch (error) {
            return [];
        }
    }

    async setUserSetting(userId, integrationType, settingKey, settingValue, encrypted = false) {
        try {
            
            await this.ensureUserSettingsTable();
            
            // Use a more compatible approach - check if exists then update or insert
            const existingStmt = this.db.prepare(`
                SELECT id FROM user_settings 
                WHERE user_id = ? AND integration_type = ? AND setting_key = ?
            `);
            
            const existing = await existingStmt.bind(userId, integrationType, settingKey).first();
            
            if (existing) {
                // Update existing record
                
                // Check what columns exist in the table to build the correct UPDATE
                const tableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
                const columns = (tableInfo.results || []).map(col => col.name);
                
                // Build UPDATE statement based on available columns
                let updateParts = ['setting_value = ?'];
                let updateValues = [settingValue];
                
                if (columns.includes('encrypted')) {
                    updateParts.push('encrypted = ?');
                    updateValues.push(encrypted ? 1 : 0);
                }
                
                if (columns.includes('updated_at')) {
                    updateParts.push("updated_at = datetime('now')");
                }
                
                // integration_type is already part of the WHERE clause, no need to update it
                
                updateValues.push(existing.id); // Add the WHERE clause parameter
                
                const updateSQL = `
                    UPDATE user_settings 
                    SET ${updateParts.join(', ')}
                    WHERE id = ?
                `;
                
                
                const updateStmt = this.db.prepare(updateSQL);
                const result = await updateStmt.bind(...updateValues).run();
                const changes = (result.meta && result.meta.changes) || result.changes || 0;
                return changes > 0;
            } else {
                // Insert new record
                
                // Check what columns exist in the table to build the correct INSERT
                const tableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
                const columns = (tableInfo.results || []).map(col => col.name);
                
                // Build INSERT statement based on available columns
                let insertColumns = ['user_id', 'setting_key', 'setting_value'];
                let insertValues = [userId, settingKey, settingValue];
                let placeholders = ['?', '?', '?'];
                
                if (columns.includes('integration_type')) {
                    insertColumns.push('integration_type');
                    insertValues.push(integrationType);
                    placeholders.push('?');
                }
                
                if (columns.includes('encrypted')) {
                    insertColumns.push('encrypted');
                    insertValues.push(encrypted ? 1 : 0);
                    placeholders.push('?');
                }
                
                if (columns.includes('updated_at')) {
                    insertColumns.push('updated_at');
                    placeholders.push("datetime('now')");
                }
                
                if (columns.includes('created_at')) {
                    insertColumns.push('created_at');
                    placeholders.push("datetime('now')");
                }
                
                
                const insertSQL = `
                    INSERT INTO user_settings (${insertColumns.join(', ')}) 
                    VALUES (${placeholders.join(', ')})
                `;
                
                
                const insertStmt = this.db.prepare(insertSQL);
                const result = await insertStmt.bind(...insertValues).run();
                const changes = (result.meta && result.meta.changes) || result.changes || 0;
                return changes > 0;
            }
        } catch (error) {
            return false;
        }
    }

    async deleteUserSetting(userId, category, settingKey) {
        try {
            await this.ensureUserSettingsTable();
            
            const stmt = this.db.prepare(`
                DELETE FROM user_settings 
                WHERE user_id = ? AND category = ? AND setting_key = ?
            `);
            const result = await stmt.bind(userId, category, settingKey).run();
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            return false;
        }
    }

    async deleteUser(userId) {
        try {
            // Start a transaction by deleting related data first
            
            // Delete user settings
            const settingsStmt = this.db.prepare('DELETE FROM user_settings WHERE user_id = ?');
            await settingsStmt.bind(userId).run();
            
            // Delete user sessions  
            const sessionsStmt = this.db.prepare('DELETE FROM user_sessions WHERE user_id = ?');
            await sessionsStmt.bind(userId).run();
            
            // Delete daily usage records
            const usageStmt = this.db.prepare('DELETE FROM daily_usage WHERE user_id = ?');
            await usageStmt.bind(userId).run();
            
            // Delete API keys
            const apiKeysStmt = this.db.prepare('DELETE FROM user_api_keys WHERE user_id = ?');
            await apiKeysStmt.bind(userId).run();
            
            // Delete invite tokens related to this user
            // Delete invites sent by this user
            const invitesSentStmt = this.db.prepare('DELETE FROM invite_tokens WHERE invited_by_user_id = ?');
            await invitesSentStmt.bind(userId).run();
            
            // Delete invites used by this user  
            const invitesUsedStmt = this.db.prepare('DELETE FROM invite_tokens WHERE used_by_user_id = ?');
            await invitesUsedStmt.bind(userId).run();
            
            // Finally delete the user record
            const userStmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            const result = await userStmt.bind(userId).run();
            
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            return false;
        }
    }

    // Database migration for API keys (v9)
    async migration_v9() {
        try {
            const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS user_api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    integration_type TEXT NOT NULL,
                    api_key TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_used DATETIME NULL,
                    UNIQUE(user_id, integration_type),
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
            await stmt.run();
        } catch (error) {
            console.error('Migration v9 failed:', error);
        }
    }

    // Database migration for uploaded images (v10) - initial table with image_data
    async migration_v10() {
        try {
            const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS uploaded_images (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
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
                    image_data TEXT NOT NULL,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    generated_caption TEXT,
                    generated_hashtags TEXT,
                    generated_alt_text TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
            await stmt.run();
        } catch (error) {
            console.error('Migration v10 failed:', error);
        }
    }

    // Database migration for R2 storage (v11) - replace image_data with R2 references
    async migration_v11() {
        try {
            // Drop and recreate the table with new schema
            await this.db.prepare('DROP TABLE IF EXISTS uploaded_images').run();
            
            const stmt = this.db.prepare(`
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
                    generated_alt_text TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
            await stmt.run();
        } catch (error) {
            console.error('Migration v11 failed:', error);
        }
    }

    // Database migration for custom prompts (v12)
    async migration_v12() {
        try {
            const stmt = this.db.prepare(`
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
                )
            `);
            await stmt.run();
        } catch (error) {
            console.error('Migration v12 failed:', error);
        }
    }

    // Database migration for image library columns (v13)
    async migration_v13() {
        try {
            // Add file_hash column to uploaded_images table
            await this.db.prepare(`
                ALTER TABLE uploaded_images ADD COLUMN file_hash TEXT
            `).run();
            
            // Add source column to uploaded_images table  
            await this.db.prepare(`
                ALTER TABLE uploaded_images ADD COLUMN source TEXT DEFAULT 'lightroom'
            `).run();
            
            // Add location column to uploaded_images table
            await this.db.prepare(`
                ALTER TABLE uploaded_images ADD COLUMN location TEXT
            `).run();
            
            console.log('Migration v13 completed: Added file_hash, source, and location columns');
        } catch (error) {
            console.error('Migration v13 failed:', error);
            // Some columns might already exist, so we'll continue
        }
    }
    
    // Database migration for API key names (v14)
    async migration_v14() {
        try {
            // Add name column to user_api_keys table
            await this.db.prepare(`
                ALTER TABLE user_api_keys ADD COLUMN name TEXT
            `).run();
            
            // Update existing API keys to have a default name based on integration_type
            await this.db.prepare(`
                UPDATE user_api_keys 
                SET name = CASE 
                    WHEN integration_type = 'lightroom' THEN 'Lightroom'
                    ELSE 'API Key'
                END
                WHERE name IS NULL
            `).run();
            
            console.log('Migration v14 completed: Added name field to API keys');
        } catch (error) {
            console.error('Migration v14 failed:', error);
        }
    }

    // API Key Management Methods
    async getUserApiKeys(userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT id, integration_type, api_key, created_at, last_used 
                FROM user_api_keys 
                WHERE user_id = ?
                ORDER BY created_at DESC
            `);
            const result = await stmt.bind(userId).all();
            return result.results || [];
        } catch (error) {
            console.error('Error in getUserApiKeys:', error);
            return [];
        }
    }

    async createOrUpdateApiKey(userId, integrationType, apiKey, name = null) {
        try {
            // Check if API key already exists for this user and integration
            const existingStmt = this.db.prepare(`
                SELECT id FROM user_api_keys 
                WHERE user_id = ? AND integration_type = ?
            `);
            const existing = await existingStmt.bind(userId, integrationType).first();

            if (existing) {
                // Update existing key
                const updateStmt = this.db.prepare(`
                    UPDATE user_api_keys 
                    SET api_key = ?, name = ?, created_at = datetime('now'), last_used = NULL
                    WHERE user_id = ? AND integration_type = ?
                `);
                await updateStmt.bind(apiKey, name, userId, integrationType).run();
            } else {
                // Insert new key
                const insertStmt = this.db.prepare(`
                    INSERT INTO user_api_keys (user_id, integration_type, api_key, name, created_at, last_used) 
                    VALUES (?, ?, ?, ?, datetime('now'), NULL)
                `);
                await insertStmt.bind(userId, integrationType, apiKey, name).run();
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    async validateApiKey(apiKey) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                SELECT uak.id, uak.user_id, uak.integration_type, u.email, u.is_admin
                FROM user_api_keys uak
                JOIN users u ON uak.user_id = u.id
                WHERE uak.api_key = ? AND u.is_active = 1
            `);
            const result = await stmt.bind(apiKey).first();
            return result || null;
        } catch (error) {
            return null;
        }
    }

    async updateApiKeyLastUsed(apiKeyId) {
        try {
            const stmt = this.db.prepare(`
                UPDATE user_api_keys 
                SET last_used = datetime('now') 
                WHERE id = ?
            `);
            await stmt.bind(apiKeyId).run();
            return true;
        } catch (error) {
            return false;
        }
    }

    async deleteApiKey(userId, integrationType) {
        try {
            const stmt = this.db.prepare(`
                DELETE FROM user_api_keys 
                WHERE user_id = ? AND integration_type = ?
            `);
            const result = await stmt.bind(userId, integrationType).run();
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            return false;
        }
    }

    async deleteApiKeyById(userId, keyId) {
        try {
            const stmt = this.db.prepare(`
                DELETE FROM user_api_keys 
                WHERE user_id = ? AND id = ?
            `);
            const result = await stmt.bind(userId, keyId).run();
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            return false;
        }
    }

    // Uploaded Images Management Methods
    async storeUploadedImage(imageData, r2Key, fileSize = null) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                INSERT INTO uploaded_images (
                    id, user_id, filename, original_filename, file_size, mime_type, r2_key,
                    title, caption, keywords, rating, color_label,
                    camera_model, lens, iso, aperture, shutter_speed, focal_length, date_time,
                    uploaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `);
            
            const result = await stmt.bind(
                imageData.id,
                imageData.userId,
                imageData.filename,
                imageData.originalFilename || imageData.filename,
                fileSize,
                imageData.mimeType || 'image/jpeg',
                r2Key,
                imageData.title || null,
                imageData.caption || null,
                imageData.keywords ? JSON.stringify(imageData.keywords) : null,
                imageData.rating || 0,
                imageData.colorLabel || null,
                imageData.metadata?.camera || null,
                imageData.metadata?.lens || null,
                imageData.metadata?.iso || null,
                imageData.metadata?.aperture || null,
                imageData.metadata?.shutterSpeed || null,
                imageData.metadata?.focalLength || null,
                imageData.metadata?.dateTime || null
            ).run();
            
            return result.success;
        } catch (error) {
            console.error('Failed to store uploaded image metadata:', error);
            return false;
        }
    }

    async getUserUploadedImages(userId, limit = 50, offset = 0) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                SELECT id, filename, original_filename, file_size, mime_type, r2_key,
                       title, caption, keywords, rating, color_label,
                       camera_model, lens, iso, aperture, shutter_speed, focal_length, date_time,
                       uploaded_at, generated_caption, generated_hashtags, generated_alt_text
                FROM uploaded_images 
                WHERE user_id = ? AND (source = 'lightroom' OR source IS NULL)
                ORDER BY uploaded_at DESC
                LIMIT ? OFFSET ?
            `);
            const result = await stmt.bind(userId, limit, offset).all();
            
            // Parse keywords JSON for each image
            const images = (result.results || []).map(img => ({
                ...img,
                keywords: img.keywords ? JSON.parse(img.keywords) : []
            }));
            
            return images;
        } catch (error) {
            console.error('Failed to get uploaded images:', error);
            return [];
        }
    }

    async getUploadedImageById(imageId, userId) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                SELECT * FROM uploaded_images 
                WHERE id = ? AND user_id = ?
            `);
            const result = await stmt.bind(imageId, userId).first();
            
            if (result && result.keywords) {
                result.keywords = JSON.parse(result.keywords);
            }
            
            return result;
        } catch (error) {
            console.error('Failed to get uploaded image:', error);
            return null;
        }
    }

    async updateImageCaptions(imageId, userId, generatedCaption, generatedHashtags, generatedAltText) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                UPDATE uploaded_images 
                SET generated_caption = ?, generated_hashtags = ?, generated_alt_text = ?
                WHERE id = ? AND user_id = ?
            `);
            const result = await stmt.bind(generatedCaption, generatedHashtags, generatedAltText, imageId, userId).run();
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            console.error('Failed to update image captions:', error);
            return false;
        }
    }

    async deleteUploadedImage(imageId, userId) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                DELETE FROM uploaded_images 
                WHERE id = ? AND user_id = ?
            `);
            const result = await stmt.bind(imageId, userId).run();
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            console.error('Failed to delete uploaded image:', error);
            return false;
        }
    }

    // Custom Prompts Management Methods
    async getUserCustomPrompts(userId) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                SELECT id, name, description, prompt_text, icon, is_active, created_at, updated_at
                FROM user_prompts 
                WHERE user_id = ? AND is_active = 1
                ORDER BY created_at DESC
            `);
            const result = await stmt.bind(userId).all();
            return result.results || [];
        } catch (error) {
            console.error('Failed to get user custom prompts:', error);
            return [];
        }
    }

    async createCustomPrompt(userId, name, description, promptText, icon = '✨') {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                INSERT INTO user_prompts (user_id, name, description, prompt_text, icon, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            const result = await stmt.bind(userId, name, description, promptText, icon).run();
            return result.meta && result.meta.last_row_id || result.last_row_id;
        } catch (error) {
            console.error('Failed to create custom prompt:', error);
            return null;
        }
    }

    async updateCustomPrompt(promptId, userId, name, description, promptText, icon) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                UPDATE user_prompts 
                SET name = ?, description = ?, prompt_text = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `);
            const result = await stmt.bind(name, description, promptText, icon, promptId, userId).run();
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            console.error('Failed to update custom prompt:', error);
            return false;
        }
    }

    async deleteCustomPrompt(promptId, userId) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                UPDATE user_prompts 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `);
            const result = await stmt.bind(promptId, userId).run();
            const changes = result.meta && result.meta.changes || result.changes || 0;
            return changes > 0;
        } catch (error) {
            console.error('Failed to delete custom prompt:', error);
            return false;
        }
    }

    async getCustomPromptById(promptId, userId) {
        try {
            await this.ensureInitialized();
            const stmt = this.db.prepare(`
                SELECT id, name, description, prompt_text, icon, is_active, created_at, updated_at
                FROM user_prompts 
                WHERE id = ? AND user_id = ? AND is_active = 1
            `);
            const result = await stmt.bind(promptId, userId).first();
            return result;
        } catch (error) {
            console.error('Failed to get custom prompt by id:', error);
            return null;
        }
    }

    // Image Library Methods
    async storeWebImage(userId, filename, fileSize, mimeType, imageHash, r2Key, originalImageData = null) {
        try {
            await this.ensureInitialized();
            
            const stmt = this.db.prepare(`
                INSERT INTO uploaded_images (
                    id, user_id, filename, original_filename, file_size, mime_type, 
                    file_hash, r2_key, uploaded_at, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'web')
                RETURNING id
            `);
            
            // Generate a unique ID for the image
            const imageId = generateRandomId();
            
            const result = await stmt.bind(
                imageId, userId, filename, filename, fileSize, mimeType, imageHash, r2Key
            ).first();
            
            return result ? result.id : null;
        } catch (error) {
            console.error('Error storing web image:', error);
            return null;
        }
    }

    async getImageLibrary(userId, limit = 50, offset = 0) {
        try {
            await this.ensureInitialized();
            
            const stmt = this.db.prepare(`
                SELECT 
                    ui.id,
                    ui.original_filename,
                    ui.file_size,
                    ui.mime_type,
                    ui.uploaded_at as created_at,
                    ui.r2_key,
                    COUNT(ch.id) as caption_count
                FROM uploaded_images ui
                LEFT JOIN caption_history ch ON ui.id = ch.image_id
                WHERE ui.user_id = ? AND ui.source = 'web'
                GROUP BY ui.id
                ORDER BY ui.uploaded_at DESC
                LIMIT ? OFFSET ?
            `);
            
            const result = await stmt.bind(userId, limit, offset).all();
            return result.results || [];
        } catch (error) {
            console.error('Error getting image library:', error);
            return [];
        }
    }

    async getImageWithCaptions(userId, imageId) {
        try {
            await this.ensureInitialized();
            
            // Get image details
            const imageStmt = this.db.prepare(`
                SELECT * FROM uploaded_images 
                WHERE id = ? AND user_id = ?
            `);
            const image = await imageStmt.bind(imageId, userId).first();
            
            if (!image) {
                return null;
            }
            
            // Get caption history for this image
            const captionsStmt = this.db.prepare(`
                SELECT * FROM caption_history 
                WHERE image_id = ? AND user_id = ?
                ORDER BY created_at DESC
            `);
            const captionsResult = await captionsStmt.bind(imageId, userId).all();
            const captions = captionsResult.results || [];
            
            return {
                image: image,
                captions: captions
            };
        } catch (error) {
            console.error('Error getting image with captions:', error);
            return null;
        }
    }

    async deleteImageLibraryEntry(userId, imageId) {
        try {
            await this.ensureInitialized();
            
            // Delete caption history first (foreign key constraint)
            const captionHistoryStmt = this.db.prepare(`DELETE FROM caption_history WHERE image_id = ? AND user_id = ?`);
            await captionHistoryStmt.bind(imageId, userId).run();
            
            // Delete scheduled posts if table exists
            try {
                const scheduledPostsStmt = this.db.prepare(`DELETE FROM scheduled_posts WHERE image_id = ? AND user_id = ?`);
                await scheduledPostsStmt.bind(imageId, userId).run();
            } catch (scheduledError) {
                // Ignore if scheduled_posts table doesn't exist (for development environments)
                if (!scheduledError.message.includes('no such table: scheduled_posts')) {
                    throw scheduledError;
                }
            }
            
            // Delete the image record
            const imageStmt = this.db.prepare(`DELETE FROM uploaded_images WHERE id = ? AND user_id = ?`);
            await imageStmt.bind(imageId, userId).run();
            
            return true;
        } catch (error) {
            console.error('Error deleting image library entry:', error);
            return false;
        }
    }

    async getImageByHash(userId, imageHash) {
        try {
            await this.ensureInitialized();
            
            const stmt = this.db.prepare(`
                SELECT * FROM uploaded_images 
                WHERE user_id = ? AND file_hash = ?
                ORDER BY uploaded_at DESC
                LIMIT 1
            `);
            
            return await stmt.bind(userId, imageHash).first();
        } catch (error) {
            console.error('Error getting image by hash:', error);
            return null;
        }
    }

}

// Helper function to generate UUID-like random strings
function generateRandomId() {
    try {
        // Use Web Crypto API if available
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            // Format like UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            return hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-' + hex.substring(12, 16) + '-' + hex.substring(16, 20) + '-' + hex.substring(20, 32);
        } else {
            // Fallback to Math.random
            const timestamp = Date.now().toString(36);
            const randomPart = Math.random().toString(36).substring(2, 15);
            const randomPart2 = Math.random().toString(36).substring(2, 15);
            return timestamp + '-' + randomPart + '-' + randomPart2;
        }
    } catch (error) {
        // Final fallback
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 15);
        const randomPart2 = Math.random().toString(36).substring(2, 15);
        return timestamp + '-' + randomPart + '-' + randomPart2;
    }
}

const app = new Hono();

// Enable CORS 
app.use('/*', cors());

// JWT Configuration
const JWT_SECRET = 'default-secret-change-this'; // In production, use environment variable
const JWT_EXPIRES_IN = '7d';

// Authentication middleware
const authenticateToken = async (c, next) => {
    try {
        // Try to get token from Authorization header or cookie
        const authHeader = c.req.header('authorization');
        let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        // If no auth header, try cookie
        if (!token) {
            token = getCookie(c, 'auth_token');
        }

        if (!token) {
            return c.json({ error: 'Access token required' }, 401);
        }

        const decoded = jwt.verify(token, c.env.JWT_SECRET || JWT_SECRET);
        const database = new D1Database(c.env.DB);
        const session = await database.getSession(decoded.sessionId);
        
        if (!session) {
            return c.json({ error: 'Invalid or expired session' }, 401);
        }

        c.set('user', {
            id: session.user_id,
            email: session.email,
            sessionId: session.session_id,
            isAdmin: session.is_admin === 1
        });
        
        await next();
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 403);
    }
};

// API Key authentication middleware for external integrations
const authenticateApiKey = async (c, next) => {
    try {
        const authHeader = c.req.header('authorization');
        const apiKey = authHeader && authHeader.split(' ')[1]; // Bearer API_KEY

        if (!apiKey) {
            return c.json({ error: 'API key required' }, 401);
        }

        const database = new D1Database(c.env.DB);
        const keyValidation = await database.validateApiKey(apiKey);
        
        if (!keyValidation) {
            return c.json({ error: 'Invalid API key' }, 401);
        }

        // Update last used timestamp
        await database.updateApiKeyLastUsed(keyValidation.id);

        c.set('user', {
            id: keyValidation.user_id,
            email: keyValidation.email,
            isAdmin: keyValidation.is_admin === 1,
            apiKeyId: keyValidation.id,
            integrationType: keyValidation.integration_type
        });
        
        await next();
    } catch (error) {
        return c.json({ error: 'API authentication failed' }, 403);
    }
};

// API Routes (must come before static file serving)

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'OK',
    apiKeyConfigured: !!c.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString(),
    runtime: 'cloudflare-workers'
  });
});

// Debug endpoint to check database schema
app.get('/api/debug/schema', async (c) => {
  try {
    const database = new D1Database(c.env.DB);
    
    // Get list of tables
    const tablesStmt = database.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    const tables = await tablesStmt.all();
    
    return c.json({
      tables: tables.results || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      error: 'Failed to get schema info',
      message: error.message
    }, 500);
  }
});

// Admin middleware
const requireAdmin = async (c, next) => {
    const user = c.get('user');
    if (!user || !user.isAdmin) {
        return c.json({ error: 'Admin access required' }, 403);
    }
    await next();
};

// Database helper methods for admin functionality
D1Database.prototype.getAllUsers = async function() {
    const stmt = this.db.prepare(`
        SELECT u.*, t.name as tier_name, t.daily_limit 
        FROM users u 
        LEFT JOIN user_tiers t ON u.tier_id = t.id
        ORDER BY u.created_at DESC
    `);
    return (await stmt.all()).results || [];
};

D1Database.prototype.makeUserAdmin = async function(email) {
    const stmt = this.db.prepare(`
        UPDATE users SET is_admin = 1 WHERE email = ?
    `);
    await stmt.bind(email).run();
};

D1Database.prototype.toggleUserStatus = async function(userId) {
    const stmt = this.db.prepare(`
        UPDATE users SET is_active = NOT is_active WHERE id = ?
    `);
    const result = await stmt.bind(userId).run();
    const changes = result.meta && result.meta.changes || result.changes || 0;
    return changes > 0;
};

D1Database.prototype.getAllTiers = async function() {
    await this.ensureUserTiersTable();
    const stmt = this.db.prepare(`
        SELECT *, 
        (SELECT COUNT(*) FROM users WHERE tier_id = user_tiers.id) as user_count
        FROM user_tiers ORDER BY daily_limit ASC
    `);
    const result = await stmt.all();
    return result.results || [];
};

D1Database.prototype.getTierById = async function(tierId) {
    await this.ensureUserTiersTable();
    const stmt = this.db.prepare(`
        SELECT * FROM user_tiers WHERE id = ?
    `);
    const result = await stmt.bind(tierId).first();
    return result || null;
};

D1Database.prototype.createTier = async function(name, dailyLimit, description = null) {
    await this.ensureUserTiersTable();
    const stmt = this.db.prepare(`
        INSERT INTO user_tiers (name, daily_limit, description) 
        VALUES (?, ?, ?)
        RETURNING id
    `);
    const result = await stmt.bind(name, dailyLimit, description).first();
    return result.id;
};

D1Database.prototype.updateTier = async function(tierId, name, dailyLimit, description = null) {
    const stmt = this.db.prepare(`
        UPDATE user_tiers 
        SET name = ?, daily_limit = ?, description = ?, updated_at = datetime('now')
        WHERE id = ?
    `);
    const result = await stmt.bind(name, dailyLimit, description, tierId).run();
    const changes = result.meta && result.meta.changes || result.changes || 0;
    return changes > 0;
};

D1Database.prototype.deleteTier = async function(tierId) {
    // Check if any users are assigned to this tier
    const usersStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE tier_id = ?
    `);
    const usersResult = await usersStmt.bind(tierId).first();
    
    if (usersResult.count > 0) {
        throw new Error('Cannot delete tier with assigned users');
    }

    const stmt = this.db.prepare(`
        DELETE FROM user_tiers WHERE id = ?
    `);
    const result = await stmt.bind(tierId).run();
    const changes = result.meta && result.meta.changes || result.changes || 0;
    return changes > 0;
};

D1Database.prototype.setUserTier = async function(userId, tierId) {
    try {
        const stmt = this.db.prepare(`
            UPDATE users SET tier_id = ? WHERE id = ?
        `);
        const result = await stmt.bind(tierId, userId).run();
        
        // D1 result structure: result.meta.changes or result.changes
        const changes = result.meta && result.meta.changes || result.changes || 0;
        return changes > 0;
    } catch (error) {
        throw error;
    }
};

D1Database.prototype.createInviteToken = async function(email, invitedBy, token, expiresAt, tierId = null, personalMessage = null) {
    try {
        
        // First ensure the invite_tokens table exists with proper schema
        await this.ensureInviteTokensTable();
        
        // Debug: List all tables to see what exists
        try {
            const tablesResult = await this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            
            // Check the actual schema of invite_tokens table
            const schemaResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invite_tokens'").all();
            
            // Check for any foreign keys or constraints that reference 'tiers'
            const fkResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE sql LIKE '%tiers%'").all();
            
        } catch (listError) {
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO invite_tokens (email, invited_by_user_id, token, expires_at, tier_id, personal_message) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = await stmt.bind(email, invitedBy, token, expiresAt, tierId, personalMessage).run();
        
        return { email, token, expiresAt, tierId, personalMessage };
    } catch (error) {
        throw error;
    }
};

D1Database.prototype.ensureUserTiersTable = async function() {
    try {
        const stmt = this.db.prepare(`
            CREATE TABLE IF NOT EXISTS user_tiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                daily_limit INTEGER NOT NULL DEFAULT 10,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await stmt.run();
    } catch (error) {
    }
};

D1Database.prototype.ensureInviteTokensTable = async function() {
    try {
        // Ensure user_tiers table exists first
        await this.ensureUserTiersTable();
        
        // Check if the table has the wrong foreign key constraint
        const schemaResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invite_tokens'").all();
        const currentSchema = schemaResult.results&& [0]&& sql || '';
        
        if (currentSchema.includes('REFERENCES tiers(id)')) {
            
            // Drop and recreate the table with correct schema
            await this.db.prepare('DROP TABLE IF EXISTS invite_tokens').run();
        }
        
        const stmt = this.db.prepare(`
            CREATE TABLE IF NOT EXISTS invite_tokens (
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
            )
        `);
        await stmt.run();
        
        // Add tier_id column if it doesn't exist (for existing tables)
        try {
            const alterStmt = this.db.prepare(`
                ALTER TABLE invite_tokens ADD COLUMN tier_id INTEGER
            `);
            await alterStmt.run();
        } catch (alterError) {
            // Column likely already exists, which is fine
        }
        
        // Add personal_message column if it doesn't exist (for existing tables)
        try {
            const alterStmt2 = this.db.prepare(`
                ALTER TABLE invite_tokens ADD COLUMN personal_message TEXT
            `);
            await alterStmt2.run();
        } catch (alterError) {
            // Column likely already exists, which is fine
        }
        
    } catch (error) {
    }
};

D1Database.prototype.getInviteToken = async function(token) {
    try {
        await this.ensureInviteTokensTable();
        
        const stmt = this.db.prepare(`
            SELECT * FROM invite_tokens 
            WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')
        `);
        const result = await stmt.bind(token).first();
        return result;
    } catch (error) {
        return null;
    }
};

D1Database.prototype.useInviteToken = async function(token, userId) {
    
    try {
        const stmt = this.db.prepare(`
            UPDATE invite_tokens 
            SET used_at = datetime('now'), used_by_user_id = ? 
            WHERE token = ?
        `);
        const result = await stmt.bind(userId, token).run();
        const changes = result.meta && result.meta.changes || result.changes || 0;
        return changes > 0;
    } catch (error) {
        throw error;
    }
};

D1Database.prototype.getPendingInvites = async function() {
    try {
        // First check if the invite_tokens table exists
        const tableCheck = this.db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='invite_tokens'
        `);
        const tableExists = await tableCheck.first();
        
        if (!tableExists) {
            return [];
        }
        
        // Check what columns exist in the table
        const columnsCheck = this.db.prepare(`
            PRAGMA table_info(invite_tokens)
        `);
        const columns = await columnsCheck.all();
        const columnNames = (columns.results || []).map(col => col.name);
        
        // Use different query based on available columns
        let stmt;
        if (columnNames.includes('invited_by_user_id')) {
            stmt = this.db.prepare(`
                SELECT i.*, COALESCE(u.email, 'System') as invited_by_email 
                FROM invite_tokens i
                LEFT JOIN users u ON i.invited_by_user_id = u.id
                WHERE i.used_at IS NULL 
                AND i.expires_at > datetime('now')
                ORDER BY i.created_at DESC
            `);
        } else if (columnNames.includes('invited_by_user_id')) {
            stmt = this.db.prepare(`
                SELECT i.*, COALESCE(u.email, 'System') as invited_by_email 
                FROM invite_tokens i
                LEFT JOIN users u ON i.invited_by_user_id = u.id
                WHERE i.used_at IS NULL 
                AND i.expires_at > datetime('now')
                ORDER BY i.created_at DESC
            `);
        } else {
            // Fallback for tables without invited_by_user_id column
            stmt = this.db.prepare(`
                SELECT *, 'System' as invited_by_email
                FROM invite_tokens
                WHERE used_at IS NULL 
                AND expires_at > datetime('now')
                ORDER BY created_at DESC
            `);
        }
        
        const result = await stmt.all();
        return result.results || [];
    } catch (error) {
        return [];
    }
};

D1Database.prototype.getUsersUsageStats = async function() {
    const stmt = this.db.prepare(`
        SELECT 
            u.id, u.email, u.created_at, u.last_login, u.is_active,
            t.name as tier_name, t.daily_limit,
            COALESCE(du.usage_count, 0) as usage_today,
            COALESCE(total_usage.total_count, 0) as total_usage
        FROM users u
        LEFT JOIN user_tiers t ON u.tier_id = t.id
        LEFT JOIN daily_usage du ON u.id = du.user_id AND du.date = date('now')
        LEFT JOIN (
            SELECT user_id, SUM(usage_count) as total_count
            FROM daily_usage
            GROUP BY user_id
        ) total_usage ON u.id = total_usage.user_id
        WHERE u.is_active = 1
        ORDER BY u.created_at DESC
    `);
    const result = await stmt.all();
    return result.results || [];
};

// Send email using Resend API (Cloudflare Workers compatible)
async function sendMagicLinkEmail(email, loginUrl, env) {
    if (!env.SMTP_PASSWORD) {
        throw new Error('SMTP_PASSWORD (Resend API key) not configured');
    }

    const html = await renderTemplate('login-email', {
        LOGIN_URL: loginUrl,
        TIMESTAMP: formatDateWithTimezone(new Date(), null, c.env)
    });

    const emailData = {
        from: env.SMTP_FROM_EMAIL || 'AI Caption Studio <noreply@resend.dev>',
        to: email,
        subject: 'Your Login Link - AI Caption Studio',
        html: html
    };

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + env.SMTP_PASSWORD,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error('Resend API error: ' + response.status + ' - ' + errorData);
    }

    const result = await response.json();
    return result;
}

// Authentication endpoints
app.post('/api/auth/request-login', async (c) => {
    try {
        const { email } = await c.req.json();
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return c.json({ error: 'Valid email address required' }, 400);
        }

        const database = new D1Database(c.env.DB);
        
        // Check if user already exists
        const existingUser = await database.getUserByEmail(email);
        
        // If user doesn't exist, check registration settings
        if (!existingUser) {
            const registrationOpen = await database.getSystemSetting('registration_open', 'true');
            if (registrationOpen === 'false') {
                return c.json({ 
                    error: 'Registration is currently invite-only. Please contact an administrator for an invitation.' 
                }, 403);
            }
        }
        
        // Generate secure token
        const token = generateRandomId();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
        
        // Get client info
        const ipAddress = c.req.header('cf-connecting-ip') || 'unknown';
        const userAgent = c.req.header('user-agent') || '';

        // Store token in database
        await database.createLoginToken(email, token, expiresAt, ipAddress, userAgent);

        // Create magic link
        const loginUrl = `${new URL(c.req.url).origin}/auth/verify?token=${token}`;
        
        // Send email using Resend
        try {
            await sendMagicLinkEmail(email, loginUrl, c.env);
            
            return c.json({ 
                success: true, 
                message: 'Magic link sent to your email address',
                expiresIn: '15 minutes'
            });
        } catch (emailError) {
            
            // Fallback: show link for development if email fails
            return c.json({ 
                success: true, 
                message: 'Magic link generated (email sending failed: ' + emailError.message + ')',
                expiresIn: '15 minutes',
                loginUrl: loginUrl // Only shown when email fails
            });
        }

    } catch (error) {
        return c.json({ error: 'Failed to generate magic link' }, 500);
    }
});

app.get('/auth/verify', async (c) => {
    try {
        const token = c.req.query('token');

        if (!token) {
            const html = await renderTemplate('login-error', {
                ERROR_TITLE: 'Invalid Login Link',
                ERROR_MESSAGE: 'This login link is invalid.'
            });
            return c.html(html);
        }

        const database = new D1Database(c.env.DB);
        const loginToken = await database.getLoginToken(token);
        
        if (!loginToken) {
            const html = await renderTemplate('login-error', {
                ERROR_TITLE: 'Invalid or Expired Link',
                ERROR_MESSAGE: 'This login link is invalid or has expired.'
            });
            return c.html(html);
        }

        // Mark token as used
        await database.useLoginToken(token);

        // Get or create user
        let user;
        try {
            user = await database.getUserByEmail(loginToken.email);
            if (!user) {
                user = await database.createUser(loginToken.email, c.env);
            }
        } catch (error) {
            if (error.message === 'USER_EXISTS') {
                user = await database.getUserByEmail(loginToken.email);
            } else {
                throw error;
            }
        }

        // Create session
        const sessionId = generateRandomId();
        const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        const ipAddress = c.req.header('cf-connecting-ip') || 'unknown';
        const userAgent = c.req.header('user-agent') || '';

        await database.createSession(sessionId, user.id, sessionExpiresAt, ipAddress, userAgent);

        // Create JWT token
        const jwtToken = jwt.sign({ sessionId }, c.env.JWT_SECRET || JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Set secure cookie (httpOnly=false so JavaScript can access it for backup)
        setCookie(c, 'auth_token', jwtToken, {
            httpOnly: false,
            secure: false, // Allow on HTTP for development/testing
            maxAge: 7 * 24 * 60 * 60, // 7 days
            sameSite: 'Lax'
        });

        const html = await renderTemplate('login-success', {
            USER_EMAIL: user.email,
            JWT_TOKEN: jwtToken
        });
        return c.html(html);

    } catch (error) {
        const html = await renderTemplate('login-error', {
            ERROR_TITLE: 'Login Failed',
            ERROR_MESSAGE: 'Login verification failed.'
        });
        return c.html(html);
    }
});

app.get('/api/auth/me', authenticateToken, async (c) => {
    const user = c.get('user');
    return c.json({
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin
    });
});

// Logout endpoint - invalidate session
app.post('/api/auth/logout', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Delete the session from database
        const stmt = database.db.prepare('DELETE FROM user_sessions WHERE session_id = ?');
        await stmt.bind(user.sessionId).run();
        
        // Clear the cookie
        setCookie(c, 'auth_token', '', {
            httpOnly: false,
            secure: false,
            maxAge: 0,
            expires: new Date(0),
            sameSite: 'Lax'
        });
        
        return c.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        return c.json({ error: 'Logout failed' }, 500);
    }
});

// Accept invite endpoint - create account and assign tier
app.post('/api/auth/accept-invite', async (c) => {
    try {
        const { email, inviteToken } = await c.req.json();
        
        if (!email || !inviteToken) {
            return c.json({ error: 'Email and invite token are required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Validate the invite token
        const invite = await database.getInviteToken(inviteToken);
        if (!invite) {
            return c.json({ error: 'Invalid or expired invite token' }, 400);
        }
        
        if (invite.email !== email) {
            return c.json({ error: 'Email does not match the invitation' }, 400);
        }
        
        // Check if user already exists
        const existingUser = await database.getUserByEmail(email);
        if (existingUser) {
            return c.json({ error: 'User already exists' }, 400);
        }
        
        // Create the user account
        const user = await database.createUser(email, c.env);
        
        // Assign tier if specified in the invite
        if (invite.tier_id) {
            const tierInfo = await database.getTierById(invite.tier_id);
            if (tierInfo) {
                await database.setUserTier(user.id, invite.tier_id);
            }
        }
        
        // Mark the invite token as used
        await database.useInviteToken(inviteToken, user.id);
        
        // Create a login session for the new user
        const sessionId = generateRandomId();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        
        // Get client info for session
        const ipAddress = c.req.header('cf-connecting-ip') || 'unknown';
        const userAgent = c.req.header('user-agent') || '';
        
        await database.createSession(sessionId, user.id, expiresAt, ipAddress, userAgent);
        
        // Create JWT token
        const token = jwt.sign({ sessionId }, c.env.JWT_SECRET || JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        
        // Set auth cookie
        setCookie(c, 'auth_token', token, {
            httpOnly: false,
            secure: false,
            maxAge: 7 * 24 * 60 * 60, // 7 days
            sameSite: 'Lax'
        });
        
        return c.json({ 
            success: true, 
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            token: token
        });
        
    } catch (error) {
        return c.json({ error: 'Failed to accept invitation' }, 500);
    }
});

// Admin endpoints

// Create new user (admin only)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (c) => {
    try {
        const { email, isAdmin } = await c.req.json();
        
        if (!email || !email.includes('@')) {
            return c.json({ error: 'Valid email address is required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Check if user already exists
        const existingUser = await database.db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existingUser) {
            return c.json({ error: 'User with this email already exists' }, 400);
        }
        
        // Create the user
        const result = await database.db.prepare(
            'INSERT INTO users (email, is_admin, is_active, created_at) VALUES (?, ?, ?, datetime("now"))'
        ).bind(email, isAdmin ? 1 : 0, 1).run();
        
        if (result.success) {
            return c.json({ 
                success: true, 
                message: `User ${email} created successfully${isAdmin ? ' as admin' : ''}`,
                userId: result.meta.last_row_id
            });
        } else {
            return c.json({ error: 'Failed to create user' }, 500);
        }
    } catch (error) {
        return c.json({ error: 'Failed to create user' }, 500);
    }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        const users = await database.getAllUsers();
        return c.json(users);
    } catch (error) {
        return c.json({ error: 'Failed to fetch users' }, 500);
    }
});

app.post('/api/admin/users/:userId/make-admin', authenticateToken, requireAdmin, async (c) => {
    try {
        const { userId } = c.req.param();
        const database = new D1Database(c.env.DB);
        
        // Get user email first
        const user = await database.db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first();
        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }
        
        await database.makeUserAdmin(user.email);
        return c.json({ success: true, message: 'User promoted to admin' });
    } catch (error) {
        return c.json({ error: 'Failed to promote user' }, 500);
    }
});

app.post('/api/admin/users/:userId/toggle', authenticateToken, requireAdmin, async (c) => {
    try {
        const { userId } = c.req.param();
        const database = new D1Database(c.env.DB);
        
        const success = await database.toggleUserStatus(userId);
        if (success) {
            return c.json({ success: true, message: 'User status updated successfully' });
        } else {
            return c.json({ error: 'User not found' }, 404);
        }
    } catch (error) {
        return c.json({ error: 'Failed to toggle user status' }, 500);
    }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        
        // Ensure query_logs table exists before counting
        await database.ensureQueryLogsTable();
        
        // Get basic stats
        const userCount = await database.db.prepare('SELECT COUNT(*) as count FROM users').first();
        const queryCount = await database.db.prepare('SELECT COUNT(*) as count FROM query_logs').first();
        
        return c.json({
            totalUsers: (userCount && userCount.count) || 0,
            totalQueries: (queryCount && queryCount.count) || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return c.json({ error: 'Failed to fetch stats: ' + error.message }, 500);
    }
});

// Tier management endpoints
app.get('/api/admin/tiers', authenticateToken, requireAdmin, async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        const tiers = await database.getAllTiers();
        return c.json(tiers);
    } catch (error) {
        return c.json({ error: 'Failed to fetch tiers' }, 500);
    }
});

app.get('/api/admin/tiers/:tierId', authenticateToken, requireAdmin, async (c) => {
    try {
        const { tierId } = c.req.param();
        const database = new D1Database(c.env.DB);
        const tier = await database.getTierById(tierId);
        
        if (!tier) {
            return c.json({ error: 'Tier not found' }, 404);
        }
        
        return c.json(tier);
    } catch (error) {
        return c.json({ error: 'Failed to fetch tier' }, 500);
    }
});

app.post('/api/admin/tiers', authenticateToken, requireAdmin, async (c) => {
    try {
        const { name, dailyLimit, description } = await c.req.json();
        
        if (!name || dailyLimit === undefined) {
            return c.json({ error: 'Name and daily limit are required' }, 400);
        }
        
        if (dailyLimit < -1) {
            return c.json({ error: 'Daily limit must be -1 or greater' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        const tierId = await database.createTier(name, dailyLimit, description);
        return c.json({ 
            success: true, 
            message: `Tier "${name}" created successfully`,
            tierId 
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
            return c.json({ error: 'A tier with this name already exists' }, 400);
        }
        return c.json({ error: 'Failed to create tier' }, 500);
    }
});

app.put('/api/admin/tiers/:tierId', authenticateToken, requireAdmin, async (c) => {
    try {
        const { tierId } = c.req.param();
        const { name, dailyLimit, description } = await c.req.json();
        
        if (!name || dailyLimit === undefined) {
            return c.json({ error: 'Name and daily limit are required' }, 400);
        }
        
        if (dailyLimit < -1) {
            return c.json({ error: 'Daily limit must be -1 or greater' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        const success = await database.updateTier(tierId, name, dailyLimit, description);
        
        if (success) {
            return c.json({ 
                success: true, 
                message: `Tier "${name}" updated successfully` 
            });
        } else {
            return c.json({ error: 'Tier not found' }, 404);
        }
    } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
            return c.json({ error: 'A tier with this name already exists' }, 400);
        }
        return c.json({ error: 'Failed to update tier' }, 500);
    }
});

app.delete('/api/admin/tiers/:tierId', authenticateToken, requireAdmin, async (c) => {
    try {
        const { tierId } = c.req.param();
        const database = new D1Database(c.env.DB);
        const success = await database.deleteTier(tierId);
        
        if (success) {
            return c.json({ 
                success: true, 
                message: 'Tier deleted successfully' 
            });
        } else {
            return c.json({ error: 'Tier not found' }, 404);
        }
    } catch (error) {
        if (error.message.includes('Cannot delete tier with assigned users')) {
            return c.json({ error: 'Cannot delete tier that has users assigned to it' }, 400);
        }
        return c.json({ error: 'Failed to delete tier' }, 500);
    }
});

app.post('/api/admin/users/:userId/tier', authenticateToken, requireAdmin, async (c) => {
    try {
        const { userId } = c.req.param();
        const { tierId } = await c.req.json();
        
        
        const database = new D1Database(c.env.DB);
        
        // Handle clearing tier (tierId is null/empty)
        if (!tierId || tierId === '' || tierId === 'null') {
            const success = await database.setUserTier(userId, null);
            if (success) {
                return c.json({ 
                    success: true, 
                    message: 'User tier cleared (no tier assigned)' 
                });
            } else {
                return c.json({ error: 'User not found' }, 404);
            }
        }
        
        // Verify tier exists for non-null tierId
        const tier = await database.getTierById(tierId);
        if (!tier) {
            return c.json({ error: 'Invalid tier ID' }, 400);
        }
        
        const success = await database.setUserTier(userId, tierId);
        
        if (success) {
            return c.json({ 
                success: true, 
                message: `User tier updated to "${tier.name}"` 
            });
        } else {
            return c.json({ error: 'User not found' }, 404);
        }
    } catch (error) {
        return c.json({ error: 'Failed to update user tier: ' + error.message }, 500);
    }
});

// Delete user endpoint
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (c) => {
    try {
        const { userId } = c.req.param();
        
        if (!userId) {
            return c.json({ error: 'User ID is required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Check if user exists first (including inactive users for deletion)
        const user = await database.db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }
        
        // Prevent admin from deleting themselves
        const requestingUser = c.get('user');
        if (requestingUser.id === parseInt(userId)) {
            return c.json({ error: 'Cannot delete your own account' }, 400);
        }
        
        // Perform the deletion (cascades to related data)
        const success = await database.deleteUser(userId);
        
        if (success) {
            return c.json({ 
                success: true, 
                message: `User "${user.email}" has been permanently deleted` 
            });
        } else {
            return c.json({ error: 'Failed to delete user' }, 500);
        }
        
    } catch (error) {
        return c.json({ error: 'Failed to delete user: ' + error.message }, 500);
    }
});

// Invite system endpoints
app.post('/api/admin/invite', authenticateToken, requireAdmin, async (c) => {
    try {
        const { email, tierId, personalMessage } = await c.req.json();
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return c.json({ error: 'Valid email address required' }, 400);
        }

        const database = new D1Database(c.env.DB);
        // Check if user already exists
        const existingUser = await database.getUserByEmail(email);
        if (existingUser) {
            return c.json({ error: 'User already exists' }, 400);
        }

        // Validate tier if provided
        let tierInfo = null;
        if (tierId) {
            // Debug: List all tables in the database
            try {
                const tablesResult = await database.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            } catch (dbError) {
            }
            
            tierInfo = await database.getTierById(tierId);
            if (!tierInfo) {
                return c.json({ error: 'Invalid tier selected' }, 400);
            }
        }

        // Generate invite token
        const token = generateRandomId();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        
        const user = c.get('user');
        await database.createInviteToken(email, user.id, token, expiresAt, tierId, personalMessage);

        // Create invite link
        const inviteUrl = `${new URL(c.req.url).origin}/auth?invite=${token}&email=${encodeURIComponent(email)}`;

        // Build personal message section for email
        const personalMessageHtml = personalMessage ? 
            `<div style="background: #f8f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #405de6; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #405de6;">Personal Message:</h3>
                <p style="margin: 0; font-style: italic;">"${personalMessage}"</p>
            </div>` : '';

        // Build tier information section for email
        const tierInfoHtml = tierInfo ? 
            `<div style="background: #f0f9ff; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e0f2fe;">
                <h4 style="margin: 0 0 5px 0; color: #0369a1;">Your Account Tier: ${tierInfo.name}</h4>
                <p style="margin: 0; font-size: 14px; color: #475569;">
                    ${tierInfo.daily_limit === -1 ? 'Unlimited' : tierInfo.daily_limit} caption generations per day
                </p>
            </div>` : '';

        // Send email using Resend
        try {
            const emailData = {
                from: c.env.SMTP_FROM_EMAIL || 'AI Caption Studio <noreply@resend.dev>',
                to: email,
                subject: 'You are invited to AI Caption Studio',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>🎉 You're Invited!</h2>
                        <p>Hi there!</p>
                        <p><strong>${user.email}</strong> has invited you to join AI Caption Studio, an AI-powered tool for creating Instagram captions and hashtags.</p>
                        ${personalMessageHtml}
                        ${tierInfoHtml}
                        <div style="margin: 30px 0;">
                            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                                🚀 Accept Invitation
                            </a>
                        </div>
                        <p><strong>This invitation expires in 7 days.</strong></p>
                        <p>If you're not interested, you can safely ignore this email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">
                            Invited by: ${user.email}<br>
                            Time: ${formatDateWithTimezone(new Date(), null, c.env)}${tierInfo ? `<br>Assigned Tier: ${tierInfo.name}` : ''}
                        </p>
                    </div>
                `
            };

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + c.env.SMTP_PASSWORD,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error('Resend API error: ' + response.status + ' - ' + errorData);
            }

            return c.json({ 
                success: true, 
                message: `Invitation sent to ${email}${tierInfo ? ` with ${tierInfo.name} tier` : ''}`,
                expiresIn: '7 days'
            });
        } catch (emailError) {
            return c.json({ 
                success: true, 
                message: `Invitation created but email sending failed: ${emailError.message}`,
                inviteUrl: inviteUrl // Fallback: show link for manual sharing
            });
        }

    } catch (error) {
        return c.json({ error: 'Failed to send invitation' }, 500);
    }
});

app.get('/api/admin/invites', authenticateToken, requireAdmin, async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        const invites = await database.getPendingInvites();
        return c.json(invites);
    } catch (error) {
        return c.json({ error: 'Failed to fetch invites: ' + error.message }, 500);
    }
});

// Resend invite endpoint
app.post('/api/admin/invites/:token/resend', authenticateToken, requireAdmin, async (c) => {
    try {
        const { token } = c.req.param();
        const database = new D1Database(c.env.DB);
        
        // Get the existing invite
        const invite = await database.getInviteToken(token);
        if (!invite) {
            return c.json({ error: 'Invite not found or already used/expired' }, 404);
        }
        
        // Generate new token and extend expiry
        const newToken = generateRandomId();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        
        // Update the invite with new token and expiry
        const updateStmt = database.db.prepare(`
            UPDATE invite_tokens 
            SET token = ?, expires_at = ?, created_at = datetime('now')
            WHERE token = ?
        `);
        await updateStmt.bind(newToken, expiresAt, token).run();
        
        // Send the invite email using Resend API
        const inviteLink = `${c.req.header('origin') || 'http://localhost:8787'}/auth?invite=${newToken}&email=${encodeURIComponent(invite.email)}`;
        
        // Get the user who is resending (current admin)
        const user = c.get('user');
        
        // Build personal message section if it exists
        const personalMessageHtml = invite.personal_message ? 
            `<div style="background: #f8f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #405de6; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #405de6;">Personal Message:</h3>
                <p style="margin: 0; font-style: italic;">"${invite.personal_message}"</p>
            </div>` : '';

        const emailData = {
            from: `${c.env.SMTP_FROM_NAME || 'AI Caption Studio'} <${c.env.SMTP_FROM_EMAIL || 'no-reply@jonsson.io'}>`,
            to: [invite.email],
            subject: 'Reminder: You\'re invited to AI Caption Studio',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>🔄 Invitation Reminder</h2>
                    <p>Hi there!</p>
                    <p>This is a reminder that <strong>${user.email}</strong> has invited you to join AI Caption Studio.</p>
                    ${personalMessageHtml}
                    <div style="margin: 30px 0;">
                        <a href="${inviteLink}" style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                            🚀 Accept Invitation
                        </a>
                    </div>
                    <p><strong>This invitation expires in 7 days.</strong></p>
                    <p>If you're not interested, you can safely ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">
                        Resent by: ${user.email}<br>
                        Time: ${formatDateWithTimezone(new Date(), null, c.env)}
                    </p>
                </div>
            `
        };

        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + c.env.SMTP_PASSWORD,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!emailResponse.ok) {
            const errorData = await emailResponse.text();
            // Still return success since the token was updated, just note email issue
            return c.json({ 
                success: true, 
                message: 'Invitation token updated but email sending failed: ' + errorData,
                newToken: newToken
            });
        }
        
        return c.json({ 
            success: true, 
            message: 'Invitation resent successfully',
            newToken: newToken
        });
    } catch (error) {
        return c.json({ error: 'Failed to resend invitation: ' + error.message }, 500);
    }
});

// Delete invite endpoint
app.delete('/api/admin/invites/:token', authenticateToken, requireAdmin, async (c) => {
    try {
        const { token } = c.req.param();
        const database = new D1Database(c.env.DB);
        
        // Check if invite exists (including expired/used ones for deletion)
        const checkStmt = database.db.prepare(`
            SELECT * FROM invite_tokens WHERE token = ?
        `);
        const invite = await checkStmt.bind(token).first();
        
        if (!invite) {
            return c.json({ error: 'Invite not found' }, 404);
        }
        
        // Delete the invite
        const deleteStmt = database.db.prepare(`
            DELETE FROM invite_tokens WHERE token = ?
        `);
        const result = await deleteStmt.bind(token).run();
        
        const changes = result.meta && result.meta.changes || result.changes || 0;
        if (changes > 0) {
            return c.json({ 
                success: true, 
                message: 'Invitation deleted successfully' 
            });
        } else {
            return c.json({ error: 'Failed to delete invitation' }, 500);
        }
    } catch (error) {
        return c.json({ error: 'Failed to delete invitation: ' + error.message }, 500);
    }
});

app.get('/api/admin/usage-stats', authenticateToken, requireAdmin, async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        const stats = await database.getUsersUsageStats();
        return c.json(stats);
    } catch (error) {
        return c.json({ error: 'Failed to fetch usage statistics' }, 500);
    }
});

// API Key Management Endpoints
app.get('/api/settings/api-keys', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        const apiKeys = await database.getUserApiKeys(user.id);
        
        // Don't return the actual API keys for security, just metadata
        const maskedKeys = apiKeys.map(key => ({
            id: key.id,
            integration_type: key.integration_type,
            name: key.name || (key.integration_type ? key.integration_type.charAt(0).toUpperCase() + key.integration_type.slice(1) : 'API Key'),
            created_at: key.created_at,
            last_used: key.last_used,
            masked_key: key.api_key.substring(0, 8) + '...' + key.api_key.substring(key.api_key.length - 4)
        }));
        
        return c.json(maskedKeys);
    } catch (error) {
        return c.json({ error: 'Failed to fetch API keys' }, 500);
    }
});

app.post('/api/settings/api-keys', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();
        const { name, integration_type = 'general' } = body;
        
        if (!name || name.trim().length === 0) {
            return c.json({ error: 'API key name is required' }, 400);
        }
        
        // Generate a new API key using Web Crypto API
        const apiKey = 'acs_' + generateRandomId().replace(/-/g, '') + '_' + Date.now().toString(36);
        
        const database = new D1Database(c.env.DB);
        const success = await database.createOrUpdateApiKey(user.id, integration_type, apiKey, name.trim());
        
        if (success) {
            return c.json({ 
                success: true,
                apiKey: apiKey,  // Use camelCase to match frontend expectations
                api_key: apiKey, // Also include snake_case for compatibility
                integration_type: integration_type,
                name: name.trim(),
                message: 'API key generated successfully'
            });
        } else {
            return c.json({ error: 'Failed to create API key' }, 500);
        }
    } catch (error) {
        return c.json({ error: 'Failed to generate API key' }, 500);
    }
});

// Legacy endpoint for backward compatibility
app.post('/api/settings/api-keys/:integrationType', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { integrationType } = c.req.param();
        
        // Validate integration type
        const validTypes = ['lightroom', 'photoshop', 'external'];
        if (!validTypes.includes(integrationType)) {
            return c.json({ error: 'Invalid integration type' }, 400);
        }
        
        // Generate a new API key using Web Crypto API
        const apiKey = 'acs_' + generateRandomId().replace(/-/g, '') + '_' + Date.now().toString(36);
        
        // Use integration type as name for legacy compatibility
        const name = integrationType.charAt(0).toUpperCase() + integrationType.slice(1);
        
        const database = new D1Database(c.env.DB);
        const success = await database.createOrUpdateApiKey(user.id, integrationType, apiKey, name);
        
        if (success) {
            return c.json({ 
                success: true,
                apiKey: apiKey,  // Use camelCase to match frontend expectations
                api_key: apiKey, // Also include snake_case for compatibility
                integration_type: integrationType,
                name: name,
                message: 'API key generated successfully'
            });
        } else {
            return c.json({ error: 'Failed to create API key' }, 500);
        }
    } catch (error) {
        return c.json({ error: 'Failed to generate API key' }, 500);
    }
});

// Delete API key by ID (new method)
app.delete('/api/settings/api-keys/id/:keyId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { keyId } = c.req.param();
        
        const database = new D1Database(c.env.DB);
        const success = await database.deleteApiKeyById(user.id, keyId);
        
        if (success) {
            return c.json({ 
                success: true,
                message: 'API key revoked successfully'
            });
        } else {
            return c.json({ error: 'API key not found' }, 404);
        }
    } catch (error) {
        return c.json({ error: 'Failed to revoke API key' }, 500);
    }
});

// Legacy endpoint for backward compatibility (delete by integration type)
app.delete('/api/settings/api-keys/:integrationType', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { integrationType } = c.req.param();
        
        const database = new D1Database(c.env.DB);
        const success = await database.deleteApiKey(user.id, integrationType);
        
        if (success) {
            return c.json({ 
                success: true,
                message: 'API key revoked successfully'
            });
        } else {
            return c.json({ error: 'API key not found' }, 404);
        }
    } catch (error) {
        return c.json({ error: 'Failed to revoke API key' }, 500);
    }
});

// System settings endpoints
app.get('/api/admin/settings', authenticateToken, requireAdmin, async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        const settings = await database.getAllSystemSettings();
        
        // Add some default settings if they don't exist
        const settingsMap = {};
        settings.forEach(setting => {
            settingsMap[setting.setting_key] = setting.setting_value;
        });
        
        // Ensure we have registration setting
        if (!settingsMap.hasOwnProperty('registration_open')) {
            await database.setSystemSetting('registration_open', 'true');
            settingsMap.registration_open = 'true';
        }
        
        return c.json({
            settings: settingsMap,
            adminEmail: c.env.ADMIN_EMAIL || 'Not configured'
        });
    } catch (error) {
        return c.json({ error: 'Failed to fetch system settings' }, 500);
    }
});

app.post('/api/admin/settings', authenticateToken, requireAdmin, async (c) => {
    try {
        const { settings } = await c.req.json();
        const database = new D1Database(c.env.DB);
        
        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
            await database.setSystemSetting(key, value);
        }
        
        return c.json({ 
            success: true, 
            message: 'System settings updated successfully' 
        });
    } catch (error) {
        return c.json({ error: 'Failed to update system settings' }, 500);
    }
});

// Lightroom Plugin Endpoint
app.post('/api/lightroom/generate-caption', authenticateApiKey, async (c) => {
    try {
        const user = c.get('user');
        const { 
            base64Image, 
            includeWeather = false, 
            style = 'creative',
            filename,
            title,
            caption,
            keywords,
            rating,
            colorLabel,
            metadata = {}
        } = await c.req.json();
        
        if (!c.env.OPENAI_API_KEY) {
            return c.json({ error: 'OpenAI API key not configured' }, 500);
        }
        
        if (!base64Image) {
            return c.json({ error: 'Missing image data' }, 400);
        }

        // Check usage limits
        const database = new D1Database(c.env.DB);
        const usageCheck = await database.checkUsageLimit(user.id);
        if (!usageCheck.allowed) {
            return c.json({
                error: 'Daily usage limit exceeded',
                usageInfo: usageCheck
            }, 429);
        }
        
        // Build context from Lightroom metadata
        const context = [];
        if (filename) context.push('Filename: ' + filename);
        if (title) context.push('Title: ' + title);
        if (caption) context.push('Existing caption: ' + caption);
        if (keywords && keywords.length > 0) context.push('Keywords: ' + keywords.join(', '));
        if (rating) context.push('Rating: ' + rating + ' stars');
        if (colorLabel) context.push('Color label: ' + colorLabel);
        
        // Add technical metadata if available
        if (metadata.camera) context.push('Camera: ' + metadata.camera);
        if (metadata.lens) context.push('Lens: ' + metadata.lens);
        if (metadata.iso) context.push('ISO: ' + metadata.iso);
        if (metadata.aperture) context.push('Aperture: ' + metadata.aperture);
        if (metadata.shutterSpeed) context.push('Shutter Speed: ' + metadata.shutterSpeed);
        if (metadata.focalLength) context.push('Focal Length: ' + metadata.focalLength);
        if (metadata.dateTime) context.push('Date/Time: ' + metadata.dateTime);
        
        // Build enhanced prompt with context
        const contextString = context.length > 0 ? '\\n\\nAdditional Context from Lightroom:\\n' + context.join('\\n') : '';
        
        const styleInstructions = {
            creative: {
                tone: 'Uses artistic and expressive language with creative metaphors',
                description: 'creative and artistic'
            },
            professional: {
                tone: 'Uses clean, professional language suitable for business contexts',
                description: 'professional and business-friendly'
            },
            casual: {
                tone: 'Uses relaxed, conversational language like talking to a friend',
                description: 'casual and friendly'
            },
            trendy: {
                tone: 'Uses current trends, viral language, and popular internet expressions',
                description: 'trendy and viral'
            },
            inspirational: {
                tone: 'Uses motivational, uplifting, and encouraging language',
                description: 'inspirational and motivational'
            },
            humorous: {
                tone: 'Uses funny, witty language with clever wordplay, puns, or amusing observations. Keep it light-hearted and entertaining while being appropriate for social media. Think like a comedian describing the scene',
                description: 'funny and witty'
            },
            edgy: {
                tone: 'Uses short, dry, clever language that is a little dark. Keep it deadpan, sarcastic, or emotionally detached—but still tied to the image. No fluff, minimal emojis',
                description: 'edgy and unconventional'
            }
        };
        
        const selectedStyle = styleInstructions[style] || styleInstructions.creative;
        
        const prompt = 'Analyze this image for Instagram posting. Generate:\\n\\n' +
            '1. A ' + selectedStyle.description + ' caption that:\\n' +
            '   - Captures the main subject/scene\\n' +
            '   - ' + selectedStyle.tone + '\\n' +
            '   - Is 1-3 sentences\\n' +
            '   - Includes relevant emojis\\n' +
            '   - Feels authentic and natural (NO forced questions or call-to-actions)\\n' +
            '   - Sounds like something a real person would write\\n' +
            '   - IMPORTANT: Do NOT include any hashtags in the caption text\\n' +
            '   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n' +
            (context.length > 0 ? '   - Incorporates the provided Lightroom metadata naturally\\n' : '') +
            '\\n2. 10-15 hashtags that:\\n' +
            '   - Mix popular (#photography, #instagood) and niche tags\\n' +
            '   - Are relevant to image content\\n' +
            '   - Include location-based tags if applicable\\n' +
            '   - Avoid banned or shadowbanned hashtags\\n' +
            '   - Range from broad to specific\\n' +
            '   - These should be completely separate from the caption above\\n' +
            (context.length > 0 ? '   - Include relevant hashtags based on the Lightroom metadata provided\\n' : '') +
            '\\n3. Alt text for accessibility (1-2 sentences):\\n' +
            '   - Describe what is actually visible in the image\\n' +
            '   - Include important visual details for screen readers\\n' +
            '   - Focus on objective description, not interpretation\\n' +
            '   - Keep it concise but descriptive\\n' +
            contextString + '\\n\\n' +
            'Format your response as:\\n' +
            'CAPTION: [your caption here - NO hashtags allowed]\\n' +
            'HASHTAGS: [hashtags separated by spaces]\\n' +
            'ALT_TEXT: [descriptive alt text for accessibility]';

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + c.env.OPENAI_API_KEY
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: 'data:image/jpeg;base64,' + base64Image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            return c.json({ error: 'OpenAI API request failed: ' + response.status }, response.status);
        }

        const data = await response.json();
        const responseContent = data.choices[0].message.content;
        
        // Log the query and increment usage
        const queryId = generateRandomId();
        
        await database.logQuery({
            id: queryId,
            source: 'lightroom',
            userId: user.id,
            email: user.email,
            processingTimeMs: Date.now() - Date.now(), // Simplified
            responseLength: responseContent.length
        });
        
        await database.incrementDailyUsage(user.id);
        
        return c.json({ 
            success: true,
            content: responseContent,
            metadata: {
                filename,
                title,
                caption,
                keywords,
                rating,
                colorLabel,
                technical: metadata
            }
        });
        
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// Lightroom Upload Endpoint (for Export Service)
app.post('/api/lightroom/upload-photo', authenticateApiKey, async (c) => {
    try {
        const user = c.get('user');
        const { 
            base64Image, 
            filename,
            title,
            caption,
            keywords,
            rating,
            colorLabel,
            metadata = {}
        } = await c.req.json();
        
        if (!base64Image) {
            return c.json({ error: 'Missing image data' }, 400);
        }

        // Check usage limits
        const database = new D1Database(c.env.DB);
        const usageCheck = await database.checkUsageLimit(user.id);
        if (!usageCheck.allowed) {
            return c.json({
                error: 'Daily usage limit exceeded',
                usageInfo: usageCheck
            }, 429);
        }
        
        const photoId = generateRandomId();
        
        // For now, store image in R2 if available, otherwise just store metadata
        let r2Key = null;
        let fileSize = null;
        
        try {
            if (c.env.R2_BUCKET) {
                // Calculate file size from base64
                const imageBuffer = Buffer.from(base64Image, 'base64');
                fileSize = imageBuffer.length;
                
                // Generate R2 key: user_id/year/month/image_id.jpg
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                r2Key = `${user.id}/${year}/${month}/${photoId}.jpg`;
                
                // Store in R2
                await c.env.R2_BUCKET.put(r2Key, imageBuffer, {
                    httpMetadata: {
                        contentType: 'image/jpeg'
                    },
                    customMetadata: {
                        originalFilename: filename,
                        userId: user.id.toString(),
                        uploadedAt: new Date().toISOString()
                    }
                });
            } else {
                console.warn('No R2 bucket configured, storing metadata only');
                // For development without R2, we'll just store metadata
                r2Key = 'no-r2-bucket/' + photoId;
            }
        } catch (r2Error) {
            console.error('R2 storage failed, continuing with metadata only:', r2Error);
            r2Key = 'r2-failed/' + photoId;
        }
        
        // Store the image metadata in database
        const imageData = {
            id: photoId,
            userId: user.id,
            filename: filename,
            originalFilename: filename,
            title: title,
            caption: caption,
            keywords: keywords,
            rating: rating,
            colorLabel: colorLabel,
            metadata: metadata,
            mimeType: 'image/jpeg'
        };
        
        const stored = await database.storeUploadedImage(imageData, r2Key, fileSize);
        
        if (!stored) {
            return c.json({ error: 'Failed to store image metadata' }, 500);
        }
        
        // Log the upload
        await database.logQuery({
            id: photoId,
            source: 'lightroom_upload',
            userId: user.id,
            email: user.email,
            processingTimeMs: 0,
            responseLength: JSON.stringify({filename, title, caption}).length
        });
        
        await database.incrementDailyUsage(user.id);
        
        return c.json({ 
            success: true,
            id: photoId,
            message: 'Photo uploaded and stored successfully',
            filename: filename,
            uploadedAt: new Date().toISOString(),
            r2Stored: !!c.env.R2_BUCKET
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// API endpoints for uploaded images
app.get('/api/uploaded-images', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        const page = parseInt(c.req.query('page')) || 1;
        const limit = parseInt(c.req.query('limit')) || 20;
        const offset = (page - 1) * limit;
        
        const images = await database.getUserUploadedImages(user.id, limit, offset);
        
        return c.json({
            success: true,
            images: images,
            page: page,
            limit: limit
        });
    } catch (error) {
        console.error('Failed to get uploaded images:', error);
        return c.json({ error: 'Failed to retrieve images' }, 500);
    }
});

app.get('/api/uploaded-images/:imageId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { imageId } = c.req.param();
        const database = new D1Database(c.env.DB);
        
        const image = await database.getUploadedImageById(imageId, user.id);
        
        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }
        
        return c.json({
            success: true,
            image: image
        });
    } catch (error) {
        console.error('Failed to get uploaded image:', error);
        return c.json({ error: 'Failed to retrieve image' }, 500);
    }
});

app.get('/api/uploaded-images/:imageId/data', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { imageId } = c.req.param();
        const database = new D1Database(c.env.DB);
        
        const image = await database.getUploadedImageById(imageId, user.id);
        
        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }
        
        // Check if R2 bucket is available and image has r2_key
        if (image.r2_key && c.env.R2_BUCKET) {
            console.log('Attempting to fetch from R2:', image.r2_key);
            try {
                // Fetch image from R2
                const r2Object = await c.env.R2_BUCKET.get(image.r2_key);
                
                if (r2Object) {
                    console.log('Successfully fetched from R2');
                    // Return the image as binary data
                    const headers = new Headers();
                    headers.set('Content-Type', image.mime_type || 'image/jpeg');
                    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
                    
                    return new Response(r2Object.body, {
                        headers: headers
                    });
                } else {
                    console.log('R2 object not found for key:', image.r2_key);
                }
            } catch (r2Error) {
                console.warn('R2 fetch failed, trying fallback:', r2Error);
            }
        } else {
            console.log('Missing R2 data - r2_key:', !!image.r2_key, 'R2_BUCKET:', !!c.env.R2_BUCKET);
        }
        
        // Fallback: check for base64 image data in database (legacy support)
        if (image.image_data) {
            try {
                // Decode base64 to binary
                const imageBuffer = Uint8Array.from(atob(image.image_data), c => c.charCodeAt(0));
                
                const headers = new Headers();
                headers.set('Content-Type', image.mime_type || 'image/jpeg');
                headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
                
                return new Response(imageBuffer, {
                    headers: headers
                });
            } catch (decodeError) {
                console.error('Failed to decode base64 image:', decodeError);
            }
        }
        
        // No image data available
        return c.json({ error: 'Image data not available' }, 404);
        
    } catch (error) {
        console.error('Failed to get image data:', error);
        return c.json({ error: 'Failed to retrieve image data' }, 500);
    }
});

app.delete('/api/uploaded-images/:imageId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { imageId } = c.req.param();
        const database = new D1Database(c.env.DB);
        
        // Get image info first to retrieve R2 key
        const image = await database.getUploadedImageById(imageId, user.id);
        
        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }
        
        // Delete from R2 storage if r2_key exists
        if (image.r2_key && c.env.R2_BUCKET) {
            try {
                await c.env.R2_BUCKET.delete(image.r2_key);
                console.log('Deleted from R2:', image.r2_key);
            } catch (r2Error) {
                console.warn('Failed to delete from R2, continuing with database deletion:', r2Error);
            }
        }
        
        // Delete from database
        const deleted = await database.deleteUploadedImage(imageId, user.id);
        
        if (!deleted) {
            return c.json({ error: 'Image could not be deleted from database' }, 500);
        }
        
        return c.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete image:', error);
        return c.json({ error: 'Failed to delete image' }, 500);
    }
});

// Check for duplicate images by hash (Lightroom plugin endpoint)
app.get('/api/lightroom/check-duplicate', authenticateApiKey, async (c) => {
    try {
        const hash = c.req.query('hash');
        
        if (!hash || typeof hash !== 'string') {
            return c.json({ 
                error: 'Hash parameter is required' 
            }, 400);
        }
        
        // Initialize database
        const database = new D1Database(c.env.DB);
        await database.ensureInitialized();
        
        // Get user from authentication
        const user = c.get('user');
        
        // Check if image with this hash exists for the user
        const existingImage = await database.getImageByHash(user.id, hash);
        
        if (existingImage) {
            return c.json({
                exists: true,
                id: existingImage.id,
                filename: existingImage.filename || existingImage.original_filename || 'Unknown'
            });
        } else {
            return c.json({
                exists: false
            });
        }
        
    } catch (error) {
        console.error('Duplicate check error:', error);
        return c.json({ 
            error: 'Internal server error during duplicate check' 
        }, 500);
    }
});

// Download endpoints
app.get('/api/download/lightroom-plugin', async (c) => {
    try {
        if (!c.env.R2_BUCKET) {
            return c.json({ error: 'Download service not available' }, 503);
        }
        
        // Fetch plugin zip from R2
        const r2Object = await c.env.R2_BUCKET.get('downloads/lightroom-plugin.zip');
        
        if (!r2Object) {
            return c.json({ error: 'Plugin file not found' }, 404);
        }
        
        // Return the zip file as binary data
        const headers = new Headers();
        headers.set('Content-Type', 'application/zip');
        headers.set('Content-Disposition', 'attachment; filename="AI Caption Studio Export Plugin.zip"');
        headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        
        return new Response(r2Object.body, {
            headers: headers
        });
    } catch (error) {
        console.error('Failed to serve plugin download:', error);
        return c.json({ error: 'Failed to download plugin' }, 500);
    }
});

// Social media integration endpoints
app.get('/api/user/settings/social', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Get social media settings for the user
        const settings = await database.getUserSettings(user.id, 'social');
        
        const socialSettings = {
            mastodon: {},
            pixelfed: {},
            linkedin: {},
            instagram: {},
        };
        
        settings.forEach(setting => {
            const [platform, ...keyParts] = setting.setting_key.split('_');
            const key = keyParts.join('_'); // Rejoin the remaining parts to preserve full key name
            
            if (platform === 'mastodon') {
                socialSettings.mastodon[key] = setting.encrypted ? '••••••••••••••••' : setting.setting_value;
            } else if (platform === 'pixelfed') {
                socialSettings.pixelfed[key] = setting.encrypted ? '••••••••••••••••' : setting.setting_value;
            } else if (platform === 'linkedin') {
                socialSettings.linkedin[key] = setting.encrypted ? '••••••••••••••••' : setting.setting_value;
            } else if (platform === 'instagram') {
                socialSettings.instagram[key] = setting.encrypted ? '••••••••••••••••' : setting.setting_value;
            }
        });
        
        // Instagram integration working correctly
        
        return c.json(socialSettings);
    } catch (error) {
        console.error('Social settings error:', error);
        return c.json({ error: 'Failed to load social settings' }, 500);
    }
});

app.post('/api/user/settings/test-mastodon', authenticateToken, async (c) => {
    try {
        const { instance, token } = await c.req.json();
        
        if (!instance || !token) {
            return c.json({ error: 'Instance URL and token are required' }, 400);
        }
        
        // Test Mastodon connection
        const testUrl = `${instance}/api/v1/accounts/verify_credentials`;
        const response = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            return c.json({ 
                success: true, 
                message: `Connected as @${userData.username}` 
            });
        } else {
            return c.json({ 
                success: false, 
                error: 'Invalid credentials or instance URL' 
            });
        }
    } catch (error) {
        return c.json({ 
            success: false, 
            error: 'Connection test failed: ' + error.message 
        });
    }
});

app.post('/api/user/settings/mastodon', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { instance, token } = await c.req.json();
        
        if (!instance || !token) {
            return c.json({ error: 'Instance URL and token are required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Save Mastodon settings
        const instanceResult = await database.setUserSetting(user.id, 'social', 'mastodon_instance', instance, false);
        const tokenResult = await database.setUserSetting(user.id, 'social', 'mastodon_token', token, true);
        
        if (instanceResult && tokenResult) {
            return c.json({ success: true, message: 'Mastodon settings saved' });
        } else {
            return c.json({ error: 'Failed to save one or more settings' }, 500);
        }
    } catch (error) {
        return c.json({ error: 'Failed to save Mastodon settings: ' + error.message }, 500);
    }
});

app.delete('/api/user/settings/mastodon', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Delete Mastodon settings
        await database.deleteUserSetting(user.id, 'social', 'mastodon_instance');
        await database.deleteUserSetting(user.id, 'social', 'mastodon_token');
        
        return c.json({ success: true, message: 'Mastodon disconnected' });
    } catch (error) {
        return c.json({ error: 'Failed to disconnect Mastodon' }, 500);
    }
});

// Location settings endpoints
app.post('/api/settings/location', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { locationZoom } = await c.req.json();
        
        if (!locationZoom || locationZoom < 1 || locationZoom > 18) {
            return c.json({ error: 'Location zoom must be between 1 and 18' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Save location zoom setting
        const result = await database.setUserSetting(user.id, 'location', 'zoom_level', locationZoom.toString(), false);
        
        if (result) {
            return c.json({ success: true, message: 'Location settings saved' });
        } else {
            return c.json({ error: 'Failed to save location settings' }, 500);
        }
    } catch (error) {
        return c.json({ error: 'Failed to save location settings: ' + error.message }, 500);
    }
});

app.get('/api/settings/mastodon', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        const settings = await database.getUserSettings(user.id, 'social');
        const mastodonSettings = {};
        
        settings.forEach(setting => {
            if (setting.setting_key === 'mastodon_instance') {
                mastodonSettings.instance = setting.setting_value;
            } else if (setting.setting_key === 'mastodon_token') {
                mastodonSettings.token = setting.encrypted ? '••••••••' : setting.setting_value;
            }
        });
        
        return c.json(mastodonSettings);
    } catch (error) {
        return c.json({ error: 'Failed to load Mastodon settings: ' + error.message }, 500);
    }
});

app.get('/api/settings', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Get location settings
        const locationSettings = await database.getUserSettings(user.id, 'location');
        const settings = {};
        
        locationSettings.forEach(setting => {
            if (setting.setting_key === 'zoom_level') {
                settings.locationZoom = parseInt(setting.setting_value) || 18;
            }
        });
        
        // Default to zoom level 18 if not set
        if (!settings.locationZoom) {
            settings.locationZoom = 18;
        }
        
        return c.json(settings);
    } catch (error) {
        return c.json({ error: 'Failed to load settings: ' + error.message }, 500);
    }
});

// Custom Prompts API Endpoints
app.get('/api/custom-prompts', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        const prompts = await database.getUserCustomPrompts(user.id);
        return c.json(prompts);
    } catch (error) {
        console.error('Failed to get custom prompts:', error);
        return c.json({ error: 'Failed to load custom prompts' }, 500);
    }
});

app.post('/api/custom-prompts', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { name, description, promptText, icon } = await c.req.json();
        
        if (!name || !promptText) {
            return c.json({ error: 'Name and prompt text are required' }, 400);
        }
        
        if (name.length > 50) {
            return c.json({ error: 'Name must be 50 characters or less' }, 400);
        }
        
        if (promptText.length > 2000) {
            return c.json({ error: 'Prompt text must be 2000 characters or less' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        const promptId = await database.createCustomPrompt(
            user.id, 
            name, 
            description || '', 
            promptText, 
            icon || '✨'
        );
        
        if (promptId) {
            const newPrompt = await database.getCustomPromptById(promptId, user.id);
            return c.json(newPrompt);
        } else {
            return c.json({ error: 'Failed to create custom prompt' }, 500);
        }
    } catch (error) {
        console.error('Failed to create custom prompt:', error);
        return c.json({ error: 'Failed to create custom prompt' }, 500);
    }
});

app.put('/api/custom-prompts/:promptId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const promptId = parseInt(c.req.param('promptId'));
        const { name, description, promptText, icon } = await c.req.json();
        
        if (!name || !promptText) {
            return c.json({ error: 'Name and prompt text are required' }, 400);
        }
        
        if (name.length > 50) {
            return c.json({ error: 'Name must be 50 characters or less' }, 400);
        }
        
        if (promptText.length > 2000) {
            return c.json({ error: 'Prompt text must be 2000 characters or less' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        const success = await database.updateCustomPrompt(
            promptId, 
            user.id, 
            name, 
            description || '', 
            promptText, 
            icon || '✨'
        );
        
        if (success) {
            const updatedPrompt = await database.getCustomPromptById(promptId, user.id);
            return c.json(updatedPrompt);
        } else {
            return c.json({ error: 'Custom prompt not found or permission denied' }, 404);
        }
    } catch (error) {
        console.error('Failed to update custom prompt:', error);
        return c.json({ error: 'Failed to update custom prompt' }, 500);
    }
});

app.delete('/api/custom-prompts/:promptId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const promptId = parseInt(c.req.param('promptId'));
        const database = new D1Database(c.env.DB);
        
        const success = await database.deleteCustomPrompt(promptId, user.id);
        
        if (success) {
            return c.json({ message: 'Custom prompt deleted successfully' });
        } else {
            return c.json({ error: 'Custom prompt not found or permission denied' }, 404);
        }
    } catch (error) {
        console.error('Failed to delete custom prompt:', error);
        return c.json({ error: 'Failed to delete custom prompt' }, 500);
    }
});

app.post('/api/user/post/mastodon', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { status, alt_text, image_data } = await c.req.json();
        const database = new D1Database(c.env.DB);
        
        if (!status) {
            return c.json({ error: 'Status text is required' }, 400);
        }
        
        // Get user's Mastodon settings
        const settings = await database.getUserSettings(user.id, 'social');
        let mastodonInstance = null;
        let mastodonToken = null;
        
        settings.forEach(setting => {
            if (setting.setting_key === 'mastodon_instance') {
                mastodonInstance = setting.setting_value;
            } else if (setting.setting_key === 'mastodon_token') {
                mastodonToken = setting.setting_value;
            }
        });
        
        if (!mastodonInstance || !mastodonToken) {
            return c.json({ error: 'Mastodon account not properly configured' }, 400);
        }
        
        // First upload the image if provided
        let mediaId = null;
        if (image_data) {
            try {
                // Convert base64 to binary for upload
                const imageBuffer = Buffer.from(image_data, 'base64');
                
                const mediaFormData = new FormData();
                mediaFormData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }));
                if (alt_text) {
                    mediaFormData.append('description', alt_text);
                }
                
                const mediaResponse = await fetch(`${mastodonInstance}/api/v1/media`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${mastodonToken}`
                    },
                    body: mediaFormData
                });
                
                if (mediaResponse.ok) {
                    const mediaResult = await mediaResponse.json();
                    mediaId = mediaResult.id;
                } else {
                }
            } catch (mediaError) {
                // Continue without media if upload fails
            }
        }
        
        // Create the status post
        const postData = {
            status: status,
            visibility: 'public'
        };
        
        if (mediaId) {
            postData.media_ids = [mediaId];
        }
        
        const postResponse = await fetch(`${mastodonInstance}/api/v1/statuses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mastodonToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (postResponse.ok) {
            const postResult = await postResponse.json();
            
            return c.json({ 
                success: true, 
                message: 'Posted to Mastodon successfully!',
                url: postResult.url,
                id: postResult.id
            });
        } else {
            const errorText = await postResponse.text();
            return c.json({ 
                error: 'Failed to create post on Mastodon: ' + postResponse.status 
            }, 500);
        }
        
    } catch (error) {
        return c.json({ error: 'Failed to post to Mastodon: ' + error.message }, 500);
    }
});

// Pixelfed API endpoints
app.post('/api/user/settings/test-pixelfed', authenticateToken, async (c) => {
    try {
        const { instance, token } = await c.req.json();
        
        if (!instance || !token) {
            return c.json({ error: 'Instance URL and token are required' }, 400);
        }
        
        // Test Pixelfed connection using Mastodon-compatible API
        const testUrl = `${instance}/api/v1/accounts/verify_credentials`;
        const response = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const accountData = await response.json();
            return c.json({ 
                success: true, 
                username: accountData.username || accountData.display_name,
                account_id: accountData.id
            });
        } else {
            const errorText = await response.text();
            return c.json({ 
                error: 'Failed to verify credentials: ' + response.status 
            }, 400);
        }
        
    } catch (error) {
        return c.json({ error: 'Failed to test connection: ' + error.message }, 500);
    }
});

app.post('/api/user/settings/pixelfed', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { instance, token } = await c.req.json();
        
        if (!instance || !token) {
            return c.json({ error: 'Instance URL and token are required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Test the connection first
        const testUrl = `${instance}/api/v1/accounts/verify_credentials`;
        const testResponse = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!testResponse.ok) {
            return c.json({ error: 'Failed to verify Pixelfed credentials' }, 400);
        }
        
        // Save settings
        await database.setUserSetting(user.id, 'social', 'pixelfed_instance', instance, false);
        await database.setUserSetting(user.id, 'social', 'pixelfed_token', token, true);
        
        return c.json({ success: true });
        
    } catch (error) {
        return c.json({ error: 'Failed to save settings: ' + error.message }, 500);
    }
});

app.delete('/api/user/settings/pixelfed', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        await database.deleteUserSetting(user.id, 'social', 'pixelfed_instance');
        await database.deleteUserSetting(user.id, 'social', 'pixelfed_token');
        
        return c.json({ success: true });
        
    } catch (error) {
        return c.json({ error: 'Failed to delete settings: ' + error.message }, 500);
    }
});

app.post('/api/user/post/pixelfed', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { status, alt_text, image_data } = await c.req.json();
        const database = new D1Database(c.env.DB);
        
        if (!status) {
            return c.json({ error: 'Status text is required' }, 400);
        }
        
        // Get user's Pixelfed settings
        const settings = await database.getUserSettings(user.id, 'social');
        let pixelfedInstance = null;
        let pixelfedToken = null;
        
        settings.forEach(setting => {
            if (setting.setting_key === 'pixelfed_instance') {
                pixelfedInstance = setting.setting_value;
            } else if (setting.setting_key === 'pixelfed_token') {
                pixelfedToken = setting.setting_value;
            }
        });
        
        if (!pixelfedInstance || !pixelfedToken) {
            return c.json({ error: 'Pixelfed account not properly configured' }, 400);
        }
        
        // First upload the image if provided
        let mediaId = null;
        if (image_data) {
            try {
                // Convert base64 to binary for upload
                const imageBuffer = Buffer.from(image_data, 'base64');
                
                const mediaFormData = new FormData();
                mediaFormData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }));
                if (alt_text) {
                    mediaFormData.append('description', alt_text);
                }
                
                const mediaResponse = await fetch(`${pixelfedInstance}/api/v1/media`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${pixelfedToken}`
                    },
                    body: mediaFormData
                });
                
                if (mediaResponse.ok) {
                    const mediaResult = await mediaResponse.json();
                    mediaId = mediaResult.id;
                } else {
                    const errorText = await mediaResponse.text();
                    return c.json({ 
                        error: 'Failed to upload image to Pixelfed: ' + mediaResponse.status 
                    }, 500);
                }
            } catch (uploadError) {
                return c.json({ 
                    error: 'Failed to process image upload: ' + uploadError.message 
                }, 500);
            }
        }
        
        // Create the post
        const postData = {
            status: status,
            visibility: 'public'
        };
        
        if (mediaId) {
            postData.media_ids = [mediaId];
        }
        
        const postResponse = await fetch(`${pixelfedInstance}/api/v1/statuses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pixelfedToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (postResponse.ok) {
            const postResult = await postResponse.json();
            
            return c.json({ 
                success: true, 
                message: 'Posted to Pixelfed successfully!',
                url: postResult.url,
                id: postResult.id
            });
        } else {
            const errorText = await postResponse.text();
            return c.json({ 
                error: 'Failed to create post on Pixelfed: ' + postResponse.status 
            }, 500);
        }
        
    } catch (error) {
        return c.json({ error: 'Failed to post to Pixelfed: ' + error.message }, 500);
    }
});


// Instagram API endpoints
app.post('/api/user/settings/test-instagram', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Get user's Instagram settings
        const settings = await database.getUserSettings(user.id, 'social');
        let instagramAccessToken = null;
        
        console.log(`Debug: Found ${settings.length} social settings for user ${user.id}`);
        
        settings.forEach(setting => {
            console.log(`Debug: Setting ${setting.setting_key} = ${setting.setting_value ? 'EXISTS' : 'NULL'}`);
            if (setting.setting_key === 'instagram_access_token') {
                instagramAccessToken = setting.setting_value;
            }
        });
        
        if (!instagramAccessToken) {
            console.log('Debug: No Instagram access token found');
            return c.json({ error: 'Instagram not connected' }, 400);
        }
        
        console.log('Debug: Instagram access token found, testing connection...');
        
        // Test Instagram connection by getting account info
        // For Instagram Business API, we need to get the business account ID first
        let testUrl, testResponse;
        
        // First try Instagram Basic Display API
        testUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${instagramAccessToken}`;
        testResponse = await fetch(testUrl);
        
        if (testResponse.ok) {
            const data = await testResponse.json();
            return c.json({ 
                success: true, 
                message: 'Instagram connection test successful',
                account: {
                    id: data.id,
                    username: data.username,
                    account_type: data.account_type || 'BUSINESS'
                }
            });
        } else {
            // If Basic Display fails, try Facebook Graph API for business accounts
            testUrl = `https://graph.facebook.com/me/accounts?access_token=${instagramAccessToken}`;
            testResponse = await fetch(testUrl);
            
            if (testResponse.ok) {
                const fbData = await testResponse.json();
                return c.json({ 
                    success: true, 
                    message: 'Instagram connection test successful (via Facebook)',
                    accounts: fbData.data?.length || 0
                });
            } else {
                const errorText = await testResponse.text();
                console.error('Instagram test failed:', errorText);
                return c.json({ 
                    error: `Failed to verify Instagram credentials: ${testResponse.status} - ${errorText}` 
                }, 400);
            }
        }
        
    } catch (error) {
        return c.json({ error: 'Failed to test Instagram connection: ' + error.message }, 500);
    }
});

app.post('/api/user/settings/instagram', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { access_token, user_id, username, account_type, autoPost } = await c.req.json();
        
        if (!access_token) {
            return c.json({ error: 'Access token is required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Save Instagram settings
        await database.setUserSetting(user.id, 'social', 'instagram_access_token', access_token, true);
        await database.setUserSetting(user.id, 'social', 'instagram_user_id', user_id || '', false);
        await database.setUserSetting(user.id, 'social', 'instagram_username', username || '', false);
        await database.setUserSetting(user.id, 'social', 'instagram_account_type', account_type || 'business', false);
        await database.setUserSetting(user.id, 'social', 'instagram_autopost', autoPost ? 'true' : 'false', false);
        
        return c.json({ success: true, message: 'Instagram settings saved successfully' });
        
    } catch (error) {
        return c.json({ error: 'Failed to save Instagram settings: ' + error.message }, 500);
    }
});

app.delete('/api/user/settings/instagram', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Delete Instagram settings
        await database.deleteUserSetting(user.id, 'social', 'instagram_access_token');
        await database.deleteUserSetting(user.id, 'social', 'instagram_username');
        await database.deleteUserSetting(user.id, 'social', 'instagram_account_type');
        await database.deleteUserSetting(user.id, 'social', 'instagram_autopost');
        
        return c.json({ success: true });
        
    } catch (error) {
        return c.json({ error: 'Failed to delete Instagram settings: ' + error.message }, 500);
    }
});

// Instagram OAuth callback handler
app.get('/auth/instagram/callback', async (c) => {
    try {
        const code = c.req.query('code');
        const error = c.req.query('error');
        const state = c.req.query('state'); // Optional: for CSRF protection
        
        if (error) {
            return c.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>❌ Instagram Authorization Failed</h2>
                    <p>Error: ${error}</p>
                    <p>Description: ${c.req.query('error_description') || 'Unknown error'}</p>
                    <a href="/settings.html" style="color: #405de6;">← Back to Settings</a>
                </div>
            `);
        }
        
        if (!code) {
            return c.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>❌ Missing Authorization Code</h2>
                    <p>No authorization code received from Instagram.</p>
                    <a href="/settings.html" style="color: #405de6;">← Back to Settings</a>
                </div>
            `);
        }
        
        // Exchange authorization code for access token
        if (c.env.INSTAGRAM_APP_SECRET) {
            try {
                console.log('Attempting Instagram token exchange with code:', code.substring(0, 10) + '...');
                
                // Exchange code for Instagram access token
                const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: '1430176351425887',
                        client_secret: c.env.INSTAGRAM_APP_SECRET,
                        redirect_uri: 'https://ai-caption-studio.jonsson.workers.dev/auth/instagram/callback',
                        code: code,
                        grant_type: 'authorization_code'
                    })
                });

                console.log('Token exchange response status:', tokenResponse.status);
                
                if (tokenResponse.ok) {
                    const tokenData = await tokenResponse.json();
                    console.log('Token exchange successful');
                    const accessToken = tokenData.access_token;
                    
                    // Step 0: Exchange short-lived token for long-lived token
                    console.log('Exchanging for long-lived Instagram token...');
                    const longLivedTokenResponse = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${c.env.INSTAGRAM_APP_SECRET}&access_token=${accessToken}`);
                    
                    let finalAccessToken = accessToken;
                    let tokenExpiresIn = 3600; // Default 1 hour for short-lived tokens
                    
                    if (longLivedTokenResponse.ok) {
                        const longLivedData = await longLivedTokenResponse.json();
                        console.log('Long-lived token exchange successful, expires in:', longLivedData.expires_in, 'seconds');
                        finalAccessToken = longLivedData.access_token;
                        tokenExpiresIn = longLivedData.expires_in; // Usually 60 days (5184000 seconds)
                    } else {
                        const errorData = await longLivedTokenResponse.text();
                        console.warn('Long-lived token exchange failed, using short-lived token:', errorData);
                    }
                    
                    // For Instagram Business API, we need to get the Instagram Business Account ID
                    // This is different from the personal Instagram account ID
                    
                    // Step 1: Get user's connected accounts
                    const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?access_token=${finalAccessToken}`);
                    
                    let instagramBusinessAccountId = null;
                    let instagramUsername = 'Unknown';
                    let instagramAccountType = 'Business';
                    
                    if (pagesResponse.ok) {
                        const pagesData = await pagesResponse.json();
                        console.log('Connected accounts retrieved successfully');
                        
                        // Step 2: Find Instagram Business Account connected to the Facebook page
                        for (const page of pagesData.data || []) {
                            try {
                                const igAccountResponse = await fetch(`https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${finalAccessToken}`);
                                if (igAccountResponse.ok) {
                                    const igAccountData = await igAccountResponse.json();
                                    if (igAccountData.instagram_business_account) {
                                        instagramBusinessAccountId = igAccountData.instagram_business_account.id;
                                        
                                        // Get Instagram account details
                                        const igDetailsResponse = await fetch(`https://graph.facebook.com/${instagramBusinessAccountId}?fields=username,account_type&access_token=${finalAccessToken}`);
                                        if (igDetailsResponse.ok) {
                                            const igDetailsData = await igDetailsResponse.json();
                                            instagramUsername = igDetailsData.username || 'Unknown';
                                            instagramAccountType = igDetailsData.account_type || 'Business';
                                        }
                                        break;
                                    }
                                }
                            } catch (e) {
                                console.log('Failed to check Instagram account for page:', page.id);
                            }
                        }
                    }
                    
                    // Fallback: try to get personal Instagram account info if no business account found
                    if (!instagramBusinessAccountId) {
                        const userResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${finalAccessToken}`);
                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            instagramBusinessAccountId = userData.id;
                            instagramUsername = userData.username || 'Unknown';
                            instagramAccountType = userData.account_type || 'Business';
                            console.log('Using personal Instagram account ID as fallback');
                        }
                    }
                    
                    if (instagramBusinessAccountId) {
                        console.log('Instagram Business Account ID found:', instagramBusinessAccountId);
                        
                        // Save Instagram credentials to database
                        const database = new D1Database(c.env.DB);
                        
                        // Extract user ID from state parameter
                        const state = c.req.query('state');
                        let userId = null;
                        
                        if (state && state.includes('_')) {
                            // State format: "userId_randomString"
                            userId = parseInt(state.split('_')[0]);
                        }
                        
                        if (!userId) {
                            // Fallback: get the most recent user (not ideal but prevents errors)
                            const userQuery = await database.db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').first();
                            if (userQuery) {
                                userId = userQuery.id;
                            }
                        }
                        
                        if (userId) {
                            try {
                                // Calculate token expiration date
                                const expiresAt = new Date(Date.now() + (tokenExpiresIn * 1000)).toISOString();
                                
                                // Save Instagram access token (long-lived)
                                await database.setUserSetting(userId, 'social', 'instagram_access_token', finalAccessToken, true);
                                
                                // Save token expiration date
                                await database.setUserSetting(userId, 'social', 'instagram_token_expires_at', expiresAt, false);
                                
                                // Save Instagram Business Account ID (this is what we need for posting)
                                await database.setUserSetting(userId, 'social', 'instagram_account_id', instagramBusinessAccountId, false);
                                
                                // Save Instagram username
                                await database.setUserSetting(userId, 'social', 'instagram_username', instagramUsername, false);
                                
                                // Save Instagram account type
                                await database.setUserSetting(userId, 'social', 'instagram_account_type', instagramAccountType, false);
                            } catch (saveError) {
                                console.error('❌ Error saving Instagram settings:', saveError);
                                throw saveError;
                            }
                        }
                        
                        return c.html(`
                            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                                <h2>✅ Instagram Connected Successfully!</h2>
                                <p>Your Instagram business account @${instagramUsername} is now connected.</p>
                                <p>Account Type: ${instagramAccountType}</p>
                                <p>Business Account ID: ${instagramBusinessAccountId}</p>
                                <p>Token Type: ${tokenExpiresIn > 86400 ? 'Long-lived (60 days)' : 'Short-lived (1 hour)'}</p>
                                <p>Expires: ${new Date(Date.now() + (tokenExpiresIn * 1000)).toLocaleDateString()}</p>
                                <p>Redirecting you back to settings...</p>
                                
                                <script>
                                    setTimeout(() => {
                                        window.location.href = '/settings.html';
                                    }, 2000);
                                </script>
                            </div>
                        `);
                    } else {
                        return c.html(`
                            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                                <h2>⚠️ Instagram Business Account Not Found</h2>
                                <p>Could not find an Instagram Business Account connected to your account.</p>
                                <p>Please ensure your Instagram account is:</p>
                                <ul style="text-align: left; max-width: 400px; margin: 20px auto;">
                                    <li>Set to Business or Creator account type</li>
                                    <li>Connected to a Facebook page</li>
                                    <li>Properly configured for business use</li>
                                </ul>
                                <a href="/settings.html" style="color: #405de6;">← Back to Settings</a>
                            </div>
                        `);
                    }
                } else {
                    const errorData = await tokenResponse.text();
                    console.error('Token exchange failed:', tokenResponse.status, errorData);
                    
                    return c.html(`
                        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                            <h2>❌ Instagram Token Exchange Failed</h2>
                            <p>Failed to exchange authorization code for access token.</p>
                            <p>Status: ${tokenResponse.status}</p>
                            <p>Error: ${errorData}</p>
                            <a href="/settings.html">← Back to Settings</a>
                        </div>
                    `);
                }
            } catch (error) {
                console.error('Token exchange error:', error);
                
                return c.html(`
                    <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                        <h2>❌ Instagram Token Exchange Error</h2>
                        <p>An error occurred during token exchange.</p>
                        <p>Error: ${error.message}</p>
                        <a href="/settings.html">← Back to Settings</a>
                    </div>
                `);
            }
        } else {
            return c.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>⚠️ Configuration Missing</h2>
                    <p>INSTAGRAM_APP_SECRET not configured in environment.</p>
                    <a href="/settings.html">← Back to Settings</a>
                </div>
            `);
        }
        
        return c.html(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>✅ Instagram Authorization Successful</h2>
                <p>Your Instagram business account has been authorized!</p>
                <p>Redirecting you back to settings...</p>
                
                <div style="margin: 20px 0;">
                    <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #405de6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
                
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                
                <script>
                    // Store the authorization code for backend processing
                    localStorage.setItem('instagram_auth_code', '${code}');
                    
                    // Redirect to settings page
                    setTimeout(() => {
                        window.location.href = '/settings.html';
                    }, 2000);
                </script>
            </div>
        `);
        
    } catch (error) {
        return c.html(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>❌ OAuth Callback Error</h2>
                <p>An error occurred while processing the Instagram authorization.</p>
                <a href="/settings.html" style="color: #405de6;">← Back to Settings</a>
            </div>
        `);
    }
});


app.post('/api/user/post/instagram', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { caption, image_data, imageId } = await c.req.json();
        const database = new D1Database(c.env.DB);
        
        if (!caption) {
            return c.json({ error: 'Caption is required' }, 400);
        }
        
        if (!image_data && !imageId) {
            return c.json({ error: 'Either image data or image ID is required for Instagram posts' }, 400);
        }
        
        // Get user's Instagram settings
        const settings = await database.getUserSettings(user.id, 'social');
        let instagramAccessToken = null;
        let instagramAccountId = null;
        
        settings.forEach(setting => {
            if (setting.setting_key === 'instagram_access_token') {
                instagramAccessToken = setting.setting_value;
            } else if (setting.setting_key === 'instagram_account_id') {
                instagramAccountId = setting.setting_value;
            }
        });
        
        if (!instagramAccessToken) {
            return c.json({ error: 'Instagram account not properly configured' }, 400);
        }
        
        // Note: This is a simplified implementation
        // In a real implementation, you would need to:
        // 1. Upload the image to a public URL (using R2 or similar)
        // 2. Use the Instagram Graph API two-step process:
        //    - Create media container
        //    - Publish the container
        
        // Step 1: Get image buffer (either from base64 data or existing R2 image)
        let imageBuffer;
        let contentType = 'image/jpeg';
        
        if (imageId) {
            // Fetch existing image from database and R2
            const image = await database.getUploadedImageById(imageId, user.id);
            if (!image) {
                return c.json({ error: 'Image not found' }, 404);
            }
            
            if (!image.r2_key) {
                return c.json({ error: 'Image not available in storage' }, 400);
            }
            
            // Fetch the image from R2
            const r2Object = await c.env.R2_BUCKET.get(image.r2_key);
            if (!r2Object) {
                return c.json({ error: 'Image file not found in storage' }, 404);
            }
            
            imageBuffer = await r2Object.arrayBuffer();
            contentType = image.mime_type || 'image/jpeg';
        } else {
            // Use provided base64 image data
            imageBuffer = Buffer.from(image_data, 'base64');
        }
        
        // Upload image to Instagram posts folder for public access
        const imageKey = `instagram-posts/${Date.now()}-${user.id}.jpg`;
        
        try {
            await c.env.R2_BUCKET.put(imageKey, imageBuffer, {
                httpMetadata: {
                    contentType: contentType
                }
            });
            
            // For Instagram posting, we need a publicly accessible URL
            // Use our Worker to serve the image publicly since R2 bucket may not have public access
            const publicImageUrl = `https://ai-caption-studio.jonsson.workers.dev/public-image/${imageKey}`;
            
            // Wait a moment to ensure image is fully available
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 2: Create Instagram media container
            
            const containerResponse = await fetch(`https://graph.instagram.com/${instagramAccountId}/media`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_url: publicImageUrl,
                    caption: caption,
                    access_token: instagramAccessToken
                })
            });
            
            if (!containerResponse.ok) {
                const errorData = await containerResponse.json();
                return c.json({ 
                    success: false,
                    error: 'Failed to create Instagram media container: ' + (errorData.error?.message || JSON.stringify(errorData))
                }, 500);
            }
            
            const containerData = await containerResponse.json();
            const containerId = containerData.id;
            
            // Step 3: Publish the container
            const publishResponse = await fetch(`https://graph.instagram.com/${instagramAccountId}/media_publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    creation_id: containerId,
                    access_token: instagramAccessToken
                })
            });
            
            if (publishResponse.ok) {
                const publishData = await publishResponse.json();
                
                // Clean up temporary image after successful post
                await c.env.R2_BUCKET.delete(imageKey);
                
                return c.json({ 
                    success: true, 
                    message: 'Posted to Instagram successfully!',
                    id: publishData.id
                });
            } else {
                const errorData = await publishResponse.json();
                return c.json({ 
                    success: false,
                    error: 'Failed to publish Instagram post: ' + (errorData.error?.message || publishResponse.status)
                }, 500);
            }
            
        } catch (uploadError) {
            return c.json({ 
                success: false,
                error: 'Failed to upload image: ' + uploadError.message
            }, 500);
        }
        
    } catch (error) {
        return c.json({ error: 'Failed to post to Instagram: ' + error.message }, 500);
    }
});

// Instagram token refresh function
async function refreshInstagramToken(accessToken, env) {
    try {
        console.log('Refreshing Instagram long-lived token...');
        
        // Refresh the long-lived token (extends expiration by another 60 days)
        const refreshResponse = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`);
        
        if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('Token refresh successful, new expiration:', refreshData.expires_in, 'seconds');
            
            return {
                success: true,
                access_token: refreshData.access_token,
                expires_in: refreshData.expires_in,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString()
            };
        } else {
            const errorData = await refreshResponse.text();
            console.error('Token refresh failed:', errorData);
            
            return {
                success: false,
                error: errorData
            };
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Check and refresh Instagram tokens that are nearing expiration
async function checkAndRefreshInstagramTokens(database, env) {
    const result = {
        usersChecked: 0,
        tokensRefreshed: 0,
        tokensExpiringSoon: 0,
        errors: [],
        details: []
    };
    
    try {
        console.log('Checking Instagram tokens for expiration...');
        
        // Get all users with Instagram tokens
        const stmt = database.db.prepare(`
            SELECT DISTINCT user_id 
            FROM user_settings 
            WHERE integration_type = 'social' 
            AND setting_key = 'instagram_access_token'
            AND setting_value IS NOT NULL 
            AND setting_value != ''
        `);
        
        const users = await stmt.all();
        const userList = users.results || [];
        
        console.log(`Found ${userList.length} users with Instagram tokens`);
        result.usersChecked = userList.length;
        
        for (const userRow of userList) {
            const userId = userRow.user_id;
            
            try {
                // Get user's Instagram settings
                const settings = await database.getUserSettings(userId, 'social');
                let accessToken = null;
                let expiresAt = null;
                
                settings.forEach(setting => {
                    if (setting.setting_key === 'instagram_access_token') {
                        accessToken = setting.setting_value;
                    } else if (setting.setting_key === 'instagram_token_expires_at') {
                        expiresAt = setting.setting_value;
                    }
                });
                
                if (!accessToken || !expiresAt) {
                    console.log(`User ${userId}: Missing token or expiration date, skipping`);
                    result.details.push({ userId, status: 'skipped', reason: 'Missing token or expiration date' });
                    continue;
                }
                
                const expirationDate = new Date(expiresAt);
                const now = new Date();
                const daysUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                
                console.log(`User ${userId}: Token expires in ${daysUntilExpiration.toFixed(1)} days`);
                
                // Refresh if token expires within 7 days
                if (daysUntilExpiration <= 7) {
                    result.tokensExpiringSoon++;
                    console.log(`User ${userId}: Refreshing token (expires soon)`);
                    
                    const refreshResult = await refreshInstagramToken(accessToken, env);
                    
                    if (refreshResult.success) {
                        // Update token and expiration date in database
                        await database.setUserSetting(userId, 'social', 'instagram_access_token', refreshResult.access_token, true);
                        await database.setUserSetting(userId, 'social', 'instagram_token_expires_at', refreshResult.expires_at, false);
                        
                        result.tokensRefreshed++;
                        console.log(`User ${userId}: Token refreshed successfully, new expiration: ${refreshResult.expires_at}`);
                        result.details.push({ 
                            userId, 
                            status: 'refreshed', 
                            oldExpiration: expiresAt,
                            newExpiration: refreshResult.expires_at,
                            daysUntilExpiration: daysUntilExpiration.toFixed(1)
                        });
                    } else {
                        console.error(`User ${userId}: Token refresh failed:`, refreshResult.error);
                        result.errors.push(`User ${userId}: ${refreshResult.error}`);
                        result.details.push({ 
                            userId, 
                            status: 'failed', 
                            error: refreshResult.error,
                            daysUntilExpiration: daysUntilExpiration.toFixed(1)
                        });
                    }
                } else {
                    result.details.push({ 
                        userId, 
                        status: 'ok', 
                        daysUntilExpiration: daysUntilExpiration.toFixed(1),
                        expiresAt 
                    });
                }
            } catch (error) {
                console.error(`Error processing user ${userId}:`, error);
                result.errors.push(`User ${userId}: ${error.message}`);
                result.details.push({ userId, status: 'error', error: error.message });
            }
        }
        
        console.log('Instagram token check completed:', result);
        return result;
        
    } catch (error) {
        console.error('Error checking Instagram tokens:', error);
        result.errors.push(`General error: ${error.message}`);
        return result;
    }
}

// Instagram webhook endpoints (required for Facebook app verification)
// Public image serving endpoint for Instagram and other external services
app.get('/public-image/*', async (c) => {
    try {
        const fullPath = c.req.path;
        const imageKey = fullPath.replace('/public-image/', '');
        const userAgent = c.req.header('User-Agent');
        
        
        if (!c.env.R2_BUCKET) {
            console.error('R2 bucket not configured');
            return c.text('R2 bucket not configured', 500);
        }
        
        // Fetch image from R2 bucket
        const r2Object = await c.env.R2_BUCKET.get(imageKey);
        
        if (!r2Object) {
            console.error('Image not found in R2:', imageKey);
            return c.text('Image not found', 404);
        }
        
        
        // Return the image with appropriate headers
        const headers = new Headers();
        headers.set('Content-Type', r2Object.httpMetadata?.contentType || 'image/jpeg');
        headers.set('Content-Length', r2Object.size.toString());
        headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        headers.set('Access-Control-Allow-Origin', '*'); // Allow CORS for external access
        
        return new Response(r2Object.body, { headers });
        
    } catch (error) {
        console.error('Error serving public image:', error);
        return c.text('Error serving image', 500);
    }
});

app.get('/webhook/instagram', async (c) => {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');
    
    // Verify token should match what you set in Facebook Developer Console
    const VERIFY_TOKEN = 'your_instagram_webhook_verify_token_123';
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Instagram webhook verified');
        return c.text(challenge);
    } else {
        console.log('Instagram webhook verification failed');
        return c.text('Verification failed', 403);
    }
});

app.post('/webhook/instagram', async (c) => {
    // Handle Instagram webhook events (required for app validation but not used for posting)
    try {
        const body = await c.req.json();
        console.log('Instagram webhook received:', JSON.stringify(body, null, 2));
        
        // Instagram requires a 200 response to webhook events
        // Since we're only interested in posting, we just acknowledge receipt
        return c.json({ status: 'received' });
    } catch (error) {
        console.error('Instagram webhook error:', error);
        return c.json({ error: 'Webhook processing failed' }, 500);
    }
});

app.post('/api/user/settings/test-linkedin', authenticateToken, async (c) => {
    try {
        const { token } = await c.req.json();
        
        if (!token) {
            return c.json({ error: 'Token is required' }, 400);
        }
        
        // Test LinkedIn connection
        const testUrl = 'https://api.linkedin.com/v2/me';
        const response = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            return c.json({ 
                success: true, 
                message: `Connected as ${(userData.firstName && userData.firstName.localized && userData.firstName.localized.en_US) || ''} ${(userData.lastName && userData.lastName.localized && userData.lastName.localized.en_US) || ''}` 
            });
        } else {
            return c.json({ 
                success: false, 
                error: 'Invalid LinkedIn access token' 
            });
        }
    } catch (error) {
        return c.json({ 
            success: false, 
            error: 'Connection test failed: ' + error.message 
        });
    }
});

app.post('/api/user/settings/linkedin', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { token, autoPost } = await c.req.json();
        const database = new D1Database(c.env.DB);
        
        // Save LinkedIn settings
        await database.setUserSetting(user.id, 'social', 'linkedin_token', token, true);
        await database.setUserSetting(user.id, 'social', 'linkedin_autopost', autoPost ? 'true' : 'false', false);
        
        return c.json({ success: true, message: 'LinkedIn settings saved' });
    } catch (error) {
        return c.json({ error: 'Failed to save LinkedIn settings' }, 500);
    }
});

app.delete('/api/user/settings/linkedin', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Delete LinkedIn settings
        await database.deleteUserSetting(user.id, 'social', 'linkedin_token');
        await database.deleteUserSetting(user.id, 'social', 'linkedin_autopost');
        
        return c.json({ success: true, message: 'LinkedIn disconnected' });
    } catch (error) {
        return c.json({ error: 'Failed to disconnect LinkedIn' }, 500);
    }
});

// Advanced prompt building with EXIF extraction and weather data
async function buildPromptFromImageWithExtraction(base64Image, includeWeather = false, style = 'creative', env = null, zoomLevel = 18, hashtagCount = 15) {
    
    if (!base64Image) {
        throw new Error('No image data provided');
    }
    
    const context = [];
    const extractedData = {
        exifData: null,
        cameraMake: null,
        cameraModel: null,
        gpsLatitude: null,
        gpsLongitude: null,
        locationName: null,
        weatherData: null,
        photoDateTime: null,
        dateTimeSource: null
    };
    
    try {
        // Convert base64 to buffer for EXIF extraction
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Check image format first
        const imageHeader = imageBuffer.slice(0, 10);
        
        // Check if this looks like a valid JPEG with EXIF
        const isJPEG = imageHeader[0] === 0xFF && imageHeader[1] === 0xD8;
        const hasEXIFMarker = imageBuffer.includes(Buffer.from([0xFF, 0xE1])); // EXIF APP1 marker
        
        // Try to extract specific EXIF fields first
        let exifData = await exifr.parse(imageBuffer, {
            tiff: true,
            ifd0: true,
            exif: true,
            gps: true,
            pick: [
                'Make', 'Model', 
                'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
                'DateTimeOriginal', 'DateTime', 'DateTimeDigitized'
            ]
        });
        
        // If no date fields found, try extracting all EXIF data to see what's available
        if (exifData && !exifData.DateTimeOriginal && !exifData.DateTime && !exifData.DateTimeDigitized) {
            const fullExifData = await exifr.parse(imageBuffer, true);
            if (fullExifData) {
                // Look for any date-related fields
                const dateKeys = Object.keys(fullExifData).filter(key => 
                    key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
                );
                
                // Merge the full EXIF data with our targeted data
                exifData = { ...exifData, ...fullExifData };
            }
        }
        
        if (exifData) {
            extractedData.exifData = exifData;
            
            // Extract photo date/time
            const dateFields = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'];
            for (const field of dateFields) {
                if (exifData[field]) {
                    try {
                        let dateStr = exifData[field];
                        let parsedDate;
                        
                        if (typeof dateStr === 'string') {
                            // Debug: Log the actual EXIF date string
                            console.log(`DEBUG EXIF ${field}:`, dateStr);

                            // Standard EXIF format: "2025:09:14 17:33:11"
                            // Simple parsing - no timezone complexity
                            const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
                            if (match) {
                                const [, year, month, day, hour, minute, second] = match;
                                const hourNum = parseInt(hour);

                                // Simple 12-hour format conversion
                                const hour12 = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);
                                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                                const displayTime = `${hour12}:${minute}:${second} ${ampm}`;

                                // Store components for weather API
                                extractedData.photoDateTime = {
                                    year: parseInt(year),
                                    month: parseInt(month),
                                    day: parseInt(day),
                                    hour: parseInt(hour),
                                    minute: parseInt(minute),
                                    second: parseInt(second),
                                    originalString: dateStr
                                };
                                extractedData.dateTimeSource = field;

                                // Simple display format
                                context.push(`Photo taken: ${month}/${day}/${year} ${displayTime}`);
                                break;
                            } else {
                                // Fallback for non-standard formats
                                parsedDate = new Date(dateStr.replace(/:/g, '-').replace(/ /, 'T'));
                                if (parsedDate && !isNaN(parsedDate.getTime())) {
                                    extractedData.photoDateTime = parsedDate;
                                    extractedData.dateTimeSource = field;
                                    context.push('Photo taken: ' + formatDateWithTimezone(parsedDate, null, env));
                                    break;
                                }
                            }
                        } else if (dateStr instanceof Date) {
                            extractedData.photoDateTime = dateStr;
                            extractedData.dateTimeSource = field;
                            context.push('Photo taken: ' + formatDateWithTimezone(dateStr, null, env));
                            break;
                        }
                    } catch (error) {
                    }
                }
            }
            
            // Camera/gear context
            if (exifData.Make || exifData.Model) {
                const camera = (exifData.Make || '') + ' ' + (exifData.Model || '');
                if (camera.trim()) {
                    context.push('Camera/Gear: ' + camera.trim());
                    extractedData.cameraMake = exifData.Make;
                    extractedData.cameraModel = exifData.Model;
                }
            }
            
            // GPS location context
            if (exifData.GPSLatitude && exifData.GPSLongitude) {
                try {
                    // Convert DMS (degrees, minutes, seconds) to decimal degrees
                    const lat = convertDMSToDD(exifData.GPSLatitude, exifData.GPSLatitudeRef);
                    const lon = convertDMSToDD(exifData.GPSLongitude, exifData.GPSLongitudeRef);
                    
                    extractedData.gpsLatitude = lat;
                    extractedData.gpsLongitude = lon;
                    
                    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
                        const location = await reverseGeocode(lat, lon, zoomLevel);
                        if (location) {
                            context.push('Location: ' + location);
                            extractedData.locationName = location;
                        }

                        // Fetch weather data if requested and we have GPS coordinates
                        if (includeWeather && env) {
                            const weatherData = await getHistoricalWeather(lat, lon, exifData, env);
                            if (weatherData) {
                                context.push('Weather: ' + weatherData);
                                extractedData.weatherData = weatherData;
                            }
                        }
                    }
                } catch (e) {
                }
            }
        }
    } catch (error) {
    }
    
    const contextString = context.length > 0 ? '\\n\\nAdditional Context:\\n' + context.join('\\n') : '';


    // Define style-specific caption instructions
    const styleInstructions = {
        creative: {
            tone: 'Uses artistic and expressive language with creative metaphors',
            description: 'creative and artistic'
        },
        professional: {
            tone: 'Uses clean, professional language suitable for business contexts',
            description: 'professional and business-friendly'
        },
        casual: {
            tone: 'Uses relaxed, conversational language like talking to a friend',
            description: 'casual and friendly'
        },
        trendy: {
            tone: 'Uses current trends, viral language, and popular internet expressions',
            description: 'trendy and viral'
        },
        inspirational: {
            tone: 'Uses motivational, uplifting, and encouraging language',
            description: 'inspirational and motivational'
        },
        humorous: {
            tone: 'Uses funny, witty language with clever wordplay, puns, or amusing observations. Keep it light-hearted and entertaining while being appropriate for social media. Think like a comedian describing the scene',
            description: 'funny and witty'
        },
        edgy: {
            tone: 'Uses short, dry, clever language that is a little dark. Keep it deadpan, sarcastic, or emotionally detached—but still tied to the image. No fluff, minimal emojis',
            description: 'edgy and unconventional'
        }
    };
    
    const selectedStyle = styleInstructions[style] || styleInstructions.creative;
    
    const prompt = 'Analyze this image for Instagram posting. Generate:\\n\\n' +
        '1. A ' + selectedStyle.description + ' caption that:\\n' +
        '   - Captures the main subject/scene\\n' +
        '   - ' + selectedStyle.tone + '\\n' +
        '   - Is 1-3 sentences\\n' +
        '   - Includes relevant emojis\\n' +
        '   - Feels authentic and natural (NO forced questions or call-to-actions)\\n' +
        '   - Sounds like something a real person would write\\n' +
        '   - IMPORTANT: Do NOT include any hashtags in the caption text\\n' +
        '   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n' +
        (context.length > 0 ? '   - Incorporates the provided context naturally\\n' : '') +
        (context.some(item => item.startsWith('Weather:')) ? '   - MUST use the exact weather data provided in context - do not make up different weather conditions\\n' : '') +
        '\\n2. MANDATORY: Generate EXACTLY ' + hashtagCount + ' hashtags - COUNT TO ' + hashtagCount + ':\\n' +
        '   - YOU MUST PROVIDE EXACTLY ' + hashtagCount + ' HASHTAGS - NO EXCEPTIONS\\n' +
        '   - COUNT: 1, 2, 3... up to ' + hashtagCount + ' - DO NOT STOP BEFORE ' + hashtagCount + '\\n' +
        '   - VERIFY: Your hashtag count must equal ' + hashtagCount + ' exactly\\n' +
        '   - Mix popular (#photography, #instagood) and niche tags\\n' +
        '   - Are relevant to image content\\n' +
        '   - Include location-based tags if applicable\\n' +
        '   - Avoid banned or shadowbanned hashtags\\n' +
        '   - Range from broad to specific\\n' +
        '   - Format as #hashtag (with # symbol)\\n' +
        '   - These should be completely separate from the caption above\\n' +
        (context.length > 0 ? '   - Include relevant hashtags based on the context provided\\n' : '') +
        '\\n3. Alt text for accessibility (1-2 sentences):\\n' +
        '   - Describe what is actually visible in the image\\n' +
        '   - Include important visual details for screen readers\\n' +
        '   - Focus on objective description, not interpretation\\n' +
        '   - Keep it concise but descriptive\\n' +
        contextString + '\\n\\n' +
        'Format your response as:\\n' +
        'CAPTION: [your caption here - NO hashtags allowed]\\n' +
        'HASHTAGS: [hashtags separated by spaces - each starting with #]\\n' +
        'ALT_TEXT: [descriptive alt text for accessibility]';
    
    return { prompt, extractedData };
}

// Enhanced prompt building with user context
async function buildEnhancedPromptWithUserContext(base64Image, includeWeather, style, extractedData, userContext, env, userId = null, hashtagCount = 15) {
    const context = [];
    
    // Add extracted technical data
    if (extractedData.photoDateTime) {
        if (typeof extractedData.photoDateTime === 'object' && extractedData.photoDateTime.year) {
            // Handle EXIF components with simple formatting
            const { year, month, day, hour, minute, second } = extractedData.photoDateTime;
            const hourNum = parseInt(hour);

            // Simple 12-hour format conversion
            const hour12 = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            const displayTime = `${hour12}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')} ${ampm}`;

            context.push(`Photo taken: ${month}/${day}/${year} ${displayTime}`);
        } else {
            // Handle legacy format with Date object
            const photoDate = new Date(extractedData.photoDateTime);
            context.push('Photo taken: ' + formatDateWithTimezone(photoDate, null, env));
        }
    }
    
    if (extractedData.cameraMake || extractedData.cameraModel) {
        const camera = (extractedData.cameraMake || '') + ' ' + (extractedData.cameraModel || '');
        if (camera.trim()) {
            context.push('Camera/Gear: ' + camera.trim());
        }
    }
    
    if (extractedData.locationName) {
        context.push('Location: ' + extractedData.locationName);
    }
    
    if (extractedData.weatherData) {
        context.push('Weather: ' + extractedData.weatherData);
    }
    
    // Add user-provided context
    context.push(...userContext);
    
    const contextString = context.length > 0 ? '\\n\\nAdditional Context:\\n' + context.join('\\n') : '';
    
    // Check if this is a custom prompt
    if (style && style.startsWith('custom_')) {
        const promptId = parseInt(style.replace('custom_', ''));
        
        if (userId && env && env.DB) {
            try {
                // Get the custom prompt from the database
                const db = new D1Database(env.DB);
                const customPrompt = await db.getCustomPromptById(promptId, userId);
                
                if (customPrompt && customPrompt.is_active) {
                    // Start with the user's custom prompt text
                    let promptText = customPrompt.prompt_text;
                    
                    // Optional variable substitution for users who want to use variables
                    const variables = {
                        image_description: 'the uploaded image',
                        context: context.join('\\n') || 'No additional context provided',
                        camera: (extractedData.cameraMake || '') + ' ' + (extractedData.cameraModel || '') || 'No camera information available',
                        location: extractedData.locationName || 'No location information available',
                        weather: extractedData.weatherData || 'No weather data available',
                        style: customPrompt.name.toLowerCase()
                    };
                    
                    // Only do variable substitution if the prompt contains variables
                    Object.entries(variables).forEach(([key, value]) => {
                        const regex = new RegExp(`\\\\{${key}\\\\}`, 'g');
                        promptText = promptText.replace(regex, value);
                    });
                    
                    // Automatically append available context (same as built-in styles)
                    promptText += contextString;
                    
                    // Ensure the output format is maintained
                    if (!promptText.includes('CAPTION:') || !promptText.includes('HASHTAGS:') || !promptText.includes('ALT_TEXT:')) {
                        promptText += '\\n\\nIMPORTANT: Format your response EXACTLY as shown below (use these English labels even if writing in another language):\\n' +
                            'CAPTION: [your caption here - NO hashtags allowed]\\n' +
                            'HASHTAGS: [hashtags separated by spaces]\\n' +
                            'ALT_TEXT: [descriptive alt text for accessibility]';
                    }
                    
                    // ALWAYS add hashtag requirements - even if user mentions hashtags
                    promptText += '\\n\\nMANDATORY SYSTEM REQUIREMENT - Hashtag Count:\\n' +
                        '- YOU MUST GENERATE EXACTLY ' + hashtagCount + ' HASHTAGS - NO EXCEPTIONS\\n' +
                        '- COUNT TO ' + hashtagCount + ' - DO NOT STOP UNTIL YOU REACH ' + hashtagCount + ' HASHTAGS\\n' +
                        '- THIS IS CRITICAL: EXACTLY ' + hashtagCount + ' hashtags, not ' + (hashtagCount-1) + ', not ' + (hashtagCount+1) + ', but EXACTLY ' + hashtagCount + '\\n' +
                        '- Format as #hashtag (with # symbol)\\n' +
                        '- Separate hashtags with spaces\\n' +
                        '- Place ALL hashtags in the HASHTAGS section only\\n' +
                        '- CRITICAL: Each hashtag MUST start with # symbol\\n' +
                        '- VERIFY: Count your hashtags before responding - you need EXACTLY ' + hashtagCount + '\\n' +
                        '- This requirement overrides any other hashtag instructions in the user prompt above';
                    
                    return { prompt: promptText };
                }
            } catch (error) {
                console.error('Error loading custom prompt:', error);
                // Fall through to default styles
            }
        }
    }
    
    // Define style-specific caption instructions for built-in styles
    const styleInstructions = {
        creative: {
            tone: 'Uses artistic and expressive language with creative metaphors',
            description: 'creative and artistic'
        },
        professional: {
            tone: 'Uses clean, professional language suitable for business contexts',
            description: 'professional and business-friendly'
        },
        casual: {
            tone: 'Uses relaxed, conversational language like talking to a friend',
            description: 'casual and friendly'
        },
        trendy: {
            tone: 'Uses current trends, viral language, and popular internet expressions',
            description: 'trendy and viral'
        },
        inspirational: {
            tone: 'Uses motivational, uplifting, and encouraging language',
            description: 'inspirational and motivational'
        },
        humorous: {
            tone: 'Uses funny, witty language with clever wordplay, puns, or amusing observations. Keep it light-hearted and entertaining while being appropriate for social media. Think like a comedian describing the scene',
            description: 'funny and witty'
        },
        edgy: {
            tone: 'Uses short, dry, clever language that is a little dark. Keep it deadpan, sarcastic, or emotionally detached—but still tied to the image. No fluff, minimal emojis',
            description: 'edgy and unconventional'
        }
    };
    
    const selectedStyle = styleInstructions[style] || styleInstructions.creative;
    
    const prompt = 'Analyze this image for Instagram posting. Generate:\\n\\n' +
        '1. A ' + selectedStyle.description + ' caption that:\\n' +
        '   - Captures the main subject/scene\\n' +
        '   - ' + selectedStyle.tone + '\\n' +
        '   - Is 1-3 sentences\\n' +
        '   - Includes relevant emojis\\n' +
        '   - Feels authentic and natural (NO forced questions or call-to-actions)\\n' +
        '   - Sounds like something a real person would write\\n' +
        '   - IMPORTANT: Do NOT include any hashtags in the caption text\\n' +
        '   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n' +
        (context.length > 0 ? '   - Incorporates the provided context naturally\\n' : '') +
        (context.some(item => item.startsWith('Weather:')) ? '   - MUST use the exact weather data provided in context - do not make up different weather conditions\\n' : '') +
        '\\n2. MANDATORY: Generate EXACTLY ' + hashtagCount + ' hashtags - COUNT TO ' + hashtagCount + ':\\n' +
        '   - YOU MUST PROVIDE EXACTLY ' + hashtagCount + ' HASHTAGS - NO EXCEPTIONS\\n' +
        '   - COUNT: 1, 2, 3... up to ' + hashtagCount + ' - DO NOT STOP BEFORE ' + hashtagCount + '\\n' +
        '   - VERIFY: Your hashtag count must equal ' + hashtagCount + ' exactly\\n' +
        '   - Mix popular (#photography, #instagood) and niche tags\\n' +
        '   - Are relevant to image content\\n' +
        '   - Include location-based tags if applicable\\n' +
        '   - Avoid banned or shadowbanned hashtags\\n' +
        '   - Range from broad to specific\\n' +
        '   - Format as #hashtag (with # symbol)\\n' +
        '   - These should be completely separate from the caption above\\n' +
        (context.length > 0 ? '   - Include relevant hashtags based on the context provided\\n' : '') +
        '\\n3. Alt text for accessibility (1-2 sentences):\\n' +
        '   - Describe what is actually visible in the image\\n' +
        '   - Include important visual details for screen readers\\n' +
        '   - Focus on objective description, not interpretation\\n' +
        '   - Keep it concise but descriptive\\n' +
        contextString + '\\n\\n' +
        'Format your response as:\\n' +
        'CAPTION: [your caption here - NO hashtags allowed]\\n' +
        'HASHTAGS: [hashtags separated by spaces - each starting with #]\\n' +
        'ALT_TEXT: [descriptive alt text for accessibility]';
    
    return { prompt };
}

// Convert DMS (degrees, minutes, seconds) to decimal degrees
function convertDMSToDD(dmsArray, ref) {
    if (Array.isArray(dmsArray) && dmsArray.length === 3) {
        let dd = dmsArray[0] + dmsArray[1]/60 + dmsArray[2]/3600;
        if (ref === 'S' || ref === 'W') {
            dd = dd * -1;
        }
        return dd;
    }
    // If already decimal degrees, return as is
    return dmsArray;
}

// Reverse geocoding function
async function reverseGeocode(latitude, longitude, zoomLevel = 18) {
    try {
        const response = await fetch(
            'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + latitude + '&lon=' + longitude + '&zoom=' + zoomLevel + '&addressdetails=1',
            {
                headers: {
                    'User-Agent': 'AI Caption Studio'
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            
            if (data && data.address) {
                const parts = [];
                
                // Add building/house number and street
                if (data.address.house_number && data.address.road) {
                    parts.push(data.address.house_number + ' ' + data.address.road);
                } else if (data.address.road) {
                    parts.push(data.address.road);
                }
                
                // Add neighbourhood/suburb/district
                if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                else if (data.address.suburb) parts.push(data.address.suburb);
                else if (data.address.quarter) parts.push(data.address.quarter);
                else if (data.address.district) parts.push(data.address.district);
                
                // Add city/town/village
                if (data.address.city) parts.push(data.address.city);
                else if (data.address.town) parts.push(data.address.town);
                else if (data.address.village) parts.push(data.address.village);
                else if (data.address.municipality) parts.push(data.address.municipality);
                
                // Add state/province
                if (data.address.state) parts.push(data.address.state);
                else if (data.address.province) parts.push(data.address.province);
                
                // Add country
                if (data.address.country) parts.push(data.address.country);
                
                return parts.join(', ') || data.display_name;
            }
        }
    } catch (error) {
    }
    
    return null;
}

// Fetch historical weather data using OpenWeatherMap API
async function getHistoricalWeather(latitude, longitude, exifData, env) {
    try {
        if (!env.OPENWEATHER_API_KEY) {
            return null;
        }
        
        
        // Extract date from EXIF data, default to current time if not available
        let photoTimestamp = Date.now();
        let dateSource = 'current_time';
        
        // Try multiple date fields in order of preference
        const dateFields = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'];
        
        for (const field of dateFields) {
            if (exifData && exifData[field]) {
                try {
                    
                    let dateStr = exifData[field];
                    let parsedDate;
                    
                    if (typeof dateStr === 'string') {
                        // Standard EXIF format: "2025:09:14 17:33:11"
                        // Parse manually to avoid timezone interpretation
                        const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
                        if (match) {
                            const [, year, month, day, hour, minute, second] = match;
                            // Create date with exact EXIF values - no timezone conversion
                            parsedDate = new Date(
                                parseInt(year),
                                parseInt(month) - 1, // Month is 0-indexed in JS
                                parseInt(day),
                                parseInt(hour),
                                parseInt(minute),
                                parseInt(second)
                            );
                        } else {
                            // Fallback to string parsing if format doesn't match
                            dateStr = dateStr.replace(/:/g, '-').replace(/ /, 'T');
                            parsedDate = new Date(dateStr);
                        }
                    } else if (dateStr instanceof Date) {
                        parsedDate = dateStr;
                    }

                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        photoTimestamp = parsedDate.getTime();
                        dateSource = field;
                        break;
                    }
                } catch (dateError) {
                }
            }
        }
        
        
        // Validate timestamp is reasonable (not in the future, not before 2000)
        const now = Date.now();
        const year2000 = new Date('2000-01-01').getTime();
        let useCurrentWeather = false;


        if (photoTimestamp > now || photoTimestamp < year2000) {
            // For invalid dates (future or too old), use current weather but keep original timestamp info for display
            useCurrentWeather = true;
            dateSource = 'current_time_fallback';
        }
        
        // Convert to Unix timestamp (seconds)
        const unixTimestamp = Math.floor(photoTimestamp / 1000);
        
        // Determine weather API to use
        let weatherUrl;
        let apiDescription;
        
        if (useCurrentWeather) {
            // Use current weather for invalid dates (future or very old photos)
            weatherUrl = 'https://api.openweathermap.org/data/2.5/weather?lat=' + latitude + '&lon=' + longitude + '&appid=' + env.OPENWEATHER_API_KEY + '&units=metric';
            apiDescription = 'current (invalid date detected)';
        } else {
            // Use current weather for very recent photos (within 3 hours), historical for older
            const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
            const isRecent = photoTimestamp > threeHoursAgo;


            if (isRecent) {
                // Use current weather API for recent photos
                weatherUrl = 'https://api.openweathermap.org/data/2.5/weather?lat=' + latitude + '&lon=' + longitude + '&appid=' + env.OPENWEATHER_API_KEY + '&units=metric';
                apiDescription = 'current';
            } else {
                // Use historical weather API for older photos
                weatherUrl = 'https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=' + latitude + '&lon=' + longitude + '&dt=' + unixTimestamp + '&appid=' + env.OPENWEATHER_API_KEY + '&units=metric';
                apiDescription = 'historical';
            }
        }


        const response = await fetch(weatherUrl, {
            headers: {
                'User-Agent': 'AI Caption Studio'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            
            // If historical API fails, try current weather as fallback
            if (apiDescription === 'historical') {
                const fallbackUrl = 'https://api.openweathermap.org/data/2.5/weather?lat=' + latitude + '&lon=' + longitude + '&appid=' + env.OPENWEATHER_API_KEY + '&units=metric';
                const fallbackResponse = await fetch(fallbackUrl);
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.main) {
                        const weatherText = Math.round(fallbackData.main.temp) + '°C, ' + fallbackData.weather[0].description +
                                           (fallbackData.main.humidity ? ', ' + fallbackData.main.humidity + '% humidity' : '') +
                                           (fallbackData.wind ? ', ' + Math.round(fallbackData.wind.speed * 3.6) + ' km/h wind' : '') +
                                           ' (current weather - historical not available)';
                        return weatherText;
                    }
                }
            }
            
            return null;
        }
        
        const data = await response.json();
        let weatherInfo;
        
        if (apiDescription === 'current') {
            // Current weather API format
            if (data.main) {
                weatherInfo = {
                    temperature: Math.round(data.main.temp),
                    description: data.weather[0].description,
                    humidity: data.main.humidity,
                    windSpeed: data.wind ? Math.round(data.wind.speed * 3.6) : null // Convert m/s to km/h
                };
            }
        } else {
            // Historical weather API format
            if (data.data && data.data.length > 0) {
                const weather = data.data[0];
                weatherInfo = {
                    temperature: Math.round(weather.temp),
                    description: weather.weather[0].description,
                    humidity: weather.humidity,
                    windSpeed: Math.round(weather.wind_speed * 3.6) // Convert m/s to km/h
                };
            }
        }
        
        if (weatherInfo) {
            let weatherText = weatherInfo.temperature + '°C, ' + weatherInfo.description +
                               (weatherInfo.humidity ? ', ' + weatherInfo.humidity + '% humidity' : '') +
                               (weatherInfo.windSpeed ? ', ' + weatherInfo.windSpeed + ' km/h wind' : '');

            // Add note if using current weather due to invalid photo date
            if (useCurrentWeather) {
                weatherText += ' (current weather - photo date appears invalid)';
            }

            return weatherText;
        }

    } catch (error) {
        return null;
    }

    return null;
}


// Helper function to format dates with timezone awareness
function formatDateWithTimezone(date, timezone = null, env = null) {
    const targetTimezone = timezone || env?.DEFAULT_TIMEZONE || 'UTC';
    try {
        return new Date(date).toLocaleString('en-US', {
            timeZone: targetTimezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        // Fallback to UTC if timezone is invalid
        return new Date(date).toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) + ' UTC';
    }
}

// Helper function to get user's connected social media accounts
async function getConnectedSocialAccounts(database, userId) {
    try {
        const settings = await database.getUserSettings(userId, 'social');
        const connected = {
            mastodon: null,
            pixelfed: null,
            linkedin: null,
            instagram: null,
        };
        
        settings.forEach(setting => {
            const [platform, key] = setting.setting_key.split('_');
            if (platform === 'mastodon' && key === 'instance') {
                connected.mastodon = { instance: setting.setting_value };
            } else if (platform === 'pixelfed' && key === 'instance') {
                connected.pixelfed = { instance: setting.setting_value };
            } else if (platform === 'linkedin' && key === 'token' && setting.setting_value) {
                connected.linkedin = { connected: true };
            } else if (platform === 'instagram' && key === 'access' && setting.setting_value) {
                connected.instagram = { connected: true };
            }
        });
        
        return connected;
    } catch (error) {
        return { mastodon: null, pixelfed: null, linkedin: null, instagram: null };
    }
}

// Caption generation endpoint - now requires authentication
app.post('/api/generate-caption', authenticateToken, async (c) => {
  try {
    const user = c.get('user');
    const { prompt, base64Image, style = 'creative', includeWeather = false, context = {}, filename = 'web-upload.jpg' } = await c.req.json();
    
    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }
    
    if (!base64Image) {
      return c.json({ error: 'Missing image data' }, 400);
    }

    // Check usage limits
    const database = new D1Database(c.env.DB);
    const usageCheck = await database.checkUsageLimit(user.id);
    if (!usageCheck.allowed) {
        return c.json({
            error: 'Daily usage limit exceeded',
            usageInfo: usageCheck
        }, 429);
    }
    
    // Always use advanced prompt building with EXIF extraction and context
    let finalPrompt;
    let extractedData = null;
    
    try {
        // Use weather from context or default to true
        const shouldIncludeWeather = context.includeWeather !== undefined ? context.includeWeather : true;
        
        // Get user's preferences
        const locationSettings = await database.getUserSettings(user.id, 'location');
        const generalSettings = await database.getUserSettings(user.id, 'general');
        
        let userZoomLevel = 18; // Default to highest precision
        locationSettings.forEach(setting => {
            if (setting.setting_key === 'zoom_level') {
                userZoomLevel = parseInt(setting.setting_value) || 18;
            }
        });
        
        let hashtagCount = 15; // Default hashtag count
        generalSettings.forEach(setting => {
            if (setting.setting_key === 'hashtag_count') {
                hashtagCount = parseInt(setting.setting_value) || 15;
            }
        });
        
        // Always extract EXIF data and build enhanced prompt
        const result = await buildPromptFromImageWithExtraction(base64Image, shouldIncludeWeather, style, c.env, userZoomLevel, hashtagCount);
        finalPrompt = result.prompt;
        extractedData = result.extractedData;
        
        // Override extracted data with user-provided context where available
        if (context.camera) extractedData.cameraMake = context.camera.split(' ')[0] || null;
        if (context.camera) extractedData.cameraModel = context.camera.split(' ').slice(1).join(' ') || null;
        if (context.location) extractedData.locationName = context.location;
        
        // Build additional context from user input
        const userContext = [];
        if (context.event) userContext.push('Event/Occasion: ' + context.event);
        if (context.mood) userContext.push('Mood/Vibe: ' + context.mood);
        if (context.subject) userContext.push('Subject/Focus: ' + context.subject);
        if (context.custom) userContext.push('Additional notes: ' + context.custom);
        if (context.customPrompt) userContext.push('Custom instructions: ' + context.customPrompt);
        
        // If user provided context or using custom prompt, rebuild the prompt to include it
        if (userContext.length > 0 || context.camera || context.location || (style && style.startsWith('custom_'))) {
            const enhancedResult = await buildEnhancedPromptWithUserContext(
                base64Image, 
                shouldIncludeWeather, 
                style, 
                extractedData, 
                userContext, 
                c.env,
                user.id,
                hashtagCount
            );
            finalPrompt = enhancedResult.prompt;
        }
        
        // If user provided a custom prompt, we could use it instead, but for now always use enhanced
        if (prompt && prompt.trim() !== '') {
        }
    } catch (extractionError) {
        // Fallback to basic prompt if extraction fails
        const styleInstructions = {
          creative: 'creative and artistic',
          professional: 'professional and business-friendly',
          casual: 'casual and friendly',
          trendy: 'trendy and viral',
          inspirational: 'inspirational and motivational',
          edgy: 'edgy and unconventional'
        };
        
        const selectedStyle = styleInstructions[style] || styleInstructions.creative;
        
        finalPrompt = prompt || 'Analyze this image for Instagram posting. Generate:\\n\\n1. A ' + selectedStyle + ' caption that:\\n   - Captures the main subject/scene\\n   - Is 1-3 sentences\\n   - Includes relevant emojis\\n   - Feels authentic and natural\\n   - IMPORTANT: Do NOT include any hashtags in the caption text\\n   - CRITICAL: Separate caption and hashtags completely. Do not include any # symbols in the caption\\n\\n2. 10-15 hashtags that:\\n   - Mix popular and niche tags\\n   - Are relevant to image content\\n   - Range from broad to specific\\n   - These should be completely separate from the caption above\\n\\n3. Alt text for accessibility (1-2 sentences):\\n   - Describe what is actually visible in the image\\n   - Include important visual details for screen readers\\n\\nFormat your response as:\\nCAPTION: [your caption here - NO hashtags allowed]\\nHASHTAGS: [hashtags separated by spaces]\\nALT_TEXT: [descriptive alt text for accessibility]';
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + c.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: finalPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/jpeg;base64,' + base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return c.json({ error: 'OpenAI API request failed: ' + response.status }, response.status);
    }

    const data = await response.json();
    const responseContent = data.choices[0].message.content;
    
    // Parse the response content to extract caption, hashtags, and alt text
    let caption = '', hashtags = '', altText = '';
    try {
        const lines = responseContent.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('CAPTION:')) {
                caption = trimmedLine.replace('CAPTION:', '').trim();
            } else if (trimmedLine.startsWith('HASHTAGS:')) {
                hashtags = trimmedLine.replace('HASHTAGS:', '').trim();
            } else if (trimmedLine.startsWith('ALT_TEXT:')) {
                altText = trimmedLine.replace('ALT_TEXT:', '').trim();
            }
        }
    } catch (parseError) {
        console.error('Error parsing caption response:', parseError);
        // Fallback: use entire response as caption
        caption = responseContent;
    }
    
    // Store web-uploaded image and save to caption history
    let imageId = context.imageId; // Use existing imageId if provided
    let captionHistoryId = null;
    
    // If no imageId provided, this is a new web upload - store it
    if (!imageId && caption) {
        try {
            // Generate image hash for deduplication
            // Convert base64 to ArrayBuffer for Cloudflare Workers
            const binaryString = atob(base64Image);
            const imageBuffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                imageBuffer[i] = binaryString.charCodeAt(i);
            }
            
            const imageHash = await crypto.subtle.digest('SHA-256', imageBuffer)
                .then(hashBuffer => Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, '0')).join(''));
            
            // Check if we already have this image
            const existingImage = await database.getImageByHash(user.id, imageHash);
            
            if (existingImage) {
                imageId = existingImage.id;
            } else {
                // Store new image in R2 if available
                let r2Key = null;
                if (c.env.R2_BUCKET) {
                    try {
                        r2Key = `images/${user.id}/${Date.now()}-${imageHash.substring(0, 8)}.jpg`;
                        await c.env.R2_BUCKET.put(r2Key, imageBuffer, {
                            httpMetadata: {
                                contentType: 'image/jpeg'
                            }
                        });
                    } catch (r2Error) {
                        console.error('Error storing image in R2:', r2Error);
                        // Continue without R2 storage
                    }
                }
                
                // Store image metadata in database
                imageId = await database.storeWebImage(
                    user.id,
                    filename, // Use the original filename from the request
                    imageBuffer.length,
                    'image/jpeg',
                    imageHash,
                    r2Key
                );
            }
        } catch (imageError) {
            console.error('Error storing web image:', imageError);
            // Continue without storing image
        }
    }
    
    // Save to caption history
    if (caption) {
        try {
            captionHistoryId = await database.saveCaptionHistory(
                user.id,
                imageId,
                caption,
                hashtags,
                altText,
                style,
                context,
                extractedData?.weatherData
            );
        } catch (historyError) {
            console.error('Error saving caption history:', historyError);
        }
    }
    
    // Log the query and increment usage
    const queryId = generateRandomId();
    
    const logResult = await database.logQuery({
        id: queryId,
        source: 'web',
        userId: user.id,
        email: user.email,
        processingTimeMs: Date.now() - Date.now(), // Simplified
        responseLength: responseContent.length
    });
    
    const usageResult = await database.incrementDailyUsage(user.id);
    
    // Include extracted data in response if available
    const responseData = { 
        content: responseContent,
        captionHistoryId: captionHistoryId,
        imageId: imageId
    };
    if (extractedData) {
        if (extractedData.weatherData) responseData.weatherData = extractedData.weatherData;
        if (extractedData.locationName) responseData.locationName = extractedData.locationName;
        if (extractedData.photoDateTime) responseData.photoDateTime = extractedData.photoDateTime;
        if (extractedData.cameraMake || extractedData.cameraModel) {
            responseData.cameraInfo = {
                make: extractedData.cameraMake,
                model: extractedData.cameraModel
            };
        }
    }
    
    // Include connected social media accounts for preview
    const connectedAccounts = await getConnectedSocialAccounts(database, user.id);
    responseData.connectedAccounts = connectedAccounts;
    
    return c.json(responseData);
    
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Caption history API endpoints
app.get('/api/caption-history/:imageId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const imageId = c.req.param('imageId');
        const database = new D1Database(c.env.DB);
        
        const history = await database.getCaptionHistoryForImage(user.id, parseInt(imageId));
        return c.json({ history });
    } catch (error) {
        console.error('Error getting caption history:', error);
        return c.json({ error: 'Failed to load caption history' }, 500);
    }
});

app.post('/api/caption-history/:captionId/use', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const captionId = c.req.param('captionId');
        const database = new D1Database(c.env.DB);
        
        await database.incrementCaptionUsage(parseInt(captionId));
        return c.json({ success: true });
    } catch (error) {
        console.error('Error incrementing caption usage:', error);
        return c.json({ error: 'Failed to update caption usage' }, 500);
    }
});

// Scheduled posts API endpoints
app.get('/api/scheduled-posts', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const status = c.req.query('status');
        const database = new D1Database(c.env.DB);
        
        const posts = await database.getScheduledPosts(user.id, status);
        
        // Parse platforms from JSON string
        const parsedPosts = posts.map(post => {
            try {
                post.platforms = JSON.parse(post.platforms);
            } catch (e) {
                post.platforms = [];
            }
            return post;
        });
        
        return c.json({ posts: parsedPosts });
    } catch (error) {
        console.error('Error getting scheduled posts:', error);
        return c.json({ error: 'Failed to load scheduled posts' }, 500);
    }
});

app.post('/api/scheduled-posts', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const { imageId, captionId, customCaption, customHashtags, platforms, scheduledTime, timezone } = await c.req.json();
        const database = new D1Database(c.env.DB);
        
        if (!platforms || platforms.length === 0) {
            return c.json({ error: 'At least one platform must be selected' }, 400);
        }
        
        if (!scheduledTime) {
            return c.json({ error: 'Scheduled time is required' }, 400);
        }
        
        // Validate scheduled time is in the future
        const scheduledDate = new Date(scheduledTime);
        if (scheduledDate <= new Date()) {
            return c.json({ error: 'Scheduled time must be in the future' }, 400);
        }
        
        const postId = await database.createScheduledPost(
            user.id,
            imageId || null,
            captionId || null,
            customCaption || null,
            customHashtags || null,
            platforms,
            scheduledTime,
            timezone || null
        );
        
        if (postId) {
            return c.json({ success: true, postId });
        } else {
            return c.json({ error: 'Failed to create scheduled post' }, 500);
        }
    } catch (error) {
        console.error('Error creating scheduled post:', error);
        return c.json({ error: 'Failed to create scheduled post' }, 500);
    }
});

app.delete('/api/scheduled-posts/:postId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const postId = c.req.param('postId');
        const database = new D1Database(c.env.DB);
        
        const success = await database.deleteScheduledPost(user.id, parseInt(postId));
        
        if (success) {
            return c.json({ success: true });
        } else {
            return c.json({ error: 'Failed to delete scheduled post' }, 500);
        }
    } catch (error) {
        console.error('Error deleting scheduled post:', error);
        return c.json({ error: 'Failed to delete scheduled post' }, 500);
    }
});

// Get individual scheduled post
app.get('/api/scheduled-posts/:postId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const postId = c.req.param('postId');
        const database = new D1Database(c.env.DB);
        
        const post = await database.getScheduledPostById(user.id, postId);
        
        if (!post) {
            return c.json({ error: 'Scheduled post not found' }, 404);
        }
        
        // Parse platforms from JSON string
        try {
            post.platforms = JSON.parse(post.platforms);
        } catch (e) {
            post.platforms = [];
        }
        
        return c.json({ post });
    } catch (error) {
        console.error('Error getting scheduled post:', error);
        return c.json({ error: 'Failed to load scheduled post' }, 500);
    }
});

// Update scheduled post
app.put('/api/scheduled-posts/:postId', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const postId = c.req.param('postId');
        const { scheduledTime, caption, hashtags, timezone } = await c.req.json();
        const database = new D1Database(c.env.DB);
        
        // Validate required fields
        if (!scheduledTime) {
            return c.json({ error: 'Scheduled time is required' }, 400);
        }
        
        // Validate scheduled time is in the future
        const scheduledDate = new Date(scheduledTime);
        if (scheduledDate <= new Date()) {
            return c.json({ error: 'Scheduled time must be in the future' }, 400);
        }
        
        const success = await database.updateScheduledPost(
            user.id,
            postId,
            scheduledTime,
            caption,
            hashtags
        );
        
        if (success) {
            return c.json({ success: true });
        } else {
            return c.json({ error: 'Failed to update scheduled post - no matching post found or post is not pending' }, 400);
        }
    } catch (error) {
        console.error('Error updating scheduled post:', error);
        return c.json({ error: 'Failed to update scheduled post: ' + error.message }, 500);
    }
});

// Serve images from R2 storage (public endpoint for displaying images)
app.get('/api/images/:imageId', async (c) => {
    try {
        const imageId = c.req.param('imageId');
        console.log('Serving image for ID:', imageId);
        
        if (!c.env.R2_BUCKET) {
            console.error('R2 storage not configured');
            return c.text('R2 storage not configured', 500);
        }
        
        // The imageId parameter might already include the full R2 key (e.g., "images/1/timestamp-hash.jpg")
        // or it might be just a bare ID that needs the images/ prefix
        const r2Key = imageId.startsWith('images/') ? imageId : `images/${imageId}`;
        console.log('Using R2 key:', r2Key);
        const imageObject = await c.env.R2_BUCKET.get(r2Key);
        
        if (!imageObject) {
            console.error('Image not found in R2 using key:', r2Key);
            return c.text('Image not found', 404);
        }
        
        console.log('Image found, serving:', imageId);
        
        const headers = new Headers();
        headers.set('Content-Type', imageObject.httpMetadata?.contentType || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        headers.set('Access-Control-Allow-Origin', '*'); // Allow CORS for image serving
        
        return new Response(imageObject.body, { headers });
    } catch (error) {
        console.error('Error serving image:', error);
        return c.text('Failed to serve image: ' + error.message, 500);
    }
});


// Manual trigger for scheduled posts (for local testing)
app.get('/api/trigger-scheduled-posts', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        if (!user.isAdmin) {
            return c.json({ error: 'Admin access required' }, 403);
        }
        
        console.log('Manually triggering scheduled posts processing...');
        await handleScheduledPosts(c.env);
        
        return c.json({ success: true, message: 'Scheduled posts processing triggered' });
    } catch (error) {
        console.error('Error triggering scheduled posts:', error);
        return c.json({ error: 'Failed to trigger scheduled posts: ' + error.message }, 500);
    }
});

// Test page route to debug JavaScript
app.get('/test', (c) => {
  return c.html(`
<!DOCTYPE html>
<html>
<head>
    <title>Test JavaScript</title>
</head>
<body>
    <h1>JavaScript Test</h1>
    <button onclick="testFunction()">Test Button</button>
    <div id="result"></div>
    <script>
        function testFunction() {
            document.getElementById('result').innerHTML = 'Button works!';
        }
    </script>
</body>
</html>
  `);
});

// Static file routes - these will be handled by serveStatic middleware at the end

// Main route - redirect to static file
app.get('/', (c) => {
  return c.redirect('/index.html');
});

// Other routes return simple HTML
app.get('/auth', async (c) => {
    const inviteToken = c.req.query('invite');
    const email = c.req.query('email');
    
    if (inviteToken && email) {
        // Handle invite acceptance
        try {
            const database = new D1Database(c.env.DB);
            const invite = await database.getInviteToken(inviteToken);
            
            if (!invite) {
                return c.html(`
                    <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                        <h2>❌ Invalid or Expired Invitation</h2>
                        <p>This invitation link is invalid or has expired.</p>
                        <a href="/" style="color: #405de6;">← Back to Caption Studio</a>
                    </div>
                `);
            }
            
            if (invite.email !== email) {
                return c.html(`
                    <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                        <h2>❌ Invalid Invitation</h2>
                        <p>This invitation is not for the specified email address.</p>
                        <a href="/" style="color: #405de6;">← Back to Caption Studio</a>
                    </div>
                `);
            }
            
            // Get tier info if assigned in invite
            const invitedBy = await database.getUserById(invite.invited_by_user_id);
            const tierName = invite.assigned_tier_id ? 
                (await database.getTierById(invite.assigned_tier_id))&& name || 'Default' : 'Default';
                
            return c.html(`
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 30px; text-align: center; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <h2 style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px;">🎉 Welcome to AI Caption Studio!</h2>
                    
                    <div style="background: #f0f9ff; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e0f2fe;">
                        <p><strong>Invited by:</strong> ${invitedBy ? invitedBy.email : 'Administrator'}</p>
                        <p><strong>Your Account Tier:</strong> ${tierName}</p>
                    </div>
                    
                    <p>To complete your account setup, enter your email below and click "Get Started":</p>
                    
                    <div style="margin: 20px 0;">
                        <input type="email" id="inviteEmail" value="${email}" readonly 
                               style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; background: #f9f9f9;" />
                        <button onclick="acceptInvite()" 
                                style="width: 100%; padding: 15px; background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold;">
                            🚀 Get Started
                        </button>
                    </div>
                    
                    <div id="message" style="margin-top: 20px;"></div>
                    
                    <script>
                        async function acceptInvite() {
                            const button = document.querySelector('button');
                            const messageDiv = document.getElementById('message');
                            
                            button.disabled = true;
                            button.textContent = '⏳ Setting up your account...';
                            
                            try {
                                const response = await fetch('/api/auth/accept-invite', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        inviteToken: '${inviteToken}',
                                        email: '${email}'
                                    })
                                });
                                
                                const result = await response.json();
                                
                                if (result.success) {
                                    messageDiv.innerHTML = '<p style="color: green;">✅ Account created successfully! Logging you in...</p>';
                                    
                                    // Store the JWT token for authentication
                                    if (result.token) {
                                        localStorage.setItem('auth_token', result.token);
                                        localStorage.setItem('user', JSON.stringify(result.user));
                                        
                                        
                                        messageDiv.innerHTML = '<p style="color: green;">✅ Welcome! Redirecting to Caption Studio...</p>';
                                        setTimeout(() => {
                                            window.location.href = '/';
                                        }, 1500);
                                    } else {
                                        // Fallback to magic link if no token received
                                        messageDiv.innerHTML = '<p style="color: orange;">⚠️ Account created but login failed. Sending magic link...</p>';
                                        
                                        const loginResponse = await fetch('/api/auth/request-login', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ email: '${email}' })
                                        });
                                        
                                        const loginResult = await loginResponse.json();
                                        
                                        if (loginResult.success) {
                                            messageDiv.innerHTML = '<p style="color: green;">✅ Magic link sent to your email! Check your inbox to complete login.</p>';
                                        } else {
                                            messageDiv.innerHTML = '<p style="color: red;">❌ Account created but failed to send login link. Please go to the main page and request a login link.</p>';
                                        }
                                    }
                                } else {
                                    messageDiv.innerHTML = '<p style="color: red;">❌ ' + result.error + '</p>';
                                    button.disabled = false;
                                    button.textContent = '🚀 Get Started';
                                }
                            } catch (error) {
                                messageDiv.innerHTML = '<p style="color: red;">❌ Failed to accept invitation. Please try again.</p>';
                                button.disabled = false;
                                button.textContent = '🚀 Get Started';
                            }
                        }
                    </script>
                </div>
            `);
            
        } catch (error) {
            return c.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>❌ Error Processing Invitation</h2>
                    <p>There was an error processing your invitation. Please try again or contact support.</p>
                    <a href="/" style="color: #405de6;">← Back to Caption Studio</a>
                </div>
            `);
        }
    }
    
    // Default auth page if no invite token - redirect to static auth.html
    return c.redirect('/auth.html');
});

// Admin route will be handled by static file serving

// Admin route - redirect to static file
app.get('/admin', (c) => {
  return c.redirect('/admin.html');
});

// Settings route will be handled by static file serving

// Settings route - redirect to static file
app.get('/settings', (c) => {
  return c.redirect('/settings.html');
});

// Admin Users Page
// Admin users route will be handled by static file serving

// Admin users route - redirect to static file
app.get('/admin/users', (c) => {
  return c.redirect('/admin-users.html');
});

// Admin Tiers Page
// Admin tiers route will be handled by static file serving

// Admin tiers route - redirect to static file
app.get('/admin/tiers', (c) => {
  return c.redirect('/admin-tiers.html');
});

// Add a test route to verify the worker is working
app.get('/test-worker', (c) => {
  return c.json({ message: 'Worker is running', timestamp: new Date().toISOString() });
});

// Instagram token refresh endpoint (can be called manually or via cron job)
app.post('/api/maintenance/refresh-instagram-tokens', authenticateToken, async (c) => {
    const user = c.get('user');
    
    // Only allow admins to trigger token refresh
    if (!user || !user.isAdmin) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const database = new D1Database(c.env.DB);
        const refreshResult = await checkAndRefreshInstagramTokens(database, c.env);
        
        return c.json({
            success: true,
            message: 'Instagram token refresh completed',
            ...refreshResult
        });
    } catch (error) {
        console.error('Error in Instagram token refresh endpoint:', error);
        return c.json({ 
            error: 'Failed to refresh Instagram tokens',
            details: error.message 
        }, 500);
    }
});

// Background maintenance endpoint (can be called by external cron services)
app.get('/api/cron/maintenance', async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        const results = {
            instagram_token_refresh: null,
            timestamp: new Date().toISOString()
        };

        // Refresh Instagram tokens
        try {
            const refreshResult = await checkAndRefreshInstagramTokens(database, c.env);
            results.instagram_token_refresh = {
                success: true,
                ...refreshResult
            };
        } catch (error) {
            console.error('Instagram token refresh failed in cron job:', error);
            results.instagram_token_refresh = {
                success: false,
                error: error.message
            };
        }

        return c.json({
            success: true,
            message: 'Maintenance tasks completed',
            results
        });
    } catch (error) {
        console.error('Error in maintenance cron job:', error);
        return c.json({ 
            error: 'Maintenance tasks failed',
            details: error.message 
        }, 500);
    }
});

// Static page routes - serve HTML files for main application pages
// These routes serve the actual HTML pages (not API endpoints)

// Admin users management
app.get('/admin/users', async (c) => {
  // Serve the admin-users.html file
  return c.redirect('/admin-users.html');
});

// Admin tiers management  
app.get('/admin/tiers', async (c) => {
  // Serve the admin-tiers.html file
  return c.redirect('/admin-tiers.html');
});

// Image Library API Endpoints
app.get('/api/image-library', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        const images = await database.getImageLibrary(user.id);
        
        return c.json({
            success: true,
            images: images
        });
    } catch (error) {
        console.error('Error loading image library:', error);
        return c.json({ error: 'Failed to load image library' }, 500);
    }
});

app.get('/api/image-library/:id/captions', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const imageId = c.req.param('id');
        const database = new D1Database(c.env.DB);
        
        const imageWithCaptions = await database.getImageWithCaptions(user.id, imageId);
        
        if (!imageWithCaptions) {
            return c.json({ error: 'Image not found' }, 404);
        }
        
        return c.json({
            success: true,
            image: imageWithCaptions.image,
            captions: imageWithCaptions.captions
        });
    } catch (error) {
        console.error('Error loading image captions:', error);
        return c.json({ error: 'Failed to load image captions' }, 500);
    }
});

app.get('/api/image-library/:id/preview', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const imageId = c.req.param('id');
        const database = new D1Database(c.env.DB);
        
        // Get image details
        const imageData = await database.getImageWithCaptions(user.id, imageId);
        
        if (!imageData || !imageData.image) {
            return c.json({ error: 'Image not found' }, 404);
        }
        
        const image = imageData.image;
        
        // Get image from R2 if available
        if (c.env.R2_BUCKET && image.r2_key) {
            try {
                const r2Object = await c.env.R2_BUCKET.get(image.r2_key);
                if (r2Object) {
                    const headers = new Headers();
                    headers.set('Content-Type', image.mime_type || 'image/jpeg');
                    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
                    
                    return new Response(r2Object.body, { headers });
                }
            } catch (r2Error) {
                console.error('Error fetching from R2:', r2Error);
            }
        }
        
        // Fallback to placeholder or error
        return c.json({ error: 'Image data not available' }, 404);
    } catch (error) {
        console.error('Error loading image preview:', error);
        return c.json({ error: 'Failed to load image preview' }, 500);
    }
});

app.delete('/api/image-library/:id', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const imageId = c.req.param('id');
        const database = new D1Database(c.env.DB);
        
        // Get image details first to get R2 key
        const imageData = await database.getImageWithCaptions(user.id, imageId);
        
        if (!imageData || !imageData.image) {
            return c.json({ error: 'Image not found' }, 404);
        }
        
        const image = imageData.image;
        
        // Delete from database first
        const deleted = await database.deleteImageLibraryEntry(user.id, imageId);
        
        if (!deleted) {
            return c.json({ error: 'Failed to delete image from database' }, 500);
        }
        
        // Delete from R2 if exists
        if (c.env.R2_BUCKET && image.r2_key) {
            try {
                await c.env.R2_BUCKET.delete(image.r2_key);
            } catch (r2Error) {
                console.error('Error deleting from R2:', r2Error);
                // Don't fail the request if R2 deletion fails
            }
        }
        
        return c.json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        return c.json({ error: 'Failed to delete image' }, 500);
    }
});



// Helper function to post to social media platforms
async function postToSocialMedia(platform, post, imageData, platformSettings, env) {
    if (!platformSettings || !platformSettings.token) {
        throw new Error(`No valid token for ${platform}`);
    }
    
    const caption = post.custom_caption || post.caption || '';
    const hashtags = post.custom_hashtags || post.hashtags || '';
    const content = caption + (hashtags ? ' ' + hashtags : '');
    
    switch (platform) {
        case 'mastodon':
            return await postToMastodonCron(content, imageData, platformSettings, env);
        case 'pixelfed':
            return await postToPixelfedCron(content, imageData, platformSettings, env);
        case 'instagram':
            return await postToInstagramCron(content, imageData, platformSettings, env);
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

// Platform-specific posting functions for cron
async function postToMastodonCron(content, imageData, settings, env) {
    try {
        const instance = settings.instance;
        const token = settings.token;
        
        let mediaId = null;
        
        // Upload image if provided
        if (imageData) {
            const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
            const formData = new FormData();
            formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }));
            
            const mediaResponse = await fetch(`${instance}/api/v1/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (mediaResponse.ok) {
                const mediaResult = await mediaResponse.json();
                mediaId = mediaResult.id;
            }
        }
        
        // Create post
        const postData = {
            status: content,
            visibility: 'public'
        };
        
        if (mediaId) {
            postData.media_ids = [mediaId];
        }
        
        const response = await fetch(`${instance}/api/v1/statuses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('Error posting to Mastodon:', error);
        return false;
    }
}

async function postToPixelfedCron(content, imageData, settings, env) {
    try {
        const instance = settings.instance;
        const token = settings.token;
        
        // Handle content parameter - can be object or string
        let postContent = '';
        if (typeof content === 'object' && content !== null) {
            postContent = content.combinedContent || content.caption || '';
        } else if (typeof content === 'string') {
            postContent = content;
        }
        
        // Ensure we have content to post
        if (!postContent || postContent.trim() === '' || postContent === 'null') {
            console.error('No valid content provided for Pixelfed post');
            return false;
        }
        
        console.log('Pixelfed posting content:', postContent.substring(0, 100) + '...');
        
        let mediaId = null;
        
        // Upload image if provided
        if (imageData) {
            // Convert imageData to buffer (handle both base64 strings and ArrayBuffer)
            let imageBuffer;
            if (typeof imageData === 'string') {
                imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
            } else {
                imageBuffer = new Uint8Array(imageData);
            }
            
            const formData = new FormData();
            formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }));
            
            const mediaResponse = await fetch(`${instance}/api/v1/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (mediaResponse.ok) {
                const mediaResult = await mediaResponse.json();
                mediaId = mediaResult.id;
            } else {
                const errorText = await mediaResponse.text();
                console.error('Failed to upload image to Pixelfed:', mediaResponse.status, errorText);
                return false;
            }
        }
        
        // Create the post
        const postData = {
            status: postContent,
            visibility: 'public'
        };
        
        if (mediaId) {
            postData.media_ids = [mediaId];
        }
        
        const postResponse = await fetch(`${instance}/api/v1/statuses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        if (postResponse.ok) {
            const postResult = await postResponse.json();
            console.log('Successfully posted to Pixelfed:', postResult.url);
            return true;
        } else {
            const errorText = await postResponse.text();
            console.error('Failed to create post on Pixelfed:', postResponse.status, errorText);
            return false;
        }
        
    } catch (error) {
        console.error('Error posting to Pixelfed:', error);
        return false;
    }
}

async function postToInstagramCron(content, imageData, settings, env) {
    // Instagram Business API implementation - copied from working manual posting
    try {
        const instagramAccessToken = settings.access_token;
        const instagramAccountId = settings.account_id;
        
        // Handle content parameter - should be object with combinedContent
        let postContent = '';
        if (typeof content === 'object' && content !== null) {
            postContent = content.combinedContent || content.caption || '';
        } else if (typeof content === 'string') {
            postContent = content;
        }
        
        // Ensure we have content to post
        if (!postContent || postContent.trim() === '' || postContent === 'null') {
            console.error('No valid content provided for Instagram post');
            return false;
        }
        
        console.log('Posting to Instagram via scheduled post...');
        console.log('Caption:', postContent.substring(0, 100) + '...');
        
        if (!instagramAccessToken) {
            console.error('No Instagram access token found');
            return false;
        }
        
        if (!instagramAccountId) {
            console.error('No Instagram account ID found');
            return false;
        }
        
        if (!imageData) {
            console.error('No image data provided');
            return false;
        }
        
        // Convert imageData to buffer if it's base64
        let imageBuffer;
        if (typeof imageData === 'string') {
            imageBuffer = Buffer.from(imageData, 'base64');
        } else {
            imageBuffer = imageData;
        }
        
        // Upload image to Instagram posts folder for public access
        const imageKey = `instagram-posts/${Date.now()}-scheduled.jpg`;
        
        await env.R2_BUCKET.put(imageKey, imageBuffer, {
            httpMetadata: {
                contentType: 'image/jpeg'
            }
        });
        
        // For Instagram posting, we need a publicly accessible URL
        const publicImageUrl = `https://ai-caption-studio.jonsson.workers.dev/public-image/${imageKey}`;
        
        // Wait a moment to ensure image is fully available
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 2: Create Instagram media container
        const containerResponse = await fetch(`https://graph.instagram.com/${instagramAccountId}/media`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_url: publicImageUrl,
                caption: postContent,
                access_token: instagramAccessToken
            })
        });
        
        if (!containerResponse.ok) {
            const errorData = await containerResponse.json();
            console.error('Failed to create Instagram media container:', errorData);
            await env.R2_BUCKET.delete(imageKey); // Clean up
            return false;
        }
        
        const containerData = await containerResponse.json();
        const containerId = containerData.id;
        
        // Step 3: Publish the container
        const publishResponse = await fetch(`https://graph.instagram.com/${instagramAccountId}/media_publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                creation_id: containerId,
                access_token: instagramAccessToken
            })
        });
        
        if (publishResponse.ok) {
            const publishData = await publishResponse.json();
            console.log('Successfully posted to Instagram:', publishData.id);
            
            // Clean up temporary image after successful post
            await env.R2_BUCKET.delete(imageKey);
            
            return true;
        } else {
            const errorData = await publishResponse.json();
            console.error('Failed to publish Instagram post:', errorData);
            await env.R2_BUCKET.delete(imageKey); // Clean up
            return false;
        }
        
    } catch (error) {
        console.error('Error posting to Instagram in scheduled post:', error);
        return false;
    }
}

// Scheduled posts execution handler
async function handleScheduledPosts(env) {
    try {
        console.log('Processing scheduled posts...');
        const database = new D1Database(env.DB);
        
        // Get all pending scheduled posts that are due
        const duePosts = await database.getPendingScheduledPosts();
        
        console.log(`Found ${duePosts.length} posts to process`);
        
        for (const post of duePosts) {
            try {
                // Update status to processing
                await database.updateScheduledPostStatus(post.id, 'processing');
                
                // Get user's social media settings using the same method as manual posting
                const allSettings = await database.getUserSettings(post.user_id, 'social');
                
                // Build platform-specific settings the same way manual posting does
                const platformSettings = {
                    instagram: {},
                    mastodon: {},
                    pixelfed: {}
                };
                
                allSettings.forEach(setting => {
                    if (setting.setting_key === 'instagram_access_token') {
                        platformSettings.instagram.access_token = setting.setting_value;
                    } else if (setting.setting_key === 'instagram_account_id') {
                        platformSettings.instagram.account_id = setting.setting_value;
                    } else if (setting.setting_key === 'mastodon_token') {
                        platformSettings.mastodon.token = setting.setting_value;
                    } else if (setting.setting_key === 'mastodon_instance') {
                        platformSettings.mastodon.instance = setting.setting_value;
                    } else if (setting.setting_key === 'pixelfed_token') {
                        platformSettings.pixelfed.token = setting.setting_value;
                    } else if (setting.setting_key === 'pixelfed_instance') {
                        platformSettings.pixelfed.instance = setting.setting_value;
                    }
                });
                
                // Get image data if needed
                let imageData = null;
                if (post.r2_key && env.R2_BUCKET) {
                    try {
                        const imageObject = await env.R2_BUCKET.get(post.r2_key);
                        if (imageObject) {
                            imageData = await imageObject.arrayBuffer();
                        }
                    } catch (error) {
                        console.error(`Failed to get image with R2 key ${post.r2_key}:`, error);
                    }
                }
                
                // Prepare content with debugging and null safety
                console.log(`Post ${post.id} raw data - caption: "${post.caption}", hashtags: "${post.hashtags}"`);
                
                // Handle null values from database
                const safeCaption = post.caption && post.caption !== 'null' ? post.caption : '';
                const safeHashtags = post.hashtags && post.hashtags !== 'null' ? post.hashtags : '';
                
                // Hard fail if no caption - no fallback
                if (!safeCaption || safeCaption.trim() === '') {
                    console.error(`Scheduled post ${post.id} has no caption - failing post`);
                    await database.updateScheduledPostStatus(post.id, 'failed', 'No caption provided');
                    continue; // Skip to next post
                }
                
                const content = {
                    caption: safeCaption,
                    hashtags: safeHashtags,
                    combinedContent: safeCaption + (safeHashtags ? '\n\n' + safeHashtags : '')
                };
                
                console.log(`Post ${post.id} prepared content:`, JSON.stringify({
                    caption: content.caption,
                    hashtags: content.hashtags,
                    combinedContent: content.combinedContent?.substring(0, 100) + '...'
                }));
                
                // Parse platforms from JSON string
                let platforms = [];
                try {
                    console.log(`Raw platforms field for post ${post.id}:`, post.platforms);
                    platforms = JSON.parse(post.platforms);
                    console.log(`Parsed platforms for post ${post.id}:`, platforms);
                } catch (e) {
                    console.error(`Failed to parse platforms for post ${post.id}:`, e);
                    platforms = [post.platforms]; // Fallback to treat as single platform
                }
                
                // Post to each specified platform
                let success = false;
                let errorMessage = null;
                
                for (const platform of platforms) {
                    try {
                        let platformSuccess = false;
                        
                        switch (platform) {
                            case 'mastodon':
                                if (platformSettings.mastodon?.instance && platformSettings.mastodon?.token) {
                                    platformSuccess = await postToMastodonCron(content.combinedContent, imageData, platformSettings.mastodon, env);
                                } else {
                                    errorMessage = 'Mastodon not configured';
                                }
                                break;
                                
                            case 'pixelfed':
                                if (platformSettings.pixelfed?.instance && platformSettings.pixelfed?.token) {
                                    platformSuccess = await postToPixelfedCron(content, imageData, platformSettings.pixelfed, env);
                                } else {
                                    errorMessage = 'Pixelfed not configured';
                                }
                                break;
                                
                            case 'instagram':
                                if (platformSettings.instagram?.access_token) {
                                    platformSuccess = await postToInstagramCron(content, imageData, platformSettings.instagram, env);
                                } else {
                                    errorMessage = 'Instagram not configured - no access token found';
                                }
                                break;
                                
                            default:
                                errorMessage = `Unsupported platform: ${platform}`;
                        }
                        
                        if (platformSuccess) {
                            success = true;
                            console.log(`Successfully posted scheduled post ${post.id} to ${platform}`);
                        } else {
                            console.error(`Failed to post scheduled post ${post.id} to ${platform}: ${errorMessage}`);
                            console.log(`Debug: errorMessage value:`, JSON.stringify(errorMessage));
                        }
                        
                    } catch (platformError) {
                        console.error(`Error posting to ${platform} for post ${post.id}:`, platformError);
                        errorMessage = platformError.message;
                    }
                }
                
                // Update status based on result
                if (success) {
                    await database.updateScheduledPostStatus(post.id, 'completed');
                    console.log(`Successfully posted scheduled post ${post.id} to ${post.platform}`);
                } else {
                    const finalErrorMessage = errorMessage || 'Post failed';
                    console.log(`Debug: About to update post ${post.id} with error:`, JSON.stringify(finalErrorMessage));
                    await database.updateScheduledPostStatus(post.id, 'failed', finalErrorMessage);
                    console.error(`Failed to post scheduled post ${post.id}: ${finalErrorMessage}`);
                }
                
            } catch (error) {
                console.error(`Error processing scheduled post ${post.id}:`, error);
                await database.updateScheduledPostStatus(post.id, 'failed', error.message);
            }
        }
        
        console.log('Finished processing scheduled posts');
        
    } catch (error) {
        console.error('Error in handleScheduledPosts:', error);
    }
}

// Handle Instagram token refresh scheduled job
async function handleInstagramTokenRefresh(env) {
    try {
        console.log('Starting scheduled Instagram token refresh job');
        const database = new D1Database(env.DB);
        const refreshResult = await checkAndRefreshInstagramTokens(database, env);
        
        console.log('Scheduled Instagram token refresh completed:', refreshResult);
        
        // Optionally, you could send an admin notification here if needed
        if (refreshResult.errors?.length > 0) {
            console.error('Instagram token refresh had errors:', refreshResult.errors);
        }
        
        return refreshResult;
    } catch (error) {
        console.error('Scheduled Instagram token refresh failed:', error);
        // You could add error notification logic here
        throw error;
    }
}

// Export the main app and the scheduled event handler
export default {
    fetch: app.fetch,
    scheduled: async (event, env, ctx) => {
        // Handle different cron triggers
        switch (event.cron) {
            case '*/1 * * * *': // Scheduled posts processing every minute
                ctx.waitUntil(handleScheduledPosts(env));
                break;
            case '0 6 * * *': // Instagram token refresh daily at 6 AM UTC
                ctx.waitUntil(handleInstagramTokenRefresh(env));
                break;
            default:
                console.log('Unknown scheduled event:', event.cron);
        }
    }
};

