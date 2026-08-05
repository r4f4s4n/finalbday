function getLoaderOptions(options) {
    const globalOptions = window.__FB_LOADER_OPTIONS || {};
    return {
        stripParentPrefix: false,
        replaceAssetParentPrefix: false,
        ...globalOptions,
        ...(options || {})
    };
}

function normalizeFetchPath(path, options) {
    if (options.stripParentPrefix && path.startsWith('../')) {
        return path.slice(3);
    }
    return path;
}

function normalizeComponentMarkup(markup, options) {
    if (!options.replaceAssetParentPrefix) {
        return markup;
    }
    return markup.replace(/\.\.\/assets\//g, 'assets/');
}

async function loadComponentInto(selector, url, options) {
    const container = document.querySelector(selector);
    if (!container) {
        return;
    }

    const effectiveOptions = getLoaderOptions(options);
    const normalizedUrl = normalizeFetchPath(url, effectiveOptions);
    const cachedMarkup = window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.getText === 'function'
        ? window.FinalBdayAssetCache.getText(normalizedUrl)
        : '';

    let rawMarkup = cachedMarkup;
    if (!rawMarkup) {
        const fetchController = new AbortController();
        const fetchTimeoutId = setTimeout(() => fetchController.abort(), 30000);
        let fetchResponse;
        try {
            fetchResponse = await fetch(normalizedUrl, { cache: 'no-store', signal: fetchController.signal });
        } finally {
            clearTimeout(fetchTimeoutId);
        }
        if (!fetchResponse.ok) {
            throw new Error(`No se pudo cargar ${normalizedUrl}: ${fetchResponse.status}`);
        }

        rawMarkup = await fetchResponse.text();
    }
    container.innerHTML = normalizeComponentMarkup(rawMarkup, effectiveOptions);
}

async function loadComponents(components, options) {
    const entries = Object.entries(components);
    await Promise.all(entries.map(([selector, url]) => loadComponentInto(selector, url, options)));
}

window.loadComponentInto = loadComponentInto;
window.loadComponents = loadComponents;
