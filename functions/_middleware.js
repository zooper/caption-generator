// Cloudflare Pages middleware to handle all Express.js routes
export async function onRequest(context) {
  const { request, env } = context;
  
  // For now, let's just handle static files and redirect API calls
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    // For API routes, we'll need a different approach
    // Let's redirect to a simple response for now
    return new Response(JSON.stringify({
      error: "API routes not yet configured",
      message: "Please use Cloudflare Dashboard to create the project first"
    }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Let other requests pass through to static files
  return await context.next();
}