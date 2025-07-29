class CaptionGenerator {
    constructor() {
        this.currentFile = null;
        this.currentStyle = 'creative';
        this.currentUser = null;
        this.authToken = null;
        this.isMastodonConfigured = false;
        this.initializeElements();
        this.bindEvents();
        this.checkAuthentication();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.previewImage = document.getElementById('previewImage');
        this.uploadPlaceholder = document.getElementById('uploadPlaceholder');
        this.generateBtn = document.getElementById('generateBtn');
        this.styleButtons = document.querySelectorAll('.style-btn');
        this.resultsPlaceholder = document.getElementById('resultsPlaceholder');
        this.resultsContent = document.getElementById('resultsContent');
        this.captionText = document.getElementById('captionText');
        this.hashtagsText = document.getElementById('hashtagsText');
        this.charCount = document.getElementById('charCount');
        this.hashtagCount = document.getElementById('hashtagCount');
        this.copyCaptionBtn = document.getElementById('copyCaptionBtn');
        this.copyHashtagsBtn = document.getElementById('copyHashtagsBtn');
        this.alttextText = document.getElementById('alttextText');
        this.alttextCount = document.getElementById('alttextCount');
        this.notification = document.getElementById('notification');
        
        // Weather info card elements
        this.weatherInfoCard = document.getElementById('weatherInfoCard');
        this.weatherTimestamp = document.getElementById('weatherTimestamp');
        this.weatherTemp = document.getElementById('weatherTemp');
        this.weatherDesc = document.getElementById('weatherDesc');
        this.weatherHumidity = document.getElementById('weatherHumidity');
        this.weatherWind = document.getElementById('weatherWind');
        
        // Context inputs
        this.cameraInput = document.getElementById('cameraInput');
        this.eventInput = document.getElementById('eventInput');
        this.locationInput = document.getElementById('locationInput');
        this.moodInput = document.getElementById('moodInput');
        this.subjectInput = document.getElementById('subjectInput');
        this.customInput = document.getElementById('customInput');
        this.weatherToggle = document.getElementById('weatherToggle');
        this.clearContextBtn = document.getElementById('clearContextBtn');
        this.saveContextBtn = document.getElementById('saveContextBtn');
        
        // Template controls
        this.templateSelect = document.getElementById('templateSelect');
        this.loadTemplateBtn = document.getElementById('loadTemplateBtn');
        this.deleteTemplateBtn = document.getElementById('deleteTemplateBtn');
        
        // Mastodon controls
        this.mastodonInstance = document.getElementById('mastodonInstance');
        this.mastodonToken = document.getElementById('mastodonToken');
        this.testMastodonBtn = document.getElementById('testMastodonBtn');
        this.postMastodonBtn = document.getElementById('postMastodonBtn');
        this.mastodonStatus = document.getElementById('mastodonStatus');
        this.postPreview = document.getElementById('postPreview');
        this.mastodonCard = document.querySelector('.mastodon-card');
        
    }

    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.generateBtn.addEventListener('click', this.generateCaption.bind(this));
        this.copyCaptionBtn.addEventListener('click', () => this.copyToClipboard('caption'));
        this.copyHashtagsBtn.addEventListener('click', () => this.copyToClipboard('hashtags'));

        this.styleButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectStyle(btn.dataset.style));
        });

        // Context button events
        this.clearContextBtn.addEventListener('click', this.clearContext.bind(this));
        this.saveContextBtn.addEventListener('click', this.saveContextTemplate.bind(this));
        
        // Template events
        this.templateSelect.addEventListener('change', this.onTemplateSelectChange.bind(this));
        this.loadTemplateBtn.addEventListener('click', this.loadSelectedTemplate.bind(this));
        this.deleteTemplateBtn.addEventListener('click', this.deleteSelectedTemplate.bind(this));
        
        // Mastodon events
        this.testMastodonBtn.addEventListener('click', this.testMastodonConnection.bind(this));
        this.postMastodonBtn.addEventListener('click', this.postToMastodon.bind(this));
        
    }

    async checkServerHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (!data.apiKeyConfigured) {
                this.showNotification('OpenAI API key not configured in .env file', 'error');
            }
        } catch (error) {
            this.showNotification('Server connection failed. Make sure the server is running.', 'error');
        }
    }

    async loadMastodonConfig() {
        try {
            const response = await fetch('/api/settings/mastodon', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (response.ok) {
                const settings = await response.json();
                
                if (settings.instance && settings.token) {
                    this.mastodonInstance.value = settings.instance;
                    this.mastodonToken.value = settings.token;
                    this.updateMastodonStatus('Connected ✓', 'success');
                    this.postMastodonBtn.disabled = false;
                    this.isMastodonConfigured = true;
                } else {
                    this.updateMastodonStatus('Not configured', 'error');
                    this.postMastodonBtn.disabled = true;
                    this.isMastodonConfigured = false;
                }
            } else {
                this.updateMastodonStatus('Not configured', 'error');
                this.postMastodonBtn.disabled = true;
                this.isMastodonConfigured = false;
            }
            
            // Update visibility of Mastodon preview card
            this.updateMastodonCardVisibility();
        } catch (error) {
            this.updateMastodonStatus('Failed to load settings', 'error');
            this.postMastodonBtn.disabled = true;
            this.isMastodonConfigured = false;
            this.updateMastodonCardVisibility();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!this.validateFile(file)) {
            return;
        }

        this.currentFile = file;
        this.displayPreview(file);
        
        // Clear context fields before checking new image
        this.locationInput.value = '';
        this.cameraInput.value = '';
        
        this.extractMetadataFromEXIF(file);
        this.generateBtn.disabled = false;
        this.hideResults();
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Please upload a valid image file (JPG, PNG, or GIF)', 'error');
            return false;
        }

        if (file.size > maxSize) {
            this.showNotification('File size must be less than 10MB', 'error');
            return false;
        }

        return true;
    }

    displayPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.previewImage.style.display = 'block';
            this.uploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async extractMetadataFromEXIF(file) {
        try {
            // Check if exifr is available
            if (typeof exifr === 'undefined') {
                this.showNotification('⚠️ EXIF library not available', 'error');
                return;
            }

            // Show that we're trying to extract metadata
            this.showNotification('🔍 Checking for image metadata...', 'info');

            
            // Extract both GPS and camera data
            const [gpsData, allExifData] = await Promise.all([
                exifr.gps(file).catch(() => null),
                exifr.parse(file).catch(err => {
                    return null;
                })
            ]);
            
            
            let hasData = false;
            
            // Handle GPS/Location data
            if (gpsData && gpsData.latitude && gpsData.longitude) {
                
                // Show that we're reverse geocoding
                this.showNotification('🌍 Looking up location name...', 'info');
                
                // Get user's zoom preference
                let userZoomLevel = 18; // Default to highest precision
                try {
                    const authToken = localStorage.getItem('auth_token');
                    if (authToken) {
                        const settingsResponse = await fetch('/api/settings', {
                            headers: {
                                'Authorization': `Bearer ${authToken}`
                            }
                        });
                        if (settingsResponse.ok) {
                            const settings = await settingsResponse.json();
                            userZoomLevel = settings.locationZoom || 18;
                        }
                    }
                } catch (error) {
                    console.log('Could not load user zoom preference, using default');
                }
                
                // Get location name from coordinates
                const locationName = await this.reverseGeocode(gpsData.latitude, gpsData.longitude, userZoomLevel);
                
                if (locationName) {
                    this.locationInput.value = locationName;
                    hasData = true;
                } else {
                    // Fallback to showing coordinates
                    this.locationInput.value = `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}`;
                    hasData = true;
                }
            }
            
            // Handle Camera data
            if (allExifData && (allExifData.Make || allExifData.Model)) {
                const cameraParts = [];
                
                if (allExifData.Make) {
                    cameraParts.push(allExifData.Make);
                }
                
                if (allExifData.Model && (!allExifData.Make || !allExifData.Model.includes(allExifData.Make))) {
                    cameraParts.push(allExifData.Model);
                }
                
                if (allExifData.LensModel) {
                    cameraParts.push(`(${allExifData.LensModel})`);
                }
                
                const cameraInfo = cameraParts.join(' ').trim();
                if (cameraInfo) {
                    this.cameraInput.value = cameraInfo;
                    hasData = true;
                }
            } else {
            }
            
            // Show appropriate notification
            if (hasData) {
                const detectedItems = [];
                if (this.locationInput.value) detectedItems.push('location');
                if (this.cameraInput.value) detectedItems.push('camera');
                
                this.showNotification(`📸 Detected: ${detectedItems.join(' & ')}`, 'success');
            } else {
                this.showNotification('📷 No metadata found in this image', 'info');
            }
            
        } catch (error) {
            this.showNotification('⚠️ Could not read image metadata', 'error');
        }
    }

    async reverseGeocode(latitude, longitude, zoomLevel = 18) {
        try {
            // Using a free geocoding service (Nominatim from OpenStreetMap)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=${zoomLevel}&addressdetails=1&_=${Date.now()}`,
                {
                    headers: {
                        'User-Agent': 'AI Caption Studio'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.address) {
                    const parts = [];
                    
                    // Add building/house number and street
                    if (data.address.house_number && data.address.road) {
                        parts.push(data.address.house_number + ' ' + data.address.road);
                    } else if (data.address.road) {
                        parts.push(data.address.road);
                    }
                    
                    // Add neighbourhood/suburb/district
                    if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                    else if (data.address.suburb) parts.push(data.address.suburb);
                    else if (data.address.quarter) parts.push(data.address.quarter);
                    else if (data.address.district) parts.push(data.address.district);
                    
                    // Add city/town/village
                    if (data.address.city) parts.push(data.address.city);
                    else if (data.address.town) parts.push(data.address.town);
                    else if (data.address.village) parts.push(data.address.village);
                    else if (data.address.municipality) parts.push(data.address.municipality);
                    
                    // Add state/province
                    if (data.address.state) parts.push(data.address.state);
                    else if (data.address.province) parts.push(data.address.province);
                    
                    // Add country
                    if (data.address.country) parts.push(data.address.country);
                    
                    return parts.join(', ') || data.display_name;
                }
            }
        } catch (error) {
        }
        
        return null;
    }

    selectStyle(style) {
        this.currentStyle = style;
        this.styleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === style);
        });
    }

    async generateCaption() {
        if (!this.currentFile) {
            return;
        }

        this.setLoadingState(true);

        try {
            const base64Image = await this.fileToBase64(this.currentFile);
            const prompt = this.buildPrompt(this.currentStyle);
            
            const responseData = await this.callLocalAPI(prompt, base64Image);
            this.displayResults(responseData);
            this.showNotification('Caption generated successfully!');
        } catch (error) {
            this.showNotification('Failed to generate caption. Please try again.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    buildPrompt(style) {
        const styleDescriptions = {
            creative: 'artistic and expressive language with creative metaphors',
            professional: 'business-appropriate and polished tone',
            casual: 'friendly, conversational, and relatable',
            trendy: 'current slang, viral language, and trending expressions',
            inspirational: 'motivational, uplifting, and encouraging',
            edgy: 'short, dry, clever, and a little dark. Keep it deadpan, sarcastic, or emotionally detached—but still tied to the image. No fluff, no emojis, just vibes'
        };

        const context = this.getContextInfo();
        const contextString = context.length > 0 ? `\n\nAdditional Context:\n${context.join('\n')}` : '';

        return `Analyze this image for social media posting. Generate:

1. A ${style} caption that:
   - Captures the main subject/scene
   - Uses ${styleDescriptions[style]}
   - Is 1-3 sentences
   - Includes relevant emojis
   - Feels authentic and natural (NO forced questions or call-to-actions)
   - Sounds like something a real person would write
   ${context.length > 0 ? '- Incorporates the provided context naturally' : ''}

2. 10-15 hashtags that:
   - Mix popular (#photography, #instagood) and niche tags
   - Are relevant to image content
   - Include location-based tags if applicable
   - Avoid banned or shadowbanned hashtags
   - Range from broad to specific
   ${context.length > 0 ? '- Include relevant hashtags based on the context provided' : ''}

3. Alt text for accessibility (1-2 sentences):
   - Describe what's actually visible in the image
   - Include important visual details for screen readers
   - Focus on objective description, not interpretation
   - Keep it concise but descriptive
${contextString}

Format your response as:
CAPTION: [your caption here]
HASHTAGS: [hashtags separated by spaces]
ALT_TEXT: [descriptive alt text for accessibility]`;
    }

    getContextInfo() {
        const context = [];
        
        if (this.cameraInput.value.trim()) {
            context.push(`Camera/Gear: ${this.cameraInput.value.trim()}`);
        }
        if (this.eventInput.value.trim()) {
            context.push(`Event/Occasion: ${this.eventInput.value.trim()}`);
        }
        if (this.locationInput.value.trim()) {
            context.push(`Location: ${this.locationInput.value.trim()}`);
        }
        if (this.moodInput.value.trim()) {
            context.push(`Mood/Vibe: ${this.moodInput.value.trim()}`);
        }
        if (this.subjectInput.value.trim()) {
            context.push(`Subject/Focus: ${this.subjectInput.value.trim()}`);
        }
        if (this.customInput.value.trim()) {
            context.push(`Custom Notes: ${this.customInput.value.trim()}`);
        }

        return context;
    }

    clearContext() {
        this.cameraInput.value = '';
        this.eventInput.value = '';
        this.locationInput.value = '';
        this.moodInput.value = '';
        this.subjectInput.value = '';
        this.customInput.value = '';
        this.weatherToggle.checked = false;
        this.showNotification('Context cleared');
    }

    saveContextTemplate() {
        const template = {
            camera: this.cameraInput.value.trim(),
            event: this.eventInput.value.trim(),
            location: this.locationInput.value.trim(),
            mood: this.moodInput.value.trim(),
            subject: this.subjectInput.value.trim(),
            custom: this.customInput.value.trim(),
            includeWeather: this.weatherToggle.checked
        };

        const templateName = prompt('Enter a name for this context template:');
        if (templateName) {
            const savedTemplates = JSON.parse(localStorage.getItem('contextTemplates') || '{}');
            savedTemplates[templateName] = template;
            localStorage.setItem('contextTemplates', JSON.stringify(savedTemplates));
            this.showNotification(`Template "${templateName}" saved!`);
            this.loadTemplateList(); // Refresh the dropdown
        }
    }

    loadTemplateList() {
        const savedTemplates = JSON.parse(localStorage.getItem('contextTemplates') || '{}');
        const templateNames = Object.keys(savedTemplates);
        
        // Clear existing options except the first one
        this.templateSelect.innerHTML = '<option value="">Choose a saved template...</option>';
        
        // Add template options
        templateNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.templateSelect.appendChild(option);
        });
        
        // Show/hide template section based on whether there are templates
        const templateSection = document.querySelector('.template-section');
        if (templateNames.length === 0) {
            templateSection.style.display = 'none';
        } else {
            templateSection.style.display = 'block';
        }
    }

    onTemplateSelectChange() {
        const selectedTemplate = this.templateSelect.value;
        const hasSelection = selectedTemplate !== '';
        
        this.loadTemplateBtn.disabled = !hasSelection;
        this.deleteTemplateBtn.disabled = !hasSelection;
    }

    loadSelectedTemplate() {
        const templateName = this.templateSelect.value;
        if (!templateName) return;
        
        const savedTemplates = JSON.parse(localStorage.getItem('contextTemplates') || '{}');
        const template = savedTemplates[templateName];
        
        if (template) {
            this.cameraInput.value = template.camera || '';
            this.eventInput.value = template.event || '';
            this.locationInput.value = template.location || '';
            this.moodInput.value = template.mood || '';
            this.subjectInput.value = template.subject || '';
            this.customInput.value = template.custom || '';
            this.weatherToggle.checked = template.includeWeather || false;
            
            this.showNotification(`Template "${templateName}" loaded!`);
        }
    }

    deleteSelectedTemplate() {
        const templateName = this.templateSelect.value;
        if (!templateName) return;
        
        if (confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
            const savedTemplates = JSON.parse(localStorage.getItem('contextTemplates') || '{}');
            delete savedTemplates[templateName];
            localStorage.setItem('contextTemplates', JSON.stringify(savedTemplates));
            
            this.showNotification(`Template "${templateName}" deleted!`);
            this.loadTemplateList(); // Refresh the dropdown
            this.onTemplateSelectChange(); // Update button states
        }
    }

    async callLocalAPI(prompt, base64Image) {
        const response = await fetch('/api/generate-caption', {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                prompt: prompt,
                base64Image: base64Image,
                includeWeather: this.weatherToggle.checked,
                style: this.currentStyle
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server request failed: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }

    displayResults(data) {
        // Handle both old string format and new object format
        const responseText = typeof data === 'string' ? data : data.content;
        
        const captionMatch = responseText.match(/CAPTION:\s*(.*?)(?=HASHTAGS:|ALT_TEXT:|$)/s);
        const hashtagsMatch = responseText.match(/HASHTAGS:\s*(.*?)(?=ALT_TEXT:|$)/s);
        const altTextMatch = responseText.match(/ALT_TEXT:\s*(.*?)$/s);

        const caption = captionMatch ? captionMatch[1].trim() : 'Caption could not be generated';
        const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : '';
        const altText = altTextMatch ? altTextMatch[1].trim() : '';

        this.captionText.textContent = caption;
        this.hashtagsText.textContent = hashtags;
        this.alttextText.textContent = altText || 'No alt text generated';
        
        // Store alt text for Mastodon posting
        this.currentAltText = altText;
        
        this.charCount.textContent = `${caption.length} characters`;
        const hashtagArray = hashtags.split(' ').filter(tag => tag.startsWith('#'));
        this.hashtagCount.textContent = `${hashtagArray.length} tags`;
        this.alttextCount.textContent = altText ? `${altText.length} chars` : 'None';
        
        // Display weather data if available
        this.displayWeatherInfo(data);

        this.resultsPlaceholder.style.display = 'none';
        this.resultsContent.style.display = 'block';
        
        // Store caption for browser extension
        this.storeCaptionForExtension(caption, hashtags);
        
        // Auto-update Mastodon preview when caption is generated (only if configured)
        if (this.isMastodonConfigured) {
            this.updateMastodonPreview();
        }
    }

    // Authentication methods
    async checkAuthentication() {
        try {
            this.authToken = localStorage.getItem('auth_token');
            
            if (!this.authToken) {
                this.redirectToLogin();
                return;
            }

            // Verify token with server
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.onAuthenticationSuccess();
            } else {
                // Token invalid, clear and redirect
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_email');
                this.redirectToLogin();
            }
        } catch (error) {
            this.redirectToLogin();
        }
    }

    onAuthenticationSuccess() {
        // Initialize the app components after successful auth
        this.checkServerHealth();
        this.loadTemplateList();
        this.loadMastodonConfig();
        this.updateUserInterface();
    }

    updateUserInterface() {
        // Show user info in the interface
        if (this.currentUser) {
            // You can add a user info display here
            
            // Add logout button to the interface if needed
            this.addUserControls();
        }
    }

    getUserUsageDisplay() {
        if (!this.currentUser.tierName) {
            return '';
        }
        
        if (this.currentUser.dailyLimit === -1) {
            return '<div style="color: #28a745;">🚀 Unlimited</div>';
        }
        
        const used = this.currentUser.usageToday || 0;
        const remaining = this.currentUser.remaining || 0;
        const limit = this.currentUser.dailyLimit;
        const percentage = (used / limit) * 100;
        
        let color = '#28a745'; // Green
        if (percentage > 80) color = '#dc3545'; // Red
        else if (percentage > 60) color = '#ffc107'; // Yellow
        
        return `<div style="color: ${color};">💎 ${this.currentUser.tierName}: ${used}/${limit}</div>`;
    }

    addUserControls() {
        // Add user controls to header if not already present
        const header = document.querySelector('.header');
        if (header && !document.getElementById('userControls')) {
            const userControls = document.createElement('div');
            userControls.id = 'userControls';
            userControls.style.cssText = `
                position: absolute; 
                top: 10px; 
                right: 15px; 
                color: white; 
                display: flex; 
                align-items: flex-start; 
                gap: 6px;
                flex-direction: column;
                max-width: 250px;
                z-index: 10;
            `;
            
            // Build admin menu if user is admin
            const adminMenu = this.currentUser.isAdmin ? `
                <div class="admin-menu" style="position: relative; order: 1;">
                    <button id="adminMenuBtn" style="
                        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); 
                        color: #333; 
                        border: none; 
                        padding: 6px 12px; 
                        border-radius: 6px; 
                        cursor: pointer; 
                        font-weight: 600;
                        font-size: 12px;
                        transition: all 0.2s ease;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        👑 Admin
                    </button>
                    <div id="adminDropdown" style="
                        display: none; 
                        position: absolute; 
                        top: calc(100% + 8px); 
                        right: 0; 
                        background: white; 
                        border-radius: 8px; 
                        box-shadow: 0 8px 24px rgba(0,0,0,0.15); 
                        min-width: 160px; 
                        z-index: 1000;
                        overflow: hidden;
                        border: 1px solid #e1e5e9;
                    ">
                        <a href="/admin" style="
                            display: block; 
                            padding: 10px 14px; 
                            color: #333; 
                            text-decoration: none; 
                            border-bottom: 1px solid #f0f0f0;
                            font-size: 13px;
                            transition: background-color 0.2s;
                        " onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                            📊 Analytics
                        </a>
                        <a href="/admin/users" style="
                            display: block; 
                            padding: 10px 14px; 
                            color: #333; 
                            text-decoration: none; 
                            border-bottom: 1px solid #f0f0f0;
                            font-size: 13px;
                            transition: background-color 0.2s;
                        " onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                            👥 User Management
                        </a>
                        <a href="/admin/tiers" style="
                            display: block; 
                            padding: 10px 14px; 
                            color: #333; 
                            text-decoration: none;
                            font-size: 13px;
                            transition: background-color 0.2s;
                        " onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                            🏷️ Tier Management
                        </a>
                    </div>
                </div>
            ` : '';
            
            userControls.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    ${adminMenu}
                    <a href="/settings" style="
                        background: rgba(255,255,255,0.2); 
                        color: white; 
                        border: none; 
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-size: 11px;
                        text-decoration: none;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.3)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.2)'">
                        ⚙️ Settings
                    </a>
                    <button id="logoutBtn" style="
                        background: rgba(255,255,255,0.2); 
                        color: white; 
                        border: none; 
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-size: 11px;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.3)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.2)'">
                        Logout
                    </button>
                </div>
                <div style="font-size: 11px; opacity: 0.9; text-align: right;">
                    <div>👋 ${this.currentUser.email}</div>
                    ${this.getUserUsageDisplay()}
                </div>
            `;
            
            header.style.position = 'relative';
            header.appendChild(userControls);
            
            // Add logout functionality
            document.getElementById('logoutBtn').addEventListener('click', this.logout.bind(this));
            
            // Add admin menu functionality if admin
            if (this.currentUser.isAdmin) {
                const adminMenuBtn = document.getElementById('adminMenuBtn');
                const adminDropdown = document.getElementById('adminDropdown');
                
                adminMenuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    adminDropdown.style.display = adminDropdown.style.display === 'none' ? 'block' : 'none';
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    adminDropdown.style.display = 'none';
                });
                
                // Prevent dropdown from closing when clicking inside it
                adminDropdown.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // Add hover effect to admin button
                adminMenuBtn.addEventListener('mouseover', () => {
                    adminMenuBtn.style.transform = 'translateY(-1px)';
                    adminMenuBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                });
                
                adminMenuBtn.addEventListener('mouseout', () => {
                    adminMenuBtn.style.transform = 'translateY(0)';
                    adminMenuBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                });
            }
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
        } catch (error) {
        } finally {
            // Clear local storage and redirect regardless of server response
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            window.location.href = '/auth';
        }
    }

    redirectToLogin() {
        window.location.href = '/auth';
    }

    // Update API calls to include authentication headers
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }

    displayWeatherInfo(data) {
        // Only show weather card if weather data is available
        if (data && typeof data === 'object' && data.weatherData) {
            const weatherData = data.weatherData;
            const photoDateTime = data.photoDateTime;
            const locationName = data.locationName;
            
            // Parse weather data (format: "30°C, scattered clouds, 65% humidity, 8 km/h wind")
            const weatherParts = weatherData.split(', ');
            let temperature = '--°C';
            let description = '--';
            let humidity = '--%';
            let windSpeed = '-- km/h';
            
            // Extract temperature and description
            if (weatherParts.length >= 2) {
                temperature = weatherParts[0];
                description = weatherParts[1];
            }
            
            // Extract humidity and wind from remaining parts
            for (let i = 2; i < weatherParts.length; i++) {
                const part = weatherParts[i];
                if (part.includes('humidity')) {
                    humidity = part.replace(' humidity', '');
                } else if (part.includes('wind')) {
                    windSpeed = part.replace(' wind', '');
                }
            }
            
            // Update weather card content
            this.weatherTemp.textContent = temperature;
            this.weatherDesc.textContent = description;
            this.weatherHumidity.textContent = `💧 ${humidity}`;
            this.weatherWind.textContent = `💨 ${windSpeed}`;
            
            // Format photo date/time
            if (photoDateTime) {
                const date = new Date(photoDateTime);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                this.weatherTimestamp.textContent = formattedDate;
            } else {
                this.weatherTimestamp.textContent = 'Photo date & time';
            }
            
            // Add location if available
            if (locationName) {
                this.weatherTimestamp.textContent += ` • ${locationName}`;
            }
            
            // Show the weather card
            this.weatherInfoCard.style.display = 'block';
        } else {
            // Hide weather card if no weather data
            this.weatherInfoCard.style.display = 'none';
        }
    }

    hideResults() {
        this.resultsPlaceholder.style.display = 'block';
        this.resultsContent.style.display = 'none';
    }

    setLoadingState(loading) {
        const btnText = this.generateBtn.querySelector('.btn-text');
        let spinner = this.generateBtn.querySelector('.loading-spinner');
        
        
        // If spinner doesn't exist, create it
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.style.display = 'none';
            this.generateBtn.appendChild(spinner);
        }
        
        if (loading) {
            btnText.textContent = '🔄 Generating...';
            spinner.style.display = 'inline-block';
            this.generateBtn.disabled = true;
            this.generateBtn.classList.add('loading');
        } else {
            btnText.textContent = 'Generate Caption';
            spinner.style.display = 'none';
            this.generateBtn.disabled = false;
            this.generateBtn.classList.remove('loading');
        }
    }

    // Test function to debug spinner
    testSpinner() {
        this.setLoadingState(true);
        setTimeout(() => {
            this.setLoadingState(false);
        }, 3000);
    }

    async copyToClipboard(type) {
        const text = type === 'caption' ? this.captionText.textContent : this.hashtagsText.textContent;
        const btn = type === 'caption' ? this.copyCaptionBtn : this.copyHashtagsBtn;
        
        try {
            await navigator.clipboard.writeText(text);
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '✅ Copied!';
            btn.classList.add('copied');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('copied');
            }, 2000);
            
            this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`);
        } catch (error) {
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }

    showNotification(message, type = 'success') {
        const notificationText = this.notification.querySelector('.notification-text');
        notificationText.textContent = message;
        
        this.notification.className = `notification ${type}`;
        this.notification.style.display = 'block';
        
        setTimeout(() => {
            this.notification.style.display = 'none';
        }, 4000);
    }

    // Mastodon Integration Methods
    
    async testMastodonConnection() {
        const instance = this.mastodonInstance.value.trim();
        const token = this.mastodonToken.value.trim();

        if (!instance || !token) {
            this.updateMastodonStatus('Missing instance or token', 'error');
            this.showNotification('Please enter both instance URL and access token', 'error');
            return;
        }

        this.updateMastodonStatus('Testing connection...', 'posting');

        try {
            const response = await fetch(`${instance}/api/v1/accounts/verify_credentials`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const account = await response.json();
                this.updateMastodonStatus('Connected ✓', 'success');
                this.showNotification(`🐘 Connected to @${account.username}`, 'success');
                this.postMastodonBtn.disabled = false;
                this.isMastodonConfigured = true;
                this.updateMastodonCardVisibility();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.updateMastodonStatus('Connection failed', 'error');
            this.showNotification('❌ Failed to connect to Mastodon. Check your instance URL and token.', 'error');
            this.postMastodonBtn.disabled = true;
            this.isMastodonConfigured = false;
            this.updateMastodonCardVisibility();
        }
    }

    updateMastodonStatus(message, type = 'success') {
        this.mastodonStatus.textContent = message;
        this.mastodonStatus.className = `mastodon-status ${type}`;
    }

    updateMastodonCardVisibility() {
        if (this.mastodonCard) {
            this.mastodonCard.style.display = this.isMastodonConfigured ? 'block' : 'none';
        }
    }

    updateMastodonPreview() {
        const caption = this.captionText.textContent || '';
        const hashtags = this.hashtagsText.textContent || '';
        
        if (!caption && !hashtags) {
            this.postPreview.innerHTML = '<p><em>Generate a caption first to see the preview</em></p>';
            return;
        }

        const fullPost = `${caption}\n\n${hashtags}`.trim();
        this.postPreview.innerHTML = `<p>${fullPost.replace(/\n/g, '<br>')}</p>`;
    }

    async postToMastodon() {
        const instance = this.mastodonInstance.value.trim();
        const token = this.mastodonToken.value.trim();

        if (!instance || !token) {
            this.showNotification('Please configure Mastodon settings first', 'error');
            return;
        }

        if (!this.currentFile) {
            this.showNotification('No image selected', 'error');
            return;
        }

        const caption = this.captionText.textContent || '';
        const hashtags = this.hashtagsText.textContent || '';

        if (!caption && !hashtags) {
            this.showNotification('Generate a caption first', 'error');
            return;
        }

        this.setMastodonLoadingState(true);
        this.updateMastodonStatus('Posting to Mastodon...', 'posting');

        try {
            // Step 1: Upload media
            const mediaId = await this.uploadMediaToMastodon(instance, token, this.currentFile);
            
            // Step 2: Create status with media
            const status = `${caption}\n\n${hashtags}`.trim();
            const statusResponse = await this.createMastodonStatus(instance, token, status, mediaId);
            
            if (statusResponse.url) {
                this.updateMastodonStatus('Posted successfully ✓', 'success');
                this.showNotification(`🚀 Posted to Mastodon! View: ${statusResponse.url}`, 'success');
            }

        } catch (error) {
            this.updateMastodonStatus('Post failed', 'error');
            this.showNotification(`❌ Failed to post: ${error.message}`, 'error');
        } finally {
            this.setMastodonLoadingState(false);
        }
    }

    async uploadMediaToMastodon(instance, token, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Use generated alt text if available, otherwise fallback
        const altText = this.currentAltText || 'Image uploaded via AI Caption Studio';
        formData.append('description', altText);

        const response = await fetch(`${instance}/api/v1/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Media upload failed: ${response.statusText}`);
        }

        const media = await response.json();
        return media.id;
    }

    async createMastodonStatus(instance, token, status, mediaId) {
        const response = await fetch(`${instance}/api/v1/statuses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: status,
                media_ids: [mediaId],
                visibility: 'public'
            })
        });

        if (!response.ok) {
            throw new Error(`Status creation failed: ${response.statusText}`);
        }

        return await response.json();
    }

    setMastodonLoadingState(loading) {
        const btnText = this.postMastodonBtn.querySelector('.btn-text');
        const spinner = this.postMastodonBtn.querySelector('.loading-spinner');
        
        if (loading) {
            btnText.textContent = 'Posting...';
            spinner.style.display = 'inline-block';
            this.postMastodonBtn.disabled = true;
        } else {
            btnText.textContent = '🚀 Post to Mastodon';
            spinner.style.display = 'none';
            this.postMastodonBtn.disabled = false;
        }
    }

    // Store caption for browser extension use
    async storeCaptionForExtension(caption, hashtags) {
        try {
            const fullCaption = `${caption}\n\n${hashtags}`;
            await fetch('/api/store-caption', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ caption: fullCaption })
            });
        } catch (error) {
            // Don't show error to user as this is optional functionality
        }
    }

}

// Simple test to verify script loading
window.scriptLoaded = true;

// Simple test function that should always work
window.simpleTest = function() {
    alert('Script is loaded and working!');
};

// Global test function for debugging
window.testSpinner = function() {
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    let spinner = generateBtn.querySelector('.loading-spinner');
    
    
    // Create spinner if it doesn't exist
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.display = 'none';
        generateBtn.appendChild(spinner);
    }
    
    // Show loading state
    btnText.textContent = '🔄 Testing Spinner...';
    spinner.style.display = 'inline-block';
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    
    // Clear after 3 seconds
    setTimeout(() => {
        btnText.textContent = 'Generate Caption';
        spinner.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.classList.remove('loading');
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    const app = new CaptionGenerator();
});