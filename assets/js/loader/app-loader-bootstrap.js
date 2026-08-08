let progressFill = null;
let progressText = null;
let progressCount = null;
let statusText = null;
let loaderPage = null;
let introView = null;
let principalView = null;
let introOverlay = null;
let introBgVideo = null;
let introTransitionVideo = null;
let globalBgMusic = null;
let introBgBirds = null;
let cembeBgMusic = null;
let audioStatusButton = null;
let audioStatusIcon = null;
let cembeNavButton = null;
let cembeView = null;
let btnStart = null;
let introAudio = null;
let audioStatusController = null;
let audioStatusReadyPollId = null;
let audioStatusRevealTimeoutId = null;

window.__FB_LOADER_OPTIONS = {
    stripParentPrefix: true,
    replaceAssetParentPrefix: true
};

const AUDIO_STATUS_REVEAL_DELAY_MS = 1000;
const LOADER_STATUS_CONFIG_PATH = 'assets/js/loader/loader-status-prompts.json';
const DEFAULT_LOADER_STATUS_MESSAGES = [
    'Disfrazando al personal...',
    'Enfriándo la cerveza...',
    'Encendiendo el megatron...'
];
const DEFAULT_LOADER_STATUS_DURATION_MS = 2000;

let loaderStatusMessages = DEFAULT_LOADER_STATUS_MESSAGES.slice();
let loaderStatusDurationMs = DEFAULT_LOADER_STATUS_DURATION_MS;

function bindDomRefs() {
    progressFill = document.getElementById('progress-fill');
    progressText = document.getElementById('progress-text');
    progressCount = document.getElementById('progress-count');
    statusText = document.getElementById('status-text');
    loaderPage = document.getElementById('loader-page');
    introView = document.getElementById('intro-view');
    principalView = document.getElementById('principal-view');
    introOverlay = document.getElementById('intro-overlay');
    introBgVideo = document.getElementById('intro-bg-video');
    introTransitionVideo = document.getElementById('intro-transition-video');
    globalBgMusic = document.getElementById('global-bg-music');
    introBgBirds = document.getElementById('intro-bg-birds');
    cembeBgMusic = document.getElementById('cembe-bg-music');
    audioStatusButton = document.getElementById('audio-status-button');
    audioStatusIcon = document.getElementById('audio-status-icon');
    cembeNavButton = document.getElementById('cembe-nav-button');
    cembeView = document.getElementById('cembe-view');
    btnStart = document.getElementById('btn-start');
}

function setAudioStatusButtonVisibility(isVisible) {
    if (!audioStatusButton) return;

    audioStatusButton.style.visibility = isVisible ? 'visible' : 'hidden';
    audioStatusButton.style.pointerEvents = isVisible ? 'auto' : 'none';
}

function isGlobalMusicReadyToPlayThrough() {
    if (!globalBgMusic) return false;

    const hasSource = !!(globalBgMusic.currentSrc || globalBgMusic.getAttribute('src'));
    return hasSource && globalBgMusic.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;
}

function setupAudioStatusButtonGate() {
    if (!audioStatusButton || !globalBgMusic) return;

    setAudioStatusButtonVisibility(false);

    const revealIfReady = () => {
        if (!isGlobalMusicReadyToPlayThrough()) return;

        globalBgMusic.removeEventListener('canplaythrough', revealIfReady);
        globalBgMusic.removeEventListener('loadeddata', revealIfReady);
        globalBgMusic.removeEventListener('canplay', revealIfReady);

        if (audioStatusReadyPollId !== null) {
            clearInterval(audioStatusReadyPollId);
            audioStatusReadyPollId = null;
        }

        if (audioStatusRevealTimeoutId !== null) {
            clearTimeout(audioStatusRevealTimeoutId);
            audioStatusRevealTimeoutId = null;
        }

        audioStatusRevealTimeoutId = setTimeout(() => {
            setAudioStatusButtonVisibility(true);
            audioStatusRevealTimeoutId = null;
        }, AUDIO_STATUS_REVEAL_DELAY_MS);
    };

    globalBgMusic.addEventListener('canplaythrough', revealIfReady);
    globalBgMusic.addEventListener('loadeddata', revealIfReady);
    globalBgMusic.addEventListener('canplay', revealIfReady);

    // Fallback para navegadores que hidratan/precargan desde cache sin emitir
    // siempre el mismo set de eventos.
    if (audioStatusReadyPollId !== null) {
        clearInterval(audioStatusReadyPollId);
    }
    audioStatusReadyPollId = setInterval(revealIfReady, 150);

    revealIfReady();
}

function setupLoaderAudioUnlock() {
    if (!loaderPage) return;

    const eventNames = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];

    function detachListeners() {
        eventNames.forEach(function (eventName) {
            loaderPage.removeEventListener(eventName, onFirstUserGesture);
        });
    }

    function onFirstUserGesture(event) {
        const eventTarget = event && event.target;

        // Si la interacción nace en el propio botón de audio, dejamos que
        // actúe solo su controlador y no disparamos también el unlock global.
        if (eventTarget && eventTarget.closest && eventTarget.closest('#audio-status-button')) {
            return;
        }

        detachListeners();

        if (audioStatusController && audioStatusController.isMuted()) {
            return;
        }

        introAudio.startIntroBirdsMusic();
    }

    eventNames.forEach(function (eventName) {
        loaderPage.addEventListener(eventName, onFirstUserGesture, { passive: true });
    });
}

function initAudioControllers() {
    introAudio = window.FinalBdayIntroAudio.createController({
        introBirdsEl: introBgBirds,
        globalMusicEl: globalBgMusic,
        stopIntroDelayMs: 1000
    });

    // El controller decide qué pista reanudar (aves, música principal o CEMBE)
    // según la vista activa en el momento en que el usuario reactiva el sonido.
    audioStatusController = window.FinalBdayAudioStatusButton.createController({
        buttonEl: audioStatusButton,
        iconEl: audioStatusIcon,
        audioElements: [introBgBirds, globalBgMusic, cembeBgMusic],
        initialMuted: false,
        iconMutedSrc: 'assets/icons/vol-mute.png',
        iconPlaySrc: 'assets/icons/vol-play.png',
        onMute: function () {
            introAudio.clearTimers();
        },
        onResume: function () {
            const activeDoorsScreen = document.getElementById('doors-screen');
            const activeCembeView = document.getElementById('cembe-view');
            if (activeDoorsScreen && activeDoorsScreen.style.display === 'flex') {
                if (window.FinalBdayPrincipalApp && typeof window.FinalBdayPrincipalApp.handleDoorsAudioResume === 'function') {
                    window.FinalBdayPrincipalApp.handleDoorsAudioResume();
                    return;
                }
            }
            if (activeCembeView && activeCembeView.classList.contains('is-visible')) {
                cembeBgMusic.play().catch(() => {});
            } else if (principalView.classList.contains('is-active') || introOverlay.style.display === 'none') {
                introAudio.startGlobalBackgroundMusic();
            } else {
                introAudio.startIntroBirdsMusic();
            }
        }
    });

    // Expuesto para que principal-app.js pueda consultar si el usuario
    // silenció el sonido antes de reanudar la pista de CEMBE.
    window.FinalBdayAppAudioController = audioStatusController;
}

async function loadTopLevelViews() {
    await loadComponents({
        '[data-component="loader-view"]': 'components/app-loader-view.html',
        '[data-component="intro-view"]': 'components/app-intro-view.html',
        '[data-component="principal-view"]': 'components/app-principal-view.html',
        '[data-component="global-audio-ui"]': 'components/app-global-audio-ui.html'
    });
}

function setupUiEvents() {
    if (btnStart) {
        btnStart.addEventListener('click', iniciarTransicionIntro);
    }

    if (cembeNavButton) {
        cembeNavButton.addEventListener('click', openCembePage);
    }
}

let principalInitPromise = null;
let principalAppReady = false;
let appReady = false;
let introTransitionStarted = false;
let startMusicTimeoutId = null;
const POST_LOAD_WAIT_MS = 10000;
let preloadController = null;

function getPreloadController() {
    if (preloadController) {
        return preloadController;
    }

    if (!window.FinalBdayAssetPreload || typeof window.FinalBdayAssetPreload.createController !== 'function') {
        throw new Error('No se pudo inicializar assets/js/common/asset-preload.js');
    }

    preloadController = window.FinalBdayAssetPreload.createController({
        onIntroBirdsReady: function () {
            if (introAudio) {
                introAudio.startIntroBirdsMusic();
            }
        },
        initPrincipalApp: initPrincipalApp
    });

    return preloadController;
}

function updateProgress(done, total, statusMessage) {
    const safeDone = Math.max(0, done);
    const safeTotal = total > 0 ? total : 1;
    const percent = Math.max(0, Math.min(100, Math.round((safeDone / safeTotal) * 100)));
    progressFill.style.width = percent + '%';
    progressText.textContent = percent + '%';
    const visibleDone = Math.max(0, Math.min(safeTotal, safeDone));
    const visibleTotal = safeTotal;
    progressCount.textContent = visibleDone + ' / ' + visibleTotal;
    if (statusMessage) {
        statusText.textContent = statusMessage;
    }
    const progressbar = document.querySelector('.progress-wrap');
    progressbar.setAttribute('aria-valuenow', String(percent));
}

function getCustomsTotal() {
    if (!window.FinalBdayCustomsData || typeof window.FinalBdayCustomsData.getData !== 'function') {
        return 121;
    }

    const customsData = window.FinalBdayCustomsData.getData();
    return Object.keys(customsData).length;
}

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function getLoaderStatusMessage(bootStartAt) {
    const safeDurationMs = Math.max(1, Number(loaderStatusDurationMs) || DEFAULT_LOADER_STATUS_DURATION_MS);
    const elapsedMs = Math.max(0, performance.now() - bootStartAt);
    const maxIndex = Math.max(0, loaderStatusMessages.length - 1);
    const currentIndex = Math.min(Math.floor(elapsedMs / safeDurationMs), maxIndex);
    return loaderStatusMessages[currentIndex] || DEFAULT_LOADER_STATUS_MESSAGES[0];
}

async function loadLoaderStatusConfig() {
    try {
        const cachedText = window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.getText === 'function'
            ? window.FinalBdayAssetCache.getText(LOADER_STATUS_CONFIG_PATH)
            : '';

        let rawJson = cachedText;
        if (!rawJson) {
            const response = await fetch(LOADER_STATUS_CONFIG_PATH, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('No se pudo cargar loader-status-prompts.json: ' + response.status);
            }
            rawJson = await response.json();
        } else {
            rawJson = JSON.parse(rawJson);
        }

        const data = rawJson;
        if (!data || !Array.isArray(data.messages)) {
            throw new Error('Formato invalido en loader-status-prompts.json');
        }

        const cleanedMessages = data.messages
            .map((text) => (typeof text === 'string' ? text.trim() : ''))
            .filter(Boolean);

        if (cleanedMessages.length) {
            loaderStatusMessages = cleanedMessages;
        }

        if (typeof data.durationMs === 'number' && Number.isFinite(data.durationMs) && data.durationMs > 0) {
            loaderStatusDurationMs = Math.round(data.durationMs);
        }
    } catch (error) {
        console.warn('[FinalBday] Usando textos fallback para estado de carga:', error);
        loaderStatusMessages = DEFAULT_LOADER_STATUS_MESSAGES.slice();
        loaderStatusDurationMs = DEFAULT_LOADER_STATUS_DURATION_MS;
    }
}

function isCustomResourceUrl(url) {
    try {
        const parsed = new URL(url, location.href);
        return parsed.pathname.indexOf('/assets/customs/') !== -1;
    } catch (error) {
        return false;
    }
}

function syncLoadedCustomCount() {
    if (!window.FinalBdayAssetCache || !window.FinalBdayResourceManifest) {
        return 0;
    }

    if (typeof window.FinalBdayResourceManifest.build !== 'function' || typeof window.FinalBdayAssetCache.has !== 'function') {
        return 0;
    }

    const manifestResources = window.FinalBdayResourceManifest.build();
    const customResources = manifestResources.filter((url) => isCustomResourceUrl(url));

    return customResources.reduce((count, url) => {
        return window.FinalBdayAssetCache.has(url) ? count + 1 : count;
    }, 0);
}

async function initPrincipalApp() {
    if (principalInitPromise) return principalInitPromise;

    principalInitPromise = (async () => {
        // El CSS de la vista principal ya se sirve como assets/css/principal/principal.css
        // (Fase 5 del refactor). Ya no hace falta leer pages/app_principal.html
        // ni extraer su <style> por regex en tiempo de ejecución.
        if (!window.FinalBdayPrincipalApp || typeof window.FinalBdayPrincipalApp.init !== 'function') {
            throw new Error('No se pudo inicializar assets/js/principal/principal-app.js');
        }

        await window.FinalBdayPrincipalApp.init();
        principalAppReady = true;
    })();

    return principalInitPromise;
}

function hideLoaderWhenIntroReady() {
    if (!loaderPage || !introBgVideo) {
        if (loaderPage) {
            loaderPage.classList.add('is-hidden');
        }
        return;
    }

    const settle = () => {
        loaderPage.classList.add('is-hidden');
    };

    if (introBgVideo.readyState >= 2) {
        requestAnimationFrame(() => {
            requestAnimationFrame(settle);
        });
        return;
    }

    let settled = false;
    let fallbackTimeoutId = null;

    const cleanup = () => {
        introBgVideo.removeEventListener('loadeddata', onReady);
        introBgVideo.removeEventListener('canplay', onReady);
        introBgVideo.removeEventListener('playing', onReady);
        if (fallbackTimeoutId !== null) {
            clearTimeout(fallbackTimeoutId);
            fallbackTimeoutId = null;
        }
    };

    const onReady = () => {
        if (settled) return;
        settled = true;
        cleanup();
        requestAnimationFrame(() => {
            requestAnimationFrame(settle);
        });
    };

    introBgVideo.addEventListener('loadeddata', onReady);
    introBgVideo.addEventListener('canplay', onReady);
    introBgVideo.addEventListener('playing', onReady);
    fallbackTimeoutId = setTimeout(onReady, 450);
}

function enterIntro() {
    introView.classList.add('is-active');
    introBgVideo.play().catch(() => {});
    hideLoaderWhenIntroReady();
    appReady = true;
    introAudio.startIntroBirdsMusic();
    if (cembeNavButton) {
        cembeNavButton.classList.add('is-hidden');
        cembeNavButton.classList.remove('is-launching');
        cembeNavButton.removeAttribute('aria-disabled');
    }
}

function resetCembeNavButtonState() {
    if (!cembeNavButton) return;

    cembeNavButton.classList.remove('is-launching');
    cembeNavButton.removeAttribute('aria-disabled');
}

function openCembePage() {
    if (cembeNavButton && cembeNavButton.classList.contains('is-launching')) {
        return;
    }

    if (cembeNavButton) {
        cembeNavButton.classList.add('is-launching');
        cembeNavButton.setAttribute('aria-disabled', 'true');
    }

    setTimeout(() => {
        if (window.FinalBdayPrincipalApp && typeof window.FinalBdayPrincipalApp.showCembeView === 'function') {
            window.FinalBdayPrincipalApp.showCembeView();
        }
        resetCembeNavButtonState();
    }, 2000);
}

function transitionToPrincipal() {
    if (!principalAppReady) return;
    principalView.classList.add('is-active');
    introView.classList.remove('is-active');
    if (cembeNavButton) {
        cembeNavButton.classList.remove('is-hidden');
    }

    if (window.FinalBdayPrincipalApp && typeof window.FinalBdayPrincipalApp.resetIdleState === 'function') {
        window.FinalBdayPrincipalApp.resetIdleState();
    }
}

window.addEventListener('pageshow', resetCembeNavButtonState);

function iniciarTransicionIntro() {
    if (!appReady || introTransitionStarted) return;
    introTransitionStarted = true;
    btnStart.disabled = true;

    if (startMusicTimeoutId !== null) {
        clearTimeout(startMusicTimeoutId);
    }
    startMusicTimeoutId = setTimeout(() => {
        introAudio.startGlobalBackgroundMusic();
        startMusicTimeoutId = null;
    }, 5000);

    introAudio.startIntroBirdsMusic();

    introOverlay.classList.add('is-fading-out');
    introOverlay.style.pointerEvents = 'none';
    setTimeout(() => {
        introOverlay.style.display = 'none';
    }, 360);
    introTransitionVideo.muted = true;
    introTransitionVideo.volume = 0;

    try {
        introTransitionVideo.currentTime = 0;
    } catch (_) {
        // Puede fallar si el navegador aún no permite seek.
    }

    const revealTransitionFrame = () => {
        introTransitionVideo.style.opacity = '1';
        introBgVideo.style.opacity = '0';
        setTimeout(() => {
            introBgVideo.style.display = 'none';
        }, 260);
    };

    const onTransitionPlaying = () => {
        introTransitionVideo.removeEventListener('playing', onTransitionPlaying);
        revealTransitionFrame();
    };

    introTransitionVideo.addEventListener('playing', onTransitionPlaying, { once: true });
    introTransitionVideo.play().catch(() => {
        revealTransitionFrame();
    });

    // Fallback para navegadores que no disparan `playing` con rapidez.
    setTimeout(() => {
        if (introTransitionVideo.style.opacity !== '1') {
            revealTransitionFrame();
        }
    }, 220);

    setTimeout(() => {
        transitionToPrincipal();
    }, 6500);
}

async function boot() {
    try {
        await loadTopLevelViews();
        bindDomRefs();
        setupAudioStatusButtonGate();
        initAudioControllers();
        setupLoaderAudioUnlock();
        setupUiEvents();
        const assetPreload = getPreloadController();

        const totalCustoms = getCustomsTotal();
        const minVisibleCount = Math.max(1, Math.round(totalCustoms * 0.01));
        let loadedCustoms = 0;
        let simulatedCustoms = minVisibleCount;
        let simulationLockedToReal = false;
        let simulationTimerId = null;
        const bootStartAt = performance.now();

        await loadLoaderStatusConfig();

        function getShownCustoms() {
            return simulationLockedToReal
                ? Math.max(minVisibleCount, loadedCustoms)
                : Math.max(minVisibleCount, loadedCustoms, simulatedCustoms);
        }

        function stopSimulation() {
            if (simulationTimerId !== null) {
                clearInterval(simulationTimerId);
                simulationTimerId = null;
            }
            simulationLockedToReal = true;
        }

        updateProgress(getShownCustoms(), totalCustoms, getLoaderStatusMessage(bootStartAt));

        simulationTimerId = setInterval(() => {
            if (simulationLockedToReal) return;
            if (simulatedCustoms < totalCustoms - 1) {
                simulatedCustoms += 1;
            }

            if (loadedCustoms >= simulatedCustoms) {
                stopSimulation();
            }

            updateProgress(getShownCustoms(), totalCustoms, getLoaderStatusMessage(bootStartAt));
        }, loaderStatusDurationMs);

        try {
            await assetPreload.preloadAppResources({
                onCustomLoaded: () => {
                    loadedCustoms += 1;

                    if (!simulationLockedToReal && loadedCustoms >= simulatedCustoms) {
                        stopSimulation();
                    }

                    updateProgress(getShownCustoms(), totalCustoms, getLoaderStatusMessage(bootStartAt));
                }
            });
        } catch (error) {
            console.warn('Precarga no crítica con errores; continuamos con reintento en segundo plano.', error);
        }

        loadedCustoms = syncLoadedCustomCount();

        const failedResources = window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.getFailedResources === 'function'
            ? window.FinalBdayAssetCache.getFailedResources()
            : [];
        const failedCustomResources = failedResources.filter((resource) => isCustomResourceUrl(resource.url));

        if (failedCustomResources.length > 0 && window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.retryFailed === 'function') {
            updateProgress(getShownCustoms(), totalCustoms, 'Reintentando recursos pendientes...');
            try {
                await window.FinalBdayAssetCache.retryFailed();
            } catch (error) {
                console.warn('No se pudo completar el reintento inmediato de recursos pendientes.', error);
            }

            loadedCustoms = syncLoadedCustomCount();
        }

        stopSimulation();

        const elapsedMs = performance.now() - bootStartAt;
        const waitRemainingMs = POST_LOAD_WAIT_MS - elapsedMs;
        if (waitRemainingMs > 0) {
            updateProgress(getShownCustoms(), totalCustoms, 'Conectando cables...');
            await waitMs(waitRemainingMs);
        }

        updateProgress(
            getShownCustoms(),
            totalCustoms,
            loadedCustoms >= totalCustoms
                ? 'Conectando los últimos cables...'
                : 'Disfrazados, pero faltan por llegar algunas cosas de Amazon...'
        );
        setTimeout(enterIntro, 250);
    } catch (error) {
        if (statusText) {
            statusText.classList.add('error');
            statusText.textContent = 'Problemas con el repartidor de disfraces. Continuamos con lo que tenemos...';
        }
        console.error(error);
        setTimeout(enterIntro, 500);
    }
}

window.addEventListener('DOMContentLoaded', boot);
