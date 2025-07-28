// Cloudflare D1 Database Class
class D1Database {
    constructor(db) {
        this.db = db; // D1 database binding
        this.CURRENT_SCHEMA_VERSION = 8;
    }

    async initDatabase() {
        try {
            // D1 doesn't need explicit initialization like Neon
            // Schema will be applied during deployment
            console.log('D1 Database ready');
        } catch (error) {
            console.error('D1 Database initialization failed:', error);
            throw error;
        }
    }

    // Query logging methods
    async logQuery(logData) {
        const {
            id, source, imageSize, imageType, thumbnailPath, previewPath, exifData,
            cameraMake, cameraModel, gpsLatitude, gpsLongitude, locationName,
            promptLength, responseLength, processingTimeMs, errorMessage,
            ipAddress, userAgent, inputTokens, outputTokens, totalTokens,
            estimatedCostUsd, includeWeather, weatherData
        } = logData;

        const stmt = this.db.prepare(`
            INSERT INTO query_logs (
                id, source, image_size, image_type, thumbnail_path, preview_path, exif_data,
                camera_make, camera_model, gps_latitude, gps_longitude, location_name,
                prompt_length, response_length, processing_time_ms, error_message,
                ip_address, user_agent, input_tokens, output_tokens, total_tokens, 
                estimated_cost_usd, include_weather, weather_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await stmt.bind(
            id, source, imageSize, imageType, thumbnailPath, previewPath,
            exifData ? JSON.stringify(exifData) : null, cameraMake, cameraModel, 
            gpsLatitude, gpsLongitude, locationName, promptLength, responseLength,
            processingTimeMs, errorMessage, ipAddress, userAgent, inputTokens,
            outputTokens, totalTokens, estimatedCostUsd, includeWeather, weatherData
        ).run();

        console.log('Query logged with ID:', id);
        return id;
    }

    async getRecentQueries(limit = 50) {
        const stmt = this.db.prepare(`
            SELECT * FROM query_logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        `);
        
        const result = await stmt.bind(limit).all();
        
        // Parse EXIF data JSON strings back to objects
        return result.results.map(row => ({
            ...row,
            exif_data: row.exif_data ? JSON.parse(row.exif_data) : null
        }));
    }

    async getQueryStats() {
        const stmt = this.db.prepare(`
            SELECT 
                COUNT(*) as total_queries,
                COUNT(CASE WHEN source = 'web' THEN 1 END) as web_queries,
                COUNT(CASE WHEN source = 'extension' THEN 1 END) as extension_queries,
                COUNT(CASE WHEN error_message IS NULL THEN 1 END) as successful_queries,
                COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as failed_queries,
                AVG(processing_time_ms) as avg_processing_time,
                AVG(image_size) as avg_image_size,
                COUNT(CASE WHEN camera_make IS NOT NULL THEN 1 END) as queries_with_camera_data,
                COUNT(CASE WHEN gps_latitude IS NOT NULL THEN 1 END) as queries_with_gps_data,
                SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
                SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
                SUM(COALESCE(total_tokens, 0)) as total_tokens_used,
                SUM(COALESCE(estimated_cost_usd, 0)) as total_cost_usd
            FROM query_logs
        `);
        
        const result = await stmt.first();
        return result;
    }

    // User authentication methods
    async createUser(email) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO users (email) VALUES (?)
                RETURNING id, email
            `);
            const result = await stmt.bind(email).first();
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
            SELECT * FROM users WHERE email = ? AND is_active = TRUE
        `);
        const result = await stmt.bind(email).first();
        return result || null;
    }

    async createLoginToken(email, token, expiresAt, ipAddress, userAgent) {
        const stmt = this.db.prepare(`
            INSERT INTO login_tokens (token, email, expires_at, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)
        `);
        await stmt.bind(token, email, expiresAt, ipAddress, userAgent).run();
        return { token, email, expiresAt };
    }

    async getLoginToken(token) {
        const stmt = this.db.prepare(`
            SELECT * FROM login_tokens 
            WHERE token = ? 
            AND used_at IS NULL 
            AND expires_at > datetime('now')
        `);
        const result = await stmt.bind(token).first();
        return result || null;
    }

    async useLoginToken(token) {
        const stmt = this.db.prepare(`
            UPDATE login_tokens 
            SET used_at = datetime('now') 
            WHERE token = ?
        `);
        const result = await stmt.bind(token).run();
        return result.changes > 0;
    }

    async createSession(sessionId, userId, expiresAt, ipAddress, userAgent) {
        const stmt = this.db.prepare(`
            INSERT INTO user_sessions (session_id, user_id, expires_at, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)
        `);
        await stmt.bind(sessionId, userId, expiresAt, ipAddress, userAgent).run();
        return { sessionId, userId, expiresAt };
    }

    async getSession(sessionId) {
        const stmt = this.db.prepare(`
            SELECT s.*, u.email, u.is_admin 
            FROM user_sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.session_id = ? 
            AND s.expires_at > datetime('now') 
            AND u.is_active = TRUE
        `);
        const result = await stmt.bind(sessionId).first();
        return result || null;
    }

    async deleteSession(sessionId) {
        const stmt = this.db.prepare(`
            DELETE FROM user_sessions WHERE session_id = ?
        `);
        const result = await stmt.bind(sessionId).run();
        return result.changes > 0;
    }

    async updateUserLastLogin(userId) {
        const stmt = this.db.prepare(`
            UPDATE users SET last_login = datetime('now') WHERE id = ?
        `);
        const result = await stmt.bind(userId).run();
        return result.changes > 0;
    }

    // Additional methods for user management, tiers, etc. would continue here...
    // For brevity, I'll add the essential ones for magic link authentication

    async getUserWithTier(userId) {
        const stmt = this.db.prepare(`
            SELECT u.*, t.name as tier_name, t.daily_limit, t.description as tier_description
            FROM users u 
            LEFT JOIN user_tiers t ON u.tier_id = t.id 
            WHERE u.id = ?
        `);
        const result = await stmt.bind(userId).first();
        return result || null;
    }

    async getDailyUsage(userId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }

        const stmt = this.db.prepare(`
            SELECT usage_count FROM daily_usage 
            WHERE user_id = ? AND date = ?
        `);
        const result = await stmt.bind(userId, date).first();
        return result ? result.usage_count : 0;
    }

    async incrementDailyUsage(userId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }

        const stmt = this.db.prepare(`
            INSERT INTO daily_usage (user_id, date, usage_count) 
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, date) 
            DO UPDATE SET 
                usage_count = usage_count + 1, 
                updated_at = datetime('now')
        `);
        await stmt.bind(userId, date).run();
        return true;
    }

    async checkUsageLimit(userId) {
        const user = await this.getUserWithTier(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.daily_limit === -1) {
            return { allowed: true, remaining: -1, limit: -1, used: 0 };
        }

        const today = new Date().toISOString().split('T')[0];
        const usedToday = await this.getDailyUsage(userId, today);
        const remaining = Math.max(0, user.daily_limit - usedToday);
        const allowed = usedToday < user.daily_limit;

        return {
            allowed,
            remaining,
            limit: user.daily_limit,
            used: usedToday,
            tierName: user.tier_name
        };
    }

    // User settings methods
    async getUserSetting(userId, integrationType, settingKey) {
        const stmt = this.db.prepare(`
            SELECT setting_value FROM user_settings 
            WHERE user_id = ? 
            AND integration_type = ? 
            AND setting_key = ?
        `);
        const result = await stmt.bind(userId, integrationType, settingKey).first();
        return result ? result.setting_value : null;
    }

    async setUserSetting(userId, integrationType, settingKey, settingValue, encrypted = false) {
        const stmt = this.db.prepare(`
            INSERT INTO user_settings (user_id, integration_type, setting_key, setting_value, encrypted, updated_at) 
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT (user_id, integration_type, setting_key) 
            DO UPDATE SET 
                setting_value = ?, 
                encrypted = ?, 
                updated_at = datetime('now')
        `);
        await stmt.bind(userId, integrationType, settingKey, settingValue, encrypted, settingValue, encrypted).run();
        return true;
    }

    async deleteUserSetting(userId, integrationType, settingKey) {
        const stmt = this.db.prepare(`
            DELETE FROM user_settings 
            WHERE user_id = ? 
            AND integration_type = ? 
            AND setting_key = ?
        `);
        const result = await stmt.bind(userId, integrationType, settingKey).run();
        return result.changes > 0;
    }

    // Tier management methods
    async getAllTiers() {
        const stmt = this.db.prepare(`
            SELECT * FROM user_tiers ORDER BY daily_limit ASC
        `);
        const result = await stmt.all();
        return result.results || [];
    }

    async getTierById(tierId) {
        const stmt = this.db.prepare(`
            SELECT * FROM user_tiers WHERE id = ?
        `);
        const result = await stmt.bind(tierId).first();
        return result || null;
    }

    async createTier(name, dailyLimit, description = null) {
        const stmt = this.db.prepare(`
            INSERT INTO user_tiers (name, daily_limit, description) 
            VALUES (?, ?, ?)
            RETURNING id
        `);
        const result = await stmt.bind(name, dailyLimit, description).first();
        return result.id;
    }

    async updateTier(tierId, name, dailyLimit, description = null) {
        const stmt = this.db.prepare(`
            UPDATE user_tiers 
            SET name = ?, daily_limit = ?, description = ?, updated_at = datetime('now')
            WHERE id = ?
        `);
        const result = await stmt.bind(name, dailyLimit, description, tierId).run();
        return result.changes > 0;
    }

    async deleteTier(tierId) {
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
    }

    async setUserTier(userId, tierId) {
        const stmt = this.db.prepare(`
            UPDATE users SET tier_id = ? WHERE id = ?
        `);
        const result = await stmt.bind(tierId, userId).run();
        return result.changes > 0;
    }

    // User management methods  
    async getAllUsers() {
        const stmt = this.db.prepare(`
            SELECT u.*, t.name as tier_name, t.daily_limit, t.description as tier_description
            FROM users u 
            LEFT JOIN user_tiers t ON u.tier_id = t.id
            ORDER BY u.created_at DESC
        `);
        const result = await stmt.all();
        return result.results || [];
    }

    async makeUserAdmin(email) {
        const stmt = this.db.prepare(`
            UPDATE users SET is_admin = 1 WHERE email = ?
        `);
        const result = await stmt.bind(email).run();
        return result.changes > 0;
    }

    async toggleUserStatus(userId) {
        const stmt = this.db.prepare(`
            UPDATE users SET is_active = NOT is_active WHERE id = ?
        `);
        const result = await stmt.bind(userId).run();
        return result.changes > 0;
    }

    async deleteUser(userId) {
        const stmt = this.db.prepare(`
            DELETE FROM users WHERE id = ?
        `);
        const result = await stmt.bind(userId).run();
        return result.changes > 0;
    }

    // Invite system methods
    async createInviteToken(email, invitedBy, token, expiresAt) {
        const stmt = this.db.prepare(`
            INSERT INTO invite_tokens (email, invited_by, token, expires_at) 
            VALUES (?, ?, ?, ?)
        `);
        await stmt.bind(email, invitedBy, token, expiresAt).run();
        return { email, token, expiresAt };
    }

    async getInviteToken(token) {
        const stmt = this.db.prepare(`
            SELECT * FROM invite_tokens 
            WHERE token = ? 
            AND used_at IS NULL 
            AND expires_at > datetime('now')
        `);
        const result = await stmt.bind(token).first();
        return result || null;
    }

    async useInviteToken(token, userId) {
        const stmt = this.db.prepare(`
            UPDATE invite_tokens 
            SET used_at = datetime('now'), used_by = ? 
            WHERE token = ?
        `);
        const result = await stmt.bind(userId, token).run();
        return result.changes > 0;
    }

    async getPendingInvites() {
        const stmt = this.db.prepare(`
            SELECT i.*, u.email as invited_by_email 
            FROM invite_tokens i
            JOIN users u ON i.invited_by = u.id
            WHERE i.used_at IS NULL 
            AND i.expires_at > datetime('now')
            ORDER BY i.created_at DESC
        `);
        const result = await stmt.all();
        return result.results || [];
    }

    // Usage statistics methods
    async getUsersUsageStats() {
        const stmt = this.db.prepare(`
            SELECT 
                u.id, u.email, u.created_at, u.last_login,
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
    }

    async deleteAllUserSettings(userId, integrationType) {
        const stmt = this.db.prepare(`
            DELETE FROM user_settings 
            WHERE user_id = ? AND integration_type = ?
        `);
        const result = await stmt.bind(userId, integrationType).run();
        return result.changes;
    }

    async getUserSettings(userId, integrationType = null) {
        let query = `SELECT * FROM user_settings WHERE user_id = ?`;
        let params = [userId];
        
        if (integrationType) {
            query += ` AND integration_type = ?`;
            params.push(integrationType);
        }
        
        const stmt = this.db.prepare(query);
        const result = await stmt.bind(...params).all();
        return result.results || [];
    }

    async close() {
        // D1 doesn't require explicit closing
        console.log('D1 Database connection closed');
    }
}

module.exports = D1Database;