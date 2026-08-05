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
        const BAR1_START_TIME_SECONDS = 0.4;
        const BAR2_PRELOAD_DELAY_MS = 2000;

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
                    videoEl.currentTime = 0;
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
                // Incluso si ya estamos en el video original, dejamos la capa standby
                // preparada con bar1 en el primer frame para evitar flashes de otro fondo.
                preloadTransitionStartVideo();
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
            const resetOnActivate = !!cfg.resetOnActivate;
            const startTimeSeconds = Number.isFinite(cfg.startTimeSeconds)
                ? Math.max(0, cfg.startTimeSeconds)
                : 0;

            function activateIncoming() {
                if (token !== bgTransitionToken) return;

                incoming.loop = loop;
                swapActiveBgVideo();
                if (onActive) onActive(incoming);
                incoming.play().catch(() => {});
            }

            const resolvedSrc = resolveAssetUrl(src);

            // Para bar1 exigimos un reinicio determinista y un seek confirmado
            // antes del swap visual para que el offset de inicio sí se aplique.
            if (resetOnActivate) {
                const changed = syncMediaSource(incoming, resolvedSrc);

                const activateFromConfiguredStart = () => {
                    if (startTimeSeconds <= 0) {
                        activateIncoming();
                        return;
                    }

                    const maxSeekTime = Number.isFinite(incoming.duration)
                        ? Math.max(0, incoming.duration - 0.05)
                        : startTimeSeconds;
                    const targetTime = Math.min(startTimeSeconds, maxSeekTime);

                    let activated = false;
                    const activateOnce = () => {
                        if (activated) return;
                        activated = true;
                        activateIncoming();
                    };

                    const onSeeked = () => {
                        incoming.removeEventListener('seeked', onSeeked);
                        activateOnce();
                    };

                    incoming.addEventListener('seeked', onSeeked);

                    try {
                        incoming.currentTime = targetTime;
                    } catch (error) {
                        // Ignore seek errors until media is fully seekable.
                        incoming.removeEventListener('seeked', onSeeked);
                        activateOnce();
                        return;
                    }

                    // Fallback por si el navegador no emite `seeked` en este cambio.
                    setTimeout(() => {
                        incoming.removeEventListener('seeked', onSeeked);
                        activateOnce();
                    }, 120);
                };

                if (incoming.readyState >= 1 && !changed) {
                    activateFromConfiguredStart();
                    return;
                }

                incoming.addEventListener('loadedmetadata', function onLoadedMetadata() {
                    incoming.removeEventListener('loadedmetadata', onLoadedMetadata);
                    activateFromConfiguredStart();
                });

                incoming.load();
                return;
            }

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
                resetOnActivate: true,
                startTimeSeconds: BAR1_START_TIME_SECONDS,
                token: myToken,
                onActive: (bar1Video) => {
                    setTimeout(() => {
                        if (myToken !== bgTransitionToken) return;
                        preloadStandbyBgVideo(finalVideo);
                    }, BAR2_PRELOAD_DELAY_MS);

                    bar1Video.addEventListener('ended', function onBar1Ended() {
                        bar1Video.removeEventListener('ended', onBar1Ended);
                        if (myToken !== bgTransitionToken) return;

                        transitionBgVideoTo(finalVideo, {
                            loop: true,
                            token: myToken,
                            onActive: (bar2Video) => {
                                if (!bar2Video.paused && myToken === bgTransitionToken) {
                                    revealFinalContent();
                                    return;
                                }

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
