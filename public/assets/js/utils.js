/**
 * Utility functions for BonjourArcade
 */

/**
 * Normalizes a title for sorting purposes by treating "The" as a suffix
 * @param {string} title - The title to normalize
 * @returns {string} - The normalized title for sorting (e.g., "The Shining" becomes "Shining, The")
 */
function normalizeTitleForSorting(title) {
    if (!title) return '';

    // Convert to lowercase for consistent handling
    const lowerTitle = title.toLowerCase().trim();

    // Check if title starts with "The " (including space)
    if (lowerTitle.startsWith('the ')) {
        // Move "The" to the end: "The Shining" -> "Shining, The"
        const restOfTitle = title.substring(4); // Remove "The " (4 characters)
        return `${restOfTitle}, The`;
    }

    return title;
}




// Inject Analytics
(function () {
    try {
        // Attempt to load analytics.js from the same directory as utils.js
        var script = document.createElement('script');
        script.async = true;

        // Use currentScript to find the path, or fallback to searching for utils.js
        var src = '';
        if (document.currentScript) {
            src = document.currentScript.src;
        } else {
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; i++) {
                if (scripts[i].src.indexOf('utils.js') !== -1) {
                    src = scripts[i].src;
                    break;
                }
            }
        }

        if (src) {
            // Replace utils.js with analytics.js
            script.src = src.replace('utils.js', 'analytics.js');
            document.head.appendChild(script);
        } else {
            console.warn('BonjourArcade: Could not find utils.js path to inject analytics.');
        }
    } catch (e) {
        console.error('BonjourArcade: Analytics injection failed', e);
    }
})();
