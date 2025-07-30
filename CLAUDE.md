# AI Caption Studio - Project Instructions

## Project Overview
A comprehensive web application that uses AI to analyze uploaded images and generate captions, hashtags, and alt text for multiple social media platforms. Features user authentication, admin management, and advanced context extraction from image metadata.

## Core Functionality
- **Multi-User Authentication**: JWT-based login system with magic links
- **Image Upload & Analysis**: Drag & drop upload with EXIF data extraction
- **AI-Powered Generation**: GPT-4 Vision API for captions, hashtags, and alt text
- **Multiple Caption Styles**: Creative, Professional, Casual, Trendy, Inspirational, Edgy
- **Advanced Context**: Weather data, GPS location, camera info, user context
- **Social Media Integration**: Mastodon posting, template system
- **Admin Management**: User management, tier system, invite system
- **Responsive Design**: Mobile-first design with theme support

## Technical Architecture

### Backend (Cloudflare Workers + Hono)
- **Framework**: Hono.js on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with embedded D1Database class
- **Authentication**: JWT tokens with secure sessions
- **Email**: Resend API for magic link authentication
- **APIs**: OpenAI GPT-4 Vision, OpenWeatherMap
- **Static Assets**: Served from `/public` directory via Cloudflare Workers Assets

### Frontend
- **Technology**: Vanilla HTML, CSS, JavaScript
- **Static Files**: All HTML files served as static assets from `/public` directory
- **Responsive Design**: Mobile-first with CSS Grid/Flexbox
- **Theme System**: CSS custom properties with multiple themes
- **Interactive Elements**: Loading states, copy-to-clipboard, drag & drop
- **Accessibility**: Alt text generation, proper ARIA labels

### Database Schema
- **Users**: Authentication, admin status, tier assignments
- **User Sessions**: JWT session management
- **Login Tokens**: Magic link tokens
- **Invite Tokens**: User invitation system
- **User Tiers**: Usage limits and permissions
- **User Settings**: Social media configurations, templates
- **Query Logs**: Usage analytics and debugging
- **Daily Usage**: Usage tracking per user

## Features Breakdown

### Authentication System
- **Magic Link Login**: Passwordless authentication via email
- **Session Management**: Secure JWT-based sessions
- **Admin System**: Role-based access control
- **Invite System**: Admin-only user invitations with tier assignments

### Image Processing
- **Upload Interface**: Drag & drop with visual feedback
- **EXIF Extraction**: Camera, GPS, timestamp data
- **Weather Integration**: Historical/current weather from GPS coordinates
- **Location Services**: Reverse geocoding for location names
- **File Validation**: Type and size validation (max 10MB)

### AI Caption Generation
- **Advanced Prompts**: Context-aware prompts with EXIF data
- **Style Variations**: 6 distinct caption styles
- **Hashtag Separation**: Strict separation between captions and hashtags
- **Alt Text**: Accessibility-focused image descriptions
- **Context Integration**: User-provided context fields

### Style Options
- ✨ **Creative**: Artistic, expressive language with creative metaphors
- 💼 **Professional**: Clean, business-appropriate language
- 😄 **Casual**: Relaxed, conversational, friend-like tone
- 🔥 **Trendy**: Current trends, viral language, internet expressions
- 💭 **Inspirational**: Motivational, uplifting, encouraging language
- 🖤 **Edgy**: Dry, clever, sarcastic, emotionally detached

### Context Enhancement
- **Camera/Gear**: Manual or auto-detected equipment info
- **Event/Occasion**: User-specified event context
- **Location**: Manual override or GPS-based location
- **Mood/Vibe**: Emotional context for caption tone
- **Subject/Focus**: Main subject identification
- **Custom Notes**: Additional user context
- **Weather Integration**: Auto-detected weather conditions
- **Template System**: Save and reuse context combinations

### Social Media Integration
- **Mastodon**: Direct posting with instance configuration
- **Post Preview**: Real-time preview of social media posts
- **Copy Functionality**: One-click copy for captions and hashtags
- **Character Counting**: Platform-aware character limits

### Admin Management
- **User Administration**: Create, delete, activate/deactivate users
- **Tier Management**: Create usage tiers with daily limits
- **Invite System**: Send invitations with tier assignments
- **Usage Analytics**: Track user activity and API usage
- **System Settings**: Configure registration and system behavior

### User Experience
- **Loading States**: Animated spinners and progress indicators
- **Error Handling**: Graceful error messages and recovery
- **Notifications**: Success/error feedback system
- **Responsive Design**: Seamless mobile and desktop experience
- **Theme Support**: Multiple color themes
- **Accessibility**: Screen reader support, keyboard navigation

## AI Prompt Strategy

### Enhanced Prompt Template
```
Analyze this image for social media posting. Generate:

1. A [STYLE] caption that:
   - Captures the main subject/scene
   - Uses [STYLE-SPECIFIC-TONE]
   - Is 1-3 sentences
   - Includes relevant emojis
   - Feels authentic and natural
   - IMPORTANT: Do NOT include any hashtags in the caption text
   - CRITICAL: Separate caption and hashtags completely

2. 10-15 hashtags that:
   - Mix popular and niche tags
   - Are relevant to image content
   - Include location-based tags if applicable
   - Avoid banned or shadowbanned hashtags
   - These should be completely separate from the caption

3. Alt text for accessibility:
   - Describe what is actually visible
   - Include important visual details for screen readers

Additional Context: [EXIF data, weather, location, user context]

Format:
CAPTION: [caption here - NO hashtags allowed]
HASHTAGS: [hashtags separated by spaces]
ALT_TEXT: [descriptive alt text]
```

## Deployment Configuration

### Cloudflare Workers Setup
- **Runtime**: Cloudflare Workers with Node.js compatibility (nodejs_compat_v2)
- **Database**: D1 database with embedded D1Database class and auto-migration
- **Static Assets**: Served from `/public` directory via Workers Assets
- **Environment Variables**: Secure secret management via wrangler secrets

### Required Environment Variables
```
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-proj-...
SMTP_PASSWORD=re_... (Resend API key)
OPENWEATHER_API_KEY=your-weather-api-key
ADMIN_EMAIL=admin@yourdomain.com
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

### Database Migration
- **Schema Version**: Version 8 with all required tables
- **Auto-Migration**: Embedded D1Database class handles automatic schema migrations
- **Default Data**: Default tiers and settings created automatically
- **Database Class**: Self-contained D1Database class within worker.js

## Security Implementation
- **API Key Protection**: Server-side only, never exposed to frontend
- **JWT Security**: Secure token generation and validation
- **Session Management**: Automatic session cleanup and expiration
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Proper cross-origin request handling
- **Rate Limiting**: Usage limits per user tier

## Performance Optimizations
- **Image Processing**: Client-side EXIF extraction when possible
- **Caching**: Efficient API response caching
- **Lazy Loading**: Progressive image loading
- **Minification**: Optimized CSS and JavaScript
- **CDN Integration**: Cloudflare edge network optimization

## File Structure
```
ai-caption-studio/
├── worker.js                  # Main Cloudflare Worker with embedded D1Database class
├── wrangler.toml              # Cloudflare configuration with assets directory
├── schema.sql                 # Database schema (for reference)
├── .dev.vars                  # Local development secrets
├── public/                    # Static assets directory (served by Workers Assets)
│   ├── index.html            # Main application
│   ├── auth.html             # Authentication page
│   ├── admin.html            # Admin dashboard
│   ├── admin-users.html      # User management
│   ├── admin-tiers.html      # Tier management
│   ├── settings.html         # User settings
│   ├── styles.css            # Main styles
│   ├── themes.css            # Theme definitions
│   ├── script.js             # Main application logic
│   └── theme-loader.js       # Theme management
├── server.js                  # Alternative Node.js server (development)
├── database.js                # Database utilities
├── thumbnails.js              # Thumbnail generation utilities
└── CLAUDE.md                 # This file
```

## Development Commands
```bash
# Local development
wrangler dev --local

# Deploy to production
wrangler deploy

# Manage database
wrangler d1 execute DB --file=schema.sql

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put OPENAI_API_KEY
wrangler secret put SMTP_PASSWORD
wrangler secret put OPENWEATHER_API_KEY
```

## Usage Analytics
- **Query Logging**: All AI API calls logged with metadata
- **Usage Tracking**: Daily usage per user
- **Performance Metrics**: Response times and success rates
- **Admin Analytics**: User activity and system health

## Future Enhancements
- **LinkedIn Integration**: Direct posting to LinkedIn
- **Batch Processing**: Multiple image processing
- **Advanced Templates**: More sophisticated template system
- **Analytics Dashboard**: Detailed usage analytics
- **API Rate Limiting**: More sophisticated rate limiting
- **Content Moderation**: AI-powered content filtering
- **Scheduled Posting**: Integration with scheduling tools
- **Mobile App**: Native mobile application

## Architecture Notes

### Static Asset Serving
- All HTML, CSS, and JavaScript files are served as static assets from the `/public` directory
- Cloudflare Workers Assets automatically serves these files with optimal caching
- The worker.js file handles all API routes and redirects to static files for UI routes
- No HTML content is embedded in the worker code - clean separation of concerns

### Database Architecture
- Complete D1Database class embedded within worker.js for simplified deployment
- Automatic schema migration on startup ensures database consistency
- Self-contained database operations without external dependencies

### Development vs Production
- Alternative Node.js server (server.js) available for local development
- Docker support for containerized deployment
- Cloudflare Workers for production deployment with edge distribution

---

*This application is designed for multi-user deployment with proper authentication, admin controls, and scalable architecture on Cloudflare's edge network. The architecture emphasizes clean separation between static assets and API logic.*