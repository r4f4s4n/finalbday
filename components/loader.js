async function loadComponentInto(selector, url) {
    const container = document.querySelector(selector);
    if (!container) {
        return;
    }

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`No se pudo cargar ${url}: ${response.status}`);
    }

    container.innerHTML = await response.text();
}

async function loadComponents(components) {
    const entries = Object.entries(components);
    await Promise.all(entries.map(([selector, url]) => loadComponentInto(selector, url)));
}

window.loadComponents = loadComponents;
