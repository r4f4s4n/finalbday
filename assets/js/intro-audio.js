(function () {
    function createController(options) {
        const settings = options || {};
        const introBirdsEl = settings.introBirdsEl || null;
        const globalMusicEl = settings.globalMusicEl || null;
        const stopIntroDelayMs = Number.isFinite(settings.stopIntroDelayMs)
            ? settings.stopIntroDelayMs
            : 1000;
        const maxIntroRetries = Number.isFinite(settings.maxIntroRetries)
            ? settings.maxIntroRetries
            : 6;
        const retryDelayMs = Number.isFinite(settings.retryDelayMs)
            ? settings.retryDelayMs
            : 900;

        let stopIntroBirdsTimeoutId = null;
        let introRetryTimeoutId = null;
        let introBirdsStarted = false;
        let unlockListenersAttached = false;

        function detachUnlockListeners() {
            if (!unlockListenersAttached) return;
            document.removeEventListener('pointerdown', onPotentialUnlock);
            document.removeEventListener('keydown', onPotentialUnlock);
            document.removeEventListener('touchstart', onPotentialUnlock);
            unlockListenersAttached = false;
        }

        function attachUnlockListeners() {
            if (unlockListenersAttached) return;
            document.addEventListener('pointerdown', onPotentialUnlock, { passive: true });
            document.addEventListener('keydown', onPotentialUnlock, { passive: true });
            document.addEventListener('touchstart', onPotentialUnlock, { passive: true });
            unlockListenersAttached = true;
        }

        function scheduleRetry(attempt) {
            if (introBirdsStarted || attempt >= maxIntroRetries) return;
            if (introRetryTimeoutId !== null) {
                clearTimeout(introRetryTimeoutId);
            }
            introRetryTimeoutId = setTimeout(function () {
                introRetryTimeoutId = null;
                startIntroBirdsMusic(attempt + 1);
            }, retryDelayMs);
        }

        function onPotentialUnlock() {
            startIntroBirdsMusic(0);
        }

        function startIntroBirdsMusic(attempt) {
            if (!introBirdsEl) return;
            if (introBirdsStarted && !introBirdsEl.paused) return;

            const currentAttempt = Number.isFinite(attempt) ? attempt : 0;
            introBirdsEl.loop = true;
            introBirdsEl.volume = 1;
            const playPromise = introBirdsEl.play();

            if (!playPromise || typeof playPromise.then !== 'function') {
                introBirdsStarted = true;
                detachUnlockListeners();
                return;
            }

            playPromise.then(function () {
                introBirdsStarted = true;
                detachUnlockListeners();
            }).catch(function () {
                // Puede bloquearse hasta interacción del usuario.
                attachUnlockListeners();
                scheduleRetry(currentAttempt);
            });
        }

        function startGlobalBackgroundMusic() {
            if (!globalMusicEl) return;
            globalMusicEl.loop = true;
            globalMusicEl.volume = 1;
            globalMusicEl.play().then(function () {
                if (!introBirdsEl) return;
                if (stopIntroBirdsTimeoutId !== null) {
                    clearTimeout(stopIntroBirdsTimeoutId);
                }
                stopIntroBirdsTimeoutId = setTimeout(function () {
                    introBirdsEl.pause();
                    introBirdsEl.currentTime = 0;
                    stopIntroBirdsTimeoutId = null;
                    if (introRetryTimeoutId !== null) {
                        clearTimeout(introRetryTimeoutId);
                        introRetryTimeoutId = null;
                    }
                    detachUnlockListeners();
                }, stopIntroDelayMs);
            }).catch(function () {
                // Si el navegador bloquea la reproducción automática, se
                // volverá a intentar tras la interacción del usuario.
            });
        }

        function clearTimers() {
            if (stopIntroBirdsTimeoutId !== null) {
                clearTimeout(stopIntroBirdsTimeoutId);
                stopIntroBirdsTimeoutId = null;
            }
            if (introRetryTimeoutId !== null) {
                clearTimeout(introRetryTimeoutId);
                introRetryTimeoutId = null;
            }
            detachUnlockListeners();
        }

        return {
            startIntroBirdsMusic: startIntroBirdsMusic,
            startGlobalBackgroundMusic: startGlobalBackgroundMusic,
            clearTimers: clearTimers
        };
    }

    window.FinalBdayIntroAudio = {
        createController: createController
    };
})();
