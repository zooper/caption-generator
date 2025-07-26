const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/generate-caption', async (req, res) => {
    try {
        const { prompt, base64Image } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured in .env file' 
            });
        }

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
        res.json({ content: data.choices[0].message.content });

    } catch (error) {
        console.error('Server error:', error);
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Instagram Caption Generator running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`💡 Open http://localhost:${PORT} in your browser to start!`);
});