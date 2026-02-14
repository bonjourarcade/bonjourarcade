(function () {
    // Disable on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('BonjourArcade: Analytics disabled on localhost');
        return;
    }

    // Disable if analytics=false query param is present (e.g. inside iframe)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('analytics') === 'false') {
        console.log('BonjourArcade: Analytics disabled via query param');
        return;
    }

    // BonjourArcade Analytics (Umami)
    const script = document.createElement('script');
    script.defer = true;
    script.src = "https://cloud.umami.is/script.js";
    script.setAttribute('data-website-id', "660e5f95-7427-4bee-b7a5-4f50fa389e4e");
    document.head.appendChild(script);
})();
