const TRUCS_URL = '/config/loading-tips.txt';

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
    }
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('theme-dark')) {
        body.classList.remove('theme-dark');
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('theme-dark');
        localStorage.setItem('theme', 'dark');
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

// Escapes the tip text, then turns any http(s) URL into a real clickable link.
function linkify(text) {
    return escapeHtml(text).replace(/https?:\/\/[^\s]+/g, (url) => {
        let trailing = '';
        const trailingMatch = url.match(/[.,;:!?)\]]+$/);
        if (trailingMatch) {
            trailing = trailingMatch[0];
            url = url.slice(0, -trailing.length);
        }
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${trailing}`;
    });
}

async function loadTrucs() {
    const stateEl = document.getElementById('trucs-state');
    const listEl = document.getElementById('trucs-list');

    try {
        const response = await fetch(TRUCS_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();

        const tips = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (tips.length === 0) {
            stateEl.textContent = 'Aucun truc pour le moment.';
            stateEl.classList.remove('loading');
            return;
        }

        listEl.innerHTML = tips
            .map((tip, index) => `
                <div class="trucs-row">
                    <span class="trucs-row-number">${index + 1}</span>
                    <span class="trucs-row-text">${linkify(tip)}</span>
                </div>
            `)
            .join('');

        stateEl.style.display = 'none';
    } catch (e) {
        console.warn('Could not load tips:', e);
        stateEl.textContent = "Impossible de charger les trucs pour l'instant.";
        stateEl.classList.remove('loading');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    loadTrucs();
});
