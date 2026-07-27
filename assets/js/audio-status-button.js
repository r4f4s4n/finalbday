(function () {
    function isAudioElementPlaying(audioEl) {
        return !!audioEl && !audioEl.paused && !audioEl.ended && audioEl.readyState > 1;
    }

    // Controller genérico para el botón único de audio (mute/unmute) de la app.
    // Gestiona N elementos <audio> a la vez: el icono/estado se calcula a partir
    // de si CUALQUIERA de ellos está sonando. Quién debe reanudarse al desactivar
    // el mute lo decide quien instancia el controller (onResume), porque solo el
    // llamador sabe qué pista corresponde a la vista activa en ese momento.
    function createController(options) {
        const settings = options || {};
        const buttonEl = settings.buttonEl || null;
        const iconEl = settings.iconEl || null;
        const audioElements = (settings.audioElements || []).filter(Boolean);
        const iconMutedSrc = settings.iconMutedSrc;
        const iconPlaySrc = settings.iconPlaySrc;
        const onResume = typeof settings.onResume === 'function' ? settings.onResume : function () {};
        const onMute = typeof settings.onMute === 'function' ? settings.onMute : function () {};

        let isMutedByUser = false;

        function isAnyAudioPlaying() {
            return !isMutedByUser && audioElements.some(isAudioElementPlaying);
        }

        function updateIcon() {
            if (!iconEl) return;

            const playing = isAnyAudioPlaying();
            const nextSrc = playing ? iconPlaySrc : iconMutedSrc;

            if (iconEl.getAttribute('src') !== nextSrc) {
                iconEl.setAttribute('src', nextSrc);
            }

            if (buttonEl) {
                buttonEl.setAttribute('aria-label', playing ? 'Silenciar sonido' : 'Activar sonido');
                buttonEl.setAttribute('aria-pressed', playing ? 'true' : 'false');
            }
        }

        function setMuted(shouldMute) {
            isMutedByUser = shouldMute;

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

            updateIcon();
        }

        audioElements.forEach(function (audioEl) {
            ['play', 'playing', 'pause', 'ended', 'emptied', 'waiting'].forEach(function (eventName) {
                audioEl.addEventListener(eventName, updateIcon);
            });
        });

        if (buttonEl) {
            buttonEl.addEventListener('click', function () {
                setMuted(!isMutedByUser);
            });
        }

        updateIcon();

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
