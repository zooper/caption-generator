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

            const stmt = this.db.prepare(`
                INSERT INTO query_logs (
                    id, source, user_id, email, processing_time_ms, response_length, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `);

            await stmt.bind(
                id, source || 'web', userId, email, 
                processingTimeMs || 0, responseLength || 0
            ).run();

            console.log('Query logged successfully:', id);
            return id;
        } catch (error) {
            console.error('Failed to log query:', error);
            // Don't throw error to avoid breaking the main flow
        }
    }

    async ensureQueryLogsTable() {
        try {
            const stmt = this.db.prepare(`
                CREATE TABLE IF NOT EXISTS query_logs (
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
        } catch (error) {
            console.log('Could not ensure query_logs table exists:', error);
        }
    }

    async checkUsageLimit(userId) {
        // Simplified usage check - return unlimited for now
        return { allowed: true, used: 0, limit: -1, remaining: -1 };
    }

    async incrementDailyUsage(userId) {
        // Placeholder for usage increment
        console.log('Usage incremented for user:', userId);
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
    return result.changes > 0;
};

D1Database.prototype.getAllTiers = async function() {
    const stmt = this.db.prepare(`
        SELECT *, 
        (SELECT COUNT(*) FROM users WHERE tier_id = user_tiers.id) as user_count
        FROM user_tiers ORDER BY daily_limit ASC
    `);
    const result = await stmt.all();
    return result.results || [];
};

D1Database.prototype.getTierById = async function(tierId) {
    const stmt = this.db.prepare(`
        SELECT * FROM user_tiers WHERE id = ?
    `);
    const result = await stmt.bind(tierId).first();
    return result || null;
};

D1Database.prototype.createTier = async function(name, dailyLimit, description = null) {
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
    return result.changes > 0;
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
    return result.changes > 0;
};

D1Database.prototype.setUserTier = async function(userId, tierId) {
    const stmt = this.db.prepare(`
        UPDATE users SET tier_id = ? WHERE id = ?
    `);
    const result = await stmt.bind(tierId, userId).run();
    return result.changes > 0;
};

D1Database.prototype.createInviteToken = async function(email, invitedBy, token, expiresAt) {
    const stmt = this.db.prepare(`
        INSERT INTO invite_tokens (email, invited_by, token, expires_at) 
        VALUES (?, ?, ?, ?)
    `);
    await stmt.bind(email, invitedBy, token, expiresAt).run();
    return { email, token, expiresAt };
};

D1Database.prototype.useInviteToken = async function(token, userId) {
    const stmt = this.db.prepare(`
        UPDATE invite_tokens 
        SET used_at = datetime('now'), used_by = ? 
        WHERE token = ?
    `);
    const result = await stmt.bind(userId, token).run();
    return result.changes > 0;
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
        
        const stmt = this.db.prepare(`
            SELECT i.*, COALESCE(u.email, 'Unknown') as invited_by_email 
            FROM invite_tokens i
            LEFT JOIN users u ON i.invited_by = u.id
            WHERE i.used_at IS NULL 
            AND i.expires_at > datetime('now')
            ORDER BY i.created_at DESC
        `);
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

// Admin endpoints
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
        
        // Get basic stats
        const userCount = await database.db.prepare('SELECT COUNT(*) as count FROM users').first();
        const queryCount = await database.db.prepare('SELECT COUNT(*) as count FROM query_logs').first();
        
        return c.json({
            totalUsers: userCount?.count || 0,
            totalQueries: queryCount?.count || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return c.json({ error: 'Failed to fetch stats' }, 500);
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
        
        if (!tierId) {
            return c.json({ error: 'Tier ID is required' }, 400);
        }
        
        const database = new D1Database(c.env.DB);
        // Verify tier exists
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
        return c.json({ error: 'Failed to update user tier' }, 500);
    }
});

// Invite system endpoints
app.post('/api/admin/invite', authenticateToken, requireAdmin, async (c) => {
    try {
        const { email } = await c.req.json();
        
        if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
            return c.json({ error: 'Valid email address required' }, 400);
        }

        const database = new D1Database(c.env.DB);
        // Check if user already exists
        const existingUser = await database.getUserByEmail(email);
        if (existingUser) {
            return c.json({ error: 'User already exists' }, 400);
        }

        // Generate invite token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        
        const user = c.get('user');
        await database.createInviteToken(email, user.id, token, expiresAt);

        // Create invite link
        const inviteUrl = `${new URL(c.req.url).origin}/auth?invite=${token}&email=${encodeURIComponent(email)}`;

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
                            Time: ${new Date().toLocaleString()}
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
                message: `Invitation sent to ${email}`,
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
        const database = new D1Database(c.env.DB);
        
        // Save Mastodon settings
        await database.setUserSetting(user.id, 'social', 'mastodon_instance', instance, false);
        await database.setUserSetting(user.id, 'social', 'mastodon_token', token, true);
        
        return c.json({ success: true, message: 'Mastodon settings saved' });
    } catch (error) {
        return c.json({ error: 'Failed to save Mastodon settings' }, 500);
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
    console.log('Building prompt from image, base64 length:', base64Image ? base64Image.length : 'null');
    console.log('Include weather:', includeWeather);
    console.log('Caption style:', style);
    
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
        console.log('Image buffer size:', imageBuffer.length, 'bytes');
        
        // Check image format first
        const imageHeader = imageBuffer.slice(0, 10);
        console.log('Image header bytes:', Array.from(imageHeader).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // Check if this looks like a valid JPEG with EXIF
        const isJPEG = imageHeader[0] === 0xFF && imageHeader[1] === 0xD8;
        const hasEXIFMarker = imageBuffer.includes(Buffer.from([0xFF, 0xE1])); // EXIF APP1 marker
        console.log('Image format check:', { isJPEG, hasEXIFMarker, bufferSize: imageBuffer.length });
        
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
            console.log('No date fields in targeted extraction, trying full EXIF extraction...');
            const fullExifData = await exifr.parse(imageBuffer, true);
            if (fullExifData) {
                console.log('Full EXIF keys:', Object.keys(fullExifData));
                // Look for any date-related fields
                const dateKeys = Object.keys(fullExifData).filter(key => 
                    key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
                );
                console.log('Date-related EXIF keys found:', dateKeys);
                
                // Merge the full EXIF data with our targeted data
                exifData = { ...exifData, ...fullExifData };
            }
        }
        console.log('Server EXIF extraction:', exifData ? 'Success' : 'No data');
        
        if (exifData) {
            extractedData.exifData = exifData;
            console.log('EXIF data keys:', Object.keys(exifData));
            console.log('EXIF Make:', exifData.Make);
            console.log('EXIF Model:', exifData.Model);
            console.log('EXIF GPS:', exifData.GPSLatitude, exifData.GPSLongitude);
            console.log('EXIF Date fields:', {
                DateTimeOriginal: exifData.DateTimeOriginal,
                DateTime: exifData.DateTime,
                DateTimeDigitized: exifData.DateTimeDigitized
            });
            
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
    
    const contextString = context.length > 0 ? '\n\nAdditional Context:\n' + context.join('\n') : '';
    
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
    
    const prompt = 'Analyze this image for Instagram posting. Generate:\n\n' +
        '1. A ' + selectedStyle.description + ' caption that:\n' +
        '   - Captures the main subject/scene\n' +
        '   - ' + selectedStyle.tone + '\n' +
        '   - Is 1-3 sentences\n' +
        '   - Includes relevant emojis\n' +
        '   - Feels authentic and natural (NO forced questions or call-to-actions)\n' +
        '   - Sounds like something a real person would write\n' +
        (context.length > 0 ? '   - Incorporates the provided context naturally\n' : '') +
        '\n2. 10-15 hashtags that:\n' +
        '   - Mix popular (#photography, #instagood) and niche tags\n' +
        '   - Are relevant to image content\n' +
        '   - Include location-based tags if applicable\n' +
        '   - Avoid banned or shadowbanned hashtags\n' +
        '   - Range from broad to specific\n' +
        (context.length > 0 ? '   - Include relevant hashtags based on the context provided\n' : '') +
        '\n3. Alt text for accessibility (1-2 sentences):\n' +
        '   - Describe what is actually visible in the image\n' +
        '   - Include important visual details for screen readers\n' +
        '   - Focus on objective description, not interpretation\n' +
        '   - Keep it concise but descriptive\n' +
        contextString + '\n\n' +
        'Format your response as:\n' +
        'CAPTION: [your caption here]\n' +
        'HASHTAGS: [hashtags separated by spaces]\n' +
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
    await database.logQuery({
        id: crypto.randomUUID(),
        source: 'web',
        userId: user.id,
        email: user.email,
        processingTimeMs: Date.now() - Date.now(), // Simplified
        responseLength: responseContent.length
    });
    
    await database.incrementDailyUsage(user.id);
    
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
                <button onclick="requestLogin()" class="auth-btn">Send Magic Link</button>
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

        async function requestLogin() {
            console.log('requestLogin function called');
            const email = document.getElementById('emailInput').value;
            const messageDiv = document.getElementById('loginMessage');
            
            console.log('Email value:', email);
            
            if (!email) {
                messageDiv.innerHTML = '<p style="color: red;">Please enter your email address</p>';
                return;
            }

            messageDiv.innerHTML = '<p style="color: blue;">Sending magic link...</p>';

            try {
                console.log('Making fetch request to /api/auth/request-login');
                const response = await fetch('/api/auth/request-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.success) {
                    messageDiv.innerHTML = 
                        '<p style="color: green;">✅ ' + data.message + '</p>' +
                        '<p style="font-size: 12px; color: #666;">Link expires in ' + data.expiresIn + '</p>';
                    if (data.loginUrl) {
                        messageDiv.innerHTML += '<p style="font-size: 12px; margin-top: 10px;"><a href="' + data.loginUrl + '" target="_blank">Click here if email fails</a></p>';
                    }
                } else {
                    messageDiv.innerHTML = '<p style="color: red;">❌ ' + data.error + '</p>';
                }
            } catch (error) {
                console.error('Fetch error:', error);
                messageDiv.innerHTML = '<p style="color: red;">❌ Failed to send magic link: ' + error.message + '</p>';
            }
        }

        async function logout() {
            try {
                // Call server logout to invalidate session
                let headers = {};
                const token = localStorage.getItem('auth_token');
                if (token) {
                    headers['Authorization'] = 'Bearer ' + token;
                }
                
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: headers,
                    credentials: 'include'
                });
            } catch (error) {
                console.log('Server logout failed:', error);
            }
            
            // Clear local storage regardless of server response
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            
            // Clear any cookies by setting them to expire
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            showLoginForm();
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
        });

        // File upload handling
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
                    includeWeather: document.getElementById('weatherToggle').checked
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
                const captionMatch = content.match(/CAPTION:\\s*(.+?)(?=\\n|HASHTAGS:|ALT_TEXT:|$)/s);
                const hashtagsMatch = content.match(/HASHTAGS:\\s*(.+?)(?=\\n|ALT_TEXT:|$)/s);
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
    </script>
</body>
</html>
  `);
});

// Other routes return simple HTML
app.get('/auth', (c) => c.html('<h1>Auth page</h1><p>Authentication is integrated into the main page.</p><a href="/">← Back to Main</a>'));

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
        <div class="admin-header">
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
            <h2>🔐 Admin Login Required</h2>
            <p>Please login with an admin account to access the dashboard.</p>
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
                <input type="email" id="inviteEmail" class="form-input" placeholder="user@example.com">
            </div>
            <div class="flex justify-between gap-3">
                <button class="btn btn-secondary" onclick="closeInviteModal()">Cancel</button>
                <button class="btn btn-primary" onclick="sendInvite()">Send Invite</button>
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

        function showInviteModal() {
            document.getElementById('inviteModal').style.display = 'block';
        }

        function closeInviteModal() {
            document.getElementById('inviteModal').style.display = 'none';
            document.getElementById('inviteEmail').value = '';
        }

        async function sendInvite() {
            const email = document.getElementById('inviteEmail').value;
            if (!email) {
                alert('Please enter an email address');
                return;
            }

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
                    alert('Invitation sent successfully!');
                    closeInviteModal();
                    loadAdminData();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Failed to send invitation: ' + error.message);
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
    </style>
</head>
<body>
    <div class="container">
        <div class="admin-header">
            <h1>👥 Manage Users</h1>
            <div class="nav-links">
                <a href="/admin" class="nav-link">🏠 Dashboard</a>
                <a href="/admin/tiers" class="nav-link">🏆 Tiers</a>
                <a href="/" class="nav-link">🏠 Main App</a>
                <button class="nav-link" onclick="logout()" style="border: none; cursor: pointer;">🚪 Logout</button>
            </div>
        </div>

        <div id="loginRequired" class="admin-section">
            <h2>🔐 Admin Login Required</h2>
            <p>Please login with an admin account to access user management.</p>
        </div>

        <div id="adminContent" class="hidden">
            <!-- User Management -->
            <div class="admin-section">
                <div class="flex justify-between items-center">
                    <div class="section-title">All Users</div>
                    <div class="flex gap-2">
                        <button class="btn btn-primary" onclick="refreshUsers()">🔄 Refresh</button>
                        <button class="btn btn-secondary" onclick="showInviteModal()">📧 Send Invite</button>
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
                        '<td><span class="badge ' + (user.is_admin ? 'badge-admin">🛠️ Admin' : 'badge-user">👤 User') + '</span></td>' +
                        '<td>' + createTierDropdown(user) + '</td>' +
                        '<td>' + (user.usage_today || 0) + '/' + (user.daily_limit === -1 ? '∞' : user.daily_limit || 0) + '</td>' +
                        '<td><span class="badge ' + (user.is_active ? 'badge-active">✅ Active' : 'badge-inactive">❌ Inactive') + '</span></td>' +
                        '<td>' + new Date(user.created_at).toLocaleDateString() + '</td>' +
                        '<td>' +
                        '<div class="flex gap-2">' +
                        (!user.is_admin ? '<button class="btn btn-secondary" onclick="makeAdmin(' + user.id + ')">🛠️ Make Admin</button>' : '') +
                        '<button class="btn ' + (user.is_active ? 'btn-danger" onclick="toggleUser(' + user.id + ')">❌ Deactivate' : 'btn-primary" onclick="toggleUser(' + user.id + ')">✅ Activate') + '</button>' +
                        '</div>' +
                        '</td>' +
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
        <div class="admin-header">
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
            <p>Please login with an admin account to access tier management.</p>
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

