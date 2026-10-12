/**
 * db.js — SQLite Abstraction Layer
 * vector-db-visualizer
 *
 * Patrón SQLite Abstracto del portafolio Codex:
 * - DDL relacional documentado (compatible con SQLite3 real)
 * - Motor de persistencia: localStorage
 * - Exportación: dump .sql 100% compatible con sqlite3 CLI
 *
 * Tablas:
 *   vector_datasets   — Datasets de embeddings guardados
 *   vectors           — Vectores individuales por dataset
 *   index_configs     — Configuraciones de índices (HNSW, IVF, Flat, etc.)
 *   search_history    — Historial de búsquedas por similitud
 */

export const DB_VERSION = 1;
export const STORAGE_KEY = 'vdbviz_db_v1';

export const SQL_DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vector_datasets (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  dimensions   INTEGER NOT NULL DEFAULT 3,
  metric       TEXT NOT NULL DEFAULT 'cosine',
  vector_count INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vectors (
  id          TEXT PRIMARY KEY,
  dataset_id  TEXT NOT NULL REFERENCES vector_datasets(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT '',
  coords_json TEXT NOT NULL DEFAULT '[0,0,0]',
  category    TEXT DEFAULT 'default',
  metadata    TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS index_configs (
  id            TEXT PRIMARY KEY,
  dataset_id    TEXT NOT NULL REFERENCES vector_datasets(id) ON DELETE CASCADE,
  index_type    TEXT NOT NULL DEFAULT 'flat',
  m             INTEGER DEFAULT 16,
  ef_construct  INTEGER DEFAULT 200,
  nlist         INTEGER DEFAULT 100,
  build_time_ms INTEGER DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_history (
  id           TEXT PRIMARY KEY,
  dataset_id   TEXT NOT NULL REFERENCES vector_datasets(id) ON DELETE CASCADE,
  query_coords TEXT NOT NULL DEFAULT '[0,0,0]',
  top_k        INTEGER NOT NULL DEFAULT 5,
  index_type   TEXT NOT NULL DEFAULT 'flat',
  results_json TEXT NOT NULL DEFAULT '[]',
  latency_ms   INTEGER NOT NULL DEFAULT 0,
  searched_at  TEXT NOT NULL
);
`;

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : _emptyDb();
  } catch {
    return _emptyDb();
  }
}

function _emptyDb() {
  return {
    version: DB_VERSION,
    vector_datasets: [],
    vectors: [],
    index_configs: [],
    search_history: []
  };
}

function _save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function _uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function _now() {
  return new Date().toISOString();
}

/** Datasets */
export function saveDataset({ id, name, description = '', dimensions = 3, metric = 'cosine' }) {
  const db = _load();
  const now = _now();
  const existing = db.vector_datasets.findIndex(d => d.id === id);
  const count = id ? (db.vectors.filter(v => v.dataset_id === id).length) : 0;
  if (existing >= 0) {
    db.vector_datasets[existing] = { ...db.vector_datasets[existing], name, description, dimensions, metric, vector_count: count, updated_at: now };
  } else {
    const newId = id || _uid();
    db.vector_datasets.push({ id: newId, name, description, dimensions, metric, vector_count: 0, created_at: now, updated_at: now });
  }
  _save(db);
  return db.vector_datasets.find(d => d.name === name);
}

export function listDatasets() {
  return _load().vector_datasets;
}

export function deleteDataset(id) {
  const db = _load();
  db.vector_datasets = db.vector_datasets.filter(d => d.id !== id);
  db.vectors = db.vectors.filter(v => v.dataset_id !== id);
  db.index_configs = db.index_configs.filter(c => c.dataset_id !== id);
  db.search_history = db.search_history.filter(s => s.dataset_id !== id);
  _save(db);
}

/** Vectors */
export function saveVectors(dataset_id, vectorList) {
  const db = _load();
  // Reemplazar todos los vectores del dataset
  db.vectors = db.vectors.filter(v => v.dataset_id !== dataset_id);
  const now = _now();
  for (const v of vectorList) {
    db.vectors.push({
      id: _uid(),
      dataset_id,
      label: v.label || '',
      coords_json: JSON.stringify(v.coords || [0, 0, 0]),
      category: v.category || 'default',
      metadata: JSON.stringify(v.metadata || {}),
      created_at: now
    });
  }
  // Actualizar vector_count
  const ds = db.vector_datasets.findIndex(d => d.id === dataset_id);
  if (ds >= 0) {
    db.vector_datasets[ds].vector_count = vectorList.length;
    db.vector_datasets[ds].updated_at = now;
  }
  _save(db);
}

export function getVectors(dataset_id) {
  return _load().vectors
    .filter(v => v.dataset_id === dataset_id)
    .map(v => ({ ...v, coords: JSON.parse(v.coords_json), metadata: JSON.parse(v.metadata) }));
}

/** Index Configs */
export function saveIndexConfig({ dataset_id, index_type = 'flat', m = 16, ef_construct = 200, nlist = 100, build_time_ms = 0 }) {
  const db = _load();
  const cfg = {
    id: _uid(),
    dataset_id,
    index_type,
    m,
    ef_construct,
    nlist,
    build_time_ms,
    created_at: _now()
  };
  db.index_configs.push(cfg);
  _save(db);
  return cfg;
}

export function getIndexConfigs(dataset_id) {
  return _load().index_configs.filter(c => c.dataset_id === dataset_id);
}

/** Search History */
export function logSearch({ dataset_id, query_coords, top_k, index_type, results, latency_ms }) {
  const db = _load();
  const entry = {
    id: _uid(),
    dataset_id,
    query_coords: JSON.stringify(query_coords || []),
    top_k: top_k || 5,
    index_type: index_type || 'flat',
    results_json: JSON.stringify(results || []),
    latency_ms: latency_ms || 0,
    searched_at: _now()
  };
  db.search_history.push(entry);
  // Mantener max 500 búsquedas
  if (db.search_history.length > 500) db.search_history.shift();
  _save(db);
  return entry;
}

export function getSearchHistory(dataset_id, limit = 20) {
  return _load().search_history
    .filter(s => s.dataset_id === dataset_id)
    .slice(-limit)
    .reverse();
}

export function getDBStats() {
  const db = _load();
  return {
    datasets: db.vector_datasets.length,
    vectors: db.vectors.length,
    index_configs: db.index_configs.length,
    searches: db.search_history.length,
    version: DB_VERSION
  };
}

/** Exportar dump SQL */
export function exportSQLiteDump() {
  const db = _load();
  const lines = [];
  lines.push('-- SQLite dump — vector-db-visualizer');
  lines.push('-- Generado: ' + _now());
  lines.push('PRAGMA foreign_keys = OFF;');
  lines.push('BEGIN TRANSACTION;');
  lines.push('');
  lines.push(SQL_DDL);

  for (const d of db.vector_datasets) {
    lines.push(`INSERT OR REPLACE INTO vector_datasets VALUES ('${d.id}','${d.name.replace(/'/g, "''")}','${(d.description || '').replace(/'/g, "''")}',${d.dimensions},'${d.metric}',${d.vector_count},'${d.created_at}','${d.updated_at}');`);
  }
  for (const v of db.vectors) {
    const coords = (v.coords_json || '[]').replace(/'/g, "''");
    const meta = (v.metadata || '{}').replace(/'/g, "''");
    lines.push(`INSERT OR REPLACE INTO vectors VALUES ('${v.id}','${v.dataset_id}','${v.label.replace(/'/g, "''")}','${coords}','${v.category}','${meta}','${v.created_at}');`);
  }
  for (const c of db.index_configs) {
    lines.push(`INSERT OR REPLACE INTO index_configs VALUES ('${c.id}','${c.dataset_id}','${c.index_type}',${c.m},${c.ef_construct},${c.nlist},${c.build_time_ms},'${c.created_at}');`);
  }
  for (const s of db.search_history) {
    const qc = (s.query_coords || '[]').replace(/'/g, "''");
    const res = (s.results_json || '[]').replace(/'/g, "''");
    lines.push(`INSERT OR REPLACE INTO search_history VALUES ('${s.id}','${s.dataset_id}','${qc}',${s.top_k},'${s.index_type}','${res}',${s.latency_ms},'${s.searched_at}');`);
  }

  lines.push('');
  lines.push('COMMIT;');
  lines.push('PRAGMA foreign_keys = ON;');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vector-db-dump.sql';
  a.click();
  URL.revokeObjectURL(a.href);
}
