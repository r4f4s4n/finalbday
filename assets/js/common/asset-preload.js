(function () {
    const BASE_PRELOAD_TIMEOUT_MS = 25000;
    const FAILED_PRELOAD_RETRY_MS = 15000;

    function isLikelyMobileDevice() {
        return window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    }

    function getPreloadTimeoutMs() {
        return isLikelyMobileDevice() ? 60000 : BASE_PRELOAD_TIMEOUT_MS;
    }

    function getMaxConcurrentPreloads() {
        return isLikelyMobileDevice() ? 3 : 3;
    }

    function createController(options) {
        const settings = options || {};
        const onIntroBirdsReady = typeof settings.onIntroBirdsReady === 'function'
            ? settings.onIntroBirdsReady
            : function () {};
        const initPrincipalApp = typeof settings.initPrincipalApp === 'function'
            ? settings.initPrincipalApp
            : async function () {};

        const retainedPreloadedResources = new Map();
        const failedPreloadResources = new Map();
        let failedPreloadRetryTimerId = null;

        function toAbsoluteResourceUrl(url) {
            return new URL(url, location.href).href;
        }

        function isBlobBackedAsset(pathname) {
            return (
                pathname.endsWith('.png') ||
                pathname.endsWith('.jpg') ||
                pathname.endsWith('.jpeg') ||
                pathname.endsWith('.gif') ||
                pathname.endsWith('.webp') ||
                pathname.endsWith('.ico') ||
                pathname.endsWith('.mp4') ||
                pathname.endsWith('.webm') ||
                pathname.endsWith('.ogg') ||
                pathname.endsWith('.mp3') ||
                pathname.endsWith('.wav') ||
                pathname.endsWith('.m4a')
            );
        }

        function getCachedResolvedUrl(url) {
            const absoluteUrl = toAbsoluteResourceUrl(url);
            const cachedEntry = retainedPreloadedResources.get(absoluteUrl);
            return cachedEntry && cachedEntry.objectUrl ? cachedEntry.objectUrl : absoluteUrl;
        }

        function getCachedText(url) {
            const absoluteUrl = toAbsoluteResourceUrl(url);
            const cachedEntry = retainedPreloadedResources.get(absoluteUrl);
            return cachedEntry && typeof cachedEntry.text === 'string' ? cachedEntry.text : '';
        }

        function rememberFailedPreload(url, errorMessage) {
            const absoluteUrl = toAbsoluteResourceUrl(url);
            const previous = failedPreloadResources.get(absoluteUrl);
            failedPreloadResources.set(absoluteUrl, {
                attempts: previous ? previous.attempts + 1 : 1,
                lastError: errorMessage || 'Error desconocido',
                lastAttemptAt: Date.now()
            });
            scheduleFailedPreloadRetry();
        }

        function clearFailedPreload(url) {
            failedPreloadResources.delete(toAbsoluteResourceUrl(url));
        }

        function setElementAssetSource(element, url) {
            if (!element || !url) return;

            const absoluteUrl = toAbsoluteResourceUrl(url);
            const resolvedUrl = getCachedResolvedUrl(absoluteUrl);
            const currentOriginal = element.getAttribute('data-asset-original-src');
            const currentResolved = element.getAttribute('src') || '';

            if (currentOriginal === absoluteUrl && currentResolved === resolvedUrl) {
                return;
            }

            element.setAttribute('data-asset-original-src', absoluteUrl);
            element.setAttribute('src', resolvedUrl);
        }

        function hydrateSourceChildren(mediaEl) {
            const sourceEls = mediaEl.querySelectorAll('source[src], source[data-asset-original-src]');
            let hasChanges = false;

            sourceEls.forEach((sourceEl) => {
                const originalAttr = sourceEl.getAttribute('data-asset-original-src') || sourceEl.getAttribute('src');
                if (!originalAttr) return;

                const absoluteUrl = toAbsoluteResourceUrl(originalAttr);
                const resolvedUrl = getCachedResolvedUrl(absoluteUrl);
                if (sourceEl.getAttribute('src') === resolvedUrl && sourceEl.getAttribute('data-asset-original-src') === absoluteUrl) {
                    return;
                }

                sourceEl.setAttribute('data-asset-original-src', absoluteUrl);
                sourceEl.setAttribute('src', resolvedUrl);
                hasChanges = true;
            });

            if (hasChanges && typeof mediaEl.load === 'function') {
                mediaEl.load();
            }
        }

        function hydrateExistingMediaTree(root) {
            const scope = root || document;

            scope.querySelectorAll('img[src]').forEach((imgEl) => {
                const originalAttr = imgEl.getAttribute('data-asset-original-src') || imgEl.getAttribute('src');
                if (!originalAttr) return;
                setElementAssetSource(imgEl, originalAttr);
            });

            scope.querySelectorAll('video, audio').forEach((mediaEl) => {
                const directSrc = mediaEl.getAttribute('data-asset-original-src') || mediaEl.getAttribute('src');
                if (directSrc) {
                    const beforeSrc = mediaEl.getAttribute('src') || '';
                    setElementAssetSource(mediaEl, directSrc);
                    if ((mediaEl.getAttribute('src') || '') !== beforeSrc && typeof mediaEl.load === 'function') {
                        mediaEl.load();
                    }
                }

                hydrateSourceChildren(mediaEl);
            });

            scope.querySelectorAll('source[src], source[data-asset-original-src]').forEach((sourceEl) => {
                const originalAttr = sourceEl.getAttribute('data-asset-original-src') || sourceEl.getAttribute('src');
                if (!originalAttr) return;

                const absoluteUrl = toAbsoluteResourceUrl(originalAttr);
                const resolvedUrl = getCachedResolvedUrl(absoluteUrl);

                if (sourceEl.getAttribute('src') !== resolvedUrl) {
                    sourceEl.setAttribute('src', resolvedUrl);
                }

                if (!sourceEl.getAttribute('data-asset-original-src')) {
                    sourceEl.setAttribute('data-asset-original-src', absoluteUrl);
                }
            });
        }

        async function fetchResourceBlob(url, timeoutMs) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url, {
                    cache: 'no-store',
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }

                return await response.blob();
            } finally {
                clearTimeout(timeoutId);
            }
        }

        async function preloadResource(url, options) {
            const absoluteUrl = toAbsoluteResourceUrl(url);
            if (retainedPreloadedResources.has(absoluteUrl)) {
                return true;
            }

            const parsed = new URL(absoluteUrl);
            const pathname = parsed.pathname.toLowerCase();

            try {
                if (isBlobBackedAsset(pathname)) {
                    const blob = await fetchResourceBlob(absoluteUrl, getPreloadTimeoutMs());
                    const objectUrl = URL.createObjectURL(blob);

                    retainedPreloadedResources.set(absoluteUrl, {
                        absoluteUrl: absoluteUrl,
                        kind: 'binary',
                        objectUrl: objectUrl
                    });
                    clearFailedPreload(absoluteUrl);
                    return true;
                }

                const response = await fetch(absoluteUrl, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }

                const text = await response.text();
                retainedPreloadedResources.set(absoluteUrl, {
                    absoluteUrl: absoluteUrl,
                    text: text,
                    kind: 'text'
                });
                clearFailedPreload(absoluteUrl);
                return true;
            } catch (error) {
                const message = error && error.name === 'AbortError'
                    ? 'Timeout de precarga'
                    : (error && error.message) || 'Error de precarga';
                rememberFailedPreload(absoluteUrl, message);

                if (!options || !options.isRetry) {
                    console.warn('Precarga fallida:', absoluteUrl, message);
                }

                return false;
            }
        }

        async function preloadAllResources(resourceUrls, options) {
            const cfg = options || {};
            const maxConcurrent = getMaxConcurrentPreloads();
            let index = 0;

            async function worker() {
                while (index < resourceUrls.length) {
                    const currentIndex = index;
                    index += 1;
                    const url = resourceUrls[currentIndex];

                    try {
                        const loaded = await preloadResource(url);

                        if (loaded && typeof cfg.onResourceLoaded === 'function') {
                            cfg.onResourceLoaded(url);
                        }

                        if (loaded && isCustomAssetUrl(url) && typeof cfg.onCustomLoaded === 'function') {
                            cfg.onCustomLoaded(url);
                        }
                    } catch (error) {
                        console.warn('Error de precarga:', url, error);
                    }
                }
            }

            const workers = [];
            const workerCount = Math.min(maxConcurrent, resourceUrls.length);
            for (let i = 0; i < workerCount; i++) {
                workers.push(worker());
            }

            await Promise.all(workers);
        }

        async function retryFailedPreloads() {
            failedPreloadRetryTimerId = null;

            const failedUrls = Array.from(failedPreloadResources.keys());
            for (const url of failedUrls) {
                try {
                    const loaded = await preloadResource(url, { isRetry: true });
                    if (loaded) {
                        hydrateExistingMediaTree(document);
                    }
                } catch (error) {
                    console.warn('Reintento de precarga fallido:', url, error);
                }
            }

            if (failedPreloadResources.size > 0) {
                scheduleFailedPreloadRetry();
            }
        }

        function scheduleFailedPreloadRetry() {
            if (failedPreloadRetryTimerId !== null) {
                return;
            }

            failedPreloadRetryTimerId = setTimeout(() => {
                retryFailedPreloads().catch((error) => {
                    console.warn('No se pudo reintentar la precarga fallida:', error);
                    failedPreloadRetryTimerId = null;
                    if (failedPreloadResources.size > 0) {
                        scheduleFailedPreloadRetry();
                    }
                });
            }, FAILED_PRELOAD_RETRY_MS);
        }

        function isCustomAssetUrl(url) {
            try {
                const parsed = new URL(url, location.href);
                return parsed.pathname.indexOf('/assets/customs/') !== -1;
            } catch (error) {
                return false;
            }
        }

        function isFaviconAssetUrl(url) {
            try {
                const parsed = new URL(url, location.href);
                return parsed.pathname.indexOf('/assets/icons/') !== -1;
            } catch (error) {
                return false;
            }
        }

        function isMediaAssetUrl(url) {
            try {
                const parsed = new URL(url, location.href);
                return parsed.pathname.indexOf('/assets/backgrounds/') !== -1 || parsed.pathname.indexOf('/assets/audios/') !== -1;
            } catch (error) {
                return false;
            }
        }

        function discoverResources() {
            return window.FinalBdayResourceManifest.build();
        }

        async function preloadAppResources(options) {
            const cfg = options || {};
            const resources = await discoverResources();
            const faviconResources = resources.filter((url) => isFaviconAssetUrl(url));
            const mediaResources = resources.filter((url) => isMediaAssetUrl(url));
            const customResources = resources.filter((url) => isCustomAssetUrl(url));
            const otherResources = resources.filter((url) => {
                return !isFaviconAssetUrl(url) && !isMediaAssetUrl(url) && !isCustomAssetUrl(url);
            });

            await preloadAllResources(faviconResources, cfg);

            const introBirdsUrl = new URL('assets/audios/aves_16.mp3', location.href).href;
            const orderedMediaResources = mediaResources.slice().sort((left, right) => {
                if (left === introBirdsUrl) return -1;
                if (right === introBirdsUrl) return 1;
                return 0;
            });

            await preloadAllResources(orderedMediaResources, {
                ...cfg,
                onResourceLoaded: (url) => {
                    if (url === introBirdsUrl) {
                        hydrateExistingMediaTree(document);
                        onIntroBirdsReady();
                    }
                }
            });

            await preloadAllResources(otherResources, cfg);
            await preloadAllResources(customResources, cfg);

            await initPrincipalApp();
            hydrateExistingMediaTree(document);
        }

        window.FinalBdayAssetCache = {
            has(url) {
                return retainedPreloadedResources.has(toAbsoluteResourceUrl(url));
            },
            get(url) {
                return retainedPreloadedResources.get(toAbsoluteResourceUrl(url)) || null;
            },
            resolve(url) {
                return getCachedResolvedUrl(url);
            },
            getText(url) {
                return getCachedText(url);
            },
            setElementSource(element, url) {
                setElementAssetSource(element, url);
            },
            hydrateExistingMedia(root) {
                hydrateExistingMediaTree(root);
            },
            getFailedResources() {
                return Array.from(failedPreloadResources.entries()).map(([url, meta]) => ({
                    url: url,
                    attempts: meta.attempts,
                    lastError: meta.lastError,
                    lastAttemptAt: meta.lastAttemptAt
                }));
            },
            retryFailed() {
                return retryFailedPreloads();
            }
        };

        return {
            preloadAppResources: preloadAppResources
        };
    }

    window.FinalBdayAssetPreload = {
        createController: createController
    };
})();
