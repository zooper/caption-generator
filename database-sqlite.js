const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Use environment variable for database path (for Kubernetes persistent volume)
        const dbDir = process.env.DATA_PATH || './data';
        
        // Ensure data directory exists
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.dbPath = path.join(dbDir, 'caption_logs.db');
        this.db = new sqlite3.Database(this.dbPath);
        
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

    createSchemaVersionTable() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    getSchemaVersion() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.version : 0);
                    }
                }
            );
        });
    }

    setSchemaVersion(version) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO schema_version (version) VALUES (?)',
                [version],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`Schema updated to version ${version}`);
                        resolve();
                    }
                }
            );
        });
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

    migration_v1() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS query_logs (
                    id TEXT PRIMARY KEY,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    source TEXT NOT NULL,
                    image_size INTEGER,
                    image_type TEXT,
                    thumbnail_path TEXT,
                    preview_path TEXT,
                    exif_data TEXT,
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
            `, (err) => {
                if (err) {
                    console.error('Migration v1 failed:', err);
                    reject(err);
                } else {
                    console.log('Migration v1 completed: Initial schema created');
                    resolve();
                }
            });
        });
    }

    migration_v2() {
        return new Promise((resolve, reject) => {
            // Check if columns already exist to avoid errors
            this.db.get("PRAGMA table_info(query_logs)", (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Add the new columns for token tracking
                this.db.serialize(() => {
                    this.db.run("ALTER TABLE query_logs ADD COLUMN input_tokens INTEGER", (err) => {
                        if (err && !err.message.includes('duplicate column name')) {
                            console.error('Error adding input_tokens column:', err);
                        }
                    });

                    this.db.run("ALTER TABLE query_logs ADD COLUMN output_tokens INTEGER", (err) => {
                        if (err && !err.message.includes('duplicate column name')) {
                            console.error('Error adding output_tokens column:', err);
                        }
                    });

                    this.db.run("ALTER TABLE query_logs ADD COLUMN total_tokens INTEGER", (err) => {
                        if (err && !err.message.includes('duplicate column name')) {
                            console.error('Error adding total_tokens column:', err);
                        }
                    });

                    this.db.run("ALTER TABLE query_logs ADD COLUMN estimated_cost_usd REAL", (err) => {
                        if (err && !err.message.includes('duplicate column name')) {
                            console.error('Error adding estimated_cost_usd column:', err);
                        } else {
                            console.log('Migration v2 completed: Token and cost tracking columns added');
                            resolve();
                        }
                    });
                });
            });
        });
    }

    migration_v3() {
        return new Promise((resolve, reject) => {
            // Add weather data tracking columns
            this.db.serialize(() => {
                this.db.run("ALTER TABLE query_logs ADD COLUMN include_weather INTEGER", (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding include_weather column:', err);
                    }
                });

                this.db.run("ALTER TABLE query_logs ADD COLUMN weather_data TEXT", (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('Error adding weather_data column:', err);
                    } else {
                        console.log('Migration v3 completed: Weather data tracking columns added');
                        resolve();
                    }
                });
            });
        });
    }

    migration_v4() {
        return new Promise((resolve, reject) => {
            // Create user authentication tables
            this.db.serialize(() => {
                // Users table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT UNIQUE NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_login DATETIME,
                        is_active INTEGER DEFAULT 1
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err);
                        return reject(err);
                    }
                });

                // Login tokens table for magic links
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS login_tokens (
                        token TEXT PRIMARY KEY,
                        email TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        expires_at DATETIME NOT NULL,
                        used_at DATETIME,
                        ip_address TEXT,
                        user_agent TEXT
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating login_tokens table:', err);
                        return reject(err);
                    }
                });

                // User sessions table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        session_id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        expires_at DATETIME NOT NULL,
                        ip_address TEXT,
                        user_agent TEXT,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating user_sessions table:', err);
                        return reject(err);
                    } else {
                        console.log('Migration v4 completed: User authentication tables created');
                        resolve();
                    }
                });
            });
        });
    }

    async logQuery(logData) {
        return new Promise((resolve, reject) => {
            const {
                id,
                source,
                imageSize,
                imageType,
                thumbnailPath,
                previewPath,
                exifData,
                cameraMake,
                cameraModel,
                gpsLatitude,
                gpsLongitude,
                locationName,
                promptLength,
                responseLength,
                processingTimeMs,
                errorMessage,
                ipAddress,
                userAgent,
                inputTokens,
                outputTokens,
                totalTokens,
                estimatedCostUsd,
                includeWeather,
                weatherData
            } = logData;

            const sql = `
                INSERT INTO query_logs (
                    id, source, image_size, image_type, thumbnail_path, preview_path, exif_data,
                    camera_make, camera_model, gps_latitude, gps_longitude, location_name,
                    prompt_length, response_length, processing_time_ms, error_message,
                    ip_address, user_agent, input_tokens, output_tokens, total_tokens, estimated_cost_usd,
                    include_weather, weather_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                id, source, imageSize, imageType, thumbnailPath, previewPath,
                exifData ? JSON.stringify(exifData) : null,
                cameraMake, cameraModel, gpsLatitude, gpsLongitude, locationName,
                promptLength, responseLength, processingTimeMs, errorMessage,
                ipAddress, userAgent, inputTokens, outputTokens, totalTokens, estimatedCostUsd,
                includeWeather ? 1 : 0, weatherData
            ], function(err) {
                if (err) {
                    console.error('Error logging query:', err);
                    reject(err);
                } else {
                    console.log('Query logged with ID:', id);
                    resolve(this.lastID);
                }
            });
        });
    }

    async getRecentQueries(limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM query_logs 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse EXIF data JSON strings back to objects
                    const processedRows = rows.map(row => ({
                        ...row,
                        exif_data: row.exif_data ? JSON.parse(row.exif_data) : null
                    }));
                    resolve(processedRows);
                }
            });
        });
    }

    async getQueryStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
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
                    SUM(CASE WHEN input_tokens IS NOT NULL THEN input_tokens ELSE 0 END) as total_input_tokens,
                    SUM(CASE WHEN output_tokens IS NOT NULL THEN output_tokens ELSE 0 END) as total_output_tokens,
                    SUM(CASE WHEN total_tokens IS NOT NULL THEN total_tokens ELSE 0 END) as total_tokens_used,
                    SUM(CASE WHEN estimated_cost_usd IS NOT NULL THEN estimated_cost_usd ELSE 0 END) as total_cost_usd
                FROM query_logs
            `, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getMigrationHistory() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT version, applied_at FROM schema_version ORDER BY version ASC',
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
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

    migration_v5() {
        return new Promise((resolve, reject) => {
            // Add admin role support to users table
            this.db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding is_admin column:', err);
                    return reject(err);
                } else {
                    console.log('Migration v5 completed: Admin role support added');
                    resolve();
                }
            });
        });
    }

    migration_v6() {
        return new Promise((resolve, reject) => {
            // Create invite tokens table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS invite_tokens (
                    token TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    invited_by_user_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    used_by_user_id INTEGER,
                    FOREIGN KEY (invited_by_user_id) REFERENCES users (id),
                    FOREIGN KEY (used_by_user_id) REFERENCES users (id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating invite_tokens table:', err);
                    return reject(err);
                } else {
                    console.log('Migration v6 completed: Invite tokens support added');
                    resolve();
                }
            });
        });
    }

    migration_v7() {
        return new Promise((resolve, reject) => {
            // Create user settings table for integrations
            this.db.run(`
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
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating user_settings table:', err);
                    return reject(err);
                } else {
                    console.log('Migration v7 completed: User settings for integrations added');
                    resolve();
                }
            });
        });
    }

    migration_v8() {
        return new Promise((resolve, reject) => {
            // Create user tiers and usage tracking tables
            this.db.serialize(() => {
                // Create user_tiers table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS user_tiers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        daily_limit INTEGER NOT NULL,
                        description TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating user_tiers table:', err);
                        return reject(err);
                    }
                });

                // Create daily_usage table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS daily_usage (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        date DATE NOT NULL,
                        usage_count INTEGER DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, date),
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating daily_usage table:', err);
                        return reject(err);
                    }
                });

                // Add tier_id to users table
                this.db.run(`
                    ALTER TABLE users ADD COLUMN tier_id INTEGER DEFAULT 1 REFERENCES user_tiers(id)
                `, (err) => {
                    if (err && !err.message.includes('duplicate column')) {
                        console.error('Error adding tier_id to users table:', err);
                        return reject(err);
                    }
                });

                // Insert default tiers
                this.db.run(`
                    INSERT OR IGNORE INTO user_tiers (id, name, daily_limit, description) VALUES 
                    (1, 'Free', 10, 'Free tier with 10 captions per day'),
                    (2, 'Pro', 100, 'Pro tier with 100 captions per day'),
                    (3, 'Unlimited', -1, 'Unlimited captions per day')
                `, (err) => {
                    if (err) {
                        console.error('Error inserting default tiers:', err);
                        return reject(err);
                    } else {
                        console.log('Migration v8 completed: User tiers and usage tracking added');
                        resolve();
                    }
                });
            });
        });
    }

    // User authentication methods
    async createUser(email) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (email) VALUES (?)',
                [email],
                function(err) {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT') {
                            // User already exists, get existing user
                            return reject(new Error('USER_EXISTS'));
                        }
                        return reject(err);
                    }
                    resolve({ id: this.lastID, email });
                }
            );
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE email = ? AND is_active = 1',
                [email],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    }

    async createLoginToken(email, token, expiresAt, ipAddress, userAgent) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO login_tokens (token, email, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                [token, email, expiresAt, ipAddress, userAgent],
                function(err) {
                    if (err) return reject(err);
                    resolve({ token, email, expiresAt });
                }
            );
        });
    }

    async getLoginToken(token) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM login_tokens WHERE token = ? AND used_at IS NULL AND expires_at > datetime("now")',
                [token],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    }

    async useLoginToken(token) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE login_tokens SET used_at = datetime("now") WHERE token = ?',
                [token],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    async createSession(sessionId, userId, expiresAt, ipAddress, userAgent) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO user_sessions (session_id, user_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                [sessionId, userId, expiresAt, ipAddress, userAgent],
                function(err) {
                    if (err) return reject(err);
                    resolve({ sessionId, userId, expiresAt });
                }
            );
        });
    }

    async getSession(sessionId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT s.*, u.email, u.is_admin FROM user_sessions s 
                 JOIN users u ON s.user_id = u.id 
                 WHERE s.session_id = ? AND s.expires_at > datetime("now") AND u.is_active = 1`,
                [sessionId],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    }

    async deleteSession(sessionId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM user_sessions WHERE session_id = ?',
                [sessionId],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    async updateUserLastLogin(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET last_login = datetime("now") WHERE id = ?',
                [userId],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    // Admin methods
    async makeUserAdmin(email) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET is_admin = 1 WHERE email = ?',
                [email],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    u.id, 
                    u.email, 
                    u.created_at, 
                    u.last_login, 
                    u.is_active, 
                    u.is_admin,
                    u.tier_id,
                    t.name as tier_name,
                    t.daily_limit,
                    COALESCE(du.usage_count, 0) as usage_today
                FROM users u
                LEFT JOIN user_tiers t ON u.tier_id = t.id
                LEFT JOIN daily_usage du ON u.id = du.user_id AND du.date = date('now')
                ORDER BY u.created_at DESC
            `, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    async toggleUserStatus(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?',
                [userId],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    async deleteUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Delete user sessions first
                this.db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
                // Delete user
                this.db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                });
            });
        });
    }

    // Invite methods
    async createInviteToken(email, invitedByUserId, token, expiresAt) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO invite_tokens (token, email, invited_by_user_id, expires_at) VALUES (?, ?, ?, ?)',
                [token, email, invitedByUserId, expiresAt],
                function(err) {
                    if (err) return reject(err);
                    resolve({ token, email, expiresAt });
                }
            );
        });
    }

    async getInviteToken(token) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM invite_tokens WHERE token = ? AND used_at IS NULL AND expires_at > datetime("now")',
                [token],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    }

    async useInviteToken(token, usedByUserId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE invite_tokens SET used_at = datetime("now"), used_by_user_id = ? WHERE token = ?',
                [usedByUserId, token],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    async getPendingInvites() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT i.*, u.email as invited_by_email 
                 FROM invite_tokens i 
                 JOIN users u ON i.invited_by_user_id = u.id 
                 WHERE i.used_at IS NULL AND i.expires_at > datetime("now")
                 ORDER BY i.created_at DESC`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    // User tier methods
    
    async getAllTiers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM user_tiers ORDER BY daily_limit ASC', (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }
    
    async getTierById(tierId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM user_tiers WHERE id = ?', [tierId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }
    
    async createTier(name, dailyLimit, description = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO user_tiers (name, daily_limit, description) VALUES (?, ?, ?)',
                [name, dailyLimit, description],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }
    
    async updateTier(tierId, name, dailyLimit, description = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE user_tiers SET name = ?, daily_limit = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [name, dailyLimit, description, tierId],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }
    
    async deleteTier(tierId) {
        return new Promise((resolve, reject) => {
            // Don't allow deleting tier if users are assigned to it
            this.db.get('SELECT COUNT(*) as count FROM users WHERE tier_id = ?', [tierId], (err, row) => {
                if (err) return reject(err);
                if (row.count > 0) {
                    return reject(new Error('Cannot delete tier with assigned users'));
                }
                
                this.db.run('DELETE FROM user_tiers WHERE id = ?', [tierId], function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                });
            });
        });
    }
    
    async setUserTier(userId, tierId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET tier_id = ? WHERE id = ?',
                [tierId, userId],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }
    
    async getUserWithTier(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT u.*, t.name as tier_name, t.daily_limit, t.description as tier_description
                FROM users u 
                LEFT JOIN user_tiers t ON u.tier_id = t.id 
                WHERE u.id = ?
            `, [userId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }
    
    // Usage tracking methods
    
    async getDailyUsage(userId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
        }
        
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT usage_count FROM daily_usage WHERE user_id = ? AND date = ?',
                [userId, date],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row ? row.usage_count : 0);
                }
            );
        });
    }
    
    async incrementDailyUsage(userId, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
        }
        
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO daily_usage (user_id, date, usage_count) 
                VALUES (?, ?, 1)
                ON CONFLICT(user_id, date) 
                DO UPDATE SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
            `, [userId, date], function(err) {
                if (err) return reject(err);
                resolve(this.changes > 0);
            });
        });
    }
    
    async checkUsageLimit(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.getUserWithTier(userId);
                if (!user) {
                    return reject(new Error('User not found'));
                }
                
                // Unlimited tier (-1) always passes
                if (user.daily_limit === -1) {
                    return resolve({ allowed: true, remaining: -1, limit: -1, used: 0 });
                }
                
                const today = new Date().toISOString().split('T')[0];
                const usedToday = await this.getDailyUsage(userId, today);
                const remaining = Math.max(0, user.daily_limit - usedToday);
                const allowed = usedToday < user.daily_limit;
                
                resolve({
                    allowed,
                    remaining,
                    limit: user.daily_limit,
                    used: usedToday,
                    tierName: user.tier_name
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async getUsersUsageStats() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    u.id,
                    u.email,
                    t.name as tier_name,
                    t.daily_limit,
                    COALESCE(du.usage_count, 0) as usage_today
                FROM users u
                LEFT JOIN user_tiers t ON u.tier_id = t.id
                LEFT JOIN daily_usage du ON u.id = du.user_id AND du.date = date('now')
                ORDER BY u.email
            `, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    // User settings methods for integrations
    
    async getUserSettings(userId, integrationType = null) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM user_settings WHERE user_id = ?';
            let params = [userId];
            
            if (integrationType) {
                query += ' AND integration_type = ?';
                params.push(integrationType);
            }
            
            query += ' ORDER BY integration_type, setting_key';
            
            this.db.all(query, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }
    
    async getUserSetting(userId, integrationType, settingKey) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT setting_value FROM user_settings WHERE user_id = ? AND integration_type = ? AND setting_key = ?',
                [userId, integrationType, settingKey],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row ? row.setting_value : null);
                }
            );
        });
    }
    
    async setUserSetting(userId, integrationType, settingKey, settingValue, encrypted = false) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO user_settings 
                 (user_id, integration_type, setting_key, setting_value, encrypted, updated_at) 
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [userId, integrationType, settingKey, settingValue, encrypted],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }
    
    async deleteUserSetting(userId, integrationType, settingKey) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM user_settings WHERE user_id = ? AND integration_type = ? AND setting_key = ?',
                [userId, integrationType, settingKey],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }
    
    async deleteAllUserSettings(userId, integrationType = null) {
        return new Promise((resolve, reject) => {
            let query = 'DELETE FROM user_settings WHERE user_id = ?';
            let params = [userId];
            
            if (integrationType) {
                query += ' AND integration_type = ?';
                params.push(integrationType);
            }
            
            this.db.run(query, params, function(err) {
                if (err) return reject(err);
                resolve(this.changes);
            });
        });
    }

    close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
                resolve();
            });
        });
    }
}

module.exports = Database;