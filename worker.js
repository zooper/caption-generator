// Cloudflare Worker for AI Caption Studio using Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

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

// Serve static files
app.get('/', serveStatic({ path: './index.html' }));
app.get('/auth', serveStatic({ path: './auth.html' }));
app.get('/admin', serveStatic({ path: './admin.html' }));
app.get('/settings', serveStatic({ path: './settings.html' }));

// Serve other static assets
app.get('/*', serveStatic({ root: './' }));

export default app;

