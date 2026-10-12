# Bitácora y Plan de Ruta — Explorador 3D de Espacios Vectoriales & Embeddings (Vector DB Visualizer)

> **Directorio:** `vector-db-visualizer`  
> **Categoría:** 🛠️ Herramientas / 🪐 Simuladores / 📚 Manuales  
> **Estado:** ✅ Completado  

---

## 📌 Resumen del Subproyecto
`vector-db-visualizer` es una plataforma web interactiva y visual en 3D diseñada para explorar, comprender y depurar cómo funcionan las bases de datos vectoriales y los espacios de incrustación (embeddings) de alta dimensión. Permite simular consultas de similitud semántica, visualizar algoritmos de indexación de vanguardia (HNSW, IVF-PQ, Flat), alternar métricas de distancia (Cosine, Euclidean L2, Dot Product, Manhattan L1), proyectar dimensiones mediante PCA y t-SNE, y experimentar con aritmética conceptual de vectores ($A - B + C = ?$).

---

## 🎯 Objetivos Principales
- [x] **Lienzo 3D Orbital de Embeddings:** Renderizado espacial de nubes de puntos 3D con rotación, paneo, zoom orbital, rejilla espacial y gradientes neón reactivos.
- [x] **Motor Multi-Índice de Búsqueda Vectorial:** Implementación pura de búsqueda exacta Flat, grafos navegables multicapa HNSW con registro de travesía voraz, y particionamiento celular Voronoi IVF-PQ.
- [x] **Conexiones Láser y Métrica Top-K:** Trazado de rayos láser 3D entre el vector de consulta y los K vecinos más cercanos con medidores de similitud porcentual y cálculo de latencia en milisegundos.
- [x] **Reducción de Dimensionalidad Interactiva:** Proyección de vectores de 64 dimensiones a 3D utilizando Análisis de Componentes Principales (PCA por iteración de potencia) y simulación de fuerzas t-SNE.
- [x] **Laboratorio de Aritmética Conceptual (Word2Vec):** Operaciones algebraicas de vectores con presets clásicos y evaluación inmediata del vecino semántico más próximo.
- [x] **Inspector Detallado de Vectores:** Mapa de calor de 64 dimensiones, cálculo de norma euclídea, metadatos y sintetizador acústico Web Audio API.
- [x] **Importación / Exportación JSON:** Capacidad de exportar el estado del espacio vectorial o cargar datasets personalizados.

---

## 🏗️ Arquitectura

- **Patrón Arquitectónico:** Single Page Application (SPA) con arquitectura desacoplada basada en pipeline matemático, motor de renderizado 3D en Canvas y bus de eventos reactivo.
- **Estructura de Archivos:**

```text
vector-db-visualizer/
├── index.html                 # Estructura semántica, drawer de inspección y controles
├── css/
│   └── style.css              # Dark Glassmorphism, paleta HSL, tipografías Google Fonts
├── js/
│   ├── vector-math.js         # Biblioteca matemática: métricas de distancia, PCA, t-SNE, álgebra
│   ├── dataset.js             # Dataset multidominio de 64-D, anclajes semánticos y presets
│   ├── indexes.js             # Índices Flat, HNSW (multi-capa) e IVF-PQ (Voronoi K-Means)
│   ├── audio-fx.js            # Sintetizador armónico Web Audio API
│   ├── space-3d.js            # Motor de renderizado Canvas 3D con Orbit Controls y Raycasting
│   └── app.js                 # Controlador maestro de UI, eventos y sincronización
├── README.md                  # Documentación de uso y descripción técnica
└── plan.md                    # Bitácora de desarrollo y arquitectura
```

- **Flujo de Datos:**
  1. El usuario ingresa un texto de consulta, selecciona un punto del espacio o evalúa una analogía.
  2. `VectorMath.generateEmbedding` o `VectorMath.linearCombination` genera el vector normalizado en 64-D.
  3. El índice activo (`HNSWIndex`, `IVFPQIndex` o `FlatIndex`) calcula la distancia según la métrica seleccionada y registra la ruta topológica.
  4. `Space3D` proyecta el vector al espacio 3D, dibuja los rayos láser de proximidad, ilumina los nodos correspondientes y emite señales de audio armónicas vía `AudioFx`.
  5. El drawer lateral sincroniza el mapa de calor dimensional y las estadísticas de recall y latencia.

---

## 🧠 Paradigma de Programación

- **Híbrido: Orientado a Objetos (OOP) + Funcional + Event-Driven + Reactivo**
  - **Orientado a Objetos (OOP):** Encapsulación modular de los algoritmos de indexación (`FlatIndex`, `HNSWIndex`, `IVFPQIndex`), la cámara y escena espacial (`Space3D`) y el sintetizador acústico (`AudioFx`).
  - **Funcional:** Funciones matemáticas puras e inmutables en `VectorMath` (producto punto, distancias $L_1/L_2$, normalización L2, deflación de matrices PCA y transformaciones de proyección).
  - **Event-Driven & Reactivo:** Sincronización en tiempo real entre eventos de interacción del usuario (arrastre orbital, clicks en nodos, sliders de parámetros) y re-renderizado fluido a 60 FPS con `requestAnimationFrame`.

---

## 📋 Plan de Trabajo Realizado

### Fase 1: Motor Matemático y Proyecciones
- [x] Implementación de `js/vector-math.js` con soporte para Similitud Coseno, Distancia Euclidiana, Producto Punto, Manhattan y combinación lineal de vectores.
- [x] Implementación de algoritmos de reducción dimensional: PCA por Power Iteration y t-SNE por relajación de fuerzas.

### Fase 2: Dataset y Estructuras de Indexación
- [x] Creación de `js/dataset.js` con 32 conceptos semánticos en 64-D organizados en 7 dominios científicos y tecnológicos (IA, Cuántica, Espacio, Biotech, Ciberseguridad, Fintech, Filosofía).
- [x] Desarrollo de `js/indexes.js` con soporte para HNSW (árbol multinivel y búsqueda voraz con registro de pasos), IVF-PQ (clustering K-Means y partición Voronoi) y Flat Scan.

### Fase 3: Renderizado 3D y Experiencia de Usuario
- [x] Creación de `js/space-3d.js` con proyección de perspectiva, ordenación por profundidad Z, rayos láser iluminados, anillos de consulta pulsantes y rotación orbital táctil/ratón.
- [x] Creación de `js/audio-fx.js` para feedback sonoro con osciladores polifónicos.
- [x] Creación de `css/style.css` y `index.html` con estética Dark Glassmorphism, paleta HSL neón y fuentes *Outfit* y *JetBrains Mono*.

### Fase 4: Integración y Herramientas Analíticas
- [x] Conexión integral en `js/app.js` del panel de búsqueda semántica, laboratorio de analogías Word2Vec ($King - Man + Woman = Queen$), inspector de mapa de calor e importación/exportación JSON.
- [x] Verificación de semántica HTML5, un único `<h1>`, accesibilidad y testing de rendimiento.

---

## 🛠️ Stack / Tecnologías
- HTML5 Semántico & Canvas API
- CSS3 (Variables HSL, Dark Glassmorphism, Google Fonts *Outfit* & *JetBrains Mono*)
- Vanilla JavaScript ES6+ (Módulos nativos, sin dependencias externas)
- Web Audio API (Sintetizador acústico procedural)
