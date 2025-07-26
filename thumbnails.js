const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class ThumbnailGenerator {
    constructor() {
        // Use environment variable for thumbnails path (for Kubernetes persistent volume)
        this.thumbnailsDir = path.join(process.env.DATA_PATH || './data', 'thumbnails');
        
        // Ensure thumbnails directory exists
        if (!fs.existsSync(this.thumbnailsDir)) {
            fs.mkdirSync(this.thumbnailsDir, { recursive: true });
        }
    }

    async generateThumbnail(base64Image, queryId) {
        try {
            // Remove data URL prefix if present
            const base64Data = base64Image.includes(',') 
                ? base64Image.split(',')[1] 
                : base64Image;
            
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Generate thumbnail filename
            const thumbnailFilename = `${queryId}_thumb.jpg`;
            const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);
            
            // Create thumbnail (200x200 max, maintaining aspect ratio)
            await sharp(imageBuffer)
                .resize(200, 200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: 80,
                    progressive: true
                })
                .toFile(thumbnailPath);
            
            console.log(`Thumbnail generated: ${thumbnailFilename}`);
            return {
                filename: thumbnailFilename,
                path: thumbnailPath,
                relativePath: `thumbnails/${thumbnailFilename}`
            };
            
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return null;
        }
    }

    async getThumbnailPath(queryId) {
        const thumbnailFilename = `${queryId}_thumb.jpg`;
        const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);
        
        return fs.existsSync(thumbnailPath) ? thumbnailPath : null;
    }

    async cleanupOldThumbnails(daysOld = 30) {
        try {
            const files = fs.readdirSync(this.thumbnailsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(this.thumbnailsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }
            
            console.log(`Cleaned up ${deletedCount} old thumbnails`);
            return deletedCount;
            
        } catch (error) {
            console.error('Error cleaning up thumbnails:', error);
            return 0;
        }
    }

    getStorageStats() {
        try {
            const files = fs.readdirSync(this.thumbnailsDir);
            let totalSize = 0;
            
            for (const file of files) {
                const filePath = path.join(this.thumbnailsDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            }
            
            return {
                thumbnailCount: files.length,
                totalSizeBytes: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
            };
            
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return { thumbnailCount: 0, totalSizeBytes: 0, totalSizeMB: '0' };
        }
    }
}

module.exports = ThumbnailGenerator;