// Debug Content Script - Always shows button
(function() {
    'use strict';
    
    console.log('DEBUG: Script loaded on', window.location.href);
    
    // Add button immediately, regardless of page
    setTimeout(() => {
        console.log('DEBUG: Adding button now');
        
        const button = document.createElement('div');
        button.innerHTML = `
            <button style="
                position: fixed;
                top: 100px;
                right: 20px;
                background: red;
                color: white;
                border: none;
                padding: 15px;
                border-radius: 8px;
                font-size: 16px;
                z-index: 10000;
                cursor: pointer;
            ">
                🔴 TEST BUTTON
            </button>
        `;
        
        document.body.appendChild(button);
        console.log('DEBUG: Button added to page');
        
        button.querySelector('button').addEventListener('click', () => {
            alert('Button works! URL: ' + window.location.href);
        });
        
    }, 2000);
    
    // Log URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log('DEBUG: URL changed to', url);
        }
    }).observe(document, { subtree: true, childList: true });
    
})();