console.log('Script loading...');

class CaptionGenerator {
    constructor() {
        console.log('CaptionGenerator constructor called');
        this.currentFile = null;
        this.currentStyle = 'creative';
        this.currentUser = null;
        this.authToken = null;
        this.isMastodonConfigured = false;
        this.currentGPS = null;
        this.templateCache = new Map();
        this.customPrompts = [];
        this.editingPromptId = null;
        this.initializeElements();
        this.bindEvents();
        this.checkAuthentication();
        console.log('CaptionGenerator constructor finished');
    }

    async loadTemplate(templateName) {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }

        try {
            const response = await fetch(`/templates/${templateName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load template: ${templateName}`);
            }
            const template = await response.text();
            this.templateCache.set(templateName, template);
            return template;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return `<!-- Template ${templateName} not found -->`;
        }
    }

    async renderTemplate(templateName, data = {}) {
        const template = await this.loadTemplate(templateName);
        let result = template;
        
        // Replace all template variables
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            result = result.replaceAll(placeholder, value || '');
        }
        
        return result;
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
        this.locationGranularity = document.getElementById('locationGranularity');
        console.log('Location granularity element found:', !!this.locationGranularity);
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
        
        // Custom Prompts Modal
        this.managePromptsBtn = document.getElementById('managePromptsBtn');
        this.customPromptsModal = document.getElementById('customPromptsModal');
        this.customPromptsList = document.getElementById('customPromptsList');
        this.createPromptBtn = document.getElementById('createPromptBtn');
        this.promptForm = document.getElementById('promptForm');
        this.customPromptForm = document.getElementById('customPromptForm');
        this.cancelPromptBtn = document.getElementById('cancelPromptBtn');
        this.styleButtons = document.getElementById('styleButtons');
        
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
        
        // Location granularity events
        if (this.locationGranularity) {
            console.log('Adding event listener to location granularity dropdown');
            this.locationGranularity.addEventListener('change', this.onLocationGranularityChange.bind(this));
            
            // For testing: set dummy GPS coordinates so dropdown functionality works
            this.currentGPS = { latitude: 40.7128, longitude: -74.0060 }; // New York City
            console.log('Set test GPS coordinates for dropdown testing');
        } else {
            console.error('Location granularity dropdown element not found!');
        }
        
        // Test button
        const testButton = document.getElementById('testDropdown');
        if (testButton) {
            testButton.addEventListener('click', () => {
                console.log('Test button clicked - triggering dropdown change');
                this.onLocationGranularityChange();
            });
        }
        
        // Custom Prompts Modal events
        if (this.managePromptsBtn) {
            this.managePromptsBtn.addEventListener('click', this.openCustomPromptsModal.bind(this));
        }
        
        if (this.customPromptsModal) {
            // Close modal when clicking overlay or close button
            this.customPromptsModal.addEventListener('click', (e) => {
                if (e.target === this.customPromptsModal || e.target.classList.contains('modal-close')) {
                    this.closeCustomPromptsModal();
                }
            });
            
            // Prevent modal from closing when clicking inside content
            const modalContent = this.customPromptsModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }
        
        if (this.createPromptBtn) {
            this.createPromptBtn.addEventListener('click', this.showPromptForm.bind(this));
        }
        
        if (this.cancelPromptBtn) {
            this.cancelPromptBtn.addEventListener('click', this.hidePromptForm.bind(this));
        }
        
        if (this.customPromptForm) {
            this.customPromptForm.addEventListener('submit', this.saveCustomPrompt.bind(this));
        }
        
        // Icon picker events
        const iconPicker = document.querySelector('.icon-suggestions');
        if (iconPicker) {
            iconPicker.addEventListener('click', (e) => {
                if (e.target.classList.contains('icon-btn')) {
                    const iconInput = document.getElementById('promptIcon');
                    if (iconInput) {
                        iconInput.value = e.target.textContent;
                    }
                }
            });
        }
        
    }

    // Custom Prompts Modal Management
    async openCustomPromptsModal() {
        this.customPromptsModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        await this.loadCustomPrompts();
        this.hidePromptForm();
    }

    closeCustomPromptsModal() {
        this.customPromptsModal.classList.add('hidden');
        document.body.style.overflow = '';
        this.hidePromptForm();
        this.editingPromptId = null;
    }

    async loadCustomPrompts() {
        try {
            const response = await fetch('/api/custom-prompts', {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.customPrompts = data.prompts || [];
                this.renderCustomPromptsList();
            } else {
                this.showNotification('Failed to load custom prompts', 'error');
            }
        } catch (error) {
            console.error('Error loading custom prompts:', error);
            this.showNotification('Error loading custom prompts', 'error');
        }
    }

    renderCustomPromptsList() {
        const list = this.customPromptsList;
        
        if (this.customPrompts.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✨</div>
                    <p>No custom prompts created yet.</p>
                    <p style="font-size: 14px;">Create your first custom prompt to get started!</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.customPrompts.map(prompt => `
            <div class="prompt-item" data-prompt-id="${prompt.id}">
                <div class="prompt-item-header">
                    <div class="prompt-item-title">
                        <span>${prompt.icon}</span>
                        <span>${prompt.name}</span>
                    </div>
                    <div class="prompt-item-actions">
                        <button onclick="app.editCustomPrompt(${prompt.id})" title="Edit">✏️</button>
                        <button onclick="app.deleteCustomPrompt(${prompt.id})" title="Delete">🗑️</button>
                    </div>
                </div>
                ${prompt.description ? `<div class="prompt-item-description">${prompt.description}</div>` : ''}
                <div class="prompt-item-text">${prompt.prompt_text}</div>
            </div>
        `).join('');
    }

    showPromptForm(promptData = null) {
        this.promptForm.classList.remove('hidden');
        
        if (promptData) {
            // Editing existing prompt
            document.getElementById('formTitle').textContent = 'Edit Prompt';
            document.getElementById('promptId').value = promptData.id;
            document.getElementById('promptName').value = promptData.name;
            document.getElementById('promptIcon').value = promptData.icon || '✨';
            document.getElementById('promptDescription').value = promptData.description || '';
            document.getElementById('promptText').value = promptData.prompt_text;
            this.editingPromptId = promptData.id;
        } else {
            // Creating new prompt
            document.getElementById('formTitle').textContent = 'Create New Prompt';
            document.getElementById('promptId').value = '';
            document.getElementById('promptName').value = '';
            document.getElementById('promptIcon').value = '✨';
            document.getElementById('promptDescription').value = '';
            document.getElementById('promptText').value = '';
            this.editingPromptId = null;
        }
    }

    hidePromptForm() {
        this.promptForm.classList.add('hidden');
        this.editingPromptId = null;
        
        // Clear form
        document.getElementById('promptId').value = '';
        document.getElementById('promptName').value = '';
        document.getElementById('promptIcon').value = '✨';
        document.getElementById('promptDescription').value = '';
        document.getElementById('promptText').value = '';
    }

    async saveCustomPrompt(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('promptName').value.trim(),
            icon: document.getElementById('promptIcon').value.trim() || '✨',
            description: document.getElementById('promptDescription').value.trim(),
            prompt_text: document.getElementById('promptText').value.trim()
        };

        if (!formData.name || !formData.prompt_text) {
            this.showNotification('Name and prompt text are required', 'error');
            return;
        }

        try {
            const url = this.editingPromptId 
                ? `/api/custom-prompts/${this.editingPromptId}`
                : '/api/custom-prompts';
            
            const method = this.editingPromptId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: this.getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(
                    this.editingPromptId ? 'Prompt updated successfully!' : 'Prompt created successfully!', 
                    'success'
                );
                await this.loadCustomPrompts();
                this.hidePromptForm();
                await this.updateStyleButtonsWithCustomPrompts();
            } else {
                const errorData = await response.json();
                this.showNotification(errorData.error || 'Failed to save prompt', 'error');
            }
        } catch (error) {
            console.error('Error saving custom prompt:', error);
            this.showNotification('Error saving prompt', 'error');
        }
    }

    async editCustomPrompt(promptId) {
        const prompt = this.customPrompts.find(p => p.id === promptId);
        if (prompt) {
            this.showPromptForm(prompt);
        }
    }

    async deleteCustomPrompt(promptId) {
        const prompt = this.customPrompts.find(p => p.id === promptId);
        if (!prompt) return;

        if (!confirm(`Are you sure you want to delete "${prompt.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/custom-prompts/${promptId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.showNotification('Prompt deleted successfully!', 'success');
                await this.loadCustomPrompts();
                await this.updateStyleButtonsWithCustomPrompts();
            } else {
                const errorData = await response.json();
                this.showNotification(errorData.error || 'Failed to delete prompt', 'error');
            }
        } catch (error) {
            console.error('Error deleting custom prompt:', error);
            this.showNotification('Error deleting prompt', 'error');
        }
    }

    async updateStyleButtonsWithCustomPrompts() {
        // Load custom prompts and add them to the style buttons
        try {
            if (!this.customPrompts.length) {
                await this.loadCustomPrompts();
            }

            const styleButtonsContainer = this.styleButtons;
            if (!styleButtonsContainer) return;

            // Remove existing custom prompt buttons
            const existingCustomButtons = styleButtonsContainer.querySelectorAll('[data-custom-prompt]');
            existingCustomButtons.forEach(btn => btn.remove());

            // Add custom prompt buttons
            this.customPrompts.forEach(prompt => {
                if (prompt.is_active) {
                    const button = document.createElement('button');
                    button.className = 'style-btn';
                    button.dataset.style = `custom_${prompt.id}`;
                    button.dataset.customPrompt = prompt.id;
                    button.innerHTML = `${prompt.icon} ${prompt.name}`;
                    button.title = prompt.description || prompt.name;
                    
                    button.addEventListener('click', () => {
                        this.selectStyle(`custom_${prompt.id}`);
                    });
                    
                    styleButtonsContainer.appendChild(button);
                }
            });
        } catch (error) {
            console.error('Error updating style buttons with custom prompts:', error);
        }
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
                console.log('GPS coordinates found:', gpsData.latitude, gpsData.longitude);
                
                // Show the granularity dropdown when GPS is detected
                this.locationGranularity.style.display = 'block';
                
                // Store GPS coordinates for granularity changes
                this.currentGPS = { latitude: gpsData.latitude, longitude: gpsData.longitude };
                
                // Show that we're reverse geocoding
                this.showNotification('🌍 Looking up location name...', 'info');
                
                // Get location name from coordinates using selected granularity
                const granularity = this.locationGranularity.value || 'place';
                console.log('Using granularity from dropdown:', granularity);
                const locationName = await this.reverseGeocode(gpsData.latitude, gpsData.longitude, granularity);
                
                if (locationName) {
                    this.locationInput.value = locationName;
                    hasData = true;
                } else {
                    // Fallback to showing coordinates
                    this.locationInput.value = `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}`;
                    hasData = true;
                }
            } else {
                // Hide the granularity dropdown if no GPS data
                this.locationGranularity.style.display = 'none';
                this.currentGPS = null;
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

    async reverseGeocode(latitude, longitude, granularity = 'place') {
        try {
            console.log('Reverse geocoding with granularity:', granularity);
            // Using a free geocoding service (Nominatim from OpenStreetMap)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'AI Caption Studio'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                console.log('Geocoding response:', data);
                
                if (data && data.address) {
                    // Build location string based on granularity
                    const parts = [];
                    console.log('Building location with granularity:', granularity);
                    
                    if (granularity === 'place') {
                        // Most specific: place/neighborhood, city, state/country
                        if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                        else if (data.address.suburb) parts.push(data.address.suburb);
                        else if (data.address.hamlet) parts.push(data.address.hamlet);
                        
                        if (data.address.city) parts.push(data.address.city);
                        else if (data.address.town) parts.push(data.address.town);
                        else if (data.address.village) parts.push(data.address.village);
                        
                        if (data.address.state) parts.push(data.address.state);
                        if (data.address.country) parts.push(data.address.country);
                    } else if (granularity === 'city') {
                        // City level: city, state/country
                        if (data.address.city) parts.push(data.address.city);
                        else if (data.address.town) parts.push(data.address.town);
                        else if (data.address.village) parts.push(data.address.village);
                        
                        if (data.address.state) parts.push(data.address.state);
                        if (data.address.country) parts.push(data.address.country);
                    } else if (granularity === 'country') {
                        // Country level only
                        if (data.address.country) parts.push(data.address.country);
                    }
                    
                    const result = parts.join(', ') || data.display_name;
                    console.log('Geocoding result for', granularity + ':', result);
                    return result;
                }
            }
        } catch (error) {
            console.log('Reverse geocoding failed:', error.message);
        }
        
        return null;
    }

    async onLocationGranularityChange() {
        console.log('Granularity dropdown changed!');
        console.log('Current GPS:', this.currentGPS);
        
        // Re-geocode with new granularity if GPS data is available
        if (this.currentGPS) {
            this.showNotification('🌍 Updating location...', 'info');
            
            const granularity = this.locationGranularity.value;
            console.log('New granularity:', granularity);
            
            const locationName = await this.reverseGeocode(
                this.currentGPS.latitude, 
                this.currentGPS.longitude, 
                granularity
            );
            
            console.log('New location name:', locationName);
            
            if (locationName) {
                this.locationInput.value = locationName;
                console.log('Location updated in input field');
            }
        } else {
            console.log('No GPS data available for re-geocoding');
        }
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
        // Check if this is a custom prompt
        if (style.startsWith('custom_')) {
            const promptId = parseInt(style.replace('custom_', ''));
            const customPrompt = this.customPrompts.find(p => p.id === promptId);
            
            if (customPrompt) {
                return this.buildCustomPrompt(customPrompt);
            }
        }

        // Default built-in styles
        const styleDescriptions = {
            creative: 'artistic and expressive language with creative metaphors',
            professional: 'business-appropriate and polished tone',
            casual: 'friendly, conversational, and relatable',
            trendy: 'current slang, viral language, and trending expressions',
            inspirational: 'motivational, uplifting, and encouraging',
            humorous: 'funny, witty, and entertaining while keeping it appropriate',
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

    buildCustomPrompt(customPrompt) {
        const context = this.getContextInfo();
        const contextString = context.length > 0 ? context.join('\n') : '';
        const weatherData = this.weatherToggle?.checked ? 'Weather data will be included if available' : '';
        
        // Create variables object for substitution
        const variables = {
            image_description: 'the uploaded image',
            context: contextString || 'No additional context provided',
            camera: this.cameraInput?.value || 'No camera information available',
            location: this.locationInput?.value || 'No location information available',
            weather: weatherData || 'No weather data requested',
            style: customPrompt.name.toLowerCase()
        };

        // Replace variables in the custom prompt text
        let promptText = customPrompt.prompt_text;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            promptText = promptText.replace(regex, value);
        });

        // Ensure the output format is maintained
        if (!promptText.includes('CAPTION:') || !promptText.includes('HASHTAGS:') || !promptText.includes('ALT_TEXT:')) {
            promptText += `\n\nFormat your response as:
CAPTION: [your caption here]
HASHTAGS: [hashtags separated by spaces]
ALT_TEXT: [descriptive alt text for accessibility]`;
        }

        return promptText;
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
                await this.onAuthenticationSuccess();
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

    async onAuthenticationSuccess() {
        // Initialize the app components after successful auth
        this.checkServerHealth();
        this.loadTemplateList();
        this.loadMastodonConfig();
        await this.updateUserInterface();
        await this.updateStyleButtonsWithCustomPrompts();
    }

    async updateUserInterface() {
        // Show user info in the interface
        if (this.currentUser) {
            // You can add a user info display here
            
            // Add logout button to the interface if needed
            await this.addUserControls();
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

    async addUserControls() {
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
            const adminMenu = this.currentUser.isAdmin ? await this.loadTemplate('admin-menu') : '';
            
            userControls.innerHTML = await this.renderTemplate('user-controls', {
                ADMIN_MENU: adminMenu,
                USER_EMAIL: this.currentUser.email,
                USER_USAGE_DISPLAY: this.getUserUsageDisplay()
            });
            
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
    window.app = new CaptionGenerator();
});