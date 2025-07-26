# Instagram Caption Generator - Firefox Extension

## Installation

1. **Open Firefox Developer Mode**
   - Go to `about:debugging` in Firefox
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on..."

2. **Load the Extension**
   - Navigate to the `extension` folder
   - Select `manifest.json`
   - The extension will be loaded temporarily

3. **Configure Settings (First Time)**
   - Click the extension icon in the toolbar
   - Click "⚙️ Settings" button
   - Enter your Caption Generator app URL (default: http://localhost:3000)
   - Click "Test Connection" to verify
   - Click "Save Settings"

4. **Make sure your Caption Generator app is running**
   - Start your app: `npm start`
   - The extension will connect to the URL you configured

## How to Use

1. **Generate a Caption**
   - Open your Caption Generator app (http://localhost:3000)
   - Upload an image and generate a caption
   - The caption is automatically stored for the extension

2. **Post to Instagram**
   - Go to Instagram.com
   - Click "Create" or the + button
   - Upload your image
   - You'll see a "📝 Fill Caption" button
   - Click it to auto-fill your generated caption

3. **Alternative Method**
   - Click the extension icon in Firefox toolbar
   - Use the popup to check status and fill captions

## Features

- ✅ Auto-detects Instagram create pages
- ✅ One-click caption filling
- ✅ Works with the latest Instagram web interface
- ✅ Configurable app URL (localhost, network, or remote)
- ✅ Connection testing and status display
- ✅ Settings page for easy configuration
- ✅ Clean, unobtrusive UI

## Troubleshooting

**Extension not working?**
- Make sure your Caption Generator app is running on localhost:3000
- Check that you're on Instagram's create page
- Try refreshing the Instagram page

**Button not showing?**
- Instagram sometimes changes their interface
- Try refreshing the page
- Make sure you're on the create/post page, not just instagram.com

**Can't connect to app?**
- Verify your app is running: `npm start`
- Check http://localhost:3000/api/health in your browser
- Make sure no firewall is blocking localhost connections

## Development

This extension uses:
- Manifest V2 (for Firefox compatibility)
- Content scripts for Instagram page interaction
- Background scripts for app communication
- Local storage for preferences

The extension communicates with your local Caption Generator app via REST API calls to localhost:3000.