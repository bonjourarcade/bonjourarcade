// public/js/load_emulator.js

// Function to fetch JSON config
async function fetchConfig(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching config from ${url}:`, error);
        return null; // Return null or a default object on error
    }
}

// Main function to setup and load the emulator
async function setupEmulator() {
    // --- 1. Check for required game-specific variables defined in HTML ---
    if (typeof EJS_player === 'undefined' ||
        typeof EJS_core === 'undefined' ||
        typeof EJS_gameUrl === 'undefined') {
        console.error("Error: EJS_player, EJS_core, or EJS_gameUrl is not defined in the HTML.");
        // Display error message in the game container
        const gameContainer = document.querySelector(EJS_player || '#game');
        if(gameContainer) gameContainer.textContent = "Emulator configuration error: Game-specific variables missing.";
        return; // Stop execution
    }

    // --- 2. Fetch General Emulator Settings ---
    const settings = await fetchConfig('../config/emulator_settings.json'); // Adjust path if needed
    if (!settings) {
         console.error("Failed to load emulator_settings.json");
         // Display error message
         const gameContainer = document.querySelector(EJS_player);
         if(gameContainer) gameContainer.textContent = "Emulator configuration error: Cannot load settings.";
         return; // Stop execution
    }

    // --- 3. Assign fetched settings globally for EmulatorJS ---
    // EJS_pathtodata is crucial for finding loader.js later
    window.EJS_color = settings.EJS_color;
    window.EJS_pathtodata = settings.EJS_pathtodata;

    // --- 4. Load and Assign Controls ---
    // Determine the controls variable name based on the core
    const controlsVarName = `EJS_defaultControls_${EJS_core}`; // e.g., EJS_defaultControls_arcade

    // Check if the controls object (loaded via separate <script> tag) exists
    if (typeof window[controlsVarName] !== 'undefined') {
        window.EJS_defaultControls = window[controlsVarName]; // Assign the correct controls object
    } else {
        console.error(`Error: Controls object '${controlsVarName}' not found. Make sure the correct controls JS file (e.g., controls_${EJS_core}.js) was loaded.`);
        // Assign empty controls to potentially allow loading, but show warning
         window.EJS_defaultControls = { 0:{}, 1:{}, 2:{}, 3:{} };
         // Display error message
         const gameContainer = document.querySelector(EJS_player);
         if(gameContainer) gameContainer.textContent = `Emulator configuration error: Cannot load controls for core '${EJS_core}'.`;
        // Optionally stop execution here if controls are critical
        // return;
    }

    // --- 5. Load the EmulatorJS main loader ---
    if (window.EJS_pathtodata) {
        const loaderScript = document.createElement('script');
        loaderScript.src = `${window.EJS_pathtodata}loader.js`;
        loaderScript.onerror = () => {
            console.error("Error loading EmulatorJS loader.js from:", loaderScript.src);
            const gameContainer = document.querySelector(EJS_player);
            if(gameContainer) gameContainer.textContent = "Error loading EmulatorJS core.";
        };
        document.body.appendChild(loaderScript);
    } else {
        console.error("EJS_pathtodata is not defined. Cannot load loader.js.");
        const gameContainer = document.querySelector(EJS_player);
        if(gameContainer) gameContainer.textContent = "Emulator configuration error: Path to data missing.";
    }
}

// --- Execute Setup ---
// Use DOMContentLoaded to ensure the minimal HTML is parsed, and EJS_core is available.
document.addEventListener('DOMContentLoaded', () => {
    if (typeof EJS_core !== 'undefined') {
        // Dynamically create a script tag to load the *correct* controls file
        const controlsScript = document.createElement('script');
        // IMPORTANT: Adjust the path based on where index.html is relative to /config/
        controlsScript.src = `../config/controls_${EJS_core}.js`;
        controlsScript.async = false; // Try to ensure it loads and executes before setupEmulator runs

        controlsScript.onload = () => {
            // Once the controls script has loaded, run the main setup
            setupEmulator();
        };
        controlsScript.onerror = () => {
            console.error(`Failed to load control script: ${controlsScript.src}`);
            // Try running setup anyway, it will handle the missing controls
             setupEmulator();
        };
        document.head.appendChild(controlsScript); // Append to head to load early
    } else {
        console.error("EJS_core was not defined in the HTML before DOMContentLoaded.");
         const gameContainer = document.querySelector('#game'); // Assume default selector if EJS_player isn't set
         if(gameContainer) gameContainer.textContent = "Emulator configuration error: EJS_core not defined.";
    }
});
