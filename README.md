# Vector DB & Embedding Space 3D Visualizer 📐✨

Una plataforma interactiva en 3D para la visualización, exploración y depuración en tiempo real de bases de datos vectoriales, espacios de incrustación semántica (*embeddings*) de alta dimensión y algoritmos de búsqueda por similitud.

![Vector DB Visualizer Screenshot](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80)

---

## 🚀 Características Principales

1. **Lienzo 3D Orbital e Interactivo:**
   - Visualización de nubes de puntos de embeddings en 64 dimensiones proyectadas a 3D.
   - Rotación orbital fluida, paneo, zoom continuo y controles táctiles responsivos.
   - Rejilla espacial tridimensional y ejes cartesianos con ordenación por profundidad geométrica.

2. **Motores de Indexación Vectorial:**
   - **HNSW (Hierarchical Navigable Small World):** Grafo multicapa con navegación voraz (*greedy search*) y visualización de aristas por nivel.
   - **IVF-PQ (Inverted File Partitioning):** Particionamiento celular Voronoi mediante clustering K-Means con visualización de centroides y radios de búsqueda.
   - **Flat Index:** Búsqueda exacta por fuerza bruta con 100% de recall teórico.

3. **Múltiples Métricas de Similitud y Distancia:**
   - *Cosine Similarity* ($\cos \theta = \frac{A \cdot B}{\|A\| \|B\|}$)
   - *Euclidean Distance* ($L_2 = \sqrt{\sum (A_i - B_i)^2}$)
   - *Dot Product* ($A \cdot B$)
   - *Manhattan Distance* ($L_1 = \sum |A_i - B_i|$)

4. **Reducción de Dimensionalidad:**
   - **PCA:** Análisis de componentes principales mediante el método de iteración de potencia y deflación matricial.
   - **t-SNE:** Proyección no lineal con simulación de fuerzas atractivas y repulsivas para agrupamiento semántico.

5. **Laboratorio de Aritmética Conceptual (Word2Vec):**
   - Ejecuta operaciones algebraicas entre conceptos semánticos ($A - B + C = ?$) y descubre de inmediato el vector resultante más cercano en el espacio.
   - Presets incluidos para IA, computación cuántica y biología molecular.

6. **Inspector de Vectores y Sintetizador de Audio:**
   - Mapa de calor de 64 dimensiones en tiempo real.
   - Efectos sonoros procedurales mediante la Web Audio API para pulsos de consulta y confirmación de proximidad.
   - Importación y exportación de espacios vectoriales en formato JSON estándar.

---

## 🛠️ Estructura del Proyecto

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
├── README.md
└── plan.md
```

---

## 💡 Cómo Usarlo

Simplemente abre `index.html` en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari) o levanta un servidor estático local:

```bash
# Con Python
python -m http.server 8080

# Con Node.js npx serve
npx serve .
```
