(function () {
    let initPromise = null;
    let cembeViewApi = null;
    let resetIdleStateApi = null;

    function isLegacyPagesContext() {
        return /\/pages\//.test(window.location.pathname);
    }

    function projectPath(path) {
        return isLegacyPagesContext() ? `../${path}` : path;
    }

    async function init() {
        if (initPromise) {
            return initPromise;
        }

        initPromise = (async () => {
    const shouldCrossfadeIn = document.documentElement.classList.contains('crossfade-enter');
    if (shouldCrossfadeIn) {
        sessionStorage.removeItem('fb-crossfade-to-principal');
        requestAnimationFrame(() => {
            document.body.classList.add('is-crossfade-visible');
        });
    }

    await loadComponents({
        '[data-component="controls"]': projectPath('components/principal/app-controls.html'),
        '[data-component="media-shell"]': projectPath('components/principal/app-media-shell.html'),
        '[data-component="confirm-dialog"]': projectPath('components/principal/app-confirm-dialog.html'),
        '[data-component="final-screen"]': projectPath('components/principal/app-final-screen.html'),
        '[data-component="cembe-view"]': projectPath('components/principal/app-cembe-view.html')
    });
	
		window.FinalBdayBackGuard.enable();

const customsData = window.FinalBdayCustomsData.getData();

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function findStartCustomId(data) {
    const match = Object.entries(data).find(([, item]) => item && item.isStart === true);
    return match ? parseInt(match[0], 10) : null;
}

function moveIdToFront(ids, targetId) {
    if (targetId === null) return ids;
    const index = ids.indexOf(targetId);
    if (index <= 0) return ids;

    const reordered = ids.slice();
    reordered.splice(index, 1);
    reordered.unshift(targetId);
    return reordered;
}

const FIRST_VISIT_STORAGE_KEY = 'fb-principal-first-visit-done';

function readStorageValue(key) {
    try {
        return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (_) {
        return sessionStorage.getItem(key);
    }
}

function markPrincipalVisitDone() {
    try {
        localStorage.setItem(FIRST_VISIT_STORAGE_KEY, '1');
    } catch (_) {
        // Si localStorage no está disponible, mantenemos fallback por sesión.
    }
    sessionStorage.setItem(FIRST_VISIT_STORAGE_KEY, '1');
}

const startCustomId = findStartCustomId(customsData);
//const isFirstPrincipalVisit = !readStorageValue(FIRST_VISIT_STORAGE_KEY);
const isFirstPrincipalVisit = true;

if (isFirstPrincipalVisit) {
    markPrincipalVisitDone();
}
    
const shuffledOrder = shuffleArray(Object.keys(customsData).map(Number));
const order = isFirstPrincipalVisit
    ? moveIdToFront(shuffledOrder, startCustomId)
    : shuffledOrder;
const wrapper = document.getElementById('slides-wrapper');
const swiperCategoryTag = document.getElementById('swiper-category-tag');
const IDLE_PROMPT_CONFIG_PATH = projectPath('assets/js/principal/idle-slide-prompts.json');
const IDLE_PROMPT_THRESHOLD_MS = 12000;
const INITIAL_PRINCIPAL_IDLE_EXTRA_MS = 10000;
const IDLE_PROMPT_DURATION_MS = 6000;
const ACTIVE_SLIDE_POLL_INTERVAL_MS = 250;

const fallbackIdlePrompts = [
    'ELIGEME',
    'SOY EL MEJOR DISFRAZ',
    'POR FAVOR SACAME DE AQUI'
];

let idlePromptMessages = fallbackIdlePrompts.slice();
let lastUserInteractionAt = Date.now();
let activeSlideBecameActiveAt = Date.now();
let activeSlidePromptLoopId = null;
let hasConsumedInitialPrincipalIdle = false;

let suppressSlideActivationUntil = 0;
let lastTouchZoomActivationAt = 0;

function pickRandomIdlePrompt() {
    if (!idlePromptMessages.length) {
        return fallbackIdlePrompts[0];
    }

    const index = Math.floor(Math.random() * idlePromptMessages.length);
    return idlePromptMessages[index];
}

function getIdlePromptThresholdMs() {
    return hasConsumedInitialPrincipalIdle
        ? IDLE_PROMPT_THRESHOLD_MS
        : IDLE_PROMPT_THRESHOLD_MS + INITIAL_PRINCIPAL_IDLE_EXTRA_MS;
}

function removeAllIdlePrompts() {
    wrapper.querySelectorAll('.slide-idle-prompt').forEach((node) => {
        node.remove();
    });
}

function showIdlePromptForActiveSlide() {
    const activeSlide = wrapper.querySelector('.swiper-slide-active');
    if (!activeSlide) return;

    hasConsumedInitialPrincipalIdle = true;
    removeAllIdlePrompts();

    const promptNode = document.createElement('div');
    promptNode.className = 'slide-idle-prompt is-visible';
    promptNode.textContent = pickRandomIdlePrompt();
    activeSlide.appendChild(promptNode);

    const removePrompt = () => {
        promptNode.removeEventListener('animationend', removePrompt);
        if (promptNode.parentNode) {
            promptNode.parentNode.removeChild(promptNode);
        }
    };

    promptNode.addEventListener('animationend', removePrompt);
    setTimeout(removePrompt, IDLE_PROMPT_DURATION_MS + 120);
}

function isPrincipalViewActive() {
    const principalView = document.getElementById('principal-view');
    return !!(principalView && principalView.classList.contains('is-active'));
}

function markUserInteraction() {
    if (!isPrincipalViewActive()) {
        return;
    }

    hasConsumedInitialPrincipalIdle = true;
    lastUserInteractionAt = Date.now();
    removeAllIdlePrompts();
}

function resetActiveSlideCounter() {
    activeSlideBecameActiveAt = Date.now();
    removeAllIdlePrompts();
}

function resetIdleState() {
    const now = Date.now();
    lastUserInteractionAt = now;
    activeSlideBecameActiveAt = now;
    removeAllIdlePrompts();
}

resetIdleStateApi = resetIdleState;

function startActiveSlidePromptLoop() {
    if (activeSlidePromptLoopId !== null) {
        clearInterval(activeSlidePromptLoopId);
    }

    activeSlidePromptLoopId = window.setInterval(() => {
        const now = Date.now();
        const activeForMs = now - activeSlideBecameActiveAt;
        const idleForMs = now - lastUserInteractionAt;
        const mainSwiper = document.getElementById('main-swiper');
        const idleThresholdMs = getIdlePromptThresholdMs();

        if (!isPrincipalViewActive() || !mainSwiper || mainSwiper.style.display === 'none') {
            return;
        }

        if (activeForMs >= idleThresholdMs && idleForMs >= idleThresholdMs) {
            showIdlePromptForActiveSlide();
            lastUserInteractionAt = now;
        }
    }, ACTIVE_SLIDE_POLL_INTERVAL_MS);
}

async function loadIdlePromptMessages() {
    try {
        const cachedText = window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.getText === 'function'
            ? window.FinalBdayAssetCache.getText(IDLE_PROMPT_CONFIG_PATH)
            : '';
        let rawJson = cachedText;
        if (!rawJson) {
            const response = await fetch(IDLE_PROMPT_CONFIG_PATH, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`No se pudo cargar idle-slide-prompts.json: ${response.status}`);
            }
            rawJson = await response.json();
        } else {
            rawJson = JSON.parse(rawJson);
        }

        const data = rawJson;
        if (!data || !Array.isArray(data.messages)) {
            throw new Error('Formato invalido en idle-slide-prompts.json');
        }

        const cleaned = data.messages
            .map((text) => (typeof text === 'string' ? text.trim() : ''))
            .filter(Boolean);

        if (cleaned.length) {
            idlePromptMessages = cleaned;
        }
    } catch (error) {
        console.warn('[FinalBday] Usando textos fallback para prompts idle:', error);
        idlePromptMessages = fallbackIdlePrompts.slice();
    }
}

function suppressSlideActivation(duration = 600) {
    suppressSlideActivationUntil = Date.now() + duration;
}

function shouldSuppressSlideActivation() {
    // Mientras el overlay de zoom esté visible se suprime siempre la
    // activación del slide, además de una ventana de tiempo tras abrir/cerrar
    // (red de seguridad para el instante justo después de cerrar).
    if (zoomOverlayController.overlay.classList.contains('is-visible')) {
        return true;
    }
    return Date.now() < suppressSlideActivationUntil;
}

['pointerdown', 'pointerup', 'click', 'touchstart', 'keydown', 'wheel'].forEach((eventName) => {
    document.addEventListener(eventName, markUserInteraction, { passive: true });
});


function createZoomIconImage(isMinus) {
    const iconPath = isMinus
        ? projectPath('assets/icons/lupamenos.png')
        : projectPath('assets/icons/lupamas.png');

    return `<img src="${iconPath}" alt="" aria-hidden="true">`;
}

function createZoomOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'media-zoom-overlay';
    overlay.id = 'media-zoom-overlay';
    overlay.innerHTML = `
        <button class="media-zoom-close" id="media-zoom-close" type="button" aria-label="Cerrar pantalla completa">${createZoomIconImage(true)}</button>
        <div class="media-zoom-content" id="media-zoom-content"></div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#media-zoom-close');
    const zoomContent = overlay.querySelector('#media-zoom-content');
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let zoomState = {
        isZoomedIn: false,
        scale: 1,
        tx: 0,
        ty: 0,
        isDragging: false,
        lastPointerX: 0,
        lastPointerY: 0,
        hasMoved: false
    };
    let activePointers = new Map();
    let pinchState = {
        active: false,
        startDistance: 0,
        startScale: 1,
        startTx: 0,
        startTy: 0,
        startMidX: 0,
        startMidY: 0
    };

    function applyZoomTransform() {
        const stage = zoomContent.querySelector('.zoom-stage');
        if (!stage) return;

        stage.style.setProperty('--scale', zoomState.scale.toFixed(3));
        stage.style.setProperty('--tx', `${zoomState.tx}px`);
        stage.style.setProperty('--ty', `${zoomState.ty}px`);
    }

    function clampScale(nextScale) {
        return Math.min(3, Math.max(1, nextScale));
    }

    function clampPan() {
        const viewportSize = Math.max(window.innerWidth, window.innerHeight);
        const maxOffset = viewportSize * (zoomState.scale - 1) * 0.5;
        zoomState.tx = Math.max(-maxOffset, Math.min(maxOffset, zoomState.tx));
        zoomState.ty = Math.max(-maxOffset, Math.min(maxOffset, zoomState.ty));
    }

    function setZoomState(shouldZoomIn) {
        zoomState.isZoomedIn = shouldZoomIn;
        zoomState.scale = shouldZoomIn ? 1.8 : 1;

        if (!shouldZoomIn) {
            zoomState.tx = 0;
            zoomState.ty = 0;
        } else {
            clampPan();
        }

        applyZoomTransform();
    }

    function resetZoomState() {
        zoomState.isZoomedIn = false;
        zoomState.scale = 1;
        zoomState.tx = 0;
        zoomState.ty = 0;
        zoomState.isDragging = false;
        zoomState.hasMoved = false;
        activePointers.clear();
        pinchState.active = false;
        pinchState.startDistance = 0;
        pinchState.startScale = 1;
        pinchState.startTx = 0;
        pinchState.startTy = 0;
        pinchState.startMidX = 0;
        pinchState.startMidY = 0;
        applyZoomTransform();
    }

    function getDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.hypot(dx, dy);
    }

    function getMidpoint(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    function handleZoomContentPointerDown(event) {
        if (event.pointerType === 'mouse') return;

        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        event.currentTarget.setPointerCapture(event.pointerId);

        const pointers = Array.from(activePointers.values());
        if (pointers.length === 2) {
            const midpoint = getMidpoint(pointers[0], pointers[1]);
            pinchState.active = true;
            pinchState.startDistance = getDistance(pointers[0], pointers[1]);
            pinchState.startScale = zoomState.scale;
            pinchState.startTx = zoomState.tx;
            pinchState.startTy = zoomState.ty;
            pinchState.startMidX = midpoint.x;
            pinchState.startMidY = midpoint.y;
            zoomState.isDragging = false;
            zoomState.hasMoved = false;
            return;
        }

        if (pointers.length === 1 && zoomState.scale > 1) {
            zoomState.isDragging = true;
            zoomState.hasMoved = false;
            zoomState.lastPointerX = event.clientX;
            zoomState.lastPointerY = event.clientY;
        }
    }

    function handleZoomContentPointerMove(event) {
        if (event.pointerType === 'mouse') return;

        if (!activePointers.has(event.pointerId)) return;

        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const pointers = Array.from(activePointers.values());

        if (pointers.length === 2 && pinchState.active) {
            const midpoint = getMidpoint(pointers[0], pointers[1]);
            const nextDistance = getDistance(pointers[0], pointers[1]);
            const nextScale = clampScale(pinchState.startScale * (nextDistance / Math.max(pinchState.startDistance, 1)));
            zoomState.scale = nextScale;
            zoomState.isZoomedIn = zoomState.scale > 1;
            zoomState.tx = pinchState.startTx + (midpoint.x - pinchState.startMidX);
            zoomState.ty = pinchState.startTy + (midpoint.y - pinchState.startMidY);
            if (!zoomState.isZoomedIn) {
                zoomState.tx = 0;
                zoomState.ty = 0;
            } else {
                clampPan();
            }
            applyZoomTransform();
            return;
        }

        if (!zoomState.isDragging || pointers.length !== 1) return;

        const deltaX = event.clientX - zoomState.lastPointerX;
        const deltaY = event.clientY - zoomState.lastPointerY;
        const movedEnough = Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2;

        zoomState.hasMoved = zoomState.hasMoved || movedEnough;
        zoomState.tx += deltaX;
        zoomState.ty += deltaY;
        zoomState.lastPointerX = event.clientX;
        zoomState.lastPointerY = event.clientY;

        clampPan();
        applyZoomTransform();
    }

    function handleZoomContentPointerUp(event) {
        if (event.pointerType === 'mouse') return;

        if (activePointers.has(event.pointerId)) {
            activePointers.delete(event.pointerId);
        }

        if (zoomState.isDragging && zoomState.hasMoved) {
            zoomState.isDragging = false;
            zoomState.hasMoved = false;
            return;
        }

        zoomState.isDragging = false;

        if (activePointers.size >= 2 || pinchState.active) {
            pinchState.active = false;
            return;
        }

        const now = Date.now();
        const deltaTime = now - lastTapTime;
        const deltaX = Math.abs(event.clientX - lastTapX);
        const deltaY = Math.abs(event.clientY - lastTapY);
        const isDoubleTap = deltaTime > 0 && deltaTime < 320 && deltaX < 22 && deltaY < 22;

        lastTapTime = now;
        lastTapX = event.clientX;
        lastTapY = event.clientY;

        if (!isDoubleTap) return;

        event.preventDefault();
        event.stopPropagation();

        setZoomState(!zoomState.isZoomedIn);
    }

    zoomContent.addEventListener('pointerdown', handleZoomContentPointerDown);
    zoomContent.addEventListener('pointermove', handleZoomContentPointerMove);
    zoomContent.addEventListener('pointerup', handleZoomContentPointerUp);
    zoomContent.addEventListener('pointercancel', () => {
        zoomState.isDragging = false;
        zoomState.hasMoved = false;
        pinchState.active = false;
        activePointers.clear();
    });

    const close = () => {
        overlay.classList.remove('is-visible');
        zoomContent.innerHTML = '';
        lastTapTime = 0;
        lastTapX = 0;
        lastTapY = 0;
        resetZoomState();
    };

    closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        suppressSlideActivation();
        close();
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            event.preventDefault();
            event.stopPropagation();
            suppressSlideActivation();
            close();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('is-visible')) {
            close();
        }
    });

    return {
        overlay: overlay,
        openFrom: (sourceMedia) => {
            if (!sourceMedia) return;
            zoomContent.innerHTML = '';
            resetZoomState();

            const clone = sourceMedia.cloneNode(true);
            if (clone.tagName === 'VIDEO') {
                clone.autoplay = true;
                clone.muted = true;
                clone.loop = true;
                clone.playsInline = true;
                clone.controls = true;
                clone.play().catch(() => {});
            }

            const stage = document.createElement('div');
            stage.className = 'zoom-stage';
            stage.appendChild(clone);

            zoomContent.appendChild(stage);
            resetZoomState();
            overlay.classList.add('is-visible');
        }
    };
}

const zoomOverlayController = createZoomOverlay();

function forceStartApp() {
    const mainSwiper = document.getElementById('main-swiper');
    mainSwiper.style.display = 'block';
    setTimeout(() => {
        mainSwiper.style.opacity = '1';
        mainSwiper.style.pointerEvents = 'auto';
    }, 50);

    const selectContainer = document.getElementById('select-container');
    const diceBtn = document.getElementById('random-dice');
    selectContainer.style.opacity = '1';
    selectContainer.style.pointerEvents = 'auto';
    diceBtn.style.opacity = '1';
    diceBtn.style.pointerEvents = 'auto';

    // El swiper se inicializó con el contenedor oculto (display:none),
    // así que no pudo medir el ancho de los slides ('auto') y el loop
    // quedó mal calculado. Ahora que ya es visible, lo recalculamos.
    swiper.loopDestroy();
    swiper.loopCreate();
    swiper.update();
    syncSwiperCategoryTag();
}
    
// Construye el nodo DOM de una slide a partir de su id.
function buildSlideNode(id) {
    const data = customsData[id];

    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.setAttribute('data-id', id);

    const file = data.file || `custom${id}.png`;
    const isVideo = file && file.endsWith('.mp4');
    const originalSrc = projectPath(`assets/customs/${file}`);
    const resolvedSrc = window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.resolve === 'function'
        ? window.FinalBdayAssetCache.resolve(originalSrc)
        : originalSrc;

    const mediaHTML = isVideo
        ? `<video class="custom-media" autoplay muted loop playsinline data-asset-original-src="${originalSrc}" src="${resolvedSrc}"></video>`
        : `<img class="custom-main-image" data-asset-original-src="${originalSrc}" src="${resolvedSrc}" alt="Custom">`;

    const winnerBadgeHTML = data.isWinner
        ? `<div class="winner-badge"><img src="${projectPath('assets/icons/torfeo.png')}" alt="Ganador"></div>`
        : '';

    const zoomButtonHTML = `<button class="slide-zoom-btn" type="button" aria-label="Ver en pantalla completa">${createZoomIconImage(false)}</button>`;

    const textHTML = `<span>${data.year}</span> | <span>${data.theme}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`;

    slide.innerHTML = `
        ${winnerBadgeHTML}
        ${zoomButtonHTML}
        ${mediaHTML}
        <div class="marquee-container">
            <div class="crt-overlay"></div>
            <div class="marquee-text">${textHTML}</div>
            <div class="marquee-text" aria-hidden="true">${textHTML}</div>
        </div>
    `;

    return slide;
}

order.forEach((id) => {
    if (!customsData[id]) return;
    wrapper.appendChild(buildSlideNode(id));
});

function handleZoomButtonActivation(event) {
    const zoomBtn = event.target.closest('.slide-zoom-btn');
    if (!zoomBtn) return;

    if (event.type === 'pointerup' && event.pointerType === 'mouse') {
        return;
    }

    if (event.type === 'click' && Date.now() - lastTouchZoomActivationAt < 300) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    suppressSlideActivation();

    if (event.type === 'pointerup') {
        lastTouchZoomActivationAt = Date.now();
    }

    const slide = zoomBtn.closest('.swiper-slide');
    if (!slide) return;

    const mediaEl = slide.querySelector('.custom-media, .custom-main-image');
    if (!mediaEl) return;

    zoomOverlayController.openFrom(mediaEl);
}

wrapper.addEventListener('pointerup', handleZoomButtonActivation);
wrapper.addEventListener('click', handleZoomButtonActivation);

await loadIdlePromptMessages();
    
const swiper = new Swiper('.swiper', {
    slidesPerView: 'auto',      
    centeredSlides: true,       
    spaceBetween: 25,           
    loop: true,                 
    grabCursor: true,           
});

swiper.on('slideChange', syncSwiperCategoryTag);
swiper.on('transitionEnd', syncSwiperCategoryTag);
swiper.on('resize', syncSwiperCategoryTag);
swiper.on('slideChange', resetActiveSlideCounter);
swiper.on('transitionEnd', resetActiveSlideCounter);

forceStartApp();
resetActiveSlideCounter();
startActiveSlidePromptLoop();

// Ids actualmente mostrados en el slider (todos, o filtrados por categoría/año)
let currentSwiperIds = order;

if (isFirstPrincipalVisit && startCustomId !== null) {
    const startIndex = currentSwiperIds.indexOf(startCustomId);
    if (startIndex !== -1) {
        goToSlideIndex(startIndex, 0);
    }
}

// Nº mínimo de slides para que el modo loop de Swiper funcione bien
// con slidesPerView:'auto' sin lanzar warnings ni comportarse raro.
const MIN_SLIDES_FOR_LOOP = 6;

// Reconstruye el contenido del swiper con un nuevo conjunto de ids.
// Si hay pocos elementos, se desactiva el loop (si no, Swiper avisa
// de que no hay slides suficientes y el bucle no funciona bien).
function rebuildSwiperSlides(ids) {
    if (swiper.params.loop) {
        swiper.loopDestroy();
    }

    wrapper.innerHTML = '';
    ids.forEach(id => {
        if (customsData[id]) {
            wrapper.appendChild(buildSlideNode(id));
        }
    });

    const shouldLoop = ids.length >= MIN_SLIDES_FOR_LOOP;
    swiper.params.loop = shouldLoop;
    swiper.update();

    if (shouldLoop) {
        swiper.loopCreate();
        swiper.update();
    }

    currentSwiperIds = ids;
    resetActiveSlideCounter();
    syncSwiperCategoryTag();
}

// Lleva el swiper a un índice concreto, funcione o no el loop en ese momento.
function goToSlideIndex(index, speed = 0) {
    if (swiper.params.loop) {
        swiper.slideToLoop(index, speed);
    } else {
        swiper.slideTo(index, speed);
    }

    resetActiveSlideCounter();
    syncSwiperCategoryTag();
}

// Devuelve el id (custom) del slide actualmente activo/centrado.
function getActiveSlideId() {
    const activeSlide = swiper.slides[swiper.activeIndex];
    if (!activeSlide) return null;
    const idAttr = activeSlide.getAttribute('data-id');
    return idAttr !== null ? parseInt(idAttr) : null;
}

function getActiveSlideData() {
    const activeSlideId = getActiveSlideId();
    if (activeSlideId === null) return null;

    return customsData[activeSlideId] || null;
}

function shouldShowSwiperCategoryTag() {
    return !select || select.value === 'all';
}

function hideSwiperCategoryTag() {
    if (!swiperCategoryTag) return;

    swiperCategoryTag.classList.remove('is-visible');
    swiperCategoryTag.textContent = '';
}

function positionSwiperCategoryTag() {
    if (!swiperCategoryTag || !mainSwiperEl) return;

    if (!shouldShowSwiperCategoryTag()) {
        hideSwiperCategoryTag();
        return;
    }

    const activeSlide = swiper.slides[swiper.activeIndex];
    const activeData = getActiveSlideData();

    if (!activeSlide || !activeData || mainSwiperEl.style.display === 'none' || mainSwiperEl.getBoundingClientRect().width === 0) {
        hideSwiperCategoryTag();
        return;
    }

    swiperCategoryTag.textContent = `${activeData.year} - ${activeData.category.toUpperCase()}`;
    swiperCategoryTag.classList.add('is-visible');

    const rootEl = document.querySelector('.principal-root');
    if (!rootEl) return;

    const slideRect = activeSlide.getBoundingClientRect();
    const rootRect = rootEl.getBoundingClientRect();
    const tagOffsetFromSlide = -2;

    const left = Math.max(12, slideRect.right - rootRect.left - swiperCategoryTag.offsetWidth + 10);
    const top = Math.max(0, slideRect.top - rootRect.top - swiperCategoryTag.offsetHeight + tagOffsetFromSlide);

    swiperCategoryTag.style.left = `${left}px`;
    swiperCategoryTag.style.top = `${top}px`;
}

function syncSwiperCategoryTag() {
    requestAnimationFrame(positionSwiperCategoryTag);
}

const select = document.getElementById('year-select');
const selectOptionsMap = {};

Object.values(customsData).forEach(item => {
    if (!selectOptionsMap[item.year]) {
        selectOptionsMap[item.year] = item.category;
    }
});

Object.keys(selectOptionsMap).sort().forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = `${year} - ${selectOptionsMap[year].toUpperCase()}`;
    select.appendChild(option);
});

const mainSwiperEl = document.getElementById('main-swiper');
const mainGridEl = document.getElementById('main-grid');
const gridWrapper = document.getElementById('grid-wrapper');
const diceBtn = document.getElementById('random-dice');
const diceBtnIcon = diceBtn ? diceBtn.querySelector('img') : null;

if (diceBtnIcon) {
    const diceIconOriginalSrc = projectPath('assets/icons/dados.png');
    const diceIconResolvedSrc = window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.resolve === 'function'
        ? window.FinalBdayAssetCache.resolve(diceIconOriginalSrc)
        : diceIconOriginalSrc;
    diceBtnIcon.setAttribute('data-asset-original-src', diceIconOriginalSrc);
    diceBtnIcon.setAttribute('src', diceIconResolvedSrc);
}

const customsByYear = {};

Object.entries(customsData).forEach(([id, data]) => {
    if (!customsByYear[data.year]) {
        customsByYear[data.year] = [];
    }
    customsByYear[data.year].push(parseInt(id));
});

function buildGridItem(id, data) {
    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';
    gridItem.setAttribute('data-target-id', id);
    gridItem.setAttribute('data-year', data.year);

    const file = data.file || `custom${id}.png`;

    if (file && file.endsWith('.mp4')) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.src = projectPath(`assets/customs/${file}`);
        gridItem.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = projectPath(`assets/customs/${file}`);
        img.alt = 'Custom';
        gridItem.appendChild(img);
    }

    gridItem.addEventListener('click', () => {
        const targetId = parseInt(id);
        const selectedYear = gridItem.getAttribute('data-year');
        const categoryIds = customsByYear[selectedYear] || [];

        mainGridEl.style.display = 'none';
        mainSwiperEl.style.display = 'block';
        diceBtn.style.display = 'flex';

        rebuildSwiperSlides(categoryIds);

        const targetSlideIndex = categoryIds.indexOf(targetId);
        if (targetSlideIndex !== -1) {
            goToSlideIndex(targetSlideIndex, 0);
        }

        syncSwiperCategoryTag();
    });

    return gridItem;
}

function buildGridItems() {
    const fragment = document.createDocumentFragment();

    Object.entries(customsData).forEach(([id, data]) => {
        fragment.appendChild(buildGridItem(id, data));
    });

    gridWrapper.innerHTML = '';
    gridWrapper.appendChild(fragment);
}

function updateGridVisibility(selectedYear) {
    const gridItems = gridWrapper.querySelectorAll('.grid-item');

    gridItems.forEach((gridItem) => {
        const itemYear = gridItem.getAttribute('data-year');
        gridItem.style.display = itemYear === selectedYear ? '' : 'none';
    });
}

buildGridItems();

select.addEventListener('change', (e) => {
    const selectedYear = e.target.value;

    if (selectedYear === 'all') {
        mainGridEl.style.display = 'none';
        mainSwiperEl.style.display = 'block';
        diceBtn.style.display = 'flex';
        if (currentSwiperIds !== order) {
            const activeId = getActiveSlideId();
            rebuildSwiperSlides(order);
            if (activeId !== null) {
                const idx = order.indexOf(activeId);
                if (idx !== -1) goToSlideIndex(idx, 0);
            }
        }
        swiper.update();
        syncSwiperCategoryTag();
    } else {
        mainSwiperEl.style.display = 'none';
        diceBtn.style.display = 'none';
        mainGridEl.style.display = 'block';
        hideSwiperCategoryTag();

        updateGridVisibility(selectedYear);
    }
});

diceBtn.addEventListener('click', () => {
    diceBtn.classList.add('shake-dice');
    
    const randomSlideIndex = Math.floor(Math.random() * currentSwiperIds.length);
    goToSlideIndex(randomSlideIndex, 600);

    setTimeout(() => {
        diceBtn.classList.remove('shake-dice');
    }, 500);
});

const confirmDialog = document.getElementById('confirm-dialog');
const dialogThemeText = document.getElementById('dialog-theme');
const btnNo = document.getElementById('btn-no');
const btnYes = document.getElementById('btn-yes');

const finalScreen = document.getElementById('final-screen');
const finalPreviewBox = document.getElementById('final-preview-box');
const finalTextBox = document.getElementById('final-text-box');
const btnBack = document.getElementById('btn-back');
const cembeNavButton = document.getElementById('cembe-nav-button');
const cembeView = document.getElementById('cembe-view');
const cembeBackBtn = document.getElementById('cembe-back-btn');
const cembeBgMusic = document.getElementById('cembe-bg-music');
const globalBgMusic = document.getElementById('global-bg-music');
const bgVideoA = document.getElementById('app-bg-video');
const bgVideoB = document.getElementById('app-bg-video-alt');

const BG_VIDEO_ORIGINAL = projectPath('assets/backgrounds/disco_movil.mp4');
const BG_VIDEO_TRANSITION = projectPath('assets/backgrounds/bar1-movil.mp4');
const BG_VIDEO_FINAL = projectPath('assets/backgrounds/bar2-movil.mp4');

const bgVideoController = window.FinalBdayPrincipalBgVideo.createController({
    finalTextBox: finalTextBox,
    finalPreviewBox: finalPreviewBox,
    bgVideoA: bgVideoA,
    bgVideoB: bgVideoB,
    originalVideo: BG_VIDEO_ORIGINAL,
    transitionVideo: BG_VIDEO_TRANSITION,
    finalVideo: BG_VIDEO_FINAL
});

// Detección propia de "tap/click real" sobre el slide activo, en vez de
// depender del evento 'click' que emite Swiper. Se comprobó (con grep) que
// esta era la única vía en todo el código que abría el diálogo de
// confirmación, y aun así el diálogo seguía apareciendo de forma fantasma
// tras cerrar el zoom en desktop pese a varias capas de supresión sobre el
// click de Swiper. En vez de seguir intentando filtrar/suprimir ese evento,
// dejamos de escucharlo por completo: aquí medimos nosotros mismos la
// distancia y el tiempo entre pointerdown y pointerup para distinguir un tap
// real de un arrastre (igual que hace Swiper internamente, pero de forma
// propia y controlada), así el diálogo ya no puede depender de ningún click
// interno/tardío de Swiper.
let slideTapStartX = 0;
let slideTapStartY = 0;
let slideTapStartTime = 0;
const SLIDE_TAP_MOVE_THRESHOLD = 10;
const SLIDE_TAP_TIME_THRESHOLD = 500;

wrapper.addEventListener('pointerdown', (event) => {
    slideTapStartX = event.clientX;
    slideTapStartY = event.clientY;
    slideTapStartTime = Date.now();
});

wrapper.addEventListener('pointerup', (event) => {
    if (event.target.closest('.slide-zoom-btn')) {
        return;
    }

    if (shouldSuppressSlideActivation()) {
        return;
    }

    const dx = Math.abs(event.clientX - slideTapStartX);
    const dy = Math.abs(event.clientY - slideTapStartY);
    const dt = Date.now() - slideTapStartTime;

    if (dx > SLIDE_TAP_MOVE_THRESHOLD || dy > SLIDE_TAP_MOVE_THRESHOLD || dt > SLIDE_TAP_TIME_THRESHOLD) {
        return;
    }

    const clickedActiveSlide = event.target.closest('.swiper-slide-active');

    if (clickedActiveSlide) {
        const customId = clickedActiveSlide.getAttribute('data-id');
        const selectedCustom = customsData[customId];

        if (selectedCustom) {
            dialogThemeText.textContent = selectedCustom.theme;
            confirmDialog.style.display = 'flex';
        }
    }
});

btnNo.addEventListener('click', () => {
    confirmDialog.style.display = 'none';
});

btnYes.addEventListener('click', () => {
    confirmDialog.style.display = 'none';

    mainSwiperEl.style.display = 'none';
    mainGridEl.style.display = 'none';
    document.getElementById('select-container').style.opacity = '0';
    document.getElementById('select-container').style.pointerEvents = 'none';
    diceBtn.style.opacity = '0';
    diceBtn.style.pointerEvents = 'none';
    hideSwiperCategoryTag();

    bgVideoController.hideFinalContent();
    bgVideoController.playBgTransition();

    const activeSlide = document.querySelector('.swiper-slide-active');
    if (activeSlide) {
        const activeMedia = activeSlide.querySelector('.custom-media, .custom-main-image');
        if (activeMedia) {
            finalPreviewBox.innerHTML = '';
            const clonedMedia = activeMedia.cloneNode(true);
            
            if(clonedMedia.tagName === 'VIDEO') {
                clonedMedia.muted = true;
                clonedMedia.loop = true;
                clonedMedia.playsInline = true;
                clonedMedia.play().catch(() => {});
            }
            finalPreviewBox.appendChild(clonedMedia);
        }
    }

    finalScreen.style.display = 'flex';
    if (cembeNavButton) {
        cembeNavButton.classList.add('is-hidden');
    }
});

btnBack.addEventListener('click', () => {
    finalScreen.style.display = 'none';

    bgVideoController.restoreOriginalBgVideo();

    mainSwiperEl.style.display = 'block';
    mainSwiperEl.style.opacity = '1';
    mainSwiperEl.style.pointerEvents = 'auto';

    document.getElementById('select-container').style.opacity = '1';
    document.getElementById('select-container').style.pointerEvents = 'auto';
    diceBtn.style.opacity = '1';
    diceBtn.style.pointerEvents = 'auto';
    if (cembeNavButton) {
        cembeNavButton.classList.remove('is-hidden');
    }

    swiper.update();
    syncSwiperCategoryTag();
});

function isAppAudioMuted() {
    return !!(window.FinalBdayAppAudioController && window.FinalBdayAppAudioController.isMuted());
}

function showCembeView() {
    if (!cembeView) return;

    mainSwiperEl.style.display = 'none';
    mainGridEl.style.display = 'none';
    document.getElementById('select-container').style.opacity = '0';
    document.getElementById('select-container').style.pointerEvents = 'none';
    diceBtn.style.opacity = '0';
    diceBtn.style.pointerEvents = 'none';
    hideSwiperCategoryTag();

    if (cembeNavButton) {
        cembeNavButton.classList.add('is-hidden');
    }

    cembeView.classList.add('is-visible');

    if (globalBgMusic) {
        globalBgMusic.pause();
    }

    if (cembeBgMusic && !isAppAudioMuted()) {
        cembeBgMusic.currentTime = 0;
        cembeBgMusic.play().catch(() => {});
    }
}

function hideCembeView() {
    if (!cembeView) return;

    cembeView.classList.remove('is-visible');

    if (cembeBgMusic) {
        cembeBgMusic.pause();
    }

    if (globalBgMusic && !isAppAudioMuted()) {
        globalBgMusic.play().catch(() => {});
    }

    mainSwiperEl.style.display = 'block';
    mainSwiperEl.style.opacity = '1';
    mainSwiperEl.style.pointerEvents = 'auto';

    document.getElementById('select-container').style.opacity = '1';
    document.getElementById('select-container').style.pointerEvents = 'auto';
    diceBtn.style.opacity = '1';
    diceBtn.style.pointerEvents = 'auto';

    if (cembeNavButton) {
        cembeNavButton.classList.remove('is-hidden');
    }

    swiper.update();
    syncSwiperCategoryTag();
}

if (cembeBackBtn) {
    cembeBackBtn.addEventListener('click', hideCembeView);
}

cembeViewApi = {
    showCembeView: showCembeView,
    hideCembeView: hideCembeView
};
        })();

        return initPromise;
    }

    window.FinalBdayPrincipalApp = {
        init: init,
        resetIdleState: function () {
            if (resetIdleStateApi) resetIdleStateApi();
        },
        showCembeView: function () {
            if (cembeViewApi) cembeViewApi.showCembeView();
        },
        hideCembeView: function () {
            if (cembeViewApi) cembeViewApi.hideCembeView();
        }
    };
})();
