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
        this.CURRENT_SCHEMA_VERSION = 2;
        
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
                estimatedCostUsd
            } = logData;

            const sql = `
                INSERT INTO query_logs (
                    id, source, image_size, image_type, thumbnail_path, preview_path, exif_data,
                    camera_make, camera_model, gps_latitude, gps_longitude, location_name,
                    prompt_length, response_length, processing_time_ms, error_message,
                    ip_address, user_agent, input_tokens, output_tokens, total_tokens, estimated_cost_usd
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                id, source, imageSize, imageType, thumbnailPath, previewPath,
                exifData ? JSON.stringify(exifData) : null,
                cameraMake, cameraModel, gpsLatitude, gpsLongitude, locationName,
                promptLength, responseLength, processingTimeMs, errorMessage,
                ipAddress, userAgent, inputTokens, outputTokens, totalTokens, estimatedCostUsd
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