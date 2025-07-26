const express = require('express');
const cors = require('cors');
const path = require('path');
const exifr = require('exifr');
const { v4: uuidv4 } = require('uuid');
const Database = require('./database');
const ThumbnailGenerator = require('./thumbnails');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and thumbnail generator
const database = new Database();
const thumbnailGenerator = new ThumbnailGenerator();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Serve thumbnails
app.use('/thumbnails', express.static(path.join(process.env.DATA_PATH || './data', 'thumbnails')));

app.post('/api/generate-caption', async (req, res) => {
    const startTime = Date.now();
    const queryId = uuidv4();
    let logData = {
        id: queryId,
        source: null, // Will be determined based on prompt presence
        imageSize: null,
        imageType: null,
        thumbnailPath: null,
        previewPath: null,
        exifData: null,
        cameraMake: null,
        cameraModel: null,
        gpsLatitude: null,
        gpsLongitude: null,
        locationName: null,
        promptLength: null,
        responseLength: null,
        processingTimeMs: null,
        errorMessage: null,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    };

    try {
        let { prompt, base64Image } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            logData.errorMessage = 'OpenAI API key not configured';
            await database.logQuery(logData);
            return res.status(500).json({ 
                error: 'OpenAI API key not configured in .env file' 
            });
        }

        // Validate base64Image
        if (!base64Image || typeof base64Image !== 'string') {
            console.error('Invalid base64Image:', typeof base64Image, base64Image ? base64Image.length : 'null');
            logData.errorMessage = 'Missing or invalid base64 image data';
            await database.logQuery(logData);
            return res.status(400).json({ 
                error: 'Missing or invalid base64 image data' 
            });
        }

        // Determine source and log basic image info
        logData.source = prompt ? 'web' : 'extension';
        logData.imageSize = Math.round(base64Image.length * 0.75); // Approximate original size
        logData.imageType = 'image/jpeg'; // Default assumption

        console.log('Received request - prompt:', !!prompt, 'base64Image length:', base64Image.length);

        // Generate thumbnail and preview images
        const thumbnailResult = await thumbnailGenerator.generateThumbnail(base64Image, queryId);
        if (thumbnailResult) {
            logData.thumbnailPath = thumbnailResult.thumbnailRelativePath;
            logData.previewPath = thumbnailResult.previewRelativePath;
        }

        // Always extract EXIF data for logging (for both web and extension requests)
        console.log('Extracting EXIF data for logging...');
        const { extractedData } = await buildPromptFromImageWithExtraction(base64Image);
        
        // Store extracted data for logging
        if (extractedData) {
            logData.exifData = extractedData.exifData;
            logData.cameraMake = extractedData.cameraMake;
            logData.cameraModel = extractedData.cameraModel;
            logData.gpsLatitude = extractedData.gpsLatitude;
            logData.gpsLongitude = extractedData.gpsLongitude;
            logData.locationName = extractedData.locationName;
        }

        // If no prompt provided (extension request), build prompt with extracted context
        if (!prompt) {
            console.log('Extension request detected - building prompt with extracted context');
            const { prompt: builtPrompt } = await buildPromptFromImageWithExtraction(base64Image);
            prompt = builtPrompt;
        }

        // Validate prompt before sending to OpenAI
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            console.error('Invalid prompt generated:', prompt);
            logData.errorMessage = 'Failed to generate valid prompt for image analysis';
            await database.logQuery(logData);
            return res.status(400).json({ 
                error: 'Failed to generate valid prompt for image analysis' 
            });
        }

        logData.promptLength = prompt.length;
        console.log('Sending prompt to OpenAI, length:', prompt.length);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
                                    url: `data:image/jpeg;base64,${base64Image}`
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
            
            logData.errorMessage = `OpenAI API Error: ${response.status} - ${errorData}`;
            logData.processingTimeMs = Date.now() - startTime;
            await database.logQuery(logData);
            
            if (response.status === 401) {
                return res.status(401).json({ 
                    error: 'Invalid OpenAI API key. Please check your .env file.' 
                });
            }
            
            return res.status(response.status).json({ 
                error: `OpenAI API request failed: ${response.status}` 
            });
        }

        const data = await response.json();
        const responseContent = data.choices[0].message.content;
        
        // Complete logging with success data
        logData.responseLength = responseContent.length;
        logData.processingTimeMs = Date.now() - startTime;
        await database.logQuery(logData);
        
        res.json({ content: responseContent });

    } catch (error) {
        console.error('Server error:', error);
        
        // Log the error
        logData.errorMessage = error.message;
        logData.processingTimeMs = Date.now() - startTime;
        await database.logQuery(logData);
        
        res.status(500).json({ 
            error: 'Internal server error. Please try again.' 
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        apiKeyConfigured: !!process.env.OPENAI_API_KEY,
        mastodonConfigured: !!(process.env.MASTODON_INSTANCE && process.env.MASTODON_TOKEN),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/mastodon-config', (req, res) => {
    res.json({
        instance: process.env.MASTODON_INSTANCE || '',
        token: process.env.MASTODON_TOKEN || '',
        configured: !!(process.env.MASTODON_INSTANCE && process.env.MASTODON_TOKEN)
    });
});

// Store last generated caption for browser extension
let lastGeneratedCaption = null;

app.get('/api/get-last-caption', (req, res) => {
    res.json({
        caption: lastGeneratedCaption,
        timestamp: lastGeneratedCaption ? new Date().toISOString() : null
    });
});

app.post('/api/store-caption', (req, res) => {
    const { caption } = req.body;
    lastGeneratedCaption = caption;
    res.json({ success: true, message: 'Caption stored for extension use' });
});

// Enhanced version that returns both prompt and extracted data for logging
async function buildPromptFromImageWithExtraction(base64Image) {
    console.log('Building prompt from image, base64 length:', base64Image ? base64Image.length : 'null');
    
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
        locationName: null
    };
    
    try {
        // Convert base64 to buffer for EXIF extraction
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Extract EXIF data
        const exifData = await exifr.parse(imageBuffer);
        console.log('Server EXIF extraction:', exifData ? 'Success' : 'No data');
        
        if (exifData) {
            extractedData.exifData = exifData;
            
            // Camera/gear context
            if (exifData.Make || exifData.Model) {
                const camera = `${exifData.Make || ''} ${exifData.Model || ''}`.trim();
                if (camera) {
                    context.push(`Camera/Gear: ${camera}`);
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
                            context.push(`Location: ${location}`);
                            extractedData.locationName = location;
                            console.log('Location detected:', location);
                        } else {
                            console.log('Reverse geocoding returned no location');
                        }
                    } else {
                        console.log('Invalid coordinates after conversion:', lat, lon);
                    }
                } catch (e) {
                    console.log('GPS processing error:', e.message);
                    console.error('Full error:', e);
                }
            } else {
                console.log('No GPS coordinates found in EXIF data');
            }
        }
    } catch (error) {
        console.log('EXIF extraction failed:', error.message);
    }
    
    const contextString = context.length > 0 ? `\n\nAdditional Context:\n${context.join('\n')}` : '';
    
    const prompt = `Analyze this image for Instagram posting. Generate:

1. A creative caption that:
   - Captures the main subject/scene
   - Uses artistic and expressive language with creative metaphors
   - Is 1-3 sentences
   - Includes relevant emojis
   - Feels authentic and natural (NO forced questions or call-to-actions)
   - Sounds like something a real person would write
   ${context.length > 0 ? '- Incorporates the provided context naturally' : ''}

2. 10-15 hashtags that:
   - Mix popular (#photography, #instagood) and niche tags
   - Are relevant to image content
   - Include location-based tags if applicable
   - Avoid banned or shadowbanned hashtags
   - Range from broad to specific
   ${context.length > 0 ? '- Include relevant hashtags based on the context provided' : ''}

3. Alt text for accessibility (1-2 sentences):
   - Describe what's actually visible in the image
   - Include important visual details for screen readers
   - Focus on objective description, not interpretation
   - Keep it concise but descriptive
${contextString}

Format your response as:
CAPTION: [your caption here]
HASHTAGS: [hashtags separated by spaces]
ALT_TEXT: [descriptive alt text for accessibility]`;
    
    return { prompt, extractedData };
}

// Legacy function for backward compatibility
async function buildPromptFromImage(base64Image) {
    const { prompt } = await buildPromptFromImageWithExtraction(base64Image);
    return prompt;
}

// Analytics and Admin Endpoints
app.get('/api/admin/queries', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const queries = await database.getRecentQueries(limit);
        res.json(queries);
    } catch (error) {
        console.error('Error fetching queries:', error);
        res.status(500).json({ error: 'Failed to fetch query logs' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const [dbStats, storageStats] = await Promise.all([
            database.getQueryStats(),
            Promise.resolve(thumbnailGenerator.getStorageStats())
        ]);
        
        res.json({
            database: dbStats,
            storage: storageStats,
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

app.post('/api/admin/cleanup', async (req, res) => {
    try {
        const daysOld = parseInt(req.body.daysOld) || 30;
        const deletedCount = await thumbnailGenerator.cleanupOldThumbnails(daysOld);
        res.json({ 
            message: `Cleaned up ${deletedCount} old thumbnails`,
            deletedCount 
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({ error: 'Failed to cleanup thumbnails' });
    }
});

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

// Reverse geocoding function (copied from frontend logic)
async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'Instagram Caption Generator'
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Instagram Caption Generator running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`💡 Open http://localhost:${PORT} in your browser to start!`);
});