/**
 * Vector DB Visualizer - Main Application Controller
 * Connects UI, 3D Canvas Space, Index Engines, Vector Arithmetic and Metrics
 */

import { VectorMath } from './vector-math.js';
import { EMBEDDING_DATASET, CATEGORIES, ANALOGY_PRESETS } from './dataset.js';
import { FlatIndex, HNSWIndex, IVFPQIndex } from './indexes.js';
import { Space3D } from './space-3d.js';
import { soundFx } from './audio-fx.js';
import { saveDataset, saveVectors, logSearch, exportSQLiteDump } from './db.js';

class VectorDBApp {
  constructor() {
    this.dataset = [...EMBEDDING_DATASET];
    this.activeCategoryFilter = 'all';
    this.currentProjection = 'pca'; // 'pca' | 'tsne'
    this.currentMetric = 'cosine'; // 'cosine' | 'euclidean' | 'dot' | 'manhattan'
    this.currentIndexType = 'hnsw'; // 'flat' | 'hnsw' | 'ivf'
    this.topK = 5;

    // Index instances
    this.flatIndex = new FlatIndex(this.currentMetric);
    this.hnswIndex = new HNSWIndex(4, 16, 0.62);
    this.ivfIndex = new IVFPQIndex(4, 2);

    this.selectedNode = null;
    this.projected3D = [];
    this.queryVector = null;
    this.queryPosition3D = null;

    this.init();
  }

  init() {
    // 1. Initialize 3D Space Renderer
    this.space3D = new Space3D(
      'canvas-container',
      (nodeData) => this.selectNode(nodeData),
      (hoverData) => this.updateHoverInfo(hoverData)
    );

    // 2. Build indexes and calculate initial 3D projection
    this.rebuildAll();

    // 3. Persist initial dataset in SQLite Abstract Layer
    this._persistDataset();

    // 4. Bind UI event listeners
    this.bindEvents();
    this.populateCategoryFilters();
    this.populateAnalogySelects();
    this.renderAnalogyPresets();

    // 5. Select initial default node
    if (this.dataset.length > 0) {
      this.selectNode(this.dataset[0]);
    }
  }

  /** Persiste el dataset activo en la capa SQLite abstracta (localStorage). */
  _persistDataset() {
    const ds = saveDataset({
      id: 'default-dataset',
      name: 'EMBEDDING_DATASET',
      description: 'Dataset de embeddings semánticos 64-D generado por vector-db-visualizer',
      dimensions: this.dataset.length > 0 ? this.dataset[0].vector.length : 64,
      metric: this.currentMetric
    });
    if (ds) {
      saveVectors('default-dataset', this.dataset.map(d => ({
        label: d.label,
        coords: d.vector.slice(0, 3), // coords reducidas a 3D para almacenamiento
        category: d.category,
        metadata: { description: d.description, id: d.id }
      })));
    }
  }

  rebuildAll() {
    // Filter dataset if applicable
    const activeData = this.activeCategoryFilter === 'all'
      ? this.dataset
      : this.dataset.filter(d => d.category === this.activeCategoryFilter);

    // Rebuild 3D Projections
    const rawVectors = activeData.map(d => d.vector);
    if (this.currentProjection === 'pca') {
      this.projected3D = VectorMath.projectPCA(rawVectors, 3);
    } else {
      this.projected3D = VectorMath.projectTSNE(rawVectors, 3, 15, 60);
    }

    this.space3D.setNodes(activeData, this.projected3D);

    // Rebuild Search Indexes
    this.flatIndex.metric = this.currentMetric;
    this.flatIndex.build(activeData);
    this.hnswIndex.build(activeData);
    this.ivfIndex.build(activeData);

    // Update 3D Overlays (HNSW edges or Voronoi)
    if (this.currentIndexType === 'hnsw') {
      const edges = this.hnswIndex.getGraphEdges(0);
      this.space3D.setGraphEdges(edges);
      this.space3D.showHnswEdges = true;
      this.space3D.showVoronoi = false;
    } else if (this.currentIndexType === 'ivf') {
      const centroid3D = VectorMath.projectPCA(this.ivfIndex.centroids, 3);
      this.space3D.setCentroids(centroid3D);
      this.space3D.showVoronoi = true;
      this.space3D.showHnswEdges = false;
    } else {
      this.space3D.showHnswEdges = false;
      this.space3D.showVoronoi = false;
    }

    // Refresh query if active
    if (this.queryVector) {
      this.executeSearch(this.queryVector, this.lastQueryLabel || 'Query');
    }
  }

  bindEvents() {
    // Metric Selector
    const metricSelect = document.getElementById('metric-select');
    if (metricSelect) {
      metricSelect.addEventListener('change', (e) => {
        this.currentMetric = e.target.value;
        this.flatIndex.metric = this.currentMetric;
        this.updateFormulaCard();
        if (this.queryVector) this.executeSearch(this.queryVector, this.lastQueryLabel);
      });
    }

    // Projection Mode (PCA vs t-SNE)
    const btnPca = document.getElementById('btn-proj-pca');
    const btnTsne = document.getElementById('btn-proj-tsne');

    if (btnPca && btnTsne) {
      btnPca.addEventListener('click', () => {
        this.currentProjection = 'pca';
        btnPca.classList.add('active');
        btnTsne.classList.remove('active');
        soundFx.playClusterSnap();
        this.rebuildAll();
      });

      btnTsne.addEventListener('click', () => {
        this.currentProjection = 'tsne';
        btnTsne.classList.add('active');
        btnPca.classList.remove('active');
        soundFx.playClusterSnap();
        this.rebuildAll();
      });
    }

    // Index Algorithm Select
    const indexSelect = document.getElementById('index-type-select');
    if (indexSelect) {
      indexSelect.addEventListener('change', (e) => {
        this.currentIndexType = e.target.value;
        this.rebuildAll();
      });
    }

    // Top-K Slider
    const topKSlider = document.getElementById('topk-slider');
    const topKValue = document.getElementById('topk-value');
    if (topKSlider && topKValue) {
      topKSlider.addEventListener('input', (e) => {
        this.topK = parseInt(e.target.value, 10);
        topKValue.textContent = this.topK;
        if (this.queryVector) this.executeSearch(this.queryVector, this.lastQueryLabel);
      });
    }

    // Query Input & Button
    const queryInput = document.getElementById('query-text-input');
    const btnRunQuery = document.getElementById('btn-run-query');

    const handleQuery = () => {
      const text = queryInput.value.trim();
      if (!text) return;
      const embedding = VectorMath.generateEmbedding(text, 64);
      soundFx.playQueryPulse();
      this.executeSearch(embedding, text);
    };

    if (btnRunQuery) btnRunQuery.addEventListener('click', handleQuery);
    if (queryInput) {
      queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleQuery();
      });
    }

    // View Controls: Reset Camera, Auto-Rotate, Grid Toggle
    const btnResetCam = document.getElementById('btn-reset-cam');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => this.space3D.resetCamera());
    }

    const btnAutoRotate = document.getElementById('btn-auto-rotate');
    if (btnAutoRotate) {
      btnAutoRotate.addEventListener('click', () => {
        this.space3D.autoRotate = !this.space3D.autoRotate;
        btnAutoRotate.classList.toggle('active', this.space3D.autoRotate);
      });
    }

    const btnGridToggle = document.getElementById('btn-toggle-grid');
    if (btnGridToggle) {
      btnGridToggle.addEventListener('click', () => {
        this.space3D.showGrid = !this.space3D.showGrid;
        btnGridToggle.classList.toggle('active', this.space3D.showGrid);
      });
    }

    // Audio Mute Toggle
    const btnMute = document.getElementById('btn-toggle-sound');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const isMuted = soundFx.toggleMute();
        btnMute.innerHTML = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
        btnMute.classList.toggle('muted', isMuted);
      });
    }

    // Concept Arithmetic Lab
    const btnComputeAnalogy = document.getElementById('btn-compute-analogy');
    if (btnComputeAnalogy) {
      btnComputeAnalogy.addEventListener('click', () => this.computeCustomAnalogy());
    }

    // JSON Export / Import
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportJSON());
    }

    // SQL Dump Export
    const btnExportSql = document.getElementById('btn-export-sql');
    if (btnExportSql) {
      btnExportSql.addEventListener('click', () => exportSQLiteDump());
    }

    const fileInput = document.getElementById('file-import-json');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.importJSON(e));
    }
  }

  populateCategoryFilters() {
    const container = document.getElementById('category-filter-bar');
    if (!container) return;

    container.innerHTML = `
      <button class="cat-chip active" data-cat="all" id="chip-all">
        <span class="dot" style="background:#fff;"></span> Todos (${this.dataset.length})
      </button>
    `;

    for (const [key, cat] of Object.entries(CATEGORIES)) {
      const count = this.dataset.filter(d => d.category === key).length;
      const btn = document.createElement('button');
      btn.className = 'cat-chip';
      btn.id = `chip-${key}`;
      btn.dataset.cat = key;
      btn.innerHTML = `<span class="dot" style="background:${cat.color};"></span> ${cat.name} (${count})`;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategoryFilter = key;
        this.rebuildAll();
      });
      container.appendChild(btn);
    }

    // Click handler for 'all'
    const chipAll = document.getElementById('chip-all');
    if (chipAll) {
      chipAll.addEventListener('click', () => {
        container.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        chipAll.classList.add('active');
        this.activeCategoryFilter = 'all';
        this.rebuildAll();
      });
    }
  }

  executeSearch(queryVec, label = 'Query') {
    this.queryVector = queryVec;
    this.lastQueryLabel = label;

    // Approximate 3D position of query vector
    const allVectors = this.dataset.map(d => d.vector).concat([queryVec]);
    const projAll = this.currentProjection === 'pca'
      ? VectorMath.projectPCA(allVectors, 3)
      : VectorMath.projectTSNE(allVectors, 3, 15, 30);
    this.queryPosition3D = projAll[projAll.length - 1];

    this.space3D.setQueryPoint(this.queryPosition3D, label);

    // Run active index search
    let searchOutput;
    if (this.currentIndexType === 'flat') {
      searchOutput = this.flatIndex.search(queryVec, this.topK);
    } else if (this.currentIndexType === 'hnsw') {
      searchOutput = this.hnswIndex.search(queryVec, this.topK);
    } else {
      searchOutput = this.ivfIndex.search(queryVec, this.topK);
    }

    // Connect 3D lasers
    this.space3D.setTopKConnections(searchOutput.results, this.queryPosition3D);

    // Play chime sounds
    searchOutput.results.forEach((_, idx) => soundFx.playMatchChime(idx));

    // Render results in UI
    this.renderSearchResults(searchOutput, label);
    this.renderTraversalLog(searchOutput.traversalSteps, searchOutput.stats);

    // Persistir búsqueda en SQLite Abstract Layer
    logSearch({
      dataset_id: 'default-dataset',
      query_coords: queryVec.slice(0, 3),
      top_k: this.topK,
      index_type: this.currentIndexType,
      results: (searchOutput.results || []).map(r => ({ id: r.id, score: r.score, label: r.data?.label })),
      latency_ms: searchOutput.stats?.latencyMs || 0
    });
  }


  renderSearchResults(output, label) {
    const list = document.getElementById('search-results-list');
    const statsContainer = document.getElementById('search-stats-bar');
    if (!list) return;

    // Update Stats Bar
    if (statsContainer && output.stats) {
      statsContainer.innerHTML = `
        <div class="stat-pill"><span class="stat-lbl">Índice:</span> <strong>${output.stats.indexType}</strong></div>
        <div class="stat-pill"><span class="stat-lbl">Latencia:</span> <strong class="neon-cyan">${output.stats.latencyMs} ms</strong></div>
        <div class="stat-pill"><span class="stat-lbl">Comparaciones:</span> <strong>${output.stats.comparisons} / ${output.stats.totalVectors}</strong></div>
        <div class="stat-pill"><span class="stat-lbl">Recall Teórico:</span> <strong class="neon-emerald">${output.stats.recall}</strong></div>
      `;
    }

    // Render Top-K Cards
    list.innerHTML = '';
    output.results.forEach((res, rank) => {
      const cat = CATEGORIES[res.data.category] || CATEGORIES.ai;
      const card = document.createElement('div');
      card.className = 'result-card';
      card.id = `result-card-${res.id}`;
      card.innerHTML = `
        <div class="result-rank" style="color:${cat.color};">#${rank + 1}</div>
        <div class="result-body">
          <div class="result-title">${res.data.label}</div>
          <div class="result-desc">${res.data.description}</div>
          <div class="result-meta">
            <span class="badge" style="background:${cat.glow}; color:${cat.color};">${cat.name}</span>
            <span class="score-metric">Similitud: <strong>${(res.score * 100).toFixed(1)}%</strong></span>
            <span class="score-metric">Distancia: <strong>${res.distance.toFixed(4)}</strong></span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => this.selectNode(res.data));
      list.appendChild(card);
    });
  }

  renderTraversalLog(steps, stats) {
    const logBox = document.getElementById('traversal-log-box');
    if (!logBox) return;

    if (!steps || steps.length === 0) {
      logBox.innerHTML = `<div class="log-entry info">Búsqueda exacta Flat completada: ${stats?.comparisons || 0} comparaciones lineales directas.</div>`;
      return;
    }

    logBox.innerHTML = '';
    steps.forEach((step, idx) => {
      const entry = document.createElement('div');
      entry.className = `log-entry step-${step.type || 'info'}`;
      entry.innerHTML = `
        <span class="step-num">[Paso ${idx + 1}]</span>
        <span class="step-text">${step.msg}</span>
      `;
      logBox.appendChild(entry);
    });
  }

  selectNode(nodeData) {
    this.selectedNode = nodeData;
    this.space3D.selectedNode = this.space3D.nodes.find(n => n.id === nodeData.id);

    const drawer = document.getElementById('node-inspector-drawer');
    if (!drawer) return;

    const cat = CATEGORIES[nodeData.category] || CATEGORIES.ai;
    const mag = VectorMath.magnitude(nodeData.vector).toFixed(4);

    document.getElementById('insp-title').textContent = nodeData.label;
    document.getElementById('insp-category').textContent = cat.name;
    document.getElementById('insp-category').style.color = cat.color;
    document.getElementById('insp-desc').textContent = nodeData.description;
    document.getElementById('insp-mag').textContent = mag;
    document.getElementById('insp-dim').textContent = `${nodeData.vector.length}-D`;

    // Render 64-D Vector Sparkline / Heatmap
    this.renderVectorHeatmap(nodeData.vector);

    // Button to query by this node
    const btnQueryThis = document.getElementById('btn-query-this-node');
    if (btnQueryThis) {
      btnQueryThis.onclick = () => {
        soundFx.playQueryPulse();
        this.executeSearch(nodeData.vector, `Vec(${nodeData.label})`);
      };
    }
  }

  renderVectorHeatmap(vector) {
    const container = document.getElementById('vector-heatmap-grid');
    if (!container) return;

    container.innerHTML = '';
    vector.forEach((val, idx) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const intensity = Math.min(1, Math.max(0, (val + 0.3) / 0.6));
      const color = val >= 0
        ? `rgba(0, 243, 255, ${0.2 + intensity * 0.8})`
        : `rgba(239, 68, 68, ${0.2 + (1 - intensity) * 0.8})`;

      cell.style.background = color;
      cell.title = `Dim ${idx + 1}: ${val.toFixed(4)}`;
      container.appendChild(cell);
    });
  }

  updateHoverInfo(nodeData) {
    const statusLabel = document.getElementById('status-hover-text');
    if (!statusLabel) return;
    if (nodeData) {
      statusLabel.textContent = `📍 [${nodeData.label}] (${CATEGORIES[nodeData.category]?.name || 'Nube'})`;
    } else {
      statusLabel.textContent = `Explorador Activo — ${this.dataset.length} vectores en 64-D`;
    }
  }

  updateFormulaCard() {
    const formulaText = document.getElementById('metric-formula-display');
    if (!formulaText) return;

    const formulas = {
      cosine: 'Cosine: cos(θ) = (A · B) / (||A|| ||B||)',
      euclidean: 'Euclidean L2: d(A, B) = √∑(Aᵢ - Bᵢ)²',
      dot: 'Dot Product: A · B = ∑(Aᵢ * Bᵢ)',
      manhattan: 'Manhattan L1: d(A, B) = ∑|Aᵢ - Bᵢ|'
    };

    formulaText.textContent = formulas[this.currentMetric] || formulas.cosine;
  }

  populateAnalogySelects() {
    const selectA = document.getElementById('analogy-a');
    const selectB = document.getElementById('analogy-b');
    const selectC = document.getElementById('analogy-c');
    if (!selectA || !selectB || !selectC) return;

    const options = this.dataset.map(d => `<option value="${d.id}">${d.label}</option>`).join('');
    selectA.innerHTML = options;
    selectB.innerHTML = options;
    selectC.innerHTML = options;

    if (this.dataset.length >= 3) {
      selectA.selectedIndex = 0;
      selectB.selectedIndex = 5;
      selectC.selectedIndex = 1;
    }
  }

  renderAnalogyPresets() {
    const container = document.getElementById('analogy-presets-list');
    if (!container) return;

    container.innerHTML = '';
    ANALOGY_PRESETS.forEach((preset, idx) => {
      const btn = document.createElement('button');
      btn.className = 'preset-chip';
      btn.id = `preset-analogy-${idx}`;
      btn.innerHTML = `<strong>${preset.title}</strong><br><small>${preset.description}</small>`;
      btn.addEventListener('click', () => {
        const selA = document.getElementById('analogy-a');
        const selB = document.getElementById('analogy-b');
        const selC = document.getElementById('analogy-c');
        if (selA) selA.value = preset.a.id;
        if (selB) selB.value = preset.b.id;
        if (selC) selC.value = preset.c.id;
        this.computeCustomAnalogy();
      });
      container.appendChild(btn);
    });
  }

  computeCustomAnalogy() {
    const selA = document.getElementById('analogy-a');
    const selB = document.getElementById('analogy-b');
    const selC = document.getElementById('analogy-c');
    if (!selA || !selB || !selC) return;

    const nodeA = this.dataset.find(d => d.id === selA.value);
    const nodeB = this.dataset.find(d => d.id === selB.value);
    const nodeC = this.dataset.find(d => d.id === selC.value);

    if (!nodeA || !nodeB || !nodeC) return;

    // Vector Arithmetic: A - B + C
    const terms = [
      { vector: nodeA.vector, weight: 1.0 },
      { vector: nodeB.vector, weight: -1.0 },
      { vector: nodeC.vector, weight: 1.0 }
    ];

    const resultVector = VectorMath.linearCombination(terms);
    soundFx.playAnalogySuccess();

    // Query nearest neighbors excluding source vectors
    const searchOutput = this.hnswIndex.search(resultVector, 6);
    const filteredResults = searchOutput.results.filter(
      r => r.id !== nodeA.id && r.id !== nodeB.id && r.id !== nodeC.id
    );

    const label = `(${nodeA.label} - ${nodeB.label} + ${nodeC.label})`;
    this.executeSearch(resultVector, label);

    // Display Analogy Outcome Box
    const outBox = document.getElementById('analogy-result-box');
    if (outBox && filteredResults.length > 0) {
      const best = filteredResults[0];
      outBox.innerHTML = `
        <div class="analogy-badge neon-cyan">Resultado Más Cercano:</div>
        <div class="analogy-winner">✨ <strong>${best.data.label}</strong> (${(best.score * 100).toFixed(1)}% Similitud)</div>
        <div class="analogy-desc">${best.data.description}</div>
      `;
    }
  }

  exportJSON() {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      dataset: this.dataset
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-db-space-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed.dataset)) {
          this.dataset = parsed.dataset;
          this.populateCategoryFilters();
          this.populateAnalogySelects();
          this.rebuildAll();
          alert(`¡Dataset importado exitosamente con ${this.dataset.length} vectores!`);
        }
      } catch (err) {
        alert('Error al parsear el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new VectorDBApp();
});
