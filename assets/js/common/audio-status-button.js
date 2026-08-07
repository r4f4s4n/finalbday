(function () {
    function isAudioElementPlaying(audioEl) {
        return !!audioEl && !audioEl.paused && !audioEl.ended && audioEl.readyState > 1;
    }

    // Controller genérico para el botón único de audio (mute/unmute) de la app.
    // Antes de la primera acción explícita del usuario, el estado visual refleja
    // si realmente hay audio sonando. A partir del primer click, el feedback del
    // botón sigue inmediatamente la intención del usuario. Quién debe reanudarse
    // al desactivar el mute lo decide quien instancia el controller (onResume),
    // porque solo el llamador sabe qué pista corresponde a la vista activa.
    function createController(options) {
        const settings = options || {};
        const buttonEl = settings.buttonEl || null;
        const iconEl = settings.iconEl || null;
        const audioElements = (settings.audioElements || []).filter(Boolean);
        const iconMutedSrc = settings.iconMutedSrc;
        const iconPlaySrc = settings.iconPlaySrc;
        const onResume = typeof settings.onResume === 'function' ? settings.onResume : function () {};
        const onMute = typeof settings.onMute === 'function' ? settings.onMute : function () {};

        let isMutedByUser = settings.initialMuted === true;
        let hasExplicitUserAction = false;

        function isAnyAudioPlaying() {
            return audioElements.some(isAudioElementPlaying);
        }

        function isSoundEnabledNow() {
            return hasExplicitUserAction ? !isMutedByUser : isAnyAudioPlaying();
        }

        function resolveAssetSrc(src) {
            if (window.FinalBdayAssetCache && typeof window.FinalBdayAssetCache.resolve === 'function') {
                return window.FinalBdayAssetCache.resolve(src);
            }
            return src;
        }

        function syncButtonState() {
            const soundEnabled = isSoundEnabledNow();
            const nextSrc = resolveAssetSrc(soundEnabled ? iconPlaySrc : iconMutedSrc);

            if (iconEl && iconEl.getAttribute('src') !== nextSrc) {
                iconEl.setAttribute('src', nextSrc);
            }

            if (buttonEl) {
                buttonEl.setAttribute('aria-label', soundEnabled ? 'Silenciar sonido' : 'Activar sonido');
                buttonEl.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
            }
        }

        function updateIcon() {
            syncButtonState();
        }

        function setMuted(shouldMute) {
            isMutedByUser = shouldMute;
            hasExplicitUserAction = true;

            audioElements.forEach(function (audioEl) {
                audioEl.muted = shouldMute;
                if (shouldMute) {
                    audioEl.pause();
                }
            });

            if (shouldMute) {
                onMute();
            } else {
                onResume();
            }

            document.dispatchEvent(new CustomEvent('finalbday:audio-muted-change', {
                detail: {
                    muted: shouldMute
                }
            }));

            syncButtonState();
        }

        audioElements.forEach(function (audioEl) {
            ['play', 'playing', 'pause', 'ended', 'emptied', 'waiting'].forEach(function (eventName) {
                audioEl.addEventListener(eventName, updateIcon);
            });
        });

        if (buttonEl) {
            buttonEl.addEventListener('click', function () {
                // El toggle debe basarse en el estado efectivo actual (lo que
                // ve el usuario), no solo en isMutedByUser.
                setMuted(isSoundEnabledNow());
            });
        }

        audioElements.forEach(function (audioEl) {
            audioEl.muted = isMutedByUser;
        });

        syncButtonState();

        return {
            isMuted: function () {
                return isMutedByUser;
            },
            setMuted: setMuted,
            updateIcon: updateIcon
        };
    }

    window.FinalBdayAudioStatusButton = {
        createController: createController
    };
})();
