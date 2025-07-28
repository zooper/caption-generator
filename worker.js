// Cloudflare Worker for AI Caption Studio using Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { getCookie, setCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';

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

        // TODO: Send email with magic link using SMTP
        // const loginUrl = `${new URL(c.req.url).origin}/auth/verify?token=${token}`;
        // await sendMagicLinkEmail(email, loginUrl);
        
        return c.json({ 
            success: true, 
            message: 'Magic link sent to your email address (email sending not yet configured)',
            expiresIn: '15 minutes'
        });

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

        // Set secure cookie
        setCookie(c, 'auth_token', jwtToken, {
            httpOnly: true,
            secure: true,
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

// Caption generation endpoint - now requires authentication
app.post('/api/generate-caption', authenticateToken, async (c) => {
  try {
    const user = c.get('user');
    const { prompt, base64Image, style = 'creative' } = await c.req.json();
    
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
    
    // Build prompt based on style
    const styleInstructions = {
      creative: 'creative and artistic',
      professional: 'professional and business-friendly',
      casual: 'casual and friendly',
      trendy: 'trendy and viral',
      inspirational: 'inspirational and motivational',
      edgy: 'edgy and unconventional'
    };
    
    const selectedStyle = styleInstructions[style] || styleInstructions.creative;
    
    const fullPrompt = prompt || `Analyze this image for Instagram posting. Generate:

1. A ${selectedStyle} caption that:
   - Captures the main subject/scene
   - Is 1-3 sentences
   - Includes relevant emojis
   - Feels authentic and natural

2. 10-15 hashtags that:
   - Mix popular and niche tags
   - Are relevant to image content
   - Range from broad to specific

3. Alt text for accessibility (1-2 sentences):
   - Describe what's actually visible in the image
   - Include important visual details for screen readers

Format your response as:
CAPTION: [your caption here]
HASHTAGS: [hashtags separated by spaces]
ALT_TEXT: [descriptive alt text for accessibility]`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: fullPrompt
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
      return c.json({ error: `OpenAI API request failed: ${response.status}` }, response.status);
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
    
    return c.json({ content: responseContent });
    
  } catch (error) {
    console.error('Caption generation error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
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
        .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
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
        @media (max-width: 768px) { .main-content { grid-template-columns: 1fr; } }
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
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    }
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
            const email = document.getElementById('emailInput').value;
            const messageDiv = document.getElementById('loginMessage');
            
            if (!email) {
                messageDiv.innerHTML = '<p style="color: red;">Please enter your email address</p>';
                return;
            }

            try {
                const response = await fetch('/api/auth/request-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();
                
                if (data.success) {
                    messageDiv.innerHTML = 
                        '<p style="color: green;">✅ ' + data.message + '</p>' +
                        '<p style="font-size: 12px; color: #666;">Link expires in ' + data.expiresIn + '</p>';
                } else {
                    messageDiv.innerHTML = '<p style="color: red;">❌ ' + data.error + '</p>';
                }
            } catch (error) {
                messageDiv.innerHTML = '<p style="color: red;">❌ Failed to send magic link</p>';
            }
        }

        function logout() {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
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
            };
            reader.readAsDataURL(file);
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
                const response = await fetch('/api/generate-caption', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({
                        base64Image: uploadedImage,
                        style: selectedStyle
                    })
                });

                const data = await response.json();
                
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

