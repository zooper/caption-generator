// AI Caption Studio - Theme Loader
// This script should be loaded on all pages to apply the user's saved theme

(function() {
    // Load and apply the saved theme immediately to prevent flash
    const savedTheme = localStorage.getItem('app_theme') || 'purple-creative';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Function to change theme from any page
    window.setAppTheme = function(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('app_theme', themeName);
    };
    
    // Function to get current theme
    window.getCurrentTheme = function() {
        return localStorage.getItem('app_theme') || 'purple-creative';
    };
})();