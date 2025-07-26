// Instagram Caption Generator - Background Script

// Handle extension icon click
browser.browserAction.onClicked.addListener(async (tab) => {
    // Check if we're on Instagram
    if (tab.url.includes('instagram.com')) {
        // If on Instagram, try to fill caption
        browser.tabs.executeScript(tab.id, {
            code: `
                if (typeof fillCaption === 'function') {
                    fillCaption();
                } else {
                    alert('Please navigate to Instagram create page first');
                }
            `
        });
    } else {
        // Open caption generator app
        const appUrl = await getAppUrl();
        browser.tabs.create({
            url: appUrl
        });
    }
});

// Handle messages from content script
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'openCaptionGenerator') {
        const appUrl = await getAppUrl();
        browser.tabs.create({
            url: appUrl
        });
    }
    
    if (request.action === 'checkAppStatus') {
        const appUrl = await getAppUrl();
        // Try to ping the app
        fetch(`${appUrl}/api/health`)
            .then(response => response.json())
            .then(data => sendResponse({ status: 'online', data }))
            .catch(error => sendResponse({ status: 'offline', error: error.message }));
        
        return true; // Indicates we will send a response asynchronously
    }
});

// Helper function to get app URL
async function getAppUrl() {
    try {
        const result = await browser.storage.sync.get(['appUrl']);
        return result.appUrl || 'http://localhost:3000';
    } catch (error) {
        console.error('Error getting app URL:', error);
        return 'http://localhost:3000';
    }
}