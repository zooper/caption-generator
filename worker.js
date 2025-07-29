// Cloudflare Worker for AI Caption Studio using Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
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
                console.log('Admin user created:', email);
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
            console.error('Failed to log query:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
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
                            console.error(`Failed to add ${col.name} column:`, alterError);
                        }
                    }
                }
            }
            
            // Verify final table structure
            const finalTableInfo = await this.db.prepare(`PRAGMA table_info(query_logs)`).all();
            
        } catch (error) {
            console.error('Error in ensureQueryLogsTable:', error);
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
            console.log('Daily usage incremented for user:', userId, 'result:', result);
            return true;
        } catch (error) {
            console.error('Failed to increment daily usage:', error);
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
            console.log('Could not ensure daily_usage table exists:', error);
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
            console.log('System settings table may not exist:', error.message);
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
            console.log(`System setting ${key} = ${value} saved successfully`);
            return true;
        } catch (error) {
            console.error('Failed to set system setting:', error);
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
            console.log('Could not ensure system_settings table exists:', error);
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
            console.log('System settings table may not exist:', error.message);
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
                            console.error(`Failed to add ${col.name} column:`, alterError);
                        }
                    } else {
                    }
                }
            }
            
            // Verify final table structure
            const finalTableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
            
        } catch (error) {
            console.error('Error in ensureUserSettingsTable:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
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
            console.error('Failed to get user settings:', error);
            return [];
        }
    }

    async setUserSetting(userId, category, settingKey, settingValue, encrypted = false) {
        try {
            console.log(`setUserSetting called:`, { userId, category, settingKey, valueLength: settingValue?.length, encrypted });
            
            await this.ensureUserSettingsTable();
            
            // Use a more compatible approach - check if exists then update or insert
            const existingStmt = this.db.prepare(`
                SELECT id FROM user_settings 
                WHERE user_id = ? AND category = ? AND setting_key = ?
            `);
            
            console.log(`Checking for existing setting: userId=${userId}, category=${category}, key=${settingKey}`);
            const existing = await existingStmt.bind(userId, category, settingKey).first();
            console.log(`Existing record found:`, existing);
            
            if (existing) {
                // Update existing record
                console.log(`Updating existing record with id=${existing.id}`);
                
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
                
                console.log('Update SQL:', updateSQL);
                console.log('Update values:', updateValues);
                
                const updateStmt = this.db.prepare(updateSQL);
                const result = await updateStmt.bind(...updateValues).run();
                console.log(`Update result:`, result);
                const changes = result.meta?.changes || result.changes || 0;
                console.log(`User setting ${category}.${settingKey} updated for user ${userId}, changes: ${changes}`);
                return changes > 0;
            } else {
                // Insert new record
                console.log(`Inserting new record`);
                
                // Check what columns exist in the table to build the correct INSERT
                const tableInfo = await this.db.prepare(`PRAGMA table_info(user_settings)`).all();
                const columns = (tableInfo.results || []).map(col => col.name);
                console.log('Available columns for INSERT:', columns);
                
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
                
                console.log('Insert SQL:', insertSQL);
                console.log('Insert values:', insertValues);
                
                const insertStmt = this.db.prepare(insertSQL);
                const result = await insertStmt.bind(...insertValues).run();
                console.log(`Insert result:`, result);
                const changes = result.meta?.changes || result.changes || 0;
                console.log(`User setting ${category}.${settingKey} created for user ${userId}, changes: ${changes}`);
                return changes > 0;
            }
        } catch (error) {
            console.error(`Failed to set user setting ${category}.${settingKey} for user ${userId}:`, error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
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
            const changes = result.meta?.changes || result.changes || 0;
            console.log(`User setting ${category}.${settingKey} deleted for user ${userId}, changes: ${changes}`);
            return changes > 0;
        } catch (error) {
            console.error('Failed to delete user setting:', error);
            return false;
        }
    }

    async deleteUser(userId) {
        try {
            // Start a transaction by deleting related data first
            console.log(`Deleting user ${userId} and all related data...`);
            
            // Delete user settings
            const settingsStmt = this.db.prepare('DELETE FROM user_settings WHERE user_id = ?');
            await settingsStmt.bind(userId).run();
            
            // Delete user sessions  
            const sessionsStmt = this.db.prepare('DELETE FROM user_sessions WHERE user_id = ?');
            await sessionsStmt.bind(userId).run();
            
            // Delete daily usage records
            const usageStmt = this.db.prepare('DELETE FROM daily_usage WHERE user_id = ?');
            await usageStmt.bind(userId).run();
            
            // Mark any invites sent by this user as expired (don't delete to preserve audit trail)
            const invitesStmt = this.db.prepare('UPDATE invite_tokens SET expires_at = datetime("now", "-1 day") WHERE invited_by_user_id = ?');
            await invitesStmt.bind(userId).run();
            
            // Finally delete the user record
            const userStmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            const result = await userStmt.bind(userId).run();
            
            const changes = result.meta?.changes || result.changes || 0;
            console.log(`User ${userId} deleted, changes: ${changes}`);
            return changes > 0;
        } catch (error) {
            console.error('Failed to delete user:', error);
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

        const decoded = jwt.verify(token, JWT_SECRET);
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
    const changes = result.meta?.changes || result.changes || 0;
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
    const changes = result.meta?.changes || result.changes || 0;
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
    const changes = result.meta?.changes || result.changes || 0;
    return changes > 0;
};

D1Database.prototype.setUserTier = async function(userId, tierId) {
    try {
        console.log('Database setUserTier called:', { userId, tierId });
        const stmt = this.db.prepare(`
            UPDATE users SET tier_id = ? WHERE id = ?
        `);
        const result = await stmt.bind(tierId, userId).run();
        console.log('setUserTier result:', result);
        
        // D1 result structure: result.meta.changes or result.changes
        const changes = result.meta?.changes || result.changes || 0;
        console.log('Changes detected:', changes);
        return changes > 0;
    } catch (error) {
        console.error('Error in setUserTier:', error);
        throw error;
    }
};

D1Database.prototype.createInviteToken = async function(email, invitedBy, token, expiresAt, tierId = null, personalMessage = null) {
    try {
        console.log('createInviteToken called with:', { email, invitedBy, token, expiresAt, tierId, personalMessage });
        
        // First ensure the invite_tokens table exists with proper schema
        await this.ensureInviteTokensTable();
        console.log('ensureInviteTokensTable completed successfully');
        
        // Debug: List all tables to see what exists
        try {
            const tablesResult = await this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            console.log('All tables in database:', tablesResult.results?.map(t => t.name) || 'No results');
            
            // Check the actual schema of invite_tokens table
            const schemaResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invite_tokens'").all();
            console.log('invite_tokens table schema:', schemaResult.results?.[0]?.sql || 'No schema found');
            
            // Check for any foreign keys or constraints that reference 'tiers'
            const fkResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE sql LIKE '%tiers%'").all();
            console.log('Objects referencing tiers:', fkResult.results || 'None found');
            
        } catch (listError) {
            console.log('Could not list tables:', listError.message);
        }
        
        console.log('About to prepare INSERT statement');
        const stmt = this.db.prepare(`
            INSERT INTO invite_tokens (email, invited_by, token, expires_at, tier_id, personal_message) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        console.log('INSERT statement prepared successfully');
        
        console.log('About to bind parameters and execute');
        const result = await stmt.bind(email, invitedBy, token, expiresAt, tierId, personalMessage).run();
        console.log('INSERT completed successfully:', result);
        
        return { email, token, expiresAt, tierId, personalMessage };
    } catch (error) {
        console.error('Error creating invite token:', error);
        console.error('Error stack:', error.stack);
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
        console.log('user_tiers table ensured');
    } catch (error) {
        console.log('Could not ensure user_tiers table exists:', error);
    }
};

D1Database.prototype.ensureInviteTokensTable = async function() {
    try {
        // Ensure user_tiers table exists first
        await this.ensureUserTiersTable();
        
        // Check if the table has the wrong foreign key constraint
        const schemaResult = await this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='invite_tokens'").all();
        const currentSchema = schemaResult.results?.[0]?.sql || '';
        
        if (currentSchema.includes('REFERENCES tiers(id)')) {
            console.log('Found incorrect foreign key constraint, recreating table...');
            
            // Drop and recreate the table with correct schema
            await this.db.prepare('DROP TABLE IF EXISTS invite_tokens').run();
            console.log('Dropped invite_tokens table with incorrect schema');
        }
        
        const stmt = this.db.prepare(`
            CREATE TABLE IF NOT EXISTS invite_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                invited_by INTEGER,
                token TEXT UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                tier_id INTEGER,
                personal_message TEXT,
                used_at DATETIME,
                used_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invited_by) REFERENCES users(id),
                FOREIGN KEY (used_by) REFERENCES users(id)
            )
        `);
        await stmt.run();
        
        // Add tier_id column if it doesn't exist (for existing tables)
        try {
            const alterStmt = this.db.prepare(`
                ALTER TABLE invite_tokens ADD COLUMN tier_id INTEGER
            `);
            await alterStmt.run();
            console.log('Added tier_id column to invite_tokens table');
        } catch (alterError) {
            // Column likely already exists, which is fine
            console.log('tier_id column already exists or could not be added:', alterError.message);
        }
        
        // Add personal_message column if it doesn't exist (for existing tables)
        try {
            const alterStmt2 = this.db.prepare(`
                ALTER TABLE invite_tokens ADD COLUMN personal_message TEXT
            `);
            await alterStmt2.run();
            console.log('Added personal_message column to invite_tokens table');
        } catch (alterError) {
            // Column likely already exists, which is fine
            console.log('personal_message column already exists or could not be added:', alterError.message);
        }
        
        console.log('invite_tokens table ensured');
    } catch (error) {
        console.log('Could not ensure invite_tokens table exists:', error);
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
        console.error('Error getting invite token:', error);
        return null;
    }
};

D1Database.prototype.useInviteToken = async function(token, userId) {
    console.log('useInviteToken called with:', { token, userId, userIdType: typeof userId });
    
    try {
        const stmt = this.db.prepare(`
            UPDATE invite_tokens 
            SET used_at = datetime('now'), used_by = ? 
            WHERE token = ?
        `);
        console.log('About to bind parameters:', { userId, token });
        const result = await stmt.bind(userId, token).run();
        console.log('useInviteToken result:', result);
        const changes = result.meta?.changes || result.changes || 0;
        return changes > 0;
    } catch (error) {
        console.error('Error in useInviteToken:', error);
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
            console.log('invite_tokens table does not exist, returning empty array');
            return [];
        }
        
        // Check what columns exist in the table
        const columnsCheck = this.db.prepare(`
            PRAGMA table_info(invite_tokens)
        `);
        const columns = await columnsCheck.all();
        const columnNames = (columns.results || []).map(col => col.name);
        console.log('invite_tokens table columns:', columnNames);
        
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
        } else if (columnNames.includes('invited_by')) {
            stmt = this.db.prepare(`
                SELECT i.*, COALESCE(u.email, 'System') as invited_by_email 
                FROM invite_tokens i
                LEFT JOIN users u ON i.invited_by = u.id
                WHERE i.used_at IS NULL 
                AND i.expires_at > datetime('now')
                ORDER BY i.created_at DESC
            `);
        } else {
            // Fallback for tables without invited_by column
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
        console.error('Error in getPendingInvites:', error);
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
    console.log('Email sent successfully via Resend:', result.id);
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
            console.error('Email sending failed:', emailError);
            
            // Fallback: show link for development if email fails
            return c.json({ 
                success: true, 
                message: 'Magic link generated (email sending failed: ' + emailError.message + ')',
                expiresIn: '15 minutes',
                loginUrl: loginUrl // Only shown when email fails
            });
        }

    } catch (error) {
        console.error('Magic link request error:', error);
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
        const jwtToken = jwt.sign({ sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

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
        console.error('Login verification error:', error);
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
        console.error('Logout error:', error);
        return c.json({ error: 'Logout failed' }, 500);
    }
});

// Accept invite endpoint - create account and assign tier
app.post('/api/auth/accept-invite', async (c) => {
    try {
        const { email, inviteToken } = await c.req.json();
        console.log('Accept invite called with:', { email, inviteToken });
        
        if (!email || !inviteToken) {
            return c.json({ error: 'Email and invite token are required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Validate the invite token
        console.log('Getting invite token...');
        const invite = await database.getInviteToken(inviteToken);
        console.log('Invite token result:', invite);
        if (!invite) {
            return c.json({ error: 'Invalid or expired invite token' }, 400);
        }
        
        if (invite.email !== email) {
            return c.json({ error: 'Email does not match the invitation' }, 400);
        }
        
        // Check if user already exists
        console.log('Checking if user exists...');
        const existingUser = await database.getUserByEmail(email);
        console.log('Existing user result:', existingUser);
        if (existingUser) {
            return c.json({ error: 'User already exists' }, 400);
        }
        
        // Create the user account
        console.log('Creating user account...');
        const user = await database.createUser(email, c.env);
        console.log('User created:', user);
        
        // Assign tier if specified in the invite
        if (invite.tier_id) {
            console.log('Assigning tier:', invite.tier_id);
            const tierInfo = await database.getTierById(invite.tier_id);
            console.log('Tier info:', tierInfo);
            if (tierInfo) {
                await database.setUserTier(user.id, invite.tier_id);
                console.log(`Assigned tier ${tierInfo.name} to user ${email}`);
            }
        }
        
        // Mark the invite token as used
        console.log('Marking invite as used with user ID:', user.id);
        await database.useInviteToken(inviteToken, user.id);
        console.log('Invite token marked as used successfully');
        
        // Create a login session for the new user
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        
        // Get client info for session
        const ipAddress = c.req.header('cf-connecting-ip') || 'unknown';
        const userAgent = c.req.header('user-agent') || '';
        
        console.log('Creating session with:', { sessionId, userId: user.id, expiresAt, ipAddress, userAgent });
        await database.createSession(sessionId, user.id, expiresAt, ipAddress, userAgent);
        console.log('Session created successfully');
        
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
        console.error('Accept invite error:', error);
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
        console.error('Error creating user:', error);
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
        
        console.log('Admin stats query results:', {
            userCount: userCount?.count || 0,
            queryCount: queryCount?.count || 0
        });
        
        return c.json({
            totalUsers: userCount?.count || 0,
            totalQueries: queryCount?.count || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin stats error:', error);
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
        
        console.log('Updating user tier:', { userId, tierId });
        
        const database = new D1Database(c.env.DB);
        
        // Handle clearing tier (tierId is null/empty)
        if (!tierId || tierId === '' || tierId === 'null') {
            console.log('Clearing tier for user:', userId);
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
            console.log('Tier not found:', tierId);
            return c.json({ error: 'Invalid tier ID' }, 400);
        }
        
        console.log('Setting user tier:', { userId, tierId, tierName: tier.name });
        const success = await database.setUserTier(userId, tierId);
        
        if (success) {
            return c.json({ 
                success: true, 
                message: `User tier updated to "${tier.name}"` 
            });
        } else {
            console.log('setUserTier returned false for userId:', userId);
            return c.json({ error: 'User not found' }, 404);
        }
    } catch (error) {
        console.error('Error updating user tier:', error);
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
        console.error('Error deleting user:', error);
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
                console.log('Available tables in database:', tablesResult.results?.map(t => t.name) || 'No results');
            } catch (dbError) {
                console.log('Could not list tables:', dbError.message);
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
            console.error('Email sending failed:', emailError);
            return c.json({ 
                success: true, 
                message: `Invitation created but email sending failed: ${emailError.message}`,
                inviteUrl: inviteUrl // Fallback: show link for manual sharing
            });
        }

    } catch (error) {
        console.error('Invite error:', error);
        return c.json({ error: 'Failed to send invitation' }, 500);
    }
});

app.get('/api/admin/invites', authenticateToken, requireAdmin, async (c) => {
    try {
        const database = new D1Database(c.env.DB);
        const invites = await database.getPendingInvites();
        console.log('Invites fetched successfully:', invites.length, 'invites');
        return c.json(invites);
    } catch (error) {
        console.error('Error in /api/admin/invites:', error);
        return c.json({ error: 'Failed to fetch invites: ' + error.message }, 500);
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
        
        console.log('Mastodon settings save request:', {
            userId: user.id,
            instance: instance ? instance.substring(0, 20) + '...' : 'null',
            tokenLength: token ? token.length : 0
        });
        
        if (!instance || !token) {
            console.log('Missing instance or token');
            return c.json({ error: 'Instance URL and token are required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        
        // Save Mastodon settings
        const instanceResult = await database.setUserSetting(user.id, 'social', 'mastodon_instance', instance, false);
        const tokenResult = await database.setUserSetting(user.id, 'social', 'mastodon_token', token, true);
        
        console.log('Mastodon settings save results:', {
            instanceSaved: instanceResult,
            tokenSaved: tokenResult
        });
        
        if (instanceResult && tokenResult) {
            return c.json({ success: true, message: 'Mastodon settings saved' });
        } else {
            console.error('One or both settings failed to save');
            return c.json({ error: 'Failed to save one or more settings' }, 500);
        }
    } catch (error) {
        console.error('Mastodon settings save error:', error);
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
        
        console.log('Posting to Mastodon:', {
            instance: mastodonInstance,
            statusLength: status.length,
            hasImage: !!image_data,
            hasAltText: !!alt_text
        });
        
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
                    console.log('Media uploaded successfully:', mediaId);
                } else {
                    console.error('Media upload failed:', mediaResponse.status, await mediaResponse.text());
                }
            } catch (mediaError) {
                console.error('Media upload error:', mediaError);
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
            console.log('Post created successfully:', postResult.id);
            
            return c.json({ 
                success: true, 
                message: 'Posted to Mastodon successfully!',
                url: postResult.url,
                id: postResult.id
            });
        } else {
            const errorText = await postResponse.text();
            console.error('Post creation failed:', postResponse.status, errorText);
            return c.json({ 
                error: 'Failed to create post on Mastodon: ' + postResponse.status 
            }, 500);
        }
        
    } catch (error) {
        console.error('Mastodon post error:', error);
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
                message: `Connected as ${userData.firstName?.localized?.en_US} ${userData.lastName?.localized?.en_US}` 
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
async function buildPromptFromImageWithExtraction(base64Image, includeWeather = false, style = 'creative', env = null) {
    
    if (!base64Image) {
        console.error('No base64Image provided to buildPromptFromImageWithExtraction');
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
                            console.log('Photo date extracted from ' + field + ':', {
                                original: exifData[field],
                                converted: dateStr,
                                parsed: parsedDate,
                                iso: parsedDate.toISOString()
                            });
                            break;
                        }
                    } catch (error) {
                        console.log('Failed to parse ' + field + ':', error.message);
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
                    console.log('Camera detected:', camera);
                }
            }
            
            // GPS location context
            if (exifData.GPSLatitude && exifData.GPSLongitude) {
                console.log('GPS coordinates found:', exifData.GPSLatitude, exifData.GPSLongitude);
                try {
                    // Convert DMS (degrees, minutes, seconds) to decimal degrees
                    const lat = convertDMSToDD(exifData.GPSLatitude, exifData.GPSLatitudeRef);
                    const lon = convertDMSToDD(exifData.GPSLongitude, exifData.GPSLongitudeRef);
                    console.log('Converted to decimal degrees:', lat, lon);
                    
                    extractedData.gpsLatitude = lat;
                    extractedData.gpsLongitude = lon;
                    
                    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
                        console.log('Attempting reverse geocoding...');
                        const location = await reverseGeocode(lat, lon);
                        if (location) {
                            context.push('Location: ' + location);
                            extractedData.locationName = location;
                            console.log('Location detected:', location);
                        }
                        
                        // Fetch weather data if requested and we have GPS coordinates
                        if (includeWeather && env) {
                            console.log('Fetching weather data for coordinates:', lat, lon);
                            const weatherData = await getHistoricalWeather(lat, lon, exifData, env);
                            if (weatherData) {
                                context.push('Weather: ' + weatherData);
                                extractedData.weatherData = weatherData;
                                console.log('Weather data added:', weatherData);
                            }
                        }
                    }
                } catch (e) {
                    console.log('GPS processing error:', e.message);
                }
            }
        }
    } catch (error) {
        console.log('EXIF extraction failed:', error.message);
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
        (context.length > 0 ? '   - Incorporates the provided context naturally\\n' : '') +
        '\\n2. 10-15 hashtags that:\\n' +
        '   - Mix popular (#photography, #instagood) and niche tags\\n' +
        '   - Are relevant to image content\\n' +
        '   - Include location-based tags if applicable\\n' +
        '   - Avoid banned or shadowbanned hashtags\\n' +
        '   - Range from broad to specific\\n' +
        (context.length > 0 ? '   - Include relevant hashtags based on the context provided\\n' : '') +
        '\\n3. Alt text for accessibility (1-2 sentences):\\n' +
        '   - Describe what is actually visible in the image\\n' +
        '   - Include important visual details for screen readers\\n' +
        '   - Focus on objective description, not interpretation\\n' +
        '   - Keep it concise but descriptive\\n' +
        contextString + '\\n\\n' +
        'Format your response as:\\n' +
        'CAPTION: [your caption here]\\n' +
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
        (context.length > 0 ? '   - Incorporates the provided context naturally\\n' : '') +
        '\\n2. 10-15 hashtags that:\\n' +
        '   - Mix popular (#photography, #instagood) and niche tags\\n' +
        '   - Are relevant to image content\\n' +
        '   - Include location-based tags if applicable\\n' +
        '   - Avoid banned or shadowbanned hashtags\\n' +
        '   - Range from broad to specific\\n' +
        (context.length > 0 ? '   - Include relevant hashtags based on the context provided\\n' : '') +
        '\\n3. Alt text for accessibility (1-2 sentences):\\n' +
        '   - Describe what is actually visible in the image\\n' +
        '   - Include important visual details for screen readers\\n' +
        '   - Focus on objective description, not interpretation\\n' +
        '   - Keep it concise but descriptive\\n' +
        contextString + '\\n\\n' +
        'Format your response as:\\n' +
        'CAPTION: [your caption here]\\n' +
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
async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(
            'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + latitude + '&lon=' + longitude + '&zoom=10&addressdetails=1',
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
                if (data.address.city) parts.push(data.address.city);
                else if (data.address.town) parts.push(data.address.town);
                else if (data.address.village) parts.push(data.address.village);
                
                if (data.address.state) parts.push(data.address.state);
                if (data.address.country) parts.push(data.address.country);
                
                return parts.join(', ') || data.display_name;
            }
        }
    } catch (error) {
        console.log('Reverse geocoding failed:', error.message);
    }
    
    return null;
}

// Fetch historical weather data using OpenWeatherMap API
async function getHistoricalWeather(latitude, longitude, exifData, env) {
    try {
        if (!env.OPENWEATHER_API_KEY) {
            console.log('OpenWeatherMap API key not configured');
            return null;
        }
        
        console.log('Attempting to fetch weather data for coordinates:', latitude, longitude);
        
        // Extract date from EXIF data, default to current time if not available
        let photoTimestamp = Date.now();
        let dateSource = 'current_time';
        
        // Try multiple date fields in order of preference
        const dateFields = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'];
        
        for (const field of dateFields) {
            if (exifData && exifData[field]) {
                try {
                    console.log('Trying to parse ' + field + ':', exifData[field]);
                    
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
                        console.log('Weather: Photo date extracted from ' + field + ':', {
                            original: exifData[field],
                            converted: dateStr,
                            parsed: parsedDate,
                            timestamp: photoTimestamp
                        });
                        break;
                    }
                } catch (dateError) {
                    console.log('Failed to parse ' + field + ':', dateError.message);
                }
            }
        }
        
        console.log('Photo timestamp source: ' + dateSource + ', date: ' + new Date(photoTimestamp));
        
        // Validate timestamp is reasonable (not in the future, not before 2000)
        const now = Date.now();
        const year2000 = new Date('2000-01-01').getTime();
        
        if (photoTimestamp > now || photoTimestamp < year2000) {
            console.log('Photo timestamp seems invalid, using current time:', new Date(photoTimestamp));
            photoTimestamp = now;
            dateSource = 'current_time_fallback';
        }
        
        // Convert to Unix timestamp (seconds)
        const unixTimestamp = Math.floor(photoTimestamp / 1000);
        
        // Use current weather for recent photos (within 5 days), historical for older
        const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);
        let weatherUrl;
        let apiDescription;
        
        if (photoTimestamp > fiveDaysAgo) {
            // Use current weather API for recent photos
            weatherUrl = 'https://api.openweathermap.org/data/2.5/weather?lat=' + latitude + '&lon=' + longitude + '&appid=' + env.OPENWEATHER_API_KEY + '&units=metric';
            apiDescription = 'current';
        } else {
            // Use historical weather API for older photos
            weatherUrl = 'https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=' + latitude + '&lon=' + longitude + '&dt=' + unixTimestamp + '&appid=' + env.OPENWEATHER_API_KEY + '&units=metric';
            apiDescription = 'historical';
        }
        
        console.log('Fetching ' + apiDescription + ' weather data from OpenWeatherMap...');
        
        const response = await fetch(weatherUrl, {
            headers: {
                'User-Agent': 'AI Caption Studio'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('OpenWeatherMap API error: ' + response.status + ' ' + response.statusText);
            console.log('Error details:', errorText);
            
            // If historical API fails, try current weather as fallback
            if (apiDescription === 'historical') {
                console.log('Historical weather API failed, falling back to current weather');
                const fallbackUrl = 'https://api.openweathermap.org/data/2.5/weather?lat=' + latitude + '&lon=' + longitude + '&appid=' + env.OPENWEATHER_API_KEY + '&units=metric';
                const fallbackResponse = await fetch(fallbackUrl);
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.main) {
                        const weatherText = Math.round(fallbackData.main.temp) + '°C, ' + fallbackData.weather[0].description +
                                           (fallbackData.main.humidity ? ', ' + fallbackData.main.humidity + '% humidity' : '') +
                                           (fallbackData.wind ? ', ' + Math.round(fallbackData.wind.speed * 3.6) + ' km/h wind' : '') +
                                           ' (current weather - historical not available)';
                        console.log('Fallback weather data:', weatherText);
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
            const weatherText = weatherInfo.temperature + '°C, ' + weatherInfo.description +
                               (weatherInfo.humidity ? ', ' + weatherInfo.humidity + '% humidity' : '') +
                               (weatherInfo.windSpeed ? ', ' + weatherInfo.windSpeed + ' km/h wind' : '');
            
            console.log('Weather data formatted:', weatherText);
            return weatherText;
        }
        
    } catch (error) {
        console.log('Weather API request failed:', error.message);
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
        console.error('Failed to get connected social accounts:', error);
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
        
        // Always extract EXIF data and build enhanced prompt
        const result = await buildPromptFromImageWithExtraction(base64Image, shouldIncludeWeather, style, c.env);
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
            console.log('User provided custom prompt, but using enhanced prompt with EXIF data for better results');
        }
    } catch (extractionError) {
        console.log('EXIF extraction failed, using basic prompt:', extractionError.message);
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
        
        finalPrompt = prompt || 'Analyze this image for Instagram posting. Generate:\\n\\n1. A ' + selectedStyle + ' caption that:\\n   - Captures the main subject/scene\\n   - Is 1-3 sentences\\n   - Includes relevant emojis\\n   - Feels authentic and natural\\n\\n2. 10-15 hashtags that:\\n   - Mix popular and niche tags\\n   - Are relevant to image content\\n   - Range from broad to specific\\n\\n3. Alt text for accessibility (1-2 sentences):\\n   - Describe what is actually visible in the image\\n   - Include important visual details for screen readers\\n\\nFormat your response as:\\nCAPTION: [your caption here]\\nHASHTAGS: [hashtags separated by spaces]\\nALT_TEXT: [descriptive alt text for accessibility]';
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
      console.error('OpenAI API Error:', response.status, errorData);
      return c.json({ error: 'OpenAI API request failed: ' + response.status }, response.status);
    }

    const data = await response.json();
    const responseContent = data.choices[0].message.content;
    
    // Log the query and increment usage
    const queryId = crypto.randomUUID();
    console.log('Logging query for user:', user.id, 'queryId:', queryId);
    
    const logResult = await database.logQuery({
        id: queryId,
        source: 'web',
        userId: user.id,
        email: user.email,
        processingTimeMs: Date.now() - Date.now(), // Simplified
        responseLength: responseContent.length
    });
    
    const usageResult = await database.incrementDailyUsage(user.id);
    
    console.log('Caption generation tracking results:', {
        queryLogged: logResult,
        usageIncremented: usageResult,
        userId: user.id
    });
    
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
    console.error('Caption generation error:', error);
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
            console.log('Test function called');
            document.getElementById('result').innerHTML = 'Button works!';
        }
    </script>
</body>
</html>
  `);
});

// Main page route
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Caption Studio</title>
    <script src="https://cdn.jsdelivr.net/npm/exifr/dist/lite.umd.js"></script>
    <style>
        /* Theme System */
        :root {
            --primary-gradient: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%);
            --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --accent-color: #405de6;
            --accent-rgb: 64, 93, 230;
            --text-primary: #333;
            --text-secondary: #666;
            --card-background: #ffffff;
            --border-color: #e1e5e9;
            --shadow-color: rgba(0, 0, 0, 0.1);
            --hover-shadow: rgba(64, 93, 230, 0.3);
        }
        
        [data-theme="dark"] {
            --primary-gradient: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%);
            --background-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --accent-color: #405de6;
            --accent-rgb: 64, 93, 230;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --card-background: #2a2a3e;
            --border-color: #404040;
            --shadow-color: rgba(0, 0, 0, 0.3);
            --hover-shadow: rgba(64, 93, 230, 0.5);
        }
        
        [data-theme="purple-creative"] {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --accent-color: #8B5CF6;
            --accent-rgb: 139, 92, 246;
            --text-primary: #333;
            --text-secondary: #666;
            --card-background: #ffffff;
            --border-color: #e1e5e9;
            --shadow-color: rgba(0, 0, 0, 0.1);
            --hover-shadow: rgba(139, 92, 246, 0.3);
        }
        
        [data-theme="ocean-blue"] {
            --primary-gradient: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
            --background-gradient: linear-gradient(135deg, #0c4a6e 0%, #0891b2 100%);
            --accent-color: #2196F3;
            --accent-rgb: 33, 150, 243;
            --text-primary: #333;
            --text-secondary: #666;
            --card-background: #ffffff;
            --border-color: #e1e5e9;
            --shadow-color: rgba(0, 0, 0, 0.1);
            --hover-shadow: rgba(33, 150, 243, 0.3);
        }
        </style>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--card-background); color: var(--text-primary); transition: all 0.3s ease; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; position: relative; }
        .header h1 { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 3em; margin-bottom: 10px; }
        .auth-section { position: absolute; top: 0; right: 0; padding: 20px; }
        .auth-form { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); min-width: 300px; }
        .auth-input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        .auth-btn { width: 100%; padding: 10px; background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; border: none; border-radius: 4px; cursor: pointer; }
        .user-info { text-align: right; }
        .login-section { text-align: center; margin: 40px 0; }
        .login-form { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .main-content { display: none; grid-template-columns: 1fr 1fr; gap: 40px; }
        .upload-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .upload-area { border: 3px dashed #e0e0e0; border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
        .upload-area:hover { border-color: #405de6; background: #f8f9ff; }
        .upload-area.dragover { border-color: #405de6; background: #f0f4ff; }
        .preview-image { max-width: 100%; max-height: 300px; border-radius: 8px; }
        .style-options { margin-top: 30px; }
        .style-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; }
        .style-btn { padding: 12px; border: 2px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        .style-btn:hover { border-color: #405de6; }
        .style-btn.active { border-color: #405de6; background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; }
        .results-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .generate-btn { width: 100%; padding: 15px; background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 20px; }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .loading { display: none; text-align: center; padding: 20px; }
        .result-card { margin-top: 20px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
        .copy-btn { margin-top: 10px; padding: 8px 16px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
        .social-preview { margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
        .social-preview-header { padding: 15px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; font-weight: 600; display: flex; align-items: center; gap: 10px; }
        .social-preview-content { padding: 15px; }
        .mastodon-preview { border-left: 4px solid #6364ff; }
        .linkedin-preview { border-left: 4px solid #0077b5; }
        .preview-text { margin: 10px 0; line-height: 1.5; }
        .preview-hashtags { color: #0077b5; font-size: 0.9em; margin-top: 10px; }
        .preview-alt { color: #666; font-size: 0.85em; font-style: italic; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px; }
        .preview-actions { margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }
        .post-btn { padding: 8px 16px; background: #6364ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .post-btn:hover { background: #5a5bd6; }
        .post-btn:disabled { background: #ccc; cursor: not-allowed; }
        .hidden { display: none; }
        @media (max-width: 768px) { .main-content { grid-template-columns: 1fr; } .main-content.show { display: grid; } }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="auth-section">
                <div id="authStatus" class="user-info hidden">
                    <p>Welcome, <span id="userEmail"></span>!</p>
                    <div style="display: flex; gap: 10px; margin-top: 10px; align-items: center;">
                        <select id="themeSelector" onchange="changeTheme()" style="padding: 5px 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            <option value="default">🎨 Default</option>
                            <option value="dark">🌙 Dark</option>
                            <option value="purple-creative">💜 Purple</option>
                            <option value="ocean-blue">🌊 Ocean</option>
                        </select>
                        <button id="adminButton" onclick="window.location.href='/admin'" style="padding: 5px 10px; background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: none;">🛠️ Admin</button>
                        <button onclick="window.location.href='/settings'" style="padding: 5px 10px; background: #e2e8f0; color: #475569; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">⚙️ Settings</button>
                        <button onclick="logout()" style="padding: 5px 10px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 12px;">Logout</button>
                    </div>
                </div>
            </div>
            <h1>🎨 AI Caption Studio</h1>
            <p>AI-powered captions, hashtags, and alt text for any social platform</p>
        </header>

        <!-- Login Section (shown when not authenticated) -->
        <div id="loginSection" class="login-section">
            <div class="login-form">
                <h2>🔐 Login to Continue</h2>
                <p>Enter your email to receive a magic login link</p>
                <input type="email" id="emailInput" class="auth-input" placeholder="your@email.com" required>
                <button id="loginButton" class="auth-btn">Send Magic Link</button>
                <div id="loginMessage" style="margin-top: 15px;"></div>
            </div>
        </div>

        <main class="main-content">
            <div class="upload-section">
                <div class="upload-area" id="uploadArea">
                    <div id="uploadPlaceholder">
                        <div style="font-size: 48px; margin-bottom: 20px;">📁</div>
                        <h3>Drop your image here</h3>
                        <p>or click to browse</p>
                        <p style="color: #666; font-size: 14px;">JPG, PNG, GIF up to 10MB</p>
                    </div>
                    <img class="preview-image hidden" id="previewImage" alt="Preview">
                    <input type="file" id="fileInput" accept="image/*" style="display: none;">
                </div>

                <div class="style-options">
                    <h3>Choose Caption Style</h3>
                    <div class="style-buttons">
                        <button class="style-btn active" data-style="creative">✨ Creative</button>
                        <button class="style-btn" data-style="professional">💼 Professional</button>
                        <button class="style-btn" data-style="casual">😄 Casual</button>
                        <button class="style-btn" data-style="trendy">🔥 Trendy</button>
                        <button class="style-btn" data-style="inspirational">💭 Inspirational</button>
                        <button class="style-btn" data-style="edgy">🖤 Edgy</button>
                    </div>
                </div>

                <div class="context-section" style="margin-top: 20px;">
                    <h3>Add Context (Optional)</h3>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Provide additional context to help AI generate more personalized captions</p>
                    
                    <div class="context-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="context-field">
                            <label for="cameraInput" style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">📷 Camera/Gear</label>
                            <input type="text" id="cameraInput" placeholder="Auto-detected or add manually..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        </div>
                        <div class="context-field">
                            <label for="eventInput" style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">🎉 Event/Occasion</label>
                            <input type="text" id="eventInput" placeholder="e.g., Wedding, Concert, Vacation, Birthday" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        </div>
                        <div class="context-field">
                            <label for="locationInput" style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">📍 Location</label>
                            <input type="text" id="locationInput" placeholder="Auto-detected or add manually..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        </div>
                        <div class="context-field">
                            <label for="moodInput" style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">💭 Mood/Vibe</label>
                            <input type="text" id="moodInput" placeholder="e.g., Nostalgic, Energetic, Peaceful, Fun" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        </div>
                        <div class="context-field">
                            <label for="subjectInput" style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">👤 Subject/Focus</label>
                            <input type="text" id="subjectInput" placeholder="e.g., Portrait, Landscape, Food, Pet" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        </div>
                        <div class="context-field">
                            <label for="customInput" style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">✏️ Custom Notes</label>
                            <input type="text" id="customInput" placeholder="Any other details you want to include" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        </div>
                    </div>
                    
                    <div class="weather-section" style="background: #f0f4ff; padding: 15px; border-radius: 8px; border: 1px solid #d0d7ff; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <input type="checkbox" id="weatherToggle" checked style="margin: 0;">
                            <label for="weatherToggle" style="font-weight: bold; margin: 0;">🌤️ Include Weather Data</label>
                        </div>
                        <p style="font-size: 12px; color: #666; margin: 0;">Automatically detect weather conditions from photo location & time for enhanced context</p>
                    </div>
                </div>

                <button class="generate-btn" id="generateBtn" disabled>🚀 Generate Caption</button>
            </div>

            <div class="results-section">
                <h3>Generated Content</h3>
                <div class="loading" id="loading">
                    <p>🤖 AI is analyzing your image...</p>
                </div>
                <div id="results" class="hidden">
                    <div class="result-card">
                        <h4>📝 Caption</h4>
                        <p id="captionText"></p>
                        <button class="copy-btn" onclick="copyToClipboard('captionText')">📋 Copy Caption</button>
                    </div>
                    <div class="result-card">
                        <h4>🏷️ Hashtags</h4>
                        <p id="hashtagsText"></p>
                        <button class="copy-btn" onclick="copyToClipboard('hashtagsText')">📋 Copy Hashtags</button>
                    </div>
                    <div class="result-card">
                        <h4>♿ Alt Text</h4>
                        <p id="altText"></p>
                        <button class="copy-btn" onclick="copyToClipboard('altText')">📋 Copy Alt Text</button>
                    </div>
                    <div class="result-card" id="metadataCard" style="display: none;">
                        <h4>📊 Photo Metadata</h4>
                        <div id="metadataContent" style="font-size: 14px; color: #666;"></div>
                    </div>
                    <div class="result-card" id="socialPreviewCard" style="display: none;">
                        <h4>📱 Social Media Previews</h4>
                        <div id="socialPreviewContent"></div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        let selectedStyle = 'creative';
        let uploadedImage = null;
        let isAuthenticated = false;

        // Authentication functions
        async function checkAuth() {
            try {
                // Try cookie-based auth first, then localStorage fallback
                let authHeader = {};
                const token = localStorage.getItem('auth_token');
                if (token) {
                    authHeader['Authorization'] = 'Bearer ' + token;
                }
                
                const response = await fetch('/api/auth/me', {
                    headers: authHeader,
                    credentials: 'include' // Include cookies
                });
                
                if (response.ok) {
                    const user = await response.json();
                    showAuthenticatedState(user);
                } else {
                    showLoginForm();
                }
            } catch (error) {
                showLoginForm();
            }
        }

        function showAuthenticatedState(user) {
            isAuthenticated = true;
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('authStatus').classList.remove('hidden');
            document.getElementById('userEmail').textContent = user.email;
            document.querySelector('.main-content').style.display = 'grid';
            
            // Show admin button if user is admin
            const adminButton = document.getElementById('adminButton');
            if (user.isAdmin && adminButton) {
                adminButton.style.display = 'inline-block';
            }
        }

        function showLoginForm() {
            isAuthenticated = false;
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('authStatus').classList.add('hidden');
            document.querySelector('.main-content').style.display = 'none';
            
            // Hide admin button
            const adminButton = document.getElementById('adminButton');
            if (adminButton) {
                adminButton.style.display = 'none';
            }
        }

        // Theme management functions
        function changeTheme() {
            const themeSelector = document.getElementById('themeSelector');
            const selectedTheme = themeSelector.value;
            
            // Remove existing theme classes
            document.body.removeAttribute('data-theme');
            
            // Apply new theme
            if (selectedTheme !== 'default') {
                document.body.setAttribute('data-theme', selectedTheme);
            }
            
            // Save theme preference
            localStorage.setItem('selectedTheme', selectedTheme);
            
            console.log('Theme changed to:', selectedTheme);
        }
        
        function loadSavedTheme() {
            const savedTheme = localStorage.getItem('selectedTheme') || 'default';
            const themeSelector = document.getElementById('themeSelector');
            
            if (themeSelector) {
                themeSelector.value = savedTheme;
                
                // Apply the saved theme
                if (savedTheme !== 'default') {
                    document.body.setAttribute('data-theme', savedTheme);
                }
            }
        }

        // Check authentication on page load
        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
            loadSavedTheme();
            
            // File upload handling - moved inside DOMContentLoaded
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');
            const previewImage = document.getElementById('previewImage');
            const uploadPlaceholder = document.getElementById('uploadPlaceholder');
            const generateBtn = document.getElementById('generateBtn');

            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) handleFile(files[0]);
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) handleFile(e.target.files[0]);
            });

                function handleFile(file) {
                if (file.size > 10 * 1024 * 1024) {
                    alert('File too large. Please select an image under 10MB.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImage.src = e.target.result;
                    previewImage.classList.remove('hidden');
                    uploadPlaceholder.classList.add('hidden');
                    uploadedImage = e.target.result.split(',')[1]; // Remove data:image/jpeg;base64,
                    generateBtn.disabled = false;
                    
                    // Extract EXIF metadata immediately when image is loaded
                    extractMetadataFromEXIF(file);
                };
                reader.readAsDataURL(file);
            }

            async function extractMetadataFromEXIF(file) {
            try {
                const locationInput = document.getElementById('locationInput');
                const cameraInput = document.getElementById('cameraInput');
                
                // Clear previous auto-detected values (but preserve any user-entered values)
                if (!locationInput.value || locationInput.dataset.autoDetected === 'true') {
                    locationInput.value = '';
                    locationInput.dataset.autoDetected = 'false';
                }
                if (!cameraInput.value || cameraInput.dataset.autoDetected === 'true') {
                    cameraInput.value = '';
                    cameraInput.dataset.autoDetected = 'false';
                }
                
                // Check if exifr is available
                if (typeof exifr === 'undefined') {
                    console.log('EXIFR library not loaded');
                    return;
                }

                console.log('Attempting to parse file:', file.name, file.type);
                
                // Extract both GPS and camera data
                const [gpsData, allExifData] = await Promise.all([
                    exifr.gps(file).catch(() => null),
                    exifr.parse(file).catch(err => {
                        console.error('EXIF parse error:', err);
                        return null;
                    })
                ]);
                
                console.log('GPS data:', gpsData);
                console.log('All EXIF data:', allExifData);
                
                let hasData = false;
                
                // Handle GPS/Location data
                if (gpsData && gpsData.latitude && gpsData.longitude) {
                    console.log('GPS coordinates found:', gpsData.latitude, gpsData.longitude);
                    
                    // Get location name from coordinates
                    const locationName = await reverseGeocode(gpsData.latitude, gpsData.longitude);
                    
                    if (locationName) {
                        locationInput.value = locationName;
                        locationInput.dataset.autoDetected = 'true';
                        hasData = true;
                    } else {
                        // Fallback to showing coordinates
                        locationInput.value = gpsData.latitude.toFixed(4) + ', ' + gpsData.longitude.toFixed(4);
                        locationInput.dataset.autoDetected = 'true';
                        hasData = true;
                    }
                }
                
                // Handle Camera data
                if (allExifData && (allExifData.Make || allExifData.Model)) {
                    const cameraParts = [];
                    
                    if (allExifData.Make) {
                        cameraParts.push(allExifData.Make);
                    }
                    
                    if (allExifData.Model && (!allExifData.Make || !allExifData.Model.includes(allExifData.Make))) {
                        cameraParts.push(allExifData.Model);
                    }
                    
                    if (allExifData.LensModel) {
                        cameraParts.push('(' + allExifData.LensModel + ')');
                    }
                    
                    const cameraInfo = cameraParts.join(' ').trim();
                    if (cameraInfo) {
                        cameraInput.value = cameraInfo;
                        cameraInput.dataset.autoDetected = 'true';
                        hasData = true;
                        console.log('Camera info extracted:', cameraInfo);
                    }
                } else {
                    console.log('No camera data found in EXIF');
                }
                
                if (hasData) {
                    console.log('EXIF metadata extracted successfully');
                } else {
                    console.log('No EXIF metadata found in this image');
                }
                
            } catch (error) {
                console.error('EXIF extraction error:', error);
            }
        }

            async function reverseGeocode(latitude, longitude) {
            try {
                const response = await fetch(
                    'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + latitude + '&lon=' + longitude + '&zoom=10&addressdetails=1',
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
                        if (data.address.city) parts.push(data.address.city);
                        else if (data.address.town) parts.push(data.address.town);
                        else if (data.address.village) parts.push(data.address.village);
                        
                        if (data.address.state) parts.push(data.address.state);
                        if (data.address.country) parts.push(data.address.country);
                        
                        return parts.join(', ') || data.display_name;
                    }
                }
            } catch (error) {
                console.log('Reverse geocoding failed:', error.message);
            }
            
            return null;
        }

            // Style selection
            document.querySelectorAll('.style-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedStyle = btn.dataset.style;
                });
            });

            // Generate caption
            generateBtn.addEventListener('click', async () => {
            if (!uploadedImage) return;

            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').classList.add('hidden');
            generateBtn.disabled = true;

            try {
                let headers = { 'Content-Type': 'application/json' };
                const token = localStorage.getItem('auth_token');
                if (token) {
                    headers['Authorization'] = 'Bearer ' + token;
                }
                
                // Collect context data from input fields
                const contextData = {
                    camera: document.getElementById('cameraInput').value.trim(),
                    event: document.getElementById('eventInput').value.trim(),
                    location: document.getElementById('locationInput').value.trim(),
                    mood: document.getElementById('moodInput').value.trim(),
                    subject: document.getElementById('subjectInput').value.trim(),
                    custom: document.getElementById('customInput').value.trim(),
                    includeWeather: document.getElementById('weatherToggle').checked,
                    customPrompt: localStorage.getItem('customPrompt') || ''
                };
                
                console.log('Context data:', contextData);
                
                const response = await fetch('/api/generate-caption', {
                    method: 'POST',
                    headers: headers,
                    credentials: 'include',
                    body: JSON.stringify({
                        base64Image: uploadedImage,
                        style: selectedStyle,
                        context: contextData
                    })
                });

                const data = await response.json();
                console.log('Server response data:', data);
                
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }

                // Parse the response content
                const content = data.content;
                const captionMatch = content.match(/CAPTION:\\s*(.+?)(?=\\\\n|HASHTAGS:|ALT_TEXT:|$)/s);
                const hashtagsMatch = content.match(/HASHTAGS:\\s*(.+?)(?=\\\\n|ALT_TEXT:|$)/s);
                const altTextMatch = content.match(/ALT_TEXT:\\s*(.+?)$/s);

                document.getElementById('captionText').textContent = captionMatch ? captionMatch[1].trim() : 'No caption generated';
                document.getElementById('hashtagsText').textContent = hashtagsMatch ? hashtagsMatch[1].trim() : 'No hashtags generated';
                document.getElementById('altText').textContent = altTextMatch ? altTextMatch[1].trim() : 'No alt text generated';

                // Display extracted metadata if available
                const metadataCard = document.getElementById('metadataCard');
                const metadataContent = document.getElementById('metadataContent');
                let metadataHtml = '';
                
                console.log('Checking metadata:', {
                    cameraInfo: data.cameraInfo,
                    locationName: data.locationName,
                    weatherData: data.weatherData,
                    photoDateTime: data.photoDateTime
                });
                
                if (data.cameraInfo && (data.cameraInfo.make || data.cameraInfo.model)) {
                    metadataHtml += '<div><strong>📷 Camera:</strong> ' + (data.cameraInfo.make || '') + ' ' + (data.cameraInfo.model || '') + '</div>';
                }
                
                if (data.locationName) {
                    metadataHtml += '<div><strong>📍 Location:</strong> ' + data.locationName + '</div>';
                }
                
                if (data.weatherData) {
                    metadataHtml += '<div><strong>🌤️ Weather:</strong> ' + data.weatherData + '</div>';
                }
                
                if (data.photoDateTime) {
                    const photoDate = new Date(data.photoDateTime);
                    metadataHtml += '<div><strong>📅 Photo Date:</strong> ' + photoDate.toLocaleDateString() + ' ' + photoDate.toLocaleTimeString() + '</div>';
                }
                
                console.log('Generated metadata HTML:', metadataHtml);
                
                if (metadataHtml) {
                    metadataContent.innerHTML = metadataHtml;
                    metadataCard.style.display = 'block';
                    console.log('Metadata card shown');
                } else {
                    metadataCard.style.display = 'none';
                    console.log('No metadata to display');
                }

                // Display social media previews if connected accounts exist
                const socialPreviewCard = document.getElementById('socialPreviewCard');
                const socialPreviewContent = document.getElementById('socialPreviewContent');
                
                if (data.connectedAccounts && (data.connectedAccounts.mastodon || data.connectedAccounts.linkedin)) {
                    console.log('Connected accounts found:', data.connectedAccounts);
                    
                    const captionText = captionMatch ? captionMatch[1].trim() : '';
                    const hashtagsText = hashtagsMatch ? hashtagsMatch[1].trim() : '';
                    const altTextContent = altTextMatch ? altTextMatch[1].trim() : '';
                    
                    let socialPreviewHtml = '';
                    
                    // Mastodon preview
                    if (data.connectedAccounts.mastodon && data.connectedAccounts.mastodon.instance) {
                        const instanceName = data.connectedAccounts.mastodon.instance.replace('https://', '').replace('http://', '');
                        socialPreviewHtml += '<div class="social-preview mastodon-preview">' +
                            '<div class="social-preview-header">' +
                            '<span>🐘</span>' +
                            '<span>Mastodon Preview (' + instanceName + ')</span>' +
                            '</div>' +
                            '<div class="social-preview-content">' +
                            '<div class="preview-text">' + captionText + '</div>' +
                            (hashtagsText ? '<div class="preview-hashtags">' + hashtagsText + '</div>' : '') +
                            (altTextContent ? '<div class="preview-alt">Alt text: ' + altTextContent + '</div>' : '') +
                            '<div class="preview-actions">' +
                            '<button class="post-btn" onclick="postToMastodon()">📝 Post to Mastodon</button>' +
                            '</div>' +
                            '</div>' +
                            '</div>';
                    }
                    
                    // LinkedIn preview
                    if (data.connectedAccounts.linkedin && data.connectedAccounts.linkedin.connected) {
                        socialPreviewHtml += '<div class="social-preview linkedin-preview">' +
                            '<div class="social-preview-header">' +
                            '<span>💼</span>' +
                            '<span>LinkedIn Preview</span>' +
                            '</div>' +
                            '<div class="social-preview-content">' +
                            '<div class="preview-text">' + captionText + '</div>' +
                            (hashtagsText ? '<div class="preview-hashtags">' + hashtagsText + '</div>' : '') +
                            '</div>' +
                            '</div>';
                    }
                    
                    if (socialPreviewHtml) {
                        socialPreviewContent.innerHTML = socialPreviewHtml;
                        socialPreviewCard.style.display = 'block';
                        console.log('Social media previews shown');
                    }
                } else {
                    socialPreviewCard.style.display = 'none';
                    console.log('No connected social accounts for preview');
                }

                document.getElementById('results').classList.remove('hidden');
            } catch (error) {
                alert('Error generating caption: ' + error.message);
            } finally {
                document.getElementById('loading').style.display = 'none';
                generateBtn.disabled = false;
            }
        });

            function copyToClipboard(elementId) {
            const text = document.getElementById(elementId).textContent;
            navigator.clipboard.writeText(text).then(() => {
                // Show feedback
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = originalText, 2000);
            });
        }

            async function postToMastodon() {
            try {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.disabled = true;
                btn.textContent = '⏳ Posting...';

                // Get the generated content
                const captionText = document.getElementById('captionText').textContent;
                const hashtagsText = document.getElementById('hashtagsText').textContent;
                const altText = document.getElementById('altText').textContent;
                
                // Combine caption and hashtags for the post
                const postContent = captionText + (hashtagsText ? ' ' + hashtagsText : '');

                const response = await fetch('/api/user/post/mastodon', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        status: postContent,
                        alt_text: altText,
                        image_data: uploadedImage // Send the base64 image data
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    btn.textContent = '✅ Posted!';
                    if (result.url) {
                        setTimeout(() => {
                            if (confirm('Post successful! Would you like to view it on Mastodon?')) {
                                window.open(result.url, '_blank');
                            }
                        }, 500);
                    }
                } else {
                    btn.textContent = '❌ Failed';
                    alert('Failed to post: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Post error:', error);
                event.target.textContent = '❌ Error';
                alert('Error posting to Mastodon: ' + error.message);
            } finally {
                setTimeout(() => {
                    event.target.disabled = false;
                    event.target.textContent = '📝 Post to Mastodon';
                }, 3000);
            }
        }

            // Authentication functions need to be inside DOMContentLoaded too
            async function requestLogin() {
                const email = document.getElementById('emailInput').value;
                const messageDiv = document.getElementById('loginMessage');
                
                if (!email) {
                    messageDiv.innerHTML = '<p style="color: red;">Please enter your email address</p>';
                    return;
                }

                messageDiv.innerHTML = '<p style="color: blue;">Sending magic link...</p>';

                try {
                    const response = await fetch('/api/auth/request-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        messageDiv.innerHTML = '<p style="color: green;">✅ ' + data.message + '</p>' + '<p style="font-size: 12px; color: #666;">Link expires in ' + data.expiresIn + '</p>';
                        if (data.loginUrl) {
                            messageDiv.innerHTML += '<p style="font-size: 12px; margin-top: 10px;"><a href="' + data.loginUrl + '" target="_blank">Click here if email fails</a></p>';
                        }
                    } else {
                        messageDiv.innerHTML = '<p style="color: red;">❌ ' + data.error + '</p>';
                    }
                } catch (error) {
                    console.error('Login request failed:', error);
                    messageDiv.innerHTML = '<p style="color: red;">❌ Failed to send magic link: ' + error.message + '</p>';
                }
            }

            async function logout() {
                try {
                    const token = localStorage.getItem('auth_token');
                    if (token) {
                        await fetch('/api/auth/logout', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + token },
                            credentials: 'include'
                        });
                    }
                } catch (error) {
                    // Server logout failed, but continue with local cleanup
                }
                
                // Clear local storage and cookies
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_email');
                document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                
                showLoginForm();
            }

            // Add event listener to login button
            const loginButton = document.getElementById('loginButton');
            if (loginButton) {
                loginButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    requestLogin();
                });
            }
            
            // Add Enter key listener to email input
            const emailInput = document.getElementById('emailInput');
            if (emailInput) {
                emailInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        requestLogin();
                    }
                });
            }
            
        }); // End of DOMContentLoaded callback
    </script>
</body>
</html>
  `);
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
            const invitedBy = await database.getUserById(invite.invited_by_user_id || invite.invited_by);
            const tierName = invite.assigned_tier_id ? 
                (await database.getTierById(invite.assigned_tier_id))?.name || 'Default' : 'Default';
                
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
                                    messageDiv.innerHTML = '<p style="color: green;">✅ Account created successfully! Sending you a magic link to log in...</p>';
                                    
                                    // Now request login for the new user
                                    const loginResponse = await fetch('/api/auth/request-login', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: '${email}' })
                                    });
                                    
                                    const loginResult = await loginResponse.json();
                                    
                                    if (loginResult.success) {
                                        messageDiv.innerHTML = '<p style="color: green;">✅ Magic link sent to your email! Check your inbox to complete login.</p>';
                                        setTimeout(() => {
                                            window.location.href = '/';
                                        }, 3000);
                                    } else {
                                        messageDiv.innerHTML = '<p style="color: orange;">⚠️ Account created but failed to send login link. Please go to the main page and request a login link.</p>';
                                    }
                                } else {
                                    messageDiv.innerHTML = '<p style="color: red;">❌ ' + result.error + '</p>';
                                    button.disabled = false;
                                    button.textContent = '🚀 Get Started';
                                }
                            } catch (error) {
                                console.error('Accept invite error:', error);
                                messageDiv.innerHTML = '<p style="color: red;">❌ Failed to accept invitation. Please try again.</p>';
                                button.disabled = false;
                                button.textContent = '🚀 Get Started';
                            }
                        }
                    </script>
                </div>
            `);
            
        } catch (error) {
            console.error('Error processing invite:', error);
            return c.html(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                    <h2>❌ Error Processing Invitation</h2>
                    <p>There was an error processing your invitation. Please try again or contact support.</p>
                    <a href="/" style="color: #405de6;">← Back to Caption Studio</a>
                </div>
            `);
        }
    }
    
    // Default auth page if no invite token
    return c.html(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
            <h1>🔐 Authentication</h1>
            <p>Authentication is integrated into the main page.</p>
            <a href="/" style="color: #405de6;">← Back to Main</a>
        </div>
    `);
});

app.get('/admin', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - AI Caption Studio</title>
    <style>
        /* Theme System */
        :root {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --card-background: #ffffff;
            --text-primary: #333;
            --text-secondary: #666;
            --border-color: #e2e8f0;
        }
        
        [data-theme="dark"] {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --card-background: #2a2a3e;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --border-color: #404040;
        }
        
        [data-theme="purple-creative"] {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --card-background: #ffffff;
            --text-primary: #333;
            --text-secondary: #666;
            --border-color: #e2e8f0;
        }
        
        [data-theme="ocean-blue"] {
            --primary-gradient: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
            --background-gradient: linear-gradient(135deg, #0c4a6e 0%, #0891b2 100%);
            --card-background: #ffffff;
            --text-primary: #333;
            --text-secondary: #666;
            --border-color: #e2e8f0;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--background-gradient); min-height: 100vh; color: var(--text-primary); padding: 20px; transition: all 0.3s ease; }
        .container { max-width: 1400px; margin: 0 auto; }
        .admin-header { background: var(--card-background); border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .admin-header h1 { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 2rem; font-weight: 700; }
        .nav-links { display: flex; gap: 15px; }
        .nav-link { padding: 10px 20px; background: var(--primary-gradient); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; transition: transform 0.2s; }
        .nav-link:hover { transform: translateY(-2px); }
        .admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .admin-card { background: var(--card-background); border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
        .card-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 15px; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
        .stat-value { font-size: 2.5rem; font-weight: 700; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .stat-label { color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px; }
        .admin-section { background: var(--card-background); border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
        .section-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: var(--primary-gradient); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(139, 92, 246, 0.4); }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-secondary:hover { background: #e2e8f0; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
        .table th { background: #f8fafc; font-weight: 600; color: var(--text-primary); }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 5px; font-weight: 500; color: var(--text-primary); }
        .form-input { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--card-background); color: var(--text-primary); }
        .form-input:focus { outline: none; border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }
        .form-help { display: block; margin-top: 5px; font-size: 12px; color: var(--text-secondary); }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); }
        .modal-content { background-color: var(--card-background); margin: 10% auto; padding: 30px; border-radius: 15px; width: 90%; max-width: 500px; }
        .hidden { display: none; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .gap-3 { gap: 12px; }
        .mb-4 { margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="admin-header" id="adminHeader" style="display: none;">
            <h1>🛠️ Admin Dashboard</h1>
            <div class="nav-links">
                <select id="themeSelector" onchange="changeTheme()" style="padding: 10px 20px; border: none; border-radius: 8px; margin-right: 10px; cursor: pointer; font-weight: 500;">
                    <option value="default">🎨 Default</option>
                    <option value="dark">🌙 Dark</option>
                    <option value="purple-creative">💜 Purple</option>
                    <option value="ocean-blue">🌊 Ocean</option>
                </select>
                <a href="/" class="nav-link">🏠 Main App</a>
                <a href="/admin/users" class="nav-link">👥 Users</a>
                <a href="/admin/tiers" class="nav-link">🏆 Tiers</a>
                <button class="nav-link" onclick="logout()" style="border: none; cursor: pointer;">🚪 Logout</button>
            </div>
        </div>

        <div id="loginRequired" class="admin-section">
            <h2>🔐 Admin Access Required</h2>
            <p>Please <a href="/" style="color: var(--accent-color);">login with an admin account</a> to access this page.</p>
        </div>

        <div id="adminContent" class="hidden">
            <!-- Stats Grid -->
            <div class="admin-grid">
                <div class="admin-card">
                    <div class="card-title">👥 Total Users</div>
                    <div class="stat-value" id="totalUsers">-</div>
                    <div class="stat-label">Registered users</div>
                </div>
                <div class="admin-card">
                    <div class="card-title">📊 Total Queries</div>
                    <div class="stat-value" id="totalQueries">-</div>
                    <div class="stat-label">AI generations</div>
                </div>
                <div class="admin-card">
                    <div class="card-title">🎫 Pending Invites</div>
                    <div class="stat-value" id="pendingInvites">-</div>
                    <div class="stat-label">Awaiting acceptance</div>
                </div>
                <div class="admin-card">
                    <div class="card-title">🏆 Active Tiers</div>
                    <div class="stat-value" id="activeTiers">-</div>
                    <div class="stat-label">User tier levels</div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="admin-section">
                <div class="section-title">⚡ Quick Actions</div>
                <div class="flex gap-3">
                    <button class="btn btn-primary" onclick="showInviteModal()">📧 Send Invite</button>
                    <button class="btn btn-secondary" onclick="window.location.href='/admin/tiers'">🏆 Manage Tiers</button>
                    <button class="btn btn-secondary" onclick="window.location.href='/admin/users'">👥 Manage Users</button>
                    <button class="btn btn-secondary" onclick="refreshData()">🔄 Refresh Data</button>
                </div>
            </div>

            <!-- Recent Users -->
            <div class="admin-section">
                <div class="section-title">👥 Recent Users</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Tier</th>
                            <th>Usage Today</th>
                            <th>Joined</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="recentUsers">
                        <tr><td colspan="5">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Recent Invites -->
            <div class="admin-section">
                <div class="section-title">📧 Recent Invites</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Invited By</th>
                            <th>Created</th>
                            <th>Expires</th>
                        </tr>
                    </thead>
                    <tbody id="recentInvites">
                        <tr><td colspan="4">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- System Settings -->
            <div class="admin-section">
                <div class="section-title">⚙️ System Settings</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                    <div>
                        <div class="form-group">
                            <label class="form-label">👤 Admin Email</label>
                            <input type="text" id="adminEmailDisplay" class="form-input" readonly style="background: #f8f9fa;">
                            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">Set via ADMIN_EMAIL environment variable</p>
                        </div>
                        <div class="form-group">
                            <label class="form-label">🔓 Registration Status</label>
                            <select id="registrationOpen" class="form-input">
                                <option value="true">Open - Anyone can register</option>
                                <option value="false">Closed - Invite only</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <div class="form-group">
                            <label class="form-label">📊 System Status</label>
                            <div style="padding: 10px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
                                <p><strong>Version:</strong> 1.0.0</p>
                                <p><strong>Database:</strong> Cloudflare D1</p>
                                <p><strong>Runtime:</strong> Cloudflare Workers</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex gap-3" style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="saveSystemSettings()">💾 Save Settings</button>
                    <button class="btn btn-secondary" onclick="loadSystemSettings()">🔄 Reload Settings</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Invite Modal -->
    <div id="inviteModal" class="modal">
        <div class="modal-content">
            <h2 class="mb-4">📧 Send Invitation</h2>
            
            <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="inviteEmail" class="form-input" placeholder="user@example.com" required>
                <small class="form-help">The user will receive a magic link to create their account</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Assign Tier (Optional)</label>
                <select id="inviteTier" class="form-input">
                    <option value="">No tier assigned (default)</option>
                </select>
                <small class="form-help">Assign a usage tier to the invited user</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Personal Message (Optional)</label>
                <textarea id="inviteMessage" class="form-input" rows="3" placeholder="Add a personal welcome message..."></textarea>
                <small class="form-help">This message will be included in the invitation email</small>
            </div>
            
            <div class="flex justify-between gap-3 mt-6">
                <button class="btn btn-secondary" onclick="closeInviteModal()">Cancel</button>
                <button class="btn btn-primary" onclick="sendInvite()">
                    <span id="inviteButtonText">📧 Send Invite</span>
                </button>
            </div>
        </div>
    </div>

    <script>
        async function checkAdminAuth() {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const user = await response.json();
                    if (user.isAdmin) {
                        document.getElementById('loginRequired').classList.add('hidden');
                        document.getElementById('adminHeader').style.display = 'flex';
                        document.getElementById('adminContent').classList.remove('hidden');
                        loadAdminData();
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        async function loadAdminData() {
            console.log('Loading admin data...');
            try {
                await Promise.all([
                    loadStats(),
                    loadRecentUsers(),
                    loadRecentInvites(),
                    loadSystemSettings()
                ]);
                console.log('Admin data loading completed');
            } catch (error) {
                console.error('Error loading admin data:', error);
            }
        }

        async function loadStats() {
            console.log('Loading stats...');
            try {
                const [statsResponse, invitesResponse, tiersResponse] = await Promise.all([
                    fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') } }),
                    fetch('/api/admin/invites', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') } }),
                    fetch('/api/admin/tiers', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') } })
                ]);

                console.log('Stats responses:', {
                    statsOk: statsResponse.ok,
                    invitesOk: invitesResponse.ok,
                    tiersOk: tiersResponse.ok
                });

                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    console.log('Stats data:', stats);
                    document.getElementById('totalUsers').textContent = stats.totalUsers;
                    document.getElementById('totalQueries').textContent = stats.totalQueries;
                } else {
                    console.error('Stats response not ok:', statsResponse.status, await statsResponse.text());
                }

                if (invitesResponse.ok) {
                    const invites = await invitesResponse.json();
                    console.log('Invites data:', invites);
                    document.getElementById('pendingInvites').textContent = invites.length;
                } else {
                    console.error('Invites response not ok:', invitesResponse.status, await invitesResponse.text());
                }

                if (tiersResponse.ok) {
                    const tiers = await tiersResponse.json();
                    console.log('Tiers data:', tiers);
                    document.getElementById('activeTiers').textContent = tiers.length;
                } else {
                    console.error('Tiers response not ok:', tiersResponse.status, await tiersResponse.text());
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        async function loadRecentUsers() {
            console.log('Loading recent users...');
            try {
                const response = await fetch('/api/admin/usage-stats', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                console.log('Recent users response:', response.ok, response.status);
                
                if (response.ok) {
                    const users = await response.json();
                    console.log('Recent users data:', users);
                    const tbody = document.getElementById('recentUsers');
                    tbody.innerHTML = users.slice(0, 10).map(user => 
                        '<tr>' +
                        '<td>' + user.email + '</td>' +
                        '<td>' + (user.tier_name || 'No tier') + '</td>' +
                        '<td>' + user.usage_today + '/' + (user.daily_limit === -1 ? '∞' : user.daily_limit) + '</td>' +
                        '<td>' + new Date(user.created_at).toLocaleDateString() + '</td>' +
                        '<td><span style="color: green;">●</span> Active</td>' +
                        '</tr>'
                    ).join('');
                } else {
                    console.error('Recent users response not ok:', response.status, await response.text());
                    document.getElementById('recentUsers').innerHTML = '<tr><td colspan="5">Failed to load users (Status: ' + response.status + ')</td></tr>';
                }
            } catch (error) {
                console.error('Error loading recent users:', error);
                document.getElementById('recentUsers').innerHTML = '<tr><td colspan="5">Failed to load users: ' + error.message + '</td></tr>';
            }
        }

        async function loadRecentInvites() {
            console.log('Loading recent invites...');
            try {
                const response = await fetch('/api/admin/invites', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                console.log('Recent invites response:', response.ok, response.status);
                
                if (response.ok) {
                    const invites = await response.json();
                    console.log('Recent invites data:', invites);
                    const tbody = document.getElementById('recentInvites');
                    tbody.innerHTML = invites.slice(0, 5).map(invite => 
                        '<tr>' +
                        '<td>' + invite.email + '</td>' +
                        '<td>' + invite.invited_by_email + '</td>' +
                        '<td>' + new Date(invite.created_at).toLocaleDateString() + '</td>' +
                        '<td>' + new Date(invite.expires_at).toLocaleDateString() + '</td>' +
                        '</tr>'
                    ).join('');
                } else {
                    console.error('Recent invites response not ok:', response.status, await response.text());
                    document.getElementById('recentInvites').innerHTML = '<tr><td colspan="4">Failed to load invites (Status: ' + response.status + ')</td></tr>';
                }
            } catch (error) {
                console.error('Error loading recent invites:', error);
                document.getElementById('recentInvites').innerHTML = '<tr><td colspan="4">Failed to load invites: ' + error.message + '</td></tr>';
            }
        }

        async function showInviteModal() {
            // Load available tiers
            try {
                const response = await fetch('/api/admin/tiers', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    const tiers = await response.json();
                    const tierSelect = document.getElementById('inviteTier');
                    
                    // Clear existing options except default
                    tierSelect.innerHTML = '<option value="">No tier assigned (default)</option>';
                    
                    // Add tier options
                    tiers.forEach(tier => {
                        const limitText = tier.daily_limit === -1 ? 'Unlimited' : tier.daily_limit + ' per day';
                        const option = document.createElement('option');
                        option.value = tier.id;
                        option.textContent = tier.name + ' (' + limitText + ')';
                        tierSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Failed to load tiers:', error);
            }
            
            document.getElementById('inviteModal').style.display = 'block';
        }

        function closeInviteModal() {
            document.getElementById('inviteModal').style.display = 'none';
            document.getElementById('inviteEmail').value = '';
            document.getElementById('inviteTier').value = '';
            document.getElementById('inviteMessage').value = '';
            document.getElementById('inviteButtonText').textContent = '📧 Send Invite';
        }

        async function sendInvite() {
            const email = document.getElementById('inviteEmail').value;
            const tierId = document.getElementById('inviteTier').value;
            const personalMessage = document.getElementById('inviteMessage').value;
            const buttonText = document.getElementById('inviteButtonText');
            
            if (!email) {
                alert('Please enter an email address');
                return;
            }

            // Show loading state
            buttonText.textContent = '⏳ Sending...';
            
            try {
                const inviteData = { email };
                
                // Add tier if selected
                if (tierId) {
                    inviteData.tierId = parseInt(tierId);
                }
                
                // Add personal message if provided
                if (personalMessage.trim()) {
                    inviteData.personalMessage = personalMessage.trim();
                }

                const response = await fetch('/api/admin/invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify(inviteData)
                });

                const result = await response.json();
                if (result.success) {
                    buttonText.textContent = '✅ Sent!';
                    setTimeout(() => {
                        alert('✅ Invitation sent successfully!');
                        closeInviteModal();
                        loadAdminData();
                    }, 500);
                } else {
                    buttonText.textContent = '❌ Failed';
                    setTimeout(() => {
                        alert('❌ Error: ' + result.error);
                        buttonText.textContent = '📧 Send Invite';
                    }, 1500);
                }
            } catch (error) {
                buttonText.textContent = '❌ Error';
                setTimeout(() => {
                    alert('❌ Failed to send invitation: ' + error.message);
                    buttonText.textContent = '📧 Send Invite';
                }, 1500);
            }
        }

        function refreshData() {
            loadAdminData();
        }

        async function loadSystemSettings() {
            try {
                const response = await fetch('/api/admin/settings', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('adminEmailDisplay').value = data.adminEmail;
                    document.getElementById('registrationOpen').value = data.settings.registration_open || 'true';
                }
            } catch (error) {
                console.error('Error loading system settings:', error);
            }
        }

        async function saveSystemSettings() {
            try {
                const registrationValue = document.getElementById('registrationOpen').value;
                console.log('Saving registration setting:', registrationValue);
                
                const settings = {
                    registration_open: registrationValue
                };

                const response = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ settings })
                });

                const result = await response.json();
                console.log('Save response:', result);
                
                if (result.success) {
                    alert('✅ System settings saved successfully!');
                    // Reload settings to verify they were saved
                    setTimeout(() => {
                        loadSystemSettings();
                    }, 500);
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                console.error('Save error:', error);
                alert('❌ Failed to save system settings: ' + error.message);
            }
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.log('Server logout failed:', error);
            }
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('inviteModal');
            if (event.target === modal) {
                closeInviteModal();
            }
        }

        // Theme management functions
        function changeTheme() {
            const themeSelector = document.getElementById('themeSelector');
            const selectedTheme = themeSelector.value;
            
            // Remove existing theme classes
            document.body.removeAttribute('data-theme');
            
            // Apply new theme
            if (selectedTheme !== 'default') {
                document.body.setAttribute('data-theme', selectedTheme);
            }
            
            // Save theme preference
            localStorage.setItem('selectedTheme', selectedTheme);
        }
        
        function loadSavedTheme() {
            const savedTheme = localStorage.getItem('selectedTheme') || 'default';
            const themeSelector = document.getElementById('themeSelector');
            
            if (themeSelector) {
                themeSelector.value = savedTheme;
                
                // Apply the saved theme
                if (savedTheme !== 'default') {
                    document.body.setAttribute('data-theme', savedTheme);
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            checkAdminAuth();
            loadSavedTheme();
        });
    </script>
</body>
</html>
  `);
});

app.get('/settings', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - AI Caption Studio</title>
    <style>
        /* Theme System */
        :root {
            --primary-gradient: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%);
            --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --card-background: #ffffff;
            --text-primary: #333;
            --text-secondary: #666;
            --border-color: #e1e5e9;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
        }
        
        [data-theme="dark"] {
            --primary-gradient: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%);
            --background-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --card-background: #2a2a3e;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --border-color: #404040;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--background-gradient); color: var(--text-primary); min-height: 100vh; padding: 20px; transition: all 0.3s ease; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; background: var(--card-background); padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
        .header h1 { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 2.5rem; margin-bottom: 10px; }
        .nav-link { color: var(--text-secondary); text-decoration: none; font-weight: 500; }
        .nav-link:hover { color: var(--text-primary); }
        .settings-section { background: var(--card-background); padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); margin-bottom: 25px; }
        .section-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 25px; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
        .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary); font-size: 14px; }
        .form-input, .form-select, .form-textarea { width: 100%; padding: 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--card-background); color: var(--text-primary); transition: border-color 0.2s; }
        .form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #405de6; box-shadow: 0 0 0 3px rgba(64, 93, 230, 0.1); }
        .form-textarea { min-height: 100px; resize: vertical; }
        .btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 14px; }
        .btn-primary { background: var(--primary-gradient); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(64, 93, 230, 0.4); }
        .btn-secondary { background: var(--border-color); color: var(--text-primary); }
        .btn-secondary:hover { background: #d1d5db; }
        .btn-success { background: var(--success-color); color: white; }
        .btn-warning { background: var(--warning-color); color: white; }
        .btn-danger { background: var(--error-color); color: white; }
        .integration-card { border: 2px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 15px; transition: border-color 0.2s; }
        .integration-card.connected { border-color: var(--success-color); background: rgba(16, 185, 129, 0.05); }
        .integration-card.error { border-color: var(--error-color); background: rgba(239, 68, 68, 0.05); }
        .integration-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
        .integration-title { font-weight: 600; font-size: 16px; display: flex; align-items: center; gap: 10px; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-connected { background: var(--success-color); color: white; }
        .status-disconnected { background: var(--border-color); color: var(--text-primary); }
        .status-error { background: var(--error-color); color: white; }
        .hidden { display: none; }
        .flex { display: flex; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .mt-3 { margin-top: 12px; }
        .mb-3 { margin-bottom: 12px; }
        .text-sm { font-size: 12px; }
        .text-muted { color: var(--text-secondary); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚙️ Settings</h1>
            <nav><a href="/" class="nav-link">← Back to Main</a></nav>
        </div>

        <div id="loginRequired" class="settings-section">
            <div class="section-title">🔐 Login Required</div>
            <p>Please login to access your settings.</p>
        </div>

        <div id="settingsContent" class="hidden">
            <!-- Account Information -->
            <div class="settings-section">
                <div class="section-title">👤 Account Information</div>
                <div class="settings-grid">
                    <div>
                        <p><strong>Email:</strong> <span id="userEmail">Loading...</span></p>
                        <p><strong>Account Type:</strong> <span id="userType">Loading...</span></p>
                        <p><strong>Member Since:</strong> <span id="memberSince">Loading...</span></p>
                    </div>
                </div>
            </div>

            <!-- Preferences -->
            <div class="settings-section">
                <div class="section-title">🎨 Preferences</div>
                <div class="settings-grid">
                    <div>
                        <div class="form-group">
                            <label class="form-label" for="defaultStyle">Default Caption Style</label>
                            <select id="defaultStyle" class="form-select">
                                <option value="creative">✨ Creative</option>
                                <option value="professional">💼 Professional</option>
                                <option value="casual">😄 Casual</option>
                                <option value="trendy">🔥 Trendy</option>
                                <option value="inspirational">💭 Inspirational</option>
                                <option value="edgy">🖤 Edgy</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="autoWeather">
                                <input type="checkbox" id="autoWeather" checked> Include Weather Data by Default
                            </label>
                            <p class="text-sm text-muted">Automatically include weather information in captions when location data is available</p>
                        </div>
                    </div>
                    <div>
                        <div class="form-group">
                            <label class="form-label" for="defaultHashtagCount">Default Hashtag Count</label>
                            <select id="defaultHashtagCount" class="form-select">
                                <option value="5">5 hashtags</option>
                                <option value="10" selected>10 hashtags</option>
                                <option value="15">15 hashtags</option>
                                <option value="20">20 hashtags</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="customPrompt">Custom Prompt Addition</label>
                            <textarea id="customPrompt" class="form-textarea" placeholder="Add any custom instructions that will be included in all your caption requests..."></textarea>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="savePreferences()">💾 Save Preferences</button>
            </div>

            <!-- Social Media Integrations -->
            <div class="settings-section">
                <div class="section-title">🔗 Social Media Integrations</div>
                
                <!-- Mastodon Integration -->
                <div id="mastodonCard" class="integration-card">
                    <div class="integration-header">
                        <div class="integration-title">
                            <span>🐘</span>
                            <span>Mastodon</span>
                        </div>
                        <span id="mastodonStatus" class="status-badge status-disconnected">Disconnected</span>
                    </div>
                    <div id="mastodonSettings">
                        <div class="form-group">
                            <label class="form-label" for="mastodonInstance">Instance URL</label>
                            <input type="url" id="mastodonInstance" class="form-input" placeholder="https://mastodon.social">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="mastodonToken">Access Token</label>
                            <input type="password" id="mastodonToken" class="form-input" placeholder="Your Mastodon access token">
                            <p class="text-sm text-muted mt-3">Generate an access token in your Mastodon instance settings under Development → New Application</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-primary" onclick="testMastodonConnection()">🔌 Test Connection</button>
                            <button class="btn btn-success" onclick="saveMastodonSettings()">💾 Save</button>
                            <button class="btn btn-secondary" onclick="disconnectMastodon()">🔌 Disconnect</button>
                        </div>
                    </div>
                </div>

                <!-- LinkedIn Integration -->
                <div id="linkedinCard" class="integration-card">
                    <div class="integration-header">
                        <div class="integration-title">
                            <span>💼</span>
                            <span>LinkedIn</span>
                        </div>
                        <span id="linkedinStatus" class="status-badge status-disconnected">Disconnected</span>
                    </div>
                    <div id="linkedinSettings">
                        <div class="form-group">
                            <label class="form-label" for="linkedinToken">Access Token</label>
                            <input type="password" id="linkedinToken" class="form-input" placeholder="Your LinkedIn access token">
                            <p class="text-sm text-muted mt-3">
                                Generate an access token via LinkedIn Developer Platform. 
                                <a href="https://developer.linkedin.com/" target="_blank" style="color: #405de6;">Learn more</a>
                            </p>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="linkedinAutoPost"> Enable Auto-posting
                            </label>
                            <p class="text-sm text-muted">Automatically post generated content to your LinkedIn profile</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-primary" onclick="testLinkedInConnection()">🔌 Test Connection</button>
                            <button class="btn btn-success" onclick="saveLinkedInSettings()">💾 Save</button>
                            <button class="btn btn-secondary" onclick="disconnectLinkedIn()">🔌 Disconnect</button>
                        </div>
                    </div>
                </div>

                <div class="mt-3">
                    <p class="text-sm text-muted">
                        <strong>Privacy Note:</strong> Your social media tokens are encrypted and stored securely. 
                        We never store your passwords and you can disconnect at any time.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function checkAuth() {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('loginRequired').classList.add('hidden');
                    document.getElementById('settingsContent').classList.remove('hidden');
                    document.getElementById('userEmail').textContent = user.email;
                    document.getElementById('userType').textContent = user.isAdmin ? 'Admin' : 'User';
                    document.getElementById('memberSince').textContent = new Date().toLocaleDateString();
                    
                    // Load saved preferences
                    loadPreferences();
                    loadSocialMediaSettings();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        function loadPreferences() {
            // Load saved preferences from localStorage
            const savedStyle = localStorage.getItem('defaultStyle') || 'creative';
            const autoWeather = localStorage.getItem('autoWeather') !== 'false';
            const hashtagCount = localStorage.getItem('defaultHashtagCount') || '10';
            const customPrompt = localStorage.getItem('customPrompt') || '';
            
            document.getElementById('defaultStyle').value = savedStyle;
            document.getElementById('autoWeather').checked = autoWeather;
            document.getElementById('defaultHashtagCount').value = hashtagCount;
            document.getElementById('customPrompt').value = customPrompt;
        }

        async function savePreferences() {
            const style = document.getElementById('defaultStyle').value;
            const autoWeather = document.getElementById('autoWeather').checked;
            const hashtagCount = document.getElementById('defaultHashtagCount').value;
            const customPrompt = document.getElementById('customPrompt').value;
            
            // Save to localStorage
            localStorage.setItem('defaultStyle', style);
            localStorage.setItem('autoWeather', autoWeather);
            localStorage.setItem('defaultHashtagCount', hashtagCount);
            localStorage.setItem('customPrompt', customPrompt);
            
            alert('✅ Preferences saved successfully!');
        }

        async function loadSocialMediaSettings() {
            try {
                const response = await fetch('/api/user/settings/social', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    const settings = await response.json();
                    
                    // Load Mastodon settings
                    if (settings.mastodon) {
                        document.getElementById('mastodonInstance').value = settings.mastodon.instance || '';
                        if (settings.mastodon.token) {
                            document.getElementById('mastodonToken').placeholder = '••••••••••••••••';
                            updateMastodonStatus('connected');
                        }
                    }
                    
                    // Load LinkedIn settings
                    if (settings.linkedin) {
                        if (settings.linkedin.token) {
                            document.getElementById('linkedinToken').placeholder = '••••••••••••••••';
                            updateLinkedInStatus('connected');
                        }
                        document.getElementById('linkedinAutoPost').checked = settings.linkedin.autoPost || false;
                    }
                }
            } catch (error) {
                console.log('Could not load social media settings:', error);
            }
        }

        function updateMastodonStatus(status) {
            const statusEl = document.getElementById('mastodonStatus');
            const cardEl = document.getElementById('mastodonCard');
            
            cardEl.className = 'integration-card';
            statusEl.className = 'status-badge';
            
            if (status === 'connected') {
                cardEl.classList.add('connected');
                statusEl.classList.add('status-connected');
                statusEl.textContent = 'Connected';
            } else if (status === 'error') {
                cardEl.classList.add('error');
                statusEl.classList.add('status-error');
                statusEl.textContent = 'Error';
            } else {
                statusEl.classList.add('status-disconnected');
                statusEl.textContent = 'Disconnected';
            }
        }

        function updateLinkedInStatus(status) {
            const statusEl = document.getElementById('linkedinStatus');
            const cardEl = document.getElementById('linkedinCard');
            
            cardEl.className = 'integration-card';
            statusEl.className = 'status-badge';
            
            if (status === 'connected') {
                cardEl.classList.add('connected');
                statusEl.classList.add('status-connected');
                statusEl.textContent = 'Connected';
            } else if (status === 'error') {
                cardEl.classList.add('error');
                statusEl.classList.add('status-error');
                statusEl.textContent = 'Error';
            } else {
                statusEl.classList.add('status-disconnected');
                statusEl.textContent = 'Disconnected';
            }
        }

        async function testMastodonConnection() {
            const instance = document.getElementById('mastodonInstance').value;
            const token = document.getElementById('mastodonToken').value;
            
            if (!instance || !token) {
                alert('Please fill in both instance URL and access token');
                return;
            }
            
            try {
                const response = await fetch('/api/user/settings/test-mastodon', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ instance, token })
                });
                
                const result = await response.json();
                if (result.success) {
                    updateMastodonStatus('connected');
                    alert('✅ Mastodon connection successful!');
                } else {
                    updateMastodonStatus('error');
                    alert('❌ Connection failed: ' + result.error);
                }
            } catch (error) {
                updateMastodonStatus('error');
                alert('❌ Connection test failed: ' + error.message);
            }
        }

        async function saveMastodonSettings() {
            const instance = document.getElementById('mastodonInstance').value;
            const token = document.getElementById('mastodonToken').value;
            
            if (!instance || !token) {
                alert('Please fill in both instance URL and access token');
                return;
            }
            
            try {
                const response = await fetch('/api/user/settings/mastodon', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ instance, token })
                });
                
                const result = await response.json();
                if (result.success) {
                    updateMastodonStatus('connected');
                    document.getElementById('mastodonToken').placeholder = '••••••••••••••••';
                    document.getElementById('mastodonToken').value = '';
                    alert('✅ Mastodon settings saved successfully!');
                } else {
                    alert('❌ Failed to save settings: ' + result.error);
                }
            } catch (error) {
                alert('❌ Failed to save settings: ' + error.message);
            }
        }

        async function testLinkedInConnection() {
            const token = document.getElementById('linkedinToken').value;
            
            if (!token) {
                alert('Please enter your LinkedIn access token');
                return;
            }
            
            try {
                const response = await fetch('/api/user/settings/test-linkedin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ token })
                });
                
                const result = await response.json();
                if (result.success) {
                    updateLinkedInStatus('connected');
                    alert('✅ LinkedIn connection successful!');
                } else {
                    updateLinkedInStatus('error');
                    alert('❌ Connection failed: ' + result.error);
                }
            } catch (error) {
                updateLinkedInStatus('error');
                alert('❌ Connection test failed: ' + error.message);
            }
        }

        async function saveLinkedInSettings() {
            const token = document.getElementById('linkedinToken').value;
            const autoPost = document.getElementById('linkedinAutoPost').checked;
            
            if (!token) {
                alert('Please enter your LinkedIn access token');
                return;
            }
            
            try {
                const response = await fetch('/api/user/settings/linkedin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ token, autoPost })
                });
                
                const result = await response.json();
                if (result.success) {
                    updateLinkedInStatus('connected');
                    document.getElementById('linkedinToken').placeholder = '••••••••••••••••';
                    document.getElementById('linkedinToken').value = '';
                    alert('✅ LinkedIn settings saved successfully!');
                } else {
                    alert('❌ Failed to save settings: ' + result.error);
                }
            } catch (error) {
                alert('❌ Failed to save settings: ' + error.message);
            }
        }

        async function disconnectMastodon() {
            if (!confirm('Are you sure you want to disconnect Mastodon?')) return;
            
            try {
                const response = await fetch('/api/user/settings/mastodon', {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    updateMastodonStatus('disconnected');
                    document.getElementById('mastodonInstance').value = '';
                    document.getElementById('mastodonToken').value = '';
                    document.getElementById('mastodonToken').placeholder = 'Your Mastodon access token';
                    alert('✅ Mastodon disconnected successfully!');
                }
            } catch (error) {
                alert('❌ Failed to disconnect: ' + error.message);
            }
        }

        async function disconnectLinkedIn() {
            if (!confirm('Are you sure you want to disconnect LinkedIn?')) return;
            
            try {
                const response = await fetch('/api/user/settings/linkedin', {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    updateLinkedInStatus('disconnected');
                    document.getElementById('linkedinToken').value = '';
                    document.getElementById('linkedinToken').placeholder = 'Your LinkedIn access token';
                    document.getElementById('linkedinAutoPost').checked = false;
                    alert('✅ LinkedIn disconnected successfully!');
                }
            } catch (error) {
                alert('❌ Failed to disconnect: ' + error.message);
            }
        }

        document.addEventListener('DOMContentLoaded', checkAuth);
    </script>
</body>
</html>
  `);
});

// Admin Users Page
app.get('/admin/users', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Users - AI Caption Studio</title>
    <style>
        /* Theme System */
        :root {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --card-background: #ffffff;
            --text-primary: #333;
            --text-secondary: #666;
            --border-color: #e2e8f0;
        }
        
        [data-theme="dark"] {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --card-background: #2a2a3e;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --border-color: #404040;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--background-gradient); min-height: 100vh; color: var(--text-primary); padding: 20px; transition: all 0.3s ease; }
        .container { max-width: 1400px; margin: 0 auto; }
        .admin-header { background: var(--card-background); border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .admin-header h1 { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 2rem; font-weight: 700; }
        .nav-links { display: flex; gap: 15px; }
        .nav-link { padding: 10px 20px; background: var(--primary-gradient); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; transition: transform 0.2s; }
        .nav-link:hover { transform: translateY(-2px); }
        .admin-section { background: var(--card-background); border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
        .section-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: var(--primary-gradient); color: white; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-danger { background: #ef4444; color: white; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
        .table th { background: #f8fafc; font-weight: 600; color: var(--text-primary); }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .badge-admin { background: #8B5CF6; color: white; }
        .badge-user { background: #e2e8f0; color: #475569; }
        .badge-active { background: #10b981; color: white; }
        .badge-inactive { background: #ef4444; color: white; }
        .hidden { display: none; }
        .flex { display: flex; }
        .gap-2 { gap: 8px; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        
        /* Modal Styling */
        .modal { 
            display: none; 
            position: fixed; 
            z-index: 1000; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: 100%; 
            background-color: rgba(0, 0, 0, 0.5); 
        }
        .modal-content { 
            background-color: var(--card-background); 
            margin: 10% auto; 
            padding: 30px; 
            border-radius: 15px; 
            width: 90%; 
            max-width: 500px; 
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            color: var(--text-primary);
        }
        .modal-content h3 {
            margin: 0 0 20px 0;
            color: var(--text-primary);
        }
        .modal-content input[type="email"],
        .modal-content input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--card-background);
            color: var(--text-primary);
            box-sizing: border-box;
            font-size: 14px;
        }
        .modal-content input[type="email"]:focus,
        .modal-content input[type="text"]:focus {
            outline: none;
            border-color: #8B5CF6;
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        .modal-content label {
            color: var(--text-primary);
            font-weight: 500;
            display: block;
            margin-bottom: 5px;
        }
        .modal-content input[type="checkbox"] {
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="admin-header" id="adminHeader" style="display: none;">
            <h1>👥 Manage Users</h1>
            <div class="nav-links">
                <a href="/admin" class="nav-link">🏠 Dashboard</a>
                <a href="/admin/tiers" class="nav-link">🏆 Tiers</a>
                <a href="/" class="nav-link">🏠 Main App</a>
                <button class="nav-link" onclick="logout()" style="border: none; cursor: pointer;">🚪 Logout</button>
            </div>
        </div>

        <div id="loginRequired" class="admin-section">
            <h2>🔐 Admin Access Required</h2>
            <p>Please <a href="/" style="color: var(--accent-color);">login with an admin account</a> to access this page.</p>
        </div>

        <div id="adminContent" class="hidden">
            <!-- User Management -->
            <div class="admin-section">
                <div class="flex justify-between items-center">
                    <div class="section-title">All Users</div>
                    <div class="flex gap-2">
                        <button class="btn btn-primary" onclick="refreshUsers()">🔄 Refresh</button>
                        <button class="btn btn-secondary" onclick="showInviteModal()">📧 Send Invite</button>
                        <button class="btn btn-primary" onclick="showAddUserModal()">👤 Add User</button>
                    </div>
                </div>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Type</th>
                            <th>Tier</th>
                            <th>Usage Today</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usersTable">
                        <tr><td colspan="7">Loading users...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal" style="display: none;">
        <div class="modal-content">
            <h3>⚠️ Delete User</h3>
            <p id="deleteModalText">Are you sure you want to delete this user?</p>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                <button class="btn btn-danger" onclick="confirmDelete()">Delete User</button>
            </div>
        </div>
    </div>

    <!-- Second Confirmation Modal -->
    <div id="confirmModal" class="modal" style="display: none;">
        <div class="modal-content">
            <h3>🔐 Final Confirmation</h3>
            <p>To confirm deletion, please type <strong>"DELETE"</strong> (all caps):</p>
            <input type="text" id="confirmInput" placeholder="Type DELETE here" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeConfirmModal()">Cancel</button>
                <button class="btn btn-danger" onclick="finalDelete()">Confirm Delete</button>
            </div>
        </div>
    </div>

    <!-- Add User Modal -->
    <div id="addUserModal" class="modal">
        <div class="modal-content">
            <h3>👤 Add New User</h3>
            <div style="margin: 20px 0;">
                <label for="addUserEmail">Email Address:</label>
                <input type="email" id="addUserEmail" placeholder="Enter user email">
            </div>
            <div style="margin: 20px 0;">
                <label for="addUserAdmin" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="addUserAdmin">
                    <span>Make this user an admin</span>
                </label>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeAddUserModal()">Cancel</button>
                <button class="btn btn-primary" onclick="createUser()">Create User</button>
            </div>
        </div>
    </div>

    <!-- Notification -->
    <div id="notification" style="display: none; position: fixed; top: 20px; right: 20px; padding: 15px; border-radius: 5px; color: white; z-index: 1001;"></div>

    <script>
        let currentDeleteUserId = null;
        let currentDeleteUserEmail = null;

        async function checkAdminAuth() {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const user = await response.json();
                    if (user.isAdmin) {
                        document.getElementById('adminHeader').style.display = 'flex';
                        document.getElementById('loginRequired').classList.add('hidden');
                        document.getElementById('adminContent').classList.remove('hidden');
                        loadUsers();
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        let availableTiers = [];

        async function loadUsers() {
            try {
                // Load both users and tiers in parallel
                const [usersResponse, tiersResponse] = await Promise.all([
                    fetch('/api/admin/users', {
                        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                    }),
                    fetch('/api/admin/tiers', {
                        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                    })
                ]);
                
                if (usersResponse.ok && tiersResponse.ok) {
                    const users = await usersResponse.json();
                    availableTiers = await tiersResponse.json();
                    
                    const tbody = document.getElementById('usersTable');
                    tbody.innerHTML = users.map(user => 
                        '<tr>' +
                        '<td>' + user.email + '</td>' +
                        '<td>' + (user.is_admin ? 'Admin' : 'User') + '</td>' +
                        '<td>-</td>' +
                        '<td>' + (user.usage_today || 0) + '</td>' +
                        '<td>' + (user.is_active ? 'Active' : 'Inactive') + '</td>' +
                        '<td>' + new Date(user.created_at).toLocaleDateString() + '</td>' +
                        '<td><button class="btn btn-danger" onclick="deleteUser(' + user.id + ', &quot;' + user.email + '&quot;)">🗑️ Delete</button></td>' +
                        '</tr>'
                    ).join('');
                } else {
                    throw new Error('Failed to load users or tiers');
                }
            } catch (error) {
                console.error('Error loading users:', error);
                document.getElementById('usersTable').innerHTML = '<tr><td colspan="7">Failed to load users</td></tr>';
            }
        }

        function createTierDropdown(user) {
            let options = '<option value="">No tier</option>';
            
            availableTiers.forEach(tier => {
                const selected = user.tier_id === tier.id ? 'selected' : '';
                const limitText = tier.daily_limit === -1 ? 'Unlimited' : tier.daily_limit + ' per day';
                options += '<option value="' + tier.id + '" ' + selected + '>' + tier.name + ' (' + limitText + ')</option>';
            });
            
            return '<select class="form-input" style="width: 200px; padding: 5px;" onchange="updateUserTier(' + user.id + ', this.value)">' + 
                   options + 
                   '</select>';
        }

        async function updateUserTier(userId, tierId) {
            try {
                const response = await fetch('/api/admin/users/' + userId + '/tier', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ tierId: tierId || null })
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('✅ User tier updated successfully');
                    // Optionally show a brief success indicator
                } else {
                    alert('❌ Error: ' + result.error);
                    loadUsers(); // Reload to reset the dropdown
                }
            } catch (error) {
                alert('❌ Failed to update tier: ' + error.message);
                loadUsers(); // Reload to reset the dropdown
            }
        }

        async function makeAdmin(userId) {
            if (!confirm('Are you sure you want to make this user an admin?')) return;
            
            try {
                const response = await fetch('/api/admin/users/' + userId + '/make-admin', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('✅ User promoted to admin successfully!');
                    loadUsers();
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                alert('❌ Failed to promote user: ' + error.message);
            }
        }

        async function toggleUser(userId) {
            try {
                const response = await fetch('/api/admin/users/' + userId + '/toggle', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('✅ User status updated successfully!');
                    loadUsers();
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                alert('❌ Failed to update user: ' + error.message);
            }
        }

        function deleteUser(userId, userEmail) {
            currentDeleteUserId = userId;
            currentDeleteUserEmail = userEmail;
            document.getElementById('deleteModalText').textContent = 
                'Are you sure you want to permanently delete user "' + userEmail + '" and ALL their data?';
            document.getElementById('deleteModal').style.display = 'block';
        }

        function closeDeleteModal() {
            document.getElementById('deleteModal').style.display = 'none';
            currentDeleteUserId = null;
            currentDeleteUserEmail = null;
        }

        function confirmDelete() {
            document.getElementById('deleteModal').style.display = 'none';
            document.getElementById('confirmInput').value = '';
            document.getElementById('confirmModal').style.display = 'block';
        }

        function closeConfirmModal() {
            document.getElementById('confirmModal').style.display = 'none';
            document.getElementById('confirmInput').value = '';
        }

        async function finalDelete() {
            const confirmText = document.getElementById('confirmInput').value;
            if (confirmText !== 'DELETE') {
                showNotification('❌ Deletion cancelled - you must type "DELETE" exactly', 'error');
                return;
            }
            
            document.getElementById('confirmModal').style.display = 'none';
            
            try {
                const response = await fetch('/api/admin/users/' + currentDeleteUserId, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                const result = await response.json();
                if (result.success) {
                    showNotification('✅ ' + result.message, 'success');
                    loadUsers();
                } else {
                    showNotification('❌ Error: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('❌ Failed to delete user: ' + error.message, 'error');
            }
            
            currentDeleteUserId = null;
            currentDeleteUserEmail = null;
        }

        function showNotification(message, type) {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 4000);
        }

        function showAddUserModal() {
            document.getElementById('addUserEmail').value = '';
            document.getElementById('addUserAdmin').checked = false;
            document.getElementById('addUserModal').style.display = 'block';
        }

        function closeAddUserModal() {
            document.getElementById('addUserModal').style.display = 'none';
        }

        async function createUser() {
            const email = document.getElementById('addUserEmail').value.trim();
            const isAdmin = document.getElementById('addUserAdmin').checked;
            
            if (!email) {
                showNotification('❌ Please enter an email address', 'error');
                return;
            }
            
            if (!email.includes('@')) {
                showNotification('❌ Please enter a valid email address', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ 
                        email: email,
                        isAdmin: isAdmin
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    showNotification('✅ User created successfully!', 'success');
                    closeAddUserModal();
                    loadUsers();
                } else {
                    showNotification('❌ Error: ' + result.error, 'error');
                }
            } catch (error) {
                showNotification('❌ Failed to create user: ' + error.message, 'error');
            }
        }

        function refreshUsers() {
            loadUsers();
        }

        function showInviteModal() {
            const email = prompt('Enter email address to invite:');
            if (email) {
                sendInvite(email);
            }
        }

        async function sendInvite(email) {
            try {
                const response = await fetch('/api/admin/invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ email })
                });

                const result = await response.json();
                if (result.success) {
                    alert('✅ Invitation sent successfully!');
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                alert('❌ Failed to send invitation: ' + error.message);
            }
        }


        async function logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.log('Server logout failed:', error);
            }
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/';
        }

        document.addEventListener('DOMContentLoaded', checkAdminAuth);
    </script>
</body>
</html>
  `);
});

// Admin Tiers Page
app.get('/admin/tiers', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Tiers - AI Caption Studio</title>
    <style>
        /* Theme System */
        :root {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --card-background: #ffffff;
            --text-primary: #333;
            --text-secondary: #666;
            --border-color: #e2e8f0;
        }
        
        [data-theme="dark"] {
            --primary-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            --background-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            --card-background: #2a2a3e;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --border-color: #404040;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--background-gradient); min-height: 100vh; color: var(--text-primary); padding: 20px; transition: all 0.3s ease; }
        .container { max-width: 1400px; margin: 0 auto; }
        .admin-header { background: var(--card-background); border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .admin-header h1 { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 2rem; font-weight: 700; }
        .nav-links { display: flex; gap: 15px; }
        .nav-link { padding: 10px 20px; background: var(--primary-gradient); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; transition: transform 0.2s; }
        .nav-link:hover { transform: translateY(-2px); }
        .admin-section { background: var(--card-background); border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
        .section-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: var(--primary-gradient); color: white; }
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-success { background: #10b981; color: white; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
        .table th { background: #f8fafc; font-weight: 600; color: var(--text-primary); }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 5px; font-weight: 500; color: var(--text-primary); }
        .form-input { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--card-background); color: var(--text-primary); }
        .form-input:focus { outline: none; border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }
        .form-help { display: block; margin-top: 5px; font-size: 12px; color: var(--text-secondary); }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); }
        .modal-content { background-color: var(--card-background); margin: 10% auto; padding: 30px; border-radius: 15px; width: 90%; max-width: 500px; }
        .hidden { display: none; }
        .flex { display: flex; }
        .gap-2 { gap: 8px; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
    </style>
</head>
<body>
    <div class="container">
        <div class="admin-header" id="adminHeader" style="display: none;">
            <h1>🏆 Manage Tiers</h1>
            <div class="nav-links">
                <a href="/admin" class="nav-link">🏠 Dashboard</a>
                <a href="/admin/users" class="nav-link">👥 Users</a>
                <a href="/" class="nav-link">🏠 Main App</a>
                <button class="nav-link" onclick="logout()" style="border: none; cursor: pointer;">🚪 Logout</button>
            </div>
        </div>

        <div id="loginRequired" class="admin-section">
            <h2>🔐 Admin Login Required</h2>
            <p>Please login with an admin account to access this page.</p>
        </div>

        <div id="adminContent" class="hidden">
            <!-- Tier Management -->
            <div class="admin-section">
                <div class="flex justify-between items-center">
                    <div class="section-title">User Tiers</div>
                    <div class="flex gap-2">
                        <button class="btn btn-primary" onclick="showCreateTierModal()">➕ Create Tier</button>
                        <button class="btn btn-secondary" onclick="refreshTiers()">🔄 Refresh</button>
                    </div>
                </div>
                
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Daily Limit</th>
                            <th>Description</th>
                            <th>Users</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="tiersTable">
                        <tr><td colspan="6">Loading tiers...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Create/Edit Tier Modal -->
    <div id="tierModal" class="modal">
        <div class="modal-content">
            <h2 id="modalTitle">Create New Tier</h2>
            <div class="form-group">
                <label class="form-label">Tier Name</label>
                <input type="text" id="tierName" class="form-input" placeholder="e.g., Premium, Enterprise">
            </div>
            <div class="form-group">
                <label class="form-label">Daily Limit</label>
                <input type="number" id="tierLimit" class="form-input" placeholder="Enter -1 for unlimited">
                <small style="color: var(--text-secondary);">Enter -1 for unlimited usage</small>
            </div>
            <div class="form-group">
                <label class="form-label">Description (Optional)</label>
                <input type="text" id="tierDescription" class="form-input" placeholder="Brief description of this tier">
            </div>
            <div class="flex justify-between gap-2">
                <button class="btn btn-secondary" onclick="closeTierModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveTier()" id="saveBtn">Create Tier</button>
            </div>
        </div>
    </div>

    <script>
        let editingTierId = null;

        async function checkAdminAuth() {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const user = await response.json();
                    if (user.isAdmin) {
                        document.getElementById('adminHeader').style.display = 'flex';
                        document.getElementById('loginRequired').classList.add('hidden');
                        document.getElementById('adminContent').classList.remove('hidden');
                        loadTiers();
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        async function loadTiers() {
            try {
                const response = await fetch('/api/admin/tiers', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    const tiers = await response.json();
                    const tbody = document.getElementById('tiersTable');
                    tbody.innerHTML = tiers.map(tier => 
                        '<tr>' +
                        '<td><strong>' + tier.name + '</strong></td>' +
                        '<td>' + (tier.daily_limit === -1 ? '∞ Unlimited' : tier.daily_limit + ' queries') + '</td>' +
                        '<td>' + (tier.description || 'No description') + '</td>' +
                        '<td>' + (tier.user_count || 0) + ' users</td>' +
                        '<td>' + new Date(tier.created_at).toLocaleDateString() + '</td>' +
                        '<td>' +
                        '<div class="flex gap-2">' +
                        '<button class="btn btn-secondary" onclick="editTier(' + tier.id + ')">✏️ Edit</button>' +
                        '<button class="btn btn-danger" onclick="deleteTier(' + tier.id + ')">🗑️ Delete</button>' +
                        '</div>' +
                        '</td>' +
                        '</tr>'
                    ).join('');
                }
            } catch (error) {
                document.getElementById('tiersTable').innerHTML = '<tr><td colspan="6">Failed to load tiers</td></tr>';
            }
        }

        function showCreateTierModal() {
            editingTierId = null;
            document.getElementById('modalTitle').textContent = 'Create New Tier';
            document.getElementById('saveBtn').textContent = 'Create Tier';
            document.getElementById('tierName').value = '';
            document.getElementById('tierLimit').value = '';
            document.getElementById('tierDescription').value = '';
            document.getElementById('tierModal').style.display = 'block';
        }

        async function editTier(tierId) {
            try {
                const response = await fetch('/api/admin/tiers/' + tierId, {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    const tier = await response.json();
                    editingTierId = tierId;
                    document.getElementById('modalTitle').textContent = 'Edit Tier';
                    document.getElementById('saveBtn').textContent = 'Update Tier';
                    document.getElementById('tierName').value = tier.name;
                    document.getElementById('tierLimit').value = tier.daily_limit;
                    document.getElementById('tierDescription').value = tier.description || '';
                    document.getElementById('tierModal').style.display = 'block';
                }
            } catch (error) {
                alert('Failed to load tier details: ' + error.message);
            }
        }

        async function saveTier() {
            const name = document.getElementById('tierName').value;
            const dailyLimit = parseInt(document.getElementById('tierLimit').value);
            const description = document.getElementById('tierDescription').value;

            if (!name || isNaN(dailyLimit)) {
                alert('Please fill in name and daily limit');
                return;
            }

            try {
                const url = editingTierId ? '/api/admin/tiers/' + editingTierId : '/api/admin/tiers';
                const method = editingTierId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ name, dailyLimit, description })
                });

                const result = await response.json();
                if (result.success) {
                    alert('✅ Tier saved successfully!');
                    closeTierModal();
                    loadTiers();
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                alert('❌ Failed to save tier: ' + error.message);
            }
        }

        async function deleteTier(tierId) {
            if (!confirm('Are you sure you want to delete this tier? Users assigned to this tier will lose their tier assignment.')) return;
            
            try {
                const response = await fetch('/api/admin/tiers/' + tierId, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('✅ Tier deleted successfully!');
                    loadTiers();
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                alert('❌ Failed to delete tier: ' + error.message);
            }
        }

        function closeTierModal() {
            document.getElementById('tierModal').style.display = 'none';
        }

        function refreshTiers() {
            loadTiers();
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.log('Server logout failed:', error);
            }
            
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('tierModal');
            if (event.target === modal) {
                closeTierModal();
            }
        }

        document.addEventListener('DOMContentLoaded', checkAdminAuth);
    </script>
</body>
</html>
  `);
});

export default app;

