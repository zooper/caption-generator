// Instagram Caption Generator - Options/Settings Script

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('settingsForm');
    const appUrlInput = document.getElementById('appUrl');
    const testButton = document.getElementById('testConnection');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    await loadSettings();

    // Form submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });

    // Test connection handler
    testButton.addEventListener('click', async () => {
        await testConnection();
    });

    // Get the correct storage API (Firefox vs Chrome compatibility)
    function getStorageAPI() {
        return typeof browser !== 'undefined' ? browser.storage : chrome.storage;
    }

    async function loadSettings() {
        try {
            const storage = getStorageAPI();
            const result = await storage.sync.get(['appUrl']);
            appUrlInput.value = result.appUrl || 'http://localhost:3000';
            console.log('Settings loaded:', result);
        } catch (error) {
            console.error('Error loading settings:', error);
            // Fallback to local storage if sync fails
            try {
                const storage = getStorageAPI();
                const result = await storage.local.get(['appUrl']);
                appUrlInput.value = result.appUrl || 'http://localhost:3000';
                console.log('Settings loaded from local storage:', result);
            } catch (localError) {
                console.error('Local storage also failed:', localError);
                appUrlInput.value = 'http://localhost:3000';
            }
        }
    }

    async function saveSettings() {
        try {
            const appUrl = appUrlInput.value.trim();
            
            // Validate URL
            if (!isValidUrl(appUrl)) {
                showStatus('Please enter a valid URL', 'error');
                return;
            }

            // Remove trailing slash
            const cleanUrl = appUrl.replace(/\/$/, '');

            console.log('Attempting to save URL:', cleanUrl);

            // Try sync storage first
            const storage = getStorageAPI();
            try {
                await storage.sync.set({ appUrl: cleanUrl });
                console.log('Saved to sync storage successfully');
                showStatus('✅ Settings saved successfully!', 'success');
            } catch (syncError) {
                console.warn('Sync storage failed, trying local storage:', syncError);
                // Fallback to local storage
                await storage.local.set({ appUrl: cleanUrl });
                console.log('Saved to local storage successfully');
                showStatus('✅ Settings saved successfully (local storage)!', 'success');
            }
            
            // Test connection after saving
            setTimeout(testConnection, 500);
            
        } catch (error) {
            console.error('Error saving settings:', error);
            showStatus(`❌ Error saving settings: ${error.message}`, 'error');
        }
    }

    async function testConnection() {
        const appUrl = appUrlInput.value.trim().replace(/\/$/, '');
        
        if (!isValidUrl(appUrl)) {
            showStatus('Please enter a valid URL first', 'error');
            return;
        }

        showStatus('🔍 Testing connection...', 'info');
        testButton.disabled = true;
        testButton.textContent = '⏳ Testing...';

        try {
            const response = await fetch(`${appUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                showStatus(`✅ Connection successful! App status: ${data.status}`, 'success');
            } else {
                showStatus(`❌ Connection failed: ${response.status} ${response.statusText}`, 'error');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                showStatus('❌ Cannot connect. Check if app is running and URL is correct.', 'error');
            } else {
                showStatus(`❌ Connection error: ${error.message}`, 'error');
            }
        } finally {
            testButton.disabled = false;
            testButton.textContent = '🔍 Test Connection';
        }
    }

    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }
});