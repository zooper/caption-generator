# AI Caption Studio 🎨✨

AI-powered web application that generates social media captions, hashtags, and alt text from uploaded images. Features automatic EXIF data extraction and direct Mastodon posting capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

## Features

### 🤖 AI-Powered Content Generation
- **Smart Captions**: Generate natural, engaging captions in multiple styles
- **Relevant Hashtags**: Mix of popular and niche hashtags (10-15 tags)
- **Accessibility Alt Text**: Descriptive text for screen readers
- **Multiple Styles**: Creative, Professional, Casual, Trendy, Inspirational, Edgy

### 📸 Automatic Metadata Extraction
- **GPS Location**: Auto-populates location from image EXIF data
- **Camera Info**: Extracts camera make, model, and lens information
- **Reverse Geocoding**: Converts GPS coordinates to readable location names

### 🐘 Mastodon Integration
- **Direct Posting**: One-click posting to your Mastodon instance
- **Accessible Uploads**: Automatic alt text inclusion for accessibility
- **Server-side Config**: Credentials stored securely as environment variables

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Drag & Drop**: Easy image uploading with preview
- **Real-time Feedback**: Loading states and notifications
- **Copy to Clipboard**: Easy sharing of generated content

## Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key
- Mastodon access token (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/zooper/caption-generator.git
   cd caption-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

### Environment Variables

```bash
# Required: OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Mastodon Integration
MASTODON_INSTANCE=https://mastodon.social
MASTODON_TOKEN=your-mastodon-access-token

# Server Configuration
PORT=3000
NODE_ENV=production
```

## Getting API Keys

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file

### Mastodon Access Token
1. Go to your Mastodon instance (e.g., mastodon.social)
2. Settings → Development → New Application
3. Application name: "Caption Generator"
4. Scopes: `read write write:media write:statuses`
5. Copy the access token

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

### Health Check
```
GET /api/health
```
Returns server status and configuration state.

### Mastodon Configuration
```
GET /api/mastodon-config
```
Returns Mastodon instance and token (for authenticated frontend).

### Generate Caption
```
POST /api/generate-caption
```
Generates caption, hashtags, and alt text from uploaded image.

**Request Body:**
```json
{
  "prompt": "AI prompt with style and context",
  "base64Image": "base64-encoded-image-data"
}
```

## Development

### Project Structure
```
├── index.html          # Frontend application
├── script.js           # Main JavaScript functionality
├── styles.css          # Responsive CSS styling
├── server.js           # Express.js backend
├── package.json        # Dependencies and scripts
├── Dockerfile          # Container build configuration
└── .github/workflows/  # CI/CD pipeline
```

### Available Scripts
```bash
npm start        # Production server
npm run dev      # Development with nodemon
npm test         # Run tests (if available)
```

### Architecture

**Frontend (Vanilla JS):**
- Image upload and preview
- EXIF data extraction with `exifr`
- AI prompt building and result parsing
- Mastodon API integration

**Backend (Express.js):**
- OpenAI GPT-4 Vision API integration
- Environment variable management
- Health check endpoints

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

**"OpenAI API key not configured"**
- Check your `.env` file or environment variables
- Verify the key is valid and has credits

**"Failed to connect to Mastodon"**
- Verify instance URL (include https://)
- Check access token permissions
- Test with a simple status post first

**"No location data found"**
- Image may not contain GPS EXIF data
- Try with photos taken on mobile devices
- Some image editors strip EXIF data

**"EXIF library not available"**
- Check browser compatibility
- Ensure JavaScript is enabled
- Try refreshing the page

### Debug Mode

Enable debug logging:
```bash
DEBUG=caption-generator:* npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **OpenAI GPT-4 Vision**: AI-powered image analysis
- **exifr**: EXIF data extraction library
- **Nominatim**: Reverse geocoding service
- **Mastodon**: Decentralized social media platform

---

**Built with ❤️ for the content creator community**