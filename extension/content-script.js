// Instagram Caption Generator - Content Script
(function() {
    'use strict';
    
    console.log('IG Extension: Content script loaded on', window.location.href);

    let captionButton = null;
    let isInstagramCreatePage = false;

    // Check if we're on Instagram create page
    function checkIfCreatePage() {
        const url = window.location.href;
        const isCreate = url.includes('/create/') || url.includes('/p/') && url.includes('/edit/');
        
        console.log('IG Extension: URL check', url, 'isCreate:', isCreate);
        
        if (isCreate !== isInstagramCreatePage) {
            isInstagramCreatePage = isCreate;
            if (isCreate) {
                console.log('IG Extension: On create page, adding button');
                setTimeout(addCaptionButton, 1000); // Wait for page to load
            } else {
                console.log('IG Extension: Not on create page, removing button');
                removeCaptionButton();
            }
        }
    }

    // Add the caption fill button
    function addCaptionButton() {
        console.log('IG Extension: addCaptionButton called', 'hasButton:', !!captionButton, 'isCreatePage:', isInstagramCreatePage);
        
        if (captionButton || !isInstagramCreatePage) return;

        // Find the caption textarea
        const captionArea = findCaptionTextarea();
        console.log('IG Extension: Caption area found:', !!captionArea);
        
        if (!captionArea) {
            // Retry after a short delay
            console.log('IG Extension: Caption area not found, retrying...');
            setTimeout(addCaptionButton, 500);
            return;
        }

        // Create the button
        captionButton = document.createElement('div');
        captionButton.id = 'ig-caption-generator-btn';
        captionButton.innerHTML = `
            <button type="button" class="ig-caption-btn">
                📝 Fill Caption
            </button>
        `;

        // Position the button near the caption area
        captionButton.style.cssText = `
            position: relative;
            margin: 8px 0;
            z-index: 1000;
        `;

        // Insert button before the caption area
        const container = captionArea.closest('div[role="dialog"]') || captionArea.parentElement;
        console.log('IG Extension: Container found:', !!container);
        
        if (container) {
            container.insertBefore(captionButton, captionArea.parentElement);
            console.log('IG Extension: Button inserted successfully');
        }

        // Add click event
        captionButton.querySelector('.ig-caption-btn').addEventListener('click', fillCaption);
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
            'div[contenteditable="true"][data-text*="caption"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }

        return null;
    }

    // Fill the caption from app
    async function fillCaption() {
        try {
            showLoading(true);

            // Get app URL from settings
            const appUrl = await getAppUrl();

            // Try to get caption from app
            const response = await fetch(`${appUrl}/api/get-last-caption`);
            
            if (response.ok) {
                const data = await response.json();
                const caption = data.caption;
                
                if (caption) {
                    insertCaption(caption);
                    showSuccess('Caption filled successfully!');
                } else {
                    showError('No caption found. Generate one first in your caption app.');
                }
            } else {
                showError('Could not connect to caption generator. Check settings.');
            }
        } catch (error) {
            console.error('Caption fill error:', error);
            showError('Error connecting to caption generator. Check extension settings.');
        } finally {
            showLoading(false);
        }
    }

    // Get app URL from settings
    async function getAppUrl() {
        try {
            // Use chrome.storage for Firefox compatibility
            const api = typeof browser !== 'undefined' ? browser : chrome;
            const result = await api.storage.sync.get(['appUrl']);
            return result.appUrl || 'http://localhost:3000';
        } catch (error) {
            console.error('Error getting app URL:', error);
            return 'http://localhost:3000';
        }
    }

    // Insert caption into Instagram's textarea
    function insertCaption(caption) {
        const textarea = findCaptionTextarea();
        if (!textarea) {
            showError('Could not find caption input field.');
            return;
        }

        // Handle both textarea and contenteditable elements
        if (textarea.tagName === 'TEXTAREA') {
            textarea.value = caption;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (textarea.isContentEditable) {
            textarea.textContent = caption;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Trigger focus to ensure Instagram recognizes the change
        textarea.focus();
        textarea.click();
    }

    // Show loading state
    function showLoading(loading) {
        const btn = captionButton?.querySelector('.ig-caption-btn');
        if (btn) {
            btn.disabled = loading;
            btn.textContent = loading ? '⏳ Loading...' : '📝 Fill Caption';
        }
    }

    // Show success message
    function showSuccess(message) {
        showNotification(message, 'success');
    }

    // Show error message
    function showError(message) {
        showNotification(message, 'error');
    }

    // Show notification
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `ig-caption-notification ig-caption-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Remove caption button
    function removeCaptionButton() {
        if (captionButton) {
            captionButton.remove();
            captionButton = null;
        }
    }

    // Listen for page changes (Instagram SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(checkIfCreatePage, 500);
        }
    }).observe(document, { subtree: true, childList: true });

    // Initial check
    setTimeout(checkIfCreatePage, 1000);

    // Clean up on page unload
    window.addEventListener('beforeunload', removeCaptionButton);

})();