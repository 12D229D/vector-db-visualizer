# Bitácora y Plan de Ruta — Explorador 3D de Espacios Vectoriales & Embeddings

> **Directorio:** `vector-db-visualizer`
> **Categoría:** 🛠️ Herramientas / 📚 Manuales de Referencia
> **Estado:** 🟡 En Progreso

---

## 📌 Resumen del Subproyecto
`vector-db-visualizer` es una herramienta de inspección interactiva 3D para comprender el funcionamiento de las bases de datos vectoriales (como Pinecone, Milvus, Qdrant, Chroma). Permite visualizar nubes de puntos en espacio tridimensional reducidas mediante proyecciones estilo t-SNE / PCA / UMAP, ejecutar consultas de búsqueda por similitud del coseno (Cosine Similarity, Euclidean Distance, Dot Product), inspeccionar vecinos más cercanos (k-NN) e iluminar rutas de particionamiento indexado (HNSW / IVF-Index).

---

## 🎯 Objetivos Principales
1. **Espacio Vectorial 3D Interactivo:** Escena tridimensional interactiva con cámara orbital conteniendo clusters de vectores (categorías semánticas: textos, imágenes, conceptos).
2. **Motor de Búsqueda por Similitud:** Selección o ingreso de un vector consulta para visualizar en tiempo real los k vectores más cercanos con sus distancias y líneas de conexión.
3. **Simulador de Índices HNSW (Hierarchical Navigable Small World):** Representación gráfica por capas de la estructura de grafo del índice vectorial y cómo se acelera la búsqueda aproximada (ANN).
4. **Filtros por Metadatos & Categorías:** Panel lateral para filtrar vectores por categoría, dimensiones (e.g. 1536D a 3D) y metadatos asociados.
5. **Persistencia SQLite Abstracta:** Motor de persistencia vía localStorage con DDL compatible con sqlite3 CLI y exportación de dump .sql.

---

## 🏗️ Arquitectura

### Patrón arquitectónico
**SPA (Single Page Application)** — Frontend puro sin backend. Toda la lógica corre en el navegador usando módulos ES6.

### Estructura de archivos
```
vector-db-visualizer/
├── index.html          # Shell HTML semántico, HUD de controles
├── plan.md             # Bitácora del subproyecto
├── css/
│   └── style.css       # Estilos Cyber-Data Studio (glassmorphism, HSL dark)
└── js/
    ├── app.js          # Controlador principal (VectorDBApp class)
    ├── db.js           # ⭐ SQLite Abstraction Layer (localStorage + DDL)
    ├── dataset.js      # Dataset de embeddings semánticos 64-D
    ├── indexes.js      # FlatIndex, HNSWIndex, IVFPQIndex
    ├── space-3d.js     # Motor de renderizado 3D con Canvas API
    ├── vector-math.js  # PCA, t-SNE, métricas de similitud
    └── audio-fx.js     # Efectos de sonido Web Audio API
```

### Flujo de datos
```
EMBEDDING_DATASET (dataset.js)
  → VectorDBApp.init() (app.js)
    → _persistDataset() → saveDataset() + saveVectors() → localStorage (db.js)
    → rebuildAll() → FlatIndex / HNSWIndex / IVFPQIndex (indexes.js)
    → Space3D.setNodes() → Canvas 3D (space-3d.js)

Query de usuario
  → executeSearch() → índice activo → searchOutput
    → logSearch() → search_history (db.js / localStorage)
    → renderSearchResults() + renderTraversalLog() → DOM

Exportar SQL
  → exportSQLiteDump() → Blob .sql → descarga del navegador
```

### Base de datos (SQLite Abstracto)
Motor: **localStorage** · DDL compatible con **sqlite3 CLI**

| Tabla             | Propósito                                       |
|-------------------|-------------------------------------------------|
| `vector_datasets` | Registro de datasets de embeddings              |
| `vectors`         | Vectores individuales por dataset               |
| `index_configs`   | Configuraciones HNSW / IVF / Flat               |
| `search_history`  | Historial de búsquedas por similitud (max 500)  |

---

## 🧠 Paradigma de Programación

**Híbrido: Orientado a Objetos + Event-Driven + Modular**

| Módulo          | Paradigma                                        | Justificación                                        |
|-----------------|--------------------------------------------------|------------------------------------------------------|
| `app.js`        | OOP (clase `VectorDBApp`)                        | Encapsula estado global y ciclo de vida de la app    |
| `db.js`         | Funcional / Procedimental                        | Funciones puras sin estado, operan sobre localStorage|
| `indexes.js`    | OOP (clases `FlatIndex`, `HNSWIndex`, `IVFPQIndex`) | Cada índice tiene su propia estructura interna    |
| `space-3d.js`   | OOP (clase `Space3D`)                            | Encapsula el loop de render y nodos 3D               |
| `vector-math.js`| Funcional puro                                   | Operaciones matemáticas sin efectos secundarios      |
| `audio-fx.js`   | Módulo singleton                                 | Estado de mute centralizado                          |

Se eligió OOP para el controlador principal porque gestiona estado mutable complejo (dataset, índices, cámara, selección). Se eligió funcional para la capa de DB y matemáticas para garantizar predictibilidad y testabilidad.

---

## 🌐 Propósito de Visibilidad y Destino Remoto

- **Visibilidad**: `Público (Open Source / Portafolio)`.
- **Plataforma Remota Asignada**: `GitHub`.
- **Plataforma de Despliegue CI/CD**: `GitHub Pages` / `Cloudflare Pages`.
- **Justificación**: Explorador 3D interactivo para visualización de embeddings y algoritmos HNSW/IVF sin dependencias propietarias ni claves de API, de alto impacto visual y pedagógico para el portafolio público.

---

## 📋 Plan de Trabajo

### Fase 1: Escena 3D y Controles Orbitales
- [x] Creación de `index.html` con visor 3D full-screen, panel de consultas y detalles de vectores.
- [x] Creación de `css/style.css` con layout Cyber-Data Studio, HUD transparente y listas retroiluminadas.
- [x] Implementación de `js/space-3d.js` (escena Canvas 3D, grid y controles de cámara orbital).

### Fase 2: Generación y Proyección de Embeddings
- [x] Implementación de `js/dataset.js` (conjuntos de datos sintéticos de embeddings 64-D: docs, conceptos IA/ML).
- [x] Implementación de `js/vector-math.js` (algoritmos PCA y t-SNE simplificados para reducción 64D→3D).

### Fase 3: Algoritmos de Búsqueda y Métricas
- [x] Implementación de `js/indexes.js` (FlatIndex, HNSWIndex, IVFPQIndex con métricas coseno, euclidiana, dot, manhattan).
- [x] Visualización animada de rayo de consulta e iluminación de los k-vecinos más cercanos.

### Fase 4: Visualización de Índices HNSW
- [x] Representación de aristas del grafo HNSW y centroides Voronoi de IVF en 3D.
- [x] Log de traversal de búsqueda en tiempo real.

### Fase 5: Persistencia SQLite Abstracta
- [x] Creación de `js/db.js` con DDL SQL puro compatible con SQLite3.
- [x] Persistencia vía localStorage con función `exportSQLiteDump()`.
- [x] Integración en `app.js`: guardar dataset al inicio, registrar búsquedas en `search_history`.
- [x] Botón "🗄️ Exportar SQL" en `index.html`.

### Fase 6: Mejoras Futuras
- [ ] Importar datasets .sql desde el navegador (FileReader + parser SQL ligero).
- [ ] Panel de estadísticas DB (nº de datasets, vectores, búsquedas registradas).
- [ ] Soporte para datasets multi-dimensionales importados desde CSV / JSON.

---

## 📊 Estado actual

✅ **Motor SQLite abstracto implementado (`js/db.js`)**
Tablas: `vector_datasets`, `vectors`, `index_configs`, `search_history`
Exportación `.sql` compatible con sqlite3 CLI.

La aplicación SPA está completa y funcional: renderizado 3D vía Canvas API, proyecciones PCA/t-SNE, índices HNSW/IVF/Flat, aritmética de conceptos y audio reactivo. La capa de persistencia SQLite abstracta registra el dataset inicial, cada búsqueda ejecutada y permite exportar un dump `.sql` real desde el navegador.

## 🔮 Mejoras futuras

> Auditoría 2026-10-03: el entregable principal está completo. Las tareas `[ ]` restantes de este plan se reclasifican como mejoras futuras opcionales y no bloquean el estado **Completado**.
