const { neon } = require('@neondatabase/serverless');

class Database {
    constructor() {
        // Initialize Neon connection using DATABASE_URL environment variable
        this.sql = neon(process.env.DATABASE_URL);
        
        // Current schema version
        this.CURRENT_SCHEMA_VERSION = 8;
        
        this.initDatabase();
    }

    async initDatabase() {
        try {
            await this.createSchemaVersionTable();
            const currentVersion = await this.getSchemaVersion();
            console.log(`Current database schema version: ${currentVersion}`);
            
            if (currentVersion < this.CURRENT_SCHEMA_VERSION) {
                console.log(`Migrating database from version ${currentVersion} to ${this.CURRENT_SCHEMA_VERSION}`);
                await this.runMigrations(currentVersion);
            } else {
                console.log('Database schema is up to date');
            }
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async createSchemaVersionTable() {
        await this.sql`
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
    }

    async getSchemaVersion() {
        const result = await this.sql`
            SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
        `;
        return result.length > 0 ? result[0].version : 0;
    }

    async setSchemaVersion(version) {
        await this.sql`
            INSERT INTO schema_version (version) VALUES (${version})
        `;
        console.log(`Schema updated to version ${version}`);
    }

    async runMigrations(fromVersion) {
        // Migration from version 0 to 1: Create initial query_logs table
        if (fromVersion < 1) {
            console.log('Running migration: Create initial query_logs table (v1)');
            await this.migration_v1();
            await this.setSchemaVersion(1);
        }

        // Migration from version 1 to 2: Add token and cost tracking columns
        if (fromVersion < 2) {
            console.log('Running migration: Add token and cost tracking columns (v2)');
            await this.migration_v2();
            await this.setSchemaVersion(2);
        }

        // Migration from version 2 to 3: Add weather data tracking columns
        if (fromVersion < 3) {
            console.log('Running migration: Add weather data tracking columns (v3)');
            await this.migration_v3();
            await this.setSchemaVersion(3);
        }

        // Migration from version 3 to 4: Add user authentication tables
        if (fromVersion < 4) {
            console.log('Running migration: Add user authentication tables (v4)');
            await this.migration_v4();
            await this.setSchemaVersion(4);
        }

        // Migration from version 4 to 5: Add admin role support
        if (fromVersion < 5) {
            console.log('Running migration: Add admin role support (v5)');
            await this.migration_v5();
            await this.setSchemaVersion(5);
        }

        // Migration from version 5 to 6: Add invite tokens support
        if (fromVersion < 6) {
            console.log('Running migration: Add invite tokens support (v6)');
            await this.migration_v6();
            await this.setSchemaVersion(6);
        }

        // Migration from version 6 to 7: Add user settings for integrations
        if (fromVersion < 7) {
            console.log('Running migration: Add user settings for integrations (v7)');
            await this.migration_v7();
            await this.setSchemaVersion(7);
        }

        // Migration from version 7 to 8: Add user tiers and usage tracking
        if (fromVersion < 8) {
            console.log('Running migration: Add user tiers and usage tracking (v8)');
            await this.migration_v8();
            await this.setSchemaVersion(8);
        }
    }

    async migration_v1() {
        await this.sql`
            CREATE TABLE IF NOT EXISTS query_logs (
                id TEXT PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                source TEXT NOT NULL,
                image_size INTEGER,
                image_type TEXT,
                thumbnail_path TEXT,
                preview_path TEXT,
                exif_data JSONB,
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
                user_agent TEXT
            )
        `;
        console.log('Migration v1 completed: Initial schema created');
    }

    async migration_v2() {
        await this.sql`
            ALTER TABLE query_logs 
            ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
            ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
            ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
            ADD COLUMN IF NOT EXISTS estimated_cost_usd REAL
        `;
        console.log('Migration v2 completed: Token and cost tracking columns added');
    }

    async migration_v3() {
        await this.sql`
            ALTER TABLE query_logs 
            ADD COLUMN IF NOT EXISTS include_weather BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS weather_data TEXT
        `;
        console.log('Migration v3 completed: Weather data tracking columns added');
    }

    async migration_v4() {
        // Users table
        await this.sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `;

        // Login tokens table for magic links
        await this.sql`
            CREATE TABLE IF NOT EXISTS login_tokens (
                token TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT
            )
        `;

        // User sessions table
        await this.sql`
            CREATE TABLE IF NOT EXISTS user_sessions (
                session_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;
        console.log('Migration v4 completed: User authentication tables created');
    }

    async migration_v5() {
        await this.sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
        `;
        console.log('Migration v5 completed: Admin role support added');
    }

    async migration_v6() {
        await this.sql`
            CREATE TABLE IF NOT EXISTS invite_tokens (
                token TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                invited_by_user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                used_by_user_id INTEGER,
                FOREIGN KEY (invited_by_user_id) REFERENCES users (id),
                FOREIGN KEY (used_by_user_id) REFERENCES users (id)
            )
        `;
        console.log('Migration v6 completed: Invite tokens support added');
    }

    async migration_v7() {
        await this.sql`
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                integration_type TEXT NOT NULL,
                setting_key TEXT NOT NULL,
                setting_value TEXT,
                encrypted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, integration_type, setting_key),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;
        console.log('Migration v7 completed: User settings for integrations added');
    }

    async migration_v8() {
        // Create user_tiers table
        await this.sql`
            CREATE TABLE IF NOT EXISTS user_tiers (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                daily_limit INTEGER NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create daily_usage table
        await this.sql`
            CREATE TABLE IF NOT EXISTS daily_usage (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                usage_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        // Add tier_id to users table
        await this.sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS tier_id INTEGER DEFAULT 1 REFERENCES user_tiers(id)
        `;

        // Insert default tiers
        await this.sql`
            INSERT INTO user_tiers (id, name, daily_limit, description) VALUES 
            (1, 'Free', 10, 'Free tier with 10 captions per day'),
            (2, 'Pro', 100, 'Pro tier with 100 captions per day'),
            (3, 'Unlimited', -1, 'Unlimited captions per day')
            ON CONFLICT (name) DO NOTHING
        `;

        console.log('Migration v8 completed: User tiers and usage tracking added');
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

        await this.sql`
            INSERT INTO query_logs (
                id, source, image_size, image_type, thumbnail_path, preview_path, exif_data,
                camera_make, camera_model, gps_latitude, gps_longitude, location_name,
                prompt_length, response_length, processing_time_ms, error_message,
                ip_address, user_agent, input_tokens, output_tokens, total_tokens, 
                estimated_cost_usd, include_weather, weather_data
            ) VALUES (
                ${id}, ${source}, ${imageSize}, ${imageType}, ${thumbnailPath}, ${previewPath},
                ${exifData ? JSON.stringify(exifData) : null}, ${cameraMake}, ${cameraModel}, 
                ${gpsLatitude}, ${gpsLongitude}, ${locationName}, ${promptLength}, ${responseLength},
                ${processingTimeMs}, ${errorMessage}, ${ipAddress}, ${userAgent}, ${inputTokens},
                ${outputTokens}, ${totalTokens}, ${estimatedCostUsd}, ${includeWeather}, ${weatherData}
            )
        `;
        console.log('Query logged with ID:', id);
        return id;
    }

    async getRecentQueries(limit = 50) {
        const rows = await this.sql`
            SELECT * FROM query_logs 
            ORDER BY timestamp DESC 
            LIMIT ${limit}
        `;
        
        // Parse EXIF data JSON strings back to objects
        return rows.map(row => ({
            ...row,
            exif_data: row.exif_data ? JSON.parse(row.exif_data) : null
        }));
    }

    async getQueryStats() {
        const [stats] = await this.sql`
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
        `;
        return stats;
    }

    async getMigrationHistory() {
        return await this.sql`
            SELECT version, applied_at FROM schema_version ORDER BY version ASC
        `;
    }

    async getSchemaInfo() {
        try {
            const currentVersion = await this.getSchemaVersion();
            const migrationHistory = await this.getMigrationHistory();
            
            return {
                currentVersion,
                latestVersion: this.CURRENT_SCHEMA_VERSION,
                isUpToDate: currentVersion >= this.CURRENT_SCHEMA_VERSION,
                migrationHistory,
                needsMigration: currentVersion < this.CURRENT_SCHEMA_VERSION
            };
        } catch (error) {
            console.error('Error getting schema info:', error);
            return {
                error: error.message,
                currentVersion: 0,
                latestVersion: this.CURRENT_SCHEMA_VERSION,
                isUpToDate: false,
                migrationHistory: [],
                needsMigration: true
            };
        }
    }

    // User authentication methods
    async createUser(email) {
        try {
            const [user] = await this.sql`
                INSERT INTO users (email) VALUES (${email})
                RETURNING id, email
            `;
            return user;
        } catch (error) {
            if (error.code === '23505') { // PostgreSQL unique violation
                throw new Error('USER_EXISTS');
            }
            throw error;
        }
    }

    async getUserByEmail(email) {
        const [user] = await this.sql`
            SELECT * FROM users WHERE email = ${email} AND is_active = TRUE
        `;
        return user || null;
    }

    async createLoginToken(email, token, expiresAt, ipAddress, userAgent) {
        await this.sql`
            INSERT INTO login_tokens (token, email, expires_at, ip_address, user_agent) 
            VALUES (${token}, ${email}, ${expiresAt}, ${ipAddress}, ${userAgent})
        `;
        return { token, email, expiresAt };
    }

    async getLoginToken(token) {
        const [loginToken] = await this.sql`
            SELECT * FROM login_tokens 
            WHERE token = ${token} 
            AND used_at IS NULL 
            AND expires_at > NOW()
        `;
        return loginToken || null;
    }

    async useLoginToken(token) {
        const result = await this.sql`
            UPDATE login_tokens 
            SET used_at = NOW() 
            WHERE token = ${token}
        `;
        return result.length > 0;
    }

    async createSession(sessionId, userId, expiresAt, ipAddress, userAgent) {
        await this.sql`
            INSERT INTO user_sessions (session_id, user_id, expires_at, ip_address, user_agent) 
            VALUES (${sessionId}, ${userId}, ${expiresAt}, ${ipAddress}, ${userAgent})
        `;
        return { sessionId, userId, expiresAt };
    }

    async getSession(sessionId) {
        const [session] = await this.sql`
            SELECT s.*, u.email, u.is_admin 
            FROM user_sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.session_id = ${sessionId} 
            AND s.expires_at > NOW() 
            AND u.is_active = TRUE
        `;
        return session || null;
    }

    async deleteSession(sessionId) {
        const result = await this.sql`
            DELETE FROM user_sessions WHERE session_id = ${sessionId}
        `;
        return result.length > 0;
    }

    async updateUserLastLogin(userId) {
        const result = await this.sql`
            UPDATE users SET last_login = NOW() WHERE id = ${userId}
        `;
        return result.length > 0;
    }

    // Admin methods
    async makeUserAdmin(email) {
        const result = await this.sql`
            UPDATE users SET is_admin = TRUE WHERE email = ${email}
        `;
        return result.length > 0;
    }

    async getAllUsers() {
        return await this.sql`
            SELECT 
                u.id, u.email, u.created_at, u.last_login, u.is_active, u.is_admin,
                u.tier_id, t.name as tier_name, t.daily_limit,
                COALESCE(du.usage_count, 0) as usage_today
            FROM users u
            LEFT JOIN user_tiers t ON u.tier_id = t.id
            LEFT JOIN daily_usage du ON u.id = du.user_id AND du.date = CURRENT_DATE
            ORDER BY u.created_at DESC
        `;
    }

    async toggleUserStatus(userId) {
        const result = await this.sql`
            UPDATE users 
            SET is_active = NOT is_active 
            WHERE id = ${userId}
        `;
        return result.length > 0;
    }

    async deleteUser(userId) {
        // Delete user sessions first
        await this.sql`DELETE FROM user_sessions WHERE user_id = ${userId}`;
        
        // Delete user
        const result = await this.sql`DELETE FROM users WHERE id = ${userId}`;
        return result.length > 0;
    }

    // Invite methods
    async createInviteToken(email, invitedByUserId, token, expiresAt) {
        await this.sql`
            INSERT INTO invite_tokens (token, email, invited_by_user_id, expires_at) 
            VALUES (${token}, ${email}, ${invitedByUserId}, ${expiresAt})
        `;
        return { token, email, expiresAt };
    }

    async getInviteToken(token) {
        const [invite] = await this.sql`
            SELECT * FROM invite_tokens 
            WHERE token = ${token} 
            AND used_at IS NULL 
            AND expires_at > NOW()
        `;
        return invite || null;
    }

    async useInviteToken(token, usedByUserId) {
        const result = await this.sql`
            UPDATE invite_tokens 
            SET used_at = NOW(), used_by_user_id = ${usedByUserId} 
            WHERE token = ${token}
        `;
        return result.length > 0;
    }

    async getPendingInvites() {
        return await this.sql`
            SELECT i.*, u.email as invited_by_email 
            FROM invite_tokens i 
            JOIN users u ON i.invited_by_user_id = u.id 
            WHERE i.used_at IS NULL 
            AND i.expires_at > NOW()
            ORDER BY i.created_at DESC
        `;
    }

    // User tier methods
    async getAllTiers() {
        return await this.sql`
            SELECT * FROM user_tiers ORDER BY daily_limit ASC
        `;
    }

    async getTierById(tierId) {
        const [tier] = await this.sql`
            SELECT * FROM user_tiers WHERE id = ${tierId}
        `;
        return tier || null;
    }

    async createTier(name, dailyLimit, description = null) {
        const [tier] = await this.sql`
            INSERT INTO user_tiers (name, daily_limit, description) 
            VALUES (${name}, ${dailyLimit}, ${description})
            RETURNING id
        `;
        return tier.id;
    }

    async updateTier(tierId, name, dailyLimit, description = null) {
        const result = await this.sql`
            UPDATE user_tiers 
            SET name = ${name}, daily_limit = ${dailyLimit}, description = ${description}, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${tierId}
        `;
        return result.length > 0;
    }

    async deleteTier(tierId) {
        // Check if users are assigned to this tier
        const [usageCheck] = await this.sql`
            SELECT COUNT(*) as count FROM users WHERE tier_id = ${tierId}
        `;
        
        if (usageCheck.count > 0) {
            throw new Error('Cannot delete tier with assigned users');
        }

        const result = await this.sql`DELETE FROM user_tiers WHERE id = ${tierId}`;
        return result.length > 0;
    }

    async setUserTier(userId, tierId) {
        const result = await this.sql`
            UPDATE users SET tier_id = ${tierId} WHERE id = ${userId}
        `;
        return result.length > 0;
    }

    async getUserWithTier(userId) {
        const [user] = await this.sql`
            SELECT u.*, t.name as tier_name, t.daily_limit, t.description as tier_description
            FROM users u 
            LEFT JOIN user_tiers t ON u.tier_id = t.id 
            WHERE u.id = ${userId}
        `;
        return user || null;
    }

    // Usage tracking methods
    async getDailyUsage(userId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
        }

        const [usage] = await this.sql`
            SELECT usage_count FROM daily_usage 
            WHERE user_id = ${userId} AND date = ${date}
        `;
        return usage ? usage.usage_count : 0;
    }

    async incrementDailyUsage(userId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
        }

        await this.sql`
            INSERT INTO daily_usage (user_id, date, usage_count) 
            VALUES (${userId}, ${date}, 1)
            ON CONFLICT (user_id, date) 
            DO UPDATE SET 
                usage_count = daily_usage.usage_count + 1, 
                updated_at = CURRENT_TIMESTAMP
        `;
        return true;
    }

    async checkUsageLimit(userId) {
        const user = await this.getUserWithTier(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Unlimited tier (-1) always passes
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

    async getUsersUsageStats() {
        return await this.sql`
            SELECT 
                u.id, u.email, t.name as tier_name, t.daily_limit,
                COALESCE(du.usage_count, 0) as usage_today
            FROM users u
            LEFT JOIN user_tiers t ON u.tier_id = t.id
            LEFT JOIN daily_usage du ON u.id = du.user_id AND du.date = CURRENT_DATE
            ORDER BY u.email
        `;
    }

    // User settings methods for integrations
    async getUserSettings(userId, integrationType = null) {
        if (integrationType) {
            return await this.sql`
                SELECT * FROM user_settings 
                WHERE user_id = ${userId} AND integration_type = ${integrationType}
                ORDER BY integration_type, setting_key
            `;
        } else {
            return await this.sql`
                SELECT * FROM user_settings 
                WHERE user_id = ${userId}
                ORDER BY integration_type, setting_key
            `;
        }
    }

    async getUserSetting(userId, integrationType, settingKey) {
        const [setting] = await this.sql`
            SELECT setting_value FROM user_settings 
            WHERE user_id = ${userId} 
            AND integration_type = ${integrationType} 
            AND setting_key = ${settingKey}
        `;
        return setting ? setting.setting_value : null;
    }

    async setUserSetting(userId, integrationType, settingKey, settingValue, encrypted = false) {
        await this.sql`
            INSERT INTO user_settings (user_id, integration_type, setting_key, setting_value, encrypted, updated_at) 
            VALUES (${userId}, ${integrationType}, ${settingKey}, ${settingValue}, ${encrypted}, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, integration_type, setting_key) 
            DO UPDATE SET 
                setting_value = ${settingValue}, 
                encrypted = ${encrypted}, 
                updated_at = CURRENT_TIMESTAMP
        `;
        return true;
    }

    async deleteUserSetting(userId, integrationType, settingKey) {
        const result = await this.sql`
            DELETE FROM user_settings 
            WHERE user_id = ${userId} 
            AND integration_type = ${integrationType} 
            AND setting_key = ${settingKey}
        `;
        return result.length > 0;
    }

    async deleteAllUserSettings(userId, integrationType = null) {
        if (integrationType) {
            const result = await this.sql`
                DELETE FROM user_settings 
                WHERE user_id = ${userId} AND integration_type = ${integrationType}
            `;
            return result.length;
        } else {
            const result = await this.sql`
                DELETE FROM user_settings WHERE user_id = ${userId}
            `;
            return result.length;
        }
    }

    // No explicit close method needed for Neon
    async close() {
        console.log('Database connection closed');
    }
}

module.exports = Database;