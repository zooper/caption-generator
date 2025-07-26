class CaptionGenerator {
    constructor() {
        this.currentFile = null;
        this.currentStyle = 'creative';
        this.initializeElements();
        this.bindEvents();
        this.checkServerHealth();
        this.loadTemplateList();
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
        this.notification = document.getElementById('notification');
        
        // Context inputs
        this.cameraInput = document.getElementById('cameraInput');
        this.eventInput = document.getElementById('eventInput');
        this.locationInput = document.getElementById('locationInput');
        this.moodInput = document.getElementById('moodInput');
        this.subjectInput = document.getElementById('subjectInput');
        this.customInput = document.getElementById('customInput');
        this.clearContextBtn = document.getElementById('clearContextBtn');
        this.saveContextBtn = document.getElementById('saveContextBtn');
        
        // Template controls
        this.templateSelect = document.getElementById('templateSelect');
        this.loadTemplateBtn = document.getElementById('loadTemplateBtn');
        this.deleteTemplateBtn = document.getElementById('deleteTemplateBtn');
        
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
                console.log('EXIFR library not loaded');
                this.showNotification('⚠️ EXIF library not available', 'error');
                return;
            }

            // Show that we're trying to extract metadata
            this.showNotification('🔍 Checking for image metadata...', 'info');

            console.log('Attempting to parse file:', file.name, file.type);
            
            // Extract both GPS and camera data
            const [gpsData, allExifData] = await Promise.all([
                exifr.gps(file).catch(() => null),
                exifr.parse(file).catch(err => {
                    console.error('EXIF parse error:', err);
                    return null;
                })
            ]);
            
            console.log('GPS data:', gpsData);
            console.log('All EXIF data:', allExifData);
            
            let hasData = false;
            
            // Handle GPS/Location data
            if (gpsData && gpsData.latitude && gpsData.longitude) {
                console.log('GPS coordinates found:', gpsData.latitude, gpsData.longitude);
                
                // Show that we're reverse geocoding
                this.showNotification('🌍 Looking up location name...', 'info');
                
                // Get location name from coordinates
                const locationName = await this.reverseGeocode(gpsData.latitude, gpsData.longitude);
                
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
                    console.log('Camera info extracted:', cameraInfo);
                }
            } else {
                console.log('No camera data found in EXIF');
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
            console.error('EXIF extraction error:', error);
            this.showNotification('⚠️ Could not read image metadata', 'error');
        }
    }

    async reverseGeocode(latitude, longitude) {
        try {
            // Using a free geocoding service (Nominatim from OpenStreetMap)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'Instagram Caption Generator'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.address) {
                    // Build a readable location string
                    const parts = [];
                    if (data.address.city) parts.push(data.address.city);
                    else if (data.address.town) parts.push(data.address.town);
                    else if (data.address.village) parts.push(data.address.village);
                    
                    if (data.address.state) parts.push(data.address.state);
                    if (data.address.country) parts.push(data.address.country);
                    
                    return parts.join(', ') || data.display_name;
                }
            }
        } catch (error) {
            console.log('Reverse geocoding failed:', error.message);
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
            
            const response = await this.callLocalAPI(prompt, base64Image);
            this.displayResults(response);
            this.showNotification('Caption generated successfully!');
        } catch (error) {
            console.error('Error generating caption:', error);
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
            inspirational: 'motivational, uplifting, and encouraging'
        };

        const context = this.getContextInfo();
        const contextString = context.length > 0 ? `\n\nAdditional Context:\n${context.join('\n')}` : '';

        return `Analyze this image for Instagram posting. Generate:

1. A ${style} caption that:
   - Captures the main subject/scene
   - Uses ${styleDescriptions[style]}
   - Is 1-3 sentences
   - Includes relevant emojis
   - Encourages engagement with a question or call-to-action
   - Feels authentic and not overly promotional
   ${context.length > 0 ? '- Incorporates the provided context naturally' : ''}

2. 10-15 hashtags that:
   - Mix popular (#photography, #instagood) and niche tags
   - Are relevant to image content
   - Include location-based tags if applicable
   - Avoid banned or shadowbanned hashtags
   - Range from broad to specific
   ${context.length > 0 ? '- Include relevant hashtags based on the context provided' : ''}
${contextString}

Format your response as:
CAPTION: [your caption here]
HASHTAGS: [hashtags separated by spaces]`;
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
        this.showNotification('Context cleared');
    }

    saveContextTemplate() {
        const template = {
            camera: this.cameraInput.value.trim(),
            event: this.eventInput.value.trim(),
            location: this.locationInput.value.trim(),
            mood: this.moodInput.value.trim(),
            subject: this.subjectInput.value.trim(),
            custom: this.customInput.value.trim()
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                base64Image: base64Image
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.content;
    }

    displayResults(response) {
        const captionMatch = response.match(/CAPTION:\s*(.*?)(?=HASHTAGS:|$)/s);
        const hashtagsMatch = response.match(/HASHTAGS:\s*(.*?)$/s);

        const caption = captionMatch ? captionMatch[1].trim() : 'Caption could not be generated';
        const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : '';

        this.captionText.textContent = caption;
        this.hashtagsText.textContent = hashtags;
        
        this.charCount.textContent = `${caption.length} characters`;
        const hashtagArray = hashtags.split(' ').filter(tag => tag.startsWith('#'));
        this.hashtagCount.textContent = `${hashtagArray.length} tags`;

        this.resultsPlaceholder.style.display = 'none';
        this.resultsContent.style.display = 'block';
    }

    hideResults() {
        this.resultsPlaceholder.style.display = 'block';
        this.resultsContent.style.display = 'none';
    }

    setLoadingState(loading) {
        const btnText = this.generateBtn.querySelector('.btn-text');
        const spinner = this.generateBtn.querySelector('.loading-spinner');
        
        if (loading) {
            btnText.textContent = 'Generating...';
            spinner.style.display = 'inline-block';
            this.generateBtn.disabled = true;
        } else {
            btnText.textContent = 'Generate Caption';
            spinner.style.display = 'none';
            this.generateBtn.disabled = false;
        }
    }

    async copyToClipboard(type) {
        const text = type === 'caption' ? this.captionText.textContent : this.hashtagsText.textContent;
        
        try {
            await navigator.clipboard.writeText(text);
            const btn = type === 'caption' ? this.copyCaptionBtn : this.copyHashtagsBtn;
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

}

document.addEventListener('DOMContentLoaded', () => {
    new CaptionGenerator();
});