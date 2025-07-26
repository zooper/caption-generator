# Instagram Caption Generator - Project Instructions

## Project Overview
Build a personal web application that uses AI to analyze uploaded images and generate Instagram-ready captions and hashtags. This is a single-user tool for personal use only.

## Core Functionality
- **Image Upload**: Drag & drop or click to upload images (JPG, PNG, GIF up to 10MB)
- **AI Analysis**: Use GPT-4 Vision API to analyze the uploaded image
- **Caption Generation**: Generate engaging, Instagram-style captions based on the image content
- **Hashtag Suggestions**: Provide relevant hashtags for better discoverability
- **Style Options**: Allow user to choose caption tone (Creative, Professional, Casual, Trendy, Inspirational)
- **Copy to Clipboard**: Easy copy functionality for both captions and hashtags

## Technical Requirements

### Frontend
- **Technology**: HTML, CSS, JavaScript (vanilla or with minimal framework)
- **Responsive Design**: Works on desktop, tablet, and mobile
- **File Upload**: Support drag & drop and click upload
- **Image Preview**: Show uploaded image before processing
- **Loading States**: Display progress while AI processes the image
- **Error Handling**: Handle upload errors and API failures gracefully

### AI Integration
- **Recommended API**: OpenAI GPT-4 Vision API
- **Alternative**: Anthropic Claude API (if preferred)
- **API Key Security**: Store API key securely (environment variables for local development)
- **Cost Consideration**: Optimize requests to minimize API costs

### User Interface Design
- **Color Scheme**: Instagram-inspired gradient header (#405de6 to #fd1d1d)
- **Layout**: Two-column grid (upload section | results section)
- **Typography**: Modern, clean fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI')
- **Interactive Elements**: Hover effects, smooth transitions, visual feedback
- **Mobile First**: Responsive design that works on all screen sizes

## Features Breakdown

### Image Upload Section
- Drag & drop area with visual feedback
- File type validation (images only)
- File size validation (max 10MB)
- Image preview after upload
- Replace image functionality

### Style Options
- Buttons for different caption styles:
  - ✨ Creative (artistic, expressive language)
  - 💼 Professional (business-appropriate tone)
  - 😄 Casual (friendly, conversational)
  - 🔥 Trendy (current slang, viral language)
  - 💭 Inspirational (motivational, uplifting)

### Results Display
- **Caption Card**: 
  - Generated caption text
  - Character count indicator
  - Copy to clipboard button
- **Hashtags Card**:
  - 10-15 relevant hashtags
  - Mix of popular and niche tags
  - Copy to clipboard button

### Additional Features
- Loading animation during AI processing
- Success/error notifications
- Pro tips for Instagram posting
- Recent uploads history (optional)

## AI Prompt Strategy

### Image Analysis Prompt Template
```
Analyze this image for Instagram posting. Generate:

1. A [STYLE] caption that:
   - Captures the main subject/scene
   - Matches [STYLE] tone
   - Is 1-3 sentences
   - Includes relevant emojis
   - Encourages engagement

2. 10-15 hashtags that:
   - Mix popular (#photography) and niche tags
   - Are relevant to image content
   - Include location-based tags if applicable
   - Avoid banned or shadowbanned hashtags

Style: [Creative/Professional/Casual/Trendy/Inspirational]
```

## Implementation Phases

### Phase 1: Basic Functionality (2-3 hours)
- Create HTML structure and basic CSS
- Implement file upload with preview
- Set up API integration
- Basic caption and hashtag generation
- Copy to clipboard functionality

### Phase 2: Enhanced UI/UX (1-2 hours)
- Add style selection buttons
- Implement loading states and animations
- Improve responsive design
- Add error handling and notifications

### Phase 3: Polish & Testing (1 hour)
- Fine-tune AI prompts for better results
- Test with various image types
- Optimize for mobile devices
- Add pro tips and user guidance

## Deployment Options
- **Local Development**: Run locally with API keys in environment variables
- **Simple Hosting**: Deploy to Netlify/Vercel with client-side API calls
- **Privacy-First**: Keep everything local, no data leaves your machine except API calls

## Security Considerations
- Never expose API keys in frontend code
- Use environment variables or secure server-side proxy
- No user data storage required
- API calls only contain image and style preference

## Cost Estimation
- **GPT-4 Vision API**: ~$0.01-0.03 per image analysis
- **Monthly cost**: Under $10 for typical personal use
- **Hosting**: Free tier options available (Netlify, Vercel)

## Success Metrics
- Image upload works smoothly
- AI generates relevant, engaging captions
- Hashtags are accurate and varied
- Copy functionality works reliably
- Mobile experience is seamless
- Total workflow time under 1 minute per image

## Future Enhancement Ideas
- Save favorite captions/hashtags
- A/B test different caption styles
- Integration with scheduling tools
- Bulk image processing
- Caption templates library
- Analytics on hashtag performance

## Files Structure
```
instagram-caption-generator/
├── index.html          # Main application page
├── styles.css          # Styling and responsive design
├── script.js           # JavaScript functionality
├── README.md           # Setup and usage instructions
└── .env.example        # Environment variables template
```

## Getting Started
1. Set up development environment
2. Obtain OpenAI API key
3. Create basic HTML structure from mockup
4. Implement file upload functionality
5. Integrate AI API for image analysis
6. Add style options and UI polish
7. Test with various images and refine prompts
8. Deploy for personal use

---

*This tool is designed for personal use only and respects Instagram's terms of service by generating content for manual posting rather than automated publishing.*
