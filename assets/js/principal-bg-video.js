(function () {
    function createController(options) {
        const settings = options || {};
        const finalTextBox = settings.finalTextBox;
        const finalPreviewBox = settings.finalPreviewBox;
        const bgVideoA = settings.bgVideoA;
        const bgVideoB = settings.bgVideoB;
        const originalVideo = settings.originalVideo;
        const transitionVideo = settings.transitionVideo;
        const finalVideo = settings.finalVideo;

        let activeBgVideo = bgVideoA;
        let standbyBgVideo = bgVideoB;
        let bgTransitionToken = 0;

        function resolveAssetUrl(url) {
            if (window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.resolve === 'function') {
                return window.FinalBdayAssetCache.resolve(url);
            }

            return new URL(url, location.href).href;
        }

        function syncMediaSource(mediaEl, src) {
            const resolvedSrc = resolveAssetUrl(src);
            const currentSrc = mediaEl.getAttribute('src') || '';

            if (currentSrc === resolvedSrc || mediaEl.currentSrc === resolvedSrc) {
                return false;
            }

            mediaEl.src = resolvedSrc;
            return true;
        }

        function hideFinalContent() {
            finalTextBox.classList.remove('is-visible');
            finalPreviewBox.classList.remove('is-visible');
        }

        function revealFinalContent() {
            finalTextBox.classList.add('is-visible');
            finalPreviewBox.classList.add('is-visible');
        }

        function swapActiveBgVideo() {
            activeBgVideo.classList.remove('is-active');
            standbyBgVideo.classList.add('is-active');
            const prev = activeBgVideo;
            activeBgVideo = standbyBgVideo;
            standbyBgVideo = prev;
            prev.pause();
        }

        function clearBgVideo(videoEl) {
            videoEl.pause();
            videoEl.removeAttribute('src');
            videoEl.load();
        }

        function preloadStandbyBgVideo(src) {
            const changed = syncMediaSource(standbyBgVideo, src);
            if (changed) {
                standbyBgVideo.load();
            }
        }

        function parkVideoAtStart(videoEl) {
            if (!videoEl) return;

            videoEl.pause();

            const resetToFirstFrame = () => {
                try {
                    videoEl.currentTime = 0,5;
                } catch (error) {
                    // Algunos navegadores pueden bloquear el seek antes de metadata.
                }
            };

            if (videoEl.readyState >= 1) {
                resetToFirstFrame();
                return;
            }

            videoEl.addEventListener('loadedmetadata', function onLoadedMetadata() {
                videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                resetToFirstFrame();
            });
        }

        function preloadStandbyBgVideoAtStart(src) {
            preloadStandbyBgVideo(src);
            parkVideoAtStart(standbyBgVideo);
        }

        function preloadTransitionStartVideo() {
            preloadStandbyBgVideoAtStart(transitionVideo);
        }

        function resetBgLayersToOriginalInstant() {
            const originalUrl = resolveAssetUrl(originalVideo);
            const activeSrc = activeBgVideo.currentSrc || activeBgVideo.getAttribute('src') || '';

            if (activeSrc.indexOf(originalUrl) !== -1 && activeBgVideo.classList.contains('is-active')) {
                return;
            }

            bgTransitionToken += 1;

            bgVideoA.pause();
            bgVideoB.pause();

            bgVideoA.src = originalUrl;
            bgVideoA.loop = true;
            bgVideoA.muted = true;
            bgVideoA.playsInline = true;
            bgVideoA.classList.add('is-active');

            bgVideoB.classList.remove('is-active');

            activeBgVideo = bgVideoA;
            standbyBgVideo = bgVideoB;

            bgVideoA.load();
            bgVideoA.play().catch(() => {});
            preloadTransitionStartVideo();
        }

        function transitionBgVideoTo(src, params) {
            const cfg = params || {};
            const loop = cfg.loop !== undefined ? cfg.loop : true;
            const token = cfg.token;
            const onActive = cfg.onActive;
            const incoming = standbyBgVideo;

            function activateIncoming() {
                if (token !== bgTransitionToken) return;
                parkVideoAtStart(incoming);
                incoming.loop = loop;
                swapActiveBgVideo();
                incoming.play().catch(() => {});
                if (onActive) onActive(incoming);
            }

            const resolvedSrc = resolveAssetUrl(src);
            const alreadyLoaded = incoming.readyState >= 3 &&
                incoming.currentSrc && incoming.currentSrc.indexOf(resolvedSrc) !== -1;

            if (alreadyLoaded) {
                activateIncoming();
                return;
            }

            incoming.addEventListener('canplay', function onCanPlay() {
                incoming.removeEventListener('canplay', onCanPlay);
                activateIncoming();
            });

            const changed = syncMediaSource(incoming, resolvedSrc);
            if (changed) {
                incoming.load();
            } else {
                activateIncoming();
            }
        }

        function playBgTransition() {
            resetBgLayersToOriginalInstant();
            const myToken = ++bgTransitionToken;
            hideFinalContent();

            transitionBgVideoTo(transitionVideo, {
                loop: false,
                token: myToken,
                onActive: (bar1Video) => {
                    preloadStandbyBgVideo(finalVideo);

                    bar1Video.addEventListener('ended', function onBar1Ended() {
                        bar1Video.removeEventListener('ended', onBar1Ended);
                        if (myToken !== bgTransitionToken) return;

                        transitionBgVideoTo(finalVideo, {
                            loop: true,
                            token: myToken,
                            onActive: (bar2Video) => {
                                bar2Video.addEventListener('playing', function onBar2Playing() {
                                    bar2Video.removeEventListener('playing', onBar2Playing);
                                    if (myToken === bgTransitionToken) revealFinalContent();
                                }, { once: true });
                            }
                        });
                    });
                }
            });
        }

        function restoreOriginalBgVideo() {
            const myToken = ++bgTransitionToken;
            hideFinalContent();
            transitionBgVideoTo(originalVideo, {
                loop: true,
                token: myToken,
                onActive: () => {
                    preloadTransitionStartVideo();
                }
            });
        }

        preloadTransitionStartVideo();

        return {
            hideFinalContent: hideFinalContent,
            revealFinalContent: revealFinalContent,
            playBgTransition: playBgTransition,
            restoreOriginalBgVideo: restoreOriginalBgVideo
        };
    }

    window.FinalBdayPrincipalBgVideo = {
        createController: createController
    };
})();
