(function () {
    // Manifiesto explícito de recursos a precargar durante la pantalla de
    // carga (Fase 6 del refactor). Sustituye a discoverResources(), que antes
    // hacía fetch + regex sobre pages/app_intro.html y pages/app_principal.html
    // en tiempo de ejecución para "descubrir" estas mismas rutas.
    //
    // Nota: los <script src="..."> (swiper, loader.js, principal-app.js, etc.)
    // NO se incluyen aquí: el propio navegador ya los carga vía la etiqueta
    // <script>, no necesitan pasar por este precache de blobs.
    const STATIC_RESOURCES = [
        'assets/audios/aves_16.mp3',
        'assets/icons/favicon.ico',
        'assets/icons/cembeicon.png',
        'assets/icons/vol-play.png',
        'assets/backgrounds/cembebg.png',
        'components/loader.js',
        'components/app-loader-view.html',
        'components/app-intro-view.html',
        'components/app-principal-view.html',
        'components/app-global-audio-ui.html',
        'components/principal/app-controls.html',
        'components/principal/app-media-shell.html',
        'components/principal/app-confirm-dialog.html',
        'components/principal/app-final-screen.html',
        'components/principal/app-cembe-view.html',
        'assets/backgrounds/video_movil.mp4',
        'assets/backgrounds/video_escritorio.mp4',
        'assets/backgrounds/zoom_movil.mp4',
        'assets/backgrounds/zoom_escritorio.mp4',
        'assets/audios/interior_student_cafe.mp3',
        'assets/audios/pumpup.mp3',
        'assets/backgrounds/disco_movil.mp4',
        'assets/backgrounds/bar1-movil.mp4',
        'assets/backgrounds/bar2-movil.mp4'
    ];

    // Construye la lista final de URLs absolutas a precargar, añadiendo
    // también los ficheros de customs declarados en principal-customs-data.js
    // (no se pueden listar aquí de forma estática porque dependen de esos datos).
    function build() {
        const resources = new Set(
            STATIC_RESOURCES.map((path) => new URL(path, location.href).href)
        );

        if (window.FinalBdayCustomsData && typeof window.FinalBdayCustomsData.getData === 'function') {
            const customsData = window.FinalBdayCustomsData.getData();
            for (const item of Object.values(customsData)) {
                if (item.file) {
                    resources.add(new URL('assets/customs/' + item.file, location.href).href);
                }
            }
        }

        return Array.from(resources);
    }

    window.FinalBdayResourceManifest = {
        build: build
    };
})();
