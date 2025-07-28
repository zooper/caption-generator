#!/bin/bash

# AI Caption Studio - Cloudflare Secrets Setup Script
# This script sets the required secrets for the Cloudflare Pages deployment

echo "🔐 Setting up secrets for AI Caption Studio on Cloudflare..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Cloudflare Pages store ID
STORE_ID="56fac49c371c4f43bb2cc22efa4557da"

echo "🔍 Checking your Cloudflare Pages projects..."
echo "Available projects:"
wrangler pages project list

echo ""
echo "💡 If your project name is different, you can either:"
echo "   1. Use the store ID method (which we'll try)"
echo "   2. Or manually run: wrangler pages secret put SECRET_NAME --project-name=YOUR_ACTUAL_PROJECT_NAME"
echo ""

read -p "Do you want to continue with store ID method? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted. Please check your project name and run manually."
    exit 1
fi

echo ""
echo "📝 You'll be prompted to enter each secret value..."
echo ""

# Set SMTP_PASSWORD (Resend API key)
echo "1/3 Setting SMTP_PASSWORD (your Resend API key):"
echo "   Example: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
wrangler pages secret put SMTP_PASSWORD --store-id="$STORE_ID"

echo ""

# Set OPENAI_API_KEY
echo "2/3 Setting OPENAI_API_KEY (your OpenAI API key):"
echo "   Example: sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
wrangler pages secret put OPENAI_API_KEY --store-id="$STORE_ID"

echo ""

# Set JWT_SECRET
echo "3/3 Setting JWT_SECRET (a random secret string):"
echo "   You can generate one with: openssl rand -base64 32"
echo "   Or use any random string (at least 32 characters recommended)"
wrangler pages secret put JWT_SECRET --store-id="$STORE_ID"

echo ""
echo "✅ All secrets have been set!"
echo ""
echo "🚀 Your AI Caption Studio should now be fully functional on Cloudflare Pages."
echo "   Visit your Cloudflare Pages URL to test the application."
echo ""
echo "📋 To verify your secrets were set correctly:"
echo "   wrangler pages secret list --store-id=$STORE_ID"
echo ""
