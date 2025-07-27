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

// Rate limiting for OpenAI API calls
const rateLimiter = {
    requests: [],
    maxRequestsPerMinute: 3, // Conservative limit to avoid 429 errors
    
    canMakeRequest() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Remove requests older than 1 minute
        this.requests = this.requests.filter(timestamp => timestamp > oneMinuteAgo);
        
        return this.requests.length < this.maxRequestsPerMinute;
    },
    
    recordRequest() {
        this.requests.push(Date.now());
    },
    
    getWaitTime() {
        if (this.requests.length === 0) return 0;
        const oldestRequest = Math.min(...this.requests);
        const waitTime = 60000 - (Date.now() - oldestRequest);
        return Math.max(0, Math.ceil(waitTime / 1000)); // Return seconds
    }
};

// Simple in-memory cache for API responses
const responseCache = new Map();
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(imageHash, style) {
    return `${imageHash}_${style}`;
}

function getCachedResponse(cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
        return cached.response;
    }
    if (cached) {
        responseCache.delete(cacheKey); // Remove expired cache
    }
    return null;
}

function setCachedResponse(cacheKey, response) {
    responseCache.set(cacheKey, {
        response,
        timestamp: Date.now()
    });
}

// Initialize thumbnail generator
const thumbnailGenerator = new ThumbnailGenerator();

// Initialize database with async handling
let database;
const initializeDatabase = async () => {
    try {
        database = new Database();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
};

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
        userAgent: req.get('User-Agent'),
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostUsd: null
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

        // Check rate limit before making API call
        if (!rateLimiter.canMakeRequest()) {
            const waitTime = rateLimiter.getWaitTime();
            console.log(`Rate limit exceeded. Need to wait ${waitTime} seconds.`);
            
            logData.errorMessage = `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`;
            logData.processingTimeMs = Date.now() - startTime;
            await database.logQuery(logData);
            
            return res.status(429).json({ 
                error: `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`,
                waitTime: waitTime
            });
        }

        // Record this request
        rateLimiter.recordRequest();

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
        
        // Extract token usage and calculate cost
        if (data.usage) {
            logData.inputTokens = data.usage.prompt_tokens || 0;
            logData.outputTokens = data.usage.completion_tokens || 0;
            logData.totalTokens = data.usage.total_tokens || 0;
            
            // Calculate cost based on GPT-4o pricing (as of 2024)
            // Input: $2.50 per 1M tokens, Output: $10.00 per 1M tokens
            const inputCost = (logData.inputTokens / 1000000) * 2.50;
            const outputCost = (logData.outputTokens / 1000000) * 10.00;
            logData.estimatedCostUsd = inputCost + outputCost;
            
            console.log(`Token usage - Input: ${logData.inputTokens}, Output: ${logData.outputTokens}, Cost: $${logData.estimatedCostUsd.toFixed(6)}`);
        }
        
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

// Debug endpoint to test EXIF extraction
app.post('/api/debug-exif', async (req, res) => {
    try {
        const { base64Image } = req.body;
        console.log('=== DEBUG EXIF EXTRACTION ===');
        console.log('Received base64 length:', base64Image ? base64Image.length : 'null');
        
        if (!base64Image) {
            return res.json({ error: 'No image provided' });
        }
        
        const imageBuffer = Buffer.from(base64Image, 'base64');
        console.log('Image buffer size:', imageBuffer.length, 'bytes');
        
        // Try different EXIF extraction methods
        const exifData = await exifr.parse(imageBuffer);
        console.log('Basic EXIF extraction result:', exifData ? 'Found data' : 'No data');
        
        if (exifData) {
            console.log('EXIF keys:', Object.keys(exifData));
            console.log('Camera Make:', exifData.Make);
            console.log('Camera Model:', exifData.Model);
            console.log('GPS data:', {
                lat: exifData.GPSLatitude,
                lon: exifData.GPSLongitude,
                latRef: exifData.GPSLatitudeRef,
                lonRef: exifData.GPSLongitudeRef
            });
        }
        
        // Try with all options enabled
        const fullExifData = await exifr.parse(imageBuffer, true);
        console.log('Full EXIF extraction result:', fullExifData ? 'Found data' : 'No data');
        
        res.json({
            hasBasicExif: !!exifData,
            hasFullExif: !!fullExifData,
            basicExifKeys: exifData ? Object.keys(exifData) : [],
            fullExifKeys: fullExifData ? Object.keys(fullExifData) : [],
            camera: exifData ? { make: exifData.Make, model: exifData.Model } : null,
            gps: exifData ? {
                lat: exifData.GPSLatitude,
                lon: exifData.GPSLongitude,
                latRef: exifData.GPSLatitudeRef,
                lonRef: exifData.GPSLongitudeRef
            } : null
        });
    } catch (error) {
        console.error('Debug EXIF error:', error);
        res.status(500).json({ error: error.message });
    }
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
        console.log('Image buffer size:', imageBuffer.length, 'bytes');
        
        // Check image format first
        const imageHeader = imageBuffer.slice(0, 10);
        console.log('Image header bytes:', Array.from(imageHeader).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // Extract EXIF data with more detailed options
        const exifData = await exifr.parse(imageBuffer, {
            tiff: true,
            ifd0: true,
            exif: true,
            gps: true,
            pick: ['Make', 'Model', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef']
        });
        console.log('Server EXIF extraction:', exifData ? 'Success' : 'No data');
        if (exifData) {
            console.log('EXIF data keys:', Object.keys(exifData));
            console.log('EXIF Make:', exifData.Make);
            console.log('EXIF Model:', exifData.Model);
            console.log('EXIF GPS:', exifData.GPSLatitude, exifData.GPSLongitude);
        } else {
            // Try alternative extraction method
            try {
                const allExifData = await exifr.parse(imageBuffer, true);
                console.log('Alternative EXIF extraction:', allExifData ? 'Success' : 'No data');
                if (allExifData) {
                    console.log('Alternative EXIF keys:', Object.keys(allExifData));
                }
            } catch (altError) {
                console.log('Alternative EXIF extraction failed:', altError.message);
            }
        }
        
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

// Get database schema information
app.get('/api/admin/schema', async (req, res) => {
    try {
        const schemaInfo = await database.getSchemaInfo();
        res.json(schemaInfo);
    } catch (error) {
        console.error('Error fetching schema info:', error);
        res.status(500).json({ error: 'Failed to fetch schema information' });
    }
});

// Debug endpoint to test OpenAI API access
app.get('/api/admin/openai-debug', async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.json({ error: 'No API key configured' });
        }

        const results = {};

        // Test 1: Basic API access (models endpoint)
        try {
            const modelsResponse = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
            });
            results.models = {
                status: modelsResponse.status,
                statusText: modelsResponse.statusText,
                accessible: modelsResponse.ok
            };
        } catch (e) {
            results.models = { error: e.message };
        }

        // Test 2: Usage endpoint (try different parameter formats)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Try format 1: single date parameter
        try {
            const usageResponse1 = await fetch(`https://api.openai.com/v1/usage?date=${todayStr}`, {
                headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
            });
            results.usage_single_date = {
                status: usageResponse1.status,
                statusText: usageResponse1.statusText,
                accessible: usageResponse1.ok,
                url: `https://api.openai.com/v1/usage?date=${todayStr}`
            };
            if (usageResponse1.ok) {
                const data = await usageResponse1.json();
                results.usage_single_date.hasData = !!data;
                results.usage_single_date.sampleData = data;
            } else {
                const errorText = await usageResponse1.text();
                results.usage_single_date.errorBody = errorText;
            }
        } catch (e) {
            results.usage_single_date = { error: e.message };
        }

        // Try format 2: start_date and end_date  
        try {
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const startDateStr = startDate.toISOString().split('T')[0];
            const usageResponse2 = await fetch(`https://api.openai.com/v1/usage?start_date=${startDateStr}&end_date=${todayStr}`, {
                headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
            });
            results.usage_date_range = {
                status: usageResponse2.status,
                statusText: usageResponse2.statusText,
                accessible: usageResponse2.ok,
                url: `https://api.openai.com/v1/usage?start_date=${startDateStr}&end_date=${todayStr}`
            };
            if (usageResponse2.ok) {
                const data = await usageResponse2.json();
                results.usage_date_range.hasData = !!data;
                results.usage_date_range.sampleData = data;
            } else {
                const errorText = await usageResponse2.text();
                results.usage_date_range.errorBody = errorText;
            }
        } catch (e) {
            results.usage_date_range = { error: e.message };
        }

        // Test 3: Subscription endpoint
        try {
            const subResponse = await fetch('https://api.openai.com/v1/dashboard/billing/subscription', {
                headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
            });
            results.subscription = {
                status: subResponse.status,
                statusText: subResponse.statusText,
                accessible: subResponse.ok
            };
            if (subResponse.ok) {
                const data = await subResponse.json();
                results.subscription.hasData = !!data;
            } else {
                const errorText = await subResponse.text();
                results.subscription.errorBody = errorText;
            }
        } catch (e) {
            results.subscription = { error: e.message };
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check OpenAI account balance and usage
app.get('/api/admin/openai-usage', async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(400).json({ 
                error: 'OpenAI API key not configured',
                available: false
            });
        }

        // Get usage data for the last 7 days to provide better monthly estimates
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        let openaiUsage = null;
        let usageAvailable = false;
        let weeklyUsage = {
            totalContextTokens: 0,
            totalGeneratedTokens: 0,
            totalRequests: 0,
            dailyBreakdown: []
        };

        try {
            // Fetch usage for multiple days
            const usagePromises = dates.map(async (dateStr) => {
                const response = await fetch(`https://api.openai.com/v1/usage?date=${dateStr}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return { date: dateStr, data };
                }
                return { date: dateStr, data: null };
            });
            
            const results = await Promise.all(usagePromises);
            
            // Process results
            results.forEach(result => {
                if (result.data && result.data.data) {
                    let dayContextTokens = 0;
                    let dayGeneratedTokens = 0;
                    let dayRequests = 0;
                    
                    result.data.data.forEach(item => {
                        dayContextTokens += item.n_context_tokens_total || 0;
                        dayGeneratedTokens += item.n_generated_tokens_total || 0;
                        dayRequests += item.n_requests || 0;
                    });
                    
                    weeklyUsage.totalContextTokens += dayContextTokens;
                    weeklyUsage.totalGeneratedTokens += dayGeneratedTokens;
                    weeklyUsage.totalRequests += dayRequests;
                    
                    weeklyUsage.dailyBreakdown.push({
                        date: result.date,
                        contextTokens: dayContextTokens,
                        generatedTokens: dayGeneratedTokens,
                        requests: dayRequests,
                        cost: ((dayContextTokens / 1000000) * 2.50) + ((dayGeneratedTokens / 1000000) * 10.00)
                    });
                }
            });
            
            // Get today's specific data for detailed view
            const todayStr = dates[0];
            const todayUsageResponse = await fetch(`https://api.openai.com/v1/usage?date=${todayStr}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                }
            });

            if (todayUsageResponse.ok) {
                openaiUsage = await todayUsageResponse.json();
                usageAvailable = true;
                console.log('OpenAI usage data fetched successfully for', todayStr);
                
                // Calculate totals from today's usage data
                let totalContextTokens = 0;
                let totalGeneratedTokens = 0;
                let totalRequests = 0;
                
                if (openaiUsage && openaiUsage.data) {
                    openaiUsage.data.forEach(item => {
                        totalContextTokens += item.n_context_tokens_total || 0;
                        totalGeneratedTokens += item.n_generated_tokens_total || 0;
                        totalRequests += item.n_requests || 0;
                    });
                }
                
                // Calculate actual spending using OpenAI's public pricing for GPT-4o
                // Input: $2.50 per 1M tokens, Output: $10.00 per 1M tokens
                const inputCostToday = (totalContextTokens / 1000000) * 2.50;
                const outputCostToday = (totalGeneratedTokens / 1000000) * 10.00;
                const totalCostToday = inputCostToday + outputCostToday;
                
                openaiUsage.totals = {
                    totalContextTokens,
                    totalGeneratedTokens,
                    totalTokens: totalContextTokens + totalGeneratedTokens,
                    totalRequests,
                    estimatedCostToday: totalCostToday,
                    inputCostToday,
                    outputCostToday
                };
                
                // Calculate weekly totals and projections
                const weeklyInputCost = (weeklyUsage.totalContextTokens / 1000000) * 2.50;
                const weeklyOutputCost = (weeklyUsage.totalGeneratedTokens / 1000000) * 10.00;
                const weeklyTotalCost = weeklyInputCost + weeklyOutputCost;
                
                // Estimate monthly spending based on weekly average
                const dailyAverageCost = weeklyTotalCost / 7;
                const estimatedMonthlyCost = dailyAverageCost * 30;
                
                weeklyUsage.totals = {
                    weeklyInputCost,
                    weeklyOutputCost,
                    weeklyTotalCost,
                    dailyAverageCost,
                    estimatedMonthlyCost
                };
                
            } else {
                console.log('Could not fetch OpenAI usage data:', todayUsageResponse.status, todayUsageResponse.statusText);
            }
        } catch (usageError) {
            console.log('OpenAI usage API request failed:', usageError.message);
        }

        res.json({
            openaiUsage,
            weeklyUsage,
            subscription: null, // Not available via API (browser-only)
            available: usageAvailable,
            usageApiAvailable: usageAvailable,
            billingApiAvailable: false, // Confirmed: browser-only
            message: usageAvailable 
                ? 'OpenAI usage API accessible with spending estimates'
                : 'Using local cost tracking (most accurate)',
            date: dates[0]
        });

    } catch (error) {
        console.error('Error fetching OpenAI usage:', error);
        res.status(500).json({ 
            error: 'Failed to fetch OpenAI usage data',
            available: false
        });
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

// Start server with database initialization
const startServer = async () => {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Instagram Caption Generator running on http://localhost:${PORT}`);
        console.log(`📁 Serving files from: ${__dirname}`);
        console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
        console.log(`🗄️ Database schema version: ${database.CURRENT_SCHEMA_VERSION}`);
        console.log(`💡 Open http://localhost:${PORT} in your browser to start!`);
    });
};

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});