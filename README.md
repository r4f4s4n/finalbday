# FinalBday

Aplicación experiencial multimedia con flujo de precarga, intro, navegación principal por swipes y pantallas finales apoyadas por audio continuo y video de fondo.

## Objetivo del proyecto

Definir una experiencia fluida entre pantallas donde la carga de recursos, la música y las transiciones visuales formen parte del propio recorrido del usuario.

## Flujo funcional esperado

### 1. Página de precarga

- En esta pantalla se cargarán todos los recursos necesarios para el funcionamiento de la app.
- Lo primero en cargarse será la música `sonido de aves_16.mp3`.
- Esa música empezará a sonar automáticamente desde la propia precarga.
- Lo último en cargarse serán los customs.
- Mientras los customs todavía no hayan alcanzado su número real cargado, se mostrará al usuario un contador simulado con ritmo de 1 custom cada 2 segundos.
- Cuando la carga real de customs alcance o supere ese contador simulado, la interfaz pasará a mostrar el conteo real en lugar del simulado.

### 2. Página de intro

- La página de intro debe mantenerse con el sonido de aves ya activo.
- Ese audio no se reinicia en esta transición, sino que continúa desde la página de carga.

### 3. Página principal

- La página principal funcionará mediante swipes.
- Su música de fondo será `interior_student`.
- Desde esta pantalla el flujo podrá llevar al usuario hacia `final-screen` y/o hacia `app_cembe`.

### 4. Página `app_cembe`

- La pantalla `app_cembe` tendrá música propia.
- El audio asociado a esta pantalla será `pumpup.mp3`.

## Comportamiento global del sonido

- El botón de mute/sonido debe aparecer desde el momento en que empieza a sonar la música en la precarga.
- El usuario debe poder silenciar o reactivar el sonido en cualquier momento del recorrido.

## Transiciones y lenguaje visual

- Las transiciones entre pantallas deben apoyarse en videos de background.
- El paso entre una pantalla y otra debe sentirse fluido, sin cortes bruscos entre estados visuales y sonoros.

## Funcionamiento actual de la aplicación

Esta sección documenta el comportamiento actual que hoy se considera correcto y que debe preservarse durante el refactor.

### Arquitectura actual del flujo

- La experiencia principal vive en `index.html`, que contiene tres estados dentro de una misma shell: precarga, intro y principal.
- `app_cembe` sigue siendo una página separada (`pages/app_cembe.html`) y se abre mediante navegación de página completa.
- La vista principal carga componentes HTML parciales para controles, media-shell, diálogo de confirmación y final-screen.

### Precarga actual

- La precarga no solo carga recursos visibles inmediatos, sino que descubre y precarga recursos de `pages/app_intro.html`, `pages/app_principal.html`, componentes, favicon, videos, audios y todos los customs.
- La precarga de recursos se hace con concurrencia limitada.
- El audio `aves_16.mp3` se prioriza para cargarse antes que el resto de recursos multimedia.
- En cuanto ese audio está disponible, la app intenta empezar a reproducirlo automáticamente.
- Si el navegador bloquea el autoplay, la reproducción se reintenta tras interacción del usuario.
- El contador visible de customs no empieza exactamente en 0: arranca desde un mínimo equivalente aproximadamente al 1% del total de customs.
- A partir de ahí, el contador simulado sube a ritmo de 1 custom cada 2 segundos.
- Cuando la carga real alcanza al contador simulado, la simulación se detiene y se muestra el valor real.
- Aunque la carga real termine antes, la app mantiene una espera mínima adicional antes de entrar en la intro para alargar la sensación de precarga.
- Si algunos recursos fallan, la app puede continuar y esos recursos se reintentan en segundo plano.

### Intro actual

- Al terminar la precarga se entra en la intro, donde sigue sonando el audio de aves si ya se ha podido desbloquear la reproducción.
- La intro muestra un video de fondo en loop y una capa superior con el botón `START`.
- Al pulsar `START`, el overlay se desvanece, se lanza un video de transición y la entrada a principal ocurre tras una temporización fija.
- Antes de entrar en principal, la app intenta arrancar la música global `interior_student_cafe.mp3`.
- Cuando esa música empieza a sonar, el audio de aves se detiene con un pequeño retraso para evitar un corte brusco.

### Principal actual

- La vista principal se inicializa dinámicamente dentro de `index.html`.
- La navegación principal se apoya en un Swiper con slides centrados y loop cuando hay suficientes elementos.
- Los customs se cargan en orden aleatorio en cada visita.
- En la primera visita, si existe un custom marcado con `isStart`, ese custom se fuerza al principio del recorrido.
- Los customs pueden ser imagen o video.
- Los customs ganadores muestran un badge de trofeo.
- Cada slide tiene un botón de zoom para abrir el media en una vista ampliada sobre la propia página.
- Existe un selector por año. Cuando se elige un año, la vista cambia de swiper a una cuadrícula filtrada por ese año.
- Al volver a `Todos los años`, la interfaz recupera el swiper global.
- Hay un botón de dado que lanza una selección aleatoria dentro del conjunto actualmente visible.

### Confirmación y final-screen actual

- Si el usuario pulsa sobre el custom activo en el swiper, se abre un diálogo de confirmación con el tema del disfraz seleccionado.
- Si el usuario responde `Sí`, se ocultan el swiper, la cuadrícula y los controles principales.
- El custom activo se clona dentro del `final-screen` como preview.
- En paralelo se lanza la transición de videos de fondo del principal hacia el estado final.
- El `final-screen` muestra el mensaje final con la información económica y de transferencia.
- Desde el botón de volver se restaura el fondo original del principal, reaparecen controles y se vuelve al estado de navegación anterior.

### CEMBE actual

- El acceso a CEMBE se hace desde un botón flotante independiente del flujo del swiper.
- Ese botón está oculto durante la intro y también mientras se muestra el final-screen.
- Al pulsarlo, la app guarda una URL de retorno en `sessionStorage`, espera aproximadamente 2 segundos y navega a `pages/app_cembe.html`.
- La página `app_cembe` reproduce `pumpup.mp3` en loop y muestra su propio botón de audio y un botón de volver.
- La vuelta desde CEMBE usa el historial del navegador si existe; si no, usa la URL de retorno guardada o vuelve a `index.html`.
- El estado de mute de CEMBE es independiente del estado de audio de la shell principal.

### Sonido actual

- El botón global de sonido aparece ya en la shell principal antes de entrar en la intro.
- Ese botón alterna entre activar y silenciar el audio disponible en ese momento.
- En `index.html`, el control gestiona tanto el audio de aves como la música global del principal.
- Si el usuario silencia el sonido, ambos audios se pausan.
- Si el usuario reactiva el sonido, la app intenta reanudar el audio correspondiente al estado actual de la experiencia.
- En navegadores con restricciones de autoplay, la UI del botón está disponible desde el inicio aunque la reproducción efectiva pueda depender de una primera interacción.

### Video y transiciones actuales

- La intro usa un video de fondo estable y un video de transición independiente para entrar en principal.
- La pantalla principal usa dos capas de video para intercambiar fondos sin corte visible.
- La transición hacia el final-screen no cambia solo el contenido textual: también encadena videos de fondo específicos hasta llegar al estado final.
- Al salir del final-screen, el background del principal se recompone al video base y se deja precargado el siguiente video de transición.

### Restricciones y comportamiento defensivo actuales

- La app principal activa un guardado defensivo contra salida accidental por `back` y `beforeunload`.
- La navegación permitida hacia CEMBE marca una excepción explícita para no chocar con ese guard.
- El sistema de precarga mantiene una caché en memoria para reutilizar blobs de imágenes, videos y audio ya descargados.
