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
        
        this.initDatabase();
    }

    initDatabase() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Create query_logs table
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
                        console.error('Error creating query_logs table:', err);
                        reject(err);
                    } else {
                        console.log('Database initialized successfully');
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
                userAgent
            } = logData;

            const sql = `
                INSERT INTO query_logs (
                    id, source, image_size, image_type, thumbnail_path, preview_path, exif_data,
                    camera_make, camera_model, gps_latitude, gps_longitude, location_name,
                    prompt_length, response_length, processing_time_ms, error_message,
                    ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                id, source, imageSize, imageType, thumbnailPath, previewPath,
                exifData ? JSON.stringify(exifData) : null,
                cameraMake, cameraModel, gpsLatitude, gpsLongitude, locationName,
                promptLength, responseLength, processingTimeMs, errorMessage,
                ipAddress, userAgent
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
                    COUNT(CASE WHEN gps_latitude IS NOT NULL THEN 1 END) as queries_with_gps_data
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