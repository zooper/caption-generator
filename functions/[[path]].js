// Cloudflare Pages Function to handle all routes
import { unstable_dev } from 'wrangler';

// Import your Express app
const app = require('../server.js');

export async function onRequest(context) {
  const { request, env } = context;
  
  // Set environment variables and Cloudflare flag
  Object.assign(process.env, env, { CLOUDFLARE: 'true' });
  
  // Create a simple Express-compatible handler
  return new Promise((resolve) => {
    const req = {
      method: request.method,
      url: new URL(request.url).pathname + new URL(request.url).search,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.body,
      ip: request.headers.get('CF-Connecting-IP'),
      get: (header) => request.headers.get(header),
      // Pass D1 database binding
      d1: env.DB
    };
    
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { 
        this.headers['Content-Type'] = 'application/json';
        this.body = JSON.stringify(data);
        return this;
      },
      send: function(data) { this.body = data; return this; },
      setHeader: function(name, value) { this.headers[name] = value; },
      end: function(data) { 
        if (data) this.body = data;
        resolve(new Response(this.body, {
          status: this.statusCode,
          headers: this.headers
        }));
      }
    };
    
    // Handle the request with your Express app
    try {
      app.handle(req, res);
    } catch (error) {
      resolve(new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  });
}