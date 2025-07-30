// Cloudflare Worker for AI Caption Studio using Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import exifr from 'exifr';

// Import D1 Database class
class D1Database {
    constructor(db) {
        this.db = db;
        this.CURRENT_SCHEMA_VERSION = 8;
    }

    async createUser(email, env = null) {
        try {
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
                        category TEXT NOT NULL,
                        setting_key TEXT NOT NULL,
                        setting_value TEXT NOT NULL,
                        encrypted BOOLEAN DEFAULT 0,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, category, setting_key),
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

    async getUserSettings(userId, category) {
        try {
            await this.ensureUserSettingsTable();
            
            const stmt = this.db.prepare(`
                SELECT * FROM user_settings 
                WHERE user_id = ? AND category = ?
                ORDER BY setting_key
            `);
            const result = await stmt.bind(userId, category).all();
            return result.results || [];
        } catch (error) {
            return [];
        }
    }

    async setUserSetting(userId, category, settingKey, settingValue, encrypted = false) {
        try {
            
            await this.ensureUserSettingsTable();
            
            // Use a more compatible approach - check if exists then update or insert
            const existingStmt = this.db.prepare(`
                SELECT id FROM user_settings 
                WHERE user_id = ? AND category = ? AND setting_key = ?
            `);
            
            const existing = await existingStmt.bind(userId, category, settingKey).first();
            
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
                
                // Handle integration_type if it exists and needs to be set
                if (columns.includes('integration_type')) {
                    updateParts.push('integration_type = ?');
                    updateValues.push(settingKey.split('_')[0]);
                }
                
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
                
                if (columns.includes('category')) {
                    insertColumns.push('category');
                    insertValues.push(category);
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
                
                // Handle the integration_type column that seems to be NOT NULL
                if (columns.includes('integration_type')) {
                    insertColumns.push('integration_type');
                    insertValues.push(settingKey.split('_')[0]); // e.g., 'mastodon' from 'mastodon_token'
                    placeholders.push('?');
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
            COALESCE(du.usage_count, 0) as usage_today
        FROM users u
        LEFT JOIN user_tiers t ON u.tier_id = t.id
        LEFT JOIN daily_usage du ON u.id = du.user_id AND du.date = date('now')
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

    const emailData = {
        from: env.SMTP_FROM_EMAIL || 'AI Caption Studio <noreply@resend.dev>',
        to: email,
        subject: 'Your Login Link - AI Caption Studio',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>🔐 Login to AI Caption Studio</h2>
                <p>Click the link below to securely login to your account:</p>
                <div style="margin: 30px 0;">
                    <a href="${loginUrl}" style="background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                        🚀 Login to AI Caption Studio
                    </a>
                </div>
                <p><strong>This link expires in 15 minutes</strong> for security.</p>
                <p>If you didn't request this login, you can safely ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    Time: ${new Date().toLocaleString()}
                </p>
            </div>
        `
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
        const token = crypto.randomUUID();
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
            return c.html('<h1>❌ Invalid Login Link</h1><p>This login link is invalid.</p><a href="/">← Back</a>');
        }

        const database = new D1Database(c.env.DB);
        const loginToken = await database.getLoginToken(token);
        
        if (!loginToken) {
            return c.html('<h1>❌ Invalid or Expired Link</h1><p>This login link is invalid or has expired.</p><a href="/">← Back</a>');
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
        const sessionId = crypto.randomUUID();
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

        return c.html(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h2>✅ Login Successful!</h2>
                <p>Welcome, ${user.email}!</p>
                <p>Redirecting to Caption Generator...</p>
                <script>
                    localStorage.setItem('auth_token', '${jwtToken}');
                    localStorage.setItem('user_email', '${user.email}');
                    setTimeout(() => window.location.href = '/', 2000);
                </script>
            </div>
        `);

    } catch (error) {
        return c.html('<h1>❌ Login Failed</h1><p>Login verification failed.</p><a href="/">← Back</a>');
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
        const sessionId = crypto.randomUUID();
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
        const token = crypto.randomUUID();
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
                            Time: ${new Date().toLocaleString()}${tierInfo ? `<br>Assigned Tier: ${tierInfo.name}` : ''}
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
        const newToken = crypto.randomUUID();
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
                        Time: ${new Date().toLocaleString()}
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

// Social media integration endpoints
app.get('/api/user/settings/social', authenticateToken, async (c) => {
    try {
        const user = c.get('user');
        const database = new D1Database(c.env.DB);
        
        // Get social media settings for the user
        const settings = await database.getUserSettings(user.id, 'social');
        
        const socialSettings = {
            mastodon: {},
            linkedin: {}
        };
        
        settings.forEach(setting => {
            const [platform, key] = setting.setting_key.split('_');
            if (platform === 'mastodon') {
                socialSettings.mastodon[key] = setting.encrypted ? '••••••••••••••••' : setting.setting_value;
            } else if (platform === 'linkedin') {
                socialSettings.linkedin[key] = setting.encrypted ? '••••••••••••••••' : setting.setting_value;
            }
        });
        
        return c.json(socialSettings);
    } catch (error) {
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
async function buildPromptFromImageWithExtraction(base64Image, includeWeather = false, style = 'creative', env = null, zoomLevel = 18) {
    
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
                            // Standard EXIF format: "2024:01:15 14:30:25"
                            // Convert to ISO format but treat as local time (no Z suffix)
                            dateStr = dateStr.replace(/:/g, '-').replace(/ /, 'T');
                            parsedDate = new Date(dateStr);
                        } else if (dateStr instanceof Date) {
                            parsedDate = dateStr;
                        }
                        
                        if (parsedDate && !isNaN(parsedDate.getTime())) {
                            extractedData.photoDateTime = parsedDate.toISOString();
                            extractedData.dateTimeSource = field;
                            context.push('Photo taken: ' + parsedDate.toLocaleDateString() + ' ' + parsedDate.toLocaleTimeString());
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
        '\\n2. 10-15 hashtags that:\\n' +
        '   - Mix popular (#photography, #instagood) and niche tags\\n' +
        '   - Are relevant to image content\\n' +
        '   - Include location-based tags if applicable\\n' +
        '   - Avoid banned or shadowbanned hashtags\\n' +
        '   - Range from broad to specific\\n' +
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
        'HASHTAGS: [hashtags separated by spaces]\\n' +
        'ALT_TEXT: [descriptive alt text for accessibility]';
    
    return { prompt, extractedData };
}

// Enhanced prompt building with user context
async function buildEnhancedPromptWithUserContext(base64Image, includeWeather, style, extractedData, userContext, env) {
    const context = [];
    
    // Add extracted technical data
    if (extractedData.photoDateTime) {
        const photoDate = new Date(extractedData.photoDateTime);
        context.push('Photo taken: ' + photoDate.toLocaleDateString() + ' ' + photoDate.toLocaleTimeString());
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
        '\\n2. 10-15 hashtags that:\\n' +
        '   - Mix popular (#photography, #instagood) and niche tags\\n' +
        '   - Are relevant to image content\\n' +
        '   - Include location-based tags if applicable\\n' +
        '   - Avoid banned or shadowbanned hashtags\\n' +
        '   - Range from broad to specific\\n' +
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
        'HASHTAGS: [hashtags separated by spaces]\\n' +
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
                        // Standard EXIF format: "2024:01:15 14:30:25"
                        // Convert to ISO format but treat as local time (no Z suffix)
                        dateStr = dateStr.replace(/:/g, '-').replace(/ /, 'T');
                        parsedDate = new Date(dateStr);
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
            // Use current weather for recent photos (within 5 days), historical for older
            const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
            
            if (photoTimestamp > fiveDaysAgo) {
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
    }
    
    return null;
}

// Helper function to get user's connected social media accounts
async function getConnectedSocialAccounts(database, userId) {
    try {
        const settings = await database.getUserSettings(userId, 'social');
        const connected = {
            mastodon: null,
            linkedin: null
        };
        
        settings.forEach(setting => {
            const [platform, key] = setting.setting_key.split('_');
            if (platform === 'mastodon' && key === 'instance') {
                connected.mastodon = { instance: setting.setting_value };
            } else if (platform === 'linkedin' && key === 'token' && setting.setting_value) {
                connected.linkedin = { connected: true };
            }
        });
        
        return connected;
    } catch (error) {
        return { mastodon: null, linkedin: null };
    }
}

// Caption generation endpoint - now requires authentication
app.post('/api/generate-caption', authenticateToken, async (c) => {
  try {
    const user = c.get('user');
    const { prompt, base64Image, style = 'creative', includeWeather = false, context = {} } = await c.req.json();
    
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
        
        // Get user's location zoom preference
        const locationSettings = await database.getUserSettings(user.id, 'location');
        let userZoomLevel = 18; // Default to highest precision
        locationSettings.forEach(setting => {
            if (setting.setting_key === 'zoom_level') {
                userZoomLevel = parseInt(setting.setting_value) || 18;
            }
        });
        
        // Always extract EXIF data and build enhanced prompt
        const result = await buildPromptFromImageWithExtraction(base64Image, shouldIncludeWeather, style, c.env, userZoomLevel);
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
        
        // If user provided context, rebuild the prompt to include it
        if (userContext.length > 0 || context.camera || context.location) {
            const enhancedResult = await buildEnhancedPromptWithUserContext(
                base64Image, 
                shouldIncludeWeather, 
                style, 
                extractedData, 
                userContext, 
                c.env
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
    
    // Log the query and increment usage
    const queryId = crypto.randomUUID();
    
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
    const responseData = { content: responseContent };
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

export default app;

