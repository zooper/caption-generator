// Cloudflare Worker for AI Caption Studio
import app from './server.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Set environment variables for the Express app
      process.env.CLOUDFLARE = 'true';
      process.env.DB = env.DB;
      Object.assign(process.env, env);
      
      // Use the existing Express app with serverless-http
      const { default: serverlessHttp } = await import('serverless-http');
      const handler = serverlessHttp(app);
      
      // Convert the request to the format expected by serverless-http
      const event = {
        httpMethod: request.method,
        path: new URL(request.url).pathname,
        queryStringParameters: Object.fromEntries(new URL(request.url).searchParams),
        headers: Object.fromEntries(request.headers),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : null,
        isBase64Encoded: false
      };
      
      const context = { 
        env: {
          ...env,
          CLOUDFLARE: 'true',
          DB: env.DB
        }
      };
      
      // Call the serverless handler
      const result = await handler(event, context);
      
      // Convert response back to Worker format
      return new Response(result.body, {
        status: result.statusCode,
        headers: result.headers
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Worker error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }
};

