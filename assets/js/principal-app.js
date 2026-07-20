(function () {
    let initPromise = null;

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
        '[data-component="controls"]': projectPath('components/app-controls.html'),
        '[data-component="media-shell"]': projectPath('components/app-media-shell.html'),
        '[data-component="confirm-dialog"]': projectPath('components/app-confirm-dialog.html'),
        '[data-component="final-screen"]': projectPath('components/app-final-screen.html')
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
const startCustomId = findStartCustomId(customsData);
const isFirstPrincipalVisit = !sessionStorage.getItem(FIRST_VISIT_STORAGE_KEY);

if (isFirstPrincipalVisit) {
    sessionStorage.setItem(FIRST_VISIT_STORAGE_KEY, '1');
}
    
const shuffledOrder = shuffleArray(Object.keys(customsData).map(Number));
const order = isFirstPrincipalVisit
    ? moveIdToFront(shuffledOrder, startCustomId)
    : shuffledOrder;
const wrapper = document.getElementById('slides-wrapper');
let suppressSwiperClickUntil = 0;

function suppressNextSwiperClick() {
    suppressSwiperClickUntil = Date.now() + 400;
}

function createZoomIconSvg(isMinus) {
    const symbolPath = isMinus
        ? '<line x1="6" y1="11" x2="14" y2="11" stroke="#000" stroke-width="2.4" stroke-linecap="round"/>'
        : '<line x1="6" y1="11" x2="14" y2="11" stroke="#000" stroke-width="2.4" stroke-linecap="round"/><line x1="10" y1="7" x2="10" y2="15" stroke="#000" stroke-width="2.4" stroke-linecap="round"/>';

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10" cy="11" r="6" fill="none" stroke="#000" stroke-width="2.4"></circle>
            <line x1="14.5" y1="15.5" x2="20" y2="21" stroke="#000" stroke-width="2.8" stroke-linecap="round"></line>
            ${symbolPath}
        </svg>
    `;
}

function createZoomOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'media-zoom-overlay';
    overlay.id = 'media-zoom-overlay';
    overlay.innerHTML = `
        <button class="media-zoom-close" id="media-zoom-close" type="button" aria-label="Cerrar pantalla completa">${createZoomIconSvg(true)}</button>
        <div class="media-zoom-content" id="media-zoom-content"></div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#media-zoom-close');
    const close = () => {
        suppressNextSwiperClick();
        overlay.classList.remove('is-visible');
        const zoomContent = overlay.querySelector('#media-zoom-content');
        zoomContent.innerHTML = '';
    };

    closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
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
            const zoomContent = overlay.querySelector('#media-zoom-content');
            zoomContent.innerHTML = '';

            const clone = sourceMedia.cloneNode(true);
            if (clone.tagName === 'VIDEO') {
                clone.autoplay = true;
                clone.muted = true;
                clone.loop = true;
                clone.playsInline = true;
                clone.controls = true;
                clone.play().catch(() => {});
            }

            zoomContent.appendChild(clone);
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
        ? `<div class="winner-badge"><img src="${projectPath('assets/favicon/torfeo.png')}" alt="Ganador"></div>`
        : '';

    const zoomButtonHTML = `<button class="slide-zoom-btn" type="button" aria-label="Ver en pantalla completa">${createZoomIconSvg(false)}</button>`;

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

wrapper.addEventListener('click', (event) => {
    const zoomBtn = event.target.closest('.slide-zoom-btn');
    if (!zoomBtn) return;

    event.preventDefault();
    event.stopPropagation();

    const slide = zoomBtn.closest('.swiper-slide');
    if (!slide) return;

    const mediaEl = slide.querySelector('.custom-media, .custom-main-image');
    if (!mediaEl) return;

    zoomOverlayController.openFrom(mediaEl);
});
    
const swiper = new Swiper('.swiper', {
    slidesPerView: 'auto',      
    centeredSlides: true,       
    spaceBetween: 25,           
    loop: true,                 
    grabCursor: true,           
});

forceStartApp();

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
}

// Lleva el swiper a un índice concreto, funcione o no el loop en ese momento.
function goToSlideIndex(index, speed = 0) {
    if (swiper.params.loop) {
        swiper.slideToLoop(index, speed);
    } else {
        swiper.slideTo(index, speed);
    }
}

// Devuelve el id (custom) del slide actualmente activo/centrado.
function getActiveSlideId() {
    const activeSlide = swiper.slides[swiper.activeIndex];
    if (!activeSlide) return null;
    const idAttr = activeSlide.getAttribute('data-id');
    return idAttr !== null ? parseInt(idAttr) : null;
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
    } else {
        mainSwiperEl.style.display = 'none';
        diceBtn.style.display = 'none';
        mainGridEl.style.display = 'block';

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
const bgVideoA = document.getElementById('app-bg-video');
const bgVideoB = document.getElementById('app-bg-video-alt');

const BG_VIDEO_ORIGINAL = projectPath('assets/videos/disco_movil.mp4');
const BG_VIDEO_TRANSITION = projectPath('assets/videos/bar1-movil.mp4');
const BG_VIDEO_FINAL = projectPath('assets/videos/bar2-movil.mp4');

const bgVideoController = window.FinalBdayPrincipalBgVideo.createController({
    finalTextBox: finalTextBox,
    finalPreviewBox: finalPreviewBox,
    bgVideoA: bgVideoA,
    bgVideoB: bgVideoB,
    originalVideo: BG_VIDEO_ORIGINAL,
    transitionVideo: BG_VIDEO_TRANSITION,
    finalVideo: BG_VIDEO_FINAL
});

swiper.on('click', (s, event) => {
    if (Date.now() < suppressSwiperClickUntil) {
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

    swiper.update();
});
        })();

        return initPromise;
    }

    window.FinalBdayPrincipalApp = {
        init: init
    };
})();
