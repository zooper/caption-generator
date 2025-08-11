# AI Caption Studio 🎨✨

A comprehensive web application that uses AI to analyze uploaded images and generate captions, hashtags, and alt text for multiple social media platforms. Features user authentication, admin management, scheduled posting, and advanced context extraction from image metadata.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare Workers](https://img.shields.io/badge/cloudflare-workers-orange.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

## Features

### 🤖 AI-Powered Content Generation
- **Smart Captions**: Generate natural, engaging captions using GPT-4 Vision API
- **Relevant Hashtags**: Mix of popular and niche hashtags (10-15 tags)
- **Accessibility Alt Text**: Descriptive text for screen readers
- **Multiple Styles**: Creative, Professional, Casual, Trendy, Inspirational, Edgy
- **Advanced Context**: Weather data, GPS location, camera info, user context

### 👥 Multi-User Authentication System
- **Magic Link Login**: Passwordless authentication via email
- **Session Management**: Secure JWT-based sessions with automatic cleanup
- **Admin System**: Role-based access control with user management
- **Invite System**: Admin-only user invitations with tier assignments
- **User Tiers**: Configurable usage limits and permissions

### ⏰ Scheduled Posting
- **Flexible Scheduling**: Schedule posts with 1-minute precision
- **Multiple Platforms**: Mastodon, Pixelfed, Instagram support
- **Background Processing**: Automated posting via Cloudflare Cron Triggers
- **Status Tracking**: Monitor pending, completed, and failed posts
- **Retry Logic**: Automatic retry for failed posts

### 📸 Advanced Image Processing
- **EXIF Extraction**: Camera, GPS, timestamp data with weather integration
- **Location Services**: Reverse geocoding with weather conditions
- **File Validation**: Type and size validation (max 10MB)
- **R2 Storage**: Secure image storage with Cloudflare R2
- **Thumbnail Generation**: Automatic preview generation

### 🌐 Social Media Integration
- **Mastodon**: Direct posting with instance configuration
- **Pixelfed**: Photo sharing with hashtag support
- **Instagram**: Basic posting capabilities
- **Post Preview**: Real-time preview of social media posts
- **Template System**: Save and reuse context combinations

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first design with theme support
- **Drag & Drop**: Easy image uploading with visual feedback
- **Loading States**: Animated spinners and progress indicators
- **Error Handling**: Graceful error messages and recovery
- **Theme Support**: Multiple color themes with CSS custom properties

## Quick Start

### Prerequisites
- Node.js 18+ (for local development)
- Cloudflare account with Workers, D1, and R2 access
- OpenAI API key
- Resend API key (for email authentication)
- Optional: Weather API key, social media credentials

### Cloudflare Workers Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/zooper/caption-generator.git
   cd caption-generator
   ```

2. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **Set up environment secrets**
   ```bash
   wrangler secret put JWT_SECRET
   wrangler secret put OPENAI_API_KEY
   wrangler secret put SMTP_PASSWORD  # Resend API key
   wrangler secret put OPENWEATHER_API_KEY
   ```

4. **Deploy to Cloudflare Workers**
   ```bash
   wrangler deploy
   ```

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure local environment**
   ```bash
   # Create .dev.vars file for local development
   echo "JWT_SECRET=your-jwt-secret" >> .dev.vars
   echo "OPENAI_API_KEY=your-openai-key" >> .dev.vars
   echo "SMTP_PASSWORD=your-resend-key" >> .dev.vars
   ```

3. **Start local development**
   ```bash
   wrangler dev --local
   ```

4. **Alternative Node.js development**
   ```bash
   node server.js
   ```

### Required Environment Variables

```bash
# Authentication & Security
JWT_SECRET=your-random-jwt-secret
ADMIN_EMAIL=admin@yourdomain.com

# AI Services
OPENAI_API_KEY=sk-proj-your-openai-key

# Email Service (Resend)
SMTP_PASSWORD=re_your-resend-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com

# Optional: Weather Integration
OPENWEATHER_API_KEY=your-weather-api-key

# Cloudflare Configuration (automatically set)
NODE_ENV=production
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
```

## Getting API Keys

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Set via Wrangler: `wrangler secret put OPENAI_API_KEY`

### Resend API Key (Email Authentication)
1. Sign up at [Resend](https://resend.com)
2. Create a new API key
3. Set via Wrangler: `wrangler secret put SMTP_PASSWORD`
4. Configure your domain for email sending

### OpenWeather API Key (Optional)
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get a free API key
3. Set via Wrangler: `wrangler secret put OPENWEATHER_API_KEY`

### Social Media Configuration
**Mastodon:**
- Users configure their own instance and token in settings
- Instance URL and access token stored per user

**Pixelfed:**
- Users configure their own instance and token
- Similar to Mastodon configuration

**Instagram:**
- Requires Facebook Developer account and app approval
- Users configure in their settings panel

## Docker Deployment

### Build Image
```bash
docker build -t caption-generator .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your-key-here \
  -e MASTODON_INSTANCE=https://mastodon.social \
  -e MASTODON_TOKEN=your-token-here \
  caption-generator
```

### Docker Compose
```yaml
version: '3.8'
services:
  caption-generator:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=your-key-here
      - MASTODON_INSTANCE=https://mastodon.social
      - MASTODON_TOKEN=your-token-here
```

## Kubernetes Deployment

This application is designed for Kubernetes deployment with GitOps workflows:

- **Application Repo**: Source code and Docker builds (this repo)
- **Infrastructure Repo**: Kubernetes manifests and ArgoCD configuration
- **Container Registry**: GitHub Container Registry (`ghcr.io/zooper/caption-generator`)

For Kubernetes deployment, you'll need to create manifests for:
- Deployment with environment variables
- Service (LoadBalancer or ClusterIP + Ingress)
- Secret for API keys
- Optional: ArgoCD Application for GitOps

## API Endpoints

### Authentication
```
POST /api/send-login-link    # Send magic link email
POST /api/verify-login       # Verify login token and create session
POST /api/logout             # Clear user session
GET  /api/verify-session     # Check session validity
```

### User Management
```
GET  /api/user-settings      # Get user preferences and social config
POST /api/user-settings      # Update user settings
GET  /api/admin/users        # List all users (admin only)
POST /api/admin/users        # Create new user (admin only)
```

### Image & Caption Generation
```
POST /api/upload-image       # Upload image to R2 storage
POST /api/generate-caption   # Generate AI captions from image
GET  /api/images/:id         # Serve images from R2 storage
```

### Scheduled Posts
```
GET  /api/scheduled-posts    # List user's scheduled posts
POST /api/schedule-post      # Schedule a new post
PUT  /api/scheduled-posts/:id # Update scheduled post
DELETE /api/scheduled-posts/:id # Delete scheduled post
```

### Social Media Posting
```
POST /api/post-to-mastodon   # Post immediately to Mastodon
POST /api/post-to-pixelfed   # Post immediately to Pixelfed
POST /api/post-to-instagram  # Post immediately to Instagram
```

### Admin & Analytics
```
GET  /api/admin/analytics    # Usage analytics (admin only)
GET  /api/admin/tiers        # Manage user tiers (admin only)
POST /api/admin/invite       # Send user invitation (admin only)
```

## Development

### Project Structure
```
ai-caption-studio/
├── worker.js                  # Main Cloudflare Worker with embedded D1Database
├── wrangler.toml              # Cloudflare configuration with assets
├── schema.sql                 # Database schema (reference)
├── .dev.vars                  # Local development secrets
├── public/                    # Static assets (served by Workers Assets)
│   ├── index.html            # Main application
│   ├── auth.html             # Authentication page
│   ├── admin.html            # Admin dashboard
│   ├── admin-users.html      # User management
│   ├── admin-tiers.html      # Tier management
│   ├── settings.html         # User settings
│   ├── styles.css            # Main styles
│   ├── themes.css            # Theme definitions
│   ├── script.js             # Main application logic
│   ├── theme-loader.js       # Theme management
│   └── templates/            # HTML templates
├── server.js                  # Alternative Node.js server (development)
├── database.js                # Database utilities
├── thumbnails.js              # Thumbnail generation utilities
├── Dockerfile                 # Container build configuration
└── .github/workflows/         # CI/CD pipeline
```

### Available Scripts
```bash
# Cloudflare Workers Development
wrangler dev --local     # Local development with D1/R2
wrangler deploy          # Deploy to production
wrangler tail            # View live logs

# Alternative Node.js Development
npm start                # Production Express server
npm run dev              # Development with nodemon
node server.js           # Direct Node.js server

# Database Management
wrangler d1 execute DB --file=schema.sql  # Initialize database
wrangler d1 migrations list --database DB # Check migrations
```

### Architecture

**Frontend (Vanilla JavaScript):**
- Multi-page application with authentication flows
- Template-based UI with external HTML templates
- Real-time image upload with progress tracking
- EXIF data extraction and weather integration
- Social media posting with platform-specific handling

**Backend (Cloudflare Workers + Hono):**
- Serverless architecture on Cloudflare's edge network
- Embedded D1Database class with automatic migrations
- JWT-based authentication with session management
- R2 storage for images with automatic cleanup
- Cron triggers for scheduled post processing

**Database (Cloudflare D1):**
- SQLite-based with automatic schema versioning
- User management with tiered access control
- Scheduled posts with status tracking
- Usage analytics and session management
- Template and settings storage

**Storage (Cloudflare R2):**
- Image storage with automatic thumbnail generation
- Secure access via signed URLs
- Automatic cleanup of orphaned images

## Supported Image Formats

- **JPEG** (.jpg, .jpeg) - Full EXIF support
- **PNG** (.png) - Limited metadata
- **GIF** (.gif) - Basic support
- **Maximum size**: 10MB per image

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Required features:**
- Fetch API
- Async/await
- File API
- Clipboard API

## Privacy & Security

- **No data storage**: Images processed in memory only
- **API key security**: Server-side environment variables
- **HTTPS recommended**: For production deployments
- **CORS enabled**: For API access

## Troubleshooting

### Common Issues

**"Authentication failed" or "Invalid session"**
- Check JWT_SECRET is properly set
- Verify email configuration with Resend
- Check if user exists and is activated

**"OpenAI API key not configured"**
- Verify secret is set: `wrangler secret list`
- Check API key has sufficient credits
- Ensure key has GPT-4 Vision access

**"Image upload failed" or "R2 storage error"**
- Check R2 bucket configuration in wrangler.toml
- Verify R2 permissions and access
- Check image size (max 10MB)

**"Scheduled posts not processing"**
- Verify cron triggers are enabled
- Check wrangler.toml cron configuration
- View logs: `wrangler tail`

**"Social media posting failed"**
- Check user's social media tokens in settings
- Verify platform-specific API access
- Check platform rate limits

**"Database migration errors"**
- Check D1 database permissions
- Verify database binding in wrangler.toml
- Run manual migration if needed

### Debug Mode

**Cloudflare Workers:**
```bash
wrangler tail                    # Live logs
wrangler dev --local --verbose   # Verbose local development
```

**Node.js Alternative:**
```bash
DEBUG=caption-generator:* node server.js
```

### Performance Monitoring

**Check scheduled post processing:**
```bash
# View cron trigger logs
wrangler tail --format=pretty

# Check database for stuck posts
wrangler d1 execute DB --command="SELECT * FROM scheduled_posts WHERE status='pending' AND scheduled_time < datetime('now')"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Current Status & Features

### ✅ Fully Implemented
- **Multi-User Authentication**: Magic link login with JWT sessions
- **Scheduled Posting**: 1-minute precision with automated processing
- **Image Processing**: EXIF extraction, weather integration, R2 storage
- **AI Caption Generation**: GPT-4 Vision with 6 style options
- **Social Media Integration**: Mastodon, Pixelfed, Instagram posting
- **Admin Management**: User tiers, invitations, analytics
- **Template System**: Reusable HTML templates with variable substitution

### 🔄 Recent Updates
- **1-Minute Scheduling**: Updated from 5-minute to 1-minute intervals
- **Image Serving**: Fixed R2 key lookup for background images
- **Delete Functionality**: Added delete buttons for all post statuses
- **Cron Processing**: Automated scheduled post processing every minute

### 🎯 Architecture Benefits
- **Edge Performance**: Cloudflare Workers global distribution
- **Automatic Scaling**: Serverless with built-in scaling
- **Cost Effective**: Pay-per-request pricing model
- **Reliable Storage**: R2 object storage with D1 database
- **Security**: JWT authentication with environment secrets

## Deployment Options

### Production (Recommended)
- **Cloudflare Workers**: Serverless edge deployment
- **Automatic Scaling**: No server management required
- **Global CDN**: Fast static asset delivery
- **Cron Triggers**: Automated scheduled post processing

### Development & Testing
- **Local Wrangler**: Full feature testing with `wrangler dev --local`
- **Node.js Alternative**: Traditional server for development
- **Docker Support**: Containerized deployment option

## Acknowledgments

- **OpenAI GPT-4 Vision**: AI-powered image analysis and caption generation
- **Cloudflare Workers**: Serverless computing platform with edge deployment
- **Hono.js**: Fast web framework for Cloudflare Workers
- **exifr**: Comprehensive EXIF data extraction library
- **Resend**: Reliable email delivery service for authentication
- **OpenWeatherMap**: Weather data integration for enhanced context
- **Mastodon/Pixelfed**: Decentralized social media platforms

---

**Built with ❤️ for the content creator community**

*A comprehensive social media caption generation platform with enterprise-grade authentication, scheduling, and multi-platform posting capabilities.*