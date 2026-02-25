# Cuéntame: Prototipo de Cuentacuentos Digital

Este proyecto es una herramienta interactiva diseñada para la **performance y narración digital**. Permite a un cuentacuentos gestionar una secuencia de archivos visuales (imágenes y vídeos) para crear una experiencia inmersiva y dinámica.

## 🚀 Funcionalidades Principales

-   **Gestor de Assets**: Permite cargar una carpeta local de archivos multimedia y reordenarlos en tiempo real.
-   **Navegación Intuitiva**: Controla la presentación haciendo clic en las mitades de la pantalla o utilizando las flechas del teclado.
-   **Slide de Portada Dinámico**: El sistema genera automáticamente una primera diapositiva con Título y Subtítulo personalizables, incluyendo un selector de color HSB para el subtítulo.
-   **Control de Vídeo "Scratch"**: Utiliza la rueda del ratón durante la reproducción de vídeos para avanzar o retroceder fotograma a fotograma, permitiendo un control rítmico de la narración.
-   **Pantalla Final**: Cierre automático con una animación de despedida personalizada (`assetsDefault/theEND.gif`).
-   **Modo Pantalla Completa**: Diseñado para presentaciones en vivo sin distracciones de la interfaz del navegador.

## 🛠️ Cómo Funciona

1.  **Inicio**: Al abrir la aplicación, haz clic en "LOAD ASSETS".
2.  **Configuración**: Abre el panel de ajustes (⚙️) para:
    *   Cambiar el título y subtítulo del cuento.
    *   Elegir el color del subtítulo.
    *   Sincronizar una carpeta local con tus imágenes (`.jpg`, `.png`, `.webp`, `.gif`) y vídeos (`.mp4`, `.mov`).
    *   Reordenar las diapositivas con las flechas (▲/▼).
3.  **Performance**:
    *   **Clic Derecho / Flecha Derecha**: Siguiente slide.
    *   **Clic Izquierdo / Flecha Izquierda**: Slide anterior.
    *   **Espacio**: Pausa/Reproduce vídeo.
    *   **Enter**: Reinicia el slide actual.
    *   **Scroll**: Navegación rápida (scratch) dentro de vídeos.

---

## 💡 Brainstorming: Hacia una Herramienta más Interactiva

Para llevar este prototipo al siguiente nivel de interactividad, se proponen las siguientes ideas:

1.  **Reconocimiento de Voz (Voice Triggers)**:
    *   Implementar `ml5.js SoundClassifier` para que ciertas palabras clave (ej: *"De repente"*, *"Fuego"*, *"Fin"*) activen transiciones automáticas o efectos visuales específicos (humo, destellos).
2.  **Interacción de la Audiencia mediada por Dispositivos**:
    *   Permitir que el público escanee un código QR y envíe "reacciones" (emojis o colores) que aparezcan flotando sobre el cuento en tiempo real.
3.  **Ambiente Sonoro Generativo**:
    *   Vincular el color o la distorsión de las imágenes al volumen de la voz del narrador. Si el narrador grita, la imagen vibra; si susurra, los colores se vuelven más tenues.
4.  **Narrativa No Lineal (Mapas de Decisión)**:
    *   Añadir zonas interactivas en las diapositivas que permitan elegir el camino de la historia (ej: elegir entre ir por el bosque o por la cueva), saltando a diferentes conjuntos de assets.
5.  **Filtros de Visión por Computadora**:
    *   Si hay una cámara activa, superponer la cara del narrador o del público integrándolos en los dibujos o vídeos mediante máscaras dinámicas.
