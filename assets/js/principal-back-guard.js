(function () {
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
            e.preventDefault();
            e.returnValue = '';
        });
    }

    window.FinalBdayBackGuard = {
        enable: enableBackGuard
    };
})();
