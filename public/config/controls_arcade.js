// Controls configuration for Arcade (MAME) Core
const EJS_defaultControls_arcade = {
    0: {
        0: {'value': 'z', 'value2': 'BUTTON_1'},
        1: {'value': 's', 'value2': 'BUTTON_4'},
        2: {'value': 'shift', 'value2': 'SELECT'},
        3: {'value': 'enter', 'value2': 'START'},
        4: {'value': 'up arrow', 'value2': 'DPAD_UP'},
        5: {'value': 'down arrow', 'value2': 'DPAD_DOWN'},
        6: {'value': 'left arrow', 'value2': 'DPAD_LEFT'},
        7: {'value': 'right arrow', 'value2': 'DPAD_RIGHT'},
        8: {'value': 'x', 'value2': 'BUTTON_2'},
        9: {'value': 'a', 'value2': 'BUTTON_3'},
        10: {'value': 'q', 'value2': 'LEFT_TOP_SHOULDER'},
        11: {'value': 'e', 'value2': 'RIGHT_TOP_SHOULDER'},
        12: {'value': 'tab', 'value2': 'LEFT_BOTTOM_SHOULDER'},
        13: {'value': 'r', 'value2': 'RIGHT_BOTTOM_SHOULDER'},
        // ... include all other necessary mappings ...
         29: {'value': 'subtract'}
    },
    1: {}, 2: {}, 3: {} // Player 2, 3, 4 controls if needed
};

// Make it available globally or in a way the loader script can access it.
// If loaded via <script>, it might be available on `window`.
// If using modules, you'd export it. For simplicity now, let's assume global scope via <script> tag.
window.EJS_defaultControls_arcade = EJS_defaultControls_arcade;
