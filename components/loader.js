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
    const response = await fetch(normalizedUrl, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`No se pudo cargar ${normalizedUrl}: ${response.status}`);
    }

    const rawMarkup = await response.text();
    container.innerHTML = normalizeComponentMarkup(rawMarkup, effectiveOptions);
}

async function loadComponents(components, options) {
    const entries = Object.entries(components);
    await Promise.all(entries.map(([selector, url]) => loadComponentInto(selector, url, options)));
}

window.loadComponentInto = loadComponentInto;
window.loadComponents = loadComponents;
