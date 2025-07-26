// Instagram Caption Generator - Simple Content Script
(function() {
    'use strict';
    
    console.log('IG Extension: Content script loaded on', window.location.href);

    let captionButton = null;

    // Check if we're on Instagram create page
    function checkIfCreatePage() {
        const url = window.location.href;
        const isCreate = url.includes('/create/') || url.includes('/p/') && url.includes('/edit/');
        
        console.log('IG Extension: URL check', url, 'isCreate:', isCreate);
        
        if (isCreate) {
            console.log('IG Extension: On create page, adding button');
            setTimeout(addCaptionButton, 2000); // Wait longer for page to load
        } else {
            console.log('IG Extension: Not on create page');
            removeCaptionButton();
        }
    }

    // Add the caption fill button
    function addCaptionButton() {
        console.log('IG Extension: addCaptionButton called');
        
        if (captionButton) {
            console.log('IG Extension: Button already exists');
            return;
        }

        // Find the caption textarea - try multiple selectors
        const captionArea = findCaptionTextarea();
        console.log('IG Extension: Caption area found:', !!captionArea, captionArea);
        
        if (!captionArea) {
            console.log('IG Extension: Caption area not found, retrying in 1 second...');
            setTimeout(addCaptionButton, 1000);
            return;
        }

        // Create the button
        captionButton = document.createElement('div');
        captionButton.innerHTML = `
            <button type="button" style="
                background: linear-gradient(45deg, #405de6, #fd1d1d);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                margin: 8px 0;
                cursor: pointer;
            ">
                📝 Fill Caption
            </button>
        `;

        // Insert button - try different insertion points
        let inserted = false;
        
        // Try inserting after the caption area
        if (captionArea.parentElement) {
            captionArea.parentElement.appendChild(captionButton);
            inserted = true;
            console.log('IG Extension: Button inserted after caption area');
        }
        
        if (!inserted) {
            // Fallback: insert at top of body
            document.body.appendChild(captionButton);
            console.log('IG Extension: Button inserted in body as fallback');
        }

        // Add click event
        captionButton.querySelector('button').addEventListener('click', fillCaption);
    }

    // Find Instagram's caption textarea
    function findCaptionTextarea() {
        // Try multiple selectors as Instagram changes them frequently
        const selectors = [
            'textarea[aria-label*="caption"]',
            'textarea[aria-label*="Write a caption"]',
            'textarea[placeholder*="caption"]',
            'textarea[data-testid*="caption"]',
            'div[contenteditable="true"][aria-label*="caption"]',
            'div[contenteditable="true"]',
            'textarea'  // Last resort
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log('IG Extension: Found caption area with selector:', selector);
                return element;
            }
        }

        console.log('IG Extension: No caption area found with any selector');
        return null;
    }

    // Fill the caption
    async function fillCaption() {
        console.log('IG Extension: Fill caption clicked');
        
        try {
            // Get caption from local app
            const response = await fetch('http://localhost:3000/api/get-last-caption');
            
            if (response.ok) {
                const data = await response.json();
                const caption = data.caption;
                
                if (caption) {
                    insertCaption(caption);
                    console.log('IG Extension: Caption filled successfully');
                    alert('Caption filled successfully!');
                } else {
                    alert('No caption found. Generate one first in your caption app.');
                }
            } else {
                alert('Could not connect to caption generator. Make sure it\'s running on localhost:3000.');
            }
        } catch (error) {
            console.error('Caption fill error:', error);
            alert('Error connecting to caption generator app.');
        }
    }

    // Insert caption into Instagram's textarea
    function insertCaption(caption) {
        const textarea = findCaptionTextarea();
        if (!textarea) {
            alert('Could not find caption input field.');
            return;
        }

        // Handle both textarea and contenteditable elements
        if (textarea.tagName === 'TEXTAREA') {
            textarea.value = caption;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (textarea.isContentEditable) {
            textarea.textContent = caption;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Trigger focus to ensure Instagram recognizes the change
        textarea.focus();
        textarea.click();
    }

    // Remove caption button
    function removeCaptionButton() {
        if (captionButton) {
            captionButton.remove();
            captionButton = null;
            console.log('IG Extension: Button removed');
        }
    }

    // Listen for page changes (Instagram SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log('IG Extension: URL changed to', url);
            setTimeout(checkIfCreatePage, 1000);
        }
    }).observe(document, { subtree: true, childList: true });

    // Initial check
    setTimeout(checkIfCreatePage, 2000);

})();