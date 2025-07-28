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

    async createUser(email) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO users (email, is_active) VALUES (?, 1)
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
        // Simplified logging for now
        console.log('Query logged:', logData.id);
    }

    async checkUsageLimit(userId) {
        // Simplified usage check - return unlimited for now
        return { allowed: true, used: 0, limit: -1, remaining: -1 };
    }

    async incrementDailyUsage(userId) {
        // Placeholder for usage increment
        console.log('Usage incremented for user:', userId);
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
                user = await database.createUser(loginToken.email);
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
        
        // Extract EXIF data with more detailed options
        const exifData = await exifr.parse(imageBuffer, {
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
        console.log('Server EXIF extraction:', exifData ? 'Success' : 'No data');
        
        if (exifData) {
            extractedData.exifData = exifData;
            console.log('EXIF data keys:', Object.keys(exifData));
            console.log('EXIF Make:', exifData.Make);
            console.log('EXIF Model:', exifData.Model);
            console.log('EXIF GPS:', exifData.GPSLatitude, exifData.GPSLongitude);
            
            // Extract photo date/time
            const dateFields = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'];
            for (const field of dateFields) {
                if (exifData[field]) {
                    try {
                        let dateStr = exifData[field];
                        let parsedDate;
                        
                        if (typeof dateStr === 'string') {
                            // Standard EXIF format: "2024:01:15 14:30:25"
                            dateStr = dateStr.replace(/:/g, '-').replace(/ /, 'T') + 'Z';
                            parsedDate = new Date(dateStr);
                        } else if (dateStr instanceof Date) {
                            parsedDate = dateStr;
                        }
                        
                        if (parsedDate && !isNaN(parsedDate.getTime())) {
                            extractedData.photoDateTime = parsedDate.toISOString();
                            extractedData.dateTimeSource = field;
                            context.push('Photo taken: ' + parsedDate.toLocaleDateString() + ' ' + parsedDate.toLocaleTimeString());
                            console.log('Photo date extracted from ' + field + ':', parsedDate);
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
                        dateStr = dateStr.replace(/:/g, '-').replace(/ /, 'T') + 'Z';
                        parsedDate = new Date(dateStr);
                    } else if (dateStr instanceof Date) {
                        parsedDate = dateStr;
                    }
                    
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        photoTimestamp = parsedDate.getTime();
                        dateSource = field;
                        console.log('Successfully parsed ' + field + ':', new Date(photoTimestamp));
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; position: relative; }
        .header h1 { background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 3em; margin-bottom: 10px; }
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
                    <button onclick="logout()" style="margin-top: 10px; padding: 5px 10px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Logout</button>
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
        }

        function showLoginForm() {
            isAuthenticated = false;
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('authStatus').classList.add('hidden');
            document.querySelector('.main-content').style.display = 'none';
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

        // Check authentication on page load
        document.addEventListener('DOMContentLoaded', checkAuth);

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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .admin-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .users-table { width: 100%; border-collapse: collapse; }
        .users-table th, .users-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .btn { padding: 8px 16px; background: #405de6; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #3a52d1; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛠️ Admin Dashboard</h1>
            <nav><a href="/">← Back to Main</a></nav>
        </div>

        <div id="loginRequired" class="admin-section">
            <h2>🔐 Admin Login Required</h2>
            <p>Please login with an admin account to access the dashboard.</p>
        </div>

        <div id="adminContent" class="hidden">
            <div class="admin-section">
                <h2>📊 Statistics</h2>
                <div id="stats">Loading...</div>
            </div>

            <div class="admin-section">
                <h2>👥 Users</h2>
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Created</th>
                            <th>Admin</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usersTable">
                        <tr><td colspan="4">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        async function checkAdminAuth() {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
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
            // Load stats
            try {
                const statsResponse = await fetch('/api/admin/stats', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    document.getElementById('stats').innerHTML = 
                        '<p>Total Users: ' + stats.totalUsers + '</p>' +
                        '<p>Total Queries: ' + stats.totalQueries + '</p>';
                }
            } catch (error) {
                document.getElementById('stats').innerHTML = '<p>Failed to load stats</p>';
            }

            // Load users
            try {
                const usersResponse = await fetch('/api/admin/users', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                if (usersResponse.ok) {
                    const users = await usersResponse.json();
                    const tbody = document.getElementById('usersTable');
                    tbody.innerHTML = users.map(user => 
                        '<tr>' +
                        '<td>' + user.email + '</td>' +
                        '<td>' + new Date(user.created_at).toLocaleDateString() + '</td>' +
                        '<td>' + (user.is_admin ? '✅ Admin' : '👤 User') + '</td>' +
                        '<td>' + (user.is_admin ? '' : '<button class="btn" onclick="makeAdmin(' + user.id + ')">Make Admin</button>') + '</td>' +
                        '</tr>'
                    ).join('');
                }
            } catch (error) {
                document.getElementById('usersTable').innerHTML = '<tr><td colspan="4">Failed to load users</td></tr>';
            }
        }

        async function makeAdmin(userId) {
            try {
                const response = await fetch('/api/admin/users/' + userId + '/make-admin', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                if (response.ok) {
                    alert('User promoted to admin');
                    loadAdminData();
                } else {
                    alert('Failed to promote user');
                }
            } catch (error) {
                alert('Error promoting user');
            }
        }

        document.addEventListener('DOMContentLoaded', checkAdminAuth);
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .settings-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .btn { padding: 12px 24px; background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); color: white; border: none; border-radius: 4px; cursor: pointer; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚙️ Settings</h1>
            <nav><a href="/">← Back to Main</a></nav>
        </div>

        <div id="loginRequired" class="settings-section">
            <h2>🔐 Login Required</h2>
            <p>Please login to access your settings.</p>
        </div>

        <div id="settingsContent" class="hidden">
            <div class="settings-section">
                <h2>👤 Account Information</h2>
                <p>Email: <span id="userEmail">Loading...</span></p>
                <p>Account Type: <span id="userType">Loading...</span></p>
            </div>

            <div class="settings-section">
                <h2>🔧 Preferences</h2>
                <div class="form-group">
                    <label for="defaultStyle">Default Caption Style:</label>
                    <select id="defaultStyle">
                        <option value="creative">✨ Creative</option>
                        <option value="professional">💼 Professional</option>
                        <option value="casual">😄 Casual</option>
                        <option value="trendy">🔥 Trendy</option>
                        <option value="inspirational">💭 Inspirational</option>
                        <option value="edgy">🖤 Edgy</option>
                    </select>
                </div>
                <button class="btn" onclick="saveSettings()">Save Preferences</button>
            </div>
        </div>
    </div>

    <script>
        async function checkAuth() {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('auth_token') }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('loginRequired').classList.add('hidden');
                    document.getElementById('settingsContent').classList.remove('hidden');
                    document.getElementById('userEmail').textContent = user.email;
                    document.getElementById('userType').textContent = user.isAdmin ? 'Admin' : 'User';
                    
                    // Load saved preferences
                    const savedStyle = localStorage.getItem('defaultStyle') || 'creative';
                    document.getElementById('defaultStyle').value = savedStyle;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        function saveSettings() {
            const defaultStyle = document.getElementById('defaultStyle').value;
            localStorage.setItem('defaultStyle', defaultStyle);
            alert('Settings saved!');
        }

        document.addEventListener('DOMContentLoaded', checkAuth);
    </script>
</body>
</html>
  `);
});

export default app;

