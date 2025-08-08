# Gemini Project Brief: AI Caption Studio

This document provides a comprehensive overview of the AI Caption Studio project to guide development and ensure consistency.

## 1. Project Overview

**Name:** AI Caption Studio
**Description:** An AI-powered web application that generates social media captions, hashtags, and alt text from uploaded images. It features automatic EXIF data extraction for location and camera details, and allows for direct posting to Mastodon.
**Keywords:** `social-media`, `captions`, `ai`, `openai`, `hashtags`, `netlify`, `neon`

## 2. Core Technologies & Frameworks

- **Backend:** Node.js with Express.js. It also uses Hono for Cloudflare Workers.
- **Frontend:** Vanilla JavaScript, HTML, and CSS.
- **Database:** Supports both D1 (Cloudflare) and Neon (via `@neondatabase/serverless`). The choice is determined by the `CLOUDFLARE` environment variable.
- **Deployment:** Configured for both Docker and Cloudflare Workers (via `wrangler`).
- **Package Manager:** `npm`

## 3. Project Structure

- `server.js`: The main Express.js application entry point.
- `worker.js`: The entry point for Cloudflare Workers, using Hono.
- `database.js`: The primary database module.
- `database-d1.js`: D1-specific database logic.
- `database-sqlite.js`: SQLite-specific database logic.
- `public/`: Contains the static frontend assets (HTML, CSS, JS).
- `extension/`: A browser extension that integrates with the application.
- `wrangler.toml`: Configuration for Cloudflare Workers.
- `Dockerfile`: For building and running the application in a Docker container.
- `package.json`: Defines project dependencies and scripts.

## 4. Key Features & Functionality

- **AI Content Generation:** Uses OpenAI's GPT-4 Vision API to generate captions, hashtags, and alt text.
- **EXIF Data Extraction:** Automatically extracts metadata from images, including GPS coordinates and camera information.
- **Mastodon Integration:** Allows users to post generated content directly to their Mastodon accounts.
- **User Authentication:** Implements a magic link authentication system using JWTs.
- **Admin Dashboard:** Provides administrative features for user and tier management.
- **Rate Limiting:** A simple in-memory rate limiter for OpenAI API calls.
- **Caching:** An in-memory cache for API responses.

## 5. Development & Deployment

### Local Development

1.  **Install dependencies:** `npm install`
2.  **Configure environment variables:** Create a `.env` file (see `README.md` for details).
3.  **Start the development server:** `npm run dev`
4.  **Start the Cloudflare dev server:** `npm run cf-dev`

### Deployment

- **Cloudflare Workers:** `npm run deploy`
- **Docker:** Build and run the Docker image as described in the `README.md`.

## 6. Important Commands

- `npm start`: Starts the production server.
- `npm run dev`: Starts the development server with `nodemon`.
- `npm run deploy`: Deploys the application to Cloudflare Workers.
- `npm run cf-dev`: Starts the Cloudflare Workers development server.

## 7. Code Style & Conventions

- The project uses a mix of modern JavaScript features, including `async/await` and ES modules.
- The code is generally well-structured and commented.
- Adhere to the existing code style and conventions when making changes.
