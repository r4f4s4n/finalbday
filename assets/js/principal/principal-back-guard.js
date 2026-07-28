(function () {
    const ALLOW_NEXT_UNLOAD_KEY = 'fb-allow-next-unload';

    function allowNextUnload() {
        try {
            sessionStorage.setItem(ALLOW_NEXT_UNLOAD_KEY, '1');
        } catch (_) {
            // Si sessionStorage falla, mantenemos el guard por seguridad.
        }
    }

    function consumeAllowedUnload() {
        try {
            const isAllowed = sessionStorage.getItem(ALLOW_NEXT_UNLOAD_KEY) === '1';
            if (isAllowed) {
                sessionStorage.removeItem(ALLOW_NEXT_UNLOAD_KEY);
                return true;
            }
        } catch (_) {
            // Ignoramos errores de storage y aplicamos comportamiento por defecto.
        }
        return false;
    }

    function enableBackGuard() {
        // OJO: Chrome (y derivados) limitan cuántas veces se puede llamar a
        // pushState/replaceState en poco tiempo (es una protección anti-abuso
        // pensada justamente para frenar este truco). Si se abusa, el navegador
        // acaba bloqueando las llamadas en silencio.
        function pushDummyState() {
            history.pushState({ appLock: true }, '', location.href);
        }

        pushDummyState();

        window.addEventListener('popstate', () => {
            pushDummyState();
        });

        // Segunda capa: confirmar al cerrar/recargar/cambiar URL.
        window.addEventListener('beforeunload', (e) => {
            if (consumeAllowedUnload()) {
                return;
            }
            e.preventDefault();
            e.returnValue = '';
        });
    }

    window.FinalBdayBackGuard = {
        enable: enableBackGuard,
        allowNextUnload: allowNextUnload
    };
})();
