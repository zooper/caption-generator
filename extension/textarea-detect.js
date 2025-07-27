// Instagram Caption Generator - Textarea Detection
(function() {
    'use strict';
    
    console.log('IG Extension: Script loaded, watching for caption textarea');
    
    let captionButton = null;
    let generateButton = null;
    let checkInterval = null;
    let currentImage = null;
    let interceptedFile = null; // Store intercepted file to preserve EXIF

    // Intercept file uploads to preserve EXIF
    function interceptFileUploads() {
        // Override file input change events
        document.addEventListener('change', (event) => {
            if (event.target.type === 'file' && event.target.files && event.target.files.length > 0) {
                const file = event.target.files[0];
                if (file.type.startsWith('image/')) {
                    console.log('IG Extension: Intercepted file upload:', file.name, file.type, file.size, 'lastModified:', new Date(file.lastModified));
                    interceptedFile = file;
                    
                    // Check if this file has EXIF data
                    checkFileForExif(file);
                    
                    // Keep the file for 5 minutes instead of 1 minute
                    setTimeout(() => {
                        if (interceptedFile === file) {
                            console.log('IG Extension: Intercepted file expired:', file.name);
                            interceptedFile = null;
                        }
                    }, 300000); // 5 minutes
                }
            }
        }, true);
    }
    
    // Check if file has EXIF data (for debugging)
    async function checkFileForExif(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const view = new DataView(arrayBuffer);
            
            // Check for JPEG EXIF marker (0xFFE1)
            let hasExif = false;
            for (let i = 0; i < Math.min(arrayBuffer.byteLength - 1, 1000); i++) {
                if (view.getUint8(i) === 0xFF && view.getUint8(i + 1) === 0xE1) {
                    hasExif = true;
                    break;
                }
            }
            
            console.log('IG Extension: File EXIF check:', file.name, 'has EXIF marker:', hasExif);
        } catch (e) {
            console.log('IG Extension: Could not check EXIF:', e.message);
        }
    }

    // Start watching for caption textarea
    function startWatching() {
        checkInterval = setInterval(() => {
            const textarea = findCaptionTextarea();
            const imagePreview = findImagePreview();
            
            if (textarea && !captionButton) {
                console.log('IG Extension: Caption textarea found!', textarea);
                addCaptionButtons(textarea);
                
                // Check if there's an image to generate from
                if (imagePreview) {
                    console.log('IG Extension: Image preview found!', imagePreview);
                    currentImage = imagePreview;
                }
            } else if (!textarea && captionButton) {
                console.log('IG Extension: Caption textarea gone, removing buttons');
                removeCaptionButtons();
            }
        }, 1000);
    }

    // Find Instagram's caption textarea
    function findCaptionTextarea() {
        const selectors = [
            'textarea[aria-label*="caption" i]',
            'textarea[aria-label*="write" i]',
            'textarea[placeholder*="caption" i]',
            'div[contenteditable="true"][aria-label*="caption" i]',
            'div[contenteditable="true"][data-text*="caption" i]',
            'textarea[data-testid="caption"]',
            // More specific Instagram selectors
            'textarea[class*="caption"]',
            'div[contenteditable="true"][class*="caption"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                // Double check it's actually a caption field
                const text = (element.getAttribute('aria-label') || '').toLowerCase();
                const placeholder = (element.getAttribute('placeholder') || '').toLowerCase();
                
                if (text.includes('caption') || text.includes('write') || placeholder.includes('caption')) {
                    console.log('IG Extension: Found caption field with selector:', selector);
                    return element;
                }
            }
        }
        return null;
    }

    // Find Instagram's image preview and original file
    function findImagePreview() {
        // First check if we have an intercepted file
        if (interceptedFile) {
            console.log('IG Extension: Using intercepted file:', interceptedFile.name, 'age:', Date.now() - interceptedFile.lastModified, 'ms');
            return { type: 'file', element: interceptedFile };
        }

        // Then try to find the original file input (more comprehensive search)
        console.log('IG Extension: Searching for file inputs...');
        
        // Search all possible file input patterns
        const fileInputSelectors = [
            'input[type="file"]',
            'input[accept*="image"]',
            'input[accept*="/*"]',
            '[type="file"]'
        ];
        
        for (const selector of fileInputSelectors) {
            const inputs = document.querySelectorAll(selector);
            console.log(`IG Extension: Found ${inputs.length} inputs for selector: ${selector}`);
            
            for (const input of inputs) {
                if (input.files && input.files.length > 0) {
                    console.log('IG Extension: Found file input with files:', input.files.length, input.files[0]);
                    return { type: 'file', element: input.files[0] };
                } else {
                    console.log('IG Extension: File input found but no files:', input);
                }
            }
        }

        // Try to find blob URLs which might preserve metadata
        console.log('IG Extension: Searching for blob URLs...');
        const blobImages = document.querySelectorAll('img[src^="blob:"]');
        for (const img of blobImages) {
            console.log('IG Extension: Found blob URL image:', img.src);
            try {
                // Try to fetch the blob and convert to file
                return { type: 'blob', element: img };
            } catch (e) {
                console.log('IG Extension: Could not access blob:', e);
            }
        }

        // Fallback to image elements (will lose EXIF)
        console.log('IG Extension: Falling back to image elements...');
        const selectors = [
            'img[alt*="Selected"]',
            'img[src*="blob:"]',
            'img[src*="instagram"]',
            'div[role="img"] img',
            'canvas',
            'video'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && (element.src || element.toDataURL)) {
                console.log('IG Extension: Found image with selector:', selector);
                return { type: 'element', element: element };
            }
        }
        return null;
    }

    // Add both caption buttons
    function addCaptionButtons(textarea) {
        if (captionButton) return;
        
        console.log('IG Extension: Adding buttons near textarea');
        
        captionButton = document.createElement('div');
        captionButton.style.cssText = `
            margin: 10px 0;
            text-align: left;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        `;
        
        captionButton.innerHTML = `
            <button type="button" id="generate-from-image" style="
                background: linear-gradient(45deg, #28a745, #20c997);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                ✨ Generate Caption from Image
            </button>
        `;

        // Try to insert the buttons near the textarea
        let inserted = false;
        
        // Try inserting after the textarea's parent
        if (textarea.parentElement) {
            textarea.parentElement.insertAdjacentElement('afterend', captionButton);
            inserted = true;
            console.log('IG Extension: Buttons inserted after textarea parent');
        }
        
        if (!inserted) {
            // Fallback: insert before the textarea
            textarea.insertAdjacentElement('beforebegin', captionButton);
            console.log('IG Extension: Buttons inserted before textarea');
        }

        // Add click event
        captionButton.querySelector('#generate-from-image').addEventListener('click', generateCaptionFromImage);
    }


    // Generate caption from Instagram's uploaded image
    async function generateCaptionFromImage() {
        console.log('IG Extension: Generate from image clicked');
        
        const button = captionButton.querySelector('#generate-from-image');
        const originalText = button.textContent;
        button.textContent = '⏳ Analyzing Image...';
        button.disabled = true;
        
        try {
            // Find the image in Instagram's interface
            const imageResult = findImagePreview();
            if (!imageResult) {
                alert('Could not find the uploaded image. Make sure you have uploaded an image first.');
                button.textContent = originalText;
                button.disabled = false;
                return;
            }
            
            console.log('IG Extension: Found image:', imageResult.type, imageResult.element);
            
            // Extract image data
            let imageData;
            
            if (imageResult.type === 'file') {
                // Use File API to preserve EXIF data
                console.log('IG Extension: Using original file with EXIF preservation:', imageResult.element.name, 'Size:', imageResult.element.size, 'Type:', imageResult.element.type);
                imageData = await fileToBase64(imageResult.element);
                console.log('IG Extension: File converted to base64, length:', imageData.length);
            } else if (imageResult.type === 'blob') {
                // Try to fetch blob and preserve EXIF
                console.log('IG Extension: Attempting to fetch blob with EXIF preservation');
                imageData = await blobToBase64(imageResult.element.src);
            } else if (imageResult.element.tagName === 'CANVAS') {
                console.log('IG Extension: Canvas found - EXIF will be lost');
                imageData = imageResult.element.toDataURL('image/jpeg', 0.8);
            } else if (imageResult.element.tagName === 'IMG') {
                console.log('IG Extension: Image element found - EXIF will be lost');
                // Convert image to canvas to get base64 data
                imageData = await imageToBase64(imageResult.element);
            } else {
                throw new Error('Unsupported image element type');
            }
            
            console.log('IG Extension: Image data extracted, length:', imageData.length);
            
            // Send full image to backend for processing (including EXIF extraction)
            button.textContent = '🤖 Analyzing Image & Generating Caption...';
            
            const appUrl = await getAppUrl();
            const response = await fetch(`${appUrl}/api/generate-caption`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    base64Image: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const generatedContent = data.content;
                
                if (generatedContent) {
                    // Parse the structured response
                    const parsedContent = parseGeneratedContent(generatedContent);
                    insertCaption(parsedContent);
                    button.textContent = '✅ Generated & Filled!';
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.disabled = false;
                    }, 3000);
                } else {
                    alert('No caption was generated. Please try again.');
                    button.textContent = originalText;
                    button.disabled = false;
                }
            } else {
                const appUrl = await getAppUrl();
                alert(`Could not connect to caption generator. Make sure it's running on ${appUrl}`);
                button.textContent = originalText;
                button.disabled = false;
            }
            
        } catch (error) {
            console.error('Generate caption error:', error);
            alert('Error generating caption: ' + error.message);
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    // Convert File object to base64 (preserves EXIF)
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Convert blob URL to base64 (may preserve EXIF)
    async function blobToBase64(blobUrl) {
        try {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            throw new Error('Could not fetch blob: ' + error.message);
        }
    }

    // Convert image element to base64 (loses EXIF)
    function imageToBase64(imgElement) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Handle cross-origin images
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                try {
                    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataURL);
                } catch (e) {
                    reject(new Error('Could not extract image data: ' + e.message));
                }
            };
            
            img.onerror = () => {
                reject(new Error('Could not load image'));
            };
            
            img.src = imgElement.src;
        });
    }


    // Parse the generated content response
    function parseGeneratedContent(response) {
        const captionMatch = response.match(/CAPTION:\s*(.*?)(?=HASHTAGS:|ALT_TEXT:|$)/s);
        const hashtagsMatch = response.match(/HASHTAGS:\s*(.*?)(?=ALT_TEXT:|$)/s);

        const caption = captionMatch ? captionMatch[1].trim() : '';
        const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : '';

        // Combine caption and hashtags for Instagram (skip alt text)
        let fullCaption = caption;
        if (hashtags) {
            fullCaption += '\n\n' + hashtags;
        }

        console.log('IG Extension: Parsed caption:', caption);
        console.log('IG Extension: Parsed hashtags:', hashtags);
        console.log('IG Extension: Full caption for Instagram:', fullCaption);

        return fullCaption;
    }


    // Insert caption into textarea
    function insertCaption(caption) {
        const textarea = findCaptionTextarea();
        if (!textarea) {
            alert('Could not find caption input field.');
            return;
        }

        console.log('IG Extension: Inserting caption into', textarea.tagName, textarea);
        console.log('IG Extension: Caption to insert:', caption);

        // Focus first
        textarea.focus();
        textarea.click();

        if (textarea.tagName === 'TEXTAREA') {
            console.log('IG Extension: Handling TEXTAREA');
            
            // Method 1: Direct value setting
            textarea.value = caption;
            
            // Method 2: Simulate actual typing
            textarea.dispatchEvent(new Event('focus', { bubbles: true }));
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new Event('blur', { bubbles: true }));
            
            console.log('IG Extension: Textarea value after setting:', textarea.value);
            
        } else if (textarea.isContentEditable || textarea.contentEditable === 'true') {
            console.log('IG Extension: Handling contenteditable');
            
            // Clear and set content
            textarea.innerHTML = '';
            textarea.textContent = caption;
            
            // Alternative method using execCommand (if supported)
            try {
                textarea.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, caption);
            } catch (e) {
                console.log('IG Extension: execCommand failed, using textContent');
                textarea.textContent = caption;
            }
            
            // Trigger events
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
            textarea.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
            
            console.log('IG Extension: ContentEditable content after setting:', textarea.textContent);
        }

        // Additional method: Try to simulate real user interaction
        setTimeout(() => {
            textarea.focus();
            
            // Create and dispatch a more realistic input event
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: caption
            });
            textarea.dispatchEvent(inputEvent);
            
            console.log('IG Extension: Final check - field content:', 
                textarea.tagName === 'TEXTAREA' ? textarea.value : textarea.textContent);
        }, 100);

        console.log('IG Extension: Caption insertion completed');
    }

    // Remove caption buttons
    function removeCaptionButtons() {
        if (captionButton) {
            captionButton.remove();
            captionButton = null;
        }
    }

    // Get app URL from settings
    async function getAppUrl() {
        try {
            // Use chrome.storage for Firefox compatibility
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
            console.error('Error getting app URL from storage:', error);
            return 'http://localhost:3000';
        }
    }

    // Start file interception and watching immediately
    interceptFileUploads();
    startWatching();
    
    // Also watch for DOM changes
    const observer = new MutationObserver(() => {
        // Don't need to do anything, the interval will catch changes
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();