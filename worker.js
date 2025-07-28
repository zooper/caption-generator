// Cloudflare Worker for AI Caption Studio
import { createRequestHandler } from '@cloudflare/workers-types';

// For now, let's create a simple Worker that handles basic routes
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Set environment variables
    Object.assign(process.env, env, { CLOUDFLARE: 'true' });
    
    // Handle static files
    if (url.pathname === '/' || url.pathname === '/index.html') {
      // Serve the main HTML file
      return new Response(await getIndexHTML(), {
        headers: { 'content-type': 'text/html' }
      });
    }
    
    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPIRoute(request, env, ctx);
    }
    
    // Handle other static files (CSS, JS, etc.)
    if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.html')) {
      return handleStaticFile(request, url.pathname);
    }
    
    // 404 for everything else
    return new Response('Not Found', { status: 404 });
  }
};

async function handleAPIRoute(request, env, ctx) {
  const url = new URL(request.url);
  
  // Simple SMTP test endpoint
  if (url.pathname === '/api/smtp-test') {
    return new Response(JSON.stringify({
      message: 'SMTP Configuration',
      config: {
        host: env.SMTP_HOST || 'smtp.resend.com',
        port: parseInt(env.SMTP_PORT) || 587,
        user: env.SMTP_USER || 'resend',
        hasPassword: !!env.SMTP_PASSWORD,
        fromEmail: env.SMTP_FROM_EMAIL,
        fromName: env.SMTP_FROM_NAME
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { 'content-type': 'application/json' }
    });
  }
  
  // Database setup endpoint
  if (url.pathname === '/api/setup-database') {
    try {
      // Initialize D1 database
      const db = env.DB;
      
      // Simple query to test connection
      const result = await db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"').first();
      
      return new Response(JSON.stringify({
        message: 'Database connection successful',
        tables: result.count,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Database connection failed',
        message: error.message
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }
  
  // For other API routes, return a placeholder
  return new Response(JSON.stringify({
    error: 'API endpoint not yet implemented',
    path: url.pathname,
    message: 'This endpoint will be implemented after basic setup is working'
  }), {
    status: 501,
    headers: { 'content-type': 'application/json' }
  });
}

async function handleStaticFile(request, pathname) {
  // For now, return a simple response
  // In a full implementation, you'd serve the actual files
  if (pathname.endsWith('.css')) {
    return new Response('/* CSS files will be served here */', {
      headers: { 'content-type': 'text/css' }
    });
  }
  
  if (pathname.endsWith('.js')) {
    return new Response('// JS files will be served here', {
      headers: { 'content-type': 'application/javascript' }
    });
  }
  
  return new Response('File not found', { status: 404 });
}

async function getIndexHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Caption Studio</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #405de6; }
        .status { margin: 20px 0; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 AI Caption Studio</h1>
        <p>Cloudflare Workers deployment is active!</p>
        
        <div class="status">
            <h3>System Status:</h3>
            <div id="smtp-status">Testing SMTP...</div>
            <div id="db-status">Testing Database...</div>
        </div>
        
        <p>This is a basic version. Full functionality will be added step by step.</p>
    </div>
    
    <script>
        // Test SMTP configuration
        fetch('/api/smtp-test')
            .then(res => res.json())
            .then(data => {
                document.getElementById('smtp-status').innerHTML = 
                    '<span class="success">✅ SMTP: Connected</span>';
            })
            .catch(err => {
                document.getElementById('smtp-status').innerHTML = 
                    '<span class="error">❌ SMTP: Failed</span>';
            });
        
        // Test database connection
        fetch('/api/setup-database')
            .then(res => res.json())
            .then(data => {
                document.getElementById('db-status').innerHTML = 
                    '<span class="success">✅ Database: Connected (' + data.tables + ' tables)</span>';
            })
            .catch(err => {
                document.getElementById('db-status').innerHTML = 
                    '<span class="error">❌ Database: Failed</span>';
            });
    </script>
</body>
</html>`;
}