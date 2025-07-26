// Instagram Caption Generator - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status');
    const openAppBtn = document.getElementById('openApp');
    const fillCaptionBtn = document.getElementById('fillCaption');
    const openSettingsBtn = document.getElementById('openSettings');
    
    // Check app status
    await checkAppStatus();
    
    // Check if current tab is Instagram
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    const isInstagram = currentTab.url.includes('instagram.com');
    const isCreatePage = currentTab.url.includes('/create/');
    
    // Update UI based on context
    if (isInstagram && isCreatePage) {
        fillCaptionBtn.textContent = '📝 Fill Caption Here';
        fillCaptionBtn.disabled = false;
    } else if (isInstagram) {
        fillCaptionBtn.textContent = '📝 Go to Create Page First';
        fillCaptionBtn.disabled = true;
    } else {
        fillCaptionBtn.textContent = '📝 Open Instagram First';
        fillCaptionBtn.disabled = true;
    }
    
    // Button events
    openAppBtn.addEventListener('click', async () => {
        const appUrl = await getAppUrl();
        browser.tabs.create({ url: appUrl });
        window.close();
    });
    
    fillCaptionBtn.addEventListener('click', async () => {
        if (isInstagram && isCreatePage) {
            try {
                await browser.tabs.executeScript(currentTab.id, {
                    code: 'if (typeof fillCaption === "function") fillCaption();'
                });
                window.close();
            } catch (error) {
                console.error('Error filling caption:', error);
                showStatus('Error filling caption', 'offline');
            }
        }
    });

    openSettingsBtn.addEventListener('click', () => {
        browser.runtime.openOptionsPage();
        window.close();
    });
    
    async function checkAppStatus() {
        try {
            showStatus('Checking app status...', 'loading');
            
            const appUrl = await getAppUrl();
            const response = await fetch(`${appUrl}/api/health`);
            if (response.ok) {
                const data = await response.json();
                showStatus('✅ Caption app is running', 'online');
                return true;
            } else {
                throw new Error('App not responding');
            }
        } catch (error) {
            showStatus('❌ Caption app is offline', 'offline');
            return false;
        }
    }

    async function getAppUrl() {
        try {
            const api = typeof browser !== 'undefined' ? browser : chrome;
            
            // Try sync storage first
            try {
                const result = await api.storage.sync.get(['appUrl']);
                return result.appUrl || 'http://localhost:3000';
            } catch (syncError) {
                console.warn('Sync storage failed, trying local storage:', syncError);
                // Fallback to local storage
                const result = await api.storage.local.get(['appUrl']);
                return result.appUrl || 'http://localhost:3000';
            }
        } catch (error) {
            console.error('Error getting app URL:', error);
            return 'http://localhost:3000';
        }
    }
    
    function showStatus(message, type) {
        statusDiv.className = `status ${type}`;
        statusDiv.innerHTML = type === 'loading' 
            ? '<div class="loading">Checking status...</div>'
            : message;
    }
});