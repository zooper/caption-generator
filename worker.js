// Cloudflare Worker for AI Caption Studio using Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

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

// Caption generation endpoint - simplified for now
app.post('/api/generate-caption', async (c) => {
  try {
    const { prompt, base64Image, style = 'creative' } = await c.req.json();
    
    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }
    
    if (!base64Image) {
      return c.json({ error: 'Missing image data' }, 400);
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
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { background: linear-gradient(135deg, #405de6 0%, #fd1d1d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 3em; margin-bottom: 10px; }
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
            <h1>🎨 AI Caption Studio</h1>
            <p>AI-powered captions, hashtags, and alt text for any social platform</p>
        </header>

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
                    headers: { 'Content-Type': 'application/json' },
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
app.get('/auth', (c) => c.html('<h1>Auth page</h1><p>Full authentication is available in the local development server.</p><a href="/">← Back to Main</a>'));
app.get('/admin', (c) => c.html('<h1>Admin page</h1><p>Admin dashboard is available in the local development server.</p><a href="/">← Back to Main</a>'));
app.get('/settings', (c) => c.html('<h1>Settings page</h1><p>Settings are available in the local development server.</p><a href="/">← Back to Main</a>'));

export default app;

